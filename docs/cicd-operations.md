# 博客 CI/CD 运维

本文描述代码中的执行边界。是否已经切换生产发布，以仓库变量、Netlify 当前配置及 `docs/cicd-migration-evidence.md` 的实际证据为准。

## 发布模式

| `BLOG_RELEASE_MODE` | 主发布 | 旧下游工作流 | 经回执验证的新下游 |
| --- | --- | --- | --- |
| 未设置 / `shadow` | 新流水线只验证；现有 Netlify Git 构建继续运行 | 保持原有 push、定时和手动业务行为 | 仅允许手动 dry-run 演练 |
| `active` | GitHub Actions 发布已验收产物 | 不运行旧 push/定时业务入口 | `BLOG_FOLLOWUPS_ENABLED=true` 时运行 |
| `paused` | 暂停 Actions 发布 | 停止 | 停止 |

`paused` 不会替你修改 Netlify 平台的 Git builds 开关。迁移或事故中必须分别核对两处状态。不要在切换前删除旧触发器；影子期保留的等待逻辑只属于旧分支，新分支完全依赖发布回执。

`BLOG_FOLLOWUPS_ENABLED` 缺失等于关闭。保留作者已有 `NEWSLETTER_MODE`，默认 `draft`；启用新的 CI/CD 不会把草稿自动升级成发送。

## 本地入口与检查结果

```bash
npm run quality:source -- --all --out tests/.artifacts/source-report.json
npm run quality:source -- --change-set tests/.artifacts/change-set.json --out tests/.artifacts/source-report.json
npm run quality:output -- --public-dir tests/.artifacts/site/public --page-map tests/.artifacts/site/page-map.json --out tests/.artifacts/output-report.json
npm run quality:test
```

`quality:source` 必须显式选择全部文件或 change-set。`--report-only` 仅用于维护报告，不能代替发布门禁。必要报告缺失、执行器异常、检查失败或异常跳过都应阻止发布。

普通文章优先检查变更文章及已有双语对应页。共享模板、脚本、样式和路由扩大验证范围。`quality:output` 使用实际 Hugo 页面映射，检查最终 HTML 的表格、本地资源、链接和锚点。

手动运行没有 Git 比较基线时，结构检查仍覆盖全文，但库存文件标为未知变更，不伪装成新写文章。已改动中文正文继续执行原有文风硬门禁；全量历史文风报告另行展示。报告会明确提示未知文风范围。

生产构建使用冻结提交、工具链和时刻，生成一次 `public/`，经过 Critical CSS 和函数打包后验收。部署必须上传同一份冻结产物。`--buildFuture` 不属于生产入口。

```bash
node scripts/site-build.mjs --target production --sha FULL_COMMIT_SHA --clock UTC_ISO_TIME --out tests/.artifacts/site
npm run site:verify -- --public-dir tests/.artifacts/site/public --page-map tests/.artifacts/site/page-map.json --change-set tests/.artifacts/change-set.json
```

CLI 参数中的提交和时间必须填入本次实际值；不要将示例占位值写入回执。纯质量检查不会发布，也不会修正文案或回推 `main`。

### 分片的测试覆盖凭据

prepare仅执行离线检查、一次生产构建和宿主测试，再上传未认证冻结输入。真实后门与可选房间检查在独立Ubuntu24.04 preflight runner下载该精确artifact执行，避免与建站任务共享临时进程和资源状态；这不等于已证实建站污染为根因。原后门三次始终运行，optional18关闭时仅其标为未请求。全部浏览器片依赖preflight成功；没有站点时preflight与browser都应跳过。verify始终核对prepare/preflight/browser三者状态，失败、取消、缺失或不符合runSite的skip全部拒绝。

