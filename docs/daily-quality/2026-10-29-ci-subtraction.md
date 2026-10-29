# 2026-10-29：精简博客 CI/CD（GET-309）

作者明确要求深度移除繁重、冗余的自动测试和 CI/CD。选择直接缩减日常门禁，保留 Netlify 原生 Git 发布与关键内容检查。没有修改页面布局、文章、浏览器断言或服务凭据。

## 证据与选择

生产 Netlify 部署记录仍是原生 Git 构建；仓库与 production environment 未设置 Actions active 切换变量。原 Actions shadow 图却重复生产构建、房间预检和广泛浏览器验证，未参与实际生产发布。运行 `40819169261` 在本次操作时仍停留于 prepare；已精确取消该旧版 shadow 运行，没有终止生产构建。

| 选项 | 证据 / 收益 | 成本 / 风险 | 决定 / 验收 |
| --- | --- | --- | --- |
| 日常只做源文件检查，Netlify 唯一构建发布 | shadow 构建重复；广泛图有 20 个浏览器分区 | 失去每提交自动浏览器/性能覆盖 | **选中**：一个 5 分钟上限 job；手动诊断保留原断言 |
| 保留全图但减少分片 / 重试 | 能减少 runner 数 | 仍会每次安装浏览器、构建并跑全套 | 暂缓：不符合作者深度减法的目标 |
| 删除所有检查 | runner 最少 | 无法尽早发现内容语法/元信息错误 | 暂缓：四依赖的源检查开销足够小 |

## 配置前后计数

基线 `85737d78899f90f5135657693b572a35dfac9452`。以下是代码和 lockfile 的精确计数，**不是耗时或费用预测**。

| 项目 | 之前 | 之后 |
| --- | ---: | ---: |
| 共享前端修改的自动质量 job 数（不含被跳过的 release/followups） | 23 | 1 |
| 自动浏览器分区 | 20 | 0 |
| CI 安装的锁定依赖条目 | 1,529 | 60 |
| workflow 定时 cron 条目 | 12 | 3 |
| workflow 文件 | 28 | 26 |

纯文章之前只选择较小的内容浏览器范围，不能把 23-job 基线套用到每种提交。现在 PR 与 main push 均只执行源检查；合并后仍有独立 Netlify 真实构建。

移出的自动入口：Lighthouse push/cron、搜索预览 push、周内容审计、每日 SEO 分析/建议和旧 shadow followups 补偿 cron。删除旧 GoReleaser/Docker 包测试、release PR 机器人、每日主题 PR；README 保留每日一次。保留 Newsletter/搜索投递、SEO 原始观测采集，邮件任务移除发送前重复单测。

Netlify ignore 在 production/PR 中只跳过已知非站点变更。测试覆盖混合站点改动、未知路径、缺失/无效历史、非祖先、重命名两端和带空格路径；这些不明或站点变更继续构建。实际 PR 创建后，平台记录显示同一 `221b0d09` 同时创建 branch-deploy `6ae2d137e68c5e11a93cb780` 和 Deploy Preview `6ae2d14ae55dd637ca6f6c7b`；因此另外跳过自动 branch-deploy，保留 PR 预览和生产构建。需要单独分支预览仍可显式用 build hook。原生 Hugo、Critical CSS、函数打包、渲染和生成 SEO 检查保持现有发布链。

## 本地验证

- 四依赖独立安装实际成功：60 packages，未下载浏览器或 Netlify CLI。
- `node --test scripts/ci-light.test.mjs scripts/netlify-ignore.test.mjs scripts/ci-workflows.test.mjs scripts/ci-room-preflight.test.mjs scripts/release-followups.test.mjs scripts/seo-pipeline.test.mjs scripts/seo-autofix-gate.test.mjs`：初轮 142 通过、0 失败、0 跳过，约 4.5 秒；补充分支部署重复构建规则后 143 通过、0 失败、0 跳过。
- `node scripts/ci-light.mjs` 缺失基线分支：408 篇结构检查、0 错误、266 条建议；JavaScript 语法、workflow YAML 和 diff 检查通过。建议项没有伪装成错误或静默修文。
- 校验官方校验和的 actionlint 1.7.12：所有 workflow 通过；`git diff --check` 通过。
- 未在本机跑整站构建、浏览器、视觉或 Lighthouse；部署构建由实际 Netlify CI 验证。

## 交付证据位置

本文件记录提交前的配置与本地结果。独立审查、关联 PR、最终提交 CI、合并 SHA、Netlify deploy ID/commit_ref 和实际线上读回结果，持续记录在 [GET-309](https://linear.app/getyak/issue/GET-309/simplify-blog-cicd-and-remove-expensive-automatic-tests)，以该任务的实际回执为准。源检查通过不等于已经部署，手动全量图也不会发布生产。
