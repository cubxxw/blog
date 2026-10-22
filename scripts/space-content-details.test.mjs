import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountAgent, planArticleActions } from '../assets/js/space/agent-panel.js';
import { createSessionStore } from '../assets/js/space/agent-sessions.mjs';
import { mountMedia } from '../assets/js/space/media.js';
import { contextualQuestion, publicFocus } from '../assets/js/space/companion.mjs';

const article = { title: '<img src=x onerror=alert(1)> · OpenClaw', url: '/zh/ai-agent/posts/openclaw/', date: '2026-10-22' };
const catalog = { language: 'zh', articles: [article], photos: [], products: [], places: [] };
const record = answer => ({ id: 'existing-task', question: '推荐一篇文章', answer, status: 'completed', steps: [], startedAt: '2026-10-22T10:00:00Z', endedAt: '2026-10-22T10:01:00Z', stopReason: 'answered' });

function fixture({ touch = false, answer, draft, context, catalogSource = catalog, windows = [], fetchImpl } = {}) {
  const dom = new JSDOM('<main data-bear-workspace><section data-space-window="agent"><div data-host></div></section></main>', { url: 'https://blog.test/zh/projects/' });
  const previous = new Map();
  for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document, location: dom.window.location, localStorage: dom.window.localStorage, DOMParser: dom.window.DOMParser, CustomEvent: dom.window.CustomEvent, AbortController: dom.window.AbortController, getComputedStyle: dom.window.getComputedStyle.bind(dom.window), matchMedia: () => ({ matches: touch, addEventListener() {}, removeEventListener() {} }), ...(fetchImpl ? { fetch: fetchImpl } : {}) })) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  dom.window.HTMLElement.prototype.scrollIntoView = function () {};
  const storage = createSessionStore({ storage: dom.window.localStorage });
  if (answer) storage.saveTask(storage.active().id, record(answer));
  if (draft) storage.saveDraft(storage.active().id, draft);
  const host = dom.window.document.querySelector('[data-host]'), calls = [];
  const execute = (name, args) => { calls.push({ name, args }); windows.push({ app: args.app, payload: args.payload }); return 'Opened reader.'; };
  const dispose = mountAgent({ host, catalog:catalogSource, execute, getState: () => ({ windows }), getContext:()=>context });
  return { dom, host, calls, cleanup() { dispose(); for (const [name, descriptor] of previous) descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name]; dom.window.close(); } };
}
const turn = () => new Promise(resolve => setImmediate(resolve));

test('article actions accept exact catalog references and refuse external, unknown, credentialed and script targets', () => {
  const path = article.url;
  assert.deepEqual(planArticleActions(`推荐：\`${path}\` 和 [同一篇](https://blog.test${path}#read)。`, catalog, 'https://blog.test'), [{ url: path, title: article.title, date: article.date }]);
  assert.equal(planArticleActions(`推荐：${path}，可以直接阅读。`, catalog, 'https://blog.test')[0]?.url, path);
  for (const text of [
    'https://evil.test' + path,
    '//evil.test' + path,
    '[推荐](javascript:alert(1))',
    'javascript:' + path,
    '[推荐](https://blog.test@evil.test' + path + ')',
    '[推荐](https://visitor:password@blog.test' + path + ')',
    '/zh/ai-agent/posts/invented/',
    '/zh/ai-agent/posts/openclaw-extra/',
    '<img src="' + path + '" onerror="alert(1)">',
  ]) assert.deepEqual(planArticleActions(text, catalog, 'https://blog.test'), [], text);
  assert.deepEqual(planArticleActions(path, { articles: [{ title: 'External', url: 'https://evil.test' + path }] }, 'https://blog.test'), []);
});

