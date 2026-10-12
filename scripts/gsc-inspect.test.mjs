import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';

const moduleUrl = new URL('./gsc-inspect.mjs', import.meta.url);
const SHA = 'a'.repeat(40);
const PAGE_URL = 'https://cubxxw.com/engineering/posts/go-release-tools/';
const SECOND = 'https://cubxxw.com/projects/UFO/';
const NOW = new Date('2026-10-12T04:00:00Z');
const evidenceRoot = process.env.BLOG_TEST_ARTIFACT_DIR ?? process.env.RUNNER_TEMP ?? tmpdir();
const credentials = JSON.stringify({ client_email: 'test@example.invalid', private_key: generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' }) });
const apiResult = (extra = {}) => ({ inspectionResult: { indexStatusResult: { verdict: 'PASS', coverageState: 'Submitted and indexed', robotsTxtState: 'ALLOWED', indexingState: 'INDEXING_ALLOWED', pageFetchState: 'SUCCESSFUL', googleCanonical: PAGE_URL, userCanonical: PAGE_URL, lastCrawlTime: '2026-10-10T00:00:00Z', ...extra }, ignored: 'not persisted' }, error: 'not persisted' });
const response = (status, value) => ({ status, ok: status >= 200 && status < 300, text: async () => typeof value === 'string' ? value : JSON.stringify(value) });

async function run({ urls = [PAGE_URL], outcomes = [apiResult()], authStatus = 200, authBody = { access_token: 'canary-secret-token' }, fetchFailure = null, timeout = false } = {}) {
  const mod = await import(moduleUrl);
  const calls = [];
  let index = 0;
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url === 'https://oauth2.googleapis.com/token') return response(authStatus, authBody);
    if (fetchFailure) throw new Error(fetchFailure);
    if (timeout) return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(Object.assign(new Error('do not log canary-secret-token'), { name: 'AbortError' }))));
    const item = outcomes[Math.min(index++, outcomes.length - 1)];
    return response(item.status ?? 200, item.body ?? item);
  };
  const report = await mod.collectInspection({ urls, sourceSha: SHA, fetchedAt: NOW.toISOString(), serviceAccountJson: credentials, deps: { fetchImpl, sleep: async () => {}, timeoutMs: 5 } });
  return { report, calls };
}

test('single canary uses readonly OAuth and official inspection POST, records exact provenance and allowlisted Google fields', async () => {
  const { report, calls } = await run();
  assert.equal(calls.length, 2);
  const assertion = new URLSearchParams(calls[0].options.body).get('assertion');
  const jwt = JSON.parse(Buffer.from(assertion.split('.')[1], 'base64url').toString());
  assert.equal(jwt.scope, 'https://www.googleapis.com/auth/webmasters.readonly');
  assert.equal(calls[1].url, 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect');
  assert.equal(calls[1].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[1].options.body), { inspectionUrl: PAGE_URL, siteUrl: 'sc-domain:cubxxw.com', languageCode: 'en-US' });
  assert.equal(report.schema, 'gsc-inspection/1');
  assert.equal(report.meta.sourceSha, SHA);
  assert.equal(report.meta.fetchedAt, NOW.toISOString());
  assert.equal(report.meta.runStatus, 'complete');
  assert.equal(report.results[0].status, 'inspected');
  assert.equal(report.results[0].indexStatus.googleCanonical, PAGE_URL);
  assert.equal(report.results[0].indexStatus.ignored, undefined);
  assert.ok(!JSON.stringify(report).includes('not persisted'));
  assert.ok(!JSON.stringify(report).includes('canary-secret-token'));
});

test('missing canonical stays unknown; negative Google verdict is a successful observation, not process failure', async () => {
  const missing = apiResult(); delete missing.inspectionResult.indexStatusResult.googleCanonical; delete missing.inspectionResult.indexStatusResult.userCanonical;
  const a = await run({ outcomes: [missing] });
  assert.equal(a.report.results[0].indexStatus.googleCanonical, null);
  assert.equal(a.report.results[0].indexStatus.userCanonical, null);
  const b = await run({ outcomes: [apiResult({ verdict: 'FAIL', coverageState: 'Not indexed' })] });
  assert.equal(b.report.meta.runStatus, 'complete');
  assert.equal(b.report.results[0].indexStatus.verdict, 'FAIL');
});

