---
title: 'open-lovable 源码拆解：Agentic Search、文本协议与双沙箱'
date: 2026-06-29T09:30:00+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - LLM
  - Architecture
  - Harness Engineering
  - Development
  - Open Source
categories:
  - Development
description: >
  基于固定提交审计 Firecrawl 的 open-lovable，拆解网址抓取、流式代码生成、Agentic Search、Morph 增量编辑与 E2B、Vercel 双沙箱实现。文章区分仓库当时使用的能力与平台当前提供的功能，纠正命中率、耗时和隔离层误读，适合设计 AI 应用生成器、代码检索与执行边界的开发者。
cover:
  image: /images/covers/ai-agent/2026/dissecting-open-lovable.png
  alt: open-lovable 从网页抓取到代码生成与双沙箱预览的源码架构
tldr:
  - 本文只审计 firecrawl/open-lovable 的提交 `69bd93b`，提交日期为 2025-11-19；平台现状另以官方文档说明。
  - 它不是让模型自由调用工具的自主 Agent，而是由应用代码规定顺序的生成与编辑工作流。
  - Agentic Search 让模型生成搜索计划，再由普通代码检索；源码没有命中率实验、数值相关性评分或置信阈值。
  - E2B 与 Vercel 在项目里实现同一套 provider 接口，但项目配置不等于两家平台的全部能力。
  - 最值得带走的不是某个模型，而是边界：模型负责生成候选，程序负责检索、解析、执行与降级。
maturity: budding
columns:
  - agent-engineering
---

open-lovable 看起来像一句很短的产品承诺：给它一个网址，得到一个可继续修改的 React 应用。真正值得读的却不是生成结果，而是它怎样把抓取、模型输出和不可信代码执行接成一条可控链路。

