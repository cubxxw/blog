import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {verifyFrozenProof} from './ci-shards.mjs';
import {summarizePlaywright} from './ci-test-inventory.mjs';

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
  ['space-living-motion.spec.ts','sleeping breath continues at the bookshelf and wheel restores its entry pose'],
  ...['320×568','768×1024','1440×900'].map(size=>['space-reading-contracts.spec.ts',`reading focus is reversible, counts agree and the companion remains reachable at ${size}`]),
  ['space-object-living.spec.ts','actual public pages keep the same rain and music through history and Space return'],
  ['space-object-living.spec.ts','Lab notes search retains the café and native forward history'],
];
export function selectRoomRegressions(inventory){
  const legacy=inventory?.suites?.legacy;assert.ok(Array.isArray(legacy),'Legacy inventory required for room preflight');
  return cases.flatMap(([file,title])=>['desktop','mobile'].map(project=>{
    const matches=legacy.filter(id=>{const parts=JSON.parse(id);return parts[0]===file&&parts.at(-3)===title&&parts.at(-2)===project&&parts.at(-1)===0;});
    assert.equal(matches.length,1,'Missing or duplicate room preflight target: '+file+' / '+project+' / '+title);
    return matches[0];
  })).sort();
}
export function roomRegressionArgs(){
  const escape=value=>value.replace(/[.*+?^{}$()|[\]\\]/g,'\\$&');
  return ['node_modules/@playwright/test/cli.js','test',...new Set(cases.map(([file])=>'tests/e2e/'+file)),
    '--project=desktop','--project=mobile','--workers=1','--retries=0',
    '--grep',cases.map(([,title])=>escape(title)+'$').join('|'),'--reporter=list,json,html'];
}
export function verifyRoomRegressionResult(raw,expected){
  const evidence=summarizePlaywright(raw);assert.deepEqual(evidence.inventory,[...expected].sort(),'Focused room inventory mismatch');
  assert.equal(evidence.ok,true,'Focused room failures or incomplete evidence');
  assert.equal(evidence.counts.firstPass,evidence.counts.total,'Focused room preflight requires every first attempt, without skips, retries or expected failures');
  return evidence;
}
export function runRoomRegressionPreflight(){
  const dir=path.resolve('tests/.artifacts/ci'),bundleRoot=path.join(dir,'site'),read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
  // A sibling of site/ is retained by the existing success/failure artifact
  // paths, without becoming part of the frozen public/deployment bytes.
  const plan=read('plan.json'),changeSet=read('changes.json'),proof=read('frozen.json'),evidenceRoot=path.join(dir,'room-preflight');
  assert.equal(plan.runSite,true,'Room preflight requires a real frozen site');
  verifyFrozenProof({bundleRoot,plan,changeSet,proof});
  const expected=selectRoomRegressions(proof.testInventory),base=new URL(JSON.parse(fs.readFileSync(path.join(bundleRoot,'page-map.json'),'utf8')).baseUrl);
  fs.mkdirSync(evidenceRoot,{recursive:true});
  let result;
  try{
    result=spawnSync(process.execPath,roomRegressionArgs(),{stdio:'inherit',env:{
      ...Object.fromEntries(Object.entries(process.env).filter(([key])=>!/(?:^|_)proxy$/i.test(key))),
      NO_PROXY:'localhost,127.0.0.1,::1',SITE_OUTPUT_DIR:path.join(bundleRoot,'public'),SITE_BASE_PATH:base.pathname,SITE_CANONICAL_ORIGIN:base.origin,
      SITE_TEST_RESULTS:path.join(evidenceRoot,'results'),PLAYWRIGHT_HTML_OUTPUT_DIR:path.join(evidenceRoot,'html'),PLAYWRIGHT_HTML_OPEN:'never',
      PLAYWRIGHT_JSON_OUTPUT_FILE:path.join(evidenceRoot,'playwright-results.json'),
    }});
  }finally{verifyFrozenProof({bundleRoot,plan,changeSet,proof});}
  if(result.error)throw result.error;
  const raw=JSON.parse(fs.readFileSync(path.join(evidenceRoot,'playwright-results.json'),'utf8')),evidence=summarizePlaywright(raw);
  let ok=false,validationError=null;
  if(result.status===0){try{verifyRoomRegressionResult(raw,expected);ok=true;}catch(error){validationError=error.message;}}
  fs.writeFileSync(path.join(evidenceRoot,'summary.json'),JSON.stringify({mode:'focused-diagnostic',ok,sourceSha:proof.sourceSha,runId:proof.runId,runAttempt:proof.runAttempt,exitCode:result.status,validationError,expected,evidence},null,2));
  console.log(JSON.stringify({stage:'focused-room-preflight',ok,sourceSha:proof.sourceSha,counts:evidence.counts,validationError}));
  return ok?0:result.status||1;
}
if(import.meta.url===pathToFileURL(path.resolve(process.argv[1]||'')).href){
  try{process.exitCode=runRoomRegressionPreflight();}catch(error){console.error(error);process.exitCode=1;}
}
