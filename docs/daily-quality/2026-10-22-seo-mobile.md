# SEO 与移动端字体加载优化：2026-10-22

状态：实现、定向验证与独立源码审查已完成。完整CI仍未完成；另已确认优化前main的全站门禁存在多项失败并在120分钟后取消。生产发布与线上生产读回未完成，当前不能标记已上线。

## 范围与选项

作者在本次对话要求优化实现。基线 `1bfde09c60ef5c8901635b8c081ab8704357ef0e`；原工作区Git写入受限，原生worktree工具不可用，因此使用隔离源码副本，通过已有GitHub连接交付隔离分支。保留原工作区既有output内容与并行功能。

| 选项 | 证据、影响 | 成本、风险 | 预期收益与验收 | 决定 |
| --- | --- | --- | --- | --- |
| 中文字体声明不阻塞首屏 | 原生成清单约191KB，同步stylesheet。10月22日年度文章手机PSI的LCP为14.19秒，但不能把全部延迟归因于字体；受控实验另行复现字体CSS阻塞。 | 小；需验证快/慢清单、失败与禁JS，避免阅读中换字体。 | 清单未返回时正文已首绘；迟到后段落及滚动位置不变；快速清单仍可启用原字体。 | **选中并实现**。 |
| 曝光下降的页面与查询归因 | 两个完整28天窗口曝光93,015→35,653，点击141→141；汇总不足以指认原因。 | 只读低成本；聚合方式及匿名查询可能误导判断。 | 同口径贡献分解、透明查询覆盖、可复算证据。 | **选中并完成本轮归因**；没有改作者正文或标题。 |
| Products资源与主线程优化 | 既有日检及PSI仍有失败或长任务，场景实现持续变化。 | 中；涉及BEAR默认及双向切换。 | 另行冻结版本后测量并修复。 | 暂缓，避免重叠。 |

## 实现与验证

中文阅读页的同源字体清单改为preload，保留完整性校验。首帧前成功加载可启用；若资源已完成、load事件仍在排队，首帧回调仅对HTTP200且有响应完成时序与解码字节的同一清单启用样式。不及时到达的清单仅缓存，当前阅读过程中不改排版。原字体文件、unicode-range、400/700字重及font-display:optional保持原值；禁JS仍使用直接stylesheet。

真实浏览器发现并修复过快速清单load事件晚于首帧回调的时序缺陷，加入先失败后通过的回归；另补HTTP404清单不得成为阻塞样式的红绿回归。旧字体检查验证真实快/慢分支，完整字体覆盖检查保留在禁JS场景，没有跳过门禁。

Hugo0.145.0 extended，固定时钟2026-10-22T13:00:00Z。隔离副本缺少Git历史，本地构建显式关闭GitInfo；这不是最终冻结发布产物，精确提交CI仍需执行。

| 验证 | 实际结果 |
| --- | --- |
| 原实现回归 | 首轮6项新检查在原生产产物上全部失败；排队load和HTTP404另有红绿验证。 |
| production / development构建 | 均成功。 |
| performance:check，提供预览目录 | **18通过、0失败、0跳过**。 |
| TypeScript | npm run typecheck两段检查通过。 |
| 生成SEO审核 | 595 canonical HTML、50 alias、32 curated tag URL、289精确内部跳转、49分页、433 sitemap URL，审核通过。 |
| 独立真实Chromium受控探针 | **8/8符合各自预期**，0资源缺失；三组基线、三组候选、快速清单、禁JS。不是完整Playwright套件。 |
| 本机完整Playwright runner | Chromium进程启动及本地监听受沙箱限制，未取得完整套件结果，未记为通过。 |

浏览器以实际Hugo产物离线重放，手机412×823、reduced-motion、无CPU节流。旧清单在文档提交后人为保持1500ms；候选持有到首绘与阅读点捕获后放行。三组FCP为旧1708/1572/1564ms、候选64/72/140ms。它证明阻塞依赖被移除，**不是线上LCP从14秒降至几十毫秒或搜索增长证据**。三组候选同一段落放行前后均为top419.25、scroll607、文本相同。快速清单恢复202个字体声明；禁JS恢复202个声明并实际加载标题700字重7个切片。见[browser-font-proof.json](2026-10-22-seo-mobile/browser-font-proof.json)。

## 搜索曝光归因

使用整个data/seo快照集合；10月22日单文件仅含最近三天，不能独自代表56天。固定as-of2026-10-22T12:00:00Z，严格主机cubxxw.com、web/final、响应聚合byPage。窗口08-24至09-20、09-21至10-18各28/28天完整：曝光93,015→35,653，点击141→141，CTR0.152%→0.395%，平均位置10.647→8.907。这是页面行统计，不是属性图表总量。

| 页面 | 曝光前→后 | 净减少 | 点击前→后 |
| --- | ---: | ---: | ---: |
| /engineering/posts/go-release-tools/ | 13,115→1,021 | 12,094 | 2→0 |
| /zh/growth/posts/2026-03-thought-notes/ | 11,964→2,501 | 9,463 | 10→3 |
| /engineering/posts/github-actions-advanced-techniques/ | 4,198→282 | 3,916 | 0→0 |
| /zh/growth/posts/2025-12-thought-notes/ | 4,349→1,662 | 2,687 | 1→3 |
| /zh/growth/posts/2026-01-thought-notes/ | 3,419→1,216 | 2,203 | 3→1 |

