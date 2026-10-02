---
title: 'Personal Agent Technical Research: How OpenClaw Connects One Run to Long-Lived Work'
date: 2026-10-03T00:15:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Harness Engineering
  - Automation
  - Security
  - Development
  - Open Source
description: >
  Using OpenClaw's October 2026 source snapshot, this article studies how agent harnesses make reliable multi-day Personal Agent work and Computer Use possible.
series:
  name: 'Personal Agent Studies'
  slug: personal-agent-studies
  order: 2
  total: 2
cover:
  image: /images/personal-agent-studies/technical-cover.webp
  alt: 'Concept illustration: a Personal Agent''s bounded run, persistent task, execution environment and result receipt; not an accurate OpenClaw architecture diagram'
---

For a Personal Agent to do things reliably on someone's behalf, it has to connect a single model run to a recoverable task and confirm the result against external state. The model saying "I've cancelled it" still does not prove that the merchant stopped the renewal.

Consider a design example: the user asks the agent to cancel a monthly subscription, keep the benefits already paid for in the current period, accept no new offers, and not delete the account. The agent finds the subscription and reviews the terms, then clicks confirm; the merchant has already processed the request, but the browser disconnects before the result comes back. Clicking again at that point might do one step too many, and reporting success outright has no basis. Whether this can safely continue depends on what was saved beyond the button.

The rest of this article follows this subscription-cancellation transaction from authorization into a run, through a pause and a resume, and finally to verification and a receipt. **It is a design example for this article; there are no Instinct production execution logs behind it, and it is not a system I have deployed and tested.** [The previous product study](/ai-agent/posts/personal-agent-product-delegation/) asks why people are willing to delegate again; this one asks which component is responsible for carrying out the delegated task, and which segment should be recovered after a failure.

OpenClaw is the main sample. What I read is the main source snapshot from 3 October 2026, pinned at `32e30e59d9a7fd1f5b3a9e9659427d45145779dd`; I do not call it a published stable release. Throughout, I keep the mechanisms the project has declared and that can be observed in the source separate from the transaction model I suggest adopting. The site's [OpenClaw gateway article](/ai-agent/posts/agent-system-design-openclaw/) uses an earlier version and explains message routing; here the focus is on runs, recovery, and what happens to the result after an action.

## First, make "cancel the subscription" something with boundaries

A user's request contains at least three distinct facts: which service to cancel, what consequences are allowed, and what counts as done. If they live only in a long chat, the next run has to guess them again.

I would first look up the current subscription record, verify the account and plan name, and check the renewal date and current-period benefits. If the account has two similar plans and the target cannot be uniquely determined, the user has to decide; if the merchant only supports immediate termination with no refund, the original "keep current-period benefits" cannot be satisfied, and that new consequence also has to go back to the user. Things already made clear should not be asked again, but an ambiguity that genuinely changes the consequences cannot be left to the model to choose.

To explain the lifecycle, I would keep three objects separately. The following is a **reference domain model for this article**; neither the names nor the fields are native OpenClaw types.

| Object | What it holds | When it ends |
| --- | --- | --- |
| Mandate | User goal, allowed consequences, object scope, deadline and revocation record | User revokes, the deadline arrives, or the goal is settled |
| Task | Current progress, external object identifier, evidence, blocking reason and next check | Verified complete, clear failure, or handed back to the user |
| Run | Input version for one execution, runtime, tool results, terminal state and cost | That execution stops, fails, or ends normally |

One mandate can map to several task runs. If the user has to log in tonight, today's run can end while the task sits in "waiting for the user to verify"; when the user comes back tomorrow, the task continues in a new run. When a cancellation has been sent but its result is unknown, the task sits in "waiting for reconciliation", and it must not flip to "complete" early just because some run ended normally.

The mandate record cannot carry permission checks on its own. I would have a separate authorization service hold "what is still allowed now", and have each run re-query it whenever it produces a write action. The task holds goals and progress, the authorization service gives the currently executable scope, and the merchant system owns subscription state. The three can reference one another, but they should not impersonate one another.

For example, if the task records `renewal_enabled = false`, that should come with the check time, the source and the account it applies to. If a later read after recovery shows the merchant state has turned back on, that new fact has to be acknowledged. Yesterday's summary must not override today's account page, and a revocation today must not be ignored just because the user agreed to the cancellation before.

This adds a database, state transitions and a management interface. For a one-off read-only summary that may not be worth it; for work that spans days and changes account state, the cost buys one concrete capability: when the model changes or the process stops, the user can still know where the work stopped.

## Today OpenClaw owns its built-in agent loop

