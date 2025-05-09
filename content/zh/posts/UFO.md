---
title: '微软UFO项目深度解析：设计、实现、原理与架构'
ShowRssButtonInSectionTermList: true
cover.image: /images/ufo-cover.jpg
date: 2025-05-09T21:30:15+08:00
draft: false
showtoc: true
tocopen: true
type: posts
author: 
  - "Xinwei Xiong"
  - "微软UFO研究团队"
keywords:
  - UFO
  - 桌面自动化
  - 多智能体系统
  - Windows自动化
  - 微软AI
tags:
  - AI
  - 自动化
  - Windows开发
  - 微软技术
categories: ["AI Open Source"]
description: >
  本文深入解析微软UFO项目的核心设计、技术实现与系统架构，涵盖其多智能体协作、混合GUI/API操作、持续学习等创新特性，帮助开发者全面理解这一前沿的桌面自动化平台。
---


## **1. 引言**

微软的UFO（UI-Focused Agent，后续发展为UFO²，即Desktop AgentOS）项目代表了在自然语言驱动的桌面自动化领域的一项重要进展 <sup>1</sup>。该项目旨在通过深度操作系统集成和多智能体协作，将用户通过自然语言表达的复杂任务转化为跨应用程序的、可靠的自动化工作流 <sup>1</sup>。最初的UFO项目于2024年2月发布，专注于Windows操作系统的UI自动化，利用GPT-Vision等大型语言模型（LLM）的能力，通过双智能体框架观察和分析GUI信息，实现跨应用的导航和操作 <sup>3</sup>。随着2025年4月UFO²的提出，该项目演进为一个更为宏大的“桌面操作系统智能体”（Desktop AgentOS）概念，强调更深层次的操作系统集成、原生API调用与GUI操作的混合、以及通过持续学习和投机性多动作执行提升效率和鲁棒性 <sup>1</sup>。

本报告旨在深度剖析微软UFO项目，从其核心目标、关键特性、系统架构、关键技术实现、到社区反馈和未来展望，提供一个全面而深入的分析。


## **2. 项目概述与核心目标**

UFO项目的核心目标是赋能用户通过自然语言指令，在Windows操作系统上实现复杂、跨应用的自动化任务 <sup>1</sup>。它不仅仅局限于传统的UI层面自动化，而是力求构建一个能够理解用户意图、智能编排多个应用程序以达成目标的“桌面智能体操作系统” <sup>1</sup>。

最初的UFO版本专注于利用大型视觉语言模型（如GPT-Vision）来理解和操作Windows应用程序的图形用户界面（GUI）<sup>3</sup>。其设计理念是通过模拟人类用户观察屏幕、思考决策、执行操作的过程，将繁琐耗时的手动任务转变为简单的自然语言指令即可完成的自动化流程 <sup>4</sup>。

随着UFO²的提出，这一目标得到了进一步的深化和扩展。UFO²旨在成为一个系统级的自动化平台，其关键特性包括：



* **深度操作系统集成 (Deep OS Integration):** 结合Windows UI Automation (UIA)、Win32和WinCOM技术，实现对控件的精准检测和原生命令的执行 <sup>1</sup>。这种集成是UFO区别于仅依赖截图和模拟点击的早期计算机使用智能体（CUA）的关键，它为智能体提供了更丰富、更可靠的与操作系统及应用程序交互的手段。
* **混合GUI与API操作 (Hybrid GUI + API Actions):** 智能体能够根据情况选择最优的交互方式，优先使用速度更快、更稳定的原生API；当API不可用时，则回退到模拟点击和键盘输入等GUI操作 <sup>1</sup>。这种混合策略兼顾了效率和通用性。
* **持续知识基底 (Continuous Knowledge Substrate):** 通过检索增强生成（RAG）技术，融合离线文档、在线Bing搜索结果、用户演示以及历史执行轨迹，使智能体能够持续学习和进化 <sup>1</sup>。这意味着UFO不仅仅是一个执行器，更是一个能够积累经验、适应新情况的学习系统。
* **投机性多动作执行 (Speculative Multi-Action):** 将多个预测的后续操作步骤捆绑在一次LLM调用中，并进行实时验证，从而显著减少LLM查询次数（据称可达51%），提升执行效率 <sup>1</sup>。这对于依赖LLM进行决策的智能体系统而言，是降低延迟、提高响应速度的关键优化。
* **UIA与视觉控制检测 (UIA + Visual Control Detection):** 采用UIA和计算机视觉相结合的混合管线，以检测标准控件和自定义控件 <sup>1</sup>。这增强了智能体对各种复杂界面的适应能力。
* **画中画桌面 (Picture-in-Picture Desktop) (即将推出):** 允许自动化任务在一个隔离的虚拟桌面中运行，用户的主屏幕和输入设备不受干扰 <sup>1</sup>。这一特性对于提升用户体验至关重要，它使得自动化过程和用户的日常工作可以并行不悖。

UFO的应用场景广泛，包括但不限于自动化办公套件中的重复性任务、简化涉及Web浏览器的流程（如数据录入、表单填写）、以及基于自然语言指令创建自定义的跨应用工作流 <sup>1</sup>。


## **3. 系统架构**

UFO²的架构设计体现了其作为“桌面智能体操作系统”的理念，其核心是一个多智能体框架 <sup>2</sup>。

**核心组件:**

| 组件名称 | 描述 | 来源 |
|---------|------|------|
| **HostAgent (主控智能体)** | 解析用户的自然语言目标，启动必要的应用程序，创建并协调AppAgent，管理全局有限状态机（FSM）以控制任务流程。 | <sup>2</sup> |
| **AppAgent (应用智能体)** | 每个应用程序对应一个AppAgent。每个AppAgent运行一个ReAct（Reasoning and Acting）循环，具备多模态感知、混合控制检测、检索增强知识以及通过Puppeteer执行器选择GUI或API操作的能力。 | <sup>2</sup> |
| **Knowledge Substrate (知识基底)** | 融合离线文档、在线搜索结果、用户演示和执行轨迹，构建一个向量存储，在推理时按需检索。 | <sup>2</sup> |
| **Puppeteer Executor (操纵执行器)** | 集成在AppAgent内部，负责在GUI操作（如点击、输入）和原生API调用之间做出选择并执行。 | <sup>5</sup> |
| **Speculative Executor (投机执行器)** | 通过预测一批可能的动作并在一次调用中针对实时UIA状态进行验证，从而大幅减少LLM的调用延迟。 | <sup>1</sup> |
| **FollowerAgent (跟随智能体)** | 继承自AppAgent，用于执行用户提供的明确指令序列，常用于软件测试等场景。 | <sup>5</sup> |
| **EvaluationAgent (评估智能体)** | 用于评估一个会话或一轮任务的完成情况。 | <sup>5</sup> |

