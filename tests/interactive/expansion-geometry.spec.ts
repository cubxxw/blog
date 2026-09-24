// Both locales use the shared production fixture pipeline.
import { test, expect, Page } from '@playwright/test';
import { instrumentation } from './test-support';

// Contract copy of data/interactive/vector-cosine-v1.json (stable fields the
// assertions pin down).
const UNDEFINED_EN = 'undefined (a zero vector has no direction)';
const UNDEFINED_ZH = '未定义（零向量没有方向）';

const base = '';


function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    // One documented preexisting site-embed quirk (same as the shared suite):
    // the utterances comments widget posts a cross-origin postMessage that
    // some engines log as a console error. Nothing else is filtered.
    if (msg.type() === 'error' && !/utteranc/i.test(msg.text())) {
      errors.push(`console.error: ${msg.text()}`);
    }
  });
  return errors;
}

/** Let preload styles finish before waiting for their font faces. A page
 * using only system fallback fonts is valid and must never require size > 0. */
async function waitForStableLayout(page: Page) {
  await page.waitForLoadState('load');
  await page.evaluate(() => Promise.race([
    document.fonts.ready,
    new Promise((resolve) => setTimeout(resolve, 8000)),
  ]));
}

/** Sample one element's box until it is stable across consecutive reads. */
async function settledBox(page: Page, selector: string) {
  const locator = page.locator(selector).first();
  let prev: { width: number; height: number } | null = null;
  let streak = 0;
  for (let i = 0; i < 40; i += 1) {
    const box = await locator.boundingBox();
    if (box && prev && Math.abs(box.height - prev.height) < 0.5 && Math.abs(box.width - prev.width) < 0.5) {
      streak += 1;
      if (streak >= 2) return box;
    } else {
      streak = 0;
    }
    prev = box;
    await page.waitForTimeout(120);
  }
  return prev!;
}

async function waitForEnhanced(page: Page, selector: string) {
  await page.locator(`${selector}[data-enhanced]`).first().waitFor({ state: 'attached' });
  // Interaction stability: settle the font set so a late fallback-font swap
  // cannot move a control between hit-test and click in any engine.
  await waitForStableLayout(page);
}

const readVal = (page: Page, root: string, key: string) =>
  page.locator(`${root} [data-ib-val="${key}"]`).first().textContent();

/**
 * Numeric readout cells must always show finite values — undefined states use
 * the spec's `undefinedText`, never "NaN"/"Infinity". (The embedded config
 * legitimately contains the string "NaN" in copy, so only the live values are
 * asserted.)
 */
async function expectFiniteReadout(page: Page, root: string) {
  for (const text of await page.locator(`${root} [data-ib-val]`).allTextContents()) {
    expect(text).not.toContain('NaN');
    expect(text).not.toContain('Infinity');
  }
}

/* ══════════════════════ upgrade + exact default state ═══════════════════ */

test('upgrade swaps controls into same-sized slots with zero geometry change', async ({ page }) => {
  // Deliberately exercise normal system-font fallback as well. Aborting the
  // modules allows load to finish; holding them would also hold load/DCL and
  // race the asynchronous font stylesheet against the before measurement.
  await page.route(/fonts\.googleapis\.com|fonts\.gstatic\.com/, (route) => route.abort());
  const components = /components\/(vector-cosine|flow-bottleneck)[^/]*\.js(?:\?.*)?$/;
  await page.route(components, (route) => route.abort());
  await page.goto(`${base}/geometry/`);
  await waitForStableLayout(page);
  await expect(page.locator('#vc-a')).not.toHaveAttribute('data-enhanced', /.*/);
  const before = await settledBox(page, '#vc-a');
  const urls = await page.locator('script[type="module"][src*="/components/"]').evaluateAll(
    (nodes) => nodes.map((node) => (node as HTMLScriptElement).src)
      .filter((url) => /vector-cosine|flow-bottleneck/.test(url))
  );
  expect(urls).toHaveLength(2);
  await page.unroute(components);
  await page.evaluate((sources) => {
    for (const src of sources) {
      const script = document.createElement('script');
      script.type = 'module'; script.src = `${src}?delayed-upgrade=1`;
      document.body.append(script);
    }
  }, urls);
  await waitForEnhanced(page, '#vc-a');
  await waitForEnhanced(page, '#fb-a');
  const after = await settledBox(page, '#vc-a');
  expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(2);
  expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(2);
  // Real controls swapped in, slot gone, nothing dead left behind.
  await expect(page.locator('#vc-a [data-ib-controls]')).toBeVisible();
  await expect(page.locator('#vc-a [data-ib-ctrl-slot]')).toBeHidden();
});

