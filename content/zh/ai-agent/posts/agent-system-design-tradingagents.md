---
title: '多 Agent 辩论真的增加了信息吗：TradingAgents 的组织图与相关性风险'
date: 2026-08-07T18:50:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Harness Engineering
  - Data Processing
  - Monitoring
  - Security
  - Development
description: >
  以 TradingAgents v0.3.1 与论文 v7 为样本，把分析师、牛熊辩手、交易员、风险声部和组合经理还原成真实 LangGraph。文章区分角色多样性与证据独立性，核验串行分析、共享模型、时间截点、checkpoint 和反思记忆，并以相关性、消融及外部执行成本检验多 Agent 辩论是否真正增加信息。
tldr:
  - TradingAgents 把投研组织图显式化为 LangGraph state machine；它的直接价值是职责、交接和停止条件可见，不是让 persona 自动获得独立信息。
  - 论文与官网把四类分析师描述为并行；v0.3.1 代码用固定边把它们串行连接，changelog 也说明并行执行仍是后续计划。
  - Bull/Bear、三种风险声部共享同一份 analyst reports，默认还共享同一个 quick model。观点相反可以暴露论证缺口，却不能直接当作独立证据投票。
  - 时间截点比角色数量更重要。历史价格可固定，live news/social 会变化；v0.3.1 还专门修复过 Alpha Vantage fundamentals 的 future-data leak。
  - 当前开源 release 输出 rating、rationale、report tree 和 memory log，没有真实 broker adapter。论文短期模拟、网站收益数字与现实交易结果必须分开。
series:
  name: Agent 系统设计解剖
  slug: agent-system-design
  order: 9
  total: 11
columns:
  - agent-system-design
cover:
  image: /images/agent-system-series/09-tradingagents/tradingagents-evidence-debate-graph.svg
  alt: 'TradingAgents 从时间截点证据、串行分析师、牛熊法庭、风险声部到组合经理研究输出的证据法庭架构图'
---

法庭里坐着九位证人。

四位负责市场、情绪、新闻与基本面；两位分别坚持看多和看空；三位从激进、中性与保守的风险偏好发言。最后还有研究经理、交易员和组合经理逐层裁决。

听起来像一套相互制衡的制度。

但如果所有证人读的是同一份卷宗，使用同一个模型家族，继承相似的训练偏差，再按照预先分配的立场发言，九份证词究竟是九条独立证据，还是同一个相关误差的九种措辞？

**角色数量是组织结构，证据独立性是统计属性。**

TradingAgents 的价值在于把这道问题变成了可检查的图：谁读取什么、谁能调用工具、谁只能看前序报告、谁负责停止辩论，以及最终产物究竟有没有越过真实交易边界。

