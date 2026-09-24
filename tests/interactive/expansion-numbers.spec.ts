import { test, expect, Page } from '@playwright/test';

// Shared production fixture pipeline: scripts/build-interactive-fixtures.mjs.
const PAGE_EN = '/expansion-numbers/';
const PAGE_ZH = '/zh/expansion-numbers/';
const PAGE_CORRUPT = '/expansion-numbers-corrupt/';

/* Expected display values, computed here with the same IEEE semantics the
 * model documents (round half up on exact halves, trailing zeros trimmed):
 * these pin SSR ↔ model agreement as well as runtime repaints. */
function pct2(fraction: number): string {
  const fixed = (Math.round(fraction * 10000) / 100).toFixed(2);
  return `${fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed}%`;
}
function frac4(fraction: number): string {
  return (Math.round(fraction * 10000) / 10000).toFixed(4);
}
function trim2(value: number): string {
  const fixed = (Math.round(value * 100) / 100).toFixed(2);
  return fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed;
}
function exprOf(permille: number, steps: number): string {
  const p = permille / 1000;
  const result = Math.pow(p, steps);
  const pText = (Math.round((permille / 1000) * 1000) / 1000)
    .toFixed(3)
    .replace(/0+$/, '')
    .replace(/\.$/, '');
  return `${pText}^${steps} = ${frac4(result)} (${pct2(result)})`;
}
/** Checkpoint mode: fixed 5-step segments, at most one retry per segment. */
function checkpointPct(permille: number, steps: number, recallPermille: number, seg = 5): string {
  const p = permille / 1000;
  const r = recallPermille / 1000;
  let acc = 1;
  for (let left = steps; left > 0; left -= seg) {
    const q = Math.pow(p, Math.min(seg, left));
    acc *= q + (1 - q) * r * q;
  }
  return pct2(acc);
}

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

