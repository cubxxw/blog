import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

function renderer(file, name, indent) {
  const source = fs.readFileSync(file, 'utf8');
  const start = source.indexOf(`function ${name}(text)`);
  assert.ok(start >= 0, `Missing ${name}`);
  const declaration = source.slice(start).match(new RegExp(`^[\\s\\S]*?^${' '.repeat(indent)}}$`, 'm'))[0];
  const helperStart = source.indexOf('function escapeHtml(s)');
  const helper = source.slice(helperStart).match(new RegExp(`^[\\s\\S]*?^${' '.repeat(name === 'parseMarkdown' ? 4 : indent)}}$`, 'm'))[0];
  return vm.runInNewContext(`${helper}\n(${declaration})`, { window: { location: { origin: 'https://cubxxw.com' } } });
}

for (const [file, name, indent] of [
  ['static/js/reading-companion.js', 'parseMarkdown', 2],
  ['static/js/article-bottom-sheet.js', 'renderAiText', 4],
]) {
  test(`${name}: answers use prose paragraphs without generated heading/list styling`, () => {
    const render = renderer(file, name, indent);
    const html = render('## 再读一遍\n\n**放慢一点**，这个判断值得留住。\n\n1. 先观察\n2. 再决定');
    assert.doesNotMatch(html, /<(?:h[1-6]|strong|em|ol|ul|li|blockquote|table|pre)(?:\s|>)/);
    assert.match(html, /放慢一点/);
    assert.match(html, /先观察/);
    assert.match(html, /再决定/);
    assert.doesNotMatch(html, /\*\*|## /);
  });

  test(`${name}: paragraph breaks, numbers and literal HTML survive safely`, () => {
    const render = renderer(file, name, indent);
    const html = render('2026.10.08，价格为 3.5 元。\n\n读 <script>alert(1)</script> 时，先问 why & how。');
    assert.equal((html.match(/<p>/g) || []).length, 2);
    assert.match(html, /2026\.10\.08/);
    assert.match(html, /3\.5/);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /&amp;/);
    assert.doesNotMatch(html, /<script>/);
  });

  test(`${name}: mathematical operators and fenced literal code retain their meaning`, () => {
    const render = renderer(file, name, indent);
    const html = render('2*3*4 = 24，a * b * c。\n\n```text\n# literal comment\n1. a literal line\nfoo__bar__id\n```');
    assert.match(html, /2\*3\*4 = 24/);
    assert.match(html, /a \* b \* c/);
    assert.match(html, /# literal comment/);
    assert.match(html, /1\. a literal line/);
    assert.match(html, /foo__bar__id/);
    assert.doesNotMatch(html, /<(?:pre|code)/);
  });
}
