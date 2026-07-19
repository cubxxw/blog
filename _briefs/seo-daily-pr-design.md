# 每日 SEO 自动 PR 定时任务 — 设计文档

> 目标:在现有 issue 247 日报(感知层)之上，新增一个每天定时执行、结合真实
> 数据、自动开一个"能落地的 PR"的执行层。新站阶段第一批聚焦**收录缺口**。
>
> 状态:设计稿，待评审。本文档不改动仓库任何代码。

---

## 0. 一句话结论

你缺的不是新载体，是把已有的 `seo-fix.yml`（**手动、单篇**）升级成
`seo-daily-pr.yml`（**每日定时、数据选题、自动开 PR、低风险自动合**）。
数据基建（GSC / PSI / CrUX 快照 + IndexNow/Baidu 推送脚本）已经齐全，
直接复用即可。

---

## 1. 载体选型:GitHub Actions，不是 Claude Code on web

| | GitHub Actions + `claude-code-action`（推荐） | Claude Code on web 定时 routine |
|---|---|---|
| 你的 GSC 密钥 / secrets | ✅ 已在仓库 | ❌ 要重新搞 |
| `data/seo/*.json` 数据 | ✅ 就在 checkout 里 | ⚠️ 要 clone |
| 推送脚本 / 台账 | ✅ 同仓库直接调 | ⚠️ 要处理路径 |
| 开 PR 闭环 | ✅ `seo-fix.yml` 已验证 | ✅ 但要配 git 凭据 |
| 谁来建 | 我直接写 yml 提交 | 只能你在 claude.ai 手动开 |

**决定:走 GitHub Actions。** 理由:数据、密钥、推送脚本、PR 闭环全在仓库里，
`seo-fix.yml` 已经证明这条路通。Claude Code on web 反而要把成熟基建搬走重配。

> 备注:如果未来你想让它在 claude.ai 上跑（比如想用更强模型 + 交互式 review），
> routine 只能你本人在 web 上创建；本设计不依赖它。

---

## 2. 每日节奏(与 issue 247 共享数据，不重复采集)

```
06:00 UTC  seo-snapshot.yml   —— 已有：抓 GSC/PSI/CrUX → data/seo/*.json
07:00 UTC  seo-analyze.yml    —— 已有：Claude 读快照 → 写 issue 247 的 SEO 小节(只读)
08:00 UTC  seo-daily-pr.yml   —— 新增：读同一批数据 → 挑一件事 → 开 PR ★
```

三者共享 `data/seo/`。08:00 跑时，当天的快照和 issue 分析都已就绪。

### issue 关闭:沿用现有滞后接替，daily-pr 不抢着关

现有机制（`scripts/daily-report-issue.mjs` 的 `closeStaleDailyIssues`）是
**滚动接替式**：每天新日报开出时，关掉除今天之外所有带 `daily-report`
label 的 open issue。所以今天的 issue **明天**被自动关，不是任务做完就关。

daily-pr 的关闭职责因此非常轻——**它不改任何 issue 的开关状态**：

- 今天的日报 issue：继续由 `closeStaleDailyIssues` 明天接替关闭。
- daily-pr 做完后，只往当天日报 issue **追加一个 `seo-pr` 小节**
  （复用 `upsertSection`），写清「今日已推送 N 页 / PR #xxx / 已自动合」。
- 这个回执小节明天随 issue 一起被滚动关闭。**关闭时机、由谁关，全不变，
  零冲突。**

> 若未来选「另建专属任务 issue」的方案，才需要 daily-pr 自己调
> `gh issue close`；当前设计不需要。

---

## 3. 选题算法(核心:数据驱动，不让 AI 自由发挥)

每天的第一步永远是**从真实信号里挑当天 ROI 最高的一件事**，按写死的优先级：

```
收录缺口补推 > 孤儿页内链 > 长尾标题/meta > GEO/TL;DR > 内容扩写 > 性能
```

### 已用真实数据验证的关键事实(2026-07-19)

- sitemap 已发布 URL：**371**
- GSC 近 3 天有曝光的 page：**156**
- **曝光缺口(已发布但近 3 天 0 曝光):249**

这 249 就是新站最大的、最低风险的可自动化空间。

### 任务库(每日按优先级挑一个"当天可做"的)