preflight绑定源码、run、producer artifact ID和frozen proof摘要，前后复核全部冻结字节；后门原始JSON必须与同次列举的三个单项目唯一spec.id精确匹配、规范源码身份等于冻结单一后门，并且三次首次通过（JSON省略repeatEachIndex时仅此入口按列举ID映射三个slot，不改变全站清单），可选18按原清单全部首次通过。最终聚合下载明确的preflight artifact ID，重读rawJSON和回执，核对当前producer身份和实际执行证据。同一producer可复用先前成功预检，不按consumer attempt误拒绝；新producer不能借旧回执。不会再构建一次站点，也不改变原120分钟job、页面/旅程门限、画质、输入、trace或分片选择。

prepare 在同一冻结产物上按原配置、项目和过滤条件执行 Playwright `--list --reporter=json`，同时保存整套清单及各分片清单到 `frozen.json`。每套分片必须恰好覆盖整套清单一次，不能缺项、重复或额外混入测试。

每个消费者保存 `playwright-results.json` 原始报告和从该报告生成的 evidence；最终聚合重新读取原始报告，与包装 evidence 和冻结清单核对。空结果、无实际执行的整片、缺测试、重复身份、全片跳过、报告级错误及未完成测试均阻止认证。首次通过、flaky、跳过、预期失败和实际重试次数分别统计；既有个别跳过仍单独记录，不计为通过，也不增加豁免。

消费者仍按相同 producer artifact 和 frozen proof 复用先前成功的分片，采用每片最新 consumer attempt；较新失败不能退回旧成功。失败/取消消费者可能没有完整 JSON，只作为失败证据保留，后续成功必须提供完整且一致的原始 JSON。legacy/quality 从第一次失败保留 trace，interactive 继续保留原有失败 trace。此改动不改变发布模式、生产 artifact 格式、测试选择、worker 数或超时门限。

原生 Netlify Git 构建与隔离构建共用 `--hugo-phase` 入口。该入口的目标默认是 `production`，可由 `BLOG_BUILD_TARGET` 指定；时刻优先读取 `BLOG_BUILD_CLOCK`，缺省使用当前 UTC 时间。base URL 按以下顺序取第一个非空值：

- `production`：`BLOG_BUILD_BASE_URL` → `HUGO_BASEURL` → `https://cubxxw.com`，忽略 `DEPLOY_PRIME_URL`，避免 Netlify 的 `main--cubxxw.netlify.app` 分支别名覆盖生产域名。
- `backup` / `preview`：`BLOG_BUILD_BASE_URL` → `DEPLOY_PRIME_URL` → `HUGO_BASEURL` → `https://cubxxw.com`，保留显式备用站或预览地址的优先级。

生产域名检查仍然严格执行：选中的 URL 必须为 `https://cubxxw.com`（允许尾部 `/`）。若按上述优先级选中错误的 `BLOG_BUILD_BASE_URL` 或 `HUGO_BASEURL`，构建会失败，不会静默回退到主域名。

## 权限与凭据

生产 environment 的发布及准备 job 使用 `NETLIFY_SITE_ID` 变量和专用 `NETLIFY_AUTH_TOKEN`。构建、文章检查和普通浏览器检查不需要它们。Netlify 上的模型、订阅等运行时密钥继续留在 Netlify。

新下游只有 prepare job 持有 Netlify 验证凭据。它确认 GitHub Deployment、main 运行、run attempt、源 artifact 和当前 Netlify deployment，然后产出本次运行的不可变输入 artifact。业务 job 只下载这个精确 artifact ID，通过公开 `__release.json` 再检查 `sourceSha` 和 `releaseId`。

各业务只取得自己的凭据：Newsletter 的 Buttondown token、搜索引擎推送 token、README 的 GitHub 写权限。不要给这些 job 增加 Netlify 管理 token，也不要将全部 secrets 无差别继承给嵌套工作流。

## 发布回执与下游重试

`blog-release/1` 回执包含提交、构建输入摘要、产物摘要、发布标识、站点与 deployment ID、GitHub run/attempt、页面映射摘要、必要检查及验证状态。HTTP 200 和 main 最新提交均不能证明指定版本已上线。

