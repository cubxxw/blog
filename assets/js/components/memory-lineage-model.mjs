/**
 * memory-lineage-model.mjs — pure model + spec validator for
 * <blog-memory-lineage> (GROUP state / Forgetting article, "一条删除请求会走多远").
 *
 * Teaching model: a small authored dependency DAG — source events → derived
 * summaries/profiles → index/cache/recommendation artifacts, plus external
 * nodes outside the system boundary. Selecting which sources a delete
 * request covers classifies every node deterministically:
 *
 *   removed     — the directly deleted source event(s);
 *   invalidated — derived artifacts whose ENTIRE recorded evidence trail is
 *                 deleted (invalidated ≠ verified physical deletion);
 *   recompute   — derived artifacts that still have surviving evidence
 *                 (mixed evidence): they must be recomputed, not deleted;
 *   unproven    — external nodes (provider caches, backups) and derived
 *                 artifacts without recorded lineage: not provably erased;
 *   kept        — nodes the request never reaches.
 *
 * All content is synthetic teaching data (no private or real user data).
 * Pure module: no DOM, no timers, no network, and no import from
 * spec-schema.mjs (the validator is CALLED by spec-schema with its own
 * PathCtx and helpers, avoiding a circular import).
 */

export const MEMORY_LINEAGE_MODEL_KEYS = ['nodes'];
export const NODE_KINDS = ['source', 'derived', 'external'];
/** Result buckets in reading order (before → after comparison). */
export const STATUSES = ['kept', 'removed', 'invalidated', 'recompute', 'unproven'];
/** After-state bucket order used by the result strips. */
export const RESULT_ORDER = ['removed', 'invalidated', 'recompute', 'unproven', 'kept'];

const LIMITS = {
  id: 64,
  text: 240,
  label: 80,
  title: 120,
  question: 400,
  note: 400,
  footerNote: 120,
  nodes: 16,
  parents: 4,
  removedSources: 4,
};

const COPY_KEYS = [
  'figureLabel',
  'title',
  'question',
  'assumption',
  'observe',
  'footerNote',
  'referenceTitle',
  'scenarioLabels',
  'nodeKinds',
  'statuses',
  'beforeLabel',
  'afterLabel',
  'requestLabel',
  'selectLabel',
  'invalidationNote',
  'graphLabel',
];

