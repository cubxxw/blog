import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSpec,
  formatErrors,
  SCHEMA_VERSION,
} from '../../assets/js/components/spec-schema.mjs';

/** A minimal valid context-budget spec, mutated per test. */
function contextBudgetSpec(overrides = {}) {
  return {
    schemaVersion: 1,
    kind: 'context-budget',
    id: 'context-window-v1',
    defaultScenario: 'tool-heavy',
    model: { capacity: 64, system: 4, toolMin: 0, toolMax: 48, toolStep: 1 },
    scenarios: [
      { id: 'compact', history: 8, tools: 4 },
      { id: 'long-history', history: 36, tools: 16 },
      { id: 'tool-heavy', history: 20, tools: 32 },
    ],
    copy: copyFor(['compact', 'long-history', 'tool-heavy'], 'context-budget'),
    sourceRefs: [
      {
        url: 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents',
        title: 'Effective context engineering for AI agents',
      },
    ],
    ...overrides,
  };
}

/** A minimal valid agent-loop spec, mutated per test. */
function agentLoopSpec(overrides = {}) {
  return {
    schemaVersion: 1,
    kind: 'agent-loop',
    id: 'agent-loop-v1',
    defaultScenario: 'success',
    model: { maxSteps: 12 },
    scenarios: [
      {
        id: 'success',
        outcome: 'success',
        events: [
          { kind: 'decision', copy: { zh: { text: '先看目录' }, en: { text: 'List first' } } },
          {
            kind: 'tool_call',
            tool: 'run_command',
            args: '{"cmd":"ls"}',
            copy: { zh: { text: '请求工具' }, en: { text: 'Request tool' } },
          },
          {
            kind: 'tool_result',
            tool: 'run_command',
            status: 'ok',
            copy: { zh: { text: 'dist/' }, en: { text: 'dist/' } },
          },
          {
            kind: 'stop',
            reason: 'answered',
            copy: { zh: { text: '完成' }, en: { text: 'Done' } },
          },
        ],
      },
      {
        id: 'tool-recovery',
        outcome: 'recovery',
        events: [
          {
            kind: 'tool_call',
            tool: 'run_command',
            copy: { zh: { text: '请求' }, en: { text: 'Request' } },
          },
          {
            kind: 'tool_result',
            tool: 'run_command',
            status: 'error',
            copy: { zh: { text: '失败' }, en: { text: 'Failed' } },
          },
          { kind: 'decision', copy: { zh: { text: '改用别的方式' }, en: { text: 'Retry' } } },
          {
            kind: 'tool_call',
            tool: 'run_command',
            copy: { zh: { text: '重试' }, en: { text: 'Retry call' } },
          },
          {
            kind: 'tool_result',
            tool: 'run_command',
            status: 'ok',
            copy: { zh: { text: '成功' }, en: { text: 'OK' } },
          },
          {
            kind: 'stop',
            reason: 'answered',
            copy: { zh: { text: '恢复完成' }, en: { text: 'Recovered' } },
          },
        ],
      },
      {
        id: 'budget',
        outcome: 'budget-exhausted',
        events: [
          { kind: 'decision', copy: { zh: { text: '继续' }, en: { text: 'Go on' } } },
          {
            kind: 'stop',
            reason: 'budget-exhausted',
            copy: { zh: { text: '预算耗尽' }, en: { text: 'Budget exhausted' } },
          },
        ],
      },
    ],
    copy: copyFor(['success', 'tool-recovery', 'budget'], 'agent-loop'),
    sourceRefs: [
      {
        url: 'https://openai.com/index/unrolling-the-codex-agent-loop/',
        title: 'Unrolling the Codex agent loop',
      },
    ],
    ...overrides,
  };
}