**数据流:**

UFO²的数据流围绕HostAgent的协调和AppAgent的执行展开 <sup>5</sup>。



1. 用户通过自然语言提出任务请求。
2. **HostAgent**接收请求，进行任务分解，识别出完成任务所需的子任务和应用程序 <sup>8</sup>。它会检查目标应用是否已运行，如果未运行则启动应用，并为每个活跃应用实例化对应的**AppAgent** <sup>8</sup>。
3. HostAgent将子任务分配给相应的**AppAgent**，并提供任务上下文、内存引用和相关工具链（如API、文档）<sup>8</sup>。
4. 每个**AppAgent**在其负责的应用程序中，通过ReAct循环执行任务。这包括：
    * **多模态感知**：观察应用界面（截图）和结构信息（UIA）。
    * **知识检索**：从**Knowledge Substrate**中检索相关信息（文档、历史经验等）以辅助决策。
    * **混合控制检测**：结合UIA和视觉分析来识别可交互的UI元素。
    * **动作决策与执行**：通过**Puppeteer Executor**选择执行GUI操作（如点击、输入文本）或调用原生API。
5. **Speculative Executor**在AppAgent的动作决策过程中发挥作用，它会预测一系列可能的动作，并一次性提交给LLM进行评估和验证，从而减少LLM的调用次数，提升效率 <sup>1</sup>。
6. **Knowledge Substrate**在整个过程中持续发挥作用，为AppAgent提供动态的知识支持，并记录成功的执行轨迹以供未来学习 <sup>1</sup>。
7. HostAgent通过全局有限状态机（FSM）监控各AppAgent的执行状态，协调跨应用的流程，处理依赖关系和故障 <sup>8</sup>。
8. 任务完成后，（可选地）**EvaluationAgent**可以介入，对任务的完成质量进行评估 <sup>10</sup>。

这种架构的模块化设计，使得系统具有良好的可扩展性，例如可以针对新的应用程序开发专门的AppAgent，或者集成新的知识源到Knowledge Substrate中。


## **4. 智能体设计 (Agent Design)**

UFO文档中提及了智能体设计的几个核心构成要素：Memory（记忆）、Blackboard（黑板）、State（状态）、Prompter（提示器）和Processor（处理器）<sup>5</sup>。这些组件共同构成了智能体（无论是HostAgent还是AppAgent）的内部运作机制。

#### State (状态)  
**定义**: UFO智能体框架的基础组件，代表智能体当前状况，决定下一个执行动作和处理请求的智能体 <sup>7</sup>。  

**实现细节**:  
- 每个智能体拥有特定状态集合，定义其行为和工作流程  
- `AgentStatus`类（枚举类）定义状态集合 <sup>11</sup>  
- `AgentStateManager`管理字符串到状态类的映射，通过装饰器注册状态类 <sup>11</sup>  
- 具体状态类继承`AgentState`基类，必须实现:  
  - `handle`方法：处理该状态下的动作  
  - `next_state`和`next_agent`方法：确定状态转换后的下个状态和处理智能体 <sup>11</sup>  

---

#### Memory (记忆)  
**功能**: 存储用户请求、应用状态及相关数据 <sup>7</sup>。  

**知识增强机制**:  
- 通过RAG技术从异构源（知识库、演示库）获取信息 <sup>9</sup>  
- 学习来源:  
  - 帮助文档  
  - Bing搜索  
  - 自我演示（成功动作轨迹）<sup>9</sup>  

**管理接口** (`BasicAgent`类提供):  
- 基础操作: `add_memory`, `clear_memory`, `delete_memory`  
- 检索器构建:  
  - `build_experience_retriever`  
  - `build_offline_docs_retriever` <sup>7</sup>  

---

#### Blackboard (黑板)  
**作用**: 智能体间共享信息的组件 <sup>7</sup>。  

**应用场景**:  
- `HostAgent`读写全局黑板，实现:  
  - 智能体间通信  
  - 系统级可观察性（调试/回放）<sup>8</sup>  
- `AppAgent`生成提示时考虑黑板信息 (`blackboard_prompt`) <sup>6</sup>  

---

#### Prompter (提示器)  
**功能**: 根据用户请求和应用状态生成LLM提示 <sup>7</sup>。  

**实现方式**:  
- `BasicAgent`提供:  
  - `get_prompter`获取提示器实例  
  - `message_constructor`构建LLM消息 <sup>7</sup>  
- 专用提示器: `FollowerAgentPrompter` <sup>6</sup>  

**提示内容组成**:  
- 动态示例（自我/人类演示）  
- 动态知识  
- 截图/控件信息  
- 任务计划等 <sup>6</sup>  

---

### Processor (处理器)  
**职责**: 管理智能体工作流，包括:  
- 处理用户请求  
- 执行动作  
- 管理记忆 <sup>7</sup>  

**具体实现**:  
- `HostAgent`: 激活处理器分解用户请求为子任务 <sup>8</sup>  
- `FollowerAgent`: 使用特定`Session`和`Processor`处理指令 <sup>6</sup>  
- `BasicAgent`: 内置`processor`属性 <sup>7</sup>  

这些组件的协同工作使得UFO中的智能体能够有效地感知环境、进行推理决策、执行动作并从中学习。


### **4.1. HostAgent (主控智能体)**

HostAgent在UFO²架构中扮演着核心协调者的角色 <sup>2</sup>。其主要职责包括 <sup>7</sup>：



* **任务分解 (Task Decomposition):** 接收用户的自然语言输入，识别任务目标，并将其分解为一个具有依赖顺序的子任务图。
* **应用程序生命周期管理 (Application Lifecycle Management):** 针对每个子任务，HostAgent通过UIA API检查系统进程元数据，判断目标应用程序是否正在运行。如果应用未运行，它会启动该程序并将其注册到运行时环境中。
* **AppAgent实例化 (AppAgent Instantiation):** 为每个活动应用程序创建相应的AppAgent实例，并向其提供任务上下文、记忆引用以及相关的工具链（例如API、文档）。
* **任务调度与控制 (Task Scheduling and Control):** 将全局执行计划序列化为一个有限状态机（FSM），从而能够强制执行顺序、检测故障并在智能体之间解决依赖关系。
* **共享状态通信 (Shared State Communication):** 通过读写一个全局黑板（Blackboard），实现智能体间的通信和系统级的可观察性，以便于调试和回放。