test('vector-cosine shows the exact SSR default result and stays live', async ({ page }) => {
  await page.goto(`${base}/geometry/`);
  const root = '#vc-a';
  // The SSR default (oblique) values, identical to the pure model.
  expect(await readVal(page, root, 'ax')).toBe('3.00');
  expect(await readVal(page, root, 'ay')).toBe('1.00');
  expect(await readVal(page, root, 'bx')).toBe('1.00');
  expect(await readVal(page, root, 'by')).toBe('2.00');
  expect(await readVal(page, root, 'dot')).toBe('5.00');
  expect(await readVal(page, root, 'magA')).toBe('3.16');
  expect(await readVal(page, root, 'magB')).toBe('2.24');
  expect(await readVal(page, root, 'angle')).toBe('45.0°');
  expect(await readVal(page, root, 'cosine')).toBe('0.707');
  await waitForEnhanced(page, root);
  // Numeric (keyboard-equivalent) entry updates the model live.
  const bx = page.locator(`${root} [data-ib-coord="bx"]`);
  await bx.fill('2');
  expect(await readVal(page, root, 'dot')).toBe('8.00');
  expect(await readVal(page, root, 'magB')).toBe('2.83');
  expect(await page.locator(`${root} [data-ib-explain]`).textContent()).toContain('Broadly aligned');
});

