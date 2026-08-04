---
title: 'Claude Tag Deep Dive: From Shared Slack AI to an Organizational Agent Runtime'
date: 2026-08-05T00:00:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Automation
  - Context Engineering
  - Product Strategy
  - Security
  - Productivity
  - LLM
description: >
  Claude Tag turns Slack into a shared agent runtime with identity, memory, and tools. This deep dive covers its architecture, risks, Chinese peers, and future.
tldr:
  - Claude Tag matters less as a Slack entry point than as an organizational agent runtime built from shared identity, durable memory, asynchronous execution, proactive triggers, and audit controls.
  - It turns a channel into a permission boundary, a thread into an execution session, and public discussion into workspace memory that a team can jointly use, observe, and correct.
  - Its hardest problems are shared channel authority, cross-channel memory, conflicting human instructions, indirect prompt injection, and notification overload. Governance will shape adoption more than model size.
  - China already has adjacent forms: DingTalk's AI Xiaoding is closest to a resident group agent, Feishu Aily is an enterprise agent builder, and DingTalk DWS connects local agents to team chat.
  - The next phase moves from mentions to event-driven work, task-scoped authority, governable organizational memory, and multi-agent coordination, leaving humans with decisions and exceptions.
maturity: budding
columns:
  - agent-engineering
faq:
  - q: "What is Claude Tag?"
    a: "Claude Tag is Anthropic's Slack-based team agent for Claude Team and Enterprise customers. Channel members can hand work to one shared Claude, which uses admin-configured tools and data, runs tasks in hosted sandboxes, and returns progress, deliverables, and follow-ups to the Slack thread."
  - q: "How is Claude Tag different from Claude Code and Cowork?"
    a: "Claude Tag is designed for shared channel work and uses an agent identity and tools configured for the organization. Claude Code is for coding in a personal terminal or IDE, while Cowork handles personal files, research, and office tasks. The key differences are where work happens, whose permissions apply, and who can see and steer it."
  - q: "Can Claude Tag read every Slack message?"
    a: "It reads the context of channels and threads where it operates and can search public channel content like a regular Slack member. Memory from public channels can become workspace memory, while private channels retain separate memory. Actual visibility still depends on channel membership, admin configuration, and product restrictions."
  - q: "Are there products like Claude Tag in China?"
    a: "Yes. DingTalk AI Xiaoding provides a shared group agent with scheduled summaries, task reminders, and natural-language group management. Feishu Aily supports enterprise knowledge, skill orchestration, workflows, triggers, and granular roles. DingTalk DWS can connect local agents such as Claude Code and Codex to team robots."
  - q: "How should an enterprise pilot a resident collaboration agent?"
    a: "Start in a stable internal channel with low-sensitivity data and objectively verifiable outputs. Grant read-only tools and reversible actions first, define budgets, logs, and stop conditions, then measure completion, review time, error rate, and interruption quality before adding write access or proactive automation."
cover:
  image: /images/covers/ai-agent/2026/claude-tag-organizational-agent-runtime.jpeg
  alt: 'A shared organizational agent dispatch console connected to permission vaults, memory archives, and isolated work cells'
---

