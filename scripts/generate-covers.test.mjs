// Unit tests for the front-matter parse/rewrite path of generate-covers.mjs.
//
// This rewrite runs across every post in content/, so a regression here corrupts
// articles in bulk. No network, no API key, no files touched.
//
//   node --test scripts/generate-covers.test.mjs     (or: npm run covers:test)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  splitFrontMatter,
  scalar,
  list,
  hasCover,
  setCover,
  buildPrompt,
  buildScenePrompt,
} from './generate-covers.mjs';

test('scalar: inline forms', () => {
  assert.equal(scalar('title: Hello World', 'title'), 'Hello World');
  assert.equal(scalar("title: 'Hello: World'", 'title'), 'Hello: World');
  assert.equal(scalar('title: "Hi"', 'title'), 'Hi');
  assert.equal(scalar('title: x', 'description'), null);
  assert.equal(scalar('description:\ntitle: x', 'description'), null);
});

test('scalar: block scalars are matched before the inline form', () => {
  // Regression: several posts write `description: >` with a TRAILING SPACE.
  // An inline-first parser captures the bare ">" and feeds it to the model as
  // the article description. See content/en/ai-agent/posts/
  // emerging-challenges-and-trends-in-2024.md.
  assert.equal(scalar('description: > \n  Line one.\n  Line two.\n', 'description'), 'Line one. Line two.');
  assert.equal(scalar('description: >\n  Only line.\n', 'description'), 'Only line.');
  assert.equal(scalar('description: |\n  Kept.\n', 'description'), 'Kept.');
  assert.equal(scalar('description: >-\n  Chomped.\n', 'description'), 'Chomped.');
});

test('list: inline arrays and block sequences', () => {
  assert.deepEqual(list('tags: ["AI", "LLM"]', 'tags'), ['AI', 'LLM']);
  assert.deepEqual(list('tags:\n  - AI\n  - MCP\n', 'tags'), ['AI', 'MCP']);
  assert.deepEqual(list('title: x', 'tags'), []);
});

test('hasCover: only an actual image counts', () => {
  assert.equal(hasCover('cover:\n  image: /a.png\n'), true);
  // `cover: { hidden: true }` occurs in content/ and is NOT a cover.
  assert.equal(hasCover('cover:\n    hidden: true\n'), false);
  assert.equal(hasCover('title: x'), false);
});

test('setCover: appends a block when none exists', () => {
  assert.equal(
    setCover("title: 'Test'\ntags:\n  - AI", '/images/covers/x.jpeg', 'Test'),
    "title: 'Test'\ntags:\n  - AI\ncover:\n  image: /images/covers/x.jpeg\n  alt: \"Test\"",
  );
});

test('setCover: preserves siblings and neighbouring keys', () => {
  const out = setCover("title: 'T'\ncover:\n    hidden: true\nweight: 5", '/img/x.jpeg', 'T');
  assert.ok(out.includes('hidden: true'), 'sibling key survives');
  assert.ok(out.includes('weight: 5'), 'following key survives');
  assert.ok(out.includes('image: /img/x.jpeg'), 'image inserted');
});

test('setCover: replaces an existing image without duplicating or clobbering alt', () => {
  const out = setCover("title: 'T'\ncover:\n  image: /old.png\n  alt: \"Old alt\"", '/new.jpeg', 'T');
  assert.ok(out.includes('image: /new.jpeg'));
  assert.equal(out.match(/image:/g).length, 1);
  assert.ok(out.includes('Old alt'), 'a hand-written alt is not overwritten');
});

test('setCover: escapes quotes in alt', () => {
  assert.ok(setCover('title: x', '/a.jpeg', 'He said "hi"').includes('\\"hi\\"'));
});

test('setCover: is idempotent', () => {
  const once = setCover('title: x', '/a.jpeg', 'T');
  const twice = setCover(once, '/a.jpeg', 'T');
  assert.equal(twice.match(/^cover:/gm).length, 1);
});

