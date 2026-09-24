#!/usr/bin/env node
/**
 * build-interactive-fixtures.mjs — fixture build + build-level assertions for
 * the interactive components (issue #389). Part of `npm run interactive:check`.
 *
 * Builds the fixture site (tests/fixtures/interactive/, never published to
 * content/ or the deploy directory) with the production Hugo pipeline, then
 * asserts the acceptance categories that are provable from built HTML:
 *
 *   - safe JSON embedding round-trips </script>, quotes, <, &, Chinese and
 *     newlines (JSON.parse once returns the payload OBJECT);
 *   - real serialized per-instance config ≤ 30 KiB and per-page ≤ 100 KiB;
 *   - static default numbers and bar geometry match the pure model functions
 *     exactly (same data, no second source of truth);
 *   - fixed-capacity bar geometry uses value/capacity percentages;
 *   - each kind's fingerprinted CSS/JS is referenced exactly once per page,
 *     and pages without the shortcode reference none;
 *   - static controls are hidden (same-sized decorative slots instead) and
 *     no id in a built page is duplicated (including derived ARIA ids);
 *   - legacy demo-* shortcodes still render next to the new components;
 *   - negative fixtures FAIL the build with the expected error (duplicate id,
 *     derived-id collision, unknown kind, path-traversal spec, unknown spec),
 *     and a corrupt-embedded-config page is produced for the runtime
 *     fallback tests.
 *
 * Heavy output goes to the artifact root (INTERACTIVE_ARTIFACT_DIR, default
 * tests/.artifacts) so CI stays portable.
 *
 * Usage: node scripts/build-interactive-fixtures.mjs
 */

import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeBudget, defaultScenario, findScenario } from '../assets/js/components/model.mjs';

const REPO_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ARTIFACT_DIR =
  process.env.INTERACTIVE_ARTIFACT_DIR && process.env.INTERACTIVE_ARTIFACT_DIR.trim()
    ? resolve(process.env.INTERACTIVE_ARTIFACT_DIR)
    : join(REPO_ROOT, 'tests', '.artifacts');
const HUGO = process.env.HUGO_BIN && process.env.HUGO_BIN.trim() ? process.env.HUGO_BIN.trim() : 'hugo';

const FIXTURE_DIR = join(REPO_ROOT, 'tests', 'fixtures', 'interactive');
const OUT_DIR = join(ARTIFACT_DIR, 'fixture-site');
const STAGE_DATA = join(ARTIFACT_DIR, 'fixture-data');
const OVERLAY = join(ARTIFACT_DIR, 'fixture-overlay.toml');

/** Budgets from the acceptance contract. */
export const BUDGET = {
  configPerInstance: 30 * 1024,
  configPerPage: 100 * 1024,
};

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok), detail });
  const mark = ok ? 'ok  ' : 'FAIL';
  console.log(`  ${mark} ${name}${detail ? ` — ${detail}` : ''}`);
  return ok;
}