主分支验证使用独立 run 并发标识，同一 PR 的旧验证可以被新提交取消；发布与回退仍串行。发布前同时检查当前源码输入与现有部署的冻结时刻，旧重跑不能覆盖同源码的较新产物。线上检查从经认证的页面映射和变更范围选页面，核对 canonical/robots、关联资源 MIME 与路由；有意返回 404 的错误页不算故障。

新入口为 **Verified release followups**：

- 正常发布由主流水线传入 GitHub Deployment ID 和源 artifact ID。
- 手动重试选择具体 Deployment ID，可选择 `newsletter`、`search`、`readme`、`lighthouse` 或全部任务。
- 手动默认 dry-run；它不会创建邮件、修改 README 或发布日报 issue。
- 未填写 Deployment ID 时，准备器查找并重新验证当前生产回执，不假设最新工作流就是线上版本。
- active 模式的补偿时刻：Lighthouse 07:30 UTC、README 08:15 UTC、Newsletter 13:00 UTC；搜索队列另在 13:10 UTC 重试未完成 URL。旧定时入口在 active 下不执行，因此不会双发。

实际通知范围来自上一次已验证生产页面映射与本次映射的差异，覆盖多提交发布、被取代的中间版本及日期到达后首次公开的文章。删除 URL 不进入新文章通知列表。

搜索服务分别在 `config/search-delivery-state.json` 保存初始迁移基线和逐 URL 已接受的内容摘要。当前版本会继续处理之前失败或被替代版本留下的未提交变更，已删除 URL 从本次队列移除。Baidu 用单 URL 请求识别准确的接受结果，每十次成功及退出前持久化进度，配额不足使任务明确失败并等待后续补偿；IndexNow 只在 200/202 后记录该批进度。两者独立执行、共用串行状态写入，状态提交不触发站点发布。

首次迁移没有更早的可信回执时，准备器明确返回 `bootstrap`，记录当前基线，不发送整个历史站点。已存在的历史证据过期、缺失或不匹配时必须失败；不得将其当作空页面映射。

```bash
node scripts/prepare-release-followups.mjs --deployment-id DEPLOYMENT_ID --artifact-id ARTIFACT_ID --out-dir followups
node scripts/release-followups.mjs assert-current --context followups/release-context.json
```

`followups/` 含回执上下文、当前和上一版页面映射、实际 URL 差异及业务状态。工作流保存 30 天。下游失败不触发重建，也不自动回退网站。

如果 artifact 过期：暂停该业务重试，保留已发送账本，恢复对应已验证页面映射及其来源证据，或重新验证当前生产部署并建立明确的恢复记录。当前命令不会绕过过期来源验证，也没有“忽略回执”或“全部重发”开关。在恢复记录获支持前保持任务失败；不要修改 JSON 状态伪造历史。

## Newsletter 的 pending 与人工核对

业务身份是语言和主站 canonical URL。发送前先向远程 main 持久化 pending 和 attempt ID；确认推送成功后才接触提供商。创建成功后再持久化 provider ID。

状态写入通过隔离 Git index 创建只含状态变更的提交，基于最新远程树；不暂存、rebase 或覆盖作者工作区。main 上无关提交会被保留，Newsletter 状态并发修改会使操作停止。

提供商超时、响应丢失、结果推送失败和进程中断都可能留下 pending。再次运行遇到它时需要人工核对，禁止自动盲重发。到 Buttondown dashboard 根据文章、语言、attempt metadata 查找邮件；确认真实 provider ID 后执行：

```bash
node scripts/newsletter-send.mjs reconcile --url CANONICAL_POST_URL --lang zh --provider-id VERIFIED_PROVIDER_ID
```

该命令只完成已有 pending 记录，不调用邮件 API、不清空未知状态。不能用虚构邮件 ID 消除失败。

```bash
node scripts/newsletter-send.mjs --dry-run
node scripts/newsletter-send.mjs --feed-base-url VERIFIED_DEPLOY_ORIGIN --release-context followups/release-context.json --state-persistence=git
```

