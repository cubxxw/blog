# _briefs/ — 来自 brain 指挥部的任务卡收件箱

这个目录存放**上游知识库 brain**(`~/data/mine/brain`)下发的创作任务卡(brief)。

## 这是什么

brain 是「信息→记录→知识→创作」框架里的**知识层 + 指挥部**:在那边想清楚「写什么、什么角度、给谁看」,装配好 Brand Voice 与博客 playbook,产出一份 `brief`。本仓库是**执行层**——收到 brief 后,由这里的 Claude/Codex 按 **本仓库的 CLAUDE.md + 博客规范**把它写成真正的博客文章。

## 怎么执行一份 brief

1. 读 `_briefs/` 下最新的(或指定的)`YYYY-MM-DD-<slug>.md`。
2. brief 给的是**目标 + 方法论约束 + 一手增量**,不是成品。按本仓库的 GEO 结构、frontmatter 约定、Answer-First 规范**原生重写**成 `content/zh|en/…` 下的文章。
3. **不要把 brief 原文粘进文章**——brief 是给你的指令,不是内容。
4. 完成后按 brief 末尾的验收标准自检。
5. brief 执行完可移入 `_briefs/done/` 或按需归档(不影响构建,该目录不进 Hugo 内容管线)。

## 边界

- brief 里的方法论来自私有 brain,**消化后落地**,不直接对外暴露 brain 原文。
- 一稿多发是红线:每篇按博客平台原生写,不套用其他平台的成品。
- 战绩回流不在这里做——发布后由本人回 brain 用 retro 记录。
