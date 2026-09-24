import { test, expect, type Locator } from '@playwright/test';
import { instrumentation } from '../interactive/test-support';

async function expectPrintableReference(reference: Locator) {
  await expect(reference).not.toHaveAttribute('open', '');
  expect((await reference.textContent())!.trim().length).toBeGreaterThan(80);
  // Playwright's WebKit workaround treats every closed-details descendant
  // as hidden, even when print CSS exposes ::details-content. Verify the
  // browser's actual print layout and native visibility without opening it.
  const sections = await reference.locator(':scope > :not(summary)').evaluateAll((elements) => elements.map((el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      width: rect.width, height: rect.height,
      visible: style.visibility === 'visible' && style.display !== 'none' &&
        (typeof el.checkVisibility !== 'function' || el.checkVisibility()),
      content: (el.textContent || '').trim().length,
    };
  }));
  expect(sections.length).toBeGreaterThan(0);
  for (const section of sections) {
    expect(section.width).toBeGreaterThan(0);
    expect(section.height).toBeGreaterThan(0);
    expect(section.visible).toBe(true);
    expect(section.content).toBeGreaterThan(0);
  }
}

// Article-level contract, separate from each component's detailed behavior suite.
const articles = [
  ['ai-agent', 'agent-system-design-pi', 'session-tree', false],
  ['ai-agent', 'agent-system-design-openclaw', 'session-scope', false],
  ['ai-agent', '2026-07-31-forgetting-is-an-ai-system-capability', 'memory-lineage', true],
  ['ai-agent', 'agent-system-design-n8n', 'effect-recovery', false],
  ['ai-agent', 'langgraph', 'effect-recovery', true],
  ['engineering', 'argo-cd', 'gitops-reconcile', true],
  ['ai-agent', 'prompt-loop-engineering-practice', 'agent-loop', true],
  ['ai-agent', 'trusting-unattended-ai-agent', 'reliability-chain', true],
  ['ai-agent', 'open-model-cost-collapse-agent-fleet', 'task-cost', true],
  ['ai-agent', 'proactive-agent-it-prompts-you', 'notification-threshold', true],
  ['ai-agent', 'vector-database-learning', 'vector-cosine', true],
  ['growth', '2026-07-26-bottlenecks-after-ai', 'flow-bottleneck', true],
] as const;

// LangGraph preserves its established public project URL in front matter.
const articleUrl = (lang: string, section: string, slug: string) =>
  `${lang === 'zh' ? '/zh' : ''}/${slug === 'langgraph' ? 'projects/langgraph' : `${section}/posts/${slug}`}/`;

