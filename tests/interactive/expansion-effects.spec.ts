/**
 * expansion-effects.spec.ts — cross-engine behaviour suite for the "effects"
 * group (effect-recovery, gitops-reconcile, the reused agent-loop verifier
 * instance). Runs against the shared production fixture server and real article pages.
 * Both locale mounts use scripts/build-interactive-fixtures.mjs.
 *
 * Proves: the semantic outcomes in a real browser (ambiguity crash window,
 * duplicate direct retry, receipt reconciliation, stable-key dedupe only
 * under stated provider support, the interruption replay boundary, Sync vs
 * Health independence, selfHeal/prune toggles, the rollback guard), static
 * fallback for corrupt/malformed configs with healthy siblings, Reset,
 * multi-instance isolation, the untouched details reference, 320px mobile
 * behaviour and the no-JS static view.
 */
import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const REPO_ROOT = `${process.cwd()}/`;
const readJson = (p: string) => JSON.parse(readFileSync(`${REPO_ROOT}${p}`, 'utf8'));
const N8N = readJson('data/interactive/effect-recovery-n8n-v1.json');
const LANGGRAPH = readJson('data/interactive/effect-recovery-langgraph-v1.json');
const GITOPS = readJson('data/interactive/gitops-reconcile-v1.json');

const fixtureBase = '';

async function waitForEnhanced(page: Page, selector: string) {
  await page.locator(`${selector}[data-enhanced]`).first().waitFor({ state: 'attached' });
}

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    // One documented preexisting site-embed quirk (the utterances widget's
    // cross-origin postMessage log on Firefox/WebKit) — nothing else is
    // filtered, and never on the fixture-only pages.
    if (msg.type() === 'error' && !/utteranc/i.test(msg.text())) {
      errors.push(`console.error: ${msg.text()}`);
    }
  });
  return errors;
}

function readEffect(page: Page, root: string) {
  return {
    actions: page.locator(`${root} [data-ib-actions]`),
    knowledge: page.locator(`${root} [data-ib-knowledge]`),
    next: page.locator(`${root} [data-ib-next]`),
  };
}

const effectCopy = (spec: typeof N8N, lang: 'zh' | 'en') => spec.copy[lang];

test.describe('upgrade and static fallback', () => {
  test('upgrade swaps controls in without moving the figure', async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (route.request().resourceType() === 'script' && /components\/(effect-recovery|gitops-reconcile)/.test(url)) {
        await gate;
      }
      await route.continue();
    });
    await page.goto(`${fixtureBase}/effects-multi/`, { waitUntil: 'commit' });
    const root = page.locator('#fx-n8n');
    await root.waitFor({ state: 'visible' });
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll('link[rel=stylesheet]')).every((l) => (l as HTMLLinkElement).sheet)
    );
    expect(await root.getAttribute('data-enhanced')).toBeNull();
    const before = (await root.boundingBox())!;
    release();
    await waitForEnhanced(page, '#fx-n8n');
    await waitForEnhanced(page, '#fx-gitops');
    await page.waitForTimeout(150);
    const after = (await root.boundingBox())!;
    expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(2);
    expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(2);
  });

  test('corrupt config keeps the trusted static view while siblings enhance', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(`${fixtureBase}/effects-corrupt/`);
    await waitForEnhanced(page, '#fx-lg');
    await waitForEnhanced(page, '#fx-gitops');
    await page.waitForTimeout(200);
    const broken = page.locator('#fx-n8n');
    expect(await broken.getAttribute('data-enhanced')).toBeNull();
    // The readout is the SSR default result, untouched.
    await expect(broken.locator('[data-ib-actions]')).toHaveText('2');
    // Controls stay hidden — no dead controls.
    await expect(broken.locator('[data-ib-crash-group]')).toBeHidden();
    await expect(broken.locator('[data-ib-strategy-group]')).toBeHidden();
    // The reader's details state is the reader's.
    expect(errors).toEqual([]);
  });

  test('schema-invalid config never enhances and never renders NaN', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(`${fixtureBase}/effects-invalid/`);
    await waitForEnhanced(page, '#fx-n8n');
    await page.waitForTimeout(200);
    const broken = page.locator('#fx-gitops');
    expect(await broken.getAttribute('data-enhanced')).toBeNull();
    await expect(broken.locator('[data-ib-sync-status]')).toHaveText(GITOPS.copy.en.statusLabels['out-of-sync']);
    expect((await broken.innerText()).includes('NaN')).toBe(false);
    await expect(broken.locator('[data-ib-toggles]')).toBeHidden();
    expect(errors).toEqual([]);
  });
});

