#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path('/home/smile/data/blog/yak-soul-core/wiki')

BACKLINKS = {
    'AI Native Workflow': ['独立开发方法论', '系统化思维的优势与盲区', '自我建模与 Another Self'],
    '独立开发方法论': ['AI Native Workflow', '意义、成长与创造', '系统化思维的优势与盲区'],
    '自我建模与 Another Self': ['真实 vs 表演', '自由 vs 秩序', '意义、成长与创造'],
    '游牧生活系统': ['自由 vs 秩序', '中国与世界的观察框架', '意义、成长与创造'],
    '意义、成长与创造': ['自我建模与 Another Self', '游牧生活系统', '独立开发方法论'],
    '中国与世界的观察框架': ['游牧生活系统', '真实 vs 表演'],
    '真实 vs 表演': ['亲密关系中的边界', '自我建模与 Another Self'],
    '自由 vs 秩序': ['游牧生活系统', '系统化思维的优势与盲区'],
    '亲密关系中的边界': ['真实 vs 表演', '自我建模与 Another Self'],
    '系统化思维的优势与盲区': ['AI Native Workflow', '自由 vs 秩序', '独立开发方法论'],
}

FILE_MAP = {
    'AI Native Workflow': ROOT / 'concepts' / 'ai-native-workflow.md',
    '独立开发方法论': ROOT / 'concepts' / '独立开发方法论.md',
    '自我建模与 Another Self': ROOT / 'concepts' / '自我建模与-another-self.md',
    '游牧生活系统': ROOT / 'concepts' / '游牧生活系统.md',
    '意义、成长与创造': ROOT / 'concepts' / '意义-成长与创造.md',
    '中国与世界的观察框架': ROOT / 'concepts' / '中国与世界的观察框架.md',
    '真实 vs 表演': ROOT / 'tensions' / '真实-vs-表演.md',
    '自由 vs 秩序': ROOT / 'tensions' / '自由-vs-秩序.md',
    '亲密关系中的边界': ROOT / 'tensions' / '亲密关系中的边界.md',
    '系统化思维的优势与盲区': ROOT / 'tensions' / '系统化思维的优势与盲区.md',
}

LINK_NOTES = {
    ('AI Native Workflow', '独立开发方法论'): 'AI 不只是工具，而是独立开发方法论正在重写的执行层。',
    ('AI Native Workflow', '系统化思维的优势与盲区'): '越依赖系统化 AI 工作流，越需要警惕把体验压扁成流程。',
    ('AI Native Workflow', '自我建模与 Another Self'): 'Another Self 的工程化离不开 AI-native infra。',
    ('独立开发方法论', '意义、成长与创造'): '独立开发不只是商业动作，也是意义生产与自我塑形方式。',
    ('自我建模与 Another Self', '真实 vs 表演'): '自我建模必须回答：哪些是自我，哪些是社会表演。',
    ('自我建模与 Another Self', '自由 vs 秩序'): '主体性的形成，始终卡在自由与结构之间。',
    ('游牧生活系统', '中国与世界的观察框架'): '移动生活让观察框架从抽象判断变成一手经验。',
    ('游牧生活系统', '自由 vs 秩序'): '旅居既是自由实验，也是对秩序需求的反向验证。',
    ('真实 vs 表演', '亲密关系中的边界'): '很多关系问题本质上是“真实需求”和“关系表演”错位。',
    ('系统化思维的优势与盲区', '自由 vs 秩序'): '系统化能力会天然偏向秩序，但人始终想保留自由。',
}


def patch_file(path: Path, title: str):
    text = path.read_text(encoding='utf-8')
    lines = text.splitlines()
    section = ['## 网络链接注记', '']
    for other in BACKLINKS.get(title, []):
        note = LINK_NOTES.get((title, other)) or LINK_NOTES.get((other, title)) or '与该主题存在稳定的结构性关联。'
        section.append(f'- [[{other}]]：{note}')
    section.append('')

    if '## 网络链接注记' in text:
        return

    insert_at = len(lines)
    for i, line in enumerate(lines):
        if line.strip() == '## 编译注记':
            insert_at = i
            break
    new_lines = lines[:insert_at] + section + lines[insert_at:]
    path.write_text('\n'.join(new_lines), encoding='utf-8')


def main():
    for title, path in FILE_MAP.items():
        if path.exists():
            patch_file(path, title)
    print('linked_core_pages=10')


if __name__ == '__main__':
    main()
