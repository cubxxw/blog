import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  migrateNewsletterState, prepareSend, recordSendResult, sendWithIntent,
  createGitStateStore,
} from './lib/newsletter-state.mjs';

const url = 'https://cubxxw.com/engineering/posts/example/';
const item = { language: 'en', url, attemptId: 'attempt-1', mode: 'draft' };
const empty = () => ({ sent: {} });
const next = (state, overrides = {}) => prepareSend({ state, ...item, ...overrides });

test('legacy migration preserves every provider ID and never re-sends recorded URLs', () => {
  const original = { sent: { [url]: { at: '2026-09-01T00:00:00Z', id: 'provider-old', mode: 'draft' } } };
  const state = migrateNewsletterState(original);
  assert.equal(state.schema, 'newsletter-state/2');
  assert.deepEqual(state.sent, original.sent);
  assert.equal(next(state).decision, 'skip');
  assert.equal(next(state, { language: 'zh' }).decision, 'send');
  assert.equal(original.schema, undefined);
});

test('migration rejects malformed and unknown state rather than treating it as empty', () => {
  for (const state of [{}, { sent: [] }, { schema: 'newsletter-state/3', sent: {} }, { sent: { [url]: null } }]) {
    assert.throws(() => migrateNewsletterState(state), /state|record|schema/);
  }
});

test('persisting intent fails closed before any provider operation', async () => {
  let calls = 0;
  await assert.rejects(() => sendWithIntent({
    item, state: empty(), persistIntent: async () => { throw new Error('push conflict'); },
    createEmail: async () => { calls++; return { id: 'provider-1' }; }, persistResult: async () => {},
  }), /push conflict/);
  assert.equal(calls, 0);
});

test('provider response loss leaves durable intent that requires reconciliation on restart', async () => {
  let durable;
  await assert.rejects(() => sendWithIntent({
    item, state: empty(), persistIntent: async (value) => { durable = structuredClone(value); },
    createEmail: async () => { throw new Error('response lost'); },
    persistResult: async (value) => { durable = structuredClone(value); },
  }), /reconciliation/);
  assert.equal(next(durable, { attemptId: 'retry-2' }).decision, 'reconcile');
});

test('result persistence failure never permits a blind retry', async () => {
  let durable;
  const events = [];
  await assert.rejects(() => sendWithIntent({
    item, state: empty(), persistIntent: async (value) => { durable = structuredClone(value); events.push('intent'); },
    createEmail: async () => { events.push('provider'); return { id: 'provider-1' }; },
    persistResult: async () => { events.push('result'); throw new Error('push denied'); },
  }), /reconciliation/);
  assert.deepEqual(events, ['intent', 'provider', 'result']);
  assert.equal(next(durable).decision, 'reconcile');
});

test('successful result skips only the same language and preserves the existing sent ledger', async () => {
  let durable;
  const result = await sendWithIntent({
    item, state: empty(), persistIntent: async (value) => { durable = value; },
    createEmail: async () => ({ id: 'provider-1' }), persistResult: async (value) => { durable = value; },
  });
  assert.equal(result.providerId, 'provider-1');
  assert.equal(next(durable).decision, 'skip');
  assert.equal(next(durable, { language: 'zh' }).decision, 'send');
});

test('reconciliation requires an existing matching pending attempt and real provider ID', () => {
  const { state } = next(empty());
  assert.throws(() => recordSendResult({ state, ...item, providerId: '' }), /provider/);
  assert.throws(() => recordSendResult({ state, ...item, attemptId: 'wrong', providerId: 'provider-1' }), /attempt/);
  assert.throws(() => recordSendResult({ state: empty(), ...item, providerId: 'provider-1' }), /pending/);
  const reconciled = recordSendResult({ state, ...item, providerId: 'provider-1' });
  assert.equal(next(reconciled).decision, 'skip');
  assert.equal(next(state).decision, 'reconcile');
});

function gitFixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'blog-newsletter-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const remote = join(root, 'remote.git');
  const cwd = join(root, 'checkout');
  const git = (args, opts = {}) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts });
  execFileSync('git', ['init', '--bare', remote], { stdio: 'pipe' });
  execFileSync('git', ['clone', remote, cwd], { stdio: 'pipe' });
  git(['checkout', '-b', 'main']);
  git(['config', 'user.name', 'Fixture']);
  git(['config', 'user.email', 'fixture@example.invalid']);
  mkdirSync(join(cwd, 'config'));
  writeFileSync(join(cwd, 'config/newsletter-state.json'), JSON.stringify(empty()));
  writeFileSync(join(cwd, 'README.md'), 'original');
  git(['add', '.']); git(['commit', '-m', 'fixture']); git(['push', 'origin', 'main']);
  return { cwd, git };
}

