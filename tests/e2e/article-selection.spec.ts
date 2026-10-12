import { test, expect } from '../helpers/frozen-site';

const article = '/zh/growth/posts/2026-07-14-what-remains-when-taken-apart/';
const passage = '先从一个意象讲起，它是这场讨论里最美的一块。';

// Existing scroll-reveal transforms are unrelated to the selection overlay;
// measure a settled layout, while the feature itself keeps native selection.
test.use({ reducedMotion: 'reduce' });

for (const width of [320, 390, 1280]) {
  test(`${width}px: selection and independent menu preserve article geometry`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(article);
    const paragraph = page.locator('.post-content p').filter({ hasText: passage });
    await paragraph.evaluate(el => el.scrollIntoView({ block: 'center' }));
    const measure = () => page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      positions: Array.from(document.querySelectorAll('.post-content p')).map(p => {
        const r = p.getBoundingClientRect();
        return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height };
      }),
    }));
    const before = await measure();
    await paragraph.click();
    const toolbar = page.getByRole('toolbar');
    await expect(toolbar).toBeVisible({ timeout: 3000 });
    expect(await measure()).toEqual(before);
    await toolbar.getByRole('button', { name: '更多', exact: true }).click();
    expect(await measure()).toEqual(before);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow).toBe(false);
    const toolbarBounds = await toolbar.boundingBox();
    expect(toolbarBounds!.x).toBeGreaterThanOrEqual(0);
    expect(toolbarBounds!.x + toolbarBounds!.width).toBeLessThanOrEqual(width);
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    expect(await menu.evaluate(el => Boolean(el.closest('[role="toolbar"]')))).toBe(false);
    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
    await expect(toolbar).toBeVisible();
    await page.evaluate(() => scrollTo(0, 0));
    await expect(toolbar).not.toBeVisible();
    await paragraph.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await expect(toolbar).toBeVisible();
  });
}

test('AI receives the exact selected text and neighboring article context', async ({ page }) => {
  const requests: any[] = [];
  await page.route('**/.netlify/functions/article-ai', async route => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ answer: '这是结合文章上下文的解释。' }) });
  });
  await page.goto(article);
  const paragraph = page.locator('.post-content p').filter({ hasText: passage });
  await paragraph.click();
  await page.getByRole('toolbar').getByRole('button', { name: 'AI 分析', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('这是结合文章上下文的解释。', { exact: true })).toBeVisible();
  expect(requests[0].selectedText).toBe(passage);
  expect(requests[0].selectionContext).toContain('一束阳光');
  expect(requests[0].articleContent).toContain('这篇文章的种子');
  expect(requests[0].pagePath).toBe(article);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('share opens a gradient quote dialog and downloads a complete PNG', async ({ page }) => {
  await page.goto(article);
  await page.locator('.post-content p').filter({ hasText: passage }).click();
  await page.getByRole('toolbar').getByRole('button', { name: '分享', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '分享引用', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(passage, { exact: true })).toHaveText(passage);
  await expect.poll(() => dialog.locator('canvas').evaluate((c: HTMLCanvasElement) => c.width)).toBe(1080);
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: '下载 PNG', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('quote-card.png');
  const file = await download.path();
  expect(file).toBeTruthy();
});

test('medium quotes use a complete text fragment without overlapping start and end', async ({ page }) => {
  await page.goto(article);
  const paragraph = page.locator('.post-content p').filter({ hasText: '我们太容易觉得那只看不清的眼睛是' });
  const quote = (await paragraph.innerText()).replace(/\s+/g, ' ').trim();
  expect(quote.length).toBeGreaterThan(120);
  expect(quote.length).toBeLessThanOrEqual(160);
  await paragraph.click();
  await page.getByRole('toolbar').getByRole('button', { name: '分享', exact: true }).click();
  const link = await page.getByRole('dialog', { name: '分享引用' }).getByRole('link', { name: '返回原文' }).getAttribute('href');
  expect(decodeURIComponent(link!.split(':~:text=')[1])).toBe(quote);
});

test('AI input receives mouse focus and supports follow-up questions', async ({ page }) => {
  const requests: any[] = [];
  await page.route('**/.netlify/functions/article-ai', async route => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ answer: '已结合上下文解释。' }) });
  });
  await page.goto(article);
  await page.locator('.post-content p').filter({ hasText: passage }).click();
  await page.getByRole('toolbar').getByRole('button', { name: 'AI 分析', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('已结合上下文解释。', { exact: true })).toBeVisible();
  const input = dialog.getByRole('textbox', { name: '想继续追问什么？' });
  await input.click();
  await expect(input).toBeFocused();
  await page.keyboard.type('能举一个例子吗？');
  await dialog.getByRole('button', { name: '发送', exact: true }).click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1].question).toBe('能举一个例子吗？');
  expect(requests[1].context).toHaveLength(2);
});

