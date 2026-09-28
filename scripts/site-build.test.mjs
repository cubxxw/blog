import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildSite,
  buildHugoPhase,
  sanitizedBuildEnv,
  deploymentConfig,
} from "./site-build.mjs";

test("isolated build completes plugin and function lifecycle before output checks", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "blog-build-test-"));
  fs.mkdirSync(path.join(root, "config"));
  fs.writeFileSync(
    path.join(root, "netlify.toml"),
    '[build]\ncommand="old"\npublish="public"\n[functions]\nnode_bundler="esbuild"\n[[plugins]]\npackage="netlify-plugin-critical-css"\n',
  );
  fs.writeFileSync(
    path.join(root, "config/ci-toolchain.json"),
    JSON.stringify({ node: "22.23.1", hugo: "0.145.0", netlify: "24.9.0" }),
  );
  const calls = [];
  try {
    const result = await buildSite({
      repoRoot: root,
      sourceSha: "a".repeat(40),
      clock: "2026-09-28T00:00:00Z",
      target: "production",
      outDir: path.join(root, "output"),
      exec: async (call) => {
        calls.push(call);
        if (call.stage === "netlify-build") {
          assert.ok(call.args.includes("--offline"));
          assert.notEqual(call.cwd, root);
          fs.mkdirSync(path.join(call.cwd, "public"), { recursive: true });
          fs.writeFileSync(
            path.join(call.cwd, "public/index.html"),
            "<html>built</html>",
          );
          fs.mkdirSync(path.join(call.cwd, ".netlify/functions"), {
            recursive: true,
          });
          fs.writeFileSync(
            path.join(call.cwd, ".netlify/functions/a.zip"),
            "compiled",
          );
          fs.writeFileSync(
            path.join(call.cwd, ".netlify/functions/manifest.json"),
            '{"functions":[]}',
          );
          fs.mkdirSync(path.join(call.cwd, ".build"), { recursive: true });
          fs.writeFileSync(
            path.join(call.cwd, ".build/published.csv"),
            "path,permalink\n",
          );
          fs.writeFileSync(
            path.join(call.cwd, ".netlify/netlify.toml"),
            '[build]\npublish="public"\n',
          );
        }
        if (call.stage === "page-map")
          fs.writeFileSync(
            call.outputPath,
            JSON.stringify({
              schema: "blog-page-map/1",
              sourceSha: "a".repeat(40),
              clock: "2026-09-28T00:00:00Z",
              target: "production",
              baseUrl: "https://cubxxw.com",
              complete: true,
              pages: [],
            }),
          );
        return { stdout: "" };
      },
    });
    assert.ok(
      calls.findIndex((x) => x.stage === "netlify-build") <
        calls.findIndex((x) => x.stage === "output-check"),
    );
    assert.ok(fs.existsSync(path.join(result.functionBundleDir, "a.zip")));
    assert.equal(fs.existsSync(path.join(root, ".netlify")), false);
    assert.equal(calls.filter((x) => x.stage === "netlify-build").length, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("build environment excludes credentials and keeps deterministic clock", () => {
  const env = sanitizedBuildEnv({
    PATH: "/bin",
    HOME: "/home/test",
    NETLIFY_AUTH_TOKEN: "secret",
    OPENAI_API_KEY: "secret",
    GITHUB_TOKEN: "secret",
    BLOG_BUILD_CLOCK: "2026-09-28T00:00:00Z",
  });
  assert.equal(env.OPENAI_API_KEY, undefined);
  assert.equal(env.NETLIFY_AUTH_TOKEN, undefined);
  assert.equal(env.GITHUB_TOKEN, undefined);
  assert.equal(env.BLOG_BUILD_CLOCK, "2026-09-28T00:00:00Z");
});

test("deploy config contains routing and headers but no build commands, credentials or plugins", () => {
  const config = deploymentConfig({
    build: { command: "secret", environment: { TOKEN: "secret" } },
    functions: { included_files: ["secret"] },
    redirects: [{ from: "/old", to: "/new", status: 301 }],
    headers: [{ for: "/*", values: { "X-Test": "yes" } }],
    plugins: [{ package: "x" }],
  });
  assert.equal(config.build, undefined);
  assert.equal(config.plugins, undefined);
  assert.deepEqual(config.functions, { directory: "functions" });
  assert.equal(config.redirects.length, 1);
  assert.equal(config.headers.at(-1).for, "/__release.json");
});

test("Hugo phase freezes clock, lists published pages then builds production exactly once", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hugo-phase-"));
  const calls = [];
  fs.mkdirSync(path.join(root, "content/en"), { recursive: true });
  try {
    await buildHugoPhase({
      repoRoot: root,
      clock: "2026-09-28T00:00:00Z",
      target: "production",
      baseUrl: "https://cubxxw.com",
      exec: async (c) => {
        calls.push(c);
        return {
          stdout: c.stage === "published-list" ? "path,permalink\n" : "",
        };
      },
    });
    assert.equal(calls.filter((c) => c.stage === "hugo-site-build").length, 1);
    for (const c of calls.filter((c) => c.command === "hugo")) {
      assert.ok(c.args.includes("--clock"));
      assert.ok(!c.args.includes("--buildFuture"));
    }
    assert.ok(
      calls.findIndex((c) => c.stage === "published-list") <
        calls.findIndex((c) => c.stage === "hugo-site-build"),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("production refuses source SHA and dirty build inputs that differ from the claimed revision", async () => {
  const { assertProductionSource } = await import("./site-build.mjs");
  const { execFileSync } = await import("node:child_process");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "build-source-"));
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  try {
    git("init", "-q");
    git("config", "user.email", "test@example.invalid");
    git("config", "user.name", "Test");
    fs.mkdirSync(path.join(root, "content"));
    fs.writeFileSync(path.join(root, "content/a.md"), "original");
    git("add", ".");
    git("commit", "-qm", "test");
    const sha = git("rev-parse", "HEAD");
    assertProductionSource({ repoRoot: root, sourceSha: sha });
    assert.throws(
      () =>
        assertProductionSource({ repoRoot: root, sourceSha: "b".repeat(40) }),
      /HEAD|revision/,
    );
    fs.writeFileSync(path.join(root, "content/a.md"), "modified");
    assert.throws(
      () => assertProductionSource({ repoRoot: root, sourceSha: sha }),
      /dirty|uncommitted/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("nested Netlify build command resolves the same pinned Node executable", () => {
  const env = sanitizedBuildEnv({ PATH: "/usr/bin", HOME: "/tmp/test" });
  assert.equal(
    env.PATH.split(path.delimiter)[0],
    path.dirname(process.execPath),
  );
});

test("backup retains the shared lifecycle but omits remote-reading Critical CSS and functions", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "blog-backup-test-"));
  fs.mkdirSync(path.join(root, "config"));
  fs.writeFileSync(
    path.join(root, "netlify.toml"),
    '[build]\ncommand="old"\npublish="public"\n[[plugins]]\npackage="netlify-plugin-critical-css"\n',
  );
  try {
    await buildSite({
      repoRoot: root,
      sourceSha: "a".repeat(40),
      clock: "2026-09-28T00:00:00Z",
      target: "backup",
      baseUrl: "https://cubxxw.github.io/blog/",
      outDir: path.join(root, "out"),
      exec: async (call) => {
        if (call.stage === "netlify-build") {
          const { parse } = await import("smol-toml");
          const config = parse(
            fs.readFileSync(path.join(call.cwd, "netlify.toml"), "utf8"),
          );
          assert.ok(
            !config.plugins?.some(
              (p) => p.package === "netlify-plugin-critical-css",
            ),
          );
          assert.equal(config.functions.directory, ".backup-no-functions");
          fs.mkdirSync(path.join(call.cwd, "public"));
          fs.writeFileSync(
            path.join(call.cwd, "public/index.html"),
            "<html>backup</html>",
          );
          fs.mkdirSync(path.join(call.cwd, ".netlify"));
          fs.writeFileSync(
            path.join(call.cwd, ".netlify/netlify.toml"),
            '[build]\npublish="public"',
          );
          fs.mkdirSync(path.join(call.cwd, ".build"));
          fs.writeFileSync(
            path.join(call.cwd, ".build/published.csv"),
            "path,permalink\n",
          );
        }
        return { stdout: "" };
      },
    });
    assert.deepEqual(fs.readdirSync(path.join(root, "out/functions")), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
