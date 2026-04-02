import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { buildIndex } from "./generate-content-index.mjs";

const repoRoot = process.cwd();
const trackedIndexFiles = [
  path.join(repoRoot, "netlify/functions/_generated/content-index.json"),
  path.join(repoRoot, "static/data/content-index.json"),
];

function runCommand(command, args, timeout = 60000) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    timeout,
    maxBuffer: 10 * 1024 * 1024,
  });

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  const timedOut = result.signal === "SIGTERM" && result.error?.code === "ETIMEDOUT";

  return {
    passed: result.status === 0 && !timedOut,
    status: result.status,
    signal: result.signal,
    stdout,
    stderr,
    timedOut,
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeIndexPayload(value) {
  const clone = { ...value };
  delete clone.generatedAt;
  return JSON.stringify(clone);
}

function scoreIndexFreshness() {
  const expected = normalizeIndexPayload(buildIndex());
  const files = trackedIndexFiles.map((filePath) => {
    let matches = false;

    if (fs.existsSync(filePath)) {
      try {
        matches = normalizeIndexPayload(readJson(filePath)) === expected;
      } catch {
        matches = false;
      }
    }

    return {
      filePath: path.relative(repoRoot, filePath),
      matches,
    };
  });

  return {
    score: files.every((file) => file.matches) ? 15 : 0,
    max: 15,
    files,
  };
}

function scoreHugoResolution() {
  const binaryLookup = runCommand("sh", ["-lc", "command -v hugo"]);
  const binary = binaryLookup.passed
    ? binaryLookup.stdout.trim()
    : path.join(repoRoot, "_output", "tools", "hugo");
  const version = runCommand(binary, ["version"]);

  return {
    score: version.passed ? 10 : 0,
    max: 10,
    resolved: binary,
    detail: version.passed
      ? version.stdout.trim()
      : (version.stderr || version.stdout || "unable to execute resolved hugo binary").trim(),
  };
}

function scoreMakeTarget(target, max) {
  const result = runCommand("make", [target]);

  return {
    score: result.passed ? max : 0,
    max,
    target,
    passed: result.passed,
    detail: (result.stderr || result.stdout).trim().split("\n").slice(-12),
  };
}

function buildScore() {
  const components = {
    hugo_resolution: scoreHugoResolution(),
    envbuild: scoreMakeTarget("envbuild", 20),
    build: scoreMakeTarget("build", 30),
    build_preview: scoreMakeTarget("build-preview", 25),
    index_freshness: scoreIndexFreshness(),
  };

  const score = Object.values(components).reduce((sum, component) => sum + component.score, 0);
  return { score, max: 100, components };
}

const result = buildScore();

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`score: ${result.score}/${result.max}`);
  console.log(`- hugo_resolution: ${result.components.hugo_resolution.score}/${result.components.hugo_resolution.max}`);
  console.log(`- envbuild: ${result.components.envbuild.score}/${result.components.envbuild.max}`);
  console.log(`- build: ${result.components.build.score}/${result.components.build.max}`);
  console.log(`- build_preview: ${result.components.build_preview.score}/${result.components.build_preview.max}`);
  console.log(`- index_freshness: ${result.components.index_freshness.score}/${result.components.index_freshness.max}`);
}
