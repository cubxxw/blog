import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const sourcePath = new URL('../netlify/functions/blog-ai.js', import.meta.url);
const source = readFileSync(sourcePath, 'utf8');
const require = createRequire(sourcePath);
const index = {
  generatedAt: '2026-10-13', tree: { name: 'blog', children: [] },
  documents: [{ title: 'Agent memory', permalink: '/zh/ai-agent/posts/memory/',
    relativePath: 'zh/ai-agent/posts/memory.md', language: 'zh', section: 'ai-agent',
    tags: ['AI'], categories: [], headings: ['Memory'], excerpt: 'Memory has limits.', body: 'Public article.', date: '2026-10-12', featured: true }],
};

// Exercise the real handler and streamed reader; the paid provider and deploy
// wrapper are the only external boundaries replaced. Short timers reproduce
// a provider that sends headers, then stalls its response body.
function load(fetch, timeoutMs = 20) {
  const timers = new Set();
  const sandbox = {
    exports: {}, __dirname: '/test/blog-functions', TextDecoder, AbortController, Buffer,
    process: { env: { DASHSCOPE_API_KEY: 'test-secret', DASHSCOPE_BASE_URL: 'https://provider.invalid/v1' } },
    require: name => name === '@netlify/functions' ? { stream: handler => handler }
      : name === 'node:fs' ? { readFileSync: () => JSON.stringify(index) } : require(name),
    fetch,
    setTimeout: callback => { const timer = setTimeout(callback, timeoutMs); timers.add(timer); return timer; },
    clearTimeout: timer => { timers.delete(timer); clearTimeout(timer); },
  };
  vm.runInNewContext(source, sandbox, { filename: 'blog-ai.js' });
  return { handler: sandbox.exports.handler, timers };
}
const event = payload => ({ httpMethod: 'POST', body: JSON.stringify({ question: 'Agent memory', language: 'zh', stream: false, ...payload }) });
const sse = (message, newline = true) => new Response(`data: ${JSON.stringify({ choices: [{ delta: message }] })}${newline ? '\n\n' : ''}`);

test('provider deadline still aborts a stalled stream after response headers', async () => {
  let abortObserved = false;
  const api = load(async (_url, { signal }) => new Response(new ReadableStream({
    start(controller) { signal.addEventListener('abort', () => { abortObserved = true; controller.error(signal.reason || new Error('Provider timed out')); }, { once: true }); },
  })));
  const response = await Promise.race([
    api.handler(event()),
    new Promise(resolve => setTimeout(() => resolve({ statusCode: 'still-hanging' }), 1000)),
  ]);
  assert.equal(abortObserved, true, 'timeout must cover the body, not just fetch headers');
  assert.equal(response.statusCode, 502);
  assert.equal(api.timers.size, 0, 'round releases its timeout after error');
});

test('a final SSE event without a newline is retained', async () => {
  const api = load(async () => sse({ content: '末尾回答。' }, false));
  const response = await api.handler(event());
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).answer, '末尾回答。');
});

test('tool amplification is bounded even if one model round returns many calls', async () => {
  let round = 0;
  const api = load(async () => round++ === 0 ? sse({ tool_calls: Array.from({ length: 40 }, (_, i) => ({ index: i, id: `tool_${i}`, type: 'function', function: { name: 'search_blog', arguments: '{"query":"Agent"}' } })) }) : sse({ content: '已找到文章。' }));
  const response = await api.handler(event());
  assert.equal(response.statusCode, 200);
  const trace = JSON.parse(response.body).toolTrace;
  assert.ok(trace.filter(item => item.state === 'run').length <= 8, 'a model cannot amplify into 40 searches');
});

test('oversized question is rejected before any provider request', async () => {
  let requests = 0;
  const api = load(async () => { requests++; return sse({ content: 'Answer' }); });
  const response = await api.handler(event({ question: 'a'.repeat(4001) }));
  assert.equal(response.statusCode, 400);
  assert.equal(requests, 0);
});

test('destroying the downstream response cancels its pending provider stream', async () => {
  let upstreamSignal;
  const api = load(async (_url, { signal }) => {
    upstreamSignal = signal;
    return new Response(new ReadableStream({ start(controller) { signal.addEventListener('abort', () => controller.error(signal.reason), { once: true }); } }));
  }, 2000);
  const response = await api.handler(event({ stream: true }));
  response.body.destroy();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(upstreamSignal.aborted, true, 'closing a response must stop the provider, not only hide output');
});

test('DONE ends a completed answer even if the provider keeps its socket open', async () => {
  let cancelled = false;
  const api = load(async (_url, { signal }) => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"已完成。"}}]}\n\ndata: [DONE]\n\n'));
      signal.addEventListener('abort', () => controller.error(signal.reason), { once: true });
    }, cancel() { cancelled = true; },
  })));
  const response = await api.handler(event());
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).answer, '已完成。');
  assert.equal(cancelled, true, 'a terminal stream releases its reader instead of awaiting socket EOF');
});
