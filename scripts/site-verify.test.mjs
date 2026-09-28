import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { selectBrowserPages, verifySite } from "./site-verify.mjs";
import { createOutputServer, resolveOutputFile } from "./serve-site-output.mjs";
const map = {
  schema: "blog-page-map/1",
  sourceSha: "a".repeat(40),
  clock: "2026-09-28T00:00:00Z",
  target: "production",
  baseUrl: "https://cubxxw.com",
  complete: true,
  pages: [
    {
      source: "content/en/engineering/posts/a.md",
      url: "https://cubxxw.com/engineering/posts/a/",
      kind: "page",
    },
    {
      source: "content/zh/engineering/posts/a.md",
      url: "https://cubxxw.com/zh/engineering/posts/a/",
      kind: "page",
    },
    { source: null, url: "https://cubxxw.com/", kind: "home" },
    { source: null, url: "https://cubxxw.com/zh/", kind: "home" },
    { source: null, url: "https://cubxxw.com/projects/", kind: "section" },
  ],
};
test("changed article selects its existing bilingual pair", () => {
  assert.deepEqual(
    selectBrowserPages({
      changeSet: {
        fullScan: false,
        sourceFiles: ["content/en/engineering/posts/a.md"],
        files: [],
        suites: ["browser"],
      },
      pageMap: map,
    }),
    ["/engineering/posts/a/", "/zh/engineering/posts/a/"],
  );
});
test("shared rendering selects representative pages in both languages", () => {
  const pages = selectBrowserPages({
    changeSet: {
      fullScan: false,
      sourceFiles: [],
      files: [{ path: "assets/css/site.css" }],
      suites: ["output", "browser"],
    },
    pageMap: map,
  });
  for (const page of [
    "/",
    "/zh/",
    "/projects/",
    "/engineering/posts/a/",
    "/zh/engineering/posts/a/",
  ])
    assert.ok(pages.includes(page));
});
test("static server reads frozen bytes and rejects traversal and escaping symlinks", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "site-server-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "index.html"), "frozen");
  fs.symlinkSync("/etc/passwd", path.join(root, "leak"));
  for (const url of ["/../secret", "/%2e%2e/secret", "/leak", "/%zz"])
    assert.equal(resolveOutputFile(root, url), null);
  const server = createOutputServer({ publicDir: root });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => server.close());
  const response = await fetch(`http://127.0.0.1:${server.address().port}/`);
  assert.equal(await response.text(), "frozen");
});
test("verification invokes only Playwright and rejects mutated production bytes", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "site-verify-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "public"));
  fs.writeFileSync(path.join(root, "public/index.html"), "frozen");
  fs.writeFileSync(path.join(root, "page-map.json"), JSON.stringify(map));
  fs.writeFileSync(
    path.join(root, "change-set.json"),
    JSON.stringify({
      fullScan: true,
      sourceFiles: [],
      files: [],
      suites: ["browser"],
    }),
  );
  const calls = [];
  const options = {
    publicDir: path.join(root, "public"),
    pageMapPath: path.join(root, "page-map.json"),
    changeSetPath: path.join(root, "change-set.json"),
    reportDir: path.join(root, "reports"),
  };
  const result = await verifySite({
    ...options,
    exec: async (call) => {
      calls.push(call);
      return { status: 0 };
    },
  });
  assert.equal(result.ok, true);
  assert.ok(calls.every((c) => !c.command.includes("hugo")));
  assert.ok(calls[0].env.SITE_PAGE_LIST);
  await assert.rejects(
    () =>
      verifySite({
        ...options,
        exec: async () => {
          fs.appendFileSync(path.join(root, "public/index.html"), "tampered");
          return { status: 0 };
        },
      }),
    /changed|mutat/,
  );
});
test("missing input scope and incomplete page maps fail closed", () => {
  assert.throws(
    () => selectBrowserPages({ changeSet: null, pageMap: map }),
    /change/,
  );
  assert.throws(
    () =>
      selectBrowserPages({
        changeSet: { fullScan: true, sourceFiles: [], files: [] },
        pageMap: { ...map, complete: false },
      }),
    /complete/i,
  );
});
test("shared fullScan uses representatives instead of every article from source scope", () => {
  const extra = Array.from({ length: 50 }, (_, i) => ({
    source: `content/en/engineering/posts/extra-${i}.md`,
    url: `https://cubxxw.com/engineering/posts/extra-${i}/`,
    kind: "page",
  }));
  const pages = selectBrowserPages({
    changeSet: {
      fullScan: true,
      sourceFiles: extra.map((p) => p.source),
      files: [{ path: "assets/css/site.css" }],
      suites: ["browser"],
    },
    pageMap: { ...map, pages: [...map.pages, ...extra] },
  });
  assert.ok(pages.length < 15);
});

