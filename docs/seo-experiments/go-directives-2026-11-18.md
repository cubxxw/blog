# Go 指令教程：修复可复现的命令错误

> 11月24日状态：PR533已在外部合并并进入生产，本轮补齐真实验收。下文草稿/待许可属于历史事实，最新版本和Google效果边界见文末续验，不能继续把旧pending当当前状态。

[GET-563](https://linear.app/getyak/issue/GET-563/fix-the-mockgen-commands-in-the-go-directives-tutorial)复用原候选，关联[草稿PR533](https://github.com/cubxxw/blog/pull/533)。主要页面为[英文Go指令教程](https://cubxxw.com/engineering/posts/directives-and-the-use-of-automation-tools/)，同时修正中文既有页。**源码、真实Go回归、CI和不可变预览已通过；尚未获得这两页的文章发布许可，未合并或上线。**

## 页面与查询基线

新窗口为2026-09-20—10-17与10-18—11-14，各28个完整计划日期；asOf为11月18日12:10:42.459 UTC。选择主站精确hostname、Web/final、响应聚合byPage，原请求和逐日来源保留。11月17日快照完整请求只到11月14日，availability探针的11月15日不代表页面/查询采集完整。[证据](../daily-quality/evidence/2026-11-18/search-evidence.json)

| 精确canonical页面 | 前窗曝光/点击/CTR | 当前曝光/点击/CTR |
| --- | --- | --- |
| 英文 | 237 / 1 / 0.42% | 219 / 0 / 0% |
| 中文 | 21 / 0 / 0% | 8 / 0 / 0% |

英文可见配对中，`golang directives`为14曝光/0点击、`go directives`12/0、`go compiler directives`11/0；`what does go generate do`仅1/0。它们支持核对指令教程的用途，不能虚构Mockgen安装词的搜索量或把零点击归因于命令错误。中文精确查询未返回，保持未知。当前10个fragment页面行和25个fragment查询配对单列，不折入219/8。

478/434个返回页面与1085/622个查询配对在5000展示上限内未截断；匿名查询、Google内部行限制和全量覆盖仍未知。设备/国家未替换无过滤分母。最初调查的319→219属于旧窗口，不能与本次237→219混用。

## 最窄修改与真实回归

原英文命令`gogenerex`、中文`go generatex`分别真实退出127/2，未生成mock文件。候选统一为`go generate`，将CLI安装改为`go install github.com/golang/mock/mockgen@v1.6.0`，并用`go get github.com/golang/mock/gomock@v1.6.0`声明模块运行依赖。

[Go官方说明](https://go.dev/doc/go-get-install-deprecation)区分版本化安装命令与当前模块依赖；[原golang/mock仓库](https://github.com/golang/mock)已归档，其当前README也提供v1.6.0安装命令。候选保留原库和固定版本，只补PATH及归档说明，不顺带迁移其他库或宣称持续维护。

标题、摘要、开篇、原发布日期、路由、全部标题/锚点和其他代码保持。仓库MarkdownIt完整解析为ZH30/EN29个fence，各仅2块变化，另28/27块原样保留。[源码保真](../daily-quality/evidence/2026-11-18/source-preservation.json)

候选head为`46c2d83ee7b492fd1e4a23138f0d958edd9b2a40`，基线`c64bec77367326309e6cadbfa433c36f1bf749a0`。Go1.26.6/darwin-arm64、Mockgen v1.6.0，字面安装本轮16.154秒退出0；两个原拼写负例复现后，两语真实生成、编译和调用gomock expectation各1测试通过，0失败/跳过。14条命令包括2个预期负例，不是14项测试或全篇指令认证。[回执](../daily-quality/evidence/2026-11-18/go-example-validation.json)

11月16日安装240秒超时、生成执行0及当时安装输出未保存仍保留；本轮成功不抹去旧失败，也没有关闭校验和服务或修改共享依赖。

## CI、预览与剩余边界

精确head的[源码CI44302911108](https://github.com/cubxxw/blog/actions/runs/44302911108)成功，为现行轻量检查，不继承旧冻结全站图。不可变预览`6afd97f386444a72b551aa84`绑定同head，实际双语HTML全部pre、旧ID、标题/摘要及语言路径通过，每语仅对应2块pre改变。[预览回执](../daily-quality/evidence/2026-11-18/preview-acceptance.json)

预览按既有Netlify配置使用`DEPLOY_PRIME_URL`，其canonical/hreflang为精确PR533域并声明noindex。实际GET一直读取部署ID地址，不读取可变alias；路径比较保留这种环境差异。生产仍要求精确自canonical，不能说两个环境的原始URL相同。

首次HTTP观察器错误要求生产canonical而退出1，原HTML/日志保留，未完成整语比较；修正后第二次退出0。生产站点/已发布部署绑定P2已关闭；新fixture首次helper名错误导致2个AttributeError，修正后4方法、2正例及10负subcase通过。这些均为观察器/宿主验证，不是浏览器用例。[原失败](../daily-quality/evidence/2026-11-18/attempts-and-limits.json)

当前生产仍为`62b2f54c`/`6af6cd3c`。本轮留存raw的36原生产旅程均在该次attempt0通过，只属于这个版本，不认证候选上线。取得针对PR533的文章许可后，须fresh main整合、必要增量review、新head检查/预览、正常合并，再核Netlify生产source、双语真实HTML/命令和适用原日检；完成后才关闭实施issue。

候选未部署，Google采用新版抓取、首个完整效果日和T14/T28均未知。部署后也须先观察新版crawl，再按洛杉矶日期冻结完整效果窗口；不反复索引提交，不因预览或测试通过宣称点击增长。回滚只撤本次命令、相邻说明/引用及lastmod，不回退并行内容。

日检另有较早一次同输出目录日志但raw缺失，两次运行重叠；只认证选定raw中的36项attempt0结果，不称整轮唯一首次或受控性能环境。[原件归属](../daily-quality/evidence/2026-11-18/daily-run-provenance.json)

## 2026-11-22 续查

原PR533仍为同一`46c2d83e`草稿；11月19日最终回复已正式询问该页发布许可，此后没有该页批准，不重复催问。本次只交付报告和观察登记，不发布文章，不因文档合并关闭GET-563。以上“当前62b”属于18日执行时点；22日实际生产已为其他已发布内容的`d2b572b9`，不能把旧日检认证转给新版本。

最新完整28+28背景窗口为9月24日—10月21日与10月22日—11月18日：EN217曝光/1点击→224/2（CTR0.89%），ZH18/0→7/0。EN实际配对`golang directives`14/0、`go directives`11/0、`go compiler directives`10/0、`what does go generate do`1/0，返回查询点击和仍为0；不能把页面2点击分配给这些词，也不能归因未上线候选。[新原数](../daily-quality/evidence/2026-11-22/search-summary.json)

新只读[44944360194](https://github.com/cubxxw/blog/actions/runs/44944360194)中EN crawl为11月20日09:40:09Z、ZH仍11月7日00:55:01Z，均PASS/自canonical；这是生产旧教程的抓取，不是PR533已发布的证据。[结果](../daily-quality/evidence/2026-11-22/inspection-summary.json)。候选效果起点仍未知，原Go真实生成、不可变预览与失败证据保持，不重复构建候选。

## 2026-11-24：已部署修复的生产验收

原[PR533](https://github.com/cubxxw/blog/pull/533)于11月23日06:11:14Z由外部账号kubbot合并，真实merge为`8f1e502b1b1d56d91ce8bd481b511a32c821abd2`。本轮只验收已发布内容，没有再次改写或发布，也不把外部动作追认为本轮新增作者批准。历史授权问题不再阻止读回已存在的生产版本，但不扩大未来内容授权。

实际生产`1f89780016c61290571a751d9f85872715537b8d` / Netlify `6b03e55d1ab3b7f8ee076701`于23日07:06:45.264Z ready。双语文章blob与原审查head46c及merge8f精确一致；实际EN29/ZH30全部pre、标题摘要、旧ID、自canonical和语言映射通过。原36日检实际首过36、0失败/重试/跳过，前后同一部署；22页HTTP SEO抽样无问题。完整范围、CI、原失败和性能限制见[24日日报](../daily-quality/2026-11-24.md)，不借旧预览或旧生产绿灯认证新版本。

新完整28+28窗口9月26日—10月23日→10月24日—11月20日，EN页面217/1→218/3（CTR0.46%→1.38%），ZH17/0→7/0；英文12个可见查询配对合计51曝光/0点击，中文查询未返回保持unknown。`go directives`11/0、`go compiler directives`9/0、`go directive`6/0；不能把页面3点击归给缺失查询。[页面与真实配对](../daily-quality/evidence/2026-11-24/search-summary.json)

只读[45257992438](https://github.com/cubxxw/blog/actions/runs/45257992438)精确35f/attempt1成功，原ZIP/CRC/SHA和2个响应身份已核。EN crawl仍20日09:40:09Z、ZH仍7日00:55:01Z，均早于23日部署；没有重提索引，首个新版抓取、完整效果日、T14/T28保持unknown。该API仅索引版本状态，不提供Google保存正文或搜索标题采用证明。[实际结果](../daily-quality/evidence/2026-11-24/inspection-summary.json)
