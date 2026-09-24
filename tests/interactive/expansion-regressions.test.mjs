import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { sessionKey } from '../../assets/js/components/session-scope-model.mjs';
import { clampPermille as reliabilityProbability } from '../../assets/js/components/reliability-chain-model.mjs';
import { clampPermille as notificationProbability } from '../../assets/js/components/notification-threshold-model.mjs';
import { computeEffect, timelineStates } from '../../assets/js/components/effect-recovery-model.mjs';
import { applySync, diff } from '../../assets/js/components/gitops-reconcile-model.mjs';

const specUrl = (name) => new URL(`../../data/interactive/${name}-v1.json`, import.meta.url);

test('cyclic session ancestry fails validation promptly even when compaction is requested', () => {
  const schema = new URL('../../assets/js/components/spec-schema.mjs', import.meta.url).href;
  const spec = JSON.parse(readFileSync(specUrl('session-tree'), 'utf8'));
  const node = spec.model.nodes.find((entry) => entry.parentId !== null);
  node.parentId = node.id;
  spec.scenarios[0].activeLeaf = node.id;
  spec.scenarios[0].compaction = true;
  // A regression must fail this isolated process, never hang the whole suite.
  const source = `import { validateSpec } from ${JSON.stringify(schema)};
    const result = validateSpec(${JSON.stringify(spec)});
    if (result.ok || !result.errors.length) process.exit(2);`;
  assert.doesNotThrow(() => execFileSync(process.execPath, ['--input-type=module', '-e', source], {
    timeout: 2000, stdio: 'pipe',
  }));
});

test('session peer keys follow upstream normalization after identity resolution', () => {
  const spec = JSON.parse(readFileSync(specUrl('session-scope'), 'utf8'));
  const model = spec.model;
  const message = { ...model.messages[0], peerId: 'U222' };
  for (const mode of ['per-peer', 'per-channel-peer', 'per-account-channel-peer']) {
    const scenario = { mode, useIdentityLinks: false };
    const actual = sessionKey(model, scenario, message);
    assert.equal(actual, sessionKey(model, scenario, { ...message, peerId: 'u222' }));
    assert.ok(actual.endsWith(':u222'));
  }
  const linked = { ...model, identityLinks: [{ peerId: 'U222', canonical: 'PersonA' }] };
  assert.equal(sessionKey(linked, { mode: 'per-peer', useIdentityLinks: true }, message),
    `agent:${model.agentId}:direct:persona`);
});

test('probability clamps return an attainable range value when the step does not divide the maximum', () => {
  for (const clamp of [reliabilityProbability, notificationProbability]) {
    for (const step of [3, 7, 600]) {
      for (const value of [-1, 0, 599, 999, 1000, 2000]) {
        const result = clamp(value, step);
        assert.ok(result >= 0 && result <= 1000);
        assert.equal(result % step, 0, `${value} with step ${step} returned ${result}`);
      }
    }
  }
});

test('recovery knowledge distinguishes an unknown count from proven duplicate failure', () => {
  const model = { flow: 'node-replay', maxSteps: 9 };
  const scenario = { effectPlacement: 'before-approval',
    provider: { receiptQuery: true, idempotencyKey: false } };
  const result = computeEffect(model, scenario, 'after-commit-before-receipt', 'retry');
  assert.ok(result.lo > 1 && result.hi > result.lo);
  assert.equal(result.knowledge, 'confirmed-failure');
  // A receipt proving zero earlier writes cannot make an unprotected
  // pre-interrupt side effect safe to replay twice.
  const empty = computeEffect(model, scenario, 'before-send', 'query-receipt');
  assert.notEqual(empty.next, 'retry-safe');
});

test('a retry after the final crash still shows the repeated external write', () => {
  const model = { flow: 'queue-retry', maxSteps: 7 };
  const scenario = { effectPlacement: 'plain',
    provider: { receiptQuery: true, idempotencyKey: false } };
  const trace = timelineStates(model, scenario, 'after-recorded-receipt', 'retry');
  assert.equal(computeEffect(model, scenario, 'after-recorded-receipt', 'retry').actions, 2);
  for (const key of ['send', 'commit']) {
    assert.equal(trace.find((step) => step.key === key).state, 'repeated', key);
    assert.equal(trace.find((step) => step.key === key).runs, 2, key);
  }
});

test('without pruning an extraneous workload is retained without applying absent-state placeholders', () => {
  const git = { resource: 'absent', replicas: 0, version: 0 };
  const cluster = { resource: 'present', replicas: 3, version: 2 };
  const result = applySync(git, cluster, false);
  assert.equal(result.deletion, 'kept');
  assert.deepEqual(result.cluster, cluster);
  assert.deepEqual(diff(git, { resource: 'absent', replicas: 3, version: 2 }), []);
});
