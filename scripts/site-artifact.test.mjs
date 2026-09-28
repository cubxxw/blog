import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  createManifest,
  verifyArtifact,
  packageArtifact,
  writeReleaseMarker,
  objectDigest,
} from "./lib/site-artifact.mjs";
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "site-artifact-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "public"));
  fs.mkdirSync(path.join(root, "functions"));
  fs.writeFileSync(
    path.join(root, "public/index.html"),
    "<html>same frozen bytes</html>",
  );
  fs.writeFileSync(path.join(root, "functions/test.zip"), "compiled zip");
  fs.writeFileSync(
    path.join(root, "deploy-config.toml"),
    '[functions]\ndirectory="functions"',
  );
  const pageMap = {
    schema: "blog-page-map/1",
    sourceSha: "a".repeat(40),
    clock: "2026-09-28T00:00:00Z",
    target: "production",
    baseUrl: "https://cubxxw.com",
    complete: true,
    pages: [],
  };
  fs.writeFileSync(
    path.join(root, "page-map.json"),
    JSON.stringify(pageMap, null, 2),
  );
  writeReleaseMarker({
    bundleRoot: root,
    sourceSha: pageMap.sourceSha,
    releaseId: "run-12-1",
    clock: pageMap.clock,
  });
  const reports = Object.fromEntries(
    ["source", "output", "browser"].map((name) => [
      name,
      { mode: "enforce", ok: true, name },
    ]),
  );
  for (const [name, report] of Object.entries(reports))
    fs.writeFileSync(
      path.join(root, `${name}-report.json`),
      JSON.stringify(report),
    );
  const options = {
    bundleRoot: root,
    sourceSha: pageMap.sourceSha,
    inputDigest: "b".repeat(64),
    releaseId: "run-12-1",
    target: "production",
    clock: pageMap.clock,
    toolchain: { node: "22.23.1" },
    pageMap,
    requiredChecks: ["source", "output", "browser"],
    checks: ["source", "output", "browser"].map((name) => ({
      name,
      status: "success",
      reportDigest: objectDigest(reports[name]),
    })),
  };
  return {
    root,
    options,
    verify: (manifest) =>
      verifyArtifact({
        bundleRoot: root,
        manifest,
        expectedSha: pageMap.sourceSha,
        expectedTarget: "production",
        requiredChecks: options.requiredChecks,
      }),
  };
}
test("manifest freezes deployment bytes but excludes its own bytes and report metadata", (t) => {
  const f = fixture(t);
  const manifest = createManifest(f.options);
  fs.writeFileSync(
    path.join(f.root, "manifest.json"),
    JSON.stringify(manifest),
  );
  fs.appendFileSync(path.join(f.root, "browser-report.json"), "\n");
  f.verify(manifest);
  assert.ok(
    !manifest.files.some(
      (f) => f.path === "manifest.json" || f.path === "page-map.json",
    ),
  );
  assert.equal(createManifest(f.options).fileSetDigest, manifest.fileSetDigest);
  fs.appendFileSync(path.join(f.root, "public/index.html"), "x");
  assert.throws(() => f.verify(manifest), /digest/);
});
test("traversal, absolute path, duplicate files and symlinks cannot be admitted", (t) => {
  const f = fixture(t);
  const m = createManifest(f.options);
  for (const p of [
    "../outside",
    "/etc/passwd",
    "public/../.env",
    "public/%2e%2e/.env",
    "public/..\\secret",
  ])
    assert.throws(
      () =>
        f.verify({
          ...m,
          files: [{ path: p, sha256: "a".repeat(64), bytes: 1 }],
        }),
      /path|allowlist/,
    );
  assert.throws(
    () => f.verify({ ...m, files: [...m.files, m.files[0]] }),
    /duplicate/,
  );
  fs.symlinkSync("/etc/passwd", path.join(f.root, "public/leak"));
  assert.throws(() => createManifest(f.options), /symlink/);
});
test("unexpected secrets and local Netlify state reject the whole artifact", (t) => {
  const f = fixture(t);
  for (const p of [
    ".env",
    "public/.env",
    "functions/source.js",
    ".netlify/state.json",
  ]) {
    fs.mkdirSync(path.dirname(path.join(f.root, p)), { recursive: true });
    fs.writeFileSync(path.join(f.root, p), "secret");
    assert.throws(() => createManifest(f.options), /allowlist/);
    fs.rmSync(path.join(f.root, p));
  }
});
test("trusted required-check list and page-map digest cannot be weakened", (t) => {
  const f = fixture(t);
  const m = createManifest(f.options);
  assert.throws(
    () =>
      f.verify({
        ...m,
        requiredChecks: ["source"],
        checks: m.checks.slice(0, 1),
      }),
    /check/,
  );
  assert.throws(
    () =>
      createManifest({
        ...f.options,
        checks: f.options.checks.map((c) => ({ ...c, status: "skipped" })),
      }),
    /check/,
  );
  fs.writeFileSync(path.join(f.root, "page-map.json"), "{}");
  assert.throws(() => f.verify(m), /page.map/);
});
test("release marker is public-only and included before freeze; archive survives unpack", (t) => {
  const f = fixture(t);
  const m = createManifest(f.options);
  assert.deepEqual(
    Object.keys(
      JSON.parse(fs.readFileSync(path.join(f.root, "public/__release.json"))),
    ),
    ["sourceSha", "releaseId", "clock"],
  );
  fs.writeFileSync(path.join(f.root, "manifest.json"), JSON.stringify(m));
  const archive = path.join(
    os.tmpdir(),
    `blog-archive-${process.pid}-${Date.now()}.tar.gz`,
  );
  t.after(() => fs.rmSync(archive, { force: true }));
  const packed = packageArtifact({
    bundleRoot: f.root,
    manifest: m,
    outFile: archive,
    requiredChecks: f.options.requiredChecks,
  });
  assert.match(packed.archiveSha256, /^[a-f0-9]{64}$/);
  const unpack = fs.mkdtempSync(path.join(os.tmpdir(), "blog-unpack-"));
  t.after(() => fs.rmSync(unpack, { recursive: true, force: true }));
  execFileSync("tar", ["-xzf", archive, "-C", unpack]);
  verifyArtifact({
    bundleRoot: unpack,
    manifest: m,
    expectedSha: m.sourceSha,
    expectedTarget: "production",
    requiredChecks: f.options.requiredChecks,
  });
});

test("required report evidence cannot be missing, advisory or replaced", (t) => {
  const f = fixture(t),
    m = createManifest(f.options),
    report = path.join(f.root, "browser-report.json"),
    original = fs.readFileSync(report);
  fs.rmSync(report);
  assert.throws(() => f.verify(m), /report/);
  fs.writeFileSync(
    report,
    JSON.stringify({ mode: "report-only", ok: true, name: "browser" }),
  );
  assert.throws(() => f.verify(m), /report/);
  fs.writeFileSync(
    report,
    JSON.stringify({ mode: "enforce", ok: true, name: "changed" }),
  );
  assert.throws(() => f.verify(m), /report/);
  fs.writeFileSync(report, original);
  f.verify(m);
});