test('scale keeps the direction while rotate changes only the angle', async ({ page }) => {
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#vc-a');
  const root = '#vc-a';
  const cosBefore = await readVal(page, root, 'cosine');
  await page.locator(`${root} [data-ib-scale]`).evaluate((el) => {
    const input = el as HTMLInputElement;
    input.value = '5';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(await readVal(page, root, 'magB')).toBe('5.00');
  // scaling must not change the cosine
  expect(await readVal(page, root, 'cosine')).toBe(cosBefore);
  expect(await readVal(page, root, 'angle')).toBe('45.0°');
  // Rotate B left (counterclockwise) by angleStep 15°: angle 45 → 60.
  await page.locator(`${root} [data-ib-rot="1"]`).click();
  expect(await readVal(page, root, 'angle')).toBe('60.0°');
  expect(await readVal(page, root, 'cosine')).toBe('0.500');
  // rotation must not change the length
  expect(await readVal(page, root, 'magB')).toBe('5.00');
  // …and right again restores the authored angle.
  await page.locator(`${root} [data-ib-rot="-1"]`).click();
  expect(await readVal(page, root, 'angle')).toBe('45.0°');
});

test('presets pin the exact cosines; the zero vector is undefined, never NaN', async ({ page }) => {
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#vc-a');
  const root = '#vc-a';
  await page.locator(`${root} [data-ib-scenario="parallel"]`).click();
  expect(await readVal(page, root, 'cosine')).toBe('1.000');
  await page.locator(`${root} [data-ib-scenario="orthogonal"]`).click();
  expect(await readVal(page, root, 'cosine')).toBe('0.000');
  await page.locator(`${root} [data-ib-scenario="opposite"]`).click();
  expect(await readVal(page, root, 'cosine')).toBe('-1.000');
  await page.locator(`${root} [data-ib-scenario="zero"]`).click();
  expect(await readVal(page, root, 'cosine')).toBe(UNDEFINED_EN);
  expect(await readVal(page, root, 'angle')).toBe(UNDEFINED_EN);
  await expectFiniteReadout(page, root);
  // Zero stays zero under scale/rotate (documented semantics, no NaN).
  await page.locator(`${root} [data-ib-rot="1"]`).click();
  expect(await readVal(page, root, 'cosine')).toBe(UNDEFINED_EN);
  await expectFiniteReadout(page, root);
});

test('the rendered angle arc stays centred on the origin for both cross signs', async ({ page }) => {
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#vc-a');
  // Real rendered geometry: the arc's own midpoint must sit `radius` (1.25)
  // from the origin — a wrong sweep bends it around the far circle (~0.52).
  const arcMidRadius = () =>
    page.locator('#vc-a [data-ib-arc]').evaluate((el) => {
      const path = el as unknown as SVGPathElement;
      const mid = path.getPointAtLength(path.getTotalLength() / 2);
      return Math.hypot(mid.x, mid.y);
    });
  // default oblique A=(3,1) B=(1,2): cross +5 → sweep 0
  expect(Math.abs((await arcMidRadius()) - 1.25)).toBeLessThan(0.01);
  // B below A: cross = 3*(-2) − 1*1 = −7 → sweep 1
  await page.locator('#vc-a [data-ib-coord="bx"]').fill('1');
  await page.locator('#vc-a [data-ib-coord="by"]').fill('-2');
  await page.locator('#vc-a [data-ib-coord="by"]').press('Enter');
  expect(Math.abs((await arcMidRadius()) - 1.25)).toBeLessThan(0.01);
  // 0° draws no arc at all
  await page.locator('#vc-a [data-ib-scenario="parallel"]').click();
  const len = await page
    .locator('#vc-a [data-ib-arc]')
    .evaluate((el) => (el as unknown as SVGPathElement).getTotalLength());
  expect(len).toBe(0);
});

test('the scale slider exposes exactly one real label as its accessible name', async ({ page }) => {
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#vc-a');
  await waitForStableLayout(page);
  const scale = page.locator('#vc-a [data-ib-scale]');
  // the value readout must not steal the label (it used to be an <output>)
  expect(await scale.evaluate((el) => (el as HTMLInputElement).labels?.length ?? 0)).toBe(1);
  // the accessible name resolves through the wrapping label text
  const viaName = page.getByLabel('Length of B (direction fixed)', { exact: false }).first();
  expect(await viaName.evaluate((el) => el.hasAttribute('data-ib-scale'))).toBe(true);
  // clicking the label text forwards activation to the slider exactly like a
  // direct click does (some engines never focus range inputs on click — even
  // when clicking the control itself — so activation, not focus, is the
  // cross-engine guarantee; see the coordinate fields below for click focus).
  await page.evaluate(() => {
    const store = window as unknown as { __clicks: string[] };
    store.__clicks = [];
    document.querySelector('#vc-a [data-ib-scale]')!.addEventListener('click', () => store.__clicks.push('scale'));
  });
  await page.locator('#vc-a [data-ib-controls] .ib-range-name').click();
  expect(await page.evaluate(() => (window as unknown as { __clicks: string[] }).__clicks)).toEqual(['scale']);
  // the slider is keyboard-reachable and script-focusable
  await scale.focus();
  expect(await page.evaluate(() => document.activeElement?.hasAttribute('data-ib-scale') ?? false)).toBe(true);
  // coordinate fields keep click-to-focus through their labels (all engines)
  await page.locator('#vc-a [data-ib-controls] .ib-num-label').first().click();
  expect(await page.evaluate(() => document.activeElement?.getAttribute('data-ib-coord'))).toBe('ax');
  // coordinate fields carry real accessible names too
  const ax = page.getByLabel('A x coordinate', { exact: false }).first();
  expect(await ax.evaluate((el) => el.getAttribute('data-ib-coord'))).toBe('ax');
});

test('numeric fields stay valid and commit the bounded state (typed input)', async ({ page }) => {
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#vc-a');
  // an out-of-range entry is free while typing…
  const ax = page.locator('#vc-a [data-ib-coord="ax"]');
  await ax.fill('99999');
  expect(await ax.inputValue()).toBe('99999');
  // …and shows the bounded state on commit (change), even while focused
  await ax.press('Enter');
  expect(await ax.inputValue()).toBe('6.00');
  expect(await readVal(page, '#vc-a', 'ax')).toBe('6.00');
  expect(await ax.evaluate((el: HTMLInputElement) => el.checkValidity())).toBe(true);
  // blur commits the same way
  const by = page.locator('#vc-a [data-ib-coord="by"]');
  await by.fill('-77');
  await page.locator('#vc-a .ib-question').click();
  const byValue = Number.parseFloat(await by.inputValue());
  expect(byValue).toBeGreaterThanOrEqual(-6);
  expect(byValue).toBeLessThanOrEqual(6);
  expect(await by.inputValue()).toBe(await readVal(page, '#vc-a', 'by'));
  await expectFiniteReadout(page, '#vc-a');
});

test('rotation creates exact off-grid coordinates that keep the fields valid', async ({ page }) => {
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#vc-a');
  await page.locator('#vc-a [data-ib-rot="1"]').click();
  for (const key of ['ax', 'ay', 'bx', 'by']) {
    const input = page.locator(`#vc-a [data-ib-coord="${key}"]`);
    const state = await input.evaluate((el) => {
      const i = el as HTMLInputElement;
      return { value: i.value, valid: i.checkValidity(), stepMismatch: i.validity.stepMismatch };
    });
    expect(state.valid).toBe(true);
    expect(state.stepMismatch).toBe(false);
    expect(state.value).toBe(await readVal(page, '#vc-a', key));
  }
});

test('pointer drag moves an endpoint with finite bounds and pointer cancel', async ({ page }) => {
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#vc-a');
  await waitForStableLayout(page);
  const svg = page.locator('#vc-a [data-ib-svg]');
  const handle = page.locator('#vc-a [data-ib-handle="b"]');
  await handle.scrollIntoViewIfNeeded();
  const box = (await svg.boundingBox())!;
  const hb = (await handle.boundingBox())!;
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  // Drag far outside the plane: the coordinate must clamp into the bound disk.
  await page.mouse.move(box.x + box.width * 1.8, box.y - box.height * 0.8, { steps: 5 });
  await page.mouse.up();
  const magB = Number.parseFloat((await readVal(page, '#vc-a', 'magB')) || '');
  expect(magB).toBeLessThanOrEqual(6.01);
  expect(magB).toBeGreaterThan(3);
  await expectFiniteReadout(page, '#vc-a');
  // after dragging, the numeric fields stay valid and mirror the state
  for (const key of ['ax', 'ay', 'bx', 'by']) {
    const input = page.locator(`#vc-a [data-ib-coord="${key}"]`);
    expect(await input.evaluate((el) => (el as HTMLInputElement).checkValidity())).toBe(true);
    expect(await input.inputValue()).toBe(await readVal(page, '#vc-a', key));
  }
  // Drag to the plane centre: B becomes the (quantized) zero neighbourhood.
  await waitForStableLayout(page);
  await handle.scrollIntoViewIfNeeded();
  const hb2 = (await handle.boundingBox())!;
  await page.mouse.move(hb2.x + hb2.width / 2, hb2.y + hb2.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  const magB2 = Number.parseFloat((await readVal(page, '#vc-a', 'magB')) || '');
  expect(magB2).toBeLessThanOrEqual(0.5);
  await expectFiniteReadout(page, '#vc-a');
});

/* ════════════════ deterministic ticks, conservation, bounds ═════════════ */

const flowQueues = async (page: Page) => ({
  generate: Number(await readVal(page, '#fb-a', 'queue-generate')),
  review: Number(await readVal(page, '#fb-a', 'queue-review')),
  delivery: Number(await readVal(page, '#fb-a', 'queue-delivery')),
  wip: Number(await readVal(page, '#fb-a', 'wip')),
  admitted: Number(await readVal(page, '#fb-a', 'admitted')),
  delivered: Number(await readVal(page, '#fb-a', 'delivered')),
  throughput: Number(await readVal(page, '#fb-a', 'throughput')),
  tick: Number(await readVal(page, '#fb-a', 'tick')),
});

test('flow-bottleneck advances deterministic ticks and conserves every job', async ({ page }) => {
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#fb-a');
  let state = await flowQueues(page);
  expect([state.tick, state.generate, state.review, state.delivery, state.delivered]).toEqual([0, 8, 0, 0, 0]);

  const expected = [
    [1, 8, 6, 0, 0],
    [2, 8, 9, 3, 0],
    [3, 8, 12, 3, 3],
    [4, 8, 15, 3, 6],
  ];
  for (const [tick, generate, review, delivery, delivered] of expected) {
    await page.locator('#fb-a [data-ib-tick]').click();
    state = await flowQueues(page);
    expect([state.tick, state.generate, state.review, state.delivery, state.delivered]).toEqual([
      tick,
      generate,
      review,
      delivery,
      delivered,
    ]);
    expect(state.admitted).toBe(state.generate + state.review + state.delivery + state.delivered);
    expect(state.wip).toBe(state.generate + state.review + state.delivery);
  }
  expect(state.throughput).toBe(3);
  // The numeric tick log mirrors the chart (accessible equivalent).
  expect(await page.locator('#fb-a [data-ib-log] tr').count()).toBe(5);
});

test('capacity controls show local speedup against the downstream bottleneck', async ({ page }) => {
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#fb-a');
  // Default reading: review is the narrowest stage.
  expect(await page.locator('#fb-a [data-ib-explain]').textContent()).toContain('narrowest');
  // Local speedup at generation (6 → 10) leaves the delivery rate at 3.
  await page.locator('#fb-a [data-ib-cap="generate"]').fill('10');
  for (let i = 0; i < 4; i += 1) await page.locator('#fb-a [data-ib-tick]').click();
  let state = await flowQueues(page);
  expect(state.delivered).toBe(6);
  expect(state.throughput).toBe(3);
  // Blocking generation starves everything downstream (conserved, not lost).
  await page.locator('#fb-a [data-ib-cap="generate"]').fill('0');
  const beforeTick = await flowQueues(page);
  await page.locator('#fb-a [data-ib-tick]').click();
  state = await flowQueues(page);
  expect(state.generate).toBe(beforeTick.generate + 6);
  expect(state.admitted).toBe(state.generate + state.review + state.delivery + state.delivered);
  // The explanation follows the narrowest stage.
  await page.locator('#fb-a [data-ib-cap="review"]').fill('12');
  await page.locator('#fb-a [data-ib-cap="delivery"]').fill('12');
  expect(await page.locator('#fb-a [data-ib-explain]').textContent()).toContain(
    'Generation is the narrowest'
  );
});

test('ticks stop hard at maxTicks; play never autostarts and toggles manually', async ({ page }) => {
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#fb-a');
  const tickBtn = page.locator('#fb-a [data-ib-tick]');
  const playBtn = page.locator('#fb-a [data-ib-play]');
  await expect(playBtn).toHaveText('Play');
  for (let i = 0; i < 20; i += 1) {
    if (await tickBtn.isDisabled()) break;
    await tickBtn.click();
  }
  const state = await flowQueues(page);
  expect(state.tick).toBe(16);
  await expect(tickBtn).toBeDisabled();
  await expect(playBtn).toBeDisabled();
  expect(state.admitted).toBe(state.generate + state.review + state.delivery + state.delivered);
});

test('reduced motion disables play but keeps manual ticking', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#fb-a');
  await expect(page.locator('#fb-a [data-ib-play]')).toBeDisabled();
  await page.locator('#fb-a [data-ib-tick]').click();
  expect(await readVal(page, '#fb-a', 'tick')).toBe('1');
});

/* ═══════════════════════ reset + instance isolation ═════════════════════ */

test('reset restores the authored default state in both kinds', async ({ page }) => {
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#vc-a');
  await waitForEnhanced(page, '#fb-a');
  await page.locator('#vc-a [data-ib-scenario="opposite"]').click();
  await page.locator('#fb-a [data-ib-scenario="balanced"]').click();
  await page.locator('#fb-a [data-ib-tick]').click();
  await page.locator('#vc-a [data-ib-reset]').click();
  await page.locator('#fb-a [data-ib-reset]').click();
  expect(await readVal(page, '#vc-a', 'cosine')).toBe('0.707');
  const state = await flowQueues(page);
  expect([state.tick, state.generate, state.review, state.delivery]).toEqual([0, 8, 0, 0]);
  // Scenario switch restores THAT scenario's authored values (balanced 0/0/0).
  await page.locator('#fb-a [data-ib-scenario="balanced"]').click();
  const balanced = await flowQueues(page);
  expect([balanced.generate, balanced.review, balanced.delivery]).toEqual([0, 0, 0]);
});

test('instances are fully independent (same kind twice, kinds side by side)', async ({ page }) => {
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#vc-a');
  await waitForEnhanced(page, '#vc-b');
  await waitForEnhanced(page, '#fb-a');
  await waitForEnhanced(page, '#fb-b');
  const bBefore = await readVal(page, '#vc-b', 'cosine');
  await page.locator('#vc-a [data-ib-scenario="opposite"]').click();
  expect(await readVal(page, '#vc-a', 'cosine')).toBe('-1.000');
  expect(await readVal(page, '#vc-b', 'cosine')).toBe(bBefore);
  await page.locator('#fb-a [data-ib-tick]').click();
  expect(await readVal(page, '#fb-a', 'tick')).toBe('1');
  expect(await readVal(page, '#fb-b', 'tick')).toBe('0');
});

test('the read-only reference survives enhancement and interaction untouched', async ({ page }) => {
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#vc-a');
  const details = page.locator('#vc-a .ib-reference');
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open', '');
  await page.locator('#vc-a [data-ib-scenario="parallel"]').click();
  await expect(details).toHaveAttribute('open', '');
  // Complete: one block per preset, exact values present, no runtime hooks.
  expect(await details.locator('.ib-ref-block').count()).toBe(5);
  const html = await details.innerHTML();
  expect(html).not.toContain('data-ib-');
  expect(html).toContain(UNDEFINED_EN);
  // flow reference: 4 presets × 4 sampled ticks from the same spec.
  const flowDetails = page.locator('#fb-a .ib-reference');
  await flowDetails.locator('summary').click();
  expect(await flowDetails.locator('.ib-ref-block').count()).toBe(4);
  expect(await flowDetails.locator('tbody tr').count()).toBe(16);
});

/* ══════════════════════ fallback (404 / corrupt / no JS) ════════════════ */

test('script 404 keeps the complete static view with no dead controls', async ({ page }) => {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (route.request().resourceType() === 'script' && /components\/(vector-cosine|flow-bottleneck)/.test(url)) {
      await route.abort();
      return;
    }
    await route.continue();
  });
  await page.goto(`${base}/geometry/`);
  await page.waitForLoadState('load');
  for (const root of ['#vc-a', '#fb-a']) {
    await expect(page.locator(root)).not.toHaveAttribute('data-enhanced', /.*/);
    await expect(page.locator(`${root} [data-ib-controls]`)).toBeHidden();
    // The static slot reserves the exact control box while staying invisible
    // (visibility:hidden — it is never a fake focusable control).
    const slot = page.locator(`${root} [data-ib-ctrl-slot]`);
    expect(await slot.evaluate((el) => getComputedStyle(el).visibility)).toBe('hidden');
    const box = await slot.boundingBox();
    expect(box && box.height).toBeGreaterThan(0);
  }
  // SSR results and the complete reference stay readable.
  expect(await readVal(page, '#vc-a', 'cosine')).toBe('0.707');
  expect(await readVal(page, '#fb-a', 'tick')).toBe('0');
  // the SSR rule-based reading matches the pure model for the default state
  expect(await page.locator('#fb-a [data-ib-explain]').textContent()).toContain('Review is the narrowest');
  // the server-rendered arc is origin-centred as well (template sweep fix)
  const ssrArcMid = await page.locator('#vc-a [data-ib-arc]').evaluate((el) => {
    const path = el as unknown as SVGPathElement;
    const mid = path.getPointAtLength(path.getTotalLength() / 2);
    return Math.hypot(mid.x, mid.y);
  });
  expect(Math.abs(ssrArcMid - 1.25)).toBeLessThan(0.01);
  await page.locator('#vc-a .ib-reference summary').click();
  await expect(page.locator('#vc-a .ib-reference')).toHaveAttribute('open', '');
});

