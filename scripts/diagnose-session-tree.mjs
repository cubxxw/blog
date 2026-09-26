// Temporary investigation of the Linux-only WebKit article overflow.
// No assertion is relaxed: each capture reports the existing +1px contract.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { devices, webkit } from '@playwright/test';

const base = new URL(process.env.SESSION_TREE_DIAGNOSTIC_URL || 'https://deploy-preview-403--cubxxw.netlify.app');
if (!['http:', 'https:'].includes(base.protocol)) throw new Error('Expected an HTTP(S) preview URL');
const url = new URL('/ai-agent/posts/agent-system-design-pi/', base).href;
const output = resolve(process.env.SESSION_TREE_DIAGNOSTIC_DIR || 'test-results/session-tree-diagnostic');
await mkdir(output, { recursive: true });
const browser = await webkit.launch();
const context = await browser.newContext({ ...devices['Desktop Safari'] });
const page = await context.newPage();
const responses = [];
const errors = [];
const captures = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => {
  if (['stylesheet', 'font', 'script'].includes(response.request().resourceType())) {
    responses.push({ url: response.url(), status: response.status(), type: response.request().resourceType() });
  }
});
await page.route(/googletagmanager\.com|google-analytics\.com|utteranc/, (route) => route.abort());

const root = page.locator('blog-session-tree');
async function capture(name) {
  const geometry = await root.evaluate((element) => {
    const rootRect = element.getBoundingClientRect();
    const properties = ['display', 'position', 'width', 'min-width', 'max-width', 'box-sizing',
      'padding-left', 'padding-right', 'margin-left', 'margin-right', 'border-left-width',
      'border-right-width', 'overflow-x', 'overflow-y', 'overflow-wrap', 'word-break',
      'white-space', 'flex', 'flex-basis', 'flex-shrink', 'flex-grow', 'flex-wrap',
      'font-family', 'font-size', 'letter-spacing', 'appearance', '-webkit-appearance',
      'transform', 'contain', 'content-visibility'];
    const read = (node, index) => {
      const rect = node.getBoundingClientRect();
      const computed = getComputedStyle(node);
      return {
        index, tag: node.tagName, id: node.id, className: node.getAttribute('class'),
        text: node.matches('script, style') ? '' : node.textContent?.trim().slice(0, 160),
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom },
        clientWidth: node.clientWidth, scrollWidth: node.scrollWidth,
        crossesRoot: rect.width > 0 && rect.height > 0 && (rect.right > rootRect.right + 1 || rect.left < rootRect.left - 1),
        containedTreeScroll: !!node.closest('.ib-tree-scroll'),
        inClosedReference: !!node.closest('details:not([open])'),
        visible: node.checkVisibility?.() ?? (computed.visibility === 'visible'),
        style: Object.fromEntries(properties.map((property) => [property, computed.getPropertyValue(property)])),
      };
    };
    return {
      viewport: { width: innerWidth, height: innerHeight, documentWidth: document.documentElement.clientWidth, scrollY },
      fonts: { status: document.fonts.status, faces: [...document.fonts].map((font) => ({ family: font.family, status: font.status })) },
      root: read(element, -1),
      passesOriginalContract: element.scrollWidth <= element.clientWidth + 1,
      elements: [...element.querySelectorAll('*')].map(read),
    };
  });
  const result = { name, ...geometry };
  captures.push(result);
  await writeFile(resolve(output, `${name}.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ name, viewport: result.viewport, root: result.root.rect,
    clientWidth: result.root.clientWidth, scrollWidth: result.root.scrollWidth,
    passesOriginalContract: result.passesOriginalContract,
    crossing: result.elements.filter((item) => item.crossesRoot && !item.containedTreeScroll)
      .map(({ tag, className, text, rect, clientWidth, scrollWidth, inClosedReference, visible }) =>
        ({ tag, className, text, rect, clientWidth, scrollWidth, inClosedReference, visible })),
  }));
}

try {
  const response = await page.goto(url);
  if (response?.status() !== 200) throw new Error(`Article status: ${response?.status()}`);
  await root.waitFor();
  await page.waitForFunction(() => document.querySelector('blog-session-tree')?.hasAttribute('data-enhanced'));
  await page.locator('h1.post-title').waitFor({ state: 'visible' });
  for (const disclosure of await root.locator('details:not(.ib-reference):visible').all()) {
    if (!(await disclosure.evaluate((element) => element.open))) await disclosure.locator(':scope > summary').click();
  }
  // Match the failing test's language, initial desktop viewport and resize path.
  await page.evaluate(() => {
    document.body.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
  });
  await page.setViewportSize({ width: 320, height: 800 });
  await root.scrollIntoViewIfNeeded();
  await capture('01-baseline-immediate');
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((done) => setTimeout(done, 5000))]));
  await capture('02-baseline-fonts-settled');
  await page.screenshot({ path: resolve(output, 'baseline-viewport.png') });
  await root.screenshot({ path: resolve(output, 'baseline-component.png') });

  // Independent, reversible probes. They diagnose layout; none changes source
  // or hides the root's overflow to make the existing assertion pass.
  const candidates = [
    ['select-min-width', 'blog-session-tree .ib-select { min-width: 0; }'],
    ['select-appearance', 'blog-session-tree .ib-select { appearance: none; -webkit-appearance: none; }'],
    ['select-box-sizing', 'blog-session-tree .ib-select { box-sizing: border-box; min-width: 0; }'],
    ['select-wrapper-size', 'blog-session-tree .ib-select-wrap { width: 100%; } blog-session-tree .ib-select { min-width: 0; flex: 0 1 16rem; }'],
    ['entry-kind-shrink', 'blog-session-tree .ib-tree-entry-kind { min-width: 0; max-width: 100%; flex-shrink: 1; }'],
    ['button-max-width', 'blog-session-tree .ib-btn, blog-session-tree .ib-scn { max-width: 100%; overflow-wrap: anywhere; }'],
    ['closed-reference-layout', 'blog-session-tree details:not([open]) > :not(summary) { display: none !important; }'],
  ];
  for (const [name, css] of candidates) {
    const style = await page.addStyleTag({ content: css });
    try {
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
      await capture(`probe-${name}`);
    } finally {
      await style.evaluate((element) => element.remove());
    }
  }
  await capture('03-baseline-restored');
} catch (error) {
  errors.push(String(error.stack || error));
  process.exitCode = 1;
} finally {
  await writeFile(resolve(output, 'summary.json'), JSON.stringify({ url, platform: process.platform,
    browser: browser.version(), captures: captures.map(({ name, root, passesOriginalContract }) =>
      ({ name, clientWidth: root.clientWidth, scrollWidth: root.scrollWidth, passesOriginalContract })), responses, errors }, null, 2));
  await browser.close();
}
