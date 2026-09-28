import { createHash } from 'node:crypto';
import { readFileSync, mkdtempSync, cpSync, copyFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateContract } from './ci-contracts.mjs';
import { NETLIFY_API,GITHUB_API,requestJson,deploymentUrl,authenticatedFetch } from './netlify-release-client.mjs';

export function validateReceipt(receipt) {
  validateContract('blog-release/1',receipt);
  if(!['verified','rollback-verified'].includes(receipt.status))throw new Error('Receipt is not verified');
  deploymentUrl(receipt.deployUrl,receipt.deployId);
  for(const name of ['source','output','browser'])if(!receipt.checks.some(c=>c.name===name&&c.status==='success'))throw new Error(`Missing mandatory ${name} receipt evidence`);
  return receipt;
}
export function assertCurrentProduction({receipt,currentDeploy}) {
  validateReceipt(receipt);
  const c=currentDeploy;
  if(!c||c.siteId!==receipt.siteId||c.id!==receipt.deployId||c.state!=='ready'||c.published!==true||c.sourceSha!==receipt.sourceSha||deploymentUrl(c.deployUrl,c.id)!==deploymentUrl(receipt.deployUrl,receipt.deployId))throw new Error('Receipt does not match current production');
}
const hashJson=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

export async function verifyDraftRelease({manifest,deployId,siteId,fetch,verifyPages}) {
  const deploy=await requestJson(fetch,`${NETLIFY_API}/deploys/${encodeURIComponent(deployId)}`);
  if(deploy.id!==deployId||deploy.site_id!==siteId||deploy.state!=='ready')throw new Error('Draft deployment is not ready for this site');
  const deployUrl=deploymentUrl(deploy.deploy_ssl_url??deploy.deploy_url,deployId);
  const draftFetch=(input,options={})=>{const url=new URL(input);const target=url.origin==='https://cubxxw.com'?new URL(url.pathname+url.search,deployUrl).href:url.href;return fetch(target,options);};
  const marker=await requestJson(draftFetch,'https://cubxxw.com/__release.json');
  if(marker.sourceSha!==manifest.sourceSha||marker.releaseId!==manifest.releaseId)throw new Error('Draft marker differs from verified artifact');
  const ok=typeof verifyPages==='function'&&await verifyPages({fetch:draftFetch,deadline:Date.now()+280000});
  return {schema:'blog-draft/1',status:ok?'draft-verified':'draft-failed',sourceSha:manifest.sourceSha,artifactDigest:manifest.fileSetDigest,siteId,deployId,deployUrl};
}

export async function verifyRelease({manifest,deployId,siteId,runId,runAttempt,fetch,previousDeployId,now=()=>new Date(),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),timeoutMs=300000,pollMs=5000,verifyPages}) {
  const started=now().getTime();
  const result={schema:'blog-release/1',releaseId:manifest.releaseId,previousDeployId:previousDeployId??null,sourceSha:manifest.sourceSha,inputDigest:manifest.inputDigest,artifactDigest:manifest.fileSetDigest,pageMapDigest:manifest.pageMapDigest,runId:String(runId),runAttempt:String(runAttempt),siteId,deployId,deployUrl:'',verifiedAt:null,checks:manifest.checks,status:'verification-failed'};
  let lastReason='Production verification did not complete';
  do {
    try {
      const deploy=await requestJson(fetch,`${NETLIFY_API}/deploys/${encodeURIComponent(deployId)}`);
      if(deploy.id!==deployId||deploy.site_id!==siteId)throw new Error('Deployment identity mismatch');
      result.deployUrl=deploymentUrl(deploy.deploy_ssl_url??deploy.deploy_url,deployId);
      if(deploy.state!=='ready')throw new Error('Deployment is not ready');
      const site=await requestJson(fetch,`${NETLIFY_API}/sites/${encodeURIComponent(siteId)}`);
      if(site.id!==siteId)throw new Error('Site identity mismatch');
      if(site.published_deploy?.id!==deployId){
        if(previousDeployId&&site.published_deploy?.id===previousDeployId)throw new Error('Previous production deployment has not switched yet');
        result.status='superseded';result.reason='Another deployment is current';return result;
      }
      const marker=await requestJson(fetch,'https://cubxxw.com/__release.json',{headers:{'Cache-Control':'no-cache'}});
      if(marker.sourceSha!==manifest.sourceSha||marker.releaseId!==manifest.releaseId)throw new Error('Primary domain still serves a different release');
      if(typeof verifyPages!=='function'||!await verifyPages({deployUrl:result.deployUrl,sourceSha:manifest.sourceSha,fetch,deadline:started+timeoutMs}))throw new Error('Required page or function verification failed');
      // Recheck after probes so a concurrent external deploy cannot certify mixed evidence.
      const finalSite=await requestJson(fetch,`${NETLIFY_API}/sites/${encodeURIComponent(siteId)}`);
      if(finalSite.published_deploy?.id!==deployId){result.status='superseded';result.reason='Deployment changed during probes';return result;}
      const verified={...result,status:'verified',verifiedAt:now().toISOString()};
      validateReceipt(verified);return verified;
    } catch(error) {lastReason=error.message;}
    if(now().getTime()-started>=timeoutMs)break;
    await sleep(pollMs);
  }while(now().getTime()-started<=timeoutMs);
  result.reason=lastReason;return result;
}