Calling Claude Tag a Slack bot misses its most consequential product decision. It turns a channel into a place where an agent can be authorized, remember, and keep working: a team shares one executor; each task runs asynchronously in a thread-level sandbox hosted by Anthropic; Agent Proxy injects external credentials at the network boundary; and the result returns to the public thread with a traceable record. The [Claude Tag documentation](https://claude.com/docs/claude-tag/overview) describes these mechanisms in unusually concrete terms.

Together, they form the early shape of an **organizational agent runtime**. They also leave a harder question than model capability: when a shared agent has organizational memory, initiative, and tool access at the same time, who decides what it should do, whose instruction wins, and when it should stay quiet?

## The short answer: what did Anthropic actually launch?

Anthropic launched Claude Tag on June 23, 2026, beginning with Slack in beta for Claude Team and Enterprise customers. A channel member can type `@Claude` and hand it a task. Claude breaks the work into stages, uses connected tools and data, and returns the deliverable to the thread. It can also run scheduled jobs, watch channels or repository events, and follow up without a fresh mention. In its [launch announcement](https://www.anthropic.com/news/introducing-claude-tag), Anthropic says its internal version now creates 65% of its product team's code. That is a vendor-reported adoption number, not a productivity result that outside teams should assume they can reproduce.

The public story is “an AI teammate in Slack.” The system design signals a larger ambition:

1. **Turn an agent from personal software into a shared team resource.**
2. **Use channels as containers for authority, memory, and work.**
3. **Give the agent a service identity that is separate from any employee.**
4. **Let work outlive a single chat and continue for hours, days, or recurring events.**
5. **Put execution, spend, and accountability under an organizational control plane.**

A conventional chatbot maps text in to text out. Claude Tag accepts a problem or responsibility, such as “investigate this latency regression, find the cause, and open a fix PR.” The output can be a message, chart, file, maintained page, or code branch. Anthropic's [How Claude Tag works](https://claude.com/docs/claude-tag/concepts/how-it-works) documentation says it uses the same managed execution engine as Claude Code on the web, which is why it can return working artifacts rather than stopping at an answer.

## Technical architecture: how a Slack thread becomes an execution session

Claude Tag can be understood as five layers:

```text
Slack channel / thread
        │  @Claude, replies, schedules, channel watches, repo events
        ▼
Session and context layer
        │  current thread + channel history + workspace search + memory
        ▼
Ephemeral, thread-level sandbox
        │  plan, edit files, run code, create documents, clone repositories
        ▼
Agent Proxy and permission boundary
        │  domain rules + path/method restrictions + credential injection
        ▼
Enterprise systems
        GitHub / warehouse / observability / tickets / any HTTP API
        │
        └──────── results, PRs, logs, and audit records return to Slack
```

### 1. The thread is the unit of execution

Every Slack thread gets an isolated sandbox. Two threads in the same channel still run in separate environments. The sandbox is released when a thread goes idle and rebuilt when someone replies. The thread, channel memory, and anything already pushed to an external system survive; unpublished files that exist only inside the sandbox do not. The [session lifecycle documentation](https://claude.com/docs/claude-tag/concepts/how-it-works) breaks this into five steps: start the session, create a sandbox, run the work loop, deliver the result, and release the sandbox.

This is a pragmatic engineering choice. Ephemeral compute reduces cross-task contamination and long-lived access while forcing the agent to save important intermediate work somewhere durable. The tradeoff is that long tasks need explicit checkpoints: branches, drafts, attachments, or external state. A team that interprets “the agent remembers” as “its working directory persists forever” will lose anything that was never published.

### 2. The channel becomes a security principal

In a channel, Claude uses the connections and service accounts an administrator assigned to that channel. The identity of the person who starts the task does not change the tool permissions; everyone in the channel shares the same capabilities. The [overview](https://claude.com/docs/claude-tag/overview) states the rule directly: what Claude can reach depends on the channel, not on who you are.

That is a bold product tradeoff. It removes per-person setup and makes collaboration immediate, while rewriting the familiar user-role-resource model as:

```text
membership → channel → Access Bundle → agent identity → allowed actions
```

The channel now acts as a communication surface, collaboration boundary, and permission role. Membership changes, public or private status, and connections inherited from the workspace or organization all affect effective authority. If an administrator attaches a privileged Access Bundle to a public channel, anyone who later joins may be able to invoke that authority through Claude. Anthropic's [security documentation](https://claude.com/docs/claude-tag/concepts/security-and-data) recommends confining sensitive credentials to private channels and checking the channel's effective access, including inherited permissions.

### 3. The model and sandbox do not receive long-lived credentials

Every external request passes through Agent Proxy. Credentials live in a separate credential store. When a request matches an admin rule, the proxy injects the credential at the network boundary; neither the model nor the sandbox receives the secret itself. Outbound networking is default-deny, and a request proceeds only when it matches a credential rule, a domain allowlist, or an environment network policy. The [Agent Identity documentation](https://claude.com/docs/claude-tag/concepts/agent-identity) says administrators can narrow rules to a host, path prefix, and read-only HTTP methods.

This is much closer to an enterprise control plane than placing a long-lived API key in an agent's environment:

- secrets are separated from the reasoning context;
- network egress is tied to policy;
- external systems see the agent's own account;
- administrators can revoke the agent without disabling an employee;
- logs can answer both “who requested the task?” and “which agent identity executed it?”

In 2026, NIST published a [concept paper on software and AI agent identity and authorization](https://www.nist.gov/news-events/news/2026/02/new-concept-paper-identity-and-authority-software-agents), framing separate agent identities, least privilege, and verifiable authority as emerging standardization problems. Claude Tag turns an early version of that abstraction into a product.

### 4. Memory accumulates by place

Claude Tag memory does not belong to an employee. Useful information from public channels can enter workspace memory and be reused in other public channels. A private channel can read workspace memory, but what it adds is written to its own private memory store. Anthropic's [memory documentation](https://claude.com/docs/claude-tag/users/memory) lets channel members inspect, correct, and remove memory, while administrators can review it centrally.

This gives tacit knowledge a path into durable organizational context. A decision mentioned in Monday's standup can still be available in another channel on Thursday. The inverse is equally important: **access isolation and memory isolation are not identical.** A bad conclusion, stale policy, or biased summary created in one public channel can become reusable elsewhere. Locking a credential inside a private channel does not automatically isolate everything Claude learned from public discussion.

Organizational memory therefore needs more than vector retrieval. It needs provenance, time, scope, confidence, an owner, conflict relationships, and expiry. Otherwise “it understands the company better over time” can also mean “it repeats old misunderstandings with increasing confidence.”

### 5. Proactivity turns polling into event-driven work

Claude Tag supports scheduled routines, channel watches, and repository-event triggers. It can maintain digests, chase approvals, watch monitors, or process a backlog, returning only when human judgment is required. Anthropic's [routine documentation](https://claude.com/docs/claude-tag/users/proactivity) shows that a routine uses the same channel authority and execution loop as a human-triggered task.

Initiative moves an agent from a tool that waits for a prompt toward a participant responsible for unresolved state. As I argued in [When the Agent Starts Prompting You](/en/ai-agent/posts/proactive-agent-it-prompts-you/), the important metric changes from answer quality to interruption precision: show up when useful and remain quiet otherwise.

## Capability boundaries: Claude Tag is already broader than coding

Anthropic presents Claude Tag as an evolution of Claude Code, but its product boundary has already moved beyond engineering.

### Shared problem solving

There is one shared Claude within a channel. Every member can see the work and can add context, redirect it, or continue someone else's thread. The documentation explicitly says the starter does not have exclusive control: other channel members can steer the active session. Its [multiplayer walkthrough](https://claude.com/docs/claude-tag/concepts/how-it-works) shows one person requesting a project summary and a colleague adding vendor quotes while the task is still running.

Shared visibility reduces repeated questions and turns prompts, sources, and corrections into team assets. It also exposes organizational reality. When two responsible people give incompatible instructions, more context cannot repair ambiguous authority.

### Long-running, asynchronous delivery

For complex work, Claude updates a checklist in the original thread while the user moves on. The result arrives when ready. Work can continue across turns, over several hours, or on a recurring schedule. Good fits include:

- tracing an incident through discussion, monitoring data, and a code change;
- turning a decision thread into documentation, tickets, and owner lists;
- querying a warehouse and returning a chart;
- chasing approvals, customer follow-ups, and unresolved items;
- watching alerts or repository events and preparing a fix branch;
- maintaining a long-lived report or page.

The value comes from **decoupling waiting from work**. Faster models help, but the larger productivity gain is that a person no longer needs to supervise a conversation while the model emits every token.

### Tool use and durable deliverables

Anthropic documents connections to repositories, ticketing systems, warehouses, and custom HTTP APIs. The agent can read, and it can write within the range an administrator grants. GitHub pull requests are authored by the Claude GitHub App and link back to the Slack thread that initiated them. The audit view records one-time jobs, scheduled jobs, and network requests made through Agent Identity. The [Claude Help Center](https://support.claude.com/en/articles/15594475-what-is-claude-tag) also describes organization-wide and per-channel spend limits; work that would exceed a limit is declined instead of stopping silently halfway through.

This closed loop separates the product from a group-chat summarizer. An agent needs context, action, durable results, and an accountability trail before it can own a complete slice of work.

## Product analysis: why the Slack entry point matters

### 1. It bypasses the enterprise AI cold start

Many enterprise AI projects first fail at a distribution question: where should employees go to use it? A new portal, new account, and prompt training all add migration cost. Once Claude Tag joins Slack, adoption can begin inside an existing thread by mentioning a new participant. The context already exists: the problem, screenshots, debate, owners, and previous decisions are in the channel.

Slack supplies more than a chat box. It already contains a lightweight organizational graph. Channels represent projects and functions, membership says who is present, threads isolate issues, history preserves process, and mentions and notifications provide collaboration protocols. Claude Tag borrows that entire social structure.

### 2. Multiplayer changes agent economics

Traditional AI assistants sell personal seats, so value depends on every employee using the product frequently. Claude Tag charges organization-funded usage for channel work, while administrators can cap spend at the organization and channel levels. The [billing documentation](https://claude.com/docs/claude-tag/overview) says direct messages use a person's own Claude allowance instead.

A shared agent behaves more like team infrastructure. A small number of people may initiate work while the whole channel consumes the result. Vendors can move from selling seats that access a model toward selling computation that completes organizational work. Customers, in turn, will calculate cost per resolved ticket, accepted PR, investigated incident, or minute of human review removed.

### 3. The moat moves toward context and the authority graph

Models can be swapped. An enterprise's accumulated connections, permissions, channel instructions, memory, task history, and evaluation rules are much harder to move. As Claude Tag enters real workflows, it can form a dynamic graph:

```text
who owns what
who may approve what
which channel has which tools
which information can cross boundaries
which task requires which skill
which outputs were accepted or rejected
```

That graph may create more durable platform value than a temporary benchmark lead. The competitive set therefore includes model vendors, Slack, Microsoft Teams, Feishu, DingTalk, identity platforms, automation tools, and every SaaS product that owns important business data.

### 4. Slack is the first surface, not the final boundary

The Claude Tag product page already says Microsoft Teams support is planned. The [official product page](https://claude.com/product/tag) presents Slack as the current entry point. Once identity, permissions, sandboxes, and memory live in an independent control plane, the same agent can appear in chat, ticketing, code review, CRM, email, and meetings.

Claude Tag is better understood as an agent service that can be embedded into collaborative surfaces. Slack solves its first distribution and shared-context problem. The next market is every work event.

## User analysis: the collaboration protocol is what changes

### For individuals: from prompt writer to delegator

People need to state the objective, boundary, deliverable, and acceptance criteria instead of narrating every click. A good delegation looks like a compact task contract:

- what outcome is needed;
- which information may be used;
- which actions are safe to complete automatically;
- when the agent must ask for input;
- where the result should live;
- what counts as done.

This resembles management more than clever prompting. Users also need to review checklists, durable artifacts, and exceptions without watching every intermediate step.

### For teams: shared process reduces information asymmetry and adds command conflict

Private AI work often creates a new information silo: one person knows what they asked, while everyone else sees only a pasted conclusion. Claude Tag leaves the problem, process, tools, and deliverable in a team thread where anyone can continue.

Multiplayer steering creates new questions:

1. Does a later instruction overwrite the original objective?
2. When two members disagree, whose decision is final?
3. If the agent proposes a high-risk action, can anyone in the channel approve it?

Chat permissions usually answer “may this person see and speak?” They do not fully express “may this person change the goal, approve a deployment, or increase the budget?” Shared agents will eventually need task roles layered above messaging: initiator, collaborator, approver, observer, and resource owner.

### For managers: throughput rises while review can become the bottleneck

Once agents work in parallel, production may stop being the limiting factor. Ten employees can each start five jobs, leaving a manager with fifty outputs to judge. Without automatic evaluation, risk tiers, and exception aggregation, a company gets a virtual team that drafts quickly and leaves all editorial work to humans.

The guardrails, regression evaluations, and human gates in [How to Build Real Trust in Unattended AI Agents](/en/ai-agent/posts/trusting-unattended-ai-agent/) become more important in a shared environment. Completion counts prove activity. Human review minutes, rework, incident rate, and final adoption show whether the system returns attention.

## Five hard problems will determine how far Claude Tag can go

### Problem one: channel authority can amplify configuration mistakes

Uniform channel access makes collaboration frictionless. It also concentrates risk: a mistakenly added member, overly broad workspace inheritance, or an overpowered service account expands the blast radius of every task.

The likely next step is **task-scoped, temporary authority**. The agent keeps a stable read-only identity. When it needs to update a database, merge code, or send an external message, it obtains a one-time capability based on the initiator, task, parameters, and expiry. The service identity answers who executes; the authorization token answers why this exact action is allowed.

### Problem two: organizational memory needs a governable truth model

The current ability to inspect, correct, and delete memory is a good start. At enterprise scale, the system will also need:

- provenance and timestamps for every memory;
- different lifecycles for facts, preferences, procedures, and inferences;
- explicit conflicts between old and new evidence;
- designated owners for consequential policies;
- retention periods and usage scopes for sensitive data;
- propagation when a source message is deleted.

Without those controls, stronger memory also makes errors more durable. Enterprises will not settle for “the model probably remembers.” They will ask what it remembers, why it trusts it, and who can change it.

### Problem three: indirect prompt injection enters the organization

Claude Tag reads Slack messages, web pages, repositories, tickets, and data tools. An attacker does not need to speak to the agent directly. A malicious instruction hidden in an issue, email, page, or document can enter its context. OWASP calls this [indirect prompt injection](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) and recommends validating proposed actions against the original task at the execution boundary.

Credential isolation and default-deny egress reduce impact, but they cannot prove the model was not redirected by hostile content. Enterprises still need source classification, parameter validation, sensitive-data flow rules, approval for writes, and adversarial evaluation against real tool chains. The security goal should be: even when the model is fooled, the system limits what it can do.

### Problem four: initiative competes for human attention

One proactive agent can be helpful. Ten channels with ten proactive agents can create another notification flood. The product needs to learn:

- which events merely update status;
- which anomalies belong in a digest;
- which decisions should interrupt a person immediately;
- who currently owns the issue;
- how long silence must last before work is truly stalled;
- how to deduplicate the same signal found by multiple agents.

A core metric for proactive products should be the share of interruptions that lead to useful action. When precision falls below a team's tolerance, people will mute the agent just as they mute ordinary bots.

### Problem five: durable memory conflicts with strict data policy

Claude Tag retains channel memory and session transcripts, so organizations with Zero Data Retention enabled cannot currently use it. Anthropic states this limitation in its [security and data handling documentation](https://claude.com/docs/claude-tag/concepts/security-and-data). It exposes goals that cannot all be maximized:

```text
continuous learning  ↔  minimal retention
cross-channel reuse  ↔  strict isolation
proactive discovery  ↔  minimal reading
complete audit       ↔  data deletion
```

Future products will need memory levels rather than one master switch: thread-only, channel-only, workspace-shared, structured and confirmed, time-limited, or reference-only. Memory will become part of the permission system.

## Is there a similar product form in China? Yes, and the routes have diverged

If the standard is simply “an AI can be mentioned in a group,” China has had many bots for years. Raise the bar to shared context, proactive work, tool execution, durable memory, separate identity, and governance, and three different product strategies emerge.

| Product | Comparable capabilities | Important differences from Claude Tag |
|---|---|---|
| **DingTalk AI Xiaoding** | A dedicated agent per internal group; chat-history queries; scheduled information; daily and weekly summaries; unfinished-task reminders; natural-language group administration | Public official materials emphasize group information, tasks, and administration. They do not yet document thread-level sandboxes, cross-group memory, an Agent Proxy, external service identities, and a unified audit model in the detail Anthropic provides |
| **Feishu Aily** | Agents, workflows, knowledge Q&A, mixed routing, chat bots, webhooks, schedules, enterprise data, and permissions for skills, tables, fields, and records | It is primarily an enterprise agent creation and operations platform. A universal shared agent, multiplayer steering, and automatically accumulated workspace memory are not the current public product narrative |
| **DingTalk DWS** | Quickly connects Claude Code, Codex, Qoder, CodeBuddy, and other local agents to group robots; exposes chat, documents, calendars, tables, approval, and attendance commands | The executor mostly runs on a member's computer and account. Unified hosting, identity, cross-thread memory, budgets, and audit remain the enterprise's responsibility |

### AI Xiaoding is the closest product form

DingTalk launched AI Xiaoding in February 2026 and described it as a “proactive service agent” dedicated to each DingTalk group. Members can `@AI小钉` in an internal group to search chat history, manage tasks, and change group settings. It can also push scheduled information, generate group digests, identify unfinished items, and remind owners. DingTalk's [official introduction](https://www.dingtalk-global.com/zh/news/activity/dingling-ai-assistant-for-group-chats-260207) shows an experience close to Claude Tag's shared, proactive group agent. Because DingTalk already owns tasks, approval, the organization directory, and group administration, its closed loop may fit Chinese operating practices especially well.

The visible gap is the technical control plane. Anthropic has documented credential isolation, egress rules, scope inheritance, service identities, audit, sandbox lifecycle, and memory boundaries. AI Xiaoding's public page is more scenario-oriented. That does not prove the underlying systems are absent; it means an enterprise buyer cannot yet evaluate the boundaries with the same detail from public materials.

### Aily's strength is buildability and business-data permissioning

Feishu Aily lets enterprises create four kinds of applications: model reasoning, workflow, knowledge Q&A, and mixed routing. Workflows can be triggered by chat, webhook, or schedule, while knowledge and skills can enter existing systems through APIs and Feishu events. The [Aily capability documentation](https://www.feishu.cn/content/0vi1z25i1) covers orchestration, retrieval, tool use, and automation.

For authorization, Aily can restrict skills by end-user role and set view, edit, create, delete, field, and record permissions on data tables. Its [role documentation](https://www.feishu.cn/content/ehksl0lb) shows unusually granular control over structured business data. The product philosophy is closer to “let an enterprise build many specialized agents.” Claude Tag begins with one general Claude and equips it with identities, tools, memory, and instructions by channel.

### DWS represents an open bridge

DingTalk launched DWS, the dingtalk-workspace-cli, in July 2026. It wraps chat, messaging, documents, calendars, tables, approval, and attendance as commands, and lets users map local tools such as Claude Code and Codex into a group robot. The [DWS announcement](https://www.dingtalk-global.com/zh/news/activity/make-ai-help-team-work-dingtalk-dws-team-bot-260706) says no separate server is required and a local agent can appear in a group within a few steps.

This route fits developers and teams that want to choose their own model. The collaboration platform provides the interface and tool protocol; users choose the runtime. It also inherits local-agent governance questions: is the computer always online, whose account is used, how are upgrades coordinated, how is team data isolated, and where does complete audit live? DWS is a short bridge, but the enterprise still owns operations on both sides.

### Where is the real opportunity in China?

Chinese collaboration platforms have three structural advantages:

1. **Organization and workflow are concentrated.** Directory, approval, attendance, tasks, documents, and tables often live on one platform.
2. **Group chat is a business surface.** Sales, projects, stores, supply chains, and customer service rely heavily on group coordination.
3. **Private deployment and local-model demand are stronger.** Enterprises want options across public cloud, dedicated cloud, local executors, and domestic models.

Chinese products are unlikely to copy the Slack-plus-Claude combination exactly. A more likely architecture is: a group agent as the default interface; Aily or DingTalk AI Assistant for orchestration; a DWS-like protocol for local runtimes; native identity and approval for high-risk authority; and an enterprise knowledge base for governable memory. The first company to make those layers easy to configure and audit will be much closer to a genuine organizational agent platform.

## Three future stages: from an @ mention to an organization that keeps moving

The following is my forecast based on today's architecture, not an announced Anthropic roadmap.

### Stage one: resident group agents become a collaboration default

Over roughly the next twelve months, Slack, Teams, Feishu, and DingTalk will make these capabilities standard:

- understand long threads and channel history;
- extract decisions, owners, and unresolved work;
- create documents, tickets, calendar items, and code tasks from conversation;
- run scheduled summaries and watchers;
- publish progress and deliverables to the group;
- let administrators connect tools and control spend centrally.

Competition will focus on coverage and default experience. A product must prove that a user can complete one real, low-risk task in a channel without learning a complex configuration system.

### Stage two: agent identity enters enterprise IAM

Over one to three years, static service accounts will be supplemented by task-scoped authority:

```text
stable agent identity
    + initiator identity
    + task objective
    + allowed actions and parameters
    + budget
    + expiry
    + approval evidence
    = one verifiable execution authority
```

Enterprises will maintain an agent directory. Every agent will have an owner, skills, cost center, data scope, risk class, evaluation record, and kill switch. Identity teams and AI platform teams will share a control plane. Audit will move from “which API was called?” to “did this action remain within the original task and approved authority?”

### Stage three: chat recedes into an exception and decision interface

The long-term form will not require people to mention an agent constantly. Events will start the work:

- an alert appears; an agent investigates and prepares a fix;
- customer risk rises; an agent assembles evidence and an action plan;
- a requirement reaches consensus; an agent creates tasks, updates documentation, and follows dependencies;
- a metric moves unexpectedly; an agent checks definitions, locates the change, and informs the owner;
- an approval stalls; an agent traces the blocker and returns only when judgment is required.

Chat remains, but mostly for explanation, correction, approval, and escalation. A person's daily entry point starts to look like a decision queue:

```text
3 items need your approval
2 conflicts need your judgment
4 outputs failed evaluation
1 agent is near its budget
186 other tasks completed under policy
```

### The eventual form: a programmable execution nervous system

When identity, memory, events, and tools connect, an agent is more than a name. It becomes part of an execution network across the organization:

- a **sensing layer** reads chat, meetings, tickets, metrics, and code events;
- a **memory layer** stores organizational knowledge with provenance, expiry, and permission;
- a **planning layer** decomposes objectives and selects specialized agents;
- an **execution layer** uses tools and creates artifacts inside isolation;
- a **governance layer** handles authorization, evaluation, audit, budgets, and human gates;
- a **collaboration layer** returns decisions requiring consensus to people.

This does not make a company self-driving. It changes the default from “work waits until someone remembers it” to “the system keeps finding unresolved state while people handle the highest-value judgment.”

## How an enterprise should pilot this now

Claude Tag is still in beta. A pilot should be treated as an organizational-design experiment, not merely a software installation.

### Choose the right channel

The best first tasks have four properties:

- stable channel membership;
- relatively low data sensitivity;
- sufficiently complete inputs;
- objectively verifiable outputs.

Examples include internal knowledge organization, public research, ticket triage, test-failure classification, and read-only reporting. Production deployment, external messaging, financial actions, permission changes, and deletion should come later.

### Increase autonomy in four levels

| Stage | Authority | Allowed work | Promotion condition |
|---|---|---|---|
| **Observe** | Read-only | Summarize, retrieve, classify, recommend | Answers have stable sources and errors are quickly detectable |
| **Draft** | Reversible writes | Create drafts, tickets, branches, and reports | Rework decreases and artifact formats stabilize |
| **Constrained execution** | Parameters and budgets enforced | Update internal state, call paid APIs, send internal notices | Audit is complete and misuse stays within tolerance |
| **Gated execution** | Approval for high-risk actions | Merge, deploy, publish, change access, or delete | Preserve explicit human authorization permanently |

### Measure how much human work disappears

At minimum, track:

- time to first usable result;
- end-to-end completion rate;
- human review minutes;
- rejection and rework rate;
- share of proactive alerts that lead to useful action;
- reasoning and tool cost per accepted result;
- unauthorized attempts, bad writes, and rollbacks;
- frequency of memory correction, expiry, and deletion.

If output volume rises alongside review time, the agent merely moved work into the review queue. If proactive alerts rarely lead to action, it created another notification source. If the team cannot explain where a permission was inherited from, the pilot should remain read-only.

## Final assessment

Claude Tag matters because it compresses capabilities that previously lived across chat, agent frameworks, cloud sandboxes, IAM, knowledge bases, automation, and audit into a product a team can use directly.

Technically, thread-level sandboxes, Agent Proxy, separate service identities, and place-scoped memory provide a complete skeleton for a shared agent. As a product, channels solve distribution, context cold start, and multiplayer collaboration. For users, it moves work from private AI sessions toward public delegation, observation, correction, and inheritance.

China already has adjacent forms and may hold advantages in group tasks, approval workflows, organizational directories, and local runtimes. The remaining gap is an integrated default system with clear boundaries across identity, memory, execution, initiative, and audit.

The most valuable future agent may have no prominent chat homepage. It will live wherever an organization already works, detect unresolved state, obtain the right amount of authority, leave evidence when it completes work, and call a person back only when judgment is necessary. Claude Tag is the most complete product demonstration of that direction so far. It is also an early organizational experiment: when AI becomes a shared teammate, the first thing a company needs to upgrade may not be its model, but its structure for authority, memory, and accountability.

## References

- [Anthropic: Introducing Claude Tag](https://www.anthropic.com/news/introducing-claude-tag)
- [Claude Docs: Work with Claude Tag](https://claude.com/docs/claude-tag/overview)
- [Claude Docs: How Claude Tag works](https://claude.com/docs/claude-tag/concepts/how-it-works)
- [Claude Docs: How agent identity works](https://claude.com/docs/claude-tag/concepts/agent-identity)
- [Claude Docs: Security and data handling](https://claude.com/docs/claude-tag/concepts/security-and-data)
- [Claude Docs: What Claude Tag remembers](https://claude.com/docs/claude-tag/users/memory)
- [Claude Docs: Set up routines](https://claude.com/docs/claude-tag/users/proactivity)
- [Claude Help Center: What is Claude Tag?](https://support.claude.com/en/articles/15594475-what-is-claude-tag)
- [Claude: @Claude product page](https://claude.com/product/tag)
- [NIST: New Concept Paper on Identity and Authority of Software Agents](https://www.nist.gov/news-events/news/2026/02/new-concept-paper-identity-and-authority-software-agents)
- [OWASP: LLM Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- [DingTalk: AI Xiaoding enters every group](https://www.dingtalk-global.com/zh/news/activity/dingling-ai-assistant-for-group-chats-260207)
- [DingTalk: DWS turns a personal AI assistant into a team robot](https://www.dingtalk-global.com/zh/news/activity/make-ai-help-team-work-dingtalk-dws-team-bot-260706)
- [Feishu: Aily application scenarios and capabilities](https://www.feishu.cn/content/0vi1z25i1)
- [Feishu: Aily role and permission configuration](https://www.feishu.cn/content/ehksl0lb)