dry-run 即使收到 API token 也不调用提供商、不查询或创建标签、不写状态、不写 Git。默认仍为最近 7 天、每次最多 3 封、按 `lang:zh` / `lang:en` 标签选受众。状态缺失时只做 bootstrap，不群发历史文章。旧 `sent` 记录及 provider ID 保留；新成功记录同时保护旧账本，避免回退旧脚本后重复发送。

## README 与 Lighthouse

README 使用固定 deploy 的中文 RSS，文章链接仍保持主站 canonical，仍只更新既有文章列表。README 更新使用独立串行组。Newsletter 的业务状态串行组保持 `newsletter-send`。

Lighthouse 在测量前后检查相同 releaseId。若测量期间发生版本替换，报告标记为不一致，原 manifest 改名保留诊断，日报发布器不应把混合版本结果当成正常证据。原质量断言、UTC report date、共享 `daily-report-publish` 串行组、模型只读边界均保持。

## Pages 备用站

备用目标使用 `config/ci-backup.yml` 和实际 Pages base URL 独立构建；不能直接上传包含主站绝对路径的产物。`canonifyURLs` 仅在备用配置启用，保留子路径中的资源和导航。

备用页全部 `noindex, follow`，默认 canonical 指向主站对应页面，保留文章已有显式 canonical。alias 仍跳转到备用站内实际页面，同时保留主站 canonical。

备用站保留文章、RSS、普通搜索与 BEAR OS。主页、文章桌面/手机、搜索、FAQ 和旅行书籍的 AI，以及邮件订阅入口隐藏；它不承载 Netlify Functions。Pages 入口已改为手动，原已部署页面继续可访问，主站在影子期仍由 Netlify Git builds 发布。历史 SHA 必须属于 main 且包含本套备用构建工具；更早版本明确拒绝，不把当前代码冒充旧版本。

```bash
node scripts/site-build.mjs --target backup --base-url https://cubxxw.github.io/blog/ --sha FULL_COMMIT_SHA --clock UTC_ISO_TIME --out tests/.artifacts/backup
BLOG_BACKUP_BROWSER=1 node --test scripts/backup-site.test.mjs
```

备用站使用常规完整 CSS，省略 Critical CSS 性能优化插件：Pages 子路径的绝对样式 URL 会让该插件读取尚未部署的远端资源。主站的 Critical CSS 仍是必需步骤。备用站完整 CLI 构建和最终部署需要独立验收；Hugo fixture 测试通过不代替这项证明。

## 每周内容审计

**Weekly content audit** 每周日 01:00 UTC（上海 09:00）及手动执行，只读、不部署、不自动发 issue、不更新基线。

报告包含三个独立部分：

1. 全站源内容 `report-only` 报告；确定性错误使维护 job 失败，但这不是生产 gate。
2. 线上公开页面抽样：固定双语代表页和每周轮换的 8 篇 sitemap 文章，375/1280 宽度、深浅色；禁止模型/订阅 API 和第三方请求。记录可读取的公开版本，旧站没有 marker 时标为 `unversioned`，不宣称已验证。
3. lychee 0.24.2 外链报告：缓存 1 天、超时 20 秒、最多 2 次重试、并发 4；第三方超时与 429 保留为观察结果，不阻断文章发布。

artifact 名称为 `content-audit-RUN_ID`，保留 30 天。先判断故障属于源文档、模板、内部资源还是第三方临时失败，再修复对应源文件。当前采用零豁免：真实错误直接修复，误报修正检测规则；CI 不生成或扩大历史例外。

## 切换与恢复

先完成离线资格检查、影子 CI、draft deploy、函数与路由证明，再关闭旧下游自动入口并保持新下游开关关闭。核实没有在途旧发布后停用 Netlify Git builds；设置 active 发布固定版本，完成主域名和 deploy ID/marker 证明后才启用新下游。

