#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { publishRelease, verifyRelease, verifyDraftRelease, rollbackRelease, loadVerifiedReceipt, loadHistoricalReceipt, recordPublication } from './lib/site-release.mjs';
import { authenticatedFetch, requestJson, GITHUB_API } from './lib/netlify-release-client.mjs';
import { resolveChangeSet, publicationInputDigest } from './lib/ci-changes.mjs';
import { requiredChecksFor, releaseMode } from './lib/ci-contracts.mjs';
import { verifyArtifact } from './lib/site-artifact.mjs';
import { probeLiveSite } from './lib/live-site-probes.mjs';
import { readPublishedPageMap } from './lib/release-artifacts.mjs';

const args=process.argv.slice(2),command=args.shift();
const get=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const root=process.cwd();
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const git=(...argv)=>execFileSync('git',argv,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
async function probeFunctions({fetch,deadline}) {
  if(Date.now()>=deadline)return false;
  for(const name of ['blog-ai','article-ai','subscribe-email']){if(Date.now()>=deadline)return false;const r=await fetch(`https://cubxxw.com/.netlify/functions/${name}`,{method:'GET',redirect:'error',signal:AbortSignal.timeout(Math.max(1,Math.min(10000,deadline-Date.now())))});if(r.status!==405)return false;await r.arrayBuffer();}
  return true;
}
async function main() {
  if(['publish','rollback'].includes(command)&&(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!=='cubxxw/blog'||process.env.GITHUB_REF!=='refs/heads/main'))throw new Error('Run production publication or rollback through the main GitHub Actions entry');
  const siteId=process.env.NETLIFY_SITE_ID;
  if(!siteId||!process.env.NETLIFY_AUTH_TOKEN)throw new Error('NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN must be configured');
  const fetch=authenticatedFetch({githubToken:process.env.GITHUB_TOKEN,netlifyToken:process.env.NETLIFY_AUTH_TOKEN});
  const liveProbe=(pageMap,changeSet,allowPreviewNoindex=false)=>async({fetch,deadline})=>{
    const report=await probeLiveSite({pageMap,changeSet,fetch,deadline,allowPreviewNoindex});
    const out=get('--out');if(out){fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out.replace(/\.json$/,'-probes.json'),JSON.stringify(report,null,2)+'\n');}
    return report.ok&&await probeFunctions({fetch,deadline});
  };
  let result;
  if(command==='publish') {
    const bundleRoot=path.resolve(get('--bundle')??'tests/.artifacts/site');
    const manifest=json(path.join(bundleRoot,'manifest.json'));
    const sourceProof={repository:process.env.GITHUB_REPOSITORY,event:process.env.GITHUB_EVENT_NAME,ref:process.env.GITHUB_REF,sha:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT,artifactId:process.env.BLOG_ARTIFACT_ID,manifestDigest:process.env.BLOG_MANIFEST_DIGEST};
    const mode=releaseMode(process.env.BLOG_RELEASE_MODE);
    if(mode==='paused')throw new Error('Production release is paused');
    const deployKind=args.includes('--draft')?'draft':'production';
    if(deployKind==='production'&&mode!=='active')throw new Error('Production publishing requires active release mode');
    const derivePolicy=async()=>requiredChecksFor(await resolveChangeSet({repoRoot:root,eventPath:process.env.GITHUB_EVENT_PATH,headSha:sourceProof.sha}));
    const getCurrentInputDigest=async()=>{git('fetch','origin','main');const sha=git('rev-parse','origin/main');return publicationInputDigest({repoRoot:root,sha});};
    const exec=async(_command,argv,options)=>execFileSync(process.execPath,[path.join(root,'node_modules/netlify-cli/bin/run.js'),...argv],{...options,encoding:'utf8',maxBuffer:16*1024*1024,env:{PATH:process.env.PATH,HOME:process.env.HOME,NETLIFY_AUTH_TOKEN:process.env.NETLIFY_AUTH_TOKEN,NETLIFY_SITE_ID:siteId,NETLIFY_TELEMETRY_DISABLED:'1'}});
    const deployed=await publishRelease({manifest,bundleRoot,sourceProof,siteId,deployKind,exec,fetch,derivePolicy,getCurrentInputDigest,verifyBundle:verifyArtifact});
    if(deployed.status==='superseded')result=deployed;
    else if(deployKind==='draft') {
      const changeSet=await resolveChangeSet({repoRoot:root,eventPath:process.env.GITHUB_EVENT_PATH,headSha:sourceProof.sha});
      result=await verifyDraftRelease({manifest,...deployed,siteId,fetch,verifyPages:liveProbe(json(path.join(bundleRoot,'page-map.json')),changeSet,true)});
      if(result.status!=='draft-verified')process.exitCode=1;
    }
    else {
      const changeSet=await resolveChangeSet({repoRoot:root,eventPath:process.env.GITHUB_EVENT_PATH,headSha:sourceProof.sha});
      const receipt=await verifyRelease({manifest,...deployed,siteId,runId:sourceProof.runId,runAttempt:sourceProof.runAttempt,fetch,verifyPages:liveProbe(json(path.join(bundleRoot,'page-map.json')),changeSet)});
      result={receipt,sourceProof};
      if(receipt.status==='verified') {
        result.deploymentId=await recordPublication({receipt,sourceProof,fetch,operationRunId:sourceProof.runId,operationAttempt:sourceProof.runAttempt});
        if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`deployment_id=${result.deploymentId}\n`);
      } else if(receipt.status!=='superseded')process.exitCode=1;
    }
  } else if(command==='load-receipt') {
    result=await loadVerifiedReceipt({deploymentId:get('--deployment-id'),fetch:globalThis.fetch,token:process.env.GITHUB_TOKEN,siteId,netlifyToken:process.env.NETLIFY_AUTH_TOKEN});
  } else if(command==='rollback') {
    if(!get('--deployment-id'))throw new Error('Rollback requires a trusted previous GitHub deployment ID');
    const {receipt,sourceProof}=await loadHistoricalReceipt({deploymentId:get('--deployment-id'),fetch:globalThis.fetch,token:process.env.GITHUB_TOKEN,siteId,netlifyToken:process.env.NETLIFY_AUTH_TOKEN});
    const pageMap=await readPublishedPageMap({sourceProof,fetch,token:process.env.GITHUB_TOKEN});
    if(digest(pageMap)!==receipt.pageMapDigest||pageMap.sourceSha!==receipt.sourceSha)throw new Error('Rollback page map differs from its verified receipt');
    result=await rollbackRelease({targetReceipt:receipt,siteId,fetch,verifyPages:liveProbe(pageMap,{baseSha:null,files:[]})});
    if(result.status==='rollback-verified')result.deploymentId=await recordPublication({receipt:result,sourceProof,fetch,operationRunId:process.env.GITHUB_RUN_ID,operationAttempt:process.env.GITHUB_RUN_ATTEMPT});
    if(result.status!=='rollback-verified')process.exitCode=1;
  } else throw new Error('Usage: site-release.mjs publish|load-receipt|rollback');
  const out=get('--out');if(out){fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');}
  console.log(JSON.stringify({status:result.status??result.receipt?.status,deployId:result.deployId??result.receipt?.deployId,deploymentId:result.deploymentId??null}));
}
main().catch(error=>{console.error(`Release failed: ${error.message}`);process.exitCode=2;});
