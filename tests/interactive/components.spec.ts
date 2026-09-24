import { test, expect, Page } from '@playwright/test';
import { instrumentation, shotPath as artifactShot } from './test-support';

function shotPath(name: string) {
  return artifactShot(name, test.info().project.name);
}

/**
 * Cross-engine component behaviour suite for issue #389. Runs against the
 * PRODUCTION Hugo output plus fixtures kept outside content/ (see
 * scripts/serve-interactive-fixtures.mjs). Covers the acceptance matrix
 * categories: one current scenario/step, exact arithmetic and fixed-capacity
 * geometry, finite playback, hidden/offscreen/reduced-motion pause,
 * remove/reconnect cleanup (incl. the MediaQueryList regression), data and
 * script failure fallback, offline zero requests/storage, malicious text
 * inertia, multi-instance isolation, keyboard access and print.
 */

const MULTI = '/multi/';
const SAFETY = '/safety/';
const SAFETY_ZH = '/zh/safety/';
const CORRUPT = '/multi-corrupt/';
const AGENT_CORRUPT = '/agent-corrupt/';
const LANG_INVALID = '/lang-invalid/';

/**
 * Storage-class write recording lives in ./test-support (shared with the
 * article suite) so the components provably write NOTHING — unknown ambient
 * writes fail the tests instead of being filtered away.
 */
const STORAGE_INSTRUMENTATION = instrumentation;

async function waitForEnhanced(page: Page, selector: string) {
  await page.locator(`${selector}[data-enhanced]`).first().waitFor({ state: 'attached' });
}

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    // One documented preexisting site-embed quirk: the utterances comments
    // widget posts a cross-origin postMessage that Firefox/WebKit log as a
    // console error. Not component behaviour; nothing else is filtered.
    if (msg.type() === 'error' && !/utteranc/i.test(msg.text())) {
      errors.push(`console.error: ${msg.text()}`);
    }
  });
  return errors;
}

test.describe('upgrade stability', () => {
  test('swaps controls into same-sized slots with zero geometry change', async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const held: string[] = [];
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (route.request().resourceType() === 'script' && /components\/(context-budget|agent-loop)/.test(url)) {
        held.push(url);
        await gate;
      }
      await route.continue();
    });
    await page.goto(MULTI, { waitUntil: 'commit' });
    const root = page.locator('#ctx-a');
    await root.waitFor({ state: 'visible' });
    expect(await root.getAttribute('data-enhanced')).toBeNull();
    // Measure only after stylesheets and fonts are applied (before that the
    // boxes are unstyled and would fake a layout shift).
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll('link[rel=stylesheet]')).every((l) => (l as HTMLLinkElement).sheet)
    );
    await page.evaluate(() =>
      Promise.race([
        Promise.resolve(document.fonts.ready).then(() => undefined),
        new Promise((r) => setTimeout(r, 2000)),
      ])
    );
    await page.waitForFunction(() => {
      const el = document.querySelector('#ctx-a [data-ib-head-slot]');
      return el ? getComputedStyle(el).visibility === 'hidden' : false;
    });
    const rootBefore = (await root.boundingBox())!;
    const slotBefore = (await root.locator('[data-ib-head-slot]').boundingBox())!;
    expect(held.length, 'component ESM must be interceptable').toBeGreaterThan(0);
    release();
    await waitForEnhanced(page, '#ctx-a');
    await page.waitForTimeout(150);
    const rootAfter = (await root.boundingBox())!;
    const slotAfter = (await root.locator('[data-ib-reset]').boundingBox())!;
    expect(Math.abs(rootAfter.height - rootBefore.height)).toBeLessThanOrEqual(2);
    expect(Math.abs(rootAfter.width - rootBefore.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(slotAfter.height - slotBefore.height)).toBeLessThanOrEqual(2);
    expect(Math.abs(slotAfter.width - slotBefore.width)).toBeLessThanOrEqual(2);
  });

  test('read-only details reference keeps its open state across upgrade', async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    await page.route('**/*', async (route) => {
      if (route.request().resourceType() === 'script' && /components\//.test(route.request().url())) {
        await gate;
      }
      await route.continue();
    });
    await page.goto(MULTI, { waitUntil: 'commit' });
    const details = page.locator('#ctx-a details.ib-reference');
    await page.locator('#ctx-a details.ib-reference > summary').click();
    await expect(details).toHaveAttribute('open', /.*/);
    release();
    await waitForEnhanced(page, '#ctx-a');
    await expect(details).toHaveAttribute('open', /.*/);
    await expect(page.locator('#ctx-a details.ib-reference table')).toBeVisible();
  });
});

