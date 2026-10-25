import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {enumerateTestIds,summarizePlaywright,assertTestInventory,collectTestInventory,assertShardEvidence} from './ci-test-inventory.mjs';
const row=(id,status='expected',results=[{status:'passed',retry:0}])=>({id,file:'fixture.spec.ts',line:1,column:1,title:id,tests:[{projectName:'desktop',status,expectedStatus:status==='skipped'?'skipped':'passed',results}]});
const raw=(...specs)=>({errors:[],suites:[{specs}]});
const specs=[{id:'legacy-1',suite:'legacy',shard:'1/2'},{id:'legacy-2',suite:'legacy',shard:'2/2'}];
const inventory={schema:'blog-test-inventory/1',suites:{legacy:enumerateTestIds(raw(row('a'),row('b')))},shards:{'legacy-1':enumerateTestIds(raw(row('a'))),'legacy-2':enumerateTestIds(raw(row('b')))}};
test('whole-suite and partition lists must cover exactly the same unique test identities',()=>{
  assertTestInventory(inventory,specs);
  for(const shards of [{'legacy-1':inventory.shards['legacy-1']},{...inventory.shards,'legacy-2':inventory.shards['legacy-1']},{...inventory.shards,'legacy-2':['other|desktop|0']},{...inventory.shards,extra:['extra|desktop|0']}])assert.throws(()=>assertTestInventory({...inventory,shards},specs));
  assert.throws(()=>enumerateTestIds(raw(row('a'),row('a'))));assert.throws(()=>enumerateTestIds(raw()));
});
test('raw report counts separate first pass, retry success and existing skipped cases',()=>{
  const e=summarizePlaywright(raw(row('a'),row('b','flaky',[{status:'failed',retry:0},{status:'passed',retry:1}]),row('c','skipped',[{status:'skipped',retry:0}])));
  assert.equal(e.ok,true);assert.deepEqual(e.counts,{total:3,firstPass:1,flaky:1,skipped:1,expectedFailures:0,failed:0,unfinished:0,attempts:4,retries:1,globalErrors:0});
  for(const r of [raw(row('a','unexpected',[{status:'failed'}])),raw(row('a','expected',[])),raw(row('a','skipped',[{status:'skipped'}])),{...raw(row('a')),errors:[{message:'interrupted'}]}])assert.equal(summarizePlaywright(r).ok,false);
});
test('missing tests, all skips and forged zero counts do not certify a shard',()=>{
  const good=summarizePlaywright(raw(row('a')));assertShardEvidence({inventory,specs,spec:specs[0],evidence:good});
  for(const evidence of [undefined,summarizePlaywright(raw(row('b'))),summarizePlaywright(raw(row('a','skipped',[{status:'skipped'}]))),{...good,counts:{...good.counts,total:0}}])assert.throws(()=>assertShardEvidence({inventory,specs,spec:specs[0],evidence}));
});
test('inventory collection uses the original filter before proving the partition',()=>{
  const calls=[];
  const result=collectTestInventory({specs,env:{},listTests:args=>{calls.push(args);const shard=args.find(x=>x.startsWith('--shard='));return shard?inventory.shards[shard==='--shard=1/2'?'legacy-1':'legacy-2']:inventory.suites.legacy;}});
  assert.deepEqual(result,inventory);assert.equal(calls.length,3);assert.ok(calls.every(args=>args.includes('Visual Regression')&&args.includes('--list')&&args.includes('--reporter=json')));
});

test('real Playwright multi-project JSON lists retain exactly the same identities when partitioned',()=>{
  const require=createRequire(import.meta.url),dir=fs.mkdtempSync(path.join(os.tmpdir(),'inventory-projects-'));
  try {
    fs.writeFileSync(path.join(dir,'sample.spec.cjs'),`const {test}=require(${JSON.stringify(require.resolve('@playwright/test'))});
for(const name of ['alpha','beta'])test.describe(name,()=>test('same title',()=>{}));
`);
    const config=path.join(dir,'playwright.config.cjs');
    fs.writeFileSync(config,`module.exports=${JSON.stringify({testDir:dir,testMatch:'sample.spec.cjs',projects:['chromium','firefox','webkit'].map(name=>({name}))})};`);
    const list=(project)=>{
      const env={...process.env};delete env.PLAYWRIGHT_JSON_OUTPUT_FILE;
      const result=spawnSync(process.execPath,[path.resolve('node_modules/@playwright/test/cli.js'),'test',`--config=${config}`,...(project?[`--project=${project}`]:[]),'--list','--reporter=json'],{env,cwd:dir,encoding:'utf8'});
      assert.equal(result.status,0,result.stderr);
      const report=JSON.parse(result.stdout);
      if(!project){
        const rows=[];const visit=suites=>{for(const suite of suites??[]){rows.push(...(suite.specs??[]));visit(suite.suites);}};visit(report.suites);
        assert.equal(rows.length,2);assert.ok(rows.every(spec=>spec.tests.length===3),'whole JSON must merge three projects per spec');
      }
      return enumerateTestIds(report);
    };
    const whole=list(),partition=['chromium','firefox','webkit'].flatMap(list).sort();
    assert.equal(whole.length,6);assert.deepEqual(partition,whole);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
