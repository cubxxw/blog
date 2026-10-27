// Bounded, explicitly untrusted diagnostic output: no manifest or release input.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {chromium} from '@playwright/test';
import {verifyFrozenProof} from './ci-shards.mjs';
import {summarizePlaywright} from './ci-test-inventory.mjs';
import {verifyRoomRegressionResult} from './ci-room-preflight.mjs';

const variant=process.env.ROOM_DIAG_VARIANT,source=process.env.ROOM_DIAG_SOURCE,run=process.env.ROOM_DIAG_RUN,artifact=process.env.ROOM_DIAG_ARTIFACT;
assert.ok(['control-main-full','candidate-full','candidate-dom-trace'].includes(variant));
assert.match(source||'',/^[0-9a-f]{40}$/);assert.match(run||'',/^\d+$/);assert.match(artifact||'',/^\d+$/);
const out=path.resolve('tests/.artifacts/room-diagnostic');fs.mkdirSync(out,{recursive:true});
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const roots=['tests/.artifacts/room-diagnostic-input','tests/.artifacts/room-diagnostic-input/ci'].filter(root=>fs.existsSync(path.join(root,'frozen.json')));
assert.equal(roots.length,1,'Exactly one frozen producer required');
const dir=path.resolve(roots[0]),bundleRoot=path.join(dir,'site'),plan=read(path.join(dir,'plan.json')),changeSet=read(path.join(dir,'changes.json')),proof=read(path.join(dir,'frozen.json'));
assert.equal(proof.sourceSha,source);assert.equal(proof.runId,run);
const headers={Authorization:`Bearer ${process.env.GH_TOKEN}`,Accept:'application/vnd.github+json'};
const response=await fetch(`https://api.github.com/repos/cubxxw/blog/actions/artifacts/${artifact}`,{headers,signal:AbortSignal.timeout(30000)});
assert.equal(response.status,200,'Artifact metadata read failed');const metadata=await response.json();
assert.equal(String(metadata.workflow_run?.id),run);assert.equal(metadata.workflow_run?.head_sha,source);assert.equal(metadata.expired,false);
assert.equal(spawnSync('git',['merge-base','--is-ancestor',source,'HEAD']).status,0,'Diagnostic test source must contain the frozen source');
verifyFrozenProof({bundleRoot,plan,changeSet,proof});
const base=new URL(read(path.join(bundleRoot,'page-map.json')).baseUrl);
const env={...Object.fromEntries(Object.entries(process.env).filter(([key])=>!/(?:^|_)proxy$/i.test(key))),NO_PROXY:'localhost,127.0.0.1,::1',SITE_OUTPUT_DIR:path.join(bundleRoot,'public'),SITE_BASE_PATH:base.pathname,SITE_CANONICAL_ORIGIN:base.origin,PLAYWRIGHT_HTML_OPEN:'never'};
// Do not expose the job token to the browser/server/test children.
delete env.GH_TOKEN;delete env.GITHUB_TOKEN;
const cli=['node_modules/@playwright/test/cli.js','test','--config=playwright.room-diagnostic.config.ts'];
const listing=spawnSync(process.execPath,[...cli,'--list','--reporter=json'],{encoding:'utf8',env,maxBuffer:8*1024*1024});
assert.equal(listing.status,0,'Diagnostic list failed');const expected=summarizePlaywright(JSON.parse(listing.stdout)).inventory;assert.equal(expected.length,5,'Exactly five original desktop paths required');
fs.writeFileSync(path.join(out,'listing.json'),listing.stdout);
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const testSha=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),browser=spawnSync(chromium.executablePath(),['--version'],{encoding:'utf8'});
assert.match(testSha,/^[0-9a-f]{40}$/);assert.equal(browser.status,0,'Pinned browser version unavailable');
const toolchain={testSha,node:process.version,playwright:read('node_modules/@playwright/test/package.json').version,browser:browser.stdout.trim(),lockfileSha256:hash('package-lock.json'),configSha256:hash('playwright.room-diagnostic.config.ts')};
fs.writeFileSync(path.join(out,'input.json'),JSON.stringify({mode:'diagnostic-only',releaseEligible:false,variant,source,run,artifact,proof,expected,toolchain,traceScreenshots:variant!=='candidate-dom-trace',limits:'same tests and original gates; distinct source and instrumentation are never pooled; no causal claim from one sample'},null,2));
let result;
try{result=spawnSync(process.execPath,cli,{env,stdio:'inherit',timeout:20*60*1000});}
finally{verifyFrozenProof({bundleRoot,plan,changeSet,proof});}
const raw=path.join(out,'playwright-results.json');let evidence=null,validationError=null;
try{
 assert.ok(fs.existsSync(raw),'Completed raw diagnostic result required');
 const report=read(raw);evidence=summarizePlaywright(report);
 // Reuse the existing strict inventory/global-error/first-only validator.
 verifyRoomRegressionResult(report,expected);
 assert.equal(result.status,0,'Diagnostic process failed or was interrupted');
}catch(error){validationError=error.message;}
const ok=validationError===null;
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({mode:'diagnostic-only',releaseEligible:false,variant,source,run,artifact,toolchain,exitCode:result.status,signal:result.signal,spawnError:result.error?.code,ok,validationError,evidence},null,2));
process.exitCode=ok?0:result.status||1;