function copyFor(ids, kind) {
  const out = {};
  for (const lang of ['zh', 'en']) {
    const base = {
      figureLabel: lang === 'zh' ? '交互图解' : 'Interactive figure',
      title: lang === 'zh' ? '实验' : 'Experiment',
      question: lang === 'zh' ? '问题？' : 'Question?',
      assumption: lang === 'zh' ? '只是示意。' : 'Illustrative only.',
      observe: lang === 'zh' ? '观察。' : 'Observe.',
      footerNote: lang === 'zh' ? '示意数据' : 'Illustrative data',
      referenceTitle: lang === 'zh' ? '查看全部预设' : 'View all presets',
      scenarioLabels: Object.fromEntries(ids.map((id) => [id, `${id}-${lang}`])),
    };
    out[lang] =
      kind === 'context-budget'
        ? {
            ...base,
            unitLabel: lang === 'zh' ? 'k（示意单位）' : 'k (illustrative units)',
            capacityLabel: lang === 'zh' ? '容量上限' : 'Fixed capacity',
            sliderLabel: lang === 'zh' ? '工具结果长度' : 'Tool result length',
            segments: {
              system: 'sys',
              history: 'hist',
              tools: 'tools',
              remaining: 'left',
            },
            metrics: { used: 'used', remaining: 'left', overflow: 'over' },
            table: { scenario: 'sc', used: 'used', remaining: 'left', overflow: 'over' },
            explanations: {
              plenty: 'plenty text',
              tight: 'tight text',
              overflow: 'overflow text',
            },
          }
        : {
            ...base,
            presetNotice: lang === 'zh' ? '预设轨迹。' : 'Preset trace.',
            stepKinds: {
              decision: 'decision',
              tool_call: 'tool call',
              tool_result: 'tool result',
              stop: 'stop',
            },
            nodes: { decision: 'd', tool: 't', result: 'r', stop: 's' },
            table: { step: 'step', kind: 'kind', detail: 'detail' },
            io: { input: 'input', output: 'output' },
          };
  }
  return out;
}

function fieldsOf(errors) {
  return errors.map((e) => e.field);
}

function assertFailsWith(spec, field, file = 'spec.json') {
  const { ok, errors } = validateSpec(spec, { file });
  assert.equal(ok, false, `expected validation to fail for ${field}`);
  assert.ok(
    fieldsOf(errors).includes(field),
    `expected an error on ${field}, got: ${formatErrors(errors)}`
  );
  for (const e of errors) {
    assert.equal(e.file, file, 'errors must report the source file');
    assert.ok(e.message.length > 0, 'errors must carry a message');
  }
}

test('valid context-budget spec passes', () => {
  const { ok, errors } = validateSpec(contextBudgetSpec());
  assert.equal(ok, true, formatErrors(errors));
});

test('valid agent-loop spec passes', () => {
  const { ok, errors } = validateSpec(agentLoopSpec());
  assert.equal(ok, true, formatErrors(errors));
});

test('unknown schemaVersion fails', () => {
  assertFailsWith(contextBudgetSpec({ schemaVersion: SCHEMA_VERSION + 1 }), '$.schemaVersion');
});

test('unknown kind fails', () => {
  assertFailsWith(contextBudgetSpec({ kind: 'chat-box' }), '$.kind');
});

test('kind/schema mismatch fails in agent validator', () => {
  // context-budget scenarios fed to the agent-loop validator must fail loudly
  assertFailsWith(agentLoopSpec({ model: { capacity: 64 } }), '$.model.maxSteps');
});

test('bad id slug fails', () => {
  assertFailsWith(contextBudgetSpec({ id: 'Context Window_v1' }), '$.id');
});

test('id must match filename stem (checked by caller + id rule)', () => {
  // The validator enforces the slug form; the CLI check enforces stem equality.
  const { ok } = validateSpec(contextBudgetSpec({ id: 'other-name' }));
  assert.equal(ok, true, 'slug-valid ids pass schema; stem equality is a CLI rule');
});

test('missing field fails with field path', () => {
  const spec = contextBudgetSpec();
  delete spec.model.toolStep;
  assertFailsWith(spec, '$.model.toolStep');
});

test('unknown model field fails', () => {
  const spec = contextBudgetSpec();
  spec.model.tokensReal = 4096;
  assertFailsWith(spec, '$.model.tokensReal');
});

test('unknown top-level field fails', () => {
  assertFailsWith(contextBudgetSpec({ backend: 'api' }), '$.backend');
});

