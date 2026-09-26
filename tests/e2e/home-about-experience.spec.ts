import { test, expect, Page } from '@playwright/test';

async function mockStream(page: Page) {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    const streams: ReadableStreamDefaultController<Uint8Array>[] = [];
    const encoder = new TextEncoder();
    Object.assign(window, {
      homeTestPush(index: number, value: string) {
        // Every UTF-8 byte is a separate transport chunk, including Chinese.
        for (const byte of encoder.encode(value)) {
          try { streams[index].enqueue(new Uint8Array([byte])); } catch { break; }
        }
      },
      homeTestFinish(index: number) { try { streams[index].close(); } catch {} },
      homeTestFail(index: number) { streams[index].error(new Error('test connection interrupted')); },
      homeTestRequests: 0,
    });
    window.fetch = (input, init) => {
      if (!String(input).includes('/.netlify/functions/blog-ai')) return originalFetch(input, init);
      (window as any).homeTestRequests++;
      // Intentionally ignore AbortSignal: stale work still cannot mutate UI.
      return Promise.resolve(new Response(new ReadableStream<Uint8Array>({ start(controller) { streams.push(controller); } }), {
        headers: { 'Content-Type': 'text/event-stream' },
      }));
    };
  });
}
async function push(page: Page, index: number, payload: unknown, final = false) {
  await page.evaluate(({ index, payload, final }) => {
    (window as any).homeTestPush(index, 'data: ' + JSON.stringify(payload) + (final ? '' : '\r\n\r\n'));
    if (final) (window as any).homeTestFinish(index);
  }, { index, payload, final });
}

