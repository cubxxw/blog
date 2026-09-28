import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parse } from 'parse5';
import { validateContract } from './ci-contracts.mjs';

export async function safeFile(root,relative,{missing=false}={}) {
  if(typeof relative!=='string' || !relative || relative.includes('\\') || path.isAbsolute(relative) || relative.split('/').some(part=>['','.','..'].includes(part))) throw new Error(`Unsafe file boundary path: ${relative}`);
  const resolved=path.resolve(root); let current=resolved;
  if((await fs.lstat(resolved)).isSymbolicLink()) throw new Error(`Root symlink rejected: ${resolved}`);
  for(const segment of relative.split('/')) {
    current=path.join(current,segment);
    try {if((await fs.lstat(current)).isSymbolicLink()) throw new Error(`Output/source symlink rejected: ${relative}`);}
    catch(error) {if(missing && error.code==='ENOENT') return null;throw error;}
  }
  return current;
}

export async function outputFiles(publicDir,relative='') {
  const root=path.resolve(publicDir);
  if(!relative && (await fs.lstat(root)).isSymbolicLink()) throw new Error('Output root symlink rejected');
  const files=[];
  for(const entry of await fs.readdir(path.join(root,relative),{withFileTypes:true})) {
    const file=relative?`${relative}/${entry.name}`:entry.name;
    if(entry.isSymbolicLink()) throw new Error(`Output symlink rejected: ${file}`);
    if(entry.isDirectory()) files.push(...await outputFiles(root,file)); else if(entry.isFile()) files.push(file);
  }
  return files.sort();
}

export function htmlElements(node) {
  const elements=[];
  function visit(current) {if(current.tagName) elements.push(current);for(const child of current.childNodes ?? []) visit(child);}
  visit(node);return elements;
}
export const attribute=(node,name)=>node.attrs?.find(a=>a.name===name)?.value;
export const textContent=node=>node.nodeName==='#text'?node.value:(node.childNodes??[]).map(textContent).join('');

export function renderedPageData(html,url) {
  const nodes=htmlElements(typeof html==='string'?parse(html):html),resources=new Map();
  for(const node of nodes) {
    const values=[];let kind;
    if(node.tagName==='script'){values.push(attribute(node,'src'));kind='script';}
    if(node.tagName==='img'){values.push(attribute(node,'src'));for(const part of (attribute(node,'srcset')??'').split(','))values.push(part.trim().split(/\s+/)[0]);kind='image';}
    if(node.tagName==='link'&&attribute(node,'rel')?.toLowerCase().split(/\s+/).includes('stylesheet')){values.push(attribute(node,'href'));kind='style';}
    for(const value of values.filter(Boolean)){try{const resource=new URL(value,url);resource.hash='';if(['https:','http:'].includes(resource.protocol))resources.set(resource.href,kind);}catch{/* Source/output validation reports malformed references separately. */}}
  }
  return {
    canonical:attribute(nodes.find(n=>n.tagName==='link'&&attribute(n,'rel')?.toLowerCase()==='canonical')??{},'href')??'',
    robots:(attribute(nodes.find(n=>n.tagName==='meta'&&attribute(n,'name')?.toLowerCase()==='robots')??{},'content')??'').toLowerCase().split(/[\s,]+/).filter(Boolean).sort().join(','),
    resources:[...resources].map(([url,kind])=>({url,kind})),
  };
}

export function decodedPath(value) {
  let decoded;
  try {decoded=decodeURIComponent(value);} catch {throw new Error(`Invalid URL encoding: ${value}`);}
  if(decoded.includes('\\') || decoded.includes('\0') || decoded.split('/').some(p=>p==='.'||p==='..') || /%2e|%2f|%5c/i.test(decoded)) throw new Error(`Encoded path traversal rejected: ${value}`);
  return decoded;
}

export function urlOutputPath(url,baseUrl) {
  const base=new URL(baseUrl); const target=new URL(url);
  if(target.origin!==base.origin) throw new Error(`URL outside output origin: ${url}`);
  const prefix=decodedPath(base.pathname).replace(/\/$/,'')+'/';
  const pathname=decodedPath(target.pathname);
  if(!pathname.startsWith(prefix)) throw new Error(`URL outside output base path: ${url}`);
  const relative=pathname.slice(prefix.length);
  return !relative?'index.html':relative.endsWith('/')?relative+'index.html':relative;
}

export async function readPageMap({repoRoot,publicDir,hugoCsv,sourceSha,clock,target,baseUrl}) {
  const result={schema:'blog-page-map/1',sourceSha,clock,target,baseUrl:new URL(baseUrl).href,complete:true,pages:[]};
  validateContract(result.schema,result);
  const converter=fileURLToPath(new URL('../content-page-map.py',import.meta.url));
  let rows;
  try {rows=JSON.parse(execFileSync('python3',[converter,'--csv',path.resolve(hugoCsv),'--base-url',result.baseUrl],{encoding:'utf8',maxBuffer:32*1024*1024}));}
  catch(error) {throw new Error(`Hugo CSV conversion failed: ${error.stderr?.toString() || error.message}`);}
  if(rows.length===0) result.complete=false;
  const files=await outputFiles(publicDir); const htmls=files.filter(f=>f.endsWith('.html')); const available=new Set(htmls); const mapped=new Map();
  for(const row of rows) {
    await safeFile(repoRoot,row.source);
    const outputPath=urlOutputPath(row.url,result.baseUrl);
    if(mapped.has(outputPath)) throw new Error(`Ambiguous Hugo output: ${outputPath}`);
    if(!available.has(outputPath)) {result.complete=false;continue;}
    mapped.set(outputPath,row);
  }
  for(const outputPath of htmls) {
    const html=await fs.readFile(await safeFile(publicDir,outputPath),'utf8');
    const row=mapped.get(outputPath);
    const relative=outputPath==='index.html'?'':outputPath.replace(/index\.html$/,'');
    const url=new URL(relative,result.baseUrl.endsWith('/')?result.baseUrl:result.baseUrl+'/').href;
    const alias=htmlElements(parse(html)).some(node=>node.tagName==='meta' && attribute(node,'http-equiv')?.toLowerCase()==='refresh');
    result.pages.push({source:row?.source ?? null,url:row?.url ?? url,outputPath,lang:row?.lang ?? (relative.startsWith('zh/')?'zh':'en'),kind:row?.kind ?? (alias?'alias':'output'),contentHash:createHash('sha256').update(html).digest('hex'),rendered:renderedPageData(html,row?.url??url)});
  }
  if(htmls.length===0) result.complete=false;
  validateContract(result.schema,result); return result;
}
