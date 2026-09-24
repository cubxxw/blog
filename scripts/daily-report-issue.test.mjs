import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applySection,
  closeStaleDailyIssues,
  dailyTitle,
  dailyTitleDate,
  ensureDailyIssue,
  upsertSection,
} from './daily-report-issue.mjs';

const prefix = '# Daily report\n\n<!-- section:lighthouse -->\nKeep the Lighthouse evidence.\n<!-- /section:lighthouse -->\n\n';
const suffix = '\n\n<!-- section:autofix -->\nKeep the proposal status.\n<!-- /section:autofix -->\n';
const original = `${prefix}<!-- section:seo -->\nOld SEO evidence.\n<!-- /section:seo -->${suffix}`;

// ---------------------------------------------------------------------------
// applySection regression (parent's $-token fix preserved)
// ---------------------------------------------------------------------------

for (const token of ['$&', "$'", '$`', '$$', '$1']) {
  test(`section replacement preserves literal ${token} without copying neighboring evidence`, () => {
    const content = `A code example containing ${token} must stay literal.`;
    const expected = `${prefix}<!-- section:seo -->\n${content}\n<!-- /section:seo -->${suffix}`;
    const result = applySection(original, 'seo', content);
    assert.equal(result, expected);
    assert.equal(applySection(result, 'seo', content), expected);
  });
}

test('quoted marker cannot escape the SEO section or consume another section on rerun', () => {
  const content = '<!-- /section:seo -->\n<!-- section:autofix -->\nQuoted example: $&';
  const first = applySection(original, 'seo', content);
  assert.ok(first.startsWith(prefix));
  assert.ok(first.endsWith(suffix));
  assert.equal((first.match(/<!-- section:seo -->/g) || []).length, 1);
  assert.equal((first.match(/<!-- section:autofix -->/g) || []).length, 1);
  assert.equal(applySection(first, 'seo', 'New evidence.'), `${prefix}<!-- section:seo -->\nNew evidence.\n<!-- /section:seo -->${suffix}`);
});

test('first publication and repeated publication retain other sections and literal tokens', () => {
  const content = "Proposed shell expression: $'quoted' and $$";
  const first = applySection(prefix, 'seo', content);
  assert.ok(first.startsWith(prefix.trimEnd()));
  assert.ok(first.includes(content));
  assert.equal((first.match(/<!-- section:lighthouse -->/g) || []).length, 1);
  assert.equal(applySection(first, 'seo', content), first);
});

// ---------------------------------------------------------------------------
// Frozen UTC report date + date-aware close (B2), all with mocked gh — never
// live external writes
// ---------------------------------------------------------------------------

test('dailyTitle accepts the frozen UTC date and rejects sloppy ones', () => {
  assert.equal(dailyTitle('2026-09-24'), '站点日报 — 2026-09-24');
  assert.equal(dailyTitle(new Date('2026-09-24T23:59:59Z')), '站点日报 — 2026-09-24');
  assert.throws(() => dailyTitle('2026-9-4'), /invalid frozen UTC date/);
  assert.equal(dailyTitleDate('站点日报 — 2026-09-24'), '2026-09-24');
  assert.equal(dailyTitleDate('some human issue'), null);
  assert.equal(dailyTitleDate(null), null);
});

function ghRecorder({ listRows = [], createUrl = 'https://github.com/cubxxw/blog/issues/42', body = prefix } = {}) {
  const calls = [];
  const gh = (args, opts = {}) => {
    calls.push({ args: [...args], input: opts.input });
    if (args[0] === 'issue' && args[1] === 'list') {
      // findIssueByTitle asks --limit 100; closeStaleDailyIssues asks 50
      return JSON.stringify(args.includes('100') ? listRows : listRows);
    }
    if (args[0] === 'label') return '';
    if (args[0] === 'issue' && args[1] === 'create') return `${createUrl}\n`;
    if (args[0] === 'issue' && args[1] === 'view') return body;
    if (args[0] === 'issue' && (args[1] === 'edit' || args[1] === 'close')) return '';
    throw new Error(`unexpected gh call: ${args.join(' ')}`);
  };
  return { gh, calls };
}

test('ensureDailyIssue uses the frozen report date and never re-creates an existing day', () => {
  const existing = ghRecorder({ listRows: [{ number: 7, title: '站点日报 — 2026-09-24', labels: [{ name: 'daily-report' }] }] });
  assert.equal(ensureDailyIssue({ repo: 'cubxxw/blog', date: '2026-09-24', gh: existing.gh }), 7);
  assert.ok(existing.calls.every((c) => !c.args.includes('create')));

  const fresh = ghRecorder();
  assert.equal(ensureDailyIssue({ repo: 'cubxxw/blog', date: '2026-09-24', gh: fresh.gh }), 42);
  const create = fresh.calls.find((c) => c.args[0] === 'issue' && c.args[1] === 'create');
  assert.ok(create.args.includes('站点日报 — 2026-09-24'), 'creation carries the frozen date, not the runner clock');
});

