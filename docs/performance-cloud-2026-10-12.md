# Lighthouse 云端补验与定向修复（2026-10-12）

#395 保持 OPEN；旧本机实验不能替代不同视口、DPR 和运行方式的云端验收。云端基线来自源码 `9669587745849b7349e960d508b2cf48525cfca7`，三个独立运行分别为 [38213873700](https://github.com/cubxxw/blog/actions/runs/38213873700)、[38232589096](https://github.com/cubxxw/blog/actions/runs/38232589096)、[38232596830](https://github.com/cubxxw/blog/actions/runs/38232596830)。13 个 URL 各三次、39 次独立测量；重复 LHR JSON 副本不算重复测量。

固定条件：Lighthouse 12.6.1、Chrome 154 Linux、mobile 412×823 / DPR1.75、simulate、CPU4；三个报告中的完整配置逐字段相同。网络资源响应、宿主 CPU 和外部字体到达时间仍存在波动，不声称统计显著。完整分布与中位数见 [JSON](performance-cloud-2026-10-12.json)。CrUX 无足够样本，实地 p75 保持未知。

| URL | LCP 三次（秒） | LCP median（秒） | CLS 三次 |
| --- | --- | ---: | --- |
| `/` | 3.046 / 3.379 / 3.011 | 3.046 | 0.196421 / 0 / 0.196421 |
| `/zh/ai-agent/` | 4.639 / 4.603 / 2.354 | 4.603 | 0 / 0 / 0.000007 |
| `/zh/growth/` | 6.168 / 2.344 / 2.278 | 2.344 | 0 / 0.000250 / 0.000250 |
| 年度文章 | 3.654 / 15.644 / 15.552 | 15.552 | 0.083887 / 0 / 0 |

## 诊断事实与修复边界

