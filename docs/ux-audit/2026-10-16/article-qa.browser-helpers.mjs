import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const dir='docs/ux-audit/2026-10-16',out=dir+'/evidence',origin='http://127.0.0.1:1317';
export async function verify(prefix){const m=JSON.parse(await fs.readFile(`${out}/${prefix}-source.json`,'utf8'));for(const[f,h]of Object.entries(m.files))assert.equal(createHash('sha256').update(await fs.readFile(f)).digest('hex'),h,f);return m;}
export async function setup(browser,view){
 const context=await browser.newContext({viewport:{width:view.width,height:view.height},reducedMotion:view.motion,hasTouch:!!view.coarse,isMobile:!!view.coarse,serviceWorkers:'block'});
 await context.addInitScript(dark=>{
  if(location.origin!=='http://127.0.0.1:1317')return;localStorage.setItem('pref-theme',dark?'dark':'light');
  const original=window.fetch.bind(window),encoder=new TextEncoder();
  window.__articleQA={turns:[],event(i,payload){const t=this.turns[i];try{t.controller.enqueue(encoder.encode('data: '+JSON.stringify(payload)+'\n\n'));return true;}catch{return false;}},done(i){try{this.turns[i].controller.enqueue(encoder.encode('data: [DONE]\n\n'));return true;}catch{return false;}}};
  window.fetch=(input,options)=>{
   if(new URL(String(input),location.href).pathname!=='/.netlify/functions/article-ai')return original(input,options);
   const turn={payload:JSON.parse(String(options?.body)),aborts:0,cancels:0,method:options?.method,started:performance.now()};window.__articleQA.turns.push(turn);
   options?.signal?.addEventListener('abort',()=>{turn.aborts++;},{once:true});
   return Promise.resolve(new Response(new ReadableStream({start(c){turn.controller=c;},cancel(){turn.cancels++;}}),{headers:{'Content-Type':'text/event-stream'}}));
  };
 },view.dark);
 const denied=[],errors=[];
 await context.route('**/.netlify/functions/**',r=>{denied.push({method:r.request().method(),url:r.request().url()});return r.fulfill({status:503,contentType:'application/json',body:'{}'});});
 await context.route('**/*',r=>{const host=new URL(r.request().url()).hostname;if(/(^|\.)(googletagmanager|google-analytics)\.com$/.test(host))return r.fulfill({status:200,contentType:'application/javascript',body:''});return r.fallback();});
 const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 const route=(view.locale==='zh'?'/zh':'')+'/engineering/posts/use-go-tools-dlv/';await page.goto(origin+route,{waitUntil:'load'});
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('link[as=style]')).every(l=>l.relList.contains('stylesheet')),{},{polling:100,timeout:15000});await page.evaluate(()=>document.fonts.ready);
 await page.locator('[data-article-chat][data-chat-ready="true"]').waitFor({state:'attached'});
 await page.evaluate(()=>scrollTo({top:500,behavior:'instant'}));await frames(page);
 return{context,page,view,route,errors,denied};
}
export const root=p=>p.locator('[data-article-chat]');
export const input=p=>root(p).locator('.rc-ai-textarea');
export const messages=p=>root(p).locator('.rc-ai-messages');
export const frames=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
export async function openAI(p){if(await p.evaluate(()=>innerWidth<1200)){if(!await p.locator('#article-bottom-sheet').evaluate(e=>e.classList.contains('abs--open')))await p.locator('#article-fab').click();await p.locator('#abs-tab-ai').click();}else await p.locator('#rc-tab-ai').click();await input(p).waitFor({state:'visible'});}
export async function remember(p){await p.evaluate(()=>{window.__origRoot=document.querySelector('[data-article-chat]');window.__origInput=window.__origRoot.querySelector('.rc-ai-textarea');window.__origMessages=window.__origRoot.querySelector('.rc-ai-messages');});}
export async function snap(p){return p.evaluate(()=>{
 const r=document.querySelector('[data-article-chat]'),i=r.querySelector('.rc-ai-textarea'),m=r.querySelector('.rc-ai-messages'),a=document.activeElement,s=document.querySelector('#article-bottom-sheet'),stop=r.querySelector('.article-chat-stop');
 const box=e=>e?.getBoundingClientRect().toJSON();const visible=e=>!!e?.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[hidden],[inert]');
 return{width:innerWidth,height:innerHeight,rootY:scrollY,hash:location.hash,history:history.length,host:r.parentElement.id,rootCount:document.querySelectorAll('[data-article-chat]').length,inputCount:document.querySelectorAll('[data-article-chat] textarea').length,busy:r.getAttribute('aria-busy'),originalIdentity:{root:r===window.__origRoot,input:i===window.__origInput,messages:m===window.__origMessages},value:i.value,selection:[i.selectionStart,i.selectionEnd,i.selectionDirection],focus:{tag:a.tagName,id:a.id,cls:a.className,originalInput:a===window.__origInput,visible:visible(a),insideAI:r.contains(a),inInert:!!a.closest('[inert]')},rootBox:box(r),inputBox:box(i),messages:{box:box(m),scrollTop:m.scrollTop,scrollHeight:m.scrollHeight,clientHeight:m.clientHeight,text:m.textContent.trim().slice(0,300)},stop:{visible:visible(stop),box:box(stop),disabled:stop?.disabled},overflow:{value:document.body.style.getPropertyValue('overflow'),priority:document.body.style.getPropertyPriority('overflow')},sheet:{open:s.classList.contains('abs--open'),inert:s.inert,ariaHidden:s.getAttribute('aria-hidden')},tabs:Object.fromEntries(['rc','abs'].map(prefix=>[prefix,Array.from(document.querySelectorAll('.'+prefix+'-tab[aria-selected="true"]')).map(e=>e.id)])),turns:window.__articleQA.turns.map(t=>({aborts:t.aborts,cancels:t.cancels,method:t.method,payload:{question:t.payload.question,language:t.payload.language,pagePath:t.payload.pagePath,context:t.payload.context,selectedText:t.payload.selectedText,selectionContext:t.payload.selectionContext,articleContentLength:t.payload.articleContent?.length,articleTitle:t.payload.articleTitle}})),overflowX:document.documentElement.scrollWidth>innerWidth};
 });}
