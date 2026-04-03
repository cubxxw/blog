"use strict";

const CORS_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(statusCode, payload) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(payload),
  };
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  if (!process.env.DASHSCOPE_API_KEY) {
    return json(500, { error: "Missing DASHSCOPE_API_KEY environment variable" });
  }

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

  if (!question) {
    return json(400, { error: "question is required" });
  }

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

  // 注入最近 10 条对话历史
  for (const msg of conversationHistory.slice(-10)) {
    if (msg.role && msg.content) {
      messages.push({ role: msg.role === "user" ? "user" : "assistant", content: msg.content });
    }
  }

  messages.push({ role: "user", content: question });

  let response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_completion_tokens: 600,
      }),
    });
  } catch (err) {
    return json(502, { error: "AI service unreachable: " + err.message });
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return json(502, { error: "Invalid response from AI service" });
  }

  if (!response.ok) {
    return json(response.status, { error: data?.error?.message || "AI API error" });
  }

  const answer = data?.choices?.[0]?.message?.content || "";
  return json(200, { answer });
};
