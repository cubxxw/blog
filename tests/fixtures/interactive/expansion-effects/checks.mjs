/** SSR/model checks and failure fixtures, called by the shared fixture builder. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  computeEffect,
  timelineStates,
} from '../../../../assets/js/components/effect-recovery-model.mjs';
import {
  computeReconcile,
} from '../../../../assets/js/components/gitops-reconcile-model.mjs';

const FIXTURE_DIR = resolve(fileURLToPath(new URL('.', import.meta.url)));
const REPO_ROOT = resolve(FIXTURE_DIR, '../../../..');
const ARTIFACT_DIR =
  process.env.INTERACTIVE_ARTIFACT_DIR && process.env.INTERACTIVE_ARTIFACT_DIR.trim()
    ? resolve(process.env.INTERACTIVE_ARTIFACT_DIR)
    : join(REPO_ROOT, 'tests', '.artifacts');
const HUGO = process.env.HUGO_BIN && process.env.HUGO_BIN.trim() ? process.env.HUGO_BIN.trim() : 'hugo';


const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  return ok;
}

/* ── tiny HTML readers (production-minified output, including quoted or unquoted attributes) ─── */

function instanceChunk(html, rootTag, id) {
  const re = new RegExp(`<${rootTag}[^>]*\\bid=["']?${id}["']?[ >]`);
  const m = re.exec(html);
  if (!m) return null;
  const start = m.index;
  const end = html.indexOf(`</${rootTag}>`, start);
  return html.slice(start, end < 0 ? html.length : end);
}

function textAfter(chunk, selector) {
  const re = new RegExp(`${selector}[^>]*>([^<]*)`);
  const m = chunk.match(re);
  return m ? m[1].trim() : null;
}

function referenceBody(chunk) {
  const start = chunk.search(/<details[^>]*ib-reference/);
  if (start < 0) return null;
  const tbody = chunk.slice(start).match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
  return tbody ? tbody[1] : null;
}

