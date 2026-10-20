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

test('Lighthouse publish reruns bind to the producer artifact and fail closed before issue writes',()=>{
  const workflow=YAML.parse(fs.readFileSync('.github/workflows/lighthouse.yml','utf8'));
  const producer=workflow.jobs.lighthouse,publish=workflow.jobs.publish;
  const upload=producer.steps.find(s=>s.uses?.startsWith('actions/upload-artifact@'));
  const download=publish.steps.find(s=>s.uses?.startsWith('actions/download-artifact@'));
  assert.ok(upload.id,'producer must expose the actual immutable upload');
  assert.equal(upload.with.name,'lighthouse-results-${{ github.run_id }}-${{ github.run_attempt }}');
  assert.equal(upload.with['artifact-ids'],undefined,'artifact IDs belong to the downloader, never upload inputs');
  assert.equal(producer.outputs.lighthouse_artifact_id,`${'${{'} steps.${upload.id}.outputs.artifact-id }}`);
  assert.equal(download.with.name,undefined,'consumer attempt must not guess producer name');
  assert.equal(download.with['artifact-ids'],'${{ needs.lighthouse.outputs.lighthouse_artifact_id }}');
  assert.match(publish.if,/needs\.lighthouse\.outputs\.lighthouse_artifact_id\s*!=\s*''/,'empty ID must skip the whole publisher, not download all or sync missing');
  assert.notEqual(download['continue-on-error'],true,'a download/digest failure must stop publication');
  const sync=publish.steps.find(s=>s.run?.includes('lighthouse-report-to-issue.mjs'));
  assert.ok(sync);assert.equal(sync.if,undefined,'implicit success gate must remain before issue writes');
  // Resolve the configured dependency reference for a failed-job-only rerun:
  // producer attempt1/upload123 survives consumer attempt2; a complete rerun
  // receives upload456 instead. Neither consumer run_attempt controls it.
  const expression=download.with['artifact-ids'];
  const reference=expression.match(/^\$\{\{\s*needs\.([\w-]+)\.outputs\.([\w-]+)\s*\}\}$/);
  assert.ok(reference);
  const resolve=ctx=>ctx.needs[reference[1]].outputs[reference[2]];
  for(const [consumerAttempt,artifactId] of [[2,'123'],[3,'456']]) {
    const ctx={github:{run_attempt:consumerAttempt},needs:{lighthouse:{outputs:{lighthouse_artifact_id:artifactId}}}};
    assert.equal(resolve(ctx),artifactId);
  }
});


test('failed interactive checks retain their HTML report and traces', () => {
  const workflow = YAML.parse(fs.readFileSync('.github/workflows/main.yaml', 'utf8'));
  const evidence = workflow.jobs.verify.steps.find(step => step.name === 'Preserve verification evidence');
  assert.equal(evidence.if, 'always()', 'failure must still upload evidence');
  const paths = evidence.with.path.split('\n').map(value => value.trim()).filter(Boolean);
  assert.ok(paths.includes('playwright-report/interactive/'), 'cross-engine report must survive the runner');
  assert.ok(paths.includes('test-results/'), 'failed interactive traces must survive the runner');
});