async function proveRun({sourceProof,fetch,expectedSha}) {
  const p=sourceProof;
  if(!p||!['push','workflow_dispatch'].includes(p.event)||p.ref!=='refs/heads/main'||p.sha!==expectedSha||p.repository!=='cubxxw/blog'||!/^\d+$/.test(String(p.runId))||!/^\d+$/.test(String(p.artifactId)))throw new Error('Production artifacts require trusted main provenance');
  const base=`${GITHUB_API}/repos/${p.repository}`;
  const run=await requestJson(fetch,`${base}/actions/runs/${p.runId}/attempts/${p.runAttempt}`);
  if(run.head_sha!==p.sha||run.head_branch!=='main'||run.event!==p.event||run.run_attempt!==Number(p.runAttempt)||run.path!=='.github/workflows/main.yaml'||run.repository?.full_name!==p.repository)throw new Error('Workflow run provenance mismatch');
  const artifact=await requestJson(fetch,`${base}/actions/artifacts/${p.artifactId}`);
  if(artifact.expired||artifact.workflow_run?.id!==Number(p.runId)||artifact.workflow_run?.head_sha!==p.sha||artifact.name!==`blog-site-${p.sha}-${p.runAttempt}`)throw new Error('Artifact is not from this trusted main attempt');
}
export async function publishRelease({manifest,bundleRoot,sourceProof,siteId,deployKind='draft',exec,fetch,derivePolicy,getCurrentInputDigest,verifyBundle}) {
  await proveRun({sourceProof,fetch,expectedSha:manifest.sourceSha});
  if(!/^[a-f0-9]{64}$/.test(sourceProof.manifestDigest??'')||hashJson(manifest)!==sourceProof.manifestDigest)throw new Error('Manifest does not match the trusted verification job output');
  if(!['draft','production'].includes(deployKind))throw new Error('Invalid deploy kind');
  if(typeof derivePolicy!=='function'||typeof getCurrentInputDigest!=='function'||typeof verifyBundle!=='function')throw new Error('Trusted policy and artifact verification are required');
  const requiredChecks=await derivePolicy();
  if(!Array.isArray(requiredChecks)||!['source','output','browser'].every(name=>requiredChecks.includes(name)))throw new Error('Invalid mandatory production check policy');
  await verifyBundle({bundleRoot,manifest,expectedSha:sourceProof.sha,expectedTarget:'production',requiredChecks});
  for(const name of requiredChecks) {
    const check=manifest.checks.find(c=>c.name===name);
    if(!check||check.status!=='success')throw new Error(`Required ${name} check is not successful`);
    const file=path.join(bundleRoot,`${name}-report.json`);
    const report=JSON.parse(readFileSync(file,'utf8'));
    if(report.mode!=='enforce'||report.ok!==true||hashJson(report)!==check.reportDigest)throw new Error(`Invalid or report-only ${name} gate evidence`);
  }
  if(await getCurrentInputDigest()!==manifest.inputDigest)return {status:'superseded',deployId:null,deployUrl:null};
  const site=await requestJson(fetch,`${NETLIFY_API}/sites/${encodeURIComponent(siteId)}`);
  if(site.id!==siteId||!(site.custom_domain==='cubxxw.com'||site.ssl_url==='https://cubxxw.com'))throw new Error('Configured Netlify site does not own the production domain');
  if(deployKind==='production'&&site.build_settings?.stop_builds!==true)throw new Error('Stop Netlify Git builds before enabling Actions production publishing');
  if(deployKind==='production'&&site.published_deploy?.id) {
    const current=site.published_deploy.deploy_ssl_url?site.published_deploy:await requestJson(fetch,`${NETLIFY_API}/deploys/${encodeURIComponent(site.published_deploy.id)}`);
    const markerResponse=await fetch(`${deploymentUrl(current.deploy_ssl_url??current.deploy_url,current.id)}/__release.json`,{redirect:'error',signal:AbortSignal.timeout(10000)});
    // A legacy deploy has no marker at first cutover. Other failures are not
    // evidence that it is safe to overwrite an already newer publication.
    if(markerResponse.status!==404) {
      if(!markerResponse.ok)throw new Error('Current immutable deployment marker is unavailable');
      const marker=await markerResponse.json();
      if(!Number.isFinite(Date.parse(marker.clock)))throw new Error('Current deployment clock is unprovable');
      if(Date.parse(marker.clock)>Date.parse(manifest.clock))return {status:'superseded',deployId:null,deployUrl:null};
    }
  }
  const staging=mkdtempSync(path.join(os.tmpdir(),'blog-release-'));
  try {
    // Isolate configuration lookup from the repo and local CLI auth/cache state.
    cpSync(bundleRoot,staging,{recursive:true});
    copyFileSync(path.join(staging,'deploy-config.toml'),path.join(staging,'netlify.toml'));
    const args=['deploy','--no-build','--json','--site',siteId,'--dir',path.join(staging,'public'),'--functions',path.join(staging,'functions'),'--message',`blog ${manifest.sourceSha}`];
    if(deployKind==='production')args.push('--prod');
    const output=await exec('netlify',args,{cwd:staging});
    const deployed=JSON.parse(typeof output==='string'?output:output.stdout);
    const deployId=deployed.deploy_id;
    if(typeof deployId!=='string')throw new Error('Netlify did not return a deployment ID');
    return {deployId,deployUrl:deploymentUrl(deployed.deploy_url??deployed.deploy_ssl_url,deployId),previousDeployId:site.published_deploy?.id};
  } finally {rmSync(staging,{recursive:true,force:true});}
}
export async function rollbackRelease({targetReceipt,siteId,fetch,now,sleep,verifyPages}) {
  validateReceipt(targetReceipt);
  if(targetReceipt.siteId!==siteId)throw new Error('Rollback site mismatch');
  const previous=await requestJson(fetch,`${NETLIFY_API}/sites/${encodeURIComponent(siteId)}`);
  await requestJson(fetch,`${NETLIFY_API}/sites/${encodeURIComponent(siteId)}/deploys/${encodeURIComponent(targetReceipt.deployId)}/restore`,{method:'POST'});
  const marker=await requestJson(fetch,`${deploymentUrl(targetReceipt.deployUrl,targetReceipt.deployId)}/__release.json`);
  const manifest={...targetReceipt,fileSetDigest:targetReceipt.artifactDigest,releaseId:marker.releaseId};
  const result=await verifyRelease({manifest,deployId:targetReceipt.deployId,siteId,previousDeployId:previous.published_deploy?.id,runId:targetReceipt.runId,runAttempt:targetReceipt.runAttempt,fetch,now,sleep,verifyPages});
  if(result.status==='verified')result.status='rollback-verified';
  return result;
}

