---
url: "/zh/projects/tdd/"
title: "AI 与大模型应用的测试驱动开发：从确定性测试到风险化评测"
date: 2025-04-21T15:52:34+08:00
lastmod: 2026-07-31T10:00:00+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - LLM
  - Testing
  - Python
  - Go
  - Automation
categories:
  - Development
description: >
  面向 AI 与大模型应用的测试驱动开发指南：解释红—绿—重构在概率系统中的适用边界，搭建单元测试、契约集成、离线评测与线上监控四层防线，并给出 Python、React、Go 示例，以及评测器校准、风险分级 CI 和 Cursor Agent 审批策略，帮助团队在不掩盖不确定性的前提下建立可验证、可回滚的契约。
aliases:
  - /zh/posts/ai-projects/tdd/
tldr:
  - "红—绿—重构仍适合确定性代码；概率行为则需要固定数据集、明确容差、版本记录与分层评测。"
  - "可靠的 AI 系统要同时建设单元测试、契约集成测试、离线评测和线上监控，不能用一个总分代替四层证据。"
  - "编码 Agent 可以自动运行低风险检查，但迁移、联网、密钥、破坏性操作和高风险发布必须保留人工审批。"
cover:
  image: /images/covers/ai-agent/2025/tdd.jpeg
  alt: "红、绿、蓝三色测试闭环环绕一个受约束的 AI 系统"
---

当被测函数只是把两个数字相加时，测试驱动开发很好解释：先写一个失败测试，让它通过，再在行为不变的前提下改善实现。困难出现在函数开始调用大模型之后——同一个问题可能有五种都算正确的回答，今天通过的结果，明天也可能因为模型、检索索引或服务端推理环境变化而不同。

这并不意味着 TDD 过时了，而是“测试”这个词必须变得更精确。

在 AI 应用里，我把 TDD 看成一种发现契约的纪律。有些契约是精确的：解析器必须拒绝畸形 JSON，授权检查不能泄露其他租户的数据，工具调用必须符合 Schema。另一些契约是统计性的：客服助手应解决大多数常规问题，应引用给定政策，并且极少编造退款规则。前者属于普通测试，后者属于评测与监控。

我现在遵循的原则是：

> 测试，是我们与不确定性签下的一份契约。它不消灭不确定性，只说明哪些波动可以接受、怎样测量，以及越界时由谁作决定。

## TDD 承诺了什么，证据又真正说明什么

经典 TDD 是一个短循环：

1. **红（Red）**：把一个行为写成测试，并确认它因为预期原因失败。
2. **绿（Green）**：写出足以通过测试的最小合理实现。
3. **重构（Refactor）**：保持外部行为不变，改善代码与测试的结构。

顺序有价值。实现之后补写的测试，很容易只是在描述代码已经做了什么；先写测试，则迫使我们先回答代码应该做什么。

