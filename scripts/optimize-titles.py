#!/usr/bin/env python3
"""
Optimize thought note titles in the March 2026 thought notes file.
This script reads the file, identifies titles, and applies optimizations based on content analysis.
"""

import re

# Title optimization mappings: OLD -> NEW
# Based on content analysis, these titles better capture the core insights

TITLE_MAPPINGS = {
    # 2026-03-01 notes
    '"剥瓜子/剥核桃"模式：指向"自我牺牲"与"单向付出"': '关系中的剥瓜子与插花：牺牲型付出 vs 共创型共处',
    '关系链接：不需要牺牲的共处模式': '关系的土壤隐喻：共同照料而非单向付出',
    '警惕牺牲型关系：谁痛苦谁改变': '关系系统论：谁痛苦谁改变，用冲突升级关系',
    '穿越 AI 平台期的务实主义': '穿越 AI 平台期：从宏大叙事到 Inside-Out 的小而美',
    'AI 产品的认知负荷陷阱': '隐形 AI 设计论：让用户意识不到正在被 AI 服务',
    '非线性反馈：低交互高惊喜的产品设计': '老虎机式交互：极低输入换超预期惊喜的高杠杆设计',
    'AI 互动影视的核心瓶颈：上下文视觉一致性': 'AI 互动影视的真正瓶颈：不是生成质量，是视觉一致性',
    '写作视角：独特立场与个人叙事的融合': '写作视角：融入个人叙事的强烈代入感从何而来',
    '灵感来源：形象与概念的错位': '灵感源于错位：林夕歌词中形象与概念的化学反应',
    '游戏类型谱系：从叙事沉浸到规则博弈': '游戏谱系：从操作员到导演模式的范式转移',
    '游戏的情感消费属性：叙事连续性与 AI 驱动': '游戏的情感庇护所：低风险、不背叛与千人千面的叙事',
    '中日"爱"的语义差异：关系定位 vs 情感颗粒度': '中日爱的语义学：中文的关系定位 vs 日文的情感颗粒度',
    '科学与工程的认知边界': '科学与工程的边界：知道 vs 不知道的行动哲学',
    '中日情感表达差异：中文精准 vs 日文细腻': '中文的精准与日文的幽微：两种情感表达的文化编码',
    '抽象阶梯：宏观认知与微观体验的切换': '陌生城市探索法：宏观了解与微观体验的抽象阶梯',
    '抽象层级切换：理解复杂系统的思维方法': '抽象层级切换：写作与设计中的认知弹性',
    '关系行为模式：剥瓜子、插花与剥核桃的隐喻': '三种关系人格：剥瓜子的讨好、插花的共创、剥核桃的独立',
    '抽象梯子：在具体与抽象间动态切换的认知方法': '抽象梯子方法论：上抽象→下细节→再上抽象的认知节拍',
    '视角局限：地面与俯瞰的认知差异': '地面与俯瞰：单一街道与全景地图的认知局限',
    '自我建模：像雪山一样敬畏、真实、全览': '雪山的自我建模：敬畏、真实、全览、纯洁的成长隐喻',
    '面对复杂世界的两种态度：降维简化 vs 自我消解': '降维世界 vs 消解自我：面对复杂性的两种生存策略',
    '面对世界的信心与激情': '以信心与激情面对世界：一条自我鼓励的笔记',
    '系统视野：高度与深度的认知平衡': '山顶与湖面：系统视野的高度与深度的认知平衡',
    '形态开放：大众喜爱的内容特征': '内容形态的开放性：为何不受限的形式更受大众喜爱',
    '小狮日记：科技错位与叙事体验的视频创作': '小狮日记拆解：科技与生活的错位+前3秒的新颖点',
    '拉萨乞讨现象：生存困境与半职业化选择': '拉萨乞讨的两种逻辑：生存困境与半职业化的回报率计算',
    '相似性假设：嫉妒的社会比较机制': '相似性假设：乞丐嫉妒乞丐，但不嫉妒皇帝',
    '游戏角色人格：黎深的克制与独立': '黎深人格：不把你当"需要被照顾者"的克制型关系',
    
    # 2026-03-02 notes
    'flomo 体验反思：通知骚扰与认知负担': 'flomo 的侵入式骚扰：通知如何破坏专注状态',
    'IOS 环境改造计划（手机篇）': '手机环境改造：极简主屏+场景分类+对抗小红点',
    'Apple Watch 变成信息过滤器': 'Apple Watch 信息过滤术：90% 通知关闭与按需唤醒',
    'MacBook 是主控中心，对手机进行物理隔离': '手机物理隔离术：MacBook 主控+跨设备专注结界',
}

def optimize_titles(file_path):
    """Read file and optimize titles based on mappings."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    replacements_made = 0
    
    for old_title, new_title in TITLE_MAPPINGS.items():
        # Match the title pattern: ### OLD_TITLE
        pattern = f'### {re.escape(old_title)}'
        if pattern in content:
            content = content.replace(pattern, f'### {new_title}', 1)
            replacements_made += 1
            print(f'✓ Replaced: "{old_title[:50]}..." → "{new_title[:50]}..."')
        else:
            print(f'✗ Not found: "{old_title[:50]}..."')
    
    # Write back if changes were made
    if replacements_made > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'\n✅ Successfully optimized {replacements_made} titles!')
    else:
        print('\n⚠️  No replacements made.')
    
    return replacements_made

if __name__ == '__main__':
    file_path = '/Users/xiongxinwei/data/cubxxw/blog/content/zh/growth/posts/2026-03-thought-notes.md'
    optimize_titles(file_path)
