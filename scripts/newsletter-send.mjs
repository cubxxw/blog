#!/usr/bin/env node
// Each email requires a remotely persisted delivery intent. A provider timeout
// or failed result push leaves pending evidence for manual reconciliation.
// Dry runs read feeds and state only: no provider calls and no Git writes.
import { readFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { buildSubscriberTagFilter, fetchButtondownTagIds } from './lib/buttondown-tags.mjs';
import {
  canonicalNewsletterUrl, createGitStateStore, migrateNewsletterState,
  prepareSend, recordSendResult, sendWithIntent,
} from './lib/newsletter-state.mjs';

const SITE = 'https://cubxxw.com';
const API = 'https://api.buttondown.com/v1/emails';
const STATE_PATH = fileURLToPath(new URL('../config/newsletter-state.json', import.meta.url));
const FEEDS = {
  zh: { path: '/zh/index.xml', tagName: 'lang:zh', readMore: '继续阅读全文 →', footer: `你收到这封信，是因为你在 [cubxxw.com](${SITE}/zh/) 订阅了新文章通知。` },
  en: { path: '/index.xml', tagName: 'lang:en', readMore: 'Continue reading →', footer: `You are receiving this because you subscribed to new-post updates on [cubxxw.com](${SITE}/).` },
};

function parseOptions(args, env) {
  const values = {};
  const command = args[0] === 'reconcile' ? 'reconcile' : 'send';
  const allowed = new Set(['--mode', '--feed', '--recent', '--max', '--resend', '--feed-base-url', '--release-context', '--state-persistence', '--url', '--lang', '--provider-id']);
  for (let i = command === 'reconcile' ? 1 : 0; i < args.length; i++) {
    const [name, inlineValue] = args[i].split(/=(.*)/s);
    if (name === '--dry-run' && inlineValue === undefined) { values[name] = true; continue; }
    if (!allowed.has(name)) throw new Error(`Unknown newsletter option: ${name}`);
    const value = inlineValue ?? args[++i];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}`);
    values[name] = value;
  }
  const mode = values['--mode'] || env.NEWSLETTER_MODE || 'draft';
  const feed = values['--feed'] || 'all';
  const recent = Number(values['--recent'] ?? 7);
  const max = Number(values['--max'] ?? 3);
  if (!['draft', 'send'].includes(mode)) throw new Error('--mode must be draft|send.');
  if (!['zh', 'en', 'all'].includes(feed)) throw new Error('--feed must be zh|en|all.');
  if (![recent, max].every((value) => Number.isSafeInteger(value) && value > 0)) throw new Error('--recent and --max must be positive integers.');
  if ((values['--state-persistence'] || 'git') !== 'git') throw new Error('Live newsletter state requires --state-persistence=git.');
  if (values['--resend']) canonicalNewsletterUrl(values['--resend']);
  return { command, values, mode, feedKeys: feed === 'all' ? ['zh', 'en'] : [feed], recent, max, dryRun: values['--dry-run'] === true };
}

function unescapeXml(value) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();
}
function pick(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? unescapeXml(match[1]) : '';
}
function parseFeed(xml) {
  if (!/<rss[\s>]/.test(xml) || !/<\/rss>/.test(xml)) throw new Error('Newsletter feed is not a complete RSS document.');
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g), ([, block]) => ({
    title: pick(block, 'title'), url: pick(block, 'link'), pubDate: pick(block, 'pubDate'),
    description: pick(block, 'description'), cover: unescapeXml((block.match(/<enclosure url="([^"]+)"/) || [])[1] || ''),
  })).filter((item) => item.title && item.url);
}
function buildBody(item, feed) {
  return [item.cover ? `![](${item.cover})` : '', item.description, `**[${feed.readMore}](${item.url})**`, '---', feed.footer].filter(Boolean).join('\n\n');
}

export async function runNewsletter({
  args = [], env = process.env, fetchImpl = fetch, now = Date.now,
  makeAttemptId = randomUUID, log = console.log, store, verifiedRelease,
} = {}) {
  const options = parseOptions(args, env);
  const { values, mode, feedKeys, recent, max, dryRun } = options;
  let feedBaseUrl = SITE;
  if (values['--feed-base-url']) {
    const { validateFeedBaseUrl } = await import('./lib/release-followups.mjs');
    const proof = verifiedRelease ?? (values['--release-context'] ? JSON.parse(readFileSync(values['--release-context'], 'utf8')) : null);
    feedBaseUrl = validateFeedBaseUrl({ ...proof, feedBaseUrl: values['--feed-base-url'] });
  }
  const persistence = store || (dryRun ? {
    load: async () => existsSync(STATE_PATH) ? JSON.parse(readFileSync(STATE_PATH, 'utf8')) : null,
    persist: async () => { throw new Error('Dry runs cannot persist newsletter state.'); },
  } : createGitStateStore());
  let state = await persistence.load();
  const bootstrap = state === null;
  state = migrateNewsletterState(state ?? { sent: {} });
  if (options.command === 'reconcile') {
    const language = values['--lang'];
    const url = canonicalNewsletterUrl(values['--url']);
    const record = state.deliveries[JSON.stringify([language, url])];
    if (!record || record.status === 'completed') throw new Error('No pending newsletter delivery exists for reconciliation.');
    const result = recordSendResult({ state, language, url, attemptId: record.attemptId, providerId: values['--provider-id'] });
    if (!dryRun) await persistence.persist(result);
    log(`${dryRun ? '[dry-run] would reconcile' : 'Reconciled'} ${language} ${url} against provider ID ${values['--provider-id']}.`);
    return { reconciled: !dryRun, sentCount: 0, wouldSend: 0, bootstrap };
  }

  // Validate all selected feeds before any email operation. Fixed deploy feeds
  // cannot redirect to a mutable production feed or another host.
  const allItems = [];
  for (const language of feedKeys) {
    const feedUrl = new URL(FEEDS[language].path, feedBaseUrl).href;
    const response = await fetchImpl(feedUrl, { headers: { 'User-Agent': 'blog-newsletter/2.0' }, redirect: 'error', signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`Newsletter feed failed (${response.status}): ${feedUrl}`);
    for (const item of parseFeed(await response.text())) {
      canonicalNewsletterUrl(item.url);
      allItems.push({ ...item, language });
    }
  }
  const timestamp = new Date(now()).toISOString();
  if (bootstrap) {
    for (const item of allItems) {
      const prepared = prepareSend({ state, ...item, attemptId: makeAttemptId(), now: timestamp, mode });
      if (prepared.decision === 'send') {
        state = recordSendResult({ state: prepared.state, ...item, attemptId: prepared.state.deliveries[JSON.stringify([item.language, item.url])].attemptId, providerId: 'bootstrap', now: timestamp });
      }
    }
    if (!dryRun) await persistence.persist(state);
    log(`${dryRun ? '[dry-run] ' : ''}Bootstrap: recorded ${allItems.length} feed items without creating emails.`);
    return { bootstrap: true, sentCount: 0, wouldSend: 0 };
  }

  let sentCount = 0;
  let wouldSend = 0;
  let tagIds;
  for (const item of allItems) {
    const isResend = values['--resend'] === item.url;
    const attempt = { ...item, attemptId: makeAttemptId(), now: timestamp, mode, resend: isResend };
    const prepared = prepareSend({ state, ...attempt });
    if (prepared.decision === 'reconcile') throw new Error(`Newsletter needs reconciliation for ${item.language} ${item.url}; inspect the pending attempt before retrying.`);
    if (prepared.decision === 'skip') continue;
    const age = now() - Date.parse(item.pubDate);
    if (!isResend && (!Number.isFinite(age) || age < 0 || age > recent * 86_400_000)) continue;
    if (sentCount + wouldSend >= max) break;
    if (dryRun) {
      wouldSend++;
      // In-memory only, so duplicate RSS entries do not inflate the preview.
      state = recordSendResult({ state: prepared.state, ...attempt, providerId: 'preview-only' });
      log(`[dry-run] would create ${mode} email: ${item.language} ${item.url}`);
      continue;
    }
    if (!env.BUTTONDOWN_API_KEY) throw new Error('BUTTONDOWN_API_KEY is required to create newsletter emails.');
    const result = await sendWithIntent({
      state, item: attempt, persistIntent: persistence.persist, persistResult: persistence.persist,
      createEmail: async () => {
        tagIds ||= await fetchButtondownTagIds({ token: env.BUTTONDOWN_API_KEY, requiredNames: feedKeys.map((key) => FEEDS[key].tagName), fetchImpl });
        const feed = FEEDS[item.language];
        const payload = {
          subject: item.title, body: buildBody(item, feed), status: mode === 'send' ? 'about_to_send' : 'draft',
          filters: buildSubscriberTagFilter(tagIds[feed.tagName]),
          metadata: { source: 'newsletter-send', post_url: item.url, language: item.language, attempt_id: attempt.attemptId },
        };
        const response = await fetchImpl(API, {
          method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000),
          headers: { Authorization: `Token ${env.BUTTONDOWN_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`Buttondown email creation failed (${response.status}); reconcile the attempt before retrying.`);
        return response.json();
      },
    });
    state = result.state;
    sentCount++;
    log(`${mode === 'send' ? 'Sent' : 'Drafted'} ${item.language} ${item.url}; provider ${result.providerId}.`);
  }
  return { bootstrap: false, sentCount, wouldSend };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runNewsletter({ args: process.argv.slice(2) }).then((result) => {
    console.log(`Newsletter complete: ${result.sentCount} created; ${result.wouldSend} dry-run candidates.`);
  }).catch((error) => {
    console.error(error.message);
    if (error.providerId) console.error(`Provider returned ${error.providerId}; record it with the reconcile command after checking the provider dashboard.`);
    process.exitCode = 1;
  });
}
