import { defineConfig, devices } from '@playwright/test';

// Explicitly separate live, read-only observations from frozen-artifact CI.
export default defineConfig({
  testDir: './tests/daily',
  outputDir: process.env.SITE_DAILY_RESULTS || 'test-results/daily/artifacts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: [['list'], ['json', { outputFile: process.env.SITE_DAILY_REPORT || 'test-results/daily/results.json' }]],
  use: {
    baseURL: process.env.SITE_DAILY_BASE_URL || 'https://cubxxw.com',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
});