export async function photo(p,prefix,name,images){const file=`${out}/${prefix}-${name}.png`;await p.screenshot({path:file,animations:'disabled'});images.push(file);return file;}
export async function resizeAI(p,width,height=900){await p.setViewportSize({width,height});await p.waitForFunction(()=>{const r=document.querySelector('[data-article-chat]');return r?.parentElement.id===(innerWidth<1200?'abs-panel-ai':'rc-panel-ai')&&r.contains(document.activeElement)&&!document.activeElement.closest('[hidden],[inert]');},{},{polling:100});await frames(p);}
export function sameOwner(s){assert.equal(s.rootCount,1);assert.equal(s.inputCount,1);assert(Object.values(s.originalIdentity).every(Boolean));assert(!s.overflowX);}
export async function send(p,text,index){await input(p).fill(text);await input(p).press('Enter');await p.waitForFunction(n=>window.__articleQA.turns.length===n,index+1,{polling:100});}
export async function answer(p,index,text,done=true){await p.evaluate(({index,text,done})=>{window.__articleQA.event(index,{delta:text});if(done)window.__articleQA.done(index);},{index,text,done});if(done)await p.waitForFunction(()=>document.querySelector('[data-article-chat]').getAttribute('aria-busy')==='false',{},{polling:100});}
export async function visibleParagraph(p){return messages(p).evaluate(m=>{const bounds=m.getBoundingClientRect();const ps=Array.from(m.querySelectorAll('.rc-ai-answer-body p'));const e=ps.find(p=>{const b=p.getBoundingClientRect();return b.top>=bounds.top&&b.bottom<=bounds.bottom;})||ps.find(p=>{const b=p.getBoundingClientRect();return b.bottom>bounds.top&&b.top<bounds.bottom;});return e?{text:e.textContent,offset:e.getBoundingClientRect().top-bounds.top,height:e.getBoundingClientRect().height}:null;});}
