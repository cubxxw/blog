---
title: '利用 LangChain 框架的语言模型应用：开发者指南'
ShowRssButtonInSectionTermList: true
coverImage:  # 通常使用驼峰式命名 (camelCase) 为 YAML 键
date: '2024-05-22T21:37:34+08:00'  # 确保正确的字符串格式
draft: false
showtoc: true  # 为保持一致性调整为驼峰式命名
tocopen: false
type: 'posts'
author: ['熊鑫伟', '我']
keywords:
  - 'LangChain'
  - '语言模型应用'
  - 'AI框架'
  - '自然语言处理'
  - '机器学习'
  - 'API集成'
  - '软件开发'
  - '语言技术'
  - 'AI开发工具'
  - '编程语言'
  - '开发者指南'
  - '复杂实现'
  - 'AI自动化'
  - 'OpenAI'
  - '语言模型接口'
tags:
  - 'AI 开发 (AI Development)'
  - '语言模型 (Language Models)'
  - 'LangChain'
  - 'AI 框架 (AI Frameworks)'
  - '机器学习 (Machine Learning)'
  - 'API 集成 (API Integration)'
  - '自然语言处理 (NLP)'
  - '软件开发 (Software Development)'
  - '编程 (Programming)'
  - '自动化 (Automation)'
  - 'AI 工具 (AI Tools)'
  - 'OpenAI'
  - '深度学习 (Deep Learning)'
categories:
  - '开发 (Development)'
  - '人工智能 (AI)'
description: '本指南深入探讨了使用 LangChain 框架集成和应用语言模型的过程，专为希望简化复杂实现的开发者量身定制。'
---

## 什么是Langchain？

**LangChain 为开发者提供了一个强大的框架，用于快速构建和部署复杂的基于语言模型的应用程序，满足了需要集成多种语言处理功能至一体化解决方案的需求。**

 **LangChain 的 PMF：**

1. **核心用户和使用场景**：LangChain 设计用于简化使用语言模型进行应用开发的过程。它特别适合于需要将多个语言技术集成到一起的开发者和企业，例如集成聊天机器人、自动内容生成工具等。

2. **市场需求**：随着 AI 和机器学习技术的发展，市场上对于能够简化和加速语言模型应用开发的工具的需求持续增长。LangChain 通过提供一个结构化的方式来组合不同的语言能力（如理解、生成、概括等），满足了这一需求。

3. **竞争优势**：LangChain 的优势可能在于其框架的灵活性和扩展性。对开发者而言，这意味着可以用较少的代码实现更复杂的语言处理任务，这是其吸引用户的一个关键因素。

4. **用户反馈和市场接受程度**：衡量 PMF 的一个重要方面是用户的反馈和产品的市场接受程度。如果 LangChain 的用户基础持续增长，且用户反馈积极，那么可以认为它在实现良好的产品市场契合度方面是成功的。



**LangChain简化了LLM应用程序生命周期的每个阶段：**

1. 开发：使用 `LangChain` 的开源构建块和组件构建您的应用程序。使用第三方集成和模板开始运行。
2. 生产化：使用 `LangSmith` 检查、监控和评估您的链，以便您可以充满信心地持续优化和部署。
3. 部署：使用 `LangServe` 将任何链转变为 `API`。

