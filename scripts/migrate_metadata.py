#!/usr/bin/env python3
"""
博客元数据批量迁移脚本 - Technology 分类
更新 articles 的 categories 和 tags
"""

import os
import re
import json
from pathlib import Path

# 配置
BLOG_DIR = Path(__file__).parent.parent  # 返回到 blog 目录
CONTENT_DIR = BLOG_DIR / "content"

# Tag 规范化映射
TAG_MAPPING = {
    # Go 相关
    "golang": "Go",
    "Golang (GO 语言)": "Go",
    "Golang (GO Language)": "Go",
    "Go 语言 (Golang)": "Go",
    "GO": "Go",
    "Golang": "Go",

    # Kubernetes 相关
    "k8s": "Kubernetes",
    "K8s": "Kubernetes",
    "kubernetes": "Kubernetes",

    # 博客相关
    "blog": "Blog",
    "博客": "Blog",
    "博客 (Blog)": "Blog",

    # 开源相关
    "开源": "Open Source",
    "开源 (Open Source)": "Open Source",
    "开源（Open Source）": "Open Source",
    "开源项目": "Open Source",

    # AI 相关
    "人工智能 (AI)": "AI",
    "人工智能 (Artificial Intelligence)": "AI",
    "AI 技术": "AI",
    "AI 开源": "AI",

    # DevOps 相关
    "运维": "DevOps",
    "运维开发": "DevOps",

    # 云原生
    "云原生": "Cloud Native",
    "云原生 (Cloud Native)": "Cloud Native",

    # 容器化
    "容器化": "Docker",

    # 微服务
    "微服务": "Microservices",
    "微服务 (Microservices)": "Microservices",

    # Git 相关
    "版本控制 (Version Control)": "Git",
    "git": "Git",

    # GitHub
    "Github": "GitHub",

    # 自动化
    "自动化": "Automation",
    "自动化 (Automation)": "Automation",
    "自动化工具 (Automation Tools)": "Automation",

    # 测试
    "测试": "Testing",
    "测试 (Test)": "Testing",
    "单元测试": "Testing",

    # 性能
    "性能优化": "Performance",
    "性能优化 (Performance Optimization)": "Performance",

    # 安全
    "安全": "Security",
    "安全性": "Security",

    # 监控
    "监控 (Monitoring)": "Monitoring",
    "可观测性": "Monitoring",

    # 部署
    "部署": "Deployment",
    "部署 (Deployment)": "Deployment",
    "发布": "Deployment",
}

# Category 规范化映射
CATEGORY_MAPPING = {
    "AI Open Source": "Projects",
    "开发 (Development)": "Technology",
    "Development": "Technology",
    "生活与教育 (Living & Education)": "Life",
    "AI Technology": "Technology",
    "Growth & Life": "Growth",
    "Projects": "Projects",
    "Technology": "Technology",
    "Growth": "Growth",
    "Travel": "Travel",
    "Life": "Life",
}

# 需要移除的 tags
TAGS_TO_REMOVE = [
    "en",
    "first",
    "${{ steps.meta.outputs.tags }}",
    "xxx/abc:${{ env.TAG }}",
    "your-dockerhub-username/your-app-name:latest",
    "使用正则表达式或 glob 模式过滤允许考虑的标签。例如，只允许 v1.*.* 格式的稳定版本标签。",
]


def normalize_tag(tag):
    """规范化 tag"""
    tag = tag.strip()
    if tag in TAGS_TO_REMOVE:
        return None
    return TAG_MAPPING.get(tag, tag)


def normalize_category(category):
    """规范化 category"""
    category = category.strip()
    return CATEGORY_MAPPING.get(category, category)


def parse_front_matter(content):
    """解析 front matter"""
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return None, content

    front_matter = match.group(1)
    rest = content[match.end():]
    return front_matter, rest


