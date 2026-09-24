# Interactive Article Components — GROUP state kinds

Three reusable state explainers built on the same controlled `interactive`
shortcode pipeline (Light DOM Web Components + build-time JSON data, no
runtime backend/model/storage):

| Kind | Element | Learning question | Pilot article |
|---|---|---|---|
| `session-tree` | `<blog-session-tree>` | When the active leaf or compaction projection changes, what changes — and what must never change? | Pi 解剖 ·「Session tree：完整历史与模型视图分开」 |
| `session-scope` | `<blog-session-scope>` | Which messages share one session key under each dmScope mode, and where do identities collide or split? | OpenClaw 解剖 ·「Session key 是连续性开关」 |
| `memory-lineage` | `<blog-memory-lineage>` | How far does one delete request travel through derived memory, and where does the evidence run out? | 遗忘 ·「一条删除请求会走多远」 |

This document is the field vocabulary and computation contract for these
three kinds, parallel to [the V1 author guide](interactive-articles.md). The
shared gates (`scripts/check-interactive-specs.mjs`, the executable schema in
`assets/js/components/spec-schema.mjs`, the byte budgets, the static-fallback
and print rules) apply unchanged; only the kind-specific parts are described
here.

## Adding an instance

1. Create `data/interactive/<spec>.json` for the kind (filename stem =
   `id`, lowercase slug).
2. Run `npm run interactive:check` (the validator dispatches to
   `<kind>-model.mjs`'s `validate<Kind>` after the shared `validateCommon`).
3. Insert the shortcode in the article (zh and its existing en counterpart):

   ```go-html-template
   {{< interactive kind="session-tree" id="session-tree" spec="session-tree-v1" >}}
   ```

All three kinds keep the exact baseline top keys
(`schemaVersion,kind,id,defaultScenario,model,scenarios,copy,sourceRefs`),
require complete `zh`/`en` copy, reject unknown keys everywhere, bound every
input, and validate cross-references. No data field is ever evaluated as
code. Common copy fields (`figureLabel,title,question,assumption,observe,
footerNote,referenceTitle,scenarioLabels`) are shared with V1; the
kind-specific copy fields are listed per kind below.

## `session-tree`

A small authored **append-only conversation tree** (entries with `parentId`),
a derived **model-context projection**, an optional authored **compaction
projection**, and an **independent workspace snapshot** — three layers, one
spec. The figure is always labelled as an illustrative teaching fixture
pinned to the article's version (e.g. Pi v0.84.1); it is never live Pi
execution and never claims to simulate a real model.

### Data fields

```
model.nodes[]        { id, parentId, role, copy }
  id                 slug, unique
  parentId           null ONLY on the first (root) entry; otherwise an
                     EARLIER node id (append-only ⇒ acyclic by construction)
  role               root | user | assistant   (root ⇔ parentId is null)
  copy.{zh,en}.text  the entry's authored message text (text evidence)
model.compaction     { id, replaces[], copy }
  replaces[]         2..8 node ids forming ONE contiguous parent chain from
                     the root (the folded segment)
  copy.{zh,en}.text  the authored compaction summary
model.workspace[]    { id, path, from, copy }   (1..8)
  path               filesystem path label (rendered verbatim)
  from               the node id whose turn produced the change
scenarios[]          { id, activeLeaf, compaction }
  activeLeaf         any node id — selecting it MOVES the active leaf
                     (like `/tree`); every node is selectable
  compaction         boolean: initial fold state for this case
```

Copy fields in addition to the common set: `fixtureNotice`, `layers`
(`tree,context,workspace`), `nodeRoles` (`root,user,assistant`),
`activeLabel`, `pathLabel`, `compactionLabel`, `projectionNotes`
(`full,compacted`), `projectionSummaryLabel`, `workspaceNote`.

### Computation

The teaching role `root` is the first **user message entry**, with `parentId: null`. It is not the JSONL session header. Pi stores that header separately; `getEntries()` excludes it, while the first message belongs to the ancestor path and model context.

- **Ancestor path** = `parentId` walk from the active entry to the root.
- **Projection** (what the model context contains):
  - fold off → the full ancestor path, one entry per message;
  - fold on → the authored `replaces` chain folds into ONE compaction entry,
    followed by the remaining path suffix. The fold applies only when the
    chain is a **prefix** of the active entry's path (the pilot spec folds
    the shared trunk, so it applies on every branch).
