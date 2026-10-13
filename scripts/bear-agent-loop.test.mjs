import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runAgentTask,
  normalizeLimits,
  createToolExecutor,
  createApprovalGate,
  validateToolArgs,
  buildPublicContext,
  listPhotosCatalog,
  findPlaceCatalog,
  HARD_LIMITS,
  TOOL_NAMES,
  REQUIRES_APPROVAL,
} from '../assets/js/space/agent-loop.mjs';

// ─── Test doubles ────────────────────────────────────────────────────────────

function assistant(text, calls = []) {
  return {
    message: text,
    toolCalls: calls.map((call, index) => ({ id: call.id || `call_${index + 1}`, name: call.name, args: call.args })),
  };
}

function scriptedTurns(turns) {
  const seen = [];
  return {
    seen,
    async requestTurn({ messages }) {
      seen.push(JSON.parse(JSON.stringify(messages)));
      const next = turns.length ? turns.shift() : assistant('final answer');
      return typeof next === 'function' ? next() : next;
    },
  };
}

function recorder() {
  const events = [];
  return { events, onEvent: (event) => events.push(event) };
}

// ─── Orchestration ───────────────────────────────────────────────────────────

test('a task runs bounded model rounds and finishes with an answer record', async () => {
  const turn = scriptedTurns([
    assistant('', [{ name: 'search_writing', args: { query: 'agent' } }]),
    assistant('Here is what I found.'),
  ]);
  const tools = [];
  const record = await runAgentTask({
    question: 'What did you write about agents?',
    language: 'en',
    requestTurn: turn.requestTurn,
    executeTool: async (name, args) => { tools.push({ name, args }); return JSON.stringify([{ title: 'Agent memory', url: '/en/ai-agent/posts/memory/' }]); },
  });

  assert.equal(record.status, 'completed');
  assert.equal(record.stopReason, 'answered');
  assert.equal(record.answer, 'Here is what I found.');
  assert.deepEqual(tools, [{ name: 'search_writing', args: { query: 'agent' } }]);
  assert.ok(record.id.startsWith('task-'));
  assert.ok(record.startedAt && record.endedAt);

  // The second round sees OpenAI-compatible history: assistant tool_calls plus
  // one tool message per call id.
  const history = turn.seen[1];
  assert.equal(history[0].role, 'user');
  const assistantMessage = history.find((m) => m.role === 'assistant');
  assert.equal(assistantMessage.tool_calls[0].type, 'function');
  assert.equal(assistantMessage.tool_calls[0].function.name, 'search_writing');
  assert.deepEqual(JSON.parse(assistantMessage.tool_calls[0].function.arguments), { query: 'agent' });
  const toolMessage = history.find((m) => m.role === 'tool');
  assert.equal(toolMessage.tool_call_id, assistantMessage.tool_calls[0].id);
});

test('operational events cover the full task without hidden reasoning', async () => {
  const { events, onEvent } = recorder();
  const turn = scriptedTurns([
    assistant('', [{ name: 'append_note', args: { text: 'keep building' } }]),
    assistant('Noted.'),
  ]);
  const record = await runAgentTask({
    question: 'Save a reminder',
    requestTurn: turn.requestTurn,
    executeTool: async () => 'Appended.',
    approveTool: () => ({ approved: true }),
    onEvent,
  });

  const kinds = events.map((event) => event.type);
  for (const required of ['task-start', 'model-request', 'tool-start', 'tool-result', 'approval', 'end']) {
    assert.ok(kinds.includes(required), `missing ${required} event`);
  }
  assert.equal(events.at(-1).type, 'end');
  assert.equal(events.at(-1).status, 'completed');
  const approvalEvents = events.filter((event) => event.type === 'approval');
  assert.ok(approvalEvents.some((event) => event.step.phase === 'requested'));
  assert.ok(approvalEvents.some((event) => event.step.phase === 'decided' && event.step.approved === true));

  // Hidden chain of thought never leaves the loop, even if the adapter returns it.
  const leak = JSON.stringify({ events, record });
  assert.ok(!leak.includes('SECRET_COT'));
  assert.equal(record.status, 'completed');
});