HostAgent的输入包括用户请求（自然语言字符串）、现有活动应用的信息（字符串列表）以及桌面截图（图像）<sup>8</sup>。其输出则包括对当前桌面截图的观察（字符串）、给用户的额外评论或信息（字符串）、需要向用户提出的问题（字符串列表）以及可由HostAgent执行的bash命令（用于打开应用或执行系统命令）<sup>8</sup>。这些输出通常由LLM格式化为JSON对象。

HostAgent的状态机定义在其host_agent_states.py模块中，主要状态包括CONTINUE（默认，用于动作规划和执行）、PENDING（用于安全关键操作，需用户确认）、FINISH（任务完成）和FAIL（发生不可恢复的故障）<sup>8</sup>。


### **4.2. AppAgent (应用智能体)**

AppAgent专责于在选定的应用程序内迭代执行动作，直至在该应用内的子任务成功完成 <sup>7</sup>。它由HostAgent创建，旨在完成某个“回合”（Round）中的一个子任务。

AppAgent的核心运作机制是**ReAct（Reasoning and Acting）循环** <sup>5</sup>。在这个循环中，AppAgent：



1. **观察 (Observation):** 利用视觉语言模型（VLM）的多模态能力理解应用程序的用户界面（UI），包括分析截图。输出对当前应用截图的观察结果 <sup>9</sup>。
2. **思考 (Thought):** 进行逻辑推理，决定下一步的行动。输出其逻辑推理过程 <sup>9</sup>。
3. **行动 (Action):** 选择要交互的控件（ControlLabel）及其操作方法（ControlText, Function, Args），并执行该动作 <sup>9</sup>。

为了增强其理解和执行能力，AppAgent具备以下特性：



* **理解增强 (Comprehension Enhancement):** 通过**检索增强生成（RAG）**从异构来源（包括外部知识库如帮助文档、Bing搜索结果，以及演示库如自我演示和用户演示）获取信息，使其成为特定应用的“专家” <sup>1</sup>。
    * **从帮助文档学习:** 用户可以在config.yaml中配置帮助文档路径，AppAgent通过build_offline_docs_retriever构建检索器，并使用retrieved_documents_prompt_helper构建提示 <sup>9</sup>。
    * **从Bing搜索学习:** 当帮助文档不足或过时，可启用Bing搜索获取最新信息。通过build_online_search_retriever构建检索器 <sup>9</sup>。
    * **从自我演示学习:** 保存成功的动作轨迹供未来参考。通过build_experience_retriever构建检索器，并使用rag_experience_retrieve检索演示 <sup>9</sup>。
* **多功能技能集 (Versatile Skill Set):** 配备了多样化的技能以支持全面的自动化，例如鼠标操作、键盘输入、调用原生API，甚至使用“Copilot”类的AI工具 <sup>9</sup>。这些技能通过Puppeteer执行器来实现。

AppAgent的输出除了观察、思考和控制信息外，还包括当前任务状态（Status，如CONTINUE, FINISH, PENDING等）、对子任务的计划（Plan）、当前子任务描述（Subtask）、以及对用户的评论（Comment）<sup>4</sup>。


### **4.3. FollowerAgent (跟随智能体)**

FollowerAgent是AppAgent的一个特化版本，它继承了AppAgent的大部分功能 <sup>6</sup>。与AppAgent不同的是，FollowerAgent并非自主推理以决定下一步行动，而是严格遵循用户预先定义的步骤指令来执行任务 <sup>6</sup>。

这种模式在以下场景中特别有用 <sup>6</sup>：



* **软件测试:** 当需要验证应用程序在特定操作序列下的行为时。
* **调试:** 用于复现和诊断问题。
* **任务验证:** 当需要确保任务严格按照特定流程执行时。

FollowerAgent在“跟随者模式”（follower mode）下运行 <sup>6</sup>。用户需要创建一个JSON格式的计划文件（plan file），其中包含任务描述（task）、步骤列表（steps）和目标对象（object，即应用程序或文件）<sup>10</sup>。UFO通过命令行参数--mode follower和--plan &lt;plan_file_or_folder_path>启动此模式 <sup>10</sup>。它也支持批量运行多个计划文件。

FollowerAgent使用特定的Session（FollowerSession）和Processor来处理用户指令 <sup>6</sup>。如果配置了EVA_SESSION为True，UFO还会调用EvaluationAgent来评估任务的完成情况 <sup>10</sup>。


### **4.4. EvaluationAgent (评估智能体)**

EvaluationAgent的职责是评估一个会话（session）或一个回合（round）任务的完成度 <sup>7</sup>。在常规工作流程中，主要由HostAgent和AppAgent参与用户交互，而EvaluationAgent则用于特定任务，例如在Follower模式下评估预定义计划的执行结果 <sup>7</sup>。

当config_dev.yaml文件中的EVA_SESSION设置为True时，UFO会在Follower模式执行完毕后调用EvaluationAgent <sup>10</sup>。评估日志会记录在logs/{task_name}/evaluation.log文件中 <sup>10</sup>。

尽管文档指出了EvaluationAgent的存在及其用途，但关于其具体的评估标准、工作方法或内部机制的详细信息并未在现有摘要中充分阐述 <sup>5</sup>。要深入了解其工作原理，可能需要参考UFO²的技术论文或更详细的开发者文档。


## **5. 核心技术与机制**

UFO项目的实现依赖于一系列关键技术和机制的协同工作，这些技术共同构成了其强大的自动化能力。


### **5.1. 控制检测 (Control Detection)**

为了准确地识别和交互应用程序的UI元素，UFO采用了一种混合的控制检测方法，结合了程序化接口和视觉分析。



* **UIA检测 (UIA Detection):** 利用Windows UI Automation (UIA) API来提取关于应用程序、窗口和控件层级的结构化元数据 <sup>5</sup>。UIA提供了一种标准化的方式来访问UI元素及其属性，对于具有良好可访问性支持的应用程序非常有效。
* **视觉检测 (Visual Detection):** 当UIA信息不足或控件为自定义绘制时，UFO会利用视觉模型（如GPT-Vision或其后续模型，以及像OmniParser这样的工具）来分析屏幕截图，从像素层面理解UI布局和识别可交互元素 <sup>2</sup>。OmniParser能够将UI截图从像素空间“标记化”为LLM可理解的结构化元素，显著提升了对微小或自定义图标的识别准确率 <sup>13</sup>。
* **混合检测 (Hybrid Detection):** UFO²的AppAgent采用混合UIA和视觉的管线来检测标准和自定义控件 <sup>1</sup>。这种方法结合了UIA的结构化信息和视觉模型的灵活性，旨在提供更全面和鲁棒的控件识别能力。例如，UFO²的混合控制检测管线融合了UIA与基于视觉的解析，以支持多样化的界面风格 <sup>2</sup>。

