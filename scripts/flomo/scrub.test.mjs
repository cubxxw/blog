import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const source = readFileSync(new URL('./scrub.mjs', import.meta.url), 'utf8');
const alpha = { key: 'aaaaaaaaaaaa', date: '2026-10-01', time: '09:00:00', text: 'Synthetic alpha sentence for legacy lookup.' };
const beta = { key: 'bbbbbbbbbbbb', date: '2026-10-01', time: '10:00:00', text: 'Synthetic beta sentence for legacy lookup.' };
const header = '---\ntitle: Synthetic monthly notes\ndate: 2026-11-01T09:00:00+08:00\n---\n\n## Topic\n\n*2 entries*\n\n';
const card = (memo, body, { marker = true, stamp = `${memo.date} ${memo.time}` } = {}) =>
  `${marker ? `<!--memo:${memo.key}-->\n` : ''}### Synthetic heading\n\n> ${stamp} · \`#safe-tag\`\n\n${body}\n\n`;
const full = (key = alpha.key, languages = ['zh']) => ({ key, languages, patterns: [{ find: '^[\\s\\S]+$', replace: '公开修订正文。' }] });

// The real CLI runs in a temporary synthetic repository. It never reads private exports.
function fixture(t, { zh, en, memos = [alpha, beta], redactions = [], drops = [] } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'flomo-scrub-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ['scripts/flomo', '.flomo', 'content/zh/growth/posts', 'content/en/growth/posts']) mkdirSync(join(root, dir), { recursive: true });
  const script = join(root, 'scripts/flomo/scrub.mjs');
  writeFileSync(script, source);
  writeFileSync(join(root, '.flomo/memos.json'), JSON.stringify({ memos }));
  writeFileSync(join(root, 'scripts/flomo/redactions.json'), JSON.stringify({ redactions, drops }));
  for (const [language, value] of Object.entries({ zh, en })) if (value !== undefined) writeFileSync(join(root, `content/${language}/growth/posts/2026-10-thought-notes.md`), value);
  return {
    root,
    script,
    read: (language) => readFileSync(join(root, `content/${language}/growth/posts/2026-10-thought-notes.md`), 'utf8'),
    run: (...args) => {
      const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      return result.stdout;
    },
  };
}

test('a Chinese full-body rule applies in Chinese and leaves English unchanged', (t) => {
  const zh = header + card(alpha, 'Synthetic original Chinese fixture.');
  const en = header + card(alpha, 'The English translation remains English.');
  const f = fixture(t, { zh, en, redactions: [full()] });
  f.run('--write');
  assert.match(f.read('zh'), /公开修订正文。/);
  assert.equal(f.read('en'), en);
});

test('legacy unscoped local redactions still apply to both languages', (t) => {
  const before = header + card(alpha, 'Contact synthetic@example.invalid for details.');
  const f = fixture(t, { zh: before, en: before, redactions: [{ key: alpha.key, patterns: [{ find: 'synthetic@example\\.invalid', replace: '[redacted]' }] }] });
  f.run('--write');
  for (const language of ['zh', 'en']) assert.equal(f.read(language), before.replace('synthetic@example.invalid', '[redacted]'));
});

test('explicit English-only full-body redactions remain supported', (t) => {
  const before = header + card(alpha, 'Synthetic original.');
  const rule = full(alpha.key, ['en']);
  rule.patterns[0].replace = 'Public English revision.';
  const f = fixture(t, { zh: before, en: before, redactions: [rule] });
  f.run('--write');
  assert.equal(f.read('zh'), before);
  assert.match(f.read('en'), /Public English revision\./);
});

test('full-body replacement preserves the next memo marker and entire card', (t) => {
  const next = card(beta, 'The second memo stays byte-for-byte intact.');
  const f = fixture(t, { zh: header + card(alpha, 'Synthetic original.') + next, redactions: [full()] });
  f.run('--write');
  assert.ok(f.read('zh').endsWith(next));
  assert.equal((f.read('zh').match(/<!--memo:/g) ?? []).length, 2);
});

test('dropping a memo removes its own marker and preserves the adjacent marker', (t) => {
  const next = card(beta, 'The second memo stays byte-for-byte intact.');
  const f = fixture(t, { zh: header + card(alpha, 'Synthetic dropped body with enough length to exercise deletion.') + next, drops: [{ key: alpha.key, reason: 'Synthetic privacy reason' }] });
  f.run('--write');
  assert.equal(f.read('zh'), header + next);
});

for (const heading of ['参考资料', 'References', 'AI 与 Agent 系统', 'AI and Agent Systems']) {
  test(`full-body replacement preserves the following H2 section: ${heading}`, (t) => {
    const section = `## ${heading}\n\n- [Synthetic reference](https://example.invalid/reference)\n`;
    const f = fixture(t, { zh: header + card(alpha, 'Synthetic original.') + section, redactions: [full()] });
    f.run('--write');
    assert.ok(f.read('zh').endsWith(section));
  });
}

for (const depth of ['##', '###']) for (const operation of ['replace', 'drop']) {
  test(`a keyed memo's internal ${depth} and following body are handled completely by ${operation}`, (t) => {
    const body = `Synthetic opening.\n\n${depth} Internal report detail\n\nSynthetic private continuation.`;
    const next = card(beta, 'Keep the next memo.');
    const f = fixture(t, { zh: header + card(alpha, body) + next, ...(operation === 'replace' ? { redactions: [full()] } : { drops: [{ key: alpha.key, reason: 'Synthetic privacy reason' }] }) });
    f.run('--write');
    assert.equal(f.read('zh'), header + (operation === 'replace' ? card(alpha, '公开修订正文。') : '') + next);
  });
}

