# flomo → 月度思考笔记 流水线

> 用途：把 flomo 导出（`flomo@<user>-YYYYMMDD/`）变成 `content/{zh,en}/growth/posts/YYYY-MM-thought-notes.md` 的完整月度归档。
> 首次建立：2026-09-19

## 为什么要脚本

一次导出有 4,000+ 条 memo。手工整理必然漏条目、漏月份、丢时间戳。所以这里的原则是：

1. **覆盖优先**：`parse-export.mjs` 读原始 HTML，`coverage.mjs` 反向校验每条 memo 都能在已发布正文里找到。
2. **结构由脚本定，判断由人做**：分类、标题、章节顺序是确定性的；哪些内容不该公开，由 `redactions.json` 显式记录。
3. **私有数据不入库**：导出原文、中间产物全部落在 `.flomo/`（已 gitignore），仓库里只保留脚本、脱敏清单和成稿。

## 步骤

```bash
# 0. 解压 flomo 导出，得到 HTML + file/ 附件目录
EXPORT=~/Downloads/flomo@cubxxw-20260919

# 1. 解析：HTML -> .flomo/memos.json（含稳定 key，去掉 flomo 里的重复条目）
node scripts/flomo/parse-export.mjs "$EXPORT" --out .flomo/memos.json

# 2. 敏感内容候选扫描（只筛，不判断）
node scripts/flomo/scan-sensitive.mjs

# 3. 覆盖率审计：哪些 memo 还没进文章（新增月份这里会 100% 未覆盖）
node scripts/flomo/coverage.mjs

# 4. 生成中文归档；--write 落到 content/zh；--emit-chunks 导出英文翻译工作单元
node scripts/flomo/build-notes.mjs --write --emit-chunks

# 5. 翻译英文：每个 .flomo/out/en/<month>/NN.zh.md 产出同名 NN.en.md
#    规则写在每个 chunk 文件的头部（保留 <!--memo:KEY--> 标记、时间戳、标签）
node scripts/flomo/assemble-en.mjs --write

# 6. 复核
node scripts/flomo/coverage.mjs          # uncovered 只应剩 redactions.json 里的 drop 条目
node scripts/flomo/verify-bilingual.mjs  # 中英文章必须带同一组 <!--memo:KEY-->
npm run frontmatter:check && npm run tags:check && npm run blockquotes:check && npm run flavor:check
```

## 每个文件负责什么

| 文件 | 职责 |
|------|------|
| `parse-export.mjs` | flomo HTML → JSON。生成 `key = sha1(date+time+text)[0:12]`，同一 key 只保留一条（flomo 里确实存在同秒重复） |
| `scan-sensitive.mjs` | 用正则筛出凭证、联系方式、金额、健康、政治等候选，输出 `.flomo/sensitive.json` 供人工复核 |
| `redactions.json` | **已提交的脱敏决定**。`drops` 直接整条不发布，`redactions` 做局部替换；每条都写清原因 |
| `coverage.mjs` | 8 字 shingle + 子串兜底，逐月报告哪些 memo 没进正文 |
| `build-notes.mjs` | 分类 → 归档成文。会复用旧文章里按时间戳对得上的标题，新条目才自动起标题 |
| `en-meta.json` | 英文版 front matter（title/description/tldr），人工翻译，避免机翻腔 |
| `assemble-en.mjs` | 用翻译结果拼英文版；校验 `<!--memo:KEY-->` 覆盖、时间戳行、残留中文 |
| `nav.mjs` | 开头「大类导航」的锚点规则与中英文文案，锚点必须和 Goldmark 自动生成的 id 一致 |
| `verify-bilingual.mjs` | 逐月比对中英文章的来源标记集合与顺序，并拦下「英文版里还留着大段中文」 |
| `add-nav.mjs` | 给「成稿长文 + 附录」型月份开头补一段大类导航（正文不动） |
| `import-en-chunks.mjs` | 从已发布的英文正文里按时间戳回收翻译，重排格式不需要重译 |
| `verify-nav.mjs` | 在 Hugo 构建产物上验证导航里每个锚点都真的存在 |
| `dispatch-todo.mjs` / `dispatch-whole.mjs` | 生成补齐翻译的子代理派发脚本 |

## 分类口径

九个方向，标签命中优先，其次关键词打分，都不中才落「日常与其他」：

`AI 与 Agent 系统` / `产品、工程与开源` / `商业、投资与职业` / `自我认知与心理` / `阅读、思想与历史` / `旅行、地理与城市` / `身体、健康与日常` / `内容、创作与记录` / `日常与其他`

## 开头的大类导航

每个月（中英双语）正文最前面都有一段「本月导航 / Quick Navigation」：列出这个月的大方向、
各多少条，以及（如果有）当年的月度精选入口，点一下就跳到对应章节。

锚点是照 Goldmark 的规则手算的，所以 `verify-nav.mjs` 会在构建产物上再验一次——
手算规则一旦和渲染器不一致，读者点目录就会原地不动。

