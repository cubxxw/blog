/**
 * expansion-effects.test.mjs — pure-model edge/invariant and corrupt-spec
 * checks for the "effects" group (effect-recovery, gitops-reconcile, and the
 * reused agent-loop verifier instance). No DOM, no Hugo, no network.
 *
 * Required semantic proofs (contract):
 *   - the ambiguity crash window stays `unknown` (never folded to failure);
 *   - direct retry in that window duplicates the external write;
 *   - receipt reconciliation converges to exactly once (only with query
 *     support; without it the next step is reconciliation);
 *   - a stable idempotency key dedupes ONLY under stated provider support;
 *   - the LangGraph interruption replay boundary (before-approval side
 *     effect repeats on node replay, after-approval placement is safe);
 *   - Sync status and Health are independent; selfHeal and prune toggles do
 *     exactly what the article allows; enabled auto sync blocks history
 *     rollback (the rollback guard).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  CRASHES,
  CRASH_STEP,
  EXPLAIN_KEYS,
  KNOWLEDGE,
  NEXT_ACTIONS,
  STRATEGIES,
  computeEffect,
  completionSends,
  defaultScenario,
  findScenario,
  stepKeys,
  timelineStates,
  timelineSteps,
} from '../../assets/js/components/effect-recovery-model.mjs';
import {
  RECONCILE_EXPLAIN,
  STATE_FIELDS,
  SYNC_STATES,
  applySync,
  canRollback,
  computeReconcile,
  diff,
} from '../../assets/js/components/gitops-reconcile-model.mjs';
import { validateSpec, formatErrors } from '../../assets/js/components/spec-schema.mjs';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const readJson = (path) => JSON.parse(readFileSync(`${REPO_ROOT}${path}`, 'utf8'));
const fixture = (name) =>
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../fixtures/interactive/expansion-effects/data/${name}`, import.meta.url)),
      'utf8'
    )
  );

const N8N = readJson('data/interactive/effect-recovery-n8n-v1.json');
const LANGGRAPH = readJson('data/interactive/effect-recovery-langgraph-v1.json');
const GITOPS = readJson('data/interactive/gitops-reconcile-v1.json');

const fields = (errors) => errors.map((e) => e.field);
const expectError = (raw, field, label = field) => {
  const { ok, errors } = validateSpec(structuredClone(raw), { file: 'test' });
  assert.equal(ok, false, `${label}: expected a validation failure`);
  assert.ok(
    fields(errors).includes(field),
    `${label}: expected error at ${field}, got:\n${formatErrors(errors)}`
  );
};

const scenario = (spec, id) => {
  const s = findScenario(spec, id);
  assert.ok(s, `scenario ${id}`);
  return s;
};
const plain = (overrides = {}) => ({
  effectPlacement: 'plain',
  provider: { receiptQuery: false, idempotencyKey: false },
  ...overrides,
});
const nodeReplay = { flow: 'node-replay', maxSteps: 9 };
const queueRetry = { flow: 'queue-retry', maxSteps: 7 };

/* ── effect-recovery: the required semantic proofs ────────────────────── */

test('ambiguity crash window: unproven write stays unknown and retry duplicates it', () => {
  // The article's t0–t5: provider committed, receipt never landed, operator
  // clicks retry → two external writes and still no proof of exactly once.
  const r = computeEffect(queueRetry, plain(), 'after-commit-before-receipt', 'retry');
  assert.deepEqual([r.actions, r.knowledge, r.next], [2, 'unknown', 'reconcile']);
  assert.equal(r.explain, 'duplicate');
  // The window is unknown for every discipline that cannot resolve evidence.
  for (const strategy of STRATEGIES) {
    const s = plain();
    const res = computeEffect(queueRetry, s, 'after-commit-before-receipt', strategy);
    if (!(strategy === 'query-receipt' && s.provider.receiptQuery) &&
        !(strategy === 'idempotency-key' && s.provider.idempotencyKey)) {
      assert.equal(res.knowledge, 'unknown', `${strategy} must not resolve the window`);
    }
  }
});