但 TDD 不该被包装成自然定律。对实证研究的系统综述给出了混合结果：[2014 年对 41 项研究的综述](https://doi.org/10.1016/j.infsof.2014.01.002)指出，研究严谨度、场景相关性、参与者经验和方法差异都会改变结论；[2016 年的系统综述](https://doi.org/10.1016/j.infsof.2016.02.004)在不少研究中观察到质量收益，也看到一部分工业研究中的生产率下降。后续关于[TDD 研究为何长期难有一致结论](https://arxiv.org/abs/2007.09863)的分析，同样把差异指向任务、熟练度、过程执行度和测量方式。

因此，TDD 更适合这些情况：

- 行为可以在实现前清楚表达；
- 失败便宜且容易复现；
- 团队能维持很短的反馈循环；
- 回归代价高，或错误很隐蔽；
- 测试观察稳定的公共行为，而非内部实现细节。

它不一定是以下场景的第一步：

- 团队还在探索产品是否值得做；
- 一次性原型的接口每小时都在变化；
- 输出主要是审美判断，又没有可用的验收条件；
- 硬件、数据或供应商依赖无法在本地复现；
- 所谓测试只是把所有关键交互都 mock 掉。

我不再问“我们是不是 TDD 团队”，仿佛它是一枚徽章。我会问：**哪一种不确定性，值得在继续写代码前先签一份契约？**

## AI 测试体系的四层防线

大模型功能不是一团不可分割的黑盒。它由普通代码、外部契约、概率行为和生产后果组成。我使用四层结构：

| 层级 | 保护对象 | 典型信号 | 运行位置 |
|---|---|---|---|
| 确定性单元测试 | 解析、路由、权限、格式、成本计算 | 精确通过/失败 | 本地保存与每个 PR |
| 契约与集成测试 | 模型网关、工具 Schema、检索、数据库 | Schema 与不变量 | PR 或定时任务 |
| 离线评测 | 任务质量、忠实度、风格、安全 | 带置信区间的指标 | 提示词/模型变更与发布候选 |
| 线上监控 | 真实流量、漂移、延迟、成本、事故 | 比率、分布、告警 | 上线后持续运行 |

这看起来像测试金字塔，却不能简化成“多写单测，少写端到端测试”。每一层回答的问题不同。完美的单测无法证明用户看懂了回答；漂亮的离线分数无法证明生产检索仍然新鲜；线上监控能发现损害，但作为第一道防线已经太晚。

Google 的论文 [《The ML Test Score》](https://research.google/pubs/the-ml-test-score-a-rubric-for-ml-production-readiness-and-technical-debt-reduction/)对生产机器学习提出了相同警告：模型质量只是生产就绪的一部分，数据、特征、基础设施与监控也必须拥有明确测试。

### 第一层：确定性单元测试

先把确定性逻辑从模型调用里剥离出来。工具参数校验、引用归一化、权限执行、预算计算、提示词选择和结构化输出解析，都应该是普通函数，并快到可以反复运行。

下面是 Python 3.12+ 与 pytest 9.x 的完整示例。它不调用模型，只验证发布策略。

`quality.py`：

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class Answer:
    text: str
    citations: tuple[str, ...]
    confidence: float


def is_publishable(answer: Answer, allowed_sources: set[str]) -> bool:
    """对生成答案执行确定性的发布规则。"""
    if not answer.text.strip():
        return False
    if not 0.0 <= answer.confidence <= 1.0:
        raise ValueError("confidence must be between 0 and 1")
    if answer.confidence < 0.70:
        return False
    if not answer.citations:
        return False
    return all(source in allowed_sources for source in answer.citations)
```

`test_quality.py`：

```python
import pytest

from quality import Answer, is_publishable


ALLOWED = {"policy/refunds", "policy/shipping"}


@pytest.mark.parametrize(
    ("answer", "expected"),
    [
        (
            Answer(
                text="退款期限为 30 天。",
                citations=("policy/refunds",),
                confidence=0.92,
            ),
            True,
        ),
        (
            Answer(text="可以退款。", citations=(), confidence=0.92),
            False,
        ),
        (
            Answer(
                text="确信但没有受信来源支持。",
                citations=("random/blog",),
                confidence=0.99,
            ),
            False,
        ),
        (
            Answer(
                text="我不确定。",
                citations=("policy/refunds",),
                confidence=0.40,
            ),
            False,
        ),
    ],
    ids=["grounded", "missing-citation", "unknown-source", "low-confidence"],
)
def test_is_publishable(answer: Answer, expected: bool) -> None:
    assert is_publishable(answer, ALLOWED) is expected


def test_rejects_invalid_confidence() -> None:
    with pytest.raises(ValueError, match="between 0 and 1"):
        is_publishable(
            Answer("Impossible confidence", ("policy/refunds",), 1.5),
            ALLOWED,
        )
```

运行：

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install "pytest>=9,<10"
pytest -q
```

参数化方式来自 pytest 官方的
[`@pytest.mark.parametrize` 文档](https://docs.pytest.org/en/stable/how-to/parametrize.html)。注意这个测试没有声称“confidence 就是真相”，也没有声称“有引用就代表引用支持结论”。它只执行一个确定性发布策略，语义支持要交给后面的层级。

### 第二层：契约与集成测试

这一层检查系统边界：

- 模型网关是否返回应用依赖的结构？
- 每个工具是否都有合法 JSON Schema？
- 工具调用是否保持了租户身份？
- 检索结果的来源 ID 能否被引用渲染器理解？
- 超时、限流、空检索和畸形输出时会发生什么？
- 备用模型是否被允许执行同样的动作？

不要断言远程模型返回的完整措辞。应该断言必需字段、有界数值、允许的工具名、重试上限、来源与幂等性。每个结果都记录供应商、模型标识、提示词版本、工具版本和请求参数。

大部分 PR 使用 fake；在定时任务或发布前运行少量真实供应商冒烟测试。Mock 只能证明代码会处理我们想象出来的响应，真实契约测试才会告诉我们供应商仍然提供所依赖的行为。

### 第三层：离线评测

离线评测用版本化数据集测量行为。优先从真实失败建立样本，而不是收集一堆通用常识题。一个有效样本至少包含输入与上下文、期望事实或动作、允许变化、风险等级、切片标签、来源日期、人工审核备注和 grader 版本。

能确定性判断时就不要使用模型裁判：枚举值做精确匹配，工具调用过 JSON Schema，生成代码执行测试，引用核对经过验证的来源 ID。只有无法诚实地还原为确定性规则的质量，才交给模型 grader。当前 [OpenAI grader API](https://platform.openai.com/docs/api-reference/graders)区分字符串检查、相似度检查、评分模型与组合评分；真正重要的原则与工具无关：**选择主观性最低、又能代表需求的裁判。**

不要把所有指标压成一个平均分。按语言、意图、长上下文、歧义请求、政策例外和对抗输入观察切片。总分从 86% 升到 88%，仍可能掩盖某个安全切片从 95% 跌到 70%。

### 第四层：线上监控

生产环境不是更大的离线数据集。用户措辞会改变，文档会老化，工具权限会调整，供应商也会更新基础设施。至少监控：

- 任务成功率与转人工率；
- 拒绝、放弃和重试率；
- 引用有效性与检索新鲜度；
- 工具调用错误与被拒动作；
- 延迟分位数、超时率、单次成功任务的 token 与成本；
- 模型、提示词、检索器和索引版本；
- 用户投诉、事故标签与抽样人工复核。

每次确认的事故，都应尽可能变成确定性回归测试或带标签的评测样本。否则组织会为同一堂课付两次学费。

## 概率输出中的红—绿—重构

只要重新定义“绿”，经典循环仍然有效。

### 红：让失败包含信息

对确定性代码，红意味着一个预期断言因正确原因失败；对评测，红意味着候选版本没有达到预先声明的阈值，或击穿了关键样本。修改提示词之前，要先冻结数据集和评分配置。

如果先看到新输出，再去补评测，我们很容易把基准改写成对候选版本的解释。这和“测试实现而非需求”是同一种自欺。

### 绿：通过最小但有意义的门槛

不要不断重采样，直到运气给出一个通过。概率系统的“绿”应明确：

- 数据集版本；
- 精确模型标识或快照；
- 提示词和工具版本；
- 解码参数与随机 seed；
- 方差会影响决策时的重复次数；
- 总体阈值、关键样本与容差；
- 置信区间。

例如：

```text
发布候选通过条件：
- Schema 合法率 = 100%
- 关键安全样本 = 100%
- 有依据回答率 >= 92%
- 95% 置信区间下界 > 89%
- 任一受监控切片回退不超过 2 个百分点
- p95 延迟 < 4.0 秒
```

这些数字不是通用答案，应由失败后果决定。睡前故事生成器和用药建议系统即使都调用 LLM，也不该共用发布门槛。

### 重构：改善系统，不要“改善”基准

变绿之后，可以简化提示词、隔离策略、删除重复示例、澄清工具描述或重组代码，但留出集必须继续留出。反复对它调参，它就成为训练数据，不再估计未来表现。

重构有时也意味着删掉一次 LLM 调用。如果规则可以确定性编码，且不损失必要弹性，普通代码通常更便宜、更好测，也更容易运维。

## 不假装随机性消失：四种控制手段

**容差**适合真正连续的行为，如延迟、成本、语义相似度和总体成功率。必须说明容差为何可接受，不能因为模型有随机性，就把精确的安全要求换成模糊阈值。

**Seed**在供应商支持时有助于重现实验，却不是普遍的回放保证。基础设施、计算内核、模型修订和不可见的服务端变化仍会改变结果。记录 seed，把它当实验上下文，而不是现实的锁。

**模型版本**应尽量钉住发布评测可用的最具体版本，并随每次运行保存。即使供应商声称兼容，升级也要作为一次变更测试；如果只有不断移动的别名，就加强监控并保留回滚。

**固定数据集**要像代码一样版本化。保留可见开发集、留出发布集和持续滚动的生产失败集；去除跨集合重复，记录每个样本为何存在，不能为了让版本通过而悄悄改标签。

只有方差可能改变决策时才重复试验。把确定性解析器测试跑十遍是在浪费算力；对高方差 Agent 轨迹只采一次，又是在购买虚假的确定感。

## 校准人工与模型 Grader

模型裁判仍然是模型，不是神谕。它可能偏爱冗长，模仿参考答案风格，漏掉领域错误，也会随自身版本改变。

一套可执行的校准流程是：

1. 写出窄而可观察的 rubric，并补充靠近决策边界的例子。
2. 让至少两位合格审核者独立标注分层抽样。
3. 解决分歧，改写含混标准。
4. 让候选模型 grader 在不知道人工答案时评同一批样本。
5. 分类别、分风险切片测一致性，而非只看总一致率。
6. 检查误放行与误拒绝。
7. 在不确定分数附近设置弃权或人工复核区间。
8. 版本化 rubric、grader 提示词、模型与校准集。
9. 模型、领域或政策显著变化后重新校准。

高风险场景里，模型 grader 应负责分流人工审核，而不是替代人工。成对比较通常比绝对打分稳定，但仍会有位置和文风偏见，要轮换答案顺序并放入已知控制样本。人工也不会自动正确；审核者需要领域上下文、时间和清楚标准。标注者分歧不是噪音，它往往提示产品要求本身还没有说清。

## 三个可以真正运行的小例子

Python 示例已经保护了确定性发布规则。相同思路也适用于界面与服务层。

### React 19 + Vitest 4：测试用户能观察的行为

`AskBox.jsx`：

```jsx
import {useState} from 'react'

export function AskBox({onAsk}) {
  const [question, setQuestion] = useState('')

  async function submit(event) {
    event.preventDefault()
    const trimmed = question.trim()
    if (trimmed) await onAsk(trimmed)
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="question">Question</label>
      <input
        id="question"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
      />
      <button type="submit">Ask</button>
    </form>
  )
}
```

`AskBox.test.jsx`：

```jsx
import {describe, expect, it, vi} from 'vitest'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {AskBox} from './AskBox'

describe('AskBox', () => {
  it('submits the trimmed question', async () => {
    const user = userEvent.setup()
    const onAsk = vi.fn().mockResolvedValue(undefined)
    render(<AskBox onAsk={onAsk} />)

    await user.type(
      screen.getByRole('textbox', {name: 'Question'}),
      '  Why?  ',
    )
    await user.click(screen.getByRole('button', {name: 'Ask'}))

    expect(onAsk).toHaveBeenCalledWith('Why?')
    expect(onAsk).toHaveBeenCalledTimes(1)
  })

  it('does not submit an empty question', async () => {
    const user = userEvent.setup()
    const onAsk = vi.fn()
    render(<AskBox onAsk={onAsk} />)

    await user.type(screen.getByRole('textbox', {name: 'Question'}), '   ')
    await user.click(screen.getByRole('button', {name: 'Ask'}))

    expect(onAsk).not.toHaveBeenCalled()
  })
})
```

安装并运行：

```bash
npm install --save-dev vitest@4 jsdom \
  @testing-library/react@16 @testing-library/user-event@14
npx vitest run --environment jsdom
```

测试使用 [`userEvent.setup()`](https://testing-library.com/docs/user-event/setup/)和无障碍角色查询，没有断言组件内部 state 或 React 渲染次数。那些是实现细节，不是用户契约。

### Go：用表驱动测试守住策略边界

Go 标准库 `testing` 不依赖外部框架，就能写出紧凑的表驱动测试。

`route.go`：

```go
package route

import "strings"

func Destination(prompt string, hasDocuments bool) string {
	prompt = strings.ToLower(strings.TrimSpace(prompt))
	if prompt == "" {
		return "reject"
	}
	if hasDocuments && strings.Contains(prompt, "policy") {
		return "retrieve"
	}
	return "generate"
}
```

`route_test.go`：

```go
package route

import "testing"

func TestDestination(t *testing.T) {
	tests := []struct {
		name         string
		prompt       string
		hasDocuments bool
		want         string
	}{
		{"empty input", "   ", true, "reject"},
		{"policy with documents", "Explain the refund policy", true, "retrieve"},
		{"policy without documents", "Explain the refund policy", false, "generate"},
		{"ordinary request", "Write a short greeting", true, "generate"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Destination(tt.prompt, tt.hasDocuments)
			if got != tt.want {
				t.Fatalf(
					"Destination(%q, %v) = %q; want %q",
					tt.prompt,
					tt.hasDocuments,
					got,
					tt.want,
				)
			}
		})
	}
}
```

使用当前受支持的 Go 工具链运行：

```bash
go mod init example.com/route
go test ./...
```

命名和命令遵循 Go 官方[添加测试教程](https://go.dev/doc/tutorial/add-a-test)。真实应用中，路由策略可以被穷举测试，路由后的生成回答则以统计方式评测。

## CI 回归门槛应该跟随风险

并非所有检查都要在每次提交运行。CI 应在速度、成本和失败后果之间取平衡：

| 风险 | 示例 | PR 门槛 | 发布门槛 |
|---|---|---|---|
| 低 | 文案建议 | 单测、小型冒烟评测 | 抽样离线评测 |
| 中 | 带引用的客服回答 | 单测、契约、关键评测子集 | 全量评测、切片检查、金丝雀 |
| 高 | 资金或账户操作 | 单测、契约、政策与权限样本 | 人工审批、全量评测、分阶段发布、回滚演练 |
| 关键 | 健康、安全、不可逆动作 | 确定性约束与对抗套件 | 独立复核；LLM 不能单独授权 |

一个实用流水线可以是：

```text
format/lint
  -> 确定性单元测试
  -> 使用 fake 的契约测试
  -> 受影响功能的评测子集
  -> 安全与权限检查
  -> 完整发布评测
  -> 高风险变更人工审批
  -> 金丝雀部署
  -> 监控扩量或回滚
```

保存基线和候选结果作为构建产物。门槛不仅看绝对值，也看有意义的回退。接受回退必须有显式、可审查的豁免；悄悄调低阈值不是修复。对于不稳定评测，可以暂时隔离，但必须指定负责人和到期时间，否则隔离区会变成埋葬不便证据的墓地。

## 编码 Agent 既需要测试，也需要边界

编码 Agent 缩短了反馈循环，但速度会同时放大好契约和坏契约。以 Cursor 当前术语为例，**Agent** 可以探索、编辑、运行命令并使用 **Auto-fix Errors**，**Auto-run** 控制命令自动执行；旧的“YOLO 模式”已经不是准确框架。

我按后果划分自动化权限：

- 允许 Agent 自动格式化、运行范围明确的单测、修复本地类型错误；
- 允许它提出契约测试和评测样本，但人工要确认这些测试表达了真正意图；
- 数据迁移、依赖升级、联网命令、读取密钥、破坏性文件操作和生产动作必须审批；
- 不能为了“让它完成闭环”而给后台 Agent 生产凭据；
- 审查 diff 和测试证据，而不是只读 Agent 的总结。

Cursor 的 [Agent 工具文档](https://docs.cursor.com/en/agent/tools)说明了 Auto-run、guardrails 与 Auto-fix Errors，[CLI 文档](https://docs.cursor.com/en/cli/using)说明了命令审批。安全顺序应该是：

1. 人定义意图与风险；
2. Agent 提议失败测试；
3. 人确认高后果行为的契约；
4. Agent 实现并运行有边界的检查；
5. CI 独立复现结果；
6. 人批准高风险发布动作。

自动化的任务是缩短反馈，不是溶解责任。

## 一次失败如何改变了我的测试方式

我第一次给 LLM 功能写测试时，选择快照完整回答。当时感觉很严谨：一个输入、一个钦定输出、一个精确断言。结果标点变化就让测试失败，而更新快照又总能让它通过。我花在和测试讨价还价上的时间，比花在理解产品上的更多。

后来我换成一个“质量总分”。仪表盘安静了，而这更糟。平均分一直绿色，但一个很小的中文切片开始丢失引用；它占比太低，没能撼动总分。

修复不是更聪明的提示词，而是拆开契约：

- Schema 合法性变成精确测试；
- 引用 ID 变成确定性来源检查；
- 事实支持交给经人工校准的 grader；
- 语言和意图成为显式切片；
- 延迟与引用失败进入生产监控；
- 已经伤害过的样本成为阻断发布的回归用例。

这个教训并不舒服：测试不会自动说真话，它只是让我们选择的“真相定义”可执行。如果定义很浅，自动化只会让我们更快、更稳定地犯错。

## 从一个关键工作流开始

实施前：

- 写清用户结果与不可接受的失败；
- 分开精确不变量和主观质量；
- 分配风险等级；
- 先创建一个会失败的测试或评测样本；
- 决定谁有权修改阈值与 rubric。

实施中：

- 把模型调用封装在窄接口之后；
- 记录模型、提示词、工具、检索索引和数据集版本；
- 在本地运行快速确定性检查；
- 带着来源把真实失败加入数据集；
- 观察切片，而不是只优化平均值。

发布前：

- 运行固定留出集；
- 在显示不确定性的前提下比较候选与基线；
- 逐条复核关键样本；
- 验证超时、降级、权限和回滚；
- 用新鲜人工标签校准模型 grader；
- 高风险动作保留人工批准。

上线后：

- 监控结果、成本、延迟、漂移与被拒动作；
- 抽样流量进行人工复核；
- 把事故变成回归样本；
- 删除契约已经失效的测试；
- 只有后果或流量变化时重审阈值，而不是 CI 让人不舒服时。

## 延伸阅读

- [The ML Test Score：ML 生产就绪与技术债务量表](https://research.google/pubs/the-ml-test-score-a-rubric-for-ml-production-readiness-and-technical-debt-reduction/)
- [评估 TDD 时的严谨性与相关性](https://doi.org/10.1016/j.infsof.2014.01.002)
- [TDD 对内部质量、外部质量与生产率的影响](https://doi.org/10.1016/j.infsof.2016.02.004)
- [pytest 参数化文档](https://docs.pytest.org/en/stable/how-to/parametrize.html)
- [Testing Library：`userEvent.setup()`](https://testing-library.com/docs/user-event/setup/)
- [Go 教程：添加测试](https://go.dev/doc/tutorial/add-a-test)
- [OpenAI Evals](https://github.com/openai/evals)
- [Cursor Agent 工具](https://docs.cursor.com/en/agent/tools)

## 相关文章

- [开源成长的阶段性指南](/zh/growth/posts/stage-growth-of-open-source/)
- [参与开源贡献的完整指南](/zh/engineering/posts/open-source-contribution-guidelines/)
- [我的实践总结：如何设计开源社区规范](/zh/engineering/posts/advanced-githook-design/)
- [在开源社区里学会提问](/zh/engineering/posts/the-art-of-asking-questions-in-open-source-communities/)

TDD 不是“所有测试都必须先写”的仪式，而是拒绝让重要行为停留在含糊状态的习惯。对于 AI 系统，这种习惯更有价值，因为不确定性本来就是产品的一部分。真正的工作，是给它命名、测量它，并在事故发生之前决定哪些边界绝不能越过。