test('round trip: rewriting a real-shaped document keeps it parseable', () => {
  const doc = `---
title: '超级个体的情报系统'
date: 2026-07-15T14:30:00+08:00
draft: false
tags:
  - AI
  - MCP
description: >
  一个人如何搭一套能持续运营的 AI 情报系统。
---

# Body heading

Body text containing a --- horizontal rule.
`;
  const parsed = splitFrontMatter(doc);
  const out = doc.replace(parsed.fm, setCover(parsed.fm, '/images/covers/a.jpeg', 'T'));
  const re = splitFrontMatter(out);

  assert.ok(re, 'front matter still delimited');
  assert.equal(re.body, parsed.body, 'body untouched, including --- inside it');
  assert.equal(scalar(re.fm, 'title'), '超级个体的情报系统');
  assert.deepEqual(list(re.fm, 'tags'), ['AI', 'MCP']);
  assert.equal(scalar(re.fm, 'description'), '一个人如何搭一套能持续运营的 AI 情报系统。');
  assert.equal(hasCover(re.fm), true);
});

// The prompt design is two-stage: buildScenePrompt asks a READING model (the
// LLM driving the script) for one concrete scene; buildPrompt asks the PAINTING
// model to render that scene. Two failure classes are pinned here, both paid
// for in real bad images:
//   - concrete values in the image prompt get drawn literally (misspelled
//     "MCP"/"RSS" labels; a swatch chart with hex codes written on it);
//   - concepts left to the image model regress to tech clichés (glowing
//     tunnels, circuit boards).
test('buildPrompt: with a scene, no metadata reaches the image model', () => {
  const p = buildPrompt({
    title: '超级个体的情报系统',
    description: '覆盖 RSS、RSSHub 等获取通道。',
    tags: ['AI', 'MCP'],
    keywords: ['情报系统'],
    scene: '清晨的长桌上，几条细流汇入一只敞开的木匣。',
  });
  assert.ok(p.includes('画面：清晨的长桌上'), 'the scene is what gets painted');
  assert.ok(!p.includes('MCP'), 'jargon cannot leak into the canvas if it never arrives');
  assert.ok(!p.includes('RSSHub'), 'description text does not ride along');
  assert.ok(!p.includes('超级个体'), 'title does not ride along either');
});

test('buildPrompt: without a scene, only title+description pass through — never tags/keywords', () => {
  const p = buildPrompt({
    title: '超级个体的情报系统',
    description: '一套持续运营的系统。',
    tags: ['AI', 'MCP', 'RSS'],
    keywords: ['Agent'],
  });
  assert.ok(p.includes('标题：超级个体的情报系统'), 'title reaches the model');
  assert.ok(p.includes('摘要：'), 'description reaches the model');
  assert.ok(!p.includes('MCP'), 'tags are the densest drawable jargon — they stay out');
  assert.ok(!p.includes('Agent'), 'keywords stay out too');
  assert.ok(/只用于理解主题/.test(p), 'metadata is explicitly scoped to comprehension');
});

test('buildPrompt: canvas rule is positive-first with a negative backup, in both modes', () => {
  for (const scene of ['一张桌子。', undefined]) {
    const p = buildPrompt({ title: 'x', description: 'y', tags: [], scene });
    assert.ok(/纯图形与图像构成/.test(p), 'positive definition of the canvas comes first');
    assert.ok(/不出现任何文字/.test(p), 'no-text rule present');
    assert.ok(/不出现人脸/.test(p), 'no-people rule present');
  }
});

