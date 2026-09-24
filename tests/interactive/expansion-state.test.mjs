/**
 * expansion-state.test.mjs — GROUP state pure-model + spec-contract tests.
 *
 * Covers the three state explainers' deterministic semantics and their
 * executable data contracts, including the invariants the browser suite
 * relies on:
 *   - session-tree: active-context ancestry and the compaction projection
 *     never mutate the authored history or the independent workspace
 *     snapshot (root/branch/compaction cases are deterministic);
 *   - session-scope: every dmScope mode's exact key strings and grouping —
 *     collision (same peer across accounts) and separation cases, unique
 *     semantic group ids, dimensions preserved verbatim;
 *   - memory-lineage: deletion traversal buckets, mixed-evidence
 *     recomputation, and the external/unknown boundary that is never
 *     provably erased.
 * Plus corrupt-spec rejection for each kind (unknown keys, missing locales,
 * broken cross-references, non-finite inputs…).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { validateSpec, formatErrors } from '../../assets/js/components/spec-schema.mjs';
import {
  computeView,
  pathTo,
  projection,
  treeLayout,
  workspaceSnapshot,
} from '../../assets/js/components/session-tree-model.mjs';
import {
  KEY_TEMPLATES,
  MODES,
  computeGroups,
  effectivePeer,
  resolvedPeers,
  sessionKey,
} from '../../assets/js/components/session-scope-model.mjs';
import {
  RESULT_ORDER,
  STATUSES,
  classify,
  computeResult,
  lineageLayout,
  sourceClosure,
  statusCounts,
  traceable,
} from '../../assets/js/components/memory-lineage-model.mjs';

const readSpec = (name) =>
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../../data/interactive/${name}.json`, import.meta.url)),
      'utf8'
    )
  );

const treeSpec = readSpec('session-tree-v1');
const scopeSpec = readSpec('session-scope-v1');
const lineageSpec = readSpec('memory-lineage-v1');

/** Deep-freeze so any model mutation throws in strict mode. */
const deepFreeze = (value) => {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
};

const clone = (value) => JSON.parse(JSON.stringify(value));

function assertFails(spec, fieldFragment, label) {
  const { ok, errors } = validateSpec(spec, { file: 'spec.json' });
  assert.equal(ok, false, `${label}: expected validation to fail`);
  assert.ok(
    errors.some((e) => e.field.includes(fieldFragment)),
    `${label}: expected an error near ${fieldFragment}, got: ${formatErrors(errors)}`
  );
  for (const e of errors) {
    assert.equal(e.file, 'spec.json', 'errors must report the source file');
    assert.ok(e.message.length > 0, 'errors must carry a message');
  }
}

/* ════════════════════════════ session-tree ════════════════════════════ */

test('session-tree: the authored specs pass the executable schema', () => {
  const { ok, errors } = validateSpec(treeSpec, { file: 'session-tree-v1.json' });
  assert.equal(ok, true, formatErrors(errors));
});

test('session-tree: root/branch/compaction cases are deterministic with text evidence', () => {
  const model = deepFreeze(clone(treeSpec.model));
  const byId = Object.fromEntries(treeSpec.scenarios.map((s) => [s.id, s]));

  const rootView = computeView(model, byId.root);
  assert.deepEqual(rootView.path, ['root'], 'root case: path is the root entry itself');
  assert.deepEqual(
    rootView.projection.entries.map((e) => e.id),
    ['root']
  );

  const branchView = computeView(model, byId.branch);
  assert.deepEqual(branchView.path, [
    'root',
    'user-a',
    'assistant-a',
    'user-c',
    'assistant-c',
  ]);
  assert.equal(branchView.projection.applies, false, 'branch case shows the full path');
  // Text evidence: every projection entry carries the authored message text.
  for (const entry of branchView.projection.entries) {
    const node = model.nodes.find((n) => n.id === entry.id);
    assert.ok(node.copy.zh.text.length > 0 && node.copy.en.text.length > 0);
  }

  const compactionView = computeView(model, byId.compaction);
  assert.equal(compactionView.projection.applies, true);
  assert.deepEqual(
    compactionView.projection.entries.map((e) => `${e.type}:${e.id}`),
    ['compaction:compaction-entry', 'node:user-b', 'node:assistant-b'],
    'the authored segment folds into ONE compaction entry'
  );
});

