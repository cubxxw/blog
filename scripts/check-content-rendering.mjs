#!/usr/bin/env node
// Stable legacy hard gate, now using HTML parsing so valid minified end tags work.
import fs from 'node:fs';
import path from 'node:path';
import { checkTableContracts } from './lib/content-output.mjs';

const publicDir = path.resolve(process.argv[2] ?? 'public');
let failed = false;
for (const language of ['en', 'zh']) {
  const route = `${language === 'zh' ? 'zh/' : ''}engineering/posts/go-release-tools/index.html`;
  try {
    const html = fs.readFileSync(path.join(publicDir, route), 'utf8');
    const diagnostics = checkTableContracts({html,file:route,contracts:[{contains:'.ProjectName',rows:40,columns:2,lastContains:'.Artifacts'}]});
    if (diagnostics.length) throw new Error(diagnostics.map(d=>d.message).join('; '));
    console.log(`PASS ${route}: template table has 40 rows and 2 columns`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${route}: ${error.message}`);
  }
}
if (failed) process.exitCode = 1;
