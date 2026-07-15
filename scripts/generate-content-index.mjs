import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = process.cwd();
const contentRoot = path.join(repoRoot, "content");
const outputPaths = [
  path.join(repoRoot, "netlify/functions/_generated/content-index.json"),
  path.join(repoRoot, "static/data/content-index.json"),
];

const defaultLanguage = "en";
const ignoredDirs = new Set([".obsidian", "_redirects"]);

function walkMarkdownFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkMarkdownFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }

  return results;
}

function parseFrontmatter(raw) {
  if (!raw.startsWith("---\n")) {
    return { data: {}, body: raw };
  }

  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) {
    return { data: {}, body: raw };
  }

  const frontmatter = raw.slice(4, end);
  const body = raw.slice(end + 5);
  const data = {};
  let currentKey = null;

  for (const rawLine of frontmatter.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line.trim() || line.trimStart().startsWith("#")) {
      continue;
    }

    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(data[currentKey])) {
        data[currentKey] = [];
      }
      data[currentKey].push(stripQuotes(listMatch[1].trim()));
      continue;
    }

    const kvMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kvMatch) {
      currentKey = null;
      continue;
    }

    const [, key, rawValue] = kvMatch;
    currentKey = key;
    const value = rawValue.trim();

    if (!value) {
      data[key] = [];
      continue;
    }

    if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map((item) => stripQuotes(item.trim()))
        .filter(Boolean);
      continue;
    }

    data[key] = stripQuotes(value);
  }

  return { data, body };
}

