import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parse, stringify } from 'yaml';
import { parse as parseHtml } from 'parse5';

const repo = resolve(import.meta.dirname, '..');
let fixture;
const outputs = {};
const backupBase = 'https://cubxxw.github.io/blog/';
const languages = ['en', 'zh'];
function put(path, text) {
  mkdirSync(resolve(path, '..'), { recursive: true });
  writeFileSync(path, text);
}
function nodes(node, result = []) {
  if (node.tagName) result.push(node);
  for (const child of node.childNodes || []) nodes(child, result);
  return result;
}
const attr = (node, name) => node.attrs?.find((attribute) => attribute.name === name)?.value;
const read = (target, path) => readFileSync(join(outputs[target], path), 'utf8');
function htmlNodes(target, path) { return nodes(parseHtml(read(target, path))); }

before(() => {
  fixture = mkdtempSync(join(tmpdir(), 'blog-backup-fixture-'));
  for (const language of languages) {
    const content = join(fixture, 'content', language);
    put(join(content, '_index.md'), '---\ntitle: Fixture Home\n---\n');
    put(join(content, 'projects/_index.md'), '---\ntitle: Products\n---\n');
    put(join(content, 'travel.md'), '---\ntitle: Travel\nlayout: travel\n---\n');
    put(join(content, 'engineering/posts/go-release-tools.md'), '---\ntitle: GoReleaser Fixture\ndate: 2026-01-01T12:00:00+08:00\ntype: posts\nshowtoc: true\ndescription: A fixture article.\nauthor: [Xinwei Xiong]\ntags: [Go]\nfaq:\n  - q: What is tested?\n    a: Static backup behavior.\n---\n\n## Name template\n\n| Variable | Description |\n| --- | --- |\n| `.Version` | Release version |\n');
    put(join(content, 'engineering/posts/canonical-override.md'), '---\ntitle: Canonical Override\ndate: 2026-01-01T12:00:00+08:00\ntype: posts\ncanonicalURL: https://cubxxw.com/original-source/\n---\n\n## Original\n\nOriginal content.\n');
    put(join(content, 'engineering/posts/source-title.md'), '---\ntitle: Displayed Article Title\ndate: 2026-01-01T12:00:00+08:00\ntype: posts\nshowtoc: true\n---\n\n# Original Source Title\n\n[Return to the title](#original-source-title)\n\n## Details\n\nThe title should render once with its original anchor.\n');
  }
  for (const target of ['production', 'backup']) {
    const original = parse(readFileSync(join(repo, 'config.yml'), 'utf8'));
    const override = {
      ...original,
      baseURL: target === 'backup' ? backupBase : 'https://cubxxw.com/',
      themesDir: join(repo, 'themes'),
      staticDir: [join(fixture, 'static')], resourceDir: join(fixture, 'resources', target),
      enableGitInfo: false, disableKinds: ['RSS', 'sitemap'],
      outputs: { home: ['HTML'], page: ['HTML'], section: ['HTML'] },
      languages: Object.fromEntries(languages.map((lang) => [lang, { ...original.languages[lang], contentDir: join(fixture, 'content', lang) }])),
      module: { mounts: [
        ...languages.map((lang) => ({ source: join(fixture, 'content', lang), target: 'content', lang })),
        ...['assets', 'layouts', 'data', 'i18n'].map((dir) => ({ source: join(repo, dir), target: dir })),
        { source: join(repo, 'static/images'), target: 'assets/images' },
      ] },
    };
    if (target === 'backup') {
      const config = join(repo, 'config/ci-backup.yml');
      // The fallback makes the red test exercise today's real templates before
      // the new config exists, instead of merely failing to open a file.
      const backup = existsSync(config) ? parse(readFileSync(config, 'utf8')) : { params: { deploymentTarget: 'backup' } };
      Object.assign(override, { ...backup, params: { ...original.params, ...backup.params } });
    }
    const config = join(fixture, `${target}.yml`);
    put(config, stringify(override));
    outputs[target] = join(fixture, target);
    try {
      execFileSync('hugo', ['--source', fixture, '--config', config, '--destination', outputs[target], '--environment', 'production', '--minify', '--clock', '2026-09-28T08:00:00Z'], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 120_000 });
    } catch (error) { throw new Error(`Hugo fixture failed: ${error.stdout}\n${error.stderr}`, { cause: error }); }
  }
});
after(() => { if (fixture) rmSync(fixture, { recursive: true, force: true }); });