test.describe('effect-recovery semantics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${fixtureBase}/effects-multi/`);
    await waitForEnhanced(page, '#fx-n8n');
  });

  test('ambiguity crash window: direct retry duplicates and knowledge stays unknown', async ({ page }) => {
    const c = effectCopy(N8N, 'en');
    const r = readEffect(page, '#fx-n8n');
    // Default (plain provider · after commit before receipt · direct retry):
    // the article's t0–t5 duplicate, locally unprovable.
    await expect(r.actions).toHaveText('2');
    await expect(r.knowledge).toHaveText(c.knowledge['unknown']);
    await expect(r.next).toHaveText(c.next['reconcile']);
    // Crash before the send: exactly once and provable.
    await page.locator('#fx-n8n [data-ib-crash][value="before-send"]').check();
    await expect(r.actions).toHaveText('1');
    await expect(r.knowledge).toHaveText(c.knowledge['confirmed-success']);
    await expect(r.next).toHaveText(c.next['return-recorded']);
  });

  test('receipt reconciliation needs query support; unsupported query means reconcile', async ({ page }) => {
    const c = effectCopy(N8N, 'en');
    const r = readEffect(page, '#fx-n8n');
    await page.locator('#fx-n8n [data-ib-scenario="queryable-provider"]').click();
    // Scenario defaults: after commit before receipt · query the receipt.
    await expect(r.actions).toHaveText('1');
    await expect(r.knowledge).toHaveText(c.knowledge['confirmed-success']);
    await expect(r.next).toHaveText(c.next['return-recorded']);
    // The same probe without provider support proves nothing.
    await page.locator('#fx-n8n [data-ib-scenario="plain-provider"]').click();
    await page.locator('#fx-n8n [data-ib-strategy][value="query-receipt"]').check();
    await expect(r.actions).toHaveText('1');
    await expect(r.knowledge).toHaveText(c.knowledge['unknown']);
    await expect(r.next).toHaveText(c.next['reconcile']);
  });

  test('stable-key dedupe happens only under stated provider support', async ({ page }) => {
    const c = effectCopy(N8N, 'en');
    const r = readEffect(page, '#fx-n8n');
    await page.locator('#fx-n8n [data-ib-scenario="key-provider"]').click();
    // Defaults: after commit before receipt · stable idempotency key.
    await expect(r.actions).toHaveText('1');
    await expect(r.knowledge).toHaveText(c.knowledge['confirmed-success']);
    // Same key against a provider without support: a plain duplicate retry.
    await page.locator('#fx-n8n [data-ib-scenario="plain-provider"]').click();
    await page.locator('#fx-n8n [data-ib-strategy][value="idempotency-key"]').check();
    await expect(r.actions).toHaveText('2');
    await expect(r.knowledge).toHaveText(c.knowledge['unknown']);
    await expect(r.next).toHaveText(c.next['reconcile']);
  });

  test('interruption replay boundary: before-approval side effect repeats', async ({ page }) => {
    const c = effectCopy(LANGGRAPH, 'en');
    const r = readEffect(page, '#fx-lg');
    await waitForEnhanced(page, '#fx-lg');
    await page.locator('#fx-lg [data-ib-scenario="effect-before-approval"]').click();
    await page.locator('#fx-lg [data-ib-crash][value="before-send"]').check();
    await expect(r.actions).toHaveText('2');
    await expect(r.knowledge).toHaveText(c.knowledge['confirmed-failure']);
    // Safe placement: the same crash and discipline writes exactly once.
    await page.locator('#fx-lg [data-ib-scenario="effect-after-approval"]').click();
    await page.locator('#fx-lg [data-ib-crash][value="before-send"]').check();
    await expect(r.actions).toHaveText('1');
    await expect(r.knowledge).toHaveText(c.knowledge['confirmed-success']);
    // A supported stable key collapses even the replayed placement.
    await page.locator('#fx-lg [data-ib-scenario="effect-before-approval"]').click();
    await page.locator('#fx-lg [data-ib-crash][value="before-send"]').check();
    await page.locator('#fx-lg [data-ib-strategy][value="idempotency-key"]').check();
    await expect(r.actions).toHaveText('1');
  });

  test('review regressions: proven zero needs protected replay; repeated writes are visible', async ({ page }) => {
    const c = effectCopy(LANGGRAPH, 'en');
    // Review #1: an evidence interval that excludes exactly once is
    // confirmed-failure even though the exact duplicate count is unknown
    // (before-approval + after-commit + unkeyed retry → 3 writes, [2,3]).
    await page.locator('#fx-lg [data-ib-scenario="effect-before-approval"]').click();
    await expect(page.locator('#fx-lg [data-ib-actions]')).toHaveText('3');
    await expect(page.locator('#fx-lg [data-ib-knowledge]')).toHaveText(c.knowledge['confirmed-failure']);
    // Review #2: proven zero is never called safe when the node replay makes
    // an unprotected re-run repeat the side effect.
    await page.locator('#fx-lg [data-ib-crash][value="before-send"]').check();
    await page.locator('#fx-lg [data-ib-strategy][value="query-receipt"]').check();
    await expect(page.locator('#fx-lg [data-ib-actions]')).toHaveText('0');
    await expect(page.locator('#fx-lg [data-ib-next]')).toHaveText(c.next['protected-retry']);
    // Review #3: the re-executed write steps show as repeated and the crash
    // window stays separately identifiable (even after a late crash).
    await page.locator('#fx-n8n [data-ib-crash][value="after-recorded-receipt"]').check();
    await expect(page.locator('#fx-n8n [data-ib-step="send"]')).toHaveClass(/is-repeated/);
    await expect(page.locator('#fx-n8n [data-ib-step="commit"]')).toHaveClass(/is-repeated/);
    await expect(page.locator('#fx-n8n [data-ib-step="finish"]')).toHaveClass(/is-crash/);
  });
});