test('NaN and Infinity numeric values fail', () => {
  const nan = contextBudgetSpec();
  nan.model.capacity = NaN;
  assertFailsWith(nan, '$.model.capacity');
  const inf = contextBudgetSpec();
  inf.model.capacity = Infinity;
  assertFailsWith(inf, '$.model.capacity');
  const float = contextBudgetSpec();
  float.scenarios[0].history = 2.5;
  assertFailsWith(float, '$.scenarios[0].history');
});

test('negative and out-of-range values fail', () => {
  const neg = contextBudgetSpec();
  neg.scenarios[0].history = -1;
  assertFailsWith(neg, '$.scenarios[0].history');
  const over = contextBudgetSpec();
  over.scenarios[0].tools = 60; // above toolMax 48
  assertFailsWith(over, '$.scenarios[0].tools');
  const misaligned = contextBudgetSpec();
  misaligned.model.toolStep = 5;
  misaligned.scenarios[0].tools = 4;
  assertFailsWith(misaligned, '$.scenarios[0].tools');
  const sys = contextBudgetSpec();
  sys.model.system = 100; // above capacity 64
  assertFailsWith(sys, '$.model.system');
  const range = contextBudgetSpec();
  range.model.toolMax = 0;
  range.model.toolMin = 0;
  assertFailsWith(range, '$.model.toolMax');
});

test('duplicate scenario ids fail', () => {
  const spec = contextBudgetSpec();
  spec.scenarios[1] = { ...spec.scenarios[0] };
  assertFailsWith(spec, '$.scenarios[1].id');
});

test('missing default scenario fails', () => {
  assertFailsWith(contextBudgetSpec({ defaultScenario: 'nope' }), '$.defaultScenario');
});

test('missing translation fails for either locale', () => {
  const noEn = contextBudgetSpec();
  delete noEn.copy.en.title;
  assertFailsWith(noEn, '$.copy.en.title');
  const noZh = contextBudgetSpec();
  delete noZh.copy.zh;
  assertFailsWith(noZh, '$.copy.zh');
  const scenarioLabelGap = contextBudgetSpec();
  delete scenarioLabelGap.copy.zh.scenarioLabels.compact;
  assertFailsWith(scenarioLabelGap, '$.copy.zh.scenarioLabels.compact');
});

test('unknown copy fields fail (closed vocabulary)', () => {
  const spec = contextBudgetSpec();
  spec.copy.zh.buttonReset = '重置';
  assertFailsWith(spec, '$.copy.zh.buttonReset');
});

test('malicious URLs fail, https and controlled internal paths pass', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    '//evil.example.com/x',
    'http://insecure.example.com/x',
    'https://',
    'https://%',
    'https://user:pass@example.com/x',
    'https:\\evil.example.com/x',
    '/ok/path/with..inside/../traversal',
    '/..%2fetc/passwd',
    ' relative',
  ]) {
    const spec = contextBudgetSpec();
    spec.sourceRefs[0].url = url;
    const { ok } = validateSpec(spec);
    assert.equal(ok, false, `expected URL to fail: ${url}`);
  }
  for (const url of [
    'https://example.com/a?b=c#d',
    'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents',
    // Ordinary normalisation of a valid external https URL is not a
    // vulnerability: the browser resolves it to the same host's root.
    'https://evil.example.com/../..',
    '/images/blog/x.webp',
    '/zh/ai-agent/posts/context-engineering-the-new-foundation/',
  ]) {
    const spec = contextBudgetSpec();
    spec.sourceRefs[0].url = url;
    const { ok, errors } = validateSpec(spec);
    assert.equal(ok, true, `expected URL to pass: ${url}\n${formatErrors(errors)}`);
  }
});

