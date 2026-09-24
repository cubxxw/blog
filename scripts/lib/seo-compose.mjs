// Trusted daily-issue section composition (issue #392 / batch B2).
//
// The publisher composes the deterministic evidence FIRST and always: the
// optional model paragraph is appended as a clearly-labelled, untrusted addn
// and never replaces metrics, status, markers or gate decisions. Model text is
// withheld entirely when the interpretation failed, and when present is
// published ONLY as a fenced literal block — a valid <=600-char explanation
// containing Markdown headings/links/images or raw HTML stays inert plain text.
// A minimal trusted failure section is always composable so a failed generation
// still publishes an honest status instead of leaving stale content in place.
// Raw GSC query strings never enter any published section.

import { EXPLANATION_MAX_CHARS, defangMarkers } from './seo-model-output.mjs';

export const SECTION_TITLES = {
  seo: '### 🔍 SEO',
  // Neutral heading: no emoji icon for the proposal section.
  autofix: '### SEO 提案',
};

const SECTION_MAX_CHARS = 20000;

function bound(text) {
  const t = String(text ?? '');
  return t.length > SECTION_MAX_CHARS ? `${t.slice(0, SECTION_MAX_CHARS)}\n…（截断）` : t;
}

// Safe LITERAL publication of optional model text: a fenced block whose fence
// is longer than any backtick run in the text renders the paragraph as plain
// text — no Markdown heading/link/image, no raw HTML — while the deterministic
// report Markdown above keeps its real formatting. Markers are defanged first
// as defense in depth. The fence is computed from the text, so a payload with
// ``` cannot close it early.
export function fencedLiteral(text) {
  const body = defangMarkers(String(text ?? ''));
  let maxRun = 0;
  for (const m of body.matchAll(/`+/g)) maxRun = Math.max(maxRun, m[0].length);
  const fence = '`'.repeat(Math.max(3, maxRun + 1));
  return `${fence}\n${body}\n${fence}`;
}

// The trusted boundary re-validates the optional input before publication:
// only a bounded, non-blank string is ever published (and then only literally).
export function publishableExplanation(text) {
  return typeof text === 'string' && text.trim() !== '' && text.length <= EXPLANATION_MAX_CHARS ? text : null;
}

function stageLines(status) {
  const lines = [];
  for (const s of status?.stages ?? []) {
    const bits = [`${s.stage}: ${s.status}`];
    if (s.outcome) bits.push(`outcome=${s.outcome}`);
    if (s.generated !== null && s.generated !== undefined) bits.push(`generated=${s.generated}`);
    if (s.evidence) bits.push(`evidence=${s.evidence}`);
    lines.push(`- ${bits.join(' · ')}${s.required ? '' : ' （可选）'}`);
  }
  return lines;
}

// Deterministic evidence + honest stage status + optional interpretation.
export function composeSeoSection({ report, interpretation = null, status = null, runDate, asOf }) {
  const lines = [SECTION_TITLES.seo, ''];
  lines.push(`报告日期（UTC 身份）: ${runDate} · 证据截止 as-of ${asOf}`);
  lines.push('');
  if (report?.markdown) {
    lines.push(report.markdown);
  } else {
    lines.push('#### 确定性证据：生成失败');
    lines.push('');
    lines.push('报告生成失败或产物无效；已保留的部分证据不代表报告已生成。');
  }
  if (status) {
    lines.push('');
    lines.push('#### 阶段状态（可信代码记录）');
    lines.push('');
    lines.push(...stageLines(status));
    if (status.optional) {
      lines.push(`- 可选模型解读: ${status.optional.interpretation}（失败从不称为成功解读）`);
    }
  }
  if (interpretation) {
    lines.push('');
    const text = interpretation.status === 'ok' ? publishableExplanation(interpretation.interpretation?.text) : null;
    if (text !== null) {
      lines.push('#### 🤖 可选解读（模型生成、未验证、非数字来源；原文以字面量发布）');
      lines.push('');
      lines.push(fencedLiteral(text));
    } else {
      lines.push('#### 🤖 可选解读：失败（文本 withheld）');
      lines.push('');
      lines.push(`解读状态: failed · errorClass=${defangMarkers(interpretation.diagnostics?.errorClass ?? 'unknown')}；模型文本不发声明、不进入任何数字或状态。`);
      for (const r of (interpretation.interpretation?.reasons ?? []).slice(0, 4)) {
        lines.push(`- ${defangMarkers(r)}`);
      }
    }
  }
  return bound(lines.join('\n'));
}

// Proposal-only autofix section from a seo-autofix-gate/1 decision. Public
// safe: candidates carry kind/target/files/summary only — gate evidence
// (including raw query strings) stays in the machine artifact. Candidate
// summaries are untrusted bounded text and are published literally too.
export function composeAutofixSection({ gate, runDate, decisionAt }) {
  const lines = [SECTION_TITLES.autofix, ''];
  lines.push(`报告日期（UTC）: ${runDate} · 决策时刻 ${decisionAt}`);
  lines.push('');
  lines.push('模式: **proposal-only**；apply 未开放（待独立授权的未来实现）。本小节不建分支、不开 PR、不改内容。');
  lines.push('');

  const review = gate?.reviewState ?? {};
  lines.push(`评审状态: ${review.ok ? 'ok' : `not usable (${defangMarkers(review.status ?? 'unknown')})`}· backlog=${review.backlog?.relevantOpenCount ?? 'unknown'}`);
  lines.push('');
  const candidates = gate?.candidates ?? [];
  lines.push(`#### 候选提案（${candidates.length}）`);
  lines.push('');
  if (candidates.length === 0) {
    lines.push('- 无高置信候选，安全跳过（这不是失败）。');
  }
  for (const c of candidates.slice(0, 5)) {
    const files = (c.proposal?.files ?? []).join(', ');
    const summary = publishableExplanation(c.proposal?.summary ?? '') ?? '(无摘要)';
    lines.push(`- **[${defangMarkers(c.kind)}]** ${defangMarkers(c.targetUrl)} → \`${defangMarkers(files)}\``);
    // The summary is untrusted bounded text: published as a TOP-LEVEL literal
    // fence (a fence nested in a list would swallow the following structure).
    lines.push('');
    lines.push(fencedLiteral(summary));
    lines.push('');
  }
  const skipped = gate?.skipped ?? [];
  if (skipped.length > 0) {
    lines.push('');
    lines.push(`#### 安全跳过（${skipped.length}）`);
    lines.push('');
    for (const s of skipped.slice(0, 8)) {
      const reason = (s.reasons ?? []).slice(0, 2).join('; ');
      lines.push(`- ${defangMarkers(s.kind)} ${defangMarkers(s.targetUrl)} — ${defangMarkers(reason)}`);
    }
  }
  lines.push('');
  lines.push(`预算: ${gate?.budget?.used ?? 0}/${gate?.budget?.maxCandidates ?? '?'} · 低 CTR 单独出现从不授权文案修改 · 候选仅绑定可信页面映射的单一源文件`);
  return bound(lines.join('\n'));
}

// Minimal trusted failure section: always publishable when generation fails,
// so the daily issue shows the failed state instead of stale content.
export function composeFailureSection({ kind = 'seo', runDate, reasons = [], status = null }) {
  const lines = [SECTION_TITLES[kind] ?? SECTION_TITLES.seo, ''];
  lines.push(`报告日期（UTC）: ${runDate}`);
  lines.push('');
  lines.push('状态: **failed**（可信代码记录；已存部分产物保留，不代表成功）');
  for (const r of reasons.slice(0, 8)) lines.push(`- ${defangMarkers(r)}`);
  if (status) {
    lines.push('');
    lines.push(...stageLines(status));
  }
  return bound(lines.join('\n'));
}
