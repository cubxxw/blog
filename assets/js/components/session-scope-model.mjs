/**
 * session-scope-model.mjs — pure model + spec validator for
 * <blog-session-scope> (GROUP state / OpenClaw "Session key" explainer).
 *
 * Teaching model: a finite set of synthetic messages from two people across
 * two channels and several accounts (the same person across accounts is
 * included). Each dmScope mode computes the EXACT session key formats
 * described for the pinned OpenClaw source (v2026.7.1-2,
 * `src/routing/session-key.ts`, formats quoted in the article) from the
 * message's own dimensions, then groups messages by that key — so merging
 * and separation become verifiable. The optional identity-link case only
 * applies an explicitly configured peerId → canonical mapping: it is a
 * configured join, never identity verification.
 *
 * Pure module: no DOM, no timers, no network, and no import from
 * spec-schema.mjs (the validator is CALLED by spec-schema with its own
 * PathCtx and helpers, avoiding a circular import).
 */

export const SESSION_SCOPE_MODEL_KEYS = ['agentId', 'mainKey', 'messages', 'identityLinks'];
export const MODES = ['main', 'per-peer', 'per-channel-peer', 'per-account-channel-peer'];

const LIMITS = {
  id: 64,
  peerId: 40,
  text: 240,
  label: 80,
  title: 120,
  question: 400,
  note: 400,
  footerNote: 120,
  notice: 200,
  messages: 12,
  identityLinks: 8,
};

const PEER_RE = /^[A-Za-z0-9_.:-]{1,40}$/;

const COPY_KEYS = [
  'figureLabel',
  'title',
  'question',
  'assumption',
  'observe',
  'footerNote',
  'referenceTitle',
  'scenarioLabels',
  'agentLabel',
  'keyLabel',
  'formatLabel',
  'groupsLabel',
  'messagesLabel',
  'dimensions',
  'readings',
  'identityTitle',
  'identityNotice',
  'mapLabel',
  'people',
];

function describe(value) {
  if (typeof value === 'string') return JSON.stringify(value.slice(0, 40));
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  if (typeof value === 'object') return 'an object';
  return String(value);
}

function boolField(p, value) {
  if (typeof value !== 'boolean') {
    p.fail(`expected a boolean, got ${describe(value)}`);
    return false;
  }
  return true;
}

function validateTextNodeCopy(p, value, maxLen) {
  const langs = ['zh', 'en'];
  if (!p.keys(value, langs)) return false;
  let ok = true;
  for (const lang of langs) {
    const lp = p.child(lang);
    if (!lp.keys(value[lang], ['text'])) {
      ok = false;
    } else if (!lp.child('text').text(value[lang].text, maxLen)) {
      ok = false;
    }
  }
  return ok;
}

