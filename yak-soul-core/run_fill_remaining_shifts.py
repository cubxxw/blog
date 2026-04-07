#!/usr/bin/env python3
"""为剩余 6 个核心主轴补充「深化认知演进」区块"""
from __future__ import annotations

from pathlib import Path

ROOT = Path('/home/smile/data/blog/yak-soul-core/wiki')

PATCHES = {
    ROOT / 'concepts' / 'ai-native-workflow.md': '''## 深化认知演进

> ⚠️ 认知演进 (Cognitive Shift) [2025-03 → 2026-03]
> - 原有范式：早期关注 Agent OS、上下文协议、AI 工具能力本身，把 AI 视为需要被"调用"的外部服务。
> - 当前触动：后期开始把 AI 视为工作流基础设施的一部分，关注点从"如何用 AI"转向"如何让 AI 自然融入日常"。
> - 演化动因：随着 OpenClaw、Claude Code、Cursor 等工具的深度使用，越来越意识到上下文管理、记忆系统、工具调用链才是核心瓶颈。
> - 出处链接： [[raw/monthly_notes/2025-03-thought-notes]] / [[raw/monthly_notes/2026-03-thought-notes]]

- 关键变化是从"AI 作为工具"到"AI 作为环境"的转变。
- 这条主轴和独立开发方法论、系统化思维、自我建模高度耦合。
''',
    ROOT / 'concepts' / '中国与世界的观察框架.md': '''## 深化认知演进

> ⚠️ 认知演进 (Cognitive Shift) [2025-04 → 2026-03]
> - 原有范式：早期更多是零散的文化观察和中美日对比，偏向现象描述和表层分析。
> - 当前触动：后期开始形成系统的文明比较框架，把文化差异理解为制度、社会心理、历史记忆共同作用的结果。
> - 演化动因：旅居日本、拉萨等地的一手经验，加上对心理学、社会学理论的深入阅读，使观察从游客视角转向结构性理解。
> - 出处链接： [[raw/monthly_notes/2025-04-thought-notes]] / [[raw/monthly_notes/2026-03-thought-notes]]

- 后期不再满足于"哪个更好"的价值判断，而是追问"为什么会这样"的生成机制。
- 这条主轴和游牧生活系统、真实 vs 表演直接相连。
''',
    ROOT / 'concepts' / '意义 - 成长与创造.md': '''## 深化认知演进

> ⚠️ 认知演进 (Cognitive Shift) [2025-03 → 2026-03]
> - 原有范式：早期更多是在追问"意义是什么"，把意义视为需要被发现的对象。
> - 当前触动：后期开始把意义理解为被创造、被叙述、被时间性缝合的产物。
> - 演化动因：对叙事驱动、信仰机制、创造者视角的反思，使意义问题从哲学追问转为生命实践。
> - 出处链接： [[raw/monthly_notes/2025-03-thought-notes]] / [[raw/monthly_notes/2026-03-thought-notes]]

- 关键转变是从"寻找意义"到"创造意义"，从"被痛苦定义"到"赋予痛苦意义"。
- 这条主轴贯穿所有其他主题，是最稳定的认知基线。
''',
    ROOT / 'concepts' / '游牧生活系统.md': '''## 深化认知演进

> ⚠️ 认知演进 (Cognitive Shift) [2025-05 → 2026-03]
> - 原有范式：早期把旅居视为体验来源、灵感获取方式，带有某种浪漫化想象。
> - 当前触动：后期意识到"移动"本身成为一种情绪管理工具，但也发现地点切换并不自动带来内在改变。
> - 演化动因：从尼泊尔到清迈、大理、日本、拉萨的连续旅居经验，使对移动的理解从"逃离"转向"主动设计"。
> - 出处链接： [[raw/monthly_notes/2025-05-thought-notes]] / [[raw/monthly_notes/2026-03-thought-notes]]

- 后期不再把旅居视为答案本身，而是视为一种可被设计的生活实验方式。
- 这条主轴和自由 vs 秩序、意义成长创造深度绑定。
''',
    ROOT / 'concepts' / '独立开发方法论.md': '''## 深化认知演进

> ⚠️ 认知演进 (Cognitive Shift) [2025-03 → 2026-02]
> - 原有范式：早期强调 MVP、验证速度、技术栈选择，偏向战术层面的方法论。
> - 当前触动：后期开始把独立开发理解为意义生产、自我塑形的方式，而不仅仅是商业动作。
> - 演化动因：随着产品实践增多，越来越意识到"为什么做"比"怎么做"更关键，开发方法论开始与人生意义问题交汇。
> - 出处链接： [[raw/monthly_notes/2025-03-thought-notes]] / [[raw/monthly_notes/2026-02-thought-notes]]

- 关键变化是从"如何做出好产品"到"为什么要做这个产品"的追问。
- 这条主轴和 AI Native Workflow、意义成长创造形成稳定三角。
''',
    ROOT / 'tensions' / '亲密关系中的边界.md': '''## 深化认知演进

> ⚠️ 认知演进 (Cognitive Shift) [2025-09 → 2026-02]
> - 原有范式：早期更多是在关系中寻找边界，把边界视为保护自我的防御机制。
> - 当前触动：后期开始意识到边界不是固定线条，而是动态协商的结果；爱可以独立于关系存在。
> - 演化动因：对牺牲式养育、病理性关系、社会交换理论的反思，使边界问题从"如何守住"转向"如何弹性处理"。
> - 出处链接： [[raw/monthly_notes/2025-09-thought-notes]] / [[raw/monthly_notes/2026-02-thought-notes]]

- 后期不再把边界视为非黑即白的规则，而是理解为关系中的动态平衡艺术。
- 这条张力和真实 vs 表演、自我建模直接相连。
''',
}


def main():
    filled = 0
    for path, block in PATCHES.items():
        if not path.exists():
            print(f'[skip] {path.name} not found')
            continue
        text = path.read_text(encoding='utf-8')
        if '## 深化认知演进' in text:
            print(f'[skip] {path.name} already has 深化认知演进')
            continue
        
        # Find insertion point: before "## 编译注记" or at end
        marker = '## 编译注记'
        idx = text.find(marker)
        if idx == -1:
            text = text.rstrip() + '\n\n' + block + '\n'
        else:
            text = text[:idx] + block + '\n' + text[idx:]
        
        path.write_text(text, encoding='utf-8')
        print(f'[filled] {path.name}')
        filled += 1
    
    print(f'\nTotal filled: {filled}/6')


if __name__ == '__main__':
    main()