test('git state persistence pushes intent without staging or committing author changes', async (t) => {
  const { cwd, git } = gitFixture(t);
  writeFileSync(join(cwd, 'README.md'), 'author work'); git(['add', 'README.md']);
  const beforeIndex = git(['diff', '--cached']);
  const store = createGitStateStore({ cwd });
  const state = await store.load();
  await store.persist(next(state).state);
  const durable = JSON.parse(git(['show', 'refs/remotes/origin/main:config/newsletter-state.json']));
  assert.equal(next(durable).decision, 'reconcile');
  assert.equal(git(['diff', '--cached']), beforeIndex);
  assert.equal(readFileSync(join(cwd, 'README.md'), 'utf8'), 'author work');
  assert.equal(git(['show', 'refs/remotes/origin/main:README.md']), 'original');
});

test('git state persistence catches concurrent newsletter writes before provider call', async (t) => {
  const { cwd } = gitFixture(t);
  const first = createGitStateStore({ cwd });
  const second = createGitStateStore({ cwd });
  const firstState = await first.load();
  const secondState = await second.load();
  await first.persist(next(firstState).state);
  let providerCalls = 0;
  await assert.rejects(() => sendWithIntent({
    item: { ...item, attemptId: 'conflicting-attempt' }, state: secondState,
    persistIntent: second.persist,
    createEmail: async () => { providerCalls++; return { id: 'unexpected' }; }, persistResult: second.persist,
  }), /concurrent|changed|conflict/);
  assert.equal(providerCalls, 0);
});

const { runNewsletter } = await import('./newsletter-send.mjs');
const now = Date.parse('2026-09-28T08:00:00Z');
const feedXml = (language = 'en', count = 1, date = 'Sun, 27 Sep 2026 08:00:00 GMT') => '<rss><channel>' + Array.from({ length: count }, (_, i) => `<item><title>${language} Post ${i}</title><link>https://cubxxw.com/${language === 'zh' ? 'zh/' : ''}engineering/posts/item-${i}/</link><pubDate>${date}</pubDate><description>Text</description></item>`).join('') + '</channel></rss>';
function senderFixture({ state = empty(), count = 1, date } = {}) {
  let persisted = state;
  const calls = [];
  const options = {
    args: [], env: { BUTTONDOWN_API_KEY: 'fake-never-used-on-network' }, now: () => now,
    makeAttemptId: () => 'attempt-fixture', log: () => {},
    store: { load: async () => structuredClone(persisted), persist: async (value) => { calls.push('persist'); persisted = structuredClone(value); } },
    fetchImpl: async (url, request = {}) => {
      calls.push(String(url));
      if (String(url).includes('api.buttondown.com/v1/tags')) return new Response(JSON.stringify({ count: 2, results: [{ name: 'lang:zh', id: 'tag-zh' }, { name: 'lang:en', id: 'tag-en' }] }));
      if (String(url).includes('api.buttondown.com/v1/emails')) {
        const payload = JSON.parse(request.body);
        calls.push(payload);
        return new Response(JSON.stringify({ id: `provider-${calls.length}` }));
      }
      return new Response(feedXml(String(url).includes('/zh/') ? 'zh' : 'en', count, date));
    },
  };
  return { options, calls, state: () => persisted };
}

test('sender dry-run with a token cannot call provider, resolve tags, or write state', async () => {
  const fixture = senderFixture();
  const before = structuredClone(fixture.state());
  const result = await runNewsletter({ ...fixture.options, args: ['--dry-run'] });
  assert.equal(result.sentCount, 0);
  assert.equal(result.wouldSend, 2);
  assert.equal(fixture.calls.some((call) => typeof call === 'string' && (call.includes('buttondown') || call === 'persist')), false);
  assert.deepEqual(fixture.state(), before);
});

