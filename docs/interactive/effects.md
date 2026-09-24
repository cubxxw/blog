# Interactive Article Components — Effects Group

Field vocabulary, computations and factual limits for the **effects** group of
the expansion work: the two new kinds `effect-recovery` and
`gitops-reconcile`, plus the `loop-verifier-v1` instance that reuses the
existing `agent-loop` kind unchanged. The parent author guide
(`docs/interactive-articles.md`) documents the shared top-level contract —
this file only documents what this group adds on top of it.

Everything here follows the base architecture: build-time JSON in
`data/interactive/`, entry only through the `interactive` shortcode, native
Light-DOM custom elements, no framework, no inline script, no network or
storage at read time, and one executable validator
(`assets/js/components/spec-schema.mjs` plus the per-kind validator exported
by each `<kind>-model.mjs`).

| Kind | Element | Pure model + validator | Styles | Static partial |
|---|---|---|---|---|
| `effect-recovery` | `<blog-effect-recovery>` | `assets/js/components/effect-recovery-model.mjs` | `assets/css/components/effect-recovery.css` | `layouts/partials/interactive/effect-recovery.html` (+ `effect-recovery-compute.html`) |
| `gitops-reconcile` | `<blog-gitops-reconcile>` | `assets/js/components/gitops-reconcile-model.mjs` | `assets/css/components/gitops-reconcile.css` | `layouts/partials/interactive/gitops-reconcile.html` (+ `gitops-reconcile-compute.html`) |
| `agent-loop` (reuse) | `<blog-agent-loop>` | unchanged | unchanged | unchanged |

Shipped instances:

| Spec | Kind | Article |
|---|---|---|
| `effect-recovery-n8n-v1` | `effect-recovery` | n8n — “exactly-once 为什么不在 queue 里” |
| `effect-recovery-langgraph-v1` | `effect-recovery` | LangGraph — “沿着一条真实故障路径思考” |
| `gitops-reconcile-v1` | `gitops-reconcile` | Argo CD — sync / self-heal section |
| `loop-verifier-v1` | `agent-loop` | Loop Engineering — verification section |

## Shared top level (unchanged)

Exactly `schemaVersion`, `kind`, `id`, `defaultScenario`, `model`,
`scenarios`, `copy`, `sourceRefs`. `schemaVersion` is `1`; `id` equals the
filename stem; `copy` is exactly `zh` + `en`, both complete; `sourceRefs` and
the strict URL policy are shared with the base kinds; the same serialized
byte budgets (≤ 30 720 B per instance, ≤ 102 400 B per page) apply.

## `kind: "effect-recovery"` — one external write, one crash window, one recovery discipline

Learning question: **after a crash, what can the local side actually prove
about one external write, how many times did the write really happen, and
which next action is safe?** The three-state knowledge is the point of the
n8n article: folding `unknown` into failure is what produces duplicate side
effects.

`model` keys (no others):

| Key | Rules |
|---|---|
| `flow` | `queue-retry` (the n8n queue/retry example) or `node-replay` (the LangGraph interrupt/replay example). The flow selects the fixed step timeline and the completion arithmetic. |
| `maxSteps` | Integer 4…24, and at least the flow's timeline length (7 for `queue-retry`, 9 for `node-replay`). |

`scenarios[]`: `{ "id", "effectPlacement", "provider", "defaultCrash",
"defaultStrategy" }` (no other keys):

| Key | Rules |
|---|---|
| `effectPlacement` | `plain` (only with `queue-retry`) or `before-approval` / `after-approval` (only with `node-replay`). Where the side effect sits relative to the `interrupt()` gate. |
| `provider` | Exactly `{ "receiptQuery": bool, "idempotencyKey": bool }` — the STATED provider capabilities. Every strategy outcome depends on these flags. |
| `defaultCrash` | `before-send` \| `after-commit-before-receipt` \| `after-recorded-receipt` — the scenario's initial crash window (SSR shows exactly this). |
| `defaultStrategy` | `retry` \| `query-receipt` \| `idempotency-key` — the scenario's initial recovery discipline. |

### The finite step timeline

