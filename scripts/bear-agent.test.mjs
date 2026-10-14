import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  createTaskStore,
  planAnswerSegments,
  buildPublicContext,
  interpretRunResult,
  escapeHTML,
} from '../assets/js/space/agent-loop.mjs';

const require = createRequire(import.meta.url);
const bearAgent = require('../netlify/functions/bear-agent.js');
const { createHandler, TOOL_SCHEMAS, REGISTERED_APPS, SYSTEM_PROMPT } = bearAgent;

// ─── Test doubles ────────────────────────────────────────────────────────────

const ENV = {
  DEEPSEEK_API_KEY: 'test-secret-never-expose',
  DEEPSEEK_MODEL: 'test-model',
  DEEPSEEK_BASE_URL: 'https://upstream.invalid/v1',
};

function upstreamReply(message) {
  const calls = [];
  const requestImpl = async (body, options) => {
    calls.push({ options, body });
    return { ok: true, status: 200, json: async () => ({ choices: [{ message }] }) };
  };
  return { calls, requestImpl };
}

function post(body, headers = {}) {
  return {
    httpMethod: 'POST',
    headers: {
      host: 'cubxxw.com',
      'content-type': 'application/json',
      origin: 'https://cubxxw.com',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

const readBody = (response) => JSON.parse(response.body);

test('a browser loop turn includes the public catalog even without a separate question field', async () => {
  const { calls, requestImpl } = upstreamReply({ content: 'ok' });
  await createHandler({ requestImpl, env: ENV })(post({
    messages: [{ role: 'user', content: 'Show the journey' }],
    publicContext: { photos: [{ id: 'kumano', title: 'CATALOG_SENTINEL', region: 'japan' }] },
  }));
  assert.ok(calls[0].body.messages.some(message => message.role === 'user' && message.content.includes('CATALOG_SENTINEL')));
  assert.ok(!calls[0].body.messages[0].content.includes('CATALOG_SENTINEL'));
});

test('public Immich photo IDs remain complete in the model context', async () => {
  const id = `immich:${'a'.repeat(64)}:123e4567-e89b-42d3-a456-426614174000`;
  const { calls, requestImpl } = upstreamReply({ content: 'ok' });
  await createHandler({ requestImpl, env: ENV })(post({ messages: [{ role: 'user', content: 'Open this photograph' }], publicContext: { photos: [{ id, title: 'Public photo' }] } }));
  assert.ok(calls[0].body.messages.some(message => message.content.includes(id)));
});

// ─── Transport boundaries ────────────────────────────────────────────────────

test('only same-origin JSON POST requests reach the model', async () => {
  const { calls, requestImpl } = upstreamReply({ content: 'hi' });
  const handler = createHandler({ requestImpl, env: ENV });

  assert.equal((await handler({ httpMethod: 'GET', headers: {} })).statusCode, 405);
  assert.equal((await handler(post({ question: 'hi' }, { 'content-type': 'text/plain' }))).statusCode, 415);
  assert.equal((await handler(post({ question: 'hi' }, { origin: 'https://evil.example' }))).statusCode, 403);
  assert.equal((await handler(post({ question: 'hi' }, { 'sec-fetch-site': 'cross-site' }))).statusCode, 403);
  assert.deepEqual(calls, [], 'refused requests must never call upstream');

  assert.equal((await handler(post({ question: 'hi' }))).statusCode, 200);
  assert.equal((await handler(post({ question: 'hi' }, { origin: undefined }))).statusCode, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.env.DEEPSEEK_BASE_URL, ENV.DEEPSEEK_BASE_URL);
});

test('request budgets reject oversized bodies, histories and questions', async () => {
  const { calls, requestImpl } = upstreamReply({ content: 'hi' });
  const handler = createHandler({ requestImpl, env: ENV });

  assert.equal((await handler(post('x'.repeat(70000)))).statusCode, 413);
  assert.equal((await handler(post({ question: 'hi', messages: Array.from({ length: 30 }, () => ({ role: 'user', content: 'x' })) }))).statusCode, 400);
  assert.equal((await handler(post({ question: 'q'.repeat(5000) }))).statusCode, 400);
  assert.equal((await handler(post('{broken'))).statusCode, 400);
  assert.equal((await handler(post({}))).statusCode, 400);
  assert.deepEqual(calls, []);
});

test('without a configured key the response is an actionable unavailable state', async () => {
  const { calls, requestImpl } = upstreamReply({ content: 'hi' });
  const handler = createHandler({ requestImpl, env: { DEEPSEEK_BASE_URL: 'https://upstream.invalid/v1' } });
  const response = await handler(post({ question: 'hi' }));
  assert.equal(response.statusCode, 503);
  assert.deepEqual(readBody(response), { error: 'ai-not-configured', available: false });
  assert.ok(!response.body.includes('upstream.invalid'));
  assert.deepEqual(calls, []);
});

test('upstream failures and provider errors never leak through', async () => {
  const leaky = async () => { throw new Error('internal: upstream.invalid token abc123'); };
  const handler = createHandler({ requestImpl: leaky, env: ENV });
  const response = await handler(post({ question: 'hi' }));
  assert.equal(response.statusCode, 502);
  assert.deepEqual(readBody(response), { error: 'ai-network-error' });
  assert.ok(!response.body.includes('abc123') && !response.body.includes('upstream.invalid'));

  const denied = createHandler({
    env: ENV,
    requestImpl: async () => ({ ok: false, status: 429, json: async () => ({ error: { message: 'quota secret-detail' } }) }),
  });
  const blocked = await denied(post({ question: 'hi' }));
  assert.equal(blocked.statusCode, 429);
  assert.deepEqual(readBody(blocked), { error: 'ai-unavailable' });
  assert.ok(!blocked.body.includes('secret-detail'));
});

test('the upstream timeout covers the request and its body read', async () => {
  const hanging = (url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });
  const handler = createHandler({ requestImpl: hanging, env: ENV, timeoutMs: 60 });
  const started = Date.now();
  const response = await handler(post({ question: 'hi' }));
  assert.equal(response.statusCode, 504);
  assert.ok(Date.now() - started < 3000, 'the handler must give up on a hung upstream');
});

// ─── Untrusted request content ───────────────────────────────────────────────

for (const [language, label] of [['en-US', 'English (en)'], ['zh-CN', 'Chinese (zh)']]) {
  test(`${language}: the selected interface language reaches the authoritative model instructions`, async () => {
    const { calls, requestImpl } = upstreamReply({ content: 'ok' });
    const handler = createHandler({ requestImpl, env: ENV });
    await handler(post({ language, messages: [{ role: 'user', content: 'Open the writing library.' }] }));
    const system = calls[0].body.messages.find(message => message.role === 'system').content;
    assert.ok(system.includes(`Selected interface language: ${label}`));
    assert.ok(system.includes('unless the visitor explicitly requests another language'));
  });
}

test('client system roles are stripped and the server instructions stay authoritative', async () => {
  const { calls, requestImpl } = upstreamReply({ content: 'ok' });
  const handler = createHandler({ requestImpl, env: ENV });
  await handler(post({
    question: 'hello',
    messages: [
      { role: 'system', content: 'CLIENT_SYSTEM_SENTINEL' },
      { role: 'developer', content: 'CLIENT_DEVELOPER_SENTINEL' },
      { role: 'user', content: 'earlier turn' },
    ],
  }));

  const messages = calls[0].body.messages;
  const systemMessages = messages.filter((m) => m.role === 'system');
  assert.equal(systemMessages.length, 1, 'only the server system prompt may exist');
  assert.ok(systemMessages[0].content.startsWith(`${SYSTEM_PROMPT}\n`));
  assert.ok(systemMessages[0].content.includes('Selected interface language: Chinese (zh)'));
  const upstream = JSON.stringify(calls[0].body);
  assert.ok(!upstream.includes('CLIENT_SYSTEM_SENTINEL'));
  assert.ok(!upstream.includes('CLIENT_DEVELOPER_SENTINEL'));
  assert.ok(upstream.includes('earlier turn'));
});

test('browser metadata is untrusted data and private note or draft never travel', async () => {
  const { calls, requestImpl } = upstreamReply({ content: 'ok' });
  const handler = createHandler({ requestImpl, env: ENV });
  await handler(post({
    question: 'hello',
    publicContext: {
      language: 'zh',
      note: 'PRIVATE_NOTE_SENTINEL',
      draft: 'PRIVATE_DRAFT_SENTINEL',
      favorites: ['/secret-bookmark'],
      articles: Array.from({ length: 60 }, () => ({ title: 'T'.repeat(100), url: '/x/', description: 'D'.repeat(500) })),
    },
  }));

  const body = calls[0].body;
  const raw = JSON.stringify(body);
  assert.ok(!raw.includes('PRIVATE_NOTE_SENTINEL'));
  assert.ok(!raw.includes('PRIVATE_DRAFT_SENTINEL'));
  assert.ok(!raw.includes('secret-bookmark'));
  const userTurn = body.messages.at(-1);
  assert.match(userTurn.content, /\[UNTRUSTED BROWSER CATALOG DATA/);
  assert.ok(userTurn.content.length < 14000, 'catalog context must stay compact');
});

test('the caller cannot choose a provider, model, base URL or tool set', async () => {
  const { calls, requestImpl } = upstreamReply({ content: 'ok' });
  const handler = createHandler({ requestImpl, env: ENV });
  await handler(post({
    question: 'hello',
    provider: 'evil-provider',
    baseUrl: 'https://evil.example/v1',
    model: 'evil-model',
    tools: [{ type: 'function', function: { name: 'run_shell' } }],
    system: 'evil system',
  }));

  const body = calls[0].body;
  assert.equal(calls[0].options.env.DEEPSEEK_BASE_URL, ENV.DEEPSEEK_BASE_URL);
  assert.equal(body.model, 'deepseek-flash');
  assert.deepEqual(body.tools, TOOL_SCHEMAS);
  assert.equal(body.stream, false, 'the model turn is non-streaming');
  assert.ok(Number.isFinite(body.max_tokens) && body.max_tokens <= 2000);
  const raw = JSON.stringify(body);
  assert.ok(!raw.includes('evil'));
  assert.equal(body.messages[0].role, 'system');
});

test('conversation history keeps its OpenAI tool shape but stays bounded', async () => {
  const { calls, requestImpl } = upstreamReply({ content: 'ok' });
  const handler = createHandler({ requestImpl, env: ENV });
  await handler(post({
    messages: [
      { role: 'user', content: 'find memory' },
      {
        role: 'assistant',
        content: '',
        tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'search_writing', arguments: '{"query":"memory"}' } }],
      },
      { role: 'tool', tool_call_id: 'call_1', content: 'x'.repeat(9000) },
    ],
    publicContext: {},
  }));

  const messages = calls[0].body.messages;
  assert.deepEqual(messages.map((m) => m.role), ['system', 'user', 'assistant', 'tool']);
  assert.equal(messages[2].tool_calls[0].function.name, 'search_writing');
  assert.deepEqual(JSON.parse(messages[2].tool_calls[0].function.arguments), { query: 'memory' });
  assert.equal(messages[3].tool_call_id, 'call_1');
  assert.ok(messages[3].content.length <= 4000);
});

