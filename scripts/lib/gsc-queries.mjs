// Transparent, rule-based query labeling for the deterministic GSC report.
//
// Labels describe observable query strings only. They are heuristics, not
// certainty and not quality judgments, and they never assign landing pages —
// only the real page dimension carries landing-page evidence. The rules are
// ordered; the first matching rule wins:
//
//   1. site-maintenance               query starts with the `site:` operator
//   2. brand                          query contains a known brand token
//   3. ambiguous-anomalous-heuristic  URL-like text, repeated tokens (>=3x),
//                                     >12 tokens, >100 chars, or control chars
//   4. nonbrand                       everything else
//
// Rules and tokens are exported so the report can publish them verbatim.

export const QUERY_LABELS = ['site-maintenance', 'brand', 'ambiguous-anomalous-heuristic', 'nonbrand'];

export const BRAND_TOKENS = ['cubxxw', 'nsddd', 'bear os', 'xinwei xiong'];

export const QUERY_LABEL_RULES = {
  order: QUERY_LABELS,
  'site-maintenance': 'query starts with the `site:` operator (index/site maintenance lookups)',
  brand: `query contains a brand token (case-insensitive substring): ${BRAND_TOKENS.map((t) => JSON.stringify(t)).join(', ')}`,
  'ambiguous-anomalous-heuristic':
    'transparent anomaly heuristics: URL-like text (http(s):// or www.), a token repeated 3+ times, more than 12 tokens, more than 100 characters, or control characters — a flag for review, not a judgment of intent or quality',
  nonbrand: 'no earlier rule matched',
  caveat: 'Labels describe the query string only. Landing pages are never inferred; query×page evidence exists only where the real page dimension was returned.',
};

export function classifyQuery(query) {
  const raw = String(query ?? '');
  const q = raw.trim().toLowerCase();
  if (!q) return 'ambiguous-anomalous-heuristic';
  if (/^\s*site:/.test(q)) return 'site-maintenance';
  if (BRAND_TOKENS.some((t) => q.includes(t))) return 'brand';
  const tokens = q.split(/\s+/).filter(Boolean);
  const counts = new Map();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  const repeated = [...counts.values()].some((n) => n >= 3);
  if (/https?:\/\/|www\./.test(q)) return 'ambiguous-anomalous-heuristic';
  if (repeated) return 'ambiguous-anomalous-heuristic';
  if (tokens.length > 12) return 'ambiguous-anomalous-heuristic';
  if (raw.length > 100) return 'ambiguous-anomalous-heuristic';
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(raw)) return 'ambiguous-anomalous-heuristic';
  return 'nonbrand';
}
