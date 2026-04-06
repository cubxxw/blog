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
categories:
  - AI & Technology
description: >
  纯文本描述，不含 Markdown 语法，内容丰富
---
```