![Diagram outlining the hierarchical organization of the LangChain framework, displaying the interconnected parts across multiple layers.](http://sm.nsddd.top/langchain_stack.svg)


### langchain 框架组成

**具体来说，该框架由以下开源库组成：**

- `langchain-core` ：基础抽象和LangChain表达式语言。
- `langchain-community` ：第三方集成。
  - 合作伙伴包（例如 `langchain-openai` 、 `langchain-anthropic` 等）：一些集成已进一步拆分为自己的轻量级包，仅依赖于 `langchain-core` 。
- `langchain` ：构成应用程序认知架构的链、代理和检索策略。
- `langgraph`：通过将步骤建模为图中的边和节点，使用 LLMs 构建健壮且有状态的多角色应用程序。
- `langserve`：将 LangChain 链部署为 REST API。

**更广泛的生态系统：**

- `LangSmith`：一个开发者平台，可让您调试、测试、评估和监控LLM应用程序，并与LangChain无缝集成。



### LangChain 组件介绍

**模型 (Models)**

模型是 LangChain 的基础，它提供了与各大语言模型的接口和调用细节。这些模型不仅处理语言生成和理解的任务，还包括输出解析机制，确保从模型返回的数据是准确和可用的。

**提示模板 (Prompts)**

提示模板使得提示工程更加流线化，通过精心设计的模板激发大语言模型的潜力。这些模板帮助用户以最有效的方式引导模型，从而获得更好的响应。

**数据检索 (Indexes)**

数据检索组件允许用户构建和操作文档库。它接受用户的查询并返回最相关的文档，极大地便利了本地知识库的搭建和使用。

**记忆 (Memory)**

记忆组件使 ChatBot 能够通过短时记忆和长时记忆，在对话过程中存储和检索数据。这一功能让 ChatBot 记住用户的身份和对话内容，提供更加个性化的交互体验。

**链 (Chains)**

链是 LangChain 中的核心机制之一，它封装各种功能模块，通过一系列组合自动而灵活地完成常见用例。链的设计使得 LangChain 能够灵活地扩展和适应不同的应用需求。

**代理 (Agents)**

代理是 LangChain 中的另一个核心机制，通过设立“代理”使大模型能够自主调用外部和内部工具。这种机制使得创建一个强大的、能够独立运行的智能代理成为可能，极大地扩展了 App 的自驱力。



### 快速开始

**1. 安装 LangChain OpenAI 插件**

首先，你需要安装 LangChain 的 OpenAI 插件。这个插件使你能够通过 Python 方便地调用 OpenAI 的语言模型。

打开你的终端或命令提示符，然后运行以下命令来安装所需的包：

```bash
pip install langchain-openai
```

**2. 设置环境变量**

在你的 Python 脚本中设置环境变量 `OPENAI_API_KEY` 是一种方式，但通常建议在你的操作系统中直接设置环境变量，以避免在代码中直接暴露密钥。

**对于 Windows 用户:**

在命令行中运行：

```cmd
set OPENAI_API_KEY=你的OpenAI Key
```

**对于 macOS/Linux 用户:**

在终端中运行：

```bash
export OPENAI_API_KEY=你的OpenAI Key
export  OPENAI_API_BASE=你的代理地址
```

**3. 编写 Python 脚本**

在你的 Python 脚本中，确保已经正确地导入了需要的模块，并且按照你的需求调用了模型。下面是一个更新的脚本例子，这里假设你已经设置了环境变量，因此不需要在脚本中再次设置：

```python
from langchain_openai import OpenAI

# 创建一个 OpenAI 类的实例
llm = OpenAI(model_name="gpt-3.5-turbo-instruct", max_tokens=200)

# 调用模型并传入指定的提示
text = llm.invoke("请给我写一句情人节红玫瑰的中文宣传语")

# 输出结果
print(text)
```

这里，我们先导入了 OpenAI 的 API Key，然后从 LangChain 中导入 OpenAI 的 Text 模型接口，并初始化这个大语言模型，把我们的需求作为提示信息，传递给大语言模型。

运行程序，我得到了好几个漂亮的文案。而且每次运行都会有新的惊喜。

上面的程序其实直接去网页端交互效果更好，查看是否有更合适网页端没办法完成的效果，我们就用一段简单的代码实现上述功能。这段代码主要包含三个部分：

1. 初始化图像字幕生成模型（`HuggingFace` 中的 `image-caption` 模型）。
2. 定义 LangChain 图像字幕生成工具。
3. 初始化并运行 LangChain Agent（代理），这个 Agent 是 OpenAI 的大语言模型，会自动进行分析，调用工具，完成任务。

不过，这段代码需要的包比较多。在运行这段代码之前，你需要先更新 LangChain 到最新版本，安装 HuggingFace 的 Transformers 库（开源大模型工具），并安装 Pillow（Python 图像处理工具包）和 PyTorch（深度学习框架）。

```py
pip3 install --upgrade langchain
pip3 install transformers
pip3 install pillow
pip3 install torch torchvision torchaudio
```





#### Text Model（文本模型）

- **主要功能**：这些模型主要用于执行特定的文本处理任务，如文本分类、生成摘要、答案抽取等。

- **交互方式**：通常，文本模型接收一次性的、明确的查询，并针对这些查询返回单次响应。它们不是为持续的对话设计的。

- **典型应用**：

  - **文本生成**：例如，给定一个文章标题，生成一篇文章的内容。
  - **文本嵌入**：生成文本的数值表示，便于进行文本相似度计算或其他机器学习任务。
  - **文本分类**：判断一段文本的情感倾向（正面或负面）。

- **调用**：

  ```py
  import os
  os.environ["OPENAI_API_KEY"] = '你的Open API Key'
  from langchain.llms import OpenAI
  llm = OpenAI(  
      model="gpt-3.5-turbo-instruct",
      temperature=0.8,
      max_tokens=60,)
  response = llm.predict("请给我的花店起个名")
  print(response)
  ```

- **输出**:

  ```py
  花之缘、芳华花店、花语心意、花风旖旎、芳草世界、芳色年华
  ```

  

#### Chat Model（聊天模型）

- **主要功能**：这些模型被专门设计用于模拟人类对话的方式，支持多轮对话，并可以根据上下文维持对话连贯性。

- **交互方式**：聊天模型可以处理一系列相关的输入，并且在对话中维持状态和上下文，使得整个对话看起来更自然、连贯。

- **典型应用**：

  - **客服聊天机器人**：与用户进行对话，解答常见问题，处理客户请求。
  - **个人助理**：与用户进行对话，安排日程，提供天气更新等。

- **调用：**

  ```py
  import os
  os.environ["OPENAI_API_KEY"] = '你的Open API Key'
  from langchain.chat_models import ChatOpenAI
  chat = ChatOpenAI(model="gpt-4",
                      temperature=0.8,
                      max_tokens=60)
  from langchain.schema import (
      HumanMessage,
      SystemMessage
  )
  messages = [
      SystemMessage(content="你是一个很棒的智能助手"),
      HumanMessage(content="请给我的花店起个名")
  ]
  response = chat(messages)
  print(response)
  ```

- **输出**：

  ```py
  content='当然可以，叫做"花语秘境"怎么样？' 
  additional_kwargs={} example=False
  ```

从响应内容“当然可以，叫做‘花语秘境’怎么样？”不难看出，GPT-4 的创造力真的是胜过 GPT-3，她给了我们这么有意境的一个店名，比我自己起的“易速鲜花”好多了。



### 开始使用

我们建议您按照我们的快速入门指南构建您的第一个 LangChain 应用程序来熟悉该框架。在本快速入门中，我们将向你展示如何：

- 使用 LangChain、LangSmith 和 LangServe 进行设置
- 使用LangChain最基本、最常用的组件：提示模板、模型和输出解析器
- 使用 LangChain 表达式语言，这是 LangChain 构建的协议，有助于组件链接
- 使用LangChain构建一个简单的应用程序
- 使用 LangSmith 追踪您的应用程序
- 使用 LangServe 为您的应用程序提供服务



要安装 LangChain 运行：

```
pip install langchain
```



### LangSmith

您使用 LangChain 构建的许多应用程序将包含多个步骤，并多次调用 LLM 调用。随着这些应用程序变得越来越复杂，能够检查链或代理内部到底发生了什么变得至关重要。做到这一点的最佳方法是与 LangSmith 合作。

+ [https://smith.langchain.com/](https://smith.langchain.com/)

请注意，LangSmith 不是必需的，但它很有帮助。如果您确实想使用 LangSmith，请在上面的链接注册后，确保设置环境变量以开始记录跟踪：

```bash
export LANGCHAIN_TRACING_V2="true"
export LANGCHAIN_API_KEY="..."
```

什么时候需要？

> LangChain 使得原型设计大型语言模型（LLM）应用程序和代理变得容易。 然而，将 LLM 应用程序交付到生产环境可能会异常困难。 你可能需要大量定制和迭代你的提示、链和其他组件，以创建高质量的产品。
>
> 什么时候这个工具会派上用场？当你想要：
>
> - 快速调试一个新的链、代理或工具集
> - 可视化组件（链、LLM、检索器等）如何关联和使用
> - 评估单个组件的不同提示和 LLM
> - 在数据集上多次运行给定的链，以确保它始终达到质量标准
> - 捕获使用痕迹，并使用 LLM 或分析管道生成洞察



#### From source

如果您想从源代码安装，可以通过克隆存储库来实现，并确保该目录 `PATH/TO/REPO/langchain/libs/langchain` 正在运行：

```bash
pip install -e .
```



### LangChain core

`langchain-core` 包包含LangChain生态系统其余部分使用的基本抽象以及LangChain表达式语言。它由 `langchain` 自动安装，但也可以单独使用。安装：

```
pip install langchain-core
```



### LangChain community

`langchain-community` 包包含第三方集成。它由 `langchain` 自动安装，但也可以单独使用。安装：

```bash
pip install langchain-community
```



### LangChain experimental

`langchain-experimental` 包包含实验性 LangChain 代码，旨在用于研究和实验用途。安装：

```bash
pip install langchain-experimental
```



### LangGraph

`langgraph` 是一个使用 LLMs 构建有状态、多参与者应用程序的库，构建在 LangChain 之上（并旨在与 LangChain 一起使用）。安装：

```bash
pip install langgraph
```



### LangServe 语言服务

LangServe 帮助开发人员将 LangChain 可运行对象和链部署为 REST API。 LangServe由LangChain CLI自动安装。如果不使用 LangChain CLI，请安装：

```bash
pip install "langserve[all]"
```

对于客户端和服务器依赖性。或者 `pip install "langserve[client]"` 用于客户端代码， `pip install "langserve[server]"` 用于服务器代码。



### LangChain CLI

LangChain CLI 对于使用 LangChain 模板和其他 LangServe 项目非常有用。安装：

```bash
pip install langchain-cli
```

**使用：**

```bash
langchain on  master [⇣] is 📦 v0.0.1 via 🐍 v3.10.12 
❯ langchain-cli
                                                                                                                                     
 Usage: langchain-cli [OPTIONS] COMMAND [ARGS]...                                                                                    
                                                                                                                                     
╭─ Options ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ --version  -v        Print the current CLI version.                                                                               │
│ --help               Show this message and exit.                                                                                  │
╰───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭─ Commands ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ app                    Manage LangChain apps                                                                                      │
│ integration            Develop integration packages for LangChain.                                                                │
│ migrate                Migrate LangChain to the most recent version.                                                              │
│ serve                  Start the LangServe app, whether it's a template or an app.                                                │
│ template               Develop installable templates.                                                                             │
╰───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
```



### LangSmith SDK

`LangSmith SDK` 由 `LangChain` 自动安装。如果不使用 LangChain，请安装：

```bash
pip install langsmith
```



### Expression Language

LangChain Expression Language (LCEL)  是LangChain许多组件的基础，是一种声明式的链组成方式。

LCEL 从第一天起就被设计为支持将原型投入生产，从最简单的“prompt + LLM”链到最复杂的链，无需更改代码。

如果您想要构建特定的东西或者更多的是实践学习者，请查看我们的用例。它们是常见端到端任务的演练和技术，例如：

1. **[Get started](https://python.langchain.com/v0.1/docs/expression_language/)** 开始使用：LCEL 及其优势
2. **[Runnable interface](https://python.langchain.com/v0.1/docs/expression_language/interface/)** Runnable 接口：LCEL 对象的标准接口
3. **[Primitives](https://python.langchain.com/v0.1/docs/expression_language/primitives/)**原语：有关 LCEL 包含的原语的更多信息
4. and more !



**浪链表达语言（LCEL）**

LangChain 表达式语言（LCEL）是一种轻松地将链组合在一起的声明性方式。 LCEL 从第一天起就被设计为支持将原型投入生产，无需更改代码，从最简单的“提示 + LLM”链到最复杂的链（我们已经看到人们成功运行了 100 秒的 LCEL 链）生产步骤）。强调一下您可能想要使用 LCEL 的一些原因：

一流的流支持当您使用 LCEL 构建链时（[https://python.langchain.com/v0.1/docs/expression_language/streaming/](https://python.langchain.com/v0.1/docs/expression_language/streaming/)），您可以获得最佳的首次代币时间（直到第一个输出块出现之前经过的时间）。对于某些连锁店来说，这意味着例如。



## Quickstart Langchain

使用 LangChain 构建的许多应用程序将包含多个步骤，并多次调用 LLM 调用。随着这些应用程序变得越来越复杂，能够检查链或代理内部到底发生了什么变得至关重要。

做到这一点的最佳方法是与 LangSmith 合作。

请注意，LangSmith 不是必需的，但它很有帮助。如果您确实想使用 LangSmith，请在上面的链接注册后，确保设置环境变量以开始记录跟踪：

```bash
export LANGCHAIN_TRACING_V2="true"
export LANGCHAIN_API_KEY="..."
```



### 与 langchain 一起构建

LangChain支持构建将外部数据源和计算连接到LLMs的应用程序。在本快速入门中，我们将介绍几种不同的方法。

我们将从一个简单的 LLM 链开始，它仅依赖于提示模板中的信息来响应。接下来，我们将构建一个检索链，它从单独的数据库中获取数据并将其传递到提示模板中。

然后，我们将添加聊天历史记录，以创建对话检索链。这允许您以聊天方式与此 LLM 进行交互，因此它会记住之前的问题。

最后，我们将构建一个代理 - 它利用 LLM 来确定是否需要获取数据来回答问题。我们将在高层次上介绍这些内容，但所有这些都有很多细节！我们将链接到相关文档。



### LLM Chain 使用 ChatGpt

我们将展示如何使用通过 API 提供的模型（如 OpenAI）和本地开源模型，以及使用 Ollama 等集成。

首先我们需要导入LangChain x OpenAI集成包。

```bash
pip install langchain-openai
```

访问 API 需要 API 密钥，您可以通过创建帐户并前往此处获取该密钥。一旦我们有了密钥，我们就需要通过运行以下命令将其设置为环境变量：

```py
export OPENAI_API_KEY="..."
```

然后我们可以初始化模型：

```py
from langchain_openai import ChatOpenAI

llm = ChatOpenAI()
```

如果您不想设置环境变量，则可以在启动 OpenAI LLM 类时直接通过 `api_key` 命名参数传递密钥：

```py
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(api_key="...")
```

一旦您安装并初始化了您选择的LLM，我们就可以尝试使用它了！让我们问它 LangSmith 是什么 - 这是训练数据中不存在的东西，因此它不应该有很好的响应。

```bash
llm.invoke("how can langsmith help with testing?")
```

我们还可以通过提示模板来指导其响应。提示模板将原始用户输入转换为更好的输入到 LLM。

```py
from langchain_core.prompts import ChatPromptTemplate
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a world class technical documentation writer."),
    ("user", "{input}")
])
```

我们现在可以将它们组合成一个简单的 LLM 链：

```
chain = prompt | llm 
```

我们现在可以调用它并提出同样的问题。它仍然不知道答案，但对于技术作家来说，它应该以更合适的语气做出响应！

```py
chain.invoke({"input": "how can langsmith help with testing?"})
```

ChatModel（因此，该链）的输出是一条消息。然而，使用字符串通常要方便得多。让我们添加一个简单的输出解析器来将聊天消息转换为字符串。

```py
from langchain_core.output_parsers import StrOutputParser

output_parser = StrOutputParser()
```

我们现在可以将其添加到之前的链中：

```py
chain = prompt | llm | output_parser
```

我们现在可以调用它并提出同样的问题。现在答案将是一个字符串（而不是 ChatMessage）。

```py
chain.invoke({"input": "how can langsmith help with testing?"})
```



### LLM Chain 使用本地 Ollama

Ollama 允许您在本地运行开源大型语言模型，例如 Llama 2。

首先，按照以下说明设置并运行本地 Ollama 实例：

- [Download 下载](https://ollama.ai/download)
- 通过 `ollama pull llama2` 获取模型

然后，确保 Ollama 服务器正在运行。之后，可以执行以下操作：

```bash
from langchain_community.llms import Ollama
llm = Ollama(model="llama2")
```

一旦您安装并初始化了您选择的LLM，我们就可以尝试使用它了！让我们问它 LangSmith 是什么 - 这是训练数据中不存在的东西，因此它不应该有很好的响应。

```py
llm.invoke("how can langsmith help with testing?")
```

我们还可以通过提示模板来指导其响应。提示模板将原始用户输入转换为更好的输入到 LLM。

```bash
from langchain_core.prompts import ChatPromptTemplate
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a world class technical documentation writer."),
    ("user", "{input}")
])
```

我们现在可以将它们组合成一个简单的 LLM 链：

```
chain = prompt | llm 
```

我们现在可以调用它并提出同样的问题。它仍然不知道答案，但对于技术作家来说，它应该以更合适的语气做出响应！

```bash
chain.invoke({"input": "how can langsmith help with testing?"})
```

ChatModel（因此，该链）的输出是一条消息。然而，使用字符串通常要方便得多。让我们添加一个简单的输出解析器来将聊天消息转换为字符串。

```bash
from langchain_core.output_parsers import StrOutputParser

output_parser = StrOutputParser()
```

我们现在可以将其添加到之前的链中：

```python
chain = prompt | llm | output_parser
```

我们现在可以调用它并提出同样的问题。现在答案将是一个字符串（而不是 ChatMessage）。

```python
chain.invoke({"input": "how can langsmith help with testing?"})
```



## 深入探索 Diving Deeper

### 检索链 Retrieval Chain

为了正确回答最初的问题（“langsmith 如何帮助测试？” | “how can langsmith help with testing?”），我们需要为 LLM 提供额外的上下文。我们可以通过检索来做到这一点。当您有太多数据无法直接传递到 LLM 时，检索非常有用。然后，您可以使用检索器仅获取最相关的部分并将其传递进去。

在此过程中，我们将从检索器中查找相关文档，然后将它们传递到提示符中。检索器可以由任何东西支持 - SQL 表、互联网等 - 但在本例中，我们将填充向量存储并将其用作检索器。有关矢量存储的更多信息，请参阅此文档。

首先，我们需要加载要索引的数据。为此，我们将使用 WebBaseLoader。这需要安装 BeautifulSoup：

```bash
pip install beautifulsoup4
```

之后我们就可以导入并使用WebBaseLoader了。

```py
from langchain_community.document_loaders import WebBaseLoader
loader = WebBaseLoader("https://docs.smith.langchain.com/user_guide")

docs = loader.load()
```

接下来，我们需要将其索引到向量存储中。这需要一些组件，即嵌入模型和向量存储。

对于嵌入模型，我们再次提供通过 API 或运行本地模型访问的示例。

确保您安装了“langchain_openai”软件包并设置了适当的环境变量（这些变量与 LLM 所需的相同）。

```bash
from langchain_openai import OpenAIEmbeddings

embeddings = OpenAIEmbeddings()
```

现在，我们可以使用此嵌入模型将文档提取到向量存储中。为了简单起见，我们将使用一个简单的本地向量库 FAISS。

```shell
pip install faiss-cpu
```

然后我们可以建立我们的索引：

```py
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter


text_splitter = RecursiveCharacterTextSplitter()
documents = text_splitter.split_documents(docs)
vector = FAISS.from_documents(documents, embeddings)
```



## Langchain 核心组件介绍



### Model I/O

我们可以把对模型的使用过程拆解成三块，分别是输入提示（对应图中的 Format）、调用模型（对应图中的 Predict）和输出解析（对应图中的 Parse）。这三块形成了一个整体，因此在 LangChain 中这个过程被统称为 Model I/O（Input/Output）。

在模型 I/O 的每个环节，LangChain 都为咱们提供了模板和工具，快捷地形成调用各种语言模型的接口。

1. 提示模板：使用模型的第一个环节是把提示信息输入到模型中，你可以创建 LangChain 模板，根据实际需求动态选择不同的输入，针对特定的任务和应用调整输入。
2. 语言模型：LangChain 允许你通过通用接口来调用语言模型。这意味着无论你要使用的是哪种语言模型，都可以通过同一种方式进行调用，这样就提高了灵活性和便利性。
3. 输出解析：LangChain 还提供了从模型输出中提取信息的功能。通过输出解析器，你可以精确地从模型的输出中获取需要的信息，而不需要处理冗余或不相关的数据，更重要的是还可以把大模型给回的非结构化文本，转换成程序可以处理的结构化数据。



### 提示模板

语言模型是个无穷无尽的宝藏，人类的知识和智慧，好像都封装在了这个“魔盒”里面了。但是，怎样才能解锁其中的奥秘，那可就是仁者见仁智者见智了。所以，现在“提示工程”这个词特别流行，所谓 Prompt Engineering，就是专门研究对大语言模型的提示构建。

我的观点是，使用大模型的场景千差万别，因此肯定不存在那么一两个神奇的模板，能够骗过所有模型，让它总能给你最想要的回答。然而，好的提示（其实也就是好的问题或指示啦），肯定能够让你在调用语言模型的时候事半功倍。

那其中的具体原则，不外乎吴恩达老师在他的提示工程课程中所说的：

1. 给予模型清晰明确的指示
2. 让模型慢慢地思考

说起来很简单，对吧？是的，道理总是简单，但是如何具体实践这些原则，又是个大问题。让我从创建一个简单的 LangChain 提示模板开始。

> 这里，我们希望为销售的每一种鲜花生成一段简介文案，那么每当你的员工或者顾客想了解某种鲜花时，调用该模板就会生成适合的文字。
>
> ```py
> # 导入LangChain中的提示模板
> from langchain.prompts import PromptTemplate
> # 创建原始模板
> template = """您是一位专业的鲜花店文案撰写员。\n
> 对于售价为 {price} 元的 {flower_name} ，您能提供一个吸引人的简短描述吗？
> """
> # 根据原始模板创建LangChain提示模板
> prompt = PromptTemplate.from_template(template) 
> # 打印LangChain提示模板的内容
> print(prompt)
> ```
>
> 提示模板的具体内容如下：
>
> ```py
> input_variables=['flower_name', 'price'] 
> output_parser=None partial_variables={} 
> template='/\n您是一位专业的鲜花店文案撰写员。
> \n对于售价为 {price} 元的 {flower_name} ，您能提供一个吸引人的简短描述吗？\n'
> template_format='f-string' 
> validate_template=True
> ```

在这里，所谓“模板”就是一段描述某种鲜花的文本格式，它是一个 `f-string`，其中有两个变量 `{flower_name}` 和 `{price}` 表示花的名称和价格，这两个值是模板里面的占位符，在实际使用模板生成提示时会被具体的值替换。

代码中的 `from_template` 是一个类方法，它允许我们直接从一个字符串模板中创建一个 `PromptTemplate` 对象。打印出这个 `PromptTemplate` 对象，你可以看到这个对象中的信息包括输入的变量（在这个例子中就是 `flower_name` 和 `price`）、输出解析器（这个例子中没有指定）、模板的格式（这个例子中为 `f-string`）、是否验证模板（这个例子中设置为 True）。

因此 PromptTemplate 的 from_template 方法就是将一个原始的模板字符串转化为一个更丰富、更方便操作的 PromptTemplate 对象，这个对象就是 LangChain 中的提示模板。LangChain 提供了多个类和函数，也为各种应用场景设计了很多内置模板，使构建和使用提示变得容易。我们下节课还会对提示工程的基本原理和 LangChain 中的各种提示模板做更深入的讲解。



### 语言模型

LangChain 中支持的模型有三大类：

1. **大语言模型（LLM）**，也称为 Text Model，这些模型将文本字符串作为输入，并返回文本字符串作为输出。典型的 LLM 包括：
   - **OpenAI 的 text-davinci-003**
   - **Facebook 的 LLaMA**
   - **ANTHROPIC 的 Claude**

2. **聊天模型（Chat Model）**，主要代表为 OpenAI 的 ChatGPT 系列模型。这些模型通常由语言模型支持，但它们的 API 更加结构化。具体来说，这些模型将聊天消息列表作为输入，并返回聊天消息。

3. **文本嵌入模型（Embedding Model）**，这些模型将文本作为输入并返回浮点数列表，即 `Embedding`。例如 OpenAI 的 `text-embedding-ada-002`。文本嵌入模型负责把文档存入向量数据库，与我们这里探讨的提示工程关系不大。

然后，我们将调用语言模型，让模型帮我们写文案，并且返回文案的结果。

```py
# 设置OpenAI API Key
import os
os.environ["OPENAI_API_KEY"] = '你的Open AI API Key'

# 导入LangChain中的OpenAI模型接口
from langchain_openai import OpenAI
# 创建模型实例
model = OpenAI(model_name='gpt-3.5-turbo-instruct')
# 输入提示
input = prompt.format(flower_name=["玫瑰"], price='50')
# 得到模型的输出
output = model.invoke(input)
# 打印输出内容
print(output)
```

`input = prompt.format(flower_name=["玫瑰"], price='50')` 这行代码的作用是将模板实例化，此时将 `{flower_name}` 替换为 "玫瑰"，`{price}` 替换为 '50'，形成了具体的提示：“您是一位专业的鲜花店文案撰写员。对于售价为 50 元的玫瑰，您能提供一个吸引人的简短描述吗？”

接收到这个输入，调用模型之后，得到的输出如下：

```bash
让你心动！50元就可以拥有这支充满浪漫气息的玫瑰花束，让TA感受你的真心爱意。
```

复用提示模板，我们可以同时生成多个鲜花的文案。

```py
# 导入LangChain中的提示模板
from langchain import PromptTemplate
# 创建原始模板
template = """您是一位专业的鲜花店文案撰写员。\n
对于售价为 {price} 元的 {flower_name} ，您能提供一个吸引人的简短描述吗？
"""
# 根据原始模板创建LangChain提示模板
prompt = PromptTemplate.from_template(template) 
# 打印LangChain提示模板的内容
print(prompt)

# 设置OpenAI API Key
import os
os.environ["OPENAI_API_KEY"] = '你的Open AI API Key'

# 导入LangChain中的OpenAI模型接口
from langchain import OpenAI
# 创建模型实例
model = OpenAI(model_name='gpt-3.5-turbo-instruct')

# 多种花的列表
flowers = ["玫瑰", "百合", "康乃馨"]
prices = ["50", "30", "20"]

# 生成多种花的文案
for flower, price in zip(flowers, prices):
    # 使用提示模板生成输入
    input_prompt = prompt.format(flower_name=flower, price=price)

    # 得到模型的输出
    output = model.invoke(input_prompt)

    # 打印输出内容
    print(output)
```

模型的输出如下：

```bash
这支玫瑰，深邃的红色，传递着浓浓的深情与浪漫，令人回味无穷！
百合：美丽的花朵，多彩的爱恋！30元让你拥有它！
康乃馨—20元，象征爱的祝福，送给你最真挚的祝福。
```

你也许会问我，在这个过程中，使用 LangChain 的意义究竟何在呢？我直接调用 Open AI 的 API，不是完全可以实现相同的功能吗？

的确如此，让我们来看看直接使用 Open AI API 来完成上述功能的代码。

```py
import openai # 导入OpenAI
openai.api_key = 'Your-OpenAI-API-Key' # API Key

prompt_text = "您是一位专业的鲜花店文案撰写员。对于售价为{}元的{}，您能提供一个吸引人的简短描述吗？" # 设置提示

flowers = ["玫瑰", "百合", "康乃馨"]
prices = ["50", "30", "20"]

# 循环调用Text模型的Completion方法，生成文案
for flower, price in zip(flowers, prices):
    prompt = prompt_text.format(price, flower)
    response = openai.completions.create(
        engine="gpt-3.5-turbo-instruct",
        prompt=prompt,
        max_tokens=100
    )
    print(response.choices[0].text.strip()) # 输出文案
```

上面的代码是直接使用 `OpenAI` 和带有 `{}` 占位符的提示语，同时生成了三种鲜花的文案。看起来也是相当简洁。

不过，如果你深入思考一下，你就会发现 LangChain 的优势所在。我们只需要定义一次模板，就可以用它来生成各种不同的提示。对比单纯使用 f-string 来格式化文本，这种方法更加简洁，也更容易维护。而 LangChain 在提示模板中，还整合了 output_parser、template_format 以及是否需要 validate_template 等功能。

更重要的是，使用 LangChain 提示模板，我们还可以很方便地把程序切换到不同的模型，而不需要修改任何提示相关的代码。

下面，我们用完全相同的提示模板来生成提示，并发送给 HuggingFaceHub 中的开源模型来创建文案。（注意：需要注册 HUGGINGFACEHUB_API_TOKEN）

```py
# 导入LangChain中的提示模板
from langchain.prompts import PromptTemplate
# 创建原始模板
template = """You are a flower shop assitiant。\n
For {price} of {flower_name} ，can you write something for me？
"""
# 根据原始模板创建LangChain提示模板
prompt = PromptTemplate.from_template(template) 
# 打印LangChain提示模板的内容
print(prompt)
import os
os.environ['HUGGINGFACEHUB_API_TOKEN'] = '你的HuggingFace API Token'
# 导入LangChain中的OpenAI模型接口
from langchain_community.llms import HuggingFaceHub
# 创建模型实例
model= HuggingFaceHub(repo_id="google/flan-t5-large")
# 输入提示
input = prompt.format(flower_name=["rose"], price='50')
# 得到模型的输出
output = model(input)
# 打印输出内容
print(output)
```

输出：

```
i love you
```

真是一分钱一分货，当我使用较早期的开源模型 T5，得到了很粗糙的文案 “i love you”（哦，还要注意 T5 还没有支持中文的能力，我把提示文字换成英文句子，结构其实都没变）。

当然，这里我想要向你传递的信息是：你可以重用模板，重用程序结构，通过 LangChain 框架调用任何模型。如果你熟悉机器学习的训练流程的话，这 LangChain 是不是让你联想到 PyTorch 和 TensorFlow 这样的框架——**模型可以自由选择、自主训练，而调用模型的框架往往是有章法、而且可复用的。**

因此，使用 LangChain 和提示模板的好处是：

1. 代码的可读性：使用模板的话，提示文本更易于阅读和理解，特别是对于复杂的提示或多变量的情况。
2. 可复用性：模板可以在多个地方被复用，让你的代码更简洁，不需要在每个需要生成提示的地方重新构造提示字符串。
3. 维护：如果你在后续需要修改提示，使用模板的话，只需要修改模板就可以了，而不需要在代码中查找所有使用到该提示的地方进行修改。
4. 变量处理：如果你的提示中涉及到多个变量，模板可以自动处理变量的插入，不需要手动拼接字符串。
5. 参数化：模板可以根据不同的参数生成不同的提示，这对于个性化生成文本非常有用。

那我们就接着介绍模型 I/O 的最后一步，输出解析。



### 输出解析

LangChain 提供的解析模型输出的功能，使你能够更容易地从模型输出中获取结构化的信息，这将大大加快基于语言模型进行应用开发的效率。

为什么这么说呢？请你思考一下刚才的例子，你只是让模型生成了一个文案。这段文字是一段字符串，正是你所需要的。但是，在开发具体应用的过程中，很明显我们不仅仅需要文字，更多情况下我们需要的是程序能够直接处理的、结构化的数据。

比如说，在这个文案中，如果你希望模型返回两个字段：

1. `description`：鲜花的说明文本
2. `reason`：解释一下为何要这样写上面的文案

那么，模型可能返回的一种结果是：

A：“文案是：让你心动！50 元就可以拥有这支充满浪漫气息的玫瑰花束，让 TA 感受你的真心爱意。为什么这样说呢？因为爱情是无价的，50 元对应热恋中的情侣也会觉得值得。”

上面的回答并不是我们在处理数据时所需要的，我们需要的是一个类似于下面的 Python 字典。

B：`{description: “让你心动！50 元就可以拥有这支充满浪漫气息的玫瑰花束，让 TA 感受你的真心爱意。” ; reason: “因为爱情是无价的，50 元对应热恋中的情侣也会觉得值得。”}`

下面，我们就通过 LangChain 的输出解析器来重构程序，让模型有能力生成结构化的回应，同时对其进行解析，直接将解析好的数据存入 CSV 文档。

```py
# 导入OpenAI Key
import os
os.environ["OPENAI_API_KEY"] = '你的OpenAI API Key'

# 导入LangChain中的提示模板
from langchain.prompts import PromptTemplate
# 创建原始提示模板
prompt_template = """您是一位专业的鲜花店文案撰写员。
对于售价为 {price} 元的 {flower_name} ，您能提供一个吸引人的简短描述吗？
{format_instructions}"""

# 通过LangChain调用模型
from langchain_openai import OpenAI
# 创建模型实例
model = OpenAI(model_name='gpt-3.5-turbo-instruct')

# 导入结构化输出解析器和ResponseSchema
from langchain.output_parsers import StructuredOutputParser, ResponseSchema
# 定义我们想要接收的响应模式
response_schemas = [
    ResponseSchema(name="description", description="鲜花的描述文案"),
    ResponseSchema(name="reason", description="问什么要这样写这个文案")
]
# 创建输出解析器
output_parser = StructuredOutputParser.from_response_schemas(response_schemas)

# 获取格式指示
format_instructions = output_parser.get_format_instructions()
# 根据原始模板创建提示，同时在提示中加入输出解析器的说明
prompt = PromptTemplate.from_template(prompt_template, 
                partial_variables={"format_instructions": format_instructions}) 

# 数据准备
flowers = ["玫瑰", "百合", "康乃馨"]
prices = ["50", "30", "20"]

# 创建一个空的DataFrame用于存储结果
import pandas as pd
df = pd.DataFrame(columns=["flower", "price", "description", "reason"]) # 先声明列名

for flower, price in zip(flowers, prices):
    # 根据提示准备模型的输入
    input = prompt.format(flower_name=flower, price=price)

    # 获取模型的输出
    output = model.invoke(input)
    
    # 解析模型的输出（这是一个字典结构）
    parsed_output = output_parser.parse(output)

    # 在解析后的输出中添加“flower”和“price”
    parsed_output['flower'] = flower
    parsed_output['price'] = price

    # 将解析后的输出添加到DataFrame中
    df.loc[len(df)] = parsed_output  

# 打印字典
print(df.to_dict(orient='records'))

# 保存DataFrame到CSV文件
df.to_csv("flowers_with_descriptions.csv", index=False)
```

输出：

```bash
[{'flower': '玫瑰', 'price': '50', 'description': 'Luxuriate in the beauty of this 50 yuan rose, with its deep red petals and delicate aroma.', 'reason': 'This description emphasizes the elegance and beauty of the rose, which will be sure to draw attention.'}, 
{'flower': '百合', 'price': '30', 'description': '30元的百合，象征着坚定的爱情，带给你的是温暖而持久的情感！', 'reason': '百合是象征爱情的花，写出这样的描述能让顾客更容易感受到百合所带来的爱意。'}, 
{'flower': '康乃馨', 'price': '20', 'description': 'This beautiful carnation is the perfect way to show your love and appreciation. Its vibrant pink color is sure to brighten up any room!', 'reason': 'The description is short, clear and appealing, emphasizing the beauty and color of the carnation while also invoking a sense of love and appreciation.'}]
```

这段代码中，首先定义输出结构，我们希望模型生成的答案包含两部分：鲜花的描述文案（description）和撰写这个文案的原因（reason）。所以我们定义了一个名为 response_schemas 的列表，其中包含两个 ResponseSchema 对象，分别对应这两部分的输出。



## 提示词工程

今天我下楼跑步时，一个老爷爷教孙子学骑车，小孩总掌握不了平衡，蹬一两下就下车。

+ 爷爷说：“宝贝，你得有毅力！”
+ 孙子说：“爷爷，什么是毅力？”
+ 爷爷说：“你看这个叔叔，绕着楼跑了 10 多圈了，这就是毅力，你也得至少蹬个 10 几趟才能骑起来。”
  这老爷爷就是给孙子做了一个 One-Shot 学习。如果他的孙子第一次听说却上来就明白什么是毅力，那就神了，这就叫 Zero-Shot，表明这孩子的语言天赋不是一般的高，从知识积累和当前语境中就能够推知新词的涵义。有时候我们把 Zero-Shot 翻译为“顿悟”，聪明的大模型，某些情况下也是能够做到的。
  Few-Shot（少样本）、One-Shot（单样本）和与之对应的 Zero-Shot（零样本）的概念都起源于机器学习。如何让机器学习模型在极少量甚至没有示例的情况下学习到新的概念或类别，对于许多现实世界的问题是非常有价值的，因为我们往往无法获取到大量的标签化数据。

在提示工程（Prompt Engineering）中，Few-Shot 和 Zero-Shot 学习的概念也被广泛应用。

1. 在 Few-Shot 学习设置中，模型会被给予几个示例，以帮助模型理解任务，并生成正确的响应。
2. 在 Zero-Shot 学习设置中，模型只根据任务的描述生成响应，不需要任何示例。
   而 OpenAI 在介绍 GPT-3 模型的重要论文《Language models are Few-Shot learners（语言模型是少样本学习者）》中，更是直接指出：GPT-3 模型，作为一个大型的自我监督学习模型，通过提升模型规模，实现了出色的 Few-Shot 学习性能。

可以尝试用思维链也就是 CoT（Chain of Thought）的概念来引导模型的推理，让模型生成更详实、更完备的文案



### 什么是 Chain of Thought

CoT 这个概念来源于学术界，是谷歌大脑的 Jason Wei 等人于 2022 年在论文《Chain-of-Thought Prompting Elicits Reasoning in Large Language Models（自我一致性提升了语言模型中的思维链推理能力）》中提出来的概念。它提出，如果生成一系列的中间推理步骤，就能够显著提高大型语言模型进行复杂推理的能力。

Few-Shot CoT 简单的在提示中提供了一些链式思考示例（Chain-of-Thought Prompting），足够大的语言模型的推理能力就能够被增强。简单说，就是给出一两个示例，然后在示例中写清楚推导的过程。

论文中给出了一个大模型通过思维链做数学题的示例。图左和图右，大模型都读入了 OneShot 示例，但是图左只给出了答案，而图右则在 OneShot 示例中给出了解题的具体思路。结果，只给出了答案的模型推理错误，而给出解题思路后，同一个模型生成了正确的答案。

在三种大型语言模型的实验中，CoT 在一系列的算术、常识和符号推理任务中都提高了性能。在 GSM8K 数学问题基准测试中，通过 CoT 指导后，大模型的表现可以达到当时最先进的准确性。

比如，假设我们正在开发一个 AI 花店助手，它的任务是帮助用户选择他们想要的花，并生成一个销售列表。在这个过程中，我们可以使用 CoT 来引导 AI 的推理过程。

1. 问题理解：首先，AI 需要理解用户的需求。例如，用户可能会说：“今天要参加朋友的生日 Party，想送束花祝福她。”我们可以给 AI 一个提示模板，里面包含示例：“遇到 XX 问题，我先看自己有没有相关知识，有的话，就提供答案；没有，就调用工具搜索，有了知识后再试图解决。”—— 这就是给了 AI 一个思维链的示例。
2. 信息搜索：接下来，AI 需要搜索相关信息。例如，它可能需要查找哪些花最适合生日派对。
3. 决策制定：基于收集到的信息，AI 需要制定一个决策。我们可以通过思维链让他详细思考决策的流程，先做什么后做什么。例如，我们可以给它一个示例：“遇到生日派对送花的情况，我先考虑用户的需求，然后查看鲜花的库存，最后决定推荐一些玫瑰和百合，因为这些花通常适合生日派对。”—— 那么有了生日派对这个场景做示例，大模型就能把类似的思维流程运用到其它场景。
4. 生成销售列表：最后，AI 使用 OutputParser 生成一个销售列表，包括推荐的花和价格。

在这个过程中，整体上，思维链引导 AI 从理解问题，到搜索信息，再到制定决策，最后生成销售列表。这种方法不仅使 AI 的推理过程更加清晰，也使得生成的销售列表更加符合用户的需求。具体到每一个步骤，也可以通过思维链来设计更为详细的提示模板，来引导模型每一步的思考都遵循清晰准确的逻辑。



###  Zero-Shot CoT

下面的这两个 CoT 提示模板的例子，来自于 Google Research 和东京大学的论文《大语言模型是零样本推理者》。

图中的（d）示例非常非常有意思，在 Zero-Shot CoT 中，你只要简单地告诉模型“让我们一步步的思考（Let’s think step by step）”，模型就能够给出更好的答案！



### COT 实战

项目需求：在这个示例中，你正在开发一个 AI 运营助手，我们要展示 AI 如何根据用户的需求推理和生成答案。然后，AI 根据当前的用户请求进行推理，提供了具体的花卉建议并解释了为什么选择这些建议。

在这个过程中，AI 需要理解客户的需求之后，按部就班的思考，然后给出最符合逻辑的回答。



**CoT 的模板设计**

针对这个聊天机器人的需求，我设计了下面这样的思维链模板。



## 调用模型：使用OpenAI API还是微调开源Llama2/ChatGLM？

我们来着重讨论 Model I/O 中的第二个子模块，LLM。

关于大模型的微调（或称精调）、预训练、重新训练、乃至从头训练，这是一个相当大的话题，不仅仅需要足够的知识和经验，还需要大量的语料数据、GPU 硬件和强大的工程能力。

好，下面咱们开始一步步地使用开源模型。今天我要带你玩的模型主要是 Meta（Facebook）推出的 Llama2。当然你可以去 Llama 的官网下载模型，然后通过 Llama 官方 GitHub 中提供的方法来调用它。但是，我还是会推荐你从 HuggingFace 下载并导入模型。因为啊，前天百川，昨天千问，今天流行 Llama，明天不就流行别的了嘛。模型总在变，但是 HuggingFace 一直在那里，支持着各种开源模型。我们学东西，尽量选择学一次能够复用的知识。



### 用 HuggingFace 跑开源模型

第一步，还是要登录 [HuggingFace 网站](https://huggingface.co/)，并拿到专属于你的 Token。

第二步，用 `pip install transformers` 安装 HuggingFace Library。详见[这里](https://huggingface.co/docs/transformers/installation)。

第三步，在命令行中运行 `huggingface-cli login`，设置你的 API Token。

当然，也可以在程序中设置你的 API Token，但是这不如在命令行中设置来得安全。

```bash
# 导入HuggingFace API Token
import os
os.environ['HUGGINGFACEHUB_API_TOKEN'] = '你的HuggingFace API Token'
```



### 申请使用 Meta 的 Llama2 模型

在 HuggingFace 的 Model 中，找到 [meta-llama/Llama-2-7b](https://huggingface.co/meta-llama/Llama-2-7b)。注意，各种各样版本的 Llama2 模型多如牛毛，我们这里用的是最小的 7B 版。此外，还有 `13b\70b\chat` 版以及各种各样的非 Meta 官方版。

选择 meta-llama/Llama-2-7b 这个模型后，你能够看到这个模型的基本信息。如果你是第一次用 Llama，你需要申请 Access，因为我已经申请过了，所以屏幕中间有句话：“You have been granted access to this model”。从申请到批准，大概是几分钟的事儿。



### 通过 HuggingFace 调用 Llama

好，万事俱备，现在我们可以使用 HuggingFace 的 Transformers 库来调用 Llama 啦！

```py
# 导入必要的库
from transformers import AutoTokenizer, AutoModelForCausalLM

# 加载预训练模型的分词器
tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-2-7b-chat-hf")

# 加载预训练的模型
# 使用 device_map 参数将模型自动加载到可用的硬件设备上，例如GPU
model = AutoModelForCausalLM.from_pretrained(
          "meta-llama/Llama-2-7b-chat-hf", 
          device_map = 'auto')  

# 定义一个提示，希望模型基于此提示生成故事
prompt = "请给我讲个玫瑰的爱情故事?"

# 使用分词器将提示转化为模型可以理解的格式，并将其移动到GPU上
inputs = tokenizer(prompt, return_tensors="pt").to("cuda")

# 使用模型生成文本，设置最大生成令牌数为2000
outputs = model.generate(inputs["input_ids"], max_new_tokens=2000)

# 将生成的令牌解码成文本，并跳过任何特殊的令牌，例如[CLS], [SEP]等
response = tokenizer.decode(outputs[0], skip_special_tokens=True)

# 打印生成的响应
print(response)
```

这段程序是一个很典型的 HuggingFace 的 Transformers 库的用例，该库提供了大量预训练的模型和相关的工具。

1. 导入 AutoTokenizer：这是一个用于自动加载预训练模型的相关分词器的工具。分词器负责将文本转化为模型可以理解的数字格式。
2. 导入 AutoModelForCausalLM：这是用于加载因果语言模型（用于文本生成）的工具。
3. 使用 from_pretrained 方法来加载预训练的分词器和模型。其中，device_map = 'auto' 是为了自动地将模型加载到可用的设备上，例如 GPU。
4. 然后，给定一个提示（prompt）："请给我讲个玫瑰的爱情故事?"，并使用分词器将该提示转换为模型可以接受的格式，`return_tensors="pt"` 表示返回 PyTorch 张量。语句中的 `.to("cuda")` 是 GPU 设备格式转换，因为我在 GPU 上跑程序，不用这个的话会报错，如果你使用 CPU，可以试一下删掉它。
5. 最后使用模型的 `.generate()` 方法生成响应。`max_new_tokens=2000` 限制生成的文本的长度。使用分词器的 ``.decode()`` 方法将输出的数字转化回文本，并且跳过任何特殊的标记。



### LangChain 和 HuggingFace 的接口

讲了半天，LangChain 未出场。下面让我们看一看，如何把 HuggingFace 里面的模型接入 LangChain。



#### 通过 HuggingFace Hub

第一种集成方式，是通过 HuggingFace Hub。HuggingFace Hub 是一个开源模型中心化存储库，主要用于分享、协作和存储预训练模型、数据集以及相关组件。

我们给出一个 HuggingFace Hub 和 LangChain 集成的代码示例。

```py
# 导入HuggingFace API Token
import os
os.environ['HUGGINGFACEHUB_API_TOKEN'] = '你的HuggingFace API Token'

# 导入必要的库
from langchain import PromptTemplate, HuggingFaceHub, LLMChain

# 初始化HF LLM
llm = HuggingFaceHub(
    repo_id="google/flan-t5-small",
    #repo_id="meta-llama/Llama-2-7b-chat-hf",
)

# 创建简单的question-answering提示模板
template = """Question: {question}
              Answer: """

# 创建Prompt          
prompt = PromptTemplate(template=template, input_variables=["question"])

# 调用LLM Chain --- 我们以后会详细讲LLM Chain
llm_chain = LLMChain(
    prompt=prompt,
    llm=llm
)

# 准备问题
question = "Rose is which type of flower?"

# 调用模型并返回结果
print(llm_chain.run(question))
```

可以看出，这个集成过程非常简单，只需要在 HuggingFaceHub 类的 repo_id 中指定模型名称，就可以直接下载并使用模型，模型会自动下载到 HuggingFace 的 Cache 目录，并不需要手工下载。

初始化 LLM，创建提示模板，生成提示的过程，你已经很熟悉了。这段代码中有一个新内容是我通过 llm_chain 来调用了 LLM。这段代码也不难理解，有关 Chain 的概念我们以后还会详述。

不过，我尝试使用 `meta-llama/Llama-2-7b-chat-hf` 这个模型时，出现了错误，因此我只好用比较旧的模型做测试。我随便选择了 `google/flan-t5-small`，问了它一个很简单的问题，想看看它是否知道玫瑰是哪一种花。



#### 通过 HuggingFace Pipeline

既然 HuggingFace Hub 还不能完成 Llama-2 的测试，让我们来尝试另外一种方法，HuggingFace Pipeline。HuggingFace 的 Pipeline 是一种高级工具，它简化了多种常见自然语言处理（NLP）任务的使用流程，使得用户不需要深入了解模型细节，也能够很容易地利用预训练模型来做任务。

```py
# 指定预训练模型的名称
model = "meta-llama/Llama-2-7b-chat-hf"

# 从预训练模型中加载词汇器
from transformers import AutoTokenizer
tokenizer = AutoTokenizer.from_pretrained(model)

# 创建一个文本生成的管道
import transformers
import torch
pipeline = transformers.pipeline(
    "text-generation",
    model=model,
    torch_dtype=torch.float16,
    device_map="auto",
    max_length = 1000
)

# 创建HuggingFacePipeline实例
from langchain import HuggingFacePipeline
llm = HuggingFacePipeline(pipeline = pipeline, 
                          model_kwargs = {'temperature':0})

# 定义输入模板，该模板用于生成花束的描述
template = """
              为以下的花束生成一个详细且吸引人的描述：
              花束的详细信息：
              ```{flower_details}```
           """

# 使用模板创建提示
from langchain import PromptTemplate,  LLMChain
prompt = PromptTemplate(template=template, 
                     input_variables=["flower_details"])

# 创建LLMChain实例
from langchain import PromptTemplate
llm_chain = LLMChain(prompt=prompt, llm=llm)

# 需要生成描述的花束的详细信息
flower_details = "12支红玫瑰，搭配白色满天星和绿叶，包装在浪漫的红色纸中。"

# 打印生成的花束描述
print(llm_chain.run(flower_details))
```



### LangChain 中的输出解析器

语言模型输出的是文本，这是给人类阅读的。但很多时候，你可能想要获得的是程序能够处理的结构化信息。这就是输出解析器发挥作用的地方。

输出解析器是一种专用于处理和构建语言模型响应的类。一个基本的输出解析器类通常需要实现两个核心方法。

1. `get_format_instructions`：这个方法需要返回一个字符串，用于指导如何格式化语言模型的输出，告诉它应该如何组织并构建它的回答。
2. `parse`：这个方法接收一个字符串（也就是语言模型的输出）并将其解析为特定的数据结构或格式。这一步通常用于确保模型的输出符合我们的预期，并且能够以我们需要的形式进行后续处理。

还有一个可选的方法。

+ `parse_with_prompt`：这个方法接收一个字符串（也就是语言模型的输出）和一个提示（用于生成这个输出的提示），并将其解析为特定的数据结构。这样，你可以根据原始提示来修正或重新解析模型的输出，确保输出的信息更加准确和贴合要求。

下面是一个基于上述描述的简单伪代码示例：

```py
class OutputParser:
    def __init__(self):
        pass

    def get_format_instructions(self):
        # 返回一个字符串，指导如何格式化模型的输出
        pass

    def parse(self, model_output):
        # 解析模型的输出，转换为某种数据结构或格式
        pass

    def parse_with_prompt(self, model_output, prompt):
        # 基于原始提示解析模型的输出，转换为某种数据结构或格式
        pass
```

在 LangChain 中，通过实现 get_format_instructions、parse 和 parse_with_prompt 这些方法，针对不同的使用场景和目标，设计了各种输出解析器。让我们来逐一认识一下。

1. 列表解析器（List Parser）：这个解析器用于处理模型生成的输出，当需要模型的输出是一个列表的时候使用。例如，如果你询问模型“列出所有鲜花的库存”，模型的回答应该是一个列表。
2. 日期时间解析器（Datetime Parser）：这个解析器用于处理日期和时间相关的输出，确保模型的输出是正确的日期或时间格式。
3. 枚举解析器（Enum Parser）：这个解析器用于处理预定义的一组值，当模型的输出应该是这组预定义值之一时使用。例如，如果你定义了一个问题的答案只能是“是”或“否”，那么枚举解析器可以确保模型的回答是这两个选项之一。
4. 结构化输出解析器（Structured Output Parser）：这个解析器用于处理复杂的、结构化的输出。如果你的应用需要模型生成具有特定结构的复杂回答（例如一份报告、一篇文章等），那么可以使用结构化输出解析器来实现。
5. Pydantic（JSON）解析器：这个解析器用于处理模型的输出，当模型的输出应该是一个符合特定格式的 JSON 对象时使用。它使用 Pydantic 库，这是一个数据验证库，可以用于构建复杂的数据模型，并确保模型的输出符合预期的数据模型。
6. 自动修复解析器（Auto-Fixing Parser）：这个解析器可以自动修复某些常见的模型输出错误。例如，如果模型的输出应该是一段文本，但是模型返回了一段包含语法或拼写错误的文本，自动修复解析器可以自动纠正这些错误。
7. 重试解析器（RetryWithErrorOutputParser）：这个解析器用于在模型的初次输出不符合预期时，尝试修复或重新生成新的输出。例如，如果模型的输出应该是一个日期，但是模型返回了一个字符串，那么重试解析器可以重新提示模型生成正确的日期格式。



### Pydantic（JSON）解析器实战

Pydantic (JSON) 解析器应该是最常用也是最重要的解析器，我带着你用它来重构鲜花文案生成程序。

> Pydantic 是一个 Python 数据验证和设置管理库，主要基于 Python 类型提示。尽管它不是专为 JSON 设计的，但由于 JSON 是现代 Web 应用和 API 交互中的常见数据格式，Pydantic 在处理和验证 JSON 数据时特别有用。

#### 第一步：创建模型实例

先通过环境变量设置 OpenAI API 密钥，然后使用 LangChain 库创建了一个 OpenAI 的模型实例。这里我们仍然选择了 text-davinci-003 作为大语言模型。

```py
# ------Part 1
# 设置OpenAI API密钥
import os
os.environ["OPENAI_API_KEY"] = '你的OpenAI API Key'

# 创建模型实例
from langchain import OpenAI
model = OpenAI(model_name='gpt-3.5-turbo-instruct')
```



#### 第二步：定义输出数据的格式

先创建了一个空的 DataFrame，用于存储从模型生成的描述。接下来，通过一个名为 FlowerDescription 的 Pydantic BaseModel 类，定义了期望的数据格式（也就是数据的结构）。

```py
# ------Part 2
# 创建一个空的DataFrame用于存储结果
import pandas as pd
df = pd.DataFrame(columns=["flower_type", "price", "description", "reason"])

# 数据准备
flowers = ["玫瑰", "百合", "康乃馨"]
prices = ["50", "30", "20"]

# 定义我们想要接收的数据格式
from pydantic import BaseModel, Field
class FlowerDescription(BaseModel):
    flower_type: str = Field(description="鲜花的种类")
    price: int = Field(description="鲜花的价格")
    description: str = Field(description="鲜花的描述文案")
    reason: str = Field(description="为什么要这样写这个文案")
```

在这里我们用到了负责数据格式验证的 Pydantic 库来创建带有类型注解的类 FlowerDescription，它可以自动验证输入数据，确保输入数据符合你指定的类型和其他验证条件。

Pydantic 有这样几个特点。

1. 数据验证：当你向 Pydantic 类赋值时，它会自动进行数据验证。例如，如果你创建了一个字段需要是整数，但试图向它赋予一个字符串，Pydantic 会引发异常。
2. 数据转换：Pydantic 不仅进行数据验证，还可以进行数据转换。例如，如果你有一个需要整数的字段，但你提供了一个可以转换为整数的字符串，如 "42"，Pydantic 会自动将这个字符串转换为整数 42。
3. 易于使用：创建一个 Pydantic 类就像定义一个普通的 Python 类一样简单。只需要使用 Python 的类型注解功能，即可在类定义中指定每个字段的类型。
4. JSON 支持：Pydantic 类可以很容易地从 JSON 数据创建，并可以将类的数据转换为 JSON 格式。



下面，我们基于这个 Pydantic 数据格式类来创建 LangChain 的输出解析器。

#### 第三步：创建输出解析器

在这一步中，我们创建输出解析器并获取输出格式指示。先使用 LangChain 库中的 `PydanticOutputParser` 创建了输出解析器，该解析器将用于解析模型的输出，以确保其符合 `FlowerDescription` 的格式。然后，使用解析器的 `get_format_instructions` 方法获取了输出格式的指示。

```py
# ------Part 3
# 创建输出解析器
from langchain.output_parsers import PydanticOutputParser
output_parser = PydanticOutputParser(pydantic_object=FlowerDescription)

# 获取输出格式指示
format_instructions = output_parser.get_format_instructions()
# 打印提示
print("输出格式：",format_instructions)
```

程序输出如下：

```py
输出格式： The output should be formatted as a JSON instance that conforms to the JSON schema below.

As an example, for the schema {"properties": {"foo": {"title": "Foo", "description": "a list of strings", "type": "array", "items": {"type": "string"}}}, "required": ["foo"]}}
the object {"foo": ["bar", "baz"]} is a well-formatted instance of the schema. The object {"properties": {"foo": ["bar", "baz"]}} is not well-formatted.

Here is the output schema:

{"properties": {"flower_type": {"title": "Flower Type", "description": "\u9c9c\u82b1\u7684\u79cd\u7c7b", "type": "string"}, "price": {"title": "Price", "description": "\u9c9c\u82b1\u7684\u4ef7\u683c", "type": "integer"}, "description": {"title": "Description", "description": "\u9c9c\u82b1\u7684\u63cf\u8ff0\u6587\u6848", "type": "string"}, "reason": {"title": "Reason", "description": "\u4e3a\u4ec0\u4e48\u8981\u8fd9\u6837\u5199\u8fd9\u4e2a\u6587\u6848", "type": "string"}}, "required": ["flower_type", "price", "description", "reason"]}
```

上面这个输出，这部分是通过 `output_parser.get_format_instructions`() 方法生成的，这是 `Pydantic (JSON)` 解析器的核心价值，值得你好好研究研究。同时它也算得上是一个很清晰的提示模板，能够为模型提供良好的指导，描述了模型输出应该符合的格式。（其中 description 中的中文被转成了 UTF-8 编码。）

它指示模型输出 JSON Schema 的形式，定义了一个有效的输出应该包含哪些字段，以及这些字段的数据类型。例如，它指定了 "flower_type" 字段应该是字符串类型，"price" 字段应该是整数类型。这个指示中还提供了一个例子，说明了什么是一个格式良好的输出。

下面，我们会把这个内容也传输到模型的提示中，**让输入模型的提示和输出解析器的要求相互吻合，前后就呼应得上。**



#### 第四步：创建提示模板

我们定义了一个提示模板，该模板将用于为模型生成输入提示。模板中包含了你需要模型填充的变量（如价格和花的种类），以及之前获取的输出格式指示。

```py
# ------Part 4
# 创建提示模板
from langchain import PromptTemplate
prompt_template = """您是一位专业的鲜花店文案撰写员。
对于售价为 {price} 元的 {flower} ，您能提供一个吸引人的简短中文描述吗？
{format_instructions}"""

# 根据模板创建提示，同时在提示中加入输出解析器的说明
prompt = PromptTemplate.from_template(prompt_template, 
       partial_variables={"format_instructions": format_instructions}) 

# 打印提示
print("提示：", prompt)
```

输出：

```py
提示： 
input_variables=['flower', 'price'] 

output_parser=None 

partial_variables={'format_instructions': 'The output should be formatted as a JSON instance that conforms to the JSON schema below.\n\n
As an example, for the schema {
"properties": {"foo": {"title": "Foo", "description": "a list of strings", "type": "array", "items": {"type": "string"}}}, 
"required": ["foo"]}}\n
the object {"foo": ["bar", "baz"]} is a well-formatted instance of the schema. 
The object {"properties": {"foo": ["bar", "baz"]}} is not well-formatted.\n\n
Here is the output schema:\n```\n
{"properties": {
"flower_type": {"title": "Flower Type", "description": "\\u9c9c\\u82b1\\u7684\\u79cd\\u7c7b", "type": "string"}, 
"price": {"title": "Price", "description": "\\u9c9c\\u82b1\\u7684\\u4ef7\\u683c", "type": "integer"}, 
"description": {"title": "Description", "description": "\\u9c9c\\u82b1\\u7684\\u63cf\\u8ff0\\u6587\\u6848", "type": "string"}, 
"reason": {"title": "Reason", "description": "\\u4e3a\\u4ec0\\u4e48\\u8981\\u8fd9\\u6837\\u5199\\u8fd9\\u4e2a\\u6587\\u6848", "type": "string"}}, 
"required": ["flower_type", "price", "description", "reason"]}\n```'} 

template='您是一位专业的鲜花店文案撰写员。
\n对于售价为 {price} 元的 {flower} ，您能提供一个吸引人的简短中文描述吗？\n
{format_instructions}' 

template_format='f-string' 

validate_template=True
```



#### 第五步：生成提示，传入模型并解析输出

这部分是程序的主体，我们循环来处理所有的花和它们的价格。对于每种花，都根据提示模板创建了输入，然后获取模型的输出。然后使用之前创建的解析器来解析这个输出，并将解析后的输出添加到 DataFrame 中。最后，你打印出了所有的结果，并且可以选择将其保存到 CSV 文件中。

```py
# ------Part 5
for flower, price in zip(flowers, prices):
    # 根据提示准备模型的输入
    input = prompt.format(flower=flower, price=price)
    # 打印提示
    print("提示：", input)

    # 获取模型的输出
    output = model(input)

    # 解析模型的输出
    parsed_output = output_parser.parse(output)
    parsed_output_dict = parsed_output.dict()  # 将Pydantic格式转换为字典

    # 将解析后的输出添加到DataFrame中
    df.loc[len(df)] = parsed_output.dict()

# 打印字典
print("输出的数据：", df.to_dict(orient='records'))
```

这一步中，你使用你的模型和输入提示（由鲜花种类和价格组成）生成了一个具体鲜花的文案需求（同时带有格式描述），然后传递给大模型，也就是说，提示模板中的 flower 和 price，此时都被具体的花取代了，而且模板中的 {format_instructions}，也被替换成了 JSON Schema 中指明的格式信息。

下面，程序解析模型的输出。在这一步中，你使用你之前定义的输出解析器（output_parser）将模型的输出解析成了一个 FlowerDescription 的实例。FlowerDescription 是你之前定义的一个 Pydantic 类，它包含了鲜花的类型、价格、描述以及描述的理由。

然后，将解析后的输出添加到 DataFrame 中。在这一步中，你将解析后的输出（即 FlowerDescription 实例）转换为一个字典，并将这个字典添加到你的 DataFrame 中。这个 DataFrame 是你用来存储所有鲜花描述的。

```bash
输出的数据： 
[{'flower_type': 'Rose', 'price': 50, 'description': '玫瑰是最浪漫的花，它具有柔和的粉红色，有着浓浓的爱意，价格实惠，50元就可以拥有一束玫瑰。', 'reason': '玫瑰代表着爱情，是最浪漫的礼物，以实惠的价格，可以让您尽情体验爱的浪漫。'}, 
{'flower_type': '百合', 'price': 30, 'description': '这支百合，柔美的花蕾，在你的手中摇曳，仿佛在与你深情的交谈', 'reason': '营造浪漫氛围'}, 
{'flower_type': 'Carnation', 'price': 20, 'description': '艳丽缤纷的康乃馨，带给你温馨、浪漫的气氛，是最佳的礼物选择！', 'reason': '康乃馨是一种颜色鲜艳、芬芳淡雅、具有浪漫寓意的鲜花，非常适合作为礼物，而且20元的价格比较实惠。'}]
```



## Chain 是什么

对于简单的应用程序来说，直接调用 LLM 就已经足够了。

但是，如果你想开发更复杂的应用程序，那么就需要通过 “Chain” 来链接 LangChain 的各个组件和功能——模型之间彼此链接，或模型与其他组件链接。

这种将多个组件相互链接，组合成一个链的想法简单但很强大。它简化了复杂应用程序的实现，并使之更加模块化，能够创建出单一的、连贯的应用程序，从而使调试、维护和改进应用程序变得容易。

Chain 是 LangChain 中的核心概念，代表一系列可以顺序执行的操作。每个链可以包含多个步骤，每个步骤可以是一个语言模型的调用、一个数据处理操作等。



**说到链的实现和使用，也简单**

1. 首先 LangChain 通过设计好的接口，实现一个具体的链的功能。例如，LLM 链（LLMChain）能够接受用户输入，使用 `PromptTemplate` 对其进行格式化，然后将格式化的响应传递给 LLM。这就相当于把整个 `Model I/O` 的流程封装到链里面。
2. 实现了链的具体功能之后，我们可以通过将多个链组合在一起，或者将链与其他组件组合来构建更复杂的链。

所以你看，链在内部把一系列的功能进行封装，而链的外部则又可以组合串联。链其实可以被视为 LangChain 中的一种基本功能单元。

LangChain 中提供了很多种类型的预置链，目的是使各种各样的任务实现起来更加方便、规范。

我们先使用一下最基础也是最常见的 LLMChain。



**PromptTemplate（提示模板）**

PromptTemplate 用于定义输入语言模型的提示格式。例如：

```bash
from langchain.prompts import PromptTemplate

template = PromptTemplate(
    input_variables=["question"],
    template="请用简短的中文回答以下问题：{question}"
)
```

下面是一个创建简单链的例子，它会接收一个问题并用语言模型回答：

```py
from langchain import OpenAI
from langchain.chains import SimpleChain
from langchain.prompts import PromptTemplate

# 创建语言模型实例
llm = OpenAI(api_key="your-api-key")

# 创建提示模板
prompt = PromptTemplate(
    input_variables=["question"],
    template="请用简短的中文回答以下问题：{question}"
)

# 创建链
chain = SimpleChain(llm=llm, prompt=prompt)

# 使用链
result = chain.run(question="世界上最高的山是什么？")
print(result)
```

**集成多种数据源**

```py
from langchain.data_sources import SQLDatabase

# 假设你有一个 SQLite 数据库
db = SQLDatabase("example.db")

# 创建一个从数据库查询数据的链
query_chain = db.query_chain("SELECT * FROM users WHERE id={user_id}")
```



### LLMChain：最简单的链

LLMChain 围绕着语言模型推理功能又添加了一些功能，整合了 `PromptTemplate`、语言模型（LLM 或聊天模型）和 Output Parser，相当于把 `Model I/O` 放在一个链中整体操作。它使用提示模板格式化输入，将格式化的字符串传递给 LLM，并返回 LLM 输出。

举例来说，如果我想让大模型告诉我某种花的花语，如果不使用链，代码如下：

```py
#----第一步 创建提示
# 导入LangChain中的提示模板
from langchain import PromptTemplate
# 原始字符串模板
template = "{flower}的花语是?"
# 创建LangChain模板
prompt_temp = PromptTemplate.from_template(template) 
# 根据模板创建提示
prompt = prompt_temp.format(flower='玫瑰')
# 打印提示的内容
print(prompt)

#----第二步 创建并调用模型 
# 导入LangChain中的OpenAI模型接口
from langchain import OpenAI
# 创建模型实例
model = OpenAI(temperature=0)
# 传入提示，调用模型，返回结果
result = model(prompt)
print(result)
```

输出：

```bash
玫瑰的花语是?
爱情、浪漫、美丽、永恒、誓言、坚贞不渝。
```

此时 Model I/O 的实现分为两个部分，提示模板的构建和模型的调用独立处理。

如果使用链，代码结构则显得更简洁。

```py
# 导入所需的库
from langchain import PromptTemplate, OpenAI, LLMChain
# 原始字符串模板
template = "{flower}的花语是?"
# 创建模型实例
llm = OpenAI(temperature=0)
# 创建LLMChain
llm_chain = LLMChain(
    llm=llm,
    prompt=PromptTemplate.from_template(template))
# 调用LLMChain，返回结果
result = llm_chain("玫瑰")
print(result)
```

输出：

```bash
{'flower': '玫瑰', 'text': '\n\n爱情、浪漫、美丽、永恒、誓言、坚贞不渝。'}
```

在这里，我们就把提示模板的构建和模型的调用封装在一起了。



### 调用两个不同的链解决问题

如果接到的是第一类问题，你要给 ChatBot A 指示；如果接到第二类的问题，你要给 ChatBot B 指示。

我们可以根据这两个场景来构建两个不同的目标链。遇到不同类型的问题，LangChain 会通过 RouterChain 来自动引导大语言模型选择不同的模板。



#### 整体框架

RouterChain，也叫路由链，能动态选择用于给定输入的下一个链。我们会根据用户的问题内容，首先使用路由器链确定问题更适合哪个处理模板，然后将问题发送到该处理模板进行回答。如果问题不适合任何已定义的处理模板，它会被发送到默认链。

在这里，我们会用 LLMRouterChain 和 MultiPromptChain（也是一种路由链）组合实现路由功能，该 MultiPromptChain 会调用 LLMRouterChain 选择与给定问题最相关的提示，然后使用该提示回答问题。

**具体步骤如下：**

优化后的描述：

1. **构建处理模板**：为鲜花护理和鲜花装饰分别定义两个字符串模板。提示信息：使用一个列表来组织和存储这些处理模板的关键信息，包括模板的键、描述和实际内容。
2. **初始化语言模型**：导入并实例化语言模型。
3. **构建目标链**：根据提示信息中的每个模板构建对应的 LLMChain，并存储在一个字典中。
4. **构建 LLM 路由链**：这是决策的核心部分。首先，根据提示信息构建一个路由模板，然后使用该模板创建 LLMRouterChain。
5. **构建默认链**：如果输入不符合任何已定义的处理模板，这个默认链会被触发。
6. **构建多提示链**：使用 MultiPromptChain 将 LLM 路由链、目标链和默认链组合在一起，形成一个完整的决策系统。



#### 具体实现

针对两种场景，构建两个提示信息模版：

```py
# 构建两个场景的模板
flower_care_template = """你是一个经验丰富的园丁，擅长解答关于养花育花的问题。
                        下面是需要你来回答的问题:
                        {input}"""

flower_deco_template = """你是一位网红插花大师，擅长解答关于鲜花装饰的问题。
                        下面是需要你来回答的问题:
                        {input}"""

# 构建提示信息
prompt_infos = [
    {
        "key": "flower_care",
        "description": "适合回答关于鲜花护理的问题",
        "template": flower_care_template,
    },
    {
        "key": "flower_decoration",
        "description": "适合回答关于鲜花装饰的问题",
        "template": flower_deco_template,
    }]
```

**接下来，我们初始化语言模型。**

```py
# 初始化语言模型
from langchain.llms import OpenAI
import os
os.environ["OPENAI_API_KEY"] = '你的OpenAI Key'
llm = OpenAI()
```



**构建目标链**

下面，我们循环 prompt_infos 这个列表，构建出两个目标链，分别负责处理不同的问题。

```py
# 构建目标链
from langchain.chains.llm import LLMChain
from langchain.prompts import PromptTemplate
chain_map = {}
for info in prompt_infos:
    prompt = PromptTemplate(template=info['template'], 
                            input_variables=["input"])
    print("目标提示:\n",prompt)
    chain = LLMChain(llm=llm, prompt=prompt,verbose=True)
    chain_map[info["key"]] = chain
```

这里，目标链提示是这样的：

```py
目标提示:
input_variables=['input'] 
output_parser=None partial_variables={} 
template='你是一个经验丰富的园丁，擅长解答关于养花育花的问题。\n                        下面是需要你来回答的问题:\n                        
{input}' template_format='f-string' 
validate_template=True

目标提示:
input_variables=['input'] 
output_parser=None partial_variables={} 
template='你是一位网红插花大师，擅长解答关于鲜花装饰的问题。\n                        下面是需要你来回答的问题:\n                        
{input}' template_format='f-string' 
validate_template=True
```

对于每个场景，我们创建一个 LLMChain（语言模型链）。每个链会根据其场景模板生成对应的提示，然后将这个提示送入语言模型获取答案。



**构建路由链**

下面，我们构建路由链，负责查看用户输入的问题，确定问题的类型。

```py
# 构建路由链
from langchain.chains.rfrom langchain.chains.router.llm_router import LLMRouterChain, RouterOutputParserouter.llm_router import LLMRouterChain, RouterOutputParser
from langchain.chains.router.multi_prompt_prompt import MULTI_PROMPT_ROUTER_TEMPLATE as RounterTemplate
destinations = [f"{p['key']}: {p['description']}" for p in prompt_infos]
router_template = RounterTemplate.format(destinations="\n".join(destinations))
print("路由模板:\n",router_template)
router_prompt = PromptTemplate(
    template=router_template,
    input_variables=["input"],
    output_parser=RouterOutputParser(),)
print("路由提示:\n",router_prompt)
router_chain = LLMRouterChain.from_llm(llm, 
                                       router_prompt,
                                       verbose=True)
```

输出：

~~~py
路由模板:
 Given a raw text input to a language model select the model prompt best suited for the input. You will be given the names of the available prompts and a description of what the prompt is best suited for. You may also revise the original input if you think that revising it will ultimately lead to a better response from the language model.

<< FORMATTING >>
Return a markdown code snippet with a JSON object formatted to look like:
```json
{{
    "destination": string \ name of the prompt to use or "DEFAULT"
    "next_inputs": string \ a potentially modified version of the original input
}}
```

REMEMBER: "destination" MUST be one of the candidate prompt names specified below OR it can be "DEFAULT" if the input is not well suited for any of the candidate prompts.
REMEMBER: "next_inputs" can just be the original input if you don't think any modifications are needed.

<< CANDIDATE PROMPTS >>
flower_care: 适合回答关于鲜花护理的问题
flower_decoration: 适合回答关于鲜花装饰的问题

<< INPUT >>
{input}

<< OUTPUT >>

路由提示:
input_variables=['input'] output_parser=RouterOutputParser(default_destination='DEFAULT', next_inputs_type=<class 'str'>, next_inputs_inner_key='input') 
partial_variables={} 
template='Given a raw text input to a language model select the model prompt best suited for the input. You will be given the names of the available prompts and a description of what the prompt is best suited for. You may also revise the original input if you think that revising it will ultimately lead to a better response from the language model.\n\n
<< FORMATTING >>\n
Return a markdown code snippet with a JSON object formatted to look like:\n```json\n{{\n "destination": string \\ name of the prompt to use or "DEFAULT"\n    "next_inputs": string \\ a potentially modified version of the original input\n}}\n```\n\n
REMEMBER: "destination" MUST be one of the candidate prompt names specified below OR it can be "DEFAULT" if the input is not well suited for any of the candidate prompts.\n
REMEMBER: "next_inputs" can just be the original input if you don\'t think any modifications are needed.\n\n<< CANDIDATE PROMPTS >>\n
flower_care: 适合回答关于鲜花护理的问题\n
flower_decoration: 适合回答关于鲜花装饰的问题\n\n
<< INPUT >>\n{input}\n\n<< OUTPUT >>\n' 
template_format='f-string' 
validate_template=True
~~~

这里我说一下路由器链是如何构造提示信息，来引导大模型查看用户输入的问题并确定问题的类型的。

先看路由模板部分，这段模板字符串是一个指导性的说明，目的是引导语言模型正确处理用户的输入，并将其定向到适当的模型提示。



#### 路由模板的解释

路由模板是路由功能得以实现的核心。我们来详细分解一下这个模板的每个部分。

这是一个简单的引导语句，告诉模型你将给它一个输入，它需要根据这个输入选择最适合的模型提示。

这里进一步提醒模型，它将获得各种模型提示的名称和描述。

这是一个可选的步骤，告诉模型它可以更改原始输入以获得更好的响应。



## Langchain 记忆

在默认情况下，无论是 LLM 还是代理都是无状态的，每次模型的调用都是独立于其他交互的。也就是说，我们每次通过 API 开始和大语言模型展开一次新的对话，它都不知道你其实昨天或者前天曾经和它聊过天了。

你肯定会说，不可能啊，每次和 ChatGPT 聊天的时候，ChatGPT 明明白白地记得我之前交待过的事情。

的确如此，ChatGPT 之所以能够记得你之前说过的话，正是因为它使用了记忆（Memory）机制，记录了之前的对话上下文，并且把这个上下文作为提示的一部分，在最新的调用中传递给了模型。在聊天机器人的构建中，记忆机制非常重要。



### 使用 ConversationChain

介绍 LangChain 中记忆机制的具体实现之前，先重新看一下我们曾经见过的 ConversationChain。

这个 Chain 最主要的特点是，它提供了包含 AI 前缀和人类前缀的对话摘要格式，这个对话格式和记忆机制结合得非常紧密。

让我们看一个简单的示例，并打印出 ConversationChain 中的内置提示模板，你就会明白这个对话格式的意义了。

```py
from langchain import OpenAI
from langchain.chains import ConversationChain

# 初始化大语言模型
llm = OpenAI(
    temperature=0.5,
    model_name="gpt-3.5-turbo-instruct"
)

# 初始化对话链
conv_chain = ConversationChain(llm=llm)

# 打印对话的模板
print(conv_chain.prompt.template)
```

输出：

```py
The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.

Current conversation:
{history}
Human: {input}
AI:
```

这里的提示为人类（我们）和人工智能（text-davinci-003）之间的对话设置了一个基本对话框架：这是人类和 AI 之间的友好对话。AI 非常健谈并从其上下文中提供了大量的具体细节。 (The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. )

同时，这个提示试图通过说明以下内容来减少幻觉，也就是尽量减少模型编造的信息：

“如果 AI 不知道问题的答案，它就会如实说它不知道。”（If the AI does not know the answer to a question, it truthfully says it does not know.）

之后，我们看到两个参数 `{history}` 和 `{input}`。

1. `{history}` 是存储会话记忆的地方，也就是人类和人工智能之间对话历史的信息。
2. `{input}` 是新输入的地方，你可以把它看成是和 ChatGPT 对话时，文本框中的输入。

这两个参数会通过提示模板传递给 LLM，我们希望返回的输出只是对话的延续。

那么当有了 `{history}` 参数，以及 Human 和 AI 这两个前缀，我们就能够把历史对话信息存储在提示模板中，并作为新的提示内容在新一轮的对话过程中传递给模型。—— 这就是记忆机制的原理。

下面就让我们来在 ConversationChain 中加入记忆功能。

### 使用 ConversationBufferMemory

在 LangChain 中，通过 ConversationBufferMemory（缓冲记忆）可以实现最简单的记忆机制。

下面，我们就在对话链中引入 ConversationBufferMemory。

```py
from langchain import OpenAI
from langchain.chains import ConversationChain
from langchain.chains.conversation.memory import ConversationBufferMemory

# 初始化大语言模型
llm = OpenAI(
    temperature=0.5,
    model_name="gpt-3.5-turbo-instruct")

# 初始化对话链
conversation = ConversationChain(
    llm=llm,
    memory=ConversationBufferMemory()
)

# 第一天的对话
# 回合1
conversation("我姐姐明天要过生日，我需要一束生日花束。")
print("第一次对话后的记忆:", conversation.memory.buffer)
```

输出：

```bash
第一次对话后的记忆: 
Human: 我姐姐明天要过生日，我需要一束生日花束。
AI:  哦，你姐姐明天要过生日，那太棒了！我可以帮你推荐一些生日花束，你想要什么样的？我知道有很多种，比如玫瑰、康乃馨、郁金香等等。
```

在下一轮对话中，这些记忆会作为一部分传入提示。

```bash
# 回合2
conversation("她喜欢粉色玫瑰，颜色是粉色的。")
print("第二次对话后的记忆:", conversation.memory.buffer)
```

输出：

```bash
第二次对话后的记忆: 
Human: 我姐姐明天要过生日，我需要一束生日花束。
AI:  哦，你姐姐明天要过生日，那太棒了！我可以帮你推荐一些生日花束，你想要什么样的？我知道有很多种，比如玫瑰、康乃馨、郁金香等等。
Human: 她喜欢粉色玫瑰，颜色是粉色的。
AI:  好的，那我可以推荐一束粉色玫瑰的生日花束给你。你想要多少朵？我可以帮你定制一束，比如说十朵、二十朵或者更多？
```

下面，我们继续对话，同时打印出此时提示模板的信息。

```bash
# 回合3 （第二天的对话）
conversation("我又来了，还记得我昨天为什么要来买花吗？")
print("/n第三次对话后时提示:/n",conversation.prompt.template)
print("/n第三次对话后的记忆:/n", conversation.memory.buffer)
```

模型输出：

```bash
Human: 我姐姐明天要过生日，我需要一束生日花束。
AI:  哦，你姐姐明天要过生日，那太棒了！我可以帮你推荐一些生日花束，你想要什么样的？我知道有很多种，比如玫瑰、康乃馨、郁金香等等。
Human: 她喜欢粉色玫瑰，颜色是粉色的。
AI:  好的，那我可以推荐一束粉色玫瑰的生日花束给你，你想要多少朵？
Human: 我又来了，还记得我昨天为什么要来买花吗？
AI:  是的，我记得你昨天来买花是因为你姐姐明天要过生日，你想要买一束粉色玫瑰的生日花束给她。
```

实际上，这些聊天历史信息，都被传入了 ConversationChain 的提示模板中的 `{history}` 参数，构建出了包含聊天记录的新的提示输入。

有了记忆机制，LLM 能够了解之前的对话内容，这样简单直接地存储所有内容为 LLM 提供了最大量的信息，但是新输入中也包含了更多的 Token（所有的聊天历史记录），这意味着响应时间变慢和更高的成本。而且，当达到 LLM 的令牌数（上下文窗口）限制时，太长的对话无法被记住（对于 text-davinci-003 和 gpt-3.5-turbo，每次的最大输入限制是 4096 个 Token）。

下面我们来看看针对 Token 太多、聊天历史记录过长的一些解决方案。



### 使用 ConversationBufferWindowMemory

说到记忆，我们人类的大脑也不是无穷无尽的。所以说，有的时候事情太多，我们只能把有些遥远的记忆抹掉。毕竟，最新的经历最鲜活，也最重要。

ConversationBufferWindowMemory 是缓冲窗口记忆，它的思路就是只保存最新最近的几次人类和 AI 的互动。因此，它在之前的“缓冲记忆”基础上增加了一个窗口值 k。这意味着我们只保留一定数量的过去互动，然后“忘记”之前的互动。

下面的示例：

```py
from langchain import OpenAI
from langchain.chains import ConversationChain
from langchain.chains.conversation.memory import ConversationBufferWindowMemory

# 创建大语言模型实例
llm = OpenAI(
    temperature=0.5,
    model_name="gpt-3.5-turbo-instruct")

# 初始化对话链
conversation = ConversationChain(
    llm=llm,
    memory=ConversationBufferWindowMemory(k=1)
)

# 第一天的对话
# 回合1
result = conversation("我姐姐明天要过生日，我需要一束生日花束。")
print(result)
# 回合2
result = conversation("她喜欢粉色玫瑰，颜色是粉色的。")
# print("\n第二次对话后的记忆:\n", conversation.memory.buffer)
print(result)

# 第二天的对话
# 回合3
result = conversation("我又来了，还记得我昨天为什么要来买花吗？")
print(result)
```

第一回合的输出：

```py
{'input': '我姐姐明天要过生日，我需要一束生日花束。', 
'history': '',
 'response': ' 哦，你姐姐明天要过生日！那太棒了！你想要一束什么样的花束呢？有很多种类可以选择，比如玫瑰花束、康乃馨花束、郁金香花束等等，你有什么喜欢的吗？'}
```

第二回合的输出：

```py
{'input': '她喜欢粉色玫瑰，
颜色是粉色的。', 
'history': 'Human: 我姐姐明天要过生日，我需要一束生日花束。\nAI:  哦，你姐姐明天要过生日！那太棒了！你想要一束什么样的花束呢？有很多种类可以选择，比如玫瑰花束、康乃馨花束、郁金香花束等等，你有什么喜欢的吗？', 
'response': ' 好的，那粉色玫瑰花束怎么样？我可以帮你找到一束非常漂亮的粉色玫瑰花束，你觉得怎么样？'}
```

第三回合的输出：

```py
{'input': '我又来了，还记得我昨天为什么要来买花吗？', 
'history': 'Human: 她喜欢粉色玫瑰，颜色是粉色的。\nAI:  好的，那粉色玫瑰花束怎么样？我可以帮你找到一束非常漂亮的粉色玫瑰花束，你觉得怎么样？', 
'response': '  当然记得，你昨天来买花是为了给你喜欢的人送一束粉色玫瑰花束，表达你对TA的爱意。'}
```

在给定的例子中，设置 k=1，这意味着窗口只会记住与 AI 之间的最新的互动，即只保留上一次的人类回应和 AI 的回应。

在第三个回合，当我们询问“还记得我昨天为什么要来买花吗？”，由于我们只保留了最近的互动（k=1），模型已经忘记了正确的答案。所以，虽然它说记得，但只能模糊地说出“喜欢的人”，而没有说关键字“姐姐”。不过，如果（我是说如果哈）在第二个回合，模型能回答“我可以帮你为你姐姐找到…”，那么，尽管我们没有第一回合的历史记录，但凭着上一个回合的信息，模型还是有可能推断出昨天来的人买花的真实意图。

尽管这种方法不适合记住遥远的互动，但它非常擅长限制使用的 Token 数量。如果只需要记住最近的互动，缓冲窗口记忆是一个很好的选择。但是，如果需要混合远期和近期的互动信息，则还有其他选择。



### 使用 ConversationSummaryMemory

上面说了，如果模型在第二轮回答的时候，能够说出“我可以帮你为你姐姐找到…”，那么在第三轮回答时，即使窗口大小 k=1，还是能够回答出正确答案。

这是为什么？

因为模型在回答新问题的时候，对之前的问题进行了总结性的重述。

ConversationSummaryMemory（对话总结记忆）的思路就是将对话历史进行汇总，然后再传递给 `{history}` 参数。这种方法旨在通过对之前的对话进行汇总来避免过度使用 Token。

ConversationSummaryMemory 有这么几个核心特点。

```py
from langchain.chains.conversation.memory import ConversationSummaryMemory

# 初始化对话链
conversation = ConversationChain(
    llm=llm,
    memory=ConversationSummaryMemory(llm=llm)
)
```

第一回合的输出：

```bash
{'input': '我姐姐明天要过生日，我需要一束生日花束。', 
'history': '', 
'response': ' 我明白，你需要一束生日花束。我可以为你提供一些建议吗？我可以推荐一些花束给你，比如玫瑰，康乃馨，百合，仙客来，郁金香，满天星等等。挑选一束最适合你姐姐的生日花束吧！'}
```

第二回合的输出：

```bash
{'input': '她喜欢粉色玫瑰，颜色是粉色的。', 
'history': "\nThe human asked what the AI thinks of artificial intelligence. The AI thinks artificial intelligence is a force for good because it will help humans reach their full potential. The human then asked the AI for advice on what type of flower bouquet to get for their sister's birthday, to which the AI provided a variety of suggestions.", 
'response': ' 为了为你的姐姐的生日准备一束花，我建议你搭配粉色玫瑰和白色康乃馨。你可以在玫瑰花束中添加一些紫色的满天星，或者添加一些绿叶以增加颜色对比。这将是一束可爱的花束，让你姐姐的生日更加特别。'}
```

第三回合的输出：

```json
{'input': '我又来了，还记得我昨天为什么要来买花吗？', 
'history': "\n\nThe human asked what the AI thinks of artificial intelligence. The AI thinks artificial intelligence is a force for good because it will help humans reach their full potential. The human then asked the AI for advice on what type of flower bouquet to get for their sister's birthday, to which the AI suggested pink roses and white carnations with the addition of purple aster flowers and green leaves for contrast. This would make a lovely bouquet to make the sister's birthday extra special.",
'response': ' 确实，我记得你昨天想买一束花给你的姐姐作为生日礼物。我建议你买粉红色的玫瑰花和白色的康乃馨花，再加上紫色的雏菊花和绿叶，这样可以让你的姐姐的生日更加特别。'}
```

看得出来，这里的 'history'，不再是之前人类和 AI 对话的简单复制粘贴，而是经过了总结和整理之后的一个综述信息。

这里，我们不仅仅利用了 LLM 来回答每轮问题，还利用 LLM 来对之前的对话进行总结性的陈述，以节约 Token 数量。这里，帮我们总结对话的 LLM，和用来回答问题的 LLM，可以是同一个大模型，也可以是不同的大模型。

`ConversationSummaryMemory` 的优点是对于长对话，可以减少使用的 Token 数量，因此可以记录更多轮的对话信息，使用起来也直观易懂。不过，它的缺点是，对于较短的对话，可能会导致更高的 Token 使用。另外，对话历史的记忆完全依赖于中间汇总 LLM 的能力，还需要为汇总 LLM 使用 Token，这增加了成本，且并不限制对话长度。

通过对话历史的汇总来优化和管理 Token 的使用，ConversationSummaryMemory 为那些预期会有多轮的、长时间对话的场景提供了一种很好的方法。然而，这种方法仍然受到 Token 数量的限制。在一段时间后，我们仍然会超过大模型的上下文窗口限制。

而且，总结的过程中并没有区分近期的对话和长期的对话（通常情况下近期的对话更重要），所以我们还要继续寻找新的记忆管理方法。



### 使用 ConversationSummaryBufferMemory

我要为你介绍的最后一种记忆机制是 `ConversationSummaryBufferMemory`，即对话总结缓冲记忆，它是一种混合记忆模型，结合了上述各种记忆机制，包括 `ConversationSummaryMemory` 和 `ConversationBufferWindowMemory` 的特点。这种模型旨在在对话中总结早期的互动，同时尽量保留最近互动中的原始内容。

它是通过 `max_token_limit` 这个参数做到这一点的。当最新的对话文字长度在 300 字之内的时候，LangChain 会记忆原始对话内容；当对话文字超出了这个参数的长度，那么模型就会把所有超过预设长度的内容进行总结，以节省 Token 数量。

```py
from langchain.chains.conversation.memory import ConversationSummaryBufferMemory

# 初始化对话链
conversation = ConversationChain(
    llm=llm,
    memory=ConversationSummaryBufferMemory(
        llm=llm,
        max_token_limit=300))
```

第一回合的输出：

```py
{'input': '我姐姐明天要过生日，我需要一束生日花束。', 
'history': '', 
'response': ' 哇，你姐姐要过生日啊！那太棒了！我建议你去买一束色彩鲜艳的花束，因为这样可以代表你给她的祝福和祝愿。你可以去你家附近的花店，或者也可以从网上订购，你可以看看有没有特别的花束，比如彩色玫瑰或者百合花，它们会更有特色。'}
```

第二回合的输出：

```py
{'input': '她喜欢粉色玫瑰，颜色是粉色的。', 
'history': 'Human: 我姐姐明天要过生日，我需要一束生日花束。\nAI:  哇，你姐姐要过生日啊！那太棒了！我建议你去买一束色彩鲜艳的花束，因为这样可以代表你给她的祝福和祝愿。你可以去你家附近的花店，或者也可以从网上订购，你可以看看有没有特别的花束，比如彩色玫瑰或者百合花，它们会更有特色。', 
'response': ' 好的，那粉色玫瑰就是一个很好的选择！你可以买一束粉色玫瑰花束，这样你姐姐会很开心的！你可以在花店里找到粉色玫瑰，也可以从网上订购，你可以根据你的预算，选择合适的数量。另外，你可以考虑添加一些装饰，比如细绳、彩带或者小礼品'}
```

第三回合的输出：

```py
{'input': '我又来了，还记得我昨天为什么要来买花吗？', 
'history': "System: \nThe human asked the AI for advice on buying a bouquet for their sister's birthday. The AI suggested buying a vibrant bouquet as a representation of their wishes and blessings, and recommended looking for special bouquets like colorful roses or lilies for something more unique.\nHuman: 她喜欢粉色玫瑰，颜色是粉色的。\nAI:  好的，那粉色玫瑰就是一个很好的选择！你可以买一束粉色玫瑰花束，这样你姐姐会很开心的！你可以在花店里找到粉色玫瑰，也可以从网上订购，你可以根据你的预算，选择合适的数量。另外，你可以考虑添加一些装饰，比如细绳、彩带或者小礼品", 
'response': ' 是的，我记得你昨天来买花是为了给你姐姐的生日。你想买一束粉色玫瑰花束来表达你的祝福和祝愿，你可以在花店里找到粉色玫瑰，也可以从网上订购，你可以根据你的预算，选择合适的数量。另外，你可以考虑添加一些装饰，比如细绳、彩带或者小礼品}
```

不难看出，在第二回合，记忆机制完整地记录了第一回合的对话，但是在第三回合，它察觉出前两轮的对话已经超出了 300 个字节，就把早期的对话加以总结，以节省 Token 资源。

ConversationSummaryBufferMemory 的优势是通过总结可以回忆起较早的互动，而且有缓冲区确保我们不会错过最近的互动信息。当然，对于较短的对话，ConversationSummaryBufferMemory 也会增加 Token 数量。

总体来说，ConversationSummaryBufferMemory 为我们提供了大量的灵活性。它是我们迄今为止的唯一记忆类型，可以回忆起较早的互动并完整地存储最近的互动。在节省 Token 数量方面，ConversationSummaryBufferMemory 与其他方法相比，也具有竞争力。



## Agent ReAct框架

在之前介绍的思维链（CoT）中，我向你展示了 LLMs 执行推理轨迹的能力。在给出答案之前，大模型通过中间推理步骤（尤其是与少样本提示相结合）能够实现复杂的推理，获得更好的结果，以完成更具挑战的任务。

然而，仅仅应用思维链推理并不能解决大模型的固有问题：无法主动更新自己的知识，导致出现事实幻觉。也就是说，因为缺乏和外部世界的接触，大模型只拥有训练时见过的知识，以及提示信息中作为上下文提供的附加知识。如果你问的问题超出它的知识范围，要么大模型向你坦白：“我的训练时间截至 XXXX 年 XX 月 XX 日”，要么它就会开始一本正经地胡说。

*那么这个问题如何解决呢？*

也不难。你可以让大模型先在本地知识库中进行搜索，检查一下提示中的信息的真实性，如果真实，再进行输出；如果不真实，则进行修正。如果本地知识库找不到相应的信息，可以调用工具进行外部搜索，来检查提示信息的真实性。

上面所说的无论本地知识库还是搜索引擎，都不是封装在大模型内部的知识，我们把它们称为“外部工具”。



### Agent 的作用

每当你遇到这种需要模型做自主判断、自行调用工具、自行决定下一步行动的时候，Agent（也就是代理）就出场了。

代理就像一个多功能的接口，它能够接触并使用一套工具。根据用户的输入，代理会决定调用哪些工具。它不仅可以同时使用多种工具，而且可以将一个工具的输出数据作为另一个工具的输入数据。

**在 LangChain 中使用代理，我们只需要理解下面三个元素。**

1. 大模型：提供逻辑的引擎，负责生成预测和处理输入。
2. 与之交互的外部工具：可能包括数据清洗工具、搜索引擎、应用程序等。
3. 控制交互的代理：调用适当的外部工具，并管理整个交互过程的流程。



上面的思路看似简单，其实很值得我们仔细琢磨。

这个过程有很多地方需要大模型自主判断下一步行为（也就是操作）要做什么，如果不加引导，那大模型本身是不具备这个能力的。比如下面这一系列的操作：

1. 什么时候开始在本地知识库中搜索（这个比较简单，毕竟是第一个步骤，可以预设）？
2. 怎么确定本地知识库的检索已经完成，可以开始下一步？
3. 调用哪一种外部搜索工具（比如 Google 引擎）？
4. 如何确定外部搜
5. 索工具返回了想要找的内容？
6. 如何确定信息真实性的检索已经全部完成，可以开始下一步？



### ReAct 框架

这里我要请你思考一下：如果你接到一个新任务，你将如何做出决策并完成下一步的行动？

比如说，你在运营花店的过程中，经常会经历天气变化而导致的鲜花售价变化，那么，每天早上你会如何为你的鲜花定价？

也许你会告诉我，我会去 Google 上面查一查今天的鲜花成本价啊（行动），也就是我预计的进货的价格，然后我会根据这个价格的高低（观察），来确定我要加价多少（思考），最后计算出一个售价（行动）！

你看，在这个简单的例子中，你有观察、有思考，然后才会具体行动。这里的观察和思考，我们统称为推理（Reasoning）过程，推理指导着你的行动（Acting）。

我们今天要讲的 ReAct 框架的灵感正是来自“行动”和“推理”之间的协同作用，这种协同作用使得咱们人类能够学习新任务并做出决策或推理。这个框架，也是大模型能够作为“智能代理”，自主、连续、交错地生成推理轨迹和任务特定操作的理论基础。

先和你说明一点，此 ReAct 并非指代流行的前端开发框架 React，它在这里专指如何指导大语言模型推理和行动的一种思维框架。这个思维框架是 Shunyu Yao 等人在 ICLR 2023 会议论文《ReAct: Synergizing Reasoning and Acting in Language Models》（ReAct：在语言模型中协同推理和行动）中提出的。

这篇文章的一个关键启发在于：大语言模型可以通过生成推理痕迹和任务特定行动来实现更大的协同作用。

具体来说，就是引导模型生成一个任务解决轨迹：观察环境 - 进行思考 - 采取行动，也就是观察 - 思考 - 行动。那么，再进一步进行简化，就变成了推理 - 行动，也就是 Reasoning-Acting 框架。

其中，Reasoning 包括了对当前环境和状态的观察，并生成推理轨迹。这使模型能够诱导、跟踪和更新操作计划，甚至处理异常情况。Acting 在于指导大模型采取下一步的行动，比如与外部源（如知识库或环境）进行交互并且收集信息，或者给出最终答案。

ReAct 的每一个推理过程都会被详细记录在案，这也改善大模型解决问题时的可解释性和可信度，而且这个框架在各种语言和决策任务中都得到了很好的效果。

现在，让我们回到开始的时候我们所面临的问题。仅仅使用思维链（CoT）提示，LLMs 能够执行推理轨迹，以完成算术和常识推理等问题，但这样的模型因为缺乏和外部世界的接触或无法更新自己的知识，会导致幻觉的出现。

而将 ReAct 框架和思维链（CoT）结合使用，则能够让大模型在推理过程同时使用内部知识和获取到的外部信息，从而给出更可靠和实际的回应，也提高了 LLMs 的可解释性和可信度。

LangChain 正是通过 Agent 类，将 ReAct 框架进行了完美封装和实现，这一下子就赋予了大模型极大的自主性（Autonomy），**你的大模型现在从一个仅仅可以通过自己内部知识进行对话聊天的 Bot，飞升为了一个有手有脚能使用工具的智能代理。**

ReAct 框架会提示 LLMs 为任务生成推理轨迹和操作，这使得代理能系统地执行动态推理来创建、维护和调整操作计划，同时还支持与外部环境（例如 Google 搜索、Wikipedia）的交互，以将额外信息合并到推理中。



### 详细解析和实现 ReAct 框架通过代理

#### ReAct 框架概述

ReAct 框架是一种使大型语言模型 (LLM) 能够执行更复杂任务的策略。通过使用代理（即连接外部数据或功能的接口），模型可以完成通常需要实际数据检索或特定功能的任务。这种方式扩展了模型的应用范围，使其不仅限于生成文本。

#### 使用 LangChain 的 `ZERO_SHOT_REACT_DESCRIPTION` 代理

在 LangChain 库中，`ZERO_SHOT_REACT_DESCRIPTION` 是一种特定的代理，用于无监督场景下的任务描述和执行。此代理的关键在于，它能够让模型解释和规划未见过的任务，从而直接影响模型的输出行为。

#### 任务示例：玫瑰的市场价格查询和计算

**步骤 1: 准备工作**

- 注册并使用 [serpapi.com](https://serpapi.com/)：此网站提供了一个 API 用于访问 Google 搜索结果，非常适合在需要实时数据检索的场景中使用。
- 获取 `SERPAPI_API_KEY`：这是进行 API 调用的凭证，确保能够从 Google 搜索中检索信息。

**步骤 2: 设置代理任务**

- 任务定义：使用 `ZERO_SHOT_REACT_DESCRIPTION` 代理来描述和执行“查询当前玫瑰的市场价格并计算其加价 15% 后的价格”的任务。
- 调用过程：模型首先使用 SERPAPI 来查询玫瑰当前的市场价格。这通常涉及到构建一个搜索查询，发送给 SERPAPI，并解析返回的结果。

**步骤 3: 执行并返回结果**

- 数据处理：获取到当前玫瑰价格后，模型将计算出加价 15% 后的价格。
- 结果输出：模型会输出新的价格，并可进一步解释其计算过程。

#### 使用场景和好处

这种通过代理的方法允许模型处理实际的、动态变化的信息，而不是仅依赖预训练数据。例如，在电子商务、金融分析等领域，这种能力极为关键。此外，它还支持自动化和智能决策，提升效率和精确度。

总结来说，ReAct 框架和 LangChain 的 `ZERO_SHOT_REACT_DESCRIPTION` 代理为语言模型在处理复杂、实时任务中提供了强大的工具，使其不仅能生成信息，还能实际操作和反馈实时数据。这不仅提高了模型的实用性，也拓展了其应用领域。



### AgentExecutor究竟是怎样驱动模型和工具完成任务的

LangChain 中的“代理”和“链”的差异究竟是什么。

在链中，一系列操作被硬编码（在代码中）。在代理中，语言模型被用作推理引擎来确定要采取哪些操作以及按什么顺序执行这些操作。

那么，你看 LangChain，乃至整个大模型应用开发的核心理念就呼之欲出了。这个核心理念就是**操作的序列并非硬编码在代码中，而是使用语言模型（如 GPT-3 或 GPT-4）来选择执行的操作序列。**



### Agent 的关键组件

在 LangChain 的代理中，有这样几个关键组件。

1. 代理（Agent）：这个类决定下一步执行什么操作。它由一个语言模型和一个提示（prompt）驱动。提示可能包含代理的性格（也就是给它分配角色，让它以特定方式进行响应）、任务的背景（用于给它提供更多任务类型的上下文）以及用于激发更好推理能力的提示策略（例如 ReAct）。LangChain 中包含很多种不同类型的代理。
2. 工具（Tools）：工具是代理调用的函数。这里有两个重要的考虑因素：一是让代理能访问到正确的工具，二是以最有帮助的方式描述这些工具。如果你没有给代理提供正确的工具，它将无法完成任务。如果你没有正确地描述工具，代理将不知道如何使用它们。LangChain 提供了一系列的工具，同时你也可以定义自己的工具。
3. 工具包（Toolkits）：工具包是一组用于完成特定目标的彼此相关的工具，每个工具包中包含多个工具。比如 LangChain 的 Office365 工具包中就包含连接 Outlook、读取邮件列表、发送邮件等一系列工具。当然 LangChain 中还有很多其他工具包供你使用。
4. 代理执行器（AgentExecutor）：代理执行器是代理的运行环境，它调用代理并执行代理选择的操作。执行器也负责处理多种复杂情况，包括处理代理选择了不存在的工具的情况、处理工具出错的情况、处理代理产生的无法解析成工具调用的输出的情况，以及在代理决策和工具调用进行观察和日志记录。

总的来说，代理就是一种用语言模型做出决策、调用工具来执行具体操作的系统。通过设定代理的性格、背景以及工具的描述，你可以定制代理的行为，使其能够根据输入的文本做出理解和推理，从而实现自动化的任务处理。而代理执行器（AgentExecutor）就是上述机制得以实现的引擎。



### 深挖 AgentExecutor 的运行机制

```bash
llm = OpenAI(temperature=0) # 大语言模型
tools = load_tools(["serpapi", "llm-math"], llm=llm) # 工具-搜索和数学运算
agent = initialize_agent(tools, llm, agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION, verbose=True) # 代理
agent.run("目前市场上玫瑰花的平均价格是多少？如果我在此基础上加价15%卖出，应该如何定价？") # 运行代理
```

在这段代码中，模型、工具、代理的初始化，以及代理运行的过程都极为简洁。但是，LangChain 的内部封装的逻辑究竟是怎样的？我希望带着你至少弄清楚两个问题。

1. 代理每次给大模型的具体提示是什么样子的？能够让模型给出下一步的行动指南，这个提示的秘密何在？
2. 代理执行器是如何按照 ReAct 框架来调用模型，接收模型的输出，并根据这个输出来调用工具，然后又根据工具的返回结果生成新的提示的。



### 什么是 Playwright

`Playwright` 是一个开源的自动化框架，它可以让你模拟真实用户操作网页，帮助开发者和测试者自动化网页交互和测试。用简单的话说，它就像一个“机器人”，可以按照你给的指令去浏览网页、点击按钮、填写表单、读取页面内容等等，就像一个真实的用户在使用浏览器一样。

`Playwright` 支持多种浏览器，比如 Chrome、Firefox、Safari 等，这意味着你可以用它来测试你的网站或测试应用在不同的浏览器上的表现是否一致。

下面我们先用 `pip install playwright` 安装 Playwright 工具。

不过，如果只用 pip 安装 Playwright 工具安装包，就使用它，还不行，会得到下面的信息。

因此我们还需要通过 playwright install 命令来安装三种常用的浏览器工具。

现在，一切就绪，我们可以通过 Playwright 浏览器工具来访问一个测试网页。

```py
from playwright.sync_api import sync_playwright

def run():
    # 使用Playwright上下文管理器
    with sync_playwright() as p:
        # 使用Chromium，但你也可以选择firefox或webkit
        browser = p.chromium.launch()
        
        # 创建一个新的页面
        page = browser.new_page()
        
        # 导航到指定的URL
        page.goto('https://langchain.com/')
        
        # 获取并打印页面标题
        title = page.title()
        print(f"Page title is: {title}")
        
        # 关闭浏览器
        browser.close()

if __name__ == "__main__":
    run()
```

这个简单的 Playwright 脚本，它打开了一个新的浏览器实例。过程是：导航到指定的 URL；获取页面标题并打印页面的标题；最后关闭浏览器。

输出如下：

```bash
Page title is: LangChain
```

这个脚本展示了 Playwright 的工作方式，一切都是在命令行里面直接完成。它不需要我们真的去打开 Chome 网页，然后手工去点击菜单栏、拉动进度条等。

下面这个表，我列出了使用命令行进行自动化网页测试的优势。

| 优点                   | 描述                                                         |
| ---------------------- | ------------------------------------------------------------ |
| 自动化和易重复性       | 可以一次编写脚本并多次运行，确保每次的一致性，减少人为错误   |
| 强化 CI/CD             | 方便与 CI/CD 工具集成，实现代码的自动测试与部署              |
| 跨平台和跨浏览器兼容性 | 在多种浏览器和操作系统上运行相同测试，确保应用兼容性         |
| 并发执行               | 在多个设备或浏览器上同时运行多个测试，加快测试速度           |
| 详细的日志和报告       | 提供详细的输出，帮助快速定位和修复问题                       |
| 元素人工手动           | 元素手动点击或输入检查，大大减少了测试脚本的时间和劳力       |
| 版本控制               | 测试脚本和代码都可以保存在版本控制系统中，便于跟踪和回溯以及协作 |
| 可编程和可定制         | 可以完全控制测试的逻辑，如条件、循环和异常处理               |
| 高级界面和图表         | 通常有易用的 GUI，图表展示使用结果更直观，更高效             |
| 可扩展性               | 根据项目或测试需要的变化化，轻松地增加、修改或删除测试脚本   |



### 使用结构化工具对话代理

在这里，我们要使用的 Agent 类型是 `STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION`。要使用的工具则是 `PlayWrightBrowserToolkit`，这是 LangChain 中基于 `PlayWrightBrowser` 包封装的工具箱，它继承自 BaseToolkit 类。

`PlayWrightBrowserToolkit` 为 PlayWright 浏览器提供了一系列交互的工具，可以在同步或异步模式下操作。

| 工具名称              | 功能描述                                     | 功能描述细化                                                 | 应用场景                                         |
| --------------------- | -------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| ClickTool             | 模拟浏览器中的点击操作                       | 自动化模拟人动作，如提交表单或导航到另一个页面               | 方便在测试或自动化任务中模拟用户的点击动作       |
| NavigateBrowserTool   | 导航到指定的 URL 地址                        | 打开一个新的网页或进行网站间的跳转                           | 使用在需要自动导航到特定网页的测试或任务中       |
| NavigateBackTool      | 允许浏览器回退到上一个页面                   | 浏览了一个页面后返回验证返回到之前的页面                     | 在测试网页的导航流程，确保返回功能正常           |
| ExtractTextTool       | 从网页上提取文本内容                         | 获取和分析网页上的文字信息，例如文章、评论或者任何其他文本内容 | 在数据抓取或内容分析时提取网页文本               |
| ExtractHyperlinksTool | 提取网页上的所有超链接                       | 收集整站或特定页面上所有的超链接并生成列表或者进一步分析     | 用于网站链接审核或网络爬虫                       |
| GetElementsTool       | 根据给定的条件在网页中获取和获取网页上的元素 | 高级功能允许特定的选择和捕获网页上的元素                     | 在需要精确控制和操作网页内容的自动化测试中使用   |
| CurrentWebPageTool    | 提供当前浏览器页面的相关信息，如 URL, 标题等 | 了解当前页面的相关信息，或者检查是否已经到达预期页面         | 在多步骤自动化测试中，确认页面信息和导航状态正确 |



## 链接数据库

一直以来，在计算机编程和数据库管理领域，所有的操作都需要通过严格、专业且结构化的语法来完成。这就是结构化查询语言（SQL）。当你想从一个数据库中提取信息或进行某种操作时，你需要使用这种特定的语言明确地告诉计算机你的要求。这不仅需要我们深入了解正在使用的技术，还需要对所操作的数据有充分的了解。

你需要拥有一个程序员基本的技能和知识才能有效地与计算机交互。不过，随着人工智能的兴起和大语言模型的发展，情况开始发生变化。

现在，我们正进入一个全新的编程范式，其中机器学习和自然语言处理技术使得与计算机的交互变得更加自然。这意味着，我们可以用更加接近我们日常话语的自然语言来与计算机交流。例如，不用复杂的 SQL 语句查询数据库，我们可以简单地问：“请告诉我去年的销售额是多少？” 计算机能够理解这个问题，并给出相应的答案。

这种转变不仅使得非技术人员更容易与计算机交互，还为开发者提供了更大的便利性。简而言之，我们从“告诉计算机每一步怎么做”，转变为“告诉计算机我们想要什么”，整个过程变得更加人性化和高效。



###  新的数据库查询范式

这种范式结合了自然语言处理和传统数据库查询的功能，为用户提供了一个更为直观和高效的交互方式。下面我来解释下这个过程。

1. 提出问题：用户用自然语言提出一个问题，例如“去年的总销售额是多少？”。
2. LLM 理解并转译：LLM 首先会解析这个问题，理解其背后的意图和所需的信息。接着，模型会根据解析的内容，生成相应的 SQL 查询语句，例如 `SELECT SUM(sales) FROM sales_data WHERE year = ‘last_year’;`。
3. 执行 SQL 查询：生成的 SQL 查询语句会被发送到相应的数据库进行执行。数据库处理这个查询，并返回所需的数据结果。
4. LLM 接收并解释结果：当数据库返回查询结果后，LLM 会接收到这些数据。然后，LLM 会开始解析这些数据，并将其转化为更容易被人类理解的答案格式。
5. 提供答案：最后，LLM 将结果转化为自然语言答案，并返回给用户。例如“去年的总销售额为 1,000,000 元”。

你看，用户不需要知道数据库的结构，也不需要具备编写 SQL 的技能。他们只需要用自然语言提问，然后就可以得到他们所需的答案。这大大简化了与数据库的交互过程，并为各种应用场景提供了巨大的潜力。



### 这就大大简化了查询过程和难度

首先，这个应用可以被简单地用作一个查询工具，允许员工在存货或销售系统中快速查找价格。员工不再需要记住复杂的查询语句或进行手动搜索，只需选择鲜花种类，告诉系统他所想要的东西，系统就会为他们生成正确的查询。

其次，这个模板也可以被整合到一个聊天机器人或客服机器人中。顾客可以直接向机器人询问：“红玫瑰的价格是多少？” 机器人会根据输入内容来调用 LangChain 和 LLM，生成适当的查询，然后返回确切的价格给顾客。这样，不仅提高了服务效率，还增强了用户体验。



### 创建数据库表

首先，让我们创建一系列的数据库表，存储易速鲜花的业务数据。

这里，我们使用 SQLite 作为我们的示例数据库。它提供了轻量级的磁盘文件数据库，并不需要单独的服务器进程或系统，应用程序可以直接与数据库文件交互。同时，它也不需要配置、安装或管理，非常适合桌面应用、嵌入式应用或初创企业的简单需求。

SQLite 支持 ACID（原子性、一致性、隔离性、持久性），这意味着你的数据库操作即使在系统崩溃或电源失败的情况下也是安全的。虽然 SQLite 被认为是轻量级的，但它支持大多数 SQL 的标准特性，包括事务、触发器和视图。

因此，它也特别适用于那些不需要大型数据库系统带来的全部功能，但仍然需要数据持久性的应用程序，如移动应用或小型 Web 应用。当然，也非常适合我们做 Demo。

sqlite3 库，则是 Python 内置的轻量级 SQLite 数据库。通过 sqlite3 库，Python 为开发者提供了一个简单、直接的方式来创建、查询和管理 SQLite 数据库。当你安装 Python 时，sqlite3 模块已经包含在内，无需再进行额外的安装。

基于这个 sqlite3 库，创建业务数据的代码如下：

```py
# 导入sqlite3库
import sqlite3

# 连接到数据库
conn = sqlite3.connect('FlowerShop.db')
cursor = conn.cursor()

# 执行SQL命令来创建Flowers表
cursor.execute('''
        CREATE TABLE Flowers (
            ID INTEGER PRIMARY KEY, 
            Name TEXT NOT NULL, 
            Type TEXT NOT NULL, 
            Source TEXT NOT NULL, 
            PurchasePrice REAL, 
            SalePrice REAL,
            StockQuantity INTEGER, 
            SoldQuantity INTEGER, 
            ExpiryDate DATE,  
            Description TEXT, 
            EntryDate DATE DEFAULT CURRENT_DATE 
        );
    ''')

# 插入5种鲜花的数据
flowers = [
    ('Rose', 'Flower', 'France', 1.2, 2.5, 100, 10, '2023-12-31', 'A beautiful red rose'),
    ('Tulip', 'Flower', 'Netherlands', 0.8, 2.0, 150, 25, '2023-12-31', 'A colorful tulip'),
    ('Lily', 'Flower', 'China', 1.5, 3.0, 80, 5, '2023-12-31', 'An elegant white lily'),
    ('Daisy', 'Flower', 'USA', 0.7, 1.8, 120, 15, '2023-12-31', 'A cheerful daisy flower'),
    ('Orchid', 'Flower', 'Brazil', 2.0, 4.0, 50, 2, '2023-12-31', 'A delicate purple orchid')
]

for flower in flowers:
    cursor.execute('''
        INSERT INTO Flowers (Name, Type, Source, PurchasePrice, SalePrice, StockQuantity, SoldQuantity, ExpiryDate, Description) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    ''', flower)

# 提交更改
conn.commit()

# 关闭数据库连接
conn.close()
```

首先，我们连接到 `FlowerShop.db` 数据库。然后，我们创建一个名为 Flowers 的新表，此表将存储与每种鲜花相关的各种数据。

该表有以下字段：

| 字段          | 说明                       |
| ------------- | -------------------------- |
| ID            | 产品的唯一标识             |
| Name          | 产品名称                   |
| Type          | 产品类型                   |
| Source        | 产品来源                   |
| PurchasePrice | 采购价格                   |
| SalePrice     | 销售价格                   |
| StockQuantity | 存货数量                   |
| SoldQuantity  | 已售出的数量               |
| ExpiryDate    | 产品的保质期               |
| Description   | 产品描述                   |
| ImageURL      | 产品图片的链接             |
| EntryDate     | 产品入库日期，最近入库日期 |

接着，我们创建了一个名为 flowers 的列表，其中包含 5 种鲜花的所有相关数据。使用 for 循环，我们遍历 flowers 列表，并将每种鲜花的数据插入到 Flowers 表中。然后提交这些更改，把它们保存到数据库中。最后，我们关闭与数据库的连接。



### 用 Chain 查询数据库

因为 LangChain 的数据库查询功能较新，目前还处于实验阶段，因此，需要先安装 `langchain-experimental` 包，这个包含有实验性的 LangChain 新功能。

```bash
pip install langchain-experimental
```

下面，我们就开始通过 SQLDatabaseChain 来查询数据库。代码如下：

```py
# 导入langchain的实用工具和相关的模块
from langchain.utilities import SQLDatabase
from langchain.llms import OpenAI
from langchain_experimental.sql import SQLDatabaseChain

# 连接到FlowerShop数据库（之前我们使用的是Chinook.db）
db = SQLDatabase.from_uri("sqlite:///FlowerShop.db")

# 创建OpenAI的低级语言模型（LLM）实例，这里我们设置温度为0，意味着模型输出会更加确定性
llm = OpenAI(temperature=0, verbose=True)

# 创建SQL数据库链实例，它允许我们使用LLM来查询SQL数据库
db_chain = SQLDatabaseChain.from_llm(llm, db, verbose=True)

# 运行与鲜花运营相关的问题
response = db_chain.run("有多少种不同的鲜花？")
print(response)

response = db_chain.run("哪种鲜花的存货数量最少？")
print(response)

response = db_chain.run("平均销售价格是多少？")
print(response)

response = db_chain.run("从法国进口的鲜花有多少种？")
print(response)

response = db_chain.run("哪种鲜花的销售量最高？")
print(response)
```

这里，我们导入必要的 `LangChain` 模块，然后连接到 `FlowerShop` 数据库，初始化 OpenAI 的 LLM 实例。之后用 `SQLDatabaseChain` 来创建一个从 LLM 到数据库的链接。

最后，用 `db_chain.run()` 方法来查询多个与鲜花运营相关的问题，Chain 的内部会把这些自然语言转换为 SQL 语句，并查询数据库表，得到查询结果之后，又通过 LLM 把这个结果转换成自然语言。

因此，Chain 的输出结果是我们可以理解的，也是可以直接传递给 Chatbot 的人话。

> SQLDatabaseChain 调用大语言模型，完美地完成了从自然语言（输入）到自然语言（输出）的新型 SQL 查询。



### 用 Agent 查询数据库

除了通过 Chain 完成数据库查询之外，LangChain 还可以通过 SQL Agent 来完成查询任务。相比 SQLDatabaseChain，使用 SQL 代理有一些优点。

1. 它可以根据数据库的架构以及数据库的内容回答问题（例如它会检索特定表的描述）。
2. 它具有纠错能力，当执行生成的查询遇到错误时，它能够捕获该错误，然后正确地重新生成并执行新的查询。

LangChain 使用 `create_sql_agent` 函数来初始化代理，通过这个函数创建的 SQL 代理包含 SQLDatabaseToolkit，这个工具箱中包含以下工具：

1. 创建并执行查询
2. 检查查询语法
3. 检索数据表的描述

在这些工具的辅助之下，代理可以趋动 LLM 完成 SQL 查询任务。代码如下：

```py
from langchain.utilities import SQLDatabase
from langchain.llms import OpenAI
from langchain.agents import create_sql_agent
from langchain.agents.agent_toolkits import SQLDatabaseToolkit
from langchain.agents.agent_types import AgentType

# 连接到FlowerShop数据库
db = SQLDatabase.from_uri("sqlite:///FlowerShop.db")
llm = OpenAI(temperature=0, verbose=True)

# 创建SQL Agent
agent_executor = create_sql_agent(
    llm=llm,
    toolkit=SQLDatabaseToolkit(db=db, llm=llm),
    verbose=True,
    agent_type=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
)

# 使用Agent执行SQL查询

questions = [
    "哪种鲜花的存货数量最少？",
    "平均销售价格是多少？",
]

for question in questions:
    response = agent_executor.run(question)
    print(response)
```

可以看到，和 Chain 直接生成 SQL 语句不同，代理会使用 ReAct 风格的提示。首先，它思考之后，将先确定第一个 action 是使用工具 `sql_db_list_tables`，然后观察该工具所返回的表格，思考后再确定下一个 action 是 `sql_db_schema`，也就是创建 SQL 语句，逐层前进，直到得到答案。



## 能否让 ChatGPT 自己生成这些引导文本呢

基于这个想法，KAUST（阿卜杜拉国王大学）的研究团队提出了一个名为 CAMEL 的框架。CAMEL 采用了一种基于“角色扮演”方式的大模型交互策略。在这种策略中，不同的 AI 代理扮演不同的角色，通过互相交流来完成任务。



### CAMEL 交流式代理框架

下面我们一起来看看 CAMEL——这个多 AI 通过角色扮演进行交互的框架，以及它在 LangChain 中的具体实现。

CAMEL，字面意思是骆驼。这个框架来自于论文[《CAMEL: Communicative Agents for “Mind” Exploration of Large Scale Language Model Society》](https://arxiv.org/pdf/2303.17760)（CAMEL：用于大规模语言模型社会的“心智”探索的交流式代理）。这里面所谓的 CAMEL，实际上来自沟通（也就是交流）、代理、心智、探索以及 LLM 这五个单词的英文首字母。

上面这段介绍里面新名词不少，我们要一个个解释一下。

1. 交流式代理 Communicative Agents，是一种可以与人类或其他代理进行交流的计算机程序。这些代理可以是聊天机器人、智能助手或任何其他需要与人类交流的软件。为了使这些代理能够更好地与人类交流，研究人员一直在寻找方法来提高它们的交流能力。
2. 角色扮演 role-playing，则是这篇论文提出的主要思路，它允许交流代理扮演不同的角色，以更好地与人类或其他代理交流。这意味着代理可以模仿人类的行为，理解人类的意图，并据此做出反应。
3. 启示式提示 inception prompting，是一种指导代理完成任务的方法。通过给代理提供一系列的提示或指示，代理可以更好地理解它应该如何行动。这种方法可以帮助代理更好地与人类交流，并完成与人类的合作任务。

这里的核心创新点是，通过角色扮演和启示式提示的框架来引导代理的交流过程。





## 实战篇

聊天机器人（Chatbot）是 LLM 和 LangChain 的核心用例之一，很多人学习大语言模型，学习 LangChain，就是为了开发出更好的、更能理解用户意图的聊天机器人。聊天机器人的核心特征是，它们可以进行长时间的对话并访问用户想要了解的信息。

如图所示，聊天机器人设计过程中的核心组件包括：

1. 聊天模型：这是对话的基础，它更偏向于自然的对话风格。你可以参考 LangChain 相关文档中所支持的聊天模型的列表。尽管大模型（LLM）也可以应用于聊天机器人，但专用的聊天模型（Chat Model）更适合对话场景。聊天模型：这是对话的基础，它更偏向于自然的对话风格。你可以参考 LangChain 相关文档中所支持的聊天模型的列表。尽管大模型（LLM）也可以应用于聊天机器人，但专用的聊天模型（Chat Model）更适合对话场景。
2. 提示模板：帮助你整合默认消息、用户输入、历史交互以及检索时需要的上下文。
3. 记忆：它允许机器人记住与用户之间的先前互动，增强对话连贯性。
4. 检索器：这是一个可选组件，特别适合那些需要提供特定领域知识的机器人。

整体来说，聊天机器人的关键在于其记忆和检索能力，记忆使聊天机器人能够记住过去的交互，而检索则为聊天机器人提供最新的、特定于领域的信息。



### 项目的技术实现细节

在这个聊天机器人的实现过程中，我们将遵循敏捷开发的原则。先集中精力开发一个基础版本的机器人，实现最核心的功能，比如说能够聊天就可以了。然后，再逐步加入更多的功能，例如，能够基于易速鲜花的企业知识库进行检索，比如，用户可以输入订单号来查询订单状态，或询问如何退货等常见问题。

这个项目的具体技术实现步骤，这里简述一下。

第一步：通过 LangChain 的 ConversationChain，实现一个最基本的聊天对话工具。

第二步：通过 LangChain 中的记忆功能，让这个聊天机器人能够记住用户之前所说的话。

第三步：通过 LangChain 中的检索功能，整合易速鲜花的内部文档资料，让聊天机器人不仅能够基于自己的知识，还可以基于易速鲜花的业务流程，给出专业的回答。

第四步（可选）：通过 LangChain 中的数据库查询功能，让用户可以输入订单号来查询订单状态，或者看看有没有存货等等。

第五步：在网络上部署及发布这个聊天机器人，供企业内部员工和易速鲜花用户使用。

在上面的 5 个步骤中，我们使用到了很多 LangChain 技术，包括提示工程、模型、链、代理、RAG、数据库检索等。



### 第一步：开发最基本的聊天机器人

让我们先来用 LangChain 打造出一个最简单的聊天机器人。

```py
# 设置OpenAI API密钥
import os
os.environ["OPENAI_API_KEY"] = 'Your OpenAI Key'

# 导入所需的库和模块
from langchain.schema import (
    HumanMessage,
    SystemMessage
)
from langchain.chat_models import ChatOpenAI

# 创建一个聊天模型的实例
chat = ChatOpenAI()

# 创建一个消息列表
messages = [
    SystemMessage(content="你是一个花卉行家。"),
    HumanMessage(content="朋友喜欢淡雅的颜色，她的婚礼我选择什么花？")
]

# 使用聊天模型获取响应
response = chat(messages)
print(response)
```

运行程序，输出如下：

```py
content='对于喜欢淡雅的颜色的婚礼，你可以选择以下花卉：\n\n1. 白色玫瑰：白色玫瑰象征纯洁和爱情，它们能为婚礼带来一种优雅和浪漫的氛围。\n\n2. 紫色满天星：紫色满天星是十分优雅的小花，它们可以作为装饰花束或餐桌中心点使用，为婚礼增添一丝神秘感。\n\n3. 淡粉色康乃馨：淡粉色康乃馨是一种温馨而浪漫的花卉，能为婚礼带来一种柔和的氛围。\n\n4.  白色郁金香：白色郁金香代表纯洁和完美，它们可以为婚礼带来一种高贵和典雅的感觉。\n\n5. 淡紫色蓝雏菊：淡紫色蓝雏菊是一种可爱的小花，它们可以作为装饰花束或花冠使用，为婚礼增添一丝童真和浪漫。\n\n这些花卉都能营造出淡雅的氛围，并与婚礼的整体风格相得益彰。当然，你也可以根据你朋友的喜好和主题来选择适合的花卉。'
```

下面，我把它重构一下，让 Chatbot 能够和我们循环地进行对话。

```py
# 设置OpenAI API密钥
import os
os.environ["OPENAI_API_KEY"] = 'Your OpenAI Key'

# 导入所需的库和模块
from langchain.schema import HumanMessage, SystemMessage
from langchain.chat_models import ChatOpenAI

# 定义一个命令行聊天机器人的类
class CommandlineChatbot:
    # 在初始化时，设置花卉行家的角色并初始化聊天模型
    def __init__(self):
        self.chat = ChatOpenAI()
        self.messages = [SystemMessage(content="你是一个花卉行家。")]

    # 定义一个循环来持续与用户交互
    def chat_loop(self):
        print("Chatbot 已启动! 输入'exit'来退出程序。")
        while True:
            user_input = input("你: ")
            # 如果用户输入“exit”，则退出循环
            if user_input.lower() == 'exit':
                print("再见!")
                break
            # 将用户的输入添加到消息列表中，并获取机器人的响应
            self.messages.append(HumanMessage(content=user_input))
            response = self.chat(self.messages)
            print(f"Chatbot: {response.content}")

# 如果直接运行这个脚本，启动聊天机器人
if __name__ == "__main__":
    bot = CommandlineChatbot()
    bot.chat_loop()
```

运行程序后，你可以一直和这个 Bot 聊天，直到你聊够了，输入 exit，它会和你说再见。

好的，一个简单的聊天机器人已经搭建好了，不过，这个聊天机器人没有记忆功能，它不会记得你之前说过的话。

> 下面，我们要通过记忆机制，把它改造成一个能记住话的 Chatbot。

### 第二步：增加记忆机制

下面，我们来通过 ConversationBufferMemory 给 Chatbot 增加记忆。具体代码如下：

```py
# 设置OpenAI API密钥
import os
os.environ["OPENAI_API_KEY"] = 'Your OpenAI Key'

# 导入所需的库和模块
from langchain.schema import HumanMessage, SystemMessage
from langchain.memory import ConversationBufferMemory
from langchain.prompts import (
    ChatPromptTemplate,
    MessagesPlaceholder,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
)
from langchain.chains import LLMChain
from langchain.chat_models import ChatOpenAI

# 设置OpenAI API密钥
os.environ["OPENAI_API_KEY"] = 'Your OpenAI Key'  

# 带记忆的聊天机器人类
class ChatbotWithMemory:
    def __init__(self):

        # 初始化LLM
        self.llm = ChatOpenAI()

        # 初始化Prompt
        self.prompt = ChatPromptTemplate(
            messages=[
                SystemMessagePromptTemplate.from_template(
                    "你是一个花卉行家。你通常的回答不超过30字。"
                ),
                MessagesPlaceholder(variable_name="chat_history"),
                HumanMessagePromptTemplate.from_template("{question}")
            ]
        )
        
        # 初始化Memory
        self.memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
        
        # 初始化LLMChain with LLM, prompt and memory
        self.conversation = LLMChain(
            llm=self.llm,
            prompt=self.prompt,
            verbose=True,
            memory=self.memory
        )

    # 与机器人交互的函数
    def chat_loop(self):
        print("Chatbot 已启动! 输入'exit'来退出程序。")
        while True:
            user_input = input("你: ")
            if user_input.lower() == 'exit':
                print("再见!")
                break
            
            response = self.conversation({"question": user_input})
            print(f"Chatbot: {response['text']}")

if __name__ == "__main__":
    # 启动Chatbot
    bot = ChatbotWithMemory()
    bot.chat_loop()
```

程序的核心是 `ChatbotWithMemory` 类，这是一个带有记忆功能的聊天机器人类。在这个类的初始化函数中，定义了一个对话缓冲区记忆，它会跟踪对话历史。在 LLMChain 被创建时，就整合了 LLM、提示和记忆，形成完整的对话链。

你看，我们的 Chatbot 成功地复述出了我好几轮之前传递给它的关键信息，也就是我的姐姐已经 44 岁了。她的推荐是基于这个原则来进行的。



### 第三步：增加检索机制

下面，继续增强 Chatbot 的功能，我们要把易速鲜花的内部文档信息嵌入到大模型的知识库中。让它成为一个拥有“易速鲜花”价值观的 Super 客服。

```py
# 导入所需的库
import os
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Qdrant
from langchain.memory import ConversationSummaryMemory
from langchain.chat_models import ChatOpenAI
from langchain.chains import ConversationalRetrievalChain
from langchain.document_loaders import PyPDFLoader
from langchain.document_loaders import Docx2txtLoader
from langchain.document_loaders import TextLoader

# 设置OpenAI API密钥
os.environ["OPENAI_API_KEY"] = 'Your OpenAI Key'  

# ChatBot类的实现-带检索功能
class ChatbotWithRetrieval:

    def __init__(self, dir):

        # 加载Documents
        base_dir = dir # 文档的存放目录
        documents = []
        for file in os.listdir(base_dir): 
            file_path = os.path.join(base_dir, file)
            if file.endswith('.pdf'):
                loader = PyPDFLoader(file_path)
                documents.extend(loader.load())
            elif file.endswith('.docx') or file.endswith('.doc'):
                loader = Docx2txtLoader(file_path)
                documents.extend(loader.load())
            elif file.endswith('.txt'):
                loader = TextLoader(file_path)
                documents.extend(loader.load())
        
        # 文本的分割
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=200, chunk_overlap=0)
        all_splits = text_splitter.split_documents(documents)
        
        # 向量数据库
        self.vectorstore = Qdrant.from_documents(
            documents=all_splits, # 以分块的文档
            embedding=OpenAIEmbeddings(), # 用OpenAI的Embedding Model做嵌入
            location=":memory:",  # in-memory 存储
            collection_name="my_documents",) # 指定collection_name
        
        # 初始化LLM
        self.llm = ChatOpenAI()
        
        # 初始化Memory
        self.memory = ConversationSummaryMemory(
            llm=self.llm, 
            memory_key="chat_history", 
            return_messages=True
            )
        
        # 设置Retrieval Chain
        retriever = self.vectorstore.as_retriever()
        self.qa = ConversationalRetrievalChain.from_llm(
            self.llm, 
            retriever=retriever, 
            memory=self.memory
            )

    # 交互对话的函数
    def chat_loop(self):
        print("Chatbot 已启动! 输入'exit'来退出程序。")
        while True:
            user_input = input("你: ")
            if user_input.lower() == 'exit':
                print("再见!") 
                break
            # 调用 Retrieval Chain  
            response = self.qa(user_input)
            print(f"Chatbot: {response['answer']}")

if __name__ == "__main__":
    # 启动Chatbot
    folder = "OneFlower"
    bot = ChatbotWithRetrieval(folder)
    bot.chat_loop()
```

通过文档加载、文本分割、文档向量化以及检索功能，这个新的机器人除了常规的聊天功能，还能够检索存储在指定目录中的文档，并基于这些文档提供答案。

当用户输入一个问题时，机器人首先在向量数据库中查找与问题最相关的文本块。这是通过将用户问题转化为向量，并在数据库中查找最接近的文本块向量来实现的。然后，机器人使用 LLM（大模型）在这些相关的文本块上进一步寻找答案，并生成回答。

现在，新的 Chatbot 既能够回答一般性的问题，又能够回答易速鲜花内部问题，成了一个多面手！

接下来，我们来看看如何的去发布到网络上：



### 聊天机器人 项目说明

我们首先看看 web 界面，通过 Flask 部署的人脉工具。Flask 是一个通用的、微型的 Web 应用框架，非常适合创建各种 Web 应用程序，不仅仅局限于机器学习或数据科学项目。Flask 为开发者提供了很高的灵活性，你可以自定义路由、模板、前端和后端的交互等等。对于初学者，Flask 可能需要更长时间来学习，尤其是需要结合其他前端技术或数据库技术时。

不过，对于机器学习项目来说，我们还有其他部署方案。比如 Streamlit 和 Gradio，就为机器学习和数据科学应用提供了快速、专门化的解决方案。如果你的项目目标是快速展示和验证模型效果，那么 Streamlit 和 Gradio 是优秀的选择。这些框架提供了简单易用的 API 和丰富的可视化组件，让你可以用少量代码快速构建交互式应用程序，提高你的开发效率，也可以更好地展示工作成果。



## 参考链接

极客时间 | Langchain 实战课: https://time.geekbang.com/column/article/699363?utm_campaign=geektime_search&utm_content=geektime_search&utm_medium=geektime_search&utm_source=geektime_search&utm_term=geektime_search

手学大模型应用开发: https://linklearner.com/lesson/11eee795-2d34-ce9a-abce-00ffd44c5a68/summary

Langchain 官方网站： https://python.langchain.com/v0.1/docs/get_started/introduction/