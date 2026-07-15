// Image-generation backends for `scripts/generate-covers.mjs`.
//
// Each provider exports `generate({ prompt, aspect })` and resolves to a raw
// image Buffer. Adding a backend means adding one entry to PROVIDERS — the
// caller stays provider-agnostic.
//
// Credentials come from the environment, never from disk:
//   doubao → ARK_API_KEY     (Volcengine Ark console)
//   gemini → GEMINI_API_KEY  (Google AI Studio)

const ARK_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const ARK_MODEL = 'doubao-seedream-4-0-250828';

const GEMINI_MODEL = 'gemini-3-pro-image-preview';
const GEMINI_ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// Ark rejects ratio strings like "16:9" (HTTP 400 InvalidParameter) — `size`
// must be explicit WIDTHxHEIGHT, or one of '1k'/'2k'/'4k'. Pixel dimensions are
// used here so the aspect ratio is actually pinned rather than left to the
// model. Gemini's image-preview endpoint has no size knob at all, so its ratio
// has to travel in the prompt text.
const ASPECTS = {
  wide: { ark: '2048x1152', words: '16:9 landscape aspect ratio' },
  square: { ark: '1536x1536', words: '1:1 square aspect ratio' },
};

function requireEnv(name, provider) {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `${name} is not set — required by the "${provider}" provider.\n` +
        `  export ${name}="..."   (or add it to your shell profile)`,
    );
  }
  return v;
}

async function postJSON(url, { headers, body, timeoutMs = 180_000 }) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${new URL(url).host}: ${text.slice(0, 400)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from ${new URL(url).host}: ${text.slice(0, 200)}`);
  }
}

async function downloadImage(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`Failed to download generated image: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Volcengine Ark / Doubao Seedream 4.0. OpenAI-compatible shape.
// `watermark` defaults to false server-side, but a cover with a vendor mark
// baked in is unusable — so it is pinned explicitly rather than assumed.
// `seed` (optional) pins the noise for A/B-ing prompt changes; Gemini's
// endpoint has no equivalent, so it is a doubao-only knob.
async function generateDoubao({ prompt, aspect, seed }) {
  const key = requireEnv('ARK_API_KEY', 'doubao');
  const json = await postJSON(ARK_ENDPOINT, {
    headers: { Authorization: `Bearer ${key}` },
    body: {
      model: ARK_MODEL,
      prompt,
      size: ASPECTS[aspect].ark,
      response_format: 'url',
      watermark: false,
      ...(Number.isFinite(seed) ? { seed } : {}),
    },
  });
  const url = json?.data?.[0]?.url;
  if (!url) throw new Error(`Ark returned no image URL: ${JSON.stringify(json).slice(0, 300)}`);
  return downloadImage(url);
}

// Google Gemini. Returns image bytes inline as base64 rather than a URL.
async function generateGemini({ prompt, aspect }) {
  const key = requireEnv('GEMINI_API_KEY', 'gemini');
  const json = await postJSON(GEMINI_ENDPOINT(GEMINI_MODEL), {
    headers: { 'x-goog-api-key': key },
    body: {
      contents: [{ parts: [{ text: `${prompt}\n\nComposition: ${ASPECTS[aspect].words}.` }] }],
    },
  });
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  const inline = parts.find((p) => p.inlineData?.data)?.inlineData;
  if (!inline) {
    // A refusal or safety block comes back as prose in place of image bytes.
    const prose = parts.find((p) => p.text)?.text;
    throw new Error(
      prose
        ? `Gemini returned text instead of an image: ${prose.slice(0, 200)}`
        : `Gemini returned no image data: ${JSON.stringify(json).slice(0, 300)}`,
    );
  }
  return Buffer.from(inline.data, 'base64');
}

export const PROVIDERS = {
  doubao: { generate: generateDoubao, envKey: 'ARK_API_KEY', ext: 'jpeg' },
  gemini: { generate: generateGemini, envKey: 'GEMINI_API_KEY', ext: 'png' },
};

export const PROVIDER_NAMES = Object.keys(PROVIDERS);