test('restored article action uses the existing reader executor without model calls and retains conversation content', async () => {
  const f = fixture({ answer: `文章地址：${article.url}\n<script>alert(1)</script>`, fetchImpl: () => { throw Error('No model turn should run'); } });
  try {
    const action = f.host.querySelector('[data-agent-article]');
    assert.ok(action); assert.equal(action.querySelector('strong').textContent, article.title);
    assert.equal(f.host.querySelectorAll('script,img').length, 0);
    action.click(); await turn();
    assert.deepEqual(f.calls, [{ name: 'open', args: { app: 'reader', payload: article.url } }]);
    assert.match(f.host.querySelector('[data-agent-status]').textContent, /文章已打开/);
    assert.match(f.host.querySelector('[data-chat-log]').textContent, /推荐一篇文章/);
    assert.equal(createSessionStore({ storage: f.dom.window.localStorage }).active().tasks.length, 1);
  } finally { f.cleanup(); }
});

test('reader window capacity failure remains actionable and never claims that the article opened', async () => {
  const f = fixture({ answer: article.url, windows: Array.from({ length: 16 }, (_, i) => ({ app: 'other-' + i })) });
  try {
    const action = f.host.querySelector('[data-agent-article]'); action.click(); await turn();
    assert.equal(f.calls.length, 0); assert.equal(action.disabled, false);
    assert.match(f.host.querySelector('[data-agent-status]').textContent, /未能打开/);
  } finally { f.cleanup(); }
});

test('touch Return creates no task; the explicitly labelled prompt starts exactly one task and blocks repeated taps', async () => {
  let requests = 0, release;
  const pending = new Promise(resolve => { release = resolve; });
  const f = fixture({ touch: true, fetchImpl: async () => { requests++; await pending; return new Response(JSON.stringify({ message: '已经找到一篇文章。', toolCalls: [] }), { headers: { 'Content-Type': 'application/json' } }); } });
  try {
    const status = f.host.querySelector('[data-agent-status]');
    assert.match(status.textContent, /点击 ↑ 发送 · 回车换行/); assert.doesNotMatch(status.textContent, /Ctrl|⌘|Enter/);
    const input = f.host.querySelector('textarea'); input.value = '先写两行';
    const enter = new f.dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input.dispatchEvent(enter); assert.equal(enter.defaultPrevented, false); assert.equal(requests, 0);
    const prompt = f.host.querySelector('[data-agent-prompt]');
    assert.match(prompt.getAttribute('aria-label'), /立即提问/); assert.match(f.host.querySelector('.bear-agent__prompt-hint').textContent, /立即/);
    prompt.click(); prompt.click(); await turn();
    assert.equal(requests, 1); assert.equal(prompt.disabled, true); assert.equal(f.host.querySelector('[data-agent-stop]').hidden, false);
    release(); await turn(); await turn();
    assert.equal(prompt.disabled, false); assert.equal(f.host.querySelector('[data-agent-stop]').hidden, true);
  } finally { release(); await turn(); f.cleanup(); }
});

