# 博客 CI/CD 运维

2026-10-29 起，生产继续由 **Netlify Git builds** 构建和发布。Actions 的重复站点构建、房间预检、20 个浏览器分区及汇总不再自动运行。此前 shadow 发布迁移未完成；没有切换发布平台。

## 日常提交

`.github/workflows/main.yaml` 保留一个 `Required blog quality` job，最长 5 分钟。同一 PR 或分支的新提交取消旧检查。

- 修改的文章及已有双语对应页：检查 Markdown 结构、front matter、上海时区和规范标签；文风硬检查只检查本次修改的中文文章。
- 标签/内容规则变更或缺失比较历史：扩大到全部内容结构检查。
- 修改的 JavaScript：检查语法；所有 workflow：解析 YAML；检查本次 diff 的空白错误。
- 只安装 `tools/ci` 的四个解析依赖，不安装 Hugo、Netlify CLI、Playwright 或浏览器；不运行全量单元测试、截图、性能或跨浏览器矩阵。

Netlify 负责一次真实站点构建、Critical CSS、函数打包、渲染与生成 SEO 检查。PR 只生成 Deploy Preview，自动 branch-deploy 用 `ignore = "exit 0"` 跳过，避免同提交构建两份预览；需要单独分支部署时可显式使用 Netlify build hook。production/PR 的 ignore 命令只跳过已知文档、测试、workflow、brief 和投递账本/SEO 观测数据变更。站点输入变化、混合改动、重命名的原路径、缺失历史和未知路径仍构建；`0` 表示跳过，`1` 表示继续构建。[Netlify ignore 语义及 build hook 例外](https://docs.netlify.com/build/configure-builds/ignore-builds/)

保持检查名不变，不在整个 PR workflow 上使用路径过滤，避免必需状态一直 pending。[GitHub 必需检查说明](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/troubleshooting-required-status-checks)

## 按需诊断

```bash
# 很重：明确需要整站浏览器/交互回归时才运行
# 结果仅作诊断，不能作为新的 Actions 生产发布凭据。
gh workflow run full-checks.yml --ref <branch>
# 额外房间回归
gh workflow run full-checks.yml --ref <branch> -f room_regressions=true
# 性能测量与站点完整审计均为手动
gh workflow run lighthouse.yml
gh workflow run content-audit.yml
# SEO 分析及建议扫描按需运行；原始 SEO 观测采集继续每日运行
gh workflow run seo-analyze.yml
gh workflow run seo-autofix.yml
```

全量诊断仍然验证冻结产物、测试清单与各分区回执，保留原断言；没有 release 或 followups job，产物保留 7 天。已有本地 `npm run quality:test`、`bear:test`、`ux:test`、`voice:test` 和各 Playwright 命令仍可按改动范围选择。`search-preview.yml`、`seo-contracts.yml`、`e2e.yml`、静态 Pages 备站仍为手动工具；搜索预览诊断须先有对应提交的 PR Deploy Preview（或显式构建的分支预览）。

Lighthouse 不再随 push、每日 cron 或 release followups 的 `all` 自动执行。内容审计、SEO 分析/建议和旧迁移 followups 的定时入口也已移除。Newsletter/搜索投递及 SEO 原始数据采集继续原业务入口；邮件任务不再每次发送前运行整套单元测试。README 只保留每天一次更新和手动入口。

删除了不属于 Hugo 博客发布的旧 GoReleaser/Docker 包测试、release 分支 PR 机器人和每日更新主题机器人。

## 发布、读回与回退

1. PR 的轻量检查和适用 Netlify deploy preview 完成后正常合并。
2. 在 Netlify 部署记录中核对 `commit_ref`、`state=ready`、production context 和发布 URL，再读回实际页面。轻量 source job 成功不代表已部署，也不证明浏览器/性能验收通过。
3. 回退原生 Git 发布时，在 Netlify 选择已验证的历史 production deploy 重新发布；暂停后续构建以免立即覆盖回退。

旧 `release-netlify.yml`、`rollback-netlify.yml`、`netlify-build-control.yml` 和相关回执代码保留用于历史迁移恢复，已不被主 CI 调用。旧 `BLOG_RELEASE_MODE` / `BLOG_FOLLOWUPS_ENABLED` 仍影响旧业务兼容入口，不要把它们设为 active 来启用新发布；重新切换须单独设计验证。历史回执不能冒充当前 Netlify Git deploy。

## 本次验收

实现、针对性测试与实际 PR/CI/部署记录见 `docs/daily-quality/2026-10-29-ci-subtraction.md`。自动浏览器/视觉/性能覆盖已按作者要求移出日常门禁；本次未修改页面布局、文章或浏览器断言。