test('comment quote remains intact after clearing the floating selection', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(article);
  await page.locator('.post-content p').filter({ hasText: passage }).click();
  await page.getByRole('toolbar').getByRole('button', { name: '评论', exact: true }).click();
  const preview = page.locator('#post-comments-quote');
  await expect(preview).toBeVisible();
  await page.locator('.post-comments__title').click();
  await preview.getByRole('button', { name: '复制引用', exact: true }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('> ' + passage);
  expect(copied).toContain('https://cubxxw.com/zh/growth/posts/');
  expect(copied).toContain('#asel-p');
  expect(copied).not.toContain('127.0.0.1');
});

test('share clipboard refusal leaves a usable manual copy field inside the dialog', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('refused')) } });
    document.execCommand = () => false;
  });
  await page.goto(article);
  await page.locator('.post-content p').filter({ hasText: passage }).click();
  await page.getByRole('toolbar').getByRole('button', { name: '分享', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '分享引用' });
  await dialog.getByRole('button', { name: '复制引用', exact: true }).click();
  const manual = dialog.locator('.asel-manual textarea');
  await expect(manual).toBeVisible();
  await manual.click();
  await expect(manual).toBeFocused();
  expect(await manual.inputValue()).toContain(passage);
  const bounds = await manual.boundingBox();
  const dialogBounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThan(dialogBounds!.x);
  expect(bounds!.x + bounds!.width).toBeLessThan(dialogBounds!.x + dialogBounds!.width);
});

test('dark dialog follows the article theme without a light surface flash', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('pref-theme', 'dark'));
  await page.goto(article);
  await page.locator('.post-content p').filter({ hasText: passage }).click();
  await page.getByRole('toolbar').getByRole('button', { name: '分享', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '分享引用' });
  const colors = await dialog.evaluate(el => ({
    background: getComputedStyle(el).backgroundColor,
    color: getComputedStyle(el).color,
    paper: getComputedStyle(document.body).getPropertyValue('--color-paper').trim(),
  }));
  expect(colors.background).toBe('rgb(28, 25, 23)');
  expect(colors.color).not.toBe('rgb(26, 28, 27)');
});

test('drag selection anchors to its actual range and Escape preserves the selected text', async ({ page }) => {
  await page.goto(article);
  const paragraph = page.locator('.post-content p').filter({ hasText: passage });
  await paragraph.evaluate(el => {
    el.scrollIntoView({ block: 'center' });
    const range = document.createRange();
    range.setStart(el.firstChild!, 4);
    range.setEnd(el.firstChild!, 12);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
  });
  const toolbar = page.getByRole('toolbar');
  await expect(toolbar).toBeVisible();
  const selected = await page.evaluate(() => ({ text: getSelection()!.toString(), rect: getSelection()!.getRangeAt(0).getBoundingClientRect().toJSON() }));
  const bounds = await toolbar.boundingBox();
  expect(Math.abs(bounds!.x - selected.rect.left)).toBeLessThan(2);
  expect(Math.abs(bounds!.y + bounds!.height + 10 - selected.rect.top)).toBeLessThan(2);
  expect(selected.text).toBe(passage.slice(4, 12));
  await page.keyboard.press('Escape');
  await expect(toolbar).not.toBeVisible();
  expect(await page.evaluate(() => getSelection()!.toString())).toBe(passage.slice(4, 12));
});

test.describe('native touch selection', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test('selection stays native and the toolbar clears the system menu zone below it', async ({ page }) => {
    await page.goto(article);
    const paragraph = page.locator('.post-content p').filter({ hasText: passage });
    await paragraph.evaluate(el => {
      el.scrollIntoView({ block: 'center' });
      const range = document.createRange();
      range.selectNodeContents(el);
      getSelection()!.removeAllRanges();
      getSelection()!.addRange(range);
    });
    const toolbar = page.getByRole('toolbar');
    await expect(toolbar).toBeVisible();
    const range = await page.evaluate(() => getSelection()!.getRangeAt(0).getBoundingClientRect().toJSON());
    const bounds = await toolbar.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(range.bottom + 55);
    expect(await page.evaluate(() => getSelection()!.toString())).toBe(passage);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  });
});