test.describe('gitops-reconcile semantics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${fixtureBase}/effects-multi/`);
    await waitForEnhanced(page, '#fx-gitops');
  });

  const gr = (page: Page) => ({
    sync: page.locator('#fx-gitops [data-ib-sync-status]'),
    health: page.locator('#fx-gitops [data-ib-health]'),
    deletion: page.locator('#fx-gitops [data-ib-deletion]'),
    explain: page.locator('#fx-gitops [data-ib-explain]'),
    version: page.locator('#fx-gitops [data-ib-cluster="version"]'),
  });

  test('Sync and Health stay independent; selfHeal needs autoSync', async ({ page }) => {
    const c = GITOPS.copy.en;
    const r = gr(page);
    await page.locator('#fx-gitops [data-ib-scenario="manual-drift"]').click();
    await expect(r.sync).toHaveText(c.statusLabels['out-of-sync']);
    await expect(r.health).toHaveText(c.healthLabels.healthy);
    // Manual sync is its own action and works with every toggle off.
    await page.locator('#fx-gitops [data-ib-sync]').click();
    await expect(r.sync).toHaveText(c.statusLabels.synced);
    await expect(r.explain).toHaveText(c.explanations['synced-clean']);
    // autoSync alone does not revert cluster drift.
    await page.locator('#fx-gitops [data-ib-scenario="manual-drift"]').click();
    await page.locator('#fx-gitops [data-ib-toggle="auto-sync"]').check();
    await expect(r.sync).toHaveText(c.statusLabels['out-of-sync']);
    await expect(r.explain).toHaveText(c.explanations['drift-kept']);
    // selfHeal (with autoSync) does.
    await page.locator('#fx-gitops [data-ib-toggle="self-heal"]').check();
    await expect(r.sync).toHaveText(c.statusLabels.synced);
    await expect(r.explain).toHaveText(c.explanations['self-healed']);
    // Health never moved, whatever the sync machinery did.
    await expect(r.health).toHaveText(c.healthLabels.healthy);
  });

  test('prune toggle: deletion is explicit, never silent', async ({ page }) => {
    const c = GITOPS.copy.en;
    const r = gr(page);
    await page.locator('#fx-gitops [data-ib-scenario="git-deletion"]').click();
    await page.locator('#fx-gitops [data-ib-toggle="auto-sync"]').check();
    await expect(r.deletion).toHaveText(c.deletionLabels.kept);
    await expect(r.sync).toHaveText(c.statusLabels['out-of-sync']);
    await page.locator('#fx-gitops [data-ib-toggle="prune"]').check();
    await expect(r.deletion).toHaveText(c.deletionLabels.deleted);
    await expect(r.sync).toHaveText(c.statusLabels.synced);
  });

  test('rollback guard: enabled auto sync refuses history rollback', async ({ page }) => {
    const c = GITOPS.copy.en;
    const r = gr(page);
    await page.locator('#fx-gitops [data-ib-scenario="history-rollback"]').click();
    const rollback = page.locator('#fx-gitops [data-ib-rollback]');
    await expect(rollback).toBeEnabled();
    // Rollback applies while automation is off — but only temporarily.
    await rollback.click();
    await expect(r.version).toHaveText('2');
    await expect(r.sync).toHaveText(c.statusLabels['out-of-sync']);
    await expect(r.explain).toHaveText(c.explanations['rollback-temporary']);
    // Enable auto sync: the rollback is refused and the button locks.
    await page.locator('#fx-gitops [data-ib-toggle="auto-sync"]').check();
    await expect(rollback).toBeDisabled();
    await expect(r.version).toHaveText('3');
    await expect(r.explain).toHaveText(c.explanations['rollback-blocked']);
    // No history entry → no rollback at all.
    await page.locator('#fx-gitops [data-ib-scenario="git-revert"]').click();
    await expect(rollback).toBeDisabled();
  });
});

