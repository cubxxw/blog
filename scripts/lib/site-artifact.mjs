import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const META = new Set([
  "manifest.json",
  "page-map.json",
  "source-report.json",
  "output-report.json",
  "browser-report.json",
  "interactive-report.json",
  "functions-report.json",
  "seo-report.json",
  "workflow-report.json",
]);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const objectDigest = (value) => digest(JSON.stringify(value));
function safePath(file) {
  if (
    typeof file !== "string" ||
    !file ||
    path.posix.isAbsolute(file) ||
    file.includes("\\") ||
    file.includes("\0") ||
    file.split("/").some((p) => !p || p === "." || p === "..") ||
    /%(?:2e|2f|5c)/i.test(file)
  )
    throw new Error(`Unsafe artifact path: ${file}`);
  return file;
}
function allowed(file) {
  safePath(file);
  if (
    file
      .split("/")
      .some(
        (p) =>
          p === ".git" ||
          p === ".netlify" ||
          p === ".env" ||
          p.startsWith(".env.") ||
          /\.(?:pem|key)$/i.test(p),
      )
  )
    throw new Error(`Artifact allowlist rejected ${file}`);
  if (
    META.has(file) ||
    file === "deploy-config.toml" ||
    file.startsWith("public/") ||
    /^functions\/[^/]+\.zip$/.test(file)
  )
    return true;
  throw new Error(`Artifact allowlist rejected ${file}`);
}
function inventory(bundleRoot) {
  const root = path.resolve(bundleRoot);
  const files = [];
  if (fs.lstatSync(root).isSymbolicLink())
    throw new Error("Artifact root symlink rejected");
  function walk(dir, relative = "") {
    for (const entry of fs
      .readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      const full = path.join(dir, entry.name);
      const stat = fs.lstatSync(full);
      if (stat.isSymbolicLink())
        throw new Error(`Artifact symlink rejected: ${name}`);
      if (stat.isDirectory()) {
        if (!relative && !["public", "functions"].includes(name))
          throw new Error(`Artifact allowlist rejected directory ${name}`);
        if (
          name
            .split("/")
            .some(
              (p) => p === ".git" || p === ".netlify" || p.startsWith(".env"),
            )
        )
          throw new Error(`Artifact allowlist rejected directory ${name}`);
        walk(full, name);
      } else if (stat.isFile()) {
        allowed(name);
        files.push({
          path: name,
          sha256: digest(fs.readFileSync(full)),
          bytes: stat.size,
        });
      } else throw new Error(`Unsupported artifact file: ${name}`);
    }
  }
  walk(root);
  return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
export function snapshotDeployment(bundleRoot) {
  return inventory(bundleRoot).filter((f) => !META.has(f.path));
}
export function writeReleaseMarker({
  bundleRoot,
  sourceSha,
  releaseId,
  clock,
}) {
  if (
    !/^[a-f0-9]{40}$/.test(sourceSha) ||
    typeof releaseId !== "string" ||
    !releaseId ||
    !Number.isFinite(Date.parse(clock))
  )
    throw new Error("Invalid release marker fields");
  const root = path.resolve(bundleRoot);
  const publicDir = path.join(root, "public");
  fs.mkdirSync(publicDir, { recursive: true });
  // Refuse symlink parents before any write, even in an untrusted bundle.
  if (
    fs.lstatSync(root).isSymbolicLink() ||
    fs.lstatSync(publicDir).isSymbolicLink()
  )
    throw new Error("Release marker symlink rejected");
  const marker = path.join(publicDir, "__release.json");
  if (fs.existsSync(marker) && fs.lstatSync(marker).isSymbolicLink())
    throw new Error("Release marker symlink rejected");
  fs.writeFileSync(
    marker,
    JSON.stringify({ sourceSha, releaseId, clock }) + "\n",
  );
}
function checkResults(checks, required) {
  if (
    !Array.isArray(required) ||
    !required.length ||
    new Set(required).size !== required.length
  )
    throw new Error("Trusted required checks are mandatory");
  if (
    !Array.isArray(checks) ||
    new Set(checks.map((c) => c.name)).size !== checks.length
  )
    throw new Error("Invalid or duplicate check results");
  for (const c of checks)
    if (
      !["success", "failure", "cancelled", "skipped"].includes(c.status) ||
      !c.name ||
      !/^[a-f0-9]{64}$/.test(c.reportDigest)
    )
      throw new Error("Invalid check result");
  for (const name of required)
    if (!checks.some((c) => c.name === name && c.status === "success"))
      throw new Error(`Required check not successful: ${name}`);
}
function validateFields(m) {
  if (
    m.schema !== "blog-artifact/1" ||
    !/^[a-f0-9]{40}$/.test(m.sourceSha) ||
    !/^[a-f0-9]{64}$/.test(m.inputDigest) ||
    !["production", "backup", "preview"].includes(m.target) ||
    !Number.isFinite(Date.parse(m.clock)) ||
    !m.releaseId ||
    !m.toolchain ||
    typeof m.toolchain !== "object"
  )
    throw new Error("Invalid artifact manifest fields");
}
export function createManifest({
  bundleRoot,
  sourceSha,
  inputDigest,
  releaseId,
  target,
  clock,
  toolchain,
  pageMap,
  requiredChecks,
  checks,
}) {
  checkResults(checks, requiredChecks);
  if (
    !pageMap?.complete ||
    pageMap.sourceSha !== sourceSha ||
    pageMap.target !== target ||
    pageMap.clock !== clock
  )
    throw new Error("Incomplete or mismatched page map");
  const files = snapshotDeployment(bundleRoot);
  const manifest = {
    schema: "blog-artifact/1",
    sourceSha,
    inputDigest,
    releaseId,
    target,
    clock,
    toolchain,
    files,
    fileSetDigest: objectDigest(files),
    pageMapDigest: objectDigest(pageMap),
    requiredChecks: [...requiredChecks],
    checks: [...checks],
  };
  validateFields(manifest);
  verifyArtifact({
    bundleRoot,
    manifest,
    expectedSha: sourceSha,
    expectedTarget: target,
    requiredChecks,
  });
  return manifest;
}
export function verifyArtifact({
  bundleRoot,
  manifest,
  expectedSha,
  expectedTarget,
  requiredChecks,
}) {
  validateFields(manifest);
  if (manifest.sourceSha !== expectedSha || manifest.target !== expectedTarget)
    throw new Error("Artifact source SHA or target mismatch");
  checkResults(manifest.checks, requiredChecks);
  if (
    !Array.isArray(manifest.requiredChecks) ||
    requiredChecks.some((c) => !manifest.requiredChecks.includes(c))
  )
    throw new Error("Required check policy mismatch");
  if (
    !Array.isArray(manifest.files) ||
    new Set(manifest.files.map((f) => f.path)).size !== manifest.files.length
  )
    throw new Error("Invalid or duplicate manifest files");
  for (const file of manifest.files) {
    allowed(file.path);
    if (
      META.has(file.path) ||
      !/^[a-f0-9]{64}$/.test(file.sha256) ||
      !Number.isSafeInteger(file.bytes) ||
      file.bytes < 0
    )
      throw new Error("Invalid manifest file entry");
  }
  const actual = snapshotDeployment(bundleRoot);
  if (
    objectDigest(actual) !== manifest.fileSetDigest ||
    objectDigest(manifest.files) !== manifest.fileSetDigest
  )
    throw new Error("Artifact file-set digest mismatch");
  for (const name of requiredChecks) {
    const reportPath = path.join(bundleRoot, `${name}-report.json`);
    if (!META.has(`${name}-report.json`) || !fs.existsSync(reportPath))
      throw new Error(`Missing required report: ${name}`);
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    if (
      report.mode !== "enforce" ||
      report.ok !== true ||
      objectDigest(report) !==
        manifest.checks.find((c) => c.name === name).reportDigest
    )
      throw new Error(`Required report invalid or digest mismatch: ${name}`);
  }
  const pageMap = JSON.parse(
    fs.readFileSync(path.join(bundleRoot, "page-map.json"), "utf8"),
  );
  if (
    !pageMap.complete ||
    pageMap.sourceSha !== expectedSha ||
    pageMap.target !== expectedTarget ||
    pageMap.clock !== manifest.clock ||
    objectDigest(pageMap) !== manifest.pageMapDigest
  )
    throw new Error("Artifact page-map digest mismatch");
  const marker = JSON.parse(
    fs.readFileSync(path.join(bundleRoot, "public/__release.json"), "utf8"),
  );
  if (
    JSON.stringify(marker) !==
    JSON.stringify({
      sourceSha: manifest.sourceSha,
      releaseId: manifest.releaseId,
      clock: manifest.clock,
    })
  )
    throw new Error("Artifact release marker mismatch");
  if (
    !actual.some((f) => f.path === "deploy-config.toml") ||
    !actual.some((f) => f.path === "public/index.html")
  )
    throw new Error("Missing deployment files");
  if (
    expectedTarget === "production" &&
    !actual.some((f) => f.path.startsWith("functions/"))
  )
    throw new Error("Missing compiled production functions");
}
export function packageArtifact({
  bundleRoot,
  manifest,
  outFile,
  requiredChecks,
}) {
  verifyArtifact({
    bundleRoot,
    manifest,
    expectedSha: manifest.sourceSha,
    expectedTarget: manifest.target,
    requiredChecks,
  });
  const root = path.resolve(bundleRoot),
    out = path.resolve(outFile);
  if (out === root || out.startsWith(root + path.sep))
    throw new Error("Archive must be outside bundle root");
  if (!fs.existsSync(path.join(root, "manifest.json")))
    throw new Error("Persist manifest.json before packing");
  if (
    objectDigest(
      JSON.parse(fs.readFileSync(path.join(root, "manifest.json"))),
    ) !== objectDigest(manifest)
  )
    throw new Error("Persisted manifest differs");
  const names = inventory(root).map((f) => f.path);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync("tar", ["-czf", out, "-C", root, "--null", "-T", "-"], {
    input: Buffer.from(names.join("\0") + "\0"),
    stdio: "pipe",
  });
  return { archiveSha256: digest(fs.readFileSync(out)) };
}