async function loadReceiptRecord({deploymentId,fetch:fetchImpl=globalThis.fetch,repo='cubxxw/blog',token,siteId,netlifyToken,requireCurrent=true}) {
  if(repo!=='cubxxw/blog'||!/^\d+$/.test(String(deploymentId)))throw new Error('Invalid deployment receipt identity');
  const fetch=authenticatedFetch({githubToken:token,netlifyToken,fetchImpl});
  const deployment=await requestJson(fetch,`${GITHUB_API}/repos/${repo}/deployments/${deploymentId}`);
  if(deployment.environment!=='production'||deployment.creator?.login!=='github-actions[bot]')throw new Error('Untrusted deployment record');
  const receipt=deployment.payload?.receipt;
  validateReceipt(receipt);
  if(!['verified','rollback-verified'].includes(receipt.status)||deployment.sha!==receipt.sourceSha||receipt.siteId!==siteId)throw new Error('Deployment receipt provenance mismatch');
  const run=await requestJson(fetch,`${GITHUB_API}/repos/${repo}/actions/runs/${receipt.runId}/attempts/${receipt.runAttempt}`);
  if(run.head_sha!==receipt.sourceSha||run.head_branch!=='main'||run.run_attempt!==Number(receipt.runAttempt)||run.repository?.full_name!==repo||run.path!=='.github/workflows/main.yaml'||!['push','workflow_dispatch'].includes(run.event))throw new Error('Receipt run identity mismatch');
  const proof=deployment.payload?.sourceProof;
  if(!proof||proof.runId!==receipt.runId||String(proof.runAttempt)!==String(receipt.runAttempt)||proof.sha!==receipt.sourceSha)throw new Error('Missing immutable receipt source proof');
  await proveRun({sourceProof:proof,fetch,expectedSha:receipt.sourceSha});
  const site=await requestJson(fetch,`${NETLIFY_API}/sites/${encodeURIComponent(siteId)}`);
  const deploy=await requestJson(fetch,`${NETLIFY_API}/deploys/${encodeURIComponent(receipt.deployId)}`);
  const markerUrl=requireCurrent?'https://cubxxw.com/__release.json':`${deploymentUrl(receipt.deployUrl,receipt.deployId)}/__release.json`;
  const marker=await requestJson(fetch,markerUrl,{headers:{'Cache-Control':'no-cache'}});
  if(marker.releaseId!==receipt.releaseId)throw new Error('Receipt release ID differs from published marker');
  const currentDeploy={siteId:site.id,id:deploy.id,state:deploy.state,published:site.published_deploy?.id===deploy.id,sourceSha:marker.sourceSha,deployUrl:deploymentUrl(deploy.deploy_ssl_url??deploy.deploy_url,deploy.id)};
  if(deploy.site_id!==siteId)throw new Error('Published deploy belongs to another site');
  if(requireCurrent)assertCurrentProduction({receipt,currentDeploy});
  else if(currentDeploy.id!==receipt.deployId||currentDeploy.state!=='ready'||marker.sourceSha!==receipt.sourceSha)throw new Error('Historical deployment no longer matches its verified receipt');
  return {receipt,currentDeploy,sourceProof:proof};
}
export const loadVerifiedReceipt=options=>loadReceiptRecord({...options,requireCurrent:true});
export const loadHistoricalReceipt=options=>loadReceiptRecord({...options,requireCurrent:false});