这种混合策略是应对现代应用程序UI多样性和复杂性的关键。一些应用程序可能没有完全实现UIA接口，或者包含大量自定义绘制的控件，此时视觉检测就显得尤为重要。反之，当UIA信息可用时，它可以提供比单纯视觉分析更精确和语义更丰富的控件信息。


### **5.2. 自动化机制 (Automation Mechanisms - Puppeteer)**

AppAgent通过一个名为**Puppeteer**的执行器来与应用程序进行交互 <sup>5</sup>。Puppeteer扮演着命令模式中“调用者”（Invoker）的角色，它负责触发命令，这些命令随后由“接收者”（Receiver）执行 <sup>14</sup>。这种设计模式解耦了动作的发送者和接收者，使得智能体可以在不了解对象或动作执行细节的情况下对不同对象执行操作，从而提高了系统的灵活性和可扩展性 <sup>14</sup>。

Puppeteer支持多种自动化方式：



* **GUI Automator (GUI自动化器):** 模拟鼠标和键盘在应用程序UI控件上的操作 <sup>15</sup>。它使用UIA或Win32 API与应用的UI控件（如按钮、编辑框、菜单）进行交互。其核心接收者是ControlReceiver类，该类封装了如点击、设置文本、滚动、获取文本等操作 <sup>4</sup>。
* **API Automator (API自动化器):** 利用应用程序的原生API进行交互。目前，UFO通过pywin32库支持使用WinCOM（Windows Component Object Model）与Word和Excel等应用进行API级别的交互 <sup>5</sup>。其基础接收者是WinCOMReceiverBasic类，具体的应用API命令（如Word的SelectTextCommand）则继承自WinCOMCommand <sup>16</sup>。
* **Web Automator (Web自动化器):** 负责与Web应用程序交互 <sup>5</sup>。
* **Bash Automator (Bash自动化器):** 允许智能体执行命令行操作 <sup>5</sup>。
* **AI Tool (AI工具):** 使智能体能够与基于LLM的AI工具进行交互 <sup>5</sup>。

HostAgent和AppAgent将动作请求传递给Puppeteer，Puppeteer再根据动作类型（GUI或API）和目标应用，选择合适的Automator和Receiver来执行具体操作 <sup>17</sup>。这种混合GUI与API的动作执行能力是UFO²的一大特点，它使得智能体能够根据可用性和效率，在直接API调用和UI模拟之间智能切换，以实现快速而鲁棒的自动化 <sup>1</sup>。


### **5.3. 知识获取与RAG (Knowledge Acquisition & RAG)**

UFO的核心能力之一是其**持续知识基底（Continuous Knowledge Substrate）**，它通过**检索增强生成（Retrieval-Augmented Generation, RAG）**技术，使智能体能够动态地获取和利用知识，从而不断学习和提升性能 <sup>1</sup>。

知识的来源是多样的：



* **离线帮助文档 (Offline Help Document):** 用户或应用程序开发者可以提供帮助文档，AppAgent能够从中检索信息以增强对应用的理解和操作能力 <sup>1</sup>。通过在config.yaml中配置，AppAgent会构建一个离线文档检索器（build_offline_docs_retriever）<sup>9</sup>。
* **在线Bing搜索引擎 (Online Bing Search Engine):** 当离线文档信息不足或过时，UFO可以利用Bing搜索获取最新的在线信息 <sup>1</sup>。这同样需要在配置文件中激活和设置。AppAgent会构建一个在线搜索检索器（build_online_search_retriever）<sup>9</sup>。
* **自我经验/演示 (Self-Experience/Demonstration):** UFO可以保存任务成功完成的轨迹（execution traces），作为未来任务的参考经验 <sup>1</sup>。AppAgent在会话结束后会询问用户是否保存轨迹。通过构建经验检索器（build_experience_retriever），智能体可以从过去的成功案例中学习 <sup>9</sup>。
* **用户演示 (User Demonstration):** 用户可以直接向系统演示如何完成特定任务，这些演示也会被整合到知识基底中，供智能体学习 <sup>1</sup>。

这些不同来源的知识被整合到一个向量存储（vector store）中，在推理时（即AppAgent执行ReAct循环时）按需检索 <sup>5</sup>。检索到的相关知识会作为上下文信息，辅助LLM进行更准确的思考和决策。例如，在AppAgent中，会使用retrieved_documents_prompt_helper或rag_experience_retrieve等方法将检索到的文档或经验整合到发送给LLM的提示中 <sup>9</sup>。

这种机制使得UFO不仅仅是一个静态的执行代理，更是一个能够适应新应用、新任务、新信息，并从经验中不断成长的动态系统。learner目录包含了构建帮助文档向量数据库的脚本和工具，而vectordb目录则用于存储RAG所需的向量数据库数据 <sup>19</sup>。experience目录负责解析和保存智能体的自我经验 <sup>19</sup>。


### **5.4. ReAct循环与多模态感知**

UFO中的AppAgent采用**ReAct (Reasoning and Acting)** 的工作模式 <sup>5</sup>。这是一个迭代的“观察-思考-行动”循环，旨在模拟人类在解决问题时的认知过程。



1. **观察 (Observation):** AppAgent首先感知当前应用程序的状态。这涉及到**多模态感知 (multimodal perception)** <sup>5</sup>。
    * **视觉层面 (Visual Layer):** 捕获应用程序窗口的截图，使LLM能够理解UI的整体布局和视觉元素 <sup>4</sup>。
    * **语义层面 (Semantic Layer):** 查询Windows UIA API，提取关于应用程序、窗口及其控件层级的结构化元数据 <sup>12</sup>。这包括控件的名称、类型、状态等信息。
    * 在原始的UFO实现中，GPT-Vision被用来分析GUI截图和控件信息 <sup>3</sup>。AppAgent会生成对当前应用窗口截图的详细描述，并分析上一个动作是否生效 <sup>4</sup>。
2. **思考 (Thought):** 基于观察到的信息（包括视觉和语义信息，以及从知识基底检索到的相关上下文），AppAgent（通常是其内部的LLM）进行逻辑推理，分析当前状态，回顾任务目标和子任务计划，并决定下一步最合理的操作 <sup>4</sup>。这个思考过程遵循思维链（Chain-of-Thought, CoT）的范式 <sup>4</sup>。输出包括对当前动作决策的逻辑思考和理由 <sup>4</sup>。
3. **行动 (Action):** 根据思考的结果，AppAgent生成一个或多个具体的动作指令。这些指令可能包括：
    * 选择一个特定的UI控件进行交互（Selected Control）<sup>4</sup>。
    * 确定要对该控件执行的操作函数及其参数（Function, Args）<sup>4</sup>。例如，Click（点击）、SetText（输入文本）、Scroll（滚动）、GetText（获取文本）等 <sup>4</sup>。
    * 这些动作通过Puppeteer执行器实际作用于应用程序。

