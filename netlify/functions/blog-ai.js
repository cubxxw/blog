"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { Readable } = require("node:stream");
const { stream: netlifyStream } = require("@netlify/functions");

const indexPath = path.join(__dirname, "_generated", "content-index.json");
let cachedIndex = null;

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

function normalize(text) {
  return String(text || "").toLowerCase();
}

function tokenize(text) {
  const matches = normalize(text).match(/[\p{L}\p{N}_-]+/gu);
  return (matches || []).filter((token) => token.length >= 2);
}

function scoreDocument(doc, questionTokens, requestedLanguage) {
  const haystack = normalize(
    [doc.title, doc.relativePath, doc.section, doc.tags.join(" "), doc.categories.join(" "), doc.headings.join(" "), doc.excerpt].join(" ")
  );
  let score = 0;
  for (const token of questionTokens) {
    if (haystack.includes(token)) score += token.length > 4 ? 6 : 3;
  }
  if (requestedLanguage && doc.language === requestedLanguage) score += 4;
  if (questionTokens.some((token) => doc.relativePath.toLowerCase().includes(token))) score += 5;
  return score;
}

function summarizeTree(node, depth = 0, lines = []) {
  if (depth > 3) return lines;
  if (depth > 0) lines.push(`${"  ".repeat(depth - 1)}- ${node.name} (${node.count})`);
  for (const child of node.children || []) summarizeTree(child, depth + 1, lines);
  return lines;
}

function buildContext(index, question, requestedLanguage) {
  const questionTokens = tokenize(question);
  const ranked = index.documents
    .map((doc) => ({ doc, score: scoreDocument(doc, questionTokens, requestedLanguage) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((item) => item.doc);

  const fallback = ranked.length
    ? ranked
    : index.documents.filter((doc) => !requestedLanguage || doc.language === requestedLanguage).slice(0, 6);

  return {
    directorySummary: summarizeTree(index.tree).join("\n"),
    candidates: fallback.map((doc) => ({
      title: doc.title,
      language: doc.language,
      relativePath: doc.relativePath,
      permalink: doc.permalink,
      section: doc.section,
      tags: doc.tags,
      categories: doc.categories,
      headings: doc.headings,
      excerpt: doc.excerpt,
    })),
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
  const language = String(payload.language || "").trim();
  const conversationHistory = payload.context || [];
  const searchContext = payload.searchContext || [];

  if (!question) return json(400, { error: "Question is required" });

  const index = loadIndex();
  const docContext = buildContext(index, question, language);
  const model = process.env.DASHSCOPE_MODEL || "qwen-turbo";
  const baseUrl = process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";

  const systemPrompt = [
    "You are Bear AI — the digital twin assistant of this Hugo blog, deeply familiar with every article, book note, and project on the site.",
    "Do not perform internal reasoning or thinking steps. Reply directly and concisely.",
    "CRITICAL RULE — Article citations: whenever you reference or recommend a specific article, you MUST format it as a Markdown hyperlink using the exact permalink from the candidate documents list.",
    "Correct format: [Article Title](permalink) — for example: [Agent 的自我](https://cubxxw.com/zh/ai-technology/posts/agent-identity/)",
    "NEVER write an article title as plain text without a link. Every article mention must be a clickable Markdown link.",
    "Response structure when recommending articles: (1) Open with the article link(s) clearly on their own line. (2) Then provide your analysis or answer combining the article content with the user's question.",
    "Prefer the user's language. If the user writes Chinese, answer in Chinese. If the user writes English, answer in English.",
    "Do not invent permalinks or titles not present in the provided candidate documents.",
    "If conversation history is provided, use it to maintain context and provide more personalized responses.",
    "For follow-up questions, consider them in the context of the conversation history and provide coherent, connected responses.",
    "",
    "AUTHOR PROFILE — you know the blog's author personally and may answer questions about who he is and how to reach him, even though this is not in the article list:",
    AUTHOR_PROFILE,
    "",
    "CONTACT RULE — when the user asks how to contact the author, or asks for his WeChat / 微信 / email / GitHub / social accounts, answer warmly and directly using the AUTHOR PROFILE above. Never say you can only answer article questions, and never invent contact details not listed in the profile.",
    "When WeChat / 微信 is asked for specifically, state the WeChat ID (cubxxw_com) and then guide the user to the WeChat card: tell them to click the WeChat icon in the top-right social row (or the WeChat card on the About page) to open the QR code and one-click copy the ID. Provide the About page link [关于我 / About](https://cubxxw.com/zh/about/) so they can reach the full contact section.",
    "Keep contact answers friendly and human — the author is open, curious and happy to connect about AI, open source and the nomad life.",
  ].join(" ");

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
      `\nDirectory summary:\n${docContext.directorySummary}`,
      `\nCandidate documents:\n${JSON.stringify(docContext.candidates, null, 2)}`,
      searchContextStr,
    ].join("\n"),
  });

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
  } catch (error) {
    return json(502, { error: "Failed to reach Qwen API", detail: error.message });
  }

  if (!upstreamRes.ok) {
    let errorDetail;
    try { errorDetail = await upstreamRes.json(); } catch { errorDetail = {}; }
    return json(upstreamRes.status, {
      error: errorDetail.error?.message || errorDetail.error || "Qwen API returned an error",
      detail: errorDetail,
    });
  }

  if (!useStream) {
    const responseJson = await upstreamRes.json();
    const answer = responseJson.choices?.[0]?.message?.content || "";
    return json(200, { answer, model, candidates: docContext.candidates, generatedAt: index.generatedAt });
  }

  // True progressive streaming via Node.js Readable stream (compatible with @netlify/functions stream helper)
  const metaLine = `data: ${JSON.stringify({ meta: { model, candidates: docContext.candidates, generatedAt: index.generatedAt } })}\n\n`;

  const nodeReadable = new Readable({ read() {} });

  // Pipe upstream SSE → nodeReadable in background
  (async () => {
    try {
      nodeReadable.push(metaLine);

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
      nodeReadable.push(null); // signal end of stream
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
