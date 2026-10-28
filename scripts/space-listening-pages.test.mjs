import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {listeningPageURL,listeningLinkURL,isListeningRoomURL} from '../assets/js/space/listening-pages.mjs';
import {mountListeningPages} from '../assets/js/space/listening-pages.js';

const base='https://blog.test/zh/projects/';
const primary={isTrusted:true,button:0,defaultPrevented:false,altKey:false,ctrlKey:false,metaKey:false,shiftKey:false};

test('only actual same-origin public HTML routes can enter the listening session',()=>{
  for(const path of ['/','/zh/','/zh/articles/','/en/engineering/posts/a/','/zh/lab-notes/','/zh/lab-notes/langchain/','/lab-notes/langgraph/','/zh/tags/Go/','/growth/posts/cafe.html?from=space'])assert.ok(listeningPageURL(path,base),path);
  for(const path of ['https://elsewhere.test/zh/articles/','//elsewhere.test/','javascript:alert(1)','data:text/html,hello','/admin/','/wp-admin/','/api/post','/.git/config','/audio/space/music.mp3','/engineering/posts/guide.pdf','/zh/engineering/%2e%2e/.secret/','/growth/%2Fprivate/','/engineering/posts/guide%2Epdf'])assert.equal(listeningPageURL(path,base),null,path);
  assert.equal(isListeningRoomURL('/zh/projects/?room=cafe',base),true);assert.equal(isListeningRoomURL('/projects/example/',base),false);assert.equal(isListeningRoomURL('/zh/projects/index.html',base),true);
});

test('normal trusted clicks enter while hashes, modifiers, downloads, targets and external links keep native semantics',()=>{
  const dom=new JSDOM('<a href="/zh/articles/">Articles</a>',{url:base}),a=dom.window.document.querySelector('a');
  assert.equal(listeningLinkURL(a,primary,base)?.pathname,'/zh/articles/');
  for(const changed of [{isTrusted:false},{button:1},{defaultPrevented:true},{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true}])assert.equal(listeningLinkURL(a,{...primary,...changed},base),null);
  for(const href of ['#reader','/zh/projects/#reader','/images/photo.jpg','mailto:a@example.test','https://elsewhere.test/']){a.href=href;assert.equal(listeningLinkURL(a,primary,base),null,href);}
  a.href='/zh/articles/';for(const attribute of ['download','target']){a.setAttribute(attribute,attribute==='target'?'_blank':'');assert.equal(listeningLinkURL(a,primary,base),null);a.removeAttribute(attribute);}
  a.rel='external';assert.equal(listeningLinkURL(a,primary,base),null);a.rel='';
  const target=dom.window.document.createElement('base');target.target='_blank';dom.window.document.head.append(target);assert.equal(listeningLinkURL(a,primary,base),null);dom.window.close();
});

// Real parent DOM/history/focus are exercised. Only the browser's child document
// navigation is replaced; jsdom does not implement iframe navigation itself.
function fixture(){
  const dom=new JSDOM('<!doctype html><title>Café</title><body><header><a href="/">Home</a></header><main id="room"><button id="seat">Seat</button><div id="audio"></div></main></body>',{url:base,pretendToBeVisual:true});
  const {window}=dom,document=window.document,root=document.querySelector('#room'),audio=document.querySelector('#audio'),seat=document.querySelector('#seat'),frames=[],children=[];
  seat.focus();const create=document.createElement.bind(document);
  document.createElement=(tag,...args)=>{
    const node=create(tag,...args);if(tag!=='iframe')return node;
    const child=new JSDOM('<!doctype html><title>Loading</title><body><h1 tabindex="-1">Article</h1></body>',{url:'about:blank'});children.push(child);
    const transport={document:child.window.document,location:{get href(){return child.window.location.href;},replace(url){child.reconfigure({url});}},focus(){},scrollX:0,scrollY:0,scrollTo(x,y){this.scrollX=x;this.scrollY=y;}};
    Object.defineProperty(node,'contentWindow',{get:()=>transport});Object.defineProperty(node,'contentDocument',{get:()=>transport.document});
    frames.push({node,transport,child});return node;
  };
  const states=[],controller=mountListeningPages({root,zh:true,onStateChange:state=>states.push(state),loadTimeout:1000});
  return {window,document,root,audio,seat,frames,states,controller,
    load(index,title='Real article',href=window.location.href){const f=frames[0];f.child.reconfigure({url:href});f.child.window.document.title=title;f.node.dispatchEvent(new window.Event('load'));return f;},
    async back(){window.history.back();await new Promise(resolve=>window.addEventListener('popstate',resolve,{once:true}));},
    async forward(){window.history.forward();await new Promise(resolve=>window.addEventListener('popstate',resolve,{once:true}));},
    restore(){controller.dispose();for(const child of children)child.window.close();dom.window.close();}};
}

