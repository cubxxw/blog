import { newFrozenContext, test, expect, type Page } from '../helpers/frozen-site';

/**
 * Article native disclosure (DESIGN.md → Article Disclosure).
 *
 * Covers the flat editorial <details>/<summary> treatment for raw
 * classless disclosures in article prose (native markdown HTML and the
 * PaperMod collapse shortcode) on the real ZH/EN Nango pages:
 * summary strip geometry, 展开/收起 (Expand/Collapse) action label,
 * click + keyboard toggling, the JS bottom collapse button's focus
 * hand-off, the no-JS fallback, mobile long-title geometry, and the
 * exclusion of specialised classed details (FAQ etc.).
 */

const ZH_URL = '/zh/ai-agent/posts/nango-user-defined-mcp-integration/';
const EN_URL = '/ai-agent/posts/nango-user-defined-mcp-integration/';
const FAQ_URL = '/zh/ai-agent/posts/geo-generative-engine-optimization-guide/';

// Both spellings match the same disclosures before/after JS tags them.
const DISCLOSURES = '.post-content details.article-disclosure, .post-content details:not([class])';

function disclosureStyles(page: Page, nth: number) {
  return page.locator(DISCLOSURES).nth(nth).evaluate((details) => {
    const summary = details.querySelector(':scope > summary') as HTMLElement;
    const s = getComputedStyle(summary);
    const d = getComputedStyle(details);
    return {
      borderTopWidth: s.borderTopWidth,
      borderBottomWidth: s.borderBottomWidth,
      stripBackground: s.backgroundColor,
      radius: d.borderRadius,
      shadow: d.boxShadow,
      stripHeight: summary.getBoundingClientRect().height,
      label: getComputedStyle(summary, '::after').content,
      chevron: getComputedStyle(summary, '::before').content,
    };
  });
}

function isOpen(page: Page, nth: number) {
  return page
    .locator(DISCLOSURES)
    .nth(nth)
    .evaluate((el) => (el as HTMLDetailsElement).open);
}

