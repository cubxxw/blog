#!/usr/bin/env node
// Newsletter send — close the subscribe loop. The footer/homepage subscribe
// band collects readers into Buttondown (tagged lang:zh / lang:en by the
// subscribe-email function), but nothing ever emailed them. This script reads
// the live RSS feeds, diffs against a committed state file, and creates one
// Buttondown email per new post, targeted at that language's subscribers.
//
// Safety design:
//   • First run (no state file): bootstrap — mark every current feed item as
//     sent WITHOUT emailing, so a fresh setup never blasts the archive.
//   • --recent N days window (default 7) — stale items never send.
//   • --max N per run (default 3) — a malformed feed can't flood inboxes.
//   • Default mode "draft": emails land in the Buttondown dashboard for a
//     one-click human send. NEWSLETTER_MODE=send (or --mode send) goes
//     fully automatic via status "about_to_send".
//
// Usage:
//   BUTTONDOWN_API_KEY=xxx node scripts/newsletter-send.mjs                 # zh+en, draft mode
//   BUTTONDOWN_API_KEY=xxx node scripts/newsletter-send.mjs --mode send     # fully automatic
//   BUTTONDOWN_API_KEY=xxx node scripts/newsletter-send.mjs --feed zh
//   BUTTONDOWN_API_KEY=xxx node scripts/newsletter-send.mjs --resend <post-url>
//   node scripts/newsletter-send.mjs --dry-run                              # no key needed
//
// State: config/newsletter-state.json (committed) — { sent: { url: {at, id} } }

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SITE = 'https://cubxxw.com';
const API = 'https://api.buttondown.com/v1/emails';
const STATE_PATH = new URL('../config/newsletter-state.json', import.meta.url).pathname;

const FEEDS = {
  zh: { url: `${SITE}/zh/index.xml`, tag: 'lang:zh', readMore: '继续阅读全文 →', footer: `你收到这封信，是因为你在 [cubxxw.com](${SITE}/zh/) 订阅了新文章通知。` },
  en: { url: `${SITE}/index.xml`, tag: 'lang:en', readMore: 'Continue reading →', footer: `You are receiving this because you subscribed to new-post updates on [cubxxw.com](${SITE}/).` },
};

const args = process.argv.slice(2);
const flag = (name) => args.indexOf(name);
const val = (name, fallback) => {
  const i = flag(name);
  return i !== -1 ? args[i + 1] : fallback;
};

const DRY_RUN = flag('--dry-run') !== -1;
const MODE = (val('--mode', process.env.NEWSLETTER_MODE || 'draft')).toLowerCase(); // draft | send
const FEED_SEL = val('--feed', 'all'); // zh | en | all
const RECENT_DAYS = parseInt(val('--recent', '7'), 10);
const MAX_PER_RUN = parseInt(val('--max', '3'), 10);
const RESEND_URL = val('--resend', null);
const TOKEN = process.env.BUTTONDOWN_API_KEY;

if (!['draft', 'send'].includes(MODE)) {
  console.error(`❌ --mode must be draft|send, got "${MODE}"`);
  process.exit(1);
}
if (!TOKEN && !DRY_RUN) {
  console.error('❌ BUTTONDOWN_API_KEY env var is required (or use --dry-run).');
  process.exit(1);
}

/* ── feed parsing (same naive-but-sufficient approach as baidu-push) ── */
async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'blog-newsletter/1.0' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.text();
}

function unescapeXml(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? unescapeXml(m[1]) : '';
}

function parseFeed(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const cover = (block.match(/<enclosure url="([^"]+)"/) || [])[1] || null;
    items.push({
      title: pick(block, 'title'),
      link: pick(block, 'link'),
      pubDate: pick(block, 'pubDate'),
      description: pick(block, 'description'),
      cover,
    });
  }
  return items.filter((it) => it.title && it.link);
}

/* ── state ── */
function loadState() {
  if (!existsSync(STATE_PATH)) return null;
  return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
}
function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
}

/* ── email body (Buttondown renders markdown; it appends its own
     mandatory unsubscribe footer, so we keep ours to attribution) ── */
function buildBody(item, feed) {
  const parts = [];
  if (item.cover) parts.push(`![](${item.cover})`);
  if (item.description) parts.push(item.description);
  parts.push(`**[${feed.readMore}](${item.link})**`);
  parts.push('---');
  parts.push(feed.footer);
  return parts.join('\n\n');
}

async function createEmail(item, feed) {
  const payload = {
    subject: item.title,
    body: buildBody(item, feed),
    status: MODE === 'send' ? 'about_to_send' : 'draft',
    included_tags: [feed.tag],
    metadata: { source: 'newsletter-send', post_url: item.link },
  };
  if (DRY_RUN) {
    console.log(`  [dry-run] would create ${payload.status} email "${item.title}" → tag ${feed.tag}`);
    return { id: 'dry-run' };
  }
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Token ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Buttondown ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  }
  return body;
}

/* ── main ── */
const now = Date.now();
const windowMs = RECENT_DAYS * 24 * 3600 * 1000;
const feedKeys = FEED_SEL === 'all' ? Object.keys(FEEDS) : [FEED_SEL];
if (feedKeys.some((k) => !FEEDS[k])) {
  console.error(`❌ --feed must be zh|en|all`);
  process.exit(1);
}

let state = loadState();
const bootstrap = state === null;
if (bootstrap) {
  console.log('🌱 No state file — bootstrap run: marking current feed items as sent (no emails).');
  state = { sent: {} };
}

let sentCount = 0;
let failed = false;

for (const key of feedKeys) {
  const feed = FEEDS[key];
  console.log(`\n📡 ${key} feed: ${feed.url}`);
  let items;
  try {
    items = parseFeed(await fetchText(feed.url));
  } catch (e) {
    console.error(`  ❌ feed fetch failed: ${e.message}`);
    failed = true;
    continue;
  }
  console.log(`  ${items.length} items in feed`);

  for (const item of items) {
    const already = state.sent[item.link];
    const age = now - Date.parse(item.pubDate || 0);
    const isResendTarget = RESEND_URL && item.link === RESEND_URL;

    if (bootstrap && !isResendTarget) {
      state.sent[item.link] = { at: new Date(now).toISOString(), id: 'bootstrap' };
      continue;
    }
    if (already && !isResendTarget) continue;
    if (!isResendTarget && (Number.isNaN(age) || age > windowMs)) continue;
    if (!isResendTarget && sentCount >= MAX_PER_RUN) {
      console.log(`  ⏸ --max ${MAX_PER_RUN} reached; remaining new items wait for the next run.`);
      break;
    }

    try {
      const result = await createEmail(item, feed);
      state.sent[item.link] = { at: new Date(now).toISOString(), id: result.id || null, mode: MODE };
      sentCount++;
      console.log(`  ✉️  ${MODE === 'send' ? 'sent' : 'drafted'}: ${item.title}`);
    } catch (e) {
      console.error(`  ❌ ${item.title}: ${e.message}`);
      failed = true; // leave out of state so the next run retries
    }
  }
}

if (!DRY_RUN) {
  saveState(state);
  console.log(`\n💾 state saved (${Object.keys(state.sent).length} URLs tracked)`);
}
console.log(bootstrap
  ? '✅ bootstrap complete — future posts will be emailed.'
  : `✅ done — ${sentCount} email(s) ${MODE === 'send' ? 'sent' : 'drafted'}.`);
process.exit(failed ? 1 : 0);