## 页面上的笔记块

文章模板通过 `layouts/partials/article/note-blocks.html` 把每个 `<!--memo:KEY-->`
到下一个 memo 标记或一级、二级主题标题之前的内容包在独立的 `.note-block` 中。
这是构建时的呈现处理，原始 Markdown、覆盖率标记和标题锚点保持不变；中文、英文
和追加型归档共用同一规则。没有 memo 标记的文章保持原有排版。

每条记录以三级标题开始，紧随其后的时间戳引用转换成紧凑的元信息行；正文中的
真实引用仍保留。一级、二级标题保留给块外主题导航，笔记内小标题应使用三级或更低
层级。样式在 `assets/css/extended/zzz-note-blocks.css` 中维护，块内段落间距小于
块间距离，边框和底色使用现有明暗主题变量。长笔记完整展开，不产生卡片内滚动。

## 覆盖契约

- 正文里每条 memo 都带一个 `<!--memo:KEY-->` HTML 注释（渲染后不可见），既是来源标记，也让覆盖率可以机器验证。
- `build-notes.mjs` 和 `assemble-en.mjs` 都会在结束时自检，缺条目直接非零退出。
- 脱敏是唯一的例外：`redactions.json` 里 `drops` 的条目不会出现在任何文章里，`coverage.mjs` 会把它们列为 uncovered —— 这是预期结果，不是缺口。

## 批次记录

| 日期 | 导出 | 处理范围 | 结果 |
|------|------|----------|------|
| 2026-09-19 | `flomo@cubxxw-20260919` | 2025-02 ~ 2026-09 全部 20 个月 | 4,635 条有效 memo，4,630 条进正文，5 条按脱敏清单剔除；中英双语各 20 篇，条目一一对应 |

这一次的处理口径：

- **新写的月份**：2025-02 ~ 2025-11、2026-08、2026-09 共 12 篇，按九个方向重新归档，是当月全部记录的完整版。
- **补录的月份**：2026-03 ~ 2026-07，正文（成稿长文或旧归档）保持不动，只在结尾追加 `补录` / `附录` 段，把此前漏掉的条目补齐。
- **未改动的月份**：2025-12、2026-01、2026-02 —— 这三篇在上一批里已经是 100% 覆盖，只从 2026-02 里移除了 1 条（见脱敏清单）。
- **英文**：以上所有月份都按中文逐条翻译，`2026-07` 原本没有英文版，这次连同长文一起补齐。

当月的月份（例如 2026-09）在导出时还没结束，文章 `date` 取最后一条 memo 的准确时间，避免被 Hugo 当成 future content 不发布；下个月再跑一次即可把它补成完整月份。

## 第二批：把「其他月份」也按大类排好

第一批只重排了 2025-02 ~ 2025-11 与 2026-08、2026-09。第二批把剩下的月份补齐：

- **2025-12、2026-01、2026-02、2026-03、2026-04**：从「按日期归档」重排成九个大类归档，
  并保留当年人工挑的封面与「月度精选」入口。
- **2026-05、2026-06、2026-07**：正文是成稿长文，不动；只在开头补大类导航 + 保留附录。

顺带发现并修掉一个更隐蔽的问题：**2025-12、2026-01、2026-02、2026-04 的「英文版」
其实整段是中文**（当年只翻译了精选部分），`2026-03` 的英文版只覆盖了 34/464 条。
所以这几个月按 chunk 重新翻译（约 39 万字中文），`assemble-en.mjs` 与
`verify-bilingual.mjs` 现在都会在「英文正文残留中文超过 1500 字」时直接判失败，
这类问题不会再悄悄上线。

## 发布前本地验证清单

普通文章只需要文档级检查，但这一批同时动了当月文章的 `date`、章节序号和中英对照，
所以按风险多跑了几步：

```bash
# 结构 / 元数据
npm run frontmatter:check && npm run tags:check && npm run blockquotes:check && npm run flavor:check
# 覆盖与双语一致性
node scripts/flomo/coverage.mjs && node scripts/flomo/verify-bilingual.mjs
# 真正能拦住问题的构建（CI 用 Hugo 0.147.0，Netlify 用 netlify.toml 里的 0.145.0）
hugo --gc --minify --baseURL https://cubxxw.com/          # 生产
hugo --gc --minify --buildFuture -b http://localhost:1313/ # 预览（Netlify deploy-preview 同款命令）
make production-build                                      # Netlify 生产用的完整链路
```

`date` 写坏过一次（当月分支取错了字段，写成 `undefinedTundefined+08:00`），
Hugo 只在构建时报 `the "date" front matter field is not a parsable date`，
所以现在生成器里直接断言格式，写完就报错，而不是等 CI。

`scripts/check-ai-flavor.mjs` 对逐字归档的豁免依据是 `<!--memo:...-->` 来源标记，
所以这些月度笔记不会因为作者本人的口头重复而被判成 AI 味。
