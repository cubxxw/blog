import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';
import { attribute, htmlElements } from './lib/content-page-map.mjs';

const root = path.resolve(process.env.SITE_OUTPUT_DIR || 'public');
const page = route => htmlElements(parse(fs.readFileSync(path.join(root, route, 'index.html'), 'utf8')));
const meta = (nodes, name) => attribute(nodes.find(n => n.tagName === 'meta' && attribute(n, 'name') === name) || {}, 'content');
function css(route, includeInline = true) {
  // Netlify critical CSS may inline first-paint rules and defer the original
  // stylesheet with preload/onload. Inspect both forms of the built artifact.
  return page(route).flatMap(n => {
    if (n.tagName === 'style') return includeInline ? n.childNodes.map(child => child.value || '').join('') : [];
    const rel = (attribute(n, 'rel') || '').split(/\s+/);
    if (n.tagName !== 'link' || !(rel.includes('stylesheet') || (rel.includes('preload') && attribute(n, 'as') === 'style'))) return [];
    const url = new URL(attribute(n, 'href'), 'https://cubxxw.com');
    return url.origin === 'https://cubxxw.com' ? fs.readFileSync(path.join(root, url.pathname), 'utf8') : [];
  }).join('\n');
}
function groups(text) {
  const result = new Map(); let group;
  for (const line of text.split('\n')) {
    const [key, ...parts] = line.split(':'); const value = parts.join(':').trim();
    if (key.toLowerCase() === 'user-agent') { group = []; result.set(value, group); }
    else if (group && key.toLowerCase() === 'disallow') group.push(value);
  }
  return result;
}

test('channel styles stay on their landing pages and preserve source/reset/press order', () => {
  const ai = css('/ai-agent/'), engineering = css('/engineering/');
  assert.match(ai, /\.aia-page\{max-width:860px/);
  assert.doesNotMatch(ai, /\.eng-page\{max-width:920px/);
  assert.match(engineering, /\.eng-page\{max-width:920px/);
  assert.doesNotMatch(engineering, /\.aia-page\{max-width:860px/);
  assert.doesNotMatch(ai, /\.article-layout\{/);
  // Actual source and feedback declarations must retain their cascade order.
  // Critical CSS can duplicate a subset of rules. Verify source ordering in
  // complete linked assets; ownership above also checks the inline subsets.
  const cascade = css('/ai-agent/', false);
  const source = cascade.indexOf('.aia-featured:hover{');
  const reset = cascade.match(/[^{}]*\.aia-featured:hover[^{}]*\{[^}]*transform:none[^}]*\}/)?.index ?? -1;
  const press = cascade.match(/[^{}]*\.aia-featured:active[^{}]*\{[^}]*scale\(\.985\)[^}]*\}/)?.index ?? -1;
  assert.ok(source >= 0 && reset > source && press > reset);
});

test('ordinary articles omit unrelated channel/decorative CSS and column articles retain navigation', () => {
  const ordinary = css('/zh/growth/posts/2025-annual-review/');
  assert.match(ordinary, /\.article-layout\{/);
  assert.doesNotMatch(ordinary, /\.aia-page\{max-width:860px|\.eng-page\{max-width:920px|\.column-outro\{/);
  assert.doesNotMatch(ordinary, /\.hp-hero-field\{position:absolute/);
  const member = css('/ai-agent/posts/agent-identity-from-locke-to-openclaw/');
  assert.match(member, /\.column-outro\{/);
  assert.match(css('/zh/columns/agent-engineering/'), /\.column-page\{/);
  assert.match(css('/'), /\.hp-hero-field\{position:absolute/);
});

test('all production crawler groups preserve private path exclusions', () => {
  const policies = groups(fs.readFileSync(path.join(root, 'robots.txt'), 'utf8'));
  assert.equal(policies.size, 29);
  for (const [agent, rules] of policies) {
    assert.ok(rules.includes('/admin/'), `${agent}: admin excluded`);
    assert.ok(rules.includes('/private/'), `${agent}: private excluded`);
    assert.ok(!rules.includes('/'), `${agent}: public production pages crawlable`);
  }
});

test('bilingual homes preserve self canonical, translations, index policy, and current social identity cards', () => {
  for (const route of ['/', '/zh/']) {
    const nodes = page(route);
    assert.equal(attribute(nodes.find(n => n.tagName === 'link' && attribute(n, 'rel') === 'canonical'), 'href'), `https://cubxxw.com${route}`);
    const alternates = nodes.filter(n => n.tagName === 'link' && attribute(n, 'hreflang')).map(n => attribute(n, 'hreflang'));
    for (const lang of ['zh', 'en', 'x-default']) assert.ok(alternates.includes(lang));
    assert.match(meta(nodes, 'robots'), /^index, follow/);
    const og = attribute(nodes.find(n => n.tagName === 'meta' && attribute(n, 'property') === 'og:image'), 'content');
    assert.match(new URL(og).pathname, /\/social\/identity\/home-(en|zh)_/);
    assert.ok(fs.existsSync(path.join(root, new URL(og).pathname)));
  }
});

test('article JSON-LD is valid, local images exist, and no inert SearchAction or zero dates are emitted', () => {
  const files = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : file.endsWith('.html') ? [file] : [];
  });
  let articles = 0;
  for (const file of files(root)) {
    const nodes = htmlElements(parse(fs.readFileSync(file, 'utf8')));
    for (const script of nodes.filter(n => n.tagName === 'script' && attribute(n, 'type') === 'application/ld+json')) {
      const data = JSON.parse(script.childNodes.map(n => n.value || '').join(''));
      if (data['@type'] === 'WebSite') assert.equal(data.potentialAction, undefined);
      if (data['@type'] !== 'BlogPosting') continue;
      articles++;
      assert.ok(!data.dateModified || !data.dateModified.startsWith('0001-'));
      const image = new URL(data.image);
      assert.doesNotMatch(image.pathname, /\.svg$/i);
      if (image.origin === 'https://cubxxw.com') assert.ok(fs.existsSync(path.join(root, decodeURIComponent(image.pathname))), `${file}: missing ${image.pathname}`);
    }
  }
  assert.ok(articles > 100, 'checks the real article inventory');
});

test('preview homes and every crawler group fail closed', { skip: !process.env.SITE_PREVIEW_DIR }, () => {
  const preview = path.resolve(process.env.SITE_PREVIEW_DIR);
  const policies = groups(fs.readFileSync(path.join(preview, 'robots.txt'), 'utf8'));
  assert.equal(policies.size, 29);
  for (const [agent, rules] of policies) assert.ok(rules.includes('/'), agent);
  for (const route of ['/', '/zh/']) {
    const nodes = htmlElements(parse(fs.readFileSync(path.join(preview, route, 'index.html'), 'utf8')));
    assert.equal(meta(nodes, 'robots'), 'noindex, nofollow');
  }
});