test('backup pages use noindex and primary-domain canonical URLs for both languages', () => {
  for (const prefix of ['', 'zh/']) {
    for (const route of ['', 'engineering/posts/go-release-tools/', 'projects/']) {
      const parsed = htmlNodes('backup', `${prefix}${route}index.html`);
      assert.equal(attr(parsed.find((node) => node.tagName === 'meta' && attr(node, 'name') === 'robots'), 'content'), 'noindex, follow');
      assert.equal(attr(parsed.find((node) => node.tagName === 'link' && attr(node, 'rel') === 'canonical'), 'href'), `https://cubxxw.com/${prefix}${route}`);
    }
  }
});

test('backup canonical honors the existing explicit article override', () => {
  const parsed = htmlNodes('backup', 'engineering/posts/canonical-override/index.html');
  assert.equal(attr(parsed.find((node) => node.tagName === 'link' && attr(node, 'rel') === 'canonical'), 'href'), 'https://cubxxw.com/original-source/');
});

test('stripping a redundant source H1 preserves its public anchor on the visible article title', () => {
  for (const target of ['production', 'backup']) {
    for (const prefix of ['', 'zh/']) {
      const parsed = htmlNodes(target, `${prefix}engineering/posts/source-title/index.html`);
      const headings = parsed.filter((node) => node.tagName === 'h1');
      assert.equal(headings.length, 1);
      assert.equal(attr(headings[0], 'id'), 'original-source-title');
      assert.equal(parsed.filter((node) => attr(node, 'id') === 'original-source-title').length, 1);
    }
  }
});

test('all generated backup HTML, including aliases and errors, stays out of search indexes', () => {
  for (const file of readdirSync(outputs.backup, { recursive: true }).filter((file) => file.endsWith('.html'))) {
    const parsed = htmlNodes('backup', file);
    const robots = attr(parsed.find((node) => node.tagName === 'meta' && attr(node, 'name') === 'robots'), 'content');
    assert.equal(robots, 'noindex, follow', file);
    const canonical = attr(parsed.find((node) => node.tagName === 'link' && attr(node, 'rel') === 'canonical'), 'href');
    if (canonical) assert.equal(new URL(canonical).origin, 'https://cubxxw.com', file);
  }
});

test('language aliases retain Hugo redirect targets on both the primary and backup site', () => {
  for (const target of ['production', 'backup']) {
    const parsed = htmlNodes(target, 'en/index.html');
    const refresh = attr(parsed.find((node) => node.tagName === 'meta' && attr(node, 'http-equiv') === 'refresh'), 'content');
    assert.equal(refresh, `0; url=${target === 'backup' ? backupBase : 'https://cubxxw.com/'}`);
    const canonical = attr(parsed.find((node) => attr(node, 'rel') === 'canonical'), 'href');
    assert.equal(canonical, 'https://cubxxw.com/');
  }
});

test('backup omits AI and email actions while keeping article content, search and RSS links', () => {
  for (const prefix of ['', 'zh/']) {
    for (const route of ['', 'engineering/posts/go-release-tools/']) {
      const parsed = htmlNodes('backup', `${prefix}${route}index.html`);
      const forbidden = parsed.filter((node) => attr(node, 'data-tab') === 'ai' || attr(node, 'data-fsub-form') !== undefined || ['hp-bear-ai', 'search-ai-btn', 'search-ai-box'].includes(attr(node, 'id')));
      assert.equal(forbidden.length, 0, `Unavailable actions remain in ${prefix}${route}`);
      assert.ok(parsed.some((node) => attr(node, 'data-search-trigger') !== undefined || attr(node, 'id') === 'search-command-palette'));
      assert.ok(parsed.some((node) => node.tagName === 'a' && attr(node, 'href')?.includes('index.xml')));
      const scripts = parsed.filter((node) => node.tagName === 'script').map((node) => attr(node, 'src') || '');
      assert.equal(scripts.some((src) => /article-faq\.js|blog-ai-inline\.js/.test(src)), false);
    }
    assert.ok(htmlNodes('backup', `${prefix}engineering/posts/go-release-tools/index.html`).some((node) => node.tagName === 'table'));
  }
});

test('primary site retains AI, newsletter, indexability and default BEAR OS products', () => {
  const home = htmlNodes('production', 'index.html');
  assert.ok(home.some((node) => attr(node, 'id') === 'hp-bear-ai'));
  assert.ok(home.some((node) => attr(node, 'data-fsub-form') !== undefined));
  const article = htmlNodes('production', 'engineering/posts/go-release-tools/index.html');
  assert.ok(article.some((node) => attr(node, 'data-tab') === 'ai'));
  assert.ok(attr(article.find((node) => attr(node, 'name') === 'robots'), 'content').startsWith('index,'));
  for (const target of ['production', 'backup']) assert.ok(read(target, 'projects/index.html').includes('BEAR OS'));
});