test('the source strip renders existing context as text, expands without requests and leaves the submitted payload unchanged',async()=>{
  const requests=[],question='解释下面选中的段落。';
  const focus={kind:'article',title:article.title,reference:article.url};
  const selection='<img src=x onerror=alert(1)>\n'+('公开选段。'.repeat(300));
  const f=fixture({fetchImpl:async(_url,options)=>{requests.push(JSON.parse(options.body));return new Response(JSON.stringify({message:'测试回答。',toolCalls:[]}),{headers:{'Content-Type':'application/json'}});}});
  try{
    f.host.closest('[data-bear-workspace]').dispatchEvent(new f.dom.window.CustomEvent('bear:agent-prefill',{detail:{focus,selection,question}}));
    assert.equal(f.host.querySelector('[data-agent-context-bar]').hidden,false);assert.match(f.host.querySelector('[data-agent-context-title]').textContent,/选中文字/);
    assert.equal(f.host.querySelector('[data-agent-context-reference]').textContent,article.url);assert.equal(f.host.querySelector('[data-agent-context-quote]').textContent,selection.slice(0,1200));assert.equal(f.host.querySelectorAll('img,script').length,0);
    const details=f.host.querySelector('[data-agent-context-details]'),toggle=f.host.querySelector('[data-agent-context-toggle]');toggle.click();assert.equal(details.open,true);assert.equal(requests.length,0);
    toggle.dispatchEvent(new f.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(details.open,false);assert.equal(f.dom.window.document.activeElement,toggle);
    f.host.querySelector('[data-agent-send]').click();await turn();await turn();assert.equal(requests.length,1);assert.equal(requests[0].messages.at(-1).content,contextualQuestion(question,focus,selection));assert.equal(f.host.querySelector('[data-agent-start]'),null);
    f.host.querySelector('[data-agent-context]').click();assert.equal(f.host.querySelector('[data-agent-context-bar]').hidden,true);assert.equal(f.host.querySelector('[data-agent-context-quote]').textContent,'');assert.equal(requests.length,1);
  }finally{await turn();f.cleanup();}
});

test('an old selection draft never invents a source; empty-conversation actions open the real library and latest article without a provider',async()=>{
  let requests=0;const f=fixture({draft:'解释下面选中的段落。',fetchImpl:()=>{requests++;throw Error('These workspace actions do not call a provider');}});
  try{
    assert.equal(f.host.querySelector('[data-agent-context-bar]').hidden,true);assert.match(f.host.querySelector('[data-agent-start-hint]').textContent,/没有附带原文/);
    assert.equal(f.host.querySelectorAll('.bear-agent__start-actions button').length,2);
    f.host.querySelector('[data-agent-browse]').click();await turn();f.host.querySelector('[data-agent-latest]').click();await turn();
    assert.deepEqual(f.calls,[{name:'open',args:{app:'reader',payload:''}},{name:'open',args:{app:'reader',payload:article.url}}]);assert.equal(requests,0);
    assert.equal(f.host.querySelector('[data-agent-input]').value,'解释下面选中的段落。');assert.equal(f.host.querySelectorAll('[data-agent-task]').length,0);
  }finally{f.cleanup();}
});

test('a restored passage draft cannot inherit current reader B; explicit selection A and ordinary drafts keep their own context semantics',async()=>{
  const currentB={title:'Current reader B',url:'/zh/engineering/posts/current-b/'},source={...catalog,articles:[article,currentB]};
  const contextB=publicFocus({active:'reader',windows:[{id:'reader',app:'reader',payload:currentB.url}]},source);
  for(const question of ['解释下面选中的段落。','Explain this selected passage.']){
    const requests=[],f=fixture({draft:question,context:contextB,catalogSource:source,fetchImpl:async(_url,options)=>{requests.push(JSON.parse(options.body));return new Response(JSON.stringify({message:'Fixture answer.',toolCalls:[]}),{headers:{'Content-Type':'application/json'}});}});
    try{
      assert.equal(f.host.querySelector('[data-agent-context-bar]').hidden,true);assert.equal(f.host.querySelector('[data-agent-context-title]').textContent,'');assert.equal(f.host.querySelector('[data-agent-context-quote]').textContent,'');assert.match(f.host.querySelector('[data-agent-start-hint]').textContent,/没有附带原文/);
      // A focus-only refresh cannot turn reader B into the old missing passage.
      f.host.closest('[data-bear-workspace]').dispatchEvent(new f.dom.window.CustomEvent('bear:agent-prefill',{detail:{focus:contextB,question}}));
      assert.equal(f.host.querySelector('[data-agent-context-bar]').hidden,true);
      f.host.querySelector('[data-agent-send]').click();await turn();await turn();assert.equal(requests.length,1);assert.equal(requests[0].messages.at(-1).content,question);assert.ok(!requests[0].messages.at(-1).content.includes(currentB.url));
    }finally{await turn();f.cleanup();}
  }
  for(const explicitSelection of [false,true]){
    const requests=[],question=explicitSelection?'解释下面选中的段落。':'我想了解这篇文章的主要观点。';
    const f=fixture({draft:question,context:contextB,catalogSource:source,fetchImpl:async(_url,options)=>{requests.push(JSON.parse(options.body));return new Response(JSON.stringify({message:'Fixture answer.',toolCalls:[]}),{headers:{'Content-Type':'application/json'}});}});
    try{
      const contextA={kind:'article',title:article.title,reference:article.url},selection='真实的新选段 A。';
      if(explicitSelection)f.host.closest('[data-bear-workspace]').dispatchEvent(new f.dom.window.CustomEvent('bear:agent-prefill',{detail:{focus:contextA,selection,question}}));
      assert.equal(f.host.querySelector('[data-agent-context-bar]').hidden,false);
      f.host.querySelector('[data-agent-send]').click();await turn();await turn();assert.equal(requests[0].messages.at(-1).content,contextualQuestion(question,explicitSelection?contextA:contextB,explicitSelection?selection:''));
    }finally{await turn();f.cleanup();}
  }
});

test('photo detail fits the actual window, releases the old observer and leaves short windows scrollable', () => {
  const f = fixture(); let observers = [];
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {} disconnect() { this.disconnected = true; }
  }
  Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: Observer });
  const photoCatalog = { ...catalog, photos: [{ id: 'japan', title: 'A long journey', place: 'Kumano, Japan', region: 'japan', thumb: '/photo.webp', image: '/photo.webp' }], places: [{ id: 'japan', name: 'Japan', lon: 135, lat: 35 }] };
  const media = mountMedia({ catalog: photoCatalog, execute() {}, notify() {} });
  try {
    Object.defineProperty(f.host, 'clientHeight', { configurable: true, value: 300 });
    media.renderPhotos(f.host, 'japan', 'photo');
    const detail = f.host.querySelector('.sp-photo-detail');
    const reserved = [[f.host.querySelector('.sp-media-header'), 80], [detail.querySelector('nav'), 60], [detail.querySelector('figcaption'), 80], [detail.querySelector('.sp-media-hint'), 24], [detail.querySelector('[data-image-recovery]'), 60]];
    for (const [node, value] of reserved) Object.defineProperty(node, 'offsetHeight', { configurable: true, value });
    observers[0].callback(); assert.equal(detail.style.getPropertyValue('--photo-image-height'), '128px');
    Object.defineProperty(f.host, 'clientHeight', { configurable: true, value: 700 });
    observers[0].callback(); assert.equal(detail.style.getPropertyValue('--photo-image-height'), '388px');
    const header=f.host.querySelector('.sp-media-header');
    Object.defineProperty(header,'offsetHeight',{configurable:true,value:0});
    observers[0].callback();assert.equal(detail.style.getPropertyValue('--photo-image-height'),'460px');
    Object.defineProperty(header,'offsetHeight',{configurable:true,value:80});
    observers[0].callback();assert.equal(detail.style.getPropertyValue('--photo-image-height'),'388px');
    media.renderPhotos(f.host, '', 'photo'); assert.equal(observers[0].disconnected, true);
    assert.equal(f.host.querySelectorAll('[data-photo-filter]').length, 2);
  } finally { media.dispose('photo'); previous ? Object.defineProperty(globalThis, 'ResizeObserver', previous) : delete globalThis.ResizeObserver; f.cleanup(); }
});

