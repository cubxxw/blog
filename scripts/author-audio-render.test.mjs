import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  copyFile,
  readFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

test("the real Hugo partial emits only reviewed audio, source-change notices and escaped transcripts", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "author-audio-render-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const dir of [
    "layouts/_default",
    "layouts/partials/article",
    "assets/css",
    "assets/js",
    "content",
    "static/audio/author",
  ])
    await mkdir(path.join(root, dir), { recursive: true });
  for (const file of [
    "layouts/partials/article/author-audio.html",
    "assets/css/author-audio.css",
    "assets/js/author-audio.js",
  ])
    await copyFile(file, path.join(root, file));
  await writeFile(
    path.join(root, "hugo.toml"),
    'baseURL="https://example.test/"\ndefaultContentLanguage="zh"\n',
  );
  await writeFile(
    path.join(root, "layouts/_default/single.html"),
    '<!doctype html><html lang="{{ .Lang }}"><body>{{ partial "article/author-audio.html" (dict "page" . "placement" "intro") }}<h1>{{ .Title }}</h1>{{ .Content }}{{ partial "article/author-audio.html" (dict "page" . "placement" "afterword") }}</body></html>',
  );
  const id = "a".repeat(64),
    body = "原来的正文。",
    sourceHash = createHash("sha256")
      .update("我的故事\n" + body)
      .digest("hex");
  const manifest = {
    version: 1,
    src: "/audio/author/" + id + ".mp3",
    text: "<script>unsafe()</script>\n作者补充。",
    kind: "intro",
    origin: "synthetic",
    sourceHash,
    reviewed: true,
    durationSeconds: 72,
  };
  await writeFile(
    path.join(root, "static/audio/author", id + ".mp3"),
    "fixture",
  );
  await writeFile(
    path.join(root, "static/audio/author", id + ".json"),
    JSON.stringify(manifest),
  );
  for (const [name, text, extra] of [
    ["ready", body, "authorAudio: " + id],
    ["stale", body + "后来修改。", "authorAudio: " + id],
    ["plain", body, ""],
    ["unreviewed", body, "authorAudio: " + "b".repeat(64)],
  ])
    await writeFile(
      path.join(root, "content", name + ".md"),
      "---\ntitle: 我的故事\n" + extra + "\n---\n\n" + text + "\n",
    );
  await writeFile(
    path.join(root, "static/audio/author", "b".repeat(64) + ".mp3"),
    "fixture",
  );
  await writeFile(
    path.join(root, "static/audio/author", "b".repeat(64) + ".json"),
    JSON.stringify({ ...manifest, reviewed: false }),
  );
  const narratorId = "e".repeat(64);
  await writeFile(path.join(root, "static/audio/author", narratorId + ".mp3"), "fixture");
  await writeFile(path.join(root, "static/audio/author", narratorId + ".json"), JSON.stringify({ ...manifest, voiceType: "prebuilt" }));
  await writeFile(path.join(root, "content/narrated.md"), "---\ntitle: 我的故事\nauthorAudio: " + narratorId + "\n---\n\n" + body + "\n");
  const summaryId = "c".repeat(64),
    sectionId = "d".repeat(64);
  const sectionBody = "## 一个难点\n\n正文。";
  const sectionHash = createHash("sha256")
    .update("我的故事\n" + sectionBody)
    .digest("hex");
  for (const [id, kind] of [
    [summaryId, "summary"],
    [sectionId, "section"],
  ]) {
    await writeFile(
      path.join(root, "static/audio/author", id + ".mp3"),
      "fixture",
    );
    await writeFile(
      path.join(root, "static/audio/author", id + ".json"),
      JSON.stringify({
        ...manifest,
        version: 2,
        kind,
        sourceHash: sectionHash,
        sectionTitle: "一个难点",
        sectionKey: "s0",
        sectionOccurrence: 1,
      }),
    );
  }
  await writeFile(
    path.join(root, "content/multi.md"),
    "---\ntitle: 我的故事\nauthorAudioTracks: [" +
      sectionId +
      ", " +
      summaryId +
      "]\n---\n\n" +
      sectionBody +
      "\n",
  );
  const result = spawnSync(
    process.env.HUGO_BIN || "hugo",
    ["--source", root, "--destination", path.join(root, "public")],
    { encoding: "utf8", timeout: 20000 },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const html = await readFile(
    path.join(root, "public/ready/index.html"),
    "utf8",
  );
  assert.match(html, /听我聊聊这篇/);
  assert.match(html, /作者音色合成/);
  const narrated = await readFile(path.join(root, "public/narrated/index.html"), "utf8");
  assert.match(narrated, /AI 旁白/);
  assert.ok(!narrated.includes("作者音色合成"));
  assert.ok(!narrated.includes("内容经作者核对"));
  assert.match(html, /1:12/);
  assert.match(html, /preload="none"/);
  assert.ok(!html.includes("autoplay"));
  assert.ok(!html.includes("正文已更新"));
  assert.match(html, /&lt;script&gt;/);
  assert.ok(!html.includes("<script>unsafe"));
  assert.match(
    await readFile(path.join(root, "public/stale/index.html"), "utf8"),
    /正文已更新/,
  );
  const multi = await readFile(
    path.join(root, "public/multi/index.html"),
    "utf8",
  );
  assert.match(multi, /data-audio-track-select/);
  assert.match(multi, /data-audio-anchor="一个难点"/);
  assert.ok(
    multi.indexOf('value="' + summaryId + '"') <
      multi.indexOf('value="' + sectionId + '"'),
  );
  assert.ok(decodeURIComponent(multi).includes('href="#一个难点"'));
  for (const name of ["plain", "unreviewed"])
    assert.ok(
      !(
        await readFile(path.join(root, "public", name, "index.html"), "utf8")
      ).includes("data-author-audio"),
    );
  const subpath = spawnSync(
    process.env.HUGO_BIN || "hugo",
    [
      "--source",
      root,
      "--baseURL",
      "https://example.test/blog/",
      "--destination",
      path.join(root, "public-subpath"),
    ],
    { encoding: "utf8", timeout: 20000 },
  );
  assert.equal(subpath.status, 0, subpath.stdout + subpath.stderr);
  const nested = await readFile(
    path.join(root, "public-subpath/ready/index.html"),
    "utf8",
  );
  assert.ok(nested.includes('src="/blog/audio/author/' + id + '.mp3"'));
  assert.ok(nested.includes('href="/blog/audio/author/' + id + '.mp3"'));
});
