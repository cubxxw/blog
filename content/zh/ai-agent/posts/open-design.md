---
title: "拆解 Open Design：让你已有的 coding agent 变成设计引擎"
date: 2026-07-22T20:30:00+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: ["Open Design", "nexu-io/open-design", "Claude Design", "AI 设计工具", "coding agent", "Claude Code", "Codex", "Cursor", "DESIGN.md", "设计系统", "Design System", "BYOK", "MCP", "本地优先", "Local-first", "HyperFrames", "AI Agent", "前端原型"]
tags:
  - AI
  - Agent
  - LLM
  - Architecture
  - MCP
  - Design System
description: >
  Open Design（nexu-io/open-design）是一个开源、本地优先的 Claude Design 平替。它自己不带模型，把你电脑里已经装好的 coding agent（Claude Code、Codex、Cursor…）当成设计引擎，用「技能 + 设计系统 + 插件」三层文件编排出真实的 HTML/CSS 工件，在沙箱里实时预览，导出 HTML/PDF/PPTX/MP4。这篇从定位、三层系统架构、DESIGN.md 契约，一路讲到宣传口径与仓库实际的落差，再到本地从零上手的完整实操。
tldr:
  - Open Design 是「Claude Design 的开源本地平替」：自身不含模型，检测你 PATH 上已装的 coding agent 当引擎，把设计任务编排给它们，产出真实前端文件而非一张截图。
  - 三层架构：Next.js 16 前端（沙箱 iframe 实时预览）+ 本地 Node 守护进程（/api/chat、spawn agent、SQLite）+ agent 运行时 CLI。请求链路是 daemon → spawn(agent) → stdout → SSE → `<artifact>` 解析 → 预览。
  - 每次发送的系统提示词由三层拼装：基础输出契约 + 当前设计系统的 DESIGN.md + 当前技能的 SKILL.md。顶栏换 skill 或设计系统，下一次发送就换掉对应那一层。
  - 宣传口径和仓库实际有落差：README 标榜 150 设计系统 / 100+ 技能 / 21 个 CLI，QUICKSTART 里真正内置的是 129 设计系统、约 9 个技能、扫描 8 种 agent。看数字以你本地 dropdown 为准。
  - 本地优先：守护进程默认绑 127.0.0.1、只读；没装 CLI 就用 BYOK 直连 Anthropic / OpenAI；数据落在 `.od/` 目录，不出本机。Apache-2.0 许可，可自托管。
maturity: budding
columns:
  - agent-engineering
cover:
  image: /images/covers/ai-agent/2026/open-design.jpeg
  alt: "拆解 Open Design：让你已有的 coding agent 变成设计引擎"
---

