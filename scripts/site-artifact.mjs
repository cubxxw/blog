#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  createManifest,
  verifyArtifact,
  packageArtifact,
  writeReleaseMarker,
} from "./lib/site-artifact.mjs";
const args = process.argv.slice(2);
const command = args.shift();
const get = (flag) => {
  const i = args.indexOf(flag);
  return i < 0 ? undefined : args[i + 1];
};
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
try {
  const bundleRoot = path.resolve(
    get("--bundle-root") || get("--bundle") || "tests/.artifacts/site",
  );
  const manifestPath =
    get("--manifest") || path.join(bundleRoot, "manifest.json");
  if (command === "marker")
    writeReleaseMarker({
      bundleRoot,
      sourceSha: get("--sha"),
      releaseId: get("--release-id"),
      clock: get("--clock"),
    });
  else if (command === "manifest") {
    const options = read(get("--options"));
    const manifest = createManifest({
      ...options,
      bundleRoot,
      pageMap: read(path.join(bundleRoot, "page-map.json")),
    });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    console.log(manifest.fileSetDigest);
  } else if (command === "verify" || command === "pack") {
    const manifest = read(manifestPath);
    const requiredChecks = read(get("--required-checks"));
    verifyArtifact({
      bundleRoot,
      manifest,
      expectedSha: get("--sha"),
      expectedTarget: get("--target"),
      requiredChecks,
    });
    if (command === "pack")
      console.log(
        JSON.stringify(
          packageArtifact({
            bundleRoot,
            manifest,
            requiredChecks,
            outFile: get("--out"),
          }),
        ),
      );
  } else throw new Error("Expected marker, manifest, verify or pack");
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
