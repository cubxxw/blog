import { defineConfig, devices } from '@playwright/test';

// Fast cross-platform diagnostics against a SHA-checked Netlify branch preview.
// Timing and index data are controlled by the specs; this is not the frozen
// production artifact gate, real-index latency, or remote AI verification.
if (!process.env.SEARCH_PREVIEW_URL) throw new Error('SEARCH_PREVIEW_URL is required');
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['search-bootstrap.spec.ts'],
  workers: 1,
  retries: 0,
  timeout: 45_000,
  outputDir: process.env.SEARCH_PREVIEW_RESULTS || 'test-results/search-preview/artifacts',
  reporter: [['list'], ['json', { outputFile: process.env.SEARCH_PREVIEW_REPORT || 'test-results/search-preview/results.json' }]],
  use: { baseURL: process.env.SEARCH_PREVIEW_URL, serviceWorkers: 'block', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Pixel 5'], viewport: { width: 375, height: 812 } } },
  ],
});