test('backup travel keeps the bookshelf while omitting unavailable book AI actions', () => {
  for (const prefix of ['', 'zh/']) {
    const backup = htmlNodes('backup', `${prefix}travel/index.html`);
    const primary = htmlNodes('production', `${prefix}travel/index.html`);
    assert.ok(backup.some((node) => attr(node, 'class')?.includes('tw-tome__spine')));
    assert.equal(backup.some((node) => attr(node, 'class') === 'tw-tome__ask' || attr(node, 'id') === 'tw-book-ai' || attr(node, 'src')?.includes('travel-book-ai.js')), false);
    assert.ok(primary.some((node) => attr(node, 'class') === 'tw-tome__ask'));
    assert.ok(primary.some((node) => attr(node, 'src')?.includes('travel-book-ai.js')));
  }
});
test('travel hero never links to a world map that was not rendered',()=>{
  for(const target of ['production','backup'])for(const prefix of ['', 'zh/']) {
    const parsed=htmlNodes(target,`${prefix}travel/index.html`);
    const hero=parsed.find(node=>node.tagName==='a'&&attr(node,'class')?.split(' ').includes('tw-btn--primary'));
    const hash=new URL(attr(hero,'href'),backupBase).hash.slice(1);
    assert.ok(parsed.some(node=>attr(node,'id')===hash),`${target}/${prefix}: ${hash}`);
  }
});

test('backup navigation and local script/style URLs retain the Pages subpath', () => {
  for (const prefix of ['', 'zh/']) {
    const parsed = htmlNodes('backup', `${prefix}engineering/posts/go-release-tools/index.html`);
    const resources = parsed.filter((node) => node.tagName === 'script' || (node.tagName === 'link' && attr(node, 'rel') === 'stylesheet'));
    for (const node of resources) {
      const path = attr(node, 'src') || attr(node, 'href');
      if (path) {
        const url = new URL(path, backupBase);
        if (url.origin === new URL(backupBase).origin) assert.ok(url.pathname.startsWith('/blog/'), path);
      }
    }
    assert.ok(parsed.some((node) => node.tagName === 'a' && new URL(attr(node, 'href') || '#', backupBase).pathname === `/blog/${prefix}projects/`));
  }
});

test('375px backup reading and search avoid unavailable APIs in both languages', { skip: process.env.BLOG_BACKUP_BROWSER !== '1' }, async () => {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ headless: true });
  const requests = [];
  const errors = [];
  const missing = [];
  const blocked = [];
  try {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.includes('/.netlify/functions/')) {
        requests.push(url.href);
        return route.fulfill({ status: 503, body: 'Unavailable in backup' });
      }
      if (url.origin !== new URL(backupBase).origin) { blocked.push(url.href); return route.abort(); }
      const relative = decodeURIComponent(url.pathname.replace(/^\/blog\//, ''));
      if (relative.includes('..')) return route.abort();
      const path = relative.endsWith('/') ? `${relative}index.html` : relative;
      let file = join(outputs.backup, path || 'index.html');
      if (!existsSync(file)) file = join(repo, 'static', path);
      if (!existsSync(file)) { missing.push(url.href); return route.fulfill({ status: 404, body: 'Missing fixture resource' }); }
      const contentType = ({ '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' })[extname(file)] || 'application/octet-stream';
      return route.fulfill({ status: 200, contentType, body: readFileSync(file) });
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    for (const prefix of ['', 'zh/']) {
      await page.goto(`${backupBase}${prefix}engineering/posts/go-release-tools/`);
      await page.keyboard.press('Control+k');
      try { await page.waitForFunction(() => window.__searchPaletteReady === true, null, { timeout: 5_000 }); }
      catch (error) { throw new Error(`Search failed to initialize: ${JSON.stringify({ errors, missing, blocked, scripts: await page.locator('script[src]').evaluateAll((items) => items.map((item) => item.src)) })}`, { cause: error }); }
      assert.equal(await page.locator('[data-tab="ai"], #search-ai-btn, [data-fsub-form]').count(), 0);
      assert.equal(await page.locator('table').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      await page.locator('.search-palette__input').fill('fixture');
      await page.locator('.search-palette__input').press('Control+Enter');
      await page.keyboard.press('Escape');
    }
    assert.deepEqual(requests, []);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