- 英文首页的 layout-shift 审计明确关联 Space Grotesk / JetBrains Mono；截图中 motto 三行变两行、按钮两行变一行。首页 font-display 改为 optional，避免冷字体迟到后重新排版；快速/缓存字体仍可使用。[Chrome 字体说明](https://developer.chrome.com/docs/lighthouse/performance/font-display)。移动按钮固定列结构，320px 一列、375/412px 两列，不截断文字。
- 移动 AI layer 原为 SSR 空容器，模块初始化后注入 80px 卡片。现预留相同高度，原控制器、入口和聊天交互保留。本次 LHR 没有量化插卡在 CLS 中的份额，不能将所有位移归给它。
- 年度封面的 mobile sizes 原为 100vw；412×1.75=721，使浏览器选 1080 候选。实际正文列宽352px，需要616px，720候选足够。single 调用传正文 mobile gutter 公式；desktop 900px 是候选尺寸近似，不改变布局。[响应式图片说明](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images)。真实 CI 1080 WebP 恢复后像素为1080×608，源JPEG为1280×720，均16:9；LHR的1080×464不能当作已证实的文件像素异常。
- 年度长文初始请求64个本地 Noto 字体文件、约2.39MB。中文 single 先 preload CSS manifest，正文进入视口时才激活字体；正文始终由服务端完整输出。无 IntersectionObserver 或无正文时立即激活，无JavaScript使用noscript stylesheet。首屏标题和提要正文使用本地 serif，正文原 `--font-prose` 保留。正文进入视口后仍可能 font swap，不声称全页零位移；原2.39MB成本不会凭空消失，只退出未阅读正文的首屏路径。
- 两个中文分类页的首次基线实采FCP/LCP均约1.39s；模拟值4.6/6.2s不是实采延迟。lede不直接使用Noto正文栈，没有证据证明其被CJK400字体直接阻塞。三个只在single使用的系列、FAQ、分享样式从landing bundle省略；约42,192B为原CSS源码量，不是网络传输节省。保留原位过滤和后续reset/press顺序。
- Lighthouse CI固定当前LHCI0.15.1（依赖Lighthouse12.6.1）；新增默认关闭的手动diagnostics参数，使用同一安装的CLI保存两个ZH landing的JSON、trace、DevToolsLog。额外报告置独立子目录，不进入日报manifest、不会重复计数。source-sha只表示checkout，公网版本仍需实际HTML/CSS指纹校验。[官方CLI](https://github.com/GoogleChrome/lighthouse/blob/v12.6.1/readme.md)。

## 三次线上 after：有改善，也有未达标项

三个独立 after 运行是 [38236276441](https://github.com/cubxxw/blog/actions/runs/38236276441)、[38236287673](https://github.com/cubxxw/blog/actions/runs/38236287673)、[38238364289](https://github.com/cubxxw/blog/actions/runs/38238364289)，13 URL 各三次，共39；与before合计78。第一运行的13项测量成功，但可选diagnostic缺少rg使整个workflow失败，不能写成绿灯。另一个排队后取消的运行无样本，排除；额外trace诊断报告也不混入计数。全部LHR配置逐字段一致。公网四优先URL的CSS指纹及新SSR契约已与实际Hugo微型编译匹配；4905→edef仅workflow/tests变化。该渲染提交的质量运行38243423196已成功，正式artifact11746107254及四优先HTML已范围恢复并校验CRC/manifest来源。

| URL | Before LCP median〔范围〕秒 | After LCP median〔范围〕秒 | After最大CLS |
| --- | ---: | ---: | ---: |
| 英文首页 | 3.046〔3.011–3.379〕 | 3.521〔3.407–3.613〕 | 0.000000 |
| 中文首页 | 1.960〔1.884–3.673〕 | 1.984〔1.901–2.033〕 | 0.000000 |
| 中文growth | 2.344〔2.278–6.168〕 | 3.388〔2.770–5.973〕 | 0.001391 |
| 中文ai-agent | 4.603〔2.354–4.639〕 | 2.939〔2.298–2.963〕 | 0.000007 |
| 年度文章 | 15.552〔3.654–15.644〕 | 3.469〔3.222–3.598〕 | 0.000000 |

英文首页和中文growth的LCP中位数数值变慢，不能声称全面提速。宿主benchmarkIndex波动明显，未随机化，仅每阶段三次，不作统计显著或单一因果推断。英文首页三次CLS均0；年度三次CLS均0。年度before LCP元素为IMG/H1/H1，after均IMG，Linux本地字体度量使封面top约809→681px，更早进入首屏，不能把中位数差值写成同元素无条件提速百分比。封面资源三次均从60,574→34,964B，初始本地Noto字体64→0，198,751B manifest仍预加载；真实线上滚动后字体stylesheet激活且完整正文可读，字体没有删除。

## 轨迹确证的残余与安全边界

最新两个中文landing额外trace显示footer无条件menu.scrollLeft写触发首屏前同步布局：AI约49.8ms，growth约36.4ms；style重算另计。后续只在真实非零、可见、存在水平overflow时恢复位置。自然布局仍存在，不将这些毫秒直接换算成模拟LCP收益。

组合rel值使inline-critical漏掉主CSS异步转换，trace支持CSS→同步head脚本→后续解析依赖，但不能把单次慢growth的5.973s全部归给它；该慢样本没有对应trace。实际trace的lede绘制早于首个Noto字体完成，不支持“正文CJK字体直接阻塞lede”的说法。

已撤回未提交的普通stylesheet/新增文章critical候选：真实critical的inline:true采用media策略，保留原link顺序及SRI/crossorigin；然而inline-critical向body插noscript依赖行首闭合标签，Hugo压缩HTML不能匹配，且当前critical提取缺暗色/菜单展开状态。贸然异步化会引入无JS及冷暗色回归。下一步应修完整critical管线的显式fallback、状态规则与冷暗色/菜单首帧验收，然后再比较LCP；不以跑分换回归。

## 最新交付门禁

旧source的质量CI失败已定位：前两项标题字体断言完成更新；后续三引擎pilot离线测试在正文字体尚未进入视口时就冻结网络。修复在线滚动、验证stylesheet/FontFaceSet注册、真实等待fonts.ready和networkidle，再建立离线零请求/零写入baseline，保留全部断言。WebKit disclosure的单次重试失败只具有字体位移假说，未声称完全证明根因。

Pi完成冻结路由tracker，独立6个受控Promise测试和14个CI接线测试通过。保持handler注册到所有fetch/fulfill完成，纳入等待期间新callback，空状态检查到unrouteAll无await，原异常继续传递。未过滤错误、增加重试或降门禁；dcc73145完整CI成功，48质量用例、320 E2E、573三引擎交互用例通过，无flaky或Route is already handled。footer微型真实Hugo编译与TypeScript验证通过，三月长笔记未隐藏/截断，CrUX仍未知。


## 附件重跑合同修复

manual38245959170的测量任务已成功、artifact11745387438有13个有效报告；日报发布首次遇到GitHub GraphQL504。只重跑failed publisher后，其github.run_attempt变2，原producer仍attempt1，按consumer attempt猜名称查不到附件并误写日报缺证。已修measurement job输出实际upload artifact-id、publisher按该ID下载；空ID跳过publisher，下载/摘要校验失败停止sync。无跨run/旧attempt搜索fallback。真实YAML producer1→consumer2与全量rerun3回归先RED，修正后27个workflow/日报测试通过并fresh独立review；新提交CI及真实consumer重跑仍需读回。这个发布合同不改变生产页面渲染，footer后的三次测量单独记录。

长笔记预算实验已补，详见[预算实验](long-note-budget-2026-10-12.md)；不宣称压缩候选就是线上收益或DOM已经减少。
