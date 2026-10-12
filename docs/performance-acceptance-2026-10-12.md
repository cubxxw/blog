# 性能测量与首屏动画修正（2026-10-12）

> 后续云端验收发现残余：#395 已重新 OPEN。本页的 375px/DPR1 本机实验仅证明该配置下的动画候选，不能替代 412px/DPR1.75 Lighthouse 验收。最新基线与定向修复见 [云端补验记录](performance-cloud-2026-10-12.md)。

年度文章的透明入场动画使本机 Chromium 的 LCP 候选在导航和真实标题间不稳定。修正让标题/封面从首帧保持 opacity=1，保留原位移、缩放、时长、曲线、延迟与减少动态效果处理。由真实 Hugo 编译片段生成的候选，三次年度页 LCP 都是 H1：2.088/1.748/1.804 秒，中位数 1.804 秒，CLS 均为 0。候选测量与最终 CI/线上产物读回分别验收；最终交付回执绑定在 [#395](https://github.com/cubxxw/blog/issues/395)。

## 条件与来源

这是 PerformanceObserver/CDP 直接实验，不是 Lighthouse 总分、PSI 前后比较或 CrUX 实地 p75。[结构化记录](performance-acceptance-2026-10-12.json) 包含参数、源提交、全部 33 个接受样本的 SHA256、资源候选指纹与作废原因。完整样本、资源瀑布、CLS rect、诊断轨迹和首轮截图保存在本轮永久交付证据目录。

- Chrome 155.0.8059.39 headless；CPU 4×、150ms RTT、下载 200,000B/s、上传 93,750B/s；移动端 375×812/DPR1，首页另测桌面 1280×800。
- 相同本机 HTTP/1.1 origin，文本 gzip；每次新 context、禁 HTTP 缓存/service worker。至少观察 DOMContentLoaded 后 15 秒，再等待字体 loaded 稳定 5 秒，最多 60 秒；超时为未知，不强行通过。
- GTag/Analytics 双方均固定 204 隔离；外部 Google fonts 仍走真实网络。本机起始 107 个 Node/npm、11.82GiB swap，不能称安静宿主或统计显著。
- 复用 [before CI 38203455650](https://github.com/cubxxw/blog/actions/runs/38203455650) / [after CI 38203955730](https://github.com/cubxxw/blog/actions/runs/38203955730) 的冻结 production 站点：source `6514545c` / `28468371`，Hugo 0.145.0 extended；时钟相差 7m21.720s，五个核对页可见 SSR 文本 SHA256 均一致。
- 只用 ZIP 明确字节范围恢复必要文件，CRC/manifest SHA 校验，没有重新本地构建全站；所有接受样本的关键本地资源完整。

## 原性能提交的同条件三次样本

表中的“after”是 `28468371`，未包含本轮透明动画修正。

| 页面/设备 | Before LCP 秒，三次 / 中位数 | After LCP 秒，三次 / 中位数 | CLS 中位数 before → after |
| --- | --- | --- | --- |
| 英文首页 mobile | 1.132/1.056/1.036；1.056 | 1.136/1.140/1.072；1.136 | 0.024314 → 0.024314 |
| 年度文章 mobile | 1.548/1.472/2.440；1.548 | 1.428/3.072/2.556；2.556 | 0 → 0 |
| 中文 Growth mobile | 1.400/1.376/1.412；1.400 | 1.212/1.236/1.240；1.236 | 0.000628 → 0.000628 |
| 中文 AI Agent mobile | 1.316/1.472/1.308；1.316 | 1.216/1.204/1.292；1.216 | 0 → 0 |
| 英文首页 desktop | 1.248/1.080/1.088；1.088 | 1.068/1.104/1.080；1.080 | 0.002361 → 0.002359 |

首页 LCP 为 hero bio，频道为正文引导段落。年度文章混合导航 A 与 H1，不能将导航 1.5 秒当封面通过，也不能按这组中位数声称性能提交造成 65% 退化。历史 15.8 秒 LCP 和 0.212 CLS 未在现代同条件基线复现，不把历史差值归因此次优化。首页没有可信改善证据，当前已在实验目标内；频道的小幅变化不代表真实用户效果。

首页移动端 shift sources 包含 wayfinder 的 80px 位移，以及约 3.3 秒字体交换附近 bio/actions 等整体约 31px 位移。后者只是时间相关证据，尚未单独改变字体变量证明因果。CLS 使用最大会话窗口，没有将全部 shift 数值简单求和。

## 动画诊断与实际源码候选

正常动画的独立 filmstrip 在约 1.457/1.828 秒仍只有导航与空正文，约 1.937 秒仅浅色 metadata/目录，约 2.302 秒标题可读；浏览器却报告导航 LCP 1.456/1.440 秒。50ms rAF 采样中，标题从 opacity0/translateY12px 开始，约 1.96 秒才非零、约 2.52 秒完全不透明。这是 DOM 视觉门近似时间，不当作像素精确时间。

移动端封面起始 y832，在该 812px 首屏外；其 19KB WebP 已下载，但不是该配置的 LCP。单独 reduced-motion 诊断的前后各三次 LCP 均为 H1、约 1.79—1.88 秒，CLS0，不混入正常动态分布。[W3C issue148](https://github.com/w3c/largest-contentful-paint/issues/148) 是仍开放的浏览器动画候选讨论；机制结论来自本机实际 CSS、轨迹和截图，不能将讨论当规范保证。

本轮仅修两段 keyframe 的 from opacity，及标题组的 transform hint。实际 Hugo production/minify 微型编译得到指纹 `693a76a0...`；在 after 冻结产物中严格替换三个编译片段，其余 CSS 字节逆替换完全复原。HTML 只更新对应 CSS fingerprint href 与正确 SRI，SSR 文本未改。派生年度 CSS SHA256 为 `0d83ba1578b2ecec241a794b75139b8eac513e42a435365e0a0dd7c9c5ba7c1c`。

| 本轮年度候选，正常动态 | 第一次 | 第二次 | 第三次 |
| --- | ---: | ---: | ---: |
| H1 LCP（秒） | 2.088 | 1.748 | 1.804 |
| CLS | 0 | 0 | 0 |

三个样本字体均完成稳定，关键本地资源完整。独立候选截图约 1.807 秒已有清晰标题，rAF 首样本 opacity1。不能将导航转为 H1 的数值变化写成提速百分比。

额外桌面 probe 使用 1280×900，未混入上表 1280×800 的首页分布。实际响应式封面已解码（naturalWidth720），标题/封面 opacity1，SRI/stylesheet 生效，无 console/CSS/integrity 错误；悬停缩放 1.035、移开复位，reduced-motion 禁用动画与 hover。原 hover/parallax 逻辑未改。源注释更正后重新真实编译，CSS 字节完全相同；独立 review 的两项证据缺口均关闭，剩余 P0/P1/P2=0。

## 保留的边界

三月笔记仍为 8,267 DOM 元素、3,112 段落，HTML 937,353→937,173B、gzip 318,104→318,035B，正文文本 hash 一致，DOM/传输成本基本未改善。没有隐藏或截断正文来换跑分。

旧冻结产物中的外部 social preview PNG 偶有 ORB 阻断，位于首屏外；不声称整页零外部网络错误。初始 404、未等字体的旧协议、未恢复 lazy JPG 的桌面基线及封面未加载的 probe 均明确作废，未挑低值混入正式样本。

CrUX 样本不足，实地 p75 保持未知；本记录不声明生产 CWV、CTR 或排名改善。最终关闭 #395 还须确认最新真实 CI 编译 CSS/线上资源与上述候选一致，不能用派生候选替代部署验收。
