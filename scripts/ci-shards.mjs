import fs from 'node:fs';
import path from 'node:path';
import {objectDigest,snapshotDeployment} from './lib/site-artifact.mjs';
import {legacyBrowserScope} from './site-verify.mjs';
import {assertTestInventory,assertShardEvidence,summarizePlaywright} from './ci-test-inventory.mjs';

export function assertVerificationJobs({prepare,preflight,browser,runSite}) {
  if(prepare!=='success'||preflight!==(runSite?'success':'skipped')||browser!==(runSite?'success':'skipped'))throw new Error('Required verification job failed, was cancelled, or did not run');
}

// These are execution partitions, not permission to omit any existing suite.
export function browserShardPlan({plan,changeSet}) {
  if(!plan.runSite)return [];
  const shards=[{id:'quality',suite:'quality',workers:1}];
  if(legacyBrowserScope(changeSet,'production').required)
    for(let current=1;current<=16;current++)shards.push({id:`legacy-${current}`,suite:'legacy',shard:`${current}/16`,workers:1});
  if(plan.requiredChecks.includes('interactive'))
    for(const project of ['chromium','firefox','webkit'])shards.push({id:`interactive-${project}`,suite:'interactive',project,workers:1});
  return shards;
}
export function createFrozenProof({bundleRoot,plan,changeSet,runId,runAttempt,testInventory}) {
  if(!plan.runSite||plan.sourceSha!==changeSet.sourceSha||!/^\d+$/.test(String(runId))||!Number.isSafeInteger(Number(runAttempt))||Number(runAttempt)<1)throw new Error('Invalid frozen producer identity');
  if(testInventory)assertTestInventory(testInventory,browserShardPlan({plan,changeSet}));
  return {schema:'blog-frozen/1',sourceSha:plan.sourceSha,clock:plan.clock,inputDigest:plan.inputDigest,runId:String(runId),runAttempt:Number(runAttempt),planDigest:objectDigest(plan),changeSetDigest:objectDigest(changeSet),deploymentDigest:objectDigest(snapshotDeployment(bundleRoot)),...(testInventory?{testInventory}: {})};
}
export function verifyFrozenProof({bundleRoot,plan,changeSet,proof}) {
  if(!proof||proof.schema!=='blog-frozen/1')throw new Error('Missing frozen producer proof');
  const actual=createFrozenProof({bundleRoot,plan,changeSet,runId:proof.runId,runAttempt:proof.runAttempt,testInventory:proof.testInventory});
  if(objectDigest(actual)!==objectDigest(proof))throw new Error('Frozen deployment bytes or execution identity changed');
}
export function createShardReport({spec,proof,runAttempt,exitCode,result,evidence}) {
  return {schema:'blog-shard/1',...spec,sourceSha:proof.sourceSha,runId:proof.runId,runAttempt:Number(runAttempt),frozenDigest:objectDigest(proof),mode:'enforce',ok:exitCode===0&&result?.mode==='enforce'&&result?.ok===true&&evidence?.ok===true,exitCode,result,evidence};
}
export function aggregateShardReports({plan,changeSet,proof,reports}) {
  const expected=browserShardPlan({plan,changeSet}),wanted=new Map(expected.map(s=>[s.id,s])),latest=new Map(),seen=new Set();
  assertTestInventory(proof.testInventory,expected);
  if(!Array.isArray(reports))throw new Error('Shard reports required');
  for(const report of reports) {
    const spec=wanted.get(report.id),key=`${report.id}:${report.runAttempt}`;
    if(!spec||seen.has(key))throw new Error('Unknown or duplicate shard report');
    seen.add(key);
    if(report.schema!=='blog-shard/1'||report.mode!=='enforce'||report.sourceSha!==proof.sourceSha||report.runId!==proof.runId||report.frozenDigest!==objectDigest(proof)||!Number.isSafeInteger(report.runAttempt)||report.runAttempt<proof.runAttempt||!Object.entries(spec).every(([k,v])=>report[k]===v))throw new Error('Shard execution identity mismatch');
    if(!latest.has(report.id)||report.runAttempt>latest.get(report.id).runAttempt)latest.set(report.id,report);
  }
  if(latest.size!==expected.length)throw new Error('Required browser shard reports missing');
  const ordered=expected.map(s=>latest.get(s.id));
  for(const report of ordered) {
    assertShardEvidence({inventory:proof.testInventory,specs:expected,spec:wanted.get(report.id),evidence:report.evidence});
    if(report.ok!==true||report.exitCode!==0||report.result?.mode!=='enforce'||report.result?.ok!==true)throw new Error(`Required shard failed: ${report.id}`);
  }
  const quality=latest.get('quality')?.result;
  const counts=rows=>rows.reduce((total,r)=>{for(const [key,value] of Object.entries(r.evidence.counts))total[key]=(total[key]??0)+value;return total;},{});
  return {
    browser:{schema:'blog-browser/1',mode:'enforce',ok:true,pages:quality?.pages||[],projects:quality?.projects||[],legacy:legacyBrowserScope(changeSet,'production'),shards:ordered.filter(r=>r.suite!=='interactive'),counts:counts(ordered.filter(r=>r.suite!=='interactive')),exitCode:0},
    ...(plan.requiredChecks.includes('interactive')?{interactive:{schema:'blog-test-report/1',mode:'enforce',ok:true,suite:'interactive',shards:ordered.filter(r=>r.suite==='interactive'),counts:counts(ordered.filter(r=>r.suite==='interactive'))}}:{}),
  };
}
// Artifact downloads remain separate by name so successful shards from the
// producer attempt survive a failed-job-only rerun without file collisions.
export function readShardReports(root) {
  if(!fs.existsSync(root))throw new Error('Shard evidence directory missing');
  const reports=[];
  function visit(dir) {for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const file=path.join(dir,entry.name);
    if(entry.isSymbolicLink())throw new Error('Shard evidence symlink rejected');
    if(entry.isDirectory())visit(file);
    else if(entry.name==='shard-report.json') {
      const report=JSON.parse(fs.readFileSync(file)),raw=path.join(dir,'playwright-results.json');
      // A failed/cancelled consumer can lack a completed reporter file. Keep
      // its failure for latest-attempt selection; it can never certify a shard.
      if(report.ok===true) {
        if(!fs.existsSync(raw)||fs.lstatSync(raw).isSymbolicLink())throw new Error('Raw Playwright shard evidence missing or unsafe');
        const evidence=summarizePlaywright(JSON.parse(fs.readFileSync(raw)));
        if(objectDigest(evidence)!==objectDigest(report.evidence))throw new Error('Raw Playwright report disagrees with shard evidence');
      }
      reports.push(report);
    }
  }}
  visit(root);return reports;
}
