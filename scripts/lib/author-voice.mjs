import {
  readFile,
  writeFile,
  mkdir,
  rename,
  readdir,
  realpath,
  stat,
  chmod,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { parseEnv } from "node:util";
import { spawn } from "node:child_process";
import { parseDocument } from "yaml";

import {
  readerSections,
  makeAudioPrompt,
  updateAudioTracks,
  setYamlField,
  READER_KINDS,
  validAudioId,
} from "./reader-audio.mjs";

export const VOICE_MODEL = "gemini-3.8-flash-tts";
const endpoint = "https://generativelanguage.googleapis.com/v1beta/";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const fail = (message) => Object.assign(new Error(message), { public: true });
const safe = (error) =>
  error.public
    ? error.message
    : "请求结果未能确认。不会自动重试；再次生成可能再次计费。";
const exists = async (file) => {
  try {
    return await readFile(file);
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
};
async function json(file, fallback = null) {
  const bytes = await exists(file);
  return bytes ? JSON.parse(bytes) : fallback;
}
async function save(file, value) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = file + "." + randomUUID() + ".tmp";
  await writeFile(temp, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  await rename(temp, file);
}
async function saveBytes(file, bytes) {
  const temp = file + "." + randomUUID() + ".tmp";
  await writeFile(temp, bytes, { mode: 0o600 });
  await rename(temp, file);
}

// Public files keep normal permissions. A failed preparation never truncates the target.
export async function atomicPublicWrite(file, bytes, { mode, expected } = {}) {
  const previous = await stat(file).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  const permissions = mode ?? (previous ? previous.mode & 0o777 : 0o644);
  const temporary = path.join(
    path.dirname(file),
    "." + path.basename(file) + "." + randomUUID() + ".tmp",
  );
  try {
    await writeFile(temporary, bytes, { mode: permissions });
    await chmod(temporary, permissions);
    if (expected !== undefined && (await readFile(file, "utf8")) !== expected)
      throw fail("文章正在编辑，未覆盖正文。请重新确认。");
    await rename(temporary, file);
  } finally {
    await unlink(temporary).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

// Read only the requested key; never merge another application's secrets into process.env.
export async function loadGeminiKey({ env = process.env, envFile } = {}) {
  if (env.GEMINI_API_KEY) return env.GEMINI_API_KEY;
  if (!envFile)
    throw fail(
      "尚未配置 Gemini 密钥来源。用 --env-file 指向 Leafhour 的 .env。",
    );
  const values = parseEnv(await readFile(envFile, "utf8"));
  if (!values.GEMINI_API_KEY) throw fail("指定配置中没有 GEMINI_API_KEY。");
  return values.GEMINI_API_KEY;
}

export function wavInfo(bytes) {
  if (
    !Buffer.isBuffer(bytes) ||
    bytes.length < 44 ||
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.toString("ascii", 8, 12) !== "WAVE" ||
    bytes.readUInt32LE(4) + 8 !== bytes.length
  )
    throw fail("请使用完整的 WAV 录音。");
  let format, data;
  for (let at = 12; at + 8 <= bytes.length;) {
    const size = bytes.readUInt32LE(at + 4),
      end = at + 8 + size;
    if (end > bytes.length) throw fail("录音文件不完整。");
    const id = bytes.toString("ascii", at, at + 4);
    if (id === "fmt ") {
      if (size < 16) throw fail("WAV 格式无效。");
      format = {
        codec: bytes.readUInt16LE(at + 8),
        channels: bytes.readUInt16LE(at + 10),
        rate: bytes.readUInt32LE(at + 12),
        byteRate: bytes.readUInt32LE(at + 16),
        align: bytes.readUInt16LE(at + 20),
        bits: bytes.readUInt16LE(at + 22),
      };
    }
    if (id === "data") {
      if (data) throw fail("WAV 音频块重复。");
      data = bytes.subarray(at + 8, end);
    }
    at = end + (size % 2);
  }
  if (
    !format ||
    !data?.length ||
    format.codec !== 1 ||
    format.channels !== 1 ||
    format.rate !== 24000 ||
    format.byteRate !== 48000 ||
    format.align !== 2 ||
    format.bits !== 16 ||
    data.length % 2
  )
    throw fail("录音须为 24kHz、单声道、16 位 WAV；作者工具会自动转换。");
  return { pcm: data, duration: data.length / 48000 };
}
export function joinWav(parts) {
  const pcm = Buffer.concat(parts.map((part) => wavInfo(part).pcm)),
    b = Buffer.alloc(44);
  b.write("RIFF");
  b.writeUInt32LE(36 + pcm.length, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(24000, 24);
  b.writeUInt32LE(48000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([b, pcm]);
}
export function encodeMp3(bytes) {
  return new Promise((resolve, reject) => {
    const child = spawn(
        "ffmpeg",
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-i",
          "pipe:0",
          "-map_metadata",
          "-1",
          "-codec:a",
          "libmp3lame",
          "-b:a",
          "128k",
          "-f",
          "mp3",
          "pipe:1",
        ],
        { stdio: ["pipe", "pipe", "ignore"] },
      ),
      chunks = [];
    const timer = setTimeout(() => {
      child.kill();
      reject(fail("音频转换超时，原始结果已保留。"));
    }, 60000);
    child.on("error", () => {
      clearTimeout(timer);
      reject(fail("需要安装 ffmpeg 才能导出轻量 MP3。"));
    });
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stdin.on("error", () => {});
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(fail("MP3 转换未完成，原始结果已保留。"));
    });
    child.stdin.end(bytes);
  });
}
function decodeAudio(value) {
  if (
    typeof value !== "string" ||
    value.length > 64 * 1024 * 1024 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(value)
  )
    throw fail("录音数据无效或过大。");
  const b = Buffer.from(value, "base64");
  wavInfo(b);
  return b;
}
function requestId(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(value))
    throw fail("操作标识无效。");
  return value;
}
function readSource(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!match) throw fail("当前只支持 YAML 格式的文章。");
  const document = parseDocument(match[1]);
  if (document.errors.length) throw fail("文章配置无法读取。");
  const meta = document.toJS();
  if (typeof meta?.title !== "string" || !meta.title.trim())
    throw fail("文章缺少标题。");
  const body = text.slice(match[0].length);
  return {
    title: meta.title,
    document,
    yamlOffset: match[0].indexOf(match[1]),
    body,
    sourceHash: hash(meta.title + "\n" + body.trim()),
    header: match[0],
    meta,
  };
}
function chunks(text) {
  const out = [];
  let tail = text;
  while (tail.length) {
    const units = Array.from(tail);
    let take = Math.min(units.length, 450);
    if (take < units.length) {
      const probe = units.slice(0, take).join(""),
        at = Math.max(
          probe.lastIndexOf("。"),
          probe.lastIndexOf("！"),
          probe.lastIndexOf("？"),
          probe.lastIndexOf("\n"),
          probe.lastIndexOf(". "),
        );
      if (at > probe.length / 2)
        take = Array.from(probe.slice(0, at + 1)).length;
    }
    const part = units.slice(0, take).join("");
    out.push(part);
    tail = tail.slice(part.length);
  }
  return out;
}

export async function createAuthorVoice({
  root,
  apiKey,
  fetcher = fetch,
  encode = encodeMp3,
} = {}) {
  root = path.resolve(root);
  const privateDir = path.join(root, ".author-voice"),
    jobsDir = path.join(privateDir, "jobs"),
    cacheDir = path.join(privateDir, "cache");
  let busy = false,
    activeJob = null;
  await mkdir(jobsDir, { recursive: true, mode: 0o700 });
  await mkdir(cacheDir, { recursive: true, mode: 0o700 });
  for (const file of await readdir(jobsDir)) {
    if (!/^[A-Za-z0-9_-]+\.json$/.test(file)) continue;
    const j = await json(path.join(jobsDir, file));
    if (j.status === "preparing") {
      j.status = "interrupted";
      j.error = "上次操作已中断，不会自动重复提交。再次生成可能再次计费。";
      await save(path.join(jobsDir, file), j);
    }
  }
  const profile = async () => {
    const value = await json(path.join(privateDir, "profile.json"));
    return /^voice_[A-Za-z0-9_-]+$/.test(value?.id || "") ? value : null;
  };
  const publicJob = (j) => ({
    id: j.id,
    status: j.status,
    type: j.type,
    article: j.article,
    title: j.title,
    kind: j.kind,
    sectionKey: j.sectionKey,
    sectionTitle: j.sectionTitle,
    sourceHash: j.sourceHash,
    text: j.text,
    completed: j.completed || 0,
    total: j.total || 0,
    createdAt: j.createdAt,
    ...(j.assetId ? { assetId: j.assetId, audio: "/api/media/" + j.id } : {}),
    ...(j.error ? { error: j.error } : {}),
    ...(j.published ? { published: true } : {}),
  });
  async function job(id) {
    requestId(id);
    const j = await json(path.join(jobsDir, id + ".json"));
    if (!j) throw fail("找不到这次操作。");
    return publicJob(j);
  }
  async function article(file) {
    if (
      typeof file !== "string" ||
      !/^content\/(zh|en)\/(growth|ai-agent|engineering)\/posts\/.+\.md$/.test(
        file,
      ) ||
      file.split("/").some((p) => p === ".." || p === ".") ||
      file.includes("\\")
    )
      throw fail("请选择博客中的文章。");
    const actual = await realpath(path.join(root, file)),
      content = await realpath(path.join(root, "content"));
    if (!actual.startsWith(content + path.sep)) throw fail("文章路径无效。");
    const text = await readFile(actual, "utf8");
    return { ...readSource(text), file, text, actual };
  }
  async function articles() {
    const rows = [];
    async function walk(dir) {
      for (const e of await readdir(dir, { withFileTypes: true }).catch(
        () => [],
      )) {
        const file = path.join(dir, e.name);
        if (e.isDirectory()) await walk(file);
        else if (
          e.isFile() &&
          e.name.endsWith(".md") &&
          !e.name.startsWith("_")
        ) {
          try {
            const row = await article(
              path.relative(root, file).split(path.sep).join("/"),
            );
            rows.push({
              file: row.file,
              title: row.title,
              date: row.meta.date || "",
              hasAudio: !!(
                row.meta.authorAudio || row.meta.authorAudioTracks?.length
              ),
            });
          } catch {}
        }
      }
    }
    for (const lang of ["zh", "en"])
      for (const section of ["growth", "ai-agent", "engineering"])
        await walk(path.join(root, "content", lang, section, "posts"));
    return rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }
  async function state() {
    const p = await profile(),
      rows = [];
    for (const file of await readdir(jobsDir)) {
      if (/^[A-Za-z0-9_-]+\.json$/.test(file))
        rows.push(await json(path.join(jobsDir, file)));
    }
    return {
      configured: !!apiKey,
      voice: { ready: !!p?.id, name: p?.name || "我的声音" },
      busy,
      jobs: rows
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 20)
        .map(publicJob),
    };
  }
  async function provider(route, body, signal) {
    if (!apiKey) throw fail("尚未配置 Gemini 密钥来源。");
    const response = await fetcher(endpoint + route, {
      method: "POST",
      redirect: "error",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(75000)])
        : AbortSignal.timeout(75000),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const diagnostic = await response.text().catch(() => "");
      if (
        route === "voices" &&
        /Consent flow failed|recorded phrase didn't match|FINISH_REASON_INPUT_VR_TAKEDOWN/i.test(
          diagnostic,
        )
      )
        throw fail(
          "Google 未通过授权录音核验。请单独、完整地读出授权句，不加介绍或其他话；不会自动重试。",
        );
      throw fail(
        response.status === 429
          ? "Google 当前额度不足或繁忙；不会自动重试。"
          : response.status === 401 || response.status === 403
            ? "Google 拒绝了这次请求，请检查共享密钥的权限。"
            : response.status === 400
              ? "Google 未接受这次内容或录音，请核对录音与授权语句。"
              : "Google 请求未能确认；再次提交可能再次计费。",
      );
    }
    return response.json();
  }
  async function existing(input, signature) {
    const id = requestId(input.requestId),
      old = await json(path.join(jobsDir, id + ".json"));
    if (old && old.signature !== signature)
      throw fail("操作标识已经用于另一份内容。");
    return old;
  }
  async function createVoice(input) {
    if (input.confirmed !== true)
      throw fail("请确认录音属于你本人，并已读出授权语句。");
    const reference = decodeAudio(input.reference),
      consent = decodeAudio(input.consent),
      seconds = wavInfo(reference).duration;
    if (
      seconds < 10 ||
      seconds > 30 ||
      wavInfo(consent).duration < 2 ||
      wavInfo(consent).duration > 60
    )
      throw fail("参考录音须为 10–30 秒，授权录音须完整且不超过一分钟。");
    const signature = hash(
        reference.toString("base64") + consent.toString("base64"),
      ),
      old = await existing(input, signature);
    if (old) return publicJob(old);
    if (busy) throw fail("已有操作正在准备，请等它完成。");
    busy = true;
    const j = {
      id: input.requestId,
      signature,
      type: "voice",
      status: "preparing",
      createdAt: new Date().toISOString(),
    };
    try {
      await save(path.join(jobsDir, j.id + ".json"), j);
      const recordingsDir = path.join(privateDir, "recordings");
      await mkdir(recordingsDir, { recursive: true, mode: 0o700 });
      await saveBytes(
        path.join(recordingsDir, j.id + "-reference.wav"),
        reference,
      );
      await saveBytes(path.join(recordingsDir, j.id + "-consent.wav"), consent);
      const result = await provider("voices", {
        store: true,
        voice: {
          model: VOICE_MODEL,
          type: "replicated",
          display_name: "Xinwei author voice",
          language_code: "zh-CN",
          replicated: {
            source_audio: {
              mime_type: "audio/wav",
              data: reference.toString("base64"),
            },
            consent_audio: {
              mime_type: "audio/wav",
              data: consent.toString("base64"),
            },
          },
        },
      });
      if (!/^voice_[A-Za-z0-9_-]+$/.test(result.id || ""))
        throw fail("Google 没有返回可保存的个人声音；不会自动重试。");
      await save(path.join(privateDir, "profile.json"), {
        id: result.id,
        name: "我的声音",
        model: VOICE_MODEL,
        createdAt: j.createdAt,
      });
      j.status = "ready";
      await save(path.join(jobsDir, j.id + ".json"), j);
      return publicJob(j);
    } catch (error) {
      j.status = "failed";
      j.error = safe(error);
      await save(path.join(jobsDir, j.id + ".json"), j);
      throw fail(j.error);
    } finally {
      busy = false;
    }
  }
  async function begin(input, origin) {
    if (
      typeof input.text !== "string" ||
      !input.text.trim() ||
      input.text.length > 50000
    )
      throw fail("请填写确认过的口播稿，最多 5 万字符。");
    const source = await article(input.article),
      p = origin === "synthetic" ? await profile() : null;
    if (origin === "synthetic" && !p?.id)
      throw fail("请先创建你的个人声音，或上传真人原声。");
    const recording = origin === "recorded" ? decodeAudio(input.audio) : null;
    if (recording && wavInfo(recording).duration > 900)
      throw fail("原声请分成不超过 15 分钟的片段。");
    if (input.sourceHash && input.sourceHash !== source.sourceHash)
      throw fail("正文已经更新，请重新整理讲解稿。");
    const kind = [...READER_KINDS, "afterword", "intro"].includes(input.kind)
      ? input.kind
      : "intro";
    const section =
      kind === "section"
        ? readerSections(source.body).find((s) => s.key === input.sectionKey)
        : null;
    if (kind === "section" && !section)
      throw fail("这一节已变化，请重新选择。");
    const style = "自然、平静，像和朋友聊天；保留原有音色，避免播音腔。",
      signature = hash(
        JSON.stringify([
          source.file,
          source.sourceHash,
          input.text,
          kind,
          section?.key || null,
          origin,
          origin === "synthetic" ? p?.id || null : null,
          recording ? hash(recording) : null,
        ]),
      ),
      old = await existing(input, signature);
    if (old) return publicJob(old);
    if (busy) throw fail("已有操作正在准备，请等它完成。");
    busy = true;
    const pieces = recording ? [] : chunks(input.text),
      j = {
        id: input.requestId,
        signature,
        type: "audio",
        origin,
        article: source.file,
        title: source.title,
        sourceHash: source.sourceHash,
        text: input.text,
        kind,
        sectionKey: section?.key,
        sectionTitle: section?.title,
        sectionOccurrence: section?.occurrence,
        status: "preparing",
        createdAt: new Date().toISOString(),
        completed: 0,
        total: recording ? 1 : pieces.length,
      };
    try {
      await save(path.join(jobsDir, j.id + ".json"), j);
    } catch (e) {
      busy = false;
      throw e;
    }
    const controller = new AbortController();
    activeJob = { id: j.id, controller };
    async function work() {
      try {
        const sounds = [];
        for (const text of pieces) {
          controller.signal.throwIfAborted();
          const key = hash(JSON.stringify([VOICE_MODEL, p.id, style, text])),
            file = path.join(cacheDir, key + ".wav");
          let bytes = await exists(file);
          if (!bytes) {
            const result = await provider(
              "interactions",
              {
                model: VOICE_MODEL,
                input: [
                  {
                    type: "user_input",
                    content: [
                      {
                        type: "text",
                        text,
                        annotations: [{ type: "speech_metadata", style }],
                      },
                    ],
                  },
                ],
                response_format: { type: "audio" },
                generation_config: { speech_config: [{ voice: p.id }] },
              },
              controller.signal,
            );
            controller.signal.throwIfAborted();
            const audios =
              result.steps
                ?.filter((s) => s.type === "model_output")
                .flatMap((s) => s.content || [])
                .filter((c) => c.type === "audio") || [];
            const audio = audios.at(-1);
            if (
              audio?.mime_type !== "audio/wav" ||
              typeof audio.data !== "string"
            )
              throw fail("Google 没有返回完整 WAV，未发布任何音频。");
            bytes = Buffer.from(audio.data, "base64");
            wavInfo(bytes);
            await saveBytes(file, bytes);
          }
          wavInfo(bytes);
          sounds.push(bytes);
          j.completed++;
          await save(path.join(jobsDir, j.id + ".json"), j);
        }
        controller.signal.throwIfAborted();
        const wav = recording || joinWav(sounds);
        await saveBytes(path.join(jobsDir, j.id + ".wav"), wav);
        const encoded = await encode(wav);
        controller.signal.throwIfAborted();
        await saveBytes(path.join(jobsDir, j.id + ".mp3"), encoded);
        controller.signal.throwIfAborted();
        j.durationSeconds = wavInfo(wav).duration;
        j.audioSha256 = hash(encoded);
        j.assetId = hash(
          JSON.stringify([
            j.audioSha256,
            j.sourceHash,
            j.kind,
            j.sectionKey || null,
            j.text,
            j.origin,
          ]),
        );
        j.status = "ready";
        j.completed = j.total;
      } catch (error) {
        j.status = controller.signal.aborted ? "cancelled" : "failed";
        j.error = controller.signal.aborted
          ? "已停止准备，完成的片段会留在本机缓存。"
          : safe(error);
      } finally {
        try {
          await save(path.join(jobsDir, j.id + ".json"), j);
        } finally {
          busy = false;
          if (activeJob?.id === j.id) activeJob = null;
        }
      }
    }
    const done = work().catch(() => {
      busy = false;
    });
    activeJob.done = done;
    return publicJob(j);
  }
  async function cancel(id) {
    requestId(id);
    const j = await json(path.join(jobsDir, id + ".json"));
    if (!j) throw fail("找不到这次操作。");
    if (j.status === "preparing" && activeJob?.id === id) {
      const running = activeJob;
      running.controller.abort();
      await running.done;
      j.status = "cancelled";
      j.error = "已停止准备，完成的片段会留在本机缓存。";
      await save(path.join(jobsDir, id + ".json"), j);
    }
    return publicJob(j);
  }
  async function media(id) {
    const j = await job(id);
    if (j.status !== "ready" || j.type !== "audio")
      throw fail("声音还没有准备好。");
    return readFile(path.join(jobsDir, id + ".mp3"));
  }
  async function publish({ id, reviewed }) {
    if (reviewed !== true) throw fail("请先试听并确认这份音频。");
    requestId(id);
    const j = await json(path.join(jobsDir, id + ".json"));
    if (j?.status !== "ready" || j.type !== "audio")
      throw fail("音频还未准备好。");
    if (activeJob?.id === id && activeJob.controller.signal.aborted)
      throw fail("这次声音准备已经停止。");
    const source = await article(j.article);
    if (source.sourceHash !== j.sourceHash)
      throw fail("正文已经更新，请重新检查并准备音频。");
    const audioKeys = Object.keys(source.meta).filter(
      (key) => key.toLowerCase() === "authoraudio",
    );
    if (
      audioKeys.length > 1 ||
      (audioKeys.length && typeof source.meta[audioKeys[0]] !== "string")
    )
      throw fail("文章已有其他音频配置，请先人工检查。");
    const bytes = await media(id);
    if (hash(bytes) !== j.audioSha256) throw fail("音频文件校验失败。");
    const directory = path.join(root, "static/audio/author");
    await mkdir(directory, { recursive: true });
    await atomicPublicWrite(path.join(directory, j.assetId + ".mp3"), bytes, {
      mode: 0o644,
    });
    const publicManifest = {
      version: READER_KINDS.includes(j.kind) ? 2 : 1,
      sectionKey: j.sectionKey,
      sectionTitle: j.sectionTitle,
      sectionOccurrence: j.sectionOccurrence,
      src: "/audio/author/" + j.assetId + ".mp3",
      sourceHash: j.sourceHash,
      title: j.title,
      text: j.text,
      kind: j.kind,
      origin: j.origin,
      createdAt: j.createdAt,
      durationSeconds: j.durationSeconds,
      sha256: j.audioSha256,
      reviewed: true,
    };
    await atomicPublicWrite(
      path.join(directory, j.assetId + ".json"),
      JSON.stringify(publicManifest, null, 2) + "\n",
      { mode: 0o644 },
    );
    let updated;
    if (READER_KINDS.includes(j.kind)) {
      const keys = Object.keys(source.meta).filter(
        (k) => k.toLowerCase() === "authoraudiotracks",
      );
      const ids = source.meta[keys[0]] || [];
      if (
        keys.length > 1 ||
        !Array.isArray(ids) ||
        ids.some((id) => !validAudioId(id))
      )
        throw fail("文章已有其他音频配置，请先人工检查。");
      const previous = [];
      for (const id of ids) {
        const manifest = await json(path.join(directory, id + ".json"));
        if (!manifest || manifest.version !== 2)
          throw fail("已有讲解音频缺少清单，请先检查。");
        previous.push({ ...manifest, id });
      }
      updated = setYamlField(
        source,
        keys[0] || "authorAudioTracks",
        updateAudioTracks(previous, {
          id: j.assetId,
          kind: j.kind,
          sectionKey: j.sectionKey,
          sectionTitle: j.sectionTitle,
          sectionOccurrence: j.sectionOccurrence,
        }),
      );
    } else {
      const oldLine = /^authoraudio\s*:.*/im,
        header = source.header;
      const next = oldLine.test(header)
        ? header.replace(oldLine, "authorAudio: " + j.assetId)
        : header.replace(
            /\r?\n---(\r?\n|$)$/,
            "\nauthorAudio: " + j.assetId + "\n---$1",
          );
      updated = next + source.body;
    }
    // Check after preparing the replacement, immediately before the atomic rename.
    await atomicPublicWrite(source.actual, updated, { expected: source.text });
    j.published = true;
    await save(path.join(jobsDir, id + ".json"), j);
    return publicJob(j);
  }
  async function draft(input) {
    const source = await article(input.article),
      prompt = makeAudioPrompt(source, input);
    const signature = hash(
      JSON.stringify([
        source.file,
        source.sourceHash,
        input.kind,
        input.sectionKey || null,
        "script-v1",
      ]),
    );
    const old = await existing(input, signature);
    if (old) return publicJob(old);
    if (busy) throw fail("已有操作正在准备，请等它完成。");
    busy = true;
    const j = {
      id: input.requestId,
      signature,
      type: "script",
      status: "preparing",
      article: source.file,
      title: source.title,
      sourceHash: source.sourceHash,
      kind: input.kind,
      sectionKey: prompt.section?.key,
      sectionTitle: prompt.section?.title,
      createdAt: new Date().toISOString(),
    };
    try {
      await save(path.join(jobsDir, j.id + ".json"), j);
      const result = await provider("models/gemini-3.8-flash:generateContent", {
        systemInstruction: { parts: [{ text: prompt.instruction }] },
        contents: [{ role: "user", parts: [{ text: prompt.context }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
      });
      const candidate = result.candidates?.[0];
      const text = candidate?.content?.parts
        ?.filter((p) => !p.thought)
        .map((p) => p.text || "")
        .join("")
        .trim();
      if (
        !text ||
        text.length > 12000 ||
        (candidate.finishReason && candidate.finishReason !== "STOP")
      )
        throw fail("讲解稿未完整返回，请检查后重新整理；不会自动重试。");
      if ((await article(source.file)).sourceHash !== source.sourceHash)
        throw fail("正文已经更新，请重新整理讲解稿。");
      j.text = text;
      j.status = "ready";
      await save(path.join(jobsDir, j.id + ".json"), j);
      return publicJob(j);
    } catch (error) {
      j.status = "failed";
      j.error = safe(error);
      await save(path.join(jobsDir, j.id + ".json"), j);
      throw fail(j.error);
    } finally {
      busy = false;
    }
  }
  return {
    state,
    articles,
    article: async (file) => {
      const row = await article(file);
      return {
        file: row.file,
        title: row.title,
        sourceHash: row.sourceHash,
        sections: readerSections(row.body).map(({ key, title }) => ({
          key,
          title,
        })),
        questions: [
          "你为什么想写《" + row.title + "》？",
          "哪段亲身经历最能说明这篇文章的判断？",
          "现在回看，你最想补充或修正什么？",
        ],
      };
    },
    job,
    draft,
    createVoice,
    generate: (input) => begin(input, "synthetic"),
    importRecording: (input) => begin(input, "recorded"),
    publish,
    media,
    cancel,
  };
}