先把时间钉住。本文审计的是 [firecrawl/open-lovable `69bd93bae7a9c97ef989eb70aabe6797fb3dac89`](https://github.com/firecrawl/open-lovable/tree/69bd93bae7a9c97ef989eb70aabe6797fb3dac89)，该提交日期为 **2025-11-19**。下文凡是说“项目里”，都只指这个提交；凡是说“当前平台”，则引用截至本文复核时的官方文档。这样做看似笨，却能避免把后来新增的平台能力倒灌进旧代码。

![open-lovable 的生成与执行链路封面图](/images/covers/ai-agent/2026/dissecting-open-lovable.png)

## 先看结论：它是一条工作流

项目的 README 把它定义为 Firecrawl 团队制作的示例应用，需要 Firecrawl、模型和沙箱相关凭证；依赖表则显示它使用 Next.js、Vercel AI SDK、Firecrawl SDK、E2B 与 Vercel Sandbox 等组件。来源可直接核对 [README](https://github.com/firecrawl/open-lovable/blob/69bd93bae7a9c97ef989eb70aabe6797fb3dac89/README.md#L1-L63) 和 [package.json](https://github.com/firecrawl/open-lovable/blob/69bd93bae7a9c97ef989eb70aabe6797fb3dac89/package.json#L15-L96)。

它没有一个“模型决定下一步、调用工具、读取结果、继续思考”的开放循环。更贴近源码的描述是：

1. 抓取网址内容；
2. 拼装提示词并调用模型；
3. 从文本流中解析文件或编辑块；
4. 把结果写入沙箱；
5. 启动 Vite，并把暴露出来的地址放进预览；
6. 用户再次提出修改时，进入编辑流程。

控制权始终在应用代码里。模型能决定生成什么，却不能任意扩张流程。这种结构并不“低级”；它只是把自由度留在内容生成，把顺序、执行和失败处理留给程序。

## 文本协议：模型写声明，程序做动作

主生成端点通过 Vercel AI SDK 的 `streamText` 对接多家模型，而不是把文件系统作为原生工具交给模型。模型被要求输出带标签的文本，例如：

```xml
<file path="src/components/Hero.jsx">
  <!-- 完整文件内容 -->
</file>

<package>lucide-react</package>
```

应用端再用正则解析 `<file>`、`<package>`、`<command>` 等区块。解析器还会区分闭合与未闭合的文件块，并在同一路径出现多个版本时倾向保留完整或更长的版本。这里有一个很朴素的边界：**模型只提交一份声明，真正的写文件、装依赖和执行命令由服务端完成。** 可核对 [生成端点](https://github.com/firecrawl/open-lovable/blob/69bd93bae7a9c97ef989eb70aabe6797fb3dac89/app/api/generate-ai-code-stream/route.ts#L1-L45) 与 [应用代码端点](https://github.com/firecrawl/open-lovable/blob/69bd93bae7a9c97ef989eb70aabe6797fb3dac89/app/api/apply-ai-code/route.ts#L18-L127)。

编辑时还有另一种协议：

```xml
<edit target_file="src/App.jsx">
  <update>只描述需要合并的改动</update>
</edit>
```

当 `MORPH_API_KEY` 存在且处于编辑模式，服务端尝试解析这些 `<edit>` 块并交给 Morph；没有解析到可用编辑时，代码回到完整文件流程。换句话说，Morph 是可选的 apply 路径，不是整个产品成立的前提。[源码中的开关与回落](https://github.com/firecrawl/open-lovable/blob/69bd93bae7a9c97ef989eb70aabe6797fb3dac89/app/api/apply-ai-code/route.ts#L137-L153) 写得很直接。

这套文本协议的好处是模型供应商之间容易共用，流式展示也自然；代价同样明确：协议正确性要靠提示词、正则和回落逻辑共同维护。XML 外形不等于 XML 解析器，模型漏一个闭合标签，应用就得自己收拾残局。

## Agentic Search：别给简单排序编造科学感

这部分最容易被二手资料说得神乎其神。源码其实清楚而克制。

### 第一步：模型只生成搜索计划

`/api/analyze-edit-intent` 使用 `generateObject` 和 Zod schema，让模型返回：

- `editType`
- `reasoning`
- `searchTerms`
- 可选的 `regexPatterns`
- `fileTypesToSearch`
- `expectedMatches`
- 可选的 `fallbackSearch`

`editType` 只有七种：`UPDATE_COMPONENT`、`ADD_FEATURE`、`FIX_ISSUE`、`UPDATE_STYLE`、`REFACTOR`、`ADD_DEPENDENCY`、`REMOVE_ELEMENT`。这里模型输出的是**检索计划，不是最终文件名**。[schema 与提示词](https://github.com/firecrawl/open-lovable/blob/69bd93bae7a9c97ef989eb70aabe6797fb3dac89/app/api/analyze-edit-intent/route.ts#L34-L60) 还明确要求优先搜索界面文案、组件名、类名或结构模式。

### 第二步：普通代码逐行检索

执行器遍历符合后缀的文件，再逐行做两类匹配：

1. `searchTerms`：忽略大小写的子串匹配；
2. `regexPatterns`：搜索词没命中时再尝试正则。

每个命中保存行号、该行前后三行和一个离散的 `confidence`。主搜索完全无结果时，才运行 `fallbackSearch`。[检索循环](https://github.com/firecrawl/open-lovable/blob/69bd93bae7a9c97ef989eb70aabe6797fb3dac89/lib/file-search-executor.ts#L42-L146) 没有向量数据库，也没有语义重排。

### 第三步：`high / medium / low` 到底怎么分

源码声明了三档：`high`、`medium`、`low`。实际赋值规则是：

- 初始值为 `medium`；
- 搜索词在原始行中按原大小写再次命中，设为 `high`；
- 或该行包含 `function`、`export`、`return`，设为 `high`；
- 正则命中保持 `medium`。

执行器按 `high > medium > low` 排序。值得注意的是，这个版本虽然声明了 `low`，却没有任何分支把结果赋成 `low`。[分档与排序源码](https://github.com/firecrawl/open-lovable/blob/69bd93bae7a9c97ef989eb70aabe6797fb3dac89/lib/file-search-executor.ts#L101-L154) 就这么简单。

因此，不能把它改写成数值相关性评分，也不能宣称有词频、位置、文件类型等多因子加权。`expectedMatches` 出现在搜索计划类型与 schema 中，但执行器没有用它验证结果数量。源码也没有提供命中率或搜索耗时的对照实验。

### 第四步：只有两条 `editType` 特例

`selectTargetFile` 的规则也很少：

- `UPDATE_STYLE`：优先选 `.jsx` 或 `.tsx`；
- `REMOVE_ELEMENT`：优先选命中行含 `return` 或 `<` 的结果；
- 其他情况：取已排序结果的第一个。

这不是复杂的代码图推理，只是一层可读的启发式选择。[目标文件选择器](https://github.com/firecrawl/open-lovable/blob/69bd93bae7a9c97ef989eb70aabe6797fb3dac89/lib/file-search-executor.ts#L216-L270) 的价值恰好在于它没有假装聪明。

生成端点拿到目标后，只把该文件设为主编辑文件，并把路径、行号和原因写进“surgical edit”提示词；搜索失败或抛错时，再回到较宽的上下文选择方法。[接线代码](https://github.com/firecrawl/open-lovable/blob/69bd93bae7a9c97ef989eb70aabe6797fb3dac89/app/api/generate-ai-code-stream/route.ts#L183-L301) 中没有基于某个置信阈值决定是否接受结果。源码里的个别固定数值只是写入编辑上下文的元数据，不能当作经过校准的概率，更不能推导出准确率。

这里真正可借鉴的不是“Agentic”这个名字，而是职责分割：

> 让模型把自然语言改写成搜索条件，让确定性代码完成有限遍历。

模型擅长理解“把首屏按钮改成暖色”在说什么；程序擅长保证一次遍历会结束、每个命中可追溯。把两者接起来，比让模型在代码库里漫游更容易调试。

## 双沙箱：项目实现与平台能力要分开说

代码生成后必须在某处安装依赖、启动进程并暴露预览。open-lovable 为 E2B 和 Vercel 实现了一套共同的 `SandboxProvider` 契约，包括创建、执行命令、读写文件、列文件、安装依赖、获取 URL、终止与存活检查；工厂根据参数或环境变量选择 provider。可核对 [抽象接口](https://github.com/firecrawl/open-lovable/blob/69bd93bae7a9c97ef989eb70aabe6797fb3dac89/lib/sandbox/types.ts#L21-L64) 与 [工厂](https://github.com/firecrawl/open-lovable/blob/69bd93bae7a9c97ef989eb70aabe6797fb3dac89/lib/sandbox/factory.ts#L1-L40)。

### 这个提交里的 E2B provider

E2B 实现调用 `@e2b/code-interpreter` 创建沙箱，通过 `getHost` 取得 Vite 端口地址。通用命令被拆成参数数组，包进 Python `subprocess.run(..., shell=False)`；写文件优先使用 SDK 文件 API，缺失时再执行 Python 写入。[E2B provider](https://github.com/firecrawl/open-lovable/blob/69bd93bae7a9c97ef989eb70aabe6797fb3dac89/lib/sandbox/providers/e2b-provider.ts#L27-L136) 还定义了 `reconnect`，但这个版本直接返回 `false`。所以，“E2B 平台能重连”与“该提交已经实现重连”是两件事。

E2B 当前官方文档把 Sandbox 定义为按需创建的隔离 Linux VM，并提供文件、命令和生命周期 API；持久化文档也说明了连接、暂停与恢复能力：[E2B 文档](https://e2b.dev/docs) 与 [Sandbox persistence](https://e2b.dev/docs/sandbox/persistence)。这些是平台今天的能力，不代表旧 provider 自动获得了对应接线。

### 这个提交里的 Vercel provider

Vercel 实现创建 `node22` 沙箱，声明 5173 端口，使用 `/vercel/sandbox` 作为工作目录，并通过 `sandbox.domain(5173)` 取得预览地址。命令走 `runCommand({ cmd, args, cwd })`；文件优先走 `writeFiles`，失败时退到 shell 写入。[Vercel provider](https://github.com/firecrawl/open-lovable/blob/69bd93bae7a9c97ef989eb70aabe6797fb3dac89/lib/sandbox/providers/vercel-provider.ts#L8-L188) 反映的是当时这个项目选择的配置，而不是 Vercel Sandbox 的完整产品边界。

Vercel 当前官方文档将 Sandbox 描述为运行不可信或用户生成代码的临时计算环境；每个沙箱运行在独立的 Firecracker microVM 中，并支持 Node.js、Python、快照等能力，默认工作目录也是 `/vercel/sandbox`。这些现状应以 [Vercel Sandbox 官方文档](https://vercel.com/docs/sandbox) 为准。

因此，不能再用“E2B 是 microVM、Vercel 是容器”来区分二者：按当前两家官方资料，它们都使用 Firecracker microVM。也不能从 open-lovable 的几百行 provider 代码推导出启动性能、安全等级或平台上限。能从这个提交确认的，只有**项目怎样调用它们**。

## 这套实现真正暴露的工程问题

源码好读，不等于没有风险。恰恰因为没有厚重框架，边界都摆在桌面上。

### 1. 文本 DSL 是兼容层，也是故障面

纯文本标签绕开了不同模型的工具调用差异，却把格式校验压力转给应用。生产化时至少要给解析器加结构化测试：重复文件、未闭合标签、标签出现在代码字符串里、超长输出、空内容，都应有明确结果。

### 2. 搜索分档不是质量评估

`high` 只说明命中了几条手写规则，不代表“这个文件有高概率是正确目标”。把启发式标签叫作 confidence 很方便，也很容易诱导后来者过度解释。更稳妥的做法是记录可核对的理由：命中了哪个词、哪条正则、哪一行，以及为什么选了这个文件。

### 3. provider 抽象只统一接口，不统一语义

两家 provider 的路径、命令接口、身份验证和进程生命周期不同。抽象类能减少业务层分支，却不能保证同一命令在两端完全一致。真正的可替换性要靠契约测试，而不是靠类名。

### 4. “能预览”不是“生成正确”

Vite 启动只证明代码到了可运行环境。它没有证明页面视觉一致、交互正确、依赖安全，也没有证明用户要求被满足。如果产品要走向可靠，下一层应是构建检查、浏览器冒烟测试和可解释的失败反馈，而不是再堆一个漂亮的百分比。

## 我会怎样复用这套思路

如果要做一个轻量的应用生成器，我会保留三件事：

1. **固定编排**：抓取、生成、解析、执行、验证分别有清楚的所有者；
2. **检索计划与检索执行分离**：模型产出关键词和正则，代码返回带出处的命中；
3. **执行层可替换**：业务代码只依赖 provider 契约，同时为每个实现写一致性测试。

我不会照搬三件事：

1. 不把离散启发式叫作准确率；
2. 不用未经测量的耗时与命中率装饰文章；
3. 不把云平台今天的宣传页，当成旧提交已经使用的功能。

open-lovable 最值得学的地方，不是它“像 Agent”，而是它在不少关键位置拒绝让模型掌权：搜索由有限遍历完成，文件由解析器提取，命令由 provider 执行。模型负责提出候选，程序负责让候选落地并留下证据。

技术文章也该遵守同样的边界。代码里没有的数字，不替它发明；平台后来有的能力，不替旧实现认领。把事实钉在提交上，判断才有落脚处。

## 参考来源

- [firecrawl/open-lovable 固定提交 `69bd93b`](https://github.com/firecrawl/open-lovable/tree/69bd93bae7a9c97ef989eb70aabe6797fb3dac89)
- [Agentic Search 计划 schema](https://github.com/firecrawl/open-lovable/blob/69bd93bae7a9c97ef989eb70aabe6797fb3dac89/app/api/analyze-edit-intent/route.ts#L34-L60)
- [Agentic Search 执行器与目标选择](https://github.com/firecrawl/open-lovable/blob/69bd93bae7a9c97ef989eb70aabe6797fb3dac89/lib/file-search-executor.ts#L42-L270)
- [沙箱 provider 接口与工厂](https://github.com/firecrawl/open-lovable/blob/69bd93bae7a9c97ef989eb70aabe6797fb3dac89/lib/sandbox/types.ts#L21-L64)
- [E2B 官方文档](https://e2b.dev/docs)
- [Vercel Sandbox 官方文档](https://vercel.com/docs/sandbox)
