---
url: "/zh/ai-agent/posts/UFO/"
aliases:
  - /zh/projects/UFO/
title: 'UFO² 桌面 AgentOS：从 Windows 自动化到 UFO³ Galaxy'
date: 2025-05-09T21:30:15+08:00
lastmod: 2026-07-31T01:41:06+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords:
  - UFO²
  - UFO³ Galaxy
  - Windows 桌面自动化
  - Desktop AgentOS
  - Model Context Protocol
tags:
  - AI
  - Agent
  - Automation
  - Development
  - MCP
  - Open Source
  - Project Learning
categories:
  - Development
description: >
  从 UFO v1 的界面操作，到 UFO² 的 Windows 桌面 AgentOS，再到 UFO³ Galaxy 的跨设备编排，本文以 UFO² 为主线拆解 HostAgent、AppAgent、GUI 与 API 混合执行、知识检索、PiP 隔离桌面和 MCP，并给出 2026 年仍可使用的安装配置方法与工程判断。
cover:
  image: /images/covers/ai-agent/2025/UFO.png
  alt: "UFO² 桌面 AgentOS 的多智能体架构"
---

桌面智能体最容易给人留下印象的，是“它真的点了那个按钮”。但按钮被点中，只是演示成立；任务能否稳定结束，才是系统成立。

微软 UFO 项目几年的演进，恰好沿着这条分界线展开：2024 年的 UFO v1 证明视觉语言模型可以操作 Windows；2025 年的 UFO² 把操作提升为一个有状态、有工具、有应用边界的桌面运行时；同年末发布的 UFO³ Galaxy，则把单机能力接入跨设备编排。

截至 **2026 年 7 月 31 日**，官方仓库最新发布版为 **v3.0.5**。这并不意味着 UFO² 已经过时：官方仍将它定位为稳定维护的 Windows 单机自动化方案，也是 Galaxy 可调用的一类设备智能体。本文因此不追逐版本号，而把重点放在 UFO² 留下的那层关键抽象——如何让智能体从“看屏幕的人”变成“理解应用并完成工作的人”。

> 本文只引用微软官方仓库、官方文档及项目论文。安装命令与配置路径按 2026 年官方文档核验。

## 一条清晰的演进线：UFO → UFO² → UFO³

三个名字对应三个不同的问题。

| 阶段 | 发布时间 | 核心问题 | 系统边界 |
| --- | --- | --- | --- |
| UFO v1 | 2024-02 | 模型能否理解并操作 Windows GUI | 单机、以界面操作为中心 |
| UFO² | 2025-04 | 桌面智能体如何可靠地执行跨应用任务 | 单台 Windows、AgentOS |
| UFO³ Galaxy | 2025-11 | 多种设备上的智能体如何协同 | Windows、Linux、移动端等异构设备 |

