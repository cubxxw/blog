import test from 'node:test';
import assert from 'node:assert/strict';
import {enumerateTestIds} from './ci-test-inventory.mjs';
const api=await import('./ci-preflight-receipt.mjs').catch(()=>({}));
function fixture(){
 const title='the real rear door, deliberate step, splash and safe return form one repeatable journey';
 const raw=repeat=>({errors:[],suites:[{title:'space-door-excursion.spec.ts',suites:[{title:'1440px / no-preference',specs:Array.from({length:repeat},(_,i)=>({id:'listed-repeat-'+i,file:'space-door-excursion.spec.ts',line:145,column:9,title,tests:[{projectName:'desktop',status:'expected',expectedStatus:'passed',results:[{status:'passed',retry:0}]}]}))}]}]});
 const door=enumerateTestIds(raw(1));
 const proof={sourceSha:'a'.repeat(40),runId:'123',runAttempt:1,testInventory:{suites:{legacy:door},preflight:{door}}};
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
test('article-only inventory certifies the mandatory door without adding legacy partitions',()=>{
 const args=fixture();args.proof.testInventory.suites={quality:['quality-only']};
 const receipt=api.createPreflightReceipt(args);
 assert.equal(receipt.door.counts.firstPass,3);assert.equal(receipt.room,null);
 assert.doesNotThrow(()=>api.verifyPreflightReceipt({...args,receipt}));
 for(const door of [undefined,[],['wrong identity'],[...args.proof.testInventory.preflight.door,...args.proof.testInventory.preflight.door]]){
  const proof=structuredClone(args.proof);proof.testInventory.preflight.door=door;
  assert.throws(()=>api.createPreflightReceipt({...args,proof}));
 }
 const proof=structuredClone(args.proof);delete proof.testInventory.preflight;
 assert.throws(()=>api.createPreflightReceipt({...args,proof}));
});
test('prepare independently lists the original single desktop door before input',()=>{
 const args=fixture(),calls=[];
 assert.equal(typeof api.collectDoorSourceInventory,'function');
 const door=api.collectDoorSourceInventory({},(_exe,argv,options)=>{
  calls.push(argv);assert.equal(options.env.PLAYWRIGHT_JSON_OUTPUT_FILE,undefined);
  const raw=structuredClone(args.doorList);raw.suites[0].suites[0].specs.length=1;
  return {status:0,stdout:JSON.stringify(raw)};
 });
 assert.deepEqual(door,args.proof.testInventory.preflight.door);
 assert.ok(calls[0].includes('--repeat-each=1'));assert.ok(calls[0].includes('--project=desktop'));
 assert.ok(calls[0].includes('--list'));assert.ok(calls[0].includes('--retries=0'));
 assert.throws(()=>api.collectDoorSourceInventory({},()=>({status:1,stdout:''})));
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