test('session-tree: active ancestry/compaction never mutates history or workspace', () => {
  const model = deepFreeze(clone(treeSpec.model));
  const before = clone(model);
  const workspaceBefore = workspaceSnapshot(model);

  for (const scenario of treeSpec.scenarios) {
    for (const fold of [false, true]) {
      const view = computeView(model, scenario, { compaction: fold });
      assert.deepEqual(view.workspace, workspaceBefore, 'workspace snapshot is invariant');
      // Moving to an OLD branch (root case) must not roll back the snapshot.
      assert.deepEqual(
        view.workspace.map((w) => w.path).sort(),
        ['README.md', 'notes/exp.md'],
        'both authored filesystem changes stay visible on every branch'
      );
    }
  }
  // Switch active entry at runtime: same guarantees.
  for (const node of model.nodes) {
    const view = computeView(model, { activeLeaf: node.id, compaction: true });
    assert.deepEqual(view.workspace, workspaceBefore);
  }
  assert.deepEqual(clone(model), before, 'the model itself never mutates');

  // The complete tree is preserved: folding compaction only changes the
  // derived projection, never the ancestry computation.
  const folded = projection(model, 'assistant-b', true);
  const unfolded = projection(model, 'assistant-b', false);
  assert.equal(folded.entries.length < unfolded.entries.length, true);
  assert.deepEqual(pathTo(model, 'assistant-b'), [
    'root',
    'user-a',
    'assistant-a',
    'user-b',
    'assistant-b',
  ]);
});

test('session-tree: compaction folds only exact ancestor-path prefixes', () => {
  const model = treeSpec.model;
  // assistant-c's path does not contain user-b, but the shared trunk IS a
  // prefix of it, so the authored trunk segment folds there too.
  assert.equal(projection(model, 'assistant-c', true).applies, true);
  // A mid-path anchor that is not a prefix must not fold (deterministic).
  const custom = clone(model);
  custom.compaction.replaces = ['root', 'user-a'];
  assert.equal(projection(custom, 'user-c', true).applies, true);
  custom.compaction.replaces = ['user-a', 'assistant-a'];
  assert.equal(projection(custom, 'assistant-b', true).applies, false);
});

test('session-tree: layout is deterministic (depth column, appearance row)', () => {
  const { depth, row, columns, rows } = treeLayout(treeSpec.model);
  assert.equal(depth.get('root'), 0);
  assert.equal(depth.get('assistant-c'), 4);
  assert.equal(row.get('assistant-a'), 0);
  assert.equal(row.get('user-b'), 0);
  assert.equal(row.get('user-c'), 1, 'the fork shares the column of its sibling');
  assert.equal(columns, 5);
  assert.equal(rows, 2);
});

test('session-tree: corrupt specs fail with stable field paths', () => {
  let spec = clone(treeSpec);
  spec.model.nodes.push({ ...spec.model.nodes[1], id: 'user-a', parentId: 'root' });
  assertFails(spec, 'model.nodes', 'duplicate node id');

  spec = clone(treeSpec);
  spec.model.nodes[2].parentId = 'assistant-b'; // forward reference
  assertFails(spec, 'model.nodes[2].parentId', 'forward parent reference (append-only)');

  spec = clone(treeSpec);
  spec.model.nodes[0].parentId = 'user-a';
  assertFails(spec, 'model.nodes[0].parentId', 'root must have parentId null');

  spec = clone(treeSpec);
  spec.model.compaction.replaces = ['user-a', 'assistant-a'];
  assertFails(spec, 'model.compaction.replaces[0]', 'compaction segment must start at root');

  spec = clone(treeSpec);
  spec.model.compaction.replaces = ['root', 'user-b'];
  assertFails(spec, 'model.compaction.replaces[1]', 'compaction segment must be contiguous');

  spec = clone(treeSpec);
  spec.scenarios[0].activeLeaf = 'ghost';
  assertFails(spec, 'scenarios[0].activeLeaf', 'unknown activeLeaf');

  spec = clone(treeSpec);
  spec.scenarios[1].compaction = 'yes';
  assertFails(spec, 'scenarios[1].compaction', 'compaction must be boolean');

  spec = clone(treeSpec);
  spec.scenarios[1].compaction = true; // branch leaf without the trunk fold? trunk folds — use root case
  spec.scenarios[0].compaction = true;
  spec.model.compaction.replaces = ['user-b', 'assistant-b'];
  spec.scenarios = [{ id: 'root', activeLeaf: 'root', compaction: true }];
  spec.defaultScenario = 'root';
  assertFails(spec, 'scenarios[0].compaction', 'inapplicable compaction case');

  spec = clone(treeSpec);
  spec.model.workspace[0].from = 'ghost';
  assertFails(spec, 'model.workspace[0].from', 'unknown workspace origin');

  spec = clone(treeSpec);
  spec.copy.zh.compactionLabel = '';
  assertFails(spec, 'copy.zh.compactionLabel', 'empty zh copy');

  spec = clone(treeSpec);
  delete spec.copy.en.scenarioLabels.branch;
  assertFails(spec, 'copy.en.scenarioLabels', 'incomplete en scenario labels');

  spec = clone(treeSpec);
  spec.copy.zh.mystery = 'extra';
  assertFails(spec, 'copy.zh.mystery', 'unknown copy field');

  spec = clone(treeSpec);
  spec.model.nodes[1].copy.zh.text = 'line\nbreak\u0007';
  assertFails(spec, 'model.nodes[1].copy.zh.text', 'control characters in data text');

  spec = clone(treeSpec);
  spec.extra = 1;
  assertFails(spec, 'extra', 'unknown top-level key');

  spec = clone(treeSpec);
  spec.scenarios[0].id = 'root';
  spec.scenarios[1].id = 'root';
  assertFails(spec, 'scenarios[1].id', 'duplicate scenario id');
});

