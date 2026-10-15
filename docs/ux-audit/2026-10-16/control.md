# 全博客体验逐项优化控制记录

用户于2026-10-16授权：使用 frontend-design，三个Agent分别盘点、执行、评分建议，持续迭代至**2026-10-16 12:00 Asia/Shanghai（UTC04:00）**。每项按钮/功能96+为目标，必须按固定量表和真实证据报告，不能保证主观分数或给未测试项高分。

## 唯一工作区与安全基线

- 源码：`/Users/cubxxw/.local/state/pi-delegate/tasks/20261015-210720-6087ab60/worktree`
- 当前分支：`codex/blog-experience-20261016`
- 已验证前序checkpoint：`6d7b9fe9`（终端、真实首帧、咖啡室内、小猫及独立验收）。主线main仍是旧版，不回到main覆盖本轮工作。
- 前序正式证据：`docs/acceptance/2026-10-15-space-onboarding-local.md`，185 Node、28 desktop/mobile E2E及专项回归；不把前序证据外推至这次全站的全部状态。
- 预览构建：`/Users/cubxxw/.local/state/pi-delegate/tasks/20261015-210720-6087ab60/preview-site`。先检查1317端口并复用；停掉的旧进程不代表构建不存在。
- 不推送、建PR、合并或部署；不改公开文章原文、模型供应商/凭证或私人数据；不真实提交订阅/联系/分享/付费AI调用。

## Agent所有权

| 角色 | Agent | 唯一写入责任 |
| --- | --- | --- |
| 盘点 | `/root/blog_inventory` | `inventory.md`、`inventory.json`；只读生产代码 |
| 执行 | `/root/blog_executor` | 小批生产CSS/JS/templates与相关精确测试；不写inventory/scorecard/control |
| 评分建议 | `/root/space_review` | `scorecard.md`、`scorecard.json`；只读生产代码，保持独立 |
| 父任务 | `/root` | control、批次/证据、单浏览器真实验收、调度、本地已验收checkpoint |

复用三个角色，不重复生成相同Agent；新一轮先检查当前工作，所有人不得回滚其他协作者修改。上轮Pi/MiMo两次长请求中断，已停止，未产出源码；本轮小批先由执行Agent直接处理。无人值守heartbeat不得新启动/恢复Pi/MiMo或mimo-review Token Plan模型调用。

## 固定评分量表 v1

1. 任务清晰与信息层级20%。
2. 命中与键盘无障碍25%。
3. 状态反馈与错误恢复20%。
4. 视觉一致性、边框与注意力15%。
5. 动效舒适与性能10%。
6. 响应式与内容连续性10%。

评分Agent定义每维可检查子项与硬门槛；缺少任一适用状态或尺寸实测则verified_score=null、status=unverified。主流程不可达、焦点陷阱、数据或路由丢失 cap79；虚假成功或无恢复失败 cap84；命中/遮挡/对比度失败 cap89。96+要求所有适用硬门槛通过且每维≥90；控件族取子控件最低分。源码诊断、专家设计判断、确定性测试、浏览器实测分开记录；模拟手机不宣称实体手机验收。

## 本轮设计方向

保留博客纸色/墨色/酒红与中文阅读排版；控件采用清晰的无衬线，等宽字限于用户要求的终端与真实数据。主动作每区唯一；边框只表达分组、输入、选择、状态；非用户触发动效集中在已授权入场，避免悬停位移与多重缩放争抢阅读注意。Space继续咖啡默认、终端与后台渲染并行、BEAR OS主体/双向可切换Product Lab、作者真实内容、原私人节点连续性。

## 批次策略

先核对inventory/scorecard，挑尚未验收的高影响控件族：源码定位→有界实现→必要定向测试→生产构建→真实动作/截图→独立评分→修复。通过检查只有因新改动/失败/新风险才重跑。不为了填时间制造装饰，不以调度成功或worker运行中当交付。

初始批次A：真实复制pending/success/failure、独占复制反馈、全局焦点与按压变换、手机换景名称、quiet开启状态。下一批候选：文章tabs的键盘/ARIA关联、文章分享复制失败恢复、手机菜单Escape/关闭焦点、TOC减少动态效果、订阅超时、Space搜索空结果。

## 定时延续与截止

Heartbeat ID：`12-00`，当前聊天`01a13ec1-4c36-7410-915a-d52653d3129f`。每小时00/20/40分延续，最晚到UTC2026-10-16 04:00。每轮先读clock；到12:00停止新实现，保存真实结果及剩余项，暂停heartbeat并读回。仅在实质进展、完成、失败或需要用户参与时通知。

## 资源与证据

2026-10-16约00:32：58 Node/npm、swap10.37GiB、可用34.40GiB；Solo Compass仍有并行任务。单浏览器串行，复用现有服务/工具；重构建前资源审计，不开iOS Simulator，不抢占/停止别人的服务。测试目录用dev-storage-guard注册；正式证据保存后精确清理，保留活动预览构建。

父任务后续在`batches.md`与`state.json`记录当前批次、验证源码revision、证据路径、工作中Agent及下一个可执行目标。

最新已验本地checkpoint暂为`b5b6fa34`（E9c），E10/E10a现已独立闭环、准备保存。1317当前E10a冻结构建，17合同/17新图独立复核，native/focus/fullposter/loading/error/15s/Retry已测范围闭，未新增P0/P1。盘点1.18：309族/366selector entries（非按钮数）/295状态/63局部族/0完整；所有完整分null。UX039–041 search与UX042脚注开放，E11只读方案已准备尚未生产放行；QR portrait错误态约120px反馈→账号距离留作后续视觉细化。滚动恢复仅已稳定fonts/有限背景过渡，mid-reveal未知保留。无push/部署，heartbeat ACTIVE至12:00。