// ─── Model tool call validation ──────────────────────────────────────────────

test('model tool calls are structurally validated and bounded', async () => {
  const { requestImpl } = upstreamReply({
    content: '',
    tool_calls: [
      { id: 'ok1', function: { name: 'open_app', arguments: '{"app":"products"}' } },
      { id: 'ok2', function: { name: 'append_note', arguments: JSON.stringify({ text: 'n'.repeat(5000) }) } },
      { id: 'bad-name', function: { name: 'run shell; rm -rf /', arguments: '{}' } },
      { id: 'bad-json', function: { name: 'search_writing', arguments: '{{not json' } },
      { id: 'over1', function: { name: 'list_photos', arguments: '{}' } },
      { id: 'over2', function: { name: 'list_photos', arguments: '{}' } },
    ],
  });
  const handler = createHandler({ requestImpl, env: ENV });
  const response = await handler(post({ question: 'hello' }));
  assert.equal(response.statusCode, 200);
  const { message, toolCalls, rejectedToolCalls } = readBody(response);
  assert.equal(message, '');
  assert.equal(toolCalls.length, 4, 'action count per turn is capped');
  const names = toolCalls.map((call) => call.name);
  assert.ok(names.includes('open_app'));
  assert.ok(!names.includes('run shell; rm -rf /'), 'structurally broken names never pass');
  const note = toolCalls.find((call) => call.name === 'append_note');
  assert.ok(note.args.text.length <= 1000, 'tool arguments are bounded');
  const broken = toolCalls.find((call) => call.name === 'search_writing');
  assert.deepEqual(broken.args, {}, 'unparseable arguments degrade to empty args');
  for (const call of toolCalls) {
    assert.equal(typeof call.id, 'string');
    assert.equal(typeof call.args, 'object');
  }
  assert.ok(rejectedToolCalls.some((entry) => entry.reason === 'invalid-tool-name'));
  assert.ok(rejectedToolCalls.some((entry) => entry.reason === 'action-count-exceeded'));
});

