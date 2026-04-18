# PRD: Blog UI/UX 全面修复与体验增强

## 1. Introduction / Overview

本次针对 `https://nsddd.top` 个人博客网站进行了系统性 UI/UX 体验测试，覆盖首页、About、Projects、Travel、Articles、Start Here 与文章详情页，测试了导航、搜索、主题切换、语言切换、滚动行为等核心交互。

测试发现了多个等级的问题：
- **P0 Critical（阻断使用）**：Projects 页面标题白字白底完全不可见；Header 深色模式背景破损；首页与 Header 文字因负 letter-spacing 与窄容器被压成竖排 / 连字。
- **P1 High（体验破损）**：首页 body 无法正常滚动（需 JS 强制）、Sticky Header 丢失、搜索按钮文字竖排（S-e-a-r-c-h）、语言切换 ZH 竖排、Travel 页 4 项放入 3 列网格留空、文章页正文过窄（约 700px）两侧大量留白且无侧边 TOC。
- **P2 Medium（细节打磨）**：About 面包屑只有 "Home"、Travel "Footprints" 卡片缺描述、About 内容偏左留白不均衡。

本 PRD 目标是**系统性修复全部已知问题并建立自动化回归测试，确保桌面 + 移动端双端一致**，同时彻底修复深色模式一致性问题。

---

## 2. Goals

- 修复所有已知 P0/P1/P2 UI Bug，桌面与移动端均达到可用、可读、可导航标准。
- 深色模式在所有页面、所有组件（Header、Footer、卡片、代码块、搜索面板）保持视觉一致。
- Header 组件响应式布局稳定，不再出现文字竖排、元素溢出、粘性失效问题。
- 页面滚动行为默认原生，不依赖 JS 强制滚动。
- 建立基于 Playwright 的视觉回归与关键交互自动化测试套件，每个修复对应至少一个测试用例。
- Lighthouse 桌面 + 移动端性能 ≥ 85，Accessibility ≥ 90，Best Practices ≥ 90。

---

## 3. User Stories

### US-001: 修复 Projects 页面卡片标题不可见（P0）
**Description:** As a visitor，I want to see project card titles so that I can identify and click into the project I'm interested in.

**Acceptance Criteria:**
- [ ] Projects 列表页每张卡片的 `<h2>` 标题在浅色与深色主题下都清晰可读（对比度 ≥ 4.5:1）。
- [ ] 标题链接 hover 有明确视觉反馈（颜色或下划线变化）。
- [ ] 与其他列表页（Articles、AI Technology）视觉风格保持一致。
- [ ] Typecheck/Lint 通过。
- [ ] Verify in browser using dev-browser skill（桌面 + 移动视口）。

---

### US-002: 修复 Header 搜索按钮文字竖排为 "S-e-a-r-c-h"（P0）
**Description:** As a visitor，I want the Search button label to render horizontally so it looks professional and isn't mistaken for broken layout.

**Acceptance Criteria:**
- [ ] Header 内 Search 按钮文字水平单行显示，或在窄视口下仅显示图标 + `⌘K`。
- [ ] 按钮容器设置 `white-space: nowrap` 或 `flex-shrink: 0`，字符宽度 ≥ 文本宽度。
- [ ] 1280px / 1024px / 768px / 375px 四个断点均无竖排或截断。
- [ ] Typecheck/Lint 通过。
- [ ] Verify in browser using dev-browser skill。

---

### US-003: 修复语言切换 "ZH" 竖排显示为 "Z / H"（P0）
**Description:** As a visitor，I want the language switcher label (ZH/EN) to render horizontally so I can identify current language at a glance.

**Acceptance Criteria:**
- [ ] 语言切换按钮水平显示 "ZH" 或 "EN"（或使用国旗/图标替代）。
- [ ] 按钮宽度足以容纳文本，`white-space: nowrap` 生效。
- [ ] 深色模式下对比度达标。
- [ ] Typecheck/Lint 通过。
- [ ] Verify in browser using dev-browser skill。

---

### US-004: 修复深色模式 Header 背景不统一（P0）
**Description:** As a visitor using dark mode，I want the entire header to share a consistent dark background so that the site feels polished.

**Acceptance Criteria:**
- [ ] 切换到深色模式后，Header 整条横幅背景色一致（含左侧导航区 + 右侧搜索/主题/语言区）。
- [ ] 所有 Header 元素在深色模式下文字对比度 ≥ 4.5:1。
- [ ] Sticky Header 滚动时背景无闪烁、无透明区域穿透内容。
- [ ] 浅色 ↔ 深色切换过渡平滑（`transition` ≤ 300ms）。
- [ ] Typecheck/Lint 通过。
- [ ] Verify in browser using dev-browser skill（切换主题前后各截图对比）。

---