- **Workspace snapshot** is returned by the same pure function but depends
  on NOTHING the reader can change: moving the active leaf to an old branch
  never rolls back the filesystem, and folding compaction never touches
  history. Unit tests prove ancestry/compaction leave the authored tree and
  snapshot byte-identical.
- Deterministic cases in the pilot spec: `root` (leaf at the root entry),
  `branch` (leaf on the fork), `compaction` (fold on).

### Limits

Compaction is a single authored fold of a root-anchored trunk segment (no
chained compactions, no branch-anchored folds); the model does not implement
Pi's compaction policy, branch summaries, or any workspace rollback. The
figure proves one thing only: **context is a projection of durable session
state, and the workspace is not part of that projection.**

## `session-scope`

Finite synthetic messages (two people across two channels and several
accounts — including the same platform peer ID in two accounts) grouped by
the **exact session key shapes** documented for the pinned OpenClaw source
(v2026.7.1-2, `src/routing/session-key.ts`, quoted in the article):

```
main                        agent:<agentId>:<mainKey>
per-peer                    agent:<agentId>:direct:<peerId>
per-channel-peer            agent:<agentId>:<channel>:direct:<peerId>
per-account-channel-peer    agent:<agentId>:<channel>:<accountId>:direct:<peerId>
```

### Data fields

```
model.agentId          slug — FIXED for the instance (clarity, not a knob)
model.mainKey          slug — the fixed main-session key segment
model.messages[]       { id, person, channel, accountId, peerId, copy }  (4..12)
  person/channel/accountId  slugs (≥2 distinct each: the dimensions must be
                       observable to show merging AND separation)
  peerId               ^[A-Za-z0-9_.:-]{1,40}$ — rendered verbatim
  copy.{zh,en}.text    the synthetic message text
model.identityLinks[]  { peerId, canonical }  (0..8) — explicit configured
                       mapping only; each peerId must appear in messages
scenarios[]            { id, mode, useIdentityLinks }
  mode                 main | per-peer | per-channel-peer |
                       per-account-channel-peer — all four MUST be covered
                       (the selector is the learning question)
  useIdentityLinks     boolean; true requires a non-empty configured mapping
```

Copy fields in addition to the common set: `agentLabel`, `keyLabel`,
`formatLabel`, `groupsLabel`, `messagesLabel`, `dimensions`
(`person,channel,account,peer`), `readings` (`single,shared`),
`identityTitle`, `identityNotice`, `mapLabel`, `people` (one label per
person id).

### Computation

- Effective peer = `identityLinks[].canonical` when a link matches and the
  case enables links, else the raw `peerId`. **Alias matching is
  case-insensitive** (mirroring upstream alias comparison); the validator
  rejects case-insensitive alias duplicates.
- The **effective peer id is lowercased AFTER identity resolution** in the
  key — exactly as the pinned source's `buildAgentPeerSessionKey` does.
  Channel and account segments keep their authored case and appear verbatim
  wherever the mode includes them; message cards always show the raw
  dimensions and, when a link applies, the resolved canonical id beside
  them.
- Grouping = partition messages by computed key in first-appearance order.
  Group ids (`grp-N`) are unique by construction and printed next to the
  text key. The pure model and the SSR helper compute the same strings;
  the browser suite asserts parity and the collision/separation cases
  (cross-account peer collision merges under `main`/`per-peer`/
  `per-channel-peer`, splits under `per-account-channel-peer`; the
  identity-link case merges one person across channels).

### Limits

The `identityLinks` mapping here is a **simplified teaching schema, not
OpenClaw's drop-in configuration format**, and it is an explicitly authored
claim — it performs no identity verification and asserts no real identity.
The keys are computed from synthetic dimensions; nothing here measures real
traffic, tenants, or privacy outcomes. Case-insensitive alias matching and
post-resolution lowercasing are the ONLY normalisations applied.

## `memory-lineage`

A small authored **dependency DAG** — source events → derived
summary/profile → index/cache/recommendation, plus nodes outside the system
boundary. The reader picks which source events a delete request covers
(selective source removal) and reads the deterministic before/after result.

### Data fields