test('script-breaking text stays inert text and must round-trip', () => {
  const nasty = `</script><img onerror="alert(1)"> "quoted" & <b>bold</b>\n新行 中文`;
  const spec = contextBudgetSpec();
  spec.copy.zh.title = nasty;
  spec.copy.en.title = nasty;
  const { ok, errors } = validateSpec(spec);
  assert.equal(ok, true, formatErrors(errors));
  // The data layer preserves the text verbatim (rendered via textContent only).
  const parsed = JSON.parse(JSON.stringify(spec));
  assert.equal(parsed.copy.zh.title, nasty);
  // Plain JSON.stringify() does NOT make embedding safe — which is exactly why
  // templates must use Hugo jsonify (HTML-escaping) and never raw safeHTML.
  // interactive:check asserts the built HTML contains no raw "</script" inside
  // the config payload and that JSON.parse() recovers this exact string.
  assert.ok(JSON.stringify(spec).includes('</script'), 'raw JSON is unsafe to embed');
});

test('control characters other than newline fail', () => {
  const spec = contextBudgetSpec();
  spec.copy.zh.question = 'bad\u0000question';
  assertFailsWith(spec, '$.copy.zh.question');
  const tab = contextBudgetSpec();
  tab.copy.zh.question = 'bad\tquestion';
  assertFailsWith(tab, '$.copy.zh.question');
});

test('empty and oversized strings fail', () => {
  const empty = contextBudgetSpec();
  empty.copy.en.observe = '   ';
  assertFailsWith(empty, '$.copy.en.observe');
  const long = contextBudgetSpec();
  long.copy.en.observe = 'x'.repeat(401);
  assertFailsWith(long, '$.copy.en.observe');
});

/* ── agent-loop sequence rules ─────────────────────────────────────────── */

test('stop must be the last and only stop event', () => {
  const early = agentLoopSpec();
  const events = early.scenarios[0].events;
  early.scenarios[0].events = [events[3], ...events.slice(0, 3)];
  early.scenarios[0].events[0].reason = 'answered';
  assertFailsWith(early, '$.scenarios[0].events');
  const dup = agentLoopSpec();
  dup.scenarios[0].events = [...dup.scenarios[0].events, { ...dup.scenarios[0].events[3] }];
  assertFailsWith(dup, '$.scenarios[0].events');
});

test('success must end answered', () => {
  const spec = agentLoopSpec();
  spec.scenarios[0].events[3].reason = 'budget-exhausted';
  assertFailsWith(spec, '$.scenarios[0].events');
});

test('recovery must show the failure first and an explicit recovery action', () => {
  const noError = agentLoopSpec();
  noError.scenarios[1].events[1].status = 'ok';
  assertFailsWith(noError, '$.scenarios[1].events');
  const noRecovery = agentLoopSpec();
  noRecovery.scenarios[1].events.splice(2, 1); // drop the explicit recovery decision
  assertFailsWith(noRecovery, '$.scenarios[1].events');
});

test('budget-exhausted sequences must not pretend success', () => {
  const spec = agentLoopSpec();
  spec.scenarios[2].events[1].reason = 'answered';
  assertFailsWith(spec, '$.scenarios[2].events');
});

test('event vocabulary is closed and conditionally required', () => {
  const unknown = agentLoopSpec();
  unknown.scenarios[0].events[0].kind = 'inner_thought';
  assertFailsWith(unknown, '$.scenarios[0].events[0].kind');
  const toolOnDecision = agentLoopSpec();
  toolOnDecision.scenarios[0].events[0].tool = 'run_command';
  assertFailsWith(toolOnDecision, '$.scenarios[0].events[0].tool');
  const missingTool = agentLoopSpec();
  delete missingTool.scenarios[0].events[1].tool;
  assertFailsWith(missingTool, '$.scenarios[0].events[1].tool');
  const badToolName = agentLoopSpec();
  badToolName.scenarios[0].events[1].tool = 'rm -rf /';
  assertFailsWith(badToolName, '$.scenarios[0].events[1].tool');
  const missingEventText = agentLoopSpec();
  delete missingEventText.scenarios[0].events[1].copy.en;
  assertFailsWith(missingEventText, '$.scenarios[0].events[1].copy.en');
});

