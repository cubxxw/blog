---
title: "OpenClaw's Long-Running Gateway: Continuity Does Not Mean One Shared Session"
date: 2026-08-07T17:40:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Harness Engineering
  - Security
  - Monitoring
  - Automation
  - Development
description: >
  Trace OpenClaw v2026.7.1-2 through admission, bindings, agents and session keys to see how identity dimensions shape continuity, isolation and permissions.
tldr:
  - OpenClaw's core object is not a cross-channel chat model but a resident Gateway. It takes over channel connections and protocols first, then routes admitted messages to an agent, a session and the current turn's capability.
  - Bindings only decide message ownership; they do not replace the DM allowlist, pairing or group policy, and a session key only selects context — it is not a tenant authorization token.
  - Continuity comes from leaving identity dimensions out of the session key; isolation comes from putting channel, account and peer back into the key. identityLinks is a high-risk identity merge, not automatic verification.
  - Each agent can own a separate workspace, agentDir, auth and session store; but the workspace is only the default cwd, and one Gateway is not a hostile multi-tenant security boundary either.
  - Being online 24/7 turns web pages, email, documents, devices and external tools into long-lived openings. Hard boundaries must be carried together by channel admission, tool policy, sandbox, pairing, idempotency keys and reconciliation.
series:
  name: Agent System Design Anatomy
  slug: agent-system-design
  order: 6
  total: 11
columns:
  - agent-system-design
cover:
  image: /images/agent-system-series/06-openclaw/openclaw-persistent-gateway.en.svg
  alt: 'OpenClaw routing from internet channels through the resident Gateway, deterministic bindings and session keys into per-agent enclaves, device nodes and external side effects'
---

Suppose one company runs two Telegram bots: one serves European customers, one serves American customers. Both bots hand messages to the same `support` agent, and the session isolation policy is set to `per-channel-peer`.

One platform user ID happens to appear in both accounts.

The system generates the same key:

```text
agent:support:telegram:direct:tg:12345
```

A conversation from the European inbox can then surface in the American inbox's context.

No model jailbreak, no database corruption, no random routing. The system worked exactly as configured — the session key simply lacked the `accountId` dimension.

**Cross-channel continuity and cross-account crosstalk are often separated by just one identity dimension.**

The site's existing [Agent Identity: From Locke to OpenClaw](/ai-agent/posts/agent-identity-from-locke-to-openclaw/) discusses how identity files, memory, permissions and evaluation form observable continuity. This article no longer asks whether an Agent is still "the same self"; it only traces how a resident Gateway turns one message into a turn with bounded capability.

