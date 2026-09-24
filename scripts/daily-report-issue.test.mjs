import assert from 'node:assert/strict';
import test from 'node:test';
import { applySection } from './daily-report-issue.mjs';

const prefix = '# Daily report\n\n<!-- section:lighthouse -->\nKeep the Lighthouse evidence.\n<!-- /section:lighthouse -->\n\n';
const suffix = '\n\n<!-- section:autofix -->\nKeep the proposal status.\n<!-- /section:autofix -->\n';
const original = `${prefix}<!-- section:seo -->\nOld SEO evidence.\n<!-- /section:seo -->${suffix}`;

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