### US-005: 修复深色模式全站组件一致性（P0）
**Description:** As a visitor using dark mode，I want every page, card, code block, and modal to render with consistent dark theme so the experience isn't jarring.

**Acceptance Criteria:**
- [ ] 全站 20+ 页面（首页/About/Projects/Travel/Articles/Start Here/所有文章详情页/404）深色模式下无浅色残留。
- [ ] 代码块、引用块、表格、卡片、Footer、搜索结果面板均有深色主题样式。
- [ ] 图片/Hero 背景在深色模式下亮度适配（必要时加半透明遮罩）。
- [ ] 可访问性对比度全部达标（Axe DevTools 无 contrast 错误）。
- [ ] Typecheck/Lint 通过。
- [ ] Verify in browser using dev-browser skill（每页浅/深双截图）。

---

### US-006: 修复首页 "XinweiXiong(Bear)" 文字被负 letter-spacing 压缩（P0）
**Description:** As a visitor landing on the homepage，I want the author name to render cleanly with proper spacing so the site feels professional.

**Acceptance Criteria:**
- [ ] 首页作者名 "Xinwei Xiong (Bear)" 正确显示空格与括号。
- [ ] 移除或修正导致挤压的 `letter-spacing: -5.376px` 规则。
- [ ] 在 1280px / 1024px / 768px / 375px 四个断点均正常。
- [ ] Typecheck/Lint 通过。
- [ ] Verify in browser using dev-browser skill。

---

### US-007: 修复首页 body 滚动被阻断（P0）
**Description:** As a visitor，I want to scroll the homepage naturally with mouse wheel or touch so I can browse all content without JavaScript hacks.

**Acceptance Criteria:**
- [ ] 首页 body 原生鼠标滚轮、触控板、键盘（PageDown/Space）滚动全部正常。
- [ ] 移除导致 `overflow: hidden` 的全局样式（或仅在 modal 打开时应用）。
- [ ] 滚动条样式与深色/浅色主题协调。
- [ ] Typecheck/Lint 通过。
- [ ] Verify in browser using dev-browser skill。

---

### US-008: 恢复 Sticky Header 粘性行为（P1）
**Description:** As a visitor scrolling deep into a page，I want the header to remain visible or collapse gracefully so I can navigate without scrolling back to top.

**Acceptance Criteria:**
- [ ] Header 使用 `position: sticky; top: 0` 或等效方案，滚动时保持可见。
- [ ] 可选：滚动后 Header 变窄/加阴影（与已有设计语言一致）。
- [ ] 与 "Back to Top" 按钮无视觉冲突。
- [ ] Typecheck/Lint 通过。
- [ ] Verify in browser using dev-browser skill。

---

### US-009: 修复 Travel 页面 4 项统计放入 3 列网格留空（P1）
**Description:** As a visitor viewing the Travel page，I want the stats grid to be balanced so it looks designed rather than broken.

**Acceptance Criteria:**
- [ ] 统计区采用 4 列 或 2×2 布局，无空格。
- [ ] 桌面 4 列、平板 2×2、移动端单列 responsive。
- [ ] Typecheck/Lint 通过。
- [ ] Verify in browser using dev-browser skill。

---

### US-010: 文章详情页加入左侧 TOC 侧边栏（P1）
**Description:** As a reader of long articles，I want a sticky left-side table of contents so I can navigate sections quickly.

**Acceptance Criteria:**
- [ ] 文章详情页桌面（≥ 1280px）显示左侧 TOC，高亮当前阅读章节。
- [ ] 平板（768–1279px）折叠为顶部 TOC 或按钮展开。
- [ ] 移动端（< 768px）保持现有顶部 TOC。
- [ ] TOC 支持平滑滚动与 URL hash 同步。
- [ ] 正文仍保持可读宽度（65–80 字符）。
- [ ] Typecheck/Lint 通过。
- [ ] Verify in browser using dev-browser skill。

---

### US-011: 优化文章详情页正文布局与留白（P1）
**Description:** As a reader，I want better use of horizontal space on wide screens so content doesn't feel lost in whitespace.

**Acceptance Criteria:**
- [ ] 桌面正文最大宽度调整到 720–820px（当前约 700px 过窄）。
- [ ] 引入 US-010 的 TOC 后左右留白更均衡。
- [ ] 图片/代码块可选突破正文宽度（bleed）≤ 960px。
- [ ] Typecheck/Lint 通过。
- [ ] Verify in browser using dev-browser skill。

---

### US-012: 优化 About 页面面包屑（P2）
**Description:** As a visitor on the About page，I want a breadcrumb that shows "Home » About" so I know where I am.

**Acceptance Criteria:**
- [ ] About 页面包屑显示完整路径（Home » About），而非仅 "Home"。
- [ ] 所有二级页面面包屑统一规则。
- [ ] Typecheck/Lint 通过。
- [ ] Verify in browser using dev-browser skill。

