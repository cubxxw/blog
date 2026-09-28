#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
};
export function resolveOutputFile(publicDir, requestPath, basePath = "/") {
  try {
    let decoded = decodeURIComponent(requestPath.split("?")[0].split("#")[0]);
    if (
      !decoded.startsWith("/") ||
      decoded.includes("\\") ||
      decoded.includes("\0") ||
      decoded.split("/").some((p) => p === "." || p === "..") ||
      /%(?:2e|2f|5c)/i.test(decoded)
    )
      return null;
    const prefix = basePath.replace(/\/$/, "");
    if (prefix) {
      if (decoded !== prefix && !decoded.startsWith(prefix + "/")) return null;
      decoded = decoded.slice(prefix.length) || "/";
    }
    const root = fs.realpathSync(publicDir);
    const candidate = path.join(root, decoded);
    const file = fs.statSync(candidate).isDirectory()
      ? path.join(candidate, "index.html")
      : candidate;
    const real = fs.realpathSync(file);
    if (!real.startsWith(root + path.sep) || !fs.statSync(real).isFile())
      return null;
    return real;
  } catch {
    return null;
  }
}
export function createOutputServer({ publicDir, fixtureDir, basePath = "/" }) {
  if (!fs.existsSync(path.join(publicDir, "index.html")))
    throw new Error("Existing built site required; run site:build first");
  return createServer((req, res) => {
    if (req.url === "/__site_ready" || req.url === "/__interactive_ready") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ready");
      return;
    }
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      res.end();
      return;
    }
    const file =
      (fixtureDir && resolveOutputFile(fixtureDir, req.url || "/")) ||
      resolveOutputFile(publicDir, req.url || "/", basePath);
    if (!file) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    res.writeHead(200, {
      "content-type":
        MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store",
    });
    if (req.method === "HEAD") res.end();
    else fs.createReadStream(file).pipe(res);
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const args = process.argv.slice(2);
    const index = args.indexOf("--public-dir");
    const publicDir = path.resolve(
      index >= 0
        ? args[index + 1]
        : process.env.SITE_OUTPUT_DIR || "tests/.artifacts/site/public",
    );
    const port = Number(process.env.SITE_PORT || 1313);
    const server = createOutputServer({
      publicDir,
      basePath: process.env.SITE_BASE_PATH || "/",
    });
    server.listen(port, "127.0.0.1", () =>
      console.log(`Frozen site at http://127.0.0.1:${port}`),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
