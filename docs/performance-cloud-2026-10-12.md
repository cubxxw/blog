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

## 尚待本轮交付验收

源修改通过独立静态审查，确认的series选择器测试缺口已修复。旧真实产物在optional字体/landing排除断言上失败，构成回归基线；缺失fixture资源不作为RED。新增浏览器用例暂停真实home module，验证预留高度及聊天增强；另验320/375/412按钮和中文正文font启用。Frozen E2E屏蔽外部字体，不替代真实云端字体冷/热加载和LCP证明。

仍须等待最新提交真实CI、生产部署读回与同条件三次after报告；未运行的项目不写通过。若LCP仍未达2.5s，记录具体残余、trace证据与下一步；不得只凭workflow绿色、旧源码样本或总分上升关闭#395。三月长笔记的完整正文和DOM成本未被隐藏/截断，本轮也未声称解决其传输预算。
