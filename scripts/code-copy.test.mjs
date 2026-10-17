import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../static/js/code-copy.js', import.meta.url), 'utf8');

function fixture({writeText, legacy = false, count = 1, focusedButton = false} = {}) {
  const buttons = [], statuses = [], timers = [], listeners = new Map();
  let legacyCalls = 0, selectionClears = 0;
  const classes = () => {
    const values = new Set();
    return {add: value => values.add(value), remove: value => values.delete(value), contains: value => values.has(value)};
  };
  const container = {classList: {contains: value => value === 'highlight'}, appendChild(node) { (node.tagName === 'BUTTON' ? buttons : statuses).push(node); }};
  const codes = Array.from({length: count}, (_, i) => ({textContent: i ? 'second block' : 'const answer = 42;\n', parentNode: {parentNode: container}}));
  const selection = {rangeCount: 0, anchorNode: null, anchorOffset: 0, focusNode: null, focusOffset: 0, ranges: [], removeAllRanges() { selectionClears++; this.rangeCount = 0; this.ranges = []; this.anchorNode = this.focusNode = null; this.anchorOffset = this.focusOffset = 0; }, addRange(range) { this.ranges.push(range); this.rangeCount = this.ranges.length; this.anchorNode = range.startContainer; this.anchorOffset = range.startOffset; this.focusNode = range.endContainer; this.focusOffset = range.endOffset; }, getRangeAt(i) { return this.ranges[i]; }};
  const document = {
    body: {tagName: 'BODY'}, documentElement: {lang: 'en'}, activeElement: null,
    currentScript: {dataset: {copy: 'Copy', copied: 'Copied', pending: 'Copying…', failed: 'Code selected. Press Ctrl/Cmd + C.'}},
    querySelectorAll: () => codes,
    createElement(tagName) {
      return {tagName: tagName.toUpperCase(), classList: classes(), dataset: {}, attrs: {}, listeners: {}, textContent: '', setAttribute(key, value) {this.attrs[key] = value;}, removeAttribute(key) {delete this.attrs[key];}, addEventListener(key, handler) {this.listeners[key] = handler;}, contains(node) {return node === this;}};
    },
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    createRange: () => ({selectNodeContents(node) {this.startContainer = this.endContainer = node; this.startOffset = 0; this.endOffset = node.textContent.length;}}),
    execCommand: () => { legacyCalls++; return legacy; },
  };
  document.activeElement = document.body;
  vm.runInNewContext(source, {document, navigator: writeText ? {clipboard: {writeText}} : {}, window: {getSelection: () => selection, setTimeout: fn => {timers.push(fn); return timers.length;}, clearTimeout() {}}, console});
  if (focusedButton) document.activeElement = buttons[0];
  const dispatch = (type, target = document.activeElement) => { for (const fn of [...(listeners.get(type) || [])]) fn({target}); };
  const focus = target => {document.activeElement = target; dispatch('focusin', target);};
  const select = node => { const range = document.createRange(); range.selectNodeContents(node); selection.removeAllRanges(); selection.addRange(range); dispatch('selectionchange'); };
  return {button: buttons[0], buttons, status: statuses[0], statuses, selection, timers, document, focus, select, dispatch, listeners, counts: () => ({legacyCalls, selectionClears})};
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


test('a late clipboard rejection cannot select code after focus moves to another input', async () => {
  let reject; const f = fixture({focusedButton: true, writeText: () => new Promise((_, fail) => {reject = fail;})});
  const copying = f.button.listeners.click(), input = {tagName: 'INPUT'}; f.focus(input);
  reject(new Error('Permission denied')); await copying;
  assert.deepEqual(f.counts(), {legacyCalls: 0, selectionClears: 0}); assert.equal(f.document.activeElement, input);
  assert.equal(f.button.disabled, false); assert.equal(f.button.attrs['aria-busy'], undefined);
  assert.equal(f.button.classList.contains('is-copied'), false); assert.equal(f.status.textContent, 'Copy did not complete. Try again.');
  assert.ok([...f.listeners.values()].every(set => set.size === 0));
});

test('a new reading selection invalidates a pending fallback even when focus stays on the original button', async () => {
  let reject; const f = fixture({focusedButton: true, writeText: () => new Promise((_, fail) => {reject = fail;})});
  const copying = f.button.listeners.click(), paragraph = {textContent: 'Keep this selected passage.'}; f.select(paragraph); const before = f.counts();
  reject(new Error('Permission denied')); await copying;
  assert.equal(f.counts().legacyCalls, 0); assert.equal(f.counts().selectionClears, before.selectionClears);
  assert.equal(f.selection.anchorNode, paragraph); assert.equal(f.selection.focusOffset, paragraph.textContent.length);
  assert.equal(f.document.activeElement, f.button); assert.equal(f.button.disabled, false);
});

test('late clipboard success keeps its truthful confirmation without changing newer focus or selection', async () => {
  let resolve; const f = fixture({focusedButton: true, writeText: () => new Promise(done => {resolve = done;})});
  const copying = f.button.listeners.click(), input = {tagName: 'INPUT'}, paragraph = {textContent: 'A newer selection.'}; f.focus(input); f.select(paragraph); const before = f.counts();
  resolve(); await copying;
  assert.equal(f.button.textContent, 'Copied'); assert.equal(f.button.classList.contains('is-copied'), true);
  assert.deepEqual(f.counts(), before); assert.equal(f.document.activeElement, input); assert.equal(f.selection.anchorNode, paragraph);
});

test('a mouse copy that did not focus the button still has a valid immediate legacy fallback', async () => {
  const f = fixture({legacy: true, writeText: () => Promise.reject(new Error('Permission denied'))}), prior = {tagName: 'INPUT'};
  f.document.activeElement = prior; await f.button.listeners.click();
  assert.equal(f.document.activeElement, prior); assert.equal(f.counts().legacyCalls, 1); assert.equal(f.button.textContent, 'Copied');
});

test('a newer copy button owns the fallback while an earlier pending rejection only releases its own busy state', async () => {
  let reject; const f = fixture({count: 2, writeText: text => text === 'second block' ? Promise.resolve() : new Promise((_, fail) => {reject = fail;})});
  const old = f.button.listeners.click(); await f.buttons[1].listeners.click();
  reject(new Error('Permission denied')); await old;
  assert.equal(f.counts().legacyCalls, 0); assert.equal(f.counts().selectionClears, 0);
  assert.equal(f.button.disabled, false); assert.equal(f.buttons[1].textContent, 'Copied'); assert.equal(f.buttons[1].classList.contains('is-copied'), true);
});