test('knowledge classifies the evidence INTERVAL (unknown only while exactly once is possible)', () => {
  // The verdict is about the exactly-once proposition: {1} is proven success,
  // an interval that EXCLUDES 1 is proven failure (even when the exact count
  // inside e.g. [2,3] is unknown), and only an interval that still contains 1
  // is genuinely unknown — which is never folded into failure.
  let ambiguous = 0;
  for (const [model, placements] of [
    [queueRetry, ['plain']],
    [nodeReplay, ['before-approval', 'after-approval']],
  ]) {
    for (const effectPlacement of placements) {
      for (const caps of [[false, false], [true, false], [false, true], [true, true]]) {
        const s = plain({
          effectPlacement,
          provider: { receiptQuery: caps[0], idempotencyKey: caps[1] },
        });
        for (const crash of CRASHES) {
          for (const strategy of STRATEGIES) {
            const where = `${model.flow}/${effectPlacement}/${crash}/${strategy}`;
            const r = computeEffect(model, s, crash, strategy);
            if (r.lo === 1 && r.hi === 1) {
              assert.equal(r.knowledge, 'confirmed-success', where);
            } else if (r.hi < 1 || r.lo > 1) {
              assert.equal(r.knowledge, 'confirmed-failure', where);
            } else {
              assert.equal(r.knowledge, 'unknown', where);
              assert.notEqual(r.next, 'retry-safe', `unknown must not fold into failure ${where}`);
              ambiguous += 1;
            }
          }
        }
      }
    }
  }
  assert.ok(ambiguous > 0, 'the ambiguous crash window keeps its unknown verdict');
});

test('regression (review #1): an interval that excludes exactly once is confirmed-failure', () => {
  // node-replay before-approval + after-commit-before-receipt + unkeyed
  // retry: evidence [2,3]. The exact duplicate count is uncertain, but the
  // exactly-once proposition is provably false — that is confirmed-failure,
  // not unknown (requiring lo === hi conflated the two).
  const s = plain({
    effectPlacement: 'before-approval',
    provider: { receiptQuery: true, idempotencyKey: false },
  });
  const r = computeEffect(nodeReplay, s, 'after-commit-before-receipt', 'retry');
  assert.deepEqual([r.actions, r.lo, r.hi], [3, 2, 3]);
  assert.equal(r.knowledge, 'confirmed-failure');
  assert.equal(r.next, 'reconcile');
  // Every before-approval unkeyed re-run after an unproven first write has
  // this shape and must classify as proven failure.
  for (const strategy of ['retry', 'idempotency-key']) {
    const res = computeEffect(nodeReplay, s, 'after-commit-before-receipt', strategy);
    assert.ok(res.lo > 1, `the interval excludes exactly once (${strategy})`);
    assert.equal(res.knowledge, 'confirmed-failure', strategy);
  }
});

test('regression (review #2): proven zero is only retry-safe when one re-run writes exactly once', () => {
  // before-approval + before-send + query-receipt without key support: the
  // probe proves the first attempt never sent, but an unprotected re-run
  // still repeats the pre-approval side effect (the same model returns 2
  // writes for retry) — calling that safe would contradict the model.
  const s = plain({ effectPlacement: 'before-approval', provider: { receiptQuery: true, idempotencyKey: false } });
  const probe = computeEffect(nodeReplay, s, 'before-send', 'query-receipt');
  assert.deepEqual([probe.actions, probe.lo, probe.hi, probe.knowledge], [0, 0, 0, 'confirmed-failure']);
  assert.equal(probe.next, 'protected-retry');
  const rerun = computeEffect(nodeReplay, s, 'before-send', 'retry');
  assert.equal(rerun.actions, 2, 'the same model duplicates on an unprotected re-run');
  // Flows without the replay hazard keep the honest retry-safe verdict.
  for (const [model, sc] of [
    [queueRetry, plain()],
    [nodeReplay, plain({ effectPlacement: 'after-approval' })],
  ]) {
    const r = computeEffect(model, sc, 'before-send', 'query-receipt');
    assert.equal(r.next, 'retry-safe', model.flow);
  }
});

test('receipt reconciliation: a supported query resolves exactly once without resending', () => {
  const s = plain({ provider: { receiptQuery: true, idempotencyKey: false } });
  const r = computeEffect(queueRetry, s, 'after-commit-before-receipt', 'query-receipt');
  assert.deepEqual([r.actions, r.knowledge, r.next], [1, 'confirmed-success', 'return-recorded']);
  // …and before the send it proves zero happened → safe retry.
  const before = computeEffect(queueRetry, s, 'before-send', 'query-receipt');
  assert.deepEqual([before.actions, before.knowledge, before.next], [0, 'confirmed-failure', 'retry-safe']);
});

test('unsupported query yields reconciliation required', () => {
  const s = plain({ provider: { receiptQuery: false, idempotencyKey: false } });
  const r = computeEffect(queueRetry, s, 'after-commit-before-receipt', 'query-receipt');
  assert.deepEqual([r.actions, r.knowledge, r.next], [1, 'unknown', 'reconcile']);
});

