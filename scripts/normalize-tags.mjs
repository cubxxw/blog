#!/usr/bin/env node
// Normalize article tags to their canonical form using config/tags-mapping.json.
// Only the `tags:` front-matter block is touched (both `[...]` inline arrays and
// YAML block sequences). Categories and other fields are left alone.
//
// Usage:
//   node scripts/normalize-tags.mjs            # dry-run, prints planned changes
//   node scripts/normalize-tags.mjs --write    # apply changes in place
//   node scripts/normalize-tags.mjs --check    # exit 1 if any alias remains (CI)

import { readFileSync, writeFileSync, globSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const CHECK = process.argv.includes('--check');

const mapping = JSON.parse(readFileSync(join(ROOT, 'config/tags-mapping.json'), 'utf8'));

// alias (exact string) -> canonical
const alias2canon = new Map();
for (const entry of Object.values(mapping.canonical_tags)) {
  for (const a of entry.aliases) alias2canon.set(a, entry.canonical);
}
const toRemove = new Set(mapping.tags_to_remove || []);

function normalizeFile(text) {
  const fmMatch = text.match(/^(---\n)([\s\S]*?)(\n---)/);
  if (!fmMatch) return { text, changed: false, hits: [] };
  let fm = fmMatch[2];
  const hits = [];

  const mapTag = (raw) => {
    const t = raw.trim().replace(/^["']|["']$/g, '');
    if (toRemove.has(t)) { hits.push(`- ${t} (removed)`); return null; }
    if (alias2canon.has(t)) { hits.push(`${t} -> ${alias2canon.get(t)}`); return alias2canon.get(t); }
    return t;
  };

  // Inline: tags: ["a", "b"]
  fm = fm.replace(/^(tags:\s*)\[([^\]]*)\]/m, (m, pre, body) => {
    const items = body.split(',').map((s) => s.trim()).filter(Boolean);
    const uniq = [...new Set(items.map(mapTag).filter((x) => x !== null))];
    return pre + '[' + uniq.map((t) => `"${t}"`).join(', ') + ']';
  });

  // Block sequence under tags:
  fm = fm.replace(/^(tags:\s*\n)((?:[ \t]*-[ \t]*.+\n?)+)/m, (m, head, body) => {
    const lines = body.split('\n').filter((l) => l.trim());
    const indent = (lines[0].match(/^(\s*)-/) || ['', '  '])[1];
    const uniq = [...new Set(lines.map((l) => mapTag(l.replace(/^\s*-\s*/, ''))).filter((x) => x !== null))];
    return head + uniq.map((t) => `${indent}- ${t}`).join('\n') + '\n';
  });

  // Only rewrite when an actual alias/removal was applied — avoid churning files
  // purely to swap single quotes for double quotes (both are valid YAML).
  if (hits.length === 0) return { text, changed: false, hits };
  const newText =
    text.slice(0, fmMatch.index) + fmMatch[1] + fm + fmMatch[3] + text.slice(fmMatch.index + fmMatch[0].length);
  return { text: newText, changed: newText !== text, hits };
}

const files = globSync('content/**/*.md', { cwd: ROOT }).map((f) => join(ROOT, f));
let changedCount = 0;
let aliasFound = false;

for (const f of files) {
  const orig = readFileSync(f, 'utf8');
  const { text, changed, hits } = normalizeFile(orig);
  if (changed) {
    aliasFound = true;
    changedCount++;
    console.log(`\n${f.replace(ROOT + '/', '')}`);
    for (const h of hits) console.log(`   ${h}`);
    if (WRITE) writeFileSync(f, text);
  }
}

console.log(`\n${WRITE ? 'Updated' : 'Would update'} ${changedCount} file(s).`);
if (CHECK && aliasFound) {
  console.error('FAIL: non-canonical tags found. Run: node scripts/normalize-tags.mjs --write');
  process.exit(1);
}
