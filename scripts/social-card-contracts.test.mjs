import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkSocialCard } from './lib/social-card-contracts.mjs';

const tags = {
  'og:image': 'https://cubxxw.com/social/card.png',
  'twitter:image': 'https://cubxxw.com/social/card.png',
  'og:image:secure_url': 'https://cubxxw.com/social/card.png',
  'twitter:card': 'summary_large_image', 'og:image:type': 'image/png',
  'og:image:width': '1200', 'og:image:height': '630',
  'og:image:alt': '公开的实践与思想档案', 'twitter:image:alt': '公开的实践与思想档案',
  'og:title': '中文标题', 'og:description': '页面摘要',
};
const html = values => Object.entries(values).map(([name, value]) => `<meta property="${name}" content="${value}">`).join('');
function fixture(t, width = 1200) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-card-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'social'));
  const png = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
  png.writeUInt32BE(width, 16); png.writeUInt32BE(630, 20);
  fs.writeFileSync(path.join(root, 'social/card.png'), png);
  return root;
}
test('valid shared PNG metadata and backup prefix', t => {
  const root = fixture(t);
  assert.deepEqual(checkSocialCard(html(tags), root), []);
  const values = { ...tags };
  for (const name of ['og:image', 'twitter:image', 'og:image:secure_url']) values[name] = 'https://backup.example/blog/social/card.png';
  assert.deepEqual(checkSocialCard(html(values), root, { baseURL: 'https://backup.example/blog/' }), []);
  assert.ok(checkSocialCard(html(values), root).some(e => e.includes('missing')));
  assert.ok(checkSocialCard(html(values), root).some(e => e.includes('origin')));
});
test('reject stale card, mismatched platform images, duplicate tags and missing files', t => {
  const root = fixture(t);
  assert.ok(checkSocialCard(html({ ...tags, 'og:image': 'https://cubxxw.com/assets/og-image.png' }), root).some(e => e.includes('Retired')));
  assert.ok(checkSocialCard(html({ ...tags, 'twitter:image': 'https://cubxxw.com/other.png' }), root).some(e => e.includes('differ')));
  assert.ok(checkSocialCard(html(tags) + '<meta property="og:image" content="other">', root).some(e => e.includes('found 2')));
  fs.unlinkSync(path.join(root, 'social/card.png'));
  assert.ok(checkSocialCard(html(tags), root).some(e => e.includes('missing')));
});
test('reject false dimensions, SVG bytes, missing alt and insecure URL', t => {
  const root = fixture(t, 600);
  assert.ok(checkSocialCard(html(tags), root).some(e => e.includes('Actual')));
  fs.writeFileSync(path.join(root, 'social/card.png'), '<svg></svg>');
  assert.ok(checkSocialCard(html(tags), root).some(e => e.includes('not a PNG')));
  assert.ok(checkSocialCard(html({ ...tags, 'og:image:alt': '' }), root).some(e => e.includes('empty')));
  assert.ok(checkSocialCard(html({ ...tags, 'og:image': 'http://cubxxw.com/social/card.png' }), root).some(e => e.includes('HTTPS')));
});
test('Hugo wraps Chinese, Latin words and wide-letter long tokens within three lines', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-lines-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const cases = ['公开的实践与思想档案', 'W'.repeat(26), 'M'.repeat(70), 'An open archive of practice and thought', '非常长的中文标题'.repeat(20)];
  fs.mkdirSync(path.join(root, 'layouts/partials/seo'), { recursive: true });
  fs.mkdirSync(path.join(root, 'data/social'), { recursive: true });
  fs.copyFileSync(path.join(repo, 'layouts/partials/seo/social-lines.html'), path.join(root, 'layouts/partials/seo/social-lines.html'));
  fs.copyFileSync(path.join(repo, 'data/social/font_widths.json'), path.join(root, 'data/social/font_widths.json'));
  fs.writeFileSync(path.join(root, 'hugo.json'), JSON.stringify({ baseURL: 'https://example.com', params: { cases } }));
  fs.writeFileSync(path.join(root, 'layouts/index.html'), '{{ $lines := slice }}{{ range site.Params.cases }}{{ $lines = $lines | append (partial "seo/social-lines.html" (dict "text" . "limit" 16.25)) }}{{ end }}{{ $lines | jsonify | safeHTML }}');
  execFileSync('hugo', ['--source', root, '--quiet'], { stdio: 'pipe' });
  const results = JSON.parse(fs.readFileSync(path.join(root, 'public/index.html'), 'utf8'));
  const widths = JSON.parse(fs.readFileSync(path.join(root, 'data/social/font_widths.json'), 'utf8'));
  for (const text of results) {
    assert.ok(text.split('\n').length <= 3);
    for (const line of text.split('\n')) {
      const width = [...line].reduce((sum, char) => sum + (widths[char] ?? 1), 0);
      assert.ok(width <= 16.25, `${line} exceeds card width: ${width}`);
    }
  }
  assert.equal(results[0], cases[0]);
  assert.ok(results[1].includes('\n'));
  assert.ok(results[3].includes('open archive'));
  assert.ok(results[4].endsWith('…'));
});
