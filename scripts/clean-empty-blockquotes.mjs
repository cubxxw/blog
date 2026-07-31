#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const WRITE = process.argv.includes("--write");
const ROOTS = [
  "content/zh/growth/posts",
  "content/en/growth/posts",
];
const NOTE_PATTERN = /^\d{4}-\d{2}-thought-notes\.md$/;
const EMPTY_QUOTE = /^>\s*$/;
const QUOTED_CONTENT = /^>\s*\S/;
const BLANK = /^\s*$/;

function nearestContent(lines, start, direction) {
  for (
    let index = start;
    index >= 0 && index < lines.length;
    index += direction
  ) {
    if (!BLANK.test(lines[index]) && !EMPTY_QUOTE.test(lines[index])) {
      return lines[index];
    }
  }
  return "";
}

function cleanEmptyBlockquotes(source) {
  const hasFinalNewline = source.endsWith("\n");
  const lines = source.split("\n");
  const output = [];
  let removed = 0;
  let preserved = 0;
  let collapsed = 0;

  for (let index = 0; index < lines.length; index += 1) {
    if (!EMPTY_QUOTE.test(lines[index])) {
      output.push(lines[index]);
      continue;
    }

    let runEnd = index;
    while (
      runEnd + 1 < lines.length &&
      EMPTY_QUOTE.test(lines[runEnd + 1])
    ) {
      runEnd += 1;
    }

    const before = nearestContent(lines, index - 1, -1);
    const after = nearestContent(lines, runEnd + 1, 1);
    const connectsQuotedContent =
      QUOTED_CONTENT.test(before) && QUOTED_CONTENT.test(after);
    const runLength = runEnd - index + 1;

    if (connectsQuotedContent) {
      output.push(">");
      preserved += 1;
      collapsed += runLength - 1;
    } else {
      removed += runLength;
    }

    index = runEnd;
  }

  let result = output.join("\n");
  if (hasFinalNewline && !result.endsWith("\n")) {
    result += "\n";
  }

  return { result, removed, preserved, collapsed };
}

const files = [];
for (const root of ROOTS) {
  const entries = await readdir(root);
  for (const entry of entries) {
    if (NOTE_PATTERN.test(entry)) {
      files.push(join(root, entry));
    }
  }
}

let changedFiles = 0;
let totalRemoved = 0;
let totalPreserved = 0;
let totalCollapsed = 0;

for (const file of files.sort()) {
  const source = await readFile(file, "utf8");
  const cleaned = cleanEmptyBlockquotes(source);
  if (cleaned.result === source) {
    continue;
  }

  changedFiles += 1;
  totalRemoved += cleaned.removed;
  totalPreserved += cleaned.preserved;
  totalCollapsed += cleaned.collapsed;
  console.log(
    `${WRITE ? "cleaned" : "would clean"} ${file}: ` +
      `remove ${cleaned.removed}, preserve ${cleaned.preserved}, ` +
      `collapse ${cleaned.collapsed}`,
  );

  if (WRITE) {
    await writeFile(file, cleaned.result);
  }
}

console.log(
  `${WRITE ? "updated" : "would update"} ${changedFiles} files; ` +
    `remove ${totalRemoved}, preserve ${totalPreserved}, ` +
    `collapse ${totalCollapsed}`,
);

if (!WRITE && changedFiles > 0) {
  process.exitCode = 1;
}
