import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const source=readFileSync(new URL('../assets/js/search-palette.js',import.meta.url),'utf8');

// Run the complete shipped palette against its real DOM. Only index transport
// and fuzzy ranking are fixtures; URI parsing, rendering and native link values
// are the production code. Local previews retain the production absolute index.
async function palette({origin='http://127.0.0.1:4173',site='https://cubxxw.com',links}){
  const dom=new JSDOM(`<!doctype html><html lang="zh"><body>
    <button data-search-trigger="nav">Search</button>
    <div id="search-command-palette" data-ai-enabled="false" hidden>
      <input class="search-palette__input" value="Kubernetes">
      <ul id="search-results-list"></ul><span id="search-result-count"></span>
      <span id="search-result-summary" hidden></span><p id="search-empty" hidden></p>
      <a id="search-full-link" href="${site}/zh/search/">Full search</a>
    </div></body></html>`,{url:origin+'/zh/articles/',runScripts:'outside-only',pretendToBeVisual:true});
  const documents=links.map((permalink,index)=>({title:'Kubernetes '+index,permalink,summary:'',tags:[]}));
  dom.window.Fuse=class{constructor(documents){this.documents=documents;}search(){return this.documents.map(item=>({item}));}};
  dom.window.fetch=async()=>({ok:true,json:async()=>documents});
  dom.window.eval(source);dom.window.document.querySelector('[data-search-trigger]').click();
  for(let i=0;i<10;i++)await Promise.resolve();
  return {dom,document:dom.window.document,close:()=>dom.window.close()};
}

test('production index permalinks stay on the current preview origin without changing path, query or fragment',async()=>{
  const path='/zh/engineering/posts/雨夜/?q=a%20b&tag=Go#part-2',f=await palette({links:['https://cubxxw.com'+path]});
  try{
    const anchor=f.document.querySelector('[role="option"]');assert.ok(anchor);
    assert.equal(anchor.getAttribute('href'),new URL('https://cubxxw.com'+path).pathname+'?q=a%20b&tag=Go#part-2');
    assert.equal(new URL(anchor.href).origin,'http://127.0.0.1:4173');
    assert.equal(f.document.querySelector('#search-full-link').getAttribute('href'),'/zh/search/?q=Kubernetes');
  }finally{f.close();}
});

test('the declared site navigation origin works on alternate previews and on production itself',async()=>{
  for(const origin of ['https://deploy-preview.example.test','https://author.example.test']){
    const f=await palette({origin,site:'https://author.example.test',links:['https://author.example.test/en/growth/posts/slow/?x=1#read']});
    try{assert.equal(f.document.querySelector('[role="option"]').getAttribute('href'),'/en/growth/posts/slow/?x=1#read');assert.equal(new URL(f.document.querySelector('[role="option"]').href).origin,origin);}finally{f.close();}
  }
});

test('true external origins remain external and unsafe protocols never become navigable results',async()=>{
  const f=await palette({links:['https://outside.test/zh/articles/?source=search#one','https://cubxxw.com.outside.test/zh/articles/','javascript:alert(1)','data:text/html,hello','/zh/growth/posts/slow/']});
  try{assert.deepEqual([...f.document.querySelectorAll('[role="option"]')].map(a=>a.getAttribute('href')),['https://outside.test/zh/articles/?source=search#one','https://cubxxw.com.outside.test/zh/articles/','#','#','/zh/growth/posts/slow/']);}finally{f.close();}
});

test('the no-result full-search destination also stays in the same reading origin',async()=>{
  const f=await palette({links:[]});try{const full=f.document.querySelector('#search-full-link');assert.equal(new URL(full.href).origin,'http://127.0.0.1:4173');assert.equal(new URL(full.href).pathname,'/zh/search/');assert.equal(new URL(full.href).searchParams.get('q'),'Kubernetes');}finally{f.close();}
});
