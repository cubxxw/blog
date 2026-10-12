import { test, expect, type Page, type Locator } from '../helpers/frozen-site';
import { join } from 'node:path';
const article = '/zh/growth/posts/2026-07-14-what-remains-when-taken-apart/';
const passage = '先从一个意象讲起，它是这场讨论里最美的一块。';
test.use({ reducedMotion: 'reduce' });
async function select(page: Page, paragraph?: Locator) {
  const p = paragraph || page.locator('.post-content p').filter({ hasText: passage });
  await p.click();
  await p.evaluate(async el => {
    el.scrollIntoView({ block: 'center' });
    const style = getComputedStyle(el);
    await document.fonts.load(style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily, el.textContent || ''); await document.fonts.ready;
    const r = document.createRange(); r.selectNodeContents(el);
    getSelection()!.removeAllRanges(); getSelection()!.addRange(r);
  });
  await expect(page.getByRole('toolbar')).toBeVisible();
}
async function share(page: Page) {
  await page.getByRole('toolbar').getByRole('button', { name: '分享', exact: true }).click();
  const dialog = page.locator('#conv-share-modal [role="dialog"]');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#csb-save-img')).toBeEnabled();
  return dialog;
}
for (const width of [320, 390, 1280]) {
  test(width + 'px: selection/menu/card preserve prose geometry and fit viewport', async ({ page }) => {
    await page.setViewportSize({ width, height: 844 }); await page.goto(article); await select(page);
    const measure = () => page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      p: Array.from(document.querySelectorAll('.post-content p')).map(el => {
        const r = el.getBoundingClientRect(); return [r.x, r.y + scrollY, r.width, r.height];
      }),
    }));
    await page.keyboard.press('Escape'); const before = await measure();
    await select(page); expect(await measure()).toEqual(before);
    const toolbar = page.getByRole('toolbar');
    await toolbar.getByRole('button', { name: '更多', exact: true }).click();
    expect(await measure()).toEqual(before);
    const menu = page.getByRole('menu'); await expect(menu).toBeVisible();
    expect(await menu.evaluate(el => !!el.closest('[role="toolbar"]'))).toBe(false);
    for (const layer of [toolbar, menu]) {
      const r = (await layer.boundingBox())!;
      expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x + r.width).toBeLessThanOrEqual(width);
    }
    await page.keyboard.press('Escape');
    await page.evaluate(() => scrollTo(0, 0)); await expect(toolbar).not.toBeVisible();
    await page.locator('.post-content p').filter({ hasText: passage }).evaluate(el => el.scrollIntoView({ block: 'center' }));
    await expect(toolbar).toBeVisible(); const dialog = await share(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const r = (await dialog.boundingBox())!;
    expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x + r.width).toBeLessThanOrEqual(width);
    if (process.env.SELECTION_EVIDENCE) await page.screenshot({ path: join(process.env.SELECTION_EVIDENCE, 'share-' + width + '.png') });
    await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); expect(await measure()).toEqual(before);
  });
}
for (const width of [390, 1280]) {
  test(width + 'px: selected AI uses existing chat, preserves draft and follows up', async ({ page }) => {
    const requests: any[] = [];
    await page.route('**/.netlify/functions/article-ai', async route => {
      requests.push(route.request().postDataJSON());
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ answer: '这是结合文章上下文的解释。' }) });
    });
    await page.setViewportSize({ width, height: 844 }); await page.goto(article);
    const prefix = width < 1200 ? 'abs' : 'rc', panel = page.locator('.' + prefix + '-ai-panel');
    if (width >= 1200) { await page.locator('#rc-tab-ai').click(); await panel.locator('textarea').fill('尚未发送的问题'); }
    await select(page); const y = await page.evaluate(() => scrollY);
    await page.getByRole('toolbar').getByRole('button', { name: 'AI 分析', exact: true }).click();
    await expect(panel.locator('.' + prefix + '-ai-answer-body')).toHaveText('这是结合文章上下文的解释。');
    await expect(panel.locator('.article-chat-quote')).toHaveText(passage);
    expect(await page.evaluate(() => scrollY)).toBe(y);
    expect(await page.locator('.asel-dialog').count()).toBe(0);
    expect(requests[0].selectedText).toBe(passage); expect(requests[0].selectionContext).toContain('一束阳光');
    expect(requests[0].articleContent).toContain('这篇文章的种子'); expect(requests[0].pagePath).toBe(article);
    const input = panel.locator('textarea');
    if (width >= 1200) await expect(input).toHaveValue('尚未发送的问题');
    await input.fill('能举一个例子吗？'); await panel.locator('.' + prefix + '-ai-send').click();
    await expect.poll(() => requests.length).toBe(2);
    expect(requests[1].question).toBe('能举一个例子吗？'); expect(requests[1].context).toHaveLength(2);
    expect(requests[1].selectedText).toBe(passage);
    await expect(panel.locator('.' + prefix + '-ai-answer-body')).toHaveCount(2);
    await expect(panel.locator('.' + prefix + '-ai-send')).toBeEnabled();
    await expect(panel.locator('.' + prefix + '-ai-loading')).not.toBeVisible();
    expect(await panel.locator('.article-chat-quote').evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(180);
    await expect(input).toBeInViewport();
    if (width < 1200) await expect.poll(() => page.locator('#article-bottom-sheet').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (process.env.SELECTION_EVIDENCE) await page.screenshot({ path: join(process.env.SELECTION_EVIDENCE, 'ai-' + width + '.png') });
  });
}
test('share exports complete PNG with original canonical passage source', async ({ page }) => {
  await page.goto(article); await select(page); const dialog = await share(page);
  expect(await dialog.locator('canvas').evaluate((c: HTMLCanvasElement) => c.width)).toBe(1080);
  await expect(dialog.locator('#csp-readable')).toContainText(passage);
  const source = await dialog.locator('#csb-source').getAttribute('href');
  expect(source).toContain('https://cubxxw.com/zh/growth/posts/'); expect(source).toContain('#asel-p'); expect(source).not.toContain('127.0.0.1');
  const pending = page.waitForEvent('download'); await dialog.locator('#csb-save-img').click(); const download = await pending;
  expect(download.suggestedFilename()).toBe('quote-card.png');
  if (process.env.SELECTION_EVIDENCE) await download.saveAs(join(process.env.SELECTION_EVIDENCE, 'quote-card.png'));
});
test('share copy refusal and rapid reopen keep current quote and handlers', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('refused')) } }));
  await page.goto(article); await select(page); let dialog = await share(page);
  await dialog.locator('#csb-copy-text').click(); await expect(dialog.locator('#csp-manual textarea')).toHaveValue(new RegExp(passage));
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('.conv-share-close')!.click();
    (window as any).ShareConversation.showExcerpt('下一段原文。', { lang: 'zh', title: '测试', url: 'https://cubxxw.com/zh/growth/posts/test/' });
  });
  dialog = page.locator('#conv-share-modal [role="dialog"]');
  await expect(page.locator('#conv-share-modal')).toHaveCount(1);
  await dialog.locator('#csb-copy-text').click(); await expect(dialog.locator('#csp-manual textarea')).toHaveValue(/下一段原文/);
  await expect(dialog.locator('#csb-save-img')).toBeEnabled();
});
test('font preparation keeps focus inside share editor', async ({ page }) => {
  await page.goto(article); await select(page);
  await page.evaluate(() => {
    const load = document.fonts.load.bind(document.fonts);
    document.fonts.load = async (...args) => { await new Promise(r => setTimeout(r, 250)); return load(...args); };
  });
  await page.getByRole('toolbar').getByRole('button', { name: '分享', exact: true }).click();
  await expect(page.locator('.conv-share-close')).toBeFocused(); await expect(page.locator('#csb-save-img')).toBeEnabled();
});
test('over-limit excerpt has no canvas and retains full copy', async ({ page }) => {
  await page.goto(article); await select(page); await share(page);
  await page.evaluate(() => (window as any).ShareConversation.showExcerpt('长'.repeat(2401), { lang: 'zh', title: '长引用' }));
  const dialog = page.locator('#conv-share-modal [role="dialog"]');
  await expect(dialog.locator('#csp-limit')).toBeVisible(); await expect(dialog.locator('canvas')).toHaveCount(0);
  await expect(dialog.locator('#csb-save-img')).toBeDisabled(); await expect(dialog.locator('#csb-copy-text')).toBeEnabled();
});
test('comments preserve reading position, refresh failed copy and respect topmost share', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('refused')) } }));
  await page.goto(article); await select(page); const y = await page.evaluate(() => scrollY);
  await page.getByRole('toolbar').getByRole('button', { name: '评论', exact: true }).click();
  const drawer = page.locator('.asel-comments'); await expect(drawer).toBeVisible();
  expect(await page.evaluate(() => scrollY)).toBe(y);
  await drawer.getByRole('button', { name: '复制引用', exact: true }).click();
  await expect(drawer.locator('.asel-comments-manual')).toHaveValue(new RegExp(passage));
  await drawer.getByRole('button', { name: '继续阅读', exact: true }).click(); expect(await page.evaluate(() => scrollY)).toBe(y);
  await select(page, page.locator('.post-content p').filter({ hasText: '这篇文章的种子' }));
  await page.getByRole('toolbar').getByRole('button', { name: '评论', exact: true }).click();
  await expect(drawer.locator('.asel-comments-manual')).toHaveCount(0);
  await expect(drawer.locator('blockquote')).toContainText('这篇文章的种子');
  await page.evaluate(() => (window as any).loadShareScripts(() => (window as any).ShareConversation.showExcerpt('当前分享。', { lang: 'zh' })));
  await expect(page.locator('#conv-share-modal')).toBeVisible(); await page.keyboard.press('Escape');
  await expect(page.locator('#conv-share-modal')).not.toBeVisible(); await expect(drawer).toBeVisible();
  if (process.env.SELECTION_EVIDENCE) await page.screenshot({ path: join(process.env.SELECTION_EVIDENCE, 'comments-desktop.png') });
});
test('drag uses actual range and Escape preserves native text', async ({ page }) => {
  await page.goto(article); await select(page);
  await page.locator('.post-content p').filter({ hasText: passage }).evaluate(el => {
    const r = document.createRange(); r.setStart(el.firstChild!, 4); r.setEnd(el.firstChild!, 12);
    getSelection()!.removeAllRanges(); getSelection()!.addRange(r);
  });
  const selected = await page.evaluate(() => ({ text: getSelection()!.toString(), rect: getSelection()!.getRangeAt(0).getBoundingClientRect().toJSON() }));
  await expect.poll(async () => { const r = (await page.getByRole('toolbar').boundingBox())!; return Math.abs(r.y + r.height + 10 - selected.rect.top); }).toBeLessThan(2);
  await page.keyboard.press('Escape'); await expect(page.getByRole('toolbar')).not.toBeVisible();
  expect(await page.evaluate(() => getSelection()!.toString())).toBe(passage.slice(4, 12));
});
test('dark share matches article surface', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('pref-theme', 'dark'));
  await page.goto(article); await select(page); const dialog = await share(page);
  expect(await dialog.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe('rgb(255, 255, 255)');
  expect(await page.locator('body').evaluate(el => el.classList.contains('dark'))).toBe(true);
  if (process.env.SELECTION_EVIDENCE) await page.screenshot({ path: join(process.env.SELECTION_EVIDENCE, 'share-dark.png') });
});
test('footer card uses same local editor and Escape closes cleanly', async ({ page }) => {
  await page.goto(article); await page.getByRole('button', { name: '生成文章分享卡', exact: true }).click();
  const dialog = page.locator('#conv-share-modal [role="dialog"]');
  await expect(dialog).toBeVisible(); await expect(dialog.locator('#csb-save-img')).toBeEnabled();
  await expect(dialog.locator('#conv-share-heading')).toHaveText('分享这篇文章');
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
});
test.describe('native touch selection', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test('toolbar clears system menu zone and compact comments fit', async ({ page }) => {
    await page.goto(article); await select(page);
    const r = await page.evaluate(() => getSelection()!.getRangeAt(0).getBoundingClientRect().toJSON());
    expect((await page.getByRole('toolbar').boundingBox())!.y).toBeGreaterThanOrEqual(r.bottom + 55);
    await page.getByRole('toolbar').getByRole('button', { name: '评论', exact: true }).click();
    const drawer = page.locator('.asel-comments'); await expect(drawer).toHaveAttribute('aria-modal', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await drawer.getByRole('button', { name: '继续阅读', exact: true }).click(); await expect(drawer).not.toBeVisible();
  });
});
test('unsupported selection is rejected and English controls are localized', async ({ page }) => {
  await page.goto(article); await select(page);
  await page.locator('.post-title').evaluate(el => { const r = document.createRange(); r.selectNodeContents(el); getSelection()!.removeAllRanges(); getSelection()!.addRange(r); });
  await expect(page.getByRole('toolbar')).not.toBeVisible();
  await page.goto('/growth/posts/2026-07-14-what-remains-when-taken-apart/');
  await select(page, page.locator('.post-content p').filter({ hasText: 'Start with an image — the most beautiful thing' }));
  for (const name of ['Share', 'AI analysis', 'Comment', 'More']) await expect(page.getByRole('toolbar').getByRole('button', { name, exact: true })).toBeVisible();
});
test('failed AI retry avoids duplicate question and poisoned history', async ({ page }) => {
  const requests: any[] = [];
  await page.route('**/.netlify/functions/article-ai', async route => {
    requests.push(route.request().postDataJSON());
    await route.fulfill(requests.length === 1 ? { status: 503, body: '{}' } : { contentType: 'text/event-stream', body: 'data: {"delta":"回复完整。"}\r\n\r\ndata: [DONE]\r\n\r\n' });
  });
  await page.goto(article); await select(page);
  await page.getByRole('toolbar').getByRole('button', { name: 'AI 分析', exact: true }).click();
  const panel = page.locator('.rc-ai-panel'); await panel.getByRole('button', { name: '重试', exact: true }).click();
  await expect(panel.locator('.rc-ai-answer-body')).toHaveText('回复完整。'); await expect(panel.locator('.rc-ai-msg--user')).toHaveCount(1);
  expect(requests[1].context).toEqual([]);
});