function validateCopy(p, raw, scenarioIds, personIds) {
  const cp = p.child('copy');
  if (!cp.keys(raw.copy, ['zh', 'en'])) return false;
  let ok = true;
  for (const lang of ['zh', 'en']) {
    const lp = cp.child(lang);
    const copy = raw.copy[lang];
    if (!lp.keys(copy, COPY_KEYS)) {
      ok = false;
      continue;
    }
    if (!lp.child('figureLabel').text(copy.figureLabel, LIMITS.label)) ok = false;
    if (!lp.child('title').text(copy.title, LIMITS.title)) ok = false;
    if (!lp.child('question').text(copy.question, LIMITS.question)) ok = false;
    if (!lp.child('assumption').text(copy.assumption, LIMITS.note)) ok = false;
    if (!lp.child('observe').text(copy.observe, LIMITS.note)) ok = false;
    if (!lp.child('footerNote').text(copy.footerNote, LIMITS.footerNote)) ok = false;
    if (!lp.child('referenceTitle').text(copy.referenceTitle, LIMITS.label)) ok = false;
    if (!lp.child('agentLabel').text(copy.agentLabel, LIMITS.label)) ok = false;
    if (!lp.child('keyLabel').text(copy.keyLabel, LIMITS.label)) ok = false;
    if (!lp.child('formatLabel').text(copy.formatLabel, LIMITS.label)) ok = false;
    if (!lp.child('groupsLabel').text(copy.groupsLabel, LIMITS.label)) ok = false;
    if (!lp.child('messagesLabel').text(copy.messagesLabel, LIMITS.label)) ok = false;
    if (!lp.child('identityTitle').text(copy.identityTitle, LIMITS.label)) ok = false;
    if (!lp.child('identityNotice').text(copy.identityNotice, LIMITS.notice)) ok = false;
    if (!lp.child('mapLabel').text(copy.mapLabel, LIMITS.label)) ok = false;
    if (!lp.child('dimensions').textMap(copy.dimensions, ['person', 'channel', 'account', 'peer'], LIMITS.label)) {
      ok = false;
    }
    if (!lp.child('readings').textMap(copy.readings, ['single', 'shared'], LIMITS.note)) ok = false;
    const people = lp.child('people');
    if (personIds && !people.keys(copy.people, [...personIds])) {
      ok = false;
    } else if (personIds) {
      for (const id of personIds) {
        if (!people.child(id).text(copy.people[id], LIMITS.label)) ok = false;
      }
    }
    const labels = lp.child('scenarioLabels');
    if (scenarioIds && !labels.keys(copy.scenarioLabels, [...scenarioIds])) {
      ok = false;
    } else if (scenarioIds) {
      for (const id of scenarioIds) {
        if (!labels.child(id).text(copy.scenarioLabels[id], LIMITS.label)) ok = false;
      }
    }
  }
  return ok;
}

/**
 * Validator entry (called by spec-schema.mjs validateSpec after
 * validateCommon). `helpers` carries { validateScenariosList,
 * validateSourceRefs } from the shared schema module.
 */
