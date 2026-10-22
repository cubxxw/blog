import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountApps } from '../assets/js/space/apps.js';
import { recentWriting } from '../assets/js/space/finder-home.js';

const turn=()=>new Promise(resolve=>setTimeout(resolve,5));
const links={email:'hello@example.test',github:'https://github.com/example',x:'https://x.com/example',zhihu:'https://zhihu.com/example',linkedin:'https://linkedin.com/in/example',bilibili:'https://bilibili.com/example',youtube:'https://youtube.com/example',instagram:'https://instagram.com/example',polarsteps:'https://polarsteps.com/example',whatsapp:'https://wa.me/123'};
function fixture({app='notes',fetchImpl=async()=>new Response(JSON.stringify({available:false})),saved=true,articles=[],language='zh'}={}) {
  const dom=new JSDOM(`<main data-bear-workspace data-world-renderer="jiangnan" data-computer-view="expanded"><section data-space-window="${app}"><div data-host></div></section></main>`,{url:'https://blog.test/zh/projects/',pretendToBeVisual:true}),previous=new Map();
  const globals={window:dom.window,document:dom.window.document,location:dom.window.location,localStorage:dom.window.localStorage,DOMParser:dom.window.DOMParser,CustomEvent:dom.window.CustomEvent,AbortController:dom.window.AbortController,MutationObserver:dom.window.MutationObserver,requestAnimationFrame:dom.window.requestAnimationFrame.bind(dom.window),cancelAnimationFrame:dom.window.cancelAnimationFrame.bind(dom.window),fetch:fetchImpl};
  for(const [key,value] of Object.entries(globals)){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});}
  const root=dom.window.document.querySelector('main'),host=root.querySelector('[data-host]'),calls=[];
  let canSave=saved;const state={note:'原来的笔记',draft:'',favorites:[],theme:'light',wallpaper:'dawn',windows:[{app,id:app}],active:app};
  const catalog={language,articles,readingDocuments:[],products:[],photos:[],places:[],books:[],links};
  const apps=mountApps({root,catalog,getState:()=>state,getContext:()=>null,getStorageStatus:()=>canSave,icon:()=>'',notify:()=>{},execute:(name,args)=>{calls.push({name,args});if(name==='draft')state.draft=args.text;return '[exit 0 · /workspace]';},updateNote:text=>{state.note=text;return canSave;}});
  apps.render({id:app,app,payload:''},host);
  return{dom,root,host,state,apps,calls,setSaved:value=>{canSave=value;},cleanup(){apps.dispose(app);dom.window.close();for(const [key,descriptor]of previous)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];}};
}

test('Finder lists the actual three latest local articles and escapes their titles',()=>{
  const articles=[{url:'/old/',title:'old',date:'2025.12.01'},{url:'/latest/',title:'<img src=x onerror=alert(1)>',date:'2026.10.22'},{url:'/middle/',title:'middle',date:'2026-10-20'},{url:'/third/',title:'third',date:'2026.10.19'},{url:'javascript:alert(1)',title:'bad',date:'2099.01.01'}];
  assert.deepEqual(recentWriting(articles).map(article=>article.url),['/latest/','/middle/','/third/']);
  const f=fixture({app:'welcome',articles});try{
    assert.equal(f.host.querySelectorAll('.space-finder-home__item').length,6);
    assert.equal(f.host.querySelectorAll('.space-finder-recent [data-payload]').length,3);
    assert.equal(f.host.querySelector('.space-finder-recent strong').textContent,articles[1].title);
    assert.equal(f.host.querySelectorAll('.space-finder-recent img').length,0);
    assert.equal(f.host.querySelector('[data-space-launchpad-trigger]').textContent,'所有应用');
    const search=f.host.querySelector('[data-space-search-trigger]');assert.equal(search.getAttribute('aria-label'),'搜索工作区');assert.equal(search.textContent,'');assert.ok(search.querySelector('svg[aria-hidden="true"]'));
    assert.doesNotMatch(f.host.textContent,/阅读进度|已读|继续阅读/);
  }finally{f.cleanup();}
});

test('Notes keeps export and real browser save status primary while sandbox checks stay lazy',async()=>{
  let requests=0;const f=fixture({fetchImpl:async()=>{requests++;return new Response(JSON.stringify({available:false}));}});try{
    assert.equal(requests,0);assert.ok(f.host.querySelector('.space-notes__toolbar [data-note-export]'));
    assert.equal(f.host.querySelector('.space-notes__toolbar [data-note-sandbox]'),null);
    const editor=f.host.querySelector('[data-note-editor]'),status=f.host.querySelector('[data-note-save]');
    assert.equal(editor.placeholder,'写下一点想法，下次继续。');
    editor.value='继续写下去';editor.dispatchEvent(new f.dom.window.Event('input'));assert.equal(f.state.note,editor.value);assert.equal(status.dataset.saved,'true');
    f.setSaved(false);editor.dispatchEvent(new f.dom.window.Event('input'));assert.equal(status.dataset.saved,'false');assert.match(status.textContent,/未能保存.*导出/);
    f.host.querySelector('details').open=true;await turn();await turn();assert.equal(requests,1);
    const save=f.host.querySelector('[data-note-sandbox]');assert.equal(save.disabled,true);assert.match(f.host.querySelector('[data-note-runtime]').textContent,/未连接/);
    save.dispatchEvent(new f.dom.window.Event('click'));await turn();assert.equal(f.calls.length,0);assert.equal(editor.value,'继续写下去');
  }finally{f.cleanup();}
});