Fixed semantic steps only — this is deliberately **not** an arbitrary event
machine. `queue-retry`: `start · intent · send · commit · receipt · record ·
finish`. `node-replay` adds `interrupt` and `resume`; the payment segment
(`send · commit · receipt`) sits either **before** `interrupt` (the replayed
region — side-effect chips are hazard-marked) or **after** `resume` (the safe
placement). Step labels live in `copy.<lang>.steps` with exactly the flow's
key set. The crash point lands on `send`, `receipt` or `finish` (before-send /
after-commit-before-receipt / after-recorded-receipt) in every flow.

Per-step visual state is computed on **two axes** (see `computeEffect` below
for the run arithmetic):

- **execution multiplicity** — `done` (ran exactly once, in the crashed run)
  · `repeated` (ran more than once: the visible cause of repeated external
  effects — recovery re-execution and/or the interrupt replay) · `recovered`
  (ran only in the recovery) · `skipped` (never ran);
- **the crash window** — a separate flag/marker that stays identifiable on
  top of the execution state and moves with the crash-point control.

The authored finite trace is the crashed run (cut at the crash step, which
itself never completes) plus — for write-completing strategies (retry,
idempotency-key) — one full completed re-run. The `commit` chip's run count
equals the model's `actions`, so the lane view and the numeric readout can
never disagree. This is a bounded teaching model, **not** a LangGraph SDK
simulation.

### The computation (pure; `computeEffect`)

The crashed run's external writes (authored truth) and the locally provable
bounds:

| Crash window | writes (truth) | provable bounds |
|---|---|---|
| `before-send` | 0 | [0, 0] — the request never left |
| `after-commit-before-receipt` | 1 | [0, 1] — committed, receipt lost |
| `after-recorded-receipt` | 1 (2 for `before-approval`, whose completed run already re-executed the side effect) | [n, n] |

One completed run performs `completionSends` external sends: **1**, or **2**
for the `node-replay` flow with `before-approval` placement — the node
containing `interrupt()` replays from its top on resume, so the pre-approval
side effect runs once per node execution. That is the interruption replay
boundary, and it is arithmetic, not opinion.

The recovery applies exactly one discipline:

- `retry` — and `idempotency-key` **without** provider support (the key is
  decoration then): a plain re-run adding `completionSends` provable writes
  and no evidence about the interrupted one;
- `idempotency-key` **with** provider support: every send of the operation
  carries the stable key, so the provider collapses the key scope to exactly
  one write and the response is the proof;
- `query-receipt` — probe only (no write). With provider support it resolves
  the interrupted write authoritatively; without support it proves nothing
  and hands over to a human.

Outputs — **all computed, never free-form labels**:

- `actions` — the authored ground truth of how often the external side effect
  happened (what the reader observes);
- `knowledge` — the three-state verdict about “exactly one external write”,
  decided by the evidence **interval** (not by the exact count):
  `confirmed-success` — the interval is exactly {1}, provable exactly once ·
  `confirmed-failure` — the interval **excludes 1**, provable NOT exactly once
  (never happened, or provably more than once even when the exact duplicate
  count is unknown, e.g. an interval of [2,3]) · `unknown` — the interval
  still contains 1, unprovable either way. `unknown` is **never** folded into
  failure.
- `next` — `return-recorded` (exactly once is proven: record and return, do
  not resend) · `retry-safe` (provably zero **and** one plain re-run performs
  exactly one write — no replay hazard) · `protected-retry` (provably zero
  **but** a plain re-run would repeat the side effect — the before-approval
  replay: retry only once the write is safely replayable, e.g. under a stable
  idempotency key) · `reconcile` (anything unproven or already duplicated).
  Knowing the first attempt never sent does not protect a pre-interrupt,
  unkeyed re-execution — that is why proven zero is not automatically
  “safe”.