---

### US-013: 补全 Travel "Footprints" 卡片描述（P2）
**Description:** As a visitor browsing travel content，I want every travel card to have a description so they feel consistent.

**Acceptance Criteria:**
- [ ] Travel 列表所有卡片显示描述文字（空描述显示摘要 fallback）。
- [ ] Front-matter 增加 description 校验（缺失时构建警告）。
- [ ] Typecheck/Lint 通过。
- [ ] Verify in browser using dev-browser skill。

---

### US-014: 优化 About 页面内容居中与留白（P2）
**Description:** As a visitor on About page，I want content to feel balanced on wide screens instead of left-shifted with large right whitespace.

**Acceptance Criteria:**
- [ ] About 正文水平居中或与其他页面统一容器宽度。
- [ ] 桌面最大宽度 800–960px，两侧留白对称。
- [ ] Typecheck/Lint 通过。
- [ ] Verify in browser using dev-browser skill。

---

### US-015: 移动端全站响应式验证与修复（P1）
**Description:** As a mobile visitor (375px/414px)，I want every page to render without horizontal scroll, overlap, or clipped content.

**Acceptance Criteria:**
- [ ] 375px / 414px 视口下所有核心页面无横向滚动条。
- [ ] Header 汉堡菜单可用，抽屉式展开所有导航项。
- [ ] 搜索、主题切换、语言切换在移动端可触达且不竖排。
- [ ] 文章 TOC 在移动端不遮挡正文。
- [ ] 卡片、表格、代码块不溢出视口。
- [ ] Typecheck/Lint 通过。
- [ ] Verify in browser using dev-browser skill（375px + 414px 两个断点）。

---

### US-016: 建立 Playwright 视觉回归测试套件（P1）
**Description:** As the blog maintainer，I want every fix covered by an automated test so regressions are caught before deploy.

**Acceptance Criteria:**
- [ ] 新增 `tests/e2e/` 目录，含 Playwright 配置。
- [ ] 关键页面（首页/About/Projects/Travel/Articles/单篇文章）桌面 + 移动视口截图基线。
- [ ] 交互测试：Header 搜索展开、ZH/EN 切换、主题切换、TOC 点击跳转。
- [ ] CI（GitHub Actions / Netlify）运行测试，失败阻断部署。
- [ ] 每个 US 对应至少 1 个测试用例，测试文件命名 `us-001.spec.ts` 等。
- [ ] Typecheck/Lint 通过。

---

### US-017: 加入 Lighthouse CI 与 Accessibility 自动化（P1）
**Description:** As the blog maintainer，I want Lighthouse + axe-core automated checks so quality doesn't regress.

**Acceptance Criteria:**
- [ ] GitHub Actions 运行 Lighthouse CI（桌面 + 移动）对比主分支基线。
- [ ] 性能 ≥ 85，Accessibility ≥ 90，Best Practices ≥ 90，SEO ≥ 90。
- [ ] axe-core 无 Critical/Serious 违规。
- [ ] 关键页面（首页、文章详情、Projects）纳入扫描。
- [ ] Typecheck/Lint 通过。

---

## 4. Functional Requirements

### Header 组件
- FR-1：Header 容器使用 Flexbox，子项 `flex-shrink: 0` 且 `white-space: nowrap`，不得出现字符级换行。
- FR-2：Header 在浅色/深色主题下均使用 CSS 变量统一背景，切换 `<html data-theme>` 后 300ms 内完成过渡。
- FR-3：Header 使用 `position: sticky; top: 0; z-index: 50`，滚动时保持可见。
- FR-4：移动端（< 768px）折叠为汉堡菜单，抽屉含全部导航 + Search + 主题 + 语言。

### 列表页与卡片
- FR-5：所有列表页卡片标题使用统一 token（`--color-text-heading`），禁止出现 `color: #fff` 硬编码在浅色背景上。
- FR-6：卡片组件支持 title 必填、description 可选（fallback 为 `summary` 或首段）。
- FR-7：Travel 页面统计区使用 `grid-template-columns: repeat(4, 1fr)` 或 `repeat(2, 1fr)`，消除空格。

### 文章详情页
- FR-8：桌面 ≥ 1280px 渲染左侧 sticky TOC（宽度 240px），正文居中，最大宽度 720–820px。
- FR-9：TOC 使用 IntersectionObserver 高亮当前章节，点击平滑滚动并更新 URL hash。
- FR-10：移动端保留顶部 TOC，桌面隐藏顶部 TOC 避免重复。

### 全局
- FR-11：移除全局 `body { overflow: hidden }`，仅在 Modal / Drawer 打开时临时锁滚。
- FR-12：移除或调整破坏性 `letter-spacing` 规则，标题字距控制在 `-0.02em` 以内。
- FR-13：深色模式 CSS 变量全量覆盖 `--color-bg`、`--color-bg-elevated`、`--color-text`、`--color-text-muted`、`--color-border`、`--color-accent`。
- FR-14：所有 `position: sticky` 元素在 Safari / Chrome / Firefox 三端验证。

