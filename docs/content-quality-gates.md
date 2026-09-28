# 内容质量检查：现有防回归与扩展方案

## 已接入：构建后的双语表格契约

`node scripts/check-content-rendering.mjs public` 在 Hugo 构建之后、部署之前执行。
已接入 GitHub Pages 构建、PR E2E、Netlify production / deploy-preview / branch-deploy。
零新增依赖；任一语言缺页、名称模板表格未生成、40 行数据被截断或列数异常，都会以非零状态阻止该构建发布。
表格增加或删除字段时，需要同步更新脚本中的明确预期。

起因：英文 GoReleaser 文章的表格分隔单元格写成 `--- ---`，Hugo 把整表当段落，构建仍成功。
中文版语法正常，表头“钥匙”改为“模板变量 / 函数”。回归检查必须验证最终 `<table>`，不能仅验证构建退出码。
此检查只覆盖这对历史故障页面，不代表全站 Markdown 或视觉质量已经被检查。

## 建议逐步扩展（尚未接入）

| 层次 | 检查方法 | 执行位置与失败策略 |
| --- | --- | --- |
| 源文件 | markdownlint-cli2：MD055、MD056、MD058；补充疑似表格分隔行、未闭合代码围栏检查 | PR 和 push 检查变更文章；检查器或配置变化时扫描全部文章 |
| 构建产物 | 本地链接、图片路径、锚点、未展开 shortcode；高价值内容设置明确结构契约 | Hugo 后且部署前；确定性错误阻断 |
| 页面表现 | Playwright 检查表格可见、宽表可横向滚动、页面本身不横向溢出、图片解码成功 | 中英各一组代表页，375px / 1280px，浅色 / 深色；共享样式变更扩大范围 |
| 外部链接 | lychee 批量检查外链 | 每周扫描，重试与缓存；429、超时、403 先报告，不阻断文章发布 |

markdownlint 的 MD056 用于已识别表格的列数一致性。损坏的表头或分隔行可能使解析器完全不识别表格，不能把规则无报错视为成功渲染的证明。疑似表格扫描需要避开 fenced / indented code、front matter、数学和 shortcode 内容，并覆盖转义竖线、行内代码及列表内表格；不要用全局正则替换文章。

接入顺序：先对存量全文做一次报告，人工确认误报；建立带文件、规则、原因的精确例外清单。新改文章阻断新增错误，历史问题分批修复，禁止为了绿灯自动重写内容。新增检查应有正常、损坏、合法特殊语法三类 fixture，并验证损坏 fixture 确实失败。

PR 的比较基线用目标分支 merge-base，push 用事件 before SHA；必须处理首次推送、删除、改名和浅克隆。GitHub 输出文件与行号注释，并上传 JSON 报告。重要的是把确定性检查也接到 Netlify 的实际构建命令：本仓库允许直接推送 main，独立的 Actions 红灯不会自动阻止 Netlify 部署。

现有 frontmatter、tags、AI 味检查继续复用。语言自然度、事实过期和错误翻译需要编辑审查；模型可提供建议，不作为无人工复核的自动修改器或发布门禁。

## 官方资料

- [Hugo 表格渲染与 GFM](https://gohugo.io/render-hooks/tables/)
- [markdownlint 规则](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)
- [MD056：列数检查及无法识别表格的边界](https://github.com/DavidAnson/markdownlint/blob/main/doc/md056.md)
- [lychee 链接检查器](https://github.com/lycheeverse/lychee)
