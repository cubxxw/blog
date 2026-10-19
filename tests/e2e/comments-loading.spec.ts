import { test, expect } from '../helpers/frozen-site';

const routes: string[] = process.env.COMMENT_PROBE_ROUTES
  ? JSON.parse(process.env.COMMENT_PROBE_ROUTES)
  : ['/ai-agent/posts/agent-identity-from-locke-to-openclaw/', '/zh/growth/posts/2025-annual-review/'];

for (const route of routes) {
  test(`comments load near the reader and preserve the selected theme: ${route}`, async ({ page }) => {
    let requests = 0;
    await page.addInitScript(() => localStorage.setItem('pref-theme', 'light'));
    await page.route('https://utteranc.es/client.js', async request => {
      requests++;
      await request.fulfill({ contentType: 'text/javascript', body: '/* No third-party widget or remote writes in verification. */' });
    });
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main')).toBeVisible();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    expect(requests, 'a below-fold comment widget must not compete with initial reading').toBe(0);
    // Match the theme selected after navigation, before the widget is mounted.
    if (!(await page.locator('body').evaluate(element => element.classList.contains('dark')))) {
      await page.locator('#theme-toggle').click();
    }
    await expect(page.locator('body')).toHaveClass(/dark/);
    const comments = page.locator('.post-comments');
    await comments.scrollIntoViewIfNeeded();
    await expect.poll(() => requests).toBe(1);
    const script = page.locator('#post-comments-body script');
    await expect(script).toHaveAttribute('theme', 'github-dark');
    await expect(script).toHaveAttribute('repo', 'cubxxw/blog');
    await expect(script).toHaveAttribute('issue-term', 'pathname');
    await page.evaluate(() => window.scrollTo(0, 0));
    await comments.scrollIntoViewIfNeeded();
    await expect.poll(() => requests).toBe(1);
  });
}
