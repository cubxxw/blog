"use strict";

// Bear AI — site-wide chat with an agentic retrieval loop.
//
// Pipeline: the model gets (a) the human-curated reading atlas + entity card
// from data/start_here.json (via content-index), (b) a small set of
// pre-retrieved candidate articles, and (c) two tools — search_blog /
// get_post — it may call for anything the candidates don't cover. Tool
// rounds are capped at MAX_TOOL_ROUNDS, then the model must answer.
//
// SSE protocol (superset of the previous one — old frontends ignore the new
// event type):
//   data: {"meta": {...}}                        once, first
//   data: {"status":{"id","state":"run"|"done","label"}}   per tool call
//   data: {"delta":"..."}                        streamed answer text
//   data: [DONE]

const fs = require("node:fs");
const path = require("node:path");
const { Readable } = require("node:stream");
const { stream: netlifyStream } = require("@netlify/functions");

const indexPath = path.join(__dirname, "_generated", "content-index.json");
let cachedIndex = null;

const MAX_TOOL_ROUNDS = 2;
const UPSTREAM_TIMEOUT_MS = 22000;

// Authoritative author + contact card. Keep in sync with config.yml
// (params.socialIcons) — this is what lets Bear AI answer "how do I reach
// the author / what's his WeChat" instead of falling back to "articles only".
const AUTHOR_PROFILE = [
  "Name: 熊鑫伟 (Xinwei Xiong), handle cubxxw. Born 2001 in China.",
  "Identity: AI founder, open-source contributor, digital nomad and writer. Believes AI + Human = Superhuman. Active in OpenIM, OpenKF, Sealos.",
  "Personality: authentic, curious, a connector — happy to talk AI, open source and the nomad life.",
  "Contact channels:",
  "- WeChat (微信, the fastest way to reach him) — WeChat ID: cubxxw_com. QR code + one-click copy available via the WeChat card.",
  "- Email: 3293172751nss@gmail.com",
  "- GitHub: https://github.com/cubxxw",
  "- X / Twitter: https://x.com/xxw3293172751",
  "- 知乎 / Zhihu: https://www.zhihu.com/people/3293172751",
  "- 即刻 / Jike: https://web.okjike.com/u/56390e30-3288-4d20-a488-9f80161bbbf4",
  "- Bilibili: https://space.bilibili.com/1233089591",
  "- 小红书 / Xiaohongshu: https://www.xiaohongshu.com/user/profile/62a33af9000000001b025dd3",
  "- Buy Me a Coffee: https://www.buymeacoffee.com/cubxxw",
  "Full contact section lives on the About page: https://cubxxw.com/zh/about/ (English: https://cubxxw.com/about/).",
].join("\n");

function loadIndex() {
  if (cachedIndex) return cachedIndex;
  cachedIndex = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  return cachedIndex;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS_HEADERS },
    body: JSON.stringify(payload),
  };
}

// ─── Retrieval ───────────────────────────────────────────────────────────────

function normalize(text) {
  return String(text || "").toLowerCase();
}

function tokenize(text) {
  const matches = String(text || "").toLowerCase().match(/[\p{L}\p{N}_-]+/gu);
  const tokens = [];
  for (const token of matches || []) {
    if (token.length < 2) continue;
    tokens.push(token);
    // CJK runs don't have word boundaries — a whole phrase becomes one token
    // that almost never matches. Emit character bigrams so Chinese queries
    // actually hit titles/tags ("心流状态" → 心流/流状/状态).
    if (/[\u4e00-\u9fff]/.test(token) && token.length > 2) {
      for (let i = 0; i < token.length - 1; i += 1) {
        tokens.push(token.slice(i, i + 2));
      }
    }
  }
  return tokens;
}

function scoreDocument(doc, questionTokens, requestedLanguage) {
  const haystack = normalize(
    [doc.title, doc.relativePath, doc.section, doc.tags.join(" "), doc.categories.join(" "), doc.headings.join(" "), (doc.tldr || []).join(" "), doc.excerpt].join(" ")
  );
  let score = 0;
  for (const token of questionTokens) {
    if (haystack.includes(token)) score += token.length > 4 ? 6 : 3;
  }
  if (requestedLanguage && doc.language === requestedLanguage) score += 4;
  if (questionTokens.some((token) => doc.relativePath.toLowerCase().includes(token))) score += 5;
  // Hand-curated atlas picks are the blog's proven best — surface them first.
  if (doc.featured && score > 0) score += 8;
  return score;
}