```
model.nodes[]          { id, kind, parents[], copy }   (3..16)
  kind                 source | derived | external  (≥1 of each)
  parents[]            0..4 EARLIER node ids (append-only ⇒ acyclic);
                       source events MUST declare no parents;
                       empty parents on a derived node = missing lineage
  copy.{zh,en}.text    synthetic teaching text (never real user data)
scenarios[]            { id, removedSources[] }
  removedSources[]     1..4 source node ids (only sources are directly
                       deletable) — the case's initial request coverage
```

Copy fields in addition to the common set: `nodeKinds`
(`source,derived,external`), `statuses`
(`kept,removed,invalidated,recompute,unproven`), `beforeLabel`,
`afterLabel`, `requestLabel`, `selectLabel`, `invalidationNote`,
`graphLabel`.

### Computation (pure `classify(model, removed)`)

| Node | Status |
|---|---|
| `source` | `removed` iff covered by the request, else `kept` |
| `external` | always `unproven` (outside the boundary: caches, backups) |
| `derived`, lineage missing/untraceable | `unproven` (approximate cleanup only) |
| `derived`, fully traceable, no deleted evidence | `kept` |
| `derived`, ALL recorded source evidence deleted | `invalidated` |
| `derived`, SOME evidence deleted, some survives | `recompute` (mixed evidence) |

Evidence = transitive source ancestry through the recorded `parents` edges
only. The pilot spec carries all three deterministic cases:
`complete-lineage` (delete one quote → its tracked chain invalidates exactly),
`mixed-evidence` (delete the other quote → the mixed profile/recommendation
must be recomputed, not deleted), `partial-lineage` (delete both → the
untraced chat summary and the external boundary stay not provably erased).

### Limits

**Invalidation is never equated with verified physical deletion** — the
figure labels invalidated artifacts as unusable conclusions, not as erased
bytes, and `unproven` names everything the lineage cannot prove. The DAG is
authored teaching data with explicitly recorded edges; it is not a real
deletion protocol, an erasure proof, or any product's behaviour, and no
private or real user data appears anywhere.

## Static fallback, print and runtime behaviour

Shared V1 rules hold for all three kinds (same executable schema at build
gate and runtime, controls hidden in same-sized slots until validated first
render, SSR default result computed from the same spec, complete native
`<details>` reference of all scenarios that the upgrade never touches, full
SSR restore on any render failure, print shows the complete reference and
hides controls, per-instance state only, listener cleanup on
disconnect/reconnect, debounced polite announcements, 44px controls,
320px-safe layouts, dark/light tokens). Kind-specific notes:

- `session-tree`'s SVG keeps real pixel geometry (96×44 px branch boxes)
  inside a contained horizontal scroll region so branch click targets keep
  their 44px size on small screens while the page itself never overflows.
  The SVG is `aria-hidden`: keyboard and assistive-tech users drive the
  native `<select>` (identical semantics); labels are wrapped, so these
  kinds emit **no derived ARIA ids at all** (nothing to reserve in the
  shortcode collision guard beyond the root id).
- `session-tree`'s workspace snapshot region is rendered with **no runtime
  hooks** — the upgrade cannot write to it even by accident.
- `session-scope` regroups the same message DOM nodes on case change
  (`textContent` only; data strings stay inert text).
- `memory-lineage`'s five result states use border **textures** (double,
  dashed, dotted, hatched) as well as tone, so the before/after comparison
  survives colour-vision differences and greyscale printing.
- The reader control for `memory-lineage` is selective source removal with
  both before/after states exact in one view (the contract's
  "step controls **or** selective source removal"); no step walker is
  needed because no state is hidden behind progression.

## Testing

- `tests/interactive/expansion-state.test.mjs` — pure model invariants and
  corrupt-spec rejection per kind, incl. the required proofs (ancestry and
  compaction never mutate history/workspace; every scope collision and
  separation case; deletion traversal, mixed evidence, unknown boundary)
  and a timed isolated-process regression guaranteeing cyclic/corrupt graphs
  can never hang validation again.
- `tests/interactive/expansion-state.spec.ts` — browser semantics, failure
  fallback (runtime-invalid spec, script 404, corrupt embedded config),
  reset, multi-instance isolation + reconnect cleanup, zh/en mounts and
  320px mobile behaviour, against the production-pipeline fixture build
  from `tests/fixtures/interactive/expansion-state/` (mounted for both
  locales by `expansion-state.support.ts`; its build output is
  PID-scoped so parallel Playwright workers never race on it).
