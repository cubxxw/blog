import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateContract } from './ci-contracts.mjs';

const suites = ['source','output','browser','interactive','functions','seo','workflow'];
const SHA = /^[0-9a-f]{40}$/;
const article = file => /^content\/(en|zh)\/.+\.md$/.test(file) && !/\/(AGENTS|CLAUDE)\.md$/.test(file);
const observation = file => /^data\/seo\/(?:gsc|psi|crux)-\d{4}-\d{2}-\d{2}(?:-[A-Za-z0-9-]+)?\.json$/.test(file);
export const isBookkeeping = file => /^(?:docs\/|README\.md$|CLAUDE\.md$|AGENTS\.md$|config\/newsletter-state\.json$)/.test(file) || observation(file);
const validationOnly = file => /^(?:tests\/|scripts\/.+\.test\.mjs$)/.test(file);

export function classifyChanges({files,historyComplete}) {
  if (!historyComplete) return {fullScan:true,suites:[...suites],publish:true,reason:'History unavailable or non-ancestral; full verification required'};
  const paths=files.flatMap(f=>[f.path,f.oldPath].filter(Boolean));
  const relevant=paths.filter(f=>!isBookkeeping(f));
  if (!relevant.length) return {fullScan:false,suites:paths.some(observation)?['seo']:['workflow'],publish:false,reason:'Only maintenance or observation inputs changed'};
  const removed=files.some(f=>f.status==='D'||f.status.startsWith('R')||f.oldPath);
  if (!removed && relevant.every(article)) return {fullScan:false,suites:['source','output','browser'],publish:true,reason:'Targeted article and existing translation validation'};
  return {fullScan:true,suites:[...suites],publish:!relevant.every(validationOnly),reason:removed?'Deletion/rename requires backlink and route coverage':'Shared or unclassified inputs require full verification'};
}
function git(repoRoot,args) { return execFileSync('git',['-C',repoRoot,...args],{encoding:'utf8',maxBuffer:32*1024*1024,stdio:['ignore','pipe','pipe']}); }
function assertSha(sha) { if(!SHA.test(sha ?? ''))throw new Error('Expected a full 40-character commit SHA'); }
function tracked(repoRoot,sha) { return git(repoRoot,['ls-tree','-rz','--full-tree',sha]).split('\0').filter(Boolean).map(row=>{const tab=row.indexOf('\t');return {meta:row.slice(0,tab),path:row.slice(tab+1)};}); }
function ancestor(repoRoot,base,head) { try{git(repoRoot,['merge-base','--is-ancestor',base,head]);return true;}catch{return false;} }
function diffFiles(repoRoot,base,head) {
  const tokens=git(repoRoot,['diff','--name-status','-z','--find-renames',base,head,'--']).split('\0');
  const files=[];
  for(let i=0;i<tokens.length && tokens[i];) {
    const status=tokens[i++];
    if(/^[RC]/.test(status)){const oldPath=tokens[i++],file=tokens[i++];files.push({status:status[0],oldPath,path:file});}
    else files.push({status,oldPath:null,path:tokens[i++]});
  }
  return files;
}
export async function resolveChangeSet({repoRoot,eventPath,headSha}) {
  assertSha(headSha);
  git(repoRoot,['cat-file','-e',`${headSha}^{commit}`]);
  const event=eventPath?JSON.parse(readFileSync(eventPath,'utf8')):{};
  let baseSha=null;
  if(event.pull_request) {
    const target=event.pull_request.base?.sha;
    if(SHA.test(target ?? '')){try{baseSha=git(repoRoot,['merge-base',target,headSha]).trim();}catch{/* full scan */}}
  } else if(SHA.test(event.before ?? '') && !/^0+$/.test(event.before) && ancestor(repoRoot,event.before,headSha)) baseSha=event.before;
  const inventory=tracked(repoRoot,headSha);
  const names=new Set(inventory.map(f=>f.path));
  const files=baseSha?diffFiles(repoRoot,baseSha,headSha):inventory.map(f=>({status:'A',path:f.path,oldPath:null}));
  const classification=classifyChanges({files,historyComplete:baseSha!==null});
  const selected=new Set(classification.fullScan?inventory.filter(f=>article(f.path)).map(f=>f.path):files.filter(f=>f.status!=='D' && article(f.path)).map(f=>f.path));
  for(const file of [...selected]){
    const translated=file.replace(/^content\/(en|zh)\//,(_,lang)=>`content/${lang==='en'?'zh':'en'}/`);
    if(names.has(translated))selected.add(translated);
  }
  const result={schema:'blog-change-set/1',sourceSha:headSha,baseSha,files,sourceFiles:[...selected].sort(),...classification};
  validateContract(result.schema,result);
  return result;
}
export function publicationInputDigest({repoRoot,sha}) {
  assertSha(sha);
  const records=tracked(repoRoot,sha).filter(f=>!isBookkeeping(f.path)&&!validationOnly(f.path));
  return createHash('sha256').update(records.map(f=>`${f.meta}\t${f.path}\0`).join('')).digest('hex');
}
