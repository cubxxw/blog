import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../static/js/article-share-link.js',import.meta.url),'utf8');
function fixture({writeText,legacy=false,lang='zh'}={}) {
  const elements=[],listeners={};
  const document={documentElement:{lang},activeElement:null,addEventListener(k,fn){listeners[k]=fn;},execCommand:()=>legacy};
  function node(tag) {
    const values=new Set(),element={tagName:tag.toUpperCase(),children:[],dataset:{},style:{},attrs:{},listeners:{},textContent:'',isConnected:true,classList:{add:k=>values.add(k),remove:k=>values.delete(k),contains:k=>values.has(k)},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},addEventListener(k,fn){this.listeners[k]=fn;},append(...items){this.children.push(...items);},appendChild(item){this.append(item);},focus(){document.activeElement=this;this.listeners.focus?.();},contains(other){return other===this;},getClientRects(){return [{}];},select(){this.selected=true;},remove(){this.isConnected=false;},showModal(){this.open=true;},close(){this.open=false;this.listeners.close?.();}};
    elements.push(element);return element;
  }
  document.createElement=node;document.body=node('body');
  const button=node('button');button.dataset.href='https://example.com/article';button.closest=selector=>selector.includes('.et-share-copy')?button:null;button.focus();
  vm.runInNewContext(source,{window:{setTimeout:()=>1,clearTimeout(){}},document,navigator:writeText?{clipboard:{writeText}}:{},location:{href:'https://example.com/'},console});
  return {button,document,elements,click:()=>listeners.click({target:button}),get toast(){return elements.find(e=>e.className==='et-copy-toast');},get dialog(){return elements.find(e=>e.tagName==='DIALOG');}};
}

test('share copy confirms the resolved operation in the page language',async()=>{
  let resolve,calls=0;
  const f=fixture({writeText:()=>{calls++;return new Promise(done=>{resolve=done;});}});
  const pending=f.click();await f.click();
  assert.equal(calls,1);assert.equal(f.button.disabled,true);assert.equal(f.toast.textContent,'');
  resolve();await pending;assert.equal(f.toast.textContent,'链接已复制');assert.equal(f.button.disabled,false);
});

test('refused share copy preserves a selectable URL in a dismissible dialog',async()=>{
  const f=fixture({writeText:()=>Promise.reject(new Error('refused'))});
  await f.click();
  assert.equal(f.toast.textContent,'');assert.equal(f.dialog.open,true);
  const input=f.dialog.children.find(e=>e.tagName==='INPUT');
  assert.equal(input.value,f.button.dataset.href);assert.equal(input.selected,true);assert.equal(f.document.activeElement,input);
  f.dialog.children.find(e=>e.tagName==='BUTTON').listeners.click();
  assert.equal(f.dialog.open,false);assert.equal(f.document.activeElement,f.button);assert.equal(f.button.attrs['aria-busy'],undefined);
});

test('legacy copy must return true before English success is announced',async()=>{
  const f=fixture({legacy:true,lang:'en'});await f.click();
  assert.equal(f.toast.textContent,'Link copied');assert.equal(f.dialog,undefined);
  assert.equal(f.elements.filter(e=>e.tagName==='TEXTAREA'&&e.isConnected).length,0);
});

test('a late clipboard refusal cannot reopen a modal after focus has moved',async()=>{
  let reject;const f=fixture({writeText:()=>new Promise((_,fail)=>{reject=fail;})});
  const pending=f.click();f.document.activeElement={};reject(new Error('refused'));await pending;
  assert.equal(f.dialog,undefined);assert.equal(f.toast.textContent,'');assert.equal(f.button.disabled,false);
});
