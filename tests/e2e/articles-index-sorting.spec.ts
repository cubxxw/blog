import { test, expect, newFrozenContext, type Page } from '../helpers/frozen-site';

test.use({ reducedMotion: 'reduce' });

const cards = (page: Page) => page.locator('#posts-grid [data-library-card]');

async function waitForCompleteIndex(page: Page) {
  const total = Number(await page.locator('#posts-grid').getAttribute('data-total'));
  await expect(cards(page)).toHaveCount(total);
  await expect(page.locator('#library-filter')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('#library-load-progress')).toContainText(String(total));
  return total;
}

async function laneRecords(page: Page, lane: string) {
  return page.locator(`[data-lane-feed="${lane}"] [data-library-card]:not([hidden])`).evaluateAll(items =>
    items.map(item => ({
      date: item.getAttribute('data-date') || '',
      href: item.querySelector('.library-card__link')?.getAttribute('href') || '',
    })),
  );
}

async function expectChronology(page: Page, direction: 'oldest' | 'newest') {
  for (const lane of ['ai', 'life']) {
    const records = await laneRecords(page, lane);
    for (let index = 1; index < records.length; index += 1) {
      const previous = records[index - 1].date;
      const current = records[index].date;
      expect(current.localeCompare(previous), `${lane}: ${previous} → ${current} (${direction})`)
        [direction === 'oldest' ? 'toBeGreaterThanOrEqual' : 'toBeLessThanOrEqual'](0);
    }
  }
}

test('oldest reorders an index already completed by a category filter', async ({ page }) => {
  await page.goto('/zh/articles/');
  await page.locator('[data-category="growth"]').click();
  const total = await waitForCompleteIndex(page);
  const newest = await laneRecords(page, 'life');
  expect(newest.length).toBeGreaterThan(1);
  await expect(page.locator('#posts-result-count')).toHaveText(String(newest.length));
  await page.locator('#filter-toggle').click();
  await page.locator('#filter-sort').selectOption('oldest');
  await expect(page).toHaveURL(/\?cat=growth&sort=oldest$/);
  await expectChronology(page, 'oldest');
  await expect(cards(page)).toHaveCount(total);

  await page.locator('#filter-sort').selectOption('newest');
  await expectChronology(page, 'newest');
  expect(await laneRecords(page, 'life')).toEqual(newest);
  await expect(page).toHaveURL(/\?cat=growth$/);
  await page.locator('#filter-sort').selectOption('oldest');
  await expectChronology(page, 'oldest');
});

test('restored category, tag and oldest query apply after all pages load', async ({ page }) => {
  await page.goto('/zh/articles/?cat=ai-agent&tags=AI&sort=oldest&source=bookmark#library-filter');
  await waitForCompleteIndex(page);
  await expect(page.locator('[data-category="ai-agent"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-tag="AI"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#filter-sort')).toHaveValue('oldest');
  await expect(page.locator('[data-library-lane="life"]')).toBeHidden();
  const visible = page.locator('#posts-grid [data-library-card]:not([hidden])');
  expect(await visible.count()).toBeGreaterThan(1);
  expect(await visible.evaluateAll(items => items.every(item =>
    item.getAttribute('data-section') === 'ai-agent' &&
    (item.getAttribute('data-tags') || '').split(',').includes('AI'),
  ))).toBe(true);
  await expectChronology(page, 'oldest');
  await expect(page.locator('#posts-result-count')).toHaveText(String(await visible.count()));

  await page.locator('#filter-toggle').click();
  await page.locator('#filter-clear').click();
  await expect(page).toHaveURL(/\?source=bookmark#library-filter$/);
  await expectChronology(page, 'newest');
  await expect(page.locator('#posts-result-count')).toHaveText(await page.locator('#posts-grid').getAttribute('data-total') || '');
});

test('a sort change during full-index loading uses the latest selected direction', async ({ page }) => {
  let releasePages!: () => void;
  const gate = new Promise<void>(resolve => { releasePages = resolve; });
  let waitingPages = 0;
  await page.route('**/zh/articles/page/**', async route => {
    waitingPages += 1;
    await gate;
    await route.continue();
  });
  await page.goto('/zh/articles/');
  try {
    await page.locator('[data-category="growth"]').click();
    await expect.poll(() => waitingPages).toBeGreaterThan(0);
    await page.locator('#filter-toggle').click();
    await page.locator('#filter-sort').selectOption('oldest');
    await page.locator('#filter-sort').selectOption('newest');
  } finally {
    releasePages();
  }
  await waitForCompleteIndex(page);
  await expectChronology(page, 'newest');
  await expect(page).toHaveURL(/\?cat=growth$/);
  await expect(page.locator('#filter-sort')).toHaveValue('newest');
});

test('load next appends original records without duplicate article links', async ({ page }) => {
  await page.goto('/zh/articles/');
  await expect(cards(page)).toHaveCount(12);
  const next = page.locator('[data-posts-next]');
  await expect(next).toHaveAttribute('href', /\/zh\/articles\/page\/2\/$/);
  await next.click();
  await expect(cards(page)).toHaveCount(24);
  const links = await cards(page).evaluateAll(items => items.map(item =>
    item.querySelector('.library-card__link')?.getAttribute('href'),
  ));
  expect(new Set(links).size).toBe(24);
  await expect(next).toHaveAttribute('href', /\/zh\/articles\/page\/3\/$/);
  await expect(page.locator('#library-load-progress')).toContainText('24');
  await expectChronology(page, 'newest');
});

test('the next-page link still navigates with JavaScript disabled', async ({ browser, baseURL }) => {
  const context = await newFrozenContext(browser, { baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/zh/articles/');
    await expect(cards(page)).toHaveCount(12);
    await page.locator('[data-posts-next]').click();
    await expect(page).toHaveURL(/\/zh\/articles\/page\/2\/$/);
    await expect(cards(page)).toHaveCount(12);
    await expect(page.locator('[data-posts-next]')).toHaveAttribute('href', /\/zh\/articles\/page\/3\/$/);
  } finally {
    await context.close();
  }
});