初代 UFO 的全称是 **UI-Focused Agent**。它采用 HostAgent 与 AppAgent 的双智能体结构：前者选择应用、拆解请求，后者在具体应用中观察界面并执行动作。论文的意义不在于“发明了点击”，而在于证明自然语言任务可以被转译为跨应用的操作序列。参见 [UFO v1 论文](https://arxiv.org/abs/2402.07939)。

UFO² 没有推翻这套分工，而是把它向操作系统内部推进。UIA、Win32、COM、应用原生 API、视觉解析、知识检索和状态机被放进同一个执行框架，项目也因此把自己称为 **Desktop AgentOS**。这里的 “OS” 更像一层面向智能体的运行时抽象，并不是 Windows 的替代品。

UFO³ Galaxy 再向外扩一层：它把任务表示成可动态修改的有向无环图 **TaskConstellation**，节点称为 TaskStar，边记录控制或数据依赖；ConstellationAgent 负责任务分解，编排器把节点分派给不同设备。跨设备通信走 AIP（Agent Interaction Protocol），本地工具则可由 MCP 暴露。参见 [UFO³ 论文](https://arxiv.org/abs/2511.11332) 与 [官方项目首页](https://github.com/microsoft/UFO)。

可以把三代变化压缩成一句话：

> v1 解决“怎么操作”，UFO² 解决“怎么把操作组织成可靠任务”，Galaxy 解决“怎么让多个执行环境共同完成任务”。

## UFO² 的核心：控制平面与应用执行器分离

UFO² 的主体仍是 HostAgent 和 AppAgent，但两者承担的不是两个聊天角色，而是两种系统职责。

### HostAgent：看全局，不碰应用细节

HostAgent 是桌面任务的控制平面。它接收用户目标，观察当前应用与窗口状态，将目标拆成有依赖关系的子任务，再把每个子任务交给对应 AppAgent。目标应用尚未启动时，它也负责创建进程和绑定执行上下文。

任务并非靠一段不断增长的对话历史维持。HostAgent 使用有限状态机控制 `CONTINUE`、`ASSIGN`、`PENDING`、`FINISH`、`FAIL` 等阶段，并通过共享黑板交换中间结果。这样做有一个朴素的好处：失败发生时，系统知道失败属于哪个应用、哪个子任务、哪个状态，而不是只知道“模型刚才说错了”。

### AppAgent：在一个应用里把事情做完

AppAgent 面向具体应用运行感知—决策—执行循环。它同时读取两类信息：

- 截图提供布局、图标和自绘控件等视觉线索；
- Windows UI Automation（UIA）提供控件类型、名称、层级、可用状态等结构化信息。

两者互补。只看像素，按钮位置变化就可能让动作失效；只看 UIA，自绘画布或可访问性信息不完整的界面又可能近乎透明。UFO² 会融合并去重两路候选控件，再把结构化观察交给模型决策。

AppAgent 最有价值的设计，是没有把“点击”当成唯一动作。它通过统一的执行层选择 GUI 操作或原生 API：

- 通用界面可以使用点击、键盘输入、滚动等 GUI 动作；
- Word、Excel 等应用可通过 COM 或应用 API 完成更高层操作；
- Shell、Web 等能力也可以作为专用执行器接入。

例如，向表格写入一批数据时，逐格点击具有直观性，却把坐标漂移、焦点切换和渲染等待都引入了流程；若有稳定的应用 API，直接操作对象模型更快，也更容易验证。反过来，当应用没有开放接口时，GUI 仍是不可缺少的兜底。UFO² 的工程判断不是在 GUI 与 API 之间站队，而是承认桌面世界本来就不整齐。

这套架构的细节可参阅 [UFO² 论文的系统设计章节](https://arxiv.org/html/2504.14603#S3)。

## 五个真正影响可靠性的机制

### 1. 混合控件检测

UIA 负责语义和层级，视觉解析负责补足自定义控件，两路结果经过融合与去重后形成可操作对象。它降低了对固定坐标的依赖，也比纯截图方案更容易检查动作前后的状态变化。

这仍不是“看见即正确”。应用若暴露了错误的可访问性树，或者多个控件在视觉上高度相似，模型依旧可能选错。因此，控件检测解决的是输入质量，不是最终正确性。

### 2. GUI 与 API 的统一动作层

UFO² 论文把这层称作统一 GUI–API Action Orchestrator，代码与文档中常见的执行接口名是 Puppeteer。这里的 Puppeteer 与同名浏览器自动化项目不同，指的是 UFO 内部调度不同 Automator 与 Receiver 的抽象层。

API 动作通常更稳定，GUI 动作通常覆盖面更广。统一动作层允许 AppAgent 根据应用能力选择路径，并让执行结果回到同一套状态与日志系统。动作种类多少并非关键，关键在于它们都能被同一套任务控制逻辑观察和约束。

### 3. 持续知识集成

AppAgent 可以从帮助文档、补丁说明、既往执行轨迹与用户演示中检索上下文。这类 RAG 更接近“临时加载应用手册”，不是自动训练出一个越来越聪明的模型。

因此，“持续学习”需要谨慎理解：

- 它可以积累可检索的文档和成功经验；
- 它不会自动保证旧经验仍然适配新版应用；
- 错误轨迹若未经筛选进入知识库，也可能放大错误。

知识层的价值，是把频繁变化的应用事实从模型参数里移出来；代价则是需要维护来源、版本和有效期。

### 4. 投机式多动作

逐步执行的智能体往往把大部分时间花在等待模型：观察一次、请求一次、动作一次。UFO² 允许一次规划多个候选动作，并在执行期间用控件状态检查动作前提。前提失效时，序列停止并回到常规推理。

它像处理器的投机执行：快来自少等待，安全来自每一步仍可验证。原文曾引用“减少 51% 查询”这类孤立数字，但数字离开模型、任务集和配置就容易误导。更可靠的结论是：官方消融实验显示，多动作在其测试条件下减少了推理开销；实际收益取决于任务是否线性、界面是否稳定，以及验证器能否识别状态变化。

### 5. PiP 隔离桌面

UFO² 论文设计了 Picture-in-Picture（PiP）界面：智能体运行在嵌套的 Windows 桌面会话中，用户继续操作主桌面，双方的鼠标、键盘和窗口状态彼此隔离。它回应了桌面自动化长期存在的问题——脚本一运行，人的电脑就暂时不属于人。

需要区分“论文中的系统实现”与“当前开源快速入门”。论文明确描述了 PiP 的架构与实现，但 2026 年官方快速入门没有把 PiP 列为默认启动步骤。因此更稳妥的表述是：**PiP 是 UFO² 的系统设计能力，不应依据旧路线图写成某个确定版本即将发布的承诺。**

## MCP 在这里到底是什么

MCP 是 **Model Context Protocol**，不是旧文所写的 “Multi-Control Platform”。

在当前 UFO³ 工程里，MCP 的作用是把设备上的工具以统一接口提供给智能体。例如 Linux 设备可启动本地 MCP server，向设备智能体暴露命令或文件操作；Galaxy 负责跨设备编排，MCP server 负责提供某台设备上的具体能力。两者不要混为一谈：

- **AIP** 连接 Galaxy、设备服务与客户端，处理注册、任务分发、心跳和结果回传；
- **MCP** 描述智能体可以调用哪些工具，以及这些工具如何被调用；
- **UFO² 的 GUI/API 执行层** 仍负责 Windows 应用内部的实际操作。

当前模块化配置中，UFO² 的 MCP 设置位于 `config/ufo/mcp.yaml`。MCP server 本身不需要 LLM API key；需要密钥的是 HostAgent、AppAgent 或 Galaxy 的 ConstellationAgent。参见 [官方 FAQ](https://microsoft.github.io/UFO/faq/) 与 [Galaxy Client 文档](https://microsoft.github.io/UFO/galaxy/client/overview/)。

这种分层值得保留：协议解决连接问题，工具解决能力问题，智能体解决选择问题。把三者揉成一个“万能平台”，最后往往既难测试，也难追责。

## 2026 年安装与配置 UFO²

如果目标只是单台 Windows 上的桌面自动化，官方仍建议直接使用 UFO²，而不是先搭 Galaxy。

### 环境要求

- Windows 10 或更高版本；
- Python 3.10 或更高版本；
- Git；
- 可用的多模态模型服务。纯文本模型可以配置，但 GUI 任务能力会受限。

### 安装

```powershell
git clone https://github.com/microsoft/UFO.git
cd UFO

conda create -n ufo python=3.10
conda activate ufo

pip install -r requirements.txt
```

### 使用新的模块化配置

旧文章常让用户编辑 `ufo/config/config.yaml`。该路径仍兼容，但官方当前推荐 `config/ufo/` 下的模块化配置。

```powershell
copy config\ufo\agents.yaml.template config\ufo\agents.yaml
notepad config\ufo\agents.yaml
```

目录中的职责已经拆开：

```text
config/ufo/
├── agents.yaml    # HostAgent、AppAgent 的模型与凭据
├── system.yaml    # 运行时设置
├── rag.yaml       # 文档与经验检索
└── mcp.yaml       # MCP 工具接入
```

一个最小的 OpenAI 兼容配置大致如下，具体字段应以仓库模板为准：

```yaml
HOST_AGENT:
  VISUAL_MODE: true
  API_TYPE: "openai"
  API_BASE: "https://api.openai.com/v1/chat/completions"
  API_KEY: "${OPENAI_API_KEY}"
  API_MODEL: "your-vision-model"

APP_AGENT:
  VISUAL_MODE: true
  API_TYPE: "openai"
  API_BASE: "https://api.openai.com/v1/chat/completions"
  API_KEY: "${OPENAI_API_KEY}"
  API_MODEL: "your-vision-model"
```

不要把真实密钥提交到仓库。官方模板支持用环境变量引用凭据；新旧配置同时存在时，新配置优先。现有旧配置可通过工具迁移并检查：

```powershell
python -m ufo.tools.migrate_config
python -m ufo.tools.validate_config ufo --show-config
```

### 启动

```powershell
python -m ufo --task my_desktop_task
```

日志默认写入任务目录，包含请求、响应、步骤截图和标注截图。第一次试用不要直接交给真实业务数据，先选择一个可回滚、结果容易检查的任务，例如把测试文档中的一组数据整理到测试表格。

完整步骤以 [UFO² 官方快速入门](https://microsoft.github.io/UFO/getting_started/quick_start_ufo2/) 为准。

## 什么时候才需要 UFO³ Galaxy

Galaxy 不是“更强的 UFO² 模式”，而是上层编排器。以下任务才体现它的边际价值：

- 从多台 Linux 服务器并行收集日志，再让 Windows 设备写入 Excel；
- 移动端采集信息，Windows 端整理，服务器端运行分析；
- 子任务之间存在明确的数据依赖，又希望无依赖的部分并发执行；
- 设备可能暂时离线，需要重试、改写任务图或保留部分结果。

Galaxy 的 ConstellationAgent 把目标拆成动态 DAG，设备按能力注册，编排器异步调度，执行结果又可触发后续节点修改。它继承了 UFO² 的思想，但控制平面已经从“应用之间”提升到“设备之间”。

如果所有动作都发生在一台 Windows 电脑上，引入 Galaxy 只会多出服务端、客户端、设备注册和网络故障面。架构不是越大越先进，边界与问题相称才算成熟。Galaxy 的部署方式可参考 [官方快速入门](https://microsoft.github.io/UFO/getting_started/quick_start_galaxy/)。

## 怎样读官方基准，才不会被数字带走

UFO² 论文在 20 多个真实 Windows 应用上评估系统，并报告它相对纯 GUI 智能体的成功率与效率改进。UFO³ 则使用 NebulaBench：55 个跨设备任务，覆盖 5 台机器与 10 类场景。

这两组结果不能直接横比。UFO² 主要测单机桌面任务，UFO³ 主要测任务分解、跨设备完成、并发和故障恢复；任务集合、模型、设备环境和成功判定都不同。甚至同一框架，换一个模型或应用版本也可能改变结果。

阅读时至少要问四件事：

1. 评估的是完整任务成功，还是子任务完成？
2. 对照组是否使用相同模型、相同截图与相同工具？
3. 失败来自规划、控件定位、动作执行，还是环境状态？
4. 延迟统计是否包含模型等待、应用启动与重试？

论文数字适合验证设计是否有效，不适合替代自己的验收。生产环境更需要一套小而真实的回归任务：固定应用版本、输入样本、期望输出、最长耗时、允许重试次数，以及任何破坏性动作前的人工确认。

## 工程上的边界

UFO² 比纯视觉智能体可靠，并不等于它具有传统脚本的确定性。

第一，UIA 树、视觉识别和应用 API 都可能变化。混合感知只是让系统有更多证据，并不能消除歧义。

第二，原生 API 提升能力的同时也扩大权限。文件覆盖、邮件发送、系统命令和外部上传应当有明确的允许列表与确认点。`PENDING` 状态是一种机制，不是完整的安全策略。

第三，经验库会老化。成功轨迹必须记录应用版本与执行条件；无法说明来源的经验，不应自动进入长期知识库。

第四，跨设备编排把局部失败变成分布式失败。Galaxy 能重试和调整 DAG，但网络分区、幂等性和部分写入仍需业务侧设计。

智能体最危险的时刻，不是它公开说“我不知道”，而是它顺利执行了一个未经确认的误解。可靠性最终来自三件并不神秘的事：动作可观察，结果可验证，错误可停止。

## 结语

UFO 系列真正值得关注的，不是一个模型能操作多少软件，而是它逐步补齐了智能体运行所需的系统结构。

UFO v1 把自然语言接到桌面界面；UFO² 用 HostAgent、AppAgent、状态机、UIA、原生 API 和知识层，把零散动作收束成可观察的任务；UFO³ Galaxy 再用动态 DAG、AIP 和 MCP，把执行边界扩展到多台异构设备。

这条路线也揭示了一个常被忽略的事实：模型越能行动，系统越需要约束。真正成熟的桌面智能体，不是像人一样把鼠标移得更快，而是在行动之前知道边界，在行动之后留下证据，在不确定时愿意停下来。

## 一手资料

- [Microsoft UFO 官方仓库与版本发布](https://github.com/microsoft/UFO)
- [UFO 官方文档](https://microsoft.github.io/UFO/)
- [UFO v1：A UI-Focused Agent for Windows OS Interaction](https://arxiv.org/abs/2402.07939)
- [UFO²：The Desktop AgentOS](https://arxiv.org/abs/2504.14603)
- [UFO³：Weaving the Digital Agent Galaxy](https://arxiv.org/abs/2511.11332)
- [UFO² 官方快速入门](https://microsoft.github.io/UFO/getting_started/quick_start_ufo2/)
- [UFO³ Galaxy 官方快速入门](https://microsoft.github.io/UFO/getting_started/quick_start_galaxy/)
- [UFO 官方 FAQ](https://microsoft.github.io/UFO/faq/)