test('corrupt embedded config falls back without touching healthy siblings', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(`${base}/geometry-corrupt/`);
  await waitForEnhanced(page, '#vc-b');
  await waitForEnhanced(page, '#fb-a');
  await expect(page.locator('#vc-a')).not.toHaveAttribute('data-enhanced', /.*/);
  await expect(page.locator('#vc-a [data-ib-controls]')).toBeHidden();
  // trusted SSR preserved
  expect(await readVal(page, '#vc-a', 'cosine')).toBe('0.707');
  await expectFiniteReadout(page, '#vc-a');
  expect(errors, errors.join('; ')).toEqual([]);
});

test('an unsupported envelope lang is rejected before enhancement', async ({ page }) => {
  await page.goto(`${base}/geometry-lang/`);
  await waitForEnhanced(page, '#vc-b');
  await expect(page.locator('#vc-a')).not.toHaveAttribute('data-enhanced', /.*/);
  expect(await readVal(page, '#vc-a', 'cosine')).toBe('0.707');
});

test('no JS: controls stay invisible and the native reference opens', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${base}/geometry/`);
  await expect(page.locator('#vc-a [data-ib-controls]')).toBeHidden();
  await expect(page.locator('#fb-a [data-ib-tick]')).toBeHidden();
  expect(await readVal(page, '#vc-a', 'cosine')).toBe('0.707');
  await page.locator('#vc-a .ib-reference summary').click();
  await expect(page.locator('#vc-a .ib-reference')).toHaveAttribute('open', '');
  await context.close();
});

/* ══════════════ zh locale, mobile geometry, offline purity ══════════════ */

test('the zh locale renders zh copy end to end', async ({ page }) => {
  await page.goto(`${base}/zh/geometry/`);
  await waitForEnhanced(page, '#vc-a');
  expect(await readVal(page, '#vc-a', 'cosine')).toBe('0.707');
  await page.locator('#vc-a [data-ib-scenario="zero"]').click();
  expect(await readVal(page, '#vc-a', 'cosine')).toBe(UNDEFINED_ZH);
  expect(await page.locator('#fb-a .ib-reference summary').textContent()).toContain('推演');
});

test('mobile 320px: nothing overflows the page and controls stay ≥ 44px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#vc-a');
  await waitForEnhanced(page, '#fb-a');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
  for (const selector of [
    '#vc-a [data-ib-coord="ax"]',
    '#vc-a [data-ib-rot="1"]',
    '#fb-a [data-ib-tick]',
    '#fb-a [data-ib-cap="generate"]',
  ]) {
    const box = await page.locator(selector).first().boundingBox();
    expect(box, selector).not.toBeNull();
    expect(box!.height, selector).toBeGreaterThanOrEqual(44);
  }
  // Long labels wrap; the SVG scales with the column instead of overflowing.
  const svg = await page.locator('#vc-a [data-ib-svg]').boundingBox();
  expect(svg!.width).toBeLessThanOrEqual(320);
});

test('interacting performs zero requests and zero storage writes', async ({ page, context }) => {
  // The TWO known preexisting third-party embeds (Google Analytics bootstrap,
  // utterances comments widget) are aborted at the route before load, exactly
  // as the shared suite documents — their fetch attempts are excluded from the
  // zero-request count and nothing else is filtered.
  const ambientEmbed = /(googletagmanager\.com|google-analytics\.com|utteranc)/;
  await context.route(ambientEmbed, (route) => route.abort());
  await context.addInitScript(instrumentation);
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#vc-a');
  await waitForEnhanced(page, '#fb-a');
  // Freeze only after every static resource (incl. lazy font slices) is in.
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 8000))]));
  await page.evaluate(() => {
    (window as unknown as { __writes: string[] }).__writes = [];
  });
  await context.setOffline(true);
  const requests: string[] = [];
  page.on('request', (req) => {
    if (!ambientEmbed.test(req.url())) requests.push(req.url());
  });
  await page.locator('#vc-a [data-ib-scale]').evaluate((el) => {
    const input = el as HTMLInputElement;
    input.value = '4';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('#vc-a [data-ib-rot="1"]').click();
  await page.locator('#vc-a [data-ib-scenario="parallel"]').click();
  await page.locator('#fb-a [data-ib-tick]').click();
  await page.locator('#fb-a [data-ib-tick]').click();
  await page.locator('#fb-a [data-ib-reset]').click();
  expect(requests, requests.join(', ')).toEqual([]);
  const writes = await page.evaluate(() => (window as unknown as { __writes: string[] }).__writes);
  expect(writes).toEqual([]);
});

test('the reading separates demand-limited spare capacity from real buildup', async ({ page }) => {
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#fb-a');
  await waitForStableLayout(page);
  // demand 6 > review 3: the buildup reading names review
  expect(await page.locator('#fb-a [data-ib-explain]').textContent()).toContain('Review is the narrowest');
  // 8/10/12 all absorb demand 6 — no queue-buildup claim
  await page.locator('#fb-a [data-ib-cap="generate"]').fill('8');
  await page.locator('#fb-a [data-ib-cap="review"]').fill('10');
  await page.locator('#fb-a [data-ib-cap="delivery"]').fill('12');
  expect(await page.locator('#fb-a [data-ib-explain]').textContent()).toContain('Every stage absorbs');
  // dropping a stage below demand flips back to the buildup reading
  await page.locator('#fb-a [data-ib-cap="review"]').fill('2');
  expect(await page.locator('#fb-a [data-ib-explain]').textContent()).toContain('Review is the narrowest');
  // demand-limited delivery follows demand (balanced preset: 6/6/6, empty)
  await page.locator('#fb-a [data-ib-reset]').click();
  await page.locator('#fb-a [data-ib-scenario="balanced"]').click();
  expect(await page.locator('#fb-a [data-ib-explain]').textContent()).toContain('Every stage absorbs');
  for (let i = 0; i < 3; i += 1) await page.locator('#fb-a [data-ib-tick]').click();
  expect(await readVal(page, '#fb-a', 'throughput')).toBe('6');
  expect(await readVal(page, '#fb-a', 'delivered')).toBe('6');
});

test('reconnect keeps exactly one binding per control and cancels pending timers', async ({ page }) => {
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#fb-a');
  await waitForStableLayout(page);
  await page.locator('#fb-a [data-ib-tick]').click();
  expect(await readVal(page, '#fb-a', 'tick')).toBe('1');
  await page.evaluate(() => {
    const store = window as unknown as { __el: Element; __parent: Node };
    const el = document.querySelector('#fb-a')!;
    store.__el = el;
    store.__parent = el.parentNode!;
    el.remove();
  });
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    const store = window as unknown as { __el: Element; __parent: Node };
    store.__parent.appendChild(store.__el);
  });
  await expect(page.locator('#fb-a')).toHaveAttribute('data-enhanced', 'flow-bottleneck');
  // exactly one click handler per control: one click = one tick
  await page.locator('#fb-a [data-ib-tick]').click();
  expect(await readVal(page, '#fb-a', 'tick')).toBe('2');
  // disconnect cancels playback timers: remove mid-play, nothing advances
  await page.locator('#fb-a [data-ib-play]').click();
  await page.waitForTimeout(1100); // >= one play tick
  const snapshot = await page.evaluate(() => {
    const store = window as unknown as { __el: Element };
    store.__el.remove();
    return store.__el.querySelector('[data-ib-val="tick"]')!.textContent;
  });
  await page.waitForTimeout(1600); // would tick again if a timer leaked
  const afterWait = await page.evaluate(() => {
    const store = window as unknown as { __el: Element };
    return store.__el.querySelector('[data-ib-val="tick"]')!.textContent;
  });
  expect(afterWait).toBe(snapshot);
  await page.evaluate(() => {
    const store = window as unknown as { __el: Element; __parent: Node };
    store.__parent.appendChild(store.__el);
  });
  await expect(page.locator('#fb-a [data-ib-play]')).toHaveText('Play'); // reconnect stays paused
  await page.locator('#fb-a [data-ib-tick]').click();
  expect(Number(await readVal(page, '#fb-a', 'tick'))).toBe(Number(snapshot) + 1);
});

test('a controlled reconnect render fault restores SSR and hides dead controls', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#vc-a');
  await waitForEnhanced(page, '#fb-a');
  await waitForStableLayout(page);
  await page.locator('#vc-a .ib-reference summary').click();
  await expect(page.locator('#vc-a .ib-reference')).toHaveAttribute('open', '');
  await page.evaluate(() => {
    const store = window as unknown as { __els: Element[]; __parents: Node[] };
    store.__els = [];
    store.__parents = [];
    for (const id of ['vc-a', 'fb-a']) {
      const el = document.querySelector(`#${id}`) as HTMLElement & { _paint: () => void };
      store.__els.push(el);
      store.__parents.push(el.parentNode!);
      el._paint = () => {
        throw new Error('controlled reconnect fault');
      };
      el.remove();
    }
  });
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    const store = window as unknown as { __els: Element[]; __parents: Node[] };
    store.__els.forEach((el, i) => store.__parents[i].appendChild(el));
  });
  for (const root of ['#vc-a', '#fb-a']) {
    await expect(page.locator(root)).not.toHaveAttribute('data-enhanced', /.*/);
    await expect(page.locator(`${root} [data-ib-controls]`)).toBeHidden();
    const slot = page.locator(`${root} [data-ib-ctrl-slot]`);
    expect(await slot.evaluate((el) => getComputedStyle(el).visibility)).toBe('hidden');
    expect((await slot.boundingBox())!.height).toBeGreaterThan(0);
  }
  // trusted SSR restored, the reference is left exactly as the reader has it
  expect(await readVal(page, '#vc-a', 'cosine')).toBe('0.707');
  expect(await readVal(page, '#fb-a', 'tick')).toBe('0');
  await expect(page.locator('#vc-a .ib-reference')).toHaveAttribute('open', '');
  expect(errors, errors.join('; ')).toEqual([]);
});

