#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync, execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { parse, stringify } from "smol-toml";
import { createHash } from "node:crypto";
import { buildIndex, writeOutput } from "./generate-content-index.mjs";

const INPUTS = [
  "assets",
  "content",
  "data",
  "i18n",
  "layouts",
  "static",
  "themes",
  "config",
  "scripts",
  "netlify",
  "archetypes",
  "config.yml",
  "go.mod",
  "go.sum",
  "package.json",
  "package-lock.json",
];
export function assertProductionSource({ repoRoot, sourceSha }) {
  const git = (args) =>
    execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
  if (git(["rev-parse", "HEAD"]) !== sourceSha)
    throw new Error("Production sourceSha must equal checked-out HEAD");
  const dirty = git([
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
    "--",
    ...INPUTS,
    "netlify.toml",
  ]);
  if (dirty)
    throw new Error(
      "Production build inputs have uncommitted changes; commit them or use a non-production preview",
    );
}
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export function sanitizedBuildEnv(env = process.env) {
  const allowed =
    /^(PATH|HOME|TMPDIR|TMP|TEMP|SystemRoot|LANG|LC_ALL|CI|TZ|HUGO_BIN|HUGO_ENABLEGITINFO|PUPPETEER_EXECUTABLE_PATH|PUPPETEER_CACHE_DIR|FONTCONFIG_PATH|BLOG_BUILD_(CLOCK|TARGET|BASE_URL|SHA))$/;
  return {
    ...Object.fromEntries(
      Object.entries(env).filter(([key]) => allowed.test(key)),
    ),
    PATH: [path.dirname(process.execPath), env.PATH]
      .filter(Boolean)
      .join(path.delimiter),
  };
}
export async function executeBuild(call) {
  const result = spawnSync(call.command, call.args, {
    cwd: call.cwd,
    env: call.env || process.env,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.stdout && !call.capture) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error || result.status !== 0) {
    const error = new Error(
      `${call.stage} failed: ${result.error?.message || result.status}`,
    );
    error.exitCode =
      ["source-gate", "output-check"].includes(call.stage) &&
      result.status === 1
        ? 1
        : 2;
    throw error;
  }
  return { stdout: result.stdout };
}
export function deploymentConfig(config) {
  return {
    functions: { directory: "functions" },
    ...(config.redirects ? { redirects: config.redirects } : {}),
    headers: [
      ...(config.headers || []).filter((h) => h.for !== "/__release.json"),
      {
        for: "/__release.json",
        values: {
          "Cache-Control": "no-store, max-age=0",
          "Netlify-CDN-Cache-Control": "no-store",
        },
      },
    ],
  };
}
function parameters({ sourceSha, clock, target, baseUrl }) {
  if (sourceSha && !/^[a-f0-9]{40}$/.test(sourceSha))
    throw new Error("sourceSha must be a full Git SHA");
  if (!Number.isFinite(Date.parse(clock)))
    throw new Error("A frozen ISO clock is required");
  if (!["production", "backup", "preview"].includes(target))
    throw new Error("Unknown build target");
  if (
    target === "production" &&
    baseUrl &&
    baseUrl.replace(/\/$/, "") !== "https://cubxxw.com"
  )
    throw new Error("Production base URL is fixed");
}
export async function buildHugoPhase({
  repoRoot = process.cwd(),
  clock,
  target = "production",
  baseUrl = "https://cubxxw.com",
  exec = executeBuild,
}) {
  parameters({ clock, target, baseUrl });
  const env = {
    ...sanitizedBuildEnv(),
    HUGO_BASEURL: baseUrl,
    HUGO_ENV: "production",
    GOMAXPROCS: "2",
  };
  const call = (stage, command, args, capture = false) =>
    exec({ stage, command, args, cwd: repoRoot, env, capture });
  for (const script of [
    "check-frontmatter-fields.mjs",
    "normalize-tags.mjs",
    "clean-empty-blockquotes.mjs",
    "check-redirects.mjs",
    "check-interactive-specs.mjs",
  ])
    await call("source-gate", process.execPath, [
      path.join(repoRoot, "scripts", script),
      ...(script === "normalize-tags.mjs" ? ["--check"] : []),
    ]);
  const hugo = env.HUGO_BIN || "hugo";
  const args = [
    "--environment",
    "production",
    "--clock",
    clock,
    ...(target === "backup"
      ? ["--config", "config.yml,config/ci-backup.yml"]
      : []),
  ];
  const published = await call(
    "published-list",
    hugo,
    ["list", "published", ...args],
    true,
  );
  fs.mkdirSync(path.join(repoRoot, ".build"), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, ".build/published.csv"),
    published.stdout,
  );
  const parsed = spawnSync(
    "python3",
    [
      "-c",
      "import csv,json,sys; print(json.dumps(list(csv.DictReader(sys.stdin))))",
    ],
    { input: published.stdout, encoding: "utf8" },
  );
  if (parsed.status !== 0)
    throw new Error("Unable to parse Hugo publication CSV");
  const pages = JSON.parse(parsed.stdout).map((p) => ({
    source: p.path,
    url: p.permalink,
  }));
  const index = buildIndex({ root: repoRoot, clock, publishedPages: pages });
  writeOutput(path.join(repoRoot, "static/data/content-index.json"), index);
  writeOutput(
    path.join(repoRoot, "netlify/functions/_generated/content-index.json"),
    index,
  );
  await call("hugo-site-build", hugo, [
    "--gc",
    "--minify",
    "--cleanDestinationDir",
    "--destination",
    "public",
    "--baseURL",
    baseUrl,
    ...args,
  ]);
  // The static backup uses canonical subpath CSS URLs. Critical CSS would
  // fetch those from the old remote site instead of this frozen build.
  if (target === "backup") return;
  // The pinned plugin discards PromisePool timeout errors. Record every
  // configured HTML target before it runs, including column landing pages.
  const configPath = path.join(repoRoot, "netlify.toml");
  const config = fs.existsSync(configPath)
    ? parse(fs.readFileSync(configPath, "utf8"))
    : {};
  const plugin = config.plugins?.find(
    (entry) => entry.package === "netlify-plugin-critical-css",
  );
  const publicDir = path.resolve(repoRoot, "public");
  let landing = [];
  if (plugin) {
    const inputs = plugin.inputs || {};
    const base = path.resolve(repoRoot, inputs.base || "public");
    const relativeBase = path.relative(publicDir, base);
    if (relativeBase.startsWith("..") || path.isAbsolute(relativeBase))
      throw new Error("Critical CSS base must stay inside public output");
    landing = [...new Set(fs.globSync(inputs.globs || ["**/*.html"], {
      cwd: base,
      exclude: inputs.ignore || ["node_modules", "_app", "_next"],
    }))]
      .filter((file) => file.endsWith(".html"))
      .filter((file) => fs.lstatSync(path.resolve(base, file)).isFile())
      .map((file) => {
        const relative = path.relative(publicDir, path.resolve(base, file));
        if (relative.startsWith("..") || path.isAbsolute(relative))
          throw new Error("Critical CSS target must stay inside public output");
        return relative.split(path.sep).join("/");
      })
      .sort();
  }
  fs.writeFileSync(
    path.join(repoRoot, ".build/pre-critical.json"),
    JSON.stringify(landing.map((file) => ({
      path: file,
      hash: sha256(fs.readFileSync(path.join(publicDir, file))),
    }))),
  );
}
export async function buildSite({
  repoRoot = process.cwd(),
  sourceSha,
  clock,
  target = "production",
  baseUrl = target === "production" ? "https://cubxxw.com" : undefined,
  outDir,
  exec = executeBuild,
}) {
  parameters({ sourceSha, clock, target, baseUrl });
  if (!baseUrl) throw new Error("backup/preview require an explicit base URL");
  const root = path.resolve(repoRoot);
  const output = path.resolve(
    outDir || path.join(root, "tests/.artifacts/site"),
  );
  if (exec === executeBuild && target !== "preview") {
    assertProductionSource({ repoRoot: root, sourceSha });
    const toolchain = JSON.parse(
      fs.readFileSync(path.join(root, "config/ci-toolchain.json")),
    );
    if (process.versions.node !== toolchain.node)
      throw new Error(`Production build requires Node ${toolchain.node}`);
    const hugo = execFileSync(process.env.HUGO_BIN || "hugo", ["version"], {
      encoding: "utf8",
    });
    if (!hugo.includes(`v${toolchain.hugo}+extended`))
      throw new Error(
        `Production build requires Hugo ${toolchain.hugo} extended`,
      );
    for (const [pkg, key] of [
      ["netlify-cli", "netlify"],
      ["netlify-plugin-critical-css", "criticalCss"],
      ["@playwright/test", "playwright"],
    ])
      if (
        JSON.parse(
          fs.readFileSync(path.join(root, "node_modules", pkg, "package.json")),
        ).version !== toolchain[key]
      )
        throw new Error(`Toolchain mismatch: ${pkg}`);
  }
  if (fs.existsSync(output) && fs.readdirSync(output).length)
    throw new Error("Output directory must be empty");
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "blog-netlify-build-"));
  try {
    if (fs.existsSync(path.join(root, ".git")))
      await exec({
        stage: "git-history",
        command: "git",
        args: ["clone", "--shared", "--no-checkout", "--local", root, work],
        cwd: root,
        env: sanitizedBuildEnv(),
      });
    for (const name of INPUTS)
      if (fs.existsSync(path.join(root, name)))
        fs.cpSync(path.join(root, name), path.join(work, name), {
          recursive: true,
          filter: (src) =>
            !src
              .split(path.sep)
              .some(
                (s) =>
                  s === ".git" ||
                  s.startsWith(".env") ||
                  s === ".netlify" ||
                  s === "node_modules",
              ),
        });
    for (const name of ["node_modules", "netlify/functions/node_modules"])
      if (fs.existsSync(path.join(root, name))) {
        fs.mkdirSync(path.dirname(path.join(work, name)), { recursive: true });
        fs.symlinkSync(path.join(root, name), path.join(work, name), "dir");
      }
    const config = parse(
      fs.readFileSync(path.join(root, "netlify.toml"), "utf8"),
    );
    config.build = {
      command: "node scripts/site-build.mjs --hugo-phase",
      publish: "public",
      environment: {
        HUGO_ENABLEGITINFO: fs.existsSync(path.join(work, ".git"))
          ? "true"
          : "false",
      },
    };
    delete config.context;
    delete config.dev;
    if (target === "backup") {
      config.functions = { directory: ".backup-no-functions" };
      config.plugins = (config.plugins || []).filter(
        (plugin) => plugin.package !== "netlify-plugin-critical-css",
      );
    } else
      config.functions = {
        ...config.functions,
        directory: "netlify/functions",
      };
    fs.writeFileSync(path.join(work, "netlify.toml"), stringify(config));
    const { chromium } = await import("@playwright/test");
    const browser =
      process.env.PUPPETEER_EXECUTABLE_PATH || chromium.executablePath();
    if (exec === executeBuild && !fs.existsSync(browser))
      throw new Error(
        "Install pinned Playwright Chromium before building Critical CSS",
      );
    const env = {
      ...sanitizedBuildEnv(),
      PUPPETEER_EXECUTABLE_PATH: browser,
      NETLIFY_TELEMETRY_DISABLED: "1",
      HOME: path.join(work, ".home"),
      XDG_CONFIG_HOME: path.join(work, ".local-config"),
      BLOG_BUILD_CLOCK: clock,
      BLOG_BUILD_TARGET: target,
      BLOG_BUILD_BASE_URL: baseUrl,
      BLOG_BUILD_SHA: sourceSha,
      HUGO_ENABLEGITINFO: fs.existsSync(path.join(work, ".git"))
        ? "true"
        : "false",
    };
    fs.mkdirSync(env.HOME, { recursive: true });
    const lifecycle = await exec({
      stage: "netlify-build",
      command: process.execPath,
      args: [
        path.join(root, "node_modules/netlify-cli/bin/run.js"),
        "build",
        "--offline",
        "--context",
        "production",
      ],
      cwd: work,
      env,
    });
    if (
      /Unable to generate Critical CSS|Plugin .* internal error/.test(
        lifecycle.stdout || "",
      )
    )
      throw new Error("Critical CSS reported an incomplete transformation");
    const pre = path.join(work, ".build/pre-critical.json");
    if (fs.existsSync(pre))
      for (const item of JSON.parse(fs.readFileSync(pre)))
        if (
          sha256(fs.readFileSync(path.join(work, "public", item.path))) ===
          item.hash
        )
          throw new Error(
            `Critical CSS did not update ${item.path}; plugin may have suppressed a renderer failure`,
          );
    fs.mkdirSync(output, { recursive: true });
    const publicDir = path.join(output, "public");
    fs.cpSync(path.join(work, "public"), publicDir, { recursive: true });
    const functionBundleDir = path.join(output, "functions");
    fs.mkdirSync(functionBundleDir, { recursive: true });
    if (target !== "backup") {
      const bundles = path.join(work, ".netlify/functions");
      if (!fs.existsSync(bundles))
        throw new Error("Netlify lifecycle did not produce compiled functions");
      const zips = fs.readdirSync(bundles).filter((f) => f.endsWith(".zip"));
      if (!zips.length) throw new Error("No compiled function ZIPs produced");
      for (const f of zips)
        fs.copyFileSync(path.join(bundles, f), path.join(functionBundleDir, f));
    }
    const deployConfigPath = path.join(output, "deploy-config.toml");
    const resolved = path.join(work, ".netlify/netlify.toml");
    fs.writeFileSync(
      deployConfigPath,
      stringify(deploymentConfig(parse(fs.readFileSync(resolved, "utf8")))),
    );
    const pageMapPath = path.join(output, "page-map.json");
    const mapOptions = {
      repoRoot: work,
      publicDir,
      hugoCsv: path.join(work, ".build/published.csv"),
      sourceSha,
      clock,
      target,
      baseUrl,
    };
    if (exec === executeBuild) {
      const { readPageMap } = await import("./lib/content-page-map.mjs");
      const pageMap = await readPageMap(mapOptions);
      if (!pageMap.complete) throw new Error("Hugo page map incomplete");
      fs.writeFileSync(pageMapPath, JSON.stringify(pageMap, null, 2) + "\n");
    } else
      await exec({ stage: "page-map", ...mapOptions, outputPath: pageMapPath });
    await exec({
      stage: "output-check",
      command: process.execPath,
      args: [
        path.join(root, "scripts/check-content-quality.mjs"),
        "output",
        "--public-dir",
        publicDir,
        "--page-map",
        pageMapPath,
        "--out",
        path.join(output, "output-report.json"),
      ],
      cwd: root,
      env,
    });
    if (target !== "preview") {
      await exec({
        stage: "seo-output-check",
        command: process.execPath,
        args: [path.join(root,"scripts/check-generated-seo.mjs"),"--public-dir",publicDir,"--target",target],
        cwd: root,
        env,
      });
      if (exec === executeBuild) {
        const reportPath=path.join(output,"output-report.json");
        const report=JSON.parse(fs.readFileSync(reportPath,"utf8"));
        report.generatedSeo={target,status:"success"};
        fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+"\n");
      }
    }
    if (exec === executeBuild && target !== "preview")
      assertProductionSource({ repoRoot: root, sourceSha });
    return { publicDir, pageMapPath, functionBundleDir, deployConfigPath };
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const argv = process.argv.slice(2);
  const get = (flag) => {
    const i = argv.indexOf(flag);
    return i < 0 ? undefined : argv[i + 1];
  };
  try {
    if (argv.includes("--hugo-phase"))
      await buildHugoPhase({
        clock: process.env.BLOG_BUILD_CLOCK || new Date().toISOString(),
        target: process.env.BLOG_BUILD_TARGET || "production",
        baseUrl:
          process.env.BLOG_BUILD_BASE_URL ||
          process.env.DEPLOY_PRIME_URL ||
          "https://cubxxw.com",
      });
    else
      console.log(
        JSON.stringify(
          await buildSite({
            sourceSha: get("--sha"),
            clock: get("--clock"),
            target: argv.includes("--target") ? get("--target") : "production",
            baseUrl: argv.includes("--base-url")
              ? get("--base-url")
              : undefined,
            outDir: get("--out"),
          }),
        ),
      );
  } catch (error) {
    console.error(error.message);
    process.exitCode = error.exitCode || 2;
  }
}
