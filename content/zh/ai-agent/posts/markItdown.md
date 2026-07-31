---
url: "/zh/projects/markitdown/"
title: "MarkItDown 文档转 Markdown 实战：0.1.6 机制基线与 0.1.7 状态"
date: 2025-04-21T15:41:21+08:00
lastmod: 2026-07-31T16:30:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Open Source
  - Python
  - LLM
  - RAG
  - Project Learning
categories:
  - Development
description: >
  这是一份面向开发者的 MarkItDown 文档摄取实战指南，以可复核的 0.1.6 机制为基线并说明 0.1.7 发布状态，讲清内置转换、OCR 插件、视觉模型、Azure 文档智能与内容理解的边界，提供选型矩阵、质量门和可复现实验，帮助你在进入 RAG 索引前发现阅读顺序、表格、图片文字与成本风险。
aliases:
  - /zh/posts/ai-projects/markitdown/
tldr:
  - "MarkItDown 适合把多种文件摄取为紧凑、机器友好的 Markdown；它不是追求版式还原的出版转换器。"
  - "内置转换、markitdown-ocr、LLM 图像描述、Azure Document Intelligence 与 Azure Content Understanding 解决的是五类不同问题。"
  - "先根据文档里的证据选择转换路径，再用自己的语料测量覆盖率、阅读顺序、表格、成本、延迟与失败行为。"
faq:
  - q: "Microsoft MarkItDown 是什么？"
    a: "MarkItDown 是微软开源的 Python 工具，可把 PDF、DOCX、PPTX、XLSX、HTML、图片、音频、EPUB、ZIP 等输入转换为供文本分析和 LLM 工作流使用的 Markdown。它优先保留有用内容和轻量结构，而不是像出版工具那样复刻视觉版式。"
  - q: "MarkItDown 0.1.6 是否自带 OCR？"
    a: "0.1.6 增加了 OCR layer，但实际 OCR 路径是独立的 markitdown-ocr 插件。它借助 OpenAI 兼容的视觉模型读取 PDF、DOCX、PPTX、XLSX 中的图片，并为扫描 PDF 提供整页回退。插件默认关闭，必须显式启用并提供兼容客户端。"
  - q: "markitdown-ocr 和 Azure Document Intelligence 有什么区别？"
    a: "markitdown-ocr 把文档图片发送到视觉模型，并将识别文字插回普通转换流程；Azure Document Intelligence 是按量计费的云端版面分析服务，更关注扫描 PDF、表格和复杂页面结构。二者的凭据、成本、治理要求与失败方式都不同。"
  - q: "什么时候应使用 Azure Content Understanding？"
    a: "当任务不只需要文档转换，还要统一处理图片、音频或视频，提取合同字段等结构化信息，或使用自定义 analyzer 时，可以考虑 Azure Content Understanding。它的范围比 Document Intelligence 更广，每个被路由的转换都会触发收费 API 调用。"
  - q: "如何判断 MarkItDown 输出能否进入 RAG？"
    a: "准备一组有代表性的真实文档，检查文字覆盖、阅读顺序、标题和列表、表格可用性、重复内容、延迟、成本与失败是否可观测；再用需要表格、脚注和图片文字才能回答的问题测试检索。Markdown 看起来整洁，并不等于证据完整。"
cover:
  image: /images/covers/ai-agent/2025/markItdown.jpeg
  alt: "文档经过分层转换与质量检查后成为结构化 Markdown"
---

> 文档转换器是一座桥，不是真相本身。真正重要的不是输出第一眼是否整洁，而是下一套系统需要的证据有没有过桥。

MarkItDown 的演示很简单：装一个包，传入文件，得到 Markdown。困难往往从下一分钟开始。一个 PDF 可能同时包含可选文字、扫描页、图表和复杂表格；一份演示文稿的关键数字可能藏在截图里；一个工作簿的含义可能依赖公式、合并单元格与空间关系。它们虽然都叫“文档”，却不该走同一条转换路径。

本文以 **MarkItDown 0.1.6** 的机制作为可复核基线。0.1.6 于 2026 年 5 月 26 日发布；截至 2026 年 7 月 31 日，PyPI 已发布 **0.1.7**。版本状态会继续变化，所以本文不会把 0.1.6 称为最新版，而是用它固定安装与实验条件。升级到 0.1.7 时，应按后文的同一组质量门重跑语料，而不是默认输出完全兼容。

