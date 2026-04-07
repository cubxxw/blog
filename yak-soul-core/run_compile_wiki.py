#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path('/home/smile/data/blog/yak-soul-core')
CLUSTERS = ROOT / 'state' / 'concept-clusters.json'
WIKI = ROOT / 'wiki'

RELATIONS = {
    'AI Native Workflow': ['独立开发方法论', '系统化思维的优势与盲区', '自我建模与 Another Self'],
    '独立开发方法论': ['AI Native Workflow', '意义、成长与创造', '系统化思维的优势与盲区'],
    '自我建模与 Another Self': ['真实 vs 表演', '自由 vs 秩序', '意义、成长与创造'],
    '真实 vs 表演': ['亲密关系中的边界', '自我建模与 Another Self'],
    '自由 vs 秩序': ['游牧生活系统', '系统化思维的优势与盲区', '意义、成长与创造'],
    '亲密关系中的边界': ['真实 vs 表演', '自我建模与 Another Self'],
    '游牧生活系统': ['自由 vs 秩序', '意义、成长与创造'],
    '意义、成长与创造': ['自我建模与 Another Self', '游牧生活系统', '独立开发方法论'],
    '系统化思维的优势与盲区': ['AI Native Workflow', '独立开发方法论', '自由 vs 秩序'],
    '中国与世界的观察框架': ['游牧生活系统', '意义、成长与创造'],
}

DEFS = {
    'AI Native Workflow': '把 AI 从聊天工具提升为工作流基础设施的长期思考主线，关注上下文、Agent、记忆、工具调用与系统设计。',
    '独立开发方法论': '围绕独立开发、创业验证、产品迭代与最小行动单元形成的方法论集合。',
    '自我建模与 Another Self': '围绕主体性、自我定义、身份建构与 Another Self 编译形成的核心元主题。',
    '真实 vs 表演': '对于求真、自我呈现、伪装、人设与社会化表演之间关系的长期张力。',
    '自由 vs 秩序': '对于自由、规则、结构、控制与边界之间平衡的长期冲突。',
    '亲密关系中的边界': '关于亲密、陪伴、边界、牺牲、依赖与孤独的持续性认知问题。',
    '游牧生活系统': '关于旅居、徒步、城市经验与移动性生活方式如何塑造认知与工作方式的主题。',
    '意义、成长与创造': '围绕人生意义、痛苦、幸福、创造、成长与存在感构成的核心生命主题。',
    '系统化思维的优势与盲区': '关于理性、结构化、模型化能力的优势，以及它对真实体验和情感理解造成盲区的反思。',
    '中国与世界的观察框架': '从中国出发观察美国、日本与更广阔世界，在文化、制度、文明与社会心理层面的长期比较框架。',
}


def load_clusters():
    return json.loads(CLUSTERS.read_text(encoding='utf-8'))


def slug(name: str) -> str:
    return ''.join(c if c.isalnum() or '\u4e00' <= c <= '\u9fff' else '-' for c in name).strip('-').lower()


def build_evolution(cluster: dict):
    buckets = {}
    for row in cluster.get('top_chunks', []):
        buckets.setdefault(row['month'], []).append(row)
    lines = []
    for month in sorted(buckets)[:8]:
        row = buckets[month][0]
        lines.append(f'- {month}: {row["title"]}')
    return lines