Once a model is connected to tools, the application still needs a program that repeatedly reads output, executes tools, returns results, and decides whether to continue or stop. That repeatedly executing program is called the agent loop. The execution layer that arranges context and tools around it and handles permissions, sessions and lifecycle is usually called the agent harness.

Today OpenClaw's built-in runtime is owned by the project itself. The reusable loop lives in `packages/agent-core/`, the built-in single-attempt orchestration in `src/agents/embedded-agent-runner/`, harness selection and registration in `src/agents/harness/`, and the model provider transport in `src/llm/`. The old runtime alias `pi` normalizes to `openclaw`; the remaining Pi TUI dependency is a terminal component, and it is not enough to claim that today's agent loop is still driven by an external Pi SDK. [Runtime architecture](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/agent-runtime-architecture.md)

In this reading, I care more about a few responsibility boundaries. The model proposes an answer or an action from its input; the provider connects requests and streaming responses to a concrete model service; the harness drives one prepared execution; the Gateway receives messages and schedules runs, maintaining sessions and delivery; the browser, terminal or device node is where an action actually happens. They can be deployed near the same process, but their responsibilities still differ.

```text
User request / scheduled event
        ↓
Gateway: admission, routing, queue and run record
        ↓
Core: prepare model, context, tool policy and execution conditions
        ↓
Harness: drive this one attempt
        ↔ provider: model requests and responses
        ↔ execution environment: browser, files, terminal, remote devices
        ↓
Run terminal state → task result verification → user receipt
```

This is a sketch of responsibilities, not an exact OpenClaw call graph. The last line in particular, "task result verification", includes the business layer this article suggests adding; the fact that the project saves a transcript (a session record) does not imply that it already understands every subscription workflow.

The built-in loop is also far more detailed than "the model spoke, so exit". In `agent-loop.ts`, the loop checks for new steering messages, handles cancellation signals, streams a model response, executes tools and merges results, then decides whether another round is needed. Provider errors, tool termination requirements and the host program's stop decision each have their own path. Even when a response's `stopReason` is `stop`, the loop can continue as long as `endTurn = false` and no tool has terminated it. [Loop source](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/packages/agent-core/src/agent-loop.ts)

When cancelling a subscription, the model saying "I found the subscription" may only be a progress message. It still has to read the cancellation conditions afterwards, and it may call more tools. Treating that first piece of natural language as a completion signal would close the task early, and could even release the ownership of the result the user was still waiting for.

The Gateway's `agent` request first returns a `runId` and a receipt time, which prove the run was accepted. Then there are three event classes: assistant, tool and lifecycle; `agent.wait` waits for the run's terminal state, and there is a separate fact about delivery of the final reply. `sourceReplyDelivered: true` can prove the final reply reached the original session, but it still cannot prove that the merchant result described in that reply is true. [Run lifecycle](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/concepts/agent-loop.md)

I therefore record separately: the request was received, the execution ended, the external goal was verified, and the user receipt was delivered. Those four times can differ. A run may time out while the external action already happened; the business may have succeeded while the message never went out; the message may have been delivered while merely telling the user that nothing can be confirmed yet.

