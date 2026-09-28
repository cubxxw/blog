import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildIndex } from "./generate-content-index.mjs";
test("index follows Hugo published page set and excludes future documents", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "index-published-"));
  try {
    fs.mkdirSync(path.join(root, "content/en"), { recursive: true });
    for (const [name, date] of [
      ["now", "2025-01-01"],
      ["future", "2099-01-01"],
    ])
      fs.writeFileSync(
        path.join(root, `content/en/${name}.md`),
        `---\ntitle: ${name}\ndate: ${date}T00:00:00+08:00\n---\nBody`,
      );
    const result = buildIndex({
      root,
      clock: "2026-09-28T00:00:00Z",
      publishedPages: [
        { source: "content/en/now.md", url: "https://cubxxw.com/custom/" },
      ],
    });
    assert.equal(result.totalDocuments, 1);
    assert.equal(result.documents[0].permalink, "/custom/");
    assert.equal(result.generatedAt, "2026-09-28T00:00:00Z");
    assert.equal(
      buildIndex({ root, clock: "2026-09-28T00:00:00Z" }).totalDocuments,
      1,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
