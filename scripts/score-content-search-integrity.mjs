import fs from "node:fs";
import path from "node:path";

import { buildIndex } from "./generate-content-index.mjs";

const repoRoot = process.cwd();
const makefilePath = path.join(repoRoot, "Makefile");
const contentRoot = path.join(repoRoot, "content");
const trackedIndexFiles = [
  path.join(repoRoot, "netlify/functions/_generated/content-index.json"),
  path.join(repoRoot, "static/data/content-index.json"),
];
const workflowTargets = ["run", "build", "envbuild", "netlify-dev", "build-preview", "serve"];
const junkNames = new Set([".DS_Store", "Thumbs.db"]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeJson(value) {
  return JSON.stringify(value);
}

function normalizeIndexPayload(value) {
  const clone = { ...value };
  delete clone.generatedAt;
  return normalizeJson(clone);
}

function compareIndexes(expected) {
  const expectedJson = normalizeIndexPayload(expected);
  const files = trackedIndexFiles.map((filePath) => {
    let matches = false;

    if (fs.existsSync(filePath)) {
      try {
        matches = normalizeIndexPayload(readJson(filePath)) === expectedJson;
      } catch {
        matches = false;
      }
    }

    return { filePath, matches };
  });

  const score = files.filter((file) => file.matches).length * 20;
  return { score, max: 40, files };
}

function scoreWorkflowCoverage(makefileText) {
  const targets = workflowTargets.map((target) => {
    const pattern = new RegExp(`^${target}:.*\\bcontent-index\\b`, "m");
    return { target, covered: pattern.test(makefileText) };
  });

  const score = targets.filter((target) => target.covered).length * 5;
  return { score, max: 30, targets };
}

function listMarkdownSlugs(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();
}

function scoreAiProjectParity() {
  const enDir = path.join(repoRoot, "content/en/projects");
  const zhDir = path.join(repoRoot, "content/zh/projects");
  const en = listMarkdownSlugs(enDir);
  const zh = listMarkdownSlugs(zhDir);
  const enOnly = en.filter((name) => !zh.includes(name));
  const zhOnly = zh.filter((name) => !en.includes(name));
  const mismatchCount = enOnly.length + zhOnly.length;
  const score = Math.max(0, 15 - mismatchCount * 3);

  return {
    score,
    max: 15,
    enCount: en.length,
    zhCount: zh.length,
    enOnly,
    zhOnly,
  };
}

function walk(dir, matches = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, matches);
      continue;
    }

    if (entry.isFile() && junkNames.has(entry.name)) {
      matches.push(path.relative(repoRoot, fullPath));
    }
  }

  return matches.sort();
}

function scoreContentHygiene() {
  const junkFiles = walk(contentRoot);
  const score = Math.max(0, 15 - junkFiles.length * 5);
  return { score, max: 15, junkFiles };
}

function buildScore() {
  const expectedIndex = buildIndex();
  const makefileText = fs.readFileSync(makefilePath, "utf8");

  const components = {
    index_freshness: compareIndexes(expectedIndex),
    workflow_coverage: scoreWorkflowCoverage(makefileText),
    ai_project_parity: scoreAiProjectParity(),
    content_hygiene: scoreContentHygiene(),
  };

  const score = Object.values(components).reduce((sum, component) => sum + component.score, 0);

  return {
    score,
    max: 100,
    components,
  };
}

const result = buildScore();

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`score: ${result.score}/${result.max}`);
  console.log(`- index_freshness: ${result.components.index_freshness.score}/${result.components.index_freshness.max}`);
  console.log(`- workflow_coverage: ${result.components.workflow_coverage.score}/${result.components.workflow_coverage.max}`);
  console.log(`- ai_project_parity: ${result.components.ai_project_parity.score}/${result.components.ai_project_parity.max}`);
  console.log(`- content_hygiene: ${result.components.content_hygiene.score}/${result.components.content_hygiene.max}`);
}