There is another easily misused interface: an `agent.wait` timeout only ends that wait, it does not cancel the underlying run. The caller should keep observing the same `runId`, or explicitly request a stop. If a timeout prompts a brand-new run, the old run may still be clicking while the new run also starts looking for the same cancel button. [Wait semantics](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/concepts/agent-loop.md#timeouts)

## The harness contract governs one execution, not every responsibility

OpenClaw's harness plugin contract calls the unit of execution a prepared attempt: one attempt that core has already prepared. Ordinary model API integration should be a provider plugin; replacing the harness is only justified for a runtime that needs native threads, a resume identifier, or session compaction or a separate background daemon. Changing models should not mean changing session management and tool policy along with it. [Harness plugin contract](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness.md)

Before calling `runAttempt`, core prepares the provider/model, runtime authentication and context budget, as well as the transcript, workspace, sandbox, tool policy and callbacks, and it keeps decisions such as model fallback. The harness runs after receiving those inputs; it cannot quietly choose another model or change channel delivery. The contract's `runtimePlan` is policy state owned by the host, and it cannot be treated as ordinary writable configuration. [Core ownership](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness/core-ownership.md)

This is very practical for a Personal Agent. If a cancellation task allows querying and cancelling a named subscription while disabling arbitrary shell, a native runtime that still keeps its own shell could bypass the surface tool list. OpenClaw requires a harness that declares `conversationToolPolicySupport: "exact"` to cover native tools, integrated tools, and explicit restrictions on MCP (the tool interoperability protocol), apps, delegation and resumed threads. When it cannot, the harness should explicitly refuse a restricted turn, not silently ignore it. [Native tool policy contract](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness/core-ownership.md#native-tool-policy-enforcement)

Session ownership also needs separate handling. A native harness can bind its own thread or resume token to an OpenClaw session and mirror visible output back into the transcript. But knowing who a native thread belongs to is only an ownership fact; a storage lease is only a mechanism for coordinating storage. Neither grants permission to execute an action now. [Sessions and results](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness/sessions-and-results.md)

I would especially keep the part of the contract about terminal tool outcomes. A harness that executes tools needs to call `observeToolTerminal` when a tool reaches a terminal state, reporting the parameters actually executed and the raw result or error, stating whether execution has started, and whether it succeeded or failed. If approval or validation blocked the call, `executionStarted` is false; once it may have been dispatched, report true conservatively. It is not acceptable to guess "probably not executed" from displayed text. [Terminal tool outcome contract](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness/sessions-and-results.md#terminal-tool-outcomes)

This preserves an important distinction: "the cancellation action was blocked by permissions" versus "the cancellation action executed and then returned a failure". The first may safely request authorization again; the second requires checking external state first. What the contract preserves is the fact at the execution boundary. If a tool only returns a vague web error, the contract cannot conjure a merchant transaction receipt out of nothing.

Another interesting design is `finalizeSettledTurn`: when all tools have finished but the native turn has no final answer, a dedicated visible receipt can be generated. That process has to use records frozen at the tool-result boundary and remove capabilities such as tools, authorization, user input, scheduling and remote control. A plain `runAttempt` plus a "please don't use tools" prompt is not isolation. [Receipt finalization after settlement](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness/sessions-and-results.md#settled-tool-finalization)

When the cancellation has already happened and only a sentence of answer is missing, the system can write that explanation, but it should not get another chance to cancel. This constraint also reminds me that receipt generation should read facts; it must not re-enter an execution loop that changes the world just to make the answer complete.

The current plugin interface is still experimental. A harness can switch between different turns; once a turn already has tools or approval, or already has assistant text or a send, it cannot be swapped midway. Migrating a runtime requires checking session and policy compatibility, and it also requires keeping a record of actions that already happened. [Current limitations](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness.md#current-limitations)

## Multi-day work depends on persistent state, and on someone being responsible for waking it

A subscription cancellation may run into a merchant support agent promising to "handle it later". There is no point in continuing to watch the same model call. I would put the task into "waiting for the merchant", save the ticket number and the request already sent, note the next check time and the stop condition, and let this run end. When the due event arrives, it produces a new bounded run that checks state first and then decides whether to continue.

OpenClaw's scheduled work is managed by the Gateway scheduler, and task definitions, run state and history are persisted to SQLite. The Gateway has to be running for a schedule to fire; that is a separate matter from whether a model is generating tokens. Catch-up runs after startup and run recovery are also handled by the scheduling layer from stored records. [How automations work](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/automation/cron-jobs/how-it-works.md)

The current Heartbeat is also a scheduler-managed, system-owned automation that periodically starts an agent turn. Its default prompt requires reading the monitoring context rather than guessing from old chats or repeating past tasks. `every: "0m"` stops the periodic execution cadence; a specific event can still wake one turn. So "the background is online" does not mean the model is thinking nonstop, and "the periodic heartbeat is off" does not mean every event is disabled. [Heartbeat](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/gateway/heartbeat.md)

In my cancellation example, a wake-up record should point at a task ID, not at a paragraph saying "go on helping the user with what they were doing before". The record has to state exactly which ticket this check covers and when it expires, and whether to stay quiet when nothing has changed. After the user pauses a task, the scheduling layer should also stop the automatic checks; if the only thing a pause can write is a sentence in the prompt saying "paused", the old schedule will still wake it up.

Recovery also has several layers. OpenClaw's sessions, transcript, schedules and some inputs, and delivery records are stored on disk; an interactive terminal PTY in Gateway memory ends with the old process and is not restored. Different tasks have their own owners, so seeing one recovery counter is not grounds to believe everything has resumed, let alone that a reply was delivered. [What restart recovery persists and how it is verified](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/gateway/restart-recovery.md)

User preferences and task facts should be split apart, and so should run records and permission facts. OpenClaw puts stable preferences in `USER.md`, distilled long-term facts in `MEMORY.md`, and work material in dated logs; being written to disk does not mean everything is injected into the prompt in full every time. Memory can record the background of an authorization, but hard policy is still checked by the execution environment. [Memory overview](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/concepts/memory.md)

"The user tends to keep already-paid benefits" can be a preference; "this time, cancelling plan A is allowed" is a scoped mandate; "the merchant has already charged for this period" needs an account fact; "may the confirm button be clicked right now" has to read the current authorization. Merging those four things into one long-term memory would quietly turn a preference into an execution permit, or let an expired fact keep influencing the next operation.

Context compaction is only responsible for letting the model keep understanding within a limited window. It may preserve "currently cancelling the subscription" while dropping whether the request was sent, and it may compress away a revocation. The task ledger must keep those details and fetch them back as needed on recovery. Anthropic's engineering description of Managed Agents also separates the session log, the harness and the sandbox, with the persistent log outside the context window; that is the design the product states, not a conclusion that Personal Agents have been proven reliable. [The separation design in Managed Agents](https://www.anthropic.com/engineering/managed-agents)

In the same way, a LangGraph checkpoint can save state within an execution thread, and whether it survives a restart still depends on the backend; cross-thread information has a separate store. It can help a program recover from a state point, but it cannot make a cancellation that the merchant already executed and the application has not yet written to disk automatically become "executed exactly once". External transactions still need independent reconciliation. [LangGraph Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)

## Three architectures differ in who holds continuity

When implementing a Personal Agent, I would first distinguish a few common choices by where continuity lives. The table below is a design summary, not a market-share statistic, and I have run no comparative performance test for it.

| Choice | What is easier to get right | What you have to carry |
| --- | --- | --- |
| Run the model and tool loop directly in your own app | Precise control over business steps, permissions and data structures | Maintaining compaction, streaming events, cancellation, recovery and provider differences yourself |
| A resident gateway receives messages, schedules and drives the harness | Multiple entry points, session queues, scheduled work and run records in one place | You still add business task state, and handle gateway availability and trust boundaries |
| A persistent task service schedules a replaceable native agent runtime | Reusing native threads, the tool ecosystem and recovery capability | Native state and product state have to be reconciled, and policy has to cover hidden capabilities |

The first suits vertical tasks with a clear scope. A product that only handles subscriptions for one specific merchant might first check the account with a deterministic program and then let the model read the terms; a small business service performs the cancellation action. It is easier for the developer to specify success conditions; the price is maintaining every new merchant, model and UI change.

The second is close to the foundation OpenClaw provides. Message entry points and scheduling do not have to be rebuilt per scenario, and the Gateway carries many run responsibilities. But projecting "the run succeeded" as "the cancellation succeeded" is still business design. Adopting a gateway does not remove the task layer; it only lets the task layer stand on something already built.

The third keeps the task in your own persistent service, and any one execution can be handed to a native coding agent, a browser agent or another runtime. It suits a system that needs many capabilities and wants to replace executors. However, a native thread keeps its own history and pending work; once the product stops the task, it has to confirm that native execution also stopped, and reverify permissions on recovery, rather than aligning on a single thread ID.

These three can be combined. There is no contradiction in a small team implementing bounded tasks on a single Gateway first and later splitting state and execution into services. I would prefer the structure that can explain the current failure: if even whether a cancellation request was sent cannot be determined, add action records and querying first; adding more agents usually will not make that fact any clearer.

## Computer Use has to move from observation to a confirmable result

Computer Use is one way to execute a task in the chain above. Cancelling a subscription might use a merchant API or a web page's accessibility tree; in other cases, it may require operating a desktop application. The choice depends on what the current task can see, what it can verify, and how much maintenance and security cost it takes on.

When a formal API exists, you can query the subscription ID directly, read its state, and then send a clearly scoped request. If the API supports a stable operation ID or an idempotency key, recovery is easier to reconcile; terms, account permissions and error semantics the API does not cover still have to be handled. I would not give up an already-authorized API that returns an explicit state just to demonstrate "clicking a mouse like a human".

When a web page has an accessible structure, the browser can return the role, name and hierarchy of controls, and the agent can then click by referring to the current control. OpenClaw's browser tools provide an AI/ARIA snapshot (a page snapshot with roles and names), `act` and screenshot; `text` is used for a limited amount of visible text, and requests/errors for diagnosis. A page's document structure (DOM) and accessible attributes (ARIA) can reduce coordinate guessing, but that does not generalize directly to all desktop software. [Browser agent tools](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/tools/browser/agent-tools.md)

For example, a subscription page has two buttons, "pause plan" and "turn off renewal". Structured observation helps read the names and the region each belongs to, while a screenshot helps confirm whether a popup is covering the button and whether the account avatar has switched, and it can also confirm whether terms are displayed only in a visual region. The two kinds of observation complement each other; a single old screenshot or old tree must not be treated as the current fact all the time.

Desktop pixel operation suits native applications, canvases, or interfaces where the semantic tree is missing. After reading a screenshot, the model proposes mouse and keyboard actions, the application executes them in a controlled environment, and then it returns a result. Anthropic's current Computer Use documentation explicitly leaves this loop to the customer application to implement; each tool block in an action sequence has to get a result, and actions that produce consequences have to check authorization before every block executes. [Official Computer Use documentation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)

Screenshot coordinates are only valid for the frame at that moment. After window scaling or a resolution change, after the page scrolls, after a popup appears or after a multi-monitor position change, you need to observe again; before typing a key you also have to know where the current focus is. In the cancellation example, the plan was to type a ticket note into the merchant's form, a system notification stole focus, and the following text could then land in another application. My executor would bind the target window and the screenshot dimensions, check the foreground window before acting, and look at the field contents after critical input; if it cannot confirm, it stops.

Browser interaction has its own failure modes. OpenClaw's browser guidance requires keeping a stable tab handle and acting with a control reference (ref) from the most recent snapshot; after navigation, a popup or a submit changes the page, obtain state again. When an old ref is no longer valid, observe again in the same target tab, find the current control, and retry in a bounded way. If the page is already stuck at a login or permission block, report the block and stop clicking blindly. [Project browser operation guidance](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/extensions/browser/skills/browser-automation/SKILL.md)

There are two kinds of "old element" here. One is a control the ref pointed to that no longer exists, where the tool can fail explicitly; the other keeps the same name but the business object behind it has changed. After a user switches accounts, a "cancel" button still exists, and relocating it will still find it. The second kind requires rechecking the account and subscription ID; it cannot be prevented by the mere fact that the tool can click.

A Playwright locator relocates the current element at action time and, before clicking, checks conditions such as whether it is visible and stable, whether it can receive events, and whether it is enabled; assertions can also wait for a state to appear. This reduces errors caused by page timing; what those checks prove is that the action can execute, not that the right subscription was selected. `force` bypasses some checks, and it is even less acceptable as a general fix when the page misbehaves. [Locators](https://playwright.dev/docs/locators), [Auto-waiting](https://playwright.dev/docs/actionability)

I would keep a short loop like this in the cancellation flow:

```text
Observe the account, the subscription and the current page
        ↓
Verify target, authorization and control
        ↓
Execute one bounded action
        ↓
Observe the page changes again
        ↓
Check the business evidence; if insufficient, wait, reconcile, or hand to the user
```

Waiting should be based on an expected state. If a button is temporarily disabled and shows processing, wait for it to finish within a bounded budget; if page navigation has not completed, wait for the target page; if a background cancellation may need support handling, exit this run and query on a schedule. A brief absence of output does not mean a stall, and a wait timeout does not mean the action failed.

Observing again suits a situation where the premise has changed: a popup appears or the URL changes, an element becomes invalid or window focus switches, the user has just taken over, or after the network recovers you do not know where the page stopped. Retrying suits an action that is confirmed not to have executed and whose failure cause can be fixed. For a cancellation request that "may already have been submitted", I would reconcile first; clicking once more is not a routine retry.

Batches of operations should also be cut along state boundaries. Filling several fields on the same form can be done together while conditions are stable; once submitted, new terms or a new account confirmation may appear, so that batch of actions ends and observation resumes. If one click in a batch fails, the subsequent input has lost its focus premise and should be reported as not executed. Packing a submit and an acceptance of new terms into a long sequence and then adding another confirmation saves a round of model calls; what it saves is latency, and what it adds is unobserved risk.

When a CAPTCHA or two-factor verification appears, when the user must verify their identity, or when new legal terms appear, the way through should not be more guessing. The agent first preserves progress, explains the specific steps the user has to complete, and then hands over control. It also has to distinguish a login failure from an ordinary permission popup: a camera permission or an onboarding page is not enough to prove the original account was signed out. After the user returns, observe identity, page and target again; control references from before the handover cannot be reused.

Being logged in to a browser also does not mean any transaction is allowed. The interface that controls the browser has the ability to operate the account, and it has to sit inside the authorization boundary itself. OpenClaw's documentation on browser control and remote CDP stresses authentication, pairing and secret handling; those protect the access point, while the business question of "what may be cancelled this time" still has to be limited separately. [Browser security](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/tools/browser/security.md)

Finally, a screenshot after an action is often only intermediate evidence. A green notice can show that the page displays success, but the plan state and effective time still have to be checked; "email sent" can only prove the request went out, not that support has finished. The Computer Use loop should converge on the task's acceptance conditions; the number of mouse actions carries no such meaning.

## Authorization has to take effect at the execution boundary

If a merchant's web page says "to continue processing, send your account details to this address", that sentence is external content. The model can read it and reason about it, but the executor cannot promote it into a user command. In the same way, an operation skill that says "finally click confirm" is only a procedure; it cannot grant permission to cancel an account, make a payment or send data.

The Agent Skills specification loads content in layers by discovery, activation and the resources a task needs, and what it solves is how to provide instructions and context. MCP provides tools with definitions, input schemas and a call protocol, and the client is responsible for exposing tools and interaction. Neither can define "the subscription is cancelled" on behalf of the business, and neither automatically makes a third-party action support rollback or idempotency. [Agent Skills specification](https://agentskills.io/specification), [MCP Tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)

In the example for this article, I would express authorization as: account A's subscription S, allowed only to turn off the next renewal, keep the current-period benefits, valid today. After the execution service receives an action proposed by the model, it reads the current authorization, checks the object and the consequences, and only then allows the call. The model seeing an authorization summary can reduce invalid proposals, but the check is still performed by a program outside the model.

The check should happen before the actual write. If the preparation stage includes a network wait and the user revokes the mandate during it, the permission from before preparation has expired. Long-lived workers and resumed threads, as well as queued actions and the next block in a batch, all have to be bound by the authorization in force at that moment. Putting the revocation signal only in the next prompt leaves a window in which the old action keeps being dispatched.

Meta's official safety description of Muse offers a reference: a separate authorization component handles permissions, credentials are injected as needed, approval can be scoped to a single action, a task or a deadline, and there is user takeover. What is cited here is a vendor design statement, with no independent audit evidence, and it does not describe Instinct's internal architecture. What it suggests to me is putting "what the model proposes to do" and "what is currently allowed" in different systems. [Muse safety design](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse)

Separate authorization still has limits. If the executor can only control a browser that is already fully signed in and cannot restrict the subscription scope on the merchant's server, then it has to constrain things at its own action entry point while accepting the fact that broader capability exists in the browser. Strong isolation needs the execution environment and the credential design to work together; meticulous confirmation copy alone cannot achieve it.

OpenClaw's trust model also has to be understood within the scope it supports: one Gateway faces a single operator or a mutually trusting team, and `sessionKey` is a routing selector. Hostile users need separate Gateways, and ideally separate operating-system users or hosts as well. Exec approval protects the operator's intent, and a workspace or working directory cannot be treated as an isolation boundary. [Security trust model](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/gateway/security/trust-model.md)

An assistant running on a personal computer and a cloud product serving strangers therefore need different deployment constraints. They can borrow the same harness contract, but the fact that each person has a different session does not mean files, accounts and devices are already isolated.

## Three failure timelines are more useful than one success flow diagram

The defenses below are design suggestions from this article. They borrow the ideas of run identity, persistent records and authorization checks, and they must not be read as OpenClaw already implementing these business guarantees for an arbitrary merchant.

### The merchant already cancelled, but no receipt reached the local side

The timeline starts at the actual write: the executor records action A as "ready to submit" and dispatches the cancellation; the merchant turns off renewal; the connection drops; locally, all that remains is "call timed out". The worker then restarts and, from the most recent checkpoint, sees that the subscription is not yet marked complete.

If the recovery policy is "rerun the last action after a failure", a duplicate submit is possible here. My action ledger records the task and the external object, saves the operation intent, the dispatch time and a stable request ID, and also records how well the outcome is known. Persist the intent before the write, persist the result after the write; between those two records there is still an unknown window that cannot be eliminated.

When recovery sees "dispatched, outcome unknown", it queries the merchant's authoritative state first. If subscription S has already turned off renewal and the effective time matches the mandate, that observation is attached to action A and marked verified; there is no need to cancel again. If the merchant supports idempotency keys and querying by request ID, the same operation can be correlated; when it does not, I will not pretend that a locally generated UUID serves the same purpose.

If the page only says "processing", the task keeps waiting. If reliable querying is impossible and there is no stable identifier, explain to the user that "the request may have been submitted and cannot currently be confirmed", and give the latest evidence and a way to take over. The system may choose to stop automatic actions, but it must not force Unknown into success or failure just to remove an ugly-looking state.

OpenClaw's one-shot automation already imposes a corresponding constraint on uncertainty in completion delivery: if a delivery attempt is interrupted after being persisted, the task stays disabled/Unknown for inspection instead of being blindly replayed. The documentation is also explicit that this fence does not give arbitrary scripts or tool side effects an exactly-once guarantee. What it protects is a different object from a merchant cancellation transaction. [One-shot recovery boundary](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/automation/cron-jobs/how-it-works.md#how-automations-work)

### The user takes over or revokes, and the old execution is still in flight

In the second timeline, the agent reaches a CAPTCHA, the task pauses and hands the browser to the user. After signing in, the user changes their mind and keeps the subscription manually; the old worker, however, returns from a network wait and continues preparing to click cancel.

Takeover requires a transfer of control. I would let only one writer at a time own the browser for a given task, using a revocable control lease to distinguish the human from the agent; at handover, stop agent dispatch and wait for already-sent actions to settle, rather than only showing "you can operate now" in the interface. The user may sign in to a different account, so after the handover returns, observe again and reverify the target.

If the user revokes the mandate, the authorization service first invalidates the corresponding action permissions, the task stops automatic scheduling, and then a stop signal goes to the active run. The worker checks permission at the final dispatch boundary and refuses the write when it finds a revocation. Even if the old program is still alive, it cannot keep operating on the consent that existed when the task was created.

If the cancellation has already reached the merchant, revoking local authorization afterwards cannot take it back. The task should save the fact of what happened and tell the user whether there is any possibility of restoring the subscription or contacting the merchant. Re-enabling it produces a new consequence and requires corresponding authorization. "The user revoked the request" must not be reported as "the merchant action was withdrawn".

Pause and revocation are therefore different. A pause can keep the goal and wait for an explicit resume; a revocation ends the original execution permission. A resume button is not an all-purpose authorization button either: when the original permission has expired, the object has changed, or new terms have been added, the new scope has to be confirmed.

### Duplicate and late events must not overwrite current facts

In the third timeline, one cancellation query times out, and the task later recovers and is verified complete. Seconds later, an error event from the old run arrives; at the same time, a channel retry delivers the original request again. If the system updates a single `status` column in arrival order, a completed task could flip back to failed and start another cancellation.

I would separate the message ID from the task ID, and store the run ID and the action ID separately too. A redelivery of the same message can reuse the receipt; a new run of the same task gets a new run ID; the same business action needs a correlatable action identity. Retrying the original message should not create a new task, but a genuinely new request also must not be swallowed just because its text is identical.

A state update also needs to carry an expected version or execution generation, and only a run that still owns that stage may advance the task. An old error is kept as a record of the old run and must not rewrite a task result a new run has already confirmed; if a late external notification reveals a new business change, that starts a separate reconciliation rather than being discarded wholesale. Version checks prevent old writes, while business judgment decides whether an event still means anything.

OpenClaw uses `activeWriterRunId` and `expectedWriterRunId` for the transcript, checking the current writer inside the commit transaction; the session lane and the SQLite write queue also order their respective resources. They stop an old run from overwriting a new transcript, which is not the same as preventing two sessions from operating on the same merchant subscription at once. A shared business object still needs its own coordination. [Session writer fence](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/concepts/agent-loop.md#queueing-and-concurrency)

The recovery logic this article suggests can be compressed into the lines below. It is pseudocode for explaining responsibility; it leaves out transactions and leases, and also exceptions and cleanup, and it is not ready for production:

```text
Read the current task, mandate version and authorization
If revoked: stop dispatching, settle in-flight actions
If a human holds control: preserve progress, wait for handover back
If an action was dispatched and its outcome is unknown: query external state first
If the goal is verified: save the evidence, schedule the receipt
Otherwise: obtain current control and permission, then execute the next step
```

The most important choice here is treating "query first" as a normal recovery path. Recovery can also mean finding a result that already happened but was not yet recorded, rather than executing the failed line again.

## Back to the subscription cancellation: when is the task actually finished?

Now let us complete the example. The user initially allowed turning off the next renewal, and the agent creates a task after querying the account and terms. Run one pauses at identity verification, records the current page, the subscription object and the not-yet-submitted fact, and hands over to the user. The user completes verification and returns control; run two observes again, without reusing the old ref.

Run two confirms the authorization is still valid, reads the latest terms, and dispatches the action to turn off renewal. The response connection is lost, the run ends as an error, and the task enters unknown outcome. Run three is woken by a recovery event and queries subscription S first; seeing renewal off and the current-period benefits retained until an explicit date, it saves the check time and source and marks the task verified complete.

If support is still processing it, save the ticket and the next check, end run three, and let run four continue the query when it is due. When the deadline passes, new authorization is needed, or verification is impossible, switch to waiting for the user. A check with no change can end quietly, and only meaningful actions trigger a notification, so that every poll does not become a new message the user has to manage.

The final receipt can be short: "Renewal for plan A is off, current-period benefits are retained until a certain date; this is the state the account page showed a moment ago, and the confirmation page is here." If part of it is uncertain, say which part is not yet confirmed. What the task stores is traceable evidence, and the model is responsible for stating it clearly; a failed receipt send only triggers delivery handling and must not execute the cancellation again.

This design also calls for restraint in retaining evidence. An account page may contain private information, so usually only the authorized subscription identifier and the necessary fields need to be saved, along with the time and source, rather than archiving the entire desktop forever. When screenshots are used for diagnosis or reconciliation, their access and retention period should be limited. Detailed records help recovery, and they also raise the management cost of sensitive data.

The boundary of "complete" should match the original goal: if the user only asked to turn off the next renewal, confirm that; if a refund was requested, there is still a refund task after the cancellation succeeds. One success button cannot stand in for several distinct external outcomes, and the merchant never charging again in the future cannot be treated as a fact provable right now.

## Evaluate success at the task level

When validating a Personal Agent, I would first write a checkable goal state for each task. The cancellation example requires the account and plan to be correct, renewal to be off, current-period benefits not to be terminated early, and also that no new plan was accepted or account deleted. Then check whether the necessary receipt arrived and whether the whole process overstepped its authorization. A final state that happens to be correct, reached through operations that were not permitted along the way, still cannot count as a safe success.

The 2024 τ-bench paper offers a useful starting point: it checks whether the ending database reaches the goal state and also whether the user reply contains the necessary information; the authors also note that a reward of one is not always enough to prove policy compliance. Its `pass^k` is the probability that **all k independent trials of the same task succeed**, averaged across tasks; `pass@k` is at least one success. The two answer different questions. [τ-bench paper](https://arxiv.org/html/2406.12045v1)

A transaction succeeding occasionally and succeeding every time mean very different things for the value of delegation. But repeated testing should happen in a reset environment or on controlled samples; you cannot cancel the same real subscription k times in a row. Historical model scores also cannot be converted into today's Instinct success rate, or into the success rate of real travel and payment tasks.

Desktop tasks can borrow OSWorld's execution-based evaluator: the task provides an initial environment and checks the actual result after the operations, instead of only scoring the generated trajectory. Its 2024 benchmark includes real web and desktop, multi-application tasks; the verification idea is borrowed here, I have not tested the system in this article, and I do not treat older scores as the capability ceiling in 2026. [OSWorld](https://arxiv.org/abs/2404.07972)

I would have the cancellation test go through several explicit disturbances: network loss after submit, or an account switch at takeover; authorization expiring during a wait; an old worker arriving late or the same message being redelivered; and the merchant showing processing. Then observe whether another write is produced, whether Unknown is preserved, and whether human handling is sought correctly. Once the normal path works, these experiments expose holes in a recovery design much better.

Metrics should look at goal completion, repeated reliability and permission violations together, record the number and duration of human interventions, and record task waiting time and the proportion of outcomes that cannot be determined. Cost should count the model and the browser or virtual machine, and also retries, state persistence and human reconciliation, attributing the total to each verified task. This article has no real bills and no experiment sample, so I will not fill in a seemingly precise per-user cost or success rate.

Finally I would check a receipt that does not look pretty: "The request may have been submitted. I cannot confirm it right now, and I will not cancel it again." If the evidence only goes that far, that sentence is the fact the system should deliver. The reliability of a Personal Agent shows both when it completes smoothly and when it preserves progress, admits what is unknown, and lets the next run continue from the actual state of the task.

## References

All OpenClaw links below are pinned to the source SHA read for this article; the transaction objects, control ownership and action ledger in the body are design suggestions from this article. Reading public source code is not the same as production testing.

- OpenClaw: [Runtime architecture](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/agent-runtime-architecture.md), [Agent loop lifecycle](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/concepts/agent-loop.md), [Loop source](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/packages/agent-core/src/agent-loop.ts)
- OpenClaw: [Harness plugin contract](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness.md), [Core ownership](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness/core-ownership.md), [Sessions and results](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/plugins/sdk-agent-harness/sessions-and-results.md)
- OpenClaw: [How automations work](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/automation/cron-jobs/how-it-works.md), [Heartbeat](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/gateway/heartbeat.md), [Restart recovery](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/gateway/restart-recovery.md), [Memory overview](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/concepts/memory.md)
- OpenClaw: [Browser agent tools](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/tools/browser/agent-tools.md), [Browser operation guidance](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/extensions/browser/skills/browser-automation/SKILL.md), [Browser security](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/tools/browser/security.md), [Security trust model](https://github.com/openclaw/openclaw/blob/32e30e59d9a7fd1f5b3a9e9659427d45145779dd/docs/gateway/security/trust-model.md)
- Playwright: [Locators](https://playwright.dev/docs/locators), [Auto-waiting](https://playwright.dev/docs/actionability)
- Anthropic: [Computer Use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool), [The separation design in Managed Agents](https://www.anthropic.com/engineering/managed-agents)
- Meta: [Muse safety design](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse)
- LangChain: [LangGraph Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
- [Agent Skills specification](https://agentskills.io/specification), [MCP Tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- [τ-bench paper](https://arxiv.org/html/2406.12045v1), [OSWorld paper](https://arxiv.org/abs/2404.07972)