function runHugo({ contentDir, outDir, expectFailure = false }) {
  const overlay = join(ARTIFACT_DIR, `fixture-overlay-${Math.random().toString(36).slice(2)}.toml`);
  writeFileSync(
    overlay,
    [
      `dataDir = '${STAGE_DATA}'`,
      `disableKinds = ['taxonomy', 'term', 'RSS', 'sitemap', 'robotsTXT', '404', 'section', 'home']`,
      '',
      '[[module.mounts]]',
      `  source = '${contentDir}'`,
      "  target = 'content'",
      "  lang = 'en'",
      '[[module.mounts]]',
      `  source = '${contentDir}'`,
      "  target = 'content'",
      "  lang = 'zh'",
      '[[module.mounts]]',
      "  source = 'assets'",
      "  target = 'assets'",
      '[[module.mounts]]',
      "  source = 'static/images'",
      "  target = 'assets/images'",
      '[[module.mounts]]',
      "  source = 'static'",
      "  target = 'static'",
      '',
    ].join('\n')
  );
  try {
    execFileSync(
      HUGO,
      [
        '--config',
        `config.yml,${overlay}`,
        '-d',
        outDir,
        '--baseURL',
        'http://127.0.0.1:4173/',
        '--environment',
        'production',
        '--minify',
      ],
      { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    return { ok: true, output: '' };
  } catch (err) {
    if (expectFailure) {
      return { ok: false, output: `${err.stdout || ''}${err.stderr || ''}` };
    }
    throw new Error(`hugo fixture build failed:\n${err.stdout || ''}${err.stderr || ''}`);
  } finally {
    rmSync(overlay, { force: true });
  }
}

/** Extract every embedded config payload from a built page. */
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

function panelNumbers(html, panelId) {
  // Values inside one panel section (data-ib-panel="<id>").
  const start = html.indexOf(`data-ib-panel=${panelId}`);
  const altStart = html.indexOf(`data-ib-panel="${panelId}"`);
  const begin = [start, altStart].filter((n) => n >= 0).sort((a, b) => a - b)[0];
  if (begin === undefined) return null;
  const end = html.indexOf('</section>', begin);
  const chunk = html.slice(begin, end < 0 ? html.length : end);
  const metrics = {};
  for (const key of ['used', 'remaining', 'overflow']) {
    const m = chunk.match(new RegExp(`data-ib-metric="?${key}"?>?([^<]*)`, 'i'));
    if (m) metrics[key] = m[1].trim();
  }
  const segs = {};
  for (const key of ['system', 'history', 'tools', 'remaining', 'overflow']) {
    const m = chunk.match(new RegExp(`data-ib-seg-value="?${key}"?[^>]*>([^<]*)`));
    if (m) segs[key] = m[1].trim();
  }
  const widths = {};
  for (const key of ['system', 'history', 'tools', 'remaining']) {
    const m = chunk.match(new RegExp(`data-ib-seg="?${key}"?[^>]*style="?width:([\\d.]+)%`));
    if (m) widths[key] = Number(m[1]);
  }
  const over = chunk.match(/data-ib-overbar[^>]*style="?width:([\d.]+)%/);
  if (over) widths.overflow = Number(over[1]);
  return { metrics, segs, widths };
}

async function gzipSize(file) {
  const buf = readFileSync(file);
  return gzipSync(buf).length;
}

function assetRefs(html, kind) {
  const urls = [];
  const re = /(?:src|href)=["']?([^"'\s>]+)/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[1].includes(`components/${kind}`)) urls.push(m[1]);
  }
  return {
    css: urls.filter((u) => u.endsWith('.css')),
    js: urls.filter((u) => u.endsWith('.js')),
  };
}

async function main() {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  rmSync(OUT_DIR, { recursive: true, force: true });

  // Stage data: real specs + fixture-only specs (never in data/interactive/).
  rmSync(STAGE_DATA, { recursive: true, force: true });
  mkdirSync(join(STAGE_DATA, 'interactive'), { recursive: true });
  for (const dir of [join(REPO_ROOT, 'data', 'interactive'), join(FIXTURE_DIR, 'data')]) {
    if (!existsSync(dir)) continue;
    for (const name of execFileSync('ls', [dir], { encoding: 'utf8' }).trim().split('\n')) {
      if (name.endsWith('.json')) cpSync(join(dir, name), join(STAGE_DATA, 'interactive', name));
    }
  }

  console.log('build-interactive-fixtures: building fixture site…');
  runHugo({ contentDir: join(FIXTURE_DIR, 'content'), outDir: OUT_DIR });

  /* ── positive assertions on built HTML ─────────────────────────────── */

  const multi = readFileSync(join(OUT_DIR, 'multi', 'index.html'), 'utf8');
  const multiZh = readFileSync(join(OUT_DIR, 'zh', 'multi', 'index.html'), 'utf8');
  const safety = readFileSync(join(OUT_DIR, 'safety', 'index.html'), 'utf8');
  const bare = readFileSync(join(OUT_DIR, 'bare', 'index.html'), 'utf8');

  // 1. Safe serialization: parse once → object; hostile strings round-trip.
  const safetySpec = JSON.parse(readFileSync(join(FIXTURE_DIR, 'data', 'safety-strings-v1.json'), 'utf8'));
  const configs = extractConfigs(safety);
  check('safety page embeds one config per instance', configs.length === 2, `${configs.length} payloads`);
  let parsed = null;
  try {
    parsed = JSON.parse(configs[0].raw);
    check('JSON.parse once returns the payload object (not a JSON string)', typeof parsed === 'object' && parsed !== null && typeof parsed !== 'string');
  } catch (err) {
    check('JSON.parse once returns the payload object (not a JSON string)', false, err.message);
  }
  if (parsed) {
    for (const lang of ['zh', 'en']) {
      const expected = safetySpec.copy[lang];
      const actual = parsed.spec.copy[lang];
      check(`hostile title round-trips verbatim (${lang})`, actual.title === expected.title, JSON.stringify(actual.title));
      check(
        `hostile newline text round-trips verbatim (${lang})`,
        actual.assumption === expected.assumption
      );
    }
  }
  check('no raw "</script" inside any config payload', configs.every((c) => !c.raw.includes('</')));
  check(
    'hostile strings are escaped in the raw payload',
    configs.every((c) => c.raw.includes('\\u003c') || !c.raw.includes('<')),
    configs[0] ? configs[0].raw.slice(0, 40) : ''
  );

  // 2. Serialized config byte budgets (real payloads, not source files).
  const pages = { multi, multiZh, safety };
  for (const [name, html] of Object.entries(pages)) {
    const sizes = extractConfigs(html).map((c) => Buffer.byteLength(c.raw, 'utf8'));
    const total = sizes.reduce((a, b) => a + b, 0);
    check(
      `${name}: per-instance config ≤ ${BUDGET.configPerInstance} B`,
      sizes.every((s) => s <= BUDGET.configPerInstance),
      `max ${Math.max(0, ...sizes)} B`
    );
    check(
      `${name}: per-page config total ≤ ${BUDGET.configPerPage} B`,
      total <= BUDGET.configPerPage,
      `${total} B`
    );
  }

  // 2b. Build-time serialized byte budgets on real pages: the instance
  //     boundary page (just under 30720 B per instance) and the page
  //     boundary page (just under 102400 B cumulative) must build; the
  //     matching negative builds (escaped-size expansion, repeated-page
  //     total) fail below.
  const budgetInstance = readFileSync(join(OUT_DIR, 'budget-instance', 'index.html'), 'utf8');
  const budgetPage = readFileSync(join(OUT_DIR, 'budget-page', 'index.html'), 'utf8');
  const biSizes = extractConfigs(budgetInstance).map((c) => Buffer.byteLength(c.raw, 'utf8'));
  const biMax = Math.max(0, ...biSizes);
  check(
    'instance boundary page builds: serialized config just under 30720 B',
    biMax > 29000 && biMax <= BUDGET.configPerInstance,
    `max ${biMax} B`
  );
  const bpTotal = extractConfigs(budgetPage).reduce((a, c) => a + Buffer.byteLength(c.raw, 'utf8'), 0);
  check(
    'page boundary page builds: cumulative config just under 102400 B',
    bpTotal > 90000 && bpTotal <= BUDGET.configPerPage,
    `${bpTotal} B`
  );

  // 3. Static default content == pure model output (same data, no drift) and
  //    fixed-capacity geometry == value/capacity percentages.
  for (const [pageName, html] of [['en', multi], ['zh', multiZh]]) {
    const spec = JSON.parse(readFileSync(join(REPO_ROOT, 'data', 'interactive', 'context-window-v1.json'), 'utf8'));
    for (const scenario of spec.scenarios) {
      const budget = computeBudget(spec.model, scenario);
      const panel = panelNumbers(html, scenario.id);
      const okNumbers =
        panel &&
        panel.metrics.used === String(budget.used) &&
        panel.metrics.remaining === String(budget.remaining) &&
        panel.metrics.overflow === String(budget.overflow) &&
        panel.segs.history === String(budget.history) &&
        panel.segs.tools === String(budget.tools);
      check(
        `${pageName} ${scenario.id}: static numbers match model (${budget.used}/${budget.remaining}/${budget.overflow})`,
        okNumbers,
        panel ? JSON.stringify(panel.metrics) : 'panel not found'
      );
      const cap = spec.model.capacity;
      const expectedWidth = {
        system: (budget.system / cap) * 100,
        history: (budget.history / cap) * 100,
        tools: (budget.tools / cap) * 100,
        remaining: (budget.remaining / cap) * 100,
        overflow: (Math.min(cap, budget.overflow) / cap) * 100,
      };
      const okGeom =
        panel &&
        Object.entries(expectedWidth).every(([k, v]) => Math.abs((panel.widths[k] ?? 0) - v) < 0.001);
      check(
        `${pageName} ${scenario.id}: bar geometry is value/capacity of 64`,
        okGeom,
        panel ? JSON.stringify(panel.widths) : ''
      );
    }
  }

  // 4. Conditional, deduplicated resources (one stylesheet + one ESM per
  //    used kind, no matter how many instances).
  for (const [name, html] of Object.entries(pages)) {
    const cb = assetRefs(html, 'context-budget');
    const al = assetRefs(html, 'agent-loop');
    const all = [...cb.css, ...cb.js, ...al.css, ...al.js];
    check(
      `${name}: exactly one stylesheet + one ESM per used kind`,
      cb.css.length === 1 && cb.js.length === 1 && al.css.length === 1 && al.js.length === 1 && new Set(all).size === all.length,
      `css ${cb.css.length}/${al.css.length}, js ${cb.js.length}/${al.js.length}`
    );
    check(`${name}: component scripts use type=module`, (html.match(/type=module/g) || []).length === 2);
  }
  check(
    'page without shortcodes loads no component assets',
    assetRefs(bare, 'context-budget').css.length + assetRefs(bare, 'context-budget').js.length === 0 &&
      assetRefs(bare, 'agent-loop').css.length + assetRefs(bare, 'agent-loop').js.length === 0
  );

  // 5. Static fallback: one current stage + native details reference.
  check(
    'static range inputs are hidden behind invisible slots',
    (multi.match(/type=range[^>]*hidden/g) || []).length === (multi.match(/type=range/g) || []).length &&
      (multi.match(/data-ib-range-slot/g) || []).length === (multi.match(/type=range/g) || []).length
  );
  check(
    'static scenario buttons are hidden behind chip slots',
    (multi.match(/data-ib-scenarios[^>]*hidden/g) || []).length >= 3 &&
      (multi.match(/data-ib-scn-static/g) || []).length >= 3
  );
  check(
    'context stage shows one current scenario in SSR (others hidden)',
    (multi.match(/data-ib-panel=[^ >]*[^>]*hidden/g) || []).length >= 2,
    `${(multi.match(/data-ib-panel=/g) || []).length} panels`
  );
  check(
    'agent stage shows exactly one current event card',
    (multi.match(/data-ib-current[\s>]/g) || []).length === 1 &&
      !/data-ib-step/.test(multi)
  );
  check('preset-trace notice is statically visible', /ib-preset/.test(multi));
  check('legacy demo-* shortcodes still render', /demo-steps/.test(multi) && /demo-trace/.test(multi));

  // 5b. Native details reference: complete, same data, runtime-selector-free.
  const detailsChunks = multi.match(/<details[^>]*>[\s\S]*?<\/details>/g) || [];
  check('each figure has exactly one details reference', detailsChunks.length === 4, `${detailsChunks.length}`);
  check(
    'reference content has no runtime selectors and no ids',
    detailsChunks.every((d) => !/data-ib-/.test(d) && !/\bid=/.test(d))
  );
  const budgetRefs = detailsChunks.filter((d) => /ib-ref-table/.test(d));
  check(
    'context reference lists every scenario with computed numbers',
    budgetRefs.length === 3 &&
      budgetRefs.every((d) => (d.match(/<tr>/g) || []).length >= 2) &&
      (budgetRefs[0].match(/<tr>/g) || []).length === 4
  );
  const loopRefs = detailsChunks.filter((d) => /ib-steps--ref/.test(d));
  check(
    'agent reference contains all authored traces (21 events)',
    loopRefs.length === 1 && loopRefs.every((d) => (d.match(/class=.?ib-step /g) || []).length === 21),
    loopRefs.map((d) => (d.match(/class=.?ib-step /g) || []).length).join(',')
  );
  check(
    'summary wording comes from spec copy (both locales)',
    /<summary>查看全部预设轨迹<\/summary>/.test(multiZh) && /<summary>View all preset traces<\/summary>/.test(multi)
  );
  check('reset slot reserves the localized label invisibly', /data-ib-head-slot[^>]*>重置</.test(multiZh) && /data-ib-head-slot[^>]*>Reset</.test(multi));
  check('fixed capacity line is explicit', /ib-unit/.test(multi) && /容量上限 64/.test(multiZh));

  // 6. Id uniqueness in every built page (roots AND derived ARIA ids).
  for (const [name, html] of Object.entries(pages)) {
    const ids = extractAttr(html, 'id');
    const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
    check(`${name}: no duplicate ids anywhere in the page`, dup.length === 0, dup.join(', '));
  }

  // 7. Locale coverage: zh page embeds zh copy, en page en copy.
  const zhCfg = JSON.parse(extractConfigs(multiZh)[0].raw);
  const enCfg = JSON.parse(extractConfigs(multi)[0].raw);
  check('zh page embeds zh locale copy', zhCfg.lang === 'zh' && zhCfg.spec.copy.zh.title === '上下文预算实验');
  check('en page embeds en locale copy', enCfg.lang === 'en' && enCfg.spec.copy.en.title === 'Context budget experiment');

  // 8. Asset size budgets (production, fingerprinted output).
  const assetRoot = OUT_DIR;
  const cbJs = assetRefs(multi, 'context-budget').js[0];
  const alJs = assetRefs(multi, 'agent-loop').js[0];
  const cbCss = assetRefs(multi, 'context-budget').css[0];
  const alCss = assetRefs(multi, 'agent-loop').css[0];
  const fileOf = (url) => join(assetRoot, url.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, ''));
  const jsGzip = (await gzipSize(fileOf(cbJs))) + (await gzipSize(fileOf(alJs)));
  const cssGzip = (await gzipSize(fileOf(cbCss))) + (await gzipSize(fileOf(alCss)));
  check('both kinds JS gzip ≤ 25 KiB', jsGzip <= 25 * 1024, `${jsGzip} B`);
  check('both kinds CSS gzip ≤ 8 KiB', cssGzip <= 8 * 1024, `${cssGzip} B`);

  // 9. Corrupt-config pages for the runtime fallback tests (same assets):
  //    a) unparseable JSON in the first budget instance;
  //    b) unparseable JSON in the AGENT instance with healthy siblings;
  //    c) unsupported ("fr") and missing envelope lang on the zh page with a
  //       healthy sibling — all must fall back to the trusted SSR view.
  const corruptDir = join(OUT_DIR, 'multi-corrupt');
  mkdirSync(corruptDir, { recursive: true });
  const first = extractConfigs(multi)[0];
  const corrupted = multi.replace(first.raw, `{,corrupt:${first.raw}`);
  writeFileSync(join(corruptDir, 'index.html'), corrupted);

  const agentCorruptDir = join(OUT_DIR, 'agent-corrupt');
  mkdirSync(agentCorruptDir, { recursive: true });
  const loopRaw = extractConfigs(multi).find((c) => c.raw.includes('"id":"loop-a"'));
  if (!loopRaw) throw new Error('loop-a payload not found for agent-corrupt fixture');
  writeFileSync(join(agentCorruptDir, 'index.html'), multi.replace(loopRaw.raw, `{,corrupt:${loopRaw.raw}`));

  const langDir = join(OUT_DIR, 'lang-invalid');
  mkdirSync(langDir, { recursive: true });
  const ctxARaw = extractConfigs(multiZh).find((c) => c.raw.includes('"id":"ctx-a"'));
  const loopZhRaw = extractConfigs(multiZh).find((c) => c.raw.includes('"id":"loop-a"'));
  if (!ctxARaw || !loopZhRaw) throw new Error('zh payloads not found for lang fixtures');
  let langHtml = multiZh.replace(ctxARaw.raw, ctxARaw.raw.replace('"lang":"zh"', '"lang":"fr"'));
  langHtml = langHtml.replace(loopZhRaw.raw, loopZhRaw.raw.replace('"lang":"zh",', ''));
  writeFileSync(join(langDir, 'index.html'), langHtml);
  check(
    'corrupt/invalid-config fixture pages generated',
    existsSync(join(corruptDir, 'index.html')) &&
      existsSync(join(agentCorruptDir, 'index.html')) &&
      existsSync(join(langDir, 'index.html'))
  );

  /* ── negative builds must fail with the expected error ─────────────── */

  const negatives = [
    ['duplicate-id', /duplicate id/i],
    ['id-collision', /collides|duplicate id/i],
    ['unknown-kind', /allowlist/i],
    ['bad-spec-path', /must match/i],
    ['unknown-spec', /unknown spec/i],
    ['oversize-instance', /limit 30720/i],
    ['oversize-page', /limit 102400/i],
  ];
  for (const [name, pattern] of negatives) {
    const outDir = join(ARTIFACT_DIR, `negative-${name}`);
    rmSync(outDir, { recursive: true, force: true });
    const res = runHugo({
      contentDir: join(FIXTURE_DIR, 'negative', name, 'content'),
      outDir,
      expectFailure: true,
    });
    const ok = !res.ok && pattern.test(res.output);
    check(
      `negative build "${name}" fails with ${pattern}`,
      ok,
      res.ok ? 'build unexpectedly succeeded' : res.output.split('\n').find((l) => /ERROR/.test(l)) || ''
    );
  }

  /* ── report ───────────────────────────────────────────────────────── */

  const failed = results.filter((r) => !r.ok);
  writeFileSync(
    join(ARTIFACT_DIR, 'fixture-checks.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        hugo: HUGO,
        artifactDir: ARTIFACT_DIR,
        budget: BUDGET,
        results,
      },
      null,
      2
    )
  );
  console.log(
    `build-interactive-fixtures: ${results.length - failed.length}/${results.length} checks passed. Report: ${join(ARTIFACT_DIR, 'fixture-checks.json')}`
  );
  if (failed.length > 0) {
    console.error(`FAILED: ${failed.map((f) => f.name).join('; ')}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