test('touch-action is locked only on enhanced drag handles; plot scrolling survives', async ({ browser }) => {
  // static fallback (component scripts 404): no touch-action lock anywhere
  const staticContext = await browser.newContext();
  const staticPage = await staticContext.newPage();
  await staticPage.route('**/*', async (route) => {
    const url = route.request().url();
    if (route.request().resourceType() === 'script' && /components\/(vector-cosine|flow-bottleneck)/.test(url)) {
      await route.abort();
      return;
    }
    await route.continue();
  });
  await staticPage.goto(`${base}/geometry/`);
  await waitForStableLayout(staticPage);
  expect(
    await staticPage.locator('#vc-a [data-ib-svg]').evaluate((el) => getComputedStyle(el).touchAction)
  ).not.toBe('none');
  expect(
    await staticPage.locator('#vc-a [data-ib-handle]').first().evaluate((el) => getComputedStyle(el).touchAction)
  ).not.toBe('none');
  await staticContext.close();

  // enhanced: only the two drag handles capture touch gestures
  const page = await browser.newPage();
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#vc-a');
  expect(await page.locator('#vc-a [data-ib-svg]').evaluate((el) => getComputedStyle(el).touchAction)).not.toBe('none');
  expect(
    await page.locator('#vc-a [data-ib-handle]').first().evaluate((el) => getComputedStyle(el).touchAction)
  ).toBe('none');
  // the hit target is larger than the visible dot; the numeric alternative is visible
  const hit = (await page.locator('#vc-a [data-ib-handle="a"]').boundingBox())!;
  const dot = (await page.locator('#vc-a [data-ib-dot="a"]').boundingBox())!;
  expect(hit.width).toBeGreaterThan(dot.width);
  await expect(page.locator('#vc-a [data-ib-coord="ax"]')).toBeVisible();
  await page.close();
});