test('stable-key dedupe happens only under stated provider support', () => {
  const supported = plain({ provider: { receiptQuery: false, idempotencyKey: true } });
  for (const crash of CRASHES) {
    const r = computeEffect(queueRetry, supported, crash, 'idempotency-key');
    assert.deepEqual(
      [r.actions, r.knowledge, r.next],
      [1, 'confirmed-success', 'return-recorded'],
      `supported key must collapse ${crash} to exactly once`
    );
  }
  // Without provider support the key is decoration: identical to blind retry.
  const unsupported = plain({ provider: { receiptQuery: false, idempotencyKey: false } });
  for (const crash of CRASHES) {
    const keyed = computeEffect(queueRetry, unsupported, crash, 'idempotency-key');
    const retried = computeEffect(queueRetry, unsupported, crash, 'retry');
    assert.deepEqual(keyed, retried, `unsupported key ≡ retry at ${crash}`);
  }
  const dup = computeEffect(queueRetry, unsupported, 'after-commit-before-receipt', 'idempotency-key');
  assert.deepEqual([dup.actions, dup.knowledge], [2, 'unknown']);
});

test('interruption replay boundary: before-approval side effects repeat, after-approval is safe', () => {
  const before = scenario(LANGGRAPH, 'effect-before-approval');
  const after = scenario(LANGGRAPH, 'effect-after-approval');
  // One completed run of a before-approval node performs two sends (the
  // interrupted node replays from its top on resume).
  assert.equal(completionSends(LANGGRAPH.model, before), 2);
  assert.equal(completionSends(LANGGRAPH.model, after), 1);
  assert.equal(completionSends(queueRetry, plain()), 1);

  // Cleanest contrast: crash before anything was sent, then a blind re-run.
  const hazard = computeEffect(LANGGRAPH.model, before, 'before-send', 'retry');
  const safe = computeEffect(LANGGRAPH.model, after, 'before-send', 'retry');
  assert.deepEqual([hazard.actions, hazard.knowledge], [2, 'confirmed-failure']);
  assert.deepEqual([safe.actions, safe.knowledge], [1, 'confirmed-success']);

  // The recorded-receipt window already contains the replayed duplicate.
  const doublePhase = computeEffect(LANGGRAPH.model, before, 'after-recorded-receipt', 'retry');
  assert.equal(doublePhase.actions, 4);
  const phaseOnly = computeEffect(LANGGRAPH.model, before, 'after-recorded-receipt', 'query-receipt');
  assert.deepEqual([phaseOnly.actions, phaseOnly.knowledge], [2, 'confirmed-failure']);

  // The provider-supported key makes even the replayed placement exactly once.
  const keyed = computeEffect(LANGGRAPH.model, before, 'after-recorded-receipt', 'idempotency-key');
  assert.deepEqual([keyed.actions, keyed.knowledge, keyed.next], [1, 'confirmed-success', 'return-recorded']);

  // A checkpoint never rolls back an external effect: the crashed run's
  // writes stay counted in every discipline that does not collapse the key
  // scope (a provider-supported key means the pair never double-wrote).
  for (const crash of CRASHES) {
    for (const strategy of STRATEGIES) {
      const r = computeEffect(LANGGRAPH.model, before, crash, strategy);
      const phase = crash === 'before-send' ? 0 : crash === 'after-recorded-receipt' ? 2 : 1;
      if (strategy === 'idempotency-key' && before.provider.idempotencyKey) {
        assert.equal(r.actions, 1, 'the key scope collapses at the provider, not at the checkpoint');
        continue;
      }
      assert.ok(r.actions >= phase, 'checkpointing cannot reduce the writes that happened');
    }
  }
});

test('effect grid invariants hold for every flow × placement × crash × strategy', () => {
  for (const [model, placements] of [
    [queueRetry, ['plain']],
    [nodeReplay, ['before-approval', 'after-approval']],
  ]) {
    for (const effectPlacement of placements) {
      for (const caps of [[false, false], [true, false], [false, true], [true, true]]) {
        const s = plain({
          effectPlacement,
          provider: { receiptQuery: caps[0], idempotencyKey: caps[1] },
        });
        for (const crash of CRASHES) {
          for (const strategy of STRATEGIES) {
            const where = `${model.flow}/${effectPlacement}/${crash}/${strategy}`;
            const r = computeEffect(model, s, crash, strategy);
            assert.ok(Number.isInteger(r.actions) && r.actions >= 0, `actions ${where}`);
            assert.ok(KNOWLEDGE.includes(r.knowledge), `knowledge enum ${where}`);
            assert.ok(NEXT_ACTIONS.includes(r.next), `next enum ${where}`);
            assert.ok(EXPLAIN_KEYS.includes(r.explain), `explain enum ${where}`);
            assert.ok(r.lo <= r.hi, `bounds order ${where}`);
            if (r.knowledge === 'confirmed-success') {
              assert.deepEqual([r.lo, r.hi, r.actions, r.next], [1, 1, 1, 'return-recorded'], where);
              assert.equal(r.explain, 'clean', where);
            }
            if (r.next === 'retry-safe') {
              assert.deepEqual([r.actions, r.lo, r.hi], [0, 0, 0], where);
              assert.equal(completionSends(model, s), 1, `retry-safe needs no replay hazard ${where}`);
            }
            if (r.next === 'protected-retry') {
              assert.deepEqual([r.actions, r.lo, r.hi], [0, 0, 0], where);
              assert.ok(completionSends(model, s) > 1, `protected-retry only under the replay hazard ${where}`);
            }
            if (r.actions > 1) {
              assert.equal(r.next, 'reconcile', where);
              assert.equal(r.explain, 'duplicate', where);
            }
            if (strategy === 'idempotency-key' && s.provider.idempotencyKey) {
              assert.deepEqual([r.actions, r.knowledge], [1, 'confirmed-success'], where);
            }
          }
        }
      }
    }
  }
});

