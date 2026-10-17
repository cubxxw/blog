import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  createAuthorVoice,
  loadGeminiKey,
  wavInfo,
  joinWav,
  atomicPublicWrite,
} from "./lib/author-voice.mjs";

function wav(seconds = 1) {
  const b = Buffer.alloc(44 + 24000 * 2 * seconds);
  b.write("RIFF");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(24000, 24);
  b.writeUInt32LE(48000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(b.length - 44, 40);
  return b;
}
async function fixture(t, fetcher) {
  const root = await mkdtemp(path.join(tmpdir(), "blog-voice-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "content/zh/growth/posts"), { recursive: true });
  const article = "content/zh/growth/posts/story.md";
  await writeFile(
    path.join(root, article),
    "---\ntitle: 我的故事\ndate: 2026-10-01T12:00:00+08:00\ncustom: preserve\n---\n\n原来的正文。\n",
  );
  const service = await createAuthorVoice({
    root,
    apiKey: "fixture-secret",
    fetcher,
    encode: async (bytes) =>
      Buffer.concat([Buffer.from("ID3"), bytes.subarray(44)]),
  });
  return { root, article, service };
}
async function settle(service, id) {
  for (let n = 0; n < 200; n++) {
    const job = await service.job(id);
    if (job.status !== "preparing") return job;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw Error("job timeout");
}
const bodyAudio = (b) => ({
  type: "audio",
  mime_type: "audio/wav",
  data: b.toString("base64"),
});
const speech = () =>
  Response.json({
    steps: [{ type: "model_output", content: [bodyAudio(wav())] }],
  });

test("the shared env file supplies only the Gemini key without changing process environment", async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), "blog-key-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, ".env");
  await writeFile(
    file,
    'GEMINI_API_KEY="shared-fixture"\nDEEPSEEK_API_KEY=unrelated\n',
  );
  const before = process.env.DEEPSEEK_API_KEY;
  assert.equal(
    await loadGeminiKey({ env: {}, envFile: file }),
    "shared-fixture",
  );
  assert.equal(process.env.DEEPSEEK_API_KEY, before);
  assert.equal(
    await loadGeminiKey({ env: { GEMINI_API_KEY: "explicit" }, envFile: file }),
    "explicit",
  );
});
test("audio joins preserve all PCM samples and reject incompatible or malformed recordings", () => {
  const joined = joinWav([wav(1), wav(2)]);
  assert.equal(wavInfo(joined).duration, 3);
  assert.equal(joined.length, 44 + 144000);
  const bad = wav();
  bad.writeUInt32LE(44100, 24);
  assert.throws(() => wavInfo(bad));
  assert.throws(() => wavInfo(Buffer.from("bad")));
});
test("creation requires real-length reference, consent confirmation, and persists a reusable voice id once", async (t) => {
  const calls = [],
    f = await fixture(t, async (url, options) => {
      calls.push({ url, body: JSON.parse(options.body) });
      return Response.json({ id: "voice_fixture" });
    });
  await assert.rejects(
    f.service.createVoice({
      requestId: "voice-1",
      reference: wav(10).toString("base64"),
      consent: wav(5).toString("base64"),
      confirmed: false,
    }),
  );
  assert.equal(calls.length, 0);
  await assert.rejects(
    f.service.createVoice({
      requestId: "voice-short",
      reference: wav(1).toString("base64"),
      consent: wav(5).toString("base64"),
      confirmed: true,
    }),
  );
  assert.equal(calls.length, 0);
  const request = {
    requestId: "voice-1",
    reference: wav(10).toString("base64"),
    consent: wav(5).toString("base64"),
    confirmed: true,
  };
  await f.service.createVoice(request);
  await f.service.createVoice(request);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.store, true);
  assert.equal(calls[0].body.voice.type, "replicated");
  assert.equal(calls[0].body.voice.language_code, "zh-CN");
  const fresh = await createAuthorVoice({
    root: f.root,
    apiKey: "fixture-secret",
    fetcher: () => {
      throw Error("must not recreate");
    },
  });
  assert.equal((await fresh.state()).voice.ready, true);
  assert.ok(!JSON.stringify(await fresh.state()).includes("fixture-secret"));
});
test("a missing own voice cannot silently use a stock voice", async (t) => {
  let calls = 0;
  const f = await fixture(t, async () => {
    calls++;
    return speech();
  });
  await assert.rejects(
    f.service.generate({
      requestId: "g",
      article: f.article,
      text: "这是我的补充。",
    }),
    /声音/,
  );
  assert.equal(calls, 0);
});
async function addVoice(f) {
  await mkdir(path.join(f.root, ".author-voice"), { recursive: true });
  await writeFile(
    path.join(f.root, ".author-voice/profile.json"),
    JSON.stringify({ id: "voice_fixture", name: "我的声音" }),
  );
}
test("generation is reusable, keeps the full script, and publication requires review against the same article", async (t) => {
  const calls = [],
    f = await fixture(t, async (url, options) => {
      calls.push(JSON.parse(options.body));
      return speech();
    });
  await addVoice(f);
  const text = "这是作者的口头补充。".repeat(85),
    request = {
      requestId: "generate-1",
      article: f.article,
      text,
      kind: "intro",
    },
    start = await f.service.generate(request),
    ready = await settle(f.service, start.id);
  assert.equal(ready.status, "ready", ready.error);
  assert.ok(calls.length > 1);
  assert.equal(
    calls.flatMap((c) => c.input[0].content.map((p) => p.text)).join(""),
    text,
  );
  assert.ok(
    calls.every(
      (c) => c.generation_config.speech_config[0].voice === "voice_fixture",
    ),
  );
  assert.equal((await f.service.generate(request)).id, start.id);
  const count = calls.length;
  const next = await f.service.generate({
    ...request,
    requestId: "generate-2",
  });
  assert.equal((await settle(f.service, next.id)).status, "ready");
  assert.equal(calls.length, count);
  await assert.rejects(f.service.publish({ id: start.id, reviewed: false }));
  await f.service.publish({ id: start.id, reviewed: true });
  const source = await readFile(path.join(f.root, f.article), "utf8");
  assert.match(source, /custom: preserve/);
  assert.ok(source.endsWith("\n\n原来的正文。\n"));
  assert.match(source, /authorAudio:/);
  const manifest = JSON.parse(
    await readFile(
      path.join(f.root, "static/audio/author", ready.assetId + ".json"),
      "utf8",
    ),
  );
  assert.equal(manifest.text, text);
  assert.equal(manifest.origin, "synthetic");
  assert.ok(!JSON.stringify(manifest).includes("voice_fixture"));
  assert.ok(!JSON.stringify(manifest).includes("fixture-secret"));
  await writeFile(path.join(f.root, f.article), source + "作者后来修改。");
  await assert.rejects(
    f.service.publish({ id: next.id, reviewed: true }),
    /更新/,
  );
});
test("article traversal and symlinks cannot read or publish outside content", async (t) => {
  const f = await fixture(t, () => {
    throw Error("no network");
  });
  await addVoice(f);
  await assert.rejects(
    f.service.generate({
      requestId: "bad",
      article: "../private.md",
      text: "口播稿",
    }),
  );
  const { symlink } = await import("node:fs/promises");
  await writeFile(path.join(f.root, "secret.md"), "private");
  await symlink(
    path.join(f.root, "secret.md"),
    path.join(f.root, "content/zh/growth/posts/link.md"),
  );
  await assert.rejects(
    f.service.generate({
      requestId: "link",
      article: "content/zh/growth/posts/link.md",
      text: "口播稿",
    }),
  );
});
test("an uncertain provider result is never retried by polling, duplicate requests or restarting", async (t) => {
  let calls = 0;
  const f = await fixture(t, async () => {
    calls++;
    throw Error("fixture-secret provider transport failed");
  });
  await addVoice(f);
  const request = {
      requestId: "uncertain",
      article: f.article,
      text: "这是已确认的口播稿。",
    },
    created = await f.service.generate(request),
    failed = await settle(f.service, created.id);
  assert.equal(failed.status, "failed");
  assert.ok(!failed.error.includes("fixture-secret"));
  await f.service.generate(request);
  assert.equal(calls, 1);
  const fresh = await createAuthorVoice({
    root: f.root,
    apiKey: "fixture-secret",
    fetcher: () => {
      throw Error("no retry");
    },
  });
  assert.equal((await fresh.job(created.id)).status, "failed");
  assert.equal(calls, 1);
});
test("uploading author original audio needs no model and preserves its original attribution", async (t) => {
  const f = await fixture(t, () => {
      throw Error("no paid call");
    }),
    result = await f.service.importRecording({
      requestId: "recording",
      article: f.article,
      text: "我亲口说的补充。",
      audio: wav(2).toString("base64"),
      kind: "afterword",
    });
  const ready = await settle(f.service, result.id);
  assert.equal(ready.status, "ready");
  await f.service.publish({ id: ready.id, reviewed: true });
  const manifest = JSON.parse(
    await readFile(
      path.join(f.root, "static/audio/author", ready.assetId + ".json"),
      "utf8",
    ),
  );
  assert.equal(manifest.origin, "recorded");
});

test("cancelling an in-flight generation prevents all later submissions and publication", async (t) => {
  let calls = 0,
    submitted;
  const waiting = new Promise((resolve) => (submitted = resolve)),
    f = await fixture(t, async (_url, { signal }) => {
      calls++;
      submitted();
      return new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        }),
      );
    });
  await addVoice(f);
  const start = await f.service.generate({
    requestId: "cancel-me",
    article: f.article,
    text: "保留原文。".repeat(200),
  });
  await waiting;
  await f.service.cancel(start.id);
  const result = await settle(f.service, start.id);
  assert.equal(result.status, "cancelled");
  assert.equal(calls, 1);
  await assert.rejects(f.service.publish({ id: start.id, reviewed: true }));
});

