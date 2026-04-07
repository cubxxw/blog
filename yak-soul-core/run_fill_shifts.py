#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path('/home/smile/data/blog/yak-soul-core/wiki')

PATCHES = {
    ROOT / 'concepts' / '自我建模与-another-self.md': '''## 深化认知演进

> ⚠️ 认知演进 (Cognitive Shift) [2025-10 → 2026-03]
> - 原有范式：早期更像“身份问题”的追问，核心是“我是谁”“我该如何理解自己”，并借助文化、社会与人格视角寻找解释。
> - 当前触动：后期开始把“自我”从被发现的对象，转成可以被构建、被编译、被持续校准的系统。
> - 演化动因：一方面是 AI、主体性与知识工程视角不断进入；另一方面是旅居、关系、职业身份松动之后，旧的人设解释力不足。
> - 出处链接： [[raw/monthly_notes/2025-10-thought-notes]] / [[raw/monthly_notes/2026-03-thought-notes]]

- 关键变化不只是“更了解自己”，而是开始把自我视作一个可被设计、可被维护、可被版本化更新的对象。
- 这使得 Another Self 不再是抽象幻想，而变成了一个明确的工程方向。
''',
    ROOT / 'tensions' / '真实-vs-表演.md': '''## 深化认知演进

> ⚠️ 认知演进 (Cognitive Shift) [2025-06 → 2026-02]
> - 原有范式：早期更多是在“做自己”与“扮演人设”之间做价值判断，倾向于把真实视为更高的状态。
> - 当前触动：后期开始意识到表演并不只是虚伪，而是社会协作、自我保护、关系维系中的结构性机制。
> - 演化动因：对亲密关系、社会互动、国家叙事与自我保护机制的观察增多，使“真实 vs 表演”从道德判断升级为结构性张力。
> - 出处链接： [[raw/monthly_notes/2025-06-thought-notes]] / [[raw/monthly_notes/2026-02-thought-notes]]

- 后期的成熟，不在于彻底拒绝表演，而在于识别：哪些表演是在消耗自我，哪些表演是关系运行的必要界面。
- 这一主轴和亲密关系、主体性、自我边界直接相连。
''',
    ROOT / 'tensions' / '自由-vs-秩序.md': '''## 深化认知演进

> ⚠️ 认知演进 (Cognitive Shift) [2025-11 → 2026-03]
> - 原有范式：早期更偏抽象哲学与价值判断，把自由与秩序理解为两个互相牵制的原则。
> - 当前触动：后期开始在 AI agent、工作流、旅居生活、规则边界中反复遭遇这一冲突，自由与秩序不再只是理念，而是设计问题。
> - 演化动因：随着系统能力增强、人生结构变复杂，越来越需要秩序；但与此同时，对主体性、流动性与创造自由的执念并没有减弱。
> - 出处链接： [[raw/monthly_notes/2025-11-thought-notes]] / [[raw/monthly_notes/2026-03-thought-notes]]

- 这条张力的核心不是二选一，而是寻找一种“高自由但不失控，高秩序但不窒息”的结构。
- 它同时支配你的产品设计、工作方式与生活方式选择。
''',
    ROOT / 'tensions' / '系统化思维的优势与盲区.md': '''## 深化认知演进

> ⚠️ 认知演进 (Cognitive Shift) [2025-08 → 2026-02]
> - 原有范式：系统化思维最初被视为优势来源——它帮助理解复杂世界、提升效率、搭建方法论与工程结构。
> - 当前触动：后期越来越清楚地意识到，系统化也可能异化为防御机制，把体验、关系、脆弱与混沌排除在外。
> - 演化动因：随着你把系统能力用于产品、AI、认知整理乃至自我观察，副作用开始显现：理性越来越强，但真实体验可能被压扁。
> - 出处链接： [[raw/monthly_notes/2025-08-thought-notes]] / [[raw/monthly_notes/2026-02-thought-notes]]

- 这条张力不是要削弱理性，而是防止“系统”成为逃避体验的精致借口。
- 它和 AI-native workflow、独立开发方法论、自我建模三条主轴高度耦合。
'''
}


def main():
    for path, block in PATCHES.items():
        if not path.exists():
            continue
        text = path.read_text(encoding='utf-8')
        if '## 深化认知演进' in text:
            continue
        marker = '## 编译注记'
        idx = text.find(marker)
        if idx == -1:
            text = text.rstrip() + '\n\n' + block + '\n'
        else:
            text = text[:idx] + block + '\n' + text[idx:]
        path.write_text(text, encoding='utf-8')
    print('filled_shifts=4')


if __name__ == '__main__':
    main()
