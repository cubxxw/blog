import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import YAML from 'yaml';
import { compileExecutionPlan } from './ci-run.mjs';
import { requiredJobsPassed } from './lib/ci-contracts.mjs';
const changes={schema:'blog-change-set/1',sourceSha:'a'.repeat(40),baseSha:null,fullScan:false,files:[],sourceFiles:[],suites:['workflow'],publish:false,reason:'maintenance'};
test('documentation does not build or publish while shadow cannot publish production',()=>{
  assert.deepEqual(compileExecutionPlan({changeSet:changes,mode:'shadow'}),{requiredChecks:['workflow'],runSite:false,production:false});
  const article={...changes,publish:true,suites:['source','output','browser']};
  assert.equal(compileExecutionPlan({changeSet:article,mode:'shadow'}).production,false);
  assert.equal(compileExecutionPlan({changeSet:article,mode:'active'}).production,true);
  assert.throws(()=>compileExecutionPlan({changeSet:article,mode:'misspelled'}));
});
test('a cancelled or skipped mandatory check is never a green gate',()=>{
  for(const state of ['cancelled','skipped','failure',undefined])assert.equal(requiredJobsPassed({source:state},['source']),false);
});
test('production reusable workflow is isolated and gated behind verified main artifacts',()=>{
  const main=YAML.parse(fs.readFileSync('.github/workflows/main.yaml','utf8'));
  const release=YAML.parse(fs.readFileSync('.github/workflows/release-netlify.yml','utf8'));
  assert.ok(main.jobs.release.needs.includes('verify'));
  assert.equal(release.jobs.release.environment,'production');
  assert.equal(release.jobs.release.concurrency['cancel-in-progress'],false);
  assert.ok(release.on.workflow_call);
  assert.equal(release.on.pull_request,undefined);
  assert.equal(main.permissions.contents,'read');
  assert.equal(main.jobs.verify.environment,undefined);
  assert.match(main.jobs.verify.concurrency.group,/github\.run_id/, 'main verification cannot share a one-pending queue with bookkeeping runs');
});
test('manual backup applies the source gate before building',()=>{
  const workflow=YAML.parse(fs.readFileSync('.github/workflows/hugo.yml','utf8'));
  const commands=workflow.jobs.build.steps.map(step=>step.run??'').join('\n');
  const source=commands.indexOf('check-content-quality.mjs source');
  assert.ok(source>=0 && source<commands.indexOf('site-build.mjs --target backup'));
});