test('photo selection and stepping start at the top; Back restores each gallery region and its scroll position', () => {
  const f=fixture();
  const photoCatalog={...catalog,places:[{id:'japan',name:'Japan',lon:135,lat:35}],photos:[
    {id:'one',title:'One',place:'Japan',region:'japan',thumb:'/one.webp',image:'/one.webp'},
    {id:'two',title:'Two',place:'Japan',region:'japan',thumb:'/two.webp',image:'/two.webp'},
    {id:'three',title:'Three',place:'Elsewhere',thumb:'/three.webp',image:'/three.webp'},
  ]};
  let media;media=mountMedia({catalog:photoCatalog,execute(_name,{payload}){media.renderPhotos(f.host,payload,'photo');},notify(){}});
  try{
    media.renderPhotos(f.host,'','photo');f.host.scrollTop=340;
    f.host.querySelector('[data-photo-filter="japan"]').click();assert.equal(f.host.scrollTop,0);
    f.host.scrollTop=160;f.host.querySelector('[data-photo-select="one"]').click();assert.equal(f.host.scrollTop,0);assert.equal(f.host.querySelector('h2').textContent,'One');
    f.host.scrollTop=75;f.host.querySelector('[data-photo-next]').click();assert.equal(f.host.scrollTop,0);assert.equal(f.host.querySelector('h2').textContent,'Two');
    f.host.scrollTop=90;f.host.querySelector('[data-photo-prev]').click();assert.equal(f.host.scrollTop,0);assert.equal(f.host.querySelector('h2').textContent,'One');
    f.host.querySelector('[data-photo-next]').click();assert.equal(f.host.querySelector('h2').textContent,'Two');
    const back=f.host.querySelector('[data-photo-back]');back.focus();back.click();
    assert.equal(f.host.scrollTop,160);assert.equal(f.host.querySelector('[data-photo-filter="japan"]').getAttribute('aria-pressed'),'true');assert.equal(f.dom.window.document.activeElement.dataset.photoSelect,'one');
    f.host.querySelector('[data-photo-filter="all"]').click();assert.equal(f.host.scrollTop,340);assert.equal(f.host.querySelectorAll('[data-photo-select]').length,3);
  }finally{media.dispose('photo');f.cleanup();}
});

