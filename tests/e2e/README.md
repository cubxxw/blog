# E2E Tests

Playwright-based end-to-end tests for the blog.

## Setup

```bash
npm install
npx playwright install --with-deps chromium
```

## Running Tests

```bash
# Run all tests (requires Hugo dev server at localhost:1313)
npm test

# Run with UI
npm run test:ui

# Show HTML report
npm run test:report
```

## Projects

- **desktop**: Chrome at 1280×800
- **mobile**: Pixel 5 at 375×812

## Visual Regression

Screenshots are stored in `__screenshots__/` per test file name.
The `maxDiffPixelRatio` threshold is `0.01` (1%).

Update baselines with:
```bash
npx playwright test --update-snapshots
```