test('an unused listening session has no connected child until its first valid public page',()=>{
  const f=fixture();try{
    const frame=f.frames[0].node,initialLength=f.window.history.length;
    assert.equal(frame.isConnected,false);assert.equal(f.document.querySelector('.space-listening-page iframe'),null);
    assert.equal(f.controller.open('/admin/'),false);assert.equal(f.controller.open('/zh/projects/'),true);assert.equal(frame.isConnected,false);
    const replace=f.window.history.replaceState.bind(f.window.history);
    f.window.history.replaceState=(...args)=>{assert.equal(frame.isConnected,true,'attach the child under the room entry before seeding history');return replace(...args);};
    assert.equal(f.controller.open('/zh/lab-notes/langgraph/'),true);assert.equal(frame.isConnected,true);assert.equal(f.frames.length,1);
    assert.equal(f.window.history.length,initialLength+1);f.load(0,'LangGraph');
    f.controller.close();assert.equal(frame.isConnected,true,'a used child must retain its native history while the room is visible');
    f.controller.open('/zh/articles/');assert.equal(f.frames[0].node,frame);assert.equal(f.frames.length,1);
  }finally{f.restore();}
});

test('reading keeps the original café and audio DOM connected outside the active page layer',()=>{
  const f=fixture();try{
    const initialLength=f.window.history.length;assert.equal(f.controller.open('/zh/articles/'),true);
    assert.equal(f.root.isConnected,true);assert.equal(f.audio.isConnected,true);assert.equal(f.root.hidden,false);assert.equal(f.root.inert,true);
    const frame=f.load(0,'Articles');assert.equal(f.root.contains(frame.node),false);assert.ok(frame.node.title.includes('Articles'));
    assert.equal(f.window.location.pathname,'/zh/articles/');assert.equal(f.document.title,'Articles');assert.equal(f.window.history.length,initialLength+1);
    assert.equal(f.root.dataset.roomPageOpen,'true');assert.equal(f.controller.snapshot().loading,false);
    assert.equal(f.controller.open('/admin/'),false);assert.equal(f.frames.length,1);
  }finally{f.restore();}
});

test('browser back and forward restore real page routes without disconnecting the original room',async()=>{
  const f=fixture();try{
    f.controller.open('/zh/articles/');f.load(0,'Articles');f.frames[0].transport.scrollY=420;
    f.controller.open('/zh/growth/posts/slow/');f.load(1,'Slow');await f.back();f.load(2,'Articles');
    assert.equal(f.window.location.pathname,'/zh/articles/');assert.equal(f.frames[0].transport.scrollY,420);assert.equal(f.audio.isConnected,true);
    await f.back();assert.equal(f.window.location.pathname,'/zh/projects/');assert.equal(f.controller.snapshot().active,false);assert.equal(f.root.inert,false);assert.equal(f.document.activeElement,f.seat);
    await f.forward();f.load(3,'Articles');assert.equal(f.controller.snapshot().active,true);assert.equal(f.document.title,'Articles');
  }finally{f.restore();}
});

test('late iframe loads cannot take over a newer page, and Space URLs return the existing scene',()=>{
  const f=fixture();try{
    f.controller.open('/zh/articles/');f.controller.open('/zh/growth/posts/slow/');f.load(0,'Stale','https://blog.test/zh/articles/');
    assert.equal(f.document.title,'Café');assert.equal(f.controller.snapshot().loading,true);
    f.load(1,'Slow','https://blog.test/zh/growth/posts/slow/');assert.equal(f.document.title,'Slow');f.controller.open('/projects/');
    assert.equal(f.controller.snapshot().active,false);assert.equal(f.window.location.pathname,'/zh/projects/');assert.equal(f.frames.length,1);assert.equal(f.audio.isConnected,true);
    f.load(1,'Stale after return');assert.equal(f.document.title,'Café');
  }finally{f.restore();}
});