// Regression: spelling out the site palette by hex code produced a literal
// swatch chart. The fixed style anchor names a medium, a colour budget, and a
// composition — never a colour, never a code. "16:9" stays out of the text too;
// the aspect ratio travels in the API `size` parameter, and digits in the
// prompt are digits the model can draw.
test('buildPrompt: the style anchor names no colours, hex codes, or digits', () => {
  const p = buildPrompt({ title: 'x', description: 'y', tags: [], scene: '一张桌子。' });
  assert.ok(!/#[0-9A-Fa-f]{6}/.test(p), 'no hex codes reach the model');
  assert.ok(!/(靛蓝|青色|大地色|石墨|暖白|palette)/i.test(p), 'no colour vocabulary either');
  assert.ok(!/16:9|\d+x\d+/.test(p), 'aspect ratio lives in the size param, not the text');
  assert.ok(/横构图/.test(p), 'orientation is still stated, in words');
  assert.ok(/留出安静的空间/.test(p), 'upper region stays calm for crops and overlays');
});

test('buildPrompt: tolerates missing fields in fallback mode', () => {
  const p = buildPrompt({ title: 'x', description: '', tags: [] });
  assert.ok(!p.includes('摘要：'), 'absent description produces no line');
  assert.ok(/不出现任何文字/.test(p), 'the no-text rule holds regardless');
});

// Audience targeting: a cover is a share card, and it should signal to its own
// audience what kind of content is behind the link. Each section steers the
// scene's MATERIAL (stage 1) and temperament (stage 2) — never its colours;
// the per-section colour table was tried once and produced the cyber tunnel.
test('section briefs: every content section has one, and none names a colour', () => {
  for (const section of ['ai-agent', 'engineering', 'growth', 'projects']) {
    const s1 = buildScenePrompt({ title: 'x', description: 'y', section });
    const s2 = buildPrompt({ title: 'x', description: 'y', tags: [], section });
    assert.ok(/这是一篇面向/.test(s1), `${section}: stage 1 states the audience`);
    assert.ok(/画面取材于|画面像一张/.test(s1), `${section}: stage 1 steers the material`);
    assert.ok(/画面气质/.test(s2), `${section}: stage 2 carries a temperament clause`);
    for (const p of [s1, s2]) {
      assert.ok(!/#[0-9A-Fa-f]{6}/.test(p), `${section}: no hex codes`);
      assert.ok(!/(靛蓝|青色|大地色|石墨|暖白|蓝色|绿色|红色)/.test(p), `${section}: no colour names`);
    }
  }
});

test('section briefs: tech and life audiences get different material vocabularies', () => {
  const tech = buildScenePrompt({ title: 'x', description: 'y', section: 'ai-agent' });
  const life = buildScenePrompt({ title: 'x', description: 'y', section: 'growth' });
  assert.ok(/仪器|图纸|装置/.test(tech), 'tech scenes draw from instruments and apparatus');
  assert.ok(/自然|日常|植物/.test(life), 'life scenes draw from nature and the everyday');
  assert.ok(!/仪器|图纸/.test(life), 'and the vocabularies do not bleed across');
});

test('section briefs: an unknown or missing section degrades to no brief, not a crash', () => {
  const p1 = buildPrompt({ title: 'x', description: 'y', tags: [], section: 'columns' });
  const p2 = buildScenePrompt({ title: 'x', description: 'y' });
  assert.ok(!/画面气质/.test(p1), 'no temperament clause without a known section');
  assert.ok(!/这是一篇面向/.test(p2), 'no audience line without a section');
  assert.ok(/不出现任何文字/.test(p1), 'canvas rule holds regardless');
});

test('buildScenePrompt: demands a drawable scene and blacklists the clichés', () => {
  const p = buildScenePrompt({
    title: '超级个体的情报系统',
    description: '一套持续运营的系统。',
  });
  assert.ok(p.includes('标题：超级个体的情报系统'), 'the reading model gets the title');
  assert.ok(p.includes('摘要：'), 'and the description');
  assert.ok(/具象的、可以直接画出来/.test(p), 'the answer must be a paintable scene');
  assert.ok(/电路|机器人|网络节点图/.test(p), 'the tech-cliché blacklist is present');
  assert.ok(/只输出画面描述/.test(p), 'the answer format is pinned');
});