test("unsupported existing audio metadata is never rewritten as malformed YAML", async (t) => {
  const f = await fixture(t, () => {
    throw Error("no model");
  });
  let source = await readFile(path.join(f.root, f.article), "utf8");
  source = source.replace(
    "custom: preserve",
    "custom: preserve\nauthoraudio:\n  legacy: true",
  );
  await writeFile(path.join(f.root, f.article), source);
  const j = await f.service.importRecording({
      requestId: "legacy",
      article: f.article,
      text: "我的原声。",
      audio: wav(2).toString("base64"),
    }),
    ready = await settle(f.service, j.id);
  assert.equal(ready.status, "ready");
  await assert.rejects(
    f.service.publish({ id: j.id, reviewed: true }),
    /已有其他音频配置/,
  );
  assert.equal(await readFile(path.join(f.root, f.article), "utf8"), source);
});

test("identical audio bytes for different article versions keep distinct public manifests", async (t) => {
  const f = await fixture(t, () => {
      throw Error("no model");
    }),
    input = {
      article: f.article,
      text: "同一段录音。",
      audio: wav(2).toString("base64"),
    };
  const a = await f.service.importRecording({
      ...input,
      requestId: "version-one",
    }),
    first = await settle(f.service, a.id);
  await f.service.publish({ id: a.id, reviewed: true });
  await writeFile(
    path.join(f.root, f.article),
    (await readFile(path.join(f.root, f.article), "utf8")) + "\n新正文。\n",
  );
  const b = await f.service.importRecording({
      ...input,
      requestId: "version-two",
    }),
    second = await settle(f.service, b.id);
  assert.notEqual(first.assetId, second.assetId);
  await f.service.publish({ id: b.id, reviewed: true });
  const one = JSON.parse(
      await readFile(
        path.join(f.root, "static/audio/author", first.assetId + ".json"),
        "utf8",
      ),
    ),
    two = JSON.parse(
      await readFile(
        path.join(f.root, "static/audio/author", second.assetId + ".json"),
        "utf8",
      ),
    );
  assert.notEqual(one.sourceHash, two.sourceHash);
  assert.equal(one.sha256, two.sha256);
});

