"use strict";

const { Readable } = require("node:stream");
const { stream: netlifyStream } = require("@netlify/functions");

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
  const conversationHistory = Array.isArray(payload.context) ? payload.context : [];

  if (!question) return json(400, { error: "question is required" });

  const model = process.env.DASHSCOPE_MODEL || "qwen-turbo";
  const baseUrl = process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";

  const systemPrompt = [
    "你是一位文章阅读助手，帮助读者深入理解当前正在阅读的文章。",
    "请基于提供的文章标题和正文内容来回答用户的问题。",
    "不要进行内部推理或思考过程，直接给出简洁答案。",
    "回答请使用中文，语气友好、简洁清晰，适合侧边栏紧凑空间展示。",
    "如果用户问题涉及文章内容，请优先从文章中提炼答案。",
    "如果涉及相关推荐，可以基于文章主题给出延伸阅读方向，标明这是建议而非站内链接。",
    articleTitle ? `\n当前文章标题：${articleTitle}` : "",
    articleContent
      ? `\n文章正文摘要：\n${articleContent.slice(0, 5000)}`
      : "\n（未提供文章内容，请基于标题回答）",
  ]
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
    const candidates = articleTitle ? [{ title: articleTitle, permalink: "" }] : [];
    return json(200, { answer, candidates });
  }

  // True progressive streaming via Node.js Readable stream
  const nodeReadable = new Readable({ read() {} });

  // Emit article metadata first so frontend can render source link immediately
  if (articleTitle) {
    nodeReadable.push(`data: ${JSON.stringify({ meta: { candidates: [{ title: articleTitle, permalink: "" }] } })}\n\n`);
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
