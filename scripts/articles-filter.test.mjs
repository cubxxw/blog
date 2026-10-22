import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source = readFileSync(new URL('../assets/js/articles-filter.js', import.meta.url), 'utf8');
const card = id => `<article data-library-card data-section="growth" data-tags="AI" data-date="2026-10-${id}"><a class="library-card__link" href="/growth/posts/${id}/">Article ${id}</a></article>`;
const secondPage = `<div id="posts-grid">${card('02')}</div>`;
const settle = () => new Promise(resolve => setImmediate(resolve));

function fixture(t) {
  const dom = new JSDOM(`<!doctype html><html lang="en"><body>
    <div id="library-filter"><div id="filter-categories">
      <button class="library-filter__chip" data-category="all">All</button>
      <button class="library-filter__chip" data-category="growth">Growth</button>
    </div></div>
    <span id="posts-result-count"></span>
    <p id="library-filter-status"></p><p id="library-load-progress"></p>
    <div id="posts-grid" data-total="2" data-page-number="1"
      data-page-urls="/articles/|/articles/page/2/">
      <section data-library-lane="ai"><div data-lane-feed="ai"></div></section>
      <section data-library-lane="life"><div data-lane-feed="life">${card('01')}</div></section>
    </div>
    <nav id="library-pagination"><a data-posts-next href="/articles/page/2/">Load the next set</a></nav>
  </body></html>`, { url: 'https://example.test/articles/', runScripts: 'outside-only', pretendToBeVisual: true });
  t.after(() => dom.window.close());
  const requests = [];
  dom.window.matchMedia = () => ({ matches: true });
  dom.window.fetch = async url => {
    requests.push(url);
    return { ok: true, text: async () => requests.length === 1 ? '<html><body>Temporary error</body></html>' : secondPage };
  };
  dom.window.eval(source);
  const document = dom.window.document;
  return { requests, document, next: document.querySelector('[data-posts-next]'),
    growth: document.querySelector('[data-category="growth"]'),
    cards: () => document.querySelectorAll('[data-library-card]').length };
}

test('a malformed HTTP 200 page remains retryable from the next-page control', async t => {
  const f = fixture(t);
  f.next.click();
  await settle();
  assert.match(f.document.getElementById('library-filter-status').textContent, /Loading failed/);
  assert.equal(f.cards(), 1);
  f.next.click();
  await settle();
  assert.equal(f.requests.length, 2, 'retry must request the failed page again');
  assert.equal(f.cards(), 2);
  assert.equal(f.next.hidden, true);
  f.next.click();
  await settle();
  assert.equal(f.requests.length, 2, 'a successfully appended page must not load twice');
});

test('full-index filtering retries a malformed page instead of caching it as loaded', async t => {
  const f = fixture(t);
  f.growth.click();
  await settle();
  assert.match(f.document.getElementById('library-filter-status').textContent, /could not be loaded/);
  f.growth.click();
  await settle();
  assert.equal(f.requests.length, 2, 'filter retry must include the unparsed page');
  assert.equal(f.cards(), 2);
  assert.equal(f.document.getElementById('posts-result-count').textContent, '2');
});
