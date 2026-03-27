"use strict";

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

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function normalizeLanguage(language) {
  const value = String(language || "").toLowerCase();
  if (value.startsWith("zh")) return "zh";
  return "en";
}

function normalizeTopic(topic) {
  const value = String(topic || "").toLowerCase();
  const allowed = new Set(["general", "technology", "growth", "travel"]);
  return allowed.has(value) ? value : "general";
}

function buildTags(language, topic, sourceType) {
  return [
    "blog",
    `lang:${language}`,
    `topic:${topic}`,
    `source:${String(sourceType || "page").toLowerCase()}`,
  ];
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

  if (!process.env.BUTTONDOWN_API_KEY) {
    return json(500, { error: "Missing BUTTONDOWN_API_KEY environment variable" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const email = String(payload.email || "").trim().toLowerCase();
  const language = normalizeLanguage(payload.language);
  const topic = normalizeTopic(payload.topic);
  const sourcePath = String(payload.sourcePath || "").trim().slice(0, 200);
  const sourceType = String(payload.sourceType || "page").trim().slice(0, 50);
  const honeypot = String(payload.company || "").trim();

  if (honeypot) {
    return json(200, { ok: true, message: "Accepted" });
  }

  if (!isValidEmail(email)) {
    return json(400, { error: language === "zh" ? "请输入有效邮箱。" : "Please enter a valid email address." });
  }

  const forwardedFor = event.headers["x-forwarded-for"] || event.headers["X-Forwarded-For"] || "";
  const ipAddress = String(forwardedFor).split(",")[0].trim() || null;
  const tags = buildTags(language, topic, sourceType);

  const metadata = {
    source_path: sourcePath,
    source_type: sourceType,
    preferred_language: language,
    preferred_topic: topic,
    subscribed_at: new Date().toISOString(),
  };

  let response;
  let responseBody;
  try {
    response = await fetch("https://api.buttondown.com/v1/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.BUTTONDOWN_API_KEY}`,
        "Content-Type": "application/json",
        "X-Buttondown-Collision-Behavior": "add",
      },
      body: JSON.stringify({
        email_address: email,
        ip_address: ipAddress,
        tags,
        metadata,
      }),
    });
    responseBody = await response.json().catch(() => ({}));
  } catch (error) {
    return json(502, {
      error: language === "zh" ? "无法连接到订阅服务，请稍后重试。" : "Unable to reach the subscription provider. Please try again later.",
      detail: error.message,
    });
  }

  if (response.ok) {
    return json(200, {
      ok: true,
      message: language === "zh" ? "提交成功，请去邮箱完成确认。" : "Success. Please check your inbox to confirm.",
      provider: "buttondown",
      subscriberId: responseBody.id || null,
    });
  }

  if (response.status === 409) {
    return json(409, {
      error: language === "zh" ? "这个邮箱已经订阅过，或正在等待确认。" : "This address is already subscribed or pending confirmation.",
      provider: "buttondown",
    });
  }

  if (response.status === 429) {
    return json(429, {
      error: language === "zh" ? "订阅请求过于频繁，请稍后再试。" : "Too many subscription attempts. Please try again later.",
      provider: "buttondown",
    });
  }

  return json(400, {
    error: responseBody.detail || responseBody.error || (language === "zh" ? "订阅失败，请稍后重试。" : "Subscription failed. Please try again later."),
    provider: "buttondown",
  });
};