test("a damaged saved profile cannot substitute a prebuilt voice", async (t) => {
  let calls = 0;
  const f = await fixture(t, () => {
    calls++;
    return speech();
  });
  await mkdir(path.join(f.root, ".author-voice"), { recursive: true });
  await writeFile(
    path.join(f.root, ".author-voice/profile.json"),
    JSON.stringify({ id: "Charon" }),
  );
  assert.equal((await f.service.state()).voice.ready, false);
  await assert.rejects(
    f.service.generate({
      requestId: "wrong-voice",
      article: f.article,
      text: "我的声音。",
    }),
    /声音/,
  );
  assert.equal(calls, 0);
});

test("reader drafts use the full selected section, remain private and do not silently become audio", async (t) => {
  const calls = [];
  const f = await fixture(t, async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return Response.json({
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: "这是依据原文整理的解释。" }] },
        },
      ],
    });
  });
  await writeFile(
    path.join(f.root, f.article),
    "---\ntitle: 我的故事\n---\n\n## 第一节\nFIRST\n## 第二节\nSECOND",
  );
  const source = await f.service.article(f.article);
  const request = {
    requestId: "draft-section",
    article: f.article,
    kind: "section",
    sectionKey: source.sections[1].key,
  };
  const draft = await f.service.draft(request);
  assert.equal(draft.type, "script");
  assert.equal(draft.status, "ready");
  assert.equal(draft.sectionTitle, "第二节");
  assert.ok(calls[0].body.contents[0].parts[0].text.includes("SECOND"));
  assert.ok(!calls[0].body.contents[0].parts[0].text.includes("FIRST"));
  assert.match(calls[0].url, /models\/gemini-3.8-flash:generateContent$/);
  await f.service.draft(request);
  assert.equal(calls.length, 1);
  await assert.rejects(f.service.media(draft.id));
  await assert.rejects(f.service.publish({ id: draft.id, reviewed: true }));
  await addVoice(f);
  await writeFile(
    path.join(f.root, f.article),
    "---\ntitle: 我的故事\n---\n\n正文变了",
  );
  await assert.rejects(
    f.service.generate({
      ...request,
      requestId: "old-script",
      text: draft.text,
      sourceHash: draft.sourceHash,
    }),
    /正文已经更新/,
  );
});