test.describe('Article disclosure — ZH/EN editorial strip', () => {
  test('zh: flat strip, 展开/收起 action, click and keyboard toggle', async ({ page }) => {
    const response = await page.goto(ZH_URL);
    expect(response?.status()).toBe(200);

    const details = page.locator(DISCLOSURES);
    expect(await details.count()).toBeGreaterThanOrEqual(3);
    // Loaded only on article pages whose content contains <details>…
    await expect(page.locator('script[src*="article-disclosure"]')).toHaveCount(1);
    // Enhancement tags every classless article disclosure exactly once,
    // and only inside the article prose.
    expect(
      await details.evaluateAll((els) =>
        els.filter((el) => el.getAttribute('data-article-disclosure') === '1').length),
    ).toBe(await details.count());
    expect(
      await page.evaluate(() => {
        const tagged = Array.from(document.querySelectorAll('details[data-article-disclosure]'));
        return tagged.every(
          (el) => el.classList.contains('article-disclosure') && !!el.closest('.post-content'),
        );
      }),
    ).toBe(true);

    const styles = await disclosureStyles(page, 0);
    // Flat editorial strip: hairline rules top/bottom, token tint, no card.
    expect(styles.borderTopWidth).toBe('1px');
    expect(styles.borderBottomWidth).toBe('1px');
    expect(styles.stripBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(styles.radius).toBe('0px');
    expect(styles.shadow).toBe('none');
    expect(styles.stripHeight).toBeGreaterThanOrEqual(44);
    // Explicit action label + fine chevron drawn as CSS (not the legacy ▸).
    expect(styles.label).toContain('展开');
    expect(styles.chevron).toBe('""');

    const summary = details.nth(0).locator(':scope > summary');
    // Native click semantics on the whole strip.
    expect(await isOpen(page, 0)).toBe(false);
    await summary.click();
    expect(await isOpen(page, 0)).toBe(true);
    expect((await disclosureStyles(page, 0)).label).toContain('收起');
    await summary.click();
    expect(await isOpen(page, 0)).toBe(false);

    // Native keyboard semantics: Enter opens, Space closes.
    await summary.press('Enter');
    expect(await isOpen(page, 0)).toBe(true);
    await summary.press('Space');
    expect(await isOpen(page, 0)).toBe(false);

    // Expanded content: comfortable inset and hairline left guide where
    // ::details-content exists; inset-only fallback elsewhere.
    await summary.click();
    await page.waitForTimeout(400); // let the reveal settle before measuring
    const content = await details.nth(0).evaluate((el) => {
      const summaryEl = el.querySelector(':scope > summary') as HTMLElement;
      const child = Array.from(el.children).find(
        (node) => node.tagName !== 'SUMMARY' && !node.classList.contains('article-disclosure__collapse'),
      ) as HTMLElement | undefined;
      const supportsGuide =
        typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('selector(::details-content)');
      return {
        inset: child ? child.getBoundingClientRect().left - summaryEl.getBoundingClientRect().left : -1,
        supportsGuide,
        guideWidth: supportsGuide ? getComputedStyle(el, '::details-content').borderLeftWidth : 'n/a',
      };
    });
    expect(content.inset).toBeGreaterThanOrEqual(32);
    if (content.supportsGuide) expect(content.guideWidth).toBe('1px');
  });

  test('en: English Expand/Collapse action label', async ({ page }) => {
    const response = await page.goto(EN_URL);
    expect(response?.status()).toBe(200);

    await expect(page.locator('script[src$="/js/article-disclosure.js"]')).toHaveCount(1);
    await expect(page.locator('details.article-disclosure').first()).toHaveAttribute('data-article-disclosure', '1');
    const details = page.locator(DISCLOSURES);
    expect(await details.count()).toBeGreaterThanOrEqual(3);
    expect((await disclosureStyles(page, 0)).label).toContain('Expand');

    const summary = details.nth(0).locator(':scope > summary');
    await summary.press('Enter');
    expect(await isOpen(page, 0)).toBe(true);
    expect((await disclosureStyles(page, 0)).label).toContain('Collapse');
    await summary.press('Space');
    expect(await isOpen(page, 0)).toBe(false);
  });

  test('bottom collapse button returns focus to summary without scroll jumps', async ({ page }) => {
    await page.goto(ZH_URL);
    const details = page.locator(DISCLOSURES).nth(0);
    const summary = details.locator(':scope > summary');
    const button = details.locator('button.article-disclosure__collapse');

    // Long blocks only: the first disclosure wraps a full code listing.
    await summary.click();
    expect(await isOpen(page, 0)).toBe(true);
    await expect(button).toHaveCount(1);
    await expect(button).toHaveText(/^收起\s*↑$/);
    // Accessible name carries the summary title for uniqueness; the visible
    // label stays in the name and the decorative arrow is excluded.
    const label = await button.getAttribute('aria-label');
    expect(label).toContain('收起');
    expect(label).toContain('完整后端脚本');
    expect(await button.locator('span[aria-hidden="true"]').count()).toBe(1);

    // Off-screen summary: the collapse brings it back into reach and hands
    // focus to it.
    await button.scrollIntoViewIfNeeded();
    await button.click();
    expect(await isOpen(page, 0)).toBe(false);
    await page.waitForFunction((index) => {
      const el = document.querySelectorAll('.post-content details > summary')[index];
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const top = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      return rect.top >= top - 1 && rect.bottom <= (window.innerHeight || 0) + 1;
    }, 0);
    expect(
      await page.evaluate(() => {
        const active = document.activeElement;
        return !!active && active.tagName === 'SUMMARY';
      }),
    ).toBe(true);

    // Summary already visible: collapsing must not move the page.
    await summary.click();
    expect(await isOpen(page, 0)).toBe(true);
    await summary.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    await button.evaluate((el) => (el as HTMLElement).click());
    await expect
      .poll(() => isOpen(page, 0))
      .toBe(false);
    const after = await page.evaluate(() => window.scrollY);
    expect(Math.abs(after - before)).toBeLessThanOrEqual(2);
    expect(
      await page.evaluate(() => {
        const active = document.activeElement;
        return !!active && active.tagName === 'SUMMARY';
      }),
    ).toBe(true);
  });

  test('dark focus, readable actions, and reduced motion', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('pref-theme', 'dark'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ZH_URL);
    const summary = page.locator(DISCLOSURES).first().locator(':scope > summary');
    await summary.focus();
    const style = await summary.evaluate(el => ({
      outline: getComputedStyle(el).outlineStyle,
      actionSize: parseFloat(getComputedStyle(el, '::after').fontSize),
      transition: getComputedStyle(el, '::before').transitionDuration,
    }));
    expect(style.outline).toBe('solid');
    expect(style.actionSize).toBeGreaterThanOrEqual(16);
    // The site's global reduced-motion rule uses 0.001ms !important.
    expect(parseFloat(style.transition)).toBeLessThanOrEqual(0.001);
    expect((await disclosureStyles(page, 0)).radius).toBe('0px');
    await summary.press('Enter');
    expect(await isOpen(page, 0)).toBe(true);
  });

  test('enhancement excludes classed details and stays idempotent', async ({ page }) => {
    await page.goto(ZH_URL);
    const before = await page.locator('.article-disclosure__collapse').count();
    await page.locator('.post-content').evaluate(el => {
      const details = document.createElement('details');
      details.className = 'ib-reference';
      const summary = document.createElement('summary');
      summary.textContent = 'Reference';
      details.append(summary, document.createTextNode('Specialized reference '.repeat(50)));
      el.append(details);
    });
    await page.addScriptTag({ url: '/js/article-disclosure.js' });
    await expect(page.locator('.post-content details.ib-reference')).not.toHaveClass(/article-disclosure/);
    await expect(page.locator('.post-content details.ib-reference')).not.toHaveAttribute('data-article-disclosure');
    await expect(page.locator('.article-disclosure__collapse')).toHaveCount(before);
  });

  test('specialized classed details (FAQ) stay outside the disclosure treatment', async ({ page }) => {
    await page.goto(FAQ_URL);
    // This page's content has no native <details>, so the enhancement is
    // not even loaded — the classed FAQ disclosures must be untouched.
    await expect(page.locator('script[src*="article-disclosure"]')).toHaveCount(0);
    const faq = page.locator('details.article-faq__item');
    expect(await faq.count()).toBeGreaterThanOrEqual(2);
    // Never tagged by the enhancement…
    expect(
      await faq.evaluateAll((els) =>
        els.filter((el) => el.classList.contains('article-disclosure') || el.hasAttribute('data-article-disclosure')).length),
    ).toBe(0);
    // …and never given the generated action label or strip treatment.
    expect(
      await faq.nth(0).locator(':scope > summary').evaluate((el) => getComputedStyle(el, '::after').content),
    ).toBe('none');
    expect(await faq.nth(0).locator('.article-faq__marker').count()).toBe(1);
    // No disclosure strip chrome leaks onto the specialised toggle.
    const faqSummary = await faq.nth(0).locator(':scope > summary').evaluate((el) => {
      const s = getComputedStyle(el);
      return { borderTopWidth: s.borderTopWidth, background: s.backgroundColor };
    });
    expect(faqSummary.borderTopWidth).toBe('0px');
    expect(faqSummary.background).toBe('rgba(0, 0, 0, 0)');
  });
});