这个循环不断重复，直到当前子任务完成（状态变为FINISH），或者需要用户干预（状态变为PENDING），或者需要切换到其他应用（状态变为APP_SELECTION，由HostAgent处理）<sup>4</sup>。

多模态感知是ReAct循环成功的关键。仅依赖文本信息（如UIA树）可能无法完全理解复杂或自定义的UI，而仅依赖视觉信息又可能缺乏精确的控件语义。UFO通过结合两者，使智能体能够更全面地理解应用状态，从而做出更明智的决策。


### **5.5. 投机性多动作执行 (Speculative Multi-Action)**

为了解决大型语言模型（LLM）固有的推理延迟问题，并提高自动化流程的整体效率，UFO²引入了**投机性多动作执行（Speculative Multi-Action）**机制 <sup>1</sup>。

该机制的核心思想是：与其让AppAgent在ReAct循环中每一步都单独调用LLM进行一次观察-思考-行动的决策，不如尝试预测接下来可能连续发生的多个步骤，并将这些预测的动作序列捆绑在一起，通过一次LLM调用进行统一的评估和验证 <sup>1</sup>。

具体来说，**Speculative Executor（投机执行器）**会根据当前状态和任务目标，预测出一批（batch）可能的后续动作 <sup>5</sup>。然后，这些预测的动作会与实时的UIA状态（或其他应用状态信息）进行比对验证，以确保它们的可行性和正确性 <sup>1</sup>。如果LLM确认这个动作序列是合理的，那么这些动作就可以被连续执行，从而减少了多次LLM调用的开销。

根据项目文档，这种方法可以将LLM的查询次数减少高达51% <sup>1</sup>。这对于提升用户体验和降低API调用成本都具有重要意义。

在UFO的早期版本（README_v1.md中提及）中，也曾引入“多动作模式”（Multi-Action Mode），通过在config_dev.yaml中设置ACTION_SEQUENCE=True来启用，允许在单次推理步骤中执行多个动作 <sup>17</sup>。投机性多动作执行可以看作是这一理念的进一步发展和优化，使其更加智能和动态。

这种机制的挑战在于如何准确地预测动作序列，以及如何有效地验证这些序列。如果预测不准确或验证不充分，可能会导致错误的执行路径。因此，其有效性在很大程度上依赖于底层LLM的预测能力和对当前应用状态的准确把握。


### **5.6. 画中画桌面 (Picture-in-Picture Desktop)**

为了提升用户体验，使得自动化任务的执行不干扰用户的正常工作，UFO²计划并已完成（将在下一版本发布）**画中画桌面（Picture-in-Picture Desktop, PiP）**功能 <sup>1</sup>。

PiP模式的核心特性是，智能体的自动化操作将在一个隔离的、沙箱化的虚拟桌面环境中运行 <sup>1</sup>。这意味着：



* 用户的主屏幕、鼠标和键盘输入将保持不被自动化过程所占用或干扰 <sup>1</sup>。用户可以继续在主桌面上进行自己的工作，而UFO在后台的PiP窗口中执行自动化任务。
* 智能体拥有一个独立的工作空间，可以安全地打开应用、操作窗口、与UI元素交互，而不必担心与用户的操作发生冲突。
* 这种隔离性也有助于提高自动化任务的稳定性和可预测性，因为它减少了外部（用户）干扰的可能性。

UFO²的论文中提到，PiP接口是一个安全的、嵌套的桌面环境，使得智能体可以独立于用户的主会话执行任务 <sup>12</sup>。

这一特性对于将UFO从一个主要面向开发者和研究人员的工具，转变为一个可供更广泛用户在日常工作中使用的实用生产力工具有着重要意义。它解决了许多桌面自动化工具面临的一个共同痛点：自动化脚本运行时，用户往往无法使用计算机。PiP模式通过提供并发操作的能力，极大地增强了UFO的实用性。


## **6. 安装与使用**

UFO项目提供了相对清晰的安装和配置指南，旨在帮助用户快速上手。

**环境要求:**



* 操作系统：Windows 10 或更高版本 <sup>1</sup>。
* Python版本：≥3.10 <sup>1</sup>。

**安装步骤 **<sup>1</sup>**:**

1. **（可选）创建conda环境:**
    ```bash
    conda create -n ufo python=3.10
    conda activate ufo
    ```

2. **克隆仓库:**
    ```bash
    git clone https://github.com/microsoft/UFO.git
    cd UFO
    ```

3. **安装依赖:**
    ```bash
    pip install -r requirements.txt
    ```
    
    `requirements.txt` 文件列出了项目所需的Python包及其版本 <sup>20</sup>。主要依赖包括：

    - `openai`: 用于与OpenAI模型交互
    - `langchain`, `langchain_community`: LLM应用开发框架
    - `Pillow`: 图像处理
    - `pywin32`, `pywinauto`, `uiautomation`: Windows自动化库
    - `PyYAML`: 解析配置文件
    - `faiss-cpu`: 用于向量相似性搜索（RAG）
    - `sentence-transformers`: 生成文本嵌入
    - 其他依赖:
        - `art`, `colorama`, `msal`, `Requests`, `lxml`, `psutil`
        - `beautifulsoup4`, `pandas`, `html2text`, `pyautogui`
    
    如果需要使用特定的LLM（如Qwen）或功能（如AAD认证、停用词移除），可能需要取消注释`requirements.txt`中的相关库并安装 <sup>1</sup>。

**配置LLM** <sup>1</sup>:

在运行UFO之前，必须为HostAgent和AppAgent单独配置LLM。这通过复制ufo/config/config.yaml.template为ufo/config/config.yaml并编辑其中的HOST_AGENT和APP_AGENT部分来完成。

需要配置的参数通常包括：



* VISUAL_MODE: 是否使用视觉模型 (e.g., True)。
* API_TYPE: API类型 (e.g., "openai", "aoai")。
* API_BASE: API端点URL。
* API_KEY: API密钥。
* API_VERSION: API版本。
* API_MODEL: 使用的模型名称 (e.g., "gpt-4o")。
* API_DEPLOYMENT_ID (针对Azure OpenAI)。

（可选）配置RAG 1:

为了增强UFO的能力，可以在ufo/config/config.yaml中配置外部数据库以支持检索增强生成（RAG）。可配置的RAG选项包括：



* **离线帮助文档 (Offline Help Document):** 使UFO能从本地帮助文档中检索信息。
* **在线Bing搜索引擎 (Online Bing Search Engine):** 利用最新的在线搜索结果。
* **自我经验 (Self-Experience):** 保存任务完成轨迹供未来参考。
* **用户演示 (User-Demonstration):** 通过用户演示提升能力。