### 测试与质量
- FR-15：Playwright 配置桌面（1280×800）与移动（375×812）两个视口 project。
- FR-16：视觉回归阈值 `maxDiffPixelRatio: 0.01`。
- FR-17：Lighthouse CI 配置 `assertions` 强制分数阈值。
- FR-18：CI 在 PR 阶段运行全部测试，失败阻断合并。

---

## 5. Non-Goals (Out of Scope)

- **平板端（768–1279px）专项优化**：本次仅保证功能不破损，不做平板专属设计。
- **新功能开发**：不引入评论系统、订阅、RSS 改版、新页面等。
- **内容重写**：不修改文章正文、不做文案润色。
- **SEO 大改**：不调整 URL 结构、不改 sitemap 策略（仅保证 Lighthouse SEO ≥ 90）。
- **主题商店 / 多主题切换**：仅修复现有浅色 + 深色双主题。
- **国际化扩展**：不新增语言，仅修复 ZH/EN 切换 UI。
- **后端/CMS 改造**：Hugo 构建流程不变，仅改 layouts + assets。

---

## 6. Design Considerations

- 复用现有设计 token（颜色、字体、间距），避免引入新色板。
- Header 交互参考已有 "Back to Top" 按钮风格，保持视觉语言一致。
- TOC 侧边栏参考 Vercel / Nextra 文档站风格：sticky、轻边框、当前项高亮用 accent 色。
- 深色模式色板以 `#0b0b0f`（bg）/ `#15151b`（elevated）/ `#e5e5ea`（text）为基准，必要时从现有站点已用色中抽取。
- 卡片 hover 状态统一：轻微上移 2px + 阴影加深。
- 图标库保持现状（不引入新依赖）。

---

## 7. Technical Considerations

- **构建**：遵循 CLAUDE.md 要求，使用 `netlify dev` 本地预览，修改后必须在浏览器验证。
- **分支**：开始前 `git pull origin main`，完成后在浏览器验证通过再 commit。
- **样式文件**：主要改动集中在 `assets/` 与 `layouts/partials/header.html`、`layouts/_default/`、`layouts/projects/`、`layouts/travel/`。
- **Hugo 模板**：注意 Hugo 的 `with` / `default` 用法，description fallback 用 `{{ with .Description }}{{ . }}{{ else }}{{ .Summary }}{{ end }}`。
- **CSS 变量**：集中定义于 `assets/css/tokens.css`（如无则新建），浅色/深色通过 `[data-theme="dark"]` 覆盖。
- **TOC 实现**：Hugo `{{ .TableOfContents }}` + 自定义 JS（IntersectionObserver）。
- **测试**：Playwright 安装后 `npx playwright install --with-deps chromium`；基线截图存入 `tests/e2e/__screenshots__/`。
- **CI**：扩展现有 `.github/workflows/`，新增 `e2e.yml` 与 `lighthouse.yml`。
- **性能预算**：Header / TOC 新增 JS ≤ 5KB gzipped，不引入大型依赖。
- **兼容性**：Chrome 最近 2 版 + Safari 最近 2 版 + Firefox 最近 2 版。

---

## 8. Success Metrics

- **Bug 清零**：P0/P1/P2 共 14 项 UI 问题全部修复并在两端（桌面 + 移动）验证通过。
- **深色模式一致性**：全站抽查 20+ 页面无浅色残留，Axe 无 contrast 违规。
- **Lighthouse**：桌面 + 移动端性能 ≥ 85、A11y ≥ 90、Best Practices ≥ 90、SEO ≥ 90。
- **测试覆盖**：每个 US 至少 1 个 Playwright 用例，CI 全绿。
- **视觉回归**：Playwright 视觉对比阈值 ≤ 1% 像素差异。
- **主观体验**：用户可原生滚动、所有按钮标签水平显示、标题可见、深/浅主题无闪烁。

---

## 9. Open Questions

1. 是否需要保留桌面端顶部 TOC 作为备选，或引入左侧 TOC 后完全移除？
2. 深色模式是否需要跟随系统 `prefers-color-scheme`，还是仅手动切换？当前默认策略？
3. 语言切换按钮若改为国旗图标，是否需要兼顾无障碍的 `aria-label`？
4. Travel 统计区 4 项内容是否可以精简为 3 项，还是必须保留全部 4 项？
5. Playwright 视觉基线截图存 Git LFS 还是直接入库？仓库大小是否有限制？
6. Lighthouse CI 失败是否阻断 Netlify 部署，或仅作为 PR 警告？
7. 是否需要为 ZH/EN 双语文章建立独立的视觉回归基线？