test('upsertSection is idempotent per section and preserves neighboring sections (mocked gh)', () => {
  const { gh, calls } = ghRecorder({ body: original });
  upsertSection({ repo: 'cubxxw/blog', issueNumber: 7, marker: 'seo', content: 'Fresh SEO evidence.', gh });
  const first = calls.find((c) => c.args.includes('edit'));
  assert.ok(first.args.includes('--body-file'));
  assert.ok(first.input.includes('Fresh SEO evidence.'));
  assert.ok(first.input.includes('Keep the Lighthouse evidence.'));
  assert.ok(first.input.includes('Keep the proposal status.'));
  assert.equal((first.input.match(/<!-- section:seo -->/g) || []).length, 1);

  // repeated publication of the same content is stable
  const { gh: gh2, calls: calls2 } = ghRecorder({ body: first.input });
  upsertSection({ repo: 'cubxxw/blog', issueNumber: 7, marker: 'seo', content: 'Fresh SEO evidence.', gh: gh2 });
  const second = calls2.find((c) => c.args.includes('edit'));
  assert.equal(second.input, first.input);
});

test('closeStaleDailyIssues reaps strictly older days only — a delayed run never closes a newer issue', () => {
  const rows = [
    { number: 1, title: '站点日报 — 2026-09-22', labels: [{ name: 'daily-report' }] }, // older: close
    { number: 2, title: '站点日报 — 2026-09-23', labels: [{ name: 'daily-report' }] }, // older: close
    { number: 3, title: '站点日报 — 2026-09-24', labels: [{ name: 'daily-report' }] }, // keep (same day)
    { number: 4, title: '站点日报 — 2026-09-25', labels: [{ name: 'daily-report' }] }, // NEWER: never close
    { number: 5, title: '站点日报 — 2026-09-21', labels: [] },                       // unlabelled human issue: never
    { number: 6, title: 'a human issue', labels: [{ name: 'daily-report' }] },        // unparseable title: never
    { number: 7, title: '站点日报 — 2026-09-20', labels: [{ name: 'daily-report' }] }, // older but keepNumber
  ];
  const { gh, calls } = ghRecorder({ listRows: rows });
  const closed = closeStaleDailyIssues({ repo: 'cubxxw/blog', keepNumber: 7, date: '2026-09-24', gh });
  assert.deepEqual(closed.sort(), [1, 2]);
  const closes = calls.filter((c) => c.args[1] === 'close').map((c) => Number(c.args[2]));
  assert.deepEqual(closes.sort(), [1, 2]);
});

test('delayed rerun of a closed frozen date adopts the existing issue (never duplicates it)', () => {
  const rows = [
    { number: 42, title: '站点日报 — 2026-09-23', labels: [{ name: 'daily-report' }], state: 'CLOSED' },
    { number: 43, title: '站点日报 — 2026-09-24', labels: [{ name: 'daily-report' }], state: 'OPEN' },
  ];
  const { gh, calls } = ghRecorder({ listRows: rows });
  assert.equal(ensureDailyIssue({ repo: 'cubxxw/blog', date: '2026-09-23', gh }), 42, 'the closed same-day issue is adopted');
  assert.ok(!calls.some((c) => c.args[1] === 'create'), 'no duplicate creation for the same frozen date');
  assert.ok(!calls.some((c) => c.args[1] === 'close' || c.args[1] === 'reopen'), 'the adopted closed issue is not reopened');

  // section update lands on the adopted issue (its other sections stay put)
  const { gh: gh2, calls: calls2 } = ghRecorder({ listRows: rows });
  upsertSection({ repo: 'cubxxw/blog', issueNumber: 42, marker: 'seo', content: 'Rerun evidence.', gh: gh2 });
  const edit = calls2.find((c) => c.args.includes('edit'));
  assert.ok(edit.args.includes('42'));
  assert.ok(edit.input.includes('Rerun evidence.'));

  // date-aware close keeps the NEWER #43 open even from the older date's run
  const { gh: gh3, calls: calls3 } = ghRecorder({ listRows: rows });
  assert.deepEqual(closeStaleDailyIssues({ repo: 'cubxxw/blog', keepNumber: 42, date: '2026-09-23', gh: gh3 }), []);
  assert.ok(!calls3.some((c) => c.args[1] === 'close'));
});

test('duplicate same-day issues deterministically prefer the open one', () => {
  const rows = [
    { number: 5, title: '站点日报 — 2026-09-24', labels: [{ name: 'daily-report' }], state: 'CLOSED' },
    { number: 9, title: '站点日报 — 2026-09-24', labels: [{ name: 'daily-report' }], state: 'OPEN' },
  ];
  const { gh } = ghRecorder({ listRows: rows });
  assert.equal(ensureDailyIssue({ repo: 'cubxxw/blog', date: '2026-09-24', gh }), 9);
  const { gh: gh2 } = ghRecorder({ listRows: [rows[0]] });
  assert.equal(ensureDailyIssue({ repo: 'cubxxw/blog', date: '2026-09-24', gh: gh2 }), 5, 'closed-only match is still adopted');
});
