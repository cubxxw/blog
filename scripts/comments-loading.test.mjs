import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the actual inline loader, not a second implementation of it.
const partial = fs.readFileSync(new URL('../layouts/partials/comments.html', import.meta.url), 'utf8');
const source = partial.match(/<script>([\s\S]*?)<\/script>/)[1];
function fixture({ intersection = true, readyState = 'loading', missing = false } = {}) {
  const scripts = [], messages = [], events = new Map();
  let dark = false, observer, mutation;
  const section = {};
  const host = {
    closest: () => section,
    querySelector: () => scripts[0],
    appendChild: script => scripts.push(script),
  };
  const document = {
    readyState,
    body: { classList: { contains: () => dark } },
    getElementById: () => missing ? null : host,
    createElement: () => ({ attrs: {}, setAttribute(key, value) { this.attrs[key] = value; } }),
    querySelector: () => ({ contentWindow: { postMessage: (...args) => messages.push(args) } }),
  };
  const window = { addEventListener: (name, callback) => events.set(name, callback) };
  if (intersection) window.IntersectionObserver = class {
    constructor(callback, options) { this.callback = callback; this.options = options; observer = this; }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  };
  class MutationObserver {
    constructor(callback) { mutation = callback; }
    observe() {}
  }
  vm.runInNewContext(source, { window, document, MutationObserver });
  return { scripts, messages, events, section, get observer() { return observer; },
    intersect(value) { observer.callback([{ isIntersecting: value }]); },
    theme(value) { dark = value; mutation?.(); },
  };
}

test('below-fold comments do not request the third-party client until approaching the section', () => {
  const f = fixture();
  assert.equal(f.scripts.length, 0);
  assert.equal(f.observer.target, f.section);
  assert.equal(f.observer.options.rootMargin, '300px 0px');
  f.intersect(false);
  assert.equal(f.scripts.length, 0);
  f.theme(true);
  f.intersect(true);
  assert.equal(f.scripts.length, 1);
  assert.equal(f.scripts[0].src, 'https://utteranc.es/client.js');
  assert.equal(f.scripts[0].attrs.theme, 'github-dark');
  assert.equal(f.scripts[0].attrs.repo, 'cubxxw/blog');
  assert.equal(f.scripts[0].attrs['issue-term'], 'pathname');
  assert.equal(f.observer.disconnected, true);
  f.intersect(true);
  assert.equal(f.scripts.length, 1);
  f.theme(false);
  assert.equal(f.messages.at(-1)[0].theme, 'github-light');
  assert.equal(f.messages.at(-1)[1], 'https://utteranc.es');
});

test('without IntersectionObserver comments wait for load, then still support the widget', () => {
  const f = fixture({ intersection: false });
  assert.equal(f.scripts.length, 0);
  assert.equal(typeof f.events.get('load'), 'function');
  f.events.get('load')();
  assert.equal(f.scripts.length, 1);
  assert.equal(f.scripts[0].attrs.theme, 'github-light');
});

test('an already-loaded fallback document mounts once and a missing host remains harmless', () => {
  assert.equal(fixture({ intersection: false, readyState: 'complete' }).scripts.length, 1);
  const f = fixture({ missing: true });
  assert.equal(f.scripts.length, 0);
  assert.equal(f.observer, undefined);
});