test.describe('Article disclosure — progressive enhancement', () => {
  test('no-JS fallback stays polished and fully usable', async ({ browser, baseURL }) => {
    const context = await newFrozenContext(browser, { baseURL, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(ZH_URL);

    const details = page.locator(DISCLOSURES);
    expect(await details.count()).toBeGreaterThanOrEqual(3);
    // The CSS-only scope keeps the strip and the localized action label.
    const styles = await disclosureStyles(page, 0);
    expect(styles.label).toContain('展开');
    expect(styles.borderTopWidth).toBe('1px');
    expect(styles.borderBottomWidth).toBe('1px');
    expect(styles.radius).toBe('0px');

    // Native toggle and readable content with zero JavaScript.
    const summary = details.nth(0).locator(':scope > summary');
    await summary.click();
    expect(await isOpen(page, 0)).toBe(true);
    expect((await details.nth(0).innerText()).length).toBeGreaterThan(100);
    await summary.press('Space');
    expect(await isOpen(page, 0)).toBe(false);

    // No JS means no enhancement chrome at all.
    await expect(page.locator('button.article-disclosure__collapse')).toHaveCount(0);
    await context.close();
  });

  test('mobile: long summary title wraps without colliding with the reserved action', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile viewport only');
    await page.goto(ZH_URL);

    const summary = page.locator(DISCLOSURES).nth(0).locator(':scope > summary');
    const geometry = await summary.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const actionWidth = parseFloat(getComputedStyle(el, '::after').width) || 0;
      const chevronWidth = parseFloat(getComputedStyle(el, '::before').width) || 0;
      const cs = getComputedStyle(el);
      const paddingRight = parseFloat(cs.paddingRight) || 0;
      const gap = parseFloat(cs.columnGap) || 0;
      // Right edge of the column left of the reserved action + chevron.
      const limit = rect.right - paddingRight - gap - chevronWidth - gap - actionWidth;
      const range = document.createRange();
      range.selectNodeContents(el);
      const lines = Array.from(range.getClientRects())
        .filter((line) => line.width > 0 && line.height > 0)
        .map((line) => line.right);
      return {
        height: rect.height,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        actionWidth,
        limit,
        lines,
      };
    });

    expect(geometry.actionWidth).toBeGreaterThan(24); // reserved action column
    expect(geometry.lines.length).toBeGreaterThanOrEqual(2); // long title wraps
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth); // no overflow
    for (const right of geometry.lines) {
      expect(right).toBeLessThanOrEqual(geometry.limit + 2); // no overlap
    }
    expect(geometry.height).toBeGreaterThanOrEqual(44); // touch target
  });
});
