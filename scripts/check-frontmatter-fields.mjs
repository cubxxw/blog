#!/usr/bin/env node

import { globSync, readFileSync } from 'node:fs';

const roots = ['content/**/*.md', 'archetypes/**/*.md', 'archive/**/*.md'];
const violations = [];

for (const file of globSync(roots)) {
  const text = readFileSync(file, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) continue;

  const lines = match[1].split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (/^\s*draft\s*:/i.test(line)) {
      violations.push(`${file}:${index + 2}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Unsupported front matter field found:');
  for (const violation of violations) console.error(`  ${violation}`);
  console.error(
    '\nEvery page under content/ is publishable. Keep incomplete pages and fixtures outside content/.',
  );
  process.exitCode = 1;
} else {
  console.log('Front matter check passed.');
}