启动UFO 1:

在克隆的UFO文件夹中，通过以下命令启动：


    Bash

python -m ufo --task &lt;your_task_name> \


&lt;your_task_name>是用户定义的任务名称。成功启动后，会显示欢迎信息，用户可以通过命令行界面与UFO交互。

执行日志 1:

UFO会将截图、请求和响应日志保存在./ufo/logs/&lt;your_task_name>/目录下。这些日志可用于调试、回放或分析智能体的输出。UFO的文档网站也提供了Markdown日志查看器、请求日志、步骤日志、评估日志、截图和UI树等查看工具 5。

Dataflow模块的使用 21:

UFO项目包含一个dataflow模块，用于为大型动作模型（LAMs）进行数据收集。它也需要安装requirements.txt中的依赖，并单独配置dataflow/config/config.yaml中的PREFILL_AGENT和FILTER_AGENT的LLM参数。


## **7. 社区、支持与开发动态**

UFO项目作为一个开源项目，其发展离不开社区的参与和贡献。

**项目资源与许可:**



* **GitHub仓库:** https://github.com/microsoft/UFO <sup>1</sup>。
* **文档网站:** https://microsoft.github.io/UFO/ <sup>1</sup>。
* **许可证:** MIT许可证 <sup>1</sup>。
* **行为准则和贡献指南:** 项目包含CODE_OF_CONDUCT.md和CONTRIBUTING.md <sup>1</sup>。
* **技术报告:**
    * UFO (原始): arXiv:2402.07939 <sup>1</sup>。
    * UFO²: arXiv:2504.14603 <sup>1</sup>。

**获取帮助:**



* **GitHub Issues:** 这是获取帮助的首选方式 <sup>1</sup>。
* **电子邮件:** ufo-agent@microsoft.com <sup>1</sup>。

媒体关注:

UFO项目自发布以来，受到了多家媒体和技术社区的关注，相关报道强调了其作为下一代Windows智能交互体验的潜力 1。

GitHub Issues分析 (截至2025年5月7日) 22:

对GitHub Issues的分析揭示了一些常见问题、功能请求和活跃讨论：



* **常见问题:**
    * **Office应用UI自动化问题:** 如无法在Office应用中绘制形状、无法点击Office应用中的带下拉菜单的拆分按钮。
    * **特定模型错误:** 如使用qwen-omni-turbo模型时出错。
    * **批处理和跟随者模式错误:** 如在这些模式下出现"No module named 'ufo.config'; 'ufo' is not a package"异常。
    * **执行流总结错误:** 保存执行流为经验时出现"cannot access local variable 'summary'"错误。
    * **TypeError:** 出现TypeError: unsupported operand type(s) for +=: 'int' and 'NoneType'。
    * **ollama.py问题:** _process_messages函数在ollama.py中不工作。
    * **新版Outlook (UWP)模态窗口问题:** 无法遍历新版Outlook中的“查看设置”模态窗口。 这些问题集中反映了在真实世界复杂应用中实现鲁棒UI自动化的挑战。尽管UFO采用了混合控制检测等先进技术，但特定应用的UI特性和边缘情况仍然是需要持续攻克的难点。这表明通用桌面自动化的道路上，针对具体应用的适配和问题修复将是常态。
* **功能请求:**
    * **GUI界面:** 用户希望UFO能提供图形用户界面，而不仅仅是命令行。
    * **集成到Windows:** 用户询问是否有计划将UFO更深度地集成到Windows操作系统中。
    * **简化运行方式:** 用户希望能有更简洁的应用或窗口来运行UFO任务，避免重复执行Python命令。 这些功能请求清晰地表达了用户期望UFO从一个偏研究和开发的工具，向一个更易用、更贴近最终用户的产品形态转变。当前的命令行交互方式对普通用户不够友好，而对GUI和操作系统级别集成的渴望，则暗示了用户看到了UFO作为日常生产力工具的巨大潜力，这可能会影响微软未来若要推广UFO时的产品策略。
* **活跃讨论:**
    * 关于osworld测试的讨论（中文）。

GitHub Pull Requests分析 (截至2025年4月) 23:

开放的PR表明了当前的开发焦点：