test.describe('reset, isolation and the untouched reference', () => {
  test('reset restores the exact default result', async ({ page }) => {
    await page.goto(`${fixtureBase}/effects-multi/`);
    await waitForEnhanced(page, '#fx-n8n');
    const r = readEffect(page, '#fx-n8n');
    const initial = [await r.actions.textContent(), await r.knowledge.textContent(), await r.next.textContent()];
    await page.locator('#fx-n8n [data-ib-crash][value="before-send"]').check();
    await page.locator('#fx-n8n [data-ib-scenario="key-provider"]').click();
    await page.locator('#fx-n8n [data-ib-reset]').click();
    await expect(r.actions).toHaveText(initial[0]!);
    await expect(r.knowledge).toHaveText(initial[1]!);
    await expect(r.next).toHaveText(initial[2]!);
    await expect(page.locator('#fx-n8n [data-ib-scenario="plain-provider"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('instances are isolated from each other', async ({ page }) => {
    await page.goto(`${fixtureBase}/effects-multi/`);
    await waitForEnhanced(page, '#fx-n8n');
    await waitForEnhanced(page, '#fx-lg');
    const lg = readEffect(page, '#fx-lg');
    const lgBefore = [await lg.actions.textContent(), await lg.knowledge.textContent()];
    await page.locator('#fx-n8n [data-ib-crash][value="before-send"]').check();
    expect([await lg.actions.textContent(), await lg.knowledge.textContent()]).toEqual(lgBefore);
    await page.locator('#fx-gitops [data-ib-toggle="auto-sync"]').check();
    expect([await lg.actions.textContent(), await lg.knowledge.textContent()]).toEqual(lgBefore);
  });

  test('the details reference keeps its open state across control changes', async ({ page }) => {
    await page.goto(`${fixtureBase}/effects-multi/`);
    await waitForEnhanced(page, '#fx-n8n');
    const details = page.locator('#fx-n8n details.ib-reference');
    await page.locator('#fx-n8n details.ib-reference > summary').click();
    await expect(details).toHaveAttribute('open', /.*/);
    await page.locator('#fx-n8n [data-ib-crash][value="after-recorded-receipt"]').check();
    await page.locator('#fx-n8n [data-ib-reset]').click();
    await expect(details).toHaveAttribute('open', /.*/);
    await expect(page.locator('#fx-n8n details.ib-reference table')).toBeVisible();
  });
});

test.describe('mobile, locale and no-JS', () => {
  test.use({ viewport: { width: 320, height: 720 } });

  test('320px: no document overflow, 44px touch targets, zh copy intact', async ({ page }) => {
    await page.goto(`${fixtureBase}/zh/effects-multi/`);
    await waitForEnhanced(page, '#fx-n8n');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const heights = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '#fx-n8n [data-ib-crash-group] .ib-er-opt, #fx-n8n [data-ib-strategy-group] .ib-er-opt,' +
            ' #fx-n8n [data-ib-scenarios] button, #fx-n8n [data-ib-reset],' +
            ' #fx-gitops [data-ib-toggles] .ib-er-opt, #fx-gitops [data-ib-actions-group] button,' +
            ' #fx-gitops [data-ib-scenarios] button'
        )
      ).map((el) => el.getBoundingClientRect().height)
    );
    expect(heights.length).toBeGreaterThan(8);
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(43.5);
    const zh = effectCopy(N8N, 'zh');
    await expect(page.locator('#fx-n8n [data-ib-knowledge]')).toHaveText(zh.knowledge['unknown']);
  });

  test('without JS the static result stays readable and controls stay invisible', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 720 } });
    const page = await context.newPage();
    await page.goto(`${fixtureBase}/effects-multi/`);
    await expect(page.locator('#fx-n8n [data-ib-actions]')).toHaveText('2');
    expect(
      await page.evaluate(() =>
        getComputedStyle(document.querySelector('#fx-n8n .ib-er-ctrl-slot .ib-er-opt')!).visibility
      )
    ).toBe('hidden');
    expect(
      await page.evaluate(() =>
        getComputedStyle(document.querySelector('#fx-n8n [data-ib-crash-group]')!).display
      )
    ).toBe('none');
    await page.locator('#fx-n8n details.ib-reference > summary').click();
    await expect(page.locator('#fx-n8n details.ib-reference table')).toBeVisible();
    await context.close();
  });
});