test('session-tree: cyclic/self-parent graphs cannot hang (isolated process, hard timeout)', () => {
  // Regression for the validator chain-walk bug: corrupt graphs (root ↔
  // user-a cycle, self-parent + compaction case) once spun forever. The
  // invalid-parent assertions above stay strict; this test only guarantees
  // the traversal TERMINATES. It runs in a child process with a real
  // timeout so a future cycle can never hang the whole suite again.
  const href = (rel) => pathToFileURL(fileURLToPath(new URL(rel, import.meta.url))).href;
  const script = `
    const fs = require('fs');
    (async () => {
      const { validateSpec } = await import(${JSON.stringify(href('../../assets/js/components/spec-schema.mjs'))});
      const model = await import(${JSON.stringify(href('../../assets/js/components/session-tree-model.mjs'))});
      const base = JSON.parse(fs.readFileSync(${JSON.stringify(
        fileURLToPath(new URL('../../data/interactive/session-tree-v1.json', import.meta.url))
      )}, 'utf8'));
      const cycle = JSON.parse(JSON.stringify(base));
      cycle.model.nodes[0].parentId = 'user-a';      // root ↔ user-a cycle
      cycle.scenarios[0].compaction = true;           // forces the chain walk
      const selfParent = JSON.parse(JSON.stringify(base));
      selfParent.model.nodes[1].parentId = 'user-a'; // self-parent
      selfParent.scenarios = [{ id: 'root', activeLeaf: 'user-a', compaction: true }];
      selfParent.defaultScenario = 'root';
      for (const spec of [cycle, selfParent]) {
        const r = validateSpec(spec, { file: 'cyclic.json' });
        if (r.ok || r.errors.length === 0) throw new Error('cyclic spec must fail validation');
        model.computeView(spec.model, spec.scenarios[0]);
        model.pathTo(spec.model, spec.scenarios[0].activeLeaf);
        model.treeLayout(spec.model);
        model.projection(spec.model, spec.scenarios[0].activeLeaf, true);
      }
      console.log('done: cyclic graphs terminate');
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  const out = execFileSync(process.execPath, ['-e', script], {
    timeout: 20000,
    encoding: 'utf8',
  });
  assert.match(out, /done: cyclic graphs terminate/);
});

/* ════════════════════════════ session-scope ═══════════════════════════ */

test('session-scope: the authored spec passes the executable schema', () => {
  const { ok, errors } = validateSpec(scopeSpec, { file: 'session-scope-v1.json' });
  assert.equal(ok, true, formatErrors(errors));
});

test('session-scope: key shapes match the pinned source formats exactly', () => {
  assert.deepEqual(KEY_TEMPLATES, {
    main: 'agent:<agentId>:<mainKey>',
    'per-peer': 'agent:<agentId>:direct:<peerId>',
    'per-channel-peer': 'agent:<agentId>:<channel>:direct:<peerId>',
    'per-account-channel-peer': 'agent:<agentId>:<channel>:<accountId>:direct:<peerId>',
  });
  const scenario = (mode, useIdentityLinks = false) => ({ mode, useIdentityLinks });
  const msg = scopeSpec.model.messages[0]; // alice-eu-order
  assert.equal(sessionKey(scopeSpec.model, scenario('main'), msg), 'agent:support:main');
  assert.equal(sessionKey(scopeSpec.model, scenario('per-peer'), msg), 'agent:support:direct:tg:12345');
  assert.equal(
    sessionKey(scopeSpec.model, scenario('per-channel-peer'), msg),
    'agent:support:telegram:direct:tg:12345'
  );
  assert.equal(
    sessionKey(scopeSpec.model, scenario('per-account-channel-peer'), msg),
    'agent:support:telegram:supporteu:direct:tg:12345',
    'the account dimension is preserved exactly'
  );
});

test('session-scope: every mode produces verifiable grouping with unique ids', () => {
  deepFreeze(clone(scopeSpec.model));
  for (const s of scopeSpec.scenarios) {
    const groups = computeGroups(scopeSpec.model, s);
    const ids = groups.map((g) => g.id);
    assert.equal(new Set(ids).size, ids.length, `unique group ids in ${s.id}`);
    // Groups partition the message set exactly (no loss, no duplication).
    const members = groups.flatMap((g) => g.memberIds);
    assert.deepEqual(
      [...members].sort(),
      scopeSpec.model.messages.map((m) => m.id).sort(),
      `${s.id}: every message is grouped exactly once`
    );
    const keys = groups.map((g) => g.key);
    assert.equal(new Set(keys).size, keys.length, `${s.id}: keys are unique per mode`);
    for (const g of groups) {
      assert.ok(g.key.startsWith('agent:support'), 'agent id is fixed in every key');
    }
  }
});

test('session-scope: collision and separation cases across all four modes', () => {
  const model = scopeSpec.model;
  const caseOf = (id) => scopeSpec.scenarios.find((s) => s.id === id);
  const groupOf = (groups, messageId) => groups.find((g) => g.memberIds.includes(messageId));

  // Same platform peer ID across TWO accounts (the article's opening
  // incident): merged except under per-account-channel-peer.
  for (const mode of ['per-peer', 'per-channel-peer']) {
    const groups = computeGroups(model, caseOf(mode));
    const g = groupOf(groups, 'alice-eu-order');
    assert.ok(
      g.memberIds.includes('alice-us-order'),
      `${mode}: tg:12345 collides across supporteu/supportus`
    );
    assert.equal(g.stats.accounts, 2, `${mode}: the merged key spans two accounts`);
    assert.equal(g.reading, 'shared', `${mode}: merging is visible`);
  }
  const mainGroups = computeGroups(model, caseOf('main'));
  assert.ok(
    groupOf(mainGroups, 'alice-eu-order').memberIds.includes('alice-us-order'),
    'main merges the colliding pair with everything else'
  );
  const scoped = computeGroups(model, caseOf('per-account-channel-peer'));
  const eu = groupOf(scoped, 'alice-eu-order');
  const us = groupOf(scoped, 'alice-us-order');
  assert.notEqual(eu.key, us.key, 'per-account-channel-peer separates the two inboxes');
  assert.equal(eu.stats.accounts, 1);
  assert.equal(scoped.length, 6, 'full dimension separation: one session per message');

  // Distinct peers stay separated everywhere except main.
  const main = computeGroups(model, caseOf('main'));
  assert.equal(main.length, 1, 'main merges every DM into one session');
  assert.equal(main[0].memberIds.length, 6);
  const perPeer = computeGroups(model, caseOf('per-peer'));
  assert.equal(perPeer.length, 4);

  // Explicitly configured identity links merge the same person across
  // channels; nothing implies verification (mapping is authored config).
  const linked = computeGroups(model, caseOf('identity-link'));
  const alice = groupOf(linked, 'alice-eu-order');
  assert.equal(alice.key, 'agent:support:direct:alice');
  assert.deepEqual(
    [...alice.memberIds].sort(),
    ['alice-eu-order', 'alice-slack-logistics', 'alice-us-order']
  );
  assert.equal(alice.stats.channels, 2, 'merged across channels through the configured mapping');
  assert.equal(effectivePeer(model, model.messages[0], true), 'alice');
  assert.equal(effectivePeer(model, model.messages[0], false), 'tg:12345');
  assert.equal(effectivePeer(model, model.messages[2], true), 'tg:777', 'unmapped peers stay raw');

  // Dimensions are preserved verbatim on every message in every mode.
  for (const s of scopeSpec.scenarios) {
    for (const row of resolvedPeers(model, s)) {
      const src = model.messages.find((m) => m.id === row.id);
      assert.equal(row.channel, src.channel);
      assert.equal(row.accountId, src.accountId);
      assert.equal(row.peerId, src.peerId);
    }
  }
});

test('session-scope: peers lowercase after case-insensitive identity resolution', () => {
  // The pinned source's buildAgentPeerSessionKey lowercases the EFFECTIVE
  // peer id after identity resolution; aliases compare case-insensitively.
  const model = clone(scopeSpec.model);
  const upper = { ...model.messages[4], id: 'upper', peerId: 'U222' };
  const lower = { ...model.messages[4], id: 'lower', peerId: 'u222' };
  for (const s of scopeSpec.scenarios) {
    if (s.mode === 'main') continue;
    assert.equal(
      sessionKey(model, s, upper),
      sessionKey(model, s, lower),
      `${s.id}: raw U222 and u222 hash to the same key`
    );
    assert.ok(
      !sessionKey(model, s, upper).includes('U222'),
      `${s.id}: keys never contain uppercase peer text`
    );
  }
  // Uppercase canonical ids resolve through the mapping and lowercase too.
  const shouty = clone(scopeSpec.model);
  shouty.identityLinks = [
    { peerId: 'TG:12345', canonical: 'ALICE' }, // alias match is case-insensitive
    { peerId: 'U222', canonical: 'ALICE' },
  ];
  assert.equal(effectivePeer(shouty, shouty.messages[0], true), 'ALICE');
  assert.equal(
    sessionKey(shouty, { mode: 'per-peer', useIdentityLinks: true }, shouty.messages[0]),
    'agent:support:direct:alice',
    'resolved canonical is lowercased AFTER resolution'
  );
  assert.equal(
    sessionKey(shouty, { mode: 'per-channel-peer', useIdentityLinks: true }, shouty.messages[4]),
    'agent:support:slack:direct:alice'
  );
});

test('session-scope: corrupt specs fail with stable field paths', () => {
  let spec = clone(scopeSpec);
  spec.model.messages[0].mode = 'nope';
  assertFails(spec, 'model.messages[0].mode', 'unknown message key');

  spec = clone(scopeSpec);
  spec.model.messages[0].peerId = 'javascript:alert(1)';
  assertFails(spec, 'model.messages[0].peerId', 'unsafe peer id');

  spec = clone(scopeSpec);
  spec.model.identityLinks[0].peerId = 'tg:999';
  assertFails(spec, 'model.identityLinks[0].peerId', 'identity link without a message');

  spec = clone(scopeSpec);
  spec.model.identityLinks = [];
  assertFails(spec, 'scenarios', 'identity-link case without configured mapping');

  spec = clone(scopeSpec);
  spec.scenarios = spec.scenarios.filter((s) => s.id !== 'main');
  spec.copy.zh.scenarioLabels.main = undefined;
  assertFails(spec, 'scenarios', 'all four dmScope modes are required');

  spec = clone(scopeSpec);
  spec.scenarios.push({ id: 'again', mode: 'main', useIdentityLinks: false });
  spec.copy.zh.scenarioLabels.again = 'x';
  spec.copy.en.scenarioLabels.again = 'x';
  assertFails(spec, 'scenarios', 'duplicate mode semantics');

  spec = clone(scopeSpec);
  spec.model.agentId = 'Support Bot';
  assertFails(spec, 'model.agentId', 'agent id must be a slug');

  spec = clone(scopeSpec);
  spec.model.messages.push({ ...spec.model.messages[0] });
  assertFails(spec, 'model.messages', 'duplicate message id');

  spec = clone(scopeSpec);
  delete spec.copy.en.people.alice;
  assertFails(spec, 'copy.en.people', 'incomplete people labels');

  spec = clone(scopeSpec);
  spec.scenarios[0].useIdentityLinks = 1;
  assertFails(spec, 'scenarios[0].useIdentityLinks', 'useIdentityLinks must be boolean');

  spec = clone(scopeSpec);
  spec.model.mainKey = 'MAIN KEY';
  assertFails(spec, 'model.mainKey', 'mainKey must be a slug');

  spec = clone(scopeSpec);
  spec.model.identityLinks.push({ peerId: 'TG:12345', canonical: 'alice' });
  assertFails(spec, 'model.identityLinks[2].peerId', 'aliases collide case-insensitively');
});

/* ═══════════════════════════ memory-lineage ═══════════════════════════ */

test('memory-lineage: the authored spec passes the executable schema', () => {
  const { ok, errors } = validateSpec(lineageSpec, { file: 'memory-lineage-v1.json' });
  assert.equal(ok, true, formatErrors(errors));
});

test('memory-lineage: deletion traversal buckets (complete lineage case)', () => {
  const model = deepFreeze(clone(lineageSpec.model));
  const result = computeResult(model, lineageSpec.scenarios[0]);
  const status = Object.fromEntries(result.classification);
  assert.deepEqual(status, {
    'source-quote': 'removed',
    'source-travel': 'kept',
    'pref-summary': 'invalidated',
    'vector-index': 'invalidated',
    'profile-nomad': 'recompute',
    'rec-cache': 'recompute',
    'chat-summary': 'unproven',
    'provider-cache': 'unproven',
    'offline-backup': 'unproven',
  });
  assert.deepEqual(result.removedSources, ['source-quote']);
  assert.deepEqual(result.counts, {
    kept: 1,
    removed: 1,
    invalidated: 2,
    recompute: 2,
    unproven: 3,
  });
  // Every node lands in exactly one bucket.
  assert.equal(result.classification.size, model.nodes.length);
  for (const s of result.classification.values()) assert.ok(STATUSES.includes(s));
});

test('memory-lineage: mixed evidence recomputes instead of deleting wholesale', () => {
  const model = lineageSpec.model;
  const status = Object.fromEntries(classify(model, ['source-travel']));
  assert.equal(status['source-travel'], 'removed');
  assert.equal(status['pref-summary'], 'kept', 'untouched evidence chain survives');
  assert.equal(status['vector-index'], 'kept');
  assert.equal(status['profile-nomad'], 'recompute', 's1 evidence survives → recompute');
  assert.equal(status['rec-cache'], 'recompute');
  assert.deepEqual([...sourceClosure(model, 'profile-nomad')].sort(), [
    'source-quote',
    'source-travel',
  ]);
});

test('memory-lineage: unknown boundary is never provably erased', () => {
  const model = lineageSpec.model;
  // Even deleting BOTH sources cannot prove erasure past the boundary or
  // past missing lineage.
  const status = Object.fromEntries(classify(model, ['source-quote', 'source-travel']));
  assert.equal(status['chat-summary'], 'unproven', 'derived text without lineage');
  assert.equal(status['provider-cache'], 'unproven', 'external cache');
  assert.equal(status['offline-backup'], 'unproven', 'external backup');
  assert.equal(status['pref-summary'], 'invalidated');
  assert.equal(status['rec-cache'], 'invalidated');
  // Partial lineage: nothing is traceable through chat-summary.
  assert.equal(traceable(model, 'chat-summary'), false);
  assert.equal(traceable(model, 'pref-summary'), true);
  assert.equal(traceable(model, 'provider-cache'), false);
  // Invalidated is a state of the artifact, not proof of physical deletion —
  // the bucket name never claims erasure (guarded by copy in the spec).
  assert.match(lineageSpec.copy.zh.invalidationNote, /物理删除/);
  assert.match(lineageSpec.copy.en.invalidationNote, /physical deletion/i);
});

test('memory-lineage: empty removal keeps everything but the boundary', () => {
  const counts = statusCounts(classify(lineageSpec.model, []));
  assert.deepEqual(counts, { kept: 6, removed: 0, invalidated: 0, recompute: 0, unproven: 3 });
});

test('memory-lineage: layout bands are deterministic (source → derived → boundary)', () => {
  const { col, row, columns } = lineageLayout(lineageSpec.model);
  assert.equal(col.get('source-quote'), 0);
  assert.equal(col.get('pref-summary'), 1);
  assert.equal(col.get('chat-summary'), 1, 'untraced derived sits in the first derived band');
  assert.equal(col.get('vector-index'), 2);
  assert.equal(col.get('profile-nomad'), 2);
  assert.equal(col.get('rec-cache'), 3);
  assert.equal(col.get('provider-cache'), 4);
  assert.equal(columns, 5);
  assert.equal(row.get('source-travel'), 1);
});

test('memory-lineage: corrupt specs fail with stable field paths', () => {
  let spec = clone(lineageSpec);
  spec.model.nodes.push({ ...spec.model.nodes[2], id: 'pref-summary' });
  assertFails(spec, 'model.nodes', 'duplicate node id');

  spec = clone(lineageSpec);
  spec.model.nodes[2].parents = ['rec-cache']; // forward reference → cycle bait
  assertFails(spec, 'model.nodes[2].parents[0]', 'parent must reference an earlier node');

  spec = clone(lineageSpec);
  spec.model.nodes[2].parents = ['pref-summary'];
  assertFails(spec, 'model.nodes[2].parents[0]', 'a node cannot be its own parent');

  spec = clone(lineageSpec);
  spec.model.nodes[0].parents = ['source-travel'];
  assertFails(spec, 'model.nodes[0].parents', 'sources are original evidence');

  spec = clone(lineageSpec);
  spec.scenarios[0].removedSources = ['pref-summary'];
  assertFails(spec, 'scenarios[0].removedSources[0]', 'only sources are directly deletable');

  spec = clone(lineageSpec);
  spec.scenarios[0].removedSources = ['ghost'];
  assertFails(spec, 'scenarios[0].removedSources[0]', 'unknown removed source');

  spec = clone(lineageSpec);
  spec.scenarios[0].removedSources = [];
  assertFails(spec, 'scenarios[0].removedSources', 'empty removal set');

  spec = clone(lineageSpec);
  spec.model.nodes = spec.model.nodes.filter((n) => n.kind !== 'external');
  assertFails(spec, 'model.nodes', 'the boundary node kind is required');

  spec = clone(lineageSpec);
  spec.model.nodes[3].kind = 'blob';
  assertFails(spec, 'model.nodes[3].kind', 'unknown node kind');

  spec = clone(lineageSpec);
  spec.model.nodes[3].parents = ['source-quote', 'source-quote'];
  assertFails(spec, 'model.nodes[3].parents', 'duplicate parent');

  spec = clone(lineageSpec);
  spec.copy.zh.statuses.kept = '';
  assertFails(spec, 'copy.zh.statuses.kept', 'empty status label');

  spec = clone(lineageSpec);
  spec.copy.en.stationNotes = 'unexpected field';
  assertFails(spec, 'copy.en.stationNotes', 'unknown kind copy field');

  spec = clone(lineageSpec);
  spec.model.tokens = 1e300;
  assertFails(spec, 'model.tokens', 'unknown model field');
});

/* ═════════════════════ shared contract / fixtures ═════════════════════ */

test('shared: schemaVersion and top keys stay on the baseline contract', () => {
  for (const spec of [treeSpec, scopeSpec, lineageSpec]) {
    assert.equal(spec.schemaVersion, 1);
    assert.deepEqual(Object.keys(spec), [
      'schemaVersion',
      'kind',
      'id',
      'defaultScenario',
      'model',
      'scenarios',
      'copy',
      'sourceRefs',
    ]);
    assertFails({ ...spec, schemaVersion: 2 }, 'schemaVersion', `${spec.id} schemaVersion`);
  }
});

test('shared: the runtime-invalid fixture spec is rejected by the executable schema', () => {
  const broken = JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL(
          '../fixtures/interactive/expansion-state/data/session-tree-broken-v1.json',
          import.meta.url
        )
      ),
      'utf8'
    )
  );
  assertFails(broken, 'activeLeaf', 'fixture broken spec (static fallback case)');
});

test('shared: RESULT_ORDER covers every status exactly once', () => {
  assert.deepEqual([...RESULT_ORDER].sort(), [...STATUSES].sort());
  for (const kind of [treeSpec, scopeSpec, lineageSpec]) {
    assert.ok(kind.copy.zh.assumption.length > 0 && kind.copy.en.assumption.length > 0);
    assert.ok(kind.sourceRefs.length >= 1);
    for (const ref of kind.sourceRefs) assert.match(ref.url, /^https:\/\//);
  }
});
