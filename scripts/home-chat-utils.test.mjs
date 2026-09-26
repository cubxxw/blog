import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSSEParser, renderMessage, safeLink } from '../assets/js/home-chat-utils.mjs';

test('SSE preserves every UTF-8 byte boundary, CRLF and unterminated final event', () => {
  const expected = ['{"delta":"你好，熊 🐻"}', '[DONE]', '{"followups":[]}'];
  const source = ': heartbeat\r\ndata: ' + expected[0] + '\r\n\r\ndata:[DONE]\n\ndata: ' + expected[2];
  const bytes = new TextEncoder().encode(source);
  for (let size = 1; size <= bytes.length; size++) {
    const actual = [], parser = createSSEParser(value => actual.push(value));
    for (let start = 0; start < bytes.length; start += size) parser.push(bytes.slice(start, start + size));
    parser.finish(); parser.finish();
    assert.deepEqual(actual, expected, `chunk size ${size}`);
  }
});

test('SSE joins multiline data and accepts lone CR without leaking event metadata', () => {
  const actual = [], parser = createSSEParser(value => actual.push(value));
  parser.push(new TextEncoder().encode('event: reply\rdata: one\rdata:two\r\rid: 2\ndata\n\n'));
  parser.finish();
  assert.deepEqual(actual, ['one\ntwo', '']);
});

test('links reject injected attributes and unsafe protocols, preserving plain text', () => {
  for (const url of ['https://example.com/" onmouseover="alert(1)', '//evil.test', '/\\evil.test', 'javascript:alert(1)', 'data:text/html,evil', 'https://ex ample.com', '/\n/evil.test']) {
    assert.equal(safeLink(url, 'https://cubxxw.com'), null, url);
    assert.doesNotMatch(renderMessage(`[article](${url})`, 'https://cubxxw.com'), /<a /, url);
  }
  assert.doesNotMatch(renderMessage('[<img src=x onerror=alert(1)>](/about/)', 'https://cubxxw.com'), /<img/);
});

test('article cards and inline links preserve safe URLs and escape ampersands once', () => {
  const rendered = renderMessage('[Article](/zh/about/?a=1&b=2)\n\nRead [Docs](https://example.com/docs?a=1&b=2) **today**.', 'https://cubxxw.com');
  assert.match(rendered, /href="https:\/\/cubxxw.com\/zh\/about\/\?a=1&amp;b=2"/);
  assert.match(rendered, /href="https:\/\/example.com\/docs\?a=1&amp;b=2"/);
  assert.match(rendered, /<strong>today<\/strong>/);
  assert.equal((rendered.match(/<p /g) || []).length, (rendered.match(/<\/p>/g) || []).length);
});
