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

function profileMigration({ destination='/projects/?profile=about', declared=true, corruptTarget=false, frozenTarget=true }={}) {
  const legacy='<html><head><link rel="canonical" href="https://cubxxw.com/projects/">'+(declared?'<meta name="robots" content="noindex, follow">':'')+'</head></html>';
  const target='<html><head><link rel="canonical" href="https://cubxxw.com/projects/"><link rel="stylesheet" href="/assets/space.css"></head></html>';
  const map={pages:[{url:'https://cubxxw.com/about/',outputPath:'about/index.html',source:'content/en/about.md',kind:'page'},...(frozenTarget?[{url:'https://cubxxw.com/projects/',outputPath:'projects/index.html',source:'content/en/projects/_index.md',kind:'section'}]:[])]};
  return {
    pageMap:map, changeSet:{baseSha:'a'.repeat(40),files:[{status:'M',path:'static/_redirects'}]},
    readExpected:async p=>p.outputPath==='about/index.html'?legacy:target,
    fetch:async(url)=>{
      if(new URL(url).pathname==='/about/')return new Response(null,{status:301,headers:{location:destination}});
      if(url.endsWith('.css'))return new Response(null,{status:200,headers:{'content-type':'text/css'}});
      return new Response(corruptTarget?target.replace('href="https://cubxxw.com/projects/"','href="https://cubxxw.com/wrong/"'):target,{status:200,headers:{'content-type':'text/html'}});
    },
  };
}

test('a retired noindex page can redirect to its declared canonical in the frozen inventory',async()=>{
  const result=await probeLiveSite(profileMigration());
  assert.equal(result.ok,true,JSON.stringify(result.errors));
  assert.ok(result.resources.includes('https://cubxxw.com/assets/space.css'));
});

test('canonical migrations still reject an undeclared target, a missing frozen target and altered target metadata',async()=>{
  for(const options of [{destination:'/wrong/'},{declared:false},{frozenTarget:false},{corruptTarget:true}]) {
    const result=await probeLiveSite(profileMigration(options));
    assert.equal(result.ok,false,JSON.stringify(options));
  }
});
