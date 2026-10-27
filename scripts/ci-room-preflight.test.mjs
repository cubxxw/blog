import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import YAML from 'yaml';
import {enumerateTestIds} from './ci-test-inventory.mjs';
const api=await import('./ci-room-preflight.mjs').catch(()=>({}));
const cases=[
  ['00-space-resident-motion.spec.ts','the resident wanders but pauses in quiet mode, dialogs, reduced motion and the workspace'],
  ['space-browser.spec.ts','a visitor can leave a web draft, look out the window and resume the same page with continuous sound (native)'],
  ['space-browser.spec.ts','a visitor can leave a web draft, look out the window and resume the same page with continuous sound (compatible)'],
  ['space-cafe-details-contracts.spec.ts','runtime quiet/reduce and resize settle inspection without a late focus grab or an idle render loop'],
  ['space-jiangnan.spec.ts','a failed distant environment falls back to geometry and remains explorable'],
  ['space-jiangnan.spec.ts','quiet freezes rain, fan and boat while intentional movement still works'],
  ['space-object-living.spec.ts','returning to the present can be interrupted by a new clock gesture'],
  ['space-object-living.spec.ts','changing motion preference during waking settles the old call and accepts a new one'],
  ['space-object-living.spec.ts','choosing real records keeps the outdoor source and drives the platter'],
];
function raw(){return {errors:[],suites:[{title:'',specs:cases.map(([file,title],index)=>({file,title,line:index+1,column:1,tests:['desktop','mobile'].map(projectName=>({projectName,status:'expected',expectedStatus:'passed',results:[{status:'passed',retry:0}]}))}))}]};}
function expected(){return enumerateTestIds(raw());}

test('the relocated resident target remains registered in its real source file',()=>{
  const [file,title]=cases[0];
  const source=fs.readFileSync(new URL('../tests/e2e/'+file,import.meta.url),'utf8');
  const original=fs.readFileSync(new URL('../tests/e2e/00-space-onboarding.spec.ts',import.meta.url),'utf8');
  assert.ok(source.includes(title),'Mandatory resident target no longer exists at its registered path');
  assert.equal(original.includes(title),false,'Resident target duplicated in its former file');
});
test('the real resident case uses independent original startup gates and preserves capture diagnostics',()=>{
  const source=fs.readFileSync(new URL('../tests/e2e/00-space-resident-motion.spec.ts',import.meta.url),'utf8');
  const helper=fs.readFileSync(new URL('../tests/helpers/room-observation.ts',import.meta.url),'utf8');
  assert.match(source,/const movement=await observeResidentStartup\(page\)/);
  assert.match(helper,/\[\['boot',30000\],\['roam',5000\],\['cat',30000\],\['motion',12000\]\]/);
  assert.match(source,/if\(!process\.env\.ROOM_DIAG_VARIANT\)test\.use\(\{trace:\{mode:'retain-on-failure',snapshots:false,screenshots:false,sources:true\},screenshot:'only-on-failure'\}\)/);
  assert.match(source,/observePausedResident\(page,checkFrames\)/);
  assert.match(fs.readFileSync(new URL('../scripts/ci-run.mjs',import.meta.url),'utf8'),/'scripts\/room-resident-stages\.test\.mjs'/);
});
test('focused room preflight requires every named path in both real projects',()=>{
  assert.equal(typeof api.selectRoomRegressions,'function');
  const inventory={suites:{legacy:[...expected(),JSON.stringify(['other.spec.ts',1,1,'','other','desktop',0])]}};
  assert.deepEqual(api.selectRoomRegressions(inventory),expected());
  assert.throws(()=>api.selectRoomRegressions({suites:{legacy:expected().slice(1)}}));
  assert.throws(()=>api.selectRoomRegressions({suites:{legacy:[...expected(),expected()[0]]}}));
});
test('focused evidence is raw, exact, first-pass and never all-skip or partial',()=>{
  assert.equal(typeof api.verifyRoomRegressionResult,'function');
  assert.equal(api.verifyRoomRegressionResult(raw(),expected()).counts.firstPass,18);
  const skipped=raw();Object.assign(skipped.suites[0].specs[0].tests[0],{status:'skipped',expectedStatus:'skipped',results:[{status:'skipped',retry:0}]});
  assert.throws(()=>api.verifyRoomRegressionResult(skipped,expected()));
  const retry=raw();Object.assign(retry.suites[0].specs[0].tests[0],{status:'flaky',results:[{status:'failed',retry:0},{status:'passed',retry:1}]});
  assert.throws(()=>api.verifyRoomRegressionResult(retry,expected()));
  const error=raw();error.errors=[{message:'global failure'}];assert.throws(()=>api.verifyRoomRegressionResult(error,expected()));
  const wrongIds=raw();wrongIds.suites[0].specs[0].title='different case with the same passing denominator';
  assert.throws(()=>api.verifyRoomRegressionResult(wrongIds,expected()));
  const missing=raw();missing.suites[0].specs.pop();assert.throws(()=>api.verifyRoomRegressionResult(missing,expected()));
  const unfinished=raw();unfinished.suites[0].specs[0].tests[0].results=[];assert.throws(()=>api.verifyRoomRegressionResult(unfinished,expected()));
});
test('focused invocation keeps real inputs, original gates and independent diagnostics',()=>{
  assert.equal(typeof api.roomRegressionArgs,'function');const args=api.roomRegressionArgs();
  assert.ok(args.includes('--workers=1'));assert.ok(args.includes('--retries=0'));
  assert.ok(args.includes('--project=desktop'));assert.ok(args.includes('--project=mobile'));
  assert.ok(args.includes('--reporter=list,json,html'));
  const grep=new RegExp(args[args.indexOf('--grep')+1]);
  for(const [file,title] of cases){
    assert.ok(grep.test('desktop '+file+' suite '+title),title);
    assert.equal(grep.test('desktop '+file+' '+title+' extra'),false);
  }
  assert.equal(grep.test('unrelated room test'),false);
  assert.ok(!args.some(arg=>/timeout|pass-with-no-tests|shard=/.test(arg)));
  assert.equal(args.filter(arg=>arg.endsWith('.spec.ts')).length,5);
});
test('optional dispatch preflight defaults off and cannot replace the full graph',()=>{
  const workflow=YAML.parse(fs.readFileSync('.github/workflows/main.yaml','utf8'));
  assert.equal(workflow.on.workflow_dispatch.inputs.room_regressions?.type,'boolean');
  assert.equal(workflow.on.workflow_dispatch.inputs.room_regressions?.default,false);
  const step=workflow.jobs.preflight?.steps.find(s=>s.name==='Diagnose known room regressions before browser fan-out');
  assert.ok(step);assert.equal(step['continue-on-error'],undefined);
  assert.equal(step.if,"inputs.room_regressions == true");
  assert.equal(step.run,'node scripts/ci-room-preflight.mjs');
  assert.ok(workflow.jobs.verify.needs.includes('browser'));
  assert.ok(workflow.jobs.release.needs.includes('verify'));
});