function toCandidate(doc) {
  return {
    title: doc.title,
    language: doc.language,
    permalink: doc.permalink,
    section: doc.section,
    tags: doc.tags,
    tldr: (doc.tldr || []).slice(0, 3),
    excerpt: (doc.excerpt || "").slice(0, 200),
    featured: !!doc.featured,
  };
}

function searchDocuments(index, query, requestedLanguage, limit) {
  const tokens = tokenize(query);
  return index.documents
    .map((doc) => ({ doc, score: scoreDocument(doc, tokens, requestedLanguage) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.doc);
}

function findByPermalink(index, permalink) {
  let p = String(permalink || "").trim();
  p = p.replace(/^https?:\/\/[^/]+/, "");
  if (!p.startsWith("/")) p = `/${p}`;
  if (!p.endsWith("/")) p = `${p}/`;
  p = p.toLowerCase();
  return index.documents.find((doc) => doc.permalink.toLowerCase() === p) || null;
}

// Recency block — the same signal an RSS feed carries, but sourced from the
// full index so "what's new on the blog" answers stay accurate and linked.
function recentPostsBlock(index, requestedLanguage, limit = 8) {
  const docs = index.documents
    .filter((doc) => doc.date && (!requestedLanguage || doc.language === requestedLanguage))
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, limit);
  if (!docs.length) return "";
  const lines = docs.map((doc) => `- ${String(doc.date).slice(0, 10)} [${doc.title}](${doc.permalink})`);
  return `Most recent posts (newest first):\n${lines.join("\n")}`;
}

function summarizeTree(node, depth = 0, lines = []) {
  if (depth > 3) return lines;
  if (depth > 0) lines.push(`${"  ".repeat(depth - 1)}- ${node.name} (${node.count})`);
  for (const child of node.children || []) summarizeTree(child, depth + 1, lines);
  return lines;
}

// ─── Reading atlas → prompt block ────────────────────────────────────────────

function atlasPromptBlock(index, requestedLanguage) {
  const atlas = index.atlas;
  if (!atlas) return "";
  const lang = atlas[requestedLanguage] ? requestedLanguage : atlas.zh ? "zh" : Object.keys(atlas)[0];
  const a = atlas[lang];
  if (!a) return "";

  const lines = [
    "SITE READING ATLAS — the author's own curated map of this blog. Treat it as the authoritative answer to \"what is this blog / who is the author / where should I start / what do you recommend\":",
    `Entity: ${a.entity}`,
  ];
  if (a.first_read) {
    lines.push(`Best single starting post: [${a.first_read.title}](${a.first_read.permalink}) — ${a.first_read.hook}`);
  }
  for (const thread of a.threads || []) {
    lines.push(`Thread ${thread.title} (${thread.audience}) — full list: ${thread.section_url}`);
    for (const post of thread.posts || []) {
      lines.push(`  - [${post.title}](${post.permalink}) — ${post.hook}`);
    }
  }
  lines.push("The same atlas exists in both Chinese and English; recommend posts matching the user's language when possible.");
  return lines.join("\n");
}

// ─── Tools ───────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_blog",
      description:
        "Search the blog's full article index by keywords. Use when the pre-provided candidate documents don't cover the question. Returns matching articles with title, permalink, tags and TL;DR.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Keywords to search for (any language)" },
          language: { type: "string", enum: ["zh", "en"], description: "Optionally restrict results to one language" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_post",
      description:
        "Read one article in depth by its permalink (e.g. /zh/projects/langgraph/). Returns its headings, TL;DR and a body excerpt. Use when the user asks details about a specific article.",
      parameters: {
        type: "object",
        properties: {
          permalink: { type: "string", description: "The article permalink path" },
        },
        required: ["permalink"],
      },
    },
  },
];

function statusLabels(isZh) {
  return {
    searchRun: (q) => (isZh ? `检索「${q}」…` : `Searching “${q}”…`),
    searchDone: (q, n) => (isZh ? `检索「${q}」— ${n} 篇相关` : `Searched “${q}” — ${n} match${n === 1 ? "" : "es"}`),
    readRun: (t) => (isZh ? `翻阅《${t}》…` : `Reading “${t}”…`),
    readDone: (t) => (isZh ? `已读《${t}》` : `Read “${t}”`),
    readMiss: (p) => (isZh ? `未找到 ${p}` : `Not found: ${p}`),
  };
}

