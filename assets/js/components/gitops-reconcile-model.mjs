/**
 * gitops-reconcile-model.mjs — pure model and executable validator for the
 * `gitops-reconcile` kind (Git desired state vs cluster state, plus an
 * independently supplied workload health).
 *
 * No DOM, no timers, no network and NO import of spec-schema.mjs (the schema
 * module imports THIS validator and passes its own list/ref helpers in).
 * Everything is exact integer math over three state fields — replicas,
 * version and resource presence — inside fixed, scenario-focused bounds.
 * See docs/interactive/effects.md for the field vocabulary and the factual
 * limits (this is a teaching model of Argo CD semantics, not Argo CD).
 *
 * The kind keeps the article's four decisions apart:
 *   - Sync status is `diff(Git, cluster)` — nothing else;
 *   - Health is supplied independently and is NEVER fabricated or repaired by
 *     sync ("no artificial automatic recovery on health");
 *   - `autoSync` reacts to Git-originated changes, `selfHeal` is the separate
 *     switch for cluster-side drift, `prune` is the explicit deletion switch;
 *   - manual sync is its own action, and while `autoSync` is enabled history
 *     rollback is refused (the rollback guard).
 */

export const ORIGINS = ['git', 'cluster'];
export const HEALTH_STATES = ['healthy', 'degraded', 'progressing', 'unknown'];
export const RESOURCE_STATES = ['present', 'absent'];
export const SYNC_STATES = ['synced', 'out-of-sync'];
export const STATE_FIELDS = ['replicas', 'version', 'resource'];
export const DELETION_STATES = ['none', 'deleted', 'kept'];
export const RECONCILE_EXPLAIN = [
  'rollback-blocked',
  'rollback-temporary',
  'deletion-pruned',
  'deletion-kept',
  'self-healed',
  'auto-synced',
  'drift-kept',
  'synced-clean',
  'idle',
];

const LIMITS = {
  label: 80,
  figureLabel: 80,
  title: 120,
  question: 400,
  note: 400,
  footerNote: 120,
  notice: 200,
};

/** Field-by-field difference between Git's desired state and the cluster.
 * Absence semantics: replicas/version describe a LIVE workload. When either
 * side has no workload those values are placeholders and are not comparable
 * state — two absent sides are in sync regardless of their placeholders, and
 * a pending deletion is exactly the presence mismatch. */
export function diff(git, cluster) {
  const out = [];
  const bothPresent = git.resource === 'present' && cluster.resource === 'present';
  if (bothPresent) {
    for (const field of ['replicas', 'version']) {
      if (git[field] !== cluster[field]) {
        out.push({ field, git: git[field], cluster: cluster[field] });
      }
    }
  }
  if (git.resource !== cluster.resource) {
    out.push({ field: 'resource', git: git.resource, cluster: cluster.resource });
  }
  return out;
}

/** One sync pass: adopt Git's desired state. Deletion is NEVER silent — a
 * Git-removed resource is only deleted when `prune` is on, and a retained
 * extraneous workload keeps its ENTIRE live state (replicas and version
 * untouched: Git defines nothing to apply while the workload is deleted). A
 * pruned workload is gone, so it ends on the absent placeholders. Returns the
 * next cluster state + deletion. */
export function applySync(git, cluster, prune) {
  const next = { ...cluster };
  let deletion = 'none';
  if (git.resource === 'absent') {
    if (cluster.resource === 'present') {
      if (prune) {
        deletion = 'deleted';
        next.replicas = 0;
        next.version = 0;
        next.resource = 'absent';
      } else {
        deletion = 'kept';
        // Retained extraneous resource: the live workload stays exactly as it
        // runs — no absent placeholders are ever applied to it.
      }
    }
    return { cluster: next, deletion };
  }
  // Git defines the workload: create or update it to the desired state.
  next.replicas = git.replicas;
  next.version = git.version;
  next.resource = 'present';
  return { cluster: next, deletion };
}