test('timeline states: run multiplicity plus a separate crash flag, hazard marks', () => {
  const models = [
    [queueRetry, plain(), 7],
    [nodeReplay, scenario(LANGGRAPH, 'effect-before-approval'), 9],
    [nodeReplay, scenario(LANGGRAPH, 'effect-after-approval'), 9],
  ];
  for (const [model, s, count] of models) {
    const steps = timelineSteps(model, s);
    assert.equal(steps.length, count);
    // The step KEYS are the flow's fixed vocabulary; their visual ORDER is
    // placement-dependent (the payment segment sits before or after the
    // interrupt gate).
    assert.deepEqual(
      [...steps.map((x) => x.key)].sort(),
      [...stepKeys(model.flow)].sort()
    );
    assert.equal(new Set(steps.map((x) => x.key)).size, count, 'step keys are unique');
    for (const crash of CRASHES) {
      for (const strategy of STRATEGIES) {
        const where = `${model.flow}/${s.effectPlacement}/${crash}/${strategy}`;
        const states = timelineStates(model, s, crash, strategy);
        const result = computeEffect(model, s, crash, strategy);
        // Axis 1 — the crash window is separately identifiable.
        assert.equal(states.filter((x) => x.crash).length, 1, `exactly one crash flag ${where}`);
        assert.equal(states.find((x) => x.crash).key, CRASH_STEP[crash], where);
        // Axis 2 — execution multiplicity in the closed vocabulary.
        assert.ok(states.every((x) => ['done', 'repeated', 'recovered', 'skipped'].includes(x.state)), where);
        // The commit chip's run count IS the actual external action count.
        const commit = states.find((x) => x.key === 'commit');
        assert.equal(commit.runs, result.actions, `commit runs == actions ${where}`);
        if (strategy === 'idempotency-key' && s.provider.idempotencyKey === true) {
          assert.equal(commit.runs, 1, `key scope collapses to one commit ${where}`);
        }
        // A probe-only recovery re-executes nothing.
        if (strategy === 'query-receipt') {
          assert.ok(!states.some((x) => x.state === 'recovered'), `probe re-executes nothing ${where}`);
        }
        for (const x of states) {
          const hazardExpected =
            model.flow === 'node-replay' &&
            s.effectPlacement === 'before-approval' &&
            (x.key === 'send' || x.key === 'commit');
          assert.equal(x.hazard, hazardExpected, `hazard mark ${x.key} ${where}`);
        }
      }
    }
  }
});

test('regression (review #3): re-executed writes show as repeated, even after a late crash', () => {
  const plainCase = {
    effectPlacement: 'plain',
    provider: { receiptQuery: false, idempotencyKey: false },
  };
  // After-recorded-receipt + retry: two writes happened, and the send/commit
  // that caused the duplicate must show as re-executed (the previous model
  // showed no recovery step at all despite the extra completed write).
  const late = timelineStates(queueRetry, plainCase, 'after-recorded-receipt', 'retry');
  const lateByKey = new Map(late.map((x) => [x.key, x]));
  assert.deepEqual(
    [lateByKey.get('send').state, lateByKey.get('send').runs],
    ['repeated', 2]
  );
  assert.deepEqual(
    [lateByKey.get('commit').state, lateByKey.get('commit').runs],
    ['repeated', 2]
  );
  assert.deepEqual([lateByKey.get('finish').state, lateByKey.get('finish').crash], ['recovered', true]);
  // After-commit-before-receipt + retry: send/commit repeat while the tail
  // is only recovered.
  const mid = timelineStates(queueRetry, plainCase, 'after-commit-before-receipt', 'retry');
  const midByKey = new Map(mid.map((x) => [x.key, x]));
  assert.equal(midByKey.get('send').state, 'repeated');
  assert.equal(midByKey.get('commit').state, 'repeated');
  assert.equal(midByKey.get('receipt').state, 'recovered');
  // before-approval: the interrupt replay repeats send/commit even with a
  // probe-only strategy (no recovery re-execution at all).
  const replay = timelineStates(
    nodeReplay,
    scenario(LANGGRAPH, 'effect-before-approval'),
    'after-recorded-receipt',
    'query-receipt'
  );
  const replayByKey = new Map(replay.map((x) => [x.key, x]));
  assert.equal(replayByKey.get('send').state, 'repeated');
  assert.equal(replayByKey.get('commit').runs, 2);
});

