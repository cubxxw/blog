import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyFrozenProof} from './ci-shards.mjs';
import {objectDigest} from './lib/site-artifact.mjs';
import {selectRoomRegressions,verifyRoomRegressionResult} from './ci-room-preflight.mjs';
import {enumerateTestIds} from './ci-test-inventory.mjs';

const doorListingArgs=repeat=>['node_modules/@playwright/test/cli.js','test','tests/e2e/space-door-excursion.spec.ts','--project=desktop','--workers=1','--retries=0',`--repeat-each=${repeat}`,'--grep=1440px / no-preference.*the real rear door, deliberate step, splash and safe return form one repeatable journey','--list','--reporter=json'];
export function collectDoorSourceInventory(env,exec=spawnSync){
 const actualEnv={...env};delete actualEnv.PLAYWRIGHT_JSON_OUTPUT_FILE;
 const listed=exec(process.execPath,doorListingArgs(1),{encoding:'utf8',env:actualEnv,maxBuffer:8*1024*1024});
 assert.equal(listed.status,0,'Door source inventory listing failed');
 const door=enumerateTestIds(JSON.parse(listed.stdout));
 doorPreflightInventory({testInventory:{preflight:{door}}});
 return door;
}

function binding({proof,producerArtifactId,sourceSha,runId,roomRegressions}){
 assert.match(producerArtifactId||'',/^[1-9]\d*$/);assert.match(sourceSha||'',/^[0-9a-f]{40}$/);assert.match(String(runId),/^[1-9]\d*$/);
 assert.equal(proof.sourceSha,sourceSha,'Preflight source mismatch');assert.equal(proof.runId,String(runId),'Preflight run mismatch');assert.equal(typeof roomRegressions,'boolean');
 return {sourceSha,runId:String(runId),producerArtifactId,producerAttempt:proof.runAttempt,frozenDigest:objectDigest(proof),roomRegressions};
}
export function doorPreflightInventory(proof){
 const source=proof.testInventory?.preflight?.door;
 assert.ok(Array.isArray(source)&&source.length===1,'Independent mandatory door inventory required');
 const found=source.filter(id=>{const parts=JSON.parse(id);return parts[0]==='space-door-excursion.spec.ts'&&parts.at(-3)==='the real rear door, deliberate step, splash and safe return form one repeatable journey'&&parts.includes('1440px / no-preference')&&parts.at(-2)==='desktop'&&parts.at(-1)===0;});
 assert.equal(found?.length,1,'Exactly one original mandatory door path required');const parts=JSON.parse(found[0]);
 if(proof.testInventory.suites?.legacy)assert.equal(proof.testInventory.suites.legacy.filter(id=>id===found[0]).length,1,'Full legacy inventory must retain the mandatory door');
 return [0,1,2].map(repeat=>JSON.stringify([...parts.slice(0,-1),repeat])).sort();
}
function doorEntries(raw,proof){
 assert.deepEqual(raw?.errors,[],'Door reporter global errors');const base=JSON.parse(doorPreflightInventory(proof)[0]);base[base.length-1]=0;const wanted=JSON.stringify(base),entries=[];
 const visit=(suites,parents=[])=>{for(const suite of suites??[]){
  for(const spec of suite.specs??[]){
   assert.equal(spec.tests?.length,1,'Door repeat must contain one desktop project');const test=spec.tests[0];
   assert.equal(JSON.stringify([spec.file,spec.line,spec.column,...parents,suite.title??'',spec.title,test.projectName,0]),wanted,'Door repeat source identity mismatch');
   assert.ok(typeof spec.id==='string'&&spec.id,'Single-project listed repeat identity required');entries.push({id:spec.id,test});
  }
  visit(suite.suites,[...parents,suite.title??'']);
 }};visit(raw.suites);assert.equal(entries.length,3,'Exactly three door repeats required');assert.equal(new Set(entries.map(e=>e.id)).size,3,'Duplicate door repeat identity');return entries;
}
export function validateDoorListing(list,proof){return doorEntries(list,proof).map(entry=>entry.id);}
function doorEvidence(raw,list,proof){
 const expected=validateDoorListing(list,proof),normalized=structuredClone(raw),entries=doorEntries(normalized,proof);
 assert.deepEqual(entries.map(e=>e.id).sort(),[...expected].sort(),'Actual door repeat identities differ from the same-run listing');
 // JSON reporters can omit repeatEachIndex. Use the three unique IDs listed
 // before input, only for this single-project repeated path; keep raw intact.
 for(const entry of entries)entry.test.repeatEachIndex=expected.indexOf(entry.id);
 return verifyRoomRegressionResult(normalized,doorPreflightInventory(proof));
}
export function createPreflightReceipt(args){
 const identity=binding(args),door=doorEvidence(args.rawDoor,args.doorList,args.proof);
 const room=args.roomRegressions?verifyRoomRegressionResult(args.rawRoom,selectRoomRegressions(args.proof.testInventory)):null;
 return {schema:'blog-preflight/1',mode:'enforce',ok:true,...identity,doorListDigest:objectDigest(args.doorList),door,room};
}
export function verifyPreflightReceipt(args){
 const actual=createPreflightReceipt(args);assert.equal(objectDigest(args.receipt),objectDigest(actual),'Preflight receipt, raw results or producer identity mismatch');return actual;
}
export function readPreflightReceipt(root,{proof,producerArtifactId,roomRegressions}){
 const read=name=>{const file=path.join(root,name);assert.ok(!fs.lstatSync(file).isSymbolicLink(),'Preflight evidence symlink rejected');return JSON.parse(fs.readFileSync(file,'utf8'));};
 return verifyPreflightReceipt({proof,producerArtifactId,sourceSha:proof.sourceSha,runId:proof.runId,roomRegressions,
  receipt:read('ci/preflight-report.json'),doorList:read('ci/preflight-door-list.json'),rawDoor:read('door-preflight/playwright-results.json'),...(roomRegressions?{rawRoom:read('ci/room-preflight/playwright-results.json')}:{})});
}
function main(){
 const phase=process.argv[2];assert.ok(['start','finish'].includes(phase));
 const dir=path.resolve('tests/.artifacts/ci'),read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
 const proof=read('frozen.json'),plan=read('plan.json'),changeSet=read('changes.json'),bundleRoot=path.join(dir,'site');
 verifyFrozenProof({bundleRoot,plan,changeSet,proof});
 const args={proof,sourceSha:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,producerArtifactId:process.env.BLOG_PRODUCER_ARTIFACT_ID,roomRegressions:process.env.BLOG_ROOM_REGRESSIONS==='true'};
 assert.ok(['true','false'].includes(process.env.BLOG_ROOM_REGRESSIONS),'Explicit optional-room scope required');const identity=binding(args);
 if(phase==='start'){
  const env={...process.env};delete env.PLAYWRIGHT_JSON_OUTPUT_FILE;
  const listed=spawnSync(process.execPath,doorListingArgs(3),{encoding:'utf8',env,maxBuffer:8*1024*1024});
  assert.equal(listed.status,0,'Door repeat listing failed');const list=JSON.parse(listed.stdout);validateDoorListing(list,proof);
  fs.writeFileSync(path.join(dir,'preflight-door-list.json'),listed.stdout,{flag:'wx'});
  fs.writeFileSync(path.join(dir,'preflight-input.json'),JSON.stringify({...identity,doorListDigest:objectDigest(list)},null,2),{flag:'wx'});return;
 }
 const doorList=read('preflight-door-list.json');assert.deepEqual(read('preflight-input.json'),{...identity,doorListDigest:objectDigest(doorList)},'Preflight input changed during execution');
 const rawDoor=JSON.parse(fs.readFileSync(path.resolve('tests/.artifacts/door-preflight/playwright-results.json'),'utf8'));
 const receipt=createPreflightReceipt({...args,rawDoor,doorList,...(args.roomRegressions?{rawRoom:read('room-preflight/playwright-results.json')}:{})});
 fs.writeFileSync(path.join(dir,'preflight-report.json'),JSON.stringify(receipt,null,2),{flag:'wx'});
 console.log(JSON.stringify({stage:'frozen-preflight',sourceSha:receipt.sourceSha,producerArtifactId:receipt.producerArtifactId,door:receipt.door.counts,room:receipt.room?.counts??'not-requested',ok:true}));
}
if(import.meta.url===pathToFileURL(path.resolve(process.argv[1]||'')).href){try{main();}catch(error){console.error(error);process.exitCode=1;}}
