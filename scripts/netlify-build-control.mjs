#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { authenticatedFetch,requestJson,NETLIFY_API } from './lib/netlify-release-client.mjs';
import { releaseMode } from './lib/ci-contracts.mjs';
export async function controlNativeBuilds({siteId,operation,mode,fetch,recordCheckpoint=async()=>{}}) {
  mode=releaseMode(mode);
  if(!['inspect','pause','resume'].includes(operation))throw new Error('Unknown native build operation');
  if(operation==='resume'&&mode==='active')throw new Error('Pause Actions before resuming native builds; active cannot have two publishers');
  const url=`${NETLIFY_API}/sites/${encodeURIComponent(siteId)}`;
  const before=await requestJson(fetch,url);
  if(before.id!==siteId||!(before.custom_domain==='cubxxw.com'||before.ssl_url==='https://cubxxw.com'))throw new Error('Configured site does not own cubxxw.com');
  await recordCheckpoint({schema:'blog-native-build-control/1',status:'checkpoint',siteId,operation,actionsMode:mode,checkpointDeployId:before.published_deploy?.id??null,stopBuilds:before.build_settings?.stop_builds===true});
  if(operation!=='inspect')await requestJson(fetch,url,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({build_settings:{stop_builds:operation==='pause'}})});
  const after=await requestJson(fetch,url);
  if(operation!=='inspect'&&after.build_settings?.stop_builds!==(operation==='pause'))throw new Error('Native build setting did not apply');
  const active=[];let complete=false;
  for(let page=1;page<=50;page++) {
    const builds=await requestJson(fetch,`${url}/builds?per_page=100&page=${page}`);
    if(!Array.isArray(builds)||builds.some(b=>typeof b.done!=='boolean'))throw new Error('Native build activity cannot be proven');
    active.push(...builds.filter(b=>!b.done&&!b.error).map(b=>b.id));
    if(builds.length<100){complete=true;break;}
  }
  if(!complete)throw new Error('Build history exceeds bounded inspection; verify activity manually');
  return {schema:'blog-native-build-control/1',status:'observed',siteId,operation,actionsMode:mode,checkpointDeployId:before.published_deploy?.id??null,currentDeployId:after.published_deploy?.id??null,stopBuilds:after.build_settings?.stop_builds===true,activeBuildIds:active,ready:after.build_settings?.stop_builds===true&&active.length===0&&typeof after.published_deploy?.id==='string'};
}
async function main() {
  const args=process.argv.slice(2),get=flag=>{const i=args.indexOf(flag);return i<0?undefined:args[i+1];};
  if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REF!=='refs/heads/main'||process.env.GITHUB_REPOSITORY!=='cubxxw/blog')throw new Error('Use the protected main workflow for platform control');
  const siteId=process.env.NETLIFY_SITE_ID;if(!siteId||!process.env.NETLIFY_AUTH_TOKEN)throw new Error('Production Netlify credentials are missing');
  const out=get('--out');if(!out)throw new Error('An evidence output path is required');fs.mkdirSync(path.dirname(out),{recursive:true});
  const fetch=authenticatedFetch({netlifyToken:process.env.NETLIFY_AUTH_TOKEN});
  const result=await controlNativeBuilds({siteId,operation:get('--operation')??'inspect',mode:releaseMode(process.env.BLOG_RELEASE_MODE),fetch,recordCheckpoint:async value=>fs.writeFileSync(out,JSON.stringify(value,null,2)+'\n')});
  fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
  if(result.operation==='pause'&&!result.ready)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=2;});
