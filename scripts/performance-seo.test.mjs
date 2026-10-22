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

test('first-screen font and cover contracts avoid late swaps and oversized mobile requests', () => {
  for (const route of ['/', '/zh/']) {
    const fontLink = page(route).find(n => n.tagName === 'link' &&
      (attribute(n, 'href') || '').startsWith('https://fonts.googleapis.com/css2'));
    assert.equal(new URL(attribute(fontLink, 'href')).searchParams.get('display'), 'optional');
  }
  const nodes = page('/zh/growth/posts/2025-annual-review/');
  const cover = nodes.find(n => n.tagName === 'img' && attribute(n, 'fetchpriority') === 'high');
  assert.equal(attribute(cover, 'loading'), 'eager');
  const sizes = attribute(cover, 'sizes');
  assert.ok(sizes.startsWith('(max-width: 768px) calc(100vw - 40px),'));
  // At the CI's 412px / 1.75 DPR the reading column needs 651 image pixels,
  // below 720; using 100vw would ask for 721 and promote the 1080 candidate.
  const widths = attribute(cover, 'srcset').split(',').map(s => Number(s.trim().split(/\s+/).at(-1).slice(0, -1)));
  assert.equal(widths.filter(w => w >= (412 - 40) * 1.75).sort((a, b) => a - b)[0], 720);
});

test('landing pages omit article-only series, sharing, and FAQ styles', () => {
  for (const route of ['/zh/growth/', '/zh/ai-agent/']) {
    const rules = css(route, false);
    assert.equal(/\.article-faq\s*\{|\.rc-series-head\s*\{|\.share-sheet\s*\{/.test(rules), false, `${route}: no article-only controls`);
  }
  const article = css('/zh/growth/posts/2025-annual-review/', false);
  assert.ok(/\.article-faq\s*\{/.test(article), 'article keeps FAQ styles');
  assert.ok(/\.rc-series-head\s*\{/.test(article), 'article keeps series styles');
  assert.ok(/\.share-sheet\s*\{/.test(article), 'article keeps sharing styles');
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

test('Chinese first viewport keeps a timely webfont fallback when local CJK fonts are absent',()=>{
  const nodes=page('/zh/growth/posts/2025-annual-review/');
  const fonts=nodes.find(n=>n.tagName==='link'&&attribute(n,'id')==='zh-prose-fonts');
  assert.ok(fonts);
  assert.equal(attribute(fonts,'rel'),'preload','a cold font manifest cannot block first paint');
  assert.equal(attribute(fonts,'as'),'style');
  const fontCSS=fs.readFileSync(path.join(root,attribute(fonts,'href')),'utf8');
  assert.match(fontCSS,/font-display:optional/);
  assert.doesNotMatch(fontCSS,/font-display:swap|url\(\.\//);
  assert.ok(!nodes.some(n=>n.tagName==='link'&&(attribute(n,'href')||'').includes('fonts.googleapis.com')));
  const linked=css('/zh/growth/posts/2025-annual-review/',false);
  assert.doesNotMatch(linked,/html:lang\(zh\) \.article-tldr,html:lang\(zh\) \.article-main \.post-title\{font-family:[^}]*SimSun,serif\}/,'first-screen fallback cannot be local-only');
  assert.match(linked,/--font-display:[^}]*Noto Serif SC/);
});

test('mobile top-link breakpoint guard avoids layout width reads and desktop behavior survives',async()=>{
  const {runInNewContext}=await import('node:vm');
  const nodes=page('/zh/growth/posts/2025-annual-review/');
  const code=nodes.find(n=>n.tagName==='script'&&n.childNodes.some(c=>(c.value||'').includes('function updateTopLink')))?.childNodes.map(c=>c.value||'').join('');
  assert.ok(code,'execute the actual compiled top-link script');
  for(const desktop of [false,true]){
    const button={querySelector:()=>null,style:{},classList:{toggle:(_key,value)=>{button.visible=value;}}};
    const window={matchMedia:query=>{assert.equal(query,'(min-width: 1024px)');return {matches:desktop,addEventListener(){}};},addEventListener(){},requestAnimationFrame:fn=>fn()};
    Object.defineProperty(window,'innerWidth',{get(){throw new Error('breakpoint guard forced layout');}});
    const document={getElementById:()=>button,body:{scrollTop:900},documentElement:{scrollTop:0,scrollHeight:4000,clientHeight:1000}};
    runInNewContext(code,{window,document},{timeout:1000});
    if(desktop){assert.equal(button.style.visibility,'visible');assert.equal(button.visible,true);}
    else assert.deepEqual(button.style,{});
  }
});
