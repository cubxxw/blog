# 本地批次与实际证据

工作持续至2026-10-16 12:00（上海）。这是当前验收记录，不是全站已完成声明。最新源码工作树见 control.md；仅本地，未发布。

| 批次 | 实际结果 | 已验收的范围 | 限制/后续 |
| --- | --- | --- | --- |
| 前序 `6d7b9fe9` | 咖啡默认入口、真实首帧终端、小猫、材料与失败恢复 | 见 `docs/acceptance/2026-10-15-space-onboarding-local.md` | 保留风格化场景，未达到照片级写实 |
| A | 真实复制pending/success/failure、焦点与按压、换景名称、quiet选择态 | `batch-a-checks.json`：20条 | 只覆盖记录的状态与设备模拟 |
| B/C | tabs、菜单、分享、订阅超时、阅读器空结果、代码错误布局 | D1时7条contracts/recovery；C时8条视觉检查 | C净空不足1px，后由D3改进 |
| D1 | 安全渲染、Travel/FAQ流取消、搜索取消、迟到分享不弹窗 | 24 Node、TypeScript、7浏览器回归、5请求流程；原log保留 | 五流程后在D2b及D4b重新验证，当前回执各自绑定新manifest |
| D2b | 隐藏面板inert、代码/书籍原生dialog与Tab循环、IME、FAQ外层取消、搜索不抢焦点 | 26 Node、TypeScript、12浏览器合同、6专项、5请求回归 | D2a原生dialog仍有body一跳，失败记录保留，已补首尾wrap |
| D3 | 复制净空/单语/触屏文案、Knowledge真实All、正文结构块静态、ripple opt-in | 14浏览器合同、8错误态视觉、2动效；净空最低14.58px | 专家局部D1=96、D4=94.5；320英文尾词单行仍可细化，完整功能分数未知 |
| D4b | 产品CTA抵达真实App且根入口仍咖啡、Dock命名、44px书籍AI、单一滚动对话区 | 10浏览器合同（含568×320/256中英）、5请求回归、26 Node、TypeScript | D4旧横屏溢出图/失败记录保留；当前PNG为修复后实际画面 |

每批 `evidence/batch-*-source.json`有源码SHA及其Git base。旧截图不认证后续代码。Node、浏览器合同、视觉判断分别记录；不能相加冒充已认证控件数量。

## Space专项和下一步

- `space-window-audit.json`：桌面/手机共6条实际操作通过，笔记最小化保持原DOM、最大化恢复、关闭再开文本保留。
- `space-render-probe.json`：灰色缩略图为过早截帧；450ms后两张本地照片ready/naturalWidth480。SVG组bbox中点落海洋、滚动裁剪外不是遮挡缺陷。
- `space-plane-concept-1440.png`仅临时CSS设计实验，不是生产改动或通过截图。
- 下一E5：工作区承载面减少穿透/重复边界；正文提高实际字号；桌面窗口目标≥24、手机地图控制≥44，保留原world/DOM架构。
- 已复现待修：FAQ在运行时切换减少动态效果后仍使用旧偏好播放高度动画（`batch-d3-motion-checks.json`的observation，不能算通过）。
- 后续按inventory 18个Roadmap小批继续：电脑/相框/墙体/光、小猫/quiet/六景、11应用、真实内容、首页层级与导航。完整309族未认证；固定评分表不为凑96而改动。

## 复现与边界

唯一预览 http://127.0.0.1:1317 。`local-qa.config.mjs`复用已构建站点，单浏览器串行。父任务脚本按记录运行；历史故障复现脚本成功只代表复现故障，不代表产品通过。

浏览器是Mac Chromium响应式模拟。没有实体手机、Safari/Firefox或真实模型/订阅后端的全覆盖验收；隔离mock不写真实用户数据，不进行公开部署。原始日志保留于登记artifact，正式文本副本已去ANSI与行尾空格。