test('Escape inside the real child document returns and cleanup removes interception and restores focus',()=>{
  const f=fixture();try{
    f.controller.open('/zh/articles/');const loaded=f.load(0,'Articles');
    loaded.child.window.document.dispatchEvent(new loaded.child.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
    assert.equal(f.controller.snapshot().active,false);assert.equal(f.document.activeElement,f.seat);assert.equal(f.document.title,'Café');
    f.controller.open('/zh/articles/');f.load(1,'Articles');f.controller.dispose();
    assert.equal(f.root.inert,false);assert.equal(f.root.dataset.roomPageOpen,undefined);assert.equal(f.document.querySelector('.space-listening-page'),null);assert.equal(f.controller.open('/zh/articles/'),false);
  }finally{f.restore();}
});

test('browser forward restores the page scroll captured when Back left that page',async()=>{
  const f=fixture();try{
    f.controller.open('/zh/articles/');f.load(0,'Articles');f.frames[0].transport.scrollY=420;
    f.controller.open('/zh/growth/posts/slow/');f.load(1,'Slow');f.frames[0].transport.scrollY=850;
    await f.back();f.load(2,'Articles');assert.equal(f.frames[0].transport.scrollY,420);await f.forward();f.load(3,'Slow');
    assert.equal(f.frames[0].transport.scrollY,850);
  }finally{f.restore();}
});

test('a late child search-palette handler receives Escape before the reading session can close',()=>{
  const f=fixture();try{
    f.controller.open('/zh/articles/');const loaded=f.load(0,'Articles'),child=loaded.child.window,doc=child.document;
    doc.body.insertAdjacentHTML('beforeend','<button id="search-trigger">Search</button><div role="dialog" aria-modal="true"><input type="search" value="my query"></div>');
    const palette=doc.querySelector('[role="dialog"]'),input=palette.querySelector('input'),trigger=doc.querySelector('#search-trigger');input.focus();
    // The actual site's lazy palette attaches its document listener after load.
    // Closing it must leave this real reading layer in place for the next Esc.
    doc.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&!palette.hidden){event.preventDefault();palette.hidden=true;trigger.focus();}
    });
    input.dispatchEvent(new child.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
    assert.equal(palette.hidden,true);assert.equal(f.controller.snapshot().active,true);assert.equal(loaded.node.isConnected,true);
    assert.equal(f.audio.isConnected,true);assert.equal(f.root.hidden,false);assert.equal(f.window.location.pathname,'/zh/articles/');assert.equal(doc.activeElement,trigger);
    trigger.dispatchEvent(new child.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
    assert.equal(f.controller.snapshot().active,false);assert.equal(f.document.activeElement,f.seat);
  }finally{f.restore();}
});

