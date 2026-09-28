import test from 'node:test';
import assert from 'node:assert/strict';
import { probeLiveSite } from './lib/live-site-probes.mjs';
const pageMap={pages:[{url:'https://cubxxw.com/',outputPath:'index.html',source:null,kind:'home'},{url:'https://cubxxw.com/new/',outputPath:'new/index.html',source:'content/en/engineering/posts/new.md',kind:'page'}]};
const changeSet={baseSha:'a'.repeat(40),fullScan:false,files:[{status:'M',path:'content/en/engineering/posts/new.md'}]};
const html={
  'index.html':'<html><head><link rel="canonical" href="https://cubxxw.com/"></head></html>',
  'new/index.html':'<html><head><link rel="canonical" href="https://cubxxw.com/new/"><link rel="stylesheet" href="/assets/app.css"></head></html>',
};
function options({missing=false,assetType='text/css',robots=''}={}){return {pageMap,changeSet,readExpected:async p=>html[p.outputPath],fetch:async(url,init)=>{
  assert.equal(init.headers?.Authorization,undefined);
  if(url.endsWith('.css'))return new Response(null,{status:200,headers:{'content-type':assetType}});
  if(url.endsWith('/new/')&&missing)return new Response('missing',{status:404});
  return new Response(url.endsWith('/new/')?html['new/index.html']:html['index.html'],{status:200,headers:{'content-type':'text/html','x-robots-tag':robots}});
}};}
test('changed pages must be available, not only fixed homepage probes',async()=>{
  assert.equal((await probeLiveSite(options({missing:true}))).ok,false);
});
test('referenced stylesheet rewritten to HTML or a production noindex header fails',async()=>{
  assert.equal((await probeLiveSite(options({assetType:'text/html'}))).ok,false);
  assert.equal((await probeLiveSite(options({robots:'noindex'}))).ok,false);
});
test('verified changed-page markup and typed assets pass without provider calls',async()=>{
  const result=await probeLiveSite(options());assert.equal(result.ok,true);assert.ok(result.resources.some(r=>r.endsWith('/assets/app.css')));
});
test('a full inventory excludes the intentionally HTTP-404 error documents',async()=>{
  const opts=options();opts.changeSet={...changeSet,baseSha:null};opts.pageMap={pages:[...pageMap.pages,{url:'https://cubxxw.com/404.html',outputPath:'404.html',source:null,kind:'output'}]};
  assert.equal((await probeLiveSite(opts)).ok,true);
});
