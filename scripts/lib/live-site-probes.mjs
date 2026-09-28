import { parse } from 'parse5';
import { htmlElements, attribute, renderedPageData } from './content-page-map.mjs';
const origin='https://cubxxw.com';
function canonicalUrl(value,base=origin){const url=new URL(value,base);if(url.origin!==origin||url.username||url.password)throw new Error('Live probe origin rejected');return url;}
function meta(html){const nodes=htmlElements(parse(html));return {nodes,canonical:attribute(nodes.find(n=>n.tagName==='link'&&attribute(n,'rel')==='canonical')??{},'href')??'',robots:(attribute(nodes.find(n=>n.tagName==='meta'&&attribute(n,'name')==='robots')??{},'content')??'').toLowerCase().split(/[\s,]+/).filter(Boolean).sort().join(',')};}
export function selectLivePages({pageMap,changeSet}) {
  if(!Array.isArray(pageMap?.pages)||!Array.isArray(changeSet?.files))throw new Error('Authenticated page map and change scope required');
  const changed=new Set(changeSet.files.flatMap(f=>[f.path,f.oldPath].filter(Boolean)));
  for(const file of [...changed])if(file.startsWith('content/'))changed.add(file.replace(/^content\/(en|zh)\//,(_,lang)=>`content/${lang==='en'?'zh':'en'}/`));
  const all=changeSet.baseSha===null||[...changed].some(file=>file==='netlify.toml'||file==='static/_redirects'||file==='static/_headers');
  const representative=new Set(['/','/zh/','/projects/','/zh/projects/','/engineering/posts/go-release-tools/','/zh/engineering/posts/go-release-tools/']);
  const errorPages=new Set(['/404.html','/zh/404.html','/404/','/zh/404/']);
  const selected=pageMap.pages.filter(p=>p.kind!=='alias'&&!errorPages.has(canonicalUrl(p.url).pathname)&&(all||changed.has(p.source)||representative.has(canonicalUrl(p.url).pathname)));
  if(!selected.length||selected.length>1000)throw new Error('Live page probe scope is empty or too large');
  return selected;
}
export async function probeLiveSite({pageMap,changeSet,readExpected,fetch=globalThis.fetch,deadline=Date.now()+280000,allowPreviewNoindex=false}) {
  const selected=selectLivePages({pageMap,changeSet});const errors=[],resources=new Map();
  async function request(url,method='GET') {
    let current=canonicalUrl(url).href;const seen=new Set();
    for(let n=0;n<6;n++) {
      if(Date.now()>=deadline)throw new Error('Live probe deadline exceeded');
      if(seen.has(current))throw new Error('Live redirect loop');seen.add(current);
      const response=await fetch(current,{method,redirect:'manual',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(Math.max(1,Math.min(10000,deadline-Date.now())))});
      if([301,302,303,307,308].includes(response.status)) {
        const location=response.headers.get('location');if(!location)throw new Error('Redirect lacks a target');current=canonicalUrl(location,current).href;continue;
      }
      return {response,url:current};
    }
    throw new Error('Too many redirects');
  }
  async function workers(items,fn) {
    let index=0;
    await Promise.all(Array.from({length:Math.min(4,items.length)},async()=>{while(index<items.length){const item=items[index++];try{await fn(item);}catch(error){errors.push(`${typeof item==='string'?new URL(item).pathname:item.outputPath}: ${error.message}`);}}}));
  }
  await workers(selected,async page=>{
    const expected=readExpected?renderedPageData(await readExpected(page),page.url):page.rendered;
    if(!expected||typeof expected.canonical!=='string'||!Array.isArray(expected.resources))throw new Error('Frozen rendering metadata is missing');
    const {response,url}=await request(page.url);
    if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))throw new Error(`Page unavailable (${response.status})`);
    if(new URL(url).pathname!==canonicalUrl(page.url).pathname)throw new Error('Published route redirects to another page');
    const body=await response.text();if(body.length>16*1024*1024)throw new Error('Page response too large');
    const actual=meta(body);
    if(actual.canonical!==expected.canonical||actual.robots!==expected.robots)throw new Error('Published SEO metadata differs from verified output');
    if(!allowPreviewNoindex&&!expected.robots.includes('noindex')&&/noindex/i.test(response.headers.get('x-robots-tag')??''))throw new Error('Published headers unexpectedly prevent indexing');
    for(const {url,kind} of expected.resources){
      const resource=new URL(url,page.url);if(resource.origin!==origin||resource.pathname.startsWith('/.netlify/functions/'))continue;
      resource.hash='';resources.set(resource.href,kind);
    }
  });
  if(resources.size>3000)errors.push('Referenced-resource scope exceeds the bounded verifier');
  else await workers([...resources.keys()],async url=>{
    const {response}=await request(url,'HEAD');const type=response.headers.get('content-type')??'';
    if(!response.ok)throw new Error(`Resource unavailable (${response.status})`);
    const kind=resources.get(url);
    if(kind==='style'&&!/text\/css/i.test(type))throw new Error('Stylesheet content type is invalid');
    if(kind==='script'&&!/(javascript|ecmascript)/i.test(type))throw new Error('Script content type is invalid');
    if(kind==='image'&&!/^image\//i.test(type))throw new Error('Image content type is invalid');
  });
  return {schema:'blog-live-probes/1',mode:'enforce',ok:errors.length===0,pages:selected.map(p=>p.url),resources:[...resources.keys()],errors};
}
