import { defineConfig, devices } from '@playwright/test';

/**
 * Dedicated cross-engine config for the interactive article components
 * (issue #389). Unlike the repo-wide playwright.config.ts (Chromium-only
 * full-site suite against a dev server), this config:
 *
 *   - serves PRODUCTION Hugo output plus fixtures kept outside content/ via
 *     scripts/serve-interactive-fixtures.mjs (see its header);
 *   - runs only the focused component suites on Chromium, Firefox AND WebKit
 *     (real engines — an Android emulation is not a WebKit check).
 *
 * Usage: npm run interactive:test
 * Env:   INTERACTIVE_ARTIFACT_DIR (heavy output root), INTERACTIVE_PORT,
 *        HUGO_BIN.
 */

const PORT = Number(process.env.INTERACTIVE_PORT || 4173);

export default defineConfig({
  testDir: '.',
  testMatch: ['tests/interactive/**/*.spec.ts', 'tests/e2e/interactive-articles.spec.ts', 'tests/e2e/interactive-expansion.spec.ts'],
  timeout: 45_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { outputFolder: 'playwright-report/interactive' }]] : 'list',

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },

  expect: { timeout: 10_000 },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  webServer: {
    command: 'node scripts/serve-interactive-fixtures.mjs',
    url: `http://127.0.0.1:${PORT}/__interactive_ready`,
    reuseExistingServer: !process.env.CI,
    timeout: 600_000,
  },
});
