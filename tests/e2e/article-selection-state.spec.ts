import { test, expect, type Page } from '../helpers/frozen-site';

const article = '/zh/growth/posts/2026-07-14-what-remains-when-taken-apart/';
const passage = '先从一个意象讲起，它是这场讨论里最美的一块。';
test.use({ reducedMotion: 'reduce' });

async function selectPassage(page: Page) {
  const paragraph = page.locator('.post-content p').filter({ hasText: passage });
  await paragraph.click();
  await paragraph.evaluate(el => {
    el.scrollIntoView({ block: 'center' });
    const range = document.createRange();
    range.selectNodeContents(el);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
  });
  await expect(page.getByRole('toolbar')).toBeVisible();
}

for (const nativeMove of [true, false]) {
  test(`comment draft and iframe browsing context survive repeated drawer moves (${nativeMove ? 'native move available' : 'compatibility path'})`, async ({ page }) => {
    if (!nativeMove) {
      await page.addInitScript(() => {
        Object.defineProperty(Element.prototype, 'moveBefore', { value: undefined, configurable: true });
      });
    }
    await page.goto(article);
    // Offline provider fixture, not a mocked public comment or publishing result.
    await page.locator('#post-comments-body').evaluate(host => {
      const frame = document.createElement('iframe');
      frame.id = 'review-comments-frame';
      frame.className = 'utterances-frame';
      frame.title = '评论草稿测试';
      frame.srcdoc = '<body><textarea aria-label="评论草稿"></textarea><script>document.body.dataset.session = crypto.randomUUID()<\/script></body>';
      frame.style.cssText = 'display:block;width:100%;height:180px;border:0';
      host.appendChild(frame);
    });
    const draft = page.frameLocator('#review-comments-frame').getByRole('textbox', { name: '评论草稿' });
    await expect(draft).toBeAttached();
    // Enter before opening so a naive remove-and-append iframe would erase it.
    await draft.fill('保留这条尚未发送的评论。');
    const session = await page.frameLocator('#review-comments-frame').locator('body').getAttribute('data-session');
    expect(session).toBeTruthy();
    for (let cycle = 0; cycle < 2; cycle++) {
      await selectPassage(page);
      const readingY = await page.evaluate(() => scrollY);
      await page.getByRole('toolbar').getByRole('button', { name: '评论', exact: true }).click();
      await expect(draft).toBeVisible();
      await expect(draft).toHaveValue('保留这条尚未发送的评论。');
      await expect(page.frameLocator('#review-comments-frame').locator('body')).toHaveAttribute('data-session', session!);
      expect(await page.evaluate(() => scrollY)).toBe(readingY);
      await page.keyboard.press('Escape');
      await expect(draft).toHaveValue('保留这条尚未发送的评论。');
      await expect(page.frameLocator('#review-comments-frame').locator('body')).toHaveAttribute('data-session', session!);
      expect(await page.evaluate(() => scrollY)).toBe(readingY);
    }
  });
}

test('a native pointer drag produces actions only after release; ordinary reading clicks stay quiet', async ({ page }) => {
  await page.goto(article);
  const paragraph = page.locator('.post-content p').filter({ hasText: passage });
  await paragraph.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await paragraph.click();
  await expect(page.getByRole('toolbar')).not.toBeVisible();
  const glyph = await paragraph.evaluate(el => {
    const r = document.createRange(); r.setStart(el.firstChild!, 0); r.setEnd(el.firstChild!, 1);
    return r.getBoundingClientRect().toJSON();
  });
  const start = { x: glyph.x + 2, y: glyph.y + glyph.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 170, start.y, { steps: 8 });
  expect((await page.evaluate(() => getSelection()!.toString())).length).toBeGreaterThan(2);
  await expect(page.getByRole('toolbar')).not.toBeVisible();
  await page.mouse.up();
  await expect(page.getByRole('toolbar')).toBeVisible();
});
test('inline-code drag waits for pointer release without blocking native selection', async ({ page }) => {
  await page.goto('/zh/engineering/posts/use-go-tools-dlv/');
  const code = page.locator('.post-content p code').filter({ hasText: /^main\.go$/ });
  await code.evaluate(el => el.scrollIntoView({ block: 'center' }));
  const r = (await code.boundingBox())!;
  await page.mouse.move(r.x + 2, r.y + r.height / 2); await page.mouse.down();
  await page.mouse.move(r.x + r.width + 20, r.y + r.height / 2, { steps: 8 });
  expect((await page.evaluate(() => getSelection()!.toString())).length).toBeGreaterThan(2);
  await page.waitForTimeout(250); // Exceed the settle window while the pointer is held.
  await expect(page.getByRole('toolbar')).not.toBeVisible();
  await page.mouse.up(); await expect(page.getByRole('toolbar')).toBeVisible();
});
