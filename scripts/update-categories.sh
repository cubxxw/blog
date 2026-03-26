#!/bin/bash

# 批量更新文章分类脚本
# 将文章从旧分类映射到新的 Technology/Growth 分类体系

POSTS_DIR="/Users/xiongxinwei/data/cubxxw/blog/content/zh/posts"

# 技术类关键词
TECH_KEYWORDS="kubernetes|k8s|go|golang|docker|container|cloud native|云原生 | 源码|source code|api|devops|ci/cd|github actions|gitops| cri|cni|csi|etcd|apiserver|kubectl|scheduler|openim|microservice|微服务 | 跨平台 |cross-platform|并发|concurrent|type-check|langchain|llm|auto-gpt|agent|ai 开源|vector database|sora|deep learning"

# 成长类关键词
GROWTH_KEYWORDS="年度总结 |annual review|reflection|成长|growth|心流|flow|gtd|四象限 | 认知 | 思维|metacognitive|元认知 | 旅行|travel|wandering|创业 | 创业 |open source contribution|开源贡献 | 提问艺术|asking questions|efficiency|生产力|productivity|幸福|happiness|专注|focus"

# 需要移动到 growth 的文章列表（基于文件名判断）
GROWTH_FILES=(
    "2023-annual-summary"
    "2024-annual"
    "2025-annual"
    "2025-.*-thought"
    "2026-.*-thought"
    "flow-state"
    "gtd-and-the-four-quadrant"
    "metacognitive-transformation"
    "in-2023-i-was-wandering"
    "emerging-challenges"
    "exploring-foundational-thinking"
    "the-art-of-asking-questions"
    "open-source-contribution"
    "stage-growth-of-open-source"
    "navigating-the-open-source-landscape"
    "crafting-your-career"
    "brain-friendly-english"
    "combining-github-and-google"
    "project-management-from-theory"
    "ai-and-self-identity"
    "2025-12-thought-notes"
)

echo "开始更新文章分类..."

for file in "$POSTS_DIR"/*.md; do
    filename=$(basename "$file")

    # 检查是否是成长类文章
    is_growth=false
    for pattern in "${GROWTH_FILES[@]}"; do
        if [[ $filename =~ $pattern ]]; then
            is_growth=true
            break
        fi
    done

    # 读取文件内容
    content=$(cat "$file")

    # 检查是否已有 categories
    if echo "$content" | grep -q "categories:"; then
        # 替换旧分类
        if $is_growth; then
            # 替换为成长分类
            sed -i '' '/^categories:/,/^[^ ]/ {
                s/.*-.*开发.*/  - 成长 (Growth)/
                s/.*-.*开发 (Development).*/  - 成长 (Growth)/
                s/.*-.*个人成长.*/  - 成长 (Growth)/
                s/.*-.*Personal Development.*/  - 成长 (Growth)/
            }' "$file"
        else
            # 替换为技术分类
            sed -i '' '/^categories:/,/^[^ ]/ {
                s/.*-.*开发.*/  - 技术 (Technology)/
                s/.*-.*开发 (Development).*/  - 技术 (Technology)/
                s/.*-.*个人成长.*/  - 技术 (Technology)/
                s/.*-.*Personal Development.*/  - 技术 (Technology)/
            }' "$file"
        fi
        echo "已更新：$filename"
    fi
done

echo "分类更新完成!"
