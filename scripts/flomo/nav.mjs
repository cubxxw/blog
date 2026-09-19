#!/usr/bin/env node
/**
 * 月度笔记开头的「大类导航」，中英文共用一套锚点规则。
 *
 * 锚点必须和 Hugo/Goldmark 自动生成的 id 完全一致，否则目录点了不动：
 * 小写 → 空格换成 `-` → 去掉所有非字母/数字/连字符的符号（中文保留）。
 * 例：`## 一、AI 与 Agent 系统` → `#一ai-与-agent-系统`
 */

/** 九个方向的英文名，中文标题 → 英文标题。 */
export const SECTION_EN = {
  'AI 与 Agent 系统': 'AI and Agent Systems',
  '产品、工程与开源': 'Product, Engineering and Open Source',
  '商业、投资与职业': 'Business, Investing and Career',
  '自我认知与心理': 'Self-Knowledge and Psychology',
  '阅读、思想与历史': 'Reading, Ideas and History',
  '旅行、地理与城市': 'Travel, Places and Cities',
  '身体、健康与日常': 'Body, Health and Daily Life',
  '内容、创作与记录': 'Content, Craft and Recording',
  '日常与其他': 'Daily Notes and Everything Else',
};

export const enSectionName = (zhName) => SECTION_EN[zhName.replace(/^[一二三四五六七八九十]+、/, '')] ?? zhName;

/**
 * 把 memo 正文里自带的 Markdown 标题降两级。
 * flomo 里有些笔记本身就是一份小文档（个人档案、价格表），正文里带 `## 基本信息`
 * 这种标题；原样放进归档，会被当成「归档章节」，导航和 TOC 就全乱了。
 * 代码块里的 `#` 是注释，不动。
 */
export function demoteHeadings(text) {
  let inFence = false;
  return text
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      const m = line.match(/^(#{1,6})(\s+.*)$/);
      if (!m) return line;
      const level = Math.min(6, m[1].length + 2);
      return `${'#'.repeat(level)}${m[2]}`;
    })
    .join('\n');
}

/**
 * 去掉 flomo 站内私有链接（`v.flomoapp.com/mine/?memo_id=...`）。
 * 这类链接指向作者自己的笔记，对外既点不动也没有意义，还会泄露内部 ID。
 * 公开的产品文档链接（help.flomoapp.com）保留。
 */
export function stripPrivateLinks(text) {
  return text
    .replace(/\s*https?:\/\/v\.flomoapp\.com\/\S+/g, '')
    .replace(/^Linked from:\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * 把一条 memo 的正文整理成适合放进归档的样子：
 * 去私有链接 → 标题降级 → 正文自带的 `---` 换成 `***`（同样渲染成分隔线，
 * 但不会把上一行读成 setext 标题）→ 压缩多余空行。
 */
export function normalizeBody(text) {
  const lines = stripPrivateLinks(text).split('\n');
  let inFence = false;
  const out = [];
  for (const line of demoteHeadings(lines.join('\n')).split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (!inFence && /^\s*-{3,}\s*$/.test(line)) {
      out.push('***');
      continue;
    }
    out.push(line);
  }
  return out.join('\n').replace(/(\n\*\*\*)+/g, '\n\n***').replace(/\n{3,}/g, '\n\n').trim();
}

export const anchorOf = (heading) =>
  heading
    .toLowerCase()
    .replace(/\s/g, '-')
    .replace(/[^\p{Letter}\p{Number}-]/gu, '');

/** 把一个 `## 标题` 行变成 [标题, 锚点]。 */
export const headingAnchor = (line) => {
  const text = line.replace(/^#+\s*/, '').trim();
  return [text, anchorOf(text)];
};

/**
 * zh 侧导航。
 * @param {{counts: Array<{name: string, heading: string, count: number}>, total: number, extras?: Array<{label: string, heading: string, count?: number}>}} spec
 */
export function renderZhNav({ counts, total, extras = [], essaySections = 0 }) {
  const lines = ['## 本月导航', ''];
  if (essaySections) {
    lines.push(`**先读长文**：本篇正文 ${essaySections} 节。`, '');
  }
  if (extras.length) {
    lines.push(
      `**精选**：${extras.map((e) => `[${e.label}](#${anchorOf(e.heading)})${e.count ? ` · ${e.count} 条` : ''}`).join(' · ')}`,
      '',
    );
  }
  const noun = essaySections ? '原始记录' : '记录';
  lines.push(`**本月 ${total} 条${noun}，按 ${counts.length} 个大方向归档：**`, '');
  for (const c of counts) lines.push(`- [${c.name}](#${anchorOf(c.heading)}) · ${c.count} 条`);
  lines.push('', '---', '');
  return lines.join('\n');
}

/** en 侧导航，结构跟中文一一对应。 */
export function renderEnNav({ counts, total, extras = [], essaySections = 0 }) {
  const lines = ['## Quick Navigation', ''];
  if (essaySections) {
    lines.push(`**Start with the long read**: ${essaySections} sections in the body above.`, '');
  }
  if (extras.length) {
    lines.push(
      `**Selected**: ${extras.map((e) => `[${e.label}](#${anchorOf(e.heading)})${e.count ? ` · ${e.count} entries` : ''}`).join(' · ')}`,
      '',
    );
  }
  const noun = essaySections ? 'archived notes' : 'records';
  lines.push(`**${total} ${noun} this month, filed under ${counts.length} themes:**`, '');
  for (const c of counts) lines.push(`- [${c.name}](#${anchorOf(c.heading)}) · ${c.count}`);
  lines.push('', '---', '');
  return lines.join('\n');
}