本文不提供任何证券、投资或交易建议，也不评价具体标的。研究对象冻结为 [TradingAgents v0.3.1](https://github.com/TauricResearch/TradingAgents/releases/tag/v0.3.1)，tag commit `01477f9afb7a47b849ed4c9259d3a9a4738d9fda`，发布于 2026-07-05；研究日 `main` 为 [`a33fd4c0f134485a43553a2c23a63cb14adbd88f`](https://github.com/TauricResearch/TradingAgents/commit/a33fd4c0f134485a43553a2c23a63cb14adbd88f)。主实现判断以 release 为准，release 后的新闻 UTC 与当日 OHLCV cache 修复只作为演进记录。论文固定为 [arXiv:2412.20138v7](https://arxiv.org/abs/2412.20138v7)，修订于 2025-06-03。论文、官网说明和 release 源码是三个不同证据层。

## 图解：多 Agent 证据法庭

![TradingAgents 多 Agent 证据法庭](/images/agent-system-series/09-tradingagents/tradingagents-evidence-debate-graph.svg)

**阅读指南：** 左侧先审查 evidence admissibility：价格、新闻、情绪与财报是否都满足同一 trade-date 截点。中间上方是四类 analyst；v0.3.1 的真实边是串行，不是论文图中的 concurrent fan-out。Bull 与 Bear 读取同一组 reports 交替发言，Research Manager 裁决后交给 Trader；三种风险声部再依次讨论，Portfolio Manager 输出五档 rating。右侧红线停在 research output，固定 release 没有真实 broker adapter。底部列出判断“辩论是否增加信息”的可执行测试。

图中把时间 gate 放在所有角色之前。

只要一条未来财报进入 state，后面每一次看多、看空和风险辩论都只是在精炼泄漏。

## 先还原 v0.3.1 的真实图

`GraphSetup` 用 LangGraph `StateGraph(AgentState)` 注册节点、工具和 conditional edges。默认 selected analysts 是：

```text
market
  → sentiment
  → news
  → fundamentals
  → bull ↔ bear
  → research manager
  → trader
  → aggressive → conservative → neutral
  → portfolio manager
  → END
```

每个 analyst 都是一个 ReAct-style 小循环：

```text
analyst
  ├─ emits tool_calls → its ToolNode → analyst
  └─ emits report     → message clear → next analyst
```

[`setup.py`](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/graph/setup.py) · [`conditional_logic.py`](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/graph/conditional_logic.py)

这套图有三个真实收益：

1. 每个角色只能在自己的 state fields 和 tool envelope 内工作；
2. debate round、risk round 与 `END` 是可观察停止条件；
3. report、debate history、proposal 与 final decision 都落在 typed global state。

它不是一群长驻自治进程。每个“Agent”本质上是图中的一个 LLM node function；LangGraph 拥有控制流，`AgentState` 拥有交接状态。

### 论文并行，release 串行

论文 Figure 1 和官方研究页都说四位 analysts concurrently gather information。[TradingAgents paper v7](https://arxiv.org/pdf/2412.20138) · [Official research page](https://tauric.ai/research/tradingagents)

v0.3.1 的代码却明确：

```python
workflow.add_edge(START, first_analyst)
workflow.add_edge(current_clear, next_analyst)
```

`analyst_execution.py` 也按传入列表构造有序 plan，没有 fan-out、join 或 reducer。[`analyst_execution.py`](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/graph/analyst_execution.py)

这不是文字解释空间，而是两种不同的执行拓扑。v0.3.0 changelog 更直接：无效的 `analyst_concurrency_limit` 已被删除，parallel analyst execution 计划以后实现。[CHANGELOG v0.3.0](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/CHANGELOG.md)

因此文章、监控和成本估算都应写：

- **概念组织图**：analysts 可独立分工；
- **论文叙述**：analysts concurrently gather；
- **v0.3.1 runtime**：analysts sequentially execute。

串行不一定更差。它避免并发 merge，checkpoint 也更简单；但 wall time 是各 analyst 相加，而且后运行的节点可能面对已经变化的 live vendor 数据。

## 角色差异究竟来自哪里

release 中的模型分配与论文 v7 也有代际差异。

| 节点 | v0.3.1 模型对象 | 输入差异 | 是否新增外部证据 |
|---|---|---|---|
| Market/Sentiment/News/Fundamentals Analysts | `quick_thinking_llm` | 各自 prompt 与 tools | 是，按 tool/data source |
| Bull/Bear Researchers | 同一个 `quick_thinking_llm` | 立场 prompt、同一组 reports、前轮对手文本 | 否，只重组既有报告 |
| Research Manager | `deep_thinking_llm` | 完整 bull/bear history | 否，负责裁决 |
| Trader | `quick_thinking_llm` | analysts + investment plan | 否，形成 proposal |
| Aggressive/Neutral/Conservative | 同一个 `quick_thinking_llm` | 风险 persona、同一 trader plan、前轮 history | 通常否 |
| Portfolio Manager | `deep_thinking_llm` | risk history、research/trader plan、past context | 否，形成 final rating |

[`setup.py`](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/graph/setup.py)

论文 v7 则描述 analysts、researchers 和 traders 使用 deep-thinking model，quick model 主要承担 retrieval。[TradingAgents paper v7, §4.3](https://arxiv.org/pdf/2412.20138)

不能用论文的模型路由解释当前 release，也不能把 release 的 provider 选择回填进 2025 年实验。

## 辩论能增加什么

Bull 与 Bear 的 prompt 都读取四份 analyst reports、instrument context、完整 debate history 和对手上一轮 argument。区别是系统要求一个寻找增长与积极证据，一个寻找风险与消极证据。[Bull researcher](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/agents/researchers/bull_researcher.py) · [Bear researcher](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/agents/researchers/bear_researcher.py)

这种安排可能产生三类有价值的增量：

- **覆盖增量**：强制扫描同一材料中的支持面与反对面；
- **反驳增量**：后一个角色必须回应前一个角色的具体论点；
- **压缩增量**：manager 把长 history 归约成一个明确 plan。

它们属于 reasoning process 的结构化，不等于新增独立 evidence。

### 相关误差为什么不会投票消失

设两个角色的判断误差分别是 \(e_1\) 与 \(e_2\)。若简单平均：

\[
\mathrm{Var}\left(\frac{e_1 + e_2}{2}\right)
= \frac{\sigma^2}{2}(1+\rho)
\]

当相关系数 \(\rho=0\)，方差减半；当 \(\rho=1\)，平均两份意见完全没有降低误差。

TradingAgents 的 Bull/Bear 共享：

- 同一个 quick model object；
- 同一组 analyst reports；
- 同一 ticker identity 与 trade date；
- 相似的 evidence-based 写作要求；
- 对方的完整 history；
- 同一个最终目标：形成可供 manager 决策的 plan。

它们的文字立场相反，误差来源却可能高度相关。若 news report 把公司识别错、fundamental data 穿越时间、共同模型误读一个单位，双方都可能围绕同一错误展开漂亮辩论。

所以“有分歧”与“有独立信息”必须分开记录。

## 七项独立性测试

多 Agent 系统不能只展示对话截图。至少要跑以下测试：

### 1. 来源重叠率

为每条核心 claim 保存 `source_id / timestamp / field / value`，计算两个角色证据集合的 Jaccard overlap。两篇语言不同、引用相同的报告，不算两条证据。

### 2. Blind first opinion

让 Bull 与 Bear 先在看不到对方文本时各自产生 evidence ledger，再开放 rebuttal。否则后发角色可能只是围绕先发角色建立镜像论证。

### 3. 模型与 provider 交叉

分别使用同模型同 prompt、同模型异采样、异模型同数据、异 provider 异数据四组。真正的鲁棒性来自错误机制变化，不只来自 persona 名称变化。

### 4. Hidden counter-evidence

向一方隐藏一条可验证的反证，检查另一方是否独立发现；再交换。若所有角色都只复述 upstream summary，debate 没有 evidence discovery 能力。

### 5. 去掉 debate 的消融

比较：

```text
reports → manager
reports → bull/bear debate → manager
```

除了最终 rating，还要比较事实错误率、校准、稳定性、token/延迟和 source coverage。论文 v7 给出了整套系统与 rule-based baselines 的短期模拟结果，却没有在正文中建立一条足以隔离“debate 本身”因果贡献的完整生产级证据链。[TradingAgents paper v7](https://arxiv.org/pdf/2412.20138)

### 6. 多次重复分布

同一截点运行多次，报告 rating distribution、argument overlap 与 cost distribution。README 已明确承认 LLM sampling 和 live data 会使同一 ticker/date 的结果变化。[TradingAgents reproducibility](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/README.md)

### 7. 外部 outcome

把模拟结果放入未参与提示设计的 evaluator，并计入费用、slippage、liquidity、financing、失败订单和 regime shift。角色之间互相认同不构成外部 eval。

## 时间一致性：金融 Agent 的首要测试

论文声称每个 trading day 只使用截至当日可得的数据，消除 look-ahead bias。[TradingAgents paper v7, §5.1](https://arxiv.org/pdf/2412.20138)

v0.3.1 release 的 changelog 同时记录了一项重要修复：Alpha Vantage fundamentals 返回的是 JSON string，旧的 dict-only guard 没有执行过滤，未来日期的报告会泄漏进历史运行。[v0.3.1 changelog](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/CHANGELOG.md)

这不是简单的“过去有 bug”。它说明时间一致性必须被当作端到端数据契约：

```text
analysis_date
  → vendor request window
  → vendor response timestamp
  → filing/news effective time
  → timezone + market close
  → cache key
  → report claim
  → graph state
```

任一 adapter 少做一次过滤，所有下游角色都继承 future evidence。

### 固定日期仍不等于固定输入

README 对复现边界说得很诚实：

- historical price 与 indicator window 可以随 analysis date 固定；
- live news、StockTwits 和 Reddit 会随运行时间变化；
- provider 不保证同一温度下 byte-identical output；
- reasoning model 可能忽略 temperature。

[TradingAgents reproducibility](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/README.md)

固定源码还能构造出一条更具体的路径。Sentiment Analyst 用 `trade_date` 计算七天窗口并据此抓 Yahoo news；同一个节点却无日期参数地抓当前 StockTwits stream 和 Reddit 最近一周，再把三块数据一起放进声称覆盖历史窗口的 prompt。[`sentiment_analyst.py`](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/agents/analysts/sentiment_analyst.py)

于是：

```text
propagate("AAPL", "2024-01-15")
  → Yahoo news: 2024 historical window
  → StockTwits / Reddit: execution-day live posts
  → one sentiment report labeled as 2024-01-08..15
  → Bull/Bear → Trader → Portfolio Manager
```

模型没有违反 tool instruction。未来信息来自 tool contract 本身缺少 `as_of`。

因此一个合格的历史 run manifest 至少要保存：

```yaml
as_of: 2024-03-15T16:00:00-04:00
market_calendar: XNYS
vendor_requests:
  - vendor: alpha_vantage
    request_hash: ...
    response_hash: ...
    retrieved_at: ...
    max_source_timestamp: ...
llm:
  provider: ...
  model_id: ...
  prompt_hash: ...
graph:
  release: v0.3.1
  selected_analysts: [...]
  debate_rounds: 2
```

否则“同一天”只固定了一个字符串，没有固定证据集。

## LangGraph state 让组织可见

`AgentState` 明确拆出：

- four analyst reports；
- `investment_debate_state` 与 bull/bear histories；
- Research Manager 的 `investment_plan`；
- Trader 的 `trader_investment_plan`；
- `risk_debate_state` 与三种声部 histories；
- Portfolio Manager 的 `final_trade_decision`；
- ticker identity、trade date 和 `past_context`。

[`agent_states.py`](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/agents/utils/agent_states.py)

这是 TradingAgents 比“所有角色在一个群聊里说话”更成熟的地方。report fields 是结构化交接，natural-language history 只用于两段 debate。

但 typed state 仍只证明数据形状。它没有自动记录每个 claim 的 source span，也没有为 Bull/Bear opinion 提供独立概率模型。

### Stop 是计数器，不是共识

Bull 与 Bear 每轮交替，`count >= 2 * max_debate_rounds` 时进入 Research Manager；三种风险声部同样在 `count >= 3 * max_risk_discuss_rounds` 时进入 Portfolio Manager。[`conditional_logic.py`](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/graph/conditional_logic.py)

这意味着 debate 的终止条件是预算，不是：

- 双方发现了新证据；
- 关键事实争议被解决；
- 概率校准收敛；
- manager 证明某一论点成立。

固定轮数是合理的成本控制，但报告必须写“辩论到达 round limit”，不能写“系统达成真相”。

## Checkpoint 恢复的是图位置

Checkpoint 是 v0.3.1 的 opt-in 能力。启用后，LangGraph 用 per-ticker SQLite `SqliteSaver` 在节点后保存 state；thread id 由 ticker、date 和 graph-shape signature 生成。[`checkpointer.py`](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/graph/checkpointer.py)

signature 包含：

```text
selected analysts
debate rounds
risk rounds
asset type
```

这修复了用不同 graph shape 恢复旧 checkpoint 的问题。

它不包含：

- LLM provider 与 model ID；
- temperature/reasoning effort；
- vendor routing 与 API 配置；
- prompt/source code hash；
- data response hash；
- output language。

若崩溃后更换模型或 vendor，已完成节点保留旧世界，后续节点运行在新世界。技术上可以恢复，证据链却成为混合版本。

成功完成后 checkpoint 会被清除；完整 `final_state` 另写 JSON，report tree 和 decision log 分开持久化。[`trading_graph.py`](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/graph/trading_graph.py)

因此 checkpoint 是 crash recovery，不是不可变审计日志。

## Reflection memory 会学习什么

v0.3.1 用 append-only Markdown decision log 取代旧的 per-agent BM25 memory。每次完成后记录 ticker、trade date 与 final decision；下一次同 ticker 运行时，系统查询持有期 return 与地区 benchmark alpha，再由 quick model 写 2–4 句 reflection。[`memory.py`](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/agents/utils/memory.py) · [`reflection.py`](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/graph/reflection.py)

Portfolio Manager 会看到最近同 ticker 的完整 decisions，以及少量 cross-ticker lessons。

这是一种 outcome-conditioned memory，但不能直接称作策略学习：

- outcome 是默认固定 holding window 的 raw return 与 alpha；
- 只在下次运行同 ticker 时解析 pending entry；
- reflection 仍由同一 quick model解释；
- 没有 counterfactual：未执行的其他 rating 会怎样；
- 没有因果归因：收益来自 thesis、beta、消息还是运气；
- cross-ticker lesson 可能把 regime-specific 经验带到不相干资产。

Memory 提供连续性，也可能让一次偶然结果变成以后所有 manager 的共同先验。

这里还有一个时间泄漏边界：`get_past_context(ticker)` 没有接收当前 `trade_date`，也不按 `entry.date < current_trade_date` 过滤。若 memory log 已经包含较晚日期的 resolved return 与 reflection，随后再运行更早历史日期，Portfolio Manager 可能读到当时尚未发生的 outcome。[`memory.py`](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/agents/utils/memory.py)

历史实验必须使用 run-scoped memory namespace，并对 memory entry 同样执行 as-of cutoff。冻结市场数据却共享未来反思，仍是 look-ahead。

## 论文结果不能替代 release 验证

论文 v7 的实验窗口是 2024-01-01 至 2024-03-29，正文主要表格展示 AAPL、GOOGL 与 AMZN，并对 buy-and-hold、MACD、KDJ+RSI、ZMR 和 SMA 报告 CR、annualized return、Sharpe 与 maximum drawdown。[TradingAgents paper v7, §5–6](https://arxiv.org/pdf/2412.20138)

论文脚注同时说明：

- 因 LLM/tool 成本，只做了约三个月；
- 每次 prediction 约 11 次 LLM calls 和 20+ tool calls；
- 最高 Sharpe 超出作者预期经验范围；
- 作者检查了 decision sequences，并把极高 Sharpe 归因于样本期回撤较少；
- 未来需要在预算允许时做更长 backtest。

这些结果是研究证据，不是现实收益承诺。它们没有自动覆盖：

- v0.3.1 已经变化的 model routing、providers、state 与 data guards；
- 实盘 slippage、fees、liquidity、partial fill、market impact、financing；
- 账户约束、订单拒绝、风控权限与监管责任；
- 长周期、跨 regime、更多资产和多次随机重复。

官网对结果的展示属于官方研究陈述；Tauric disclaimer 也明确指出 simulated performance 具有 hindsight、缺少真实执行成本和流动性限制等固有边界。[Tauric disclaimer](https://tauric.ai/disclaimer)

## 最终输出停在哪里

Portfolio Manager 通过 structured output 生成：

```text
Buy / Overweight / Hold / Underweight / Sell
+ rationale
```

Signal processor 只用确定性 parser 取出 rating，不再做额外 LLM call。[Portfolio Manager](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/agents/managers/portfolio_manager.py) · [`signal_processing.py`](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/graph/signal_processing.py)

固定 release 可以保存：

- full state JSON；
- analyst/debate/manager report tree；
- rating；
- deferred outcome/reflection memory。

仓库中没有把它连接真实券商账户的 broker adapter、order state machine、pre-trade risk engine 或 reconciliation loop。README 中“sent to simulated exchange”与论文模拟环境不能被写成生产执行能力。[TradingAgents README v0.3.1](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/README.md)

这条边界是优点：研究建议与真实资金副作用没有被开源默认路径悄悄连起来。

## 怎样设计一个真的增加信息的辩论系统

从 TradingAgents 出发，更强的多 Agent 证据协议可以写成：

```text
1. 先冻结 evidence snapshot 与 as-of
2. 每个 analyst 保存 claim → source span
3. 各角色 blind-first，禁止先看对手结论
4. 为角色分配不同 evidence partitions 或 failure models
5. 只有新 source / 新 calculation 才记 information gain
6. manager 输出 unresolved disputes，不只输出 winner
7. 与 no-debate / single-agent / heterogeneous-model 做消融
8. 在多次 run 上报告分布、成本与校准
9. 用独立 evaluator 检查事实、时间与外部 outcome
10. 把真实执行留在单独授权、限额、幂等和对账边界之后
```

多 Agent 的目标不应是“让会议更热闹”，而应是制造可识别的错误差异。

如果两个角色能犯不同的错，互相检查才可能有效；如果它们只是用同一个模型扮演相反立场，辩论的主要产物可能只是更有说服力的共同错误。

## 结论：组织图是 Harness，不是证据

TradingAgents 已经把许多容易藏在 prompt 里的结构变成了明确对象：

- analyst tool loops；
- typed global state；
- bull/bear 与 risk debate；
- deep/quick model 路由；
- fixed-round stop；
- structured manager decisions；
- checkpoint resume；
- outcome reflection memory。

这是一套值得学习的 multi-agent harness。

但它不能仅凭角色名单证明信息增益。论文中的 concurrent analyst team 与 v0.3.1 的串行图不同；相反 persona 共享同一 evidence record 和 quick model；固定 trade date 也没有自动冻结 live data；短期模拟不代表当前 release 或真实执行。

判断多 Agent 是否成立，只需要追问三件事：

1. 这些角色看到了哪些彼此独立的证据？
2. 它们的错误机制究竟有多相关？
3. 去掉辩论后，外部评测是否真的变差？

答不出这三问，更多角色只会增加 token、延迟和解释的戏剧性。

## 参考资料

- [TradingAgents v0.3.1](https://github.com/TauricResearch/TradingAgents/releases/tag/v0.3.1)
- [TradingAgents README v0.3.1](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/README.md)
- [CHANGELOG v0.3.1](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/CHANGELOG.md)
- [Graph setup](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/graph/setup.py)
- [Conditional logic](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/graph/conditional_logic.py)
- [Analyst execution plan](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/graph/analyst_execution.py)
- [Agent state](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/agents/utils/agent_states.py)
- [Bull researcher](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/agents/researchers/bull_researcher.py)
- [Bear researcher](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/agents/researchers/bear_researcher.py)
- [Portfolio Manager](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/agents/managers/portfolio_manager.py)
- [Checkpoint implementation](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/graph/checkpointer.py)
- [Decision memory](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/agents/utils/memory.py)
- [Reflection](https://github.com/TauricResearch/TradingAgents/blob/v0.3.1/tradingagents/graph/reflection.py)
- [TradingAgents paper v7](https://arxiv.org/abs/2412.20138v7)
- [Official research page](https://tauric.ai/research/tradingagents)
- [Tauric Research disclaimer](https://tauric.ai/disclaimer)
