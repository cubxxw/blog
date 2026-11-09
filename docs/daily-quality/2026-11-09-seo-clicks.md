# 2026-11-09 搜索点击：Figwright 页面试点

本轮按作者明确要求推进[GET-463](https://linear.app/getyak/issue/GET-463/figwright-搜索点击试点明确入口补齐连接步骤并验证上线)，先修有真实查询证据的页面入口，再将后续SEO优先级改为搜索点击。与当天既有木纹维护日报分别记录。

## 选择与依据

| 选项 | 证据与影响 | 成本 / 风险 | 预期收益与验收 | 决定 |
| --- | --- | --- | --- | --- |
| Figwright标题、开头和连接入口 | 英文页229曝光/0点击，其中figwright162/0；原文定义较深，无可用安装配置 | 小到中；可能误读品牌词意图，内容组合变化无法单独归因 | 读者能立即识别用途、找到官方入口并开始连接；文档门禁与线上读回，后续重新抓取后的28天点击观察 | 选中 |
| 仅改标题与description | 能改变页面声明，但仍缺安装与读取路径 | 小；可能形成标题承诺与正文落差 | 需要先补足承诺对应的内容 | 暂缓单独实施，纳入上项 |
| 继续站内搜索、木纹或非阻断CI维护 | 有已有维护证据，未证明它们阻断目标查询访问 | 成本不一；占用获客调查时间 | 单独维护验收，不能当搜索增长 | 本轮不选 |

基线、搜索采样、来源、意图置信度与版本范围见[实验登记](../seo-experiments/figwright-2026-11-09.md)。原文URL、发布日期和主体作者表达保留，中英文同步。

## 本轮验证记录

状态：页面修改已上线并完成真实HTML读回，Google已接受两页索引请求；实际重抓取和搜索点击效果仍待后续观察。

已核对上游v0.7.0的README、包版本与Node engines、发布资产，以及本机`codex mcp add --help`命令格式。没有执行会修改用户Codex配置的安装命令，也没有将文档核查写成真实Figma插件操作成功。

本次只改普通Markdown、文章元数据与执行文档，适用文档源检查和线上HTML核验。不改共享渲染、模板、首页布局或自动修改门禁，不启动本地全量Hugo和全量E2E。

初版`1d2a5367`已实际部署，main质量检查[42551454684](https://github.com/cubxxw/blog/actions/runs/42551454684)成功。首次线上核验保留失败：检查器没有考虑YAML折叠摘要的末尾换行和模板的站名后缀；同时实际英文标题在既有50字符模板上限处被截断。按拥有行为的`layouts/partials/seo.html`核对后，摘要只规范首尾空白，标题检查仍要求完整标题加站名。英文文章标题缩为50字符，保留Figwright、免费Figma、安装和设计系统四项含义，不改共享模板；复验以该修正的最终部署为准。

| 环节 | 实际结果 |
| --- | --- |
| 最终产品提交 | `5a0673739f6732696a661da65fabb06fca58aa70`，正常推送main；没有创建PR |
| 当前提交质量检查 | [42552142482](https://github.com/cubxxw/blog/actions/runs/42552142482)，Required blog quality成功 |
| 可信生产 | [Netlify 6af132641f653ac8bf072d61](https://app.netlify.com/projects/cubxxw/deploys/6af132641f653ac8bf072d61)，source精确为5a067373，ready，2026-11-09 10:42:28新加坡时间发布 |
| 文档源检查 | front matter、tags、diff检查通过；显式中文文章风格检查0错误/0警告；当前提交轻量检查2篇文章0错误/0建议 |
| 配置与原文保护 | 两篇新增JSON各1块均解析，固定包版本一致；每语言原有20条源码标题行保留，原发布日期不变；插件ZIP实际manifest存在并标为Figwright |
| 独立审查 | 首次发现客户端启动/批准步骤P2，双语补齐后关闭；缩短英文标题的增量审查通过，无剩余重要问题 |
| 生产HTML | 两页均直接200；每页21项字段/内容检查全通过，另有两页sitemap lastmod检查通过。这是HTTP/HTML核验，不冒称浏览器交互测试 |
| 内容与索引声明 | 完整文档/OG/Twitter标题及摘要、实际配置和命令、客户端启动、插件/读取步骤、新旧版本边界、canonical、en/zh/x-default、索引许可与新增锚点均通过 |
| 实际未执行 | 本地全量Hugo、全量E2E与真实Figma插件安装/画布操作未执行；正式页面构建由Netlify完成，文章源检查与文档核查不替代真实插件操作 |

便携证据：[当前CI](../seo-experiments/evidence/figwright-2026-11-09/ci.json)、[可信生产](../seo-experiments/evidence/figwright-2026-11-09/platform-after.json)、[最终HTML核验](../seo-experiments/evidence/figwright-2026-11-09/live-readback.json)、[配置与标题保护](../seo-experiments/evidence/figwright-2026-11-09/source-verification.json)、[首次核验失败](../seo-experiments/evidence/figwright-2026-11-09/live-readback-first.json)。完整HTML、截图和风格检查保存在本轮本机证据中，账户界面截图不提交公开仓库。

回滚只撤销本轮定向文章变化及相关入口规则，不回退并行工作。若只回滚内容，保留失败与观测证据。后续交付本日报与证据属于文档提交，不能把现有Netlify ignore跳过写成一次新产品部署。

生产核验后，使用已有登录的Google Search Console分别检查英文及中文URL，并各提交一次请求。两次均实际返回“Indexing requested / URL was added to a priority crawl queue”，[操作结果](../seo-experiments/evidence/figwright-2026-11-09/indexing-requests.json)已留存。没有重复请求、改索引设置或扩大账户权限；进入抓取队列不代表抓取完成。下一次每日任务先读取新版抓取时间，确认后才开始完整效果窗口。

## 后续执行入口

仓库规则及[优先级文档](../seo-growth-priorities.md)明确查询和页面先行、候选为空继续调查、维护单独记账。已读回Mac mini现有`e2e-seo`任务：ACTIVE，每天新加坡04:00，原提示明确要求每轮先读AGENTS、CLAUDE及当前main的最新日报入口。因此本轮通过这些实际必读文件落实新优先级，保留原时间及聊天绑定。

定时任务提示正文的直接更新未成功：自动化工具无法验证远端原聊天，且接口不支持hostId；原生Codex界面访问也被工具拒绝。没有改写底层定时配置或新建重复任务。该限制不冒称为提示正文已更新；后续从本轮新增规则和README入口执行。后续首要验收是重新抓取及完整观察窗口，不能在本轮声称点击已提升。