test('keyboard: the numeric fields are a full drag equivalent', async ({ page }) => {
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#vc-a');
  const bx = page.locator('#vc-a [data-ib-coord="bx"]');
  await bx.focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('-1');
  await page.keyboard.press('Enter');
  expect(await readVal(page, '#vc-a', 'bx')).toBe('-1.00');
  expect(await readVal(page, '#vc-a', 'dot')).toBe('-1.00');
  // Focus stays on the field across the update (no focus stealing).
  expect(await page.evaluate(() => document.activeElement?.getAttribute('data-ib-coord'))).toBe('bx');
});

test('flow chart axis follows its actual scale and visible capacities track presets', async ({ page }) => {
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#fb-a');
  const root = page.locator('#fb-a');
  const max = root.locator('[data-ib-chart-max]');
  await expect(max).toHaveText('8');
  await expect(root.locator('[data-ib-val="capacity-review"]')).toHaveText('3');
  for (const expected of [14, 20]) {
    await root.locator('[data-ib-tick]').click();
    await expect(max).toHaveText(String(expected));
    await expect(root.locator('[data-ib-val="wip"]')).toHaveText(String(expected));
    const pairs = (await root.locator('[data-ib-chart-line="wip"]').getAttribute('points'))!.split(' ');
    expect(Number(pairs[pairs.length - 1].split(',')[1])).toBe(8);
  }
  await root.locator('[data-ib-reset]').click();
  await expect(max).toHaveText('8');
  await root.locator('[data-ib-scenario="warm-start"]').click();
  await expect(max).toHaveText('14');
  await expect(root.locator('[data-ib-live]')).toContainText('14');
  await root.locator('[data-ib-scenario="balanced"]').click();
  await expect(root.locator('[data-ib-val="capacity-review"]')).toHaveText('6');
  await root.locator('[data-ib-cap="review"]').fill('9');
  await expect(root.locator('[data-ib-val="capacity-review"]')).toHaveText('9');
  await root.locator('[data-ib-reset]').click();
  await page.waitForTimeout(450);
  await expect(root.locator('[data-ib-live]')).toHaveText('');
});