test('sender preserves bootstrap without creating provider emails', async () => {
  const fixture = senderFixture({ state: null });
  const result = await runNewsletter(fixture.options);
  assert.equal(result.bootstrap, true);
  assert.equal(result.sentCount, 0);
  assert.equal(fixture.calls.filter((value) => value === 'persist').length, 1);
  assert.equal(fixture.calls.some((call) => typeof call === 'string' && call.includes('buttondown')), false);
  assert.equal(Object.keys(fixture.state().deliveries).length, 2);
});

test('sender enforces global max=3 and language-targeted drafts after durable intent', async () => {
  const fixture = senderFixture({ count: 2 });
  const result = await runNewsletter(fixture.options);
  assert.equal(result.sentCount, 3);
  const payloads = fixture.calls.filter((value) => typeof value === 'object');
  assert.equal(payloads.length, 3);
  assert.deepEqual(payloads.map((value) => value.status), ['draft', 'draft', 'draft']);
  assert.deepEqual(payloads.map((value) => value.filters.filters[0].value), ['tag-zh', 'tag-zh', 'tag-en']);
  assert.equal(payloads.every((value) => value.metadata.attempt_id === 'attempt-fixture'), true);
  assert.ok(fixture.calls.indexOf('persist') < fixture.calls.findIndex((call) => typeof call === 'string' && call.includes('buttondown')));
});

test('sender preserves explicit send mode but rejects stale and future items', async () => {
  const fixture = senderFixture();
  await runNewsletter({ ...fixture.options, args: ['--feed', 'en', '--mode', 'send'] });
  assert.equal(fixture.calls.find((value) => typeof value === 'object').status, 'about_to_send');
  for (const date of ['Sat, 01 Aug 2026 08:00:00 GMT', 'Sun, 01 Nov 2026 08:00:00 GMT']) {
    const stale = senderFixture({ date });
    assert.equal((await runNewsletter(stale.options)).sentCount, 0);
    assert.equal(stale.calls.some((call) => typeof call === 'string' && call.includes('buttondown')), false);
  }
});

test('sender aborts on pending deliveries without touching provider even with --resend', async () => {
  const pendingUrl = 'https://cubxxw.com/engineering/posts/item-0/';
  const pending = next(empty(), { url: pendingUrl }).state;
  const fixture = senderFixture({ state: pending });
  await assert.rejects(() => runNewsletter({ ...fixture.options, args: ['--feed', 'en', '--resend', pendingUrl] }), /reconciliation/);
  assert.equal(fixture.calls.some((call) => typeof call === 'string' && call.includes('buttondown')), false);
});

test('sender rejects noncanonical feed entries before all provider side effects', async () => {
  const fixture = senderFixture();
  await assert.rejects(() => runNewsletter({ ...fixture.options, fetchImpl: async () => new Response(feedXml().replaceAll('https://cubxxw.com/', 'https://evil.example/')) }), /canonical/);
  assert.deepEqual(fixture.calls, []);
});

test('new successful deliveries also protect the legacy ledger for a safe script rollback', () => {
  const pending = next(empty()).state;
  const completed = recordSendResult({ state: pending, ...item, providerId: 'provider-new' });
  assert.equal(completed.sent[url]?.id, 'provider-new');
  assert.equal(completed.sent[url]?.mode, 'draft');
});

test('state-only commit preserves main commits made after newsletter loaded its state', async (t) => {
  const { cwd, git } = gitFixture(t);
  const store = createGitStateStore({ cwd });
  const state = await store.load();
  writeFileSync(join(cwd, 'README.md'), 'new published author change');
  git(['add', 'README.md']); git(['commit', '-m', 'author advance']); git(['push', 'origin', 'main']);
  await store.persist(next(state).state);
  assert.equal(git(['show', 'refs/remotes/origin/main:README.md']), 'new published author change');
  assert.equal(next(JSON.parse(git(['show', 'refs/remotes/origin/main:config/newsletter-state.json']))).decision, 'reconcile');
});

test('manual reconcile updates pending evidence without a provider request', async () => {
  const fixture = senderFixture({ state: next(empty()).state });
  const result = await runNewsletter({ ...fixture.options, args: ['reconcile', '--url', url, '--lang', 'en', '--provider-id', 'provider-checked'] });
  assert.equal(result.reconciled, true);
  assert.deepEqual(fixture.calls, ['persist']);
  assert.equal(next(fixture.state()).decision, 'skip');
});
