import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const source = process.env.SPACE_FOCUS_SOURCE_REF
  ? execFileSync('git', ['show', `${process.env.SPACE_FOCUS_SOURCE_REF}:assets/js/space/desktop.js`], { encoding: 'utf8' })
  : readFileSync(new URL('../assets/js/space/desktop.js', import.meta.url), 'utf8');
const implementation = source.slice(source.indexOf('  function setReadingFocus(value) {'), source.indexOf('\n  function open(app,payload)'));

// Exercise the actual desktop transition with browser-like scroll clamping.
// Layout coordinates change with the presentation; the document stays put.
function fixture({ start = 0 } = {}) {
  const layout = { focused: false, shift: 0 };
  let top = start, focusedButton = 0;
  const anchor = {
    isConnected: true,
    getBoundingClientRect() {
      const y = (layout.focused ? 49 : 120) + (layout.focused ? 65 + layout.shift : 100) - top;
      return { top: y, bottom: y + 2500 };
    },
  };
  let body = { contains: node => node === anchor };
  const scroller = {
    get scrollTop() { return top; },
    set scrollTop(value) { top = Math.max(0, Math.min(layout.focused ? 850 : 1000, value)); },
    getBoundingClientRect: () => ({ top: layout.focused ? 49 : 120 }),
    querySelector: () => body,
    querySelectorAll: () => [anchor],
  };
  const selection = { rangeCount: 1, isCollapsed: false, anchorNode: anchor, focusNode: anchor,
    anchorOffset: 2, focusOffset: 9, restored: [], setBaseAndExtent(...value) { this.restored.push(value); } };
  const state = { windows: [{ app: 'reader', payload: '/article-a/' }] };
  const nodes = new Map([['reader', { el: { querySelector: () => scroller } }]]);
  const root = { querySelector: () => ({ focus() { focusedButton++; } }) };
  const mount = new Function('window', 'nodes', 'state', 'root', 'layout', `
    let readingFocus = false, readingFocusReturn = null;
    function render() { layout.focused = readingFocus; }
    ${implementation}
    return { setReadingFocus, get snapshot() { return readingFocusReturn; } };
  `);
  return { ...mount({ getSelection: () => selection }, nodes, state, root, layout), scroller, anchor, selection, state, layout,
    replaceArticle() { body = { contains: node => node === anchor }; state.windows[0].payload = '/article-b/'; },
    buttonFocuses: () => focusedButton };
}

test('an unchanged focus round trip restores exact top and bottom positions despite clamping', () => {
  for (const start of [0, 970]) {
    const f = fixture({ start }); f.setReadingFocus(true); f.setReadingFocus(false);
    assert.equal(f.scroller.scrollTop, start);
    assert.equal(f.selection.restored.length, 2);
    assert.deepEqual(f.selection.restored[1], [f.anchor, 2, f.anchor, 9]);
  }
});

test('scrolling during focus preserves the new visible anchor instead of returning to the old top', () => {
  const f = fixture(); f.setReadingFocus(true); f.scroller.scrollTop = 120;
  const before = f.anchor.getBoundingClientRect().top - f.scroller.getBoundingClientRect().top;
  f.setReadingFocus(false);
  assert.equal(f.scroller.scrollTop, 155);
  assert.equal(f.anchor.getBoundingClientRect().top - f.scroller.getBoundingClientRect().top, before);
});

test('content reflow keeps the latest anchor and a replacement article never inherits the old snapshot', () => {
  const reflow = fixture(); reflow.setReadingFocus(true); reflow.layout.shift = 25;
  reflow.setReadingFocus(false); assert.equal(reflow.scroller.scrollTop, 10);
  const replaced = fixture(); replaced.setReadingFocus(true); replaced.replaceArticle(); replaced.scroller.scrollTop = 220;
  replaced.setReadingFocus(false); assert.equal(replaced.scroller.scrollTop, 255);
});

test('repeating focus is idempotent and does not replace the entry position after scrolling', () => {
  const f = fixture(); f.setReadingFocus(true); f.scroller.scrollTop = 20;
  f.setReadingFocus(true); assert.equal(f.buttonFocuses(), 1);
  f.setReadingFocus(false); assert.equal(f.scroller.scrollTop, 55);
});