test('a following legacy card is preserved after a keyed memo replacement', (t) => {
  const next = card(beta, 'Keep the unmarked legacy memo.', { marker: false });
  const f = fixture(t, { zh: header + card(alpha, 'Synthetic original.') + next, redactions: [full()] });
  f.run('--write');
  assert.equal(f.read('zh'), header + card(alpha, '公开修订正文。') + next);
});

test('an internal H2 followed by a numbered list remains inside its keyed memo', (t) => {
  const f = fixture(t, { zh: header + card(alpha, 'Synthetic opening.\n\n## Internal report detail\n\n1. Synthetic private continuation.'), redactions: [full()] });
  f.run('--write');
  assert.equal(f.read('zh'), header + card(alpha, '公开修订正文。'));
});

for (const depth of ['##', '###']) test(`an ambiguous legacy ${depth} is reported and the entire legacy document stays unchanged`, (t) => {
  const before = header + card(alpha, `Synthetic opening.\n\n${depth} Unclassified legacy heading\n\nSynthetic continuation.`, { marker: false });
  const f = fixture(t, { zh: before, drops: [{ key: alpha.key, reason: 'Synthetic privacy reason' }] });
  assert.match(f.run('--write'), /uncertain/);
  assert.equal(f.read('zh'), before);
});

test('full-body replacement keeps front matter, title, timestamp, tags and surrounding blank lines', (t) => {
  const f = fixture(t, { zh: header + card(alpha, 'Synthetic original.'), redactions: [full()] });
  f.run('--write');
  assert.equal(f.read('zh'), header + card(alpha, '公开修订正文。'));
});

test('an already clean document is byte-for-byte idempotent', (t) => {
  const before = header + card(alpha, '公开修订正文。') + card(beta, 'Unchanged second body.');
  const f = fixture(t, { zh: before, redactions: [full()] });
  f.run('--write');
  assert.equal(f.read('zh'), before);
  f.run('--write');
  assert.equal(f.read('zh'), before);
});

test('memo keys disambiguate two different records with the same timestamp', (t) => {
  const sameTime = { ...beta, time: alpha.time };
  const kept = card(alpha, 'Keep this first memo despite the identical timestamp.');
  const f = fixture(t, { zh: header + kept + card(sameTime, 'Drop only the second memo identified by its own stable key.'), memos: [alpha, sameTime], drops: [{ key: beta.key, reason: 'Synthetic privacy reason' }] });
  f.run('--write');
  assert.equal(f.read('zh'), header + kept);
});

test('a missing key never falls back into a different keyed memo with the same timestamp', (t) => {
  const missing = { ...beta, time: alpha.time };
  const before = header + card(alpha, 'Keep this memo when the requested key is absent.');
  const f = fixture(t, { zh: before, memos: [alpha, missing], drops: [{ key: beta.key, reason: 'Synthetic privacy reason' }] });
  f.run('--write');
  assert.equal(f.read('zh'), before);
});

test('a missing key fingerprint cannot turn an internal H3 into a legacy entry', (t) => {
  const missing = { ...beta, text: 'Synthetic fingerprint continuation for lookup.' };
  const before = header + card(alpha, `Synthetic opening.\n\n### Internal detail\n\n${missing.text}\n\nSynthetic closing.`);
  const f = fixture(t, { zh: before, memos: [alpha, missing], drops: [{ key: beta.key, reason: 'Synthetic privacy reason' }] });
  f.run('--write');
  assert.equal(f.read('zh'), before);
});

test('legacy cards without markers remain locatable by timestamp', (t) => {
  const before = header + card(alpha, 'Synthetic legacy original.', { marker: false });
  const f = fixture(t, { zh: before, redactions: [full()] });
  f.run('--write');
  assert.equal(f.read('zh'), before.replace('Synthetic legacy original.', '公开修订正文。'));
});

test('legacy changed timestamps can still use a unique text fingerprint', (t) => {
  const before = header + card(alpha, alpha.text, { marker: false, stamp: '2026-10-02 11:00:00' });
  const f = fixture(t, { zh: before, redactions: [full()] });
  f.run('--write');
  assert.equal(f.read('zh'), before.replace(alpha.text, '公开修订正文。'));
});

test('language-scoped drops do not remove the other language', (t) => {
  const before = header + card(alpha, 'Synthetic body to drop only from the selected language.');
  const f = fixture(t, { zh: before, en: before, drops: [{ key: alpha.key, languages: ['zh'], reason: 'Synthetic privacy reason' }] });
  f.run('--write');
  assert.equal(f.read('zh'), header);
  assert.equal(f.read('en'), before);
});

test('the CLI defaults to reporting without changing any article or source export', (t) => {
  const before = header + card(alpha, 'Synthetic original.');
  const f = fixture(t, { zh: before, redactions: [full()] });
  const sourceBefore = readFileSync(join(f.root, '.flomo/memos.json'), 'utf8');
  assert.match(f.run(), /dry-run:/);
  assert.equal(f.read('zh'), before);
  assert.equal(readFileSync(join(f.root, '.flomo/memos.json'), 'utf8'), sourceBefore);
});

test('importing scrub has no file-system side effects or private export dependency', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'flomo-scrub-import-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const script = join(root, 'scrub.mjs');
  writeFileSync(script, source);
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(new URL(`file://${script}`).href)})`], { cwd: dirname(fileURLToPath(import.meta.url)), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
});
