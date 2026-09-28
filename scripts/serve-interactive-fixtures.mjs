#!/usr/bin/env node
/** Serve existing production bytes beside isolated interactive fixtures.
 * --build-fixtures runs only the fixture builder, never the production build.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createOutputServer } from "./serve-site-output.mjs";
const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const artifactDir = resolve(
  process.env.INTERACTIVE_ARTIFACT_DIR || join(repoRoot, "tests/.artifacts"),
);
const publicDir = resolve(
  process.env.SITE_OUTPUT_DIR || join(artifactDir, "site/public"),
);
const fixtureDir = join(artifactDir, "fixture-site");
const port = Number(process.env.INTERACTIVE_PORT || 4173);
try {
  if (!existsSync(join(publicDir, "index.html")))
    throw new Error(
      "Set SITE_OUTPUT_DIR to an existing production artifact; this server does not rebuild production",
    );
  if (process.argv.includes("--build-fixtures"))
    execFileSync(
      process.execPath,
      [join(repoRoot, "scripts/build-interactive-fixtures.mjs")],
      { cwd: repoRoot, stdio: "inherit", env: process.env },
    );
  if (
    !existsSync(join(fixtureDir, "bare/index.html")) &&
    !existsSync(fixtureDir)
  )
    throw new Error("Missing fixtures; pass --build-fixtures");
  createOutputServer({
    publicDir,
    fixtureDir,
    basePath: process.env.SITE_BASE_PATH || "/",
  }).listen(port, "127.0.0.1", () =>
    console.log(
      `Interactive fixtures and frozen site at http://127.0.0.1:${port}`,
    ),
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