function tableRows(tbody) {
  return (tbody.match(/<tr>[\s\S]*?<\/tr>/g) || []).map((row) =>
    [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((cell) =>
      cell[1].replace(/<[^>]*>/g, '').trim()
    )
  );
}

function extractConfigs(html) {
  const out = [];
  const re = /<script[^>]*data-ib-config[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) out.push({ raw: m[1], index: m.index });
  return out;
}

function extractAttr(html, attr) {
  const re = new RegExp(`\\b${attr}=["']?([^"'>\\s]+)["']?`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

function localeSpec(spec, lang) {
  return { ...spec, copy: spec.copy[lang] };
}

/* ── assertions ──────────────────────────────────────────────────────── */

function assertEffectInstance(page, lang, id, specFile) {
  const spec = JSON.parse(readFileSync(join(REPO_ROOT, 'data', 'interactive', specFile), 'utf8'));
  const copy = spec.copy[lang];
  const chunk = instanceChunk(page, 'blog-effect-recovery', id);
  if (!check(`${id} (${lang}): instance present`, chunk)) return;

  const scenario = spec.scenarios.find((s) => s.id === spec.defaultScenario);
  const result = computeEffect(spec.model, scenario, scenario.defaultCrash, scenario.defaultStrategy);
  check(
    `${id} (${lang}): SSR actions match the model (${result.actions})`,
    textAfter(chunk, 'data-ib-actions') === String(result.actions),
    `${textAfter(chunk, 'data-ib-actions')}`
  );
  check(
    `${id} (${lang}): SSR knowledge matches the model (${result.knowledge})`,
    textAfter(chunk, 'data-ib-knowledge') === copy.knowledge[result.knowledge],
    `${textAfter(chunk, 'data-ib-knowledge')}`
  );
  check(
    `${id} (${lang}): SSR next action matches the model (${result.next})`,
    textAfter(chunk, 'data-ib-next') === copy.next[result.next]
  );
  check(
    `${id} (${lang}): SSR count badge matches the model`,
    textAfter(chunk, 'data-ib-count') === `×${result.actions}`
  );
  check(
    `${id} (${lang}): SSR explanation matches the rule key`,
    textAfter(chunk, 'data-ib-explain') === copy.explanations[result.explain]
  );

  // Timeline chip states (the visual state machine) match the pure model.
  const states = timelineStates(spec.model, scenario, scenario.defaultCrash, scenario.defaultStrategy);
  const chips = [...chunk.matchAll(/<li class="([^"]*)" data-ib-step=["']?([^"'\s>]+)["']?/g)];
  const chipMap = new Map(chips.map((m) => [m[2], m[1]]));
  const statesOk =
    chipMap.size === states.length &&
    states.every((s) => {
      const cls = chipMap.get(s.key) || '';
      return (
        cls.includes(`is-${s.state}`) &&
        (!s.hazard || cls.includes('is-hazard')) &&
        cls.includes('is-crash') === Boolean(s.crash)
      );
    });
  check(`${id} (${lang}): timeline chip states match the model`, statesOk, `${chipMap.size} chips`);

  // Reference grid: every finite scenario × crash × strategy row equals the
  // same computation (ordered default scenario first).
  const ordered = [
    ...spec.scenarios.filter((s) => s.id === spec.defaultScenario),
    ...spec.scenarios.filter((s) => s.id !== spec.defaultScenario),
  ];
  const crashes = ['before-send', 'after-commit-before-receipt', 'after-recorded-receipt'];
  const strategies = ['retry', 'query-receipt', 'idempotency-key'];
  const rows = tableRows(referenceBody(chunk) || '');
  const expected = [];
  for (const s of ordered) {
    for (const crash of crashes) {
      for (const strategy of strategies) {
        const r = computeEffect(spec.model, s, crash, strategy);
        expected.push([
          copy.scenarioLabels[s.id],
          copy.crashOptions[crash],
          copy.strategyOptions[strategy],
          String(r.actions),
          copy.knowledge[r.knowledge],
          copy.next[r.next],
        ]);
      }
    }
  }
  const gridOk =
    rows.length === expected.length &&
    expected.every((cells, i) => cells.every((text, j) => rows[i][j] === text));
  check(
    `${id} (${lang}): reference grid matches the model (${expected.length} rows)`,
    gridOk,
    `${rows.length} rows`
  );
  const detailsStart = chunk.search(/<details[^>]*ib-reference/);
  const details = detailsStart < 0 ? '' : chunk.slice(detailsStart);
  check(
    `${id} (${lang}): reference details block present and selector/id-free`,
    detailsStart >= 0 && !/data-ib-/.test(details) && !/\bid=/.test(details)
  );
  // Controls stay hidden behind same-sized slots in SSR (no dead controls).
  check(
    `${id} (${lang}): SSR controls are hidden behind slots`,
    /data-ib-crash-group hidden/.test(chunk) &&
      /data-ib-strategy-group hidden/.test(chunk) &&
      /data-ib-ctrl-slot/.test(chunk)
  );
  void localeSpec;
}

function assertGitopsInstance(page, lang, id) {
  const spec = JSON.parse(
    readFileSync(join(REPO_ROOT, 'data', 'interactive', 'gitops-reconcile-v1.json'), 'utf8')
  );
  const copy = spec.copy[lang];
  const chunk = instanceChunk(page, 'blog-gitops-reconcile', id);
  if (!check(`${id} (${lang}): instance present`, chunk)) return;

  const scenario = spec.scenarios.find((s) => s.id === spec.defaultScenario);
  const policy = { autoSync: false, selfHeal: false, prune: false };
  const result = computeReconcile(spec.model, scenario, policy, 'none');
  check(
    `${id} (${lang}): SSR sync status matches the model (${result.sync})`,
    textAfter(chunk, 'data-ib-sync-status') === copy.statusLabels[result.sync],
    `${textAfter(chunk, 'data-ib-sync-status')}`
  );
  check(
    `${id} (${lang}): SSR health is the independent input (${result.health})`,
    textAfter(chunk, 'data-ib-health') === copy.healthLabels[result.health]
  );
  check(
    `${id} (${lang}): SSR deletion outcome matches the model (${result.deletion})`,
    textAfter(chunk, 'data-ib-deletion') === copy.deletionLabels[result.deletion]
  );
  check(
    `${id} (${lang}): SSR explanation matches the rule key`,
    textAfter(chunk, 'data-ib-explain') === copy.explanations[result.explain]
  );
  // Absence semantics: replicas/version describe a live workload; an absent
  // side shows the placeholder dash instead of fictitious workload state.
  const value = (field, v, presence) => {
    if (field === 'resource') return copy.resourceState[v];
    return presence === 'absent' ? '—' : String(v);
  };
  const statesOk = ['replicas', 'version', 'resource'].every(
    (field) =>
      textAfter(chunk, `data-ib-cluster=["']?${field}["']?`) ===
        value(field, result.after[field], result.after.resource) &&
      textAfter(chunk, `data-ib-desired=["']?${field}["']?`) ===
        value(field, scenario.git[field], scenario.git.resource)
  );
  check(`${id} (${lang}): SSR comparison equals Git vs cluster state`, statesOk);

  const deltaText = (deltas) =>
    deltas.length === 0
      ? [copy.noDelta]
      : deltas.map(
          (d) =>
            `${copy.states[d.field]}：${copy.table.desired} ${value(d.field, d.git, 'present')} · ${copy.table.cluster} ${value(d.field, d.cluster, 'present')}`
        );
  for (const phase of ['before', 'after']) {
    const listMatch = chunk.match(
      new RegExp(`data-ib-delta=["']?${phase}["']?[^>]*>([\\s\\S]*?)</ul>`)
    );
    const items = listMatch
      ? [...listMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1].trim())
      : [];
    const expected = deltaText(phase === 'before' ? result.deltaBefore : result.deltaAfter);
    check(
      `${id} (${lang}): delta (${phase}) matches the model`,
      items.length === expected.length && expected.every((t, i) => items[i] === t),
      items.join(' | ')
    );
  }

  const rows = tableRows(referenceBody(chunk) || '');
  check(
    `${id} (${lang}): reference lists every scenario (${spec.scenarios.length})`,
    rows.length === spec.scenarios.length,
    `${rows.length} rows`
  );
  const detailsStart = chunk.search(/<details[^>]*ib-reference/);
  const details = detailsStart < 0 ? '' : chunk.slice(detailsStart);
  check(
    `${id} (${lang}): reference details block present and selector/id-free`,
    detailsStart >= 0 && !/data-ib-/.test(details) && !/\bid=/.test(details)
  );
  check(
    `${id} (${lang}): SSR controls are hidden behind slots`,
    /data-ib-toggles hidden/.test(chunk) &&
      /data-ib-actions-group hidden/.test(chunk) &&
      /data-ib-ctrl-slot/.test(chunk)
  );
}

export function checkEffectsFixtures(OUT_DIR) {
  results.length = 0;
  const multi = readFileSync(join(OUT_DIR, 'effects-multi', 'index.html'), 'utf8');
  const multiZh = readFileSync(join(OUT_DIR, 'zh', 'effects-multi', 'index.html'), 'utf8');
  const single = readFileSync(join(OUT_DIR, 'effects-single', 'index.html'), 'utf8');
  const singleZh = readFileSync(join(OUT_DIR, 'zh', 'effects-single', 'index.html'), 'utf8');

  for (const [lang, page] of [['en', multi], ['zh', multiZh]]) {
    assertEffectInstance(page, lang, 'fx-n8n', 'effect-recovery-n8n-v1.json');
    assertEffectInstance(page, lang, 'fx-lg', 'effect-recovery-langgraph-v1.json');
    assertGitopsInstance(page, lang, 'fx-gitops');
  }
  for (const [lang, page] of [['en', single], ['zh', singleZh]]) {
    assertGitopsInstance(page, lang, 'fx-one');
  }

  // Reused agent-loop instance: the verifier trace renders completely.
  const loopChunk = instanceChunk(multi, 'blog-agent-loop', 'fx-loop');
  check('fx-loop (en): reused agent-loop instance present', Boolean(loopChunk));
  if (loopChunk) {
    const detailsStart = loopChunk.search(/<details[^>]*ib-reference/);
    const details = detailsStart < 0 ? '' : loopChunk.slice(detailsStart);
    check(
      'fx-loop (en): reference carries both authored traces (22 events)',
      (details.match(/class=.?ib-step /g) || []).length === 22,
      `${(details.match(/class=.?ib-step /g) || []).length}`
    );
    check('fx-loop (en): preset notice is statically visible', /ib-preset/.test(loopChunk));
  }

  // Ids are unique in every built page (roots and any derived ids).
  for (const [name, html] of [
    ['effects-multi', multi],
    ['effects-multi zh', multiZh],
    ['effects-single', single],
    ['effects-single zh', singleZh],
  ]) {
    const ids = extractAttr(html, 'id');
    const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
    check(`${name}: no duplicate ids anywhere in the page`, dup.length === 0, dup.join(', '));
  }

  // Corrupt-config and schema-invalid-config pages for the runtime fallback
  // and isolation tests (same assets, healthy siblings): one page with an
  // unparseable fx-n8n payload, one with a schema-invalid fx-gitops payload
  // (replicaMax 0 — a corrupt runtime value the validator must reject).
  const configs = extractConfigs(multi);
  const n8nRaw = configs.find((c) => c.raw.includes('"id":"effect-recovery-n8n-v1"'));
  const gitopsRaw = configs.find((c) => c.raw.includes('"id":"gitops-reconcile-v1"'));
  if (!n8nRaw || !gitopsRaw) throw new Error('effects payloads not found for corrupt fixtures');
  const corruptDir = join(OUT_DIR, 'effects-corrupt');
  mkdirSync(corruptDir, { recursive: true });
  writeFileSync(join(corruptDir, 'index.html'), multi.replace(n8nRaw.raw, `{,corrupt:${n8nRaw.raw}`));
  const invalidDir = join(OUT_DIR, 'effects-invalid');
  mkdirSync(invalidDir, { recursive: true });
  writeFileSync(
    join(invalidDir, 'index.html'),
    multi.replace(gitopsRaw.raw, gitopsRaw.raw.replace('"replicaMax":20', '"replicaMax":0'))
  );
  check(
    'corrupt/invalid-config fixture pages generated (with healthy siblings)',
    existsSync(join(corruptDir, 'index.html')) && existsSync(join(invalidDir, 'index.html'))
  );

  const failed = results.filter((r) => !r.ok);
  writeFileSync(
    join(ARTIFACT_DIR, 'expansion-effects-checks.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), hugo: HUGO, results }, null, 2)
  );
  console.log(
    `expansion-effects fixture: ${results.length - failed.length}/${results.length} checks passed. Report: ${join(ARTIFACT_DIR, 'expansion-effects-checks.json')}`
  );
  if (failed.length > 0) {
    console.error(`FAILED: ${failed.map((f) => f.name).join('; ')}`);
    process.exit(1);
  }
  return OUT_DIR;
}