test('map selection keeps its view, exposes the real story and photo route, and retains keyboard pin focus',()=>{
  const f=fixture(),calls=[];
  const mapCatalog={...catalog,articles:[{...article,description:'Japan travel',tags:[]}],places:[
    {id:'japan',name:'Japan',description:'A public travel story.',lon:138,lat:35,match:['Japan']},
    {id:'tibet',name:'Tibet',description:'Another public travel story.',lon:91,lat:29,match:['Tibet']},
  ],photos:[{id:'journey',title:'Mountain light',place:'Japan',region:'japan',thumb:'/journey.webp',image:'/journey.webp'}]};
  let media;media=mountMedia({catalog:mapCatalog,execute(name,args){calls.push({name,args});if(args.app==='map')media.renderMap(f.host,args.payload,'map');},notify(){}});
  try{
    media.renderMap(f.host,'japan','map');
    const current=()=>f.host.querySelector('[data-place-current]'),svg=()=>f.host.querySelector('[data-media-map]');
    assert.equal(current().dataset.placeCurrent,'japan');assert.match(current().textContent,/Japan/);assert.match(current().textContent,/1 张照片 · 1 篇写作/);
    const viewport=f.host.querySelector('[data-map-viewport]'),before=svg().getAttribute('viewBox');
    f.host.querySelector('[data-map-zoom="in"]').click();const zoomed=svg().getAttribute('viewBox');assert.notEqual(zoomed,before);
    viewport.dispatchEvent(new f.dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));const panned=svg().getAttribute('viewBox');assert.notEqual(panned,zoomed);
    const pin=f.host.querySelector('[data-map-pin="tibet"]');pin.focus();f.host.scrollTop=180;pin.dispatchEvent(new f.dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
    assert.equal(current().dataset.placeCurrent,'tibet');assert.equal(svg().getAttribute('viewBox'),panned);assert.equal(f.host.scrollTop,0);assert.equal(f.dom.window.document.activeElement.dataset.mapPin,'tibet');
    let reached=false;const detail=f.host.querySelector('.sp-place-detail');detail.scrollIntoView=()=>{reached=true;};
    f.host.querySelector('[data-place-story]').click();assert.equal(reached,true);assert.equal(f.dom.window.document.activeElement.textContent,'Tibet');
    f.host.querySelector('.sp-media-header [data-media-open="photos"]').click();assert.deepEqual(calls.at(-1),{name:'open',args:{app:'photos',payload:'region:tibet'}});
    f.host.querySelector('[data-map-reset]').click();assert.equal(svg().getAttribute('viewBox'),'0 0 720 360');
    assert.match(f.host.querySelector('.sp-media-footer').textContent,/不是照片 GPS/);assert.match(f.host.querySelector('.sp-media-footer a').href,/naturalearthdata\.com/);
  }finally{media.dispose('map');f.cleanup();}
});