export function validateSessionScope(p, raw, helpers) {
  let ok = true;
  const { validateScenariosList, validateSourceRefs } = helpers;
  const messagePeerIds = new Set();
  const personIds = new Set();
  const channels = new Set();
  const accounts = new Set();

  const mp = p.child('model');
  if (!mp.keys(raw.model, SESSION_SCOPE_MODEL_KEYS)) {
    ok = false;
  } else {
    const m = raw.model;
    if (!mp.child('agentId').id(m.agentId)) ok = false;
    if (!mp.child('mainKey').id(m.mainKey)) ok = false;

    const sp = mp.child('messages');
    const messages = m.messages;
    if (!Array.isArray(messages) || messages.length < 4 || messages.length > LIMITS.messages) {
      sp.fail(`expected 4..${LIMITS.messages} synthetic messages`);
      ok = false;
    } else {
      const seen = new Set();
      messages.forEach((msg, i) => {
        const ip = sp.index(i);
        if (msg === null || typeof msg !== 'object' || Array.isArray(msg)) {
          ip.fail(`expected a message object, got ${describe(msg)}`);
          ok = false;
          return;
        }
        let mok = ip.keys(msg, ['id', 'person', 'channel', 'accountId', 'peerId', 'copy']);
        if (!ip.child('id').id(msg.id)) {
          ok = false;
          return;
        }
        if (seen.has(msg.id)) {
          ip.child('id').fail(`duplicate message id "${msg.id}"`);
          mok = false;
        }
        seen.add(msg.id);
        if (!ip.child('person').id(msg.person)) {
          mok = false;
        } else {
          personIds.add(msg.person);
        }
        if (!ip.child('channel').id(msg.channel)) {
          mok = false;
        } else {
          channels.add(msg.channel);
        }
        if (!ip.child('accountId').id(msg.accountId)) {
          mok = false;
        } else {
          accounts.add(msg.accountId);
        }
        if (!ip.child('peerId').text(msg.peerId, LIMITS.peerId)) {
          mok = false;
        } else if (!PEER_RE.test(msg.peerId)) {
          ip.child('peerId').fail(`peerId must match ${PEER_RE}`);
          mok = false;
        } else {
          messagePeerIds.add(msg.peerId.toLowerCase());
        }
        // The account/channel dimensions are first-class evidence and must
        // survive every grouping verbatim.
        if (!validateTextNodeCopy(ip.child('copy'), msg.copy, LIMITS.text)) mok = false;
        if (!mok) ok = false;
      });
      if (personIds.size < 2) {
        sp.fail('the scope model needs at least two people to show merging and separation');
        ok = false;
      }
      if (channels.size < 2) {
        sp.fail('the scope model needs at least two channels (the channel dimension must be observable)');
        ok = false;
      }
      if (accounts.size < 2) {
        sp.fail('the scope model needs at least two accounts (the account dimension must be observable)');
        ok = false;
      }
    }

    const lp = mp.child('identityLinks');
    const links = m.identityLinks;
    if (!Array.isArray(links) || links.length > LIMITS.identityLinks) {
      lp.fail(`expected 0..${LIMITS.identityLinks} configured identity links`);
      ok = false;
    } else {
      const seen = new Set();
      links.forEach((link, i) => {
        const ip = lp.index(i);
        if (link === null || typeof link !== 'object' || Array.isArray(link)) {
          ip.fail(`expected an identity link object, got ${describe(link)}`);
          ok = false;
          return;
        }
        let lok = ip.keys(link, ['peerId', 'canonical']);
        if (!ip.child('peerId').text(link.peerId, LIMITS.peerId)) {
          lok = false;
        } else if (!PEER_RE.test(link.peerId)) {
          ip.child('peerId').fail(`peerId must match ${PEER_RE}`);
          lok = false;
        } else if (!messagePeerIds.has(link.peerId.toLowerCase())) {
          // Alias comparison is case-insensitive, matching upstream.
          ip.child('peerId').fail(`identity link peerId "${link.peerId}" matches no message peerId`);
          lok = false;
        }
        if (typeof link.peerId === 'string') {
          const lowered = link.peerId.toLowerCase();
          if (seen.has(lowered)) {
            ip.child('peerId').fail(`duplicate identity link for "${link.peerId}" (aliases compare case-insensitively)`);
            lok = false;
          }
          seen.add(lowered);
        }
        if (!ip.child('canonical').id(link.canonical)) lok = false;
        if (!lok) ok = false;
      });
    }
  }

  const scenarioIds = validateScenariosList(p, raw, (ip, scenario) => {
    let sok = ip.keys(scenario, ['id', 'mode', 'useIdentityLinks']);
    if (!ip.child('mode').enum(scenario.mode, MODES)) sok = false;
    if (!boolField(ip.child('useIdentityLinks'), scenario.useIdentityLinks)) sok = false;
    if (
      scenario.useIdentityLinks === true &&
      Array.isArray(raw.model && raw.model.identityLinks) &&
      raw.model.identityLinks.length === 0
    ) {
      ip.child('useIdentityLinks').fail(
        'an identity-link case requires a non-empty configured mapping (never implied identity)'
      );
      sok = false;
    }
    return sok;
  });
  if (!scenarioIds) ok = false;

  // Verifiable grouping across ALL four documented modes is this kind's
  // learning question: every mode must be selectable.
  const scenarios = Array.isArray(raw.scenarios) ? raw.scenarios : [];
  for (const mode of MODES) {
    if (!scenarios.some((s) => s && typeof s === 'object' && s.mode === mode)) {
      p.child('scenarios').fail(`missing a scenario for dmScope mode "${mode}" (all four modes are required)`);
      ok = false;
    }
  }
  const combos = new Set();
  scenarios.forEach((s, i) => {
    if (s && typeof s === 'object' && typeof s.mode === 'string' && typeof s.useIdentityLinks === 'boolean') {
      const combo = `${s.mode}|${s.useIdentityLinks}`;
      if (combos.has(combo)) {
        p.child('scenarios').index(i).fail(`duplicate scenario semantics (${s.mode}, useIdentityLinks=${s.useIdentityLinks})`);
        ok = false;
      }
      combos.add(combo);
    }
  });

  if (!validateCopy(p, raw, scenarioIds || undefined, personIds.size > 0 ? personIds : undefined)) ok = false;
  if (!validateSourceRefs(p, raw)) ok = false;
  return ok;
}

