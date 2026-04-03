"use strict";

const fs = require("node:fs");
const path = require("node:path");

const indexPath = path.join(__dirname, "_generated", "content-index.json");
let cachedIndex = null;

function loadIndex() {
  if (cachedIndex) {
    return cachedIndex;
  }

  cachedIndex = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  return cachedIndex;
}

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
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
    [
      doc.title,
      doc.relativePath,
      doc.section,
      doc.tags.join(" "),
      doc.categories.join(" "),
      doc.headings.join(" "),
      doc.excerpt,
    ].join(" ")
  );

  let score = 0;
  for (const token of questionTokens) {
    if (haystack.includes(token)) {
      score += token.length > 4 ? 6 : 3;
    }
  }

  if (requestedLanguage && doc.language === requestedLanguage) {
    score += 4;
  }

  if (questionTokens.some((token) => doc.relativePath.toLowerCase().includes(token))) {
    score += 5;
  }

  return score;
}

function summarizeTree(node, depth = 0, lines = []) {
  if (depth > 3) {
    return lines;
  }

  if (depth > 0) {
    lines.push(`${"  ".repeat(depth - 1)}- ${node.name} (${node.count})`);
  }

  for (const child of node.children || []) {
    summarizeTree(child, depth + 1, lines);
  }

  return lines;
}

function buildContext(index, question, requestedLanguage) {
  const questionTokens = tokenize(question);
  const ranked = index.documents
    .map((doc) => ({
      doc,
      score: scoreDocument(doc, questionTokens, requestedLanguage),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((item) => item.doc);

  const fallback = ranked.length
    ? ranked
    : index.documents
        .filter((doc) => !requestedLanguage || doc.language === requestedLanguage)
        .slice(0, 6);

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

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  if (!process.env.DASHSCOPE_API_KEY) {
    return json(500, {
      error: "Missing DASHSCOPE_API_KEY environment variable",
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const question = String(payload.question || "").trim();
  const language = String(payload.language || "").trim();
  const conversationHistory = payload.context || []; // Conversation history context
  const searchContext = payload.searchContext || []; // Search results context

  if (!question) {
    return json(400, { error: "Question is required" });
  }

  const index = loadIndex();
  const docContext = buildContext(index, question, language);
  const model = process.env.DASHSCOPE_MODEL || "qwen3.6-plus";
  const baseUrl = process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";

  const systemPrompt = [
    "You are an assistant for a Hugo blog.",
    "Use the provided directory summary and candidate documents to answer questions about site structure and article content.",
    "When the user intent is unclear or the available context is insufficient, ask 1 to 3 concise clarification questions before giving a final recommendation.",
    "Prefer the user's language. If the user writes Chinese, answer in Chinese. If the user writes English, answer in English.",
    "Do not invent files or directories that are not present in the provided context.",
    "When useful, cite candidate documents by title and permalink.",
    "If conversation history is provided, use it to maintain context and provide more personalized responses.",
    "For follow-up questions, consider them in the context of the conversation history and provide coherent, connected responses.",
  ].join(" ");

  // Build messages array with conversation history if available
  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },
  ];

  // Add conversation history (context) if provided
  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    // Limit context to last 10 messages to avoid token overflow
    const limitedContext = conversationHistory.slice(-10);
    for (const msg of limitedContext) {
      if (msg.role && msg.content) {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        });
      }
    }
  }

  // Add current question with search context
  const searchContextStr = searchContext.length > 0
    ? `\n\nSearch results context:\n${JSON.stringify(searchContext, null, 2)}`
    : '';

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
        max_completion_tokens: 900,
      }),
    });
  } catch (error) {
    return json(502, {
      error: "Failed to reach Qwen API",
      detail: error.message,
    });
  }

  const responseJson = await response.json();
  if (!response.ok) {
    const errorMsg = responseJson.error?.message || responseJson.error || "Qwen API returned an error";
    return json(response.status, {
      error: errorMsg,
      detail: responseJson,
    });
  }

  const answer = responseJson.choices?.[0]?.message?.content || "";
  return json(200, {
    answer,
    model,
    candidates: docContext.candidates,
    generatedAt: index.generatedAt,
  });
};
