#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re

# 文章分类映射
GROWTH_ARTICLES = [
    # 年度总结
    "2023-annual-summary-reflections-and-aspirations.md",
    "2024-annual-review.md",
    "2025-annual-review.md",
    # 月度思考
    "2025-03-thought-notes.md",
    "2025-04-thought-notes.md",
    "2025-05-thought-notes.md",
    "2025-06-thought-notes.md",
    "2025-07-thought-notes.md",
    "2025-08-thought-notes.md",
    "2025-09-thought-notes.md",
    "2025-10-thought-notes.md",
    "2025-11-thought-notes.md",
    "2025-12-thought-notes.md",
    "2026-01-thought-notes.md",
    "2026-02-thought-notes.md",
    # 个人成长
    "flow-state.md",
    "gtd-and-the-four-quadrant-rule-practice.md",
    "metacognitive-transformation-review.md",
    "ai-and-self-identity.md",
    # 旅行
    "in-2023-i-was-wandering-at-the-edge-of-the-world.md",
    # 成长/思考
    "emerging-challenges-and-trends-in-2024.md",
    "exploring-foundational-thinking-learning-across-disciplines.md",
    "the-art-of-asking-questions-in-open-source-communities.md",
    "open-source-contribution-guidelines.md",
    "stage-growth-of-open-source.md",
    "navigating-the-open-source-landscape.md",
    "crafting-your-career-pathway-a-guide-to-open-source-resume-builders-and-expert-resume-tips.md",
    # 效率/管理
    "project-management-from-theory-to-practice.md",
    "brain-friendly-english-learning-strategies-tools-and-techniques-explained.md",
    "combining-github-and-google-workspace-for-project-management.md",
]

TECH_ARTICLES = [
    # Kubernetes
    "kubernetes-learning.md",
    "kubernetes-an-article-to-get-started-quickly.md",
    "kubernetes-for-kustomize-learning.md",
    "deep-dive-into-the-components-of-kubernetes-cni-csi-cri.md",
    "deep-dive-into-the-components-of-kubernetes-etcd.md",
    "deep-dive-into-the-components-of-kubernetes-kube-apiserver.md",
    "deep-dive-into-the-components-of-kubernetes-kubectl.md",
    "deep-dive-into-the-components-of-kubernetes-scheduler.md",
    # Go
    "cross-platform-compilation.md",
    "concurrent-type-checking-and-cross-platform-development-in-go.md",
    "go-release-tools.md",
    "use-go-tools-dlv.md",
    # AI/LLM
    "harnessing-language-model-applications-with-langchain-a-developer-is-guide.md",
    "use-auto-gpt.md",
    "UFO.md",
    "mem0.md",
    "exploring-large-language-models-llms-pioneering-ai-understanding-generation-human-language.md",
    "exploring-sora-technology-for-enthusiasts-and-developers.md",
    "sora-ease-guide-mastering-sora-ai-for-developers.md",
    "vector-database-learning.md",
    # OpenIM 项目
    "openim-building-an-efficient-version-control-and-testing-workflow.md",
    "openim-cluster-deployment-parameter-passing-policy.md",
    "openim-cluster-deployment-scheme-of.md",
    "openim-devops-design.md",
    "openim-multi-process-management.md",
    "openim-offline-deployment-design.md",
    "openim-open-source-business-journey.md",
    "openim-remote-work-culture.md",
    "openim-use-harbor-build-enterprise-mirror-repositories.md",
    "read-openim-project-sealos-openim-source-code.md",
    "troubleshooting-guide-for-openim.md",
    # DevOps
    "github-actions-advanced-techniques.md",
    "gitops-practice-theory-part.md",
    "advanced-githook-design.md",
    "learn-about-automated-testing.md",
    "prow-ecological-learning.md",
    "argo-cd.md",
    # 其他技术
    "deployment-and-design-of-management-backend-and-monitoring.md",
    "directives-and-the-use-of-automation-tools.md",
    "hugo-advanced-tutorial.md",
    "openkf-multi-architecture-image.md",
    "my-hugo.md",
    "my-first-blog.md",
    "participating-in-this-project.md",
]

def update_categories(filepath, new_category):
    """更新文章的 categories 字段"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 检查是否有 categories 字段
    if 'categories:' not in content:
        print(f"跳过 (无 categories): {os.path.basename(filepath)}")
        return False

    # 替换 categories
    # 匹配 categories 块（从 categories: 到下一个顶层字段）
    pattern = r'categories:\s*\n(\s*-.*\n?)*'
    replacement = f'categories:\n  - {new_category}\n'

    new_content = re.sub(pattern, replacement, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"已更新：{os.path.basename(filepath)} -> {new_category}")
    return True

def main():
    posts_dir = "/Users/xiongxinwei/data/cubxxw/blog/content/zh/posts"

    updated_growth = 0
    updated_tech = 0

    # 更新成长类文章
    for filename in GROWTH_ARTICLES:
        filepath = os.path.join(posts_dir, filename)
        if os.path.exists(filepath):
            if update_categories(filepath, "成长 (Growth)"):
                updated_growth += 1
        else:
            print(f"文件不存在：{filename}")

    # 更新技术类文章
    for filename in TECH_ARTICLES:
        filepath = os.path.join(posts_dir, filename)
        if os.path.exists(filepath):
            if update_categories(filepath, "技术 (Technology)"):
                updated_tech += 1
        else:
            print(f"文件不存在：{filename}")

    print(f"\n完成！更新了 {updated_growth} 篇成长类文章，{updated_tech} 篇技术类文章")

if __name__ == "__main__":
    main()