def parse_yaml_field(front_matter, field_name):
    """解析 YAML 字段"""
    # 匹配 tags 或 categories 字段
    pattern = rf'^{field_name}:\s*(.*?)$'
    match = re.search(pattern, front_matter, re.MULTILINE)
    if not match:
        return None

    value = match.group(1).strip()

    # 处理列表格式
    if value.startswith('['):
        # 单行列表
        items = re.findall(r'["\']?([^"\',\[\]]+)["\']?', value)
        return [item.strip() for item in items if item.strip()]
    elif '\n' in front_matter and match.end() < len(front_matter):
        # 多行列表
        lines = []
        for line in front_matter[match.end():].split('\n'):
            if line.startswith('  - ') or line.startswith('- '):
                item = re.sub(r'^\s*-\s*["\']?|["\']?\s*$', '', line)
                lines.append(item.strip())
            elif line.startswith(' ') or line.startswith('\t'):
                continue
            else:
                break
        return lines if lines else None

    return None


def update_front_matter(content, new_tags, new_category):
    """更新 front matter"""
    def replace_tags(match):
        old = match.group(0)
        if new_tags:
            tags_str = ', '.join(f'"{t}"' for t in new_tags)
            return f'tags: [{tags_str}]'
        return 'tags: []'

    def replace_category(match):
        old = match.group(0)
        if new_category:
            return f'categories: ["{new_category}"]'
        return 'categories: []'

    # 更新 tags
    content = re.sub(r'^tags:.*$', replace_tags, content, flags=re.MULTILINE)
    # 更新 categories
    content = re.sub(r'^categories:.*$', replace_category, content, flags=re.MULTILINE)

    return content


def process_file(filepath):
    """处理单个文件"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    front_matter, rest = parse_front_matter(content)
    if not front_matter:
        print(f"  ⚠️  无 front matter: {filepath}")
        return False

    # 解析现有 tags 和 categories
    old_tags = parse_yaml_field(front_matter, 'tags')
    old_categories = parse_yaml_field(front_matter, 'categories')

    # 规范化 tags
    if old_tags:
        new_tags = [normalize_tag(t) for t in old_tags]
        new_tags = [t for t in new_tags if t]  # 移除 None
        new_tags = list(dict.fromkeys(new_tags))  # 去重保持顺序
    else:
        new_tags = []

    # 规范化 category
    if old_categories:
        # 只取第一个 category
        new_category = normalize_category(old_categories[0]) if old_categories else None
    else:
        new_category = None

    # 如果没有变化，跳过
    if (old_tags == new_tags or sorted(old_tags or []) == sorted(new_tags or [])) and \
       (old_categories == [new_category] if new_category else not old_categories):
        print(f"  ✓ 无需更新：{filepath.name}")
        return False

    # 更新内容
    updated = update_front_matter(content, new_tags, new_category)

    # 写回文件
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(updated)

    print(f"  ✓ 已更新：{filepath.name}")
    print(f"    tags: {old_tags} → {new_tags}")
    print(f"    categories: {old_categories} → {['%s' % new_category] if new_category else []}")

    return True


def main():
    """主函数"""
    print("=" * 60)
    print("博客元数据批量迁移 - Technology 分类")
    print("=" * 60)

    # 处理 zh/ai-technology 目录
    tech_dirs = [
        CONTENT_DIR / "zh" / "ai-technology" / "posts",
        CONTENT_DIR / "en" / "ai-technology" / "posts",
    ]

    total = 0
    updated = 0

    for tech_dir in tech_dirs:
        if not tech_dir.exists():
            print(f"\n目录不存在：{tech_dir}")
            continue

        print(f"\n📁 处理目录：{tech_dir}")
        print("-" * 40)

        for md_file in tech_dir.glob("*.md"):
            total += 1
            if process_file(md_file):
                updated += 1

    print("\n" + "=" * 60)
    print(f"完成！共处理 {total} 篇文章，更新 {updated} 篇")
    print("=" * 60)


if __name__ == "__main__":
    main()
