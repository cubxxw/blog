import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { analyzeMarkdown } from './lib/content-markdown.mjs';
import { checkSource } from './lib/content-source.mjs';

const file = 'content/zh/engineering/posts/测试.md';
const front = '---\ntitle: Test\ndate: 2026-09-01T12:00:00+08:00\ntype: posts\nauthor: [Me]\nkeywords: []\ntags: [Go]\ndescription: A plain description.\n---\n';
test('reports broken delimiter at original CRLF line, including collapse body', () => {
  const text = front + '\n{{% collapse %}}\n\n| a | b |\n| --- | --- --- |\n| 1 | 2 |\n\n{{% /collapse %}}';
  const result = analyzeMarkdown({ file, text: text.replaceAll('\n', '\r\n') });
  assert.ok(result.diagnostics.some(d => d.ruleId === 'table-delimiter' && d.line === 14));
});
test('finds mismatched table columns and unclosed fences', () => {
  assert.ok(analyzeMarkdown({file, text:'| a | b |\n| --- | --- |\n| 1 | 2 | 3 |'}).diagnostics.some(d => d.ruleId === 'MD056'));
  assert.ok(analyzeMarkdown({file, text:'Intro\n\n```go\npackage main'}).diagnostics.some(d => d.ruleId === 'fence-unclosed' && d.line === 3));
});
test('GFM tables with short contiguous delimiters are parsed and must not be called broken',()=>{
  const result=analyzeMarkdown({file,text:'| a | b |\n| :- | -: |\n| 1 | 2 |\n'});
  assert.deepEqual(result.diagnostics,[]);assert.equal(result.tables.length,1);
});
test('preserves escaped pipes, templates and nested Markdown tables without counting examples', () => {
  const text = front + '\n> | a | b |\n> | --- | --- |\n> | `a\\|b` | {{ .Version }} |\n\n- item\n\n  | a | b |\n  | --- | --- |\n  | 1 | 2 |\n\n```md\n| a | b |\n| --- | --- --- |\n```\n\n    | a | b |\n    | --- | --- --- |\n\n$$\n| a | b |\n| --- | --- --- |\n$$\n';
  const result = analyzeMarkdown({file, text});
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.tables.map(t => [t.rows, t.columns]), [[1,2],[1,2]]);
});
test('frontmatter uses post and section schemas without hiding draft', async () => {
  let result = await checkSource({file, text:front, tags:{}});
  assert.deepEqual(result.filter(d => d.severity === 'error'), []);
  result = await checkSource({file, text:front.replace('+08:00','').replace('type: posts','type: posts\ndraft: false'), tags:{}});
  assert.ok(result.some(d => d.ruleId === 'frontmatter-timezone'));
  assert.ok(result.some(d => d.ruleId === 'frontmatter-draft' && !d.waivable));
  assert.deepEqual((await checkSource({file:'content/zh/engineering/_index.md',text:'---\ntitle: Engineering\n---\n',tags:{}})).filter(d => d.severity === 'error'), []);
});
test('frontmatter rejects invalid YAML, field types, formatted summaries and aliases', async () => {
  const text = front.replace('keywords: []', 'keywords: nope').replace('A plain description.', '"**bold**"').replace('tags: [Go]', 'tags: [golang]');
  const result = await checkSource({file,text,tags:{canonical_tags:{go:{canonical:'Go',aliases:['golang']}}}});
  assert.ok(result.some(d => d.ruleId === 'frontmatter-type'));
  assert.ok(result.some(d => d.ruleId === 'frontmatter-description'));
  assert.ok(result.some(d => d.ruleId === 'tag-canonical' && !d.waivable));
  assert.ok((await checkSource({file,text:'---\ntitle: [bad\n---\n',tags:{}})).some(d => d.ruleId === 'frontmatter-parse'));
});
test('existing Hugo author scalar support is valid but empty author and normalized invalid dates are errors',async()=>{
  assert.deepEqual((await checkSource({file,text:front.replace('author: [Me]','author: Me')})).filter(d=>d.severity==='error'),[]);
  assert.ok((await checkSource({file,text:front.replace('author: [Me]','author: []')})).some(d=>d.ruleId==='frontmatter-type'));
  assert.ok((await checkSource({file,text:front.replace('2026-09-01','2026-02-31')})).some(d=>d.ruleId==='frontmatter-timezone'));
});
test('legacy draft gate also rejects TOML draft false',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'blog-draft-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  await fs.mkdir(path.join(root,'content'));
  await fs.writeFile(path.join(root,'content/test.md'),'+++\ntitle = "Test"\ndraft = false\n+++\n');
  const r=spawnSync(process.execPath,[new URL('./check-frontmatter-fields.mjs',import.meta.url).pathname],{cwd:root,encoding:'utf8'});
  assert.equal(r.status,1);assert.match(r.stderr,/content\/test.md:3/);
});
