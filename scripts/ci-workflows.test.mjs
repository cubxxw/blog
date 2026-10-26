import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
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
test('the actual door preflight requires three first attempts and propagates a failed browser exit',()=>{
  const workflow=YAML.parse(fs.readFileSync('.github/workflows/main.yaml','utf8'));
  const step=workflow.jobs.preflight?.steps.find(s=>s.name==='Diagnose the desktop rear-door journey before browser fan-out');
  assert.ok(step);assert.equal(step['continue-on-error'],undefined);
  const inline=step.run.match(/<<'NODE'\n([\s\S]+)\nNODE\s*$/)?.[1];
  assert.ok(inline);
  // Run the workflow's own program with only filesystem/process boundaries
  // replaced; no Playwright, production build or network is started here.
  const program=inline.replace(/^import [^\n]+\n/gm,'');
  for(const status of [0,1,null]){
    let checks=0,launches=0;
    const process={execPath:'/node',env:{},exitCode:undefined};
    const input={'plan.json':{},'changes.json':{},'frozen.json':{},'page-map.json':{baseUrl:'https://example.test/'}};
    runInNewContext(program,{path,URL,process,
      fs:{readFileSync:file=>JSON.stringify(input[path.basename(file)])},
      verifyFrozenProof:()=>{checks++;},
      spawnSync:(executable,args)=>{
        launches++;assert.equal(executable,'/node');
        assert.equal(args.find(arg=>arg.startsWith('--retries=')),'--retries=0');
        assert.equal(args.find(arg=>arg.startsWith('--repeat-each=')),'--repeat-each=3');
        assert.ok(args.includes('tests/e2e/space-door-excursion.spec.ts'));
        return {status};
      }
    });
    assert.equal(launches,1);assert.equal(checks,2);
    assert.equal(process.exitCode,status??1);
  }
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
  const evidence = workflow.jobs.browser.steps.find(step => step.name === 'Preserve verification evidence');
  assert.equal(evidence.if, 'always()', 'failure must still upload evidence');
  const paths = evidence.with.path.split('\n').map(value => value.trim()).filter(Boolean);
  assert.ok(paths.includes('playwright-report/interactive/'), 'cross-engine report must survive the runner');
  assert.ok(paths.includes('test-results/'), 'failed interactive traces must survive the runner');
});

test('one frozen producer feeds isolated runners and only the final required gate can publish',()=>{
  const workflow=YAML.parse(fs.readFileSync('.github/workflows/main.yaml','utf8')),jobs=workflow.jobs;
  assert.equal(jobs.verify.name,'Required blog quality');
  assert.deepEqual(jobs.verify.needs,['prepare','preflight','browser']);assert.match(jobs.verify.if,/always\(\)/);
  assert.equal(jobs.browser.strategy['fail-fast'],false);
  assert.equal(jobs.browser.strategy.matrix,'${{ fromJSON(needs.prepare.outputs.browser_matrix) }}');
  assert.equal(jobs.browser['timeout-minutes'],120);
  const commands=jobs.prepare.steps.map(s=>s.run||'').join('\n');
  for(const required of ['ci-run.mjs prepare','voice:test','bear:test','ux:test'])assert.ok(commands.includes(required));
  assert.ok(!commands.includes('ci-run.mjs verify'));
  const download=jobs.browser.steps.find(s=>s.uses?.startsWith('actions/download-artifact@'));
  assert.equal(download.with['artifact-ids'],'${{ needs.prepare.outputs.artifact_id }}');
  const finish=jobs.verify.steps.find(s=>s.run?.includes('ci-run.mjs finalize'));
  assert.ok(finish);assert.equal(finish['continue-on-error'],undefined);
  const upload=jobs.verify.steps.find(s=>s.id==='artifact');assert.ok(upload);
  assert.equal(jobs.release.with.artifact_id,'${{ needs.verify.outputs.artifact_id }}');
});


test('browser preflights use the frozen producer on a fresh runner before every consumer',()=>{
 const jobs=YAML.parse(fs.readFileSync('.github/workflows/main.yaml','utf8')).jobs;
 assert.deepEqual(jobs.preflight?.needs,['prepare']);
 assert.equal(jobs.preflight?.['runs-on'],'ubuntu-24.04');assert.equal(jobs.preflight?.['timeout-minutes'],120);
 assert.equal(jobs.preflight?.if,"needs.prepare.outputs.run_site == 'true'");
 assert.equal(jobs.preflight.steps.find(s=>s.name==='Diagnose the desktop rear-door journey before browser fan-out').if,undefined,'optional rooms disabled must still run mandatory rear-door3');
 assert.deepEqual(jobs.browser.needs,['prepare','preflight']);
 const download=jobs.preflight.steps.find(s=>s.uses?.startsWith('actions/download-artifact@'));
 assert.equal(download.with['artifact-ids'],'${{ needs.prepare.outputs.artifact_id }}');
 assert.equal(download.with.path,'tests/.artifacts/ci');
 const commands=jobs.preflight.steps.map(s=>s.run||'').join('\n');
 assert.ok(!/site-build|hugo --|ci-run\.mjs prepare/.test(commands),'no duplicate production build');
 assert.ok(!jobs.prepare.steps.some(s=>/playwright|ci-room-preflight/.test(s.run||'')),'producer does not host active browser journeys');
 const evidence=jobs.preflight.steps.find(s=>s.uses?.startsWith('actions/upload-artifact@'));
 assert.equal(evidence.if,'always()');assert.match(evidence.with.path,/door-preflight/);assert.match(evidence.with.path,/room-preflight/);
 const reject=jobs.verify.steps.find(s=>s.name==='Reject incomplete or unsuccessful required jobs');
 assert.equal(reject.env.BLOG_PREFLIGHT_RESULT,'${{ needs.preflight.result }}');assert.match(reject.run,/preflight:process\.env\.BLOG_PREFLIGHT_RESULT/);
});
