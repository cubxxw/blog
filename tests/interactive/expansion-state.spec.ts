/**
 * expansion-state.spec.ts — GROUP state browser suite (session-tree,
 * session-scope, memory-lineage): actual semantics, failure fallback, reset,
 * multi-instance isolation and 320px mobile behaviour against the real
 * production-pipeline fixture build (both locale mounts). Every page is
 * served by the shared production fixture server; heavy output stays under
 * INTERACTIVE_ARTIFACT_DIR. Runs on Chromium, Firefox and WebKit.
 */
import { test, expect, type Page } from '@playwright/test';

// All suites share the production fixture server from the Playwright config.
const figures = (base = '') => `${base}/figures/`;
const isolation = () => '/isolation/';

async function trackErrors(page: Page): Promise<{ errors: string[] }> {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  return { errors };
}

/* ── session-tree semantics ─────────────────────────────────────────── */

test.describe('session-tree', () => {
  test('native branch selection has a name and preset changes announce the result', async ({ page }) => {
    await page.goto(figures());
    await expect(page.locator('#tree').getByRole('combobox', { name: 'Current active leaf' })).toHaveCount(1);
    for (const [id, scenario] of [['tree', 'root'], ['scope', 'main'], ['lineage', 'mixed-evidence']]) {
      const root = page.locator(`#${id}`);
      await root.locator(`[data-ib-scenario="${scenario}"]`).click();
      await expect(root.locator('[data-ib-live]')).not.toHaveText('');
      await root.locator('[data-ib-reset]').click();
      await expect(root.locator('[data-ib-live]')).toHaveText('');
    }
  });

  test('enhances swap-in-place and the reference stays untouched', async ({ page }) => {
    await page.goto(figures());
    const tree = page.locator('#tree');
    await expect(tree).toHaveAttribute('data-enhanced', 'session-tree');
    // Controls swapped into their slots; the reference is a plain <details>.
    await expect(tree.locator('[data-ib-select]')).toBeVisible();
    await expect(tree.locator('[data-ib-select-slot]')).toBeHidden();
    const details = tree.locator('details.ib-reference');
    await details.evaluate((el) => ((el as HTMLDetailsElement).open = true));
    const refBefore = await details.innerHTML();
    await tree.locator('[data-ib-scenario="root"]').click();
    await tree.locator('[data-ib-compaction]').click();
    expect(await details.innerHTML()).toBe(refBefore);
    await expect(details).toHaveJSProperty('open', true);
  });

  test('branch clicks update the visible ancestor path (text evidence)', async ({ page }) => {
    await page.goto(figures());
    const tree = page.locator('#tree');
    await expect(tree.locator('[data-ib-path]')).toHaveText(
      'root → user-a → assistant-a → user-c → assistant-c'
    );
    await tree.locator('[data-ib-node="user-b"] .ib-tree-hit').click();
    await expect(tree.locator('[data-ib-path]')).toHaveText('root → user-a → assistant-a → user-b');
    await expect(tree.locator('[data-ib-active-label]')).toHaveText('user-b');
    // Text evidence: the projection carries each entry's authored message.
    const kinds = tree.locator('[data-ib-projection] .ib-tree-entry-kind');
    await expect(kinds).toHaveCount(4);
    await expect(kinds.nth(3)).toHaveText('User message · user-b');
    await expect(tree.locator('[data-ib-projection] .ib-tree-entry-text').nth(3)).toContainText(
      'README'
    );
  });

  test('compaction folds the projection while the tree and workspace survive', async ({
    page,
  }) => {
    await page.goto(figures());
    const tree = page.locator('#tree');
    const workspace = tree.locator('[data-ib-workspace]');
    const wsBefore = await workspace.innerHTML();
    const nodesBefore = await tree.locator('[data-ib-node]').count();

    await tree.locator('[data-ib-scenario="compaction"]').click();
    const entries = tree.locator('[data-ib-projection] .ib-tree-entry');
    await expect(entries).toHaveCount(3); // compaction entry + user-b + assistant-b
    await expect(entries.nth(0)).toHaveClass(/ib-tree-entry--compaction/);
    await expect(tree.locator('[data-ib-projection-note]')).toContainText('compaction entry');
    // The complete tree is preserved and the snapshot never moves.
    expect(await tree.locator('[data-ib-node]').count()).toBe(nodesBefore);
    expect(await workspace.innerHTML()).toBe(wsBefore);

    // Unfolding returns the full five-entry path; the workspace STILL holds
    // BOTH later filesystem writes even when the old branch is restored.
    await tree.locator('[data-ib-compaction]').click();
    await expect(tree.locator('[data-ib-projection] .ib-tree-entry')).toHaveCount(5);
    await tree.locator('[data-ib-scenario="root"]').click();
    await expect(tree.locator('[data-ib-path]')).toHaveText('root');
    expect(await workspace.innerHTML()).toBe(wsBefore);
    await expect(workspace).toContainText('README.md');
    await expect(workspace).toContainText('notes/exp.md');
  });

  test('keyboard select drives the active leaf and announces politely', async ({ page }) => {
    await page.goto(figures());
    const tree = page.locator('#tree');
    await tree.locator('[data-ib-select]').selectOption('assistant-b');
    await expect(tree.locator('[data-ib-path]')).toHaveText(
      'root → user-a → assistant-a → user-b → assistant-b'
    );
    await expect(tree.locator('[data-ib-live]')).not.toHaveText('', { timeout: 2000 });
    // Reset restores the default case deterministically.
    await tree.locator('.ib-btn--reset').click();
    await expect(tree.locator('[data-ib-active-label]')).toHaveText('assistant-c');
  });
});

