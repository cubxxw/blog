import {safeURL} from './state.mjs';

export function browserBookmarks(products,origin){
 const seen=new Set();
 return (products||[]).flatMap(product=>{
  const url=safeURL(product.url||product.github,origin);
  if(!url||seen.has(product.id))return [];
  seen.add(product.id);return [{...product,url,host:new URL(url).hostname,embed:product.embed===true}];
 });
}
export function browserDestination(value,bookmarks,origin){
 const raw=String(value||'');
 if(/[\u0000-\u001f\\]/.test(raw)||raw.startsWith('//'))return {kind:'invalid'};
 const text=raw.trim();if(!text)return {kind:'home',url:'',title:''};
 const input=/^[a-z][\w+.-]*:/i.test(text)||text.startsWith('/')?text:'https://'+text;
 const url=safeURL(input,origin);if(!url)return {kind:'invalid'};
 const target=new URL(url),project=bookmarks.find(p=>new URL(p.url).origin===target.origin);
 const local=target.origin===new URL(origin).origin;
 // About and Start Here redirect to the room too. Reject these entrances
 // before creating an iframe, rather than loading a second world first.
 const recursive=local&&/^(?:\/(?:zh|en))?\/(?:projects(?:\/|$)|(?:about|start-here)\/?$)/.test(target.pathname);
 return {kind:!recursive&&(local||project?.embed)?'page':'external',url,title:project?.name||target.hostname,project};
}
export function createBrowserHistory(initial=''){
 let entries=[initial],index=0;
 return {current:()=>entries[index],canBack:()=>index>0,canForward:()=>index<entries.length-1,
  visit(url){if(url!==entries[index]){entries=entries.slice(0,index+1);entries.push(url);if(entries.length>40)entries.shift();index=entries.length-1;}return entries[index];},
  back(){index=Math.max(0,index-1);return entries[index];},forward(){index=Math.min(entries.length-1,index+1);return entries[index];}};
}