我们只回答三个实际问题：

1. 怎样用最少的复杂度开始转换？
2. 内置转换、OCR、视觉模型和 Azure 服务应该怎么选？
3. 输出会在哪里失真，怎样在它进入 RAG 之前发现？

目标不是把 MarkItDown 说成万能工具，而是让它的取舍清晰可见。

## MarkItDown 是什么，又不是什么

[MarkItDown](https://github.com/microsoft/markitdown) 是微软开源的 Python 文档转换工具。根据官方项目说明，它可以处理 PDF、Word、PowerPoint、Excel、图片、音频、HTML、CSV、JSON、XML、ZIP、EPUB、YouTube URL 等输入，具体能力取决于安装的可选依赖。

它的目标是机器友好的文本。Markdown 能保留标题、列表、链接、表格和代码等有用信号，又不必背负 PDF 或 Office 的完整视觉模型，因此适合：

- 为 LLM 提示词准备材料；
- 为检索系统生成可切分文本；
- 统一混合格式的文档集合；
- 构建可搜索的研究档案；
- 在版本控制里审阅内容；
- 在分析前完成第一层文本提取。

MarkItDown 不是桌面出版转换器。它不承诺像素级版式、相同分页、精确字体，也不保证能无损转回源文件。如果要求是“结果看起来必须与原文完全一致”，Markdown 多半就不是正确的目标格式。

这个区别在 PDF 上最明显。PDF 首先记录页面上的图形如何出现，不一定包含可靠的逻辑阅读顺序。两个扩展名同为 `.pdf` 的文件，可能需要完全不同的摄取方案。

## 只安装需要的能力

MarkItDown 要求 Python 3.10 或更高版本。第一次评估可以创建隔离环境，并安装 0.1.6 的全部可选转换器：

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install "markitdown[all]==0.1.6"
```

生产服务更适合只安装语料需要的特性组。依赖越少，冲突、镜像体积与攻击面也越小：

```bash
# 只处理常见文档
python -m pip install \
  "markitdown[pdf,docx,pptx,xlsx]==0.1.6"

# 增加 Azure Document Intelligence
python -m pip install \
  "markitdown[az-doc-intel]==0.1.6"

# 增加 Azure Content Understanding
python -m pip install \
  "markitdown[az-content-understanding]==0.1.6"
```

固定版本不是形式主义。转换输出本身就是数据管道行为：解析器升级可能改变标题、表格、空白和阅读顺序，继而改变切块边界与检索结果。应当像管理数据 schema 一样管理转换器版本。

### 命令行

最小可用命令只有几个：

```bash
# 输出到终端
markitdown report.docx

# 保存结果
markitdown report.docx -o report.md

# 从标准输入转换
curl -sS https://example.com | markitdown > example.md
```

批量执行前，先从每类重要文档中挑一份测试。退出码为零只说明程序完成了转换，不代表关键内容成功保留。

### Python API

普通 API 返回一个结果对象，Markdown 位于 `text_content`：

```python
from markitdown import MarkItDown

converter = MarkItDown(enable_plugins=False)
result = converter.convert("report.docx")

with open("report.md", "w", encoding="utf-8") as output:
    output.write(result.text_content)
```

MarkItDown 0.1.x 在内存中完成转换。`convert_stream()` 接收二进制流，适合上传文件或对象存储：

```python
from io import BytesIO
from markitdown import MarkItDown

converter = MarkItDown(enable_plugins=False)

payload = BytesIO(uploaded_bytes)
result = converter.convert_stream(payload, extension=".xlsx")
markdown = result.text_content
```

输出旁边至少保存原文件名、MIME type、转换器版本与校验和。没有来源信息的 Markdown，出错后很难追溯。

## 五条转换路径，别都叫 OCR

0.1.6 提供的几种能力常被笼统归入“OCR”，但它们在架构中应当彼此分开。

### 1. 内置的格式转换器

这是默认的本地路径。它按文件格式调用相应转换器，不需要 LLM 或 Azure 服务，通常适合：

- 文字原生存在的 Office 文档；
- 普通 HTML 与结构化文本；
- 主要信息位于单元格中的表格；
- 阅读顺序简单的数字原生 PDF；
- 要求本地处理、边际成本可预测的工作流。

它的弱点是那些并非普通文本对象的证据。DOCX 里的截图、纯扫描 PDF、靠视觉关系表达的图表，都可能几乎不贡献内容；复杂分栏与表格也可能被拍平。

先从这里开始，是因为它便宜且容易检查，不是因为它永远足够好。

### 2. LLM 图像描述

MarkItDown 可以接收 OpenAI 兼容客户端和模型，为图片生成描述。官方 README 当前明确列出图像与 PPTX 场景：

```python
import os
from markitdown import MarkItDown
from openai import OpenAI

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

converter = MarkItDown(
    enable_plugins=False,
    llm_client=client,
    llm_model="gpt-4o",
    llm_prompt="忠实描述图示，保留标签与不确定之处。",
)

result = converter.convert("architecture.png")
print(result.text_content)
```

图像描述与 OCR 有交集，但问题不同。描述问的是“这张图表达了什么”，OCR 问的是“图里写了哪些字”。描述模型可能讲清图表趋势，却省略坐标标签；OCR 可能读出标签，却看不见变量间关系。应根据要保留的证据设计提示词。

两者都会把图片发送到模型端点。启用前要审查隐私、数据驻留、保留策略与成本。

### 3. `markitdown-ocr` 插件

官方 [`markitdown-ocr`](https://github.com/microsoft/markitdown/tree/main/packages/markitdown-ocr) 包扩展了 PDF、DOCX、PPTX 和 XLSX 转换。它提取文档里的图片，发送给 OpenAI 兼容的视觉模型，再把识别文本插回转换结果；对于扫描 PDF，还提供整页 OCR 回退。

安装插件与兼容客户端：

```bash
python -m pip install markitdown-ocr openai
markitdown --list-plugins
```

插件**默认关闭**。安装不会自动激活，必须显式启用：

```bash
markitdown scanned-report.pdf \
  --use-plugins \
  --llm-client openai \
  --llm-model gpt-4o \
  -o scanned-report.md
```

Python 用法同样需要明确打开插件并传入客户端：

```python
import os
from markitdown import MarkItDown
from openai import OpenAI

converter = MarkItDown(
    enable_plugins=True,
    llm_client=OpenAI(api_key=os.environ["OPENAI_API_KEY"]),
    llm_model="gpt-4o",
)

result = converter.convert("scanned-report.pdf")
print(result.text_content)
```

如果插件已加载却没有 `llm_client`，OCR 会被跳过，流程回退到标准转换器。这个设计避免程序直接崩溃，也可能掩盖配置错误。生产环境不能用“插件已安装”推断“OCR 已发生”，应检查预期图片文字、覆盖率或运行记录。

这里的 OCR 是 LLM 服务层，不是随包附带的传统 OCR 引擎。它引入网络依赖、模型波动、幻觉风险与请求成本。只有当图片文字确实重要，而且视觉端点经过批准时，才值得启用。

### 4. Azure Document Intelligence

Azure Document Intelligence 是另一条独立的云端路径。在 MarkItDown 集成中，它面向文档版面提取，尤其适合扫描 PDF、复杂表格和多栏页面等内置解析器难以处理的情况。

```bash
markitdown complex-report.pdf \
  -o complex-report.md \
  -d \
  -e "https://YOUR-RESOURCE.cognitiveservices.azure.com/"
```

Python 形式为：

```python
from markitdown import MarkItDown

converter = MarkItDown(
    docintel_endpoint="https://YOUR-RESOURCE.cognitiveservices.azure.com/"
)
result = converter.convert("complex-report.pdf")
print(result.text_content)
```

Document Intelligence 不是 `markitdown-ocr` 插件。它是 Azure 的版面分析服务，使用 Azure 凭据与计费，也有独立的区域可用性和数据治理要求。当表格、段落、分栏和页面结构是核心证据时，它通常比普通视觉 OCR 更对题。

### 5. Azure Content Understanding

0.1.6 发布线加入的 Azure Content Understanding 范围比文档转换更广。它能将文档、图片、音频和视频路由到预置或自定义 analyzer，也能把结构化 analyzer 字段作为 YAML front matter 输出。

```bash
markitdown meeting.mp4 \
  --use-cu \
  --cu-endpoint "https://YOUR-CU-ENDPOINT/"
```

Python API 可自动选择 analyzer：

```python
from markitdown import MarkItDown

converter = MarkItDown(
    cu_endpoint="https://YOUR-CU-ENDPOINT/"
)

document = converter.convert("contract.pdf")
meeting = converter.convert("meeting.mp4")
```

领域提取可以指定自定义 analyzer：

```python
converter = MarkItDown(
    cu_endpoint="https://YOUR-CU-ENDPOINT/",
    cu_analyzer_id="my-contract-analyzer",
)
result = converter.convert("contract.pdf")
print(result.markdown)
```

当“转换”只是问题的一部分，例如还要提取发票字段、合同条款，或用同一接口分析文档与音视频，才考虑 Content Understanding。每个被路由的转换都会触发收费的 Azure 调用；如果只有少数文件需要它，应限制路由范围。

不要把 Content Understanding 当成“更好的 OCR”。它是一条多模态分析与结构化提取路径，运维契约也更大。

## 实用选择矩阵

原则很简单：选择能够保住应用所需证据的最小方案。

| 文档中的证据 | 优先尝试 | 何时升级 |
|---|---|---|
| 普通原生文字的 DOCX/PPTX/XLSX | 内置转换器 | 关键信息藏在截图或嵌入图片中 |
| 段落简单的数字原生 PDF | 内置 PDF 转换器 | 阅读顺序、表格或分栏损坏 |
| 纯扫描 PDF | `markitdown-ocr` 或 Document Intelligence | 视觉 OCR 不稳定，或页面几何关系很重要 |
| 图片中含文字的 Office 文件 | `markitdown-ocr` | 需要受治理的 Azure 版面服务 |
| 独立图片或幻灯片视觉 | LLM 图像描述 | 需要精确文字或确定性 OCR |
| 复杂 PDF 表格与版面 | Azure Document Intelligence | 还需要领域字段或非文档模态 |
| 文档加音频、视频 | Azure Content Understanding | 受限子集可由更窄的本地工具完成 |
| 高保真出版转换 | Pandoc 或出版工作流 | Markdown 无法表达所需版式 |

最终架构应由四个约束决定：

1. **证据**：意义来自文字、几何结构、图片、音频，还是领域字段？
2. **治理**：源文件能否离开本机，只允许经过哪些服务？
3. **经济性**：在整个语料规模上，可接受的延迟和单文档成本是多少？
4. **恢复能力**：管道能否发现劣质转换，并把源文件送去重试或人工复核？

常见的好设计是一条级联：先本地转换，再做质量检查，只有失败文件才升级到云端。这不只是省钱，也让异常文档保持可见。

## 进入 RAG 前先建质量门

最常见的错误，是转换完一个目录就立刻把全部结果嵌入向量库。阅读顺序错乱、表格缺失一旦进入索引，检索层反而可能把它们包装得像权威答案。

更稳妥的管道会留下转换证据：

```python
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
from time import perf_counter
from markitdown import MarkItDown


@dataclass
class ConversionRecord:
    source: str
    source_sha256: str
    converter: str
    elapsed_ms: int
    output_chars: int
    status: str
    error: str | None = None


converter = MarkItDown(enable_plugins=False)


def convert_one(path: Path) -> tuple[str, ConversionRecord]:
    started = perf_counter()
    source_bytes = path.read_bytes()

    try:
        result = converter.convert(path)
        text = result.text_content
        record = ConversionRecord(
            source=str(path),
            source_sha256=sha256(source_bytes).hexdigest(),
            converter="markitdown-0.1.6-built-in",
            elapsed_ms=round((perf_counter() - started) * 1000),
            output_chars=len(text),
            status="ok" if text.strip() else "empty",
        )
        return text, record
    except Exception as exc:
        record = ConversionRecord(
            source=str(path),
            source_sha256=sha256(source_bytes).hexdigest(),
            converter="markitdown-0.1.6-built-in",
            elapsed_ms=round((perf_counter() - started) * 1000),
            output_chars=0,
            status="error",
            error=f"{type(exc).__name__}: {exc}",
        )
        return "", record
```

字符数只能算冒烟测试。还应根据自己的语料增加规则：

- 必须出现的短语或标识符是否存在；
- 页面或章节覆盖是否合理；
- 标题层级是否无规律地跳跃；
- 表格是否包含预期表头和行数；
- 重复页眉、页脚是否受控；
- 输出是否大部分由乱码组成；
- 需要 OCR 的文件是否包含图片文字；
- 日志是否避开密钥与个人信息；
- 失败是否进入重试或审阅队列，而不是变成空文本块。

清洗前先保存原始转换产物。之后的规范化也要能复现，并拥有独立版本。

## 可复现实验：不编造准确率

本文不提供凭空出现的准确率或延迟数字。性能取决于文件、硬件、网络、服务区域、模型和 analyzer。更可靠的做法，是建立一组你能亲自核对的小型测试语料。

### 准备语料

选择 20 到 50 份能代表真实分布的文档：

- 干净的文本 PDF；
- 双栏论文；
- 常见分辨率的扫描件；
- 表格密集的财务报告；
- 含截图的 DOCX；
- 含图表和演讲者备注的 PPTX；
- 多工作表且含图片的 XLSX；
- 损坏或受密码保护的输入；
- 至少一份异常大的文件。

为每份文件列出少量“必须保留”的事实：标题、章节顺序、表头、合计、脚注、图表标签和关键编号。它比完整人工转录便宜，也更贴近检索任务。

### 固定候选配置

为每条路径记录：

- MarkItDown 版本与安装的 extras；
- 插件版本和启用状态；
- LLM 提供方、精确模型、提示词与可配置的 temperature；
- Azure 服务、analyzer ID、区域与 API 版本；
- 重试策略与超时。

每个候选方案写入独立目录，绝不覆盖另一种策略的结果。

### 评估真正重要的东西

可以从这组权重开始，再按业务调整：

| 维度 | 问题 | 示例权重 |
|---|---|---:|
| 文字覆盖 | 必须保留的事实是否存在？ | 30% |
| 阅读顺序 | 读者能否顺着论证阅读？ | 20% |
| 表格 | 表头和值是否正确对应？ | 15% |
| 视觉证据 | 图片标签或含义是否保留？ | 10% |
| 噪声 | 重复、页眉和乱码是否受控？ | 10% |
| 运维 | 延迟、成本和失败率是否可接受？ | 15% |

最后测试下游检索。问题要故意依赖表格、脚注与图片文字，不能只问第一段。记录命中的文本块是否真的包含支持答案的证据。Markdown 看起来漂亮，也可能悄悄丢掉最重要的那个数字。

以下只是待验证的观察，不是实验结果：

- 对原生文本，内置转换通常最快、最便宜；
- OCR 路径通常能找回更多图片文字，也会增加成本和波动；
- 版面服务通常有助于复杂页面，但仍可能需要规范化；
- 每一种策略都会留下需要人工复核的文档。

这些是你的实验假设，不能冒充跑出来的数据。

## MarkItDown 容易在哪里失败

### PDF 阅读顺序

多栏、浮动图注、侧栏和脚注可能交错。所有字都在，不代表顺序正确；只看总字数发现不了这种问题。

### 表格

Markdown 表格有意保持简单，难以表达合并单元格、嵌套表头、旋转标签和跨页表格。可以把提取后的表格以 JSON 或 CSV 形式与叙述 Markdown 一起保存。

### 公式与图示

可见公式可能是文字对象、嵌入图片或绘图图元。图示的意义常来自空间关系，仅靠 OCR 无法表达。应保留原页引用，并考虑描述模型或专用解析器。

### OCR 置信度

LLM Vision 即使面对模糊图片，也可能生成流畅文字。流畅不是置信度。监管或数字敏感文档必须回看源图，不能把生成文字当作经过认证的转录。

### 表格文件的语义

单元格值不是整个工作簿。公式、隐藏工作表、格式约定、批注、命名范围和图表都可能携带意义。要明确哪些进入检索，哪些交给表格专用路径。

### 超大或恶意输入

压缩包可能巨幅膨胀，HTML 可能深层嵌套，媒体可能触发昂贵调用。0.1.6 修复了 PDF 内存增长与深层 HTML 等问题，但生产服务仍需限制文件大小、解压体积、超时和资源，并隔离执行环境。

## 安全与运维

文档转换会让不受信任内容经过一串解析器。应把它当作文件上传处理，而不是普通字符串格式化。

- 让 worker 只拥有最低限度的文件与网络权限；
- 白名单允许的扩展名，并验证内容类型，不信任文件名；
- 同时限制压缩前与解压后的体积；
- 保持 MarkItDown 和可选解析器及时更新；
- 只启用审核过的插件，插件包会执行 Python 代码；
- API Key 放在密钥系统或环境变量中，不写进代码和 Markdown；
- 日志与异常栈不记录敏感文档内容；
- 云端调用设置超时、并发上限与预算；
- 记录是否发生回退，静默 OCR 回退可能变成静默数据丢失；
- 保留源文件到输出的溯源关系，让删除策略覆盖派生 Markdown。

[MarkItDown 仓库](https://github.com/microsoft/markitdown) 将工具定位于用户主动发起的转换，也警告了不受信任内容的暴露风险。若把它包装成公共服务，周围的沙箱由你负责。

## MarkItDown、Pandoc、Marker 与 Docling 怎么选

这些工具有交集，但优化目标不同。

### Pandoc

[Pandoc](https://pandoc.org/) 是成熟的通用文档格式转换器，拥有丰富的内部文档模型。它擅长在 Markdown、HTML、DOCX、EPUB、LaTeX 等作者格式与出版格式之间转换，也适合需要 filter、引用文献、模板或受控输出的工作流。它并不是专门为扫描 PDF 做 OCR 的系统。“通用且成熟”不等于“所有 PDF 都高保真”。

### Marker

[Marker](https://github.com/datalab-to/marker) 聚焦文档，尤其是 PDF，并用模型辅助处理版面、表格、公式和图片。当复杂 PDF 结构是问题中心，而且能够接受本地模型运行时，它值得评估；相应地，模型和算力占用也与 MarkItDown 的轻量内置路径不同。

### Docling

[Docling](https://github.com/docling-project/docling) 提供文档处理管道和结构化文档表示，重视版面、表格、阅读顺序与多种导出格式。若下游代码需要比 Markdown 更丰富的中间模型，它往往更合适。

### 实际答案

输入格式广、希望使用简单 Python/CLI 接口、目标是 LLM 友好的 Markdown 时，选择 MarkItDown；作者格式互转与出版流程优先看 Pandoc；PDF 版面、公式和结构化解析占主导时，评估 Marker 或 Docling。

不要根据功能清单拍板。让候选工具跑同一组代表性语料，再检查业务最不能丢失的证据。

## 一条更耐久的生产路径

可靠的摄取服务可以保持朴素：

1. 为源文件生成指纹并隔离保存；
2. 检测格式与风险；
3. 运行最便宜且经过批准的转换器；
4. 检查必要证据与输出质量；
5. 失败文件才升级到 OCR 或版面服务；
6. 保存原始输出、规范化输出与溯源信息；
7. 结构通过检查后再切块；
8. 抽样把检索答案与源页对照；
9. 转换器版本或政策变化时重新处理。

升级策略应该存在于代码和配置中，而不是口耳相传：

```text
原生 Office 文字      -> 内置转换
嵌入图片文字          -> markitdown-ocr
复杂或扫描 PDF        -> Document Intelligence
领域字段或音视频       -> Content Understanding
出版级版式保真         -> 离开这条摄取管道
```

这样，MarkItDown 才处在它合适的位置：一套证据保留系统中的可靠组件，而不是被误认成万能转换器。

## 结语

MarkItDown 0.1.6 的价值，是让普通路径真正普通：许多文件通过一个 CLI 或 Python 接口就能变成紧凑 Markdown；可选能力再去处理图片文字、复杂版面与多模态分析。0.1.7 已经发布，但升级后仍应对同一批语料重跑检查，以事实决定是否迁移。

可选能力之间不能互换。OCR 插件使用 LLM Vision，需要安装、显式启用并传入客户端；LLM 图像描述负责解释视觉；Azure Document Intelligence 提取文档版面；Azure Content Understanding 提供多模态 analyzer 与结构化字段。每条路径都会改变成本、隐私、延迟与失败方式。

更深的一层是：转换质量并不是工具孤立的属性，而是源文件、问题和必须存活的证据三者之间的关系。选择能承载证据的最小桥梁，在自己的文档上测量它，并始终保留回望原岸的能力。

## 官方资料

- [Microsoft MarkItDown 仓库与 README](https://github.com/microsoft/markitdown)
- [MarkItDown 0.1.6 发布说明](https://github.com/microsoft/markitdown/releases/tag/v0.1.6)
- [MarkItDown 0.1.7 发布说明](https://github.com/microsoft/markitdown/releases/tag/v0.1.7)
- [`markitdown-ocr` 插件文档](https://github.com/microsoft/markitdown/tree/main/packages/markitdown-ocr)
- [MarkItDown PyPI 页面](https://pypi.org/project/markitdown/)
- [Azure AI Content Understanding 文档](https://learn.microsoft.com/azure/ai-services/content-understanding/)
- [Azure AI Document Intelligence 文档](https://learn.microsoft.com/azure/ai-services/document-intelligence/)