test('finite sequences: length bounds are enforced', () => {
  const tooLong = agentLoopSpec();
  const filler = {
    kind: 'decision',
    copy: { zh: { text: '步' }, en: { text: 'step' } },
  };
  tooLong.scenarios[0].events = [
    ...Array.from({ length: 25 }, () => ({ ...filler })),
    tooLong.scenarios[0].events[3],
  ];
  assertFailsWith(tooLong, '$.scenarios[0].events');
  const tooShort = agentLoopSpec();
  tooShort.scenarios[0].events = [tooShort.scenarios[0].events[3]];
  assertFailsWith(tooShort, '$.scenarios[0].events');
});

test('formatErrors renders file: field: message', () => {
  const spec = contextBudgetSpec();
  spec.model.capacity = 0;
  const { errors } = validateSpec(spec, { file: 'data/interactive/x.json' });
  const line = formatErrors(errors).split('\n')[0];
  assert.match(line, /^data\/interactive\/x\.json: \$\.model\.capacity: /);
});

test('null / non-object members fail with field errors, never throw', () => {
  const cases = [
    [() => {
      const s = agentLoopSpec();
      s.scenarios[0].events[0] = null;
      return s;
    }, '$.scenarios[0].events[0]'],
    [() => {
      const s = agentLoopSpec();
      s.scenarios[0].events[1] = 'tool_call';
      return s;
    }, '$.scenarios[0].events[1]'],
    [() => {
      const s = agentLoopSpec();
      s.scenarios[0].events[2] = ['tool_result'];
      return s;
    }, '$.scenarios[0].events[2]'],
    [() => {
      const s = agentLoopSpec();
      s.scenarios[1] = null;
      return s;
    }, '$.scenarios[1]'],
    [() => {
      const s = agentLoopSpec();
      s.sourceRefs[0] = null;
      return s;
    }, '$.sourceRefs[0]'],
    [() => {
      const s = contextBudgetSpec();
      s.copy.zh = null;
      return s;
    }, '$.copy.zh'],
    [() => {
      const s = contextBudgetSpec();
      s.copy = 'zh/en';
      return s;
    }, '$.copy'],
    [() => ({ ...contextBudgetSpec(), scenarios: null }), '$.scenarios'],
  ];
  for (const [make, field] of cases) {
    const spec = make();
    const result = validateSpec(spec, { file: 'x.json' });
    assert.equal(result.ok, false, `expected failure on ${field}`);
    assert.ok(
      fieldsOf(result.errors).includes(field),
      `expected field ${field}, got: ${formatErrors(result.errors)}`
    );
  }
  // primitives at the root
  for (const raw of [null, undefined, 42, 'spec', []]) {
    const result = validateSpec(raw, { file: 'x.json' });
    assert.equal(result.ok, false);
    assert.ok(result.errors.length > 0);
  }
});

test('model.maxSteps is a hard bound on every sequence', () => {
  const spec = agentLoopSpec({ model: { maxSteps: 2 } });
  // default fixtures have 4/6/2 events — only the 2-event budget fits
  assertFailsWith(spec, '$.scenarios[0].events');
  assertFailsWith(spec, '$.scenarios[1].events');
  const { ok, errors } = validateSpec(spec);
  assert.equal(ok, false);
  assert.ok(formatErrors(errors).includes('exceeds model.maxSteps'));
  // and the real spec's 7/6/8-event sequences pass with maxSteps 8
  const real = agentLoopSpec({ model: { maxSteps: 8 } });
  const realResult = validateSpec(real);
  assert.equal(realResult.ok, true, formatErrors(realResult.errors));
});

test('corrupt model values that would render NaN are rejected', () => {
  const zeroStep = contextBudgetSpec();
  zeroStep.model.toolStep = 0;
  assertFailsWith(zeroStep, '$.model.toolStep');
  const zeroCap = contextBudgetSpec();
  zeroCap.model.capacity = 0;
  assertFailsWith(zeroCap, '$.model.capacity');
  const badEvents = agentLoopSpec();
  badEvents.scenarios[2].events[0] = { kind: 'decision', copy: { zh: { text: -1 }, en: null } };
  assertFailsWith(badEvents, '$.scenarios[2].events[0].copy.zh.text');
});
