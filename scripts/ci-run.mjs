#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolveChangeSet, publicationInputDigest } from './lib/ci-changes.mjs';
import { requiredChecksFor, releaseMode } from './lib/ci-contracts.mjs';

export function compileExecutionPlan({changeSet,mode}) {
  const state=releaseMode(mode),requiredChecks=requiredChecksFor(changeSet);
  return {requiredChecks,runSite:requiredChecks.includes('output')||requiredChecks.includes('browser'),production:changeSet.publish&&state==='active'};
}
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
function run(command,args,options={}) {const r=spawnSync(command,args,{stdio:'inherit',...options});if(r.error||r.status!==0)throw new Error(`${command} ${args[0]} failed (${r.status??r.error?.code})`);}
const tests={
  workflow:['scripts/ci-changes.test.mjs','scripts/ci-workflows.test.mjs','scripts/site-release.test.mjs','scripts/site-artifact.test.mjs','scripts/site-build.test.mjs','scripts/site-verify.test.mjs','scripts/live-site-probes.test.mjs','scripts/tag-workflow.test.mjs','scripts/backup-site.test.mjs','scripts/netlify-build-control.test.mjs'],
  functions:['scripts/home-chat-utils.test.mjs','scripts/buttondown-tags.test.mjs','scripts/newsletter-state.test.mjs','scripts/generate-content-index.test.mjs','scripts/release-followups.test.mjs','scripts/search-delivery.test.mjs','scripts/audit-public-site.test.mjs'],
  seo:['scripts/psi-fetch.test.mjs','scripts/seo-report.test.mjs','scripts/seo-pipeline.test.mjs','scripts/seo-autofix-gate.test.mjs','scripts/daily-report-issue.test.mjs','scripts/lighthouse-report-to-issue.test.mjs','scripts/gsc-fetch.test.mjs','scripts/gsc-report.test.mjs'],
};
async function main() {
  const args=process.argv.slice(2),stage=args.shift();
  const get=flag=>{const i=args.indexOf(flag);return i<0?undefined:args[i+1];};
  const root=process.cwd(),dir=path.resolve(get('--run-dir')??'tests/.artifacts/ci');
  if(stage==='plan') {
    const sourceSha=get('--sha')??process.env.GITHUB_SHA;
    const changes=await resolveChangeSet({repoRoot:root,eventPath:process.env.GITHUB_EVENT_PATH,headSha:sourceSha});
    const plan=compileExecutionPlan({changeSet:changes,mode:process.env.BLOG_RELEASE_MODE});
    const clock=new Date().toISOString();
    write(path.join(dir,'changes.json'),changes);write(path.join(dir,'plan.json'),{...plan,clock,sourceSha,inputDigest:publicationInputDigest({repoRoot:root,sha:sourceSha})});
    if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`run_site=${plan.runSite}\npublish=${changes.publish}\nsource_sha=${sourceSha}\nbrowser_engines=${plan.requiredChecks.includes('interactive')?'chromium firefox webkit':plan.runSite?'chromium':''}\n`);
    console.log(JSON.stringify({...plan,reason:changes.reason}));return;
  }
  if(stage!=='verify')throw new Error('Usage: ci-run.mjs plan|verify');
  const plan=JSON.parse(fs.readFileSync(path.join(dir,'plan.json'))),changes=JSON.parse(fs.readFileSync(path.join(dir,'changes.json')));
  const expected=compileExecutionPlan({changeSet:changes,mode:process.env.BLOG_RELEASE_MODE});
  if(JSON.stringify(expected.requiredChecks)!==JSON.stringify(plan.requiredChecks)||plan.sourceSha!==changes.sourceSha)throw new Error('Execution plan identity mismatch');
  const reports={};
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
  const bundle=path.join(dir,'site');
  const built=await buildSite({repoRoot:root,sourceSha:plan.sourceSha,clock:plan.clock,target:'production',outDir:bundle});
  const artifact=await import('./lib/site-artifact.mjs');
  const releaseId=`${process.env.GITHUB_RUN_ID??'local'}-${process.env.GITHUB_RUN_ATTEMPT??'1'}`;
  artifact.writeReleaseMarker({bundleRoot:bundle,sourceSha:plan.sourceSha,releaseId,clock:plan.clock});
  const frozen=artifact.snapshotDeployment(bundle);
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
  const pageMap=JSON.parse(fs.readFileSync(built.pageMapPath));
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