test('two-tick spec bounds genuine SSR reference and the runtime; capacities are readable without JS', async ({ browser, baseURL, page }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const fallback = await context.newPage();
  await fallback.goto('/geometry-short/');
  const root = fallback.locator('#flow-short');
  await expect(root.locator('[data-ib-val="capacity-generate"]')).toBeVisible();
  await expect(root.locator('[data-ib-val="capacity-review"]')).toHaveText('3');
  const tree = await root.ariaSnapshot();
  expect(tree).toContain('Capacity per tick · Generation');
  expect(tree).toContain('Capacity per tick · Review');
  expect(tree).toContain('Capacity per tick · Delivery');
  for (const block of await root.locator('details.ib-reference .ib-ref-block').all()) {
    expect(await block.locator('tbody tr td:first-child').allTextContents()).toEqual(['0', '1', '2']);
  }
  await context.close();
  await page.goto('/geometry-short/');
  const live = page.locator('#flow-short');
  await expect(live).toHaveAttribute('data-enhanced', /.*/);
  await live.locator('[data-ib-tick]').click();
  await live.locator('[data-ib-tick]').click();
  await expect(live.locator('[data-ib-val="tick"]')).toHaveText('2');
  await expect(live.locator('[data-ib-tick]')).toBeDisabled();
  await expect(live.locator('[data-ib-play]')).toBeDisabled();
  await expect(live.locator('[data-ib-log] tr')).toHaveCount(3);
});

test('geometry presets announce the new result while reset remains quiet', async ({ page }) => {
  await page.goto(`${base}/geometry/`);
  await waitForEnhanced(page, '#vc-a');
  const vector = page.locator('#vc-a');
  await vector.locator('[data-ib-scenario="opposite"]').click();
  await expect(vector.locator('[data-ib-live]')).toContainText('-1.000');
  await vector.locator('[data-ib-scenario="orthogonal"]').click();
  await vector.locator('[data-ib-reset]').click();
  await page.waitForTimeout(450);
  await expect(vector.locator('[data-ib-live]')).toHaveText('');
});
