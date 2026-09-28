#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function selectBrowserPages({ changeSet, pageMap }) {
  if (
    !changeSet ||
    !Array.isArray(changeSet.sourceFiles) ||
    !Array.isArray(changeSet.files)
  )
    throw new Error("Explicit change set required");
  if (
    !pageMap?.complete ||
    !Array.isArray(pageMap.pages) ||
    !pageMap.pages.length
  )
    throw new Error("Complete page map required");
  const wide =
    changeSet.fullScan ||
    changeSet.files.some(
      (f) =>
        /^(assets|layouts|themes|config|netlify|scripts)\//.test(f.path) ||
        f.path === "config.yml",
    );
  const sources = wide
    ? changeSet.files
        .filter(
          (f) => f.status !== "D" && /^content\/(en|zh)\/.+\.md$/.test(f.path),
        )
        .map((f) => f.path)
    : changeSet.sourceFiles;
  const wanted = new Set(sources);
  for (const file of sources) {
    if (file.startsWith("content/en/"))
      wanted.add(file.replace("content/en/", "content/zh/"));
    if (file.startsWith("content/zh/"))
      wanted.add(file.replace("content/zh/", "content/en/"));
  }
  const pages = pageMap.pages.filter((p) => p.kind !== "alias");
  const selected = pages.filter((p) => p.source && wanted.has(p.source));
  if (wide || !selected.length) {
    const base = new URL(pageMap.baseUrl).pathname.replace(/\/$/, "");
    const representatives = [
      "/",
      "/zh/",
      "/projects/",
      "/zh/projects/",
      "/articles/",
      "/zh/articles/",
      "/engineering/",
      "/zh/engineering/",
    ];
    for (const suffix of representatives) {
      const p = pages.find(
        (p) => new URL(p.url, pageMap.baseUrl).pathname === base + suffix,
      );
      if (p) selected.push(p);
    }
    for (const lang of ["en", "zh"]) {
      const p = pages.find(
        (p) => p.kind === "page" && p.source?.startsWith(`content/${lang}/`),
      );
      if (p) selected.push(p);
    }
    for (const lang of ["en", "zh"]) {
      const p = pages.find(
        (p) =>
          p.source === `content/${lang}/engineering/posts/go-release-tools.md`,
      );
      if (p) selected.push(p);
    }
  }
  if (!selected.length)
    throw new Error("No browser pages resolved for required scope");
  return [
    ...new Set(selected.map((p) => new URL(p.url, pageMap.baseUrl).pathname)),
  ].sort();
}
export function legacyBrowserScope(changeSet, target) {
  if (target === "backup")
    return {
      required: false,
      reason:
        "Backup uses separate static capability fixtures; production legacy assertions do not apply.",
    };
  const shared =
    changeSet.fullScan ||
    changeSet.files.some(
      ({ path: file }) =>
        /^(assets|layouts|themes|i18n|config)\//.test(file) ||
        /^static\/(css|js|fonts|components)\//.test(file) ||
        /^(config\.(yml|yaml|toml|json)|package(-lock)?\.json|go\.(mod|sum)|netlify\.toml|playwright(\.[\w-]+)?\.config\.ts)$/.test(
          file,
        ) ||
        /^scripts\/(site-(build|verify)|serve-site-output|generate-content-index)\.mjs$/.test(
          file,
        ) ||
        /^tests\/(e2e|helpers)\//.test(file),
    );
  return {
    required: Boolean(shared),
    reason: shared
      ? "Shared frontend or unknown/full history: preserve legacy non-visual-regression coverage."
      : "No shared frontend changes; use selected content quality coverage.",
  };
}
function snapshot(root) {
  const files = [];
  function walk(dir, relative = "") {
    for (const e of fs
      .readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, e.name),
        r = relative + "/" + e.name;
      if (e.isSymbolicLink()) throw new Error("Site output symlink rejected");
      if (e.isDirectory()) walk(p, r);
      else
        files.push([
          r,
          createHash("sha256").update(fs.readFileSync(p)).digest("hex"),
        ]);
    }
  }
  walk(root);
  return JSON.stringify(files);
}
async function execute(call) {
  const result = spawnSync(call.command, call.args, {
    env: call.env,
    stdio: "inherit",
    cwd: call.cwd,
  });
  if (result.error) throw result.error;
  return result;
}
export async function verifySite({
  publicDir,
  pageMapPath,
  changeSetPath,
  reportDir,
  exec = execute,
}) {
  publicDir = path.resolve(publicDir);
  reportDir = path.resolve(
    reportDir || "tests/.artifacts/browser-verification",
  );
  if (reportDir === publicDir || reportDir.startsWith(publicDir + path.sep))
    throw new Error("Browser reports must be outside frozen public output");
  const pageMap = JSON.parse(fs.readFileSync(pageMapPath));
  const changeSet = JSON.parse(fs.readFileSync(changeSetPath));
  const pages = selectBrowserPages({ changeSet, pageMap });
  fs.mkdirSync(reportDir, { recursive: true });
  const pageList = path.join(reportDir, "pages.json");
  fs.writeFileSync(pageList, JSON.stringify(pages));
  const before = snapshot(publicDir);
  const legacy = legacyBrowserScope(changeSet, pageMap.target);
  const qualityProjects = ["desktop", "mobile", "desktop-dark", "mobile-dark"];
  const suites = [
    {
      name: "quality",
      config: "playwright.quality.config.ts",
      projects: qualityProjects,
      args: [],
    },
  ];
  if (legacy.required)
    suites.push({
      name: "legacy",
      config: "playwright.config.ts",
      projects: ["desktop", "mobile"],
      args: ["--grep-invert", "Visual Regression"],
    });
  const results = [];
  for (const suite of suites) {
    if (results.some((result) => result.status !== "success")) {
      results.push({
        name: suite.name,
        projects: suite.projects,
        status: "skipped",
        exitCode: null,
        reason: "A prerequisite browser suite failed.",
      });
      continue;
    }
    const result = await exec({
      stage: `browser-${suite.name}`,
      command: process.execPath,
      args: [
        path.resolve("node_modules/@playwright/test/cli.js"),
        "test",
        `--config=${suite.config}`,
        ...suite.args,
      ],
      cwd: process.cwd(),
      env: {
        ...Object.fromEntries(
          Object.entries(process.env).filter(
            ([key]) => !/(?:^|_)proxy$/i.test(key),
          ),
        ),
        NO_PROXY: "localhost,127.0.0.1,::1",
        SITE_OUTPUT_DIR: publicDir,
        SITE_PAGE_LIST: pageList,
        SITE_BASE_PATH: new URL(pageMap.baseUrl).pathname,
        SITE_CANONICAL_ORIGIN: new URL(pageMap.baseUrl).origin,
        PLAYWRIGHT_HTML_OUTPUT_DIR: path.join(reportDir, suite.name, "html"),
        SITE_TEST_RESULTS: path.join(reportDir, suite.name, "results"),
      },
    });
    if (snapshot(publicDir) !== before)
      throw new Error(
        "Frozen production bytes changed during browser verification",
      );
    results.push({
      name: suite.name,
      projects: suite.projects,
      status: result.status === 0 ? "success" : "failure",
      exitCode: result.status,
    });
  }
  const reportPath = path.join(reportDir, "browser-report.json");
  const ok =
    results.length === suites.length &&
    results.every((result) => result.status === "success");
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        schema: "blog-browser/1",
        mode: "enforce",
        ok,
        pages,
        projects: qualityProjects,
        legacy,
        suites: results,
        exitCode: ok
          ? 0
          : (results.find((result) => result.status === "failure")?.exitCode ??
            2),
      },
      null,
      2,
    ) + "\n",
  );
  return { ok, reportPath };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i < 0 ? undefined : args[i + 1];
  };
  try {
    const result = await verifySite({
      publicDir: get("--public-dir"),
      pageMapPath: get("--page-map"),
      changeSetPath: get("--change-set"),
      reportDir: get("--report-dir"),
    });
    console.log(JSON.stringify(result));
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
