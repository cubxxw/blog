# `_briefs/` — 博客选题收件箱

这里是上游 `brain` 向博客仓库投递选题任务的唯一接口。它不是母版仓库，也不负责其他平台分发。

## 仓库边界

上游 `brain` 负责：

- 从对话、threads 和 topics 中判断什么值得写；
- 选择 `thinking`、`research`、`field-note` 或 `maintenance`；
- 给出唯一命题、作者一手增量、已确认素材与隐私边界；
- 思考型文章提供可公开的经历、情感和思想材料，可以建议方向，但不预制文章结构；
- 附上可公开的参考方向、上游引用标识和待验证问题；
- 将状态为 `ready` 的 brief 写入本目录。

当前博客仓库负责：

- 定期扫描并认领未处理 brief；
- 检查站内已有内容，避免重复选题；
- 在公开网络上补充研究、反方材料、时效事实和权威引用；
- 判断搜索意图，但不让关键词反向篡改文章命题；
- 原生撰写博客文章，并按文体决定是否需要 SEO/GEO、FAQ、站内链接和封面；
- 先做发展编辑，再做事实、隐私和行文审读；
- 本地运行文章级文档检查；全量生产构建与 E2E 由 CI/CD 承担，交付等待作者签字的成稿。

brief 默认是 800–1500 个中文字符的轻量编辑契约，不是小标题、FAQ、最终标题和逐段结论齐全的文章预制件。已批准原话与必要事实附件可以更长，但只保留会改变文章的材料。

## 文件约定

- 一篇候选文章一个文件：`YYYY-MM-DD-<slug>.md`。
- 新 brief 使用 [`_TEMPLATE.md`](./_TEMPLATE.md)。
- `brief_type` 可用 `thinking`、`research`、`field-note`、`maintenance`。
- 进入队列的任务必须使用 `schema: blog-brief/v1`；legacy 文件和缺少必填区块的任务不会被执行。
- `content/` 只存放可发布文章；未完成内容留在工作分支或 brief，不创建隐藏占位页。
- `source_refs` 使用 `brain://` 标识，不写机器绝对路径，也不复制 private 内容。
- 上游引用只是溯源线索。真正允许进入公开文章的内容必须同时出现在 brief 的“已批准素材包”中。
- 相同 `source_refs` 会形成长期主题谱系：博客侧可以串联公开 brief、执行回执、既有文章与重新核验的公开证据，识别这次继承了什么、修正了什么、还值得追踪什么。
- 主题谱系不等于素材授权。博客侧永远不得解析或读取 `brain://` 背后的 private 原文；新的作者材料仍须由上游复制进当前 brief 的“已批准素材包”。
- brief 可以被提交到公开仓库，因此不得包含 private 原文、可识别的第三方信息、密钥或本机路径。

## 状态机

```text
ready
  → claimed
  → drafting
  → review
  → ready-to-publish
  → published

任意处理中状态 → blocked
任意未发布状态 → cancelled
```

| 状态 | 所有者 | 含义 |
|---|---|---|
| `ready` | brain | 上游材料已达到下发门槛，等待博客认领 |
| `claimed` | blog | 已认领；同一时间只处理一篇 |
| `drafting` | blog | 正在研究、写作或制作封面 |
| `review` | blog | 正在发展编辑、事实审读、修订和构建验证 |
| `ready-to-publish` | blog | 质量门已通过，等待作者最终签字 |
| `published` | blog | 已发布，填写成品 URL 与日期 |
| `blocked` | blog | 缺作者确认、关键证据或隐私裁决 |
| `cancelled` | 任一侧 | 明确不再执行，或发展编辑给出 `KILL`；保留原因 |

## 队列命令

```bash
npm run briefs:list
npm run briefs:next
npm run briefs:check
npm run briefs:trace -- --file _briefs/YYYY-MM-DD-slug.md
npm run briefs:dispatch -- --brief _briefs/YYYY-MM-DD-slug.md
```

- `briefs:list`：查看所有可执行和进行中的 brief。
- `briefs:next`：按优先级和下发时间选择下一篇，但不自动修改状态。
- `briefs:check`：严格校验 `blog-brief/v1` 的字段、必填区块、隐私边界、本机路径与同 slug 重复文章。
- `briefs:trace`：按当前 brief 的精确 `source_refs` 列出相关公开 brief、状态和成品路径；只建立仓库内谱系，不读取 brain。
- `briefs:dispatch`：校验并认领指定 brief，然后用 `codex exec --ephemeral` 启动一个不继承 brain 对话的干净执行上下文。

预演 dispatch，不认领也不启动 executor：

```bash
npm run briefs:dispatch -- --brief _briefs/YYYY-MM-DD-slug.md --dry-run
```

定期自动化每次最多认领一篇。找不到 `ready` 时正常退出，不为了维持产量自行创造选题。

## 干净 executor 契约

- executor 的工作目录只能是当前 blog 仓库；不得添加 brain 为可写目录。
- executor 只接收目标 brief 的相对路径，不继承上游对话、研究草稿或 brain 全量上下文。
- `brain://` 保持为回溯标识，executor 不读取其目标。
- dispatch 前 blog 工作树除目标 brief 外必须干净，避免覆盖作者或其他任务的改动。
- dispatch 先原子认领目标 brief；同一时间存在其他 active brief 时拒绝启动。
- executor 若在认领后、正式开工前异常退出，调度器把 `claimed` 释放回 `ready`；进入 `drafting` 后的失败保留现场，等待人工恢复。
- executor 不 commit、不 push、不部署，最高只推进到 `ready-to-publish`。

## 消费流程

认领后按 [`docs/blog-editorial-workflow.md`](../docs/blog-editorial-workflow.md) 执行。几个硬约束：

- brief 是选题契约，不是可直接发布的文章；
- 不得从 `source_refs` 读取未获批准的 private 内容；
- 动笔前先扫描 `source_refs` 谱系，明确“既有判断—本次增量—后续开放问题”，没有新增量时优先更新旧文、退回上游或 `KILL`；
- 缺少作者一手增量时转为 `blocked`，不让 AI 补造经历；
- 思考型 brief 缺少足够的作者在场材料时转为 `blocked`；
- 外部研究必须区分事实、来源观点和本文推论；
- SEO、FAQ 和标题都服务于已经确认的命题；思考型文章不强制使用；
- 发展编辑可以给出 `KEEP`、`REBUILD` 或 `KILL`，不为了进入队列完成态而强行成文；`KILL` 时记录 verdict 与原因，并把状态改为 `cancelled`；
- 质量门通过后停在 `ready-to-publish`，未经作者确认不自动发布。

发布后在 brief 末尾填写“执行回执”，供上游 `retro` 使用。
