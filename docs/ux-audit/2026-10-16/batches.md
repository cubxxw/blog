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

## E5 / E5.1 真实验收与未通过边界（2026-10-16 01:55）

- 冻结基线为本地 `94e644e5`；E5四文件和E5.1六文件分别见source manifest。生产预览复用1317。
- E5：纸面不透明，实际主文字16.4px；桌面窗控26.24px；原320/390/568手机窗控与地图44.28px。5条Space阅读/原笔记DOM与fallback合同通过，10张稳定画面/JSON已归档。截图手机高度为900，合同手机高度为844，不能互相替代。
- 独立设计判断：桌面笔记D4由72.5→90，390笔记93，深色笔记/阅读器90，390地图87.5。仅局部视觉范围，完整控件分仍未知。
- 后续实际hit与click发现：568×320 close中心被“回到咖啡馆”HUD盖住，真实点击进入café、notes仍存在；620×844 map按钮只有26.24px宽；844×390 coarse=true，窗控/map仅26.24px且arrange被换景HUD截获。E5阅读合同只测几何，不能据此声称这些按钮可点。
- E5.1 FAQ runtime减少动态效果第一合同通过；第二合同失败：`.article-faq__ai-panel[hidden]`仍有可见盒子，自定义display:grid覆盖UA hidden。失败原始log已存，不能关闭UX019。
- E5.2执行Agent正在修上述四个确定缺陷；父任务等待冻结交接后一次构建/动作复验。暂无新的已验收checkpoint。
- 首页before/A/B为临时DOM/CSS比较图；A文章优先、B作者/明确AI分身与3问题优先。当前仅方案研究，不是生产修改、功能回执或96分事实。

## E5.2 已闭环（2026-10-16 02:00）

- 九文件SHA manifest：`evidence/batch-e52-source.json`。Hugo生产构建、typecheck、JS语法与diff检查通过；11条FAQ/Space阅读/边界合同通过。
- 父任务实际浏览器：568×320中英、620×844中文、844×390中文coarse，4条真实坐标鼠标旅程+8张稳定图。close中心命中且真实点击删除窗口、仍desktop；HUD各44px独立点击，换景Escape返焦点；咖啡往返原editorDOM/文字不丢。地图四按钮实际44.28px以上，逐个hit和点击。详见`batch-e52-boundaries.json/log`。
- 第一次父脚本错误使用`/en/projects/`而超时，修正为项目真实默认英文`/projects/`后完整通过；这不是生产路由缺陷，也未用CSS/重定向掩盖脚本错误。
- 独立review：9/9 hash匹配，读11条断言/原始log与4鼠标旅程、逐张看8图；已复现的FAQ runtime/hidden、620/coarse按钮、568 HUD遮挡按具体范围关闭，无新P0/P1。完整控件族分仍null。
- 剩余观察：844×390桌面式重叠窗口有plane裁切；body自身无x溢出不证明被裁内容可达。后续以maximize/arrange/滚动实际动作探针判断，不外推全app可用。
- 资源审计82 Node/npm、swap21.79GiB、剩余21.54GiB；其他SoloCompass模拟器验收仍活动。只复用既有服务、缓存与单浏览器，未启动Simulator/并行构建，未停止或清理其他活动任务。