test('the fixed schema only allows registered app ids and closed objects', () => {
  assert.equal(TOOL_SCHEMAS.length, 7);
  for (const schema of TOOL_SCHEMAS) {
    assert.equal(schema.function.parameters.additionalProperties, false);
  }
  const openApp = TOOL_SCHEMAS.find((schema) => schema.function.name === 'open_app');
  assert.deepEqual(openApp.function.parameters.properties.app.enum, [...REGISTERED_APPS]);
  assert.deepEqual([...REGISTERED_APPS].sort(), ['agent', 'books', 'contact', 'map', 'notes', 'photos', 'products', 'reader', 'settings', 'terminal', 'welcome']);
  for (const name of ['search_writing', 'read_writing', 'open_app', 'list_photos', 'show_place', 'append_note', 'sandbox_run']) {
    assert.ok(TOOL_SCHEMAS.some((schema) => schema.function.name === name), `schema for ${name}`);
  }
});

// ─── Task record persistence (panel side) ────────────────────────────────────

function fakeStorage(seed = '') {
  let value = seed;
  return {
    getItem: () => value,
    setItem: (key, next) => { value = next; },
    removeItem: () => { value = ''; },
    dump: () => value,
  };
}

const record = (over = {}) => ({
  id: 'task-1',
  question: 'question',
  status: 'completed',
  steps: [{ type: 'model', round: 1, toolCalls: [] }],
  answer: 'answer',
  startedAt: '2026-01-01T00:00:00.000Z',
  endedAt: '2026-01-01T00:00:01.000Z',
  stopReason: 'answered',
  ...over,
});

