import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMissingSection,
  buildSection,
  main,
  readDetails,
  resolveReportPath,
} from './lighthouse-report-to-issue.mjs';

const LHCI_DIR = '.lighthouseci';

// In-memory artifact directory: jsonPath values look like the measurement
// runner's ABSISTE absolute paths while the files live under the downloaded
// artifact directory, exactly like the reviewed migration scenario.
function lhrFixture(i) {
  return JSON.stringify({
    requestedUrl: `https://cubxxw.com/p${i}/`,
    audits: {
      'largest-contentful-paint': { displayValue: '1.9 s' },
      'first-contentful-paint': { displayValue: '1.1 s' },
      'cumulative-layout-shift': { displayValue: '0.04' },
      'total-blocking-time': { displayValue: '120 ms' },
      'speed-index': { displayValue: '2.1 s' },
      interactive: { displayValue: '2.4 s' },
      'render-blocking-resources': { title: 'Eliminate render-blocking', numericValue: 450, details: { type: 'opportunity' } },
    },
  });
}

function manifestRow(i, { representative = true, prefix = '/home/runner/work/blog/blog/.lighthouseci' } = {}) {
  return {
    url: `https://cubxxw.com/p${i}/`,
    jsonPath: `${prefix}/lhr-${i}.json`,
    isRepresentativeRun: representative,
    summary: { performance: 0.9 + i * 0.001, accessibility: 0.95, 'best-practices': 1, seo: 0.9, pwa: 0.5 },
  };
}

function artifactFs({ manifest, lhrs = {} } = {}) {
  const files = {};
  if (manifest !== undefined) files[`${LHCI_DIR}/manifest.json`] = typeof manifest === 'string' ? manifest : JSON.stringify(manifest);
  for (const [name, body] of Object.entries(lhrs)) files[`${LHCI_DIR}/${name}`] = body;
  return {
    readFileSync(path) {
      if (!(path in files)) throw new Error(`ENOENT: ${path}`);
      return files[path];
    },
    existsSync(path) {
      return path in files;
    },
    files,
  };
}

function ghRecorder({ rows = [] } = {}) {
  const calls = [];
  const gh = (args, opts = {}) => {
    calls.push({ args: [...args], input: opts.input });
    if (args[0] === 'issue' && args[1] === 'list') return JSON.stringify(rows);
    if (args[0] === 'label') return '';
    if (args[0] === 'issue' && args[1] === 'create') return 'https://github.com/cubxxw/blog/issues/42\n';
    if (args[0] === 'issue' && args[1] === 'view') return '# body\n';
    if (args[0] === 'issue' && (args[1] === 'edit' || args[1] === 'close')) return '';
    throw new Error(`unexpected gh call: ${args.join(' ')}`);
  };
  return { gh, calls };
}

const baseEnv = {
  GITHUB_REPOSITORY: 'cubxxw/blog',
  GITHUB_RUN_ID: '35989281749',
  GITHUB_SHA: '286228362036a5d1511477587e38d8f183211331',
};

// ---------------------------------------------------------------------------
// Artifact-local report resolution (path-boundary validated)
// ---------------------------------------------------------------------------

test('resolveReportPath maps runner-absolute paths to the artifact-local basename only', () => {
  const fs = artifactFs({ lhrs: { 'lhr-7.json': lhrFixture(7), 'evil.json': '{}' } });
  // absolute measurement-runner path -> basename inside the artifact dir
  assert.equal(
    resolveReportPath('/home/runner/work/blog/blog/.lighthouseci/lhr-7.json', { dir: LHCI_DIR, exists: fs.existsSync }),
    `${LHCI_DIR}/lhr-7.json`,
  );
  // normalized known prefix and plain basename both resolve
  assert.equal(resolveReportPath('.lighthouseci/lhr-7.json', { dir: LHCI_DIR, exists: fs.existsSync }), `${LHCI_DIR}/lhr-7.json`);
  assert.equal(resolveReportPath('lhr-7.json', { dir: LHCI_DIR, exists: fs.existsSync }), `${LHCI_DIR}/lhr-7.json`);
  // path-boundary validation: traversal and foreign files never read
  assert.equal(resolveReportPath('../evil.json', { dir: LHCI_DIR, exists: () => true }), null);
  assert.equal(resolveReportPath('a/../lhr-7.json', { dir: LHCI_DIR, exists: () => true }), null);
  // absolute foreign paths resolve ONLY artifact-locally — /etc/passwd itself is never opened
  assert.equal(resolveReportPath('/etc/passwd', { dir: LHCI_DIR, exists: () => true }), `${LHCI_DIR}/passwd`);
  assert.equal(resolveReportPath('nested/lhr-7.json', { dir: LHCI_DIR, exists: fs.existsSync }), `${LHCI_DIR}/lhr-7.json`); // basename-only
  assert.equal(resolveReportPath('', { dir: LHCI_DIR, exists: fs.existsSync }), null);
  assert.equal(resolveReportPath('missing.json', { dir: LHCI_DIR, exists: fs.existsSync }), null);
});

test('readDetails reads only the artifact-local report and preserves diagnostics', () => {
  const fs = artifactFs({ lhrs: { 'lhr-7.json': lhrFixture(7) } });
  const d = readDetails('/abs/runner/.lighthouseci/lhr-7.json', { dir: LHCI_DIR, fs });
  assert.deepEqual(d.metrics[0], ['LCP', '1.9 s']);
  assert.match(d.opps.join('\n'), /Eliminate render-blocking/);
  assert.equal(readDetails('/abs/runner/.lighthouseci/lhr-7.json', { dir: LHCI_DIR, fs: artifactFs({}) }), null);
});