先做个消歧。中文语境里「Open Design」这个词至少指两样毫不相干的东西：一个是起源于 1990 年代末的**开源硬件 / 开放式设计运动**（MIT 那批人搞的 Open Design Foundation、OpenStructures、Open Source Ecology 那一脉，讲的是公开发布物理产品的设计蓝图协同制造）；另一个是 2025 年之后冒出来的 GitHub 项目 [`nexu-io/open-design`](https://github.com/nexu-io/open-design)，一个把 AI coding agent 当设计引擎的开源工具。

本文只讲后者。如果你是冲着开源硬件来的，这篇帮不上忙。

## 一句话讲清它是什么

Open Design 把自己定位成「**Claude Design 的开源本地平替**」。理解它，关键是先接受一个反直觉的设定：**它自己不生成设计，也不内置任何大模型。**

它干的事更像一个**设计调度器**——启动时扫描你电脑 `PATH` 上已经装好的命令行编程 agent（`claude` / `codex` / `cursor-agent` / `gemini` / `opencode` / `qwen` / `copilot` 等），把它们当成后端的「编译执行引擎」。你在界面里敲一句「用某某设计系统做一个 SaaS 落地页」，Open Design 负责把这句话拼装成一份带约束的提示词，spawn 起对应的 agent 去写真实的 HTML/CSS，边写边把结果流式解析出来，在一个沙箱 iframe 里实时渲染，最后落盘成文件。

官方还给了个更大的口号：「**Agent 时代的 Figma 平替**」。这话的分量在于交付路径——你拿到的不是一张 PNG、一份 theme JSON，而是能直接丢进 Cursor / Codex 续接成 React/Vue 的真实前端代码。传统设计工具最痛的那段「设计稿→代码」的信息损耗，它试图从源头绕开：**产出物一开始就是代码。**

许可证是宽松的 Apache-2.0，支持完全自托管，数据默认不出本机。

## 定位：为什么是「调度器」，而非又一个出图工具

市面上「AI 生成 UI」的工具不少，Open Design 的差异化在两个词：**本地优先**和**模型无关**。

多数 SaaS 设计工具把你的资产锁在专有云数据库里，绑定它自家的渲染引擎和计费。Open Design 反过来——所有能力寄生在你**已经在用**的编程 agent 之上。你用谁的 agent，就走谁的额度和模型；它不替你决定用哪个模型，也不收你的模型钱。这带来三个直接后果：

- **没有 vendor lock-in**：今天用 Claude Code，明天换 Codex 或本地 Ollama，换的只是一个 CLI，工件、设计系统、历史都还在。
- **绕开云端 rate limit**：不经过它的服务器中转，你的 agent 跑多快，它就多快。
- **数据主权**：设计稿、提示词、项目上下文都落在本地 `.od/` 目录，默认零遥测。

代价也很清楚：**它有个前置门槛——你得先有一个能用的 coding agent（或一把 API key）。** 想要「一句话直接出图」的零门槛体验，它不是最省事的那个。它服务的是已经在终端里跟 agent 打交道的人。

## 系统设计：三层架构与请求的流动

![Open Design 工作原理：你已有的 coding agent 当设计引擎，Open Design 编排「技能 · 设计系统 · 插件」三层文件，跑「需求→方向→工件→交付→记忆」循环，产出 HTML/PDF/PPTX/MP4 真实文件](/images/blog/open-design-how-it-works.svg)

这是全文最值得看的部分。Open Design 的骨架由三层构成，彼此用标准接口解耦。

**第一层，表现层（Next.js 16 + React 18 + TypeScript）。** App Router 构建的可视化界面，核心是一个**沙箱化的 `srcdoc` iframe**：agent 流式吐出的 HTML 在这里几秒内渲染成可点、可测的原型，同时被沙箱隔离，未知脚本破坏不了你的主机环境。桌面端再套一层 Electron 外壳。

**第二层，本地守护进程（Node 24 + Express + SSE + better-sqlite3）。** 一个绑定在 `127.0.0.1` 的轻量后台服务，是整套系统的中枢。它对外暴露 `/api/skills`、`/api/design-systems`、`/api/chat`（SSE 流式）、`/api/proxy/*`、`/api/artifacts/{save,lint}` 等接口，用 SQLite（`.od/app.sqlite`）管项目、会话、消息、标签页。它还内置一个 **MCP stdio 服务器**，让主流 agent 能原生消费它的技能和文件。

**第三层，agent 运行时。** 守护进程通过 `spawn(<agent>, [...], { cwd: .od/projects/<id> })` 把本地 CLI 拉起来，用标准 stdio 做进程间流式通信。agent 在项目工作目录里读 `SKILL.md` + `DESIGN.md`，把工件写到磁盘。

一次「发送」的完整链路是这样的：

```
前端输入
  → daemon /api/chat
  → spawn(<agent>, cwd=项目目录)
  → agent stdout（边想边写 HTML）
  → SSE 流式回传
  → <artifact> 解析器（把 HTML 从对话流里切出来）
  → 沙箱 iframe 实时渲染
  → 「Save to disk」落盘到 ./.od/artifacts/<时间戳>-<slug>/index.html
```

**两种执行模式**共用同一套 `<artifact>` 解析器和同一个沙箱 iframe，区别只在传输层：

| 模式 | 触发条件 | 请求怎么走 |
|---|---|---|
| **Local CLI**（默认） | 守护进程在 PATH 上探测到 agent | 前端 → daemon `/api/chat` → `spawn(<agent>)` → stdout → SSE → 解析 → 预览 |
| **Anthropic API · BYOK**（回落） | 没装任何 CLI | 前端 → `@anthropic-ai/sdk` 直连 → 解析 → 预览 |

### 提示词的三层拼装

整套系统里我最欣赏的一处设计，是它怎么防止大模型「跑飞回默认样式」。每次发送，应用把系统提示词按三层拼起来发给 provider：

```
BASE_SYSTEM_PROMPT        （输出契约：必须裹进 <artifact>，不许用代码围栏）
  + 当前设计系统正文        （DESIGN.md —— 调色板 / 字体 / 布局）
  + 当前技能正文            （SKILL.md —— 工作流与输出规则）
```

你在顶栏换掉技能或设计系统，下一次发送就替换掉对应那一层，其余不动。正文按会话缓存在内存里，每次切换只需一次守护进程 fetch。这套「三层拼装」把「品牌」「工作流」「输出格式」三件事拆成了可独立替换的正交维度——也是它能用同一句提示词、切一下 dropdown 就产出完全不同品牌质感的原因。

## DESIGN.md：机器可读与人类可读的双层契约

要让概率化的大模型稳定输出某种品牌质感，光给几个 Hex 色值没用——它照样会退回 Material Design 或 Tailwind 的默认长相。Open Design 的解法是一份叫 `DESIGN.md` 的品牌契约（这个格式最早由 Google Labs 为其 Stitch 设计工具提出，现已被开源社区当成描述视觉品牌的通用 AI 契约）。

它的巧妙在于**双层结构**：

**顶部的 YAML frontmatter** 提供机器可读的精确度量——颜色阶梯、字体族、圆角、间距栅格、组件样式绑定。前端解析器和静态校验工具能直接把这些提取成参数。

**下方的 Markdown 散文正文** 用二级标题组织，讲的是「设计逻辑」和「约束」——那些没法用数字表达、只能用语言解释的东西。比如一句「禁止任何立体渐变和投影，保持纸质印刷的平面感」，会作为 system prompt 被 agent 深度加载，从更高层规范排版气质。

一份精简示例（示意，实际内置系统是 9 段式 schema）：

```markdown
---
name: "Nordic Warmth"
colors:
  primary: "#2C3E50"
  accent: "#E67E22"
  neutral-bg: "#FAF8F5"
typography:
  headline: { fontFamily: "Lora", fontSize: "3.5rem", fontWeight: 700 }
  body:     { fontFamily: "Inter", fontSize: "1rem", lineHeight: 1.6 }
rounded: { sm: "4px", md: "12px" }
spacing: { sm: "8px", md: "16px", lg: "32px" }
---

## Colors
Primary (#2C3E50)：温暖的煤灰墨色，用于所有大标题与正文。
Accent (#E67E22)：熟柿橙，只在主要行动按钮和焦点处克制使用。
背景用柔和纸面 #FAF8F5，不用纯白，减少长时间阅读疲劳。

## Component Rules
主按钮背景严格映射 accent，四角用 4px 小圆角，不许全圆角——它会破坏几何的挺拔感。
```

一些内置系统的校验工具还会顺手做可访问性检查：提取 YAML 里的前景色/背景色，按 WCAG 2.1 的相对亮度公式算对比度，低于 4.5 就在终端告警，引导 agent 自动微调到 AA 级。

## 三个可组合平面：技能、设计系统、插件

Open Design 把 Claude Design 那套闭源的「发现需求 → 锁定方向 → 流式产出工件 → 评审 → 交付」循环，拆成了一堆可读写、可版本控制、可发布的普通文件。它们分三个平面：

- **技能（Skills）**：承载 agent 的「设计品味」。每个技能是 `skills/` 下一个文件夹，遵循 Claude Code 的 `SKILL.md` 约定，并扩展了 `od:` 前缀的 frontmatter（`mode`、`platform`、`design_system.requires` 等）。仓库实际内置的原型类技能有 `web-prototype`（默认）、`saas-landing`、`dashboard`、`pricing-page`、`docs-page`、`blog-post`、`mobile-app`；演示类有 `simple-deck` 和 `magazine-web-ppt`（`guizang-ppt` 打包，deck 模式默认）。
- **设计系统（Design Systems）**：承载品牌，就是前面说的 `DESIGN.md`。切换系统即换整套 token，不需要维护 theme JSON。
- **插件（Plugins）**：承载可运行的工作流，是可移植的 agent skill 文件夹。

三者都是文件，你能自己写、放进 git、发布出去。这套「文件系统即产品」的设计，是它敢叫「开源平替」的底气。

### 一个必须点破的落差：宣传口径 vs 仓库实际

调研到这一步，我发现一件值得写进正文的事：**这个项目的宣传数字和仓库实际内置数字对不上，而且它自己的两份文档就在打架。**

README 顶部的口号是「**100+ 技能 · 150 个设计系统 · 261 个插件 · 21 个 CLI**」，SEO 标签里又写「259+ Skills · 142+ Design Systems」。但翻开同一分支的 `QUICKSTART.md`——也就是真正能跑起来的那份——写的是：

> Design system 下拉框内置 **129 个设计系统**（2 个手写起步款 + 70 个产品系统 + 57 个设计技能），技能下拉框实际打包**约 9 个**，PATH 扫描器识别的 agent 是 **8 种**（claude / codex / devin / gemini / opencode / cursor-agent / qwen / copilot）。

我的建议很简单：**看数字，一律以你本地那个 dropdown 里实际加载出来的为准。** README 卖的是产品愿景（加上 261 个 `plugins/_official/` 里包好的东西），QUICKSTART 描述的是当前能跑的 MVP。星标数同理——不同索引站从几千到近 6 万都有，增长很快，别把某个具体数字当权威。会看这一层落差，也是判断一个「爆款开源项目」成熟度的基本功。

## 本地优先与安全模型

守护进程默认只绑 `127.0.0.1`、只读模式，任何往局域网的暴露都要显式声明 `OD_BIND_HOST` + `OD_ALLOWED_ORIGINS`。

对于 BYOK 代理（`POST /api/proxy/{anthropic,openai,azure,google,ollama,...}/stream`），它在守护进程边缘加了一层 **SSRF 防护**，物理封禁所有内网 / link-local / CGNAT 网段的私有 IP——这样你既能安全地把请求分发到 OpenAI、Anthropic、Google、Azure，也能安全地接本地 Ollama / LM Studio，同时不给攻击者留一个探测内网的口子。凭证和实时工件预览路由无论如何都只走本地环回。

## 我可以拿它做什么：按四个维度的实用指南

**按产品类型选技能 + 设计系统。** SaaS / 工具类用 `saas-landing`、`dashboard`、`pricing-page`，配 Linear / Vercel / Stripe 这类克制的系统；营销 / 增长用社媒图、邮件、海报类技能，配 Nike / Spotify / Airbnb 这类表现力强的品牌；内部文档 / 效率类用 `docs-page`、`blog-post`，走中性起步款，重信息密度。已有品牌时，别从预设方向里挑——直接丢产品截图或线上 URL，让 agent 反向编纂出你自己的 `DESIGN.md`。

**按产品形态选 mode。** 一次性静态界面用 `prototype`；要讲故事、给人翻的用 `deck`；要传播、要动效的走图片 / 视频 / HyperFrames。原则是能用单页 HTML 工件解决的别上视频，越轻的形态迭代越快。

**按端。** Web、桌面、移动共用一套设计系统，切换的是技能里的 `platform` 字段和设备外框。移动端优先 `mobile-app`；跨端项目先定一套 `DESIGN.md`，再分端出工件，保证 token 一致。

**按产品阶段。** 这是我觉得最实用的一维：

| 阶段 | 怎么用 Open Design |
|---|---|
| 0→1 探索 | 无品牌时从精选视觉方向里挑，靠沙箱预览快速试错，别过早锁死设计系统 |
| 打磨 | 在同一个工件上「原地改」，改提示词做局部微调，避免每次从头重生成 |
| 交付工程 | 拿真实 HTML/CSS 交接给 Cursor / Codex 转框架代码，或直接导出 PPTX / PDF / MP4 |
| 规模化沉淀 | 把确认过的品牌、色板、字体沉淀进 `DESIGN.md` 和团队插件，用 Automation 编排重复流程 |

至于产出格式，覆盖 HTML（内联）、PDF（浏览器打印）、PPTX、ZIP、Markdown，以及 HyperFrames 走 headless Chrome + FFmpeg 渲染的确定性 MP4。

## 上手实操：从零到第一个工件

下面给一条完全本地化的最短路径。三种装法，按你的需求选一种。

**路子 A：下桌面应用（零配置，推荐先试）。** 从 GitHub Releases 或官网下载 macOS / Windows 安装包，装好打开，它自动检测 PATH 上的 agent，默认加载 `web-prototype` 技能 + `Neutral Modern` 设计系统。敲提示词、点 Send 就出活。

**路子 B：从源码跑（要改代码 / 自托管）。** 环境要求 Node `~24`、pnpm `10.33.x`，推荐开 Corepack 锁版本：

```bash
git clone https://github.com/nexu-io/open-design.git
cd open-design
corepack enable
pnpm install
pnpm tools-dev run web   # 前台起 daemon + web，打开它打印出的 URL
```

注意：`pnpm tools-dev` 是唯一的生命周期入口，`pnpm dev`、`pnpm start` 这些老别名已经废了。常用子命令：`pnpm tools-dev status` 看运行态、`pnpm tools-dev logs` 看日志、`pnpm tools-dev check` 做诊断。

**路子 C：Docker（生产 / 团队自托管）。** 守护进程直接在 7456 端口伺服静态构建：

```bash
git clone https://github.com/nexu-io/open-design.git
cd open-design/deploy
cp .env.example .env
echo "OD_API_TOKEN=$(openssl rand -hex 32)" >> .env
docker compose up -d
# 打开 http://localhost:7456
```

**接进你自己的 agent（无 UI 用法）。** Open Design 原生带 MCP 服务器，一行命令把它注入你日常用的 agent：

```bash
od mcp install claude      # 或 codex / cursor / gemini / opencode ...
```

装好后在 agent 里就能直接调它的工具：`od project list --json`、`od files read <project-id> <path>`、`od skills list --json`、`od plugin list --json`。

**做一套自己的设计系统。** 在 `design-systems/` 下新建一个目录，核心放一份 `DESIGN.md`（格式照上面那个 9 段式示例），dropdown 就能读到。想深入看字段约定，翻 `design-systems/README.md`。

**产出与交付。** agent 读完你选的技能 + `DESIGN.md`，在项目工作区生成一个像素对齐的 HTML 工件；你在沙箱里点测、微调；满意后要么导出 PPTX / PDF / MP4，要么让前端在同一工作区里用 Cursor 把它转成 React / Vue 组件。

如果媒体生成报 `OD_BIN: parameter not set` 或 daemon URL 变成 `:0`，重建一下 daemon CLI 再重启，然后**从 Open Design 应用里重新打开项目**（别去续接旧终端会话），让守护进程重新注入 `OD_*` 环境变量：

```bash
pnpm --filter @open-design/daemon build
pnpm tools-dev restart --daemon-port 7457 --web-port 5175
```

## 工程延伸：把产出接进正式的设计系统流水线

这一节讲的东西**不是 Open Design 内置的**，而是当你想把它的产出接入企业级设计系统工程时，值得叠加的相邻生态，放这儿供你顺藤摸瓜。

Open Design 给你的是 `DESIGN.md` 和落地的 HTML/CSS。要把它升级成跨平台、可治理的设计资产，典型链路是：把 token 抽成 **W3C DTCG** 标准的 JSON（键名以 `$value`、`$type` 打头，2025.10 规范已稳定，被 Adobe / Figma / GitHub 采用）→ 用 **Style Dictionary**（v5 起要求 Node 22、原生 ESM、底层扁平化 Map 把查询降到 O(1)）编译到 Web 的 rem、Android 的 dp/sp、iOS 的 UIColor → 用 **Figma Code Connect** 把真实组件的 props 映射回 Figma Dev Mode，让设计师、前端、AI 三方消费同一份高保真代码。手写 `.figma.tsx` 嫌烦的话，还有 Superconnect 这类脚手架帮你自动生成映射。

这条链路和 Open Design 是互补关系：前者管「快速产出带品牌质感的原型」，后者管「把设计决策固化成可规模化治理的多端资产」。小项目用不上，成体量的设计系统才需要。

## 什么时候用它，什么时候别用

**适合**：你已经在终端里用 Claude Code / Cursor / Codex；想要开源可控、数据不出本机；追求「设计→真实代码」的无损交付；需要快速出带品牌质感的落地页、dashboard、路演 Deck。

**先别急**：你想要「一句话零门槛出图」（它要求你先有 agent 或 key）；你需要多人实时协作画布（它是本地优先的单机工具）；你要的是像素级精调的成品视觉稿而非可迭代的代码工件。

一句话收尾：Open Design 押的注，是**「模型是买来的，编排和产出格式才是你能造的」**——它把设计能力寄生在你已有的 coding agent 之上，用确定性的文件编排框住非确定性的大模型，让产出从第一秒起就是可交付的真实代码。这个思路，和一年来 agent 工程「把工程杠杆压在 harness 而非模型上」的大方向，是一脉相承的。

## 学习资源

- 主仓库与 README：<https://github.com/nexu-io/open-design>
- 上手文档 `QUICKSTART.md`：环境要求、两种执行模式、文件地图、排错，最该先读的一份
- `docs/` 目录：`architecture.md`（架构）、`skills-protocol.md`（`od:` frontmatter 全集）、`agent-adapters.md`（怎么加新 CLI）、`modes.md`（四种 mode）、`roadmap.md`（路线）
- `design-systems/README.md`：设计系统目录与 9 段式 schema
- DeepWiki 的 nexu-io/open-design 页：社区整理的结构化导读

先用桌面应用跑通第一个工件，再回头读 `QUICKSTART.md` 对着文件地图理解三层架构，最后照着 `docs/skills-protocol.md` 写一个自己的技能——这条路径,大概两个小时能把它摸透。