test('persisted running or awaiting tasks restore as interrupted and never auto-rerun', () => {
  const storage = fakeStorage(JSON.stringify({
    version: 1,
    tasks: [
      record({ id: 'task-running', status: 'running', answer: '' }),
      record({ id: 'task-awaiting', status: 'awaiting-approval', answer: '' }),
      record({ id: 'task-interrupted', status: 'interrupted', stopReason: 'restored-interrupted' }),
      record({ id: 'task-done', status: 'completed' }),
    ],
  }));
  const store = createTaskStore({ storage });
  const restored = store.load();
  assert.deepEqual(restored.map((task) => task.status), ['interrupted', 'interrupted', 'interrupted', 'completed']);
  assert.equal(restored[0].stopReason, 'restored-interrupted');
  assert.equal(restored[1].stopReason, 'restored-interrupted');

  // An interrupted record is terminal truth: a late write can never re-mark it
  // complete, and nothing ever reruns it automatically.
  assert.equal(store.save(record({ id: 'task-interrupted', status: 'completed' })), false);
  assert.equal(store.load().find((task) => task.id === 'task-interrupted').status, 'interrupted');

  // A retry is a NEW task record, and the interrupted one stays as history.
  assert.equal(store.save(record({ id: 'task-retry', status: 'completed' })), true);
  const ids = store.load().map((task) => task.id);
  assert.ok(ids.includes('task-interrupted') && ids.includes('task-retry'));
});

