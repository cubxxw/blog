import { createGitJsonStore } from './git-json-state.mjs';

export const NEWSLETTER_STATE_SCHEMA = 'newsletter-state/2';
const plainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const identity = (language, url) => JSON.stringify([language, canonicalNewsletterUrl(url)]);

export function canonicalNewsletterUrl(value) {
  if (typeof value !== 'string') throw new Error('Newsletter URL must be a canonical cubxxw.com URL.');
  const parsed = new URL(value);
  if (parsed.origin !== 'https://cubxxw.com' || parsed.username || parsed.password || parsed.hash || parsed.search || parsed.href !== value) {
    throw new Error('Newsletter URL must be a canonical https://cubxxw.com URL without query or fragment.');
  }
  return parsed.href;
}

function validateLanguage(language) {
  if (!['zh', 'en'].includes(language)) throw new Error('Newsletter language must be zh or en.');
}

export function migrateNewsletterState(original) {
  if (!plainObject(original) || !plainObject(original.sent)) throw new Error('Invalid newsletter state: sent must be an object.');
  if (original.schema && original.schema !== NEWSLETTER_STATE_SCHEMA) throw new Error('Unsupported newsletter state schema.');
  if (original.schema && !plainObject(original.deliveries)) throw new Error('Invalid newsletter state: deliveries must be an object.');
  const state = structuredClone(original);
  state.schema = NEWSLETTER_STATE_SCHEMA;
  state.deliveries ||= {};
  for (const [url, record] of Object.entries(state.sent)) {
    canonicalNewsletterUrl(url);
    if (!plainObject(record) || typeof record.at !== 'string' || !(typeof record.id === 'string' || record.id === null)) {
      throw new Error('Invalid legacy newsletter record.');
    }
    const language = new URL(url).pathname.startsWith('/zh/') ? 'zh' : 'en';
    const key = identity(language, url);
    state.deliveries[key] ||= { ...record, language, url, status: 'completed', providerId: record.id, legacy: true };
  }
  for (const [key, record] of Object.entries(state.deliveries)) {
    if (!plainObject(record)) throw new Error('Invalid newsletter delivery record.');
    validateLanguage(record.language);
    if (key !== identity(record.language, record.url)) throw new Error('Invalid newsletter delivery identity.');
    if (!['pending', 'needs-reconciliation', 'completed'].includes(record.status)) throw new Error('Invalid newsletter delivery state.');
    if (record.status !== 'completed' && !record.attemptId) throw new Error('Pending newsletter record requires an attempt ID.');
    if (record.status === 'completed' && !record.legacy && !record.providerId) throw new Error('Completed newsletter record requires a provider ID.');
  }
  return state;
}

export function prepareSend({ state, language, url, attemptId, mode = 'draft', now = new Date().toISOString(), resend = false }) {
  validateLanguage(language);
  if (typeof attemptId !== 'string' || !attemptId.trim()) throw new Error('Newsletter attempt ID is required.');
  if (!['draft', 'send'].includes(mode)) throw new Error('Newsletter mode must be draft or send.');
  const result = migrateNewsletterState(state);
  const key = identity(language, url);
  const previous = result.deliveries[key];
  if (previous && previous.status !== 'completed') return { state: result, decision: 'reconcile' };
  if (previous && !resend) return { state: result, decision: 'skip' };
  result.deliveries[key] = {
    language, url, status: 'pending', attemptId, at: now, mode,
    ...(previous ? { previous } : {}),
  };
  return { state: result, decision: 'send' };
}

export function recordSendResult({ state, language, url, attemptId, providerId, now = new Date().toISOString() }) {
  if (typeof providerId !== 'string' || !providerId.trim() || providerId === 'dry-run') throw new Error('A real provider ID is required for reconciliation.');
  const result = migrateNewsletterState(state);
  const key = identity(language, url);
  const record = result.deliveries[key];
  if (!record || record.status === 'completed') throw new Error('No pending newsletter delivery exists.');
  if (record.attemptId !== attemptId) throw new Error('Newsletter attempt ID does not match pending delivery.');
  result.deliveries[key] = { ...record, status: 'completed', providerId, completedAt: now };
  // Preserve the old IDs while recording new URLs for a safe script rollback.
  // Language-specific retries/history remain in deliveries.
  result.sent[url] ||= { at: now, id: providerId, mode: record.mode };
  return result;
}

export async function sendWithIntent({ item, state, persistIntent, createEmail, persistResult }) {
  const prepared = prepareSend({ state, ...item });
  if (prepared.decision !== 'send') return prepared;
  await persistIntent(prepared.state);
  let providerId;
  try {
    const response = await createEmail({ ...item, attemptId: item.attemptId });
    providerId = response?.id;
    const completed = recordSendResult({ state: prepared.state, ...item, providerId });
    await persistResult(completed);
    return { state: completed, decision: 'send', providerId };
  } catch (cause) {
    // The remotely persisted pending record is authoritative. Do not clear it
    // on timeouts, response loss, process interruption, or a failed result push.
    const error = new Error(`Newsletter needs reconciliation for ${item.language} ${item.url} (attempt ${item.attemptId}).`, { cause });
    error.code = 'NEWSLETTER_NEEDS_RECONCILIATION';
    error.state = prepared.state;
    error.providerId = providerId || null;
    throw error;
  }
}

// Each update is a commit built on the latest remote tree using an isolated
// index. It never stashes, rebases, commits, or stages the author's checkout.
// Concurrent changes to the newsletter ledger fail closed; unrelated commits
// are preserved by rebuilding the state-only commit on the fresh remote tree.
export function createGitStateStore(options = {}) {
  return createGitJsonStore({ ...options, statePath: 'config/newsletter-state.json', validateState: migrateNewsletterState, message: 'chore(newsletter): persist delivery state [skip ci]' });
}