test.describe('context-budget behaviour', () => {
  test('one current scenario in SSR, after enhancement, on switch and on reset', async ({ page }) => {
    await page.goto(MULTI);
    await waitForEnhanced(page, '#ctx-a');
    const root = page.locator('#ctx-a');
    // SSR/initial: defaultScenario tool-heavy is the only visible stage panel.
    await expect(root.locator('[data-ib-panel="tool-heavy"]')).toBeVisible();
    await expect(root.locator('[data-ib-panel="compact"]')).toBeHidden();
    await expect(root.locator('[data-ib-panel="long-history"]')).toBeHidden();
    await expect(root.locator('[data-ib-scenario="tool-heavy"]')).toHaveAttribute('aria-pressed', 'true');

    // Switch: exactly one visible stage, selected scenario's initial values.
    await root.locator('[data-ib-scenario="compact"]').click();
    await expect(root.locator('[data-ib-panel="compact"]')).toBeVisible();
    await expect(root.locator('[data-ib-panel="tool-heavy"]')).toBeHidden();
    await expect(root.locator('[data-ib-panel="long-history"]')).toBeHidden();
    await expect(root.locator('[data-ib-panel="compact"] [data-ib-metric="used"]')).toHaveText('16');

    // Slider edits stay per instance and switching back restores initial values.
    await root.locator('[data-ib-panel="compact"] [data-ib-range]').evaluate((el: HTMLInputElement) => {
      el.value = '20';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(root.locator('[data-ib-panel="compact"] [data-ib-metric="used"]')).toHaveText('32');
    await root.locator('[data-ib-scenario="tool-heavy"]').click();
    await root.locator('[data-ib-scenario="compact"]').click();
    await expect(root.locator('[data-ib-panel="compact"] [data-ib-range]')).toHaveValue('4');
    await expect(root.locator('[data-ib-panel="compact"] [data-ib-metric="used"]')).toHaveText('16');

    // Reset: defaultScenario and its values, one visible stage.
    await root.locator('[data-ib-reset]').click();
    await expect(root.locator('[data-ib-panel="tool-heavy"]')).toBeVisible();
    await expect(root.locator('[data-ib-panel="compact"]')).toBeHidden();
    await expect(root.locator('[data-ib-panel="tool-heavy"] [data-ib-range]')).toHaveValue('32');
    await expect(root.locator('[data-ib-panel="tool-heavy"] [data-ib-metric="used"]')).toHaveText('56');
  });

  test('exact arithmetic and fixed-capacity geometry at slider extremes', async ({ page }) => {
    await page.goto(MULTI);
    await waitForEnhanced(page, '#ctx-a');
    const panel = page.locator('#ctx-a [data-ib-panel="tool-heavy"]');
    const range = panel.locator('[data-ib-range]');
    const setTools = (v: number) =>
      range.evaluate((el: HTMLInputElement, value: number) => {
        el.value = String(value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, v);

    const bar = panel.locator('[data-ib-bar]');
    const barBox = (await bar.boundingBox())!;

    // tools=48 → used 72 / remaining 0 / overflow 8 (issue §6A exact values)
    await setTools(48);
    await expect(panel.locator('[data-ib-metric="used"]')).toHaveText('72');
    await expect(panel.locator('[data-ib-metric="remaining"]')).toHaveText('0');
    await expect(panel.locator('[data-ib-metric="overflow"]')).toHaveText('8');
    await expect(panel.locator('[data-ib-overbar]')).toBeVisible();
    // Fixed capacity reference: tools segment is 48/64 = 75% of the bar and
    // the overflow band is 8/64 = 12.5% of the same scale (never renormalised).
    const toolsBox = (await panel.locator('[data-ib-seg="tools"]').boundingBox())!;
    const overBox = (await panel.locator('[data-ib-overbar]').boundingBox())!;
    expect(Math.abs(toolsBox.width - barBox.width * 0.75)).toBeLessThanOrEqual(2);
    expect(Math.abs(overBox.width - barBox.width * 0.125)).toBeLessThanOrEqual(2);
    const historyBox = (await panel.locator('[data-ib-seg="history"]').boundingBox())!;
    expect(Math.abs(historyBox.width - barBox.width * (20 / 64))).toBeLessThanOrEqual(2);

    // tools=40 → used 64 / remaining 0 / overflow 0, band hidden
    await setTools(40);
    await expect(panel.locator('[data-ib-metric="used"]')).toHaveText('64');
    await expect(panel.locator('[data-ib-metric="overflow"]')).toHaveText('0');
    await expect(panel.locator('[data-ib-overbar]')).toBeHidden();

    // tools=0 → used 24 / remaining 40 / overflow 0
    await setTools(0);
    await expect(panel.locator('[data-ib-metric="used"]')).toHaveText('24');
    await expect(panel.locator('[data-ib-metric="remaining"]')).toHaveText('40');

    // tools=32 → used 56 / remaining 8 / overflow 0 (issue §6A default)
    await setTools(32);
    await expect(panel.locator('[data-ib-metric="used"]')).toHaveText('56');
    await expect(panel.locator('[data-ib-metric="remaining"]')).toHaveText('8');
  });

  test('multi-instance isolation: ctx-a edits never touch ctx-b', async ({ page }) => {
    await page.goto(MULTI);
    await waitForEnhanced(page, '#ctx-a');
    await waitForEnhanced(page, '#ctx-b');
    await page.locator('#ctx-a [data-ib-panel="tool-heavy"] [data-ib-range]').evaluate((el: HTMLInputElement) => {
      el.value = '48';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#ctx-a [data-ib-panel="tool-heavy"] [data-ib-metric="used"]')).toHaveText('72');
    await expect(page.locator('#ctx-b [data-ib-panel="tool-heavy"] [data-ib-metric="used"]')).toHaveText('56');
    await page.locator('#ctx-b [data-ib-reset]').click();
    await expect(page.locator('#ctx-a [data-ib-panel="tool-heavy"] [data-ib-metric="used"]')).toHaveText('72');
    // derived ARIA ids must not collide across same-kind instances
    const ids = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[id]')).map((e) => (e as HTMLElement).id)
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

test.describe('agent-loop behaviour', () => {
  test('one current event, finite stepping and terminal playback stop', async ({ page }) => {
    await page.goto(MULTI);
    await waitForEnhanced(page, '#loop-a');
    const root = page.locator('#loop-a');
    await expect(root.locator('[data-ib-current]')).toHaveCount(1);
    await expect(root.locator('[data-ib-counter]')).toHaveText('1 / 7');
    await expect(root.locator('[data-ib-prev]')).toBeDisabled();
    await expect(root.locator('[data-ib-current-text]')).toContainText('Files need deleting');

    await root.locator('[data-ib-next]').click();
    await expect(root.locator('[data-ib-counter]')).toHaveText('2 / 7');

    // Fast-forward to the end: Next becomes disabled at the last event.
    for (let i = 0; i < 10; i += 1) {
      if (await root.locator('[data-ib-next]').isDisabled()) break;
      await root.locator('[data-ib-next]').click();
    }
    await expect(root.locator('[data-ib-counter]')).toHaveText('7 / 7');
    await expect(root.locator('[data-ib-next]')).toBeDisabled();
    await expect(root.locator('[data-ib-current-text]')).toContainText('Stop reason');

    // Playback to the end stops with the Play label restored and no
    // trailing playback timer moving anything afterwards.
    await root.locator('[data-ib-reset]').click();
    await root.locator('[data-ib-play]').click();
    await expect(root.locator('[data-ib-play]')).toHaveText(/暂停|Pause/);
    await expect(root.locator('[data-ib-counter]')).toHaveText('7 / 7', { timeout: 15_000 });
    await expect(root.locator('[data-ib-play]')).toHaveText(/播放|Play/);
    await page.waitForTimeout(1500);
    await expect(root.locator('[data-ib-counter]')).toHaveText('7 / 7');
    await expect(root.locator('[data-ib-play]')).toHaveText(/播放|Play/);
  });

  test('switching scenarios during playback stops the timer and resets position', async ({ page }) => {
    await page.goto(MULTI);
    await waitForEnhanced(page, '#loop-a');
    const root = page.locator('#loop-a');
    await root.locator('[data-ib-play]').click();
    await expect(root.locator('[data-ib-counter]')).toHaveText(/\/ 7/);
    await root.locator('[data-ib-scenario="budget"]').click();
    await expect(root.locator('[data-ib-counter]')).toHaveText('1 / 8');
    await expect(root.locator('[data-ib-play]')).toHaveText(/播放|Play/);
    const seen = await root.locator('[data-ib-counter]').textContent();
    await page.waitForTimeout(1500);
    await expect(root.locator('[data-ib-counter]').first()).toHaveText(seen!.trim());
  });

  test('pauses when hidden or offscreen and never auto-resumes', async ({ page }) => {
    await page.goto(MULTI);
    await waitForEnhanced(page, '#loop-a');
    const root = page.locator('#loop-a');
    await root.scrollIntoViewIfNeeded();
    await root.locator('[data-ib-play]').click();
    await expect(root.locator('[data-ib-play]')).toHaveText(/暂停|Pause/);

    // Offscreen: pause; returning does NOT auto-resume.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(root.locator('[data-ib-play]')).toHaveText(/播放|Play/, { timeout: 5000 });
    const pausedCounter = (await root.locator('[data-ib-counter]').textContent())!.trim();
    await root.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    await expect(root.locator('[data-ib-play]')).toHaveText(/播放|Play/);
    await expect(root.locator('[data-ib-counter]').first()).toHaveText(pausedCounter);

    // Page hidden: pause.
    await root.locator('[data-ib-play]').click();
    await expect(root.locator('[data-ib-play]')).toHaveText(/暂停|Pause/);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(root.locator('[data-ib-play]')).toHaveText(/播放|Play/);
  });

  test('reduced-motion disables autoplay; live changes apply, also after reconnect (regression)', async ({ page }) => {
    await page.goto(MULTI);
    await waitForEnhanced(page, '#loop-a');
    const root = page.locator('#loop-a');

    // Live preference change mid-session: playback stops, play disabled,
    // manual stepping keeps working (Reset first for a deterministic index).
    await root.locator('[data-ib-play]').click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(root.locator('[data-ib-play]')).toBeDisabled();
    await expect(root.locator('[data-ib-play]')).toHaveText(/播放|Play/);
    await root.locator('[data-ib-reset]').click();
    await root.locator('[data-ib-next]').click();
    await expect(root.locator('[data-ib-counter]')).toHaveText('2 / 7');

    // Regression: remove + re-insert, THEN change the preference — the
    // MediaQueryList observer must be re-created on reconnect.
    await page.evaluate(() => {
      const el = document.querySelector('#loop-a')!;
      el.remove();
      document.body.prepend(el);
    });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(root.locator('[data-ib-play]')).toBeDisabled();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(root.locator('[data-ib-play]')).toBeEnabled();
  });

  test('remove/reconnect: stays paused, correct labels, single event binding', async ({ page }) => {
    await page.goto(MULTI);
    await waitForEnhanced(page, '#loop-a');
    const root = page.locator('#loop-a');
    await root.locator('[data-ib-play]').click();
    await expect(root.locator('[data-ib-play]')).toHaveText(/暂停|Pause/);
    // Capture the counter in the SAME tick as the removal (atomic) so a
    // parallel-load playback tick cannot race the comparison.
    const counter = await page.evaluate(() => {
      const el = document.querySelector('#loop-a')!;
      const c = (el.querySelector('[data-ib-counter]') as HTMLElement).textContent!.trim();
      el.remove();
      document.body.prepend(el);
      return c;
    });
    // Reconnect: paused, Play label restored (no stale Pause), state kept.
    await expect(root.locator('[data-ib-play]')).toHaveText(/播放|Play/);
    await expect(root.locator('[data-ib-counter]')).toHaveText(counter);
    await page.waitForTimeout(1200);
    await expect(root.locator('[data-ib-counter]')).toHaveText(counter);

    // No double binding: one click advances exactly one step.
    await root.locator('[data-ib-next]').click();
    await expect(root.locator('[data-ib-counter]')).toHaveText('2 / 7');
  });
});

test.describe('failure fallback', () => {
  test('blocked component script keeps the complete static view', async ({ page }) => {
    await page.route('**/*', async (route) => {
      if (route.request().resourceType() === 'script' && /components\//.test(route.request().url())) {
        await route.abort();
        return;
      }
      await route.continue();
    });
    await page.goto(MULTI);
    await page.waitForTimeout(500);
    const root = page.locator('#ctx-a');
    expect(await root.getAttribute('data-enhanced')).toBeNull();
    // Static default result and complete reference stay readable.
    await expect(root.locator('[data-ib-panel="tool-heavy"] [data-ib-metric="used"]')).toHaveText('56');
    await expect(root.locator('details.ib-reference > summary')).toBeVisible();
    // No runtime control is visible or focusable.
    await expect(root.locator('[data-ib-scenarios]')).toBeHidden();
    await expect(root.locator('[data-ib-reset]')).toBeHidden();
    await expect(root.locator('[data-ib-panel="tool-heavy"] [data-ib-range]')).toBeHidden();
  });

  test('corrupt embedded config falls back safely without page errors', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(CORRUPT);
    await page.waitForTimeout(500);
    const root = page.locator('#ctx-a');
    expect(await root.getAttribute('data-enhanced')).toBeNull();
    await expect(root.locator('[data-ib-panel="tool-heavy"] [data-ib-metric="used"]')).toHaveText('56');
    await expect(root.locator('details.ib-reference > summary')).toBeVisible();
    await expect(root.locator('[data-ib-scenarios]')).toBeHidden();
    // The intact instances on the same page still enhance (isolation), and
    // the broken instance never exposes stray runtime controls or steps.
    await expect(page.locator('#loop-a[data-enhanced]')).toBeAttached();
    await expect(page.locator('#ctx-b[data-enhanced]')).toBeAttached();
    await expect(page.locator('#ctx-broken')).not.toHaveAttribute('data-enhanced', /.*/);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('runtime-invalid config (zero toolStep) never enhances or shows NaN', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(MULTI);
    await page.waitForTimeout(400);
    const broken = page.locator('#ctx-broken');
    expect(await broken.getAttribute('data-enhanced')).toBeNull();
    await expect(broken.locator('[data-ib-scenarios]')).toBeHidden();
    await expect(broken.locator('[data-ib-panel] [data-ib-metric="used"]').first()).toHaveText('16');
    await expect(page.locator('body')).not.toContainText('NaN');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('HTTP 404 on either component script keeps the static view (both kinds)', async ({ page }) => {
    await page.route('**/*', async (route) => {
      if (route.request().resourceType() === 'script' && /components\//.test(route.request().url())) {
        await route.fulfill({ status: 404, body: 'not found' });
        return;
      }
      await route.continue();
    });
    await page.goto(MULTI);
    await page.waitForTimeout(500);
    for (const id of ['#ctx-a', '#ctx-b', '#loop-a']) {
      const root = page.locator(id);
      expect(await root.getAttribute('data-enhanced')).toBeNull();
      await expect(root.locator('[data-ib-scenarios]')).toBeHidden();
    }
    await expect(page.locator('#ctx-a [data-ib-panel="tool-heavy"] [data-ib-metric="used"]')).toHaveText('56');
    await expect(page.locator('#loop-a [data-ib-current-text]')).toContainText('Files need deleting');
    await expect(page.locator('#loop-a details.ib-reference > summary')).toBeVisible();
  });

  test('duplicate module import never double-registers or double-binds', async ({ page }) => {
    await page.goto(MULTI);
    await waitForEnhanced(page, '#loop-a');
    await waitForEnhanced(page, '#ctx-a');
    // Import both ESM entries twice more via their real URLs: the
    // customElements.get guard must make this a no-op.
    const urls = await page.evaluate(() =>
      Array.from(document.querySelectorAll('script[type="module"][src*="components/"]')).map(
        (s) => (s as HTMLScriptElement).src
      )
    );
    expect(urls.length).toBe(2);
    await page.evaluate(async (srcs) => {
      for (const src of srcs) {
        await import(src);
        await import(src);
      }
    }, urls);
    // One click still advances exactly one step (no duplicate listeners).
    await page.locator('#loop-a [data-ib-next]').click();
    await expect(page.locator('#loop-a [data-ib-counter]')).toHaveText('2 / 7');
    await page.locator('#ctx-a [data-ib-panel="tool-heavy"] [data-ib-range]').evaluate((el: HTMLInputElement) => {
      el.value = '48';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#ctx-a [data-ib-panel="tool-heavy"] [data-ib-metric="used"]')).toHaveText('72');
  });

  test('malformed agent config falls back while the context sibling enhances', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(AGENT_CORRUPT);
    await page.waitForTimeout(500);
    const loop = page.locator('#loop-a');
    expect(await loop.getAttribute('data-enhanced')).toBeNull();
    await expect(loop.locator('[data-ib-current-text]')).toContainText('Files need deleting');
    await expect(loop.locator('details.ib-reference > summary')).toBeVisible();
    await expect(loop.locator('[data-ib-scenarios]')).toBeHidden();
    await expect(loop.locator('[data-ib-prev]')).toBeHidden();
    await expect(page.locator('#ctx-a[data-enhanced]')).toBeAttached();
    await expect(page.locator('#ctx-b[data-enhanced]')).toBeAttached();
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('unsupported and missing config.lang are rejected before enhancement', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(LANG_INVALID);
    await page.waitForTimeout(500);
    // ctx-a carries lang:"fr": no enhancement, original zh SSR preserved.
    const ctx = page.locator('#ctx-a');
    expect(await ctx.getAttribute('data-enhanced')).toBeNull();
    await expect(ctx.locator('.ib-title')).toHaveText('上下文预算实验');
    await expect(ctx.locator('[data-ib-panel="tool-heavy"] [data-ib-metric="used"]')).toHaveText('56');
    await expect(ctx.locator('[data-ib-scenarios]')).toBeHidden();
    // loop-a carries a missing lang: same rejection, zh content intact.
    const loop = page.locator('#loop-a');
    expect(await loop.getAttribute('data-enhanced')).toBeNull();
    await expect(loop.locator('[data-ib-current-text]')).toContainText('要删文件');
    await expect(loop.locator('[data-ib-scenarios]')).toBeHidden();
    // Healthy sibling on the same page still enhances.
    await expect(page.locator('#ctx-b[data-enhanced]')).toBeAttached();
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('agent update failure restores the trusted SSR card and node strip', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(MULTI);
    await waitForEnhanced(page, '#loop-a');
    const root = page.locator('#loop-a');
    const details = root.locator('details.ib-reference');
    await root.locator('details.ib-reference > summary').click();
    await expect(details).toHaveAttribute('open', /.*/);
    // Fault injection: a one-shot exception from the current-text setter in
    // the middle of the first Next update (runtime review repro).
    await page.evaluate(() => {
      const el = document.querySelector('#loop-a [data-ib-current-text]')!;
      const descriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent')!;
      let fail = true;
      Object.defineProperty(el, 'textContent', {
        configurable: true,
        get(this: Node) {
          return descriptor.get!.call(this);
        },
        set(this: Node, value: string) {
          if (fail) {
            fail = false;
            throw new Error('one-shot current-text update failure');
          }
          descriptor.set!.call(this, value);
        },
      });
    });
    await root.locator('[data-ib-next]').click();
    await page.waitForTimeout(200);
    // Fallback: no enhancement, controls hidden …
    expect(await root.getAttribute('data-enhanced')).toBeNull();
    await expect(root.locator('[data-ib-scenarios]')).toBeHidden();
    await expect(root.locator('[data-ib-prev]')).toBeHidden();
    // … and the card is the ORIGINAL SSR card again (not event 2's tool/tag
    // mixed with event 1's text), including its scenario name.
    await expect(root.locator('[data-ib-current]')).toHaveAttribute('aria-label', 'Success');
    await expect(root.locator('[data-ib-current-kind]')).toHaveText('Decision note');
    await expect(root.locator('[data-ib-current-text]')).toContainText('Files need deleting');
    await expect(root.locator('[data-ib-current-tool]')).toBeHidden();
    await expect(root.locator('[data-ib-node="decision"]')).toHaveClass(/is-active/);
    await expect(root.locator('[data-ib-node="tool"]')).not.toHaveClass(/is-active/);
    // The reader's details open state survives.
    await expect(details).toHaveAttribute('open', /.*/);
    expect(errors.filter((e) => e.startsWith('pageerror')), errors.join('\n')).toEqual([]);
  });

  test('context update failure restores the default panel readout', async ({ page }) => {
    await page.goto(MULTI);
    await waitForEnhanced(page, '#ctx-a');
    const panel = page.locator('#ctx-a [data-ib-panel="tool-heavy"]');
    await page.evaluate(() => {
      const el = document.querySelector('#ctx-a [data-ib-panel="tool-heavy"] [data-ib-explain]')!;
      const descriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent')!;
      let fail = true;
      Object.defineProperty(el, 'textContent', {
        configurable: true,
        get(this: Node) {
          return descriptor.get!.call(this);
        },
        set(this: Node, value: string) {
          if (fail) {
            fail = false;
            throw new Error('one-shot explanation update failure');
          }
          descriptor.set!.call(this, value);
        },
      });
    });
    await panel.locator('[data-ib-range]').evaluate((el: HTMLInputElement) => {
      el.value = '48';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(200);
    expect(await page.locator('#ctx-a').getAttribute('data-enhanced')).toBeNull();
    await expect(page.locator('#ctx-a [data-ib-scenarios]')).toBeHidden();
    // Default stage values restored (56/8/0), controls hidden.
    await expect(panel.locator('[data-ib-metric="used"]')).toHaveText('56');
    await expect(panel.locator('[data-ib-metric="remaining"]')).toHaveText('8');
    await expect(panel.locator('[data-ib-metric="overflow"]')).toHaveText('0');
    await expect(panel.locator('[data-ib-range]')).toBeHidden();
  });

  test('one broken instance never affects the healthy ones', async ({ page }) => {
    await page.goto(MULTI);
    await waitForEnhanced(page, '#ctx-a');
    await waitForEnhanced(page, '#ctx-b');
    await waitForEnhanced(page, '#loop-a');
    await page.locator('#ctx-b [data-ib-scenario="compact"]').click();
    await expect(page.locator('#ctx-b [data-ib-panel="compact"]')).toBeVisible();
    await expect(page.locator('#ctx-a [data-ib-panel="tool-heavy"]')).toBeVisible();
  });
});

test.describe('offline and storage', () => {
  test('operating every control performs zero requests and writes zero storage', async ({ page, context }) => {
    // Component isolation routes — the TWO known preexisting third-party
    // embeds are explicitly disabled before load: the Google Analytics
    // bootstrap (inline loader + gtag) and the utterances comments widget.
    // Both schedule their own async requests on first scroll/click/timers,
    // which the issue (§1) forbids misattributing to the components.
    // Everything else is neither blocked nor filtered: every storage-class
    // write is instrumented below, so an unknown ambient write FAILS this
    // test instead of being excused.
    const ambientEmbed = /(googletagmanager\.com|google-analytics\.com|utteranc)/;
    await context.route(ambientEmbed, (route) => route.abort());
    await page.addInitScript(STORAGE_INSTRUMENTATION);
    await page.goto(MULTI);
    await waitForEnhanced(page, '#ctx-a');
    await waitForEnhanced(page, '#loop-a');
    // Issue protocol: freeze the network only AFTER the page's and the
    // components' static resources have loaded. The site's webfont slices
    // load lazily (unicode-range batches) — wait for network idle and the
    // font set so none of them land inside the measurement window.
    await page.waitForLoadState('networkidle');
    await page.evaluate(() =>
      Promise.race([Promise.resolve(document.fonts.ready).then(() => undefined), new Promise((r) => setTimeout(r, 8000))])
    );
    // Take the FULL baseline (existing site startup state is baseline —
    // never claimed as component writes).
    const before = await page.evaluate(() => {
      (window as any).__writes = [];
      return {
        local: Object.fromEntries(Object.entries(localStorage)),
        session: Object.fromEntries(Object.entries(sessionStorage)),
        cookie: document.cookie,
      };
    });
    await context.setOffline(true);
    const requests: string[] = [];
    page.on('request', (r) => {
      // Fetch attempts at the explicitly disabled ambient routes are
      // excluded (they are aborted at the route and can load nothing);
      // everything else — same-origin or third-party — must stay at zero.
      if (!ambientEmbed.test(r.url())) requests.push(r.url());
    });

    await page.locator('#ctx-a [data-ib-scenario="compact"]').click();
    await page.locator('#ctx-a [data-ib-panel="compact"] [data-ib-range]').evaluate((el: HTMLInputElement) => {
      el.value = '30';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('#ctx-a [data-ib-reset]').click();
    await page.locator('#loop-a [data-ib-next]').click();
    await page.locator('#loop-a [data-ib-play]').click();
    await page.waitForTimeout(1200);
    await page.locator('#loop-a [data-ib-scenario="tool-recovery"]').click();
    await page.locator('#loop-a [data-ib-reset]').click();
    await page.locator('#ctx-b [data-ib-scenario="long-history"]').click();

    expect(requests, `unexpected network activity: ${requests.join(', ')}`).toEqual([]);
    const after = await page.evaluate(() => ({
      local: Object.fromEntries(Object.entries(localStorage)),
      session: Object.fromEntries(Object.entries(sessionStorage)),
      cookie: document.cookie,
      writes: (window as any).__writes as string[],
    }));
    // Zero storage-class WRITES during the interaction window (Web Storage,
    // cookies, IndexedDB, Service Worker, history) — any write, known or
    // unknown, fails here.
    expect(after.writes, after.writes.join(', ')).toEqual([]);
    // …and identical full key/value contents before vs after (not just
    // lengths), so no silent mutation happened either.
    expect({ local: after.local, session: after.session, cookie: after.cookie }).toEqual(before);
    await expect(page.locator('#ctx-a [data-ib-panel="compact"] [data-ib-metric="used"]')).toHaveText('16');
    await context.setOffline(false);
  });
});

test.describe('security boundaries', () => {
  for (const [locale, url, titleNeedle, questionNeedle] of [
    ['en', SAFETY, '</script>', '<b>tags</b>'],
    ['zh', SAFETY_ZH, '</script>', '<b>标签</b>'],
  ] as const) {
    test(`hostile data text renders inert (${locale} page)`, async ({ page }) => {
      const errors = trackErrors(page);
      let dialogSeen = false;
      page.on('dialog', async (d) => { dialogSeen = true; await d.dismiss(); });
      await page.goto(url);
      await waitForEnhanced(page, '#safety-ctx');
      const root = page.locator('#safety-ctx');
      await expect(root.locator('.ib-title')).toContainText(titleNeedle);
      await expect(root.locator('.ib-question')).toContainText(questionNeedle);
      // The markup renders as TEXT: no element nodes were created from data.
      expect(await root.locator('.ib-question b').count()).toBe(0);
      expect(dialogSeen).toBe(false);
      await page.waitForTimeout(300);
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }

  test('legacy demo-* controls still work beside the new components', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(MULTI);
    await waitForEnhanced(page, '#ctx-a');
    const steps = page.locator('.demo-steps').first();
    await expect(steps).toHaveClass(/is-ready/);
    await steps.locator('[data-ds-tab]').nth(1).click();
    await expect(steps.locator('[data-ds-panel]').nth(1)).toHaveClass(/is-active/);
    await expect(steps.locator('[data-ds-panel]').nth(1)).toContainText('Two.');
    const trace = page.locator('[data-demo-trace]').first();
    await expect(trace).toHaveClass(/is-ready/);
    await trace.locator('[data-dat-replay]').click();
    await expect(trace).toHaveClass(/is-playing/);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('accessibility behaviours', () => {
  test('keyboard-only: native slider and buttons are operable, no dead controls', async ({ page }) => {
    await page.goto(MULTI);
    await waitForEnhanced(page, '#ctx-a');
    const range = page.locator('#ctx-a [data-ib-panel="tool-heavy"] [data-ib-range]');
    await range.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(range).toHaveValue('34');
    await expect(page.locator('#ctx-a [data-ib-panel="tool-heavy"] [data-ib-metric="used"]')).toHaveText('58');
    const play = page.locator('#loop-a [data-ib-play]');
    await play.focus();
    await page.keyboard.press('Enter');
    await expect(play).toHaveText(/暂停|Pause/);
    await page.keyboard.press('Space');
    await expect(play).toHaveText(/播放|Play/);
  });
});

test.describe('print', () => {
  test('enhanced print: complete reference laid out, zero visible controls', async ({ page }) => {
    await page.goto(MULTI);
    await waitForEnhanced(page, '#ctx-a');
    await waitForEnhanced(page, '#loop-a');
    await page.emulateMedia({ media: 'print' });
    // Reference content of CLOSED details must be LAID OUT for print in
    // every engine (the ::details-content rule). WebKit reports isVisible()
    // false for this forced content while painting it (verified against a
    // real WebKit print screenshot), so the assertion is on real geometry —
    // which is what printing consumes.
    const table = page.locator('#ctx-a details.ib-reference table');
    expect((await table.boundingBox())!.height).toBeGreaterThan(40);
    // ALL three authored traces are laid out (21 events across 3 lists).
    const traces = page.locator('#loop-a details.ib-reference ol');
    await expect(traces).toHaveCount(3);
    for (let i = 0; i < 3; i += 1) {
      expect((await traces.nth(i).boundingBox())!.height).toBeGreaterThan(100);
    }
    // ZERO visible runtime controls across each ENTIRE root — including the
    // header Reset button that lives outside .ib-controls.
    for (const id of ['#ctx-a', '#loop-a']) {
      expect(await page.locator(`${id} button:visible, ${id} input:visible`).count()).toBe(0);
    }
    await expect(page.locator('#loop-a [data-ib-current]')).toBeHidden();
    await page.locator('#ctx-a').screenshot({ path: shotPath('print-js-context-budget') });
    await page.locator('#loop-a').screenshot({ path: shotPath('print-js-agent-loop') });
    await page.emulateMedia({ media: 'screen' });
  });
});

test.describe('print without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('static print: complete reference laid out, zero visible controls', async ({ page }) => {
    await page.goto(MULTI);
    await page.emulateMedia({ media: 'print' });
    const table = page.locator('#ctx-a details.ib-reference table');
    expect((await table.boundingBox())!.height).toBeGreaterThan(40);
    const traces = page.locator('#loop-a details.ib-reference ol');
    await expect(traces).toHaveCount(3);
    for (let i = 0; i < 3; i += 1) {
      expect((await traces.nth(i).boundingBox())!.height).toBeGreaterThan(100);
    }
    for (const id of ['#ctx-a', '#loop-a']) {
      expect(await page.locator(`${id} button:visible, ${id} input:visible`).count()).toBe(0);
    }
    await page.locator('#ctx-a').screenshot({ path: shotPath('print-nojs-context-budget') });
    await page.locator('#loop-a').screenshot({ path: shotPath('print-nojs-agent-loop') });
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('hidden controls are truly invisible; static content and details work', async ({ page }) => {
    await page.goto(MULTI);
    const root = page.locator('#ctx-a');
    // Effective hiding (computed visibility), not just attributes.
    await expect(root.locator('[data-ib-scenarios] [data-ib-scenario]').first()).toBeHidden();
    await expect(root.locator('[data-ib-panel="tool-heavy"] [data-ib-range]')).toBeHidden();
    await expect(root.locator('[data-ib-head-slot]')).toBeHidden();
    await expect(root.locator('[data-ib-ctrl-slot]')).toBeHidden();
    // Complete static evidence is readable and the native disclosure opens.
    await expect(root.locator('[data-ib-panel="tool-heavy"] [data-ib-metric="used"]')).toHaveText('56');
    await expect(root.locator('.ib-question')).toBeVisible();
    await expect(root.locator('.ib-note')).toBeVisible();
    const details = root.locator('details.ib-reference');
    await expect(details.locator('table')).toBeHidden();
    await root.locator('details.ib-reference > summary').click();
    await expect(details.locator('table')).toBeVisible();
    // Agent: the current event and all authored traces are readable text.
    await expect(page.locator('#loop-a [data-ib-current]')).toBeVisible();
    await expect(page.locator('#loop-a details.ib-reference li.ib-step')).toHaveCount(21);
  });
});
