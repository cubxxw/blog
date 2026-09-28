import { test, expect } from "@playwright/test";
import fs from "node:fs";

const pages: string[] = process.env.SITE_PAGE_LIST
  ? JSON.parse(fs.readFileSync(process.env.SITE_PAGE_LIST, "utf8"))
  : [
      "/engineering/posts/go-release-tools/",
      "/zh/engineering/posts/go-release-tools/",
    ];

for (const pathname of pages) {
  test(`frozen content quality: ${pathname}`, async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    const local = new URL(baseURL!);
    const canonical = process.env.SITE_CANONICAL_ORIGIN || "https://cubxxw.com";
    const internalFailures: string[] = [];
    const externalWarnings = new Set<string>();
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (!["http:", "https:"].includes(url.protocol)) return route.continue();
      const internal =
        url.origin === local.origin ||
        url.origin === canonical ||
        url.hostname === "www.cubxxw.com";
      // No test run invokes model providers or the newsletter service.
      if (
        internal &&
        (url.pathname.startsWith("/.netlify/functions/") ||
          url.pathname.startsWith("/api/"))
      ) {
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: '{"error":"offline browser verification"}',
        });
      }
      if (!internal) {
        externalWarnings.add(url.origin);
        return route.abort("blockedbyclient");
      }
      if (!["GET", "HEAD"].includes(request.method()))
        return route.abort("blockedbyclient");
      if (url.origin !== local.origin) {
        const response = await route.fetch({
          url: `${local.origin}${url.pathname}${url.search}`,
        });
        if (response.status() >= 400)
          internalFailures.push(`${response.status()} ${url.pathname}`);
        return route.fulfill({ response });
      }
      return route.continue();
    });
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (
        url.origin === local.origin &&
        response.status() >= 400 &&
        !url.pathname.startsWith("/.netlify/functions/") &&
        !url.pathname.startsWith("/api/")
      )
        internalFailures.push(`${response.status()} ${url.pathname}`);
    });
    const dark = testInfo.project.name.endsWith("-dark");
    await page.addInitScript(
      (isDark) => localStorage.setItem("pref-theme", isDark ? "dark" : "light"),
      dark,
    );
    const response = await page.goto(pathname, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status(), "selected published page must exist").toBe(200);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(page.locator("body")).toBeVisible();
    if (pathname.includes("/go-release-tools/")) {
      const table = page
        .locator("table")
        .filter({ has: page.getByText(".ProjectName", { exact: true }) })
        .first();
      await expect(table).toBeVisible();
      await expect(table.locator("tbody tr")).toHaveCount(40);
      await expect(table.locator("thead th")).toHaveCount(2);
      await expect(table).toContainText(".ReleaseNotes");
    }
    const imageResults = await page
      .locator("img")
      .evaluateAll(async (images) => {
        const failures: string[] = [];
        for (const element of images) {
          const image = element as HTMLImageElement;
          if (!image.currentSrc && !image.src) continue;
          const url = new URL(image.currentSrc || image.src, location.href);
          if (
            !["cubxxw.com", "www.cubxxw.com", location.hostname].includes(
              url.hostname,
            )
          )
            continue;
          image.loading = "eager";
          try {
            await image.decode();
          } catch {
            failures.push(url.pathname);
          }
        }
        return failures;
      });
    expect(imageResults, "local images must decode").toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "page must not overflow horizontally",
    ).toBeTruthy();
    expect(
      [...new Set(internalFailures)],
      "all requested internal resources must exist in frozen output",
    ).toEqual([]);
    if (externalWarnings.size)
      await testInfo.attach("external-resource-warnings", {
        contentType: "application/json",
        body: JSON.stringify([...externalWarnings].sort()),
      });
  });
}
