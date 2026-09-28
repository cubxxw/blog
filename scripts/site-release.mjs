#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { publishRelease, verifyRelease, rollbackRelease, loadVerifiedReceipt, loadHistoricalReceipt } from './lib/site-release.mjs';
import { authenticatedFetch, requestJson, GITHUB_API } from './lib/netlify-release-client.mjs';
import { resolveChangeSet, publicationInputDigest } from './lib/ci-changes.mjs';
import { requiredChecksFor, releaseMode } from './lib/ci-contracts.mjs';
import { verifyArtifact } from './lib/site-artifact.mjs';

const args=process.argv.slice(2),command=args.shift();
const get=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const root=process.cwd();
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const git=(...argv)=>execFileSync('git',argv,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
async function probePages({fetch}) {
  const pages=['/','/zh/','/engineering/posts/go-release-tools/','/zh/engineering/posts/go-release-tools/'];
  for(const route of pages){const r=await fetch(`https://cubxxw.com${route}`,{redirect:'error'});if(!r.ok||!(r.headers.get('content-type')??'').includes('text/html'))return false;await r.arrayBuffer();}
  for(const name of ['blog-ai','article-ai','subscribe-email']){const r=await fetch(`https://cubxxw.com/.netlify/functions/${name}`,{method:'GET',redirect:'error'});if(r.status!==405)return false;await r.arrayBuffer();}
  return true;
}
async function main() {
  const siteId=process.env.NETLIFY_SITE_ID;
  if(!siteId||!process.env.NETLIFY_AUTH_TOKEN)throw new Error('NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN must be configured');
  const fetch=authenticatedFetch({githubToken:process.env.GITHUB_TOKEN,netlifyToken:process.env.NETLIFY_AUTH_TOKEN});
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
    else if(deployKind==='draft')result={status:'draft',...deployed,sourceSha:manifest.sourceSha};
    else {
      const receipt=await verifyRelease({manifest,...deployed,siteId,runId:sourceProof.runId,runAttempt:sourceProof.runAttempt,fetch,verifyPages:probePages});
      result={receipt,sourceProof};
      if(receipt.status==='verified') {
        const deployment=await requestJson(fetch,`${GITHUB_API}/repos/cubxxw/blog/deployments`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ref:receipt.sourceSha,environment:'production',auto_merge:false,required_contexts:[],production_environment:true,payload:{receipt,sourceProof}})});
        await requestJson(fetch,`${GITHUB_API}/repos/cubxxw/blog/deployments/${deployment.id}/statuses`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:'success',environment_url:'https://cubxxw.com',log_url:`https://github.com/cubxxw/blog/actions/runs/${sourceProof.runId}`})});
        result.deploymentId=String(deployment.id);
        if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`deployment_id=${deployment.id}\n`);
      } else if(receipt.status!=='superseded')process.exitCode=1;
    }
  } else if(command==='load-receipt') {
    result=await loadVerifiedReceipt({deploymentId:get('--deployment-id'),fetch:globalThis.fetch,token:process.env.GITHUB_TOKEN,siteId,netlifyToken:process.env.NETLIFY_AUTH_TOKEN});
  } else if(command==='rollback') {
    if(!get('--deployment-id'))throw new Error('Rollback requires a trusted previous GitHub deployment ID');
    const {receipt}=await loadHistoricalReceipt({deploymentId:get('--deployment-id'),fetch:globalThis.fetch,token:process.env.GITHUB_TOKEN,siteId,netlifyToken:process.env.NETLIFY_AUTH_TOKEN});
    result=await rollbackRelease({targetReceipt:receipt,siteId,fetch,verifyPages:probePages});
    if(result.status!=='rollback-verified')process.exitCode=1;
  } else throw new Error('Usage: site-release.mjs publish|load-receipt|rollback');
  const out=get('--out');if(out){fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');}
  console.log(JSON.stringify({status:result.status??result.receipt?.status,deployId:result.deployId??result.receipt?.deployId,deploymentId:result.deploymentId??null}));
}
main().catch(error=>{console.error(`Release failed: ${error.message}`);process.exitCode=2;});
