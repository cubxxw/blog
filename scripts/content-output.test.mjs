import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { checkOutput, checkTableContracts } from './lib/content-output.mjs';
import { readPageMap } from './lib/content-page-map.mjs';
import { analyzeMarkdown } from './lib/content-markdown.mjs';
import { assertHugoToolchain } from './site-build.mjs';
const sha='a'.repeat(40), clock='2026-09-28T00:00:00Z';
async function fixture(t, html) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'blog-quality-')); t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const publicDir=path.join(root,'public'); await fs.mkdir(publicDir);
  await fs.writeFile(path.join(publicDir,'index.html'),html);
  const pageMap={schema:'blog-page-map/1',sourceSha:sha,clock,target:'production',baseUrl:'https://cubxxw.com/',complete:true,pages:[{source:'content/en/engineering/posts/test.md',url:'https://cubxxw.com/',outputPath:'index.html',lang:'en',kind:'page',contentHash:'b'.repeat(64)}]};
  return {root,publicDir,pageMap};
}
test('optional HTML end tags and merged cells remain valid; shortcode code is ignored',async t=>{
  const ctx=await fixture(t,'<!doctype html><html><body><main><table><thead><tr><th>A<th>B<tbody><tr><td colspan=2>1<tr><td>2<td>3</table><p id=目标>Hi <a href=#%E7%9B%AE%E6%A0%87>link</a><code>{{&lt; sample &gt;}}</code></main>');
  assert.deepEqual(await checkOutput(ctx),[]);
});
test('missing expected tables, assets and anchors produce independent diagnostics',async t=>{
  const ctx=await fixture(t,'<main><a href="/missing/">bad</a><a href="#gone">bad</a><img src="/missing.png"><p>{{&lt; broken &gt;}}</main>');
  const ds=await checkOutput({...ctx,sourceTables:{'content/en/engineering/posts/test.md':[{line:10,rows:1,columns:2}]}});
  for(const rule of ['rendered-table-missing','local-link-missing','local-anchor-missing','local-asset-missing','shortcode-unexpanded']) assert.ok(ds.some(d=>d.ruleId===rule),rule);
});
test('resolved redirects and function routes are accepted but redirect loops fail',async t=>{
  const ctx=await fixture(t,'<a href="/old/">old</a><form action="/.netlify/functions/search"></form>');
  await fs.writeFile(path.join(ctx.publicDir,'_redirects'),'/old/ / 301\n');
  assert.deepEqual(await checkOutput({...ctx,contracts:{functionRoutes:['/.netlify/functions/search']}}),[]);
  await fs.writeFile(path.join(ctx.publicDir,'_redirects'),'/old/ /other/ 301\n/other/ /old/ 301\n');
  assert.ok((await checkOutput(ctx)).some(d=>d.ruleId==='local-link-missing'));
});
test('HTML alias redirects resolve target anchors without pretending the alias owns those anchors',async t=>{
  const ctx=await fixture(t,'<a href="/old/#target">Old link</a><h1 id=target>Target</h1>');
  await fs.mkdir(path.join(ctx.publicDir,'old'));await fs.writeFile(path.join(ctx.publicDir,'old/index.html'),'<meta http-equiv="refresh" content="0; url=/">');
  ctx.pageMap.pages.push({source:null,url:'https://cubxxw.com/old/',outputPath:'old/index.html',lang:'en',kind:'alias',contentHash:'c'.repeat(64)});
  assert.deepEqual(await checkOutput(ctx),[]);
});
test('alias targets are checked even when no other page links to the alias',async t=>{
  const ctx=await fixture(t,'<meta http-equiv="refresh" content="0; url=/missing/">');
  assert.ok((await checkOutput(ctx)).some(d=>d.ruleId==='local-link-missing'));
});
test('explicit dynamic hash contracts use real template data and remain page-scoped',async t=>{
  const ctx=await fixture(t,'<a href="#telepace">Product</a><a href="#invented">Bad product</a><template><section data-osx-window="telepace"></section></template>');
  const contracts={dynamicAnchors:[{outputPath:'index.html',attribute:'data-osx-window',prefixes:['','focus-']}]};
  const findings=await checkOutput({...ctx,contracts});
  assert.equal(findings.filter(d=>d.ruleId==='local-anchor-missing').length,1);
  assert.equal(findings[0].evidence,'#invented');
  assert.equal((await checkOutput({...ctx,contracts:{dynamicAnchors:[{...contracts.dynamicAnchors[0],outputPath:'other.html'}]}})).length,2);
});
test('encoded traversal and symlinks cannot escape public output',async t=>{
  const ctx=await fixture(t,'<img src="/%2e%2e/private.png"><img src="/leak.png">');
  await fs.writeFile(path.join(ctx.root,'secret'),'secret'); await fs.symlink(path.join(ctx.root,'secret'),path.join(ctx.publicDir,'leak.png'));
  await assert.rejects(checkOutput(ctx),/symlink|boundary|traversal/i);
});
test('encoded traversal is rejected before URL normalization without needing a symlink',async t=>{
  const ctx=await fixture(t,'<img src="/%2e%2e/private.png">');
  await assert.rejects(checkOutput(ctx),/traversal/i);
});
test('external URLs are left to the link audit even when their percent escapes are malformed',async t=>{
  const ctx=await fixture(t,'<a href="https://zh.wikipedia.org/zh-hans/%E6%B5%B7%E9%A9%AC%E4">Historical external link</a>');
  assert.deepEqual(await checkOutput(ctx),[]);
});
test('invalid authored internal URL encoding is a quality finding and does not abort all pages',async t=>{
  const ctx=await fixture(t,'<img src="/broken%E4.png"><a href="#broken%E4">Anchor</a>');
  const ds=await checkOutput(ctx);
  assert.ok(ds.some(d=>d.ruleId==='local-asset-missing'));
  assert.ok(ds.some(d=>d.ruleId==='local-anchor-missing'));
});
test('historical table contract accepts minified HTML and detects final-row truncation',()=>{
  const rows=Array.from({length:40},(_,i)=>`<tr><td><code>${i===0?'.ProjectName':i===39?'.Artifacts':'.Variable'+i}</code><td>Description`).join('');
  const html=`<table><thead><tr><th>Variable<th>Description<tbody>${rows}</table>`;
  const contracts=[{contains:'.ProjectName',rows:40,columns:2,lastContains:'.Artifacts'}];
  assert.deepEqual(checkTableContracts({html,file:'test',contracts}),[]);
  assert.ok(checkTableContracts({html:html.replace('.Artifacts','.Wrong'),file:'test',contracts}).some(d=>d.ruleId==='table-regression'&&!d.waivable));
});
test('pinned Hugo really renders the valid fixture and loses the malformed table',async t=>{
  assertHugoToolchain(execFileSync('hugo',['version'],{encoding:'utf8'}),'0.145.0');
  const ctx=await fixture(t,'');
  await fs.mkdir(path.join(ctx.root,'content'),{recursive:true}); await fs.mkdir(path.join(ctx.root,'layouts/_default'),{recursive:true});
  await fs.writeFile(path.join(ctx.root,'hugo.toml'),'baseURL = "https://cubxxw.com/"\ndisableKinds = ["taxonomy", "term", "RSS", "sitemap"]\n');
  await fs.writeFile(path.join(ctx.root,'layouts/_default/single.html'),'<!doctype html><html><body><main>{{ .Content }}</main></body></html>');
  for(const [name,fixtureName] of [['valid','valid-en'],['broken','broken-table']]) {
    const source=await fs.readFile(new URL(`../tests/fixtures/content-quality/source/${fixtureName}.md`,import.meta.url),'utf8');
    await fs.writeFile(path.join(ctx.root,`content/${name}.md`),source);
    assert.equal(analyzeMarkdown({file:name,text:source}).diagnostics.some(d=>d.ruleId==='table-delimiter'),name==='broken');
  }
  execFileSync('hugo',['--source',ctx.root,'--destination',ctx.publicDir,'--minify','--clock',clock],{encoding:'utf8'});
  assert.match(await fs.readFile(path.join(ctx.publicDir,'valid/index.html'),'utf8'),/<table>/);
  assert.doesNotMatch(await fs.readFile(path.join(ctx.publicDir,'broken/index.html'),'utf8'),/<table>/);
});
test('backup SEO accepts main-site canonical and requires noindex',async t=>{
  const ctx=await fixture(t,'<!doctype html><html><head><link href="https://cubxxw.com/" rel="canonical"><meta content="noindex, follow" name="robots"></head><body>Backup</body></html>');
  await fs.writeFile(path.join(ctx.publicDir,'sitemap.xml'),'<urlset></urlset>');
  await fs.writeFile(path.join(ctx.publicDir,'robots.txt'),'User-agent: *\nDisallow: /\n');
  const command=['scripts/check-generated-seo.mjs','--public-dir',ctx.publicDir,'--target','backup'];
  assert.match(execFileSync(process.execPath,command,{encoding:'utf8'}),/passed/i);
  await fs.writeFile(path.join(ctx.publicDir,'index.html'),'<link rel="canonical" href="https://cubxxw.com/"><meta name="robots" content="index, follow">');
  assert.throws(()=>execFileSync(process.execPath,command,{encoding:'utf8',stdio:'pipe'}),error=>error.status===1);
});
test('page map comes from Hugo CSV with quoted paths and enumerates aliases and aggregates',async t=>{
  const ctx=await fixture(t,'<h1>Article</h1>');
  await fs.mkdir(path.join(ctx.root,'content/en/engineering/posts'),{recursive:true});
  await fs.writeFile(path.join(ctx.root,'content/en/engineering/posts/a,b.md'),'---\ntitle: Test\n---');
  await fs.mkdir(path.join(ctx.publicDir,'tags')); await fs.writeFile(path.join(ctx.publicDir,'tags/index.html'),'<h1>Tags</h1>');
  await fs.mkdir(path.join(ctx.publicDir,'old')); await fs.writeFile(path.join(ctx.publicDir,'old/index.html'),'<meta http-equiv="refresh" content="0; url=/">');
  const csv=path.join(ctx.root,'pages.csv'); await fs.writeFile(csv,'path,permalink,kind\n"content/en/engineering/posts/a,b.md",https://cubxxw.com/,page\n');
  const result=await readPageMap({repoRoot:ctx.root,publicDir:ctx.publicDir,hugoCsv:csv,sourceSha:sha,clock,target:'production',baseUrl:'https://cubxxw.com/'});
  assert.equal(result.complete,true); assert.equal(result.pages.length,3);
  assert.equal(result.pages.find(p=>p.outputPath==='index.html').source,'content/en/engineering/posts/a,b.md');
  assert.equal(result.pages.find(p=>p.outputPath==='old/index.html').kind,'alias');
});
test('missing published pages and empty CSV are incomplete, unsafe CSV input is rejected',async t=>{
  const ctx=await fixture(t,'<h1>Home</h1>');
  const csv=path.join(ctx.root,'pages.csv');
  await fs.writeFile(csv,'path,permalink,kind\n');
  const args={repoRoot:ctx.root,publicDir:ctx.publicDir,hugoCsv:csv,sourceSha:sha,clock,target:'production',baseUrl:'https://cubxxw.com/'};
  assert.equal((await readPageMap(args)).complete,false);
  await fs.writeFile(csv,'path,permalink,kind\n../secret,https://cubxxw.com/,page\n');
  await assert.rejects(readPageMap(args),/path|CSV|source/i);
});
