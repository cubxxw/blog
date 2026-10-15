import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../static/js/code-copy.js', import.meta.url), 'utf8');

function fixture({writeText, legacy = false} = {}) {
  const buttons = [], statuses = [], timers = [];
  const classes = () => {
    const values = new Set();
    return {add: value => values.add(value), remove: value => values.delete(value), contains: value => values.has(value)};
  };
  const container = {classList: {contains: value => value === 'highlight'}, appendChild(node) { (node.tagName === 'BUTTON' ? buttons : statuses).push(node); }};
  const code = {textContent: 'const answer = 42;\n', parentNode: {parentNode: container}};
  const selection = {rangeCount: 0, removeAllRanges() { this.rangeCount = 0; }, addRange() { this.rangeCount++; }};
  const document = {
    currentScript: {dataset: {copy: 'Copy', copied: 'Copied', pending: 'Copying…', failed: 'Code selected. Press Ctrl/Cmd + C.'}},
    querySelectorAll: () => [code],
    createElement(tagName) {
      return {tagName: tagName.toUpperCase(), classList: classes(), dataset: {}, attrs: {}, listeners: {}, textContent: '', setAttribute(key, value) {this.attrs[key] = value;}, removeAttribute(key) {delete this.attrs[key];}, addEventListener(key, handler) {this.listeners[key] = handler;}};
    },
    createRange: () => ({selectNodeContents() {}}),
    execCommand: () => legacy,
  };
  vm.runInNewContext(source, {document, navigator: writeText ? {clipboard: {writeText}} : {}, window: {getSelection: () => selection, setTimeout: fn => {timers.push(fn); return timers.length;}, clearTimeout() {}}, console});
  return {button: buttons[0], status: statuses[0], selection, timers};
}

test('copy confirms only after the clipboard promise succeeds and blocks duplicate presses', async () => {
  let resolve, calls = 0;
  const f = fixture({writeText: text => {assert.equal(text, 'const answer = 42;\n'); calls++; return new Promise(done => {resolve = done;});}});
  const copying = f.button.listeners.click();
  assert.equal(f.button.textContent, 'Copying…');
  assert.equal(f.button.disabled, true);
  assert.equal(f.button.classList.contains('is-copied'), false);
  await f.button.listeners.click();
  assert.equal(calls, 1);
  resolve(); await copying;
  assert.equal(f.button.textContent, 'Copied');
  assert.equal(f.button.classList.contains('is-copied'), true);
  assert.equal(f.button.disabled, false);
  assert.equal(f.button.attrs['aria-busy'], undefined);
  f.timers.at(-1)();
  assert.equal(f.button.textContent, 'Copy');
});

test('clipboard refusal and failed legacy copy never claim success; code remains selected', async () => {
  const f = fixture({writeText: () => Promise.reject(new Error('Permission denied'))});
  await f.button.listeners.click();
  assert.equal(f.button.classList.contains('is-copied'), false);
  assert.equal(f.button.disabled, false);
  assert.equal(f.selection.rangeCount, 1);
  assert.equal(f.status.textContent, 'Code selected. Press Ctrl/Cmd + C.');
  assert.equal(f.status.attrs.role, 'status');
});

test('a successful legacy copy uses the same confirmation and clears the temporary selection', async () => {
  const f = fixture({legacy: true});
  await f.button.listeners.click();
  assert.equal(f.button.textContent, 'Copied');
  assert.equal(f.selection.rangeCount, 0);
});