/* ── session-scope semantics ────────────────────────────────────────── */

test.describe('session-scope', () => {
  const keys = (page: Page) =>
    page
      .locator('#scope [data-ib-group-key]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-ib-group-key') || ''));

  test('per-channel-peer default reproduces the cross-account collision', async ({ page }) => {
    await page.goto(figures());
    await expect(page.locator('#scope')).toHaveAttribute('data-enhanced', 'session-scope');
    expect(await keys(page)).toEqual([
      'agent:support:telegram:direct:tg:12345',
      'agent:support:telegram:direct:tg:777',
      'agent:support:slack:direct:u222',
      'agent:support:slack:direct:u333',
    ]);
    // The two inboxes collide into one key: merging is visible text.
    const collided = page.locator('#scope [data-ib-group-key="agent:support:telegram:direct:tg:12345"]');
    await expect(collided.locator('[data-ib-msg]')).toHaveCount(2);
    await expect(collided.locator('[data-ib-reading]')).toContainText('merges several messages');
  });

  test('all four modes produce verifiable groupings with unique ids', async ({ page }) => {
    await page.goto(figures());
    const counts: Record<string, number> = {
      main: 1,
      'per-peer': 4,
      'per-channel-peer': 4,
      'per-account-channel-peer': 6,
    };
    for (const [mode, groupCount] of Object.entries(counts)) {
      await page.locator(`#scope [data-ib-scenario="${mode}"]`).click();
      await expect(page.locator('#scope [data-ib-group]')).toHaveCount(groupCount);
      const stats = await page.locator('#scope [data-ib-group]').evaluateAll((els) =>
        els.map((e) => ({
          id: e.getAttribute('data-ib-group'),
          msgs: e.querySelectorAll('[data-ib-msg]').length,
        }))
      );
      const ids = stats.map((s) => s.id);
      expect(new Set(ids).size, `${mode}: unique semantic group ids`).toBe(ids.length);
      const total = stats.reduce((a, s) => a + s.msgs, 0);
      expect(total, `${mode}: every message grouped exactly once`).toBe(6);
      // Text keys accompany the visual grouping, lowercased after resolution.
      for (const key of await keys(page)) {
        expect(key).toMatch(/^agent:support/);
        expect(key).toBe(key.toLowerCase());
      }
    }
    // Full separation: the account dimension decides.
    await page.locator('#scope [data-ib-scenario="per-account-channel-peer"]').click();
    expect(await keys(page)).toContain('agent:support:telegram:supporteu:direct:tg:12345');
    expect(await keys(page)).toContain('agent:support:telegram:supportus:direct:tg:12345');
  });

  test('identity-link case shows only the configured mapping', async ({ page }) => {
    await page.goto(figures());
    const panel = page.locator('#scope [data-ib-identity]');
    await expect(panel).toBeHidden();
    await page.locator('#scope [data-ib-scenario="identity-link"]').click();
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('tg:12345');
    await expect(panel).toContainText('alice');
    await expect(panel).toContainText('never identity verification');
    expect(await keys(page)).toContain('agent:support:direct:alice');
    // Raw dimensions stay verbatim next to the resolved canonical id.
    const first = page.locator('#scope [data-ib-msg="alice-eu-order"]');
    await expect(first).toContainText('telegram');
    await expect(first).toContainText('supporteu');
    await expect(first).toContainText('tg:12345');
  });
});

