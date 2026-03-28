# CLAUDE.md - Blog 开发助手提示文档

> **用途**: 为 AI 助手（Claude/Codex）提供博客开发规范和上下文
> **版本**: 1.0.0
> **创建**: 2026-03-28

---

## 🎯 核心指令

当用户请求博客相关任务时，请遵循以下规范：

### 1. 标签使用规范

**必须检查** `config/tags-mapping.json` 使用标准标签名：

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
tags:
  - Go
  - Kubernetes
categories: ["Development"]
description: >
  纯文本描述，不含 Markdown 语法
keywords: [Go, Kubernetes, Deployment]
---
```

**注意事项**：
- `description` 必须是纯文本，不含 `**`, `*`, `#` 等 Markdown 符号
- `keywords` 从 `tags` 自动生成（见 SEO 配置）
- 双语文章设置 `draft: true` 直到翻译完成

### 3. 文件路径规范

```yaml
content/
├── en/
│   ├── ai-technology/posts/   # AI 技术文章
│   └── growth/posts/          # 成长类文章
├── zh/
│   ├── ai-technology/posts/
│   └── growth/posts/
└── archives.md                 # 归档页面
└── travel.md                   # 旅行页面
```

### 4. 翻译文章处理

**当创建翻译文章时**：

1. 复制原文到对应语言目录
2. 翻译 `title`, `description`, `tags`
3. 翻译正文内容
4. 原文设置为 `draft: true` 如果翻译未完成
5. 更新 `config/tags-mapping.json` 如果需要新标签

### 5. SEO 规范

**每篇文章必须**：
- 有独特的 `title`（含核心关键词）
- 有 150-160 字符的 `description`
- 有 5-8 个相关 `tags`
- 自动生成 `keywords`（从 tags）

---

## 🛠️ 常用任务指令

### 创建新文章

```bash
# 中文文章
hugo new content zh/ai-technology/posts/my-article.md

# 英文文章
hugo new content en/growth/posts/my-article.md
```

### 检查标签

```bash
# 查看所有标签
./scripts/check-tags.sh

# 迁移旧标签到新标准
./scripts/migrate-tags.sh
```

### 构建测试

```bash
# 本地开发
hugo server -D

# 生产构建
hugo --minify
```

---

## 📋 质量检查清单

在标记任务完成前，请验证：

### 文章发布检查

- [ ] Front matter 格式正确
- [ ] 使用标准标签名（检查 tags-mapping.json）
- [ ] description 无 Markdown 语法
- [ ] 有 cover image（可选但推荐）
- [ ] 双语文章翻译完整
- [ ] keywords 自动生成

### 模板修改检查

- [ ] 修改后运行 `hugo server` 测试
- [ ] 检查移动端响应式
- [ ] 检查深色模式
- [ ] 验证 SEO meta 标签

### 标签治理检查

- [ ] 无重复同义词
- [ ] 无 count=1 的无效标签
- [ ] 所有标签符合命名规范
- [ ] 更新 TAGS.md 文档

---

## 🔧 配置文件说明

### 核心配置

| 文件 | 用途 |
|------|------|
| `hugo.yaml` | Hugo 主配置 |
| `config/tags-mapping.json` | 标签同义词映射 |
| `TAGS.md` | 标签规范文档 |
| `CLAUDE.md` | 本文档 |

### 模板文件

| 文件 | 用途 |
|------|------|
| `themes/PaperMod/layouts/partials/header.html` | 头部导航 |
| `themes/PaperMod/layouts/partials/footer.html` | 页脚 |
| `themes/PaperMod/layouts/partials/post_meta.html` | 文章元信息 |
| `themes/PaperMod/layouts/_default/archives.html` | 归档页面 |

### CSS 文件

| 文件 | 用途 |
|------|------|
| `assets/css/extended/nav-elegant.css` | 导航样式 |
| `assets/css/extended/custom.css` | 自定义样式 |

---

## 🚨 常见问题

### Q1: 文章元信息显示 HTML 代码
**原因**: `post_meta.html` 未使用 `safeHTML` 过滤器
**修复**: 添加 `| safeHTML` 到 `delimit` 输出

### Q2: Description 显示 Markdown 符号
**原因**: Front matter 中直接使用了 `**`, `#` 等符号
**修复**: 使用 sed 移除或重写为纯文本

### Q3: 标签混乱重复
**原因**: 未遵循统一命名规范
**修复**: 运行 `./scripts/migrate-tags.sh` 批量替换

### Q4: 翻译文章内容为空
**原因**: 创建了占位文章但未翻译
**修复**: 设置 `draft: true` 或补充翻译内容

---

## 📖 参考资源

- [Hugo 官方文档](https://gohugo.io/documentation/)
- [PaperMod 主题文档](https://github.com/adityatelange/hugo-PaperMod)
- [TAGS.md](./TAGS.md) - 标签规范
- [config/tags-mapping.json](./config/tags-mapping.json) - 标签映射

---

## 🤖 AI 助手行为准则

1. **代码优先**: 直接修改代码而非仅给建议
2. **证据基础**: 所有修改基于实际文件内容
3. **批量操作**: 使用脚本批量处理重复任务
4. **测试验证**: 修改后运行 hugo 验证
5. **文档更新**: 修改后更新相关文档

---

**最后更新**: 2026-03-28
**维护者**: Xinwei Xiong