for (const [name, body] of [
  ['malformed JSON', '{ invalid'], ['absent top data', {}], ['null top data', null],
  ['absent indexStatus', { inspectionResult: {} }], ['empty indexStatus', { inspectionResult: { indexStatusResult: {} } }],
  ['wrong field type', apiResult({ googleCanonical: 12 })], ['unknown verdict', apiResult({ verdict: 'VERDICT_UNSPECIFIED' })],
]) test(`${name} remains an unknown failed observation and never indexed from HTTP 200`, async () => {
  const { report } = await run({ outcomes: [{ status: 200, body }] });
  assert.equal(report.meta.runStatus, 'failed');
  assert.equal(report.results[0].status, 'unknown');
  assert.equal(report.results[0].httpStatus, 200);
  assert.equal(report.results[0].indexStatus, null);
});

for (const status of [401, 403, 404, 429, 500]) test(`HTTP ${status} preserves process failure and sanitized diagnostics`, async () => {
  const { report, calls } = await run({ outcomes: [{ status, body: 'raw private_key access_token canary-secret-token error' }] });
  assert.equal(report.meta.runStatus, 'failed');
  assert.equal(report.results[0].httpStatus, status);
  assert.equal(report.results[0].indexStatus, null);
  assert.ok(calls.length <= 3, 'one OAuth plus at most two inspection attempts');
  assert.ok(!JSON.stringify(report).includes('canary-secret-token'));
  assert.ok(!JSON.stringify(report).includes('raw private_key'));
});

test('network and body deadline failure are bounded and never serialize raw exception text', async () => {
  for (const options of [{ fetchFailure: 'private failure canary-secret-token' }, { timeout: true }]) {
    const { report, calls } = await run(options);
    assert.equal(report.meta.runStatus, 'failed');
    assert.equal(report.results[0].status, 'unknown');
    assert.equal(report.results[0].httpStatus, null);
    assert.ok(calls.length <= 3);
    assert.ok(!JSON.stringify(report).includes('canary-secret-token'));
  }
});

test('the first URL is the batch canary; permission, quota and invalid indexStatus stop with blocked remainder', async () => {
  for (const outcome of [
    { status: 401, body: 'secret' }, { status: 403, body: 'secret' }, { status: 429, body: 'secret' },
    { status: 200, body: { inspectionResult: {} } }, { status: 404, body: 'not found' },
  ]) {
    const { report, calls } = await run({ urls: [PAGE_URL, SECOND], outcomes: [outcome] });
    assert.equal(report.results.length, 2);
    assert.equal(report.results[0].httpStatus, outcome.status);
    assert.equal(report.results[1].status, 'blocked');
    assert.equal(report.results[1].httpStatus, null);
    assert.ok(calls.length <= 3);
    assert.equal(report.counts.planned, 2);
    assert.equal(report.meta.runStatus, 'failed');
  }
});

test('valid canary allows bounded batch, preserves subsequent per-URL failure and stops later permission failures', async () => {
  const { report, calls } = await run({ urls: [PAGE_URL, SECOND, 'https://cubxxw.com/zh/'], outcomes: [apiResult(), { status: 403, body: 'secret' }] });
  assert.equal(calls.length, 3);
  assert.equal(report.meta.runStatus, 'partial');
  assert.equal(report.results[0].status, 'inspected');
  assert.equal(report.results[1].httpStatus, 403);
  assert.equal(report.results[2].status, 'blocked');
});

test('URL and input validation rejects all non-owned and malformed requests before authentication', async () => {
  const mod = await import(moduleUrl);
  for (const url of ['http://cubxxw.com/a', 'https://www.cubxxw.com/a', 'https://cubxxw.com.attacker/a', 'https://daypage.cubxxw.com/', 'https://user:password@cubxxw.com/', 'https://cubxxw.com:443/a', 'https://cubxxw.com/a#fragment', 'not-url', ' https://cubxxw.com/a', 'https://cubxxw.com/a\n']) {
    assert.throws(() => mod.validateInspectionUrls([url]), /URL/i);
  }
  assert.throws(() => mod.validateInspectionUrls([]), /URL/i);
  assert.throws(() => mod.validateInspectionUrls([PAGE_URL, PAGE_URL]), /duplicate/i);
  assert.throws(() => mod.validateInspectionUrls(Array.from({ length: 26 }, (_, i) => `https://cubxxw.com/${i}`)), /25/);
  assert.deepEqual(mod.validateInspectionUrls(['https://cubxxw.com/?p=341']), ['https://cubxxw.com/?p=341']);
  await assert.rejects(mod.collectInspection({ urls: [PAGE_URL], sourceSha: 'bad', fetchedAt: NOW.toISOString() }), /SHA/i);
  await assert.rejects(mod.collectInspection({ urls: [PAGE_URL], sourceSha: SHA, fetchedAt: '2026-10-12' }), /timestamp/i);
});