* 修复阻碍体验的小问题 (PR #196)。
* 升级包和虚拟环境 (PR #193)。
* 一个较早（2024年7月）但仍开放的PR建议默认使用OpenAI的gpt-4o-mini模型 (PR #114)。 已关闭的PR有150个，这表明在过去有大量的开发和功能合并工作。这些活跃的开发活动，结合路线图中的“自动调试工具包”（Auto-Debugging Toolkit）<sup>5</sup>，显示出项目团队致力于改善开发者体验和提升框架成熟度的决心。一个复杂的系统如UFO，其调试和维护成本不容忽视，“自动调试工具包”若能实现，将极大降低使用和二次开发的门槛。持续的包升级和模型集成工作，也保证了项目的技术先进性和安全性，这对于UFO的长期生命力和社区吸引力至关重要。


## **8. 批判性反思与未来轨迹**

UFO项目在桌面自动化领域展现了雄心勃勃的愿景和坚实的技术基础，但同时也面临着挑战。

**UFO项目的优势:**



* **深度操作系统集成:** 通过UIA、Win32、WinCOM等技术，UFO能够比纯视觉智能体更深入、更可靠地与Windows系统及应用交互 <sup>1</sup>。这为其提供了坚实的底层控制能力。
* **混合自动化策略 (GUI + API):** 结合了API直接调用的高效稳定与GUI操作的灵活通用，是一种务实且强大的方案 <sup>1</sup>。
* **通过RAG实现的持续学习:** 使智能体能够从文档、网络、历史经验和用户演示中不断学习和适应，这是其区别于静态规则系统的核心优势之一 <sup>1</sup>。
* **多智能体架构:** HostAgent与AppAgent的模块化设计，支持任务的专业化处理，并为未来扩展到更复杂的协作场景奠定了基础 <sup>2</sup>。
* **性能优化:** 投机性多动作执行等机制，有效缓解了LLM的延迟问题，提升了交互的流畅性 <sup>1</sup>。
* **用户体验考量:** 即将推出的画中画模式，旨在实现非干扰式的自动化，这对于提升用户接受度至关重要 <sup>1</sup>。
* **开源:** 促进了学术研究、社区贡献和技术透明度，有助于项目的持续迭代和完善 <sup>1</sup>。

**潜在挑战与局限性:**



* **系统复杂度:** 众多的组件和复杂的交互逻辑，使得系统的理解、调试和扩展都具有一定的挑战性。
* **跨场景鲁棒性:** Windows生态的应用程序种类繁多，UI设计各异，确保UFO在各种未知应用和场景下的稳定运行，是一个持续的难题，GitHub Issues中的具体案例也印证了这一点 <sup>22</sup>。
* **对特定LLM的依赖:** 系统的核心认知能力高度依赖于底层的LLM（如GPT-4o、GPT-Vision等）。这些模型的性能、成本以及可能的行为偏差（如“幻觉”）都会直接影响UFO的表现。正如一些行业观察所指出的，所有LLM都容易产生幻觉并可能采取不可预测的行动 <sup>24</sup>。
* **LLM API调用成本:** 尽管有投机性执行等优化，但对于复杂或长时间运行的任务，频繁调用强大的LLM API仍可能带来显著的成本。
* **确定性与可预测性:** LLM的输出本质上具有一定的随机性。虽然RAG和经验学习可以提供引导，但在需要高确定性的关键任务中，这种不确定性可能成为隐患。FollowerAgent在一定程度上是为了应对这类需求而设计的 <sup>6</sup>。
* **安全风险:** 赋予一个智能体深度操作系统控制权限和网络访问能力，必须伴随着强大的安全机制，以防滥用或被恶意利用。项目文档提及了安全策略 <sup>1</sup>，但具体实现和持续维护的有效性至关重要。

**与相关方法的比较:**



* **TaskWeaver (微软):** 同为微软出品，但TaskWeaver更侧重于代码优先的数据分析任务，而UFO是UI优先的通用桌面自动化平台 <sup>1</sup>。
* **COLA (arXiv:2503.09263):** 另一个针对Windows UI自动化的多智能体框架。COLA引入了任务调度器、动态决策智能体池、用于自我进化的记忆单元和交互式回溯机制等特性 <sup>25</sup>。其架构包含规划器、任务调度器、决策智能体池、执行器和审查器等角色。COLA在GAIA基准测试上报告了其性能 <sup>25</sup>。与UFO相比，COLA在动态智能体选择和故障处理机制上可能有其独特之处。
* **通用LLM自动化工具 (如Anthropic的Computer Use, OpenAI Operator, 微软Omniparser+LLM):** 这些工具同样利用LLM进行UI交互 <sup>13</sup>。UFO的差异化在于其专为Windows设计的深度OS集成、多智能体架构以及“AgentOS”的系统级定位。UiPath在其分析中指出，尽管LLM驱动的自动化使用简便，但在高容量、关键任务和数据安全方面，传统的UI自动化仍有优势，这些也是UFO需要持续关注和优化的方面 <sup>24</sup>。Omniparser专注于将UI截图解析为LLM可理解的元素，这与UFO的视觉感知层功能相似 <sup>13</sup>。
* **通用多智能体LLM框架 (如LangChain, LangGraph, CrewAI, AutoGPT):** UFO的多智能体系统在理念上与这些通用框架有共通之处，例如任务分解、专业化智能体和协作 <sup>27</sup>。但UFO是为Windows桌面自动化这一特定领域深度定制的，而这些框架通常更为通用。

**路线图与未来发展方向 **<sup>5</sup>**:**



* **已完成 (将在下一版本发布):** 画中画模式 (Picture‑in‑Picture Mode)、智能体操作系统即服务 (AgentOS‑as‑a‑Service)、自动调试工具包 (Auto‑Debugging Toolkit)。 “AgentOS-as-a-Service”的提法尤其引人注目。它暗示了UFO的核心能力未来可能以平台或API的形式对外提供，允许其他开发者或服务在其基础上构建更上层的应用，或者将UFO的自动化能力集成到自身的服务中。这种“即服务”的模式，如果成功实现，可能催生一个强大的桌面自动化生态系统，极大地拓展UFO的应用边界和影响力。
* **计划中/实施中:** 与MCP（可能是Multi-Control Platform的缩写）的集成以及智能体间通信 (Agent2Agent Communication)。 “智能体间通信”是实现更复杂、分布式协作任务的基础。如果UFO的智能体能够与其他智能体（可能来自不同系统或开发者）进行有效通信和协作，那么UFO将有潜力参与到更大规模、甚至企业级的自动化场景中。这预示着UFO的雄心不止于单用户的桌面，而是可能成为更广泛智能协作网络中的一个重要节点。

此外，项目中dataflow目录的存在以及相关大型动作模型（LAM）论文的提及 <sup>17</sup>，表明训练专门的、更高效的动作模型也是未来的一个重要研究方向。

更广泛的影响:

UFO及其代表的“桌面智能体操作系统”理念，有潜力深刻改变人机交互的范式。它可能大幅降低普通用户实现复杂任务自动化的门槛，使操作系统本身演变为一个更主动、更智能的助手。然而，这也同时带来了关于用户控制权、数据隐私、系统安全以及传统UI未来角色的深刻思考。随着这类智能体能力的不断增强，如何在赋能用户与保障安全之间取得平衡，将是整个领域需要面对的关键议题。UFO项目对LLM的依赖性也意味着，其发展将与基础LLM技术的进步紧密相连，如何持续优化提示工程、验证机制，并探索更高效、更可控的LLM集成方案，将是UFO团队面临的长期挑战。


## **9. 结论**

微软的UFO项目，特别是其演进版本UFO² (Desktop AgentOS)，代表了在构建能够理解自然语言并自主执行复杂桌面任务的智能体方面的一大步。通过深度整合Windows操作系统底层技术（UIA, Win32, WinCOM），结合多智能体协作架构（HostAgent, AppAgent）、先进的AI机制（多模态感知, RAG驱动的持续学习, ReAct循环, 投机性多动作执行）以及对用户体验的细致考量（画中画桌面），UFO旨在提供一个强大、灵活且可进化的自动化平台。

该项目的设计哲学体现了对当前AI能力的深刻理解和对未来人机交互趋势的前瞻性思考。它不仅仅追求单一任务的自动化，而是试图构建一个“智能体操作系统”的雏形，让智能体成为用户与数字世界交互的更高级媒介。混合GUI与API操作的务实策略，使其能够在不同类型的应用程序上实现鲁棒的自动化；持续知识基底则赋予了系统学习和适应的能力，这是其超越传统脚本自动化的关键。

然而，UFO项目也面临着通用AI系统固有的挑战：在多样化和动态的真实世界应用中保持鲁棒性、处理LLM的非确定性和潜在错误、确保系统安全以及管理API调用成本等。GitHub上用户反馈的问题也揭示了在特定应用和场景下实现完美自动化的难度。

未来的发展方向，如“AgentOS-as-a-Service”和“智能体间通信”，预示着UFO可能演变成一个更开放、更具连接性的平台，为更广泛的自动化生态系统提供动力。同时，对大型动作模型（LAM）的研究也可能为其带来性能上的突破。

总而言之，UFO项目是AI驱动自动化领域一个值得高度关注的里程碑。它不仅展示了将大型语言模型的能力应用于复杂桌面环境的巨大潜力，也为未来操作系统如何与智能体深度融合提供了富有启发性的探索。尽管挑战依然存在，但UFO所勾勒的蓝图——一个能够理解用户意图、自主学习、并无缝操作整个桌面环境的智能伙伴——无疑为下一代计算体验指明了一个激动人心的方向。


#### Works cited



1. microsoft/UFO: The Desktop AgentOS. - GitHub, accessed on May 7, 2025, [https://github.com/microsoft/UFO](https://github.com/microsoft/UFO)
2. [2504.14603] UFO2: The Desktop AgentOS - arXiv, accessed on May 7, 2025, [https://arxiv.org/abs/2504.14603](https://arxiv.org/abs/2504.14603)
3. [2402.07939] UFO: A UI-Focused Agent for Windows OS Interaction - arXiv, accessed on May 7, 2025, [https://arxiv.org/abs/2402.07939](https://arxiv.org/abs/2402.07939)
4. UFO : A UI-Focused Agent for Windows OS Interaction - arXiv, accessed on May 7, 2025, [https://arxiv.org/html/2402.07939v1](https://arxiv.org/html/2402.07939v1)
5. UFO Documentation, accessed on May 7, 2025, [https://microsoft.github.io/UFO/](https://microsoft.github.io/UFO/)
6. FollowerAgent - UFO Documentation - Microsoft Open Source, accessed on May 7, 2025, [https://microsoft.github.io/UFO/agents/follower_agent/](https://microsoft.github.io/UFO/agents/follower_agent/)
7. Agents - UFO Documentation - Microsoft Open Source, accessed on May 7, 2025, [https://microsoft.github.io/UFO/agents/overview/](https://microsoft.github.io/UFO/agents/overview/)
8. HostAgent - UFO Documentation - Microsoft Open Source, accessed on May 7, 2025, [https://microsoft.github.io/UFO/agents/host_agent/](https://microsoft.github.io/UFO/agents/host_agent/)
9. AppAgent - UFO Documentation - Microsoft Open Source, accessed on May 7, 2025, [https://microsoft.github.io/UFO/agents/app_agent/](https://microsoft.github.io/UFO/agents/app_agent/)
10. Follower Mode - UFO Documentation - Microsoft Open Source, accessed on May 7, 2025, [https://microsoft.github.io/UFO/advanced_usage/follower_mode/](https://microsoft.github.io/UFO/advanced_usage/follower_mode/)
11. State - UFO Documentation - Microsoft Open Source, accessed on May 7, 2025, [https://microsoft.github.io/UFO/agents/design/state/](https://microsoft.github.io/UFO/agents/design/state/)
12. UFO 2 : The Desktop AgentOS - arXiv, accessed on May 7, 2025, [https://arxiv.org/html/2504.14603v1](https://arxiv.org/html/2504.14603v1)
13. OmniParser V2: Turning Any LLM into a Computer Use Agent - Microsoft Research, accessed on May 7, 2025, [https://www.microsoft.com/en-us/research/articles/omniparser-v2-turning-any-llm-into-a-computer-use-agent/](https://www.microsoft.com/en-us/research/articles/omniparser-v2-turning-any-llm-into-a-computer-use-agent/)
14. Overview - UFO Documentation - Microsoft Open Source, accessed on May 7, 2025, [https://microsoft.github.io/UFO/automator/overview/](https://microsoft.github.io/UFO/automator/overview/)
15. GUI Automator - UFO Documentation - Microsoft Open Source, accessed on May 7, 2025, [https://microsoft.github.io/UFO/automator/ui_automator/](https://microsoft.github.io/UFO/automator/ui_automator/)
16. API Automator - UFO Documentation - Microsoft Open Source, accessed on May 7, 2025, [https://microsoft.github.io/UFO/automator/wincom_automator/](https://microsoft.github.io/UFO/automator/wincom_automator/)
17. UFO/README_v1.md at main · microsoft/UFO - GitHub, accessed on May 7, 2025, [https://github.com/microsoft/UFO/blob/main/README_v1.md](https://github.com/microsoft/UFO/blob/main/README_v1.md)
18. Learning from Help Document - UFO Documentation, accessed on May 7, 2025, [https://microsoft.github.io/UFO/advanced_usage/reinforce_appagent/learning_from_help_document/](https://microsoft.github.io/UFO/advanced_usage/reinforce_appagent/learning_from_help_document/)
19. Project Directory Structure - UFO Documentation - Microsoft Open Source, accessed on May 7, 2025, [https://microsoft.github.io/UFO/project_directory_structure/](https://microsoft.github.io/UFO/project_directory_structure/)
20. UFO/requirements.txt at main · microsoft/UFO - GitHub, accessed on May 7, 2025, [https://github.com/microsoft/UFO/blob/main/requirements.txt](https://github.com/microsoft/UFO/blob/main/requirements.txt)
21. Overview - UFO Documentation - Microsoft Open Source, accessed on May 7, 2025, [https://microsoft.github.io/UFO/dataflow/overview/](https://microsoft.github.io/UFO/dataflow/overview/)
22. Issues · microsoft/UFO · GitHub, accessed on May 7, 2025, [https://github.com/microsoft/UFO/issues](https://github.com/microsoft/UFO/issues)
23. Pull requests · microsoft/UFO · GitHub, accessed on May 7, 2025, [https://github.com/microsoft/UFO/pulls](https://github.com/microsoft/UFO/pulls)
24. UI automation? LLM-based automation? You need both. - UiPath, accessed on May 7, 2025, [https://www.uipath.com/blog/automation/both-ui-automation-and-ai-based-automation](https://www.uipath.com/blog/automation/both-ui-automation-and-ai-based-automation)
25. [2503.09263] COLA: A Scalable Multi-Agent Framework For Windows UI Task Automation, accessed on May 7, 2025, [https://arxiv.org/abs/2503.09263](https://arxiv.org/abs/2503.09263)
26. COLA: A Scalable Multi-Agent Framework For Windows UI Task Automation - arXiv, accessed on May 7, 2025, [https://arxiv.org/html/2503.09263v1](https://arxiv.org/html/2503.09263v1)
27. Multi-agent LLMs in 2024 [+frameworks] | SuperAnnotate, accessed on May 7, 2025, [https://www.superannotate.com/blog/multi-agent-llms](https://www.superannotate.com/blog/multi-agent-llms)