# BEAR Knowledge Space — Design Direction

> Product Lab 中可进入的探索体验。BEAR OS 仍是 `/projects/` 默认入口。
> 2026-09-26 浏览器迭代后的设计决策。色彩、圆角、动效继续服从 `DESIGN.md`。

## Product decision

- **来访者**：从博客进入的读者，想知道作者做了哪些真实产品，以及写作如何影响它们。
- **五秒内要懂的事**：这是七个可打开的产品和一组真实文章组成的档案；当前焦点与下一步清晰可见。
- **核心动作**：选一个产品，读它的状态与明确关联，再打开项目或文章；没有明确关联时直达写作索引。
- **产品事实**：关系来自 `data/products.yml` 的 `related` 和文章的 `product` / `series` 字段。没有证据的边不会画出来。

### 探索过的两条方向

| 方向 | 首屏论点 | 浏览器观察 | 结论 |
| --- | --- | --- | --- |
| 全量星图 | 22 个节点同屏，粒子连接它们 | 长标题重叠，WebGPU 粒子顶点错误形成放射碎片；真实内容难以辨认 | 放弃作为首屏 |
| 聚焦地图 | 七个产品锚点 + 一张详情卡；写作单独成为可读索引 | 1440×900 的七个入口无重叠，当前节点、打开动作和返回动作可辨认 | 当前实现 |

保留的挑战方向是「按产品关系逐步展开的阅读路径」；只有内容关系更完整时才值得做。当前没有把未知关系伪造成推荐边。

## 1. Position

| | |
| --- | --- |
| Entry | Product Lab 视图内「进入知识空间」入口（`#product-lab` 下再进 `#knowledge`） |
| Default | `/projects/` 默认仍是 BEAR OS；知识空间不替换它 |
| Leave | 「返回 Product Lab」/ `Esc` → 回到 Product Lab，不整页刷新 |

知识空间回答一个问题：**这些产品与写作如何连成一条线，下一步读什么。**

## 2. First screen

- BEAR OS 保持默认入口：左侧产品轨道、中央真实产品焦点、下方写作与公开反馈。`P` 打开仅搜索产品的面板；全站搜索继续占用 `/` 与 `⌘K`。
- 从 Product Lab 进入知识空间后，七个产品以稳定位置围绕焦点；右侧卡片呈现状态、摘要、明确关联和打开动作。「写作」「系列」切到两列可读索引。
- 首屏的文字、筛选、产品按钮和详情卡先于 GPU 初始化出现。舞台高度受控，页面照常滚动；无开场等待。
- 手机端去掉无信息的空舞台，直接展示可触控的产品入口和详情。

## 3. Core interactions

| 操作 | 反馈 | 备注 |
| --- | --- | --- |
| 指针/触控移动 | 粒子轻微响应；当前入口升起 | 仅有动画能力的设备运行连续场，触控端保持静态 |
| 悬停/焦点节点 | 琥珀强调，详情卡保留当前选择 | `Tab` 按 DOM 顺序移动；重新排布时恢复焦点 |
| 点击 / `Enter` | 点击选择并显示详情；`Enter` 打开真实文章或产品页 | 新标签仅外站；站内同标签 |
| `Esc` / 返回 | 回到 Product Lab | 焦点还给入口按钮 |
| 主题切换 | 色板在 400ms 内插值过渡 | CSS 变量 + canvas/WebGPU uniform lerp，不硬切 |
| 筛选 | 产品地图与写作索引切换 | DOM 承载内容；场景只做氛围，空关联有直达写作入口 |

## 4. Content relationships

Hugo 构建时生成图数据（站内真实路径，无假条目）：

- **产品节点** ← `data/products.yml`（7 个，含 stage / question / related）
- **写作节点** ← 产品 `related` + 精选锚点（系列总述、上下文工程、Agent 架构、年度复盘等）
- **边** ← 产品 ↔ `related` / `Params.product` 写作；同 `series` 成员互连
- **簇** ← `projects` / `ai-agent` / `engineering` / `growth`

筛选「产品 / 写作 / 系列」使用同一份真实构建数据。没有明确边时显示空状态与写作入口，不显示伪关联。

## 5. Degradation

按实际能力逐级降，任一失败都回落到可读 HTML：

| 层级 | 条件 | 呈现 |
| --- | --- | --- |
| **WebGPU** | `navigator.gpu` + fine pointer + ≥1024px + 非 reduced-motion | 180 个轻量粒子 + 指针力场；主题色经 uniform 插值 |
| **Canvas 2D** | 有 2D context + 非 reduced-motion | ≤120 个粒子 + 当前产品的低对比强调 |
| **Static** | reduced-motion / 无 canvas / <720px / 初始化失败 | HTML 节点和 CSS 底纹，无连续动画 |
| **Pause** | 离屏或隐藏标签页 | `rAF` 停止，回到视口再启 |

资源策略：知识空间的 CSS 随 `/projects/` 页壳加载；**JS 仅在进入空间时动态 `import`**，普通文章页不加载该模块。WebGPU 与 Canvas 代码在同一个按需模块内，初始化失败和设备丢失会降级；不声称没有测过的 FPS 或内存收益。WebGPU 能力检测遵循 [MDN GPU API](https://developer.mozilla.org/en-US/docs/Web/API/GPU) 与 [device lost 指引](https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/lost)。

## 6. Visual

- 沿用暖灰纸面 + 琥珀：亮 `#f4f1e9` / `#221f1b` / `#b96f1e`，暗 `#12100d` / `#ece7dd` / `#e9a04c`
- 产品色沿用 BEAR OS 语义色（rust / cobalt / amber / sage / coral）
- 字体、圆角、focus ring、触控目标 ≥44px 沿用全站 token
- 动效只表达：反馈、状态、进入退出；自动动效尊重 `prefers-reduced-motion`

## 7. Evaluation

- **五秒理解**：让未参与设计的人看一眼首屏，能否说出「这里是产品与写作的关系档案」及一个可做的动作。
- **三十秒探索**：能否从一个产品进入一篇确有关联的文章，或者从无关联状态转到写作索引。
- **返回信心**：从知识空间 `Esc` / 返回后，是否回 Product Lab，入口焦点是否恢复；BEAR OS 默认状态是否不变。
- **功能门禁**：桌面与手机、亮暗主题、键盘、初始化失败、设备丢失、离屏暂停、无横向溢出。浏览器实测与未测范围见 `docs/bear-knowledge-space-testing.md`。
- **审美判断**：并排看首屏和写作筛选后的画面，优先判断层级、可读性与内容发现。不能用测试数量或自评分替代读者判断。