五页占净减少的52.93%，其中四页平均位置改善，不能认定全站排名下跌或降权。date×query×page也覆盖各28/28天，但返回配对曝光仅8,949→3,009，分别相当于页面曝光9.62%、8.44%。它不是完整查询总体；未返回配对不能记为零流量。需求、查询组合、抓取或索引中的原因仍待独立证据验证。

复算：node scripts/gsc-report.mjs --dir data/seo --start 2026-08-24 --end 2026-10-18 --as-of 2026-10-22T12:00:00Z --host cubxxw.com --summary-response-aggregation byPage --include-query-rows。页面贡献复算使用buildReport的pagesLimit/pairsLimit/rowsLimit各100000，避免展示上限截断。见[gsc-attribution.json](2026-10-22-seo-mobile/gsc-attribution.json)。Google索引版本与同条件GSC界面核对仍待真实读回。

## 发布与回滚

分支codex/seo-mobile-loading-20261022，从远端0869043d575761c1ac6b3b915037fe674c76fdac创建；七个已有变更文件的远端blob均与本地基线相同。精确提交、独立审查、CI、部署与线上指纹在实际完成后追加。完整门禁未完成前不合main；失败继续修复，不回退其他任务的并行提交。当前没有发布成功或线上排名改善结论。

### 交付进度（2026-10-22 22:01，新加坡时间）

- 精确提交8bb71d9c0fa40295a2c41ecc9b9a58bb916d363a，已提交[PR470](https://github.com/cubxxw/blog/pull/470)，12个文件，未合并、未部署。原生Codex附件接口不可用，PR可通过链接查看。
- 独立审查逐行核对最终runtime、模板和回归，未发现确认P0/P1/P2。绑定blob分别为9e71962f69ed51f9a2541d43facc9d7104871b2d、7b872490fa830fd3eac3f2024d0e2100401dfb83、694ec6074934fbb8530ee7098a8b9af94e716dcb。
- [完整质量门禁39790850563](https://github.com/cubxxw/blog/actions/runs/39790850563)正在运行Enforce checks and verify one production artifact，尚无完整结果。本地最终生产/预览定向检查18/18通过、0跳过，TypeScript及生成SEO检查通过；这些不能替代云端全套验收。
- 又核对到[10月20日上线续验](2026-10-20-release.md)中的历史Google记录：Go Release与三月随想当时均PASS/Submitted and indexed，自canonical一致，robots ALLOWED、INDEXING_ALLOWED、抓取SUCCESSFUL。对应检查[39399986976](https://github.com/cubxxw/blog/actions/runs/39399986976)、[39400292637](https://github.com/cubxxw/blog/actions/runs/39400292637)运行成功；最近抓取分别为10月17日15:10:18Z、10月14日21:21:51Z。这不是当前实时页面检查，也不能证明整个历史窗口没有索引变化；目前没有依据把曝光下降归因于这两页已脱离索引。

### 补充验收与具体阻塞

- 补做412px手机与1440px桌面、明暗主题共4个真实Chromium重放场景，4/4通过，无横向溢出，迟到清单前后阅读点一致。见[browser-font-themes.json](2026-10-22-seo-mobile/browser-font-themes.json)。
- [Netlify在线预览](https://deploy-preview-470--cubxxw.netlify.app/zh/growth/posts/2025-annual-review/)返回200，包含本轮精确运行时代码、正确SRI和预览noindex/nofollow。在线扣住字体CSS仍可首绘；放行并返回200后仍保留preload，未在阅读中启用。这个单次非受控网络FCP不作为线上性能收益证据。见[preview-font-proof.json](2026-10-22-seo-mobile/preview-font-proof.json)。这不是正式站上线验收。
- 发现冻结产物CI直接执行performance-seo.test.mjs，不经过npm脚本。因此该入口显式导入reading-fonts.test.mjs，npm脚本恢复单入口，保证新增8项回归进入真正门禁并避免重复。接线后重新运行18/18通过、0跳过；独立复核无P0/P1/P2。接线blob为bd83c192b59efb8fc6f93521509bcbe14c712699，package.json恢复为41be432dc38f9fc05821913de69eda166df0b766；runtime与模板未改。
- 优化前main提交1bfde09c的[既有门禁39775469549](https://github.com/cubxxw/blog/actions/runs/39775469549)在2026-10-22T14:07:34Z记为cancelled。日志先运行48项quality，再以单worker运行1056项legacy；搜索状态及BEAR场景有多项失败和重试，约120分钟后The operation was canceled。没有完整最终测试计数，不将部分通过记为全套通过。摘录见[baseline-ci-blocker.json](2026-10-22-seo-mobile/baseline-ci-blocker.json)。这说明合并前已有全站门禁问题，不能代替本候选的CI结论，也未修改并行BEAR实现或跳过用例。
- 尝试设置GitHub自动合并，服务返回Pull request is in unstable status，未启用。保持PR开放，未绕过门禁强制合并。本轮需要完整候选CI通过后再走现有main/Netlify发布链，并核对实际生产部署版本与页面指纹；这些仍未完成。
