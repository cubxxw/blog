#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

function argumentValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const publicArg = argumentValue("--public-dir", "public");
const publicDir = path.resolve(repoRoot, publicArg);
const sitemapPath = path.join(publicDir, "sitemap.xml");
const robotsPath = path.join(publicDir, "robots.txt");
const tagPolicyPath = path.join(repoRoot, "data", "seo", "indexable_tags.yml");
const redirectsPath = path.join(repoRoot, "static", "_redirects");

for (const requiredPath of [
  publicDir,
  sitemapPath,
  robotsPath,
  tagPolicyPath,
  redirectsPath,
]) {
  if (!fs.existsSync(requiredPath)) {
    console.error(`Missing required SEO audit input: ${requiredPath}`);
    process.exit(1);
  }
}

function walkFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
  });
}

function outputURL(file) {
  const relative = path.relative(publicDir, file).split(path.sep).join("/");
  if (relative === "index.html") return "/";
  if (relative.endsWith("/index.html")) {
    return `/${relative.slice(0, -10)}`;
  }
  return `/${relative}`;
}

function capturedValue(html, pattern) {
  const match = html.match(pattern);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

function metaContent(html, name) {
  return capturedValue(
    html,
    new RegExp(
      `<meta[^>]*name=${name}[^>]*content=(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`,
      "i",
    ),
  );
}

function canonicalURL(html) {
  return capturedValue(
    html,
    /<link[^>]*rel=canonical[^>]*href=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
  );
}

const htmlPages = walkFiles(publicDir)
  .filter((file) => file.endsWith(".html"))
  .map((file) => {
    const html = fs.readFileSync(file, "utf8");
    return {
      alias: /http-equiv=refresh/i.test(html),
      canonical: canonicalURL(html),
      description: metaContent(html, "description").trim(),
      file,
      html,
      robots: metaContent(html, "robots"),
      url: outputURL(file),
    };
  });

const canonicalPages = htmlPages.filter((page) => !page.alias);
const canonicalByURL = new Map(canonicalPages.map((page) => [page.url, page]));
const outputURLs = new Set(walkFiles(publicDir).map(outputURL));
const errors = [];

function addErrors(label, entries) {
  if (entries.length === 0) return;
  errors.push({ label, entries: entries.slice(0, 20), count: entries.length });
}

const sitemapXML = fs.readFileSync(sitemapPath, "utf8");
const sitemapURLs = [...sitemapXML.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (match) => new URL(match[1]).pathname,
);
const sitemapURLSet = new Set(sitemapURLs);

if (sitemapURLs.length !== sitemapURLSet.size) {
  addErrors("Duplicate sitemap URLs", [
    ...new Set(
      sitemapURLs.filter((url, index) => sitemapURLs.indexOf(url) !== index),
    ),
  ]);
}

const invalidSitemapPages = [];
for (const url of sitemapURLs) {
  const page = canonicalByURL.get(url);
  if (!page) {
    invalidSitemapPages.push(`${url}: no canonical HTML output`);
    continue;
  }
  if (/noindex/i.test(page.robots)) {
    invalidSitemapPages.push(`${url}: ${page.robots}`);
  }
  if (!page.canonical || new URL(page.canonical).pathname !== url) {
    invalidSitemapPages.push(`${url}: canonical=${page.canonical || "(missing)"}`);
  }
  if (!page.description) {
    invalidSitemapPages.push(`${url}: missing meta description`);
  }
  if (!/hreflang=x-default/i.test(page.html)) {
    invalidSitemapPages.push(`${url}: missing x-default hreflang`);
  }
}
addErrors("Invalid sitemap pages", invalidSitemapPages);

addErrors(
  "Pagination URLs present in sitemap",
  sitemapURLs.filter((url) => /\/page\/\d+\/$/.test(url)),
);

if (/<changefreq>|<priority>/.test(sitemapXML)) {
  addErrors("Unsupported sitemap hints", [
    "Sitemap must not emit changefreq or priority.",
  ]);
}

const lastmods = [...sitemapXML.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(
  (match) => match[1],
);
const lastmodCounts = [...lastmods.reduce((counts, value) => {
  counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}, new Map())].sort((a, b) => b[1] - a[1]);
if (
  lastmodCounts.length > 0 &&
  lastmodCounts[0][1] > Math.ceil(sitemapURLs.length * 0.25)
) {
  addErrors("Suspicious mass lastmod timestamp", [
    `${lastmodCounts[0][0]} appears ${lastmodCounts[0][1]} times`,
  ]);
}

const paginationPages = canonicalPages.filter((page) =>
  /\/page\/[2-9]\d*\/$/.test(page.url),
);
addErrors(
  "Invalid paginated page signals",
  paginationPages
    .filter(
      (page) =>
        !/^noindex,\s*follow$/i.test(page.robots) ||
        !page.canonical ||
        new URL(page.canonical).pathname !== page.url,
    )
    .map(
      (page) =>
        `${page.url}: robots=${page.robots}, canonical=${page.canonical}`,
    ),
);

addErrors(
  "Page-one pagination aliases",
  htmlPages.filter((page) => /\/page\/1\/$/.test(page.url)).map((page) => page.url),
);
addErrors(
  "Synthetic pagination routes",
  canonicalPages
    .filter((page) =>
      /^\/(?:zh\/)?(?:page|tags\/page|projects\/page|columns\/page)\//.test(
        page.url,
      ),
    )
    .map((page) => page.url),
);

const tagPolicy = fs.readFileSync(tagPolicyPath, "utf8");
const curatedTagSlugs = [...tagPolicy.matchAll(/^  ([a-z0-9-]+):\s*$/gm)].map(
  (match) => match[1],
);
const curatedTagURLs = new Set(
  curatedTagSlugs.flatMap((slug) => [`/tags/${slug}/`, `/zh/tags/${slug}/`]),
);
const tagPages = canonicalPages.filter((page) =>
  /^\/(?:zh\/)?tags\/[^/]+\/$/.test(page.url),
);
const tagPolicyErrors = [];
for (const page of tagPages) {
  const isCurated = curatedTagURLs.has(page.url);
  if (isCurated) {
    if (
      !/^index,\s*follow/i.test(page.robots) ||
      !sitemapURLSet.has(page.url) ||
      !/class=post-description/i.test(page.html)
    ) {
      tagPolicyErrors.push(
        `${page.url}: curated, robots=${page.robots}, sitemap=${sitemapURLSet.has(page.url)}`,
      );
    }
  } else if (
    !/^noindex,\s*follow$/i.test(page.robots) ||
    sitemapURLSet.has(page.url)
  ) {
    tagPolicyErrors.push(
      `${page.url}: uncurated, robots=${page.robots}, sitemap=${sitemapURLSet.has(page.url)}`,
    );
  }
}
for (const url of curatedTagURLs) {
  if (!canonicalByURL.has(url)) {
    tagPolicyErrors.push(`${url}: curated tag output missing`);
  }
}
addErrors("Tag index policy violations", tagPolicyErrors);

const robotsTXT = fs.readFileSync(robotsPath, "utf8");
if (/Disallow:\s+.*\/page\//i.test(robotsTXT)) {
  addErrors("Pagination blocked by robots.txt", [
    "Crawlers must be able to read pagination noindex and canonical signals.",
  ]);
}

function parseRedirect(raw, index) {
  const parts = raw.trim().split(/\s+/);
  if (
    parts.length < 3 ||
    !parts[0] ||
    parts[0].startsWith("#") ||
    !/^30(?:1|2|7|8)!?$/.test(parts[2])
  ) {
    return null;
  }
  return {
    line: index + 1,
    source: parts[0],
    target: parts[1],
    status: parts[2],
  };
}

const exactInternalRedirects = fs
  .readFileSync(redirectsPath, "utf8")
  .split(/\r?\n/)
  .map(parseRedirect)
  .filter(
    (rule) =>
      rule &&
      rule.source.startsWith("/") &&
      rule.target.startsWith("/") &&
      !rule.source.includes("*") &&
      !rule.target.includes("*"),
  );
addErrors(
  "Redirect targets missing from generated output",
  exactInternalRedirects
    .filter((rule) => !outputURLs.has(rule.target.split(/[?#]/)[0]))
    .map(
      (rule) =>
        `line ${rule.line}: ${rule.source} -> ${rule.target} (${rule.status})`,
    ),
);

const redirectBySource = new Map(
  exactInternalRedirects.map((rule) => [rule.source, rule]),
);
const markdownFiles = walkFiles(path.join(repoRoot, "content")).filter((file) =>
  file.endsWith(".md"),
);
const internalRedirectLinks = [];
for (const file of markdownFiles) {
  const markdown = fs.readFileSync(file, "utf8");
  for (const match of markdown.matchAll(
    /\[[^\]]*\]\((\/[^)\s#?]+\/?)(?:[?#][^)]*)?\)/g,
  )) {
    const redirect = redirectBySource.get(match[1]);
    if (!redirect) continue;
    const line = markdown.slice(0, match.index).split("\n").length;
    internalRedirectLinks.push(
      `${path.relative(repoRoot, file)}:${line}: ${match[1]} -> ${redirect.target}`,
    );
  }
}
addErrors("Internal links pointing at redirects", internalRedirectLinks);

const summary = {
  aliases: htmlPages.length - canonicalPages.length,
  canonicalHTML: canonicalPages.length,
  curatedTagURLs: curatedTagURLs.size,
  exactInternalRedirects: exactInternalRedirects.length,
  paginationPages: paginationPages.length,
  sitemapURLs: sitemapURLs.length,
  topRepeatedLastmod: lastmodCounts[0] ?? null,
};

if (errors.length > 0) {
  console.error("Generated SEO audit failed.");
  for (const error of errors) {
    console.error(`\n${error.label}: ${error.count}`);
    for (const entry of error.entries) console.error(`  ${entry}`);
    if (error.count > error.entries.length) {
      console.error(`  ...and ${error.count - error.entries.length} more`);
    }
  }
  console.error(`\nSummary: ${JSON.stringify(summary)}`);
  process.exit(1);
}

console.log(`Generated SEO audit passed: ${JSON.stringify(summary)}`);
