import test from 'node:test';
import assert from 'node:assert/strict';
import { auditRequestPolicy, summarizePublicAudit } from './audit-public-site.mjs';

test('live audit permits only same-site GET/HEAD resources, never API or third-party side effects', () => {
  assert.equal(auditRequestPolicy('https://cubxxw.com/zh/', 'GET'), 'allow');
  assert.equal(auditRequestPolicy('https://cubxxw.com/assets/site.css', 'HEAD'), 'allow');
  for (const path of ['/.netlify/functions/blog-ai', '/.netlify/functions/article-ai', '/.netlify/functions/subscribe-email', '/api/chat']) {
    assert.equal(auditRequestPolicy(`https://cubxxw.com${path}`, 'GET'), 'block-api');
  }
  assert.equal(auditRequestPolicy('https://cubxxw.com/subscribe', 'POST'), 'block-method');
  assert.equal(auditRequestPolicy('https://provider.example/model', 'GET'), 'block-external');
});

test('audit keeps unknown or changed production versions distinct from consistent measured evidence', () => {
  const before = { sourceSha: 'a'.repeat(40), releaseId: 'one' };
  assert.equal(summarizePublicAudit({ before: null, after: null, pages: [] }).versionStatus, 'unversioned');
  const changed = summarizePublicAudit({ before, after: { ...before, releaseId: 'two' }, pages: [] });
  assert.equal(changed.versionStatus, 'changed-during-audit');
  assert.equal(changed.ok, false);
  const broken = summarizePublicAudit({ before, after: before, pages: [{ path: '/zh/', ok: false, failures: ['horizontal overflow'] }] });
  assert.equal(broken.ok, false);
  assert.equal(broken.pages[0].failures[0], 'horizontal overflow');
  assert.equal(summarizePublicAudit({ before, after: before, pages: [{ path: '/', ok: true, failures: [] }] }).versionStatus, 'consistent');
});
