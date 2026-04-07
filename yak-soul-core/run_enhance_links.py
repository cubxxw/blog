#!/usr/bin/env python3
"""增强核心 concepts/tensions 之间的双向链接网络"""
from __future__ import annotations

from pathlib import Path

ROOT = Path('/home/smile/data/blog/yak-soul-core/wiki')

# 定义需要增强的链接关系
ENHANCEMENTS = {
    # Concepts
    'concepts/ai-native-workflow.md': [
        ('[[意义、成长与创造]]', 'AI 工作流的终极问题：如何不让效率压扁意义感。'),
    ],
    'concepts/中国与世界的观察框架.md': [
        ('[[自由 vs 秩序]]', '不同文明对自由与秩序的理解差异，是观察框架的重要维度。'),
    ],
    'concepts/意义 - 成长与创造.md': [
        ('[[真实 vs 表演]]', '意义创造必须面对的问题：我们是在活出真实，还是在表演意义。'),
        ('[[自由 vs 秩序]]', '成长需要自由探索，但也需要秩序来沉淀。'),
    ],
    'concepts/游牧生活系统.md': [
        ('[[独立开发方法论]]', '游牧生活方式使独立开发成为可能，反之亦然。'),
        ('[[亲密关系中的边界]]', '移动生活对关系边界的持续考验。'),
    ],
    'concepts/独立开发方法论.md': [
        ('[[自由 vs 秩序]]', '独立开发追求自由，但也需要自律和秩序来维持。'),
        ('[[亲密关系中的边界]]', '独立开发者如何在关系与创造之间划定边界。'),
    ],
    'concepts/自我建模与-another-self.md': [
        ('[[系统化思维的优势与盲区]]', '自我建模既需要系统思维，也要警惕过度系统化。'),
        ('[[亲密关系中的边界]]', '自我建模在关系中的边界问题。'),
    ],
    # Tensions
    'tensions/亲密关系中的边界.md': [
        ('[[自由 vs 秩序]]', '关系中的边界本质上是自由与秩序的微观体现。'),
        ('[[游牧生活系统]]', '移动生活对关系边界提出持续挑战。'),
    ],
    'tensions/真实-vs-表演.md': [
        ('[[中国与世界的观察框架]]', '不同文化对真实与表演的理解差异。'),
        ('[[意义、成长与创造]]', '意义创造中的真实与表演张力。'),
    ],
    'tensions/系统化思维的优势与盲区.md': [
        ('[[自我建模与 Another Self]]', '自我建模既需要系统思维，也要警惕过度系统化。'),
        ('[[意义、成长与创造]]', '系统化可能压扁意义感，需要平衡。'),
    ],
    'tensions/自由-vs-秩序.md': [
        ('[[自我建模与 Another Self]]', '主体性的形成，始终卡在自由与结构之间。'),
        ('[[独立开发方法论]]', '独立开发追求自由，但也需要自律和秩序来维持。'),
        ('[[意义、成长与创造]]', '成长需要自由探索，但也需要秩序来沉淀。'),
    ],
}


def main():
    enhanced = 0
    for rel_path, links in ENHANCEMENTS.items():
        path = ROOT / rel_path
        if not path.exists():
            print(f'[skip] {path.name} not found')
            continue
        
        text = path.read_text(encoding='utf-8')
        
        # Find the 网络链接注记 section
        marker = '## 网络链接注记'
        idx = text.find(marker)
        if idx == -1:
            print(f'[skip] {path.name} has no 网络链接注记 section')
            continue
        
        # Find the end of the section (next ## header or end of file)
        next_section = text.find('\n## ', idx + 1)
        if next_section == -1:
            next_section = len(text)
        
        # Get current links
        section_text = text[idx:next_section]
        existing_links = set()
        for line in section_text.split('\n'):
            if line.strip().startswith('- [['):
                start = line.find('[[')
                end = line.find(']]') + 2
                if start != -1 and end != -1:
                    existing_links.add(line[start:end])
        
        # Add new links that don't exist
        new_links = []
        for link, desc in links:
            if link not in existing_links:
                new_links.append(f'- {link}：{desc}')
        
        if new_links:
            # Insert new links after existing ones in the section
            insert_pos = idx + len('## 网络链接注记\n\n')
            # Find the end of existing links
            lines = text[insert_pos:next_section].split('\n')
            link_end = insert_pos
            for i, line in enumerate(lines):
                if line.strip().startswith('- [[') or line.strip() == '':
                    link_end = insert_pos + len('\n'.join(lines[:i+1]))
                else:
                    break
            
            new_text = text[:link_end] + '\n' + '\n'.join(new_links) + '\n' + text[link_end:]
            path.write_text(new_text, encoding='utf-8')
            print(f'[enhanced] {path.name} +{len(new_links)} links')
            enhanced += 1
        else:
            print(f'[skip] {path.name} all links already exist')
    
    print(f'\nTotal enhanced: {enhanced}/{len(ENHANCEMENTS)}')


if __name__ == '__main__':
    main()