test('scenario helpers resolve defaults', () => {
  assert.equal(defaultScenario(N8N).id, 'plain-provider');
  assert.equal(findScenario(N8N, 'missing'), null);
  assert.equal(scenario(N8N, 'key-provider').provider.idempotencyKey, true);
});

/* ── gitops-reconcile: the required semantic proofs ───────────────────── */

const POLICY = (autoSync = false, selfHeal = false, prune = false) => ({ autoSync, selfHeal, prune });

test('Sync status and Health are independent outputs', () => {
  for (const s of GITOPS.scenarios) {
    for (const autoSync of [false, true]) {
      for (const selfHeal of [false, true]) {
        for (const prune of [false, true]) {
          for (const action of ['none', 'sync', 'rollback']) {
            const r = computeReconcile(GITOPS.model, s, POLICY(autoSync, selfHeal, prune), action);
            assert.equal(r.health, s.health, `health never changes (${s.id}/${action})`);
            assert.ok(SYNC_STATES.includes(r.sync));
            assert.equal(r.sync, r.deltaAfter.length === 0 ? 'synced' : 'out-of-sync');
            assert.ok(RECONCILE_EXPLAIN.includes(r.explain));
          }
        }
      }
    }
  }
});

test('selfHeal toggle: cluster drift is reverted only with autoSync AND selfHeal', () => {
  const drift = scenario(GITOPS, 'manual-drift');
  // Manual sync is its own action and works regardless of the toggles.
  const manual = computeReconcile(GITOPS.model, drift, POLICY(), 'sync');
  assert.deepEqual([manual.sync, manual.explain], ['synced', 'synced-clean']);
  // autoSync alone does NOT revert cluster-side drift (the article's bullet).
  const alone = computeReconcile(GITOPS.model, drift, POLICY(true, false), 'none');
  assert.deepEqual([alone.sync, alone.explain], ['out-of-sync', 'drift-kept']);
  assert.equal(alone.deltaAfter.length, 1);
  // selfHeal (with autoSync) reverts it.
  const healed = computeReconcile(GITOPS.model, drift, POLICY(true, true), 'none');
  assert.deepEqual([healed.sync, healed.explain], ['synced', 'self-healed']);
  // selfHeal without autoSync changes nothing (it is a sub-choice of automation).
  const orphan = computeReconcile(GITOPS.model, drift, POLICY(false, true), 'none');
  assert.deepEqual([orphan.sync, orphan.explain], ['out-of-sync', 'idle']);
});

test('prune toggle: a Git-deleted resource is deleted explicitly, never silently', () => {
  const gone = scenario(GITOPS, 'git-deletion');
  // Default (prune off): the resource stays and the deletion outcome says so.
  const kept = computeReconcile(GITOPS.model, gone, POLICY(), 'sync');
  assert.deepEqual([kept.deletion, kept.sync, kept.explain], ['kept', 'out-of-sync', 'deletion-kept']);
  assert.equal(kept.after.resource, 'present');
  // prune on: deleted, explicitly reported.
  const deleted = computeReconcile(GITOPS.model, gone, POLICY(false, false, true), 'sync');
  assert.deepEqual([deleted.deletion, deleted.sync, deleted.explain], ['deleted', 'synced', 'deletion-pruned']);
  assert.equal(deleted.after.resource, 'absent');
  // autoSync + prune also deletes (auto sync applies Git changes)…
  const auto = computeReconcile(GITOPS.model, gone, POLICY(true, false, true), 'none');
  assert.deepEqual([auto.deletion, auto.sync], ['deleted', 'synced']);
  // …but autoSync without prune keeps it (no automatic deletion).
  const autoKeep = computeReconcile(GITOPS.model, gone, POLICY(true, false, false), 'none');
  assert.deepEqual([autoKeep.deletion, autoKeep.sync], ['kept', 'out-of-sync']);
});