test('selection extending outside the article is rejected while preserving the native selection', async ({ page }) => {
  await page.goto(article);
  const paragraph = page.locator('.post-content p').filter({ hasText: passage });
  await paragraph.click();
  await page.evaluate(() => {
    const title = document.querySelector('.post-title')!;
    const range = document.createRange();
    range.selectNodeContents(title);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
  });
  await expect(page.getByRole('toolbar')).not.toBeVisible();
  expect(await page.evaluate(() => getSelection()!.toString())).toContain('拆到最后');
});

test('unsupported text selections inside prose cannot share an old paragraph', async ({ page }) => {
  await page.goto(article);
  await page.locator('.post-content p').filter({ hasText: passage }).click();
  await page.evaluate(() => {
    const heading = document.querySelector('.post-content h2')!;
    const range = document.createRange();
    range.selectNodeContents(heading);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
  });
  await expect(page.getByRole('toolbar')).not.toBeVisible();
  expect(await page.evaluate(() => getSelection()!.toString())).toContain('引');
});

test('top-edge toolbar flips below the complete paragraph', async ({ page }) => {
  await page.goto(article);
  const paragraph = page.locator('.post-content p').filter({ hasText: '如果只从光学上看，这句话是成立的' });
  await paragraph.evaluate(el => scrollTo(0, el.getBoundingClientRect().top + scrollY - 20));
  await paragraph.click();
  const toolbar = page.getByRole('toolbar');
  await expect(toolbar).toBeVisible();
  const paragraphBounds = await paragraph.boundingBox();
  const toolbarBounds = await toolbar.boundingBox();
  expect(toolbarBounds!.y).toBeGreaterThanOrEqual(paragraphBounds!.y + paragraphBounds!.height + 9);
});

test('prototype-looking text is safe as an AI selection history key', async ({ page }) => {
  await page.route('**/.netlify/functions/article-ai', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ answer: 'constructor 在此处的含义。' }) }));
  await page.goto(article);
  const paragraph = page.locator('.post-content p').filter({ hasText: passage });
  await paragraph.evaluate(el => { el.textContent = 'constructor'; });
  await page.getByText('constructor', { exact: true }).click();
  await page.getByRole('toolbar').getByRole('button', { name: 'AI 分析', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('constructor 在此处的含义。', { exact: true })).toBeVisible();
});

test('AI parses SSE deltas and accepts the final event without a newline', async ({ page }) => {
  await page.route('**/.netlify/functions/article-ai', route => route.fulfill({
    contentType: 'text/event-stream',
    body: 'data: {"delta":"上下文"}\r\n\r\ndata: {"delta":"解释完成。"}',
  }));
  await page.goto(article);
  await page.locator('.post-content p').filter({ hasText: passage }).click();
  await page.getByRole('toolbar').getByRole('button', { name: 'AI 分析', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('上下文解释完成。', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button', { name: '发送', exact: true })).toBeEnabled();
});

test('AI failures retry without promoting failed replies into history', async ({ page }) => {
  const requests: any[] = [];
  await page.route('**/.netlify/functions/article-ai', route => {
    requests.push(route.request().postDataJSON());
    return route.fulfill(requests.length === 1
      ? { status: 503, contentType: 'application/json', body: '{"error":"unavailable"}' }
      : { contentType: 'application/json', body: '{"answer":"重试成功。"}' });
  });
  await page.goto(article);
  await page.locator('.post-content p').filter({ hasText: passage }).click();
  await page.getByRole('toolbar').getByRole('button', { name: 'AI 分析', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '重试', exact: true }).click();
  await expect(dialog.getByText('重试成功。', { exact: true })).toBeVisible();
  expect(requests[1].context).toEqual([]);
});

test('AI times out while response headers are still pending', async ({ page }) => {
  await page.clock.install();
  await page.route('**/.netlify/functions/article-ai', () => {});
  await page.goto(article);
  await page.locator('.post-content p').filter({ hasText: passage }).click();
  await page.getByRole('toolbar').getByRole('button', { name: 'AI 分析', exact: true }).click();
  await page.clock.fastForward(46_000);
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('请求超时，请重试。', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: '发送', exact: true })).toBeEnabled();
});

test('closing AI prevents an old reply from overwriting a new request', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.fetch.bind(window);
    (window as any).__heldAI = [];
    window.fetch = (input, init) => {
      if (String(input).includes('/.netlify/functions/article-ai')) {
        return new Promise(resolve => (window as any).__heldAI.push(resolve));
      }
      return original(input, init);
    };
  });
  await page.goto(article);
  await page.locator('.post-content p').filter({ hasText: passage }).click();
  const ai = page.getByRole('toolbar').getByRole('button', { name: 'AI 分析', exact: true });
  await ai.click();
  await expect.poll(() => page.evaluate(() => (window as any).__heldAI.length)).toBe(1);
  await page.keyboard.press('Escape');
  await ai.click();
  await expect.poll(() => page.evaluate(() => (window as any).__heldAI.length)).toBe(2);
  await page.evaluate(() => (window as any).__heldAI[0](Response.json({ answer: '过时的回复' })));
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: '发送', exact: true })).toBeDisabled();
  await expect(dialog.getByText('过时的回复', { exact: true })).toHaveCount(0);
  await page.evaluate(() => (window as any).__heldAI[1](Response.json({ answer: '当前回复' })));
  await expect(dialog.getByText('当前回复', { exact: true })).toBeVisible();
});