function executeTool(index, name, args, requestedLanguage, isZh, emitStatus, callId) {
  const labels = statusLabels(isZh);

  if (name === "search_blog") {
    const query = String(args.query || "").slice(0, 120);
    const language = args.language === "zh" || args.language === "en" ? args.language : requestedLanguage || "";
    emitStatus(callId, "run", labels.searchRun(query));
    const docs = searchDocuments(index, query, language, 6);
    emitStatus(callId, "done", labels.searchDone(query, docs.length));
    return { results: docs.map(toCandidate) };
  }

  if (name === "get_post") {
    const doc = findByPermalink(index, args.permalink);
    if (!doc) {
      emitStatus(callId, "done", labels.readMiss(String(args.permalink || "")));
      return { error: "No article at that permalink. Use search_blog to find the right one." };
    }
    emitStatus(callId, "run", labels.readRun(doc.title));
    const detail = {
      title: doc.title,
      permalink: doc.permalink,
      language: doc.language,
      tags: doc.tags,
      headings: doc.headings,
      tldr: doc.tldr || [],
      body: doc.body || doc.excerpt || "",
    };
    emitStatus(callId, "done", labels.readDone(doc.title));
    return detail;
  }

  return { error: `Unknown tool: ${name}` };
}

// ─── Upstream (DashScope OpenAI-compatible) ──────────────────────────────────

async function upstreamChat(baseUrl, body) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS) : null;
  try {
    return await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller ? controller.signal : undefined,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Run one streamed round. Pushes {delta} lines for content as it arrives and
// assembles any tool_calls fragments. Returns {content, toolCalls}.
async function runStreamedRound(baseUrl, requestBody, pushLine) {
  const res = await upstreamChat(baseUrl, { ...requestBody, stream: true });
  if (!res.ok) {
    let detail;
    try { detail = await res.json(); } catch { detail = {}; }
    const err = new Error(detail.error?.message || detail.error || `Upstream error (${res.status})`);
    err.statusCode = res.status;
    throw err;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  const toolCalls = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") continue;
      let chunk;
      try { chunk = JSON.parse(raw); } catch { continue; }
      const delta = chunk.choices?.[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        content += delta.content;
        pushLine(`data: ${JSON.stringify({ delta: delta.content })}\n\n`);
      }
      if (Array.isArray(delta.tool_calls)) {
        for (const frag of delta.tool_calls) {
          const i = frag.index ?? 0;
          if (!toolCalls[i]) {
            toolCalls[i] = { id: frag.id || `call_${i}`, type: "function", function: { name: "", arguments: "" } };
          }
          if (frag.id) toolCalls[i].id = frag.id;
          if (frag.function?.name) toolCalls[i].function.name = frag.function.name;
          if (frag.function?.arguments) toolCalls[i].function.arguments += frag.function.arguments;
        }
      }
    }
  }

  return { content, toolCalls: toolCalls.filter(Boolean) };
}

