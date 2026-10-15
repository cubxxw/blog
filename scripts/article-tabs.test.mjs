import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../static/js/article-tabs.js', import.meta.url), 'utf8');
function fixture() {
  let focused;
  const make = name => ({dataset: {tab: name}, id: 'panel-' + name, hidden: false, attrs: {}, listeners: {}, classList: {toggle() {}}, setAttribute(k, v) {this.attrs[k] = v;}, getAttribute(k) {return this.attrs[k];}, addEventListener(k, fn) {this.listeners[k] = fn;}, focus() {focused = name;}});
  const tabs = ['toc', 'series', 'ai'].map(make), panels = ['toc', 'series', 'ai'].map(make);
  tabs[0].attrs['aria-selected'] = 'true';
  const window = {};
  vm.runInNewContext(source, {window});
  window.ArticleTabs.mount({tabs, panels, tabClass: 'active', panelClass: 'active', panelPrefix: 'panel-'});
  return {tabs, panels, get focused() {return focused;}, key(index, key) {let prevented = false; tabs[index].listeners.keydown({key, preventDefault() {prevented = true;}}); return prevented;}};
}

test('a tablist has one keyboard stop and a matching visible panel', () => {
  const f = fixture();
  assert.deepEqual(f.tabs.map(t => t.tabIndex), [0, -1, -1]);
  assert.deepEqual(f.panels.map(p => p.hidden), [false, true, true]);
  f.tabs[2].listeners.click();
  assert.deepEqual(f.tabs.map(t => t.tabIndex), [-1, -1, 0]);
  assert.deepEqual(f.panels.map(p => p.hidden), [true, true, false]);
});

test('arrows wrap, Home and End move focus with selection, ordinary Tab stays native', () => {
  const f = fixture();
  assert.equal(f.key(0, 'ArrowLeft'), true); assert.equal(f.focused, 'ai');
  assert.equal(f.key(2, 'ArrowRight'), true); assert.equal(f.focused, 'toc');
  assert.equal(f.key(0, 'End'), true); assert.equal(f.focused, 'ai');
  assert.equal(f.key(2, 'Home'), true); assert.equal(f.focused, 'toc');
  assert.equal(f.key(0, 'Tab'), false);
});