test('long quotes with identical prefixes do not share AI history', async ({ page }) => {
  const requests: any[] = [];
  await page.route('**/.netlify/functions/article-ai', route => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ contentType: 'application/json', body: '{"answer":"解释完成。"}' });
  });
  await page.goto(article);
  const id = await page.locator('.post-content p').filter({ hasText: passage }).getAttribute('id');
  const paragraph = page.locator('#' + id);
  await paragraph.evaluate(el => { el.textContent = '相同开头'.repeat(60) + '第一段'; });
  await paragraph.click();
  await page.getByRole('toolbar').getByRole('button', { name: 'AI 分析', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('解释完成。', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await paragraph.evaluate(el => { el.textContent = '相同开头'.repeat(60) + '第二段'; });
  await paragraph.click();
  await page.getByRole('toolbar').getByRole('button', { name: 'AI 分析', exact: true }).click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1].context).toEqual([]);
});

test('over-limit image export skips canvas allocation and gives a clear limit', async ({ page }) => {
  await page.goto(article);
  const paragraph = page.locator('.post-content p').filter({ hasText: passage });
  await paragraph.evaluate(el => {
    el.textContent = '长'.repeat(2500);
    // Keep room around this synthetic long selection; placement limits are
    // tested separately, so this case isolates export resource protection.
    el.style.maxHeight = '100px';
    el.style.overflow = 'auto';
  });
  await page.getByText('长'.repeat(2500), { exact: true }).click();
  await page.getByRole('toolbar').getByRole('button', { name: '分享', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '分享引用' });
  await expect(dialog.getByText(/选文过长/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: '下载 PNG', exact: true })).toBeDisabled();
  expect(await dialog.locator('canvas').evaluate((el: HTMLCanvasElement) => el.width * el.height)).toBe(0);
  await expect(dialog.getByRole('button', { name: '复制引用', exact: true })).toBeEnabled();
});

test('English articles provide the same localized selection controls', async ({ page }) => {
  await page.goto('/growth/posts/2026-07-14-what-remains-when-taken-apart/');
  await page.locator('.post-content p').filter({ hasText: 'Start with an image — the most beautiful thing' }).click();
  const toolbar = page.getByRole('toolbar');
  await expect(toolbar.getByRole('button', { name: 'Share', exact: true })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'AI analysis', exact: true })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Comment', exact: true })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'More', exact: true })).toBeVisible();
});

test('copied passage anchors resolve to the original paragraph after reload', async ({ page }) => {
  await page.goto(article);
  const paragraph = page.locator('.post-content p').filter({ hasText: passage });
  const id = await paragraph.getAttribute('id');
  await page.goto(article + '#' + id);
  const linked = page.locator('#' + id);
  await expect(linked).toHaveText(passage);
  await expect(linked).toBeInViewport();
  expect(await page.locator('.post-content [id]').evaluateAll(nodes => new Set(nodes.map(el => el.id)).size)).toBe(await page.locator('.post-content [id]').count());
});
