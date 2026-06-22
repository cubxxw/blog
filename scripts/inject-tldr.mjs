#!/usr/bin/env node
/*
  Inject `tldr` (a list of key takeaways) into the YAML front matter of
  content markdown files. Driven by a JSON map produced by the tldr workflow:

    { "content/zh/.../foo.md": ["要点一", "要点二", "要点三"], ... }

  Rules:
    - Only touches files that do NOT already have a top-level `tldr:` key.
    - Appends the block at the END of the front matter (just before the closing
      `---`). This is safe regardless of how `description` is written (inline,
      or a multi-line block scalar like `description: >`), which inserting after
      the description line is NOT.
    - YAML block-list form, each item double-quoted with internal quotes escaped.
    - Leaves the body untouched; preserves the rest of the front matter verbatim.

  Usage: node scripts/inject-tldr.mjs <path-to-map.json> [--dry]
*/
import fs from 'node:fs';

const mapPath = process.argv[2];
const dry = process.argv.includes('--dry');
if (!mapPath) {
  console.error('usage: node scripts/inject-tldr.mjs <map.json> [--dry]');
  process.exit(1);
}

const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
let written = 0, skipped = 0, missing = 0;

function yamlItem(s) {
  const clean = String(s).trim().replace(/"/g, '\\"');
  return `  - "${clean}"`;
}

for (const [file, items] of Object.entries(map)) {
  if (!Array.isArray(items) || items.length === 0) { skipped++; continue; }
  if (!fs.existsSync(file)) { console.warn('MISSING', file); missing++; continue; }

  const raw = fs.readFileSync(file, 'utf8');
  // Front matter must be a leading --- ... --- block.
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) { console.warn('NO-FRONTMATTER', file); skipped++; continue; }

  const fmBody = fm[1];
  if (/^tldr:/m.test(fmBody)) { skipped++; continue; } // already has one

  const block = 'tldr:\n' + items.map(yamlItem).join('\n');

  // Append at the end of the front matter — safe for block-scalar descriptions.
  const newFmBody = fmBody.replace(/\s*$/, '') + '\n' + block;

  const newRaw = raw.replace(fm[0], '---\n' + newFmBody + '\n---');
  if (dry) {
    console.log('--- would write', file);
    console.log(block);
  } else {
    fs.writeFileSync(file, newRaw, 'utf8');
  }
  written++;
}

console.log(`\n${dry ? '[DRY] ' : ''}written: ${written}, skipped: ${skipped}, missing: ${missing}`);
