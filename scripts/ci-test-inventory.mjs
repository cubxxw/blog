import path from 'node:path';
import {spawnSync} from 'node:child_process';

function cases(report) {
  const rows=[];
  function visit(suites) {
    for(const suite of suites??[]) {
      for(const spec of suite.specs??[])for(const test of spec.tests??[]) {
        if(typeof spec.id!=='string'||!spec.id||typeof test.projectName!=='string'||!test.projectName)throw new Error('Missing Playwright test identity');
        rows.push({id:`${spec.id}|${test.projectName}|${test.repeatEachIndex??0}`,test});
      }
      visit(suite.suites);
    }
  }
  visit(report.suites);return rows;
}
function ids(values) {
  if(!Array.isArray(values)||!values.length||values.some(v=>typeof v!=='string'||!v)||new Set(values).size!==values.length)throw new Error('Empty or duplicate test inventory');
  return [...values].sort();
}
const equal=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
export function enumerateTestIds(report) {return ids(cases(report).map(row=>row.id));}

// Parse the raw reporter protocol, not the process exit or an ok flag.
export function summarizePlaywright(report) {
  const inventory=enumerateTestIds(report),counts={total:inventory.length,firstPass:0,flaky:0,skipped:0,expectedFailures:0,failed:0,unfinished:0,attempts:0,retries:0,globalErrors:Array.isArray(report.errors)?report.errors.length:1};
  for(const {test} of cases(report)) {
    const attempts=test.results??[];
    counts.attempts+=attempts.length;counts.retries+=Math.max(0,attempts.length-1);
    if(test.status==='skipped'&&test.expectedStatus==='skipped'){counts.skipped++;continue;}
    if(!attempts.length){counts.unfinished++;continue;}
    if(!['expected','flaky'].includes(test.status)||attempts.at(-1).status!==test.expectedStatus){counts.failed++;continue;}
    if(test.status==='flaky'&&attempts.length>1)counts.flaky++;
    else if(attempts.length===1&&test.expectedStatus==='passed')counts.firstPass++;
    else if(attempts.length===1&&test.expectedStatus==='failed')counts.expectedFailures++;
    else counts.unfinished++;
  }
  return {schema:'blog-playwright/1',inventory,counts,ok:counts.failed===0&&counts.unfinished===0&&counts.globalErrors===0&&counts.total>counts.skipped};
}

export function assertTestInventory(inventory,specs) {
  if(inventory?.schema!=='blog-test-inventory/1'||!inventory.suites||!inventory.shards)throw new Error('Required test inventory missing');
  if(!equal(Object.keys(inventory.shards),specs.map(s=>s.id))||!equal(Object.keys(inventory.suites),[...new Set(specs.map(s=>s.suite))]))throw new Error('Unexpected test inventory partitions');
  const all=[];
  for(const suite of Object.keys(inventory.suites)) {
    const expected=ids(inventory.suites[suite]),partition=specs.filter(s=>s.suite===suite).flatMap(s=>ids(inventory.shards[s.id]));
    ids(partition);if(!equal(partition,expected))throw new Error(`Incomplete ${suite} test inventory coverage`);
    all.push(...expected);
  }
  ids(all);
}
export function assertShardEvidence({inventory,specs,spec,evidence}) {
  assertTestInventory(inventory,specs);
  if(evidence?.schema!=='blog-playwright/1'||evidence.ok!==true||!equal(ids(evidence.inventory),inventory.shards[spec.id]))throw new Error(`Missing or incomplete Playwright evidence: ${spec.id}`);
  const c=evidence.counts;
  if(!c||Object.values(c).some(n=>!Number.isSafeInteger(n)||n<0)||c.total!==evidence.inventory.length||c.firstPass+c.flaky+c.skipped+c.expectedFailures+c.failed+c.unfinished!==c.total||c.total<=c.skipped||c.failed!==0||c.unfinished!==0||c.globalErrors!==0)throw new Error('Invalid Playwright evidence counts');
}

function invocation(spec,wholeSuite=false) {
  const config=spec.suite==='interactive'?'playwright.interactive.config.ts':spec.suite==='quality'?'playwright.quality.config.ts':'playwright.config.ts';
  return ['test',`--config=${config}`,...(spec.suite==='legacy'?['--grep-invert','Visual Regression']:[]),...(!wholeSuite&&spec.shard?[`--shard=${spec.shard}`]:[]),...(!wholeSuite&&spec.project?[`--project=${spec.project}`]:[]),'--list','--reporter=json'];
}
function list(args,env) {
  const actualEnv={...env};delete actualEnv.PLAYWRIGHT_JSON_OUTPUT_FILE;
  const result=spawnSync(process.execPath,[path.resolve('node_modules/@playwright/test/cli.js'),...args],{env:actualEnv,stdio:['ignore','pipe','inherit'],encoding:'utf8',maxBuffer:32*1024*1024});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error('Playwright test inventory collection failed');
  return enumerateTestIds(JSON.parse(result.stdout));
}
export function collectTestInventory({specs,env,listTests=list}) {
  const inventory={schema:'blog-test-inventory/1',suites:{},shards:{}};
  for(const spec of specs) {
    inventory.suites[spec.suite]??=listTests(invocation(spec,true),env);
    inventory.shards[spec.id]=spec.shard||spec.project?listTests(invocation(spec),env):inventory.suites[spec.suite];
  }
  assertTestInventory(inventory,specs);return inventory;
}
