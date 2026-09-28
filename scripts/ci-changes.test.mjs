import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { classifyChanges, resolveChangeSet, publicationInputDigest } from './lib/ci-changes.mjs';
import { validateContract, releaseMode, requiredJobsPassed } from './lib/ci-contracts.mjs';

const change = (path, status = 'M', oldPath = null) => ({path,status,oldPath});
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