test('English Notes and Finder expose the same concise prompt and accessible search action',()=>{
  const note=fixture({language:'en'});try{assert.equal(note.host.querySelector('[data-note-editor]').placeholder,'Write a little thought. Pick it up next time.');}finally{note.cleanup();}
  const home=fixture({app:'welcome',language:'en'});try{assert.equal(home.host.querySelector('[data-space-search-trigger]').getAttribute('aria-label'),'Search workspace');assert.equal(home.host.querySelector('[data-space-launchpad-trigger]').textContent,'All apps');}finally{home.cleanup();}
});

test('sandbox requires boolean true and rechecks availability before any command',async()=>{
  for(const response of [{available:'true'},{available:true}]){
    let requests=0;const f=fixture({fetchImpl:async()=>new Response(JSON.stringify(++requests===1?response:{available:false}))});try{
      f.host.querySelector('details').open=true;await turn();await turn();const save=f.host.querySelector('[data-note-sandbox]');
      if(response.available===true){assert.equal(save.disabled,false);save.click();await turn();assert.equal(requests,2);}
      else assert.equal(save.disabled,true);
      assert.equal(f.calls.length,0);assert.equal(save.disabled,true);
    }finally{f.cleanup();}
  }
});

test('closing Notes aborts its owned runtime check and ignores a late connection result',async()=>{
  let signal,finish;const f=fixture({fetchImpl:(_url,options)=>{signal=options.signal;return new Promise(resolve=>{finish=resolve;});}});try{
    f.host.querySelector('details').open=true;await turn();const old=f.host.querySelector('[data-note-sandbox]');assert.equal(signal.aborted,false);
    f.apps.dispose('notes');assert.equal(signal.aborted,true);finish(new Response(JSON.stringify({available:true})));await turn();assert.equal(old.disabled,true);
  }finally{f.cleanup();}
});

test('a confirmed sandbox copy remains distinct from a later browser edit',async()=>{
  const f=fixture({fetchImpl:async()=>new Response(JSON.stringify({available:true}))});try{
    f.host.querySelector('details').open=true;await turn();await turn();const button=f.host.querySelector('[data-note-sandbox]');button.click();button.click();await turn();await turn();
    assert.equal(f.calls.length,1);assert.equal(f.calls[0].name,'run');assert.match(f.host.querySelector('[data-note-runtime]').textContent,/副本已保存/);
    const editor=f.host.querySelector('[data-note-editor]');editor.value='只更新浏览器';editor.dispatchEvent(new f.dom.window.Event('input'));
    assert.match(f.host.querySelector('[data-note-runtime]').textContent,/未同步/);assert.equal(f.host.querySelector('[data-note-save]').dataset.saved,'true');
  }finally{f.cleanup();}
});

test('Settings puts export and display before language and synchronizes existing nodes without claiming focus',async()=>{
  const f=fixture({app:'settings'});try{
    const exportButton=f.host.querySelector('[data-space-export]'),language=f.host.querySelector('[data-set-language]'),display=f.host.querySelector('[data-computer-display="expanded"]'),runtime=f.host.querySelector('[data-runtime-status]');
    assert.ok(exportButton.compareDocumentPosition(language)&f.dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
    assert.ok(display.compareDocumentPosition(language)&f.dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
    assert.equal(display.getAttribute('aria-pressed'),'true');f.root.dataset.computerView='framed';await turn();assert.equal(display.getAttribute('aria-pressed'),'false');
    const active=f.host.querySelector('[data-set-theme="light"]');active.focus();f.state.theme='dark';f.root.dispatchEvent(new f.dom.window.CustomEvent('bear:workspace-change',{detail:{type:'theme'}}));
    assert.equal(f.dom.window.document.activeElement,active);assert.equal(f.host.querySelector('[data-runtime-status]'),runtime);
    assert.equal(f.host.querySelector('[data-set-theme="dark"]').getAttribute('aria-pressed'),'true');await turn();assert.match(runtime.textContent,/未连接/);
  }finally{f.cleanup();}
});

test('Contact presents real primary channels before social links and keeps draft destinations synchronized',()=>{
  const f=fixture({app:'contact'});try{
    const email=f.host.querySelector('[data-contact-email]'),draft=f.host.querySelector('[data-message-draft]'),social=f.host.querySelector('.space-contact-links');
    assert.ok(email.compareDocumentPosition(draft)&f.dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
    assert.ok(draft.compareDocumentPosition(social)&f.dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
    draft.value='一封尚未发送的信 & #内容';draft.dispatchEvent(new f.dom.window.Event('input'));
    assert.equal(new URL(email.href).searchParams.get('body'),draft.value);assert.equal(f.host.querySelectorAll('.space-contact-links a').length,8);
    assert.deepEqual(f.calls,[{name:'draft',args:{text:draft.value}}]);
  }finally{f.cleanup();}
});

test('reader heading anchors receive a real accessible section destination after sanitization',async()=>{
  const article={url:'/zh/article/',title:'Title',date:'2026.10.22',section:'engineering'};
  const f=fixture({app:'reader',articles:[article],fetchImpl:async()=>new Response('<div class="post-content"><h2 id="section">章节<a hidden class="anchor" aria-hidden="true" href="#section">#</a></h2><p>内容</p></div>')});try{
    f.apps.render({id:'reader',app:'reader',payload:article.url},f.host);await turn();const anchor=f.host.querySelector('.anchor');
    assert.ok(anchor);assert.equal(anchor.getAttribute('aria-label'),'在原文中打开这一节：章节');assert.equal(anchor.target,'_blank');assert.equal(anchor.href,'https://blog.test/zh/article/#section');assert.equal(anchor.hidden,false);
  }finally{f.cleanup();}
});
