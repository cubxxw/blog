# 移动端性能验收与残余（2026-10-12）

#395 的技术验收通过：修复了首页 CLS、年度封面选图、两个页脚同步布局触发点及冻结网络测试的路由生命周期问题。字体优化候选曾造成 Linux 缺本地 CJK 环境下的年度中文标题/提要消失，已撤回并用原始云端截图确认恢复。**39 次有效 after 的 CLS 均 ≤0.1；LCP 未全面达到 2.5 秒。** 不声称全面提速、搜索流量改善或真实用户 p75 达标。

## 有效比较与失败候选

有效 before 为源码 `9669587745849b7349e960d508b2cf48525cfca7` 的 [38213873700](https://github.com/cubxxw/blog/actions/runs/38213873700)、[38232589096](https://github.com/cubxxw/blog/actions/runs/38232589096)、[38232596830](https://github.com/cubxxw/blog/actions/runs/38232596830)。有效可读 after 为源码 `8f23540b23c3779a89475c2025bd2efe767ecacf` 的 [38255501026](https://github.com/cubxxw/blog/actions/runs/38255501026)、[38257591174](https://github.com/cubxxw/blog/actions/runs/38257591174)、[38259103732](https://github.com/cubxxw/blog/actions/runs/38259103732)，三个工作流全部成功。每阶段 13 URL 各三次，共 78 份独立 LHR；重复 JSON 与额外诊断不计。

完整 configSettings 对 78 份逐字段相同：Lighthouse12.6.1、Chrome154 Linux、mobile412×823 / DPR1.75、simulate、CPU4、冷存储策略。所有有效 after fetchTime 晚于 `2026-10-12T13:24:37.962446Z` 的公网资源契约读回。四优先 URL 的 CSS 指纹和 SSR 契约匹配真实编译；source-sha 只表示 checkout，不能冒充生产全字节身份。[完整分布、配置、资源与检查](performance-cloud-2026-10-12.json)。

旧4905/edef的39份和DCC的39份候选 after 共78份保留失败历史。年度文字消失让 LCP 元素/几何发生变化，不能拿原3秒结果、Font0或60→35KB封面之外的误读当成功；没有用安装 runner 字体遮盖回归。旧本机 CDP 与云端策略不同，也不混入有效78份。

## 三次结果

| 优先页面 | Before LCP median〔范围〕秒 | 可读 After LCP 三次秒 | After median 秒 | After CLS 三次 |
| --- | ---: | --- | ---: | --- |
| 英文首页 | 3.046〔3.011–3.379〕 | 3.491 / 3.388 / 3.254 | 3.388 | 0 / 0.051210 / 0 |
| 中文首页 | 1.960〔1.884–3.673〕 | 1.955 / 2.123 / 1.922 | 1.955 | 0 / 0 / 0.048990 |
| 中文 ai-agent | 4.603〔2.354–4.639〕 | 2.345 / 4.717 / 4.604 | 4.604 | 0.000007 / 0 / 0 |
| 中文 growth | 2.344〔2.278–6.168〕 | 2.202 / 6.162 / 6.106 | 6.106 | 0.000290 / 0 / 0 |
| 年度文章 | 15.552〔3.654–15.644〕 | 2.817 / 15.308 / 15.390 | 15.308 | 0 / 0 / 0 |

全部39次 after 的最大CLS=0.051210；13 URL 中4个 LCP median≤2.5s，39次中15次达到。英文首页、growth和archives等数值未改善，年度长尾仍在。宿主 benchmark、网络和字体到达时间波动且未随机化，仅三次，不做显著性或单一因果结论。模拟 LCP 与实际绘制/布局耗时分别保存，不将布局毫秒换算为用户收益。CrUX 缺样本仍为未知，PSI API 配置不完整的测量保持“采集成功、比较 withheld”。

## 保留的修复与资源成本

首页 layout-shift 关联外部 Space Grotesk / JetBrains Mono、motto 行数和按钮行数变化。font-display:optional、320px一列/375与412px两列的按钮布局，以及SSR预留80px AI卡片高度保留；没有量化 AI 卡片占全部 CLS 的份额。最终首页不再宣称三次CLS都为0。

年度封面 mobile sizes 改用正文 gutter 公式，让412×1.75下实际352px内容列选择720候选。before资源60,574B，after34,964B；两阶段实际LCP元素均为IMG/H1/H1，IMG top809px、H1 top196px。封面更轻不等于两个 H1 长尾样本已经解决。真实1080 WebP文件为1080×608、源JPEG1280×720；旧LHR的1080×464不当文件尺寸证据。

标题/封面初始opacity恢复为1，位移/悬停/reduced-motion保留。取消标题/提要local-only覆写与正文IO延期注册，恢复即时同源Noto manifest和无JS stylesheet；原始final图完整显示中文标题、描述和三条提要。每轮64条woff2（400字重39条、700字重25条），全部成功，资源总量2,379,736B，与有效before相同。不能继续沿用Font0或首访节省2.39MB结论。中文分类真基线也缺系统CJK回退，Linux emulation不等于真实Android字体环境；本轮新增年度回归已修。

三个article-only样式从landing bundle省略，约42,192B只是原CSS源码量，不是实际传输节省。footer菜单只在保存非零、可见且水平overflow时恢复scrollLeft；top-link复用1024px MediaQueryList.matches，避免parser阶段innerWidth读造成强制布局。两份新trace均无原scrollLeft/updateTopLink Layout堆栈，相关脚本约0.2–0.3ms；自然布局、header测量、growth既有initMobileBackToTop仍存在。

Pi完成冻结路由tracker，跟踪整个fetch/fulfill回调、纳入drain期间新回调，空状态检查到unroute无await，保留原异常。离线测试先在线滚动并验证stylesheet/FontFaceSet、等待真实fonts.ready/networkidle，再冻结网络建立零请求/零写入baseline；不过滤字体、不吞错、不加重试降门禁。

## 残余与下一步

年度完整文章的64个字体切片成本与H1长尾仍在。两中文landing trace支持globalCSS→同步head脚本→解析依赖，lede绘制早于Noto字体完成，不能将其长尾全部归给正文字体；单次慢样本没有匹配trace时不做归因。

普通stylesheet/新增critical候选已撤回：组合rel使inline-critical漏转换，真实工具的noscript插入又无法匹配Hugo压缩HTML，提取还缺冷暗色/菜单展开状态。下一步需先修完整critical管线的无JS回退、状态规则与首帧验收，再复测；字形安全的字体方案也要保留真实中文阅读。没有把会回归的候选交付。

[长笔记预算实验](long-note-budget-2026-10-12.md) 已完成：完整HTML937,173B，静态8,263节点，正文5,546、两套TOC2,016；gzip6=321,727B、Brotli6=247,374B，全部无损。线上CDN编码未知，压缩不减少DOM。后续可实验一套SSR目录供移动/桌面入口共用；章节拆分需作者brief/canonical/旧锚点验收。正文、509标题与锚点未隐藏或截断。

## 独立验收与交付门禁

`8f23540b` 的[质量运行38253996824](https://github.com/cubxxw/blog/actions/runs/38253996824)成功：48质量、320E2E、573三引擎交互通过，无flaky或Route is already handled；字形契约、无JS/目录/SSR原有验收保留。实际site artifact11751150590的manifest和五HTML范围恢复923,938B，通过CRC及manifest SHA256校验，未声称重算整个372MB附件摘要。新中文原始截图、400/700网络及两份trace由独立代理复核，无未关闭P0/P1；另一独立代理重算78份有效统计及技术关闭资格，无P0/P1/P2。

日报publisher重跑合同也已修：producer输出实际artifact-id，consumer按ID下载，空ID跳过，下载/摘要失败停止sync，不猜consumer attempt。真实[38249703242](https://github.com/cubxxw/blog/actions/runs/38249703242)首次publisher遇GitHub504，仅重跑failed job后consumer attempt2成功复用producer attempt1 artifact11746978224、恢复有效#451；未重新测量13URL，不把GitHub故障称源站故障。长笔记预算和性能残余均明确，满足#395允许未达目标时记录原因与下一步的技术验收；不提前关闭SEO观察或实际VoiceOver任务。
