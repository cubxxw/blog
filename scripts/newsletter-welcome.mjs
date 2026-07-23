#!/usr/bin/env node
// Newsletter welcome email — generate the "just subscribed" welcome message
// for zh/en from data/start_here.json (the reading atlas' single source of
// truth), so the curated picks in the email always match the About page.
//
// The welcome email is what makes a fresh subscriber's inbox feel alive the
// moment they confirm: a warm hello plus a hand-picked map of past writing
// (one zero-decision first read + the first pick of each of the four paths)
// — instead of silence until the next new post.
//
// Buttondown delivers welcome emails via an Automation (trigger: subscriber
// confirmed). Automations are dashboard-configured; this script generates
// the two markdown bodies (config/newsletter-welcome.{zh,en}.md) and, when
// BUTTONDOWN_API_KEY is present, probes /v1/automations to report what is
// already configured. Setting it up is a one-time 2-minute dashboard task —
// the printed checklist walks through it.
//
// Usage:
//   node scripts/newsletter-welcome.mjs                # generate files + checklist
//   BUTTONDOWN_API_KEY=xxx node scripts/newsletter-welcome.mjs   # + probe automations

import { readFileSync, writeFileSync } from 'node:fs';

const SITE = 'https://cubxxw.com';
const DATA_PATH = new URL('../data/start_here.json', import.meta.url).pathname;
const OUT = (lang) => new URL(`../config/newsletter-welcome.${lang}.md`, import.meta.url).pathname;
const TOKEN = process.env.BUTTONDOWN_API_KEY;

const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));

// start_here stores logical page paths without a language prefix
// (e.g. "/growth/posts/2025-annual-review"); zh URLs live under /zh/.
// Some posts carry a frontmatter `url:` override (markitdown/langgraph →
// /projects/...), so the naive join can 404 — resolve every URL against
// the live sitemaps and fall back to a slug match when the join misses.
const sitemapUrls = new Set();
for (const sm of [`${SITE}/zh/sitemap.xml`, `${SITE}/en/sitemap.xml`]) {
  const xml = await (await fetch(sm, { redirect: 'follow' })).text();
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) sitemapUrls.add(m[1]);
}

function pageUrl(lang, page) {
  const clean = page.replace(/^\/zh/, '').replace(/\/+$/, '');
  const naive = lang === 'zh' ? `${SITE}/zh${clean}/` : `${SITE}${clean}/`;
  if (sitemapUrls.has(naive)) return naive;
  // slug fallback: find a sitemap URL in this language ending with the slug
  const slug = clean.split('/').pop().toLowerCase();
  const hit = [...sitemapUrls].find((u) => {
    const isZh = u.startsWith(`${SITE}/zh/`);
    return (lang === 'zh') === isZh && u.toLowerCase().replace(/\/+$/, '').endsWith(`/${slug}`);
  });
  if (hit) return hit;
  console.warn(`⚠️  no sitemap match for ${page} (${lang}) — keeping naive URL ${naive}`);
  return naive;
}

const COPY = {
  zh: {
    hello: '你好，我是熊鑫伟。',
    intro: '欢迎正式上车。从现在起，每有新文章写好，我会第一时间寄到你的邮箱——不发广告，也不凑数，写好一篇寄一篇。',
    firstReadLabel: '如果只想先读一篇',
    pathsLabel: '想多读一点？四条路径，各挑了一篇起点',
    reply: '这封信可以直接回复——回信会到我本人的邮箱。想聊 AI、开源还是路上的事，都行。',
    sig: '— 熊鑫伟（cubxxw）',
    more: '完整的阅读地图在这里',
    aboutUrl: `${SITE}/zh/about/#start-here`,
  },
  en: {
    hello: "Hi, I'm Xinwei.",
    intro: "Welcome aboard. From now on, every new post lands in your inbox the moment it's written — no ads, no filler, one email per post.",
    firstReadLabel: 'If you only read one thing',
    pathsLabel: 'Want more? Four paths, one starting point each',
    reply: 'You can reply to this email directly — it reaches my personal inbox. AI, open source, or life on the road: all fair game.',
    sig: '— Xinwei Xiong (cubxxw)',
    more: 'The full reading atlas lives here',
    aboutUrl: `${SITE}/about/#start-here`,
  },
};

function build(lang) {
  const d = data[lang];
  const c = COPY[lang];
  if (!d) throw new Error(`no start_here data for ${lang}`);

  const lines = [];
  lines.push(c.hello);
  lines.push('');
  lines.push(c.intro);
  lines.push('');
  if (d.first_read?.page) {
    lines.push(`**${c.firstReadLabel}**`);
    lines.push('');
    lines.push(`→ [${d.first_read.hook}](${pageUrl(lang, d.first_read.page)})`);
    lines.push('');
  }
  lines.push(`**${c.pathsLabel}**`);
  lines.push('');
  for (const path of d.paths || []) {
    const pick = (path.posts || [])[0];
    if (!pick) continue;
    lines.push(`- **${path.title}** — [${pick.hook}](${pageUrl(lang, pick.page)})`);
  }
  lines.push('');
  lines.push(`[${c.more} →](${c.aboutUrl})`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(c.reply);
  lines.push('');
  lines.push(c.sig);
  return lines.join('\n') + '\n';
}

for (const lang of ['zh', 'en']) {
  const body = build(lang);
  writeFileSync(OUT(lang), body);
  console.log(`📝 wrote config/newsletter-welcome.${lang}.md (${body.length} chars)`);
}

/* ── probe existing automations (read-only) ── */
if (TOKEN) {
  try {
    const res = await fetch('https://api.buttondown.com/v1/automations', {
      headers: { Authorization: `Token ${TOKEN}` },
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      const autos = body.results || body || [];
      console.log(`\n🔍 Buttondown automations configured: ${Array.isArray(autos) ? autos.length : '?'}`);
      for (const a of Array.isArray(autos) ? autos : []) {
        console.log(`   • ${a.name || a.id} — trigger: ${a.trigger || '?'} — status: ${a.status || '?'}`);
      }
    } else {
      console.log(`\n🔍 automations probe: ${res.status} (${JSON.stringify(body).slice(0, 120)})`);
    }
  } catch (e) {
    console.log(`\n🔍 automations probe failed: ${e.message}`);
  }
}

console.log(`
── One-time dashboard setup (≈2 min) ──────────────────────────
1. https://buttondown.com/settings → Automations → New automation
2. Trigger: "Subscriber confirms their subscription"
   Filter:  tag  lang:zh
   Action:  Send an email → paste config/newsletter-welcome.zh.md
3. Repeat for lang:en with config/newsletter-welcome.en.md
   (If your plan has no Automations, use Settings → Subscribing →
   welcome/confirmation message with the zh body — one message for all.)
Done: subscribe → instant confirm email → click → welcome email
with the curated back-catalog arrives immediately.
───────────────────────────────────────────────────────────────`);