/* ── pure model ─────────────────────────────────────────────────────────── */

/**
 * The EXACT key formats described by the pinned source (article quote of
 * `src/routing/session-key.ts` at v2026.7.1-2). Placeholders resolve from
 * the message's own dimensions — account/channel dimensions are preserved
 * exactly wherever the mode includes them.
 */
export const KEY_TEMPLATES = {
  main: 'agent:<agentId>:<mainKey>',
  'per-peer': 'agent:<agentId>:direct:<peerId>',
  'per-channel-peer': 'agent:<agentId>:<channel>:direct:<peerId>',
  'per-account-channel-peer': 'agent:<agentId>:<channel>:<accountId>:direct:<peerId>',
};

/**
 * Resolved effective peer id: configured identity link, else the raw peer.
 * Alias matching is case-insensitive (mirroring upstream alias comparison);
 * the mapping itself is a SIMPLIFIED TEACHING SCHEMA, not OpenClaw's
 * drop-in configuration format.
 */
export function effectivePeer(model, message, useIdentityLinks) {
  if (useIdentityLinks) {
    const needle = message.peerId.toLowerCase();
    const link = model.identityLinks.find((l) => l.peerId.toLowerCase() === needle);
    if (link) return link.canonical;
  }
  return message.peerId;
}

/**
 * Compute the session key of one message for one case. The effective peer
 * id is lowercased AFTER identity resolution — exactly as the pinned
 * source's `buildAgentPeerSessionKey` does. Channel and account dimensions
 * are preserved verbatim wherever the mode includes them.
 */
export function sessionKey(model, scenario, message) {
  const peer = effectivePeer(model, message, scenario.useIdentityLinks).toLowerCase();
  switch (scenario.mode) {
    case 'main':
      return `agent:${model.agentId}:${model.mainKey}`;
    case 'per-peer':
      return `agent:${model.agentId}:direct:${peer}`;
    case 'per-channel-peer':
      return `agent:${model.agentId}:${message.channel}:direct:${peer}`;
    default:
      return `agent:${model.agentId}:${message.channel}:${message.accountId}:direct:${peer}`;
  }
}

/**
 * Group the finite messages by their computed session key (first-appearance
 * order). Each group carries a unique deterministic semantic id (`grp-N`)
 * plus its exact key text, reports the merged dimensions, and a rule-based
 * reading key (`single` one message / `shared` several messages merged).
 * Pure: never mutates the model.
 */
export function computeGroups(model, scenario) {
  const byKey = new Map();
  for (const message of model.messages) {
    const key = sessionKey(model, scenario, message);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(message);
  }
  const groups = [];
  let n = 0;
  for (const [key, members] of byKey) {
    n += 1;
    const persons = new Set(members.map((m) => m.person));
    const channels = new Set(members.map((m) => m.channel));
    const accounts = new Set(members.map((m) => m.accountId));
    groups.push({
      id: `grp-${n}`,
      key,
      memberIds: members.map((m) => m.id),
      stats: { messages: members.length, persons: persons.size, channels: channels.size, accounts: accounts.size },
      reading: members.length > 1 ? 'shared' : 'single',
    });
  }
  return groups;
}

/** Every message id → its resolved peer id for one case (text evidence). */
export function resolvedPeers(model, scenario) {
  return model.messages.map((m) => ({
    id: m.id,
    person: m.person,
    channel: m.channel,
    accountId: m.accountId,
    peerId: m.peerId,
    effectivePeer: effectivePeer(model, m, scenario.useIdentityLinks),
  }));
}

/** Scenario lookup by id (null when unknown). */
export function findScenario(spec, id) {
  return spec.scenarios.find((s) => s.id === id) || null;
}

/** The spec's default scenario (callers must validate the spec first). */
export function defaultScenario(spec) {
  return findScenario(spec, spec.defaultScenario);
}