| 优先级 | 任务 | 判定数据源 | 产出 PR | 风险 |
|---|---|---|---|---|
| P0 | **收录缺口补推** | sitemap URL ➖ GSC `date_page` URL | 生成缺口清单 → 调 `indexnow-push --file` + `baidu-push --file` + 写台账 | 🟢 低(不改内容) |
| P0 | **孤儿页内链** | 构建期扫无内部入链的文章 | 在最相关的 1-2 篇正文/系列卡加指向它的链接 | 🟡 改内容 |
| P1 | **长尾标题/meta 重写** | GSC:曝光≥10、排名 8-20、CTR<2% | 改单篇 frontmatter title/description | 🟡 改内容 |
| P1 | **hreflang 缺口** | 一个 query 只有单语言排名 | 补另一语言关键段落/互链 | 🟡 改内容 |
| P2 | **TL;DR / 答案前置** | `geo-audit.mjs` 高分项 | 给单篇加 `tldr:` frontmatter | 🟡 改内容 |
| P2 | **stub 扩写** | GSC 有曝光但 body < 400 词 | 扩写单篇 | 🟡 改内容 |

---

## 4. PR 自主权分级(你的决策:低风险自动合)

| 类型 | 是否改 content/ | 处理方式 |
|---|---|---|
| 🟢 **推送 / 台账 / sitemap 元数据** | 否 | PR 跑完 CI **自动 merge** |
| 🟡 **改文章内容(标题/内链/正文)** | 是 | 开 PR，**等你 review 后手动 merge** |

实现要点：
- workflow 里 Claude 产出 PR 时，在 PR body 打标签区分 `[auto-merge]` / `[needs-review]`。
- 自动合只对贴了 `seo-auto` label 且 diff **不含 `content/`** 的 PR 生效
  （用一个轻量 auto-merge 步骤 + `gh pr merge --auto --squash`，
  并要求分支保护/CI 通过后才合）。
- 第一阶段**只上 P0 收录缺口补推**这一条自动闭环，稳定 1-2 周后再放开 P0 内链。

---

## 5. 防重复:任务台账 `data/seo/pr-log.json`

没有台账，AI 每天可能推同一批 URL / 改同一篇。台账结构：

```json
{
  "pushed": {
    "https://cubxxw.com/xxx/": { "lastPushed": "2026-07-20", "engines": ["indexnow","baidu"], "times": 2 }
  },
  "edited": {
    "content/zh/growth/posts/xxx.md": { "task": "title-rewrite", "date": "2026-07-20", "pr": 251 }
  }
}
```

- 补推：优先推**从没推过**或**推过但仍无曝光且距上次≥7天**的 URL；每天限量
  （如 20 条，兼顾 Baidu 配额）。
- 内容编辑：同一文件同一任务类型**不在 N 天内重复**。

---

## 6. 首批落地范围(最小可行闭环)

**第一阶段只做一件事，跑通全自动闭环：**

1. 新增 `scripts/coverage-gap.mjs`：
   - 读线上 per-lang sitemap（复用 `indexnow-push.mjs` 的 sitemap 解析逻辑）得全量已发布 URL。
   - 读 `data/seo/gsc-*.json` 最近 N 天并集，得"有曝光" page 集合。
   - 读 `data/seo/pr-log.json` 排除近期已推。
   - 输出当天缺口清单 `data/seo/coverage-gap-YYYY-MM-DD.txt`（限量 top-N）。
   - `--dry-run` 支持。
2. 新增 `seo-daily-pr.yml`（cron 08:00 UTC）：
   - 跑 `coverage-gap.mjs` 生成清单。
   - `indexnow-push.mjs --file` + `baidu-push.mjs --file` 推这批。
   - 更新 `pr-log.json`。
   - 开一个 `[auto-merge]` PR（只动 `data/seo/`，不碰 content）。
   - CI 通过后自动 squash-merge。
3. 稳定后，再把 P0 孤儿页内链作为 `[needs-review]` PR 接入。

**为什么这样切**：收录补推恰好是"低风险 + 不改内容 + 新站量最大"三合一，
第一天就能全自动跑，不需要你盯。改内容的选题等这条闭环验证稳了再逐步放权。

---

## 7. 需要确认 / 我需要的东西

- 是否已有分支保护规则？自动合需要 CI 作为合并门槛。
- Baidu 每日推送配额还剩多少（决定每日 top-N 的 N）。
- 是否接受新增 `scripts/coverage-gap.mjs` + `seo-daily-pr.yml` 两个文件。

---

## 8. 长期演进(不在首批)

- 台账积累后，做"推了 3 次仍 0 曝光"的**内容质量预警**（这类页可能需要
  合并/重写/删除，而不是继续推）。
- 把 GSC 里"排名 11-20 的临界词"做成每周一次的标题优化批（临门一脚 ROI 最高）。
- GEO 层：针对 AI 引擎引用，把高价值页改成"答案前置 + 结构化"，配合已有
  `geo-audit.mjs`。
