import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const {createSidebarState} = createRequire(import.meta.url)('../static/js/article-sidebars.js');

function reader(options = {}) {
  const changes = [];
  const state = createSidebarState({...options, onChange: next => changes.push(next)});
  state.configure({enabled: true, reading: true, blocked: false}, 0);
  return {state, changes, get view() { return changes.at(-1); }};
}

test('small downward movements accumulate, while a small reversal does not flash the sidebars', () => {
  const f = reader();
  [20, 50, 100].forEach(y => f.state.scroll(y));
  assert.equal(f.view.hidden, false);
  f.state.scroll(130);
  assert.equal(f.view.hidden, true);
  [129, 120, 100].forEach(y => f.state.scroll(y));
  assert.equal(f.view.hidden, true);
  f.state.scroll(64);
  assert.equal(f.view.hidden, false);
});

test('scrolling the opening cannot pre-accumulate a hide when the prose starts', () => {
  const f = reader();
  f.state.configure({reading: false}, 0);
  f.state.scroll(1000);
  assert.equal(f.view.hidden, false);
  f.state.configure({reading: true}, 1000);
  f.state.scroll(1119);
  assert.equal(f.view.hidden, false);
  f.state.scroll(1120);
  assert.equal(f.view.hidden, true);
});

test('leaving the prose reveals the tools, and returning starts with a fresh gesture', () => {
  const f = reader();
  f.state.scroll(200);
  f.state.configure({reading: false}, 200);
  assert.equal(f.view.hidden, false);
  f.state.configure({reading: true}, 200);
  f.state.scroll(250);
  assert.equal(f.view.hidden, false);
});

test('sidebar interaction reveals immediately and cannot hide a focused or busy tool', () => {
  const f = reader();
  f.state.scroll(200);
  f.state.configure({blocked: true}, 200);
  assert.equal(f.view.hidden, false);
  f.state.scroll(800);
  assert.equal(f.view.hidden, false);
  f.state.configure({blocked: false}, 800);
  f.state.scroll(850);
  assert.equal(f.view.hidden, false);
  f.state.scroll(920);
  assert.equal(f.view.hidden, true);
});

test('explicit reveal pins the tools until the reader opts back into automatic hiding', () => {
  const f = reader();
  f.state.scroll(200);
  assert.equal(f.state.togglePin(200), true);
  assert.equal(f.view.hidden, false);
  f.state.scroll(600);
  assert.equal(f.view.hidden, false);
  assert.equal(f.state.togglePin(600), false);
  f.state.scroll(700);
  assert.equal(f.view.hidden, false);
  f.state.scroll(720);
  assert.equal(f.view.hidden, true);
});

test('a stored pin keeps the first reading gesture expanded', () => {
  const f = reader({pinned: true});
  f.state.scroll(500);
  assert.equal(f.view.pinned, true);
  assert.equal(f.view.hidden, false);
});

test('compact layouts and reduced motion restore the sidebars without losing the explicit pin', () => {
  const f = reader({pinned: true});
  f.state.configure({enabled: false}, 500);
  f.state.scroll(1000);
  assert.equal(f.view.hidden, false);
  assert.equal(f.view.enabled, false);
  f.state.configure({enabled: true}, 1000);
  assert.equal(f.view.pinned, true);
  f.state.scroll(1500);
  assert.equal(f.view.hidden, false);
});

test('resizing a hidden desktop layout cannot leave compact metadata inert', () => {
  const f = reader();
  f.state.scroll(500);
  assert.equal(f.view.hidden, true);
  f.state.configure({enabled: false}, 500);
  assert.equal(f.view.hidden, false);
  f.state.configure({enabled: true}, 500);
  f.state.scroll(550);
  assert.equal(f.view.hidden, false);
});

test('navigation and page restoration reveal without treating the restored offset as reading', () => {
  const f = reader();
  f.state.scroll(500);
  f.state.reset(3000);
  assert.equal(f.view.hidden, false);
  f.state.scroll(3050);
  assert.equal(f.view.hidden, false);
  f.state.scroll(3120);
  assert.equal(f.view.hidden, true);
});

test('overscroll at the top reveals and does not count as an upward reading gesture', () => {
  const f = reader();
  f.state.scroll(500);
  f.state.scroll(-20);
  assert.equal(f.view.hidden, false);
  f.state.scroll(50);
  assert.equal(f.view.hidden, false);
});

test('unchanged context and ordinary scroll frames do not trigger DOM render callbacks', () => {
  const f = reader();
  const before = f.changes.length;
  for (let y = 1; y < 100; y++) {
    f.state.configure({enabled: true, reading: true, blocked: false}, y);
    f.state.scroll(y);
  }
  assert.equal(f.changes.length, before);
  f.state.scroll(120);
  assert.equal(f.changes.length, before + 1);
});
