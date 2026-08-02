#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const redirectsPath = path.join(repoRoot, "static", "_redirects");
const shouldWrite = process.argv.includes("--write");

function parseRule(raw, index) {
  const match = raw.match(/^(\s*)(\S+)(\s+)(\S+)(\s+)(\S+)(.*)$/);
  if (!match || match[2].startsWith("#")) return null;

  return {
    line: index + 1,
    raw,
    prefix: match[1],
    source: match[2],
    sourceSpacing: match[3],
    target: match[4],
    targetSpacing: match[5],
    status: match[6],
    suffix: match[7],
  };
}

function isExactInternalRedirect(rule) {
  return (
    /^30(?:1|2|7|8)!?$/.test(rule.status) &&
    rule.source.startsWith("/") &&
    rule.target.startsWith("/") &&
    !rule.source.includes("*") &&
    !rule.target.includes("*")
  );
}

const original = fs.readFileSync(redirectsPath, "utf8");
const hadTrailingNewline = original.endsWith("\n");
const lines = original.split(/\r?\n/);
if (hadTrailingNewline) lines.pop();

const rules = lines.map(parseRule).filter(Boolean);
const duplicateSources = new Map();
for (const rule of rules) {
  const existing = duplicateSources.get(rule.source) ?? [];
  existing.push(rule);
  duplicateSources.set(rule.source, existing);
}

const duplicates = [...duplicateSources.values()].filter(
  (entries) => entries.length > 1,
);
const redirectBySource = new Map(
  rules.filter(isExactInternalRedirect).map((rule) => [rule.source, rule]),
);

function resolveFinalTarget(rule) {
  const visited = new Set([rule.source]);
  const path = [rule];
  let current = rule;

  while (redirectBySource.has(current.target)) {
    const next = redirectBySource.get(current.target);
    if (visited.has(next.source)) {
      return { loop: true, path, finalTarget: current.target };
    }
    visited.add(next.source);
    path.push(next);
    current = next;
  }

  return { loop: false, path, finalTarget: current.target };
}

const loops = [];
const chains = [];
for (const rule of redirectBySource.values()) {
  const resolved = resolveFinalTarget(rule);
  if (resolved.loop) {
    loops.push({ rule, ...resolved });
  } else if (resolved.path.length > 1) {
    chains.push({ rule, ...resolved });
  }
}

if (duplicates.length > 0) {
  console.error(`Duplicate redirect sources: ${duplicates.length}`);
  for (const entries of duplicates.slice(0, 20)) {
    console.error(
      `  ${entries[0].source}: lines ${entries.map((entry) => entry.line).join(", ")}`,
    );
  }
}

if (loops.length > 0) {
  console.error(`Redirect loops: ${loops.length}`);
  for (const entry of loops.slice(0, 20)) {
    console.error(
      `  line ${entry.rule.line}: ${entry.path.map((rule) => rule.source).join(" -> ")} -> ${entry.finalTarget}`,
    );
  }
}

if (shouldWrite && duplicates.length === 0 && loops.length === 0) {
  const finalTargetByLine = new Map(
    chains.map((entry) => [entry.rule.line, entry.finalTarget]),
  );
  const rewritten = lines.map((raw, index) => {
    const rule = parseRule(raw, index);
    const finalTarget = finalTargetByLine.get(index + 1);
    if (!rule || !finalTarget) return raw;

    return `${rule.prefix}${rule.source}${rule.sourceSpacing}${finalTarget}${rule.targetSpacing}${rule.status}${rule.suffix}`;
  });

  fs.writeFileSync(
    redirectsPath,
    `${rewritten.join("\n")}${hadTrailingNewline ? "\n" : ""}`,
  );
  console.log(`Flattened ${chains.length} redirect chains in static/_redirects.`);
} else if (chains.length > 0) {
  console.error(`Redirect chains: ${chains.length}`);
  for (const entry of chains.slice(0, 20)) {
    console.error(
      `  line ${entry.rule.line}: ${entry.rule.source} -> ${entry.rule.target} -> ${entry.finalTarget}`,
    );
  }
  if (chains.length > 20) {
    console.error(`  ...and ${chains.length - 20} more`);
  }
}

if (duplicates.length > 0 || loops.length > 0) {
  process.exitCode = 1;
} else if (!shouldWrite && chains.length > 0) {
  process.exitCode = 1;
} else {
  console.log(
    `Redirect audit passed: ${rules.length} rules, no duplicate sources, loops, or chains.`,
  );
}
