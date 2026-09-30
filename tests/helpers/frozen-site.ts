import {
  test as base,
  expect,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Page,
} from "@playwright/test";
export { expect };
export type { Page, Locator } from "@playwright/test";

const localOrigin = () =>
  `http://127.0.0.1:${process.env.INTERACTIVE_PORT || process.env.SITE_PORT || 4173}`;

export async function routeFrozenSite(
  context: BrowserContext,
  baseURL?: string,
) {
  const local = new URL(baseURL || localOrigin());
  const canonical = process.env.SITE_CANONICAL_ORIGIN || "https://cubxxw.com";
  const externalWarnings = new Set<string>();
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!["http:", "https:"].includes(url.protocol)) return route.continue();
    const internal =
      url.origin === local.origin ||
      url.origin === canonical ||
      url.hostname === "www.cubxxw.com";
    if (!internal) {
      externalWarnings.add(url.origin);
      // Empty offline CSS/JS still needs its real media type: WebKit treats
      // an untyped stylesheet response as a console error from the test stub.
      const contentType =
        request.resourceType() === "stylesheet"
          ? "text/css"
          : "application/javascript";
      return route.fulfill({
        status: 200,
        contentType,
        body: "",
        headers: { "access-control-allow-origin": "*" },
      });
    }
    if (
      url.pathname.startsWith("/.netlify/functions/") ||
      url.pathname.startsWith("/api/")
    ) {
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"error":"offline browser verification"}',
      });
    }
    if (!["GET", "HEAD"].includes(request.method()))
      return route.abort("blockedbyclient");
    if (url.origin === local.origin) return route.continue();
    const response = await route.fetch({
      url: `${local.origin}${url.pathname}${url.search}`,
    });
    return route.fulfill({ response });
  });
  return externalWarnings;
}

export async function newFrozenContext(
  browser: Browser,
  options: BrowserContextOptions = {},
) {
  const context = await browser.newContext({
    ...options,
    serviceWorkers: "block",
  });
  await routeFrozenSite(context, options.baseURL);
  return context;
}

export async function newFrozenPage(
  browser: Browser,
  options: BrowserContextOptions = {},
): Promise<Page> {
  const context = await newFrozenContext(browser, options);
  const page = await context.newPage();
  page.on("close", () => {
    void context.close();
  });
  return page;
}

export const test = base.extend({
  context: async ({ context, baseURL }, use, testInfo) => {
    const warnings = await routeFrozenSite(context, baseURL);
    await use(context);
    // Canonical asset requests are fetched through this context. Drain their
    // handlers before Playwright disposes its request client at teardown;
    // otherwise a completed test can fail with "Fetch response has been disposed".
    await context.unrouteAll({ behavior: "wait" });
    if (warnings.size)
      await testInfo.attach("external-resource-warnings", {
        contentType: "application/json",
        body: JSON.stringify([...warnings].sort()),
      });
  },
});
