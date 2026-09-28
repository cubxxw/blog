import { defineConfig, devices } from '@playwright/test';

// Local artifact readiness must bypass a developer's system HTTP proxy.
process.env.NO_PROXY = [process.env.NO_PROXY, 'localhost', '127.0.0.1', '::1'].filter(Boolean).join(',');
process.env.no_proxy = process.env.NO_PROXY;

export default defineConfig({
  testDir: './tests/e2e',
  // Quality has its own light/dark matrix; interactive specs run in three engines.
  testIgnore: ['**/content-quality.spec.ts', '**/interactive-articles.spec.ts', '**/interactive-expansion.spec.ts'],
  outputDir: process.env.SITE_TEST_RESULTS || 'test-results',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html']] : 'html',

  use: {
    baseURL: `http://127.0.0.1:${process.env.SITE_PORT || 1313}`,
    serviceWorkers: 'block',
    trace: 'on-first-retry',
  },

  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },

  webServer: {
    command: 'node scripts/serve-site-output.mjs',
    url: `http://127.0.0.1:${process.env.SITE_PORT || 1313}/__site_ready`,
    reuseExistingServer: false,
    timeout: 30_000,
  },

  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 375, height: 812 },
      },
    },
  ],
});