test('a brief curve connects the passage to desktop chat and then clears', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('**/.netlify/functions/article-ai', async route => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ answer: '这段解释进入右侧聊天。' }) });
  });
  await page.goto(article); await select(page);
  await page.getByRole('toolbar').getByRole('button', { name: 'AI 分析', exact: true }).click();
  await expect(page.locator('.article-selection-guide path')).toBeAttached();
  await expect(page.locator('#rc-tab-ai')).toHaveAttribute('aria-selected', 'true');
  if (process.env.SELECTION_EVIDENCE) await page.screenshot({ path: join(process.env.SELECTION_EVIDENCE, 'ai-curve.png') });
  await expect(page.locator('.article-selection-guide')).toHaveCount(0);
});
test('a late clipboard rejection cannot restore an old comment quote', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: {
    writeText: () => new Promise((_, reject) => { (window as any).rejectOldQuote = reject; }),
  } }));
  await page.goto(article); await select(page);
  await page.getByRole('toolbar').getByRole('button', { name: '评论', exact: true }).click();
  const drawer = page.locator('.asel-comments');
  await drawer.getByRole('button', { name: '复制引用', exact: true }).click();
  await drawer.getByRole('button', { name: '继续阅读', exact: true }).click();
  await select(page, page.locator('.post-content p').filter({ hasText: '这篇文章的种子' }));
  await page.getByRole('toolbar').getByRole('button', { name: '评论', exact: true }).click();
  await page.evaluate(() => (window as any).rejectOldQuote(new Error('delayed refusal')));
  await expect(drawer.locator('.asel-comments-manual')).toHaveCount(0);
  await expect(drawer.locator('blockquote')).toContainText('这篇文章的种子');
});
test('compact share tray has a local article-card entry and retains its open state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(article); await select(page); await page.keyboard.press('Escape');
  await page.locator('#article-fab').click();
  await page.locator('.abs-tab[data-tab="share"]').click();
  await page.locator('.abs-share-card').click();
  const dialog = page.locator('#conv-share-modal [role="dialog"]');
  await expect(dialog).toBeVisible(); await expect(dialog.locator('#csb-save-img')).toBeEnabled();
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
  await expect(page.locator('#article-bottom-sheet')).toHaveClass(/abs--open/);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
});