`copy.<lang>` (all required): the shared eight (`figureLabel`, `title`,
`question`, `assumption`, `observe`, `footerNote`, `referenceTitle`,
`scenarioLabels`), plus `traceNotice`, `lanes` (`worker`,`local`,`external`),
`steps` (the flow's key set), `crashLabel`, `strategyLabel`, `crashOptions`
(the three crash ids), `strategyOptions` (the three strategy ids), `readout`
(`actions`,`knowledge`,`next`), `knowledge` (the three verdict ids), `next`
(the four action ids), `table`
(`scenario`,`crash`,`strategy`,`actions`,`knowledge`,`next`) and
`explanations` (`empty`,`clean`,`duplicate`,`ambiguous` — the pre-written
rule-based readings).

The `<details>` reference lists **every** scenario × crash × strategy outcome
(≤ 8 × 9 rows) from the same computation. SSR shows the default scenario's
exact default selection.

### Factual limits (stated on the figure itself)

Authored deterministic educational traces, **not real execution**: no real
payments, no real provider behaviour. One logical external write per trace;
numbers follow the fixed rules above and are labelled as illustrative. A
retry brings no evidence about a pending write. The `idempotency-key`
discipline assumes a stable key on **every** send of the operation — including
the first attempt; it never claims that adding a key retroactively repairs
prior unkeyed writes. The model does not simulate network partitions,
provider-side partial failures, concurrent writers or compensation protocols;
it does not claim any specific product enforces the idempotency-key
semantics.

## `kind: "gitops-reconcile"` — Git desired vs cluster state, health separately

Learning question: **what do `autoSync`, `selfHeal` and `prune` each change,
and why are Sync status and Health not synonyms?**

`model` keys (no others): `replicaMax` (1…1000) and `versionMax` (2…9999) —
the integer bounds every workload state must fit inside.

`scenarios[]`: `{ "id", "origin", "git", "cluster", "health",
"historyVersion"? }` (no other keys):

| Key | Rules |
|---|---|
| `origin` | `git` (the change came from Git) or `cluster` (someone edited the live cluster). |
| `git` / `cluster` | Exactly `{ "replicas": 0…replicaMax, "version": 0…versionMax, "resource": "present"\|"absent" }` — three fields only, integers. Absence semantics: replicas/version describe a LIVE workload, so an absent side must carry the placeholder zeros (`replicas 0`, `version 0`) and those placeholders never take part in the diff. |
| `health` | `healthy` \| `degraded` \| `progressing` \| `unknown` — the independently supplied workload assessment. |
| `historyVersion` | Optional integer 1…versionMax, different from the Git desired version — what `argocd app rollback` would restore. This LIMITED teaching model only restores a live, Git-defined workload: `git.resource` and `cluster.resource` must both be `present`, and a missing-workload restore is rejected at validation (the guard refuses it defensively; this is a scope limit of the model, not a claim about Argo CD in general). |

### The computation (pure; `computeReconcile(model, scenario, policy, action)`)

`policy` = the three toggles `{ autoSync, selfHeal, prune }`; `action` =
`none` (observe) | `sync` (the distinct manual sync) | `rollback` (restore
`historyVersion`).

- Sync status is `diff(Git, cluster)` over the three fields and nothing else.
  Absence semantics: replicas/version are compared only when **both** sides
  have a live workload — two absent sides are `Synced` regardless of their
  placeholders, and a pending deletion is exactly the presence mismatch.
- `autoSync` applies **Git-originated** changes while the app is OutOfSync;
  cluster-side drift is only reverted when `selfHeal` is also on (selfHeal is
  a sub-choice of automation and does nothing alone).
- Deletion is never silent: a Git-removed resource is deleted only in a sync
  that runs with `prune`; otherwise it is **kept** with its ENTIRE live state
  (replicas and version untouched — Git defines nothing to apply while the
  workload is deleted) and the delta keeps showing the pending deletion. A
  pruned workload ends on the absent placeholders. The deletion outcome
  (`none` / `deleted` / `kept`) is always reported explicitly.
- Manual sync applies the current desired state on its own, whatever the
  toggles say.
- The **rollback guard**: history rollback is refused while `autoSync` is
  enabled (Argo CD's own constraint). A rollback that is applied only moves
  the cluster — Git is unchanged, so the next reconcile (or manual sync) pulls
  the version back; a Git revert is what makes recovery durable. The guard's
  refusal reasons (`auto-sync`, `no-history`, `no-live-workload`) are shown on
  the disabled control from `copy.<lang>.guardReasons`.
- **Health is never modified.** No toggle, action or sync fabricates health
  recovery; the scenario's independent assessment is reported as-is.

Outputs: `sync` (`synced`/`out-of-sync`), `health`, `deltaBefore`,
`deltaAfter` (the exact field diffs before and after), `deletion`, `explain`
(one rule-based key: `rollback-blocked`, `rollback-temporary`,
`deletion-pruned`, `deletion-kept`, `self-healed`, `auto-synced`,
`drift-kept`, `synced-clean`, `idle`), `rollback` (the guard verdict).

`copy.<lang>` (all required): the shared eight, plus `traceNotice`, `states`
(`replicas`,`version`,`resource`), `resourceState` (`present`,`absent`),
`statusLabels` (`synced`,`out-of-sync` — the literal Argo CD names),
`healthLabels` (the four health names), `toggles`
(`auto-sync`,`self-heal`,`prune`), `actions` (`sync`,`rollback`),
`guardReasons` (`auto-sync`,`no-history`,`no-live-workload` — why the rollback
action is unavailable), `readout`
(`sync`,`health`,`deltaBefore`,`deltaAfter`,`deletion`), `deletionLabels`
(`none`,`deleted`,`kept`), `noDelta`, `table`
(`scenario`,`desired`,`cluster`,`delta`,`health`) and `explanations` (the nine
rule keys).

### Factual limits (stated on the figure itself)

A teaching model of Argo CD semantics, **not Argo CD**: replicas and versions
are simplified integers and exactly three fields are compared; the states
table shows `—` for the placeholders of an absent workload. `allowEmpty`,
sync waves/hooks, `PruneLast`, sync phases, multi-source Applications,
ApplicationSets, progressive sync and real health assessment are out of
scope — the illustrated resource is explicitly one of several in its
Application. History rollback is modelled only as restoring the version of a
live, Git-defined workload (no missing-workload restore); this is a scope
limit of the teaching model, not a claim that Argo CD universally requires a
present resource. The semantics follow the official auto-sync and
sync-options documentation; nothing here predicts real cluster behaviour.

## `loop-verifier-v1` — the existing `agent-loop` kind, reused

A new instance only — the `agent-loop` runtime and schema are untouched.
Authored preset trace of the Loop Engineering verification idea: **writing →
deterministic check → failure → diagnosis/fix → check success** (scenario
`success`) and a `budget-exhausted` scenario that stops honestly without an
answer. The figure is labelled as a **proposed** verifier-enforced loop
(`presetNotice` + `assumption`): the repository's `ralph.sh` has no such
contract gate yet, and the figure must never be read as a claim that it has.
Event `copy`, `maxSteps`, scenario and outcome rules are the documented
`agent-loop` vocabulary from the base author guide.

## Reuse notes

- A page may use both new kinds and the reused `agent-loop` freely; resources
  load per kind once per page through `layouts/partials/interactive/assets.html`.
- Both figures follow the base fallback contract: controls live in same-sized
  `visibility:hidden` slots and are swapped in only after the runtime has
  validated its embedded config (the same executable schema as the build gate)
  and rendered its first frame; any failure restores the SSR stage verbatim
  and never touches the `<details>` reference. Print shows the complete
  reference and hides all controls.
- Derived ARIA ids are avoided (wrapping labels + `role="group"` with a text
  `aria-label`), so the shortcode's collision guard stays as-is; radio
  grouping uses per-instance `name` attributes derived from the instance id.

## Testing

- `node --test tests/interactive/expansion-effects.test.mjs` — pure-model
  edge/invariant and corrupt-spec checks (both validators plus targeted
  mutations of the shipped specs and the focused fixtures in
  `tests/fixtures/interactive/expansion-effects/data/`).
- `node scripts/build-interactive-fixtures.mjs` — the shared fixture build
  calls `tests/fixtures/interactive/expansion-effects/checks.mjs` for both
  locales: SSR-vs-model parity, exhaustive reference-grid parity, hidden
  controls, id uniqueness and corrupt-fixture generation.
- `tests/interactive/expansion-effects.spec.ts` — browser semantics,
  fallback, reset, isolation and 320px mobile using the shared production
  fixture server. Run this suite with
  `npm run interactive:test -- tests/interactive/expansion-effects.spec.ts`.
