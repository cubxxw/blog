import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSubscriberTagFilter,
  fetchButtondownTagIds,
  resolveButtondownTagIds,
} from './lib/buttondown-tags.mjs';

const tags = [
  { id: 'sub_tag_zh', name: 'lang:zh' },
  { id: 'sub_tag_en', name: 'lang:en' },
];

test('resolves human-readable tag names to Buttondown identifiers', () => {
  assert.deepEqual(
    resolveButtondownTagIds(tags, ['lang:zh', 'lang:en']),
    { 'lang:zh': 'sub_tag_zh', 'lang:en': 'sub_tag_en' },
  );
});

test('rejects missing and duplicate tags instead of widening the audience', () => {
  assert.throws(
    () => resolveButtondownTagIds(tags, ['lang:missing']),
    /does not exist/,
  );
  assert.throws(
    () => resolveButtondownTagIds([...tags, tags[0]], ['lang:zh']),
    /duplicated/,
  );
});

test('fetches tags with authentication and returns identifiers', async () => {
  let request;
  const result = await fetchButtondownTagIds({
    token: 'test-token',
    requiredNames: ['lang:zh', 'lang:en'],
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 200,
        async json() {
          return { count: tags.length, results: tags };
        },
      };
    },
  });

  assert.match(request.url, /\/v1\/tags\?page_size=100$/);
  assert.equal(request.options.headers.Authorization, 'Token test-token');
  assert.deepEqual(result, { 'lang:zh': 'sub_tag_zh', 'lang:en': 'sub_tag_en' });
});

test('builds an audience filter with the resolved identifier', () => {
  assert.deepEqual(buildSubscriberTagFilter('sub_tag_zh'), {
    predicate: 'and',
    filters: [
      {
        field: 'subscriber.tags',
        operator: 'contains',
        value: 'sub_tag_zh',
      },
    ],
    groups: [],
  });
});

test('surfaces Buttondown lookup failures', async () => {
  await assert.rejects(
    fetchButtondownTagIds({
      token: 'test-token',
      requiredNames: ['lang:zh'],
      fetchImpl: async () => ({
        ok: false,
        status: 403,
        async json() {
          return { detail: 'Forbidden' };
        },
      }),
    }),
    /lookup failed \(403\)/,
  );
});