function stripQuotes(value) {
  return value.replace(/^['"]|['"]$/g, "");
}

function slugify(fileName) {
  return fileName.replace(/\.md$/i, "");
}

function stripMarkdown(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^>\s+/gm, "")
    .replace(/^#+\s+/gm, "")
    .replace(/[*_~|>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getExcerpt(body) {
  return stripMarkdown(body).slice(0, 360);
}

// Longer plain-text slice for the AI get_post tool: opening + closing, since
// long pieces put the thesis up front and the payoff at the end (same
// heuristic as reading-companion.js).
const BODY_MAX = 2400;

function getBody(body) {
  const text = stripMarkdown(body);
  if (text.length <= BODY_MAX) return text;
  const head = Math.round(BODY_MAX * 0.7);
  const tail = BODY_MAX - head;
  return `${text.slice(0, head)} […] ${text.slice(text.length - tail)}`;
}

function getHeadings(body) {
  return body
    .split("\n")
    .map((line) => line.match(/^#{1,3}\s+(.+)$/)?.[1]?.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function buildPermalink(language, relativePath) {
  let cleanPath = relativePath.replace(/\\/g, "/").replace(/\.md$/i, "");
  // Page bundles (dir/index.md) publish at the directory URL, not .../index/;
  // section stubs (_index.md) publish at their section URL.
  cleanPath = cleanPath.replace(/\/_?index$/i, "");
  if (cleanPath === "_index") cleanPath = "";
  // Hugo lowercases URL paths by default (e.g. markItdown.md publishes at
  // /projects/markitdown/), so the permalink must match.
  cleanPath = cleanPath.toLowerCase();
  const segments = cleanPath.split("/");
  const prefix = language === defaultLanguage ? "" : `/${language}`;

  if (segments.length === 1) {
    if (segments[0] === "search") {
      return `${prefix}/search/`;
    }
    return `${prefix}/${segments[0]}/`;
  }

  return `${prefix}/${segments.join("/")}/`;
}

function detectLanguage(relativeFile) {
  const normalized = relativeFile.replace(/\\/g, "/");
  const [first] = normalized.split("/");
  const knownLanguages = new Set(["en", "zh", "de", "es", "fr"]);

  if (knownLanguages.has(first)) {
    return {
      language: first,
      relativePath: normalized.slice(first.length + 1),
    };
  }

  return {
    language: defaultLanguage,
    relativePath: normalized,
  };
}

function buildTree(documents) {
  const root = { name: "content", count: 0, children: {} };

  for (const doc of documents) {
    root.count += 1;
    const parts = [doc.language, ...doc.sectionParts];
    let node = root;

    for (const part of parts) {
      if (!node.children[part]) {
        node.children[part] = { name: part, count: 0, children: {} };
      }
      node = node.children[part];
      node.count += 1;
    }
  }

  return normalizeTree(root);
}

function normalizeTree(node) {
  return {
    name: node.name,
    count: node.count,
    children: Object.values(node.children)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(normalizeTree),
  };
}

export function buildIndex() {
  const files = walkMarkdownFiles(contentRoot);
  const documents = files
    .map((filePath) => {
      const relativeFile = path.relative(contentRoot, filePath);
      const { language, relativePath } = detectLanguage(relativeFile);
      const raw = fs.readFileSync(filePath, "utf8");
      const { data, body } = parseFrontmatter(raw);
      let slug = slugify(path.basename(relativePath));
      let relativeDir = path.dirname(relativePath);
      // Page bundles (dir/index.md): the bundle directory is the real slug
      // and the section is its parent, mirroring the published URL.
      if (slug === "index" && relativeDir !== ".") {
        slug = path.basename(relativeDir);
        relativeDir = path.dirname(relativeDir);
      }
      const sectionPath = relativeDir === "." ? "" : relativeDir.replace(/\\/g, "/");
      const sectionParts = sectionPath ? sectionPath.split("/") : [];

      return {
        title: typeof data.title === "string" && data.title ? data.title : slug,
        slug,
        language,
        relativePath: relativePath.replace(/\\/g, "/"),
        // Preserve deliberately stable public URLs when content is moved to a
        // more accurate editorial section (for example projects -> ai-agent).
        permalink:
          typeof data.url === "string" && data.url
            ? data.url.endsWith("/")
              ? data.url
              : `${data.url}/`
            : buildPermalink(language, relativePath),
        section: sectionPath,
        sectionParts,
        tags: Array.isArray(data.tags) ? data.tags.slice(0, 12) : [],
        categories: Array.isArray(data.categories) ? data.categories.slice(0, 12) : [],
        date: typeof data.date === "string" ? data.date : "",
        draft: data.draft === "true" || data.draft === true,
        headings: getHeadings(body),
        excerpt: getExcerpt(body),
        // GEO answer-first summary — the strongest grounding signal for the
        // AI layer, far denser than the excerpt (see blog memory on tldr).
        tldr: Array.isArray(data.tldr)
          ? data.tldr.slice(0, 6)
          : typeof data.tldr === "string" && data.tldr
            ? [data.tldr]
            : [],
        maturity: typeof data.maturity === "string" ? data.maturity : "",
        // Set to true during atlas resolution for hand-curated posts.
        featured: false,
        body: getBody(body),
      };
    })
    .filter((doc) => !doc.draft)
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  const byLanguage = {};
  for (const doc of documents) {
    if (!byLanguage[doc.language]) {
      byLanguage[doc.language] = 0;
    }
    byLanguage[doc.language] += 1;
  }

  const atlas = buildAtlas(documents);

  return {
    generatedAt: new Date().toISOString(),
    totalDocuments: documents.length,
    byLanguage,
    tree: buildTree(documents),
    atlas,
    documents,
  };
}

// ─── Reading atlas (data/start_here.json) → AI-ready structure ──────────────
// The atlas is the human-curated map of the blog (entity statement, four
// threads, hand-picked posts). Resolving its logical page paths against the
// scanned documents gives the AI layer real permalinks + titles + tldr, and
// lets us tag those documents as `featured` so retrieval can boost them.

function logicalPathOf(doc) {
  return (
    "/" +
    doc.relativePath
      .replace(/\.md$/i, "")
      .replace(/\/index$/i, "")
      .toLowerCase()
  );
}

function buildAtlas(documents) {
  const atlasSource = path.join(repoRoot, "data", "start_here.json");
  if (!fs.existsSync(atlasSource)) return null;

  let data;
  try {
    data = JSON.parse(fs.readFileSync(atlasSource, "utf8"));
  } catch (error) {
    console.warn(`content-index: unable to parse ${atlasSource}: ${error.message}`);
    return null;
  }

  const byLogicalPath = new Map();
  for (const doc of documents) {
    byLogicalPath.set(`${doc.language}:${logicalPathOf(doc)}`, doc);
    // A page may keep a stable public URL after moving to a different
    // editorial section. Let the curated atlas resolve either its source
    // location or that explicit permalink.
    const languagePrefix = doc.language === defaultLanguage ? "" : `/${doc.language}`;
    const publicLogicalPath = doc.permalink
      .replace(new RegExp(`^${languagePrefix}`), "")
      .replace(/\/$/, "")
      .toLowerCase();
    byLogicalPath.set(`${doc.language}:${publicLogicalPath}`, doc);
  }

  const resolvePost = (language, entry) => {
    if (!entry || typeof entry.page !== "string") return null;
    const doc = byLogicalPath.get(`${language}:${entry.page.toLowerCase()}`);
    if (!doc) {
      console.warn(`content-index atlas: page not found: ${language}:${entry.page}`);
      return null;
    }
    doc.featured = true;
    return {
      title: doc.title,
      permalink: doc.permalink,
      hook: entry.hook || "",
      tldr: doc.tldr.slice(0, 2),
    };
  };

  const atlas = {};
  for (const language of Object.keys(data)) {
    if (language.startsWith("_")) continue;
    const lang = data[language];
    if (!lang || !Array.isArray(lang.paths)) continue;

    atlas[language] = {
      entity: lang.colophon?.entity || "",
      first_read: resolvePost(language, lang.first_read),
      threads: lang.paths.map((thread) => ({
        key: thread.key,
        title: thread.title,
        audience: thread.audience || "",
        section_url: thread.more_url || "",
        posts: (thread.posts || []).map((post) => resolvePost(language, post)).filter(Boolean),
      })),
    };
  }

  return atlas;
}

export function writeOutput(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const index = buildIndex();
  // Both copies stay byte-identical (score-content-search-integrity.mjs
  // enforces this). Nothing in the browser fetches the static copy — it is
  // the MCP server's fallback, which also benefits from the `body` slices.
  for (const outputPath of outputPaths) {
    writeOutput(outputPath, index);
  }

  console.log(
    `Generated content index with ${index.totalDocuments} documents at ${outputPaths.join(", ")}`
  );
}