test.describe('real article pages', () => {
  test.skip(Boolean(process.env.EXPANSION_FIXTURE_ONLY), 'fixture-only harness run');

  test('the production articles enhance their assigned instances', async ({ page }) => {
    const errors = trackErrors(page);
    const instances: [string, string][] = [
      ['/zh/ai-agent/posts/agent-system-design-n8n/', '#n8n-side-effects'],
      ['/zh/projects/langgraph/', '#langgraph-fault-path'],
      ['/projects/langgraph/', '#langgraph-fault-path'],
      ['/zh/engineering/posts/argo-cd/', '#argocd-reconcile'],
      ['/engineering/posts/argo-cd/', '#argocd-reconcile'],
      ['/zh/ai-agent/posts/prompt-loop-engineering-practice/', '#verifier-loop'],
      ['/ai-agent/posts/prompt-loop-engineering-practice/', '#verifier-loop'],
    ];
    for (const [url, id] of instances) {
      await page.goto(url);
      await waitForEnhanced(page, id);
    }
    expect(errors).toEqual([]);
  });

  test('the zh n8n figure shows the t0–t5 duplicate by default', async ({ page }) => {
    await page.goto('/zh/ai-agent/posts/agent-system-design-n8n/');
    await waitForEnhanced(page, '#n8n-side-effects');
    await expect(page.locator('#n8n-side-effects [data-ib-actions]')).toHaveText('2');
    await expect(page.locator('#n8n-side-effects [data-ib-knowledge]')).toHaveText(
      effectCopy(N8N, 'zh').knowledge['unknown']
    );
  });
});