async function setRange(page: Page, selector: string, value: string): Promise<void> {
  await page.locator(selector).evaluate((el: HTMLInputElement, v: string) => {
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

test.describe('numerical explainers (expansion-numbers)', () => {
  const base = '';

  test('SSR agreement: exact default results, hidden controls, complete reference (en + zh)', async ({ page }) => {
    // Script-free state (same DOM a 404'd or blocked module leaves behind).
    await page.route('**/*', (route) =>
      route.request().resourceType() === 'script' ? route.abort() : route.continue()
    );
    for (const [url, lang] of [
      [PAGE_EN, 'en'],
      [PAGE_ZH, 'zh'],
    ] as const) {
      await page.goto(base + url);
      const chain = page.locator('#chain-a');
      await expect(chain.locator('[data-ib-expr]').first()).toHaveText(exprOf(950, 20));
      await expect(chain.locator('[data-ib-panel="twenty-steps"] [data-ib-plain]')).toHaveText(pct2(Math.pow(0.95, 20)));
      // Checkpoint mode (default: perfect recall) is in the DOM even closed.
      await expect(chain.locator('[data-ib-cp]').first()).toHaveText('81.05%');
      await expect(chain.locator('[data-ib-segs]').first()).toHaveText('5 / 5 / 5 / 5');

      // task-cost SSR totals agree with the model (batch of the fixture).
      const cost = page.locator('#cost-a');
      await expect(cost.locator('[data-ib-total="a"]').first()).toHaveText('570');
      await expect(cost.locator('[data-ib-per="a"]').first()).toHaveText('12.67');
      await expect(cost.locator('[data-ib-per="b"]').first()).toHaveText('30.29');
      // A script-free reader must be able to read the inputs that explain
      // those totals, including the accepted-task denominator.
      for (const [field, value] of [['a-reviewMinutes', '300'], ['a-hourlyRate', '60'], ['a-accepted', '45'], ['b-accepted', '35']]) {
        expect(await cost.locator(`[data-ib-num-slot="${field}"]`).first().ariaSnapshot()).toContain(value);
      }

      // notification SSR: threshold 2/3 and E = pG − (1−p)C at p = 50%.
      const notify = page.locator('#notify-a');
      await expect(notify.locator('[data-ib-threshold]').first()).toHaveText('40/60 = 66.67%');
      await expect(notify.locator('[data-ib-expected]').first()).toHaveText('-10');

      // Localized static copy; controls stay hidden (no dead controls).
      if (lang === 'zh') {
        await expect(notify.locator('[data-ib-verdict]').first()).toHaveText('保持沉默');
        await expect(page.locator('#cost-a .ib-title')).toHaveText('每个成功任务的总成本');
      } else {
        await expect(notify.locator('[data-ib-verdict]').first()).toHaveText('Stay quiet');
        await expect(page.locator('#cost-a .ib-title')).toHaveText('Cost per successful task');
      }
      for (const id of ['#chain-a', '#cost-a', '#notify-a']) {
        expect(await page.locator(`${id} input:visible`).count()).toBe(0);
        expect(await page.locator(`${id} button:visible`).count()).toBe(0);
        await expect(page.locator(`${id} details.ib-reference > summary`)).toBeVisible();
      }
    }
  });

  test('reliability-chain: sliders repaint exact results; reset restores defaults', async ({ page }) => {
    await page.goto(base + PAGE_EN);
    await page.locator('#chain-a[data-enhanced]').waitFor({ state: 'attached' });
    const panel = page.locator('#chain-a [data-ib-panel="twenty-steps"]');

    await setRange(page, '#chain-a [data-ib-panel="twenty-steps"] [data-ib-step-range]', '90');
    await expect(panel.locator('[data-ib-expr]')).toHaveText(exprOf(900, 20));
    await setRange(page, '#chain-a [data-ib-panel="twenty-steps"] [data-ib-steps-range]', '5');
    await expect(panel.locator('[data-ib-expr]')).toHaveText(exprOf(900, 5));
    // Detector recall sensitivity: exactly one retry per detected segment.
    await setRange(page, '#chain-a [data-ib-panel="twenty-steps"] [data-ib-recall-range]', '50');
    await expect(panel.locator('[data-ib-cp]')).toHaveText(checkpointPct(900, 5, 500));
    await setRange(page, '#chain-a [data-ib-panel="twenty-steps"] [data-ib-recall-range]', '0');
    // r = 0 collapses to the plain chain product over the segments.
    await expect(panel.locator('[data-ib-cp]')).toHaveText(checkpointPct(900, 5, 0));

    // Debounced polite announcement lands once, not as a burst.
    await expect(panel.locator('[data-ib-live]')).not.toHaveText('', { timeout: 3000 });

    // Reset restores the exact default state (no memory of edits).
    await page.locator('#chain-a [data-ib-reset]').click();
    await expect(panel.locator('[data-ib-expr]')).toHaveText(exprOf(950, 20));
    await expect(panel.locator('[data-ib-plain]')).toHaveText(pct2(Math.pow(0.95, 20)));
    await expect(panel.locator('[data-ib-cp]')).toHaveText('81.05%');
  });

  test('reliability-chain: scenario switch restores presets; reader disclosures stay untouched', async ({ page }) => {
    await page.goto(base + PAGE_EN);
    await page.locator('#chain-a[data-enhanced]').waitFor({ state: 'attached' });
    const root = page.locator('#chain-a');
    // Reader opens the checkpoint disclosure; the runtime must never toggle it.
    await root.locator('details.ib-checkpoint > summary').first().click();
    await expect(root.locator('details.ib-checkpoint').first()).toHaveAttribute('open', /.*/);
    await expect(root.locator('[data-ib-att]').first()).toHaveText('4.9');

    await root.locator('[data-ib-scenario="partial-recall"]').click();
    const panel = root.locator('[data-ib-panel="partial-recall"]');
    await expect(panel).toBeVisible();
    await expect(root.locator('[data-ib-panel="twenty-steps"]')).toBeHidden();
    await expect(panel.locator('[data-ib-expr]')).toHaveText(exprOf(950, 20));
    // The preset's imperfect recall is restored on switch.
    await expect(panel.locator('[data-ib-cp]')).toHaveText(checkpointPct(950, 20, 500));
    // The reader's disclosure state survives the repaint.
    await expect(root.locator('details.ib-checkpoint').first()).toHaveAttribute('open', /.*/);
  });

  test('task-cost: number inputs recompute; zero accepted stays undefined', async ({ page }) => {
    await page.goto(base + PAGE_EN);
    await page.locator('#cost-a[data-enhanced]').waitFor({ state: 'attached' });
    const panel = page.locator('#cost-a [data-ib-panel="cheap-raw"]');

    await panel.locator('[data-ib-num="a-reviewMinutes"]').fill('0');
    await panel.locator('[data-ib-num="b-reviewMinutes"]').fill('0');
    await expect(panel.locator('[data-ib-total="a"]')).toHaveText('270');
    await expect(panel.locator('[data-ib-per="a"]')).toHaveText('6');
    await expect(panel.locator('[data-ib-per="b"]')).toHaveText('4.57');
    await expect(panel.locator('[data-ib-explain]')).toContainText('route B has the lower total cost per accepted task');

    // Zero accepted tasks: undefined — not 0 and not Infinity.
    await panel.locator('[data-ib-num="a-accepted"]').fill('0');
    await expect(panel.locator('[data-ib-per="a"]')).toHaveText('—');
    await expect(panel.locator('[data-ib-explain]')).toContainText('not economically meaningful');
    expect(await page.locator('#cost-a').evaluate((el) => el.textContent || '')).not.toContain('Infinity');

    // Reset restores both routes' preset values.
    await page.locator('#cost-a [data-ib-reset]').click();
    await expect(panel.locator('[data-ib-total="a"]')).toHaveText('570');
    await expect(panel.locator('[data-ib-per="b"]')).toHaveText('30.29');
  });

  test('preset changes announce the computed result; reset clears it', async ({ page }) => {
    await page.goto(PAGE_EN);
    for (const [id, scenario] of [['chain-a', 'partial-recall'], ['cost-a', 'light-review'], ['notify-a', 'minutes']]) {
      const root = page.locator(`#${id}`);
      await root.locator(`[data-ib-scenario="${scenario}"]`).click();
      await expect(root.locator(`[data-ib-panel="${scenario}"] [data-ib-live]`)).not.toHaveText('');
      await root.locator('[data-ib-reset]').click();
      for (const live of await root.locator('[data-ib-live]').all()) await expect(live).toHaveText('');
    }
  });

  test('notification-threshold: crossing the threshold flips the advice', async ({ page }) => {
    await page.goto(base + PAGE_EN);
    await page.locator('#notify-a[data-enhanced]').waitFor({ state: 'attached' });
    const root = page.locator('#notify-a');
    const panel = root.locator('[data-ib-panel="deep-work"]');

    await setRange(page, '#notify-a [data-ib-panel="deep-work"] [data-ib-prob-range]', '66.5');
    await expect(panel.locator('[data-ib-verdict]')).toHaveText('Stay quiet');
    await setRange(page, '#notify-a [data-ib-panel="deep-work"] [data-ib-prob-range]', '67');
    await expect(panel.locator('[data-ib-verdict]')).toHaveText('Speak up');
    await expect(panel.locator('[data-ib-threshold]')).toHaveText('40/60 = 66.67%');

    // The exact break-even preset (G=10, C=15 at p=60%) is an "equal" case.
    await root.locator('[data-ib-scenario="minutes"]').click();
    const minutes = root.locator('[data-ib-panel="minutes"]');
    await expect(minutes.locator('[data-ib-expected]')).toHaveText('0');
    await expect(minutes.locator('[data-ib-verdict]')).toHaveText('Break-even');
    await expect(minutes.locator('[data-ib-threshold]')).toHaveText('15/25 = 60%');

    // G = C = 0: explicitly no preference and an UNDEFINED threshold.
    await root.locator('[data-ib-scenario="no-preference"]').click();
    const degenerate = root.locator('[data-ib-panel="no-preference"]');
    await expect(degenerate.locator('[data-ib-threshold]')).toHaveText('Undefined (G = C = 0)');
    await expect(degenerate.locator('[data-ib-verdict]')).toHaveText('No preference (undefined threshold)');
  });

  test('instance isolation: two chains never share state; ids stay unique', async ({ page }) => {
    await page.goto(base + PAGE_EN);
    await page.locator('#chain-a[data-enhanced]').waitFor({ state: 'attached' });
    await page.locator('#chain-b[data-enhanced]').waitFor({ state: 'attached' });
    await setRange(page, '#chain-a [data-ib-panel="twenty-steps"] [data-ib-step-range]', '80');
    await expect(
      page.locator('#chain-a [data-ib-panel="twenty-steps"] [data-ib-expr]')
    ).toHaveText(exprOf(800, 20));
    await expect(
      page.locator('#chain-b [data-ib-panel="twenty-steps"] [data-ib-expr]')
    ).toHaveText(exprOf(950, 20));
    await page.locator('#chain-b [data-ib-reset]').click();
    await expect(
      page.locator('#chain-a [data-ib-panel="twenty-steps"] [data-ib-expr]')
    ).toHaveText(exprOf(800, 20));
    const ids = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[id]')).map((e) => (e as HTMLElement).id)
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('fallback: corrupt config, blocked script and runtime-invalid specs never enhance', async ({ page }) => {
    const errors = trackErrors(page);
    // 1) Corrupt embedded config: first instance falls back, siblings enhance.
    await page.goto(base + PAGE_CORRUPT);
    await page.waitForTimeout(600);
    expect(await page.locator('#chain-a').getAttribute('data-enhanced')).toBeNull();
    await expect(page.locator('#chain-a [data-ib-expr]').first()).toHaveText(exprOf(950, 20));
    await expect(page.locator('#chain-b[data-enhanced]')).toBeAttached();
    await expect(page.locator('#cost-a[data-enhanced]')).toBeAttached();
    await expect(page.locator('#notify-a[data-enhanced]')).toBeAttached();

    // 2) Runtime-invalid spec (probStep 0): never enhances, never NaN.
    await page.goto(base + PAGE_EN);
    await page.waitForTimeout(400);
    expect(await page.locator('#chain-broken').getAttribute('data-enhanced')).toBeNull();
    expect(await page.locator('#chain-broken input:visible').count()).toBe(0);
    expect(await page.locator('body').evaluate((el) => el.textContent || '')).not.toContain('NaN');
    expect(errors.filter((e) => e.startsWith('pageerror')), errors.join('\n')).toEqual([]);

    // 3) Blocked/404 component script: the complete static view survives.
    await page.route('**/*', (route) =>
      route.request().resourceType() === 'script' &&
      /components\/(reliability-chain|task-cost|notification-threshold)/.test(route.request().url())
        ? route.fulfill({ status: 404, body: 'not found' })
        : route.continue()
    );
    await page.reload();
    await page.waitForTimeout(400);
    for (const id of ['#chain-a', '#cost-a', '#notify-a']) {
      expect(await page.locator(id).getAttribute('data-enhanced')).toBeNull();
      expect(await page.locator(`${id} input:visible`).count()).toBe(0);
    }
    await expect(page.locator('#cost-a [data-ib-total="a"]').first()).toHaveText('570');
    await expect(page.locator('#notify-a [data-ib-threshold]').first()).toHaveText('40/60 = 66.67%');
  });

  test('update failure restores the exact SSR and keeps reader disclosure state', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(base + PAGE_EN);
    await page.locator('#chain-a[data-enhanced]').waitFor({ state: 'attached' });
    const root = page.locator('#chain-a');
    const details = root.locator('details.ib-reference');
    await root.locator('details.ib-reference > summary').click();
    await expect(details).toHaveAttribute('open', /.*/);
    // One-shot paint failure in the middle of a slider update (fault injection).
    await page.evaluate(() => {
      const el = document.querySelector('#chain-a [data-ib-panel="twenty-steps"] [data-ib-expr]')!;
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
            throw new Error('one-shot expr update failure');
          }
          descriptor.set!.call(this, value);
        },
      });
    });
    await setRange(page, '#chain-a [data-ib-panel="twenty-steps"] [data-ib-step-range]', '80');
    await page.waitForTimeout(200);
    // Fallback: no enhancement, exact SSR DOM restored (default values).
    expect(await root.getAttribute('data-enhanced')).toBeNull();
    await expect(root.locator('[data-ib-expr]').first()).toHaveText(exprOf(950, 20));
    await expect(root.locator('[data-ib-panel="twenty-steps"] [data-ib-plain]')).toHaveText(pct2(Math.pow(0.95, 20)));
    expect(await root.locator('input:visible').count()).toBe(0);
    // The reader's disclosure state survives.
    await expect(details).toHaveAttribute('open', /.*/);
    // Healthy siblings are untouched by this instance's failure.
    await expect(page.locator('#cost-a[data-enhanced]')).toBeAttached();
    expect(errors.filter((e) => e.startsWith('pageerror')), errors.join('\n')).toEqual([]);
  });

  test('remove and reconnect: state kept, single event binding, timers cancelled', async ({ page }) => {
    await page.goto(base + PAGE_EN);
    await page.locator('#chain-a[data-enhanced]').waitFor({ state: 'attached' });
    await setRange(page, '#chain-a [data-ib-panel="twenty-steps"] [data-ib-steps-range]', '5');
    // Schedule a debounced announcement, then detach in the same tick: the
    // pending timer must be cancelled so nothing lands on the dead node.
    await page.evaluate(() => {
      const el = document.querySelector('#chain-a')!;
      (window as unknown as Record<string, unknown>).__chain = el;
      const input = el.querySelector(
        '[data-ib-panel="twenty-steps"] [data-ib-steps-range]'
      ) as HTMLInputElement;
      input.value = '5';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      el.remove();
    });
    await page.waitForTimeout(600);
    const pendingLive = await page.evaluate(() => {
      const el = (window as unknown as Record<string, HTMLElement>).__chain;
      const live = el.querySelector('[data-ib-panel="twenty-steps"] [data-ib-live]') as HTMLElement;
      return live.textContent;
    });
    expect(pendingLive, 'disconnect must cancel the pending announcement timer').toBe('');
    const seen = await page.evaluate(() => {
      const el = (window as unknown as Record<string, HTMLElement>).__chain;
      const text = (el.querySelector('[data-ib-expr]') as HTMLElement).textContent!.trim();
      document.body.prepend(el);
      return text;
    });
    await expect(page.locator('#chain-a [data-ib-expr]').first()).toHaveText(seen);
    // One input event → exactly one repaint step (no duplicate listeners).
    await setRange(page, '#chain-a [data-ib-panel="twenty-steps"] [data-ib-steps-range]', '6');
    await expect(page.locator('#chain-a [data-ib-expr]').first()).toHaveText(exprOf(950, 6));
  });

  test('reconnect: a render failure falls back to SSR with no page errors', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(base + PAGE_EN);
    await page.locator('#chain-b[data-enhanced]').waitFor({ state: 'attached' });
    await page.locator('#cost-a[data-enhanced]').waitFor({ state: 'attached' });
    // Arm a PERSISTENT paint failure, then detach/re-append: the ready
    // reconnect branch must catch the render error and restore the SSR.
    await page.evaluate(() => {
      const el = document.querySelector('#chain-b [data-ib-panel="twenty-steps"] [data-ib-plain]')!;
      const descriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent')!;
      Object.defineProperty(el, 'textContent', {
        configurable: true,
        get(this: Node) {
          return descriptor.get!.call(this);
        },
        set(this: Node, _value: string) {
          throw new Error('persistent reconnect render failure');
        },
      });
    });
    await page.evaluate(() => {
      const el = document.querySelector('#chain-b')!;
      el.remove();
      document.body.prepend(el);
    });
    await page.waitForTimeout(200);
    const root = page.locator('#chain-b');
    expect(await root.getAttribute('data-enhanced')).toBeNull();
    await expect(root.locator('[data-ib-expr]').first()).toHaveText(exprOf(950, 20));
    await expect(root.locator('[data-ib-panel="twenty-steps"] [data-ib-plain]')).toHaveText(pct2(Math.pow(0.95, 20)));
    expect(await root.locator('input:visible').count()).toBe(0);
    // Healthy siblings are untouched by this instance's failure.
    await expect(page.locator('#cost-a[data-enhanced]')).toBeAttached();
    expect(errors.filter((e) => e.startsWith('pageerror')), errors.join('\n')).toEqual([]);
  });

  test('fallback and reset keep the reader checkpoint disclosure open', async ({ page }) => {
    await page.goto(base + PAGE_EN);
    await page.locator('#chain-a[data-enhanced]').waitFor({ state: 'attached' });
    const ckpt = page.locator('#chain-a [data-ib-panel="twenty-steps"] details.ib-checkpoint');
    await ckpt.locator('summary').click();
    await expect(ckpt).toHaveAttribute('open', /.*/);
    // Reset repaints values but never closes the reader's disclosure.
    await page.locator('#chain-a [data-ib-reset]').click();
    await expect(ckpt).toHaveAttribute('open', /.*/);
    // A paint failure restores the SSR clone via replaceChildren — the open
    // checkpoint state must survive that restore (the read-only reference
    // details is outside the panels and already stays untouched).
    await page.evaluate(() => {
      const el = document.querySelector('#chain-a [data-ib-panel="twenty-steps"] [data-ib-expr]')!;
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
            throw new Error('one-shot expr update failure');
          }
          descriptor.set!.call(this, value);
        },
      });
    });
    await setRange(page, '#chain-a [data-ib-panel="twenty-steps"] [data-ib-step-range]', '80');
    await page.waitForTimeout(200);
    expect(await page.locator('#chain-a').getAttribute('data-enhanced')).toBeNull();
    await expect(ckpt).toHaveAttribute('open', /.*/);
    await expect(page.locator('#chain-a [data-ib-expr]').first()).toHaveText(exprOf(950, 20));
  });

  test('SSR reference: curve samples are integer step counts matching the JS model', async ({ page }) => {
    await page.goto(base + PAGE_EN);
    await page.locator('#chain-a[data-enhanced]').waitFor({ state: 'attached' });
    // The runtime never touches the reference, so these are SSR values.
    // The fixture span (1…100 → 99) is not divisible by 4: fractional
    // sample step counts would betray float division in the Hugo compute.
    const ns = await page
      .locator('#chain-a details.ib-reference table')
      .nth(1)
      .locator('tbody tr th')
      .allTextContents();
    const trimmed = ns.map((s) => s.trim());
    for (const n of trimmed) expect(n).toMatch(/^\d+$/);
    expect(trimmed).toEqual(['1', '25', '50', '75', '100']);
  });

  test('accessibility: sliders keep their label association and expose formatted values', async ({ page }) => {
    await page.goto(base + PAGE_EN);
    await page.locator('#chain-a[data-enhanced]').waitFor({ state: 'attached' });
    await page.locator('#notify-a[data-enhanced]').waitFor({ state: 'attached' });
    const check = async (selector: string, nameNeedle: string): Promise<string | null> => {
      const info = await page.locator(selector).evaluate((el: HTMLInputElement) => ({
        labels: el.labels ? Array.from(el.labels).map((l) => l.textContent || '') : [],
        valuetext: el.getAttribute('aria-valuetext'),
      }));
      expect(info.labels, `${selector} must have exactly one associated label`).toHaveLength(1);
      expect(info.labels[0], `${selector} label text must be non-empty`).toContain(nameNeedle);
      return info.valuetext;
    };
    // Probability sliders announce formatted percents (per-mille internal
    // state like 950 must surface as "95%").
    expect(await check('#chain-a [data-ib-panel="twenty-steps"] [data-ib-step-range]', 'Per-step success')).toBe('95%');
    expect(await check('#chain-a [data-ib-panel="twenty-steps"] [data-ib-recall-range]', 'Checkpoint recall')).toBe('100%');
    expect(await check('#notify-a [data-ib-panel="deep-work"] [data-ib-prob-range]', 'Calibrated usefulness')).toBe('50%');
    // Integer sliders are labelled and announce their plain number value.
    expect(await check('#notify-a [data-ib-panel="deep-work"] [data-ib-gain-range]', 'Gain')).toBeNull();
    expect(await check('#chain-a [data-ib-panel="twenty-steps"] [data-ib-steps-range]', 'Required steps')).toBeNull();

    // Value text tracks edits (per-mille state → formatted percent).
    await setRange(page, '#chain-a [data-ib-panel="twenty-steps"] [data-ib-step-range]', '99.5');
    await expect(
      page.locator('#chain-a [data-ib-panel="twenty-steps"] [data-ib-step-range]')
    ).toHaveAttribute('aria-valuetext', '99.5%');

    // Focus is functional: the native slider takes keyboard operation.
    const stepRange = page.locator('#chain-a [data-ib-panel="twenty-steps"] [data-ib-step-range]');
    await stepRange.focus();
    const before = Number(await stepRange.inputValue());
    await page.keyboard.press('ArrowRight');
    const after = Number(await stepRange.inputValue());
    expect(after).toBeGreaterThan(before);

    // Clicking the label text activates its slider: the association must
    // forward exactly one synthetic click (per-engine thumb or focus side
    // effects of that activation are not specified and not asserted).
    const labeledSteps = page.locator('#chain-a [data-ib-panel="twenty-steps"] [data-ib-steps-range]');
    await labeledSteps.evaluate((input) => {
      input.dataset.testClickCount = '0';
      input.addEventListener('click', () => {
        input.dataset.testClickCount = String(Number(input.dataset.testClickCount) + 1);
      });
    });
    await page
      .locator('#chain-a [data-ib-panel="twenty-steps"] label:has([data-ib-steps-range]) .ib-range-text')
      .click();
    await expect(labeledSteps, 'label click must activate its slider').toHaveAttribute('data-test-click-count', '1');
  });

  test('task-cost: exponent syntax parses fully and out-of-range values canonicalize on commit', async ({ page }) => {
    await page.goto(base + PAGE_EN);
    await page.locator('#cost-a[data-enhanced]').waitFor({ state: 'attached' });
    const panel = page.locator('#cost-a [data-ib-panel="cheap-raw"]');
    const modelTool = panel.locator('[data-ib-num="a-modelToolCost"]');
    // Number(), not parseInt(): "1e3" is 1000, not 1 — and mid-edit the
    // input keeps the reader's own formatting.
    await modelTool.evaluate((el: HTMLInputElement) => {
      el.value = '1e3';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(panel.locator('[data-ib-total="a"]')).toHaveText('1330'); // 1000 + 30 + 300
    await expect(modelTool).toHaveValue('1e3');
    await modelTool.evaluate((el: HTMLInputElement) => {
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(modelTool).toHaveValue('1000'); // canonicalized on commit

    // Out-of-range accepted snaps to the fixed batch size on commit, and
    // the per-accepted denominator uses the same clamped value.
    const accepted = panel.locator('[data-ib-num="a-accepted"]');
    await accepted.evaluate((el: HTMLInputElement) => {
      el.value = '999999';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(accepted).toHaveValue('50');
    await expect(panel.locator('[data-ib-per="a"]')).toHaveText('26.6'); // 1330 / 50
    expect(await page.locator('#cost-a').evaluate((el) => el.textContent || '')).not.toContain('999999');
  });

  test('print: complete reference laid out and controls hidden (JS and no-JS)', async ({ page }) => {
    await page.goto(base + PAGE_EN);
    await page.locator('#chain-a[data-enhanced]').waitFor({ state: 'attached' });
    await page.emulateMedia({ media: 'print' });
    for (const id of ['#chain-a', '#cost-a', '#notify-a']) {
      // The reference of even CLOSED details is laid out for print.
      const table = page.locator(`${id} details.ib-reference table`).first();
      expect((await table.boundingBox())!.height).toBeGreaterThan(40);
      // Zero visible runtime controls across the entire root.
      expect(await page.locator(`${id} button:visible, ${id} input:visible`).count()).toBe(0);
    }
    await page.emulateMedia({ media: 'screen' });

    // The same holds without JavaScript (static state, closed disclosure).
    await page.route('**/*', (route) =>
      route.request().resourceType() === 'script' ? route.abort() : route.continue()
    );
    await page.reload();
    await page.emulateMedia({ media: 'print' });
    for (const id of ['#chain-a', '#cost-a', '#notify-a']) {
      const table = page.locator(`${id} details.ib-reference table`).first();
      expect((await table.boundingBox())!.height).toBeGreaterThan(40);
      expect(await page.locator(`${id} button:visible, ${id} input:visible`).count()).toBe(0);
    }
  });

  test('mobile 320px: no document overflow and 44px controls', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(base + PAGE_EN);
    await page.locator('#cost-a[data-enhanced]').waitFor({ state: 'attached' });
    for (const id of ['#chain-a', '#cost-a', '#notify-a']) {
      const root = page.locator(id);
      await root.scrollIntoViewIfNeeded();
      const overflow = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(overflow.scroll, `${id} must not overflow the 320px page`).toBeLessThanOrEqual(overflow.client + 1);
      for (const selector of ['button.ib-scn', 'button.ib-btn--reset', 'input.ib-range', 'input.ib-num']) {
        const control = root.locator(selector).first();
        if ((await control.count()) === 0) continue;
        const box = await control.boundingBox();
        if (box) expect(box.height, `${id} ${selector}`).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