test('rollback guard: enabled auto sync refuses history rollback', () => {
  const rb = scenario(GITOPS, 'history-rollback');
  const guardOn = canRollback(rb, POLICY(true));
  assert.deepEqual(guardOn, { allowed: false, reason: 'auto-sync' });
  const blocked = computeReconcile(GITOPS.model, rb, POLICY(true), 'rollback');
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.explain, 'rollback-blocked');
  assert.equal(blocked.after.version, rb.cluster.version, 'a refused rollback changes nothing');

  // With auto sync off the rollback applies — but it is temporary: the Git
  // desired version is unchanged, so the delta returns.
  const allowed = canRollback(rb, POLICY());
  assert.deepEqual(allowed, { allowed: true, reason: null });
  const applied = computeReconcile(GITOPS.model, rb, POLICY(), 'rollback');
  assert.deepEqual([applied.rolledBack, applied.after.version], [true, 2]);
  assert.deepEqual([applied.sync, applied.explain], ['out-of-sync', 'rollback-temporary']);
  assert.deepEqual(applied.deltaAfter, [{ field: 'version', git: 3, cluster: 2 }]);
  // A later sync pulls the version back (the rollback is not durable).
  const pulled = computeReconcile(GITOPS.model, rb, POLICY(), 'sync');
  assert.equal(pulled.after.version, 3);

  // No history entry → no rollback at all.
  const noHistory = canRollback(scenario(GITOPS, 'git-revert'), POLICY());
  assert.deepEqual(noHistory, { allowed: false, reason: 'no-history' });
});

test('autoSync applies Git-originated changes and the Git revert path is durable', () => {
  const deploy = scenario(GITOPS, 'initial-deploy');
  const idle = computeReconcile(GITOPS.model, deploy, POLICY(), 'none');
  assert.deepEqual([idle.sync, idle.explain], ['out-of-sync', 'idle']);
  const auto = computeReconcile(GITOPS.model, deploy, POLICY(true), 'none');
  assert.deepEqual([auto.sync, auto.explain], ['synced', 'auto-synced']);

  const revert = scenario(GITOPS, 'git-revert');
  const synced = computeReconcile(GITOPS.model, revert, POLICY(), 'sync');
  assert.deepEqual([synced.after.version, synced.sync], [2, 'synced']);
  assert.deepEqual(synced.deltaAfter, []);
  assert.equal(synced.explain, 'synced-clean');
});

test('gitops grid invariants: exact diffs, bounded deletion, no invented health', () => {
  for (const s of GITOPS.scenarios) {
    for (const autoSync of [false, true]) {
      for (const selfHeal of [false, true]) {
        for (const prune of [false, true]) {
          for (const action of ['none', 'sync', 'rollback']) {
            const where = `${s.id}/${autoSync}/${selfHeal}/${prune}/${action}`;
            const r = computeReconcile(GITOPS.model, s, POLICY(autoSync, selfHeal, prune), action);
            assert.deepEqual(r.deltaBefore, diff(s.git, s.cluster), `before delta ${where}`);
            assert.deepEqual(r.deltaAfter, diff(s.git, r.after), `after delta ${where}`);
            assert.deepEqual(
              [...r.deltaAfter.map((d) => d.field)].sort(),
              [...new Set(r.deltaAfter.map((d) => d.field))].sort(),
              `delta fields unique ${where}`
            );
            assert.ok(r.deltaAfter.every((d) => STATE_FIELDS.includes(d.field)), where);
            if (r.deletion === 'deleted') {
              assert.ok(prune, `deletion only with prune (${where})`);
              assert.equal(s.git.resource, 'absent');
              assert.deepEqual(r.after, { replicas: 0, version: 0, resource: 'absent' }, where);
            }
            if (r.deletion === 'kept') {
              assert.equal(prune, false, where);
              assert.equal(r.after.resource, 'present');
              assert.deepEqual(r.after, s.cluster, `retained workload untouched ${where}`);
            }
            if (action === 'rollback' && autoSync) {
              assert.equal(r.blocked, true, where);
            }
          }
        }
      }
    }
  }
});