test("multiple reader audio modes coexist, replace their own scope, preserve legacy audio and exact article prose", async (t) => {
  const f = await fixture(t, async () => speech());
  await addVoice(f);
  const file = path.join(f.root, f.article);
  const body = "\n\n## 一个难点\n原文正文\n";
  await writeFile(
    file,
    '---\ntitle: 我的故事\ncustom: "preserve" # keep this\nauthorAudio: ' +
      "a".repeat(64) +
      "\n---" +
      body,
  );
  const section = (await f.service.article(f.article)).sections[0].key;
  async function publish(kind, id, sectionKey) {
    await f.service.generate({
      requestId: id,
      article: f.article,
      kind,
      sectionKey,
      text: "一份确认过的口播稿。",
    });
    const ready = await settle(f.service, id);
    assert.equal(ready.status, "ready", ready.error);
    await f.service.publish({ id, reviewed: true });
    return ready;
  }
  const summary = await publish("summary", "summary1");
  const sectionJob = await publish("section", "section1", section);
  const dialogue = await publish("dialogue", "dialogue1");
  const text = await readFile(file, "utf8");
  assert.ok(text.endsWith(body));
  assert.match(text, /custom: "preserve" # keep this/);
  assert.match(text, new RegExp("authorAudio: " + "a".repeat(64)));
  const { parse } = await import("yaml");
  const meta = parse(text.split("---")[1]);
  assert.equal(meta.authorAudioTracks.length, 3);
  assert.ok(meta.authorAudioTracks.includes(summary.assetId));
  assert.ok(meta.authorAudioTracks.includes(sectionJob.assetId));
  assert.ok(meta.authorAudioTracks.includes(dialogue.assetId));
  await f.service.publish({ id: "summary1", reviewed: true });
  assert.equal(
    parse((await readFile(file, "utf8")).split("---")[1]).authorAudioTracks
      .length,
    3,
  );
  const manifest = JSON.parse(
    await readFile(
      path.join(f.root, "static/audio/author", sectionJob.assetId + ".json"),
      "utf8",
    ),
  );
  assert.equal(manifest.version, 2);
  assert.equal(manifest.sectionTitle, "一个难点");
  assert.equal(manifest.sectionOccurrence, 1);
  assert.ok(!JSON.stringify(manifest).includes("voice_fixture"));
});

test("a truncated draft is never accepted as a complete script or automatically retried", async (t) => {
  let calls = 0;
  const f = await fixture(t, async () => {
    calls++;
    return Response.json({
      candidates: [
        { finishReason: "MAX_TOKENS", content: { parts: [{ text: "半段" }] } },
      ],
    });
  });
  const input = {
    requestId: "truncated-draft",
    article: f.article,
    kind: "summary",
  };
  await assert.rejects(f.service.draft(input), /未完整返回/);
  assert.equal((await f.service.draft(input)).status, "failed");
  assert.equal(calls, 1);
});

test("Google wrapped consent failures are actionable and never trigger automatic retries", async (t) => {
  let calls = 0;
  const f = await fixture(t, async () => {
    calls++;
    return Response.json(
      {
        error: {
          code: 500,
          details: [
            {
              detail:
                "Original error: Consent flow failed. The recorded phrase didn't match the text on screen.",
            },
          ],
        },
      },
      { status: 500 },
    );
  });
  const input = {
    requestId: "consent-rejected",
    reference: wav(10).toString("base64"),
    consent: wav(5).toString("base64"),
    confirmed: true,
  };
  await assert.rejects(f.service.createVoice(input), /未通过授权录音核验/);
  assert.equal((await f.service.createVoice(input)).status, "failed");
  assert.equal(calls, 1);
  assert.equal((await f.service.state()).voice.ready, false);
});

test("atomic publication preserves source permissions and leaves concurrent edits intact", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "voice-atomic-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const { stat, chmod, readdir } = await import("node:fs/promises");
  const file = path.join(root, "story.md");
  await writeFile(file, "original");
  await chmod(file, 0o640);
  await atomicPublicWrite(file, "updated", { expected: "original" });
  assert.equal(await readFile(file, "utf8"), "updated");
  assert.equal((await stat(file)).mode & 0o777, 0o640);
  await assert.rejects(
    atomicPublicWrite(file, "must not replace", { expected: "original" }),
    /文章正在编辑/,
  );
  assert.equal(await readFile(file, "utf8"), "updated");
  assert.deepEqual(await readdir(root), ["story.md"]);
  const asset = path.join(root, "public.mp3");
  await atomicPublicWrite(asset, Buffer.from("fixture"), { mode: 0o644 });
  assert.equal((await stat(asset)).mode & 0o777, 0o644);
});

