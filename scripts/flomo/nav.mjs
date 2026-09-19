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
