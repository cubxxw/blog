#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolveChangeSet, publicationInputDigest } from './lib/ci-changes.mjs';
import { requiredChecksFor, releaseMode } from './lib/ci-contracts.mjs';
import {browserShardPlan,createFrozenProof,verifyFrozenProof,createShardReport,aggregateShardReports,readShardReports} from './ci-shards.mjs';
import {collectTestInventory,summarizePlaywright} from './ci-test-inventory.mjs';
import {readPreflightReceipt,collectDoorSourceInventory} from './ci-preflight-receipt.mjs';

export function compileExecutionPlan({changeSet,mode}) {
  const state=releaseMode(mode),requiredChecks=requiredChecksFor(changeSet);
  return {requiredChecks,runSite:requiredChecks.includes('output')||requiredChecks.includes('browser'),production:changeSet.publish&&state==='active'};
}
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
function run(command,args,options={}) {const r=spawnSync(command,args,{stdio:'inherit',...options});if(r.error||r.status!==0)throw new Error(`${command} ${args[0]} failed (${r.status??r.error?.code})`);}
const tests={
  workflow:['scripts/room-dom-observation.test.mjs','scripts/room-pointer-status.test.mjs','scripts/ci-changes.test.mjs','scripts/ci-workflows.test.mjs','scripts/ci-shards.test.mjs','scripts/ci-test-inventory.test.mjs','scripts/ci-room-preflight.test.mjs','scripts/room-resident-stages.test.mjs','scripts/room-browser-frame-observation.test.mjs','scripts/ci-preflight-receipt.test.mjs','scripts/ci-run-stages.test.mjs','scripts/site-release.test.mjs','scripts/site-artifact.test.mjs','scripts/site-build.test.mjs','scripts/site-verify.test.mjs','scripts/live-site-probes.test.mjs','scripts/tag-workflow.test.mjs','scripts/backup-site.test.mjs','scripts/netlify-build-control.test.mjs','scripts/frozen-routing.test.mjs'],
  functions:['scripts/home-chat-utils.test.mjs','scripts/article-ai.test.mjs','scripts/article-ai-client.test.mjs','scripts/share-conversation.test.mjs','scripts/reading-reply.test.mjs','scripts/buttondown-tags.test.mjs','scripts/newsletter-state.test.mjs','scripts/generate-content-index.test.mjs','scripts/release-followups.test.mjs','scripts/search-delivery.test.mjs','scripts/audit-public-site.test.mjs'],
  seo:['scripts/psi-fetch.test.mjs','scripts/psi-stage-contract.test.mjs','scripts/seo-report.test.mjs','scripts/seo-pipeline.test.mjs','scripts/seo-autofix-gate.test.mjs','scripts/daily-report-issue.test.mjs','scripts/lighthouse-report-to-issue.test.mjs','scripts/gsc-fetch.test.mjs','scripts/gsc-inspect.test.mjs','scripts/gsc-report.test.mjs','scripts/social-card-contracts.test.mjs','scripts/social-identity.test.mjs'],
};
async function main() {
  const args=process.argv.slice(2),stage=args.shift();
  const get=flag=>{const i=args.indexOf(flag);return i<0?undefined:args[i+1];};
  const root=process.cwd(),dir=path.resolve(get('--run-dir')??'tests/.artifacts/ci');
  if(stage==='plan') {
    const sourceSha=get('--sha')??process.env.GITHUB_SHA;
    const changes=await resolveChangeSet({repoRoot:root,eventPath:process.env.GITHUB_EVENT_PATH,headSha:sourceSha,eventName:process.env.GITHUB_EVENT_NAME,ref:process.env.GITHUB_REF});
    const plan=compileExecutionPlan({changeSet:changes,mode:process.env.BLOG_RELEASE_MODE});
    const clock=new Date().toISOString();
    write(path.join(dir,'changes.json'),changes);write(path.join(dir,'plan.json'),{...plan,clock,sourceSha,inputDigest:publicationInputDigest({repoRoot:root,sha:sourceSha})});
    const shards=browserShardPlan({plan,changeSet:changes});
    if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`run_site=${plan.runSite}\npublish=${changes.publish}\nsource_sha=${sourceSha}\nbrowser_engines=${plan.runSite?'chromium':''}\nbrowser_matrix=${JSON.stringify({include:shards.length?shards:[{id:'none',suite:'none',workers:1}]})}\n`);
    console.log(JSON.stringify({...plan,reason:changes.reason}));return;
  }
  if(!['verify','prepare','browser-shard','finalize'].includes(stage))throw new Error('Usage: ci-run.mjs plan|prepare|browser-shard|finalize|verify');
  const plan=JSON.parse(fs.readFileSync(path.join(dir,'plan.json'))),changes=JSON.parse(fs.readFileSync(path.join(dir,'changes.json')));
  const expected=compileExecutionPlan({changeSet:changes,mode:process.env.BLOG_RELEASE_MODE});
  if(JSON.stringify(expected.requiredChecks)!==JSON.stringify(plan.requiredChecks)||plan.sourceSha!==changes.sourceSha||expected.runSite!==plan.runSite||expected.production!==plan.production)throw new Error('Execution plan identity mismatch');
  const bundle=path.join(dir,'site');
  if(stage==='browser-shard') {
    const spec=browserShardPlan({plan,changeSet:changes}).find(s=>s.id===get('--shard-id'));
    if(!spec)throw new Error('Unknown or unexpected browser shard');
    const proof=JSON.parse(fs.readFileSync(path.join(dir,'frozen.json')));
    verifyFrozenProof({bundleRoot:bundle,plan,changeSet:changes,proof});
    const reportDir=path.join(dir,'shard',spec.id);fs.mkdirSync(reportDir,{recursive:true});
    const jsonReportPath=path.join(reportDir,'playwright-results.json');
    let exitCode=1,result={mode:'enforce',ok:false};
    try {
      if(spec.suite==='interactive') {
        run('npm',['run','interactive:test','--',`--project=${spec.project}`,'--workers=1','--reporter=list,html,json'],{env:{...process.env,SITE_OUTPUT_DIR:path.join(bundle,'public'),PLAYWRIGHT_JSON_OUTPUT_FILE:jsonReportPath}});
        result={schema:'blog-test-report/1',mode:'enforce',ok:true,suite:'interactive',project:spec.project};
      } else {
        const {verifySite}=await import('./site-verify.mjs');
        const browser=await verifySite({publicDir:path.join(bundle,'public'),pageMapPath:path.join(bundle,'page-map.json'),changeSetPath:path.join(dir,'changes.json'),reportDir,suite:spec.suite,shard:spec.shard,jsonReportPath});
        result=JSON.parse(fs.readFileSync(browser.reportPath));
      }
      verifyFrozenProof({bundleRoot:bundle,plan,changeSet:changes,proof});
      exitCode=result.ok?0:1;
    } finally {
      let evidence;
      try {evidence=summarizePlaywright(JSON.parse(fs.readFileSync(jsonReportPath)));}
      catch(error){evidence={ok:false,error:error.message};}
      write(path.join(reportDir,'shard-report.json'),createShardReport({spec,proof,runAttempt:process.env.GITHUB_RUN_ATTEMPT||proof.runAttempt,exitCode,result,evidence}));
    }
    if(exitCode!==0)throw new Error(`Browser shard failed: ${spec.id}`);
    return;
  }
  const reports={};
  if(stage==='finalize') {
    for(const name of plan.requiredChecks.filter(n=>!['browser','interactive','output'].includes(n))) {
      reports[name]=JSON.parse(fs.readFileSync(path.join(dir,`${name}-report.json`)));
      if(reports[name].mode!=='enforce'||reports[name].ok!==true)throw new Error(`Required ${name} report missing or non-enforcing`);
    }
    if(!plan.runSite){console.log('Required offline checks passed; no site build or deployment');return;}
    const proof=JSON.parse(fs.readFileSync(path.join(dir,'frozen.json')));
    verifyFrozenProof({bundleRoot:bundle,plan,changeSet:changes,proof});
    readPreflightReceipt(get('--preflight-reports')||path.join(dir,'preflight-download'),{proof,producerArtifactId:process.env.BLOG_PRODUCER_ARTIFACT_ID,roomRegressions:process.env.BLOG_ROOM_REGRESSIONS==='true'});
    Object.assign(reports,aggregateShardReports({plan,changeSet:changes,proof,reports:readShardReports(get('--shard-reports')||path.join(dir,'shard-downloads'))}));
    reports.output=JSON.parse(fs.readFileSync(path.join(bundle,'output-report.json')));
    await packageVerifiedBundle({plan,reports,bundle,dir,releaseId:`${proof.runId}-${proof.runAttempt}`});
    return;
  }
  if(plan.requiredChecks.includes('source')) {
    run(process.execPath,['scripts/check-content-quality.mjs','source','--change-set',path.join(dir,'changes.json'),'--out',path.join(dir,'source-report.json')]);
    reports.source=JSON.parse(fs.readFileSync(path.join(dir,'source-report.json')));
    run(process.execPath,['--test','scripts/content-source.test.mjs','scripts/content-quality-report.test.mjs','scripts/content-output.test.mjs']);
  }
  for(const suite of ['workflow','functions','seo'])if(plan.requiredChecks.includes(suite)) {
    if(suite==='workflow')run('actionlint',['-shellcheck=']);
    run(process.execPath,['--test',...tests[suite]]);reports[suite]={schema:'blog-test-report/1',mode:'enforce',ok:true,suite};write(path.join(dir,`${suite}-report.json`),reports[suite]);
  }
  if(!plan.runSite){console.log('Required offline checks passed; no site build or deployment');return;}
  const {buildSite}=await import('./site-build.mjs');
  const built=await buildSite({repoRoot:root,sourceSha:plan.sourceSha,clock:plan.clock,target:'production',outDir:bundle});
  run(process.execPath,['--test','scripts/performance-seo.test.mjs'],{env:{...process.env,SITE_OUTPUT_DIR:built.publicDir}});
  const artifact=await import('./lib/site-artifact.mjs');
  const releaseId=`${process.env.GITHUB_RUN_ID??'local'}-${process.env.GITHUB_RUN_ATTEMPT??'1'}`;
  artifact.writeReleaseMarker({bundleRoot:bundle,sourceSha:plan.sourceSha,releaseId,clock:plan.clock});
  const frozen=artifact.snapshotDeployment(bundle);
  if(stage==='prepare') {
    if(plan.requiredChecks.includes('interactive'))run('npm',['run','interactive:check']);
    if(JSON.stringify(frozen)!==JSON.stringify(artifact.snapshotDeployment(bundle)))throw new Error('Deployment files changed during preparation');
    const {selectBrowserPages}=await import('./site-verify.mjs');
    const pageMap=JSON.parse(fs.readFileSync(built.pageMapPath)),pageList=path.join(dir,'inventory-pages.json');
    write(pageList,selectBrowserPages({changeSet:changes,pageMap}));
    const inventoryEnv={
      ...Object.fromEntries(Object.entries(process.env).filter(([key])=>!/(?:^|_)proxy$/i.test(key))),
      CI:'true',NO_PROXY:'localhost,127.0.0.1,::1',SITE_OUTPUT_DIR:built.publicDir,SITE_PAGE_LIST:pageList,
      SITE_BASE_PATH:new URL(pageMap.baseUrl).pathname,SITE_CANONICAL_ORIGIN:new URL(pageMap.baseUrl).origin,
    };
    const testInventory=collectTestInventory({specs:browserShardPlan({plan,changeSet:changes}),env:inventoryEnv});
    // Article-only builds have quality coverage without a legacy partition.
    // Freeze the always-required door source independently in every site build.
    testInventory.preflight={door:collectDoorSourceInventory(inventoryEnv)};
    if(JSON.stringify(frozen)!==JSON.stringify(artifact.snapshotDeployment(bundle)))throw new Error('Deployment files changed during inventory collection');
    write(path.join(dir,'frozen.json'),createFrozenProof({bundleRoot:bundle,plan,changeSet:changes,runId:process.env.GITHUB_RUN_ID||'0',runAttempt:Number(process.env.GITHUB_RUN_ATTEMPT||1),testInventory}));
    console.log(`Prepared one frozen deployment for ${plan.sourceSha}; browser checks remain required`);
    return;
  }
  const {verifySite}=await import('./site-verify.mjs');
  const browser=await verifySite({publicDir:built.publicDir,pageMapPath:built.pageMapPath,changeSetPath:path.join(dir,'changes.json'),reportDir:path.join(dir,'browser')});
  if(!browser.ok)throw new Error('Browser checks failed');
  reports.browser=JSON.parse(fs.readFileSync(browser.reportPath));
  if(plan.requiredChecks.includes('interactive')) {
    run('npm',['run','interactive:check']);
    run('npm',['run','interactive:test'],{env:{...process.env,SITE_OUTPUT_DIR:built.publicDir}});
    reports.interactive={schema:'blog-test-report/1',mode:'enforce',ok:true,suite:'interactive'};
  }
  if(JSON.stringify(frozen)!==JSON.stringify(artifact.snapshotDeployment(bundle)))throw new Error('Deployment files changed during tests');
  reports.output=JSON.parse(fs.readFileSync(path.join(bundle,'output-report.json')));
  await packageVerifiedBundle({plan,reports,bundle,dir,releaseId});
}
async function packageVerifiedBundle({plan,reports,bundle,dir,releaseId}) {
  const artifact=await import('./lib/site-artifact.mjs');
  const pageMap=JSON.parse(fs.readFileSync(path.join(bundle,'page-map.json')));
  const checks=[];
  for(const name of plan.requiredChecks) {
    const report=reports[name];if(!report||report.mode!=='enforce'||!report.ok)throw new Error(`Required ${name} report missing or non-enforcing`);
    write(path.join(bundle,`${name}-report.json`),report);checks.push({name,status:'success',reportDigest:digest(report)});
  }
  const manifest=artifact.createManifest({bundleRoot:bundle,sourceSha:plan.sourceSha,inputDigest:plan.inputDigest,releaseId,target:'production',clock:plan.clock,toolchain:JSON.parse(fs.readFileSync('config/ci-toolchain.json')),pageMap,requiredChecks:plan.requiredChecks,checks});
  write(path.join(bundle,'manifest.json'),manifest);
  artifact.packageArtifact({bundleRoot:bundle,manifest,outFile:path.join(dir,'site.tar.gz'),requiredChecks:plan.requiredChecks});
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`manifest_digest=${digest(manifest)}\n`);
  console.log(`Verified ${manifest.files.length} deployment files for ${plan.sourceSha}`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