回退网站通过显式 rollback 操作恢复已有部署，不重新构建。回退与生产发布使用同一串行组，回退不发送新文章通知。遇到凭据、平台配置、旧产物证据或插件兼容性缺口时保持 shadow 或 paused，并在迁移证据中记录真实状态。

正式发布和回退从受保护的 GitHub Actions 入口运行。回退写入新的生产历史记录，并保留原始构建来源；后续发布用真实的前一个 Netlify deploy 作比较基线，不误用已被回退的版本。

```bash
gh workflow run main.yaml -f draft_deploy=true
gh workflow run netlify-build-control.yml -f operation=inspect
gh workflow run netlify-build-control.yml -f operation=pause
gh workflow run rollback-netlify.yml -f deployment_id=VERIFIED_GITHUB_DEPLOYMENT_ID
```

draft 必须返回 `draft-verified`，验证的是独立部署 URL 的版本、页面、资源与函数，不能拿“上传成功”代替，也不会生成生产回执。平台控制默认只读 inspect；pause 先保存当前部署检查点，再停止 Git builds，并检查仍在运行的原生构建。只有 `ready=true` 才具备切换条件。resume 要求 Actions 已不处于 active，防止双重发布。

首次迁移以前的原生 Netlify 部署没有本协议回执。切换前保留其平台 deploy ID 作为人工恢复点；不能给旧版本伪造 GitHub 验证记录。以后由新链路生成的已验证版本才适用上述自动验证回退入口。

### 候选房间回归预检

已知房间流程正在修复时，可手动触发 `gh workflow run main.yaml --ref codex/<task> -f room_regressions=true`。该 boolean 输入默认false；仅实际构建站点且显式启用时，在已有后门预检后、完整浏览器分片前执行一次定向诊断。GitHub输入使用保留boolean类型的 [`inputs` 上下文](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts)。

诊断固定选择九个真实用例的desktop/mobile项目（18项）：居民暂停、浏览器native/compatible连续性、quiet/reduce/resize，以及完整门禁曾失败或重试的江南远景失败后移动、boat环境恢复、时钟返回中断、猫的motion切换恢复、唱片旋转。先从producer清单确认每个目标唯一，再核对真实JSON的完整ID、全部首次通过、无skip/retry/全局错误；命令保留单worker、原页面与用例门限。清单缺项、首次失败或进程异常均阻断preflight及后续完整浏览器图。真实精确 `--list` 只用于校验选择，不算浏览器通过。

前后校验同一冻结proof，证据保存在 `tests/.artifacts/ci/room-preflight/`，由独立preflight artifact以always保留，位于发布的 `site/` 之外。summary顶层ok同时要求进程成功和严格验证，不能用嵌套通用evidence.ok或退出码替代。该阶段是诊断，原完整8片与最终认证继续执行；预检计数单独记录，不与全量独立用例分母相加。正常push/PR默认不增加此诊断成本，发布仍沿现有shadow/原生Git流程。


房间静态控件使用一次原生5秒状态等待、50ms定时轮询，再读取geometry并释放handle、执行原44px与命中守卫和实际鼠标点击。共同5秒比顺序两个独立5秒更严格；不能用同5秒Node poll替代，因为trace/协议计时边界不同。移动3D目标仍按真实投影与输入验收。两个Chromium浏览器连续性用例显式选择camera-only CDP拖动；封闭scope由最后真实PWclick同步鼠标位置，失败恢复最后原生点；单独拖动默认立即同步。真实按下/移动/释放、10次转头、逐操作30秒和旅程90秒保持，其他调用默认原路径。迟到attach也必须清理自有session。`room-native-input.spec.ts`覆盖可信事件、失败与真实30秒迟到连接，小fixture不能当实际房间、完整Linux或生产验收。

居民启动探针复用原被动motion窗口，并记录boot及其后roam绘制的首次观测时刻。一次原生30秒启动观察是更严格的共同截止，独立保留观测boot后5秒的roam要求、原12秒motion窗口、同一唯一root和所有实际输入；不是导航起30秒或现场性能达标声明。
