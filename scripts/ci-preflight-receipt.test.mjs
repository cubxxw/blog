import test from 'node:test';
import assert from 'node:assert/strict';
import {enumerateTestIds} from './ci-test-inventory.mjs';
const api=await import('./ci-preflight-receipt.mjs').catch(()=>({}));
function fixture(){
 const title='the real rear door, deliberate step, splash and safe return form one repeatable journey';
 const raw=repeat=>({errors:[],suites:[{title:'space-door-excursion.spec.ts',suites:[{title:'1440px / no-preference',specs:Array.from({length:repeat},(_,i)=>({id:'listed-repeat-'+i,file:'space-door-excursion.spec.ts',line:145,column:9,title,tests:[{projectName:'desktop',status:'expected',expectedStatus:'passed',results:[{status:'passed',retry:0}]}]}))}]}]});
 const proof={sourceSha:'a'.repeat(40),runId:'123',runAttempt:1,testInventory:{suites:{legacy:enumerateTestIds(raw(1))}}};
 return {proof,producerArtifactId:'789',sourceSha:proof.sourceSha,runId:proof.runId,roomRegressions:false,rawDoor:raw(3),doorList:raw(3)};
}
test('a same-producer preflight survives a consumer rerun but never a new producer',()=>{
 assert.equal(typeof api.createPreflightReceipt,'function');const args=fixture(),receipt=api.createPreflightReceipt(args);
 assert.equal(receipt.door.counts.firstPass,3);assert.equal(receipt.room,null);
 assert.doesNotThrow(()=>api.verifyPreflightReceipt({...args,receipt}));
 for(const changed of [{producerArtifactId:'790'},{proof:{...args.proof,runAttempt:2}},{sourceSha:'b'.repeat(40)},{runId:'124'}])assert.throws(()=>api.verifyPreflightReceipt({...args,...changed,receipt}));
 assert.throws(()=>api.verifyPreflightReceipt({...args,receipt:{...receipt,ok:false}}));
 assert.throws(()=>api.verifyPreflightReceipt({...args,receipt:undefined}));
});
test('mandatory door evidence is raw, exactly three first attempts even with optional rooms disabled',()=>{
 const args=fixture();
 for(const change of [raw=>raw.errors.push({message:'global failure'}),raw=>raw.suites[0].suites[0].specs.pop(),raw=>raw.suites[0].suites[0].specs[0].title='wrong path',raw=>Object.assign(raw.suites[0].suites[0].specs[0].tests[0],{status:'skipped',expectedStatus:'skipped',results:[{status:'skipped'}]})]){
  const broken=structuredClone(args);change(broken.rawDoor);assert.throws(()=>api.createPreflightReceipt(broken));
 }
 const wrongId=structuredClone(args);wrongId.rawDoor.suites[0].suites[0].specs[0].id='unlisted-repeat';assert.throws(()=>api.createPreflightReceipt(wrongId));
 const duplicate=structuredClone(args);duplicate.rawDoor.suites[0].suites[0].specs[1].id=duplicate.rawDoor.suites[0].suites[0].specs[0].id;assert.throws(()=>api.createPreflightReceipt(duplicate));
 assert.throws(()=>api.createPreflightReceipt({...args,roomRegressions:true}));
});