test('applySync keeps the entire live workload without prune (absence semantics)', () => {
  // Review G1: with Git no longer defining the workload there is no desired
  // manifest to apply — a retained extraneous workload keeps its ENTIRE live
  // state and never receives absent placeholders.
  const git = { replicas: 0, version: 0, resource: 'absent' };
  const cluster = { replicas: 3, version: 2, resource: 'present' };
  const kept = applySync(git, cluster, false);
  assert.deepEqual(kept, { cluster: { replicas: 3, version: 2, resource: 'present' }, deletion: 'kept' });
  // A pruned workload is gone and ends on the absent placeholders.
  const deleted = applySync(git, cluster, true);
  assert.deepEqual(deleted, { cluster: { replicas: 0, version: 0, resource: 'absent' }, deletion: 'deleted' });
  // Creating/updating adopts the desired state exactly.
  const created = applySync(
    { replicas: 2, version: 1, resource: 'present' },
    { replicas: 0, version: 0, resource: 'absent' },
    false
  );
  assert.deepEqual(created, { cluster: { replicas: 2, version: 1, resource: 'present' }, deletion: 'none' });
  // The compute path agrees: syncing git-deletion without prune leaves the
  // whole workload as it runs and reports only the pending deletion.
  const gone = scenario(GITOPS, 'git-deletion');
  const r = computeReconcile(GITOPS.model, gone, POLICY(), 'sync');
  assert.deepEqual(r.after, gone.cluster);
  assert.deepEqual(r.deltaAfter, [{ field: 'resource', git: 'absent', cluster: 'present' }]);
});

test('diff ignores placeholder fields of absent workloads', () => {
  // Two absent sides are in sync regardless of their placeholders.
  assert.deepEqual(
    diff({ replicas: 0, version: 0, resource: 'absent' }, { replicas: 3, version: 2, resource: 'absent' }),
    []
  );
  // A pending deletion is exactly the presence mismatch.
  assert.deepEqual(
    diff({ replicas: 0, version: 0, resource: 'absent' }, { replicas: 3, version: 2, resource: 'present' }),
    [{ field: 'resource', git: 'absent', cluster: 'present' }]
  );
  // Live workloads compare all three fields.
  const live = diff(
    { replicas: 3, version: 2, resource: 'present' },
    { replicas: 2, version: 3, resource: 'present' }
  );
  assert.deepEqual(live.map((d) => d.field), ['replicas', 'version']);
});

test('regression (review G2): missing-workload history rollback is rejected, not faked', () => {
  // Restoring a history entry while the workload is absent cannot restore
  // anything in this LIMITED teaching model: the schema rejects the state
  // and the guard refuses it defensively (no claim about Argo CD in general).
  const raw = {
    id: 'case',
    origin: 'cluster',
    health: 'unknown',
    historyVersion: 1,
    git: { replicas: 3, version: 2, resource: 'present' },
    cluster: { replicas: 0, version: 0, resource: 'absent' },
  };
  assert.deepEqual(canRollback(raw, POLICY()), { allowed: false, reason: 'no-live-workload' });
  const r = computeReconcile({ replicaMax: 10, versionMax: 20 }, raw, POLICY(), 'rollback');
  assert.equal(r.rolledBack, false, 'a refused rollback must not claim restoration');
  assert.deepEqual(r.after, raw.cluster);
  // Schema: such a scenario never reaches the runtime.
  const missingRestore = structuredClone(GITOPS);
  missingRestore.scenarios[0] = { ...structuredClone(raw), id: missingRestore.scenarios[0].id };
  expectError(missingRestore, `$.scenarios[${0}].historyVersion`);
  // Schema: absent workloads carry placeholder zeros only.
  const fakePlaceholders = structuredClone(GITOPS);
  fakePlaceholders.scenarios[2] = {
    ...fakePlaceholders.scenarios[2],
    git: { replicas: 3, version: 2, resource: 'absent' },
  };
  expectError(fakePlaceholders, '$.scenarios[2].git.replicas');
  expectError(fakePlaceholders, '$.scenarios[2].git.version');
});

/* ── corrupt spec checks (fixture files + targeted mutations) ─────────── */

test('corrupt effect-recovery fixture fails at every targeted field', () => {
  const raw = fixture('effect-recovery-corrupt-v1.json');
  const { ok, errors } = validateSpec(raw, { file: 'effect-recovery-corrupt-v1.json' });
  assert.equal(ok, false);
  const seen = fields(errors);
  for (const expected of [
    '$.model.maxSteps', // 5.5 — not a finite integer
    '$.scenarios[0].effectPlacement', // queue-retry has no interrupt gate
    '$.scenarios[0].provider.idempotencyKey', // "yes" is not a boolean flag
    '$.scenarios[0].defaultCrash', // "whenever" is not a crash window
    '$.scenarios[0].extra', // unknown scenario key
    '$.scenarios[1].id', // duplicate scenario id
    '$.copy.zh.surprise', // unknown copy key
    '$.copy.en.lanes', // en copy incomplete
  ]) {
    assert.ok(seen.includes(expected), `expected ${expected}, got:\n${formatErrors(errors)}`);
  }
});

