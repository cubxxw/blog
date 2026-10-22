import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { parse } from 'parse5';
import { attribute, htmlElements } from './lib/content-page-map.mjs';

const root = path.resolve(process.env.SITE_OUTPUT_DIR || 'public');
const html = fs.readFileSync(path.join(root, 'zh/growth/posts/2025-annual-review/index.html'), 'utf8');
const nodes = htmlElements(parse(html, { scriptingEnabled: false }));
const linkNode = nodes.find(node => node.tagName === 'link' && attribute(node, 'id') === 'zh-prose-fonts');
const scriptNode = nodes.find(node => node.tagName === 'script' && attribute(node, 'data-reading-fonts') !== undefined);

function fontLink({ frames = true, completedPreload = false, responseStatus = 200 } = {}) {
  const link = new EventTarget();
  link.rel = attribute(linkNode, 'rel');
  link.as = attribute(linkNode, 'as');
  link.href = `https://example.test${attribute(linkNode, 'href')}`;
  link.removeAttribute = name => { link[name] = ''; };
  const callbacks = [];
  const script = scriptNode?.childNodes.map(node => node.value || '').join('') || '';
  const environment = {
    document: { getElementById: id => id === 'zh-prose-fonts' ? link : null },
    window: {
      requestAnimationFrame: frames ? callback => callbacks.push(callback) : undefined,
      performance: { getEntriesByName: href => completedPreload && href === link.href
        ? [{ responseEnd: 12, decodedBodySize: 190896, responseStatus }] : [] },
    },
    link,
  };
  runInNewContext(script, environment);
  const handler = attribute(linkNode, 'onload');
  if (handler) link.addEventListener('load', () => {
    runInNewContext(`(function(){${handler}}).call(link)`, environment);
  }, { once: true });
  return { link, firstFrame: () => callbacks.forEach(callback => callback()) };
}

test('Chinese font CSS can download without blocking the initial render', () => {
  assert.equal(attribute(linkNode, 'rel'), 'preload');
  assert.equal(attribute(linkNode, 'as'), 'style');
});

test('font CSS arriving after the first frame never changes the reading font', () => {
  const { link, firstFrame } = fontLink();
  firstFrame();
  link.dispatchEvent(new Event('load'));
  assert.equal(link.rel, 'preload');
});

test('cached font CSS can apply before the first frame', () => {
  const { link, firstFrame } = fontLink();
  link.dispatchEvent(new Event('load'));
  assert.equal(link.rel, 'stylesheet');
  assert.equal(link.as, '');
  firstFrame();
  link.dispatchEvent(new Event('load'));
  assert.equal(link.rel, 'stylesheet');
});

test('a completed preload whose load event is still queued applies at the first frame', () => {
  const { link, firstFrame } = fontLink({ completedPreload: true });
  firstFrame();
  assert.equal(link.rel, 'stylesheet');
  assert.equal(link.as, '');
});

test('an HTTP error body never becomes a render-blocking stylesheet', () => {
  const { link, firstFrame } = fontLink({ completedPreload: true, responseStatus: 404 });
  firstFrame();
  assert.equal(link.rel, 'preload');
});

test('failed font CSS keeps the readable platform fallback', () => {
  const { link, firstFrame } = fontLink();
  link.dispatchEvent(new Event('error'));
  firstFrame();
  assert.equal(link.rel, 'preload');
});

test('without a frame API font enhancement fails closed', () => {
  const { link } = fontLink({ frames: false });
  link.dispatchEvent(new Event('load'));
  assert.equal(link.rel, 'preload');
});

test('without JavaScript the same optional font CSS remains a direct stylesheet', () => {
  const noscripts = nodes.filter(node => node.tagName === 'noscript');
  const fallback = noscripts.flatMap(node => htmlElements(node)).find(node =>
    node.tagName === 'link' && attribute(node, 'href') === attribute(linkNode, 'href'));
  assert.ok(fallback);
  assert.equal(attribute(fallback, 'rel'), 'stylesheet');
  const css = fs.readFileSync(path.join(root, attribute(fallback, 'href')), 'utf8');
  assert.match(css, /font-display:optional/);
  assert.doesNotMatch(css, /font-display:swap/);
});