function verificationFixture(t, changeSet, target = "production") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "browser-suites-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "public"));
  fs.writeFileSync(path.join(root, "public/index.html"), "frozen");
  fs.writeFileSync(
    path.join(root, "page-map.json"),
    JSON.stringify({ ...map, target }),
  );
  fs.writeFileSync(
    path.join(root, "change-set.json"),
    JSON.stringify(changeSet),
  );
  return {
    publicDir: path.join(root, "public"),
    pageMapPath: path.join(root, "page-map.json"),
    changeSetPath: path.join(root, "change-set.json"),
    reportDir: path.join(root, "reports"),
  };
}

test("article-only changes run the four-project quality suite without legacy rebuild or coverage expansion", async (t) => {
  const options = verificationFixture(t, {
    fullScan: false,
    files: [{ status: "M", path: "content/en/engineering/posts/a.md" }],
    sourceFiles: ["content/en/engineering/posts/a.md"],
  });
  const calls = [];
  const result = await verifySite({
    ...options,
    exec: async (call) => {
      calls.push(call);
      return { status: 0 };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].args.includes("--config=playwright.quality.config.ts"));
});

test("shared frontend changes retain legacy desktop/mobile coverage on the exact same public output", async (t) => {
  const options = verificationFixture(t, {
    fullScan: true,
    files: [{ status: "M", path: "layouts/partials/head.html" }],
    sourceFiles: [],
  });
  const calls = [];
  const result = await verifySite({
    ...options,
    exec: async (call) => {
      calls.push(call);
      return { status: 0 };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(calls.length, 2);
  assert.ok(calls[1].args.includes("--config=playwright.config.ts"));
  assert.equal(
    calls[1].args[calls[1].args.indexOf("--grep-invert") + 1],
    "Visual Regression",
  );
  assert.equal(calls[0].env.SITE_OUTPUT_DIR, calls[1].env.SITE_OUTPUT_DIR);
  assert.notEqual(
    calls[0].env.SITE_TEST_RESULTS,
    calls[1].env.SITE_TEST_RESULTS,
  );
  const report = JSON.parse(fs.readFileSync(result.reportPath));
  assert.deepEqual(
    report.suites.map((s) => [s.name, s.status]),
    [
      ["quality", "success"],
      ["legacy", "success"],
    ],
  );
});

test("successful content checks cannot hide a failing required legacy suite", async (t) => {
  const options = verificationFixture(t, {
    fullScan: false,
    files: [{ status: "M", path: "assets/css/layout.css" }],
    sourceFiles: [],
  });
  let count = 0;
  const result = await verifySite({
    ...options,
    exec: async () => ({ status: count++ === 0 ? 0 : 1 }),
  });
  assert.equal(result.ok, false);
  const report = JSON.parse(fs.readFileSync(result.reportPath));
  assert.equal(report.mode, "enforce");
  assert.equal(report.ok, false);
  assert.equal(
    report.suites.find((s) => s.name === "legacy").status,
    "failure",
  );
});

test("backup uses its own capability coverage and explicitly omits production legacy assertions", async (t) => {
  const options = verificationFixture(
    t,
    {
      fullScan: true,
      files: [{ status: "M", path: "config/ci-backup.yml" }],
      sourceFiles: [],
    },
    "backup",
  );
  const calls = [];
  const result = await verifySite({
    ...options,
    exec: async (call) => {
      calls.push(call);
      return { status: 0 };
    },
  });
  assert.equal(calls.length, 1);
  const report = JSON.parse(fs.readFileSync(result.reportPath));
  assert.equal(report.legacy.required, false);
  assert.match(report.legacy.reason, /backup/i);
});