function describe(value) {
  if (typeof value === 'string') return JSON.stringify(value.slice(0, 40));
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  if (typeof value === 'object') return 'an object';
  return String(value);
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

function validateCopy(p, raw, scenarioIds) {
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
    if (!lp.child('beforeLabel').text(copy.beforeLabel, LIMITS.label)) ok = false;
    if (!lp.child('afterLabel').text(copy.afterLabel, LIMITS.label)) ok = false;
    if (!lp.child('requestLabel').text(copy.requestLabel, LIMITS.label)) ok = false;
    if (!lp.child('selectLabel').text(copy.selectLabel, LIMITS.label)) ok = false;
    if (!lp.child('invalidationNote').text(copy.invalidationNote, LIMITS.note)) ok = false;
    if (!lp.child('graphLabel').text(copy.graphLabel, LIMITS.label)) ok = false;
    if (!lp.child('nodeKinds').textMap(copy.nodeKinds, ['source', 'derived', 'external'], LIMITS.label)) {
      ok = false;
    }
    if (!lp.child('statuses').textMap(copy.statuses, STATUSES, LIMITS.label)) {
      ok = false;
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
export function validateMemoryLineage(p, raw, helpers) {
  let ok = true;
  const { validateScenariosList, validateSourceRefs } = helpers;
  const nodeIndex = new Map();
  const kindCount = { source: 0, derived: 0, external: 0 };

  const mp = p.child('model');
  if (!mp.keys(raw.model, MEMORY_LINEAGE_MODEL_KEYS)) {
    ok = false;
  } else {
    const nodes = raw.model.nodes;
    const np = mp.child('nodes');
    if (!Array.isArray(nodes) || nodes.length < 3 || nodes.length > LIMITS.nodes) {
      np.fail(`expected 3..${LIMITS.nodes} DAG nodes`);
      ok = false;
    } else {
      nodes.forEach((node, i) => {
        const ip = np.index(i);
        if (node === null || typeof node !== 'object' || Array.isArray(node)) {
          ip.fail(`expected a node object, got ${describe(node)}`);
          ok = false;
          return;
        }
        let nok = ip.keys(node, ['id', 'kind', 'parents', 'copy']);
        if (!ip.child('id').id(node.id)) {
          ok = false;
          return;
        }
        if (nodeIndex.has(node.id)) {
          ip.child('id').fail(`duplicate node id "${node.id}"`);
          nok = false;
        }
        nodeIndex.set(node.id, i);
        if (!ip.child('kind').enum(node.kind, NODE_KINDS)) {
          nok = false;
        } else {
          kindCount[node.kind] += 1;
        }
        const pp = ip.child('parents');
        const parents = node.parents;
        if (!Array.isArray(parents) || parents.length > LIMITS.parents) {
          pp.fail(`expected 0..${LIMITS.parents} parent node ids`);
          nok = false;
        } else {
          const seen = new Set();
          parents.forEach((pid, j) => {
            const jp = pp.index(j);
            if (!jp.id(pid)) {
              nok = false;
              return;
            }
            if (seen.has(pid)) {
              jp.fail(`duplicate parent "${pid}"`);
              nok = false;
            }
            seen.add(pid);
            if (pid === node.id) {
              jp.fail('a node cannot be its own parent');
              nok = false;
              return;
            }
            // Evidence edges point at EARLIER nodes: the DAG is acyclic by
            // construction (and lineage order is authoring order).
            if (!nodeIndex.has(pid)) {
              jp.fail(`parent "${pid}" must reference an EARLIER node (append-only DAG)`);
              nok = false;
            }
          });
        }
        if (node.kind === 'source' && Array.isArray(parents) && parents.length > 0) {
          pp.fail('source events are original evidence and must not declare parents');
          nok = false;
        }
        if (!validateTextNodeCopy(ip.child('copy'), node.copy, LIMITS.text)) nok = false;
        if (!nok) ok = false;
      });
    }
    for (const kind of NODE_KINDS) {
      if (kindCount[kind] < 1) {
        np.fail(`the lineage model needs at least one ${kind} node (the learning question spans all three)`);
        ok = false;
      }
    }
  }

  const scenarioIds = validateScenariosList(p, raw, (ip, scenario) => {
    let sok = ip.keys(scenario, ['id', 'removedSources']);
    const rp = ip.child('removedSources');
    const removed = scenario.removedSources;
    const nodes = (raw.model && raw.model.nodes) || [];
    if (!Array.isArray(removed) || removed.length < 1 || removed.length > LIMITS.removedSources) {
      rp.fail(`expected 1..${LIMITS.removedSources} source node ids (selective source removal)`);
      return false;
    }
    const seen = new Set();
    removed.forEach((rid, i) => {
      const jp = rp.index(i);
      if (!jp.id(rid)) {
        sok = false;
        return;
      }
      if (seen.has(rid)) {
        jp.fail(`duplicate removed source "${rid}"`);
        sok = false;
      }
      seen.add(rid);
      const at = nodeIndex.get(rid);
      const node = at === undefined ? null : nodes[at];
      if (!node) {
        jp.fail(`removedSources references unknown node "${rid}"`);
        sok = false;
      } else if (node.kind !== 'source') {
        jp.fail(`removedSources "${rid}" must reference a source event (only sources are directly deletable)`);
        sok = false;
      }
    });
    return sok;
  });
  if (!scenarioIds) ok = false;

  if (!validateCopy(p, raw, scenarioIds || undefined)) ok = false;
  if (!validateSourceRefs(p, raw)) ok = false;
  return ok;
}

/* ── pure model ─────────────────────────────────────────────────────────── */

/** Map of id → node (validated specs guarantee uniqueness). */
export function nodeMap(model) {
  const map = new Map();
  for (const node of model.nodes) if (!map.has(node.id)) map.set(node.id, node);
  return map;
}

/**
 * Is this node's evidence trail fully recorded?
 *  - source events are original evidence: traceable;
 *  - derived artifacts need non-empty recorded parents, all traceable;
 *  - external nodes live outside the boundary: never provable.
 */
export function traceable(model, id, seen = new Set()) {
  const nodes = nodeMap(model);
  return traceableIn(nodes, id, seen);
}

function traceableIn(nodes, id, seen) {
  if (seen.has(id)) return false; // cycle guard (validated specs cannot cycle)
  const node = nodes.get(id);
  if (!node) return false;
  if (node.kind === 'source') return true;
  if (node.kind === 'external') return false;
  if (node.parents.length === 0) return false;
  seen.add(id);
  const ok = node.parents.every((pid) => traceableIn(nodes, pid, seen));
  seen.delete(id);
  return ok;
}

/** Transitive source evidence of one node (empty when lineage is missing). */
export function sourceClosure(model, id) {
  const nodes = nodeMap(model);
  const out = new Set();
  const stack = [id];
  const guard = new Set();
  while (stack.length > 0) {
    const cur = stack.pop();
    if (guard.has(cur)) continue;
    guard.add(cur);
    const node = nodes.get(cur);
    if (!node) continue;
    if (node.kind === 'source') {
      out.add(cur);
      continue;
    }
    for (const pid of node.parents) stack.push(pid);
  }
  return out;
}

/**
 * Deterministic deletion traversal. Returns Map id → status
 * (`kept | removed | invalidated | recompute | unproven`). Pure: `removed`
 * is a plain list and the model is never mutated.
 */
export function classify(model, removed) {
  const removedSet = new Set(removed);
  const out = new Map();
  for (const node of model.nodes) {
    if (node.kind === 'source') {
      out.set(node.id, removedSet.has(node.id) ? 'removed' : 'kept');
      continue;
    }
    if (node.kind === 'external') {
      // Outside the system boundary: never provably erased.
      out.set(node.id, 'unproven');
      continue;
    }
    if (!traceable(model, node.id) || node.parents.length === 0) {
      // Derived text without recorded lineage: approximate cleanup only.
      out.set(node.id, 'unproven');
      continue;
    }
    const evidence = sourceClosure(model, node.id);
    if (evidence.size === 0) {
      out.set(node.id, 'unproven');
      continue;
    }
    let hits = 0;
    for (const src of evidence) if (removedSet.has(src)) hits += 1;
    if (hits === 0) out.set(node.id, 'kept');
    else if (hits === evidence.size) out.set(node.id, 'invalidated');
    else out.set(node.id, 'recompute');
  }
  return out;
}

/**
 * Status badge shown in the "after" column. Reader step stations are not
 * needed: both the before (all present) and after (classified) states are
 * exact in one view, and the reader control is selective source removal.
 */
export function displayStatus(status) {
  return STATUSES.includes(status) ? status : 'kept';
}

/**
 * Deterministic SVG layout: column bands (0 sources → 1..3 derived by
 * longest evidence path → 4 external boundary), row = appearance order
 * within the column. The static partial renders exactly this geometry.
 */
export function lineageLayout(model) {
  const col = new Map();
  const row = new Map();
  const rowsPerCol = new Map();
  for (const node of model.nodes) {
    let c;
    if (node.kind === 'source') c = 0;
    else if (node.kind === 'external') c = 4;
    else if (node.parents.length === 0) c = 1;
    else {
      let deepest = 0;
      for (const pid of node.parents) deepest = Math.max(deepest, col.get(pid) ?? 0);
      c = Math.min(3, 1 + deepest);
    }
    col.set(node.id, c);
    const r = rowsPerCol.get(c) ?? 0;
    rowsPerCol.set(c, r + 1);
    row.set(node.id, r);
  }
  return { col, row, columns: 5, rows: Math.max(0, ...rowsPerCol.values()) };
}

/** Bucket sizes for the before/after summary strips. */
export function statusCounts(classification) {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const status of classification.values()) {
    if (counts[status] !== undefined) counts[status] += 1;
  }
  return counts;
}

/**
 * Full deterministic result for one case. `overrides.removedSources`
 * supports the reader's selective source removal. Pure derivation only.
 */
export function computeResult(model, scenario, overrides = {}) {
  const removed = overrides.removedSources !== undefined ? overrides.removedSources : scenario.removedSources;
  const classification = classify(model, removed);
  return {
    removedSources: [...removed],
    classification,
    counts: statusCounts(classification),
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