This article freezes **OpenClaw v2026.7.1-2**, whose tag commit is `0790d9f593ad30c940ed93b5872a8cf6d6f3cf8c`, released at 2026-08-04 00:41:26 UTC. On the research day `main` had already moved on to `2dd0e9b950462acc1f24fa9b207e9b7b0b4bd36b`; source-code judgment stays pinned to the release tag, and current docs are used only to supplement runtime contracts that are still public. [v2026.7.1-2 release](https://github.com/openclaw/openclaw/releases/tag/v2026.7.1-2)

## How Four Gates Separate Gateway and Model

Calling OpenClaw a chatbot misses its most important ownership.

The official architecture defines the Gateway as a long-running process: it maintains connections to message surfaces such as WhatsApp, Telegram, Slack, Discord, Signal, iMessage and WebChat; the macOS app, CLI, Web UI and automation clients connect through a typed WebSocket API; device nodes connect to the same WS server but declare capabilities and commands with `role: node`. [Gateway architecture at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/architecture.md)

The model only handles a prepared turn. It should not decide for itself:

1. whether a stranger may get in;
2. which agent the message belongs to;
3. which slice of history to read;
4. which tools and devices are visible this time.

These four things map to four different gates:

| Gate | Input | Output | The most dangerous misreading |
|---|---|---|---|
| Channel admission | DM/group policy, pairing, allowlist, mention | a set of accepted channel facts | "a binding means permission" |
| Binding resolution | channel, accountId, peer, guild/team/role | agentId | "choosing an agent chooses the session" |
| Session construction | agentId, dmScope, identityLinks | sessionKey | "a session ID can authorize a tenant" |
| Capability resolution | channel/account capabilities, tool policy, sender, sandbox, plugin/runtime | the capabilities visible to this turn | "an agent owns a static full tool set" |

A binding only determines which agent receives the message. It neither grants access to messages rejected by channel policy nor automatically makes admitted content safe. [Agent bindings](https://docs.openclaw.ai/concepts/agent-bindings)

## Diagram: From Channel Facts to Bounded Capability

![OpenClaw resident Gateway routing and trust boundaries](/images/agent-system-series/06-openclaw/openclaw-persistent-gateway.en.svg)

**Reading guide:** On the left is internet input; whether or not the sender is trusted, email, web pages, attachments and document content can still carry prompt injection. The Gateway in the middle maintains connections first, then uses deterministic bindings to select an agent; the red session key is only a context coordinate, not authorization. On the right, two agents separate their workspace, agentDir, auth and session store, but still sit inside the same host and operator trust domain. Devices and side effects at the bottom must pass pairing, capabilities, tool/sandbox policy, idempotency keys and reconciliation once more.

This diagram deliberately omits any line where "the same person" automatically merges across channels.

Because what the Gateway can observe is `channel / accountId / peer`, not the same identity in a philosophical or legal sense. Merging a Telegram user and a Slack user into one person still requires an explicit operator judgment.

## The Exact Routing Chain of One Message

In the frozen version, `ResolvedAgentRoute` returns not only `agentId` but also `channel`, `accountId`, `dmScope`, `sessionKey`, `mainSessionKey`, `lastRoutePolicy` and `matchedBy`. The routing result decides the agent, the context coordinates and the reply path at once — not just "pick a persona". [`resolve-route.ts`](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/src/routing/resolve-route.ts)

The full chain can be written as:

```text
channel plugin receives message
  → admission
      dmPolicy / groupPolicy / pairing / allowlist / mention
  → normalized route facts
      channel / accountId / peer / guild / team / roles
  → binding resolver
      peer
      parent peer
      peer wildcard
      guild + roles
      guild
      team
      account
      channel
      default agent
  → agentId
  → dmScope + identityLinks
  → sessionKey
  → per-agent session store + per-session lane
  → tool / sender / sandbox / plugin / runtime policy
  → model turn
  → Gateway streaming + channel delivery
```

Bindings match by specificity, and within the same tier the earlier configuration wins; multiple match fields are `AND`-related. Omitting `accountId` matches only the default account, not all accounts; matching a whole channel requires writing `accountId: "*"` explicitly. [Multi-agent routing at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/multi-agent.md)

This is a deterministic algebra. The upside is that an incident can be traced to a route fact and a rule; the downside is that a wrong configuration executes just as stably.

### How a Wide Rule Steals Messages

Suppose a team writes a channel-wide fallback first and a peer-specific binding later, but puts both in the same match tier or references an agent that does not exist. The message can land on the default agent.

The real defense is not letting the model see the content and then "judge whether it is customer service", but:

- checking at startup that the agents referenced by bindings exist;
- treating account/channel wildcards as security-sensitive configuration;
- writing table-driven tests with representative route facts;
- keeping `matchedBy` in the logs;
- verifying with `agents list --bindings` and a channel probe after changes;
- failing outright on unexplainable default fallbacks instead of continuing silently.

OpenClaw currently provides routing rules and diagnostic entry points, but "production configuration must fail closed" is a design requirement this article places on operators; it must not be passed off as an existing default guarantee.

## The Session Key Is the Continuity Switch

The frozen-version source spells out the main shapes of DM sessions directly: [`session-key.ts`](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/src/routing/session-key.ts)

```text
main
agent:<agentId>:<mainKey>

per-peer
agent:<agentId>:direct:<peerId>

per-channel-peer
agent:<agentId>:<channel>:direct:<peerId>

per-account-channel-peer
agent:<agentId>:<channel>:<accountId>:direct:<peerId>
```

Each added dimension raises the session count, lowers shared context, and lowers the probability of wrong merges.

The default `main` suits a true single-user personal assistant: all DMs share one continuous history. The moment a second person can send it private messages, the default stops being just an experience choice and becomes a privacy boundary. The official session docs explicitly warn that with multiple users and no DM isolation, different users share conversation context, and recommend `per-channel-peer`. [Session management at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/session.md)

The synthetic messages below replay the session mixing from the opening: two people send messages through two channels and several accounts, including a peer ID duplicated across accounts. Switch between the four dmScope modes and watch which messages enter the same session.

{{< interactive kind="session-scope" id="session-scope" spec="session-scope-v1" >}}

Keep your eyes on the `per-channel-peer` setting: Europe and America's `tg:12345` fall into the same key — no jailbreak, no corruption, just a key missing the `accountId` dimension. The last case demonstrates `identityLinks`: that is a configured primary-key merge, not identity verification.

Multi-account scenarios need to go one step further.

Back to the opening incident: the fix is not clearing the model's memory but:

```json5
{
  session: {
    dmScope: "per-account-channel-peer"
  }
}
```

The two inboxes then generate:

```text
agent:support:telegram:supporteu:direct:tg:12345
agent:support:telegram:supportus:direct:tg:12345
```

### identityLinks Is a Primary-Key Merge

When the same person appears through different channels, OpenClaw supports mapping multiple external identities to one canonical peer id with `session.identityLinks`. [Session management at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/session.md)

It helps to understand this as a primary-key merge, not a nickname:

```text
telegram:111 ─┐
              ├─> canonical: alice
slack:U222 ───┘
```

If `slack:U222` actually belongs to Bob, the system faithfully folds Alice's and Bob's contexts together. OpenClaw provides the join mechanism; it does not perform cross-platform identity verification for the operator.

So an identity link needs:

- traceable human confirmation or upstream identity-provider evidence;
- a preview: show the session count and time range to be merged;
- two-way impact notes: both reading history and future writes change;
- a revocable mapping, without promising history can be "split back" losslessly;
- audit and secondary confirmation for high-risk changes.

## What the Per-Agent Enclave Isolates

One OpenClaw agent is a complete persona scope:

- workspace and bootstrap files;
- `agentDir`, model registry and auth profiles;
- the `sessions.json` routing/lifecycle index and JSONL transcript from the release tag;
- tool and sandbox policy.

The release tag's session storage still consists of a `sessions.json` index and JSONL transcripts; the online docs on the research day already describe a migrated agent-scoped SQLite. This article does not backfill v2026.7.1-2 with the new storage implementation on main. [Session at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/session.md)

The official docs also explicitly warn against reusing `agentDir` across agents, which causes auth/session state collisions. Whether plugin storage is per-agent depends on the plugin's own configuration; adding a second agent does not automatically split every global store. [Multi-agent routing at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/multi-agent.md)

This means the per-agent enclave is a valuable state partition, but not a container or virtual machine.

Three words especially need separating:

| Object | What it controls | What it does not automatically control |
|---|---|---|
| Workspace | the default cwd for tools and context, bootstrap files | absolute paths, host process permissions, the network |
| Sandbox | file and process boundaries of tools in an isolated runtime | the Gateway operator, external API permissions |
| Tool policy / approval | which tools and parameters may be called, whether to ask | all interpreter indirect paths, hostile tenant isolation |

The official docs say it plainly: the workspace is a default cwd, not a hard sandbox; without a sandbox enabled, absolute paths can still reach other host locations. [Multi-agent routing at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/multi-agent.md)

So "one workspace per agent" cannot be written as "one secure computer per agent".

## Which Part of the Loop the Gateway, Agent Runtime and Model Each Own

One embedded runtime turn roughly passes through:

1. the Gateway receives an `agent` request, resolves the session and returns a run ID;
2. `agentCommand` resolves model, auth, skills snapshot and workspace/sandbox;
3. the run enters a per-session/global lane;
4. the runtime assembles system prompt, bootstrap, history, tool schemas and attachments;
5. the model generates text or a tool call;
6. the runtime executes tool continuation, stream events, timeout/abort;
7. the Gateway persists and delivers to the original channel route.

[Agent loop](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/agent-loop.md) explains the queue, context, model/tool streaming, persistence and stop lifecycle.

But OpenClaw does not only support its own embedded loop. Different agent runtimes can hand the low-level loop to an external harness; for example, the Codex app-server owns the canonical thread and model loop, while OpenClaw still owns channel routing, context projection, dynamic tool bridging and delivery. [Agent runtimes](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/agent-runtimes.md)

So the more precise ownership split is:

| Layer | Owns |
|---|---|
| Gateway | admission, routing, session identity, capability, delivery, control-plane protocol |
| Agent runtime | the runtime part of prompt assembly, model/tool continuation, compaction, stop |
| Model | the probabilistic choice of the next token, tool call or final response |

This also explains why OpenClaw is a Gateway category rather than just another model wrapper: runtime and model can be swapped out while channel continuity and the control plane remain.

## Device Nodes Turn "Online" into Real-World Permissions

Device nodes connect to the Gateway with `role: node`, declaring `caps / commands / permissions`. A new device ID needs pairing approval, and the Gateway issues a device token for later connections; changing role, scope or public key triggers a new pairing request. [Nodes](https://docs.openclaw.ai/nodes)

But pairing is not per-command approval.

A device already paired and opened up with `camera.*`, `screen.record`, `location.get` or `system.run` extends the Agent's blast radius from the message window into the physical world. Device records, Gateway command policy and the node's own exec approval are different control layers; revocation must also clear pairing, tokens, related sessions and external credentials together.

A resident system needs to answer:

- when a device goes offline, are undelivered commands dropped, retried or expired?
- during node upgrades, how much protocol version drift will the Gateway accept?
- does capability expansion require re-approval?
- when a device is transferred or lost, which durable pairing record is revoked?
- can an operator reconstruct "who approved which capability" from audit records?

The current node docs can prove the pairing, capability and revoke contract, and also state that the Gateway accepts only a limited version window for the node protocol; they cannot prove that all device side effects have exactly-once delivery.

## How Staying Online 24/7 Expands the Attack Surface

Turning an Agent into a resident service does not just raise availability; it converts short-session risk into continuous exposure.

### Prompt Injection Does Not Only Come from Strangers

Even if DMs only allow you yourself, the web pages, email, documents, attachments, logs and code the Agent reads can still carry adversarial instructions. The official security docs state explicitly that a system prompt guardrail is not a hard boundary; hard constraints come from tool policy, exec approval, sandbox and channel allowlist. [Security](https://docs.openclaw.ai/gateway/security)

One useful layering is:

```text
untrusted inbox / web content
  → read-only reader agent
  → bounded, redacted summary
  → main agent
  → high-risk tool only after policy / approval
```

This does not guarantee the summary is poison-free; it reduces the chance that raw content directly holds high-privilege tools.

### Credentials Accumulate and Expire

A Gateway may hold channel tokens, provider auth, agent auth profiles, pairing state, session history and transcripts for a long time. v2026.7.1-2 spreads this state across config, credentials, per-agent auth/session index and transcripts; the online docs on the research day already show the new post-SQLite-migration layout. Whichever generation, the official advice is to tighten file permissions, enable disk encryption and use a dedicated OS user. [Security at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/gateway/security/index.md)

Long-term running requires a credential ledger:

| Credential | Owner | Scope | Rotation | Revoke verification |
|---|---|---|---|---|
| Gateway auth | operator | control plane | periodically and after leaks | old token fails to connect |
| Channel token | channel account | inbound/outbound | when the platform supports it | probes stop succeeding |
| Model/provider auth | agent or Gateway | model/API | provider policy | old profile stops working |
| Device token | paired device | declared role/caps | re-pair/incident | node disconnects and cannot reconnect |
| External tool credential | capability owner | resource/action | business cycle | read/write both fail as expected |

Updating is not a single npm command either. A protocol compatibility window exists between Gateway and nodes; the right order is Gateway first, then nodes, saving config/state and verifying health and rollback paths before upgrading. [Nodes](https://docs.openclaw.ai/nodes)

## Where Idempotency Ends

The Gateway WebSocket requires an idempotency key for side-effecting methods like `send` and `agent`, and keeps a short-lived dedupe cache so clients can safely retry the same request. [Gateway architecture at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/architecture.md)

This covers only one window in the Gateway's request-handling layer.

It does not imply:

- email is sent exactly once;
- a ticket is created exactly once;
- a calendar gets exactly one event;
- a device command runs exactly once;
- the external API outcome is known after a crash.

External side effects still need a stable operation key:

```text
operation_key
  = hash(agentId, sessionKey, intent_type, business_object, version)
```

Query the ledger before writing, pass an idempotency key when calling the target API, save the external reference; after a timeout, query the target system first, then decide on retry. If the target system does not support idempotency, you need a compensating action or manual reconciliation.

OpenClaw's short-lived WS dedupe and business-side idempotency are not the same layer.

## Crash Recovery Cannot Rely on Reconnecting Alone

The Gateway protocol's server-push events are not replayed; after spotting a sequence gap, the client must re-fetch state. The official recommendation is to supervise the Gateway under launchd/systemd for automatic restart and to monitor its status with WS health checks. [Gateway architecture at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/architecture.md)

This exposes three different recoveries:

1. **connection recovery**: client/node reconnects, re-handshakes, re-subscribes;
2. **context recovery**: read persisted history by session key and resume the next turn;
3. **side-effect recovery**: reconcile against the operation ledger and external references.

Success in the first does not mean the second is complete, and a complete second does not mean the third has no duplication.

A resident Agent's stop semantics must be layered just as much: an `agent.wait` timeout only stops waiting and does not necessarily stop the underlying run; interrupt, runtime timeout, model watchdog, tool error and delivery failure each have different semantics. "No reply" in the UI cannot be equated with "no tool executed".

## Three-Layer Architecture: One Gateway, Three Product Promises

### Agent Architecture

- loop: the embedded runtime or an external harness owns model/tool continuation;
- context: workspace bootstrap, history, skills, tools and attachments are assembled into a bounded window;
- memory: workspace memory, the release-tag session transcript and optional retrieval are not the same object;
- delegation: subagents have separate session/context but may share workspace, host and operator trust;
- eval: QA/scenario/hooks can check externally; ordinary turns have no unified online evaluator;
- stop: end, error, interrupt, timeout, watchdog and delivery stop each need separate observation.

### Technical System Architecture

- runtime: a long-running Node.js/TypeScript Gateway and replaceable agent runtimes;
- protocol: typed WS request/response/event, JSON Schema, device handshake;
- state: shared config/state, per-agent `sessions.json`/JSONL, channel credentials; the SQLite migration on research-day main does not backfill the release;
- concurrency: per-session lanes and transcript write/compaction coordination;
- recovery: health, restart supervision, state refresh, credential rotation;
- security: a single trusted operator, channel admission, tool/sandbox policy, device pairing.

The repository manifest can prove the project is mainly TypeScript/Node.js, and one can observe multiple channel SDKs, WebSocket, plugins and cross-platform clients. Explaining that choice as "suitable for long connections, event I/O and a plugin ecosystem" is a reasonable engineering inference, but not the maintainers' publicly stated sole motive for the language choice. [package.json](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/package.json)

### Product Architecture

- user task: keep one assistant continuously reachable across message entry points, Web UI and devices;
- interaction: channel messages, Control UI, CLI, automations, device actions;
- deliverables: replies, files, notifications, external system changes, device actions;
- control plane: bindings, sessions, agents, tools, nodes, security audit;
- ecosystem: channels, plugins, skills, models, agent runtimes;
- adoption boundary: willingness to own a long-running host, credentials, updates, audit and incident response.

Together the three layers show: the product promise "reachable everywhere" is supported by the operational object "a single resident Gateway", and bounded by the security assumption "one trusted operator boundary".

## Multi-Agent Is Not Hostile Multi-Tenant

OpenClaw can run multiple agents with separate workspace, state, auth and sessions in one Gateway. That is enough to separate home/work personas, or to hand untrusted email to a reader agent.

It does not equal letting mutually distrusting organizations safely share one Gateway.

The official security model states explicitly: one Gateway corresponds to one trusted operator boundary; an authenticated operator is a control-plane trusted role, and `sessionKey` is only a route selector. Hostile or mixed-trust tenants should use separate Gateways, preferably further separated into different OS users or hosts. [Security](https://docs.openclaw.ai/gateway/security)

The current Fleet docs define each tenant cell as a complete Gateway, container, state, credentials, workspace, channel account and token, and state explicitly that Fleet provides no shared channel ingress router. [Multi-tenant hosting](https://docs.openclaw.ai/gateway/multi-tenant-hosting)

That draws a clear boundary:

```text
multiple personas of one trusted operator
  → one Gateway, multiple agents

mutually distrusting tenants
  → one Gateway cell per tenant
  → stronger OCI / VM / separate host as risk increases
```

Do not simulate a tenant authorization layer that does not exist with more session keys.

## When Should You Adopt OpenClaw?

OpenClaw fits teams or individuals where these conditions hold together:

- tasks genuinely span Telegram, Slack, Web, CLI or devices;
- conversation continuity matters more than one-shot prompts;
- there is a runtime environment that can be supervised, updated and backed up long-term;
- explicit routing can be written for channels, agents, sessions and capabilities;
- credential rotation, security audit and incident response are accepted as product duties;
- external side effects have idempotency, receipts or a reconciliation path.

It does not fit:

- single-page Q&A or one-shot batch jobs;
- mutually distrustful customers who must share one application process;
- nobody owning long-term credentials, upgrades and alerts;
- expecting a workspace directory to naturally equal a sandbox;
- expecting the model to infer sender identity, tenant or permissions itself;
- business writes that cannot be deduplicated and have no compensation or manual reconciliation.

## Conclusion: Continuity Is a Controlled Join

OpenClaw's core is not letting one model be "everywhere" across all channels.

It breaks one message into a chain of configurable decisions:

```text
who gets in
  → which agent owns it
  → which history it enters
  → what this turn can do
  → where the result goes back
```

Cross-channel continuity comes from deliberately reducing the identity dimensions of the session key; avoiding crosstalk comes from putting channel, account and peer back into the key in multi-user scenarios. `identityLinks`, meanwhile, is an identity join that needs evidence, preview, audit and revocation design.

The Gateway makes these decisions centralized, visible and testable. It does not guarantee the join is correct for the operator, nor upgrade per-agent state separation into hostile multi-tenant isolation.

**The trustworthiness of a resident Agent ultimately does not depend on how much it can remember, but on whether every merge of "this is the same person, the same session, the same permissions" can be explained and revoked.**

## References

- [OpenClaw v2026.7.1-2 release](https://github.com/openclaw/openclaw/releases/tag/v2026.7.1-2)
- [Gateway architecture at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/architecture.md)
- [Gateway protocol](https://docs.openclaw.ai/gateway/protocol)
- [Agent runtime](https://docs.openclaw.ai/concepts/agent)
- [Agent loop at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/agent-loop.md)
- [Agent runtimes at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/agent-runtimes.md)
- [Multi-agent routing at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/multi-agent.md)
- [Agent bindings](https://docs.openclaw.ai/concepts/agent-bindings)
- [Session management at v2026.7.1-2](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/concepts/session.md)
- [`resolve-route.ts`](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/src/routing/resolve-route.ts)
- [`session-key.ts`](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/src/routing/session-key.ts)
- [`runtime-capabilities.ts`](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/src/agents/runtime-capabilities.ts)
- [Nodes](https://docs.openclaw.ai/nodes)
- [Security](https://docs.openclaw.ai/gateway/security)
- [Multi-tenant hosting](https://docs.openclaw.ai/gateway/multi-tenant-hosting)
- [OpenClaw package manifest](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/package.json)
