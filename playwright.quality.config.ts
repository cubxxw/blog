import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

/** Selected published pages only. Legacy screenshot names keep their original
 * two-project configuration; this suite adds the dark-mode content matrix. */
export default defineConfig({
  ...base,
  testMatch: "**/content-quality.spec.ts",
  testIgnore: [],
  projects: [
    ...(base.projects || []),
    {
      name: "desktop-dark",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        colorScheme: "dark",
      },
    },
    {
      name: "mobile-dark",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 375, height: 812 },
        colorScheme: "dark",
      },
    },
  ],
});