/** The history-rollback guard: Argo CD refuses `app rollback` while automated
 * sync is enabled, and a rollback needs a history entry to restore. This
 * LIMITED teaching model additionally restores only a live, Git-defined
 * workload — missing-workload restore is out of scope (it does not claim Argo
 * CD universally requires a present resource). */
export function canRollback(scenario, policy) {
  if (policy.autoSync) return { allowed: false, reason: 'auto-sync' };
  if (scenario.historyVersion === undefined || scenario.historyVersion === null) {
    return { allowed: false, reason: 'no-history' };
  }
  if (scenario.git.resource !== 'present' || scenario.cluster.resource !== 'present') {
    return { allowed: false, reason: 'no-live-workload' };
  }
  return { allowed: true, reason: null };
}

/**
 * The deterministic reconcile model. Pure function of
 * (model, scenario, policy, action):
 *
 *   policy — { autoSync, selfHeal, prune } booleans (the three toggles);
 *   action — 'none' (observe only) | 'sync' (the distinct manual sync
 *            button) | 'rollback' (restore the scenario's history entry;
 *            refused when autoSync is enabled — the rollback guard).
 *
 * Automation rules (accurate constraints, no invented recovery):
 *   - `autoSync` applies Git-originated changes while the app is OutOfSync;
 *   - cluster-side drift is only reverted when `selfHeal` is also on;
 *   - deletions require `prune` in whichever sync runs;
 *   - sync status and health stay separate outputs; health is the scenario's
 *     independently supplied assessment and no toggle changes it.
 *
 * Returns Sync status and Health separately, the before/after delta and the
 * explicit deletion outcome.
 */
export function computeReconcile(model, scenario, policy, action) {
  const git = scenario.git;
  const deltaBefore = diff(git, scenario.cluster);
  let cluster = { ...scenario.cluster };
  let deletion = 'none';
  let rolledBack = false;
  let blocked = false;

  if (action === 'rollback') {
    const guard = canRollback(scenario, policy);
    if (!guard.allowed) {
      blocked = guard.reason === 'auto-sync';
    } else {
      cluster = { ...cluster, version: scenario.historyVersion };
      rolledBack = true;
    }
  } else if (action === 'sync') {
    ({ cluster, deletion } = applySync(git, cluster, policy.prune));
  }

  let autoApplied = false;
  let selfHealed = false;
  if (policy.autoSync) {
    const pending = diff(git, cluster);
    if (pending.length > 0) {
      // A history rollback moved the cluster, so the remaining delta is
      // cluster-side drift even when the scenario's change came from Git.
      const origin = rolledBack ? 'cluster' : scenario.origin;
      if (origin === 'git' || policy.selfHeal) {
        ({ cluster, deletion } = applySync(git, cluster, policy.prune));
        if (origin === 'git') autoApplied = true;
        else selfHealed = true;
      }
    }
  }

  const deltaAfter = diff(git, cluster);
  const sync = deltaAfter.length === 0 ? 'synced' : 'out-of-sync';
  const rollback = canRollback(scenario, policy);

  let explain;
  if (blocked) explain = 'rollback-blocked';
  else if (rolledBack) explain = 'rollback-temporary';
  else if (deletion === 'deleted') explain = 'deletion-pruned';
  else if (deletion === 'kept') explain = 'deletion-kept';
  else if (selfHealed) explain = 'self-healed';
  else if (autoApplied) explain = 'auto-synced';
  else if (deltaAfter.length > 0 && policy.autoSync && scenario.origin === 'cluster' && !policy.selfHeal) {
    explain = 'drift-kept';
  } else if (deltaAfter.length === 0) explain = 'synced-clean';
  else explain = 'idle';

  return {
    sync,
    health: scenario.health,
    deltaBefore,
    deltaAfter,
    deletion,
    explain,
    rolledBack,
    blocked,
    rollback,
    after: cluster,
  };
}

/** Scenario lookup by id (null when unknown). */
export function findScenario(spec, id) {
  return spec.scenarios.find((s) => s.id === id) || null;
}