test('model reasoning fields are never recorded or emitted', async () => {
  const { events, onEvent } = recorder();
  const record = await runAgentTask({
    question: 'Anything private?',
    requestTurn: async () => ({ message: { content: 'Public answer.', reasoning_content: 'SECRET_COT about the user' }, toolCalls: [] }),
    executeTool: async () => 'x',
    onEvent,
  });
  assert.equal(record.answer, 'Public answer.');
  assert.ok(!JSON.stringify({ events, record }).includes('SECRET_COT'));
});

// ─── Approval and cancellation ───────────────────────────────────────────────

test('append_note and sandbox_run need approval and only approved calls execute', async () => {
  const executed = [];
  const approvals = [];
  const turn = scriptedTurns([
    assistant('', [
      { id: 'a1', name: 'append_note', args: { text: 'note line' } },
      { id: 'a2', name: 'sandbox_run', args: { command: 'ls' } },
    ]),
    assistant('Done as approved.'),
  ]);
  const record = await runAgentTask({
    question: 'Do both',
    requestTurn: turn.requestTurn,
    executeTool: async (name) => { executed.push(name); return 'ok'; },
    approveTool: ({ name }) => { approvals.push(name); return name === 'append_note'; },
  });

  assert.deepEqual(approvals.sort(), ['append_note', 'sandbox_run']);
  assert.deepEqual(executed, ['append_note']);
  const declined = record.steps.find((step) => step.type === 'tool' && step.name === 'sandbox_run');
  assert.equal(declined.status, 'declined');
  assert.equal(record.status, 'completed');
});

test('without an approver, mutating tools are declined by default', async () => {
  const executed = [];
  await runAgentTask({
    question: 'Append please',
    requestTurn: scriptedTurns([
      assistant('', [{ name: 'append_note', args: { text: 'text' } }]),
      assistant('Understood.'),
    ]).requestTurn,
    executeTool: async (name) => { executed.push(name); return 'ok'; },
  });
  assert.deepEqual(executed, []);
});

test('unapproved destructive or unknown actions never execute, even when every action is approved', async () => {
  const executed = [];
  const turn = scriptedTurns([
    assistant('', [
      { id: 'x1', name: 'shell_exec', args: { command: 'rm -rf /' } },
      { id: 'x2', name: 'open_app', args: { app: 'https://evil.example' } },
      { id: 'x3', name: 'read_writing', args: { url: 'https://external.example/pwn' } },
    ]),
    assistant('Understood.'),
  ]);
  const record = await runAgentTask({
    question: 'Run something destructive',
    requestTurn: turn.requestTurn,
    executeTool: async (name) => { executed.push(name); return 'ran'; },
    approveTool: () => true,
  });
  // read_writing is a read tool and may execute; nothing unregistered or
  // unvalidated ever reaches executeTool.
  assert.deepEqual(executed, ['read_writing']);
  const unknown = record.steps.find((step) => step.type === 'tool' && step.name === 'shell_exec');
  assert.equal(unknown.status, 'error');
  assert.match(unknown.result, /Unknown tool/);
  const badApp = record.steps.find((step) => step.type === 'tool' && step.id === 'x2');
  assert.equal(badApp.status, 'error');
});