test('corrupt gitops-reconcile fixture fails at every targeted field', () => {
  const raw = fixture('gitops-reconcile-corrupt-v1.json');
  const { ok, errors } = validateSpec(raw, { file: 'gitops-reconcile-corrupt-v1.json' });
  assert.equal(ok, false);
  const seen = fields(errors);
  for (const expected of [
    '$.model.extra', // unknown model key
    '$.scenarios[0].origin', // "elsewhere" is not an origin
    '$.scenarios[0].git.replicas', // negative
    '$.scenarios[0].git.resource', // unknown resource state
    '$.scenarios[0].cluster.version', // 3.5 — not an integer
    '$.scenarios[0].historyVersion', // equals the Git desired version
    '$.sourceRefs[0].url', // javascript: URL
  ]) {
    assert.ok(seen.includes(expected), `expected ${expected}, got:\n${formatErrors(errors)}`);
  }
});

test('the shipped effects specs are valid', () => {
  for (const spec of [N8N, LANGGRAPH, GITOPS, readJson('data/interactive/loop-verifier-v1.json')]) {
    const { ok, errors } = validateSpec(spec, { file: `${spec.id}.json` });
    assert.equal(ok, true, formatErrors(errors));
  }
});

test('finite bounded inputs: decimals, infinities and NaN are rejected', () => {
  expectError(
    { ...structuredClone(N8N), model: { flow: 'queue-retry', maxSteps: 7.5 } },
    '$.model.maxSteps'
  );
  expectError(
    { ...structuredClone(N8N), model: { flow: 'queue-retry', maxSteps: Infinity } },
    '$.model.maxSteps'
  );
  expectError(
    { ...structuredClone(GITOPS), scenarios: [{ ...structuredClone(GITOPS.scenarios[0]), cluster: { ...GITOPS.scenarios[0].cluster, replicas: NaN } }] },
    '$.scenarios[0].cluster.replicas'
  );
  expectError(
    { ...structuredClone(GITOPS), model: { replicaMax: 0, versionMax: 99 } },
    '$.model.replicaMax'
  );
});

test('unknown keys fail everywhere (model, scenario, copy)', () => {
  expectError({ ...structuredClone(N8N), model: { flow: 'queue-retry', maxSteps: 7, mystery: 1 } }, '$.model.mystery');
  expectError({ ...structuredClone(N8N), mystery: true }, '$.mystery');
  const badCopy = structuredClone(N8N);
  delete badCopy.copy.en.next;
  expectError(badCopy, '$.copy.en.next');
  const missingLocale = structuredClone(N8N);
  delete missingLocale.copy.en;
  expectError(missingLocale, '$.copy.en');
  const badLabel = structuredClone(N8N);
  delete badLabel.copy.zh.scenarioLabels['key-provider'];
  expectError(badLabel, '$.copy.zh.scenarioLabels.key-provider');
});

test('cross references and enums are enforced (defaults, placements, strategies)', () => {
  expectError({ ...structuredClone(N8N), defaultScenario: 'nope' }, '$.defaultScenario');
  const dup = structuredClone(N8N);
  dup.scenarios[1].id = dup.scenarios[0].id;
  expectError(dup, '$.scenarios[1].id');
  const badStrategy = structuredClone(LANGGRAPH);
  badStrategy.scenarios[0].defaultStrategy = 'hope';
  expectError(badStrategy, '$.scenarios[0].defaultStrategy');
  const badPlacement = structuredClone(LANGGRAPH);
  badPlacement.scenarios[0].effectPlacement = 'plain';
  expectError(badPlacement, '$.scenarios[0].effectPlacement');
  const badSteps = structuredClone(N8N);
  badSteps.model = { flow: 'queue-retry', maxSteps: 4 }; // below the 7-step timeline
  expectError(badSteps, '$.model.maxSteps');
  const badHealth = structuredClone(GITOPS);
  badHealth.scenarios[0].health = 'fine';
  expectError(badHealth, '$.scenarios[0].health');
  const badResource = structuredClone(GITOPS);
  badResource.scenarios[0].git.resource = 'maybe';
  expectError(badResource, '$.scenarios[0].git.resource');
});

test('source URLs keep the strict policy (https or controlled internal path)', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,x', '//evil.example/x', '/../secret', 'http://insecure.example/x']) {
    const bad = structuredClone(N8N);
    bad.sourceRefs = [{ url, title: 'x' }];
    expectError(bad, '$.sourceRefs[0].url', url);
  }
  const internal = structuredClone(N8N);
  internal.sourceRefs = [{ url: '/zh/ai-agent/posts/langgraph/', title: 'x' }];
  assert.equal(validateSpec(internal, { file: 't' }).ok, true);
});
