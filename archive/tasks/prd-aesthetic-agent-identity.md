# PRD: Aesthetic Agent Identity — 文章详情页美学重设计

> Project: cubxxw/blog
> Branch: `ralph/blog-ui-ux-fixes` (PR #166 后续)
> 编号范围：US-025 ~ US-033（延续项目现有 US 编号）
> 作者：Xinwei Xiong
> 日期：2026-04-18

---

## 1. Introduction / Overview

当前 PR #166 已把文章详情页改成单列 Serif 版，解决了"标题重复 / 左侧 TOC 冗余"的工程问题，但视觉语言仍偏"开发者博客"模板味，缺少 editorial 氛围与东方美学气质。

本次迭代以 **Stitch 产出的 4 张设计稿**（`design/stitch/01~04`）为蓝本，把文章详情页重塑成两套**按语言自动切换**的主题：

- **`:lang(zh)` → 东方美学主题**：宣纸底 + 朱墨红 + 古铜褐 + CJK Serif + 行高 2.2 + 首字下沉 + 「」pull-quote
- **`:lang(en)` → 西方美学主题**：象牙白 + 近黑 + 冷灰 + 深橄榄 accent + Fraunces/Inter/JetBrains Mono + 行高 1.75 + `"` 装饰引号

PC ≥1280px 采用 **12 栅三栏** 布局（左 marginalia 2/12 · 中 article 7/12 · 右 Editorial Tools 3/12）。移动端折叠成单列 + 底部悬浮按钮 bottom sheet。

所有主题化值抽成 CSS custom properties，通过 `:lang()` 选择器整组切换，**不引入 Tailwind、不重写 JS**。

---

## 2. Goals

- **G1**：同一个 Hugo 模板按 `<html lang>` 自动呈现两套完全不同的视觉主题，无需手动开关。
- **G2**：PC（≥1280px）三栏布局可复用，在 1024-1279 降级为两栏（隐藏左 marginalia），<1024px 单列。
- **G3**：CSS tokens 体系化：字体 / 颜色 / 行高 / 字距 / 间距 / 圆角 / 阴影 全部变量化，中英文一键切换。
- **G4**：暗色模式同步跟随主题：中文暗色 stone-900 + `#ff3b3b`；英文暗色 `#161d17` + `#b4bcb2`。
- **G5**：Playwright 截图与 Stitch 稿对比 ≥ 80% 视觉相似度；`:lang(zh)` 与 `:lang(en)` 下 `.post-title` 的 computed `font-family` 必须不同。
- **G6**：不回归 —— PaperMod header/footer、Reading Companion JS、搜索面板、国际化路由、深色模式切换按钮一切正常。

---

## 3. User Stories（US-025 ~ US-033）

> 每个 Story 独立可实现，预计工时为"单次专注会话"可完成。颗粒度遵循项目现有 US-001~024 惯例。

---

### US-025：建立双主题 CSS tokens 体系

**Description:** As a 开发者, I want 把所有主题化值（字体/颜色/行高/字距）抽成 CSS tokens 并用 `:lang(zh) / :lang(en)` 切换，so that 后续所有组件直接引用 token 即可自动按语言变皮。

**背景**：现有 `assets/css/extended/tokens.css` 已有 `--font-serif/sans/mono` 和 spacing/radius/shadow，但尚未按语言区分，也没有主题语义色（paper、ink、accent 等）。

**用户价值**：建立"一次定义、全局受益"的 token 层，后续 Story 只需消费 token，不再重复写颜色字体。

**Acceptance Criteria:**
- [ ] `assets/css/extended/tokens.css` 新增语义 token：`--color-paper`、`--color-ink`、`--color-ink-muted`、`--color-accent`、`--color-accent-soft`、`--color-rule`、`--font-display`、`--font-body`、`--font-meta`、`--font-mono`、`--line-height-prose`、`--tracking-prose`、`--drop-cap-size`
- [ ] `:root` 默认（英文）值：paper `#f9f9f7`、ink `#1a1c1b`、ink-muted `#5e5e63`、accent `#2e352e`、accent-soft `#dde5da`、display `Fraunces, ...`、line-height-prose `1.75`、tracking-prose `normal`
- [ ] `:lang(zh)` 覆盖：paper `#fbf9f4`、ink `#350003`、ink-muted `#6c5b4e`、accent `#862122`、accent-soft `#eae8e3`、display `"Noto Serif SC", ...`、line-height-prose `2.0`、tracking-prose `0.02em`、drop-cap-size `4.5rem`
- [ ] 暗色覆盖两组：`.dark:lang(en)` 与 `.dark:lang(zh)` 各自重映射 ink/paper/accent
- [ ] 不破坏 PaperMod 原有的 `--theme/--primary/--secondary` —— 新 token 独立共存
- [ ] 新增一个 `/debug/tokens` 预览页（或纯文档）手动肉眼验证

**技术实现要点**：
- 只动 `tokens.css`，不动 `custom.css` 主体
- 使用 CSS 后代选择器 `:lang(zh) *` 会严重性能降级；改用根级 `:root:lang(zh)` 或 `html:lang(zh)` 作用域
- CJK 字体 fallback 栈必须含 PingFang/苹方、Source Han Serif、STSong，保证无 Google Fonts 时仍可读

**依赖**：无（基础层）
**预计工时**：1 会话（~60min）

---

### US-026：引入字体资源与 preload 策略

**Description:** As a 用户, I want 首次访问文章页时字体快速可用且无闪烁，so that 阅读体验不因字体加载跳动。

**Acceptance Criteria:**
- [ ] `layouts/partials/extend_head.html` 合并为单一 Google Fonts link：Fraunces (opsz 9..144, weights 300/400/600/700/800) + Inter (300/400/500/600) + JetBrains Mono (400/500) + Noto Serif SC (400/700/900)
- [ ] `preconnect` 到 `fonts.gstatic.com` + `preload` 关键 CSS，`display=swap`
- [ ] Noto Serif SC 仅在中文页面加载（通过 `{{ if eq .Lang "zh" }}` 条件加载）以减少英文页体积
- [ ] `font-display: swap` 生效，FOIT 时间 < 100ms
- [ ] Lighthouse 性能分不因此下降 >3 分
- [ ] **Verify in browser using dev-browser skill（playwright-skill）**：EN 页 computed `font-family` 为 Fraunces，ZH 页为 Noto Serif SC

**技术实现要点**：
- 用 Hugo `{{ if eq .Lang "zh" }}` 分支注入 Noto Serif SC
- 一条 link 比多条 link 要快（HTTP/2 multiplex 下等价，但 DNS/TCP 开销减少）
- 同步在 `tokens.css` fallback 栈内列出系统 serif，保证字体加载前不崩布局

**依赖**：US-025
**预计工时**：0.5 会话（~30min）

---

### US-027：重构 single.html 为三栏栅格结构

**Description:** As a 开发者, I want 重写 `layouts/_default/single.html` 采用 marginalia + article + tools 的 12 栅三栏结构，so that 后续各侧栏组件只需填入对应栅。

**Acceptance Criteria:**
- [ ] `.article-layout` 改为 CSS Grid，12 列：`grid-template-columns: repeat(12, minmax(0, 1fr))`；gap 在不同断点分别为 24/40/64px
- [ ] 三栏分配：`.article-marginalia` 占 `col-span-2`、`.article-main` 占 `col-span-7`、`.article-tools` 占 `col-span-3`
- [ ] 1024-1279：隐藏 `.article-marginalia`，article 扩到 `col-span-9`
- [ ] <1024px：单列，marginalia 以紧凑 inline 组渲染在 article 头部；tools 隐藏，由 US-031 的 bottom sheet 接管
- [ ] 保留 US-026 前的所有 partial 调用（breadcrumbs、post_meta、cover、anchored_headings、post_nav_links、share_icons、comments）
- [ ] 保留 PR #166 里的"剥离 .Content 首个 h1" 逻辑
- [ ] **Verify in browser using dev-browser skill**：desktop / tablet / mobile 三视口截图结构正确，无溢出、无重叠

**技术实现要点**：
- 允许重写 `single.html`（按用户确认 5A），但保留 `{{- define "main" }}` 声明并维持 partial 组合关系
- Marginalia / Tools 用 `<aside>` 语义化标签
- 三栏结构仅在 ≥1280px 触发，避免中屏打断长文阅读宽度
- 使用 `position: sticky` 让 marginalia 与 tools 跟随滚动

**依赖**：US-025
**预计工时**：1 会话

---

### US-028：实现左侧 Marginalia 元数据栏

**Description:** As a 读者, I want 在文章左侧看到作者、日期、阅读时长、语言切换、"Suggest Changes" 等元数据，so that 视线不打断文章主体即可定位信息。

**Acceptance Criteria:**
- [ ] 新增 `layouts/partials/article/marginalia.html`，输出四组 marginalia 项：Principal（作者）· Chronicle（日期）· Dimensions（时长+字数）· Dialect（语言切换）+ 一个 "Suggest Changes" 小链接
- [ ] 标签样式：`text-[9px] uppercase tracking-[0.4em] color-ink-muted`
- [ ] 值样式：`text-xs font-display color-ink`，CJK 用 `--font-display`（宋），EN 用斜体 Fraunces italic
- [ ] 日期统一为**公历**（确认 2B），格式 `April 5, 2026` / `2026 年 4 月 5 日`
- [ ] Dialect 行显示 `EN | 中`，当前语言高亮，点击切换到对应语言版本（复用现有 `translation_list.html` 逻辑）
- [ ] `position: sticky; top: calc(var(--header-height) + 24px)`
- [ ] 左侧竖向 hairline `border-left: 0.5px solid var(--color-rule)`
- [ ] **Verify in browser using dev-browser skill**：EN 页显示 `Principal / Chronicle / Dimensions / Dialect` 标签；ZH 页显示对应中文（在 i18n 里加）

**技术实现要点**：
- 新增 i18n key：`marginalia.principal`、`marginalia.chronicle`、`marginalia.dimensions`、`marginalia.dialect`、`marginalia.suggest` 在 `i18n/en.yaml` 与 `i18n/zh.yaml`
- 阅读时长复用 `post_meta.html` 里的 `readingTime`
- 字数通过 Hugo `.WordCount`

**依赖**：US-025、US-027
**预计工时**：1 会话

---

### US-029：升级文章主体排版（标题/首字下沉/正文/pull-quote）

**Description:** As a 读者, I want 文章主体拥有 editorial 级排版（大字标题、首字下沉、pull-quote、装饰横线），so that 阅读体验接近 The New Yorker / 三联生活周刊。

**Acceptance Criteria:**
- [ ] `.post-title`：`font-family: var(--font-display)`；英文 `font-size: clamp(2.5rem, 5vw, 4.5rem)` + `font-weight: 800` + `letter-spacing: -0.02em` + `line-height: 1.08`；中文 `font-size: clamp(2.25rem, 4.5vw, 3.75rem)` + `font-weight: 900` + `letter-spacing: 0.02em` + `line-height: 1.2`
- [ ] `.post-description` 改用 italic Serif，`opacity: 0.65`，max-w `62ch`
- [ ] 文章第一个 `<p>` 获 `.drop-cap`：英文 Fraunces extrabold，中文 Noto Serif SC 900；颜色 `var(--color-accent)`；尺寸 `var(--drop-cap-size)`；`float: left`
- [ ] `.post-content` 正文 `line-height: var(--line-height-prose)`，中文 2.0，英文 1.75；`letter-spacing: var(--tracking-prose)`
- [ ] `blockquote` 支持两种渲染：
  - EN：前置绝对定位 `"` 装饰大引号（`8xl`，color `var(--color-accent)` 10% 透明度）
  - ZH：文首插入 `「` 前缀字符（CSS `::before` content），文末 `」`
- [ ] `hr` 仍为 `• • •` 3 连点居中（PR #166 已有，保留）
- [ ] h2 前置 accent 小横线（PR #166 已有，保留并改用 `var(--color-accent)`）
- [ ] 行内 `code` pill 化，颜色跟随 `var(--color-accent-soft)`
- [ ] **Verify in browser using dev-browser skill**：EN/ZH 各截一张首屏，首字下沉、引号、h2 小横线视觉正确

**技术实现要点**：
- `.drop-cap` 只对 `.post-content > p:first-of-type` 生效，通过 `:first-of-type::first-letter` 选择器或 Hugo 在模板里加 class
- Pull-quote 的语言差异化用 `blockquote:lang(en)::before` 与 `blockquote:lang(zh)::before`
- 中文 `letter-spacing` 设 0 到 0.02em 之间，大了会断行奇怪

**依赖**：US-025、US-027
**预计工时**：1.5 会话

---

### US-030：实现右侧 Editorial Tools 侧栏

**Description:** As a 读者, I want 在文章右侧看到 TOC、AI Companion、Annotations、Share Scroll 等工具面板, so that 不离开页面即可导航、摘录、分享。

**Acceptance Criteria:**
- [ ] 新增 `layouts/partials/article/editorial-tools.html`，含四个分组：Table of Contents / AI Companion / Annotations / Share Scroll
- [ ] 复用现有 Reading Companion 的 `.reading-companion` JS，不改 JS 只改样式
- [ ] 每组标题：`text-xs font-bold tracking-[0.2em] uppercase` + 顶部 hairline
- [ ] TOC 组显示 article headings，hover 朱红/橄榄 accent 小圆点 + 颜色变化
- [ ] AI Companion 组包含输入框 `placeholder="向 AI 提问..." / "Ask about this article..."` (i18n)
- [ ] Share Scroll 组：4 个小圆 icon（X / WeChat / Link / Email）
- [ ] `position: sticky; top: calc(var(--header-height) + 24px); max-height: calc(100vh - var(--header-height) - 48px); overflow-y: auto;`
- [ ] 在 <1280px 断点隐藏，由 US-031 接管
- [ ] **Verify in browser using dev-browser skill**：EN 显示 "Editorial Tools" 一组英文标签；ZH 显示 "编辑工具 / 目录 / AI 伴读 / 批注 / 分享"

**技术实现要点**：
- 引入 Material Symbols Outlined（和 Stitch 稿一致）或改用 inline SVG（推荐 SVG，无外部字体依赖）
- AI Companion 输入框 post 到现有 `/netlify/functions/article-ai`（已有 endpoint）
- Annotations 组先做空态（Coming soon），避免阻塞

**依赖**：US-025、US-027
**预计工时**：1.5 会话

---

### US-031：移动端适配 —— 折叠 marginalia + bottom sheet tools

**Description:** As a 移动端用户, I want marginalia 在文章顶部以紧凑 inline 形式呈现，Tools 以底部悬浮按钮弹出 bottom sheet，so that 小屏也能访问元数据与工具，不占文章宽度。

**Acceptance Criteria:**
- [ ] <1024px：marginalia 内容折叠进 article 头部（`post-header` 下方），以 2 行紧凑排版呈现（第一行：作者 · 日期；第二行：阅读时长 · 字数 · 语言切换）
- [ ] <1024px：右下角出现 48×48 圆形悬浮按钮（FAB），图标为三线目录
- [ ] 点 FAB 弹出 bottom sheet：全宽、高度占视口 70%、内含 TOC / AI / Share 三个 tab
- [ ] Bottom sheet 打开时背景 `rgba(0,0,0,0.4)` 遮罩，点遮罩或滑下关闭
- [ ] Bottom sheet 实现：纯 CSS + 最少量 JS（≤ 50 行），放在 `assets/js/article-bottom-sheet.js`
- [ ] FAB 在文章末尾（<100vh 剩余）或 `scrollY < 200` 时自动淡出
- [ ] **Verify in browser using dev-browser skill**：375×812 / 414×896 两种移动视口，FAB 与 bottom sheet 正常弹出/收回

**技术实现要点**：
- CSS `transform: translateY(100%)` ↔ `translateY(0)` + `transition` 实现滑上滑下
- JS 不引入框架，纯 `addEventListener`；用 IntersectionObserver 控制 FAB 淡入淡出
- Tabs 切换用 radio hack 或 15 行 JS

**依赖**：US-028、US-030
**预计工时**：1.5 会话

---

### US-032：暗色模式双主题同步

**Description:** As a 读者, I want 切换暗色时中英文各自套用对应的暗色配色，so that 主题感知在夜间仍然成立。

**Acceptance Criteria:**
- [ ] `.dark:lang(en)` token 组：paper `#121413`、ink `#e2e3e1`、ink-muted `#b4bcb2`、accent `#b4bcb2`、rule `rgba(226,227,225,0.1)`
- [ ] `.dark:lang(zh)` token 组：paper `#1c1917`（stone-900）、ink `#f5f3ee`、ink-muted `#a8a29e`、accent `#ff3b3b`、accent-soft `#2e1a19`、rule `rgba(245,243,238,0.1)`
- [ ] 主题切换按钮（PaperMod 自带）在两种语言下都能正常 toggle，无 flash of unstyled content
- [ ] 暗色下 drop-cap / pull-quote / h2 accent 横线所有装饰色都重映射
- [ ] **Verify in browser using dev-browser skill**：EN 暗色 / ZH 暗色 各一张全页截图

**技术实现要点**：
- 用 `html.dark:lang(xx)` 或 `[data-theme="dark"]:lang(xx)` 双选择器
- 确保 PaperMod 在 `<html>` 上切换 `.dark` 类（已验证）

**依赖**：US-025、US-029
**预计工时**：0.5 会话

---

### US-033：Playwright 视觉验收 + Stitch 稿对比

**Description:** As a QA/作者, I want 自动化截取 EN/ZH × Light/Dark × Desktop/Mobile 共 8 张截图并与 Stitch 稿并列对比，so that 我能客观判断实现相似度 ≥ 80%。

**Acceptance Criteria:**
- [ ] 新增 `tests/e2e/visual/aesthetic-agent.spec.ts`（或 JS 等价）拍摄 8 张截图到 `tests/e2e/visual/snapshots/aesthetic-agent/`
- [ ] 视口矩阵：1680×1050（desktop）、1024×768（tablet）、414×896（mobile）
- [ ] Matrix：{ en / zh } × { light / dark } × { desktop / mobile }
- [ ] 生成一张 HTML 报告 `tests/e2e/visual/aesthetic-agent-report.html`，把实现截图与 Stitch 稿左右并列
- [ ] 在 Playwright `evaluate` 中断言：`:lang(zh) .post-title` computed `font-family` 含 "Noto Serif SC"；`:lang(en) .post-title` computed `font-family` 含 "Fraunces"
- [ ] 0 console error
- [ ] `netlify dev` 本地通过，且 Hugo 构建无警告
- [ ] 截图相似度 ≥ 80%（肉眼判断即可，不引入 pixelmatch）

**技术实现要点**：
- 复用项目已有 `tests/e2e` Playwright 配置
- 不 commit 本次对比报告到 main 分支（加 `tests/e2e/visual/aesthetic-agent-report.html` 到 `.gitignore`）
- Stitch 稿路径：`design/stitch/01-pc-oriental.png` 等

**依赖**：US-025 ~ US-032 全部完成
**预计工时**：1 会话

---

## 4. Functional Requirements

- **FR-1**：所有文章详情页颜色、字体、间距通过 CSS custom properties 暴露，并按 `:lang()` 自动切换 token 组。
- **FR-2**：`<html>` 元素的 `lang` 属性必须由 Hugo 根据 `.Language.Lang` 正确输出（已有，回归验证即可）。
- **FR-3**：PC ≥1280px 布局为 12 栅三栏（marginalia 2 / article 7 / tools 3）；1024-1279 两栏（隐藏 marginalia）；<1024px 单列 + 底部 bottom sheet。
- **FR-4**：文章正文 `.post-content` 首个 `<p>` 获 `.drop-cap` 处理，首字下沉至少 3 行高度。
- **FR-5**：`blockquote` 在 `:lang(en)` 使用 8xl 半透明 `"` 装饰引号；在 `:lang(zh)` 使用 `「」`。
- **FR-6**：左侧 marginalia 四项：作者 / 日期（公历）/ 阅读时长+字数 / 语言切换。
- **FR-7**：右侧 Editorial Tools 四组：TOC / AI Companion / Annotations / Share Scroll。
- **FR-8**：暗色模式下各主题分别适配独立的 ink/paper/accent 值。
- **FR-9**：字体加载用 preconnect + single `<link>` + `display=swap`；中文页条件加载 Noto Serif SC。
- **FR-10**：Playwright 验收覆盖 EN/ZH × Light/Dark × Desktop/Mobile 8 份快照。
- **FR-11**：0 console error，Hugo 构建 0 warning，Lighthouse 性能分相对 PR #166 基线不跌超 3 分。

---

## 5. Non-Goals

- ❌ **不** 引入 Tailwind / 任何 CSS 框架。
- ❌ **不** 改动 PaperMod 主题 `themes/PaperMod/**` 内任何文件。
- ❌ **不** 重写 Reading Companion JS（只改引用的 CSS 变量）。
- ❌ **不** 引入农历显示（用户确认 2B，英文页甚至日期只显示公历即可）。
- ❌ **不** 做手动"主题切换"按钮（用户确认 1A，严格 `:lang()` 自动）。
- ❌ **不** 改国际化路由 / URL 结构。
- ❌ **不** 修改现有 `/netlify/functions/article-ai` endpoint（只在 US-030 消费它）。
- ❌ **不** 为 Stitch 稿里的装饰性人像图添加上传/管理 UI —— 若需封面图，走现有 `.Params.cover` 机制。
- ❌ **不** 在本 PRD 范围内做 A/B 测试或灰度发布。

---

## 6. Design Considerations

**设计参考**（绝对路径）：
- `design/stitch/01-pc-oriental.png` / `.html` — PC 东方（中文目标）
- `design/stitch/02-pc-aesthetic.png` / `.html` — PC 美学（英文目标）
- `design/stitch/03-mobile-oriental.png` / `.html` — 移动东方（中文目标）
- `design/stitch/04-mobile-aesthetic-care.png` / `.html` — 移动美学（英文目标）

**可复用组件**（项目现有）：
- `layouts/partials/breadcrumbs.html`
- `layouts/partials/post_meta.html`、`translation_list.html`、`edit_post.html`
- `layouts/partials/anchored_headings.html`
- `layouts/partials/cover.html`
- `layouts/partials/share_icons.html`
- Reading Companion JS（位置：需在 US-030 调研确认）

**Token 命名映射**（核心）：

| Token | EN 值 | ZH 值 | EN Dark | ZH Dark |
|---|---|---|---|---|
| `--color-paper` | `#f9f9f7` | `#fbf9f4` | `#121413` | `#1c1917` |
| `--color-ink` | `#1a1c1b` | `#350003` | `#e2e3e1` | `#f5f3ee` |
| `--color-ink-muted` | `#5e5e63` | `#6c5b4e` | `#b4bcb2` | `#a8a29e` |
| `--color-accent` | `#2e352e` | `#862122` | `#b4bcb2` | `#ff3b3b` |
| `--color-accent-soft` | `#dde5da` | `#eae8e3` | `#2a2f2a` | `#2e1a19` |
| `--color-rule` | `rgba(26,28,27,0.1)` | `rgba(53,0,3,0.12)` | `rgba(226,227,225,0.1)` | `rgba(245,243,238,0.1)` |
| `--font-display` | `"Fraunces",…` | `"Noto Serif SC",…` | 同 light | 同 light |
| `--font-body` | `"Inter",…` | `"Noto Serif SC","Newsreader",…` | 同 light | 同 light |
| `--line-height-prose` | `1.75` | `2.0` | 同 light | 同 light |
| `--tracking-prose` | `normal` | `0.02em` | 同 light | 同 light |
| `--drop-cap-size` | `5rem` | `4.5rem` | 同 light | 同 light |

---

## 7. Technical Considerations

- **Hugo 版本**：`0.145.0+extended`（已验证）
- **浏览器兼容**：支持最近 2 版 Chrome/Safari/Firefox/Edge；`:lang()` 选择器 IE11 不支持但项目不再承诺 IE。
- **性能**：Noto Serif SC 900 权重 full range 约 300KB，中文页必加载但可用 `font-display: swap` 避免阻塞 FCP。
- **字体回退栈**：CJK 回退至 PingFang SC / Hiragino Sans GB / Microsoft YaHei / 思源宋体 / STSong，避免 Google Fonts 拉不到时页面崩溃。
- **国际化**：新增的 i18n key 必须同时加 `zh.yaml` 与 `en.yaml`，避免"翻译键回显"。
- **Reading Companion 兼容性**：若其 JS 读取具体 DOM 结构（例如查找 `#TableOfContents`），US-030 需保留该锚点。
- **Netlify Functions**：`/netlify/functions/article-ai` 已有；US-030 的 AI Companion 前端只需 POST JSON。

---

## 8. Success Metrics

- **M1**：Playwright 8 张截图与 Stitch 稿肉眼相似度 ≥ 80%（主观，3 人评审）。
- **M2**：`getComputedStyle(.post-title).fontFamily` 在 `:lang(zh)` / `:lang(en)` 下第一个生效字体分别为 "Noto Serif SC" / "Fraunces"。
- **M3**：Lighthouse 性能分 ≥ PR #166 基线 −3。
- **M4**：0 console error、0 Hugo warning、0 CSS 语法错误。
- **M5**：改动仅限 `layouts/{_default,partials/article}/*.html` + `assets/css/extended/*.css` + `layouts/partials/extend_head.html` + `assets/js/article-bottom-sheet.js` + `i18n/*.yaml` + `tests/e2e/visual/aesthetic-agent.spec.ts`，不 leak 到其他路径。

---

## 9. Open Questions

- **Q1**：Stitch 稿上出现的"Annotations"与"Share Scroll"组件在现有站点是否有后端支持？US-030 先以 UI 占位 + "Coming soon" 处理，待后续 Story 再补能力。
- **Q2**：Marginalia 的"熊信伟 / Xinwei Xiong, Me"双语呈现是否仅在中文页？建议 EN 页只显示英文名，ZH 页两行都显示；若需要统一规则，后续迭代决定。
- **Q3**：Drop-cap 在长 markdown（例如正文第一段本身就是 `<blockquote>` 或 `<h2>`）时回退策略？初版选择"仅当 first-of-type 为 `<p>` 时生效"，其他情况不降级。
- **Q4**：Stitch 稿使用 Material Symbols Outlined，是否愿意接受外部字体开销？若不接受，US-030 改用内联 SVG（推荐）。
- **Q5**：字号 `clamp()` 的视口基准（5vw）在超宽屏 (>2560px) 会不会过大？需要手动在 `1920+` 断点补一个 max。

---

## Appendix：文件改动预估

```
layouts/_default/single.html                         # 重写（US-027）
layouts/partials/extend_head.html                    # 字体 link（US-026）
layouts/partials/article/marginalia.html             # 新增（US-028）
layouts/partials/article/editorial-tools.html        # 新增（US-030）
layouts/partials/article/bottom-sheet.html           # 新增（US-031）
assets/css/extended/tokens.css                       # 扩充（US-025, US-032）
assets/css/extended/custom.css                       # 大量更新（US-029）
assets/js/article-bottom-sheet.js                    # 新增（US-031）
i18n/en.yaml                                         # 新增键（US-028, US-030）
i18n/zh.yaml                                         # 新增键（US-028, US-030）
tests/e2e/visual/aesthetic-agent.spec.ts             # 新增（US-033）
tasks/prd-aesthetic-agent-identity.md                # 本文件
```

预估总工时：**~9 会话**，可并行化拆：US-025/026 一组 → US-027/028/029/030 并行 → US-031/032 → US-033。