test.describe('Homepage runtime and progressive decoration', () => {
  test.beforeEach(async ({ page }) => {
    // Parallel source edits during local Netlify verification must not reload
    // an in-progress interaction. Production pages have no live reload script.
    await page.route('**/livereload.js*', route => route.abort());
  });
  for (const language of ['zh', 'en']) {
    test(`${language} accessible chat streams safely and locks the complete turn`, async ({ page }) => {
      await mockStream(page);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(language === 'zh' ? '/zh/' : '/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main')).toHaveCount(1);
      await page.getByRole('button', { name: language === 'zh' ? '与 Bear 对话' : 'Talk to Bear', exact: true }).click();
      const input = page.getByRole('textbox', { name: language === 'zh' ? '给 Bear 的消息' : 'Message Bear' });
      const send = page.getByRole('button', { name: language === 'zh' ? '发送消息' : 'Send message', exact: true });
      await expect(input).toBeFocused();
      await input.fill('推荐文章');
      await input.press('Enter');
      await expect(input).toBeDisabled();
      await expect(page.locator('#hp-chat-body')).toHaveAttribute('aria-busy', 'true');
      await expect.poll(() => page.evaluate(() => (window as any).homeTestRequests)).toBe(1);
      await push(page, 0, { delta: '你好，熊 🐻\n\n' });
      await expect(page.locator('#hp-chat-body')).toContainText('你好，熊 🐻');
      await expect(input).toBeDisabled();
      await expect(send).toBeDisabled();
      await push(page, 0, { delta: '[unsafe](https://example.com/" onmouseover="alert(1))\n\n[safe](/about/?a=1&b=2)' }, true);
      await expect(input).toBeEnabled();
      await expect(input).toBeFocused();
      await expect(page.locator('#hp-chat-body')).toHaveAttribute('aria-busy', 'false');
      await expect(page.locator('#hp-chat-body [onmouseover]')).toHaveCount(0);
      await expect(page.locator('#hp-chat-body a')).toHaveCount(1);
      await expect(page.locator('#hp-chat-body a')).toHaveAttribute('href', /\/about\/\?a=1&b=2$/);
      await page.getByRole('button', { name: language === 'zh' ? '关闭对话' : 'Close conversation', exact: true }).click();
      await expect(page.locator('#hp-avatar-btn')).toBeFocused();
    });
  }

  test('close and clear isolate stale replies from a subsequent conversation', async ({ page }) => {
    await mockStream(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/zh/', { waitUntil: 'domcontentloaded' });
    await page.locator('#hp-avatar-btn').click();
    await page.locator('#hp-chat-input').fill('first question');
    await page.locator('#hp-chat-send').click();
    await expect.poll(() => page.evaluate(() => (window as any).homeTestRequests)).toBe(1);
    await page.locator('#hp-chat-close').click();
    await push(page, 0, { delta: 'STALE_CLOSED' }, true);
    await expect(page.locator('#hp-chat-body')).toHaveCount(0);
    await expect(page.locator('#hp-avatar-btn')).toBeFocused();
    await page.locator('#hp-avatar-btn').click();
    await page.locator('#hp-chat-clear').click();
    await page.locator('#hp-chat-input').fill('second question');
    await page.locator('#hp-chat-send').click();
    await expect.poll(() => page.evaluate(() => (window as any).homeTestRequests)).toBe(2);
    await push(page, 1, { delta: 'partial' });
    await page.locator('#hp-chat-clear').click();
    await expect(page.locator('#hp-chat-input')).toBeEnabled();
    await page.locator('#hp-chat-input').fill('third question');
    await page.locator('#hp-chat-send').click();
    await expect.poll(() => page.evaluate(() => (window as any).homeTestRequests)).toBe(3);
    await push(page, 1, { delta: 'STALE_CLEARED' }, true);
    await push(page, 2, { delta: '新的回答' }, true);
    await expect(page.locator('#hp-chat-body')).toContainText('新的回答');
    await expect(page.locator('#hp-chat-body')).not.toContainText('STALE');
    await expect(page.locator('#hp-chat-input')).toBeEnabled();
  });

  test('a completed reply does not steal focus after the visitor leaves chat', async ({ page }) => {
    await mockStream(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/zh/', { waitUntil: 'domcontentloaded' });
    await page.locator('#hp-avatar-btn').click();
    await page.locator('#hp-chat-input').fill('find posts');
    await page.locator('#hp-chat-input').press('Enter');
    await expect.poll(() => page.evaluate(() => (window as any).homeTestRequests)).toBe(1);
    await page.locator('.hp-entry-actions a[href="#hp-posts"]').click();
    await expect(page.locator('#hp-posts')).toBeFocused();
    await push(page, 0, { delta: 'Ready.' }, true);
    await expect(page.locator('#hp-chat-input')).toBeEnabled();
    await expect(page.locator('#hp-posts')).toBeFocused();
  });

  test('bfcache restoration synchronizes a canceled streaming composer', async ({ page }) => {
    await mockStream(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/zh/', { waitUntil: 'domcontentloaded' });
    await page.locator('#hp-avatar-btn').click();
    await page.locator('#hp-chat-input').fill('before leaving');
    await page.locator('#hp-chat-send').click();
    await expect.poll(() => page.evaluate(() => (window as any).homeTestRequests)).toBe(1);
    await push(page, 0, { delta: '部分回答' });
    await expect(page.locator('#hp-chat-input')).toBeDisabled();
    await page.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });
    await expect(page.locator('#hp-chat-input')).toBeEnabled();
    await expect(page.locator('#hp-chat-body')).toHaveAttribute('aria-busy', 'false');
    await page.locator('#hp-chat-input').fill('after returning');
    await page.locator('#hp-chat-send').click();
    await expect.poll(() => page.evaluate(() => (window as any).homeTestRequests)).toBe(2);
    await push(page, 0, { delta: 'STALE_HISTORY' }, true);
    await push(page, 1, { delta: '恢复成功' }, true);
    await expect(page.locator('#hp-chat-body')).toContainText('恢复成功');
    await expect(page.locator('#hp-chat-body')).not.toContainText('STALE_HISTORY');
  });

  test('a failed stream exposes a usable retry', async ({ page }) => {
    await mockStream(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('#hp-avatar-btn').click();
    await page.locator('#hp-chat-input').fill('find an article');
    await page.locator('#hp-chat-send').click();
    await expect.poll(() => page.evaluate(() => (window as any).homeTestRequests)).toBe(1);
    await page.evaluate(() => (window as any).homeTestFail(0));
    await page.getByRole('button', { name: 'Retry this message' }).click();
    await expect.poll(() => page.evaluate(() => (window as any).homeTestRequests)).toBe(2);
    await push(page, 1, { delta: 'Found it.' }, true);
    await expect(page.locator('#hp-chat-body')).toContainText('Found it.');
    await expect(page.locator('#hp-chat-retry')).toHaveCount(0);
    await expect(page.locator('#hp-chat-input')).toBeEnabled();
  });

  test('desktop decoration disposes and remounts once when motion preference changes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: false, effectiveType: '4g' } });
      const originalMedia = window.matchMedia.bind(window);
      window.matchMedia = query => {
        const result = originalMedia(query);
        if (query === '(pointer: coarse)') Object.defineProperty(result, 'matches', { value: false });
        return result;
      };
      Object.defineProperty(window, 'WebGLRenderingContext', { configurable: true, value: function() {} });
      const originalContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type: any, ...args: any[]): any {
        if (type === 'webgl' || type === 'experimental-webgl') return { getExtension() { return null; } };
        return (originalContext as any).apply(this, [type, ...args]);
      };
    });
    // Exercise the real lifecycle loader independently of runner GPU support.
    await page.route(/\/js\/three\/(hero-field|bear-orb)[^/]*\.js$/, route => route.fulfill({
      contentType: 'text/javascript',
      body: `function mount(host) { window.homeTestMounts = (window.homeTestMounts || 0) + 1; const canvas = document.createElement('canvas'); host.append(canvas); return {dispose() {canvas.remove();}}; } export {mount as mountHeroField, mount as mountBearOrb};`,
    }));
    await page.goto('/zh/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#hp-about canvas')).toHaveCount(2);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('#hp-about canvas')).toHaveCount(0);
    await expect(page.locator('#hp-bear-ai')).not.toHaveClass(/has-orb/);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(page.locator('#hp-about canvas')).toHaveCount(2);
    await expect.poll(() => page.evaluate(() => (window as any).homeTestMounts)).toBe(4);
  });

  for (const gate of ['phone', 'motion', 'saveData', 'slowConnection', 'coarsePointer', 'noWebGL']) {
    test(`${gate} retains chat without downloading Three.js`, async ({ page }) => {
      const downloads: string[] = [];
      page.on('request', request => {
        if (/\/js\/(vendor\/three|three\/)/.test(request.url())) downloads.push(request.url());
      });
      if (gate === 'phone') await page.setViewportSize({ width: 390, height: 844 });
      if (gate === 'coarsePointer') {
        await page.setViewportSize({ width: 844, height: 600 });
        await page.addInitScript(() => {
          const original = window.matchMedia.bind(window);
          window.matchMedia = query => {
            const result = original(query);
            if (query === '(pointer: coarse)') Object.defineProperty(result, 'matches', { value: true });
            return result;
          };
        });
      }
      if (gate === 'noWebGL') await page.addInitScript(() => { Object.defineProperty(window, 'WebGLRenderingContext', { configurable: true, value: undefined }); });
      if (gate === 'motion') await page.emulateMedia({ reducedMotion: 'reduce' });
      if (gate === 'saveData' || gate === 'slowConnection') await page.addInitScript((gate) => {
        Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: gate === 'saveData', effectiveType: gate === 'slowConnection' ? '3g' : '4g' } });
      }, gate);
      await page.goto('/zh/', { waitUntil: 'domcontentloaded' });
      await page.locator('#hp-avatar-btn').click();
      await expect(page.locator('#hp-chat-input')).toBeEnabled();
      // Longer than the idle loader's fallback deadline; this tests the gate,
      // not merely a snapshot taken before decoration would begin.
      await page.waitForTimeout(3000);
      expect(downloads).toEqual([]);
      await expect(page.locator('#hp-bear-stage canvas')).toHaveCount(0);
    });
  }
});