export async function recordPublication({receipt,sourceProof,fetch,operationRunId,operationAttempt}) {
  validateReceipt(receipt);
  if(!/^\d+$/.test(String(operationRunId))||!/^\d+$/.test(String(operationAttempt))||Number(operationAttempt)<1)throw new Error('Invalid publication operation identity');
  await proveRun({sourceProof,fetch,expectedSha:receipt.sourceSha});
  const deployment=await requestJson(fetch,`${GITHUB_API}/repos/cubxxw/blog/deployments`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ref:receipt.sourceSha,environment:'production',auto_merge:false,required_contexts:[],production_environment:true,payload:{receipt,sourceProof,operation:{kind:receipt.status==='rollback-verified'?'rollback':'publish',runId:String(operationRunId),runAttempt:String(operationAttempt)}}})});
  if(!/^\d+$/.test(String(deployment.id))||deployment.sha!==receipt.sourceSha||deployment.creator?.login!=='github-actions[bot]')throw new Error('GitHub publication record identity is unproven');
  await requestJson(fetch,`${GITHUB_API}/repos/cubxxw/blog/deployments/${deployment.id}/statuses`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:'success',environment_url:'https://cubxxw.com',log_url:`https://github.com/cubxxw/blog/actions/runs/${operationRunId}`})});
  return String(deployment.id);
}
