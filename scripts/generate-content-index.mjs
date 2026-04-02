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

function getHeadings(body) {
  return body
    .split("\n")
    .map((line) => line.match(/^#{1,3}\s+(.+)$/)?.[1]?.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function buildPermalink(language, relativePath) {
  const cleanPath = relativePath.replace(/\\/g, "/").replace(/\.md$/i, "");
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
      const slug = slugify(path.basename(relativePath));
      const relativeDir = path.dirname(relativePath);
      const sectionPath = relativeDir === "." ? "" : relativeDir.replace(/\\/g, "/");
      const sectionParts = sectionPath ? sectionPath.split("/") : [];

      return {
        title: typeof data.title === "string" && data.title ? data.title : slug,
        slug,
        language,
        relativePath: relativePath.replace(/\\/g, "/"),
        permalink: buildPermalink(language, relativePath),
        section: sectionPath,
        sectionParts,
        tags: Array.isArray(data.tags) ? data.tags.slice(0, 12) : [],
        categories: Array.isArray(data.categories) ? data.categories.slice(0, 12) : [],
        date: typeof data.date === "string" ? data.date : "",
        draft: data.draft === "true" || data.draft === true,
        headings: getHeadings(body),
        excerpt: getExcerpt(body),
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

  return {
    generatedAt: new Date().toISOString(),
    totalDocuments: documents.length,
    byLanguage,
    tree: buildTree(documents),
    documents,
  };
}

export function writeOutput(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const index = buildIndex();
  for (const outputPath of outputPaths) {
    writeOutput(outputPath, index);
  }

  console.log(
    `Generated content index with ${index.totalDocuments} documents at ${outputPaths.join(", ")}`
  );
}
