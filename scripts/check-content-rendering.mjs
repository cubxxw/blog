#!/usr/bin/env node
// Small, explicit contracts for previously broken content. Run after Hugo.
// This is not a general HTML validator; it checks Hugo's emitted table markup.
import fs from 'node:fs';
import path from 'node:path';

const publicDir = path.resolve(process.argv[2] ?? 'public');
let failed = false;
for (const language of ['en', 'zh']) {
  const route = `${language === 'zh' ? 'zh/' : ''}engineering/posts/go-release-tools/index.html`;
  try {
    const html = fs.readFileSync(path.join(publicDir, route), 'utf8');
    const tables = html.match(/<table\b[^>]*>[\s\S]*?<\/table>/gi) ?? [];
    const matches = tables.filter(table => /<code>\.ProjectName<\/code>/.test(table));
    if (matches.length !== 1) throw new Error('Expected one template-variable table containing .ProjectName');
    const table = matches[0];
    const headers = table.match(/<th\b[^>]*>[\s\S]*?<\/th>/gi) ?? [];
    const rows = table.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
    if (headers.length !== 2 || rows.length !== 41) {
      throw new Error(`Expected 2 headers and 40 data rows; found ${headers.length} headers and ${rows.length - 1} data rows`);
    }
    for (const row of rows.slice(1)) {
      if ((row.match(/<td\b/gi) ?? []).length !== 2) throw new Error('Template table contains a row without two cells');
    }
    if (!/<code>\.Artifacts<\/code>/.test(rows.at(-1))) throw new Error('Template table is truncated before .Artifacts');
    console.log(`PASS ${route}: template table has 40 rows and 2 columns`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${route}: ${error.message}`);
  }
}
if (failed) process.exitCode = 1;
