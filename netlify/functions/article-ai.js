"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { Readable } = require("node:stream");
const { stream: netlifyStream } = require("@netlify/functions");

// Shared content index (same artifact blog-ai uses) so the reading companion
// can ground answers in the site's own related articles — with real
// permalinks — instead of knowing only the current page.
const indexPath = path.join(__dirname, "_generated", "content-index.json");
let cachedIndex = null;

function loadIndex() {
  if (cachedIndex) return cachedIndex;
  try {
    cachedIndex = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  } catch {
    cachedIndex = { documents: [] };
  }
  return cachedIndex;
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

// Find up to `limit` related articles for this question+article, excluding
// the page the reader is already on.
function findRelated(question, articleTitle, language, currentPath, limit) {
  const index = loadIndex();
  const tokens = tokenize(`${question} ${articleTitle}`);
  if (!tokens.length) return [];

  const current = String(currentPath || "").replace(/\/$/, "").toLowerCase();

  return index.documents
    .map((doc) => {
      const haystack = [doc.title, doc.tags.join(" "), doc.headings.join(" "), (doc.tldr || []).join(" "), doc.excerpt]
        .join(" ")
        .toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (haystack.includes(token)) score += token.length > 4 ? 6 : 3;
      }
      if (language && doc.language === language) score += 4;
      if (doc.featured && score > 0) score += 6;
      return { doc, score };
    })
    .filter(({ doc, score }) => {
      if (score <= 0) return false;
      // Section stubs (_index) are navigation pages, not reading material.
      if (doc.slug === "_index") return false;
      const p = doc.permalink.replace(/\/$/, "").toLowerCase();
      if (current && p === current) return false;
      if (articleTitle && doc.title === articleTitle) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ doc }) => ({
      title: doc.title,
      permalink: doc.permalink,
      tldr: (doc.tldr || []).slice(0, 1),
    }));
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
  const articleTitle = String(payload.articleTitle || "").trim();
  const articleContent = String(payload.articleContent || "").trim();
  const pagePath = String(payload.pagePath || "").trim();
  const conversationHistory = Array.isArray(payload.context) ? payload.context : [];
  // Respect the reader's language — the previous prompt was hardcoded to
  // Chinese, so EN readers got Chinese answers.
  const isZh = String(payload.language || "zh").toLowerCase().indexOf("zh") === 0;

  if (!question) return json(400, { error: "question is required" });

  const related = findRelated(question, articleTitle, isZh ? "zh" : "en", pagePath, 3);

  const model = process.env.DASHSCOPE_MODEL || "qwen-turbo";
  const baseUrl = process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";

  const articleBlock = articleContent
    ? (isZh
        ? `\n文章正文摘要（可能为长文的开头与结尾节选）：\n${articleContent.slice(0, 5600)}`
        : `\nArticle excerpt (for long pieces this may be the opening and the ending):\n${articleContent.slice(0, 5600)}`)
    : (isZh ? "\n（未提供文章正文，请基于标题谨慎回答）" : "\n(No article body provided — answer cautiously from the title.)");

  const systemPrompt = (isZh
    ? [
        "你是一位文章阅读助手，帮助读者深入理解他正在阅读的这篇文章。",
        "优先依据下面提供的文章标题和正文来回答；当文章未涉及某个细节时，明确说明这是文章之外的背景或你的推测，绝不编造文章里没有的内容或杜撰引文、数据。",
        "不要输出思考过程，直接给出简洁、有条理的答案。",
        "回答用中文，语气友好克制，控制在 3 段以内，适合侧边栏的紧凑空间。",
        "若读者的问题超出本文范围，可简短作答并建议他从文章的哪一部分继续读起。",
      ]
    : [
        "You are a reading companion helping the reader understand the specific article they are currently reading.",
        "Answer primarily from the article title and body provided below. When the article doesn't cover something, say plainly that it's outside the article or your own inference — never fabricate claims, quotes, or figures that aren't in the text.",
        "Don't show your reasoning; give a concise, well-structured answer directly.",
        "Reply in English, friendly and restrained, within three short paragraphs to fit a compact sidebar.",
        "If the question goes beyond the article, answer briefly and point the reader to the section worth reading next.",
      ]
  )
    .concat([
      articleTitle ? (isZh ? `\n当前文章标题：${articleTitle}` : `\nArticle title: ${articleTitle}`) : "",
      // Give the model the real permalink of the page the reader is on, so a
      // mention of the current article never gets an invented URL.
      pagePath
        ? (isZh
            ? `当前文章链接：${pagePath}（引用本文时必须用这个链接，不要编造其它链接）`
            : `Current article permalink: ${pagePath} (always use this exact link when citing this article; never invent links).`)
        : "",
      articleBlock,
      related.length
        ? (isZh
            ? `\n本站相关文章（当读者的问题值得延伸阅读时，用 Markdown 链接推荐，格式 [标题](链接)，不要杜撰其他链接）：\n${related
                .map((r) => `- [${r.title}](${r.permalink})${r.tldr[0] ? ` — ${r.tldr[0]}` : ""}`)
                .join("\n")}`
            : `\nRelated articles on this blog (when further reading helps, recommend them as Markdown links [title](permalink); never invent other links):\n${related
                .map((r) => `- [${r.title}](${r.permalink})${r.tldr[0] ? ` — ${r.tldr[0]}` : ""}`)
                .join("\n")}`)
        : "",
    ])
    .filter(Boolean)
    .join("\n");

  const messages = [{ role: "system", content: systemPrompt }];

  for (const msg of conversationHistory.slice(-10)) {
    if (msg.role && msg.content) {
      messages.push({ role: msg.role === "user" ? "user" : "assistant", content: msg.content });
    }
  }

  messages.push({ role: "user", content: question });

  const useStream = String(payload.stream) !== "false";

  let upstreamRes;
  try {
    upstreamRes = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, max_completion_tokens: 1800, stream: useStream }),
    });
  } catch (err) {
    return json(502, { error: "AI service unreachable: " + err.message });
  }

  if (!upstreamRes.ok) {
    let data;
    try { data = await upstreamRes.json(); } catch { data = {}; }
    return json(upstreamRes.status, { error: data?.error?.message || "AI API error" });
  }

  if (!useStream) {
    let data;
    try { data = await upstreamRes.json(); } catch { return json(502, { error: "Invalid response from AI service" }); }
    const answer = data?.choices?.[0]?.message?.content || "";
    // Real related-article links (the frontend drops empty-permalink entries).
    const candidates = related.map((r) => ({ title: r.title, permalink: r.permalink }));
    return json(200, { answer, candidates });
  }

  // True progressive streaming via Node.js Readable stream
  const nodeReadable = new Readable({ read() {} });

  // Emit related-reading links first so the frontend can render the
  // "related reading" row as soon as the answer completes.
  if (related.length) {
    nodeReadable.push(
      `data: ${JSON.stringify({ meta: { candidates: related.map((r) => ({ title: r.title, permalink: r.permalink })) } })}\n\n`
    );
  }

  (async () => {
    try {
      const reader = upstreamRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
          try {
            const chunk = JSON.parse(raw);
            const delta = chunk.choices?.[0]?.delta?.content || "";
            if (delta) {
              nodeReadable.push(`data: ${JSON.stringify({ delta })}\n\n`);
            }
          } catch {}
        }
      }
      nodeReadable.push("data: [DONE]\n\n");
    } catch (err) {
      nodeReadable.destroy(err);
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
