# CLAUDE.md - Blog 开发助手提示文档

> **用途**: 为 AI 助手（Claude/Codex）提供博客开发规范和上下文
> **版本**: 1.0.0
> **创建**: 2026-03-28

---

## 🎯 核心指令

当用户请求博客相关任务时，请遵循以下规范：

### 0. 项目级写作约束

- 本仓库的正式内容目录是 `content/{lang}/{section}/...`
- 聚合入口使用 `articles`，不是根级 `posts`
- 普通文章只放在：
  - `content/zh/ai-technology/posts/`
  - `content/zh/growth/posts/`
  - `content/en/ai-technology/posts/`
  - `content/en/growth/posts/`
- 项目型文章只放在：
  - `content/zh/projects/`
  - `content/en/projects/`
- 所有发布时间默认以中国上海时区为准，统一使用 `+08:00`
- 如果发布时间晚于当前上海时间，Hugo 生产构建会把它当作 future content，不会发布

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
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - Go
  - Kubernetes
categories:
  - Development
description: >
  纯文本描述，不含 Markdown 语法
---
```

**注意事项**：
- `date` 必须显式写上海时区时间，推荐格式：`YYYY-MM-DDTHH:mm:ss+08:00`
- 不要混用 `+07:00`、UTC、或省略时区的本地时间
- `description` 必须是纯文本，不含 `**`, `*`, `#` 等 Markdown 符号
- `keywords` 建议默认保留为空数组 `[]`，只有在确实需要精细 SEO 补充时再填写
- 双语文章设置 `draft: true` 直到翻译完成

**推荐的文章 meta baseline**：

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
  - AI
  - Open Source
categories:
  - Development
description: >
  用 1 到 2 句话说明文章解决什么问题、适合谁读、核心结论是什么。保持纯文本，不写 Markdown，不堆砌标签词。
---
```

**为什么这是更好的写法**：
- 字段顺序稳定，便于批量维护和审查
- `date` 明确带 `+08:00`，不会因为时区导致“本地能看、线上不发布”
- `type: posts` 保持和现有文章模板一致
- `keywords: []` 比伪 SEO 关键词更安全，避免低质量重复
- `description` 只承担摘要职责，不承担宣传文案职责

### 3. 文件路径规范

```yaml
content/
├── en/
│   ├── ai-technology/posts/   # AI 技术文章
│   ├── growth/posts/          # 成长类文章
│   ├── projects/              # AI 项目文章
│   └── articles/_index.md     # 全部文章聚合页
├── zh/
│   ├── ai-technology/posts/
│   ├── growth/posts/
│   ├── projects/
│   └── articles/_index.md
```

**不要再使用**：
- `content/en/posts/`
- `content/zh/posts/`

它们不再是内容主目录，只保留历史兼容语义。

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
- `keywords` 默认可为空，不强制堆砌

---

## 🛠️ 常用任务指令

### 创建新文章

```bash
# 技术文章
hugo new content content/zh/ai-technology/posts/my-article.md
hugo new content content/en/ai-technology/posts/my-article.md

# 成长文章
hugo new content content/zh/growth/posts/my-article.md
hugo new content content/en/growth/posts/my-article.md

# AI 项目文章
hugo new content content/zh/projects/my-project.md --kind ai-project
hugo new content content/en/projects/my-project.md --kind ai-project
```

**更推荐的项目内命令**：

```bash
make new-post SECTION="ai-technology" POST_NAME="my-article"
make new-post SECTION="growth" POST_NAME="my-article"
make new-ai-project PROJECT_NAME="my-project"
```

### 添加文章的推荐流程

1. 先判断文章属于 `ai-technology`、`growth` 还是 `projects`
2. 用对应命令创建文件，不要手工新建到错误目录
3. 先补完整 front matter，再写正文
4. `date` 一律写上海时间 `+08:00`
5. 如果计划稍后发布，不要把 `date` 写到未来，优先用 `draft: true`
6. 内容改完后刷新索引并本地验证

```bash
node scripts/generate-content-index.mjs
make envbuild
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
- [ ] `date` 使用上海时区 `+08:00`
- [ ] 发布时间不是未来时间，除非明确要延迟发布
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
| `config.yml` | Hugo 主配置 |
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

### Q0: 明明文件在 `content/` 里，线上却没有发布
**常见原因**: `date` 写成了未来时间，且使用了上海时区之外的偏移或错误时间
**修复**:
- 优先把 `date` 改成已经到达的 `+08:00` 时间
- 如果只是暂存文章，改用 `draft: true`
- 不要依赖“本地机器当前时区”和 Hugo 自己猜测

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