// ---------------------------------------------------------------------------
// Section building keeps the five category assertions and honest gaps
// ---------------------------------------------------------------------------

test('buildSection keeps the five category columns and reports missing details honestly', () => {
  const fs = artifactFs({ lhrs: { 'lhr-0.json': lhrFixture(0) } });
  const runs = [manifestRow(0), manifestRow(1)];
  const body = buildSection({ runs, repo: 'cubxxw/blog', runId: '7', sha: '28622836'.padEnd(40, '0'), stamp: 'x', dir: LHCI_DIR, fs });
  assert.ok(body.includes('| URL | Perf | A11y | Best-Practices | SEO | PWA |'));
  assert.ok(body.includes('| https://cubxxw.com/p0/ | 90 | 95 | 100 | 90 | 50 |'));
  assert.ok(body.includes('#### 每 URL 详细指标（点击展开）'));
  assert.ok(body.includes('| LCP | 1.9 s |'));
  assert.ok(body.includes('(no detailed report at the artifact-local path)'), 'lost diagnostics are visible, never silent');
});

test('buildMissingSection publishes the honest missing-measurement state', () => {
  const body = buildMissingSection({ repo: 'cubxxw/blog', runId: '7', sha: '', stamp: 'x', reason: 'manifest 为空' });
  assert.ok(body.includes('**测量产物缺失**'));
  assert.ok(body.includes('不以旧结果或空表冒充当前测量'));
});

// ---------------------------------------------------------------------------
// main(): real-shaped 13-LHR artifact positive, empty-evidence nonzero cases,
// frozen date propagation and date-aware close (all with mocked gh)
// ---------------------------------------------------------------------------

async function runMain({ manifest, lhrs, rows = [], argv = ['--date', '2026-09-24'] } = {}) {
  const fs = artifactFs({ manifest, lhrs });
  const { gh, calls } = ghRecorder({ rows });
  const logs = [];
  const errors = [];
  const code = await main(argv, {
    env: baseEnv,
    fs,
    gh,
    log: (m) => logs.push(m),
    errorLog: (m) => errors.push(m),
  });
  return { code, calls, logs, errors, fs };
}

test('13-LHR artifact-local positive control publishes scores+diagnostics and exits 0', async () => {
  const lhrs = {};
  const runs = [];
  for (let i = 0; i < 13; i++) {
    lhrs[`lhr-${i}.json`] = lhrFixture(i);
    runs.push(manifestRow(i));
  }
  const { code, calls } = await runMain({ manifest: runs, lhrs });
  assert.equal(code, 0);
  const edit = calls.find((c) => c.args.includes('edit'));
  assert.ok(edit, 'section published');
  const rows = edit.input.split('\n').filter((l) => l.startsWith('| https://cubxxw.com/'));
  assert.equal(rows.length, 13, 'every representative run keeps its category row');
  assert.equal((edit.input.match(/LCP/g) || []).length, 13, 'artifact-local diagnostics survive the publication move');
});

test('frozen date reaches the daily issue identity and only strictly older issues close', async () => {
  const ghRows = [
    { number: 41, title: '站点日报 — 2026-09-22', labels: [{ name: 'daily-report' }], state: 'OPEN' },
    { number: 43, title: '站点日报 — 2026-09-24', labels: [{ name: 'daily-report' }], state: 'OPEN' },
  ];
  const { code, calls } = await runMain({ manifest: [manifestRow(0)], lhrs: { 'lhr-0.json': lhrFixture(0) }, rows: ghRows, argv: ['--date', '2026-09-23'] });
  assert.equal(code, 0);
  const create = calls.find((c) => c.args[0] === 'issue' && c.args[1] === 'create');
  assert.ok(create, 'no existing 2026-09-23 issue: one is created');
  assert.ok(create.args.includes('站点日报 — 2026-09-23'), 'creation carries the frozen date');
  const closes = calls.filter((c) => c.args[1] === 'close').map((c) => Number(c.args[2]));
  assert.deepEqual(closes, [41], 'only strictly older days close; the newer #43 stays open');
});

test('empty manifest or zero representative runs publishes the missing state and exits nonzero', async () => {
  for (const manifest of [[], [manifestRow(0, { representative: false }), manifestRow(1, { representative: false })]]) {
    const { code, calls, errors } = await runMain({ manifest, lhrs: {} });
    assert.equal(code, 1, `nonzero for ${JSON.stringify(manifest).slice(0, 40)}…`);
    const edit = calls.find((c) => c.args.includes('edit'));
    assert.ok(edit, 'honest section still published');
    assert.ok(edit.input.includes('**测量产物缺失**'));
    assert.ok(!edit.input.includes('| https://cubxxw.com/'), 'no empty score table masquerading as evidence');
    assert.match(errors.join('\n'), /No publishable measurement artifacts/);
  }
});

test('missing or malformed manifest publishes the missing state and exits nonzero', async () => {
  for (const manifest of [undefined, '{oops', { not: 'an array' }]) {
    const { code, calls } = await runMain({ manifest });
    assert.equal(code, 1);
    const edit = calls.find((c) => c.args.includes('edit'));
    assert.ok(edit.input.includes('**测量产物缺失**'));
  }
});

test('missing GITHUB_REPOSITORY fails clearly without touching gh', async () => {
  const fs = artifactFs({ manifest: [] });
  const { gh, calls } = ghRecorder();
  const code = await main([], { env: { GITHUB_RUN_ID: '1', GITHUB_SHA: '' }, fs, gh, log: () => {}, errorLog: () => {} });
  assert.equal(code, 1);
  assert.equal(calls.length, 0);
});
