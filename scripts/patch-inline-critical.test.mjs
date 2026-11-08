import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {compatibleSource, patchInlineCritical} from './patch-inline-critical.mjs';
import Dom from 'inline-critical/dom';

test('compatibility patch is exact, idempotent and fails closed on unrelated changes or upgrades', () => {
  const installed = fs.readFileSync(new URL(import.meta.resolve('inline-critical/dom')), 'utf8');
  assert.ok(installed.includes('return array.flat();'), 'postinstall repaired the actual resolved dependency');
  const original = installed.replace('return array.flat();', 'return array.reduce((a, b) => [...a, b], []);');
  const patched = compatibleSource(original, '11.0.1');
  assert.notEqual(patched, original);
  assert.equal(compatibleSource(patched, '11.0.1'), patched);
  assert.throws(() => compatibleSource(original + '\n// unknown change', '11.0.1'), /Unexpected/);
  assert.throws(() => compatibleSource(original, '12.1.0'), /Review/);
});

test('postinstall repairs only its resolved repository copy and refuses shared dependencies', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'inline-critical-owned-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (name, content) => { const target = path.join(root, name); fs.mkdirSync(path.dirname(target), {recursive: true}); fs.writeFileSync(target, content); };
  write('package.json', '{}');
  for (const name of ['netlify-plugin-critical-css', 'critical']) {
    write(`node_modules/${name}/package.json`, JSON.stringify({name, main: 'index.js'}));
    write(`node_modules/${name}/index.js`, '');
  }
  write('node_modules/inline-critical/package.json', JSON.stringify({name: 'inline-critical', version: '11.0.1', exports: {'./dom': './src/dom.js'}}));
  const installed = fs.readFileSync(new URL(import.meta.resolve('inline-critical/dom')), 'utf8');
  const original = installed.replace('return array.flat();', 'return array.reduce((a, b) => [...a, b], []);');
  const relative = 'node_modules/inline-critical/src/dom.js', target = path.join(root, relative);
  write(relative, original);
  assert.equal(patchInlineCritical(root), true);
  assert.equal(fs.readFileSync(target, 'utf8'), compatibleSource(original, '11.0.1'));
  assert.equal(patchInlineCritical(root), false);
  write(relative, original + '\n// unknown change');
  assert.throws(() => patchInlineCritical(root), /Unexpected/);
  assert.equal(fs.readFileSync(target, 'utf8'), original + '\n// unknown change');
  const shared = fs.mkdtempSync(path.join(os.tmpdir(), 'inline-critical-shared-'));
  t.after(() => fs.rmSync(shared, {recursive: true, force: true}));
  const outside = path.join(shared, 'dom.js'); fs.writeFileSync(outside, original);
  fs.unlinkSync(target); fs.symlinkSync(outside, target);
  assert.throws(() => patchInlineCritical(root), /outside this repository/);
  assert.equal(fs.readFileSync(outside, 'utf8'), original);
});

test('large minified pages inline before the actual stylesheet rather than the document root', () => {
  const body = '<main><p>' + 'Synthetic public text [x] (y) / '.repeat(12000) + '</p></main>';
  const html = '<!doctype html><html><head><link rel="stylesheet" href="/assets/site.css"></head><body>' + body + '</body></html>';
  const dom = new Dom(html);
  try {
    const target = dom.querySelector([undefined, ':not(noscript) > link[rel="stylesheet"]', ':not(noscript) > link[rel="preload"][as="style"]', 'head script']);
    assert.equal(target?.tagName, 'LINK');
    assert.equal(target.getAttribute('href'), '/assets/site.css');
    dom.addInlineStyles('p{color:red}', target);
    const output = dom.serialize();
    assert.match(output, /<head><style>p\{color:red\}<\/style><link/);
    assert.ok(output.includes(body), 'body content survives exact');
    assert.equal(dom.querySelectorAll('head link[rel="stylesheet"]').length, 1);
  } finally { dom.window.close(); }
});
