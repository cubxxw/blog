import { createHash } from 'node:crypto';
import { validateContract } from './ci-contracts.mjs';
import { assertPublicRelease } from './release-followups.mjs';
const providers=['indexnow','baidu'];
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const validHash=value=>/^[a-f0-9]{64}$/.test(value);
function canonical(value) {const u=new URL(value);if(u.origin!=='https://cubxxw.com'||u.href!==value||u.search||u.hash||u.username||u.password)throw new Error('Noncanonical search URL');return value;}
function pages(map) {
  validateContract('blog-page-map/1',map);if(!map.complete||map.target!=='production')throw new Error('Complete production search map required');
  return Object.fromEntries(map.pages.filter(p=>p.kind!=='alias'&&!/\/404\/?$/.test(new URL(p.url,map.baseUrl).pathname)).map(p=>[canonical(new URL(p.url,map.baseUrl).href),p.contentHash]));
}
export function validateSearchState(value) {
  if(!value||value.schema!=='blog-search-state/1'||!value.providers||Array.isArray(value.providers))throw new Error('Invalid search delivery state');
  for(const [provider,record] of Object.entries(value.providers)) {
    if(!providers.includes(provider)||!record||!validHash(record.baselineDigest))throw new Error('Invalid search provider state');
    for(const entries of [record.baseline,record.accepted]) {
      if(!entries||typeof entries!=='object'||Array.isArray(entries))throw new Error('Invalid search URL ledger');
      for(const [url,digest] of Object.entries(entries)){canonical(url);if(!validHash(digest))throw new Error('Invalid search content digest');}
    }
  }
  return structuredClone(value);
}
export function initializeSearchState({state,provider,baseline}) {
  if(!providers.includes(provider))throw new Error('Unknown search provider');
  const next=validateSearchState(state??{schema:'blog-search-state/1',providers:{}});
  if(!next.providers[provider])next.providers[provider]={baselineDigest:hash(baseline),baseline:pages(baseline),accepted:{}};
  return next;
}
export function pendingSearchUrls({state,provider,pageMap}) {
  const record=validateSearchState(state).providers[provider];if(!record)throw new Error('Search provider baseline is missing');
  return Object.entries(pages(pageMap)).filter(([url,digest])=>(record.accepted[url]??record.baseline[url])!==digest).map(([url])=>url).sort();
}
export function recordSearchAcceptance({state,provider,pageMap,urls}) {
  const next=validateSearchState(state),current=pages(pageMap),record=next.providers[provider];
  if(!record)throw new Error('Search baseline missing');
  for(const url of urls){if(!current[canonical(url)])throw new Error('Acknowledged URL absent from current publication');record.accepted[url]=current[url];}
  return next;
}
export async function submitSearch({provider,receipt,previousPageMap,currentPageMap,store,fetch=globalThis.fetch,token,dryRun=false}) {
  if(!providers.includes(provider))throw new Error('Unknown provider');
  await assertPublicRelease({receipt,fetch});
  if(hash(currentPageMap)!==receipt.pageMapDigest||currentPageMap.sourceSha!==receipt.sourceSha)throw new Error('Search page map does not match authenticated receipt');
  let state=initializeSearchState({state:await store.load(),provider,baseline:previousPageMap});
  const urls=pendingSearchUrls({state,provider,pageMap:currentPageMap});
  if(dryRun)return {provider,dryRun:true,pending:urls.length,accepted:0};
  if(!token)throw new Error(`Missing ${provider} token`);
  await store.persist(state); // Establish the explicit migration baseline first.
  let accepted=0,dirty=false;
  const size=provider==='baidu'?1:1000;
  try {
    for(let offset=0;offset<urls.length;offset+=size) {
      await assertPublicRelease({receipt,fetch});
      const batch=urls.slice(offset,offset+size);
      let remain;
      if(provider==='indexnow') {
        const response=await fetch('https://api.indexnow.org/IndexNow',{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json'},body:JSON.stringify({host:'cubxxw.com',key:token,keyLocation:`https://cubxxw.com/${encodeURIComponent(token)}.txt`,urlList:batch})});
        if(![200,202].includes(response.status))throw new Error(`IndexNow incomplete (${response.status}); acknowledged progress is retained`);
      } else {
        const endpoint=new URL('https://data.zz.baidu.com/urls');endpoint.searchParams.set('site','https://cubxxw.com');endpoint.searchParams.set('token',token);
        const response=await fetch(endpoint.href,{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'text/plain'},body:batch.join('\n')});
        let body;try{body=await response.json();}catch{throw new Error('Baidu returned an unreadable response; progress is retained');}
        if(!response.ok||body.error||body.success!==1||body.not_valid?.length||body.not_same_site?.length)throw new Error('Baidu incomplete or quota exhausted; acknowledged progress is retained');
        remain=body.remain;
      }
      state=recordSearchAcceptance({state,provider,pageMap:currentPageMap,urls:batch});dirty=true;accepted+=batch.length;
      if(provider==='indexnow'||accepted%10===0){await store.persist(state);dirty=false;}
      if(remain===0&&accepted<urls.length)throw new Error('Baidu quota exhausted with outstanding URLs');
    }
  } finally {if(dirty)await store.persist(state);}
  await assertPublicRelease({receipt,fetch});
  return {provider,pending:urls.length-accepted,accepted};
}
