import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { classifyChanges, resolveChangeSet, publicationInputDigest } from './lib/ci-changes.mjs';
import { validateContract, releaseMode, requiredJobsPassed } from './lib/ci-contracts.mjs';
import { selectBrowserPages } from './site-verify.mjs';

const change = (path, status = 'M', oldPath = null) => ({path,status,oldPath});
const ALL_SUITES = ['source','output','browser','interactive','functions','seo','workflow'];
const pageMap = {
  baseUrl: 'https://example.test', complete: true,
  pages: [
    {source:'content/en/about.md',url:'https://example.test/about/',kind:'page'},
    {source:'content/zh/about.md',url:'https://example.test/zh/about/',kind:'page'},
    {source:'content/en/engineering/posts/a.md',url:'https://example.test/engineering/posts/a/',kind:'page'},
    {source:'content/zh/engineering/posts/a.md',url:'https://example.test/zh/engineering/posts/a/',kind:'page'},
    {source:'content/en/engineering/posts/historical.md',url:'https://example.test/engineering/posts/historical/',kind:'page'},
    {source:'content/zh/engineering/posts/historical.md',url:'https://example.test/zh/engineering/posts/historical/',kind:'page'},
    {source:'content/en/engineering/posts/go-release-tools.md',url:'https://example.test/engineering/posts/go-release-tools/',kind:'page'},
    {source:'content/zh/engineering/posts/go-release-tools.md',url:'https://example.test/zh/engineering/posts/go-release-tools/',kind:'page'},
    {source:null,url:'https://example.test/',kind:'home'},
    {source:null,url:'https://example.test/zh/',kind:'home'},
    {source:null,url:'https://example.test/projects/',kind:'section'},
    {source:null,url:'https://example.test/zh/projects/',kind:'section'},
    {source:null,url:'https://example.test/articles/',kind:'section'},
    {source:null,url:'https://example.test/zh/articles/',kind:'section'},
    {source:null,url:'https://example.test/engineering/',kind:'section'},
    {source:null,url:'https://example.test/zh/engineering/',kind:'section'},
  ],
};
test('maintenance and observation changes skip publishing, policy changes do not', () => {
  for (const name of ['README.md','docs/example.md','config/newsletter-state.json','config/search-delivery-state.json','data/seo/psi-2026-09-28.json']) {
    assert.equal(classifyChanges({files:[change(name)],historyComplete:true}).publish,false,name);
  }
  assert.equal(classifyChanges({files:[change('data/seo/indexable_tags.yml')],historyComplete:true}).publish,true);
  assert.equal(classifyChanges({files:[change('unknown-input.bin')],historyComplete:true}).fullScan,true);
});
test('incomplete history and deletion never silently select an empty check scope', () => {
  assert.equal(classifyChanges({files:[],historyComplete:false}).publish,true);
  assert.equal(classifyChanges({files:[change('content/en/engineering/posts/old.md','D')],historyComplete:true}).fullScan,true);
});
test('an article is targeted but shared rendering expands test coverage', () => {
  const article = classifyChanges({files:[change('content/zh/engineering/posts/example.md')],historyComplete:true});
  assert.equal(article.fullScan,false);
  assert.deepEqual(article.suites,['source','output','browser']);
  assert.ok(classifyChanges({files:[change('assets/css/extended/custom.css')],historyComplete:true}).suites.includes('interactive'));
});
function repository(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'blog-ci-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
  git('init','-q');git('config','user.email','test@example.invalid');git('config','user.name','CI tests');
  const write=(file,text)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),text);};
  const commit=()=>{git('add','.');git('commit','-qm','test');return git('rev-parse','HEAD');};
  const event=(value)=>{const file=path.join(os.tmpdir(),`blog-event-${Math.random()}.json`);fs.writeFileSync(file,JSON.stringify(value));t.after(()=>fs.rmSync(file,{force:true}));return file;};
  return {root,git,write,commit,event};
}
test('multi-commit push includes a real bilingual pair and exact Unicode/space paths', async t=>{
  const r=repository(t);
  const en='content/en/engineering/posts/有 空格.md',zh=en.replace('/en/','/zh/');
  r.write(en,'one');r.write(zh,'一');const base=r.commit();
  r.write(en,'two');r.commit();r.write('README.md','docs');const head=r.commit();
  const result=await resolveChangeSet({repoRoot:r.root,eventPath:r.event({before:base}),headSha:head});
  assert.deepEqual(result.sourceFiles.sort(),[en,zh].sort());
  assert.equal(result.baseSha,base);assert.equal(result.fullScan,false);
  validateContract('blog-change-set/1',result);
});
test('rename preserves old path and triggers backlink coverage',async t=>{
  const r=repository(t);r.write('content/en/engineering/posts/old.md','content');const base=r.commit();
  r.git('mv','content/en/engineering/posts/old.md','content/en/engineering/posts/new.md');const head=r.commit();
  const result=await resolveChangeSet({repoRoot:r.root,eventPath:r.event({before:base}),headSha:head});
  assert.equal(result.files[0].oldPath,'content/en/engineering/posts/old.md');assert.equal(result.fullScan,true);
});
test('first push and missing or non-ancestor before fail toward a full scan', async t=>{
  const r=repository(t);r.write('content/en/engineering/posts/a.md','content');const head=r.commit();
  for(const before of ['0'.repeat(40),'f'.repeat(40)]) {
    const result=await resolveChangeSet({repoRoot:r.root,eventPath:r.event({before}),headSha:head});
    assert.equal(result.fullScan,true);assert.equal(result.baseSha,null);assert.equal(result.sourceFiles.length,1);
    assert.ok(result.files.every(file=>file.status==='U'), 'unknown history must not claim all historical files were newly authored');
  }
  r.git('checkout','--orphan','other');r.write('README.md','diverged');const other=r.commit();
  const result=await resolveChangeSet({repoRoot:r.root,eventPath:r.event({before:other}),headSha:head});
  assert.equal(result.fullScan,true);assert.equal(result.baseSha,null);
});
test('pull requests use merge-base, not the target tip as changed-file baseline',async t=>{
  const r=repository(t);r.write('README.md','base');const base=r.commit();
  r.git('checkout','-qb','feature');r.write('content/en/engineering/posts/new.md','article');const head=r.commit();
  r.git('checkout','--detach',base);r.write('data/identity.json','{}');const target=r.commit();
  const result=await resolveChangeSet({repoRoot:r.root,eventPath:r.event({pull_request:{base:{sha:target}}}),headSha:head});
  assert.equal(result.baseSha,base);assert.deepEqual(result.files.map(f=>f.path),['content/en/engineering/posts/new.md']);
});
test('publication input digest is stable across bookkeeping but changes with article bytes', t=>{
  const r=repository(t);r.write('content/en/engineering/posts/a.md','a');const first=r.commit();
  r.write('docs/plan.md','planning');r.write('config/newsletter-state.json','{}');const second=r.commit();
  assert.equal(publicationInputDigest({repoRoot:r.root,sha:first}),publicationInputDigest({repoRoot:r.root,sha:second}));
  r.write('content/en/engineering/posts/a.md','b');const third=r.commit();
  assert.notEqual(publicationInputDigest({repoRoot:r.root,sha:first}),publicationInputDigest({repoRoot:r.root,sha:third}));
});
test('compiler configuration changes alter publication identity and require full verification', async t=>{
  const r=repository(t);
  r.write('tsconfig.json','{"compilerOptions":{"strict":true}}');const base=r.commit();
  r.write('tsconfig.json','{"compilerOptions":{"strict":false}}');const head=r.commit();
  assert.notEqual(head,base);
  assert.notEqual(publicationInputDigest({repoRoot:r.root,sha:base}),publicationInputDigest({repoRoot:r.root,sha:head}));
  const changes=await resolveChangeSet({repoRoot:r.root,eventPath:r.event({before:base}),headSha:head});
  assert.equal(changes.sourceSha,head);
  assert.equal(changes.publish,true);assert.equal(changes.fullScan,true);
  assert.deepEqual(changes.suites,ALL_SUITES);
});
test('ambiguous references and malformed contracts are rejected',async t=>{
  const r=repository(t);r.write('README.md','a');r.commit();
  await assert.rejects(resolveChangeSet({repoRoot:r.root,eventPath:r.event({}),headSha:'--help'}),/SHA/);
  assert.throws(()=>validateContract('blog-change-set/1',{schema:'blog-change-set/1',sourceSha:'abc'}));
  assert.throws(()=>validateContract('unknown',{}));
});
test('release defaults to shadow and mandatory skipped checks cannot pass',()=>{
  assert.equal(releaseMode(undefined),'shadow');
  assert.throws(()=>releaseMode('typo'));
  assert.equal(requiredJobsPassed({browser:'skipped'},['browser']),false);
  assert.equal(requiredJobsPassed({source:'success',browser:'success'},['source','browser']),true);
  assert.equal(requiredJobsPassed({},['source']),false);
});
test('workflow_dispatch on a non-main branch resolves the origin/main diff so shared changes keep representative browser scope', async t => {
  const r = repository(t);
  r.write('content/en/engineering/posts/historical.md','old');r.write('content/zh/engineering/posts/historical.md','旧');
  r.write('content/en/engineering/posts/go-release-tools.md','tools');r.write('content/zh/engineering/posts/go-release-tools.md','工具');
  const base = r.commit();
  r.git('update-ref','refs/remotes/origin/main',base);
  r.git('checkout','-qb','feature');
  r.write('layouts/partials/comments.html','<section>comments</section>');
  const head = r.commit();
  const result = await resolveChangeSet({repoRoot:r.root,eventPath:r.event({}),headSha:head,eventName:'workflow_dispatch',ref:'refs/heads/feature'});
  assert.equal(result.baseSha,base);
  assert.equal(result.fullScan,true);
  assert.deepEqual(result.suites,ALL_SUITES);
  assert.equal(result.publish,true);
  assert.deepEqual(result.files.map(f=>f.path),['layouts/partials/comments.html']);
  assert.ok(result.sourceFiles.includes('content/en/engineering/posts/historical.md'),'source structural scan keeps the full inventory');
  const pages = selectBrowserPages({changeSet:result,pageMap});
  assert.ok(pages.includes('/engineering/posts/go-release-tools/'),'representative article policy is preserved');
  assert.ok(!pages.some(p=>p.includes('historical')),'untouched historical articles stay out of browser scope');
  const legacy = await resolveChangeSet({repoRoot:r.root,eventPath:r.event({}),headSha:head});
  assert.equal(legacy.baseSha,null);
  assert.ok(legacy.files.every(f=>f.status==='U'));
  assert.ok(selectBrowserPages({changeSet:legacy,pageMap}).some(p=>p.includes('historical')),'omitted context keeps the historical full behavior');
});
test('missing, noncommit or non-ancestral origin/main keeps the unproven inventory fallback', async t => {
  const r = repository(t);
  r.write('content/en/engineering/posts/a.md','content');
  const base = r.commit();
  r.git('checkout','-qb','feature');
  r.write('layouts/partials/comments.html','comments');
  const head = r.commit();
  const dispatch = () => resolveChangeSet({repoRoot:r.root,eventPath:r.event({}),headSha:head,eventName:'workflow_dispatch',ref:'refs/heads/feature'});
  const fullFallback = async () => {
    const result = await dispatch();
    assert.equal(result.baseSha,null);
    assert.equal(result.fullScan,true);
    assert.ok(result.files.every(f=>f.status==='U'),'unknown history must not claim newly authored files');
  };
  await fullFallback();
  r.git('update-ref','refs/remotes/origin/main',r.git('hash-object','-w','content/en/engineering/posts/a.md'));
  await fullFallback();
  r.git('checkout','--orphan','elsewhere');r.write('content/en/engineering/posts/other.md','other');const divergent = r.commit();
  r.git('update-ref','refs/remotes/origin/main',divergent);
  await fullFallback();
  r.git('update-ref','refs/remotes/origin/main',base);
  const result = await dispatch();
  assert.equal(result.baseSha,base);
  assert.deepEqual(result.files.map(f=>f.path),['layouts/partials/comments.html']);
});
test('main dispatch, tag dispatch, other events and omitted context never take the dispatch baseline', async t => {
  const r = repository(t);
  r.write('content/en/engineering/posts/a.md','content');
  const base = r.commit();
  r.git('update-ref','refs/remotes/origin/main',base);
  r.git('checkout','-qb','feature');
  r.write('layouts/partials/comments.html','comments');
  const head = r.commit();
  for (const context of [
    {eventName:'workflow_dispatch',ref:'refs/heads/main'},
    {eventName:'Workflow_Dispatch',ref:'refs/heads/feature'},
    {eventName:'workflow_dispatch',ref:'refs/tags/v1.0.0'},
    {eventName:'workflow_dispatch',ref:'refs/heads/'},
    {eventName:'workflow_dispatch',ref:'main'},
    {eventName:'workflow_dispatch'},
    {ref:'refs/heads/feature'},
    {eventName:'push',ref:'refs/heads/feature'},
    {eventName:'pull_request',ref:'refs/heads/feature'},
    {eventName:'schedule',ref:'refs/heads/feature'},
    {},
  ]) {
    const result = await resolveChangeSet({repoRoot:r.root,eventPath:r.event({}),headSha:head,...context});
    assert.equal(result.baseSha,null,JSON.stringify(context));
    assert.equal(result.fullScan,true,JSON.stringify(context));
    assert.ok(result.files.every(f=>f.status==='U'),JSON.stringify(context));
  }
  const dispatch = await resolveChangeSet({repoRoot:r.root,eventPath:r.event({}),headSha:head,eventName:'workflow_dispatch',ref:'refs/heads/feature'});
  assert.equal(dispatch.baseSha,base);
});
test('an established push or pull request baseline is never overridden by the dispatch fallback', async t => {
  const r = repository(t);
  r.write('content/en/engineering/posts/a.md','one');
  const base = r.commit();
  r.git('update-ref','refs/remotes/origin/main',base);
  r.git('checkout','-qb','feature');
  r.write('content/en/engineering/posts/b.md','new');const before = r.commit();
  r.write('content/en/engineering/posts/a.md','two');const head = r.commit();
  for (const eventName of ['push','workflow_dispatch']) {
    const result = await resolveChangeSet({repoRoot:r.root,eventPath:r.event({before}),headSha:head,eventName,ref:'refs/heads/feature'});
    assert.equal(result.baseSha,before);
    assert.deepEqual(result.files.map(f=>f.path),['content/en/engineering/posts/a.md']);
  }
  r.git('checkout','--detach',base);r.write('data/identity.json','{}');const target = r.commit();
  r.git('update-ref','refs/remotes/origin/main',before);
  const pulled = await resolveChangeSet({repoRoot:r.root,eventPath:r.event({pull_request:{base:{sha:target}}}),headSha:head,eventName:'pull_request',ref:'refs/heads/feature'});
  assert.equal(pulled.baseSha,base);
  assert.deepEqual(pulled.files.map(f=>f.path).sort(),['content/en/engineering/posts/a.md','content/en/engineering/posts/b.md']);
});
test('dispatch diffs keep bilingual targeting and deletion/rename backlink coverage', async t => {
  const r = repository(t);
  const en='content/en/engineering/posts/a.md',zh='content/zh/engineering/posts/a.md';
  r.write(en,'one');r.write(zh,'一');
  const base = r.commit();
  r.git('update-ref','refs/remotes/origin/main',base);
  const dispatch = head => resolveChangeSet({repoRoot:r.root,eventPath:r.event({}),headSha:head,eventName:'workflow_dispatch',ref:'refs/heads/feature'});
  r.git('checkout','-qb','feature');r.write(en,'two');const changed = await dispatch(r.commit());
  assert.equal(changed.fullScan,false);
  assert.deepEqual(changed.suites,['source','output','browser']);
  assert.deepEqual(changed.sourceFiles.sort(),[en,zh].sort());
  assert.deepEqual(selectBrowserPages({changeSet:changed,pageMap}),['/engineering/posts/a/','/zh/engineering/posts/a/']);
  r.git('checkout','--detach',base);r.git('checkout','-qb','rename');r.git('mv',en,'content/en/engineering/posts/b.md');
  const renamed = await dispatch(r.commit());
  assert.equal(renamed.fullScan,true);
  assert.equal(renamed.files[0].oldPath,en);
  r.git('checkout','--detach',base);r.git('checkout','-qb','delete');r.git('rm','-q',en);
  const deleted = await dispatch(r.commit());
  assert.equal(deleted.fullScan,true);
  assert.ok(deleted.files.some(f=>f.status==='D'&&f.path===en));
});