/* ── memory-lineage semantics ───────────────────────────────────────── */

test.describe('memory-lineage', () => {
  test('default deletion result shows every bucket exactly', async ({ page }) => {
    await page.goto(figures());
    await expect(page.locator('#lineage')).toHaveAttribute('data-enhanced', 'memory-lineage');
    const status = (id: string) => page.locator(`#lineage [data-ib-status="${id}"]`);
    await expect(status('source-quote')).toHaveClass(/is-removed/);
    await expect(status('source-travel')).toHaveClass(/is-kept/);
    await expect(status('pref-summary')).toHaveClass(/is-invalidated/);
    await expect(status('vector-index')).toHaveClass(/is-invalidated/);
    await expect(status('profile-nomad')).toHaveClass(/is-recompute/);
    await expect(status('rec-cache')).toHaveClass(/is-recompute/);
    await expect(status('chat-summary')).toHaveClass(/is-unproven/);
    await expect(status('provider-cache')).toHaveClass(/is-unproven/);
    await expect(status('offline-backup')).toHaveClass(/is-unproven/);
    for (const [key, n] of Object.entries({
      removed: 1,
      invalidated: 2,
      recompute: 2,
      unproven: 3,
    })) {
      await expect(page.locator(`#lineage [data-ib-count="${key}"]`)).toHaveText(String(n));
    }
    // Invalidation is never rendered as verified physical deletion.
    await expect(page.locator('#lineage .ib-note').first()).toContainText(
      'not verified physical deletion'
    );
  });

  test('selective source removal recomputes mixed evidence and the boundary', async ({ page }) => {
    await page.goto(figures());
    // Selective removal: drop the travel quote's deletion and cover only
    // source-quote… then flip to covering ONLY the travel quote (the
    // mixed-evidence case: profile-nomad keeps s1 evidence → recompute).
    await page.locator('#lineage [data-ib-source="source-quote"]').click(); // uncheck
    await expect(page.locator('#lineage [data-ib-source="source-quote"]')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    await page.locator('#lineage [data-ib-source="source-travel"]').click(); // check
    await expect(page.locator('#lineage [data-ib-status="pref-summary"]')).toHaveClass(/is-kept/);
    await expect(page.locator('#lineage [data-ib-status="profile-nomad"]')).toHaveClass(
      /is-recompute/
    );
    await expect(page.locator('#lineage [data-ib-count="recompute"]')).toHaveText('2');
    // Deleting BOTH sources still cannot prove erasure past the boundary.
    await page.locator('#lineage [data-ib-scenario="partial-lineage"]').click();
    await expect(page.locator('#lineage [data-ib-status="chat-summary"]')).toHaveClass(
      /is-unproven/
    );
    await expect(page.locator('#lineage [data-ib-count="unproven"]')).toHaveText('3');
    // Reset restores the default covered sources.
    await page.locator('#lineage .ib-btn--reset').click();
    await expect(page.locator('#lineage [data-ib-count="removed"]')).toHaveText('1');
    await expect(page.locator('#lineage [data-ib-count="invalidated"]')).toHaveText('2');
  });
});

/* ── fallback + isolation ───────────────────────────────────────────── */

test.describe('fallback and isolation', () => {
  test('runtime-invalid config never enhances; healthy siblings do', async ({ page }) => {
    const tracked = await trackErrors(page);
    await page.goto(isolation());
    await expect(page.locator('#tree-broken')).not.toHaveAttribute('data-enhanced', /./);
    await expect(page.locator('#tree-broken [data-ib-select]')).toBeHidden();
    // The static slot is visibility:hidden by design (it reserves geometry):
    // it must NOT be [hidden] and must carry the SSR label text.
    await expect(page.locator('#tree-broken [data-ib-select-slot]')).not.toHaveAttribute(
      'hidden',
      /./
    );
    await expect(page.locator('#tree-broken [data-ib-select-slot]')).toHaveText('not-a-node');
    await expect(page.locator('#tree-broken details.ib-reference')).toHaveCount(1);
    await expect(page.locator('#tree-a')).toHaveAttribute('data-enhanced', 'session-tree');
    await expect(page.locator('#tree-b')).toHaveAttribute('data-enhanced', 'session-tree');
    await expect(page.locator('#scope-a')).toHaveAttribute('data-enhanced', 'session-scope');
    await expect(page.locator('#lineage-a')).toHaveAttribute('data-enhanced', 'memory-lineage');
    expect(tracked.errors).toEqual([]);
  });

  test('component script 404 leaves a dead-control-free static view', async ({ page }) => {
    await page.route('**/components/session-tree*', (route) => route.abort());
    await page.goto(figures());
    await expect(page.locator('#tree')).not.toHaveAttribute('data-enhanced', /./);
    await expect(page.locator('#tree [data-ib-select]')).toBeHidden();
    await expect(page.locator('#tree [data-ib-scenarios]')).toBeHidden();
    await expect(page.locator('#tree [data-ib-compaction]')).toBeHidden();
    await expect(page.locator('#tree [data-ib-projection] .ib-tree-entry').first()).toBeVisible();
    // The sibling kinds still enhance on the same page.
    await expect(page.locator('#scope')).toHaveAttribute('data-enhanced', 'session-scope');
    await expect(page.locator('#lineage')).toHaveAttribute('data-enhanced', 'memory-lineage');
  });

  test('corrupt embedded config falls back without harming siblings', async ({ page }) => {
    const tracked = await trackErrors(page);
    await page.goto('/figures-corrupt/');
    await expect(page.locator('#tree')).not.toHaveAttribute('data-enhanced', /./);
    await expect(page.locator('#tree [data-ib-select]')).toBeHidden();
    await expect(page.locator('#scope')).toHaveAttribute('data-enhanced', 'session-scope');
    await expect(page.locator('#lineage')).toHaveAttribute('data-enhanced', 'memory-lineage');
    expect(tracked.errors).toEqual([]);
  });

  test('instances stay isolated and listeners clean up on reconnect', async ({ page }) => {
    await page.goto(isolation());
    await page.locator('#tree-a [data-ib-select]').selectOption('root');
    await expect(page.locator('#tree-a [data-ib-path]')).toHaveText('root');
    await expect(page.locator('#tree-b [data-ib-path]')).toHaveText(
      'root → user-a → assistant-a → user-c → assistant-c'
    );
    // Remove and re-insert the SAME element: listeners rebind once (one
    // click = one action) and this DOM instance's state survives.
    await page.locator('#tree-a').evaluate((el) => {
      const parent = el.parentNode;
      const next = el.nextSibling;
      el.remove();
      parent?.insertBefore(el, next);
    });
    const moved = page.locator('#tree-a');
    await expect(moved.locator('[data-ib-path]')).toHaveText('root');
    await moved.locator('[data-ib-compaction]').click();
    await expect(moved.locator('[data-ib-compaction]')).toHaveAttribute('aria-pressed', 'true');
    await moved.locator('[data-ib-compaction]').click();
    await expect(moved.locator('[data-ib-compaction]')).toHaveAttribute('aria-pressed', 'false');
  });

  test('a reconnect render failure restores readable SSR and hides controls', async ({ page }) => {
    const tracked = await trackErrors(page);
    await page.goto(figures());
    for (const id of ['tree', 'scope', 'lineage']) {
      const root = page.locator(`#${id}`);
      await expect(root).toHaveAttribute('data-enhanced', /./);
      const reference = root.locator('details.ib-reference');
      await reference.locator('summary').click();
      const markup = await reference.innerHTML();
      await root.evaluate((el) => {
        const component = el as HTMLElement & { _render(): void };
        const parent = el.parentNode!;
        const next = el.nextSibling;
        el.remove();
        component._render = () => { throw new Error('test: reconnect render failure'); };
        parent.insertBefore(el, next);
      });
      await expect(root).not.toHaveAttribute('data-enhanced', /./);
      await expect(root.locator('button:visible, input:visible, select:visible')).toHaveCount(0);
      await expect(reference).toHaveJSProperty('open', true);
      expect(await reference.innerHTML()).toBe(markup);
    }
    expect(tracked.errors).toEqual([]);
  });
});

/* ── zh locale + 320px mobile ───────────────────────────────────────── */

test.describe('locale and mobile', () => {
  test('zh mount renders zh copy and enhances with zh chrome', async ({ page }) => {
    await page.goto(figures('/zh'));
    const tree = page.locator('#tree');
    await expect(tree).toHaveAttribute('data-enhanced', 'session-tree');
    await expect(tree.locator('.ib-title')).toHaveText('Session tree：历史、模型视图与工作区');
    await expect(tree.locator('.ib-btn--reset')).toHaveText('重置');
    await tree.locator('[data-ib-scenario="compaction"]').click();
    await expect(tree.locator('[data-ib-projection-note]')).toContainText('压缩投影');
    await expect(page.locator('#scope [data-ib-scenario="identity-link"]')).toHaveText(
      'identityLinks 合并示例'
    );
  });

  test('320px: no page overflow, 44px controls, interaction works', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(figures());
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const sizes = await page
      .locator(
        '#tree .ib-scn, #tree .ib-btn--reset, #tree [data-ib-compaction], #tree [data-ib-select]'
      )
      .evaluateAll((els) => els.map((e) => (e as HTMLElement).getBoundingClientRect().height));
    expect(sizes.length).toBeGreaterThan(0);
    for (const h of sizes) expect(h).toBeGreaterThanOrEqual(44);
    await page.locator('#lineage [data-ib-scenario="mixed-evidence"]').click();
    await expect(page.locator('#lineage [data-ib-status="profile-nomad"]')).toHaveClass(
      /is-recompute/
    );
  });
});

/* ── both locales: SSR parity with the pure model ───────────────────── */

test('SSR default result equals the pure model in both locales', async ({ page }) => {
  await page.route('**/js/components/*', (route) => route.abort());
  for (const base of ['', '/zh']) {
    await page.goto(figures(base));
    const counts = await page.locator('#lineage [data-ib-count]').evaluateAll((els) =>
      els.map((e) => `${e.getAttribute('data-ib-count')}:${(e.textContent || '').trim()}`)
    );
    expect(counts).toContain('removed:1');
    expect(counts).toContain('invalidated:2');
    expect(counts).toContain('recompute:2');
    expect(counts).toContain('unproven:3');
    expect(counts).toContain('kept:1');
    // The independent workspace snapshot is complete in both locales.
    await expect(page.locator('#tree [data-ib-workspace]')).toContainText('README.md');
    await expect(page.locator('#tree [data-ib-workspace]')).toContainText('notes/exp.md');
  }
});