test('placement switches update timeline reading order, grid rows and hazard markers', async ({ page }) => {
  await page.goto('/effects-multi/');
  const root = page.locator('#fx-lg');
  await expect(root).toHaveAttribute('data-enhanced', /.+/);
  await root.locator('[data-ib-scenario="effect-after-approval"]').click();
  const keys = ['start', 'intent', 'interrupt', 'resume', 'send', 'commit', 'receipt', 'record', 'finish'];
  expect(await root.locator('[data-ib-step]').evaluateAll((steps) => steps.map((el) => el.getAttribute('data-ib-step')))).toEqual(keys);
  expect(await root.locator('[data-ib-step]').evaluateAll((steps) => steps.map((el) => (el as HTMLElement).style.gridRow))).toEqual(keys.map((_, i) => String(i + 1)));
  await expect(root.locator('.is-hazard')).toHaveCount(0);
  await expect(root.locator('[data-ib-selection]')).toContainText('Side effect after approval');
  await expect(root.locator('[data-ib-live]')).not.toHaveText('');
  await root.locator('[data-ib-reset]').click();
  await expect(root.locator('[data-ib-live]')).toHaveText('');
  await expect(root.locator('[data-ib-step="send"]')).toHaveClass(/is-hazard/);
  await expect(root.locator('[data-ib-step="send"]')).toHaveCSS('grid-row-start', '3');
});

test('script-free results identify their selected scenario, crash and recovery action', async ({ page }) => {
  await page.route('**/*.js', route => route.abort());
  await page.goto('/effects-multi/');
  for (const [id, spec] of [['fx-n8n', N8N], ['fx-lg', LANGGRAPH]] as const) {
    const root = page.locator(`#${id}`);
    const scenario = spec.scenarios.find((s: { id: string }) => s.id === spec.defaultScenario);
    const c = spec.copy.en;
    const summary = root.locator('[data-ib-selection]');
    await expect(summary).toBeVisible();
    for (const value of [c.scenarioLabels[scenario.id], c.crashOptions[scenario.defaultCrash], c.strategyOptions[scenario.defaultStrategy]]) {
      expect(await summary.ariaSnapshot()).toContain(value);
    }
    await expect(root).not.toHaveAttribute('data-enhanced', /.+/);
  }
});

test('reconnect failure restores static results and the open reference without dead controls', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/effects-multi/');
  for (const id of ['fx-lg', 'fx-gitops']) {
    const root = page.locator(`#${id}`);
    await expect(root).toHaveAttribute('data-enhanced', /.+/);
    const reference = root.locator('details.ib-reference');
    await reference.locator('summary').click();
    const markup = await reference.innerHTML();
    await root.evaluate(el => {
      const parent = el.parentElement!;
      el.remove();
      (el as HTMLElement & { _paint: () => void })._paint = () => { throw new Error('controlled reconnect failure'); };
      parent.append(el);
    });
    await expect(root).not.toHaveAttribute('data-enhanced', /.+/);
    await expect(root.locator('input:visible,button:visible')).toHaveCount(0);
    await expect(reference).toHaveAttribute('open', '');
    expect(await reference.innerHTML()).toBe(markup);
  }
  expect(errors).toEqual([]);
});