// The agent loop: streamed rounds with tools until the model answers or the
// round cap is hit (then one final round without tools).
async function runAgentLoop(index, baseUrl, model, messages, requestedLanguage, isZh, pushLine) {
  let fullAnswer = "";
  const emitStatus = (id, state, label) => {
    pushLine(`data: ${JSON.stringify({ status: { id, state, label } })}\n\n`);
  };

  for (let round = 0; ; round += 1) {
    const allowTools = round < MAX_TOOL_ROUNDS;
    const requestBody = {
      model,
      messages,
      max_completion_tokens: 1800,
      ...(allowTools ? { tools: TOOLS, parallel_tool_calls: true } : {}),
    };

    const { content, toolCalls } = await runStreamedRound(baseUrl, requestBody, pushLine);
    fullAnswer += content;

    if (!toolCalls.length || !allowTools) break;

    messages.push({ role: "assistant", content: content || "", tool_calls: toolCalls });
    for (const call of toolCalls) {
      let args = {};
      try { args = JSON.parse(call.function.arguments || "{}"); } catch {}
      const result = executeTool(index, call.function.name, args, requestedLanguage, isZh, emitStatus, call.id);
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  return fullAnswer;
}

// ─── Handler ────────────────────────────────────────────────────────────────

async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS };
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  if (!process.env.DASHSCOPE_API_KEY) return json(500, { error: "Missing DASHSCOPE_API_KEY environment variable" });

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const question = String(payload.question || "").trim();
  const language = String(payload.language || "").trim();
  const conversationHistory = payload.context || [];
  const searchContext = payload.searchContext || [];
  const isZh = language.toLowerCase().startsWith("zh") || (!language && /[一-鿿]/.test(question));

  if (!question) return json(400, { error: "Question is required" });

  const index = loadIndex();
  const model = process.env.DASHSCOPE_MODEL || "qwen-turbo";
  const baseUrl = process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";

  const prefetched = searchDocuments(index, question, language, 4);
  const candidates = (prefetched.length
    ? prefetched
    : index.documents.filter((doc) => (!language || doc.language === language) && doc.featured).slice(0, 6)
  ).map(toCandidate);

  const systemPrompt = [
    "You are Bear AI — the digital twin assistant of this Hugo blog, deeply familiar with every article, book note, and project on the site.",
    "Reply directly and concisely; do not narrate your reasoning.",
    "CRITICAL RULE — Article citations: whenever you reference or recommend a specific article, you MUST format it as a Markdown hyperlink using the exact permalink from the candidates, atlas, or tool results.",
    "Correct format: [Article Title](permalink) — for example: [Agent 的自我](https://cubxxw.com/zh/ai-technology/posts/agent-identity/)",
    "NEVER write an article title as plain text without a link, and never invent permalinks or titles.",
    "Response structure when recommending articles: (1) Open with the article link(s) clearly on their own line. (2) Then provide your analysis combining the article content with the user's question.",
    "Prefer the user's language: Chinese question → Chinese answer; English question → English answer.",
    "TOOLS — you may call search_blog when the provided candidates don't cover the question, and get_post to read one article in depth. Use at most a couple of tool rounds, then answer. For greetings, contact questions, or questions the atlas/candidates already answer, do NOT call tools.",
    "",
    atlasPromptBlock(index, isZh ? "zh" : language || "en"),
    "",
    "AUTHOR PROFILE — you know the blog's author personally and may answer questions about who he is and how to reach him:",
    AUTHOR_PROFILE,
    "",
    "CONTACT RULE — when the user asks how to contact the author (WeChat / 微信 / email / GitHub / socials), answer warmly and directly from the AUTHOR PROFILE. Never say you can only answer article questions.",
    "When WeChat / 微信 is asked for specifically, state the WeChat ID (cubxxw_com) and guide the user to the WeChat card (top-right social row, or the About page): [关于我 / About](https://cubxxw.com/zh/about/).",
  ].join("\n");

  const messages = [{ role: "system", content: systemPrompt }];

  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    for (const msg of conversationHistory.slice(-10)) {
      if (msg.role && msg.content) {
        messages.push({ role: msg.role === "user" ? "user" : "assistant", content: msg.content });
      }
    }
  }

  const searchContextStr = searchContext.length > 0
    ? `\n\nSearch results context:\n${JSON.stringify(searchContext, null, 2)}`
    : "";

  messages.push({
    role: "user",
    content: [
      `User question:\n${question}`,
      `Preferred language hint: ${language || "auto"}`,
      `\nDirectory summary:\n${summarizeTree(index.tree).join("\n")}`,
      `\n${recentPostsBlock(index, language || (isZh ? "zh" : ""))}`,
      `\nCandidate documents:\n${JSON.stringify(candidates, null, 2)}`,
      searchContextStr,
    ].join("\n"),
  });

  const useStream = String(payload.stream) !== "false";

  if (!useStream) {
    // Non-streaming: same agent loop, buffered.
    const buffered = [];
    const pushLine = (line) => buffered.push(line);
    try {
      const answer = await runAgentLoop(index, baseUrl, model, messages, language, isZh, pushLine);
      const toolTrace = buffered
        .map((line) => { try { return JSON.parse(line.slice(6)); } catch { return null; } })
        .filter((evt) => evt && evt.status)
        .map((evt) => evt.status);
      return json(200, { answer, model, candidates, toolTrace, generatedAt: index.generatedAt });
    } catch (error) {
      return json(error.statusCode || 502, { error: error.message || "Upstream failure" });
    }
  }

  const nodeReadable = new Readable({ read() {} });
  const pushLine = (line) => nodeReadable.push(line);

  (async () => {
    try {
      pushLine(`data: ${JSON.stringify({ meta: { model, candidates, generatedAt: index.generatedAt } })}\n\n`);
      await runAgentLoop(index, baseUrl, model, messages, language, isZh, pushLine);
      pushLine("data: [DONE]\n\n");
    } catch (err) {
      // Surface the failure inside the stream so the client shows a message
      // instead of an empty bubble.
      try {
        pushLine(`data: ${JSON.stringify({ error: err.message || "Upstream failure" })}\n\n`);
        pushLine("data: [DONE]\n\n");
      } catch {}
    } finally {
      nodeReadable.push(null);
    }
  })();

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
      ...CORS_HEADERS,
    },
    body: nodeReadable,
  };
}

exports.handler = netlifyStream(handler);
