import { test, expect } from '../helpers/frozen-site';

for (const prefix of ['', '/zh']) {
  for (const slug of ['personal-agent-product-delegation', 'personal-agent-harness-openclaw']) {
    test(`${prefix}/${slug} retains the series name without an unpublished hub link`, async ({ page }) => {
      await page.goto(`${prefix}/ai-agent/posts/${slug}/`);
      await expect(page.locator('a[href$="/columns/personal-agent-studies/"]')).toHaveCount(0);
      await expect(page.locator('.marginalia-series-name,.rc-series-name,.abs-series-name')).toHaveCount(3);
      // Both real parts remain linked in the editorial series navigation.
      const sibling = slug.endsWith('openclaw') ? 'personal-agent-product-delegation' : 'personal-agent-harness-openclaw';
      await expect(page.locator(`a[href="${prefix}/ai-agent/posts/${sibling}/"]`).first()).toHaveAttribute('href', `${prefix}/ai-agent/posts/${sibling}/`);
    });
  }
  test(`${prefix} an existing series hub keeps its real link`, async ({ page }) => {
    await page.goto(`${prefix}/ai-agent/posts/agent-system-design-openclaw/`);
    const link = page.locator('.marginalia-series-name--link');
    await expect(link).toHaveAttribute('href', `${prefix}/columns/agent-system-design/`);
    expect((await page.request.get((await link.getAttribute('href'))!)).ok()).toBe(true);
  });
}