def write_page(title: str, kind: str, cluster: dict):
    directory = WIKI / ('concepts' if kind == 'concept' else 'tensions')
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f'{slug(title)}.md'

    lines = [f'# [[{title}]]', '']
    lines.append('## 定义')
    lines.append(DEFS.get(title, '待补充定义。'))
    lines.append('')

    lines.append('## 关键词')
    for kw in cluster.get('keywords', []):
        lines.append(f'- [[{kw}]]')
    lines.append('')

    lines.append('## 高价值来源块')
    for row in cluster.get('top_chunks', [])[:10]:
        lines.append(f"> [{row['month']} | chunk: {row['chunk_id']}] 思考源自 [[raw/monthly_notes/{row['source_file'][:-3]}]]")
        lines.append(f'- 标题：{row["title"]}')
        lines.append(f'- 摘录：{row["summary"]}')
        lines.append('')

    lines.append('## 时间演化线索')
    for item in build_evolution(cluster):
        lines.append(item)
    lines.append('')

    lines.append('## 演化摘要')
    if title == 'AI Native Workflow':
        lines.append('- 早期更关注 Agent OS、上下文协议与 AI 工具能力本身。')
        lines.append('- 中期开始转向工作流、记忆、第二大脑与本地优先系统。')
        lines.append('- 后期明显进入 OpenClaw / agent runtime / AI-native infra 的系统建构阶段。')
    elif title == '独立开发方法论':
        lines.append('- 早期强调 MVP、验证速度与国际化时机。')
        lines.append('- 中期逐步形成“场景验证 + 最小行动单元 + 快速迭代”的方法论。')
        lines.append('- 后期把产品、独立开发与个人工作流开始更深绑定。')
    elif title == '自我建模与 Another Self':
        lines.append('- 从“我是谁”的身份问题，逐步发展到主体性、自我叙事与 Another Self 编译。')
        lines.append('- 后期不再只是内省，而是开始把自我建模视为可工程化对象。')
    elif title == '游牧生活系统':
        lines.append('- 旅居最初是体验与观察来源。')
        lines.append('- 后面逐渐演化为情绪管理、工作方式与认知更新机制的一部分。')
    elif title == '意义、成长与创造':
        lines.append('- 贯穿始终，是所有主轴里最稳定的一条。')
        lines.append('- 后期越来越把意义感与创造、关系、痛苦处理方式绑定在一起。')
    elif title == '中国与世界的观察框架':
        lines.append('- 从零散文化观察逐渐发展为中美日比较框架。')
        lines.append('- 后期更明显地连接身份、文明、社会心理与制度理解。')
    elif title == '真实 vs 表演':
        lines.append('- 从个人表达与做自己，扩展到关系、社会角色、人设与国家叙事层面。')
        lines.append('- 后期这条张力越来越成为自我审视的重要轴线。')
    elif title == '自由 vs 秩序':
        lines.append('- 早期更多是抽象哲学问题。')
        lines.append('- 后期已经落到生活系统、规则边界、产品设计与人生结构选择。')
    elif title == '亲密关系中的边界':
        lines.append('- 从情绪和关系中的错位，逐步转向责任边界、陪伴方式与牺牲模式分析。')
    elif title == '系统化思维的优势与盲区':
        lines.append('- 从系统建模能力的自信，逐渐发展出对“体验被理性吞掉”的警惕。')
        lines.append('- 已经成为 Another Self 编译里最值得长期追踪的张力之一。')
    else:
        lines.append('- 待补充。')
    lines.append('')

    lines.append('## 相邻主题')
    for rel in RELATIONS.get(title, []):
        lines.append(f'- [[{rel}]]')
    lines.append('')

    if kind == 'tension':
        lines.append('## 认知演进')
        first = cluster.get('top_chunks', [None])[0]
        if first:
            lines.append(f'> ⚠️ 认知演进 (Cognitive Shift) [{first["month"]}]')
            lines.append('> - 原有范式：待进一步跨月份归纳')
            lines.append('> - 当前触动：当前主题在多个时间点反复以张力形式出现')
            lines.append('> - 演化动因：待补充')
            lines.append(f'> - 出处链接： [[raw/monthly_notes/{first["source_file"][:-3]}]]')
            lines.append('')

    lines.append('## 编译注记')
    lines.append(f'- cluster kind: {kind}')
    lines.append(f'- matched chunks: {cluster.get("count", 0)}')
    lines.append('- status: compiled-v2')
    lines.append('')

    path.write_text('\n'.join(lines), encoding='utf-8')


def main():
    clusters = load_clusters()
    for _, cluster in clusters.items():
        write_page(cluster['title'], cluster['kind'], cluster)
    print(f'compiled={len(clusters)}')


if __name__ == '__main__':
    main()