for(const markup of [
  '<div role="dialog" hidden></div>',
  '<div hidden><div role="dialog"></div></div>',
  '<div role="dialog" aria-hidden="true"></div>',
  '<div role="dialog" style="display:none"></div>',
  '<div style="display:none"><div role="dialog"></div></div>',
  '<div role="dialog" style="visibility:hidden"></div>',
])test('an inactive child dialog does not swallow article Escape: '+markup,()=>{
  const f=fixture();try{
    f.controller.open('/zh/articles/');const loaded=f.load(0,'Articles'),child=loaded.child.window;
    child.document.body.insertAdjacentHTML('beforeend',markup);
    child.document.dispatchEvent(new child.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
    assert.equal(f.controller.snapshot().active,false);assert.equal(f.document.activeElement,f.seat);
  }finally{f.restore();}
});

test('an article editor retains its own Escape handling and composition without leaving the listening session',()=>{
  const f=fixture();try{
    f.controller.open('/zh/articles/');const loaded=f.load(0,'Articles'),child=loaded.child.window,doc=child.document;
    doc.body.insertAdjacentHTML('beforeend','<textarea>Unfinished note</textarea>');const editor=doc.querySelector('textarea');editor.focus();
    editor.addEventListener('keydown',event=>{if(event.key==='Escape')event.preventDefault();});
    editor.dispatchEvent(new child.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
    assert.equal(f.controller.snapshot().active,true);assert.equal(editor.value,'Unfinished note');
    doc.dispatchEvent(new child.KeyboardEvent('keydown',{key:'Escape',isComposing:true,bubbles:true,cancelable:true}));
    assert.equal(f.controller.snapshot().active,true);assert.equal(doc.activeElement,editor);
  }finally{f.restore();}
});

test('one persistent child browsing context survives reading links and room return for native history',()=>{
  const f=fixture();try{
    f.controller.open('/zh/articles/');const initial=f.load(0,'Articles');
    f.controller.open('/zh/growth/posts/slow/');assert.equal(initial.node.isConnected,true,'removing a frame deletes its native joint-history entries');
    assert.equal(f.frames.length,1);f.load(0,'Slow');f.controller.close();assert.equal(initial.node.isConnected,true);
    f.controller.open('/zh/articles/');assert.equal(f.frames.length,1);assert.equal(f.audio.isConnected,true);
  }finally{f.restore();}
});

test('child filters using native replaceState keep outer URL and the existing history entry aligned',()=>{
  const f=fixture();try{
    f.controller.open('/zh/articles/');const loaded=f.load(0,'Articles'),before=f.window.history.length,entry=f.window.history.state.spaceListening.entry;
    loaded.child.window.history.replaceState({filter:'engineering'},'','/zh/articles/?cat=engineering');
    assert.equal(f.window.location.search,'?cat=engineering');assert.equal(f.window.history.length,before);assert.equal(f.window.history.state.spaceListening.entry,entry);
    assert.deepEqual(loaded.child.window.history.state,{filter:'engineering'});assert.equal(f.audio.isConnected,true);
  }finally{f.restore();}
});

test('native child traversal reuses the visited entry marker instead of reallocating its cursor ownership',()=>{
  const f=fixture();try{
    const nativeNavigation={currentEntry:{key:'articles-slot'}};Object.defineProperty(f.frames[0].child.window,'navigation',{value:nativeNavigation});
    f.controller.open('/zh/articles/');f.load(0,'Articles');const articlesEntry=f.window.history.state.spaceListening.entry;
    nativeNavigation.currentEntry={key:'search-slot'};f.load(0,'Search destination','https://blog.test/zh/engineering/posts/search-result/');const searchEntry=f.window.history.state.spaceListening.entry;
    assert.notEqual(searchEntry,articlesEntry);
    nativeNavigation.currentEntry={key:'articles-slot'};f.load(0,'Articles','https://blog.test/zh/articles/');assert.equal(f.window.history.state.spaceListening.entry,articlesEntry);
    nativeNavigation.currentEntry={key:'search-slot'};f.load(0,'Search destination','https://blog.test/zh/engineering/posts/search-result/');assert.equal(f.window.history.state.spaceListening.entry,searchEntry);
  }finally{f.restore();}
});

test('child pushState preserves child router state and creates no duplicate parent history step',()=>{
  const f=fixture();try{
    f.controller.open('/zh/articles/');const loaded=f.load(0,'Articles'),parentLength=f.window.history.length,childLength=loaded.child.window.history.length,entry=f.window.history.state.spaceListening.entry;
    loaded.child.window.history.pushState({reader:'next'},'','/zh/articles/?sort=oldest');
    assert.equal(f.window.location.search,'?sort=oldest');assert.equal(f.window.history.length,parentLength);assert.equal(loaded.child.window.history.length,childLength+1);
    assert.notEqual(f.window.history.state.spaceListening.entry,entry);assert.deepEqual(loaded.child.window.history.state,{reader:'next'});
  }finally{f.restore();}
});

test('disposal restores the current child History API instead of retaining shell interception',()=>{
  const f=fixture();try{
    const child=f.frames[0].child.window,originalPush=child.history.pushState,originalReplace=child.history.replaceState;
    f.controller.open('/zh/articles/');f.load(0,'Articles');assert.notEqual(child.history.replaceState,originalReplace);
    f.controller.dispose();assert.equal(child.history.pushState,originalPush);assert.equal(child.history.replaceState,originalReplace);
    const outer=f.window.location.href;child.history.replaceState({independent:true},'','/zh/articles/?sort=oldest');assert.equal(f.window.location.href,outer);
  }finally{f.restore();}
});
