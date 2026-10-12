import {
  test as base,
  expect,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Page,
  type Route,
} from "@playwright/test";
import {
  createFrozenRouteTracker,
  type FrozenRouteTracker,
} from "./frozen-routing.mjs";
export { expect };
export type { Page, Locator } from "@playwright/test";

const localOrigin = () =>
  `http://127.0.0.1:${process.env.INTERACTIVE_PORT || process.env.SITE_PORT || 4173}`;

// One tracker per context: routeFrozenSite wraps every frozen handler
// callback so its entire lifetime (local continue, external fulfill,
// canonical fetch AND fulfill) is tracked.
const frozenTrackers = new WeakMap<BrowserContext, FrozenRouteTracker>();

function frozenRouteTracker(context: BrowserContext): FrozenRouteTracker {
  let tracker = frozenTrackers.get(context);
  if (!tracker) {
    tracker = createFrozenRouteTracker();
    frozenTrackers.set(context, tracker);
  }
  return tracker;
}

export async function drainFrozenRouting(
  context: BrowserContext,
): Promise<void> {
  // Drain + unroute is ONE operation: handlers stay registered until every
  // frozen callback has finished, the drain loops to include callbacks
  // admitted while draining, and the empty observation invokes
  // context.unrouteAll in the same synchronous stretch (no await between).
  // Playwright 1.63's unrouteAll({ behavior: "wait" }) alone is racy: it
  // clears client _routes before waiting, so a sibling route callback that
  // completes during the wait updates server patterns and auto-continues a
  // pending route, and a later route.fulfill throws "Route is already
  // handled!" (CI4905). Original handler errors keep reaching the runner
  // through the wrapped callback; nothing is caught and ignored here.
  await frozenRouteTracker(context).drainAndRemove(() =>
    context.unrouteAll({ behavior: "wait" }),
  );
}

export async function routeFrozenSite(
  context: BrowserContext,
  baseURL?: string,
) {
  const local = new URL(baseURL || localOrigin());
  const canonical = process.env.SITE_CANONICAL_ORIGIN || "https://cubxxw.com";
  const externalWarnings = new Set<string>();
  const handler = async (route: Route): Promise<void> => {
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
  };
  await context.route("**/*", frozenRouteTracker(context).track(handler));
  return externalWarnings;
}

// Factory boundary: newFrozenContext/newFrozenPage contexts are closed
// directly by tests (or via newFrozenPage's page-close hook below). That
// close path is outside the observed CI4905 teardown scope and keeps
// Playwright's native close semantics; the tracked drain+unroute guarantee
// applies to the default `context` fixture teardown, where the race occurred.
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
    // otherwise a completed test can fail with "Fetch response has been
    // disposed". Keep the handlers registered until every callback settles
    // (drain + unroute as one operation) so unrouteAll cannot dismantle
    // in-flight fetch->fulfill callbacks and fail them with "Route is already
    // handled!".
    await drainFrozenRouting(context);
    if (warnings.size)
      await testInfo.attach("external-resource-warnings", {
        contentType: "application/json",
        body: JSON.stringify([...warnings].sort()),
      });
  },
});
