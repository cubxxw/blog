import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {verifyFrozenProof} from './ci-shards.mjs';

const variant=process.env.RESIDENT_TRACE_DIAGNOSTIC;
assert.ok(['current','half-pixels'].includes(variant));
const dir=path.resolve('tests/.artifacts/resident-input');
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const bundleRoot=path.join(dir,'site'),plan=read('plan.json'),changeSet=read('changes.json'),proof=read('frozen.json');
assert.equal(proof.sourceSha,process.env.DIAG_SOURCE);
assert.equal(proof.runId,process.env.DIAG_RUN);
assert.equal(spawnSync('git',['merge-base','--is-ancestor',proof.sourceSha,'HEAD']).status,0);
const metadata=await fetch(`https://api.github.com/repos/cubxxw/blog/actions/artifacts/${process.env.DIAG_ARTIFACT}`,{headers:{Authorization:`Bearer ${process.env.GH_TOKEN}`,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(30000)});
assert.equal(metadata.status,200);
const artifact=await metadata.json();assert.equal(String(artifact.workflow_run.id),proof.runId);assert.equal(artifact.workflow_run.head_sha,proof.sourceSha);assert.equal(artifact.expired,false);
verifyFrozenProof({bundleRoot,plan,changeSet,proof});
const base=new URL(read('site/page-map.json').baseUrl),out=path.resolve('tests/.artifacts/resident-pair');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'input.json'),JSON.stringify({mode:'diagnostic-only',releaseEligible:false,variant,source:proof.sourceSha,producer:proof.runId,artifact:process.env.DIAG_ARTIFACT,testSource:spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),playwright:JSON.parse(fs.readFileSync('node_modules/@playwright/test/package.json')).version,derivation:variant==='half-pixels'?'Response-only maxPixels:384e3 to192e3 in world-cafe; original and derived SHA256 logged per request. Never a releasable frozen artifact.':'Unmodified response control through the identical route handler.',limits:'unchanged original assertions and timing budgets; two fresh-browser runs per variant'},null,2));
let failed=false;
for(let repeat=1;repeat<=2;repeat++){
  const runDir=path.join(out,`run-${repeat}`);fs.mkdirSync(runDir,{recursive:true});
  const env={...Object.fromEntries(Object.entries(process.env).filter(([key])=>!/(?:^|_)proxy$/i.test(key))),NO_PROXY:'localhost,127.0.0.1,::1',SITE_OUTPUT_DIR:path.join(bundleRoot,'public'),SITE_BASE_PATH:base.pathname,SITE_CANONICAL_ORIGIN:base.origin,SITE_TEST_RESULTS:path.join(runDir,'results'),PLAYWRIGHT_JSON_OUTPUT_FILE:path.join(runDir,'playwright-results.json'),PLAYWRIGHT_HTML_OUTPUT_DIR:path.join(runDir,'html'),PLAYWRIGHT_HTML_OPEN:'never'};
  delete env.GH_TOKEN;delete env.GITHUB_TOKEN;
  try{
    const result=spawnSync(process.execPath,['node_modules/@playwright/test/cli.js','test','--config=playwright.resident-pair.config.ts','--project=desktop','--workers=1','--retries=0','--reporter=list,json,html'],{env,stdio:'inherit',timeout:12*60*1000});
    if(result.error||result.status!==0)failed=true;
  }finally{verifyFrozenProof({bundleRoot,plan,changeSet,proof});}
}
process.exitCode=failed?1:0;
