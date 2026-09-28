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
  assertHugoToolchain,
} from "./site-build.mjs";

test('pinned Hugo accepts official commit suffixes but rejects wrong versions and non-extended builds', () => {
  assertHugoToolchain('hugo v0.145.0+extended darwin/arm64', '0.145.0');
  assertHugoToolchain('hugo v0.145.0+extended+withdeploy darwin/arm64 BuildDate=2025-02-26T15:41:25Z VendorInfo=brew', '0.145.0');
  assertHugoToolchain('hugo v0.145.0-666444f0a52132f9fec9f71cf25b441cc6a4f355+extended linux/amd64 BuildDate=2025-02-26T15:41:25Z VendorInfo=gohugoio', '0.145.0');
  for (const output of ['hugo v0.145.1+extended linux/amd64', 'hugo v0.145.0 linux/amd64', 'hugo v0.145.0-rc1+extended linux/amd64', 'unrecognized output'])
    assert.throws(() => assertHugoToolchain(output, '0.145.0'), /requires Hugo/);
});

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
    const seo=calls.find(call=>call.stage==='seo-output-check');
    assert.ok(seo, 'generated SEO is a required output gate');
    assert.ok(seo.args.includes(result.publicDir));
    assert.ok(calls.indexOf(seo)>calls.findIndex(call=>call.stage==='output-check'));
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

function criticalFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'critical-targets-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  fs.mkdirSync(path.join(root, 'content/en'), {recursive:true});
  fs.writeFileSync(path.join(root, 'netlify.toml'), `[build]
command = "old"
publish = "public"
[[plugins]]
package = "netlify-plugin-critical-css"
[plugins.inputs]
base = "public"
globs = ["index.html", "zh/index.html", "columns/**/*"]
ignore = ["columns/ignored/**", "columns/skipped/index.html"]
`);
  return root;
}

async function fixtureHugoPhase(root) {
  await buildHugoPhase({repoRoot:root,clock:'2026-09-28T00:00:00Z',target:'production',baseUrl:'https://cubxxw.com',exec:async call=>{
    if(call.stage==='hugo-site-build') {
      for(const file of ['index.html','zh/index.html','columns/example/index.html','columns/ignored/index.html','columns/skipped/index.html','columns/readme.txt']) {
        const output=path.join(root,'public',file);
        fs.mkdirSync(path.dirname(output),{recursive:true});
        fs.writeFileSync(output,'<html>before Critical CSS</html>');
      }
      fs.mkdirSync(path.join(root,'public/columns/directory.html'),{recursive:true});
    }
    return {stdout:call.stage==='published-list'?'path,permalink\n':''};
  }});
}

function criticalLifecycle(root, calls, transformColumn) {
  return async call=>{
    calls.push(call.stage);
    if(call.stage==='netlify-build') {
      // Exercise the real pre-plugin target collection; only the expensive
      // Hugo and renderer processes are replaced by deterministic writes.
      await fixtureHugoPhase(call.cwd);
      const transformed=['index.html','zh/index.html',...(transformColumn?['columns/example/index.html']:[])];
      for(const file of transformed) fs.appendFileSync(path.join(call.cwd,'public',file),'<style>body{color:black}</style>');
      fs.mkdirSync(path.join(call.cwd,'.netlify/functions'),{recursive:true});
      fs.writeFileSync(path.join(call.cwd,'.netlify/functions/a.zip'),'compiled');
      fs.writeFileSync(path.join(call.cwd,'.netlify/netlify.toml'),'[build]\npublish="public"\n');
    }
    if(call.stage==='page-map') fs.writeFileSync(call.outputPath,'{}');
    return {stdout:'Finished Critical CSS rendering'};
  };
}

test('pre-critical hashes cover configured HTML glob targets and honor ignored files/directories', async t=>{
  const root=criticalFixture(t);
  await fixtureHugoPhase(root);
  const hashes=JSON.parse(fs.readFileSync(path.join(root,'.build/pre-critical.json')));
  assert.deepEqual(hashes.map(entry=>entry.path),['columns/example/index.html','index.html','zh/index.html']);
  assert.ok(hashes.every(entry=>/^[a-f0-9]{64}$/.test(entry.hash)));
});

test('reported plugin success cannot hide an unchanged configured column page', async t=>{
  const root=criticalFixture(t), calls=[], outDir=path.join(root,'out');
  await assert.rejects(()=>buildSite({repoRoot:root,sourceSha:'a'.repeat(40),clock:'2026-09-28T00:00:00Z',target:'production',outDir,exec:criticalLifecycle(root,calls,false)}),/Critical CSS did not update columns\/example\/index\.html/);
  assert.equal(calls.includes('output-check'),false);
  assert.equal(calls.includes('page-map'),false);
  assert.equal(fs.existsSync(outDir),false,'incomplete plugin output must not be copied into a deployment artifact');
});

test('all configured targets transformed allows output checks while ignored HTML stays untouched', async t=>{
  const root=criticalFixture(t),calls=[];
  const result=await buildSite({repoRoot:root,sourceSha:'a'.repeat(40),clock:'2026-09-28T00:00:00Z',target:'production',outDir:path.join(root,'out'),exec:criticalLifecycle(root,calls,true)});
  assert.ok(calls.includes('output-check'));
  assert.match(fs.readFileSync(path.join(result.publicDir,'columns/example/index.html'),'utf8'),/<style>/);
  assert.doesNotMatch(fs.readFileSync(path.join(result.publicDir,'columns/ignored/index.html'),'utf8'),/<style>/);
});