/** The spec's default scenario (callers must validate the spec first). */
export function defaultScenario(spec) {
  return findScenario(spec, spec.defaultScenario);
}

/* ── validator (called by spec-schema.validateSpec after validateCommon) ── */

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const SHARED_COPY = [
  ['figureLabel', LIMITS.figureLabel],
  ['title', LIMITS.title],
  ['question', LIMITS.question],
  ['assumption', LIMITS.note],
  ['observe', LIMITS.note],
  ['footerNote', LIMITS.footerNote],
  ['referenceTitle', LIMITS.label],
];

function validateSharedCopy(lp, copy) {
  let ok = true;
  for (const [key, maxLen] of SHARED_COPY) {
    if (!lp.child(key).text(copy[key], maxLen)) ok = false;
  }
  return ok;
}

function validateWorkloadState(sp, state, model) {
  if (!sp.keys(state, ['replicas', 'version', 'resource'])) return false;
  let ok = true;
  const replicaMax = Number.isInteger(model.replicaMax) ? model.replicaMax : 1000;
  const versionMax = Number.isInteger(model.versionMax) ? model.versionMax : 9999;
  if (!sp.child('replicas').integer(state.replicas, 0, replicaMax)) ok = false;
  if (!sp.child('version').integer(state.version, 0, versionMax)) ok = false;
  if (!sp.child('resource').enum(state.resource, RESOURCE_STATES)) ok = false;
  // Absence semantics: replicas/version belong to a live workload. An absent
  // side carries only the placeholder zeros — no fictitious workload state.
  if (ok && state.resource === 'absent') {
    if (state.replicas !== 0) {
      sp.child('replicas').fail('an absent workload must use the placeholder replicas 0 (replicas describe a live workload)');
      ok = false;
    }
    if (state.version !== 0) {
      sp.child('version').fail('an absent workload must use the placeholder version 0 (versions describe a live workload)');
      ok = false;
    }
  }
  return ok;
}

/**
 * Strict `gitops-reconcile` data contract. `p` is the schema module's
 * PathCtx; `helpers` carries { validateScenariosList, validateSourceRefs }.
 */