for (const [section, slug, kind, english] of articles) {
  for (const lang of english ? ['zh', 'en'] : ['zh']) {
    const url = articleUrl(lang, section, slug);
    test(`${slug} (${lang}): published article interaction, narrow layout and print`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      // Existing third-party article embeds are outside this component test.
      await page.route(/googletagmanager\.com|google-analytics\.com|utteranc/, (route) => route.abort());
      const response = await page.goto(url);
      expect(response?.status()).toBe(200);
      const root = page.locator(`blog-${kind}`);
      await expect(root).toHaveCount(1);
      await expect(root).toHaveAttribute('data-enhanced', /.*/);
      await expect(page.locator('h1.post-title')).toBeVisible();
      await expect(root.locator('script[data-ib-config]')).toHaveCount(1);
      const config = JSON.parse((await root.locator('script[data-ib-config]').textContent())!);
      expect(config.lang).toBe(lang);
      expect(config.spec.kind).toBe(kind);
      await expect(root.locator('details.ib-reference > summary')).toBeVisible();
      // Optional teaching modes must meet the same control contract after
      // readers disclose them, not escape checks because they start closed.
      for (const disclosure of await root.locator('details:not(.ib-reference):visible').all()) {
        if (!(await disclosure.evaluate((el) => (el as HTMLDetailsElement).open))) {
          await disclosure.locator(':scope > summary').click();
        }
      }
      for (const role of ['button', 'slider', 'spinbutton', 'combobox', 'checkbox', 'radio'] as const) {
        expect(await root.getByRole(role, { name: /\S/ }).count(), `${kind}: unnamed ${role}`)
          .toBe(await root.getByRole(role).count());
      }

      for (const theme of ['light', 'dark']) {
        await page.evaluate((t) => {
          document.body.classList.toggle('dark', t === 'dark');
          document.documentElement.setAttribute('data-theme', t);
        }, theme);
        await page.setViewportSize({ width: 320, height: 800 });
        await root.scrollIntoViewIfNeeded();
        expect(await root.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${kind} overflow (${theme})`).toBe(true);
        const undersized = await root.locator('button, input, select, summary').evaluateAll((controls) => controls.filter((el) => {
          const actual = el.getBoundingClientRect();
          if (!actual.width || !actual.height || getComputedStyle(el).visibility === 'hidden') return false;
          // Native checkbox/radio labels form part of the actual click target.
          const target = el instanceof HTMLInputElement && ['checkbox', 'radio'].includes(el.type)
            ? el.labels?.[0] || el : el;
          const r = target.getBoundingClientRect();
          return r.width < 43.5 || r.height < 43.5;
        }).map((el) => el.outerHTML.slice(0, 200)));
        expect(undersized, `touch targets: ${kind}`).toEqual([]);
      }
      await page.emulateMedia({ media: 'print' });
      // A complete static reference remains in the document for printing.
      const reference = root.locator('details.ib-reference');
      await expectPrintableReference(reference);
      await expect(root.locator('button:visible, input:visible, select:visible')).toHaveCount(0);
      expect(errors).toEqual([]);
    });

    test(`${slug} (${lang}): article remains meaningful with JavaScript disabled`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
      const page = await context.newPage();
      await page.goto(url);
      const root = page.locator(`blog-${kind}`);
      await expect(root).toHaveCount(1);
      await expect(root).not.toHaveAttribute('data-enhanced', /.*/);
      expect(await root.innerText()).not.toMatch(/%!\w+\(/);
      const reference = root.locator('details.ib-reference');
      await reference.locator('summary').click();
      await expect(reference).toHaveAttribute('open', '');
      expect((await reference.textContent())!.trim().length).toBeGreaterThan(80);
      await reference.locator('summary').click();
      await page.emulateMedia({ media: 'print' });
      await expectPrintableReference(reference);
      await expect(root.locator('button:visible, input:visible, select:visible')).toHaveCount(0);
      await context.close();
    });
  }
}

const representatives = articles.filter((article, index) =>
  articles.findIndex((candidate) => candidate[2] === article[2]) === index);
for (const [section, slug, kind] of representatives) {
  test(`${kind}: failed script keeps the reference and delayed enhancement preserves layout`, async ({ page }) => {
    // At this breakpoint the tree's old intrinsic-width placeholder fit on
    // one line while the native select wrapped. Cover it in every engine.
    if (kind === 'session-tree') await page.setViewportSize({ width: 375, height: 812 });
    const componentScript = new RegExp(`/js/components/${kind}[^/]*\\.js(?:\\?.*)?$`);
    await page.route(/googletagmanager\.com|google-analytics\.com|utteranc/, (route) => route.abort());
    await page.route(componentScript, (route) => route.abort());
    await page.goto(articleUrl('zh', section, slug));
    const root = page.locator(`blog-${kind}`);
    await expect(root).toBeVisible();
    await expect(root).not.toHaveAttribute('data-enhanced', /.*/);
    await expect(root.locator('button:visible, input:visible, select:visible')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    const reference = root.locator('details.ib-reference');
    await reference.locator('summary').click();
    await expect(reference).toHaveAttribute('open', '');
    const before = await root.boundingBox();
    const referenceMarkup = await reference.innerHTML();

    const src = await page.locator(`script[type="module"][src*="/components/${kind}."]`).getAttribute('src');
    expect(src).toBeTruthy();
    await page.unroute(componentScript);
    await page.evaluate((url) => {
      const retry = document.createElement('script');
      retry.type = 'module';
      retry.src = `${url}?delayed-enhancement=1`;
      document.body.append(retry);
    }, src!);
    await expect(root).toHaveAttribute('data-enhanced', /.*/);
    const after = await root.boundingBox();
    expect(Math.abs(after!.height - before!.height), `${kind}: initial upgrade height shift`).toBeLessThanOrEqual(2);
    expect(Math.abs(after!.width - before!.width)).toBeLessThanOrEqual(1);
    await expect(reference).toHaveAttribute('open', '');
    expect(await reference.innerHTML()).toBe(referenceMarkup);
  });

  test(`${kind}: reader interaction performs no requests or persistence`, async ({ page, context }) => {
    const ambient = /googletagmanager\.com|google-analytics\.com|utteranc/;
    await context.route(ambient, (route) => route.abort());
    await page.addInitScript(instrumentation);
    await page.goto(articleUrl('zh', section, slug));
    const root = page.locator(`blog-${kind}`);
    await expect(root).toHaveAttribute('data-enhanced', /.*/);
    // Warm the article's lazy recommendation/cover images before isolating
    // component requests. Scrolling to controls must not count unrelated
    // browser image loading as an interaction request.
    await page.evaluate(() => {
      document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
    });
    await root.scrollIntoViewIfNeeded();
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 8000)),
    ]));
    const before = await page.evaluate(() => {
      (window as unknown as { __writes: string[] }).__writes = [];
      return { local: { ...localStorage }, session: { ...sessionStorage }, cookie: document.cookie };
    });
    const requests: string[] = [];
    page.on('request', (request) => { if (!ambient.test(request.url())) requests.push(request.url()); });
    await context.setOffline(true);
    const reading = await root.innerText();
    const range = root.locator('input[type="range"]:visible').first();
    const select = root.locator('select:visible').first();
    if (await range.count()) {
      const direction = await range.evaluate((input: HTMLInputElement) =>
        input.valueAsNumber < Number(input.max) ? 'ArrowRight' : 'ArrowLeft');
      await range.focus();
      await range.press(direction);
    } else if (await select.count()) {
      const next = await select.evaluate((input: HTMLSelectElement) =>
        (input.selectedIndex + 1) % input.options.length);
      await select.selectOption({ index: next });
    } else {
      const buttons = root.locator('button:visible:enabled:not([data-ib-reset])');
      expect(await buttons.count()).toBeGreaterThan(0);
      await buttons.last().click();
    }
    await expect.poll(() => root.innerText()).not.toBe(reading);
    // Observe pending announcements/timers before reset can cancel them.
    await page.waitForTimeout(450);
    await root.locator('[data-ib-reset]').click();
    await page.waitForTimeout(450);
    const after = await page.evaluate(() => ({
      local: { ...localStorage }, session: { ...sessionStorage }, cookie: document.cookie,
      writes: (window as unknown as { __writes: string[] }).__writes,
    }));
    expect(requests).toEqual([]);
    expect(after.writes).toEqual([]);
    expect({ local: after.local, session: after.session, cookie: after.cookie }).toEqual(before);
  });
}
