#!/usr/bin/env node
/**
 * serve-interactive-fixtures.mjs — production-static test server (issue #389).
 *
 * Builds the REAL production Hugo output and the fixture site (kept outside
 * content/), then serves both from one static origin:
 *
 *   - requests that exist in the fixture site are served from it
 *     (/multi/, /multi-corrupt/, /safety/, /bare/ …);
 *   - everything else is served from the production output (the real
 *     articles under test).
 *
 * Used as the Playwright `webServer` of playwright.interactive.config.ts so
 * cross-engine tests always run against PRODUCTION build artifacts, never a
 * dev server. Artifact root: INTERACTIVE_ARTIFACT_DIR (CI-portable default).
 * Port: INTERACTIVE_PORT (default 4173). Hugo: HUGO_BIN (default `hugo`).
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ARTIFACT_DIR =
  process.env.INTERACTIVE_ARTIFACT_DIR && process.env.INTERACTIVE_ARTIFACT_DIR.trim()
    ? resolve(process.env.INTERACTIVE_ARTIFACT_DIR)
    : join(REPO_ROOT, 'tests', '.artifacts');
const HUGO = process.env.HUGO_BIN && process.env.HUGO_BIN.trim() ? process.env.HUGO_BIN.trim() : 'hugo';
const PORT = Number(process.env.INTERACTIVE_PORT || 4173);

const PROD_DIR = join(ARTIFACT_DIR, 'production-site');
const FIXTURE_DIR = join(ARTIFACT_DIR, 'fixture-site');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function runHugo(args) {
  const res = spawnSync(HUGO, args, { cwd: REPO_ROOT, encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`hugo failed (${args.join(' ')}):\n${res.stdout || ''}${res.stderr || ''}`);
  }
}

function build() {
  mkdirSync(ARTIFACT_DIR, { recursive: true });

  console.log('serve-interactive-fixtures: building fixture site + checks…');
  execFileSync(process.execPath, [join(REPO_ROOT, 'scripts', 'build-interactive-fixtures.mjs')], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: process.env,
  });

  console.log('serve-interactive-fixtures: building production site…');
  rmSync(PROD_DIR, { recursive: true, force: true });
  runHugo(['--gc', '--minify', '--environment', 'production', '-d', PROD_DIR, '--baseURL', `http://127.0.0.1:${PORT}/`]);
}

function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0].split('#')[0]));
  if (clean.includes('..')) return null;
  for (const root of [FIXTURE_DIR, PROD_DIR]) {
    const direct = join(root, clean);
    if (existsSync(direct) && statSync(direct).isFile()) return direct;
    const index = join(root, clean, 'index.html');
    if (existsSync(index)) return index;
  }
  return null;
}

function serve() {
  const server = createServer((req, res) => {
    if (req.url === '/__interactive_ready') {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('ok');
      return;
    }
    const file = resolveFile(req.url || '/');
    if (!file) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('not found');
      return;
    }
    res.writeHead(200, {
      'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(readFileSync(file));
  });
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`serve-interactive-fixtures: http://127.0.0.1:${PORT}/ (fixtures + production)`);
  });
}

build();
serve();
