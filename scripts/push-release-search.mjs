#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createGitJsonStore } from './lib/git-json-state.mjs';
import { submitSearch, validateSearchState } from './lib/search-delivery.mjs';
import { authenticatedFetch, requestJson, GITHUB_API } from './lib/netlify-release-client.mjs';
const args=process.argv.slice(2),get=flag=>{const i=args.indexOf(flag);return i<0?undefined:args[i+1];};
try {
  const provider=get('--provider'),dir=path.resolve(get('--context-dir')??'followups');
  const json=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
  const {receipt}=json('release-context.json');
  const dryRun=args.includes('--dry-run'),statePath='config/search-delivery-state.json';
  const store=dryRun?{load:async()=>{
    const fetch=authenticatedFetch({githubToken:process.env.GH_TOKEN??process.env.GITHUB_TOKEN});
    const file=await requestJson(fetch,`${GITHUB_API}/repos/cubxxw/blog/contents/${statePath}?ref=main`);
    if(file.encoding!=='base64'||typeof file.content!=='string')throw new Error('Remote search progress is unavailable');
    return validateSearchState(JSON.parse(Buffer.from(file.content,'base64').toString('utf8')));
  },persist:async()=>{throw new Error('Dry-run state mutation refused');}}:createGitJsonStore({statePath,validateState:validateSearchState,message:'chore(search): persist acknowledged URLs [skip ci]'});
  const initial=fs.existsSync(path.join(dir,'initial-page-map.json'))?json('initial-page-map.json'):undefined;
  const result=await submitSearch({provider,receipt,previousPageMap:initial,currentPageMap:json('current-page-map.json'),store,dryRun,token:provider==='indexnow'?process.env.INDEXNOW_KEY:process.env.BAIDU_PUSH_TOKEN});
  console.log(JSON.stringify(result));
} catch(error){console.error(error.message);process.exitCode=1;}
