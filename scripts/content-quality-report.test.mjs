import test from 'node:test';
import assert from 'node:assert/strict';
import { applyBaseline, githubAnnotation, runSourceQuality, isRoutingMetadataOnlyChange } from './lib/content-quality-report.mjs';
import { analyzeMarkdown } from './lib/content-markdown.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

test('routing comparison fails closed for prose, other metadata, invalid front matter and changed body structure',()=>{
  const before='---\ntitle: 原标题\ndescription: 原摘要\nsummary: 原概述\ndate: 2026-09-01T12:00:00+08:00\nurl: /old/\n---\n\n> 保留原话。\n';
  const after=before.replace('url: /old/','url: /new/\naliases: [/old/]\nlabNotes: true');
  assert.equal(isRoutingMetadataOnlyChange(before,after),true);
  for(const changed of [after.replace('原标题','新标题'),after.replace('原摘要','新摘要'),after.replace('原概述','新概述'),after.replace('2026-09-01','2026-09-02'),after.replace('保留原话','改写原话'),after.replace('> 保留','保留'),after.replace('title: 原标题','title: [broken'),after.replace('title: 原标题','title: 原标题\ntitle: 重复标题'),after.replace('\n---\n\n>','\n\n>'),after+'\n新增文字。'])assert.equal(isRoutingMetadataOnlyChange(before,changed),false);
  assert.equal(isRoutingMetadataOnlyChange('No front matter',after),false);
  assert.equal(isRoutingMetadataOnlyChange('+++\ntitle = "原标题"\n+++\n',after),false);
});

test('routing-only metadata edits preserve published prose without weakening the prose gate',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'blog-routing-flavor-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const file='content/zh/ai-agent/posts/existing.md';
  const before='---\ntitle: 已发布文章\ndate: 2026-09-01T12:00:00+08:00\ntype: posts\nauthor: Me\nkeywords: []\ntags: [Go]\ndescription: 已发布文章的摘要。\nurl: /zh/projects/existing/\n---\n\n> 重要的不是这个，而是那个。\n';
  const routed=before.replace('url: /zh/projects/existing/','url: /zh/lab-notes/existing/\nlabNotes: true\naliases:\n  - /zh/projects/existing/');
  await fs.mkdir(path.join(root,path.dirname(file)),{recursive:true});
  await fs.mkdir(path.join(root,'scripts'));await fs.mkdir(path.join(root,'config'));
  await fs.writeFile(path.join(root,file),before);
  await fs.writeFile(path.join(root,'config/tags-mapping.json'),'{}');
  for(const name of ['check-frontmatter-fields.mjs','normalize-tags.mjs','clean-empty-blockquotes.mjs','check-redirects.mjs','check-interactive-specs.mjs'])await fs.writeFile(path.join(root,'scripts',name),'process.exit(0);');
  await fs.copyFile(new URL('./check-ai-flavor.mjs',import.meta.url),path.join(root,'scripts/check-ai-flavor.mjs'));
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git('init');git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-m','Published article');
  const baseSha=git('rev-parse','HEAD');
  await fs.writeFile(path.join(root,file),routed);git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-m','Change routing');
  const changeSet={schema:'blog-change-set/1',sourceSha:git('rev-parse','HEAD'),baseSha,files:[{status:'M',path:file,oldPath:null}],sourceFiles:[file],fullScan:false,suites:['source'],publish:true,reason:'Routing change'};
  const run=()=>runSourceQuality({repoRoot:root,changeSet});
  const routeOnly=await run();
  assert.equal(routeOnly.ok,true,'an unchanged published quote is outside routing-only prose scope');
  assert.deepEqual(routeOnly.flavorScope,[]);
  for(const edited of [routed.replace('title: 已发布文章','title: 不是这个而是那个'),routed.replace('description: 已发布文章的摘要。','description: 不是这个而是那个。'),routed.replace('那个。','别的。')]){
    await fs.writeFile(path.join(root,file),edited);
    const result=await run();assert.equal(result.ok,false);assert.ok(result.diagnostics.some(d=>d.ruleId==='legacy-flavor'&&!d.waivable));
  }
  await fs.writeFile(path.join(root,file),routed);
  assert.equal((await runSourceQuality({repoRoot:root,changeSet:{...changeSet,baseSha:'a'.repeat(40)}})).ok,false,'missing historical content keeps the original hard gate');
  for(const status of ['A','R','C']){
    const result=await runSourceQuality({repoRoot:root,changeSet:{...changeSet,files:[{status,path:file,oldPath:status==='A'?null:'content/zh/ai-agent/posts/old.md'}]}});
    assert.equal(result.ok,false,`${status} must retain the prose gate`);
  }
  assert.equal((await runSourceQuality({repoRoot:root,all:true})).ok,false,'full audits still report the original quote');
});

const issue = (prefix='') => analyzeMarkdown({file:'x.md',text:prefix+'| a | b |\n| --- | --- --- |\n| 1 | 2 |'}).diagnostics.find(d => d.ruleId === 'table-delimiter');
test('precise baseline survives moved lines but never changed evidence', () => {
  const d=issue(); const baseline=[{ruleId:d.ruleId,file:d.file,fingerprint:d.fingerprint,reason:'Reviewed historical malformed table'}];
  const moved=applyBaseline({scope:['x.md'],diagnostics:[issue('\n\n')],baseline});
  assert.equal(moved.ok,true); assert.equal(moved.waived.length,1);
  assert.equal(moved.mode,'enforce');
  const changed = analyzeMarkdown({file:'x.md',text:'| changed | b |\n| --- --- | --- |\n| 1 | 2 |'}).diagnostics.find(d=>d.ruleId==='table-delimiter');
  assert.equal(applyBaseline({scope:['x.md'],diagnostics:[changed],baseline}).ok,false);
});
test('report-only stays distinguishable and does not erase errors', () => {
  const result=applyBaseline({scope:['x.md'],diagnostics:[issue()],baseline:[],mode:'report-only'});
  assert.equal(result.mode,'report-only'); assert.equal(result.ok,false);
  assert.throws(()=>applyBaseline({scope:[],diagnostics:[],baseline:[],mode:'quiet'}),/mode/i);
});
test('unknown rules, missing explanations and hard gate waivers fail closed', () => {
  for (const entry of [{ruleId:'unknown',file:'x',fingerprint:'a'.repeat(64),reason:'Reason'}, {ruleId:'table-delimiter',file:'x',fingerprint:'a'.repeat(64),reason:''}, {ruleId:'frontmatter-draft',file:'x',fingerprint:'a'.repeat(64),reason:'Not allowed'}]) {
    assert.throws(()=>applyBaseline({scope:[],diagnostics:[],baseline:[entry]}), /baseline/i);
  }
});
test('annotations cannot inject commands and reports sort stably', () => {
  const d={...issue(),file:'x,y:z%\n.md',message:'Oops\r\n::error::escape%'};
  const output=githubAnnotation(d);
  assert.equal(output.split('\n').length,1);
  assert.match(output,/x%2Cy%3Az%25%0A.md/);
  assert.match(output,/Oops%0D%0A::error::escape%25/);
});
test('source runner rejects ambiguous or implicit scope', async () => {
  await assert.rejects(runSourceQuality({repoRoot:'.'}), /scope|all|changeSet/i);
  await assert.rejects(runSourceQuality({repoRoot:'.',all:true,changeSet:{}}), /scope|all|changeSet/i);
});
