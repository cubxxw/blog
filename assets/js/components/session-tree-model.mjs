/**
 * session-tree-model.mjs — pure model + spec validator for
 * <blog-session-tree> (GROUP state / Pi "Session tree" explainer).
 *
 * Teaching model: an authored append-only conversation tree (JSONL entries
 * with parent links), a *current model-context projection* derived from the
 * selected active entry, an optional authored compaction projection, and an
 * INDEPENDENT workspace snapshot. Selecting another entry changes the
 * visible ancestor path and the projection; it never mutates the tree and it
 * never changes the workspace snapshot (a branch is not a filesystem
 * rollback). Everything is an illustrative teaching fixture versioned by the
 * article — never live Pi execution.
 *
 * Pure module: no DOM, no timers, no network, and no import from
 * spec-schema.mjs (the validator is CALLED by spec-schema with its own
 * PathCtx and helpers, avoiding a circular import).
 */

export const SESSION_TREE_MODEL_KEYS = ['nodes', 'compaction', 'workspace'];
export const NODE_ROLES = ['root', 'user', 'assistant'];

const LIMITS = {
  id: 64,
  text: 240,
  summary: 400,
  path: 80,
  label: 80,
  title: 120,
  question: 400,
  note: 400,
  footerNote: 120,
  notice: 200,
  nodes: 16,
  replaces: 8,
  workspace: 8,
  scenarios: 8,
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
  'fixtureNotice',
  'layers',
  'nodeRoles',
  'activeLabel',
  'pathLabel',
  'compactionLabel',
  'projectionNotes',
  'projectionSummaryLabel',
  'workspaceNote',
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

/** Bilingual event text `{ zh: { text }, en: { text } }`. */
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
    if (!lp.child('fixtureNotice').text(copy.fixtureNotice, LIMITS.notice)) ok = false;
    if (!lp.child('activeLabel').text(copy.activeLabel, LIMITS.label)) ok = false;
    if (!lp.child('pathLabel').text(copy.pathLabel, LIMITS.label)) ok = false;
    if (!lp.child('compactionLabel').text(copy.compactionLabel, LIMITS.label)) ok = false;
    if (!lp.child('projectionSummaryLabel').text(copy.projectionSummaryLabel, LIMITS.label)) ok = false;
    if (!lp.child('workspaceNote').text(copy.workspaceNote, LIMITS.note)) ok = false;
    if (
      !lp
        .child('layers')
        .textMap(copy.layers, ['tree', 'context', 'workspace'], LIMITS.label)
    ) {
      ok = false;
    }
    if (
      !lp.child('nodeRoles').textMap(copy.nodeRoles, ['root', 'user', 'assistant'], LIMITS.label)
    ) {
      ok = false;
    }
    if (!lp.child('projectionNotes').textMap(copy.projectionNotes, ['full', 'compacted'], LIMITS.note)) {
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
export function validateSessionTree(p, raw, helpers) {
  let ok = true;
  const { validateScenariosList, validateSourceRefs } = helpers;
  const nodeIndex = new Map();

  const mp = p.child('model');
  if (!mp.keys(raw.model, SESSION_TREE_MODEL_KEYS)) {
    ok = false;
  } else {
    const nodes = raw.model.nodes;
    const np = mp.child('nodes');
    if (!Array.isArray(nodes) || nodes.length < 2 || nodes.length > LIMITS.nodes) {
      np.fail(`expected 2..${LIMITS.nodes} nodes`);
      ok = false;
    } else {
      nodes.forEach((node, i) => {
        const ip = np.index(i);
        if (node === null || typeof node !== 'object' || Array.isArray(node)) {
          ip.fail(`expected a node object, got ${describe(node)}`);
          ok = false;
          return;
        }
        let nok = ip.keys(node, ['id', 'parentId', 'role', 'copy']);
        if (!ip.child('id').id(node.id)) {
          ok = false;
          return;
        }
        if (nodeIndex.has(node.id)) {
          ip.child('id').fail(`duplicate node id "${node.id}"`);
          nok = false;
        }
        nodeIndex.set(node.id, i);
        if (!ip.child('role').enum(node.role, NODE_ROLES)) nok = false;
        if (i === 0) {
          if (node.parentId !== null) {
            ip.child('parentId').fail('the first node is the session root and must have parentId null');
            nok = false;
          }
          if (node.role !== 'root') {
            ip.child('role').fail('the root node must have role "root"');
            nok = false;
          }
        } else {
          // Append-only authoring: parents exist and appear earlier, so the
          // structure is acyclic by construction.
          if (typeof node.parentId !== 'string' || !node.parentId) {
            ip.child('parentId').fail('expected an earlier node id');
            nok = false;
          } else if (!nodeIndex.has(node.parentId)) {
            ip.child('parentId').fail(
              `parentId "${node.parentId}" must reference an EARLIER node (append-only tree)`
            );
            nok = false;
          } else if (node.parentId === node.id) {
            ip.child('parentId').fail('a node cannot be its own parent');
            nok = false;
          }
          if (node.role === 'root') {
            ip.child('role').fail('only the first node may have role "root"');
            nok = false;
          }
        }
        if (!validateTextNodeCopy(ip.child('copy'), node.copy, LIMITS.text)) nok = false;
        if (!nok) ok = false;
      });
    }

    const cmp = mp.child('compaction');
    if (!cmp.keys(raw.model.compaction, ['id', 'replaces', 'copy'])) {
      ok = false;
    } else {
      const c = raw.model.compaction;
      if (!cmp.child('id').id(c.id)) ok = false;
      const rp = cmp.child('replaces');
      if (
        !Array.isArray(c.replaces) ||
        c.replaces.length < 2 ||
        c.replaces.length > LIMITS.replaces
      ) {
        rp.fail(`expected 2..${LIMITS.replaces} node ids (the compacted segment)`);
        ok = false;
      } else {
        const seen = new Set();
        c.replaces.forEach((id, i) => {
          const ip = rp.index(i);
          if (!ip.id(id)) {
            ok = false;
            return;
          }
          if (seen.has(id)) {
            ip.fail(`duplicate replaced node id "${id}"`);
            ok = false;
          }
          seen.add(id);
          const at = nodeIndex.get(id);
          if (at === undefined) {
            ip.fail(`replaces references unknown node "${id}"`);
            ok = false;
            return;
          }
          const node = Array.isArray(raw.model.nodes) ? raw.model.nodes[at] : null;
          if (i === 0) {
            if (node && node.parentId !== null) {
              ip.fail('the compacted segment must start at the session root');
              ok = false;
            }
          } else {
            const prevAt = nodeIndex.get(c.replaces[i - 1]);
            const prev = prevAt === undefined ? null : raw.model.nodes[prevAt];
            if (!node || !prev || node.parentId !== prev.id) {
              ip.fail(
                `replaces[${i}] "${id}" must be the direct child of replaces[${i - 1}] (one contiguous parent chain)`
              );
              ok = false;
            }
          }
        });
      }
      if (!validateTextNodeCopy(cmp.child('copy'), c.copy, LIMITS.summary)) ok = false;
    }

    const wp = mp.child('workspace');
    const ws = raw.model.workspace;
    if (!Array.isArray(ws) || ws.length < 1 || ws.length > LIMITS.workspace) {
      wp.fail(`expected 1..${LIMITS.workspace} workspace snapshot entries`);
      ok = false;
    } else {
      const seen = new Set();
      ws.forEach((entry, i) => {
        const ip = wp.index(i);
        if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
          ip.fail(`expected a workspace entry object, got ${describe(entry)}`);
          ok = false;
          return;
        }
        let eok = ip.keys(entry, ['id', 'path', 'from', 'copy']);
        if (!ip.child('id').id(entry.id)) {
          ok = false;
          return;
        }
        if (seen.has(entry.id)) {
          ip.child('id').fail(`duplicate workspace entry id "${entry.id}"`);
          eok = false;
        }
        seen.add(entry.id);
        if (!ip.child('path').text(entry.path, LIMITS.path)) eok = false;
        if (!ip.child('from').id(entry.from)) {
          eok = false;
        } else if (!nodeIndex.has(entry.from)) {
          ip.child('from').fail(`from references unknown node "${entry.from}"`);
          eok = false;
        }
        if (!validateTextNodeCopy(ip.child('copy'), entry.copy, LIMITS.text)) eok = false;
        if (!eok) ok = false;
      });
    }
  }

  const scenarioIds = validateScenariosList(p, raw, (ip, scenario) => {
    let sok = ip.keys(scenario, ['id', 'activeLeaf', 'compaction']);
    const leaf = scenario.activeLeaf;
    if (!ip.child('activeLeaf').id(leaf)) {
      sok = false;
    } else if (!nodeIndex.has(leaf)) {
      ip.child('activeLeaf').fail(`activeLeaf references unknown node "${leaf}"`);
      sok = false;
    }
    if (!boolField(ip.child('compaction'), scenario.compaction)) sok = false;
    // A compaction case must be meaningful: the authored compacted segment
    // has to sit on the selected entry's ancestor path (as a prefix).
    if (scenario.compaction === true && nodeIndex.has(leaf)) {
      const nodes = (raw.model && raw.model.nodes) || [];
      const replaces = (raw.model && raw.model.compaction && raw.model.compaction.replaces) || [];
      // Guarded walk: corrupt graphs may contain self-parents or cycles
      // (already reported above), so traversal must terminate regardless.
      const chain = [];
      const walked = new Set();
      let cursor = leaf;
      while (cursor != null && !walked.has(cursor)) {
        walked.add(cursor);
        chain.unshift(cursor);
        const at = nodeIndex.get(cursor);
        const node = at === undefined ? null : nodes[at];
        cursor = node ? node.parentId : null;
      }
      const prefixOk =
        Array.isArray(replaces) &&
        replaces.length > 0 &&
        replaces.length <= chain.length &&
        replaces.every((id, i) => chain[i] === id);
      if (!prefixOk) {
        ip.child('compaction').fail(
          'compaction: true requires the compacted segment to be a prefix of activeLeaf\'s ancestor path'
        );
        sok = false;
      }
    }
    return sok;
  });
  if (!scenarioIds) ok = false;

  if (!validateCopy(p, raw, scenarioIds || undefined)) ok = false;
  if (!validateSourceRefs(p, raw)) ok = false;
  return ok;
}

/* ── pure model ─────────────────────────────────────────────────────────── */

/** Map of id → node (first match wins; validated specs guarantee uniqueness). */
export function nodeMap(model) {
  const map = new Map();
  for (const node of model.nodes) if (!map.has(node.id)) map.set(node.id, node);
  return map;
}

/**
 * Ancestor path of one entry, root first: walk `parentId` up to the root.
 * Returns [] for an unknown id. Never mutates the model.
 */
export function pathTo(model, activeLeaf) {
  const nodes = nodeMap(model);
  const chain = [];
  let cursor = activeLeaf;
  const guard = new Set();
  while (cursor != null && nodes.has(cursor) && !guard.has(cursor)) {
    guard.add(cursor);
    chain.unshift(cursor);
    cursor = nodes.get(cursor).parentId;
  }
  return cursor == null || !nodes.has(cursor) ? chain : [];
}

/**
 * Deterministic SVG layout: depth from the root (column) and appearance
 * order within that depth (row). The static partial renders exactly this
 * geometry from the same spec.
 */
export function treeLayout(model) {
  const depth = new Map();
  const row = new Map();
  const rowsPerDepth = new Map();
  for (const node of model.nodes) {
    const d = node.parentId === null ? 0 : (depth.get(node.parentId) ?? 0) + 1;
    depth.set(node.id, d);
    const r = rowsPerDepth.get(d) ?? 0;
    rowsPerDepth.set(d, r + 1);
    row.set(node.id, r);
  }
  const maxRow = Math.max(0, ...rowsPerDepth.values());
  return { depth, row, columns: rowsPerDepth.size, rows: maxRow };
}

/**
 * The current model-context projection. `compactionOn` folds the authored
 * segment (a contiguous chain from the root) into its compaction entry —
 * only when that segment is a prefix of the active entry's ancestor path.
 * The complete tree is never modified: the projection is a derived view.
 */
export function projection(model, activeLeaf, compactionOn) {
  const chain = pathTo(model, activeLeaf);
  const replaces = model.compaction.replaces;
  const applies =
    compactionOn &&
    replaces.length > 0 &&
    replaces.length <= chain.length &&
    replaces.every((id, i) => chain[i] === id);
  if (!applies) {
    return { applies: false, entries: chain.map((id) => ({ type: 'node', id })) };
  }
  return {
    applies: true,
    entries: [
      { type: 'compaction', id: model.compaction.id },
      ...chain.slice(replaces.length).map((id) => ({ type: 'node', id })),
    ],
  };
}

/** The workspace snapshot is independent of the active entry by contract. */
export function workspaceSnapshot(model) {
  return model.workspace.map((entry) => ({ ...entry }));
}

/**
 * Full deterministic view for one case. `overrides` accepts
 * `{ activeLeaf, compaction }` (runtime reader choices). Returns derived
 * data only — callers can deep-freeze `model` and prove nothing mutates.
 */
export function computeView(model, scenario, overrides = {}) {
  const activeLeaf =
    overrides.activeLeaf !== undefined ? overrides.activeLeaf : scenario.activeLeaf;
  const compactionOn =
    overrides.compaction !== undefined ? overrides.compaction : scenario.compaction;
  return {
    activeLeaf,
    compactionOn,
    path: pathTo(model, activeLeaf),
    projection: projection(model, activeLeaf, compactionOn),
    // Always the same independent snapshot: selecting branches or folding
    // compaction must never change filesystem state.
    workspace: workspaceSnapshot(model),
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
