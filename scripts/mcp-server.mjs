#!/usr/bin/env node
// cubxxw-blog MCP server (stdio, zero-dependency).
//
// Exposes the blog's content as tools for MCP clients (Claude Desktop, Cursor,
// ChatGPT desktop, etc.) so an AI agent can search and read posts directly.
// Reuses the same content index that powers the site's in-page AI Q&A
// (static/data/content-index.json), so search behaviour stays consistent.
//
// Protocol: JSON-RPC 2.0 over stdio, MCP 2024-11-05 (widest client support).
// One JSON message per line in, one per line out.
//
// Configure in Claude Desktop (claude_desktop_config.json):
//   {
//     "mcpServers": {
//       "cubxxw-blog": {
//         "command": "node",
//         "args": ["/absolute/path/to/blog/scripts/mcp-server.mjs"]
//       }
//     }
//   }

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROTOCOL_VERSION = "2024-11-05";

// ─── Content index ──────────────────────────────────────────────────────────
const INDEX_CANDIDATES = [
  path.join(ROOT, "netlify/functions/_generated/content-index.json"),
  path.join(ROOT, "static/data/content-index.json"),
];

let index = null;
function loadIndex() {
  if (index) return index;
  for (const p of INDEX_CANDIDATES) {
    if (fs.existsSync(p)) {
      index = JSON.parse(fs.readFileSync(p, "utf8"));
      return index;
    }
  }
  throw new Error("content-index.json not found — run: node scripts/generate-content-index.mjs");
}

// ─── Search (mirrors netlify/functions/blog-ai.js scoring) ───────────────────
function tokenize(text) {
  const m = String(text || "").toLowerCase().match(/[\p{L}\p{N}_-]+/gu);
  return (m || []).filter((t) => t.length >= 2);
}

function scoreDoc(doc, tokens, lang) {
  const hay = [doc.title, doc.relativePath, doc.section, (doc.tags || []).join(" "),
    (doc.categories || []).join(" "), (doc.headings || []).join(" "), doc.excerpt]
    .join(" ").toLowerCase();
  let score = 0;
  for (const t of tokens) if (hay.includes(t)) score += t.length > 4 ? 6 : 3;
  if (lang && doc.language === lang) score += 4;
  if (tokens.some((t) => doc.relativePath.toLowerCase().includes(t))) score += 5;
  return score;
}

function searchBlog({ query, language, limit = 8 }) {
  const idx = loadIndex();
  const tokens = tokenize(query);
  const ranked = idx.documents
    .map((doc) => ({ doc, score: scoreDoc(doc, tokens, language) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(Math.max(1, limit), 20))
    .map(({ doc, score }) => ({
      title: doc.title,
      language: doc.language,
      permalink: doc.permalink,
      // Prefix with language so the value is directly usable by get_blog_post.
      relativePath: `${doc.language}/${doc.relativePath}`,
      section: doc.section,
      tags: doc.tags,
      date: doc.date,
      score,
      excerpt: (doc.excerpt || "").slice(0, 280),
    }));
  return ranked.length ? ranked : [{ note: "No matching posts found.", query }];
}

function getBlogPost({ relativePath }) {
  if (!relativePath || relativePath.includes("..") || path.isAbsolute(relativePath)) {
    throw new Error("Invalid relativePath");
  }
  const contentRoot = path.join(ROOT, "content");
  // The index stores relativePath without the language prefix (e.g.
  // "ai-technology/posts/argo-cd.md"), but files live under content/<lang>/.
  // Accept both the prefixed form and the bare form by probing each language.
  const candidates = [relativePath, `zh/${relativePath}`, `en/${relativePath}`];
  let resolved = null;
  for (const c of candidates) {
    const full = path.join(contentRoot, c);
    if (full.startsWith(contentRoot) && fs.existsSync(full) && fs.statSync(full).isFile()) {
      resolved = { rel: c, full };
      break;
    }
  }
  if (!resolved) throw new Error(`Post not found: ${relativePath}`);
  const raw = fs.readFileSync(resolved.full, "utf8");
  const max = 24000;
  return { relativePath: resolved.rel, truncated: raw.length > max, content: raw.slice(0, max) };
}

// ─── Tool definitions ────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "search_blog",
    description:
      "Search Xinwei Xiong (cubxxw)'s bilingual tech blog (AI, Kubernetes, Go, open source, digital nomad). Returns ranked posts with title, permalink, tags and an excerpt.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search terms / question." },
        language: { type: "string", enum: ["en", "zh"], description: "Optional language preference." },
        limit: { type: "number", description: "Max results (1-20, default 8)." },
      },
      required: ["query"],
    },
  },
  {
    name: "get_blog_post",
    description:
      "Fetch the full markdown of one blog post by its relativePath (as returned by search_blog), e.g. 'zh/ai-technology/posts/argo-cd.md'.",
    inputSchema: {
      type: "object",
      properties: {
        relativePath: { type: "string", description: "Path under content/, from search_blog results." },
      },
      required: ["relativePath"],
    },
  },
];

function callTool(name, args) {
  let data;
  if (name === "search_blog") data = searchBlog(args || {});
  else if (name === "get_blog_post") data = getBlogPost(args || {});
  else throw new Error(`Unknown tool: ${name}`);
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

// ─── JSON-RPC over stdio ─────────────────────────────────────────────────────
function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function handle(req) {
  const { id, method, params } = req;
  // Notifications (no id) get no response.
  if (id === undefined || id === null) return;

  try {
    if (method === "initialize") {
      return send({
        jsonrpc: "2.0", id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: "cubxxw-blog", version: "1.0.0" },
        },
      });
    }
    if (method === "tools/list") {
      return send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    }
    if (method === "tools/call") {
      return send({ jsonrpc: "2.0", id, result: callTool(params?.name, params?.arguments) });
    }
    if (method === "ping") {
      return send({ jsonrpc: "2.0", id, result: {} });
    }
    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  } catch (err) {
    send({ jsonrpc: "2.0", id, error: { code: -32603, message: String(err && err.message || err) } });
  }
}

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let req;
  try { req = JSON.parse(trimmed); }
  catch { return send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); }
  handle(req);
});
