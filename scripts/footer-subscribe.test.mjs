import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const template = await readFile(new URL('../layouts/partials/footer-subscribe.html', import.meta.url), 'utf8');
const source = template.match(/<script>\s*([\s\S]*?)<\/script>/)[1];

function fixture(fetch) {
  const timers = new Map(), classes = new Set(), listeners = {};
  let id = 0;
  const input = {value: 'reader@example.com', attrs: {}, setAttribute(k,v) {this.attrs[k]=v;}, getAttribute(k) {return this.attrs[k];}, addEventListener() {}, focus() {}};
  const submit = {disabled: false};
  const status = {dataset:{}, textContent:'', setAttribute() {}, removeAttribute() {}};
  const form = {elements: {company: {value:''}}, attrs:{}, setAttribute(k,v) {this.attrs[k]=v;}, querySelector: s => s.startsWith('input') ? input : submit, addEventListener(k,fn) {listeners[k]=fn;}};
  const band = {classList:{contains:k=>classes.has(k), add:k=>classes.add(k), remove:k=>classes.delete(k)}, querySelector:s=>s==='[data-fsub-form]'?form:s==='[data-fsub-status]'?status:null};
  vm.runInNewContext(source, {window:{matchMedia:()=>({matches:true}),location:{pathname:'/zh/'}},document:{documentElement:{lang:'zh'},querySelectorAll:()=>[band]},setTimeout:(fn,delay)=>{timers.set(++id,{fn,delay});return id;},clearTimeout:key=>timers.delete(key),AbortController,fetch,console});
  return {input,submit,status,form,timers,submitForm(){listeners.submit({preventDefault(){}});}, async flush(){for(let i=0;i<6;i++)await Promise.resolve();}, timeout(){[...timers.values()].find(t=>t.delay===15000).fn();}};
}

test('a request deadline restores the form even when the transport never settles', async () => {
  let signal;
  const f=fixture((_,options)=>{signal=options.signal;return new Promise(()=>{});});
  f.submitForm();assert.equal(f.submit.disabled,true);assert.equal(f.input.readOnly,true);
  f.timeout();
  assert.equal(signal.aborted,true);assert.equal(f.submit.disabled,false);assert.equal(f.input.readOnly,false);
  assert.equal(f.form.attrs['aria-busy'],'false');assert.match(f.status.textContent,/请求超时/);
  assert.equal(f.input.value,'reader@example.com');
});

test('a late timed-out response cannot overwrite the result of the next attempt', async () => {
  const requests=[];
  const f=fixture(()=>new Promise(resolve=>requests.push(resolve)));
  f.submitForm();f.timeout();f.submitForm();
  requests[1]({ok:false,status:429});await f.flush();assert.match(f.status.textContent,/太频繁/);
  requests[0]({ok:true,status:200});await f.flush();
  assert.match(f.status.textContent,/太频繁/);assert.equal(f.submit.disabled,false);
});

test('network rejection releases pending state and keeps a usable retry', async () => {
  const f=fixture(()=>Promise.reject(new Error('offline')));
  f.submitForm();await f.flush();
  assert.equal(f.submit.disabled,false);assert.equal(f.input.readOnly,false);
  assert.match(f.status.textContent,/未能完成订阅/);assert.equal(f.timers.size,0);
});