test('abort stops new calls and interrupts a pending approval without completing', async () => {
  const controller = new AbortController();
  const executed = [];
  const turn = scriptedTurns([
    assistant('', [{ name: 'sandbox_run', args: { command: 'echo hi' } }]),
    assistant('never reached'),
  ]);
  const recordPromise = runAgentTask({
    question: 'Run echo',
    requestTurn: turn.requestTurn,
    executeTool: async (name) => { executed.push(name); return 'ok'; },
    approveTool: () => new Promise(() => {}), // hangs until the task aborts
    signal: controller.signal,
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  controller.abort();
  const record = await recordPromise;
  assert.equal(record.status, 'interrupted');
  assert.equal(record.stopReason, 'aborted');
  assert.notEqual(record.status, 'completed');
  assert.deepEqual(executed, [], 'no tool may execute after abort');
});

test('abort at the approval decision never runs the executor', async () => {
  const controller = new AbortController();
  const executed = [];
  const record = await runAgentTask({
    question: 'Append',
    requestTurn: scriptedTurns([
      assistant('', [{ name: 'append_note', args: { text: 'x' } }]),
      assistant('never reached'),
    ]).requestTurn,
    executeTool: async (name) => { executed.push(name); return 'ok'; },
    approveTool: () => { controller.abort(); return true; },
    signal: controller.signal,
  });
  assert.deepEqual(executed, [], 'the executor must receive zero calls after abort');
  assert.equal(record.status, 'interrupted');
  assert.equal(record.stopReason, 'aborted');
});

test('abort from the decided approval event prevents execution', async () => {
  const controller = new AbortController();
  const executed = [];
  const record = await runAgentTask({
    question: 'Run',
    requestTurn: scriptedTurns([
      assistant('', [{ name: 'sandbox_run', args: { command: 'echo hi' } }]),
      assistant('never reached'),
    ]).requestTurn,
    executeTool: async (name) => { executed.push(name); return 'ok'; },
    approveTool: () => true,
    signal: controller.signal,
    onEvent: (event) => {
      if (event.type === 'approval' && event.step.phase === 'decided') controller.abort();
    },
  });
  assert.deepEqual(executed, [], 'the executor must receive zero calls after abort at approval decision');
  assert.equal(record.status, 'interrupted');
  assert.equal(record.stopReason, 'aborted');
  assert.notEqual(record.status, 'completed');
});

test('a late approval resolution after stop never runs anything', async () => {
  const controller = new AbortController();
  const executed = [];
  const events = [];
  const recordPromise = runAgentTask({
    question: 'Run late',
    requestTurn: scriptedTurns([
      assistant('', [{ name: 'sandbox_run', args: { command: 'echo hi' } }]),
      assistant('never reached'),
    ]).requestTurn,
    executeTool: async (name) => { executed.push(name); return 'ok'; },
    approveTool: () => new Promise((resolve) => setTimeout(() => resolve(true), 80)),
    signal: controller.signal,
    onEvent: (event) => events.push(event),
  });
  setTimeout(() => controller.abort(), 15);
  const record = await recordPromise;
  await new Promise((resolve) => setTimeout(resolve, 120));
  assert.deepEqual(executed, [], 'a verdict resolving after Stop must never execute');
  assert.equal(record.status, 'interrupted');
  assert.equal(record.stopReason, 'aborted');
  assert.equal(events.filter((event) => event.type === 'approval' && event.step.phase === 'decided').length, 0, 'no decided approval after abort');
});

test('abort between rounds prevents further model requests', async () => {
  const controller = new AbortController();
  let calls = 0;
  const record = await runAgentTask({
    question: 'Start',
    requestTurn: async () => {
      calls += 1;
      controller.abort();
      return assistant('', [{ name: 'search_writing', args: { query: `q${calls}` } }]);
    },
    executeTool: async () => 'ok',
    signal: controller.signal,
  });
  assert.equal(calls, 1);
  assert.equal(record.status, 'interrupted');
  assert.equal(record.stopReason, 'aborted');
});

test('the total time budget interrupts a hanging model call', async () => {
  const record = await runAgentTask({
    question: 'Slow question',
    requestTurn: () => new Promise((resolve) => setTimeout(() => resolve(assistant('too late')), 800)),
    executeTool: async () => 'ok',
    limits: { timeoutMs: 250 },
  });
  assert.equal(record.status, 'interrupted');
  assert.equal(record.stopReason, 'timeout');
});

// ─── Iteration limits ────────────────────────────────────────────────────────

test('limits can shrink but can never grow past the bounded maxima', () => {
  assert.deepEqual(normalizeLimits({ maxRounds: 99, maxToolCalls: 999, timeoutMs: 10 ** 9 }), {
    maxRounds: HARD_LIMITS.maxRounds,
    maxToolCalls: HARD_LIMITS.maxToolCalls,
    timeoutMs: HARD_LIMITS.timeoutMs,
  });
  assert.deepEqual(normalizeLimits({ maxRounds: 2, maxToolCalls: 3, timeoutMs: 5000 }), { maxRounds: 2, maxToolCalls: 3, timeoutMs: 5000 });
  assert.equal(HARD_LIMITS.maxRounds <= 6 && HARD_LIMITS.maxToolCalls <= 12 && HARD_LIMITS.timeoutMs <= 120000, true);
  assert.deepEqual(normalizeLimits({ maxRounds: 'nope', maxToolCalls: -5, timeoutMs: 0.5 }), { maxRounds: 6, maxToolCalls: 1, timeoutMs: 200 });
});

test('a model that never answers stops at the round limit without completing', async () => {
  const turn = scriptedTurns([
    assistant('', [{ name: 'search_writing', args: { query: 'a' } }]),
    assistant('', [{ name: 'search_writing', args: { query: 'b' } }]),
    assistant('', [{ name: 'search_writing', args: { query: 'c' } }]),
  ]);
  const record = await runAgentTask({
    question: 'Loop',
    requestTurn: turn.requestTurn,
    executeTool: async () => 'ok',
    limits: { maxRounds: 2 },
  });
  assert.equal(record.status, 'interrupted');
  assert.equal(record.stopReason, 'round-limit');
  assert.equal(record.answer, '');
});

test('a round that would exceed the tool budget stops before executing anything', async () => {
  const executed = [];
  const record = await runAgentTask({
    question: 'Burst',
    requestTurn: scriptedTurns([
      assistant('', [
        { name: 'search_writing', args: { query: 'a' } },
        { name: 'search_writing', args: { query: 'b' } },
        { name: 'search_writing', args: { query: 'c' } },
      ]),
    ]).requestTurn,
    executeTool: async (name) => { executed.push(name); return 'ok'; },
    limits: { maxToolCalls: 2 },
  });
  assert.equal(record.status, 'interrupted');
  assert.equal(record.stopReason, 'tool-limit');
  assert.deepEqual(executed, []);
});

// ─── Tool errors, duplicates, argument and result validation ─────────────────

test('tool errors travel back to the model and identical failures are never repeated', async () => {
  const turn = scriptedTurns([
    assistant('', [{ id: 'e1', name: 'read_writing', args: { url: '/zh/broken/' } }]),
    assistant('', [{ id: 'e2', name: 'read_writing', args: { url: '/zh/broken/' } }]),
    assistant('The article is unavailable.'),
  ]);
  let executions = 0;
  const record = await runAgentTask({
    question: 'Read it',
    requestTurn: turn.requestTurn,
    executeTool: async () => { executions += 1; throw new Error('fetch failed'); },
  });
  assert.equal(executions, 1, 'an identical failing call must not loop');
  assert.equal(record.status, 'completed');
  assert.match(turn.seen[1].at(-1).content, /fetch failed/);
  assert.match(turn.seen[2].at(-1).content, /not repeated/);
});

test('duplicate call ids and duplicate mutations execute at most once', async () => {
  const executed = [];
  const turn = scriptedTurns([
    assistant('', [
      { id: 'same', name: 'sandbox_run', args: { command: 'touch /workspace/once' } },
      { id: 'same', name: 'sandbox_run', args: { command: 'touch /workspace/once' } },
    ]),
    assistant('', [{ id: 'other', name: 'sandbox_run', args: { command: 'touch /workspace/once' } }]),
    assistant('Finished.'),
  ]);
  const record = await runAgentTask({
    question: 'Run once',
    requestTurn: turn.requestTurn,
    executeTool: async (name) => { executed.push(name); return '[exit 0 · /workspace]'; },
    approveTool: () => true,
  });
  assert.deepEqual(executed, ['sandbox_run']);
  const steps = record.steps.filter((step) => step.type === 'tool');
  assert.equal(steps[0].status, 'ok');
  assert.equal(steps[1].status, 'error');
  assert.match(steps[1].result, /Duplicate tool_call id/);
  assert.equal(steps[2].status, 'duplicate');
  assert.equal(record.status, 'completed');
});

test('invalid arguments become in-band tool errors, never executions', async () => {
  const executed = [];
  const record = await runAgentTask({
    question: 'Bad args',
    requestTurn: scriptedTurns([
      assistant('', [
        { id: 'b1', name: 'append_note', args: 'not-json-object' },
        { id: 'b2', name: 'search_writing', args: {} },
        { id: 'b3', name: 'sandbox_run', args: { command: 42 } },
      ]),
      assistant('', [{ id: 'b4', name: 'search_writing', args: {} }]),
      assistant('Understood.'),
    ]).requestTurn,
    executeTool: async (name) => { executed.push(name); return 'ok'; },
    approveTool: () => true,
  });
  assert.deepEqual(executed, []);
  const errors = record.steps.filter((step) => step.type === 'tool').map((step) => step.status);
  assert.deepEqual(errors, ['error', 'error', 'error', 'duplicate'], 'a repeated identical invalid call is not re-attempted');
});

test('results are bounded before they reach the model or the record', async () => {
  const record = await runAgentTask({
    question: 'Big result',
    requestTurn: scriptedTurns([
      assistant('', [{ name: 'search_writing', args: { query: 'big' } }]),
      assistant('Done.'),
    ]).requestTurn,
    executeTool: async () => 'x'.repeat(50000),
  });
  const toolStep = record.steps.find((step) => step.type === 'tool');
  assert.ok(toolStep.result.length <= 6020, 'result must be bounded');
  assert.match(toolStep.result, /\[result truncated\]/);
});

test('failed tools settle as tool errors and never as green done steps', async () => {
  const turn = scriptedTurns([
    assistant('', [{ name: 'sandbox_run', args: { command: 'false' } }]),
    assistant('The command finished successfully.'), // the model may still claim success
  ]);
  const record = await runAgentTask({
    question: 'Run false',
    requestTurn: turn.requestTurn,
    executeTool: createToolExecutor({ execute: async () => 'boom\n[exit 1 · /workspace]', getState: () => ({ note: '' }), origin: 'https://cubxxw.com' }),
    approveTool: () => true,
  });
  const step = record.steps.find((entry) => entry.type === 'tool');
  assert.equal(step.status, 'error', 'a failed requested mutation must never read as done');
  assert.match(step.result, /failed with exit code 1/);
  assert.match(turn.seen[1].at(-1).content, /failed with exit code 1/, 'the failure travels back to the model');
  assert.equal(record.status, 'completed', 'the model may answer after an error');
  assert.equal(record.steps.some((entry) => entry.type === 'tool' && entry.status === 'ok'), false);
});

test('structured executor failures settle as tool errors', async () => {
  const record = await runAgentTask({
    question: 'Open',
    requestTurn: scriptedTurns([
      assistant('', [{ name: 'open_app', args: { app: 'notes' } }]),
      assistant('Understood.'),
    ]).requestTurn,
    executeTool: async () => ({ ok: false, error: 'window capacity reached' }),
  });
  const step = record.steps.find((entry) => entry.type === 'tool');
  assert.equal(step.status, 'error');
  assert.match(step.result, /window capacity reached/);
});

test('an empty model turn is a failed task, not a completed one', async () => {
  const record = await runAgentTask({
    question: 'Nothing?',
    requestTurn: async () => assistant(''),
    executeTool: async () => 'ok',
  });
  assert.equal(record.status, 'failed');
  assert.equal(record.stopReason, 'no-answer');
});

test('the registry allows only the fixed tools and approval set', () => {
  assert.deepEqual([...TOOL_NAMES], ['search_writing', 'read_writing', 'open_app', 'list_photos', 'show_place', 'append_note', 'sandbox_run']);
  assert.deepEqual([...REQUIRES_APPROVAL].sort(), ['append_note', 'sandbox_run']);
  assert.equal(validateToolArgs('open_app', { app: 'notes' }).ok, true);
  assert.equal(validateToolArgs('open_app', { app: 'evil' }).ok, false);
  assert.equal(validateToolArgs('run_shell', { command: 'ls' }).ok, false);
  assert.equal(validateToolArgs('sandbox_run', { command: 'ls' }).ok, true);
  assert.equal(validateToolArgs('sandbox_run', { command: '' }).ok, false);
  assert.equal(validateToolArgs('read_writing', { url: 'https://example.com/x' }).ok, true);
  assert.equal(validateToolArgs('read_writing', { url: 'javascript:alert(1)' }).ok, false);
});

// ─── Browser-side tool execution semantics ───────────────────────────────────

const sandboxExecutor = (overrides = {}) => createToolExecutor({
  catalog: {
    articles: [{ title: 'Agent memory', url: '/en/ai-agent/posts/memory/', description: 'Memory has limits', tags: ['AI'], date: '2026.01.02', section: 'ai-agent' }],
    photos: [{ id: 'fuji', title: 'Mount Fuji', place: 'Fuji, Japan', region: 'japan' }],
    places: [{ id: 'japan', name: 'Japan', description: 'Kumano and Fuji', lat: 36, lon: 138 }],
  },
  execute: async () => '',
  getState: () => ({ note: '' }),
  origin: 'https://cubxxw.com',
  ...overrides,
});

test('sandbox_run reports success only on a real trailing exit 0 marker and throws on failure', async () => {
  const cases = [
    ['out\n[exit 0 · /workspace]', true, null],
    ['boom\n[exit 3 · /workspace]', false, /failed with exit code 3/],
    ['fake [exit 0] in output\n[exit 3 · /workspace]', false, /failed with exit code 3/],
    ['Local sandbox is not connected. Start the local runtime first.', false, /unconfirmed/],
    ['Command output mentioned [exit 0] but no status followed', false, /unconfirmed/],
  ];
  for (const [output, ok, pattern] of cases) {
    const executor = sandboxExecutor({ execute: async () => output });
    if (ok) {
      const result = await executor('sandbox_run', { command: 'echo hi' }, {});
      assert.match(result, /finished with exit code 0\./);
    } else {
      await assert.rejects(() => executor('sandbox_run', { command: 'echo hi' }, {}), pattern, output);
    }
  }
});

test('append_note is the only tool that reads the private note, and it appends', async () => {
  const calls = [];
  let reads = 0;
  const state = { note: 'existing note', windows: [] };
  const executor = sandboxExecutor({
    getState: () => { reads += 1; return state; },
    execute: async (name, args) => { calls.push({ name, args }); if (name === 'note') state.note = args.text; return 'ok'; },
  });
  await executor('append_note', { text: 'new line' }, {});
  assert.deepEqual(calls, [{ name: 'note', args: { text: 'existing note\nnew line' } }]);
  assert.equal(state.note, 'existing note\nnew line', 'the note must really change');
  assert.ok(reads >= 1);

  const readsAfterAppend = reads;
  await executor('search_writing', { query: 'memory' }, {});
  await executor('list_photos', {}, {});
  assert.equal(reads, readsAfterAppend, 'other tools must not touch private state');
});

test('append_note never truncates approved text and verifies the note changed', async () => {
  const state = { note: 'n'.repeat(39900), windows: [] };
  const calls = [];
  const executor = sandboxExecutor({
    getState: () => state,
    execute: async (name, args) => { calls.push({ name, args }); if (name === 'note') state.note = args.text; return 'ok'; },
  });

  // Over the 40000 budget: refused as a failure, never silently truncated.
  await assert.rejects(() => executor('append_note', { text: 'x'.repeat(200) }, {}), /note/i);
  assert.deepEqual(calls, [], 'nothing may execute when the note would overflow');
  assert.equal(state.note.length, 39900, 'the note must be untouched');

  // Within budget: the full approved text is preserved exactly.
  await executor('append_note', { text: 'exactly this text' }, {});
  assert.equal(state.note, 'n'.repeat(39900) + '\nexactly this text');

  // An execute call that does not change the note must not claim success.
  const inert = sandboxExecutor({ getState: () => ({ note: 'a', windows: [] }), execute: async () => 'ignored' });
  await assert.rejects(() => inert('append_note', { text: 'b' }, {}), /did not change/i);
});

test('open_app verifies real window state and fails on capacity', async () => {
  const state = { note: '', windows: [] };
  const executor = sandboxExecutor({
    getState: () => state,
    execute: async (name, args) => {
      if (args.app === 'products') { state.windows.push({ id: args.app, app: args.app }); return '已打开：产品'; }
      return '窗口已满。先关闭一个窗口。';
    },
  });
  assert.match(await executor('open_app', { app: 'products' }, {}), /已打开/);
  await assert.rejects(() => executor('open_app', { app: 'notes' }, {}), /窗口已满|Could not open/);

  // A full desktop refuses before touching the workspace.
  const full = sandboxExecutor({
    getState: () => ({ note: '', windows: Array.from({ length: 16 }, (_, i) => ({ id: `w${i}`, app: 'notes' })) }),
    execute: async () => { throw new Error('must not execute'); },
  });
  await assert.rejects(() => full('open_app', { app: 'products' }, {}), /window limit/i);
});

test('read_writing only fetches same-origin public articles and strips active content', async () => {
  const requested = [];
  const executor = sandboxExecutor({
    fetchImpl: async (url) => {
      requested.push(url);
      return {
        ok: true,
        status: 200,
        text: async () => '<html><script>steal()</script><style>.x{}</style><div class="post-content"><p>Hello from the article.</p><iframe src="https://evil.example"></iframe></div></html>',
      };
    },
  });

  await assert.rejects(() => executor('read_writing', { url: 'https://external.example/pwn' }, {}), /Refused/);
  assert.deepEqual(requested, []);

  const result = await executor('read_writing', { url: '/en/ai-agent/posts/memory/' }, {});
  const parsed = JSON.parse(result);
  assert.equal(parsed.source, 'https://cubxxw.com/en/ai-agent/posts/memory/');
  assert.match(parsed.text, /Hello from the article/);
  assert.ok(!/steal|iframe|evil\.example/.test(parsed.text));
  assert.deepEqual(requested, ['https://cubxxw.com/en/ai-agent/posts/memory/']);
});

test('read_writing failures throw truthful errors instead of success strings', async () => {
  const missing = sandboxExecutor({ fetchImpl: async () => ({ ok: false, status: 404, text: async () => '' }) });
  await assert.rejects(() => missing('read_writing', { url: '/zh/missing/' }, {}), /unavailable/);
  const broken = sandboxExecutor({ fetchImpl: async () => { throw new Error('network down'); } });
  await assert.rejects(() => broken('read_writing', { url: '/zh/x/' }, {}), /could not be read/);
});

test('catalog tools return deterministic public metadata only', async () => {
  const executor = sandboxExecutor();
  const search = JSON.parse(await executor('search_writing', { query: 'memory' }, {}));
  assert.equal(search[0].title, 'Agent memory');
  const photos = JSON.parse(await executor('list_photos', { region: 'japan' }, {}));
  assert.equal(photos[0].id, 'fuji');
  const place = JSON.parse(await executor('show_place', { id: 'japan' }, {}));
  assert.equal(place.name, 'Japan');
  await assert.rejects(() => executor('show_place', { id: 'nowhere' }, {}), /No public place/);
});

test('list_photos filters before limiting so later matches survive', () => {
  const photos = Array.from({ length: 20 }, (_, i) => ({
    id: `p${i}`,
    title: `P${i}`,
    place: 'Somewhere',
    region: i === 14 ? 'japan' : 'elsewhere',
  }));
  const result = listPhotosCatalog({ photos }, 'japan', 8);
  assert.equal(result.length, 1, 'matches after the limit window must not be lost');
  assert.equal(result[0].id, 'p14');
});

test('public ids survive at 128+ characters across context and lookups', () => {
  const longId = `photo-${'a'.repeat(64)}-${'b'.repeat(36)}-${'c'.repeat(24)}-tail`;
  assert.ok(longId.length >= 128);
  const photos = [
    ...Array.from({ length: 10 }, (_, i) => ({ id: `filler-${i}`, title: 'F', place: 'Nowhere', region: 'x' })),
    { id: longId, title: 'T', place: 'Fuji, Japan', region: 'japan' },
    ...Array.from({ length: 9 }, (_, i) => ({ id: `tail-${i}`, title: 'F', place: 'Nowhere', region: 'x' })),
  ];
  const context = buildPublicContext({ photos });
  assert.ok(context.photos.some((photo) => photo.id === longId), 'compact context must keep the full public id');
  assert.equal(listPhotosCatalog({ photos }, 'japan', 8)[0].id, longId);
  assert.equal(findPlaceCatalog({ places: [{ id: longId, name: 'X' }] }, longId)?.id, longId);
  const validated = validateToolArgs('show_place', { id: longId });
  assert.equal(validated.ok, true);
  assert.equal(validated.args.id, longId, 'tool validation must not truncate public ids');
});

test('the approval gate cancels once and ignores late resolutions', async () => {
  const gate = createApprovalGate();
  assert.equal(gate.cancel(), true);
  assert.equal(gate.decide(true), false, 'a late approval after cancel is ignored');
  assert.equal(await gate.promise, false);

  const second = createApprovalGate();
  assert.equal(second.decide(true), true);
  assert.equal(second.decide(false), false, 'deciding twice is inert');
  assert.equal(await second.promise, true);
});
