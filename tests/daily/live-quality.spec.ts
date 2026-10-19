import { test, expect } from '@playwright/test';

const routes = ['/', '/zh/', '/engineering/', '/zh/engineering/', '/projects/', '/zh/projects/',
  '/ai-agent/posts/agent-identity-from-locke-to-openclaw/', '/zh/growth/posts/2025-annual-review/'];

test.beforeEach(async ({ context }) => {
  // Never submit forms, call AI, or change remote application data in a probe.
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    return !['GET', 'HEAD'].includes(request.method()) || /^\/(?:\.netlify\/functions|api)\//.test(url.pathname)
      ? route.abort('blockedbyclient') : route.continue();
  });
});

for (const route of routes) {
  test(`live SEO ${route}`, async ({ page, baseURL }) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-type']).toContain('text/html');
    expect(response?.headers()['x-robots-tag'] || '').not.toMatch(/noindex/i);
    await expect(page.locator('html')).toHaveAttribute('lang', route.startsWith('/zh/') ? /^zh/ : /^en/);
    await expect(page).toHaveTitle(/\S/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S/);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute('href', new URL(route, baseURL).href);
    expect(await page.locator('meta[name="robots"]').getAttribute('content')).not.toMatch(/noindex/i);
    for (const language of ['en', 'zh', 'x-default']) {
      await expect(page.locator(`link[rel="alternate"][hreflang="${language}"]`)).toHaveCount(1);
    }
    const data = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(data.length).toBeGreaterThan(0);
    for (const text of data) expect(JSON.parse(text)).toBeTruthy();
    await expect(page.locator('main')).toBeVisible();
  });
}

test('live reader can switch theme and home language', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const wasDark = await page.locator('body').evaluate(node => node.classList.contains('dark'));
  await page.locator('#theme-toggle').click();
  await expect.poll(() => page.locator('body').evaluate(node => node.classList.contains('dark'))).toBe(!wasDark);
  await page.locator('.lang-switch a').first().click();
  await expect(page).toHaveURL(/\/zh\/$/);
  await expect(page.locator('main')).toBeVisible();
});

for (const route of ['/', '/zh/', '/projects/', '/zh/projects/', '/zh/growth/posts/2025-annual-review/']) {
  test(`live lab performance sample ${route}`, async ({ page }, testInfo) => {
    // Preserve the original 45s navigation gate, with time left to save evidence.
    test.setTimeout(60_000);
    await page.addInitScript(() => {
      const metrics = { lcpMs: 0, cls: 0, longTaskMs: 0, windowStart: 0, lastShift: 0, windowScore: 0 };
      (window as typeof window & { dailyMetrics: typeof metrics }).dailyMetrics = metrics;
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) metrics.lcpMs = entry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
          if (shift.hadRecentInput) continue;
          if (metrics.lastShift === 0 || entry.startTime - metrics.lastShift >= 1000 || entry.startTime - metrics.windowStart >= 5000) {
            metrics.windowStart = entry.startTime;
            metrics.windowScore = 0;
          }
          metrics.windowScore += shift.value;
          metrics.lastShift = entry.startTime;
          metrics.cls = Math.max(metrics.cls, metrics.windowScore);
        }
      }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) metrics.longTaskMs += entry.duration;
      }).observe({ type: 'longtask', buffered: true });
    });
    let navigationError = '';
    const response = await page.goto(route, { waitUntil: 'load', timeout: 45_000 }).catch(error => {
      navigationError = String(error.message);
      return null;
    });
    // A bounded observation window; this is not a full-page or field CWV claim.
    await page.waitForTimeout(3000);
    const sample = await page.evaluate(() => ({
      ...(window as typeof window & { dailyMetrics: { lcpMs: number; cls: number; longTaskMs: number } }).dailyMetrics,
      observationMs: performance.now(),
      loadCompleted: document.readyState === 'complete',
      domElements: document.querySelectorAll('*').length,
      resources: performance.getEntriesByType('resource').length,
      slowResources: performance.getEntriesByType('resource').filter(entry => entry.duration >= 1000).map(entry => ({
        resource: new URL(entry.name).origin + new URL(entry.name).pathname,
        durationMs: entry.duration,
      })),
      navigation: performance.getEntriesByType('navigation').map(entry => entry.toJSON()),
    }));
    await testInfo.attach('live-lab-performance', {
      contentType: 'application/json',
      body: JSON.stringify({ url: page.url(), navigationError, responseStatus: response?.status() ?? null,
        environment: 'live Chromium; unthrottled; fresh context; routed read-only; three seconds after load or 45s navigation timeout; source SHA unverified', sample }),
    });
    expect(navigationError, 'Navigation must meet its original 45s deadline; diagnostics do not convert timeouts to passes').toBe('');
    expect(response?.status()).toBe(200);
    expect(sample.lcpMs, 'LCP must be observed; missing telemetry is a failure').toBeGreaterThan(0);
    expect(sample.cls, 'CLS budget applies only to the recorded observation window').toBeLessThanOrEqual(0.1);
    expect(sample.navigation).toHaveLength(1);
  });
}