test('CLI writes auth failures as unknown evidence, preserves old evidence and exits nonzero', async () => {
  const mod = await import(moduleUrl);
  const dir = mkdtempSync(join(evidenceRoot, 'inspection-test-'));
  try {
    const out = join(dir, 'inspect.json');
    const logs = [];
    const deps = { now: () => NOW, env: {}, log: s => logs.push(s), errorLog: s => logs.push(s) };
    const args = ['--out', out, '--source-sha', SHA];
    assert.equal(await mod.main(args, deps), 1);
    const first = readFileSync(out, 'utf8'); const r = JSON.parse(first);
    assert.equal(r.results[0].url, PAGE_URL);
    assert.equal(r.results[0].status, 'blocked');
    assert.equal(r.meta.runStatus, 'failed');
    assert.equal(await mod.main(args, deps), 1);
    assert.equal(readFileSync(out, 'utf8'), first);
    assert.equal(await mod.main(['--help'], deps), 0);
    assert.equal(await mod.main(['--out', join(dir, 'invalid.json'), '--source-sha', SHA, '--url', 'https://evil.example/'], deps), 1);
    assert.equal(await mod.main(['--out', join(dir, 'batch-auth-failed.json'), '--source-sha', SHA, '--url', PAGE_URL, '--url', SECOND], deps), 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});


test('CLI multiline URLs enter only through env, exactly match planned rows and cannot be shell-expanded', async () => {
  const mod = await import(moduleUrl);
  assert.deepEqual(mod.parseCliArgs(['--out', 'safe.json', '--source-sha', SHA, '--urls-env', 'INPUT_URLS'], { INPUT_URLS: PAGE_URL + '\n' + SECOND }).urls, [PAGE_URL, SECOND]);
  assert.throws(() => mod.parseCliArgs(['--out', 'safe.json', '--source-sha', SHA, '--urls-env', 'INPUT_URLS'], { INPUT_URLS: '$(echo danger)' }), /URL/i);
  assert.throws(() => mod.parseCliArgs(['--out', 'safe.json', '--source-sha', SHA, '--urls-env', 'INPUT_URLS'], { INPUT_URLS: '' }), /URL/i);
});


test('OAuth permission and malformed token responses block every URL without leaking response data', async () => {
  for (const options of [
    { authStatus: 403, authBody: 'canary-secret-token' },
    { authBody: {} }, { authBody: 'invalid canary-secret-token' },
  ]) {
    const { report, calls } = await run({ urls: [PAGE_URL, SECOND], ...options });
    assert.equal(calls.length, 1);
    assert.equal(report.meta.runStatus, 'failed');
    assert.equal(report.meta.processError.kind, 'auth');
    assert.ok(report.results.every(row => row.status === 'blocked'));
    assert.ok(!JSON.stringify(report).includes('canary-secret-token'));
  }
});

test('body read timeout remains transport failure inside the bounded request deadline', async () => {
  const mod = await import(moduleUrl);
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push(url);
    if (url === 'https://oauth2.googleapis.com/token') return response(200, { access_token: 'body-secret' });
    return { status: 200, ok: true, text: () => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(Object.assign(new Error('body-secret'), { name: 'AbortError' })))) };
  };
  const r = await mod.collectInspection({ urls: [PAGE_URL, SECOND], sourceSha: SHA, fetchedAt: NOW.toISOString(), serviceAccountJson: credentials, deps: { fetchImpl, timeoutMs: 5, sleep: async () => {} } });
  assert.equal(calls.length, 3);
  assert.equal(r.results[0].error.kind, 'transport');
  assert.equal(r.results[1].status, 'blocked');
  assert.ok(!JSON.stringify(r).includes('body-secret'));
});