test("republishing a section after inserting earlier prose replaces only that section", async (t) => {
  const f = await fixture(t, async () => speech());
  await addVoice(f);
  const file = path.join(f.root, f.article);
  await writeFile(
    file,
    "---\ntitle: 我的故事\n---\n\n## 第一节\n甲\n## 第二节\n乙\n",
  );
  async function publish(index, id) {
    const s = await f.service.article(f.article);
    await f.service.generate({
      requestId: id,
      article: f.article,
      kind: "section",
      sectionKey: s.sections[index].key,
      text: "确认过的章节说明。",
    });
    const j = await settle(f.service, id);
    assert.equal(j.status, "ready", j.error);
    await f.service.publish({ id, reviewed: true });
    return j.assetId;
  }
  const oldA = await publish(0, "shift-first");
  const oldB = await publish(1, "shift-second");
  const text = await readFile(file, "utf8");
  await writeFile(
    file,
    text.replace("## 第一节", "前面新增的文字。\n\n## 第一节"),
  );
  const newA = await publish(0, "shift-first-new");
  assert.notEqual(newA, oldA);
  const { parse } = await import("yaml");
  const ids = parse(
    (await readFile(file, "utf8")).split("---")[1],
  ).authorAudioTracks;
  assert.deepEqual(ids, [newA, oldB]);
});

test("two simultaneous audio publications retain both article tracks", async (t) => {
  const f = await fixture(t, async () => speech());
  await addVoice(f);
  const jobs = [];
  for (const [kind, id] of [
    ["summary", "parallel-summary"],
    ["dialogue", "parallel-dialogue"],
  ]) {
    await f.service.generate({
      requestId: id,
      article: f.article,
      kind,
      text: "确认过的说明。",
    });
    const j = await settle(f.service, id);
    assert.equal(j.status, "ready", j.error);
    jobs.push(j);
  }
  await Promise.all(
    jobs.map((j) => f.service.publish({ id: j.id, reviewed: true })),
  );
  const { parse } = await import("yaml");
  const meta = parse(
    (await readFile(path.join(f.root, f.article), "utf8")).split("---")[1],
  );
  assert.deepEqual(
    new Set(meta.authorAudioTracks),
    new Set(jobs.map((j) => j.assetId)),
  );
});
