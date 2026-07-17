### 要求
- `date` 必须显式写上海时区时间，推荐格式：`YYYY-MM-DDTHH:mm:ss+08:00`
- `description` 必须是纯文本，不含 `**`, `*`, `#` 等 Markdown 符号
- 先撰写中文文章然后翻译为英文文章

撰写文章必须使用标准标签名，如果有新的标签，必须注册进去（修改此文件）

```yaml
✅ 正确示例：
tags: [Go, Kubernetes, Deployment, AI, DevOps]

❌ 错误示例：
tags: [golang, k8s, 部署，人工智能，运维]  # 使用别名
tags: [blog - Annual Recap]  # 过长描述
tags: [en, first]  # 无意义标签
```

**标签映射规则**：
- `golang` → `Go`
- `k8s` → `Kubernetes`
- `博客` → `Blog`
- `人工智能 (AI)` → `AI`
- 参见 `config/tags-mapping.json` 完整映射

### 2. Front Matter 规范

```yaml
---
title: '文章标题'
date: 2026-03-28T12:00:00+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - Go
  - Kubernetes
description: >
  纯文本描述，不含 Markdown 语法，内容丰富
# 可选：答案前置 TL;DR（GEO/BLUF，提升 AI 引用率），字符串或要点列表
tldr:
  - 一句话核心结论。
  - 第二个关键要点。
# 可选：内容成熟度（活内容标签）：seedling 萌芽 / budding 成长 / evergreen 常青
maturity: budding
# 可选：FAQ（同时产出可见 FAQ 块 + FAQPage JSON-LD），问题写成真实搜索问句，答案自包含
faq:
  - q: "X 是什么？"
    a: "不依赖上下文即可独立成立的纯文本答案。"
# 可选：HowTo schema（仅步骤型教程文章用），steps 必须与正文可见步骤一致
howto:
  name: "如何做 X"
  totalTime: PT30M          # ISO 8601 时长，可省略
  supplies: ["工具 A", "密钥 B"]  # 可省略
  steps:
    - name: "步骤名"
      text: "该步骤的自包含描述。"
---
```

**Answer-First 开头（GEO）**：How-to /「是什么」类文章正文第一段直接给答案——一句可独立成立的结论 + 40–100 字展开 + 至少一个证据，再进入正文。`tldr` 是提要块，Answer-First 是正文首段，两者并存不冲突。


