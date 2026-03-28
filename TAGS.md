# Tags 标签系统规范文档

> **版本**: 1.0.0
> **创建日期**: 2026-03-28
> **最后更新**: 2026-03-28

---

## 📋 目录

1. [标签命名规范](#标签命名规范)
2. [标签分类体系](#标签分类体系)
3. [同义词合并规则](#同义词合并规则)
4. [标签使用指南](#标签使用指南)
5. [自动化脚本](#自动化脚本)

---

## 标签命名规范

### 基本原则

| 规则 | 说明 | 示例 |
|------|------|------|
| **Title Case** | 英文标签使用首字母大写 | `Personal Growth` ✅, `personal growth` ❌ |
| **中文 + 英文** | 中文标签需附带英文翻译 | `部署 (Deployment)` ✅, `部署` ❌ |
| **简洁性** | 避免过长描述 | `Kubernetes` ✅, `Kubernetes 容器编排系统` ❌ |
| **独立性** | 每个 tag 是独立概念 | `Go`, `Kubernetes` ✅, `Go-Kubernetes 集成` ❌ |
| **一致性** | 统一大小写和格式 | `Open Source` ✅, `opensource`, `OpenSource` ❌ |

### 禁止的标签格式

```yaml
# ❌ 无效标签示例
- "blog - Annual Recap - Travel - Product Development - Philosophy"  # 完整句子
- "${{ steps.meta.outputs.tags }}"  # CI/CD 变量
- "使用正则表达式或 glob 模式过滤..."  # 描述性文字
- "your-dockerhub-username/your-app-name:latest"  # 占位符
- "en", "first"  # 无意义标签
```

---

## 标签分类体系

### 9 大分类组

#### 🖥️ 编程语言 (Programming Languages)
- Go, Python, JavaScript, TypeScript, Rust, Java

#### ☁️ 云原生 (Cloud Native)
- Kubernetes, Docker, Cloud Native, Helm, Istio, Containerd

#### 🤖 AI/ML (人工智能)
- AI, Machine Learning, Deep Learning, LLM, NLP, Computer Vision

#### 🔧 技术 (Technology)
- DevOps, Automation, Testing, Performance, Security, Monitoring, CI/CD

#### 🏗️ 架构 (Architecture)
- Microservices, System Design, Distributed Systems, Event-Driven

#### 🛠️ 工具 (Tools)
- Git, GitHub, VS Code, Linux, Vim, Docker Desktop

#### 🌐 开源 (Open Source)
- Open Source, Community, Contribution, Maintenance

#### 📚 生活 (Life)
- Blog, Travel, Personal Growth, Self-Discovery, Reading, Reflection

#### 💼 文化 (Culture)
- Remote Work, Team Collaboration, Management, Leadership

---

## 同义词合并规则

### 核心同义词映射

| 标准标签 | 同义词（需合并） |
|----------|------------------|
| `Go` | golang, Golang (GO 语言), Golang (GO Language), Go 语言 (Golang), GO |
| `Kubernetes` | K8s, k8s, Kubernetes (GO 语言) |
| `AI` | 人工智能 (AI), 人工智能 (Artificial Intelligence), AI 开源 |
| `Blog` | 博客，博客 (Blog), 博客搭建 (Blog Building) |
| `DevOps` | 运维开发，运维 |
| `Docker` | 容器化 |
| `Git` | 版本控制 (Version Control), git |
| `GitHub` | Github |
| `Open Source` | 开源，开源 (Open Source), 开源（Open Source）, 开源项目 |
| `Travel` | 旅行，旅行 (Travel), 冒险 (Adventure), 旅行记录 |
| `Personal Growth` | 个人成长，个人发展，成长 |
| `Self-Discovery` | 自我发现 (Self Discovery), 自我探索，self-discovery |
| `Deployment` | 部署，部署 (Deployment), 发布 |
| `Microservices` | 微服务，微服务 (Microservices) |
| `Cloud Native` | 云原生，云原生 (Cloud Native) |
| `Automation` | 自动化，自动化 (Automation), 自动化工具 (Automation Tools) |
| `Testing` | 测试，测试 (Test), 单元测试 |
| `Performance` | 性能优化，性能优化 (Performance Optimization) |

### 待删除标签

以下标签应直接从文章中移除：

```yaml
tags_to_remove:
  - "en"
  - "first"
  - "${{ steps.meta.outputs.tags }}"
  - "xxx/abc:${{ env.TAG }}"
  - "your-dockerhub-username/your-app-name:latest"
  - "使用正则表达式或 glob 模式过滤允许考虑的标签..."
```

---

## 标签使用指南

### 推荐标签数量

- **最少**: 3 个 tags
- **推荐**: 5-8 个 tags
- **最多**: 12 个 tags

### 标签组合策略

每篇文章应该包含以下维度的标签：

```yaml
# 示例：一篇关于 Kubernetes 部署的 AI 项目文章
tags:
  - Kubernetes          # 核心技术
  - Deployment          # 操作类型
  - AI                  # 应用领域
  - DevOps              # 方法论
  - Cloud Native        # 技术分类
  - Open Source         # 项目性质
  - Tutorial            # 内容类型
```

### 标签选择流程

1. **确定核心技术** - 文章主要讨论的技术/工具
2. **确定应用领域** - AI/Web/Mobile等
3. **确定内容类型** - Tutorial/Review/Analysis等
4. **确定目标读者** - Beginner/Advanced等
5. **检查同义词** - 确保使用标准标签名
6. **控制数量** - 保持在 5-8 个之间

---

## 自动化脚本

### 批量替换标签

```bash
# 使用 config/tags-mapping.json 进行批量替换
./scripts/migrate-tags.sh
```

### 标签检查脚本

```bash
# 检查无效标签
./scripts/check-tags.sh
```

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2026-03-28 | 初始版本，建立标签规范体系 |

---

## 参考文件

- [`config/tags-mapping.json`](../config/tags-mapping.json) - 同义词映射配置
- [`content/`](../content/) - 文章内容目录
- [`themes/PaperMod/layouts/_default/terms.html`](../themes/PaperMod/layouts/_default/terms.html) - 标签页面模板