export function validateGitopsReconcile(p, raw, helpers) {
  let ok = true;

  /* model: exact keys { replicaMax, versionMax } — the integer bounds every
     workload state must fit inside. */
  const mp = p.child('model');
  let model = {};
  if (!mp.keys(raw.model, ['replicaMax', 'versionMax'])) {
    ok = false;
  } else {
    model = raw.model;
    if (!mp.child('replicaMax').integer(raw.model.replicaMax, 1, 1000)) ok = false;
    if (!mp.child('versionMax').integer(raw.model.versionMax, 2, 9999)) ok = false;
  }

  /* scenarios */
  const scenarioIds = helpers.validateScenariosList(p, raw, (ip, scenario) => {
    let sok = ip.fields(
      scenario,
      ['id', 'origin', 'git', 'cluster', 'health'],
      ['id', 'origin', 'git', 'cluster', 'health', 'historyVersion']
    );
    if (!ip.child('origin').enum(scenario.origin, ORIGINS)) sok = false;
    if (!ip.child('health').enum(scenario.health, HEALTH_STATES)) sok = false;
    if (!validateWorkloadState(ip.child('git'), scenario.git, model)) sok = false;
    if (!validateWorkloadState(ip.child('cluster'), scenario.cluster, model)) sok = false;
    if (Object.prototype.hasOwnProperty.call(scenario, 'historyVersion')) {
      const versionMax = Number.isInteger(model.versionMax) ? model.versionMax : 9999;
      if (!ip.child('historyVersion').integer(scenario.historyVersion, 1, versionMax)) {
        sok = false;
      } else if (isPlainObject(scenario.git) && scenario.historyVersion === scenario.git.version) {
        ip.child('historyVersion').fail(
          'historyVersion must differ from the Git desired version (a rollback that restores the desired version is not a rollback)'
        );
        sok = false;
      } else if (
        isPlainObject(scenario.git) &&
        isPlainObject(scenario.cluster) &&
        (scenario.git.resource !== 'present' || scenario.cluster.resource !== 'present')
      ) {
        // This LIMITED teaching model restores the version of a live,
        // Git-defined workload only — it does not model restoring a missing
        // workload from history (and makes no claim about Argo CD in general).
        ip.child('historyVersion').fail(
          'historyVersion is limited to a live, Git-defined workload in this teaching model: git and cluster resource must both be "present"'
        );
        sok = false;
      }
    }
    return sok;
  });
  if (!scenarioIds) ok = false;

  /* copy: exactly zh and en, both complete */
  const cp = p.child('copy');
  if (!cp.keys(raw.copy, ['zh', 'en'])) {
    ok = false;
  } else {
    for (const lang of ['zh', 'en']) {
      const lp = cp.child(lang);
      const copy = raw.copy[lang];
      if (!isPlainObject(copy)) {
        lp.fail('expected a copy object');
        ok = false;
        continue;
      }
      const allowed = [
        ...SHARED_COPY.map(([key]) => key),
        'scenarioLabels',
        'traceNotice',
        'states',
        'resourceState',
        'statusLabels',
        'healthLabels',
        'toggles',
        'actions',
        'guardReasons',
        'readout',
        'deletionLabels',
        'noDelta',
        'table',
        'explanations',
      ];
      if (!lp.keys(copy, allowed)) {
        ok = false;
        continue;
      }
      if (!validateSharedCopy(lp, copy)) ok = false;
      if (!lp.child('traceNotice').text(copy.traceNotice, LIMITS.notice)) ok = false;
      if (!lp.child('states').textMap(copy.states, STATE_FIELDS, LIMITS.label)) ok = false;
      if (!lp.child('resourceState').textMap(copy.resourceState, RESOURCE_STATES, LIMITS.label)) ok = false;
      if (!lp.child('statusLabels').textMap(copy.statusLabels, SYNC_STATES, LIMITS.label)) ok = false;
      if (!lp.child('healthLabels').textMap(copy.healthLabels, HEALTH_STATES, LIMITS.label)) ok = false;
      if (
        !lp.child('toggles').textMap(copy.toggles, ['auto-sync', 'self-heal', 'prune'], LIMITS.label)
      ) {
        ok = false;
      }
      if (!lp.child('actions').textMap(copy.actions, ['sync', 'rollback'], LIMITS.label)) ok = false;
      if (
        !lp.child('guardReasons').textMap(
          copy.guardReasons,
          ['auto-sync', 'no-history', 'no-live-workload'],
          LIMITS.note
        )
      ) {
        ok = false;
      }
      if (
        !lp.child('readout').textMap(
          copy.readout,
          ['sync', 'health', 'deltaBefore', 'deltaAfter', 'deletion'],
          LIMITS.label
        )
      ) {
        ok = false;
      }
      if (!lp.child('deletionLabels').textMap(copy.deletionLabels, DELETION_STATES, LIMITS.label)) ok = false;
      if (!lp.child('noDelta').text(copy.noDelta, LIMITS.label)) ok = false;
      if (
        !lp.child('table').textMap(
          copy.table,
          ['scenario', 'desired', 'cluster', 'delta', 'health'],
          LIMITS.label
        )
      ) {
        ok = false;
      }
      if (!lp.child('explanations').textMap(copy.explanations, RECONCILE_EXPLAIN, LIMITS.note)) ok = false;

      const labels = lp.child('scenarioLabels');
      if (scenarioIds && !labels.keys(copy.scenarioLabels, [...scenarioIds])) {
        ok = false;
      } else if (scenarioIds) {
        for (const id of scenarioIds) {
          if (!labels.child(id).text(copy.scenarioLabels[id], LIMITS.label)) ok = false;
        }
      }
    }
  }

  if (!helpers.validateSourceRefs(p, raw)) ok = false;
  return ok && p.errors.length === 0;
}