test('task persistence is versioned and bounded in count and bytes', () => {
  const storage = fakeStorage();
  const store = createTaskStore({ storage });
  for (let i = 0; i < 20; i += 1) {
    store.save(record({ id: `task-${i}`, answer: 'a'.repeat(200) }));
  }
  const tasks = store.load();
  assert.equal(tasks.length, 12);
  assert.equal(tasks.at(-1).id, 'task-19');
  const stored = JSON.parse(storage.dump());
  assert.equal(stored.version, 1);
  assert.equal(store.key, 'bear-agent-tasks:v1');

  // Oversized records are shrunk or dropped oldest-first to respect the byte
  // budget instead of overflowing localStorage.
  const heavyStorage = fakeStorage();
  const heavy = createTaskStore({ storage: heavyStorage });
  for (let i = 0; i < 8; i += 1) {
    heavy.save(record({
      id: `heavy-${i}`,
      answer: 'a'.repeat(8000),
      steps: [{ type: 'tool', id: `t${i}`, name: 'read_writing', args: { url: '/x' }, status: 'ok', result: 'z'.repeat(1200) }],
    }));
  }
  assert.ok(heavyStorage.dump().length <= 100000, 'records must stay under the byte budget');
  assert.ok(heavy.load().length >= 1);
});

test('a corrupt store degrades to an empty history instead of throwing', () => {
  const store = createTaskStore({ storage: fakeStorage('{broken json') });
  assert.deepEqual(store.load(), []);
  const missing = createTaskStore({ storage: null });
  assert.deepEqual(missing.load(), []);
  assert.equal(missing.save(record()), false);
});

// ─── Output rendering safety ─────────────────────────────────────────────────

test('answer links resolve only to safe URLs and stay plain text otherwise', () => {
  const origin = 'https://cubxxw.com';
  const safe = planAnswerSegments('Read [Agent memory](/en/ai-agent/posts/memory/) and visit https://example.com/x', origin);
  const links = safe.filter((segment) => segment.href);
  assert.equal(links.length, 2);
  assert.equal(links[0].href, 'https://cubxxw.com/en/ai-agent/posts/memory/');
  assert.equal(links[0].text, 'Agent memory');
  assert.equal(links[1].href, 'https://example.com/x');

  for (const hostile of [
    'Run [payload](javascript:alert(1)) now',
    'Run [payload](data:text/html,<script>) now',
    'Run [payload](//evil.test/x) now',
    'Run [payload](\\evil) now',
  ]) {
    const segments = planAnswerSegments(hostile, origin);
    assert.equal(segments.filter((segment) => segment.href).length, 0, hostile);
    assert.ok(segments.every((segment) => typeof segment.text === 'string' && !segment.href), hostile);
  }

  // Raw HTML is never turned into markup: segments carry text only and the
  // renderer assigns it through textContent.
  const html = planAnswerSegments('<script>alert(1)</script> all good', origin);
  assert.deepEqual(html.map((segment) => segment.text), ['<script>alert(1)</script> all good']);
  assert.equal(escapeHTML('<a href="x">'), '&lt;a href=&quot;x&quot;&gt;');
});

test('run results only claim success on a real exit 0', () => {
  assert.equal(interpretRunResult('ok\n[exit 0 · /workspace]').ok, true);
  assert.equal(interpretRunResult('boom\n[exit 2 · /workspace]').ok, false);
  assert.equal(interpretRunResult('Local sandbox is not connected.').ok, false);
  assert.equal(interpretRunResult('Local sandbox is not connected.').reason, 'unconfirmed');
  assert.equal(interpretRunResult(undefined).ok, false);
});

test('the browser context is compact and free of private workspace state', () => {
  const context = buildPublicContext({
    language: 'zh',
    note: 'PRIVATE_NOTE_SENTINEL',
    draft: 'PRIVATE_DRAFT_SENTINEL',
    articles: Array.from({ length: 200 }, () => ({ title: 'T'.repeat(400), url: '/x/', description: 'D'.repeat(1000), tags: ['a'.repeat(50)] })),
    products: [{ id: 'daypage', name: 'DayPage', description: 'ok' }],
  });
  const raw = JSON.stringify(context);
  assert.ok(!raw.includes('PRIVATE_NOTE_SENTINEL'));
  assert.ok(!raw.includes('PRIVATE_DRAFT_SENTINEL'));
  assert.ok(raw.length <= 12000, 'the context must stay compact');
  assert.equal(context.products[0].id, 'daypage');
});
