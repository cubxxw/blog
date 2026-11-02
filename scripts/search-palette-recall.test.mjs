import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const Fuse = require('../assets/js/vendor/fuse.min.js');
const source = readFileSync(new URL('../assets/js/search-palette.js', import.meta.url), 'utf8');

for (const lang of ['en', 'zh']) {
  test(`${lang} palette preserves full-text tail recall and ranking without unused match ranges`, async () => {
    const tail = lang === 'en' ? 'lunarneedle' : '月面探针';
    const filler = lang === 'en' ? 'ordinary paragraph about a quiet morning. ' : '这是关于安静早晨的普通段落。';
    const documents = [
      { title: tail, content: 'short introduction', permalink: '/title/', summary: '', tags: [] },
      { title: 'Long article', content: filler.repeat(3000) + tail, permalink: '/tail/', summary: '', tags: [] },
      { title: 'Other article', content: filler.repeat(100), permalink: '/other/', summary: '', tags: [] },
    ];
    const dom = new JSDOM(`<!doctype html><html lang="${lang}"><body>
      <button data-search-trigger="nav">Search</button>
      <div id="search-command-palette" data-ai-enabled="false" hidden>
        <input class="search-palette__input"><ul id="search-results-list"></ul>
        <span id="search-result-count"></span><span id="search-result-summary" hidden></span>
        <p id="search-empty" hidden></p><a id="search-full-link" href="/search/">Full search</a>
      </div></body></html>`, {
      url: `https://cubxxw.com/${lang === 'zh' ? 'zh/' : ''}`,
      runScripts: 'outside-only', pretendToBeVisual: true,
    });
    try {
      let options, received, actual;
      dom.window.Fuse = class extends Fuse {
        constructor(data, config) {
          super(data, config);
          received = data; options = config;
        }
        search(query, config) {
          actual = super.search(query, config);
          return actual;
        }
      };
      dom.window.fetch = async () => ({ ok: true, json: async () => documents });
      const input = dom.window.document.querySelector('input');
      input.value = tail;
      dom.window.eval(source);
      dom.window.document.querySelector('[data-search-trigger]').click();
      for (let i = 0; i < 10; i++) await Promise.resolve();

      const rendered = [...dom.window.document.querySelectorAll('[role="option"]')]
        .map(anchor => anchor.getAttribute('href'));
      assert.ok(rendered.includes('/tail/'), 'a match beyond 40,000 body characters must remain discoverable');
      assert.equal(received[1].content, documents[1].content);
      const legacy = new Fuse(documents, { ...options, includeMatches: true });
      assert.deepEqual(rendered, legacy.search(tail, { limit: 10 }).map(row => row.item.permalink));
      assert.equal(options.includeMatches, false, 'the UI does not consume character match ranges');
      assert.ok(actual.every(row => !Object.hasOwn(row, 'matches')));
    } finally {
      dom.window.close();
    }
  });
}
