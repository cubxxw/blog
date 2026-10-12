import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../static/js/article-ai-client.js', import.meta.url), 'utf8');
function client(fetch) {
  const window = {};
  vm.runInNewContext(source, { window, fetch, AbortController, DOMException, TextDecoder, setTimeout, clearTimeout });
  return window.ArticleAIClient;
}
test('JSON preserves request selection fields and validates answer', async () => {
  let received;
  const api = client(async (_, options) => { received = JSON.parse(options.body); return Response.json({ answer: '解释。', candidates: [{ title: '来源' }] }); });
  const result = await api.request({ selectedText: '原文', selectionContext: '邻文', question: '解释' });
  assert.equal(received.selectedText, '原文'); assert.equal(received.selectionContext, '邻文');
  assert.equal(result.answer, '解释。'); assert.equal(result.candidates[0].title, '来源');
  await assert.rejects(client(async () => Response.json({ answer: '' })).request({}), /no answer/);
});
test('SSE handles byte-split UTF-8, CRLF, metadata, DONE and EOF tails', async () => {
  for (const tail of ['', '\r\n\r\ndata: [DONE]\r\n\r\n']) {
    const bytes = new TextEncoder().encode('data: {"meta":{"candidates":[{"title":"引用"}]}}\r\n\r\ndata: {"delta":"你好🌿"}' + tail);
    let cancelled = false;
    const stream = new ReadableStream({
      start(controller) { for (const byte of bytes) controller.enqueue(Uint8Array.of(byte)); controller.close(); },
      cancel() { cancelled = true; },
    });
    const deltas = [];
    const result = await client(async () => new Response(stream, { headers: { 'content-type': 'text/event-stream' } })).request({}, { onDelta: text => deltas.push(text) });
    assert.equal(result.answer, '你好🌿'); assert.equal(result.candidates[0].title, '引用'); assert.deepEqual(deltas, ['你好🌿']);
  }
});
test('abort invalidates late JSON even when a transport ignores cancellation', async () => {
  let resolve;
  const api = client(() => new Promise(r => { resolve = r; }));
  const controller = new AbortController();
  const pending = api.request({}, { signal: controller.signal }); controller.abort();
  resolve(Response.json({ answer: '旧回复' }));
  await assert.rejects(pending, { name: 'AbortError' });
});
test('idle response-header timeout aborts and reports a retryable timeout', async () => {
  const api = client((_, options) => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))));
  await assert.rejects(api.request({}, { timeoutMs: 15 }), { name: 'TimeoutError' });
});
test('SSE malformed data and empty streams cannot become successful history', async () => {
  for (const value of ['data: nope\n\n', 'data: [DONE]\n\n']) {
    const api = client(async () => new Response(value, { headers: { 'content-type': 'text/event-stream' } }));
    await assert.rejects(api.request({}), /Malformed|no answer/);
  }
});