test('workflow shell produces exact process evidence, always gates failure, and passes multiline inputs without shell execution', () => {
  const workflow = parseYaml(readFileSync(new URL('../.github/workflows/seo-index-inspection.yml', import.meta.url), 'utf8'));
  assert.equal(workflow.on.schedule, undefined);
  assert.equal(workflow.permissions.contents, 'read');
  assert.equal(workflow.on.workflow_dispatch.inputs.inspection_urls.default, PAGE_URL);
  const steps = workflow.jobs.inspection.steps;
  const collect = steps.find(step => step.id === 'inspect');
  const gate = steps.find(step => step.name === 'Validate process and exact observation artifact');
  const upload = steps.find(step => step.uses?.startsWith('actions/upload-artifact@'));
  assert.equal(upload.if, 'always()');
  const dir = mkdtempSync(join(evidenceRoot, 'inspection-workflow-'));
  try {
    const preload = join(dir, 'offline-fetch.mjs');
    writeFileSync(preload, `globalThis.fetch = async (url, options) => {
      if (url === 'https://oauth2.googleapis.com/token') return {status:200,ok:true,text:async()=>JSON.stringify({access_token:'offline-token'})};
      if (url !== 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect') throw new Error('Unexpected network endpoint');
      const request=JSON.parse(options.body);
      if(request.siteUrl !== 'sc-domain:cubxxw.com') throw new Error('Wrong property');
      return {status:200,ok:true,text:async()=>JSON.stringify({inspectionResult:{indexStatusResult:{verdict:'PASS',googleCanonical:request.inspectionUrl}}})};
    };`);
    const env = { ...process.env, SOURCE_SHA: SHA, REPORT_PATH: join(dir, 'inspection-123-1.json'), PROCESS_PATH: join(dir, 'process-123-1.json'), INPUT_URLS: PAGE_URL + '\n' + SECOND, GSC_SERVICE_ACCOUNT_JSON: credentials, NODE_OPTIONS: '--import ' + pathToFileURL(preload).href };
    const cwd = fileURLToPath(new URL('..', import.meta.url));
    let inspectOutcome = 'success';
    // Resolve the workflow's actual env expression. continue-on-error makes
    // conclusion successful even when the collector's underlying outcome failed.
    const invoke = step => {
      const stepEnv = Object.fromEntries(Object.entries(step === gate ? step.env ?? {} : {}).map(([name, expression]) => [name,
        expression.replace(/\$\{\{\s*steps\.inspect\.(outcome|conclusion)\s*\}\}/g, (_, kind) => kind === 'outcome' ? inspectOutcome : 'success'),
      ]));
      return spawnSync('bash', ['-c', step.run], { cwd, env: { ...env, ...stepEnv }, encoding: 'utf8', timeout: 10000 });
    };
    const success = invoke(collect);
    assert.equal(success.status, 0, success.stderr);
    assert.equal(JSON.parse(readFileSync(env.PROCESS_PATH, 'utf8')).exitCode, 0);
    const report = JSON.parse(readFileSync(env.REPORT_PATH, 'utf8'));
    assert.deepEqual(report.results.map(row => row.url), [PAGE_URL, SECOND]);
    assert.equal(invoke(gate).status, 0);
    const oldReport = readFileSync(env.REPORT_PATH, 'utf8');
    const oldProcess = readFileSync(env.PROCESS_PATH, 'utf8');
    const collision = invoke(collect);
    assert.equal(collision.status, 1, 'no-clobber collector failure must be observable');
    inspectOutcome = collision.status === 0 ? 'success' : 'failure';
    assert.equal(readFileSync(env.REPORT_PATH, 'utf8'), oldReport, 'previous complete report stays untouched');
    assert.equal(readFileSync(env.PROCESS_PATH, 'utf8'), oldProcess, 'previous zero-exit process receipt stays untouched');
    assert.equal(invoke(gate).status, 1, 'old success artifacts cannot hide this collector outcome');
    inspectOutcome = 'success';
    report.meta.sourceSha = 'b'.repeat(40);
    writeFileSync(env.REPORT_PATH, JSON.stringify(report));
    assert.equal(invoke(gate).status, 1, 'wrong source cannot certify this run');
    report.meta.sourceSha = SHA;
    report.results[0].indexStatus = {};
    writeFileSync(env.REPORT_PATH, JSON.stringify(report));
    assert.equal(invoke(gate).status, 1, 'empty IndexStatus cannot certify the workflow');
    env.REPORT_PATH = join(dir, 'invalid-input-123-1.json');
    env.PROCESS_PATH = join(dir, 'invalid-process-123-1.json');
    env.INPUT_URLS = '$(echo should-not-execute)';
    const failure = invoke(collect);
    assert.equal(failure.status, 1);
    assert.equal(JSON.parse(readFileSync(env.PROCESS_PATH, 'utf8')).exitCode, 1);
    assert.ok(!failure.stdout.includes('should-not-execute'));
    assert.equal(invoke(gate).status, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
