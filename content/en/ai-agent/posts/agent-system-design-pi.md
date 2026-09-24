---
title: "Pi by Subtraction: What the Minimal Agent Kernel Keeps and Who Takes Responsibility"
date: 2026-08-07T16:40:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Harness Engineering
  - Open Source
  - Development
  - Security
  - Context Engineering
description: >
  Trace Pi v0.84.1's agent loop, default tools and JSONL sessions to see what a minimal kernel keeps and who takes over security, recovery and workflow decisions.
tldr:
  - Pi's minimal kernel can shrink to a provider-neutral stream, message state, a tool loop, result feedback, events and interrupts; Plan, Todo, MCP, subagents, approvals and background processes are not prerequisites of agenthood.
  - "`pi-agent-core` and `pi-coding-agent` serve different roles: the former owns the loop and state, while only the latter adds default tools, prompt, resource loading, session tree, compaction, TUI and extensions."
  - The JSONL session tree is the authoritative conversation history, and the model context is only a derived view of the current leaf; switching session branches does not roll back the worktree, and compaction can be lossy.
  - Project trust only stops a repository from loading project configuration and executable extensions before approval. Pi has no built-in sandbox, extensions run with the same rights as the Pi process, and real isolation must come from the OS, a container or a micro-VM.
  - Minimalism does not eliminate complexity. It hands workflow, security, acceptance, Git recovery, multi-Agent conflicts and enterprise governance back to users, package authors and the embedding host.
series:
  name: Agent System Design Anatomy
  slug: agent-system-design
  order: 2
  total: 11
columns:
  - agent-system-design
cover:
  image: /images/agent-system-series/02-pi/pi-minimal-kernel.en.svg
  alt: 'The Pi minimal agent kernel, the detachable extension rail, provider and host OS trust boundaries, and the JSONL session tree below'
---

By default Pi hands the model only four tools: `read`, `bash`, `edit`, `write`.

It has no built-in Plan Mode, Todo, MCP, subagent, permission popup or background bash. Reading this far, it would be easy to write Pi as a hymn to minimalism: four tools are enough, and every complex framework can be deleted.

The more useful question is tougher. After you delete a capability, where does the duty it used to carry go?

Plan can become `PLAN.md`, background processes can go to tmux, a subagent can be another Pi process, and MCP can be replaced with a CLI plus README. But once permission and sandbox are deleted, the Bash commands the model emits directly inherit the OS rights of the user who launched Pi; once workflow moves into an extension, the extension itself gains the same system access as the Pi process. The cost of minimalism never shows up only as "fewer features" — it also returns choices, integration and incident consequences to the user.

This article freezes **Pi v0.84.1**, whose release tag commit is `53fa77ccd8a279eb87e92294ef3687b03ff80112`, released on 2026-08-07. Pi is an MIT-licensed open-source TypeScript / Node.js monorepo; on the research day `main` had already moved to another commit, so source-code judgment is uniformly pinned to the release tag, and `pi.dev/docs/latest` serves only as the research-day current documentation, never mixed into the same version's facts. [v0.84.1 release](https://github.com/earendil-works/pi/releases/tag/v0.84.1)

## The Minimal Kernel First Keeps a Closed Loop

If you strip away TUI, sessions, skills, extensions, Git and project rules, the source of `@earendil-works/pi-agent-core` still forms a usable Agent:

```text
messages + tools + model
          │
          ▼
 provider-neutral stream
          │
   assistant tool call
          │
          ▼
 validate → execute tool
          │
       tool result
          └──────────────► messages → next turn
```

[`agent-loop.ts`](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/agent/src/agent-loop.ts) writes this path very directly:

1. add the new prompt to context;
2. optionally `transformContext` the messages;
3. convert to LLM messages acceptable to the provider;
4. call the model as a stream;
5. collect, validate and execute tool calls;
6. add tool results back to context;
7. continue while there are tool calls or steering messages;
8. end when the model stops calling tools and the queue is empty;
9. error, abort, `shouldStopAfterTurn` or tool termination can also stop it.

A minimal Agent kernel therefore needs at least:

- a model streaming call interface;
- `systemPrompt + messages + tools`;
- assistant/tool message conversion;
- tool argument validation and execution;
- result feedback;
- loop, abort and stop;
- an event stream so the host can observe turns, messages and tool execution.

Plans, roles, task graphs, approval UX, Git checkpoints and the session database do not enter this list of prerequisites. The model owns the probabilistic next step; the kernel only ensures the loop, tool execution and feedback can happen.

One important qualification: this describes an **agent loop kernel**. A genuinely usable coding harness also needs default tools, project context, persistent sessions, compaction, resource discovery and an interactive interface. Pi puts them in another package.

## Diagram: What the Minimal Usable Kernel Actually Keeps

![Pi minimal kernel and pushed-out responsibilities](/images/agent-system-series/02-pi/pi-minimal-kernel.en.svg)

**Reading guide:** At the center is the small `pi-agent-core` kernel: message state, provider stream, tool loop, events and abort/stop. The provider adapter above shows that the model vendor is replaceable; the outer ring of prompt, default four tools, resource loader, TUI, session manager and compaction belongs to `pi-coding-agent`. Further out, Plan, MCP, subagent, permission, Git checkpoints and background processes reconnect through extensions, packages or ordinary OS tools. The JSONL tree below stores full conversation branches, and the active context only projects the current leaf. The red boundary reminds: extensions run inside the host process, and project trust does not form a sandbox.

## Pi Actually Has Two Layers of "Core"

When people talk about Pi core, they often mash two different sets of responsibilities together.

### `pi-agent-core`: Loop, State and Events

The source comments on [`agent.ts`](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/agent/src/agent.ts) are explicit: `Agent` owns the current transcript, emits lifecycle events and executes tools.

It maintains:

- current messages;
- model, thinking level and system prompt;
- available tools;
- streaming and active run state;
- pending tool calls;
- steering and follow-up queues;
- `AbortController`;
- policy injection points such as `beforeToolCall`, `afterToolCall`, `prepareNextTurn`, `shouldStopAfterTurn`.

Default-allowed tools may run in parallel; if just one tool declares itself sequential, the whole batch runs sequentially. If model output is truncated by token length, Pi does not gamble on possibly incomplete arguments but generates a failed tool result and asks the model for a complete call again.

This layer has no TUI and no resource discovery. It provides mechanism and seams, letting the embedding caller decide how context transforms, how tools are constrained and when to force a stop.

### `pi-coding-agent`: a Resumable Terminal Product

`@earendil-works/pi-coding-agent` wraps the loop into a product developers can use directly:

- default system prompt;
- the four active tools `read / bash / edit / write`;
- `grep / find / ls`, off by default but enableable;
- context assembly for `AGENTS.md`, `CLAUDE.md`, skills and the cwd;
- a resource loader;
- JSONL session tree;
- compaction and branch summaries;
- TUI, JSON, RPC and SDK entry points;
- extension and package runtime.

[`agent-session.ts`](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/coding-agent/src/core/agent-session.ts) is the bridge between the two layers: it subscribes to core events, writes messages into SessionManager, triggers extension hooks, manages auto-compaction and retries, and refreshes prompt, tools, model and thinking level before the next turn.

Pi's "minimalism" is therefore not just a few hundred lines of loop. It is **encapsulating the minimal mechanism separately first, then letting the default coding shell and third-party extensions assemble around it**. The layering matters more than the line count.

## The Provider Is Part of the Kernel

Pi does not treat any model vendor as its product identity. `@earendil-works/pi-ai` unifies the main messages and streaming events of Anthropic Messages, OpenAI Chat/Responses, Codex Responses, Google, Vertex, Bedrock, Mistral and other APIs. [`pi-ai` types](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/ai/src/types.ts)

The public contract includes:

- text, thinking, image, toolCall, toolResult;
- `sse / websocket / websocket-cached / auto` transports;
- stop reasons like `stop / length / toolUse / error / aborted / deferred`;
- custom fetch, headers, provider env, timeout and retry options;
- provider registration, override and custom stream implementations.

The unified interface absorbs the shared structure of model calls without pretending providers are fully equivalent. Each adapter reads only the options it understands; thinking, caching, tool calling, retry, cost reporting and context handoff can still differ.

This is an easy-to-underestimate choice inside Pi's small kernel: **model replaceability is placed in the substrate instead of being left to upper product layers as ad-hoc patches.** For people building their own harness, a provider-neutral message and event contract may be closer to kernel capability than Plan Mode.

The price is abstraction leakage. Best-effort cross-provider session migration does not mean reasoning metadata or tool semantics are fully preserved; exact billing, retries and error classification still require the embedding host to understand the specific provider.

## Session Tree: Full History Separated from the Model's View

Pi's session is not a linear chat log. It is an append-only JSONL tree.

[`session-manager.ts`](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/coding-agent/src/core/session-manager.ts) shows that every entry has `id` and `parentId`, and SessionManager maintains the current `leafId`:

```text
root
 └─ user A
    └─ assistant A
       ├─ user B
       │  └─ assistant B   ← active leaf
       └─ user C
          └─ assistant C
```

`/tree` moves the current leaf and then continues appending from the old position; `/fork` creates a new session file; `/clone` copies the current active branch. Old entries are never rewritten.

A very clean state layering appears here:

- **authoritative conversation history**: the whole JSONL tree;
- **current model context**: the path from the active leaf back to the root along `parentId`;
- **compaction view**: the latest compaction entry replacing a stretch of old messages in the active context;
- **persisted extension state**: CustomEntry can stay in the session but stays out of the model by default;
- **model-visible extension messages**: CustomMessageEntry explicitly enters the context.

Context is therefore a projection of durable session state. Compaction can be lossy while the complete old history stays on disk; the model, however, does not automatically reread all of it. A branch summary is also a model-generated digest that can miss facts from the abandoned branch.

The more critical boundary is the workspace: **a branch of the session tree is not a filesystem branch.** When `/tree` moves back to an early conversation leaf, the disk may still hold modifications produced by later conversations. Pi does not make JSONL entries, file changes and Git commits one transaction.

This is exactly the complexity a minimal kernel does not own: conversation recovery has a clean data structure, while workspace rollback goes to Git, container snapshots or extensions.

The simplified session below demonstrates these three layers of state, with rules taken from the Pi v0.84.1 body text. Click messages in the tree or toggle compaction to compare the current branch path with the context the model actually sees. The figure uses preset data and does not run Pi.

{{< interactive kind="session-tree" id="session-tree" spec="session-tree-v1" >}}

Keep your eyes on the workspace layer: no matter which old branch you move the active leaf back to, the workspace snapshot does not move. Branching recovers conversation context, not the filesystem; compaction is the same — it only changes the projection, and the full tree is always there.

## The Resource Loader Is the Startup Control Plane

If a small kernel allows arbitrary extensions, startup order itself becomes a security question. Pi's `DefaultResourceLoader` discovers uniformly:

- settings;
- packages;
- extensions;
- skills;
- prompt templates;
- themes;
- system prompt additions;
- `AGENTS.md` / `CLAUDE.md` context files.

[`resource-loader.ts`](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/coding-agent/src/core/resource-loader.ts) has a bootstrap worth borrowing: it first treats the project as untrusted and loads user/global and CLI extensions, completes the project trust decision, then reloads project resources according to the final trust state. This way, a not-yet-trusted repository cannot run its own extensions first to decide "whether to trust itself".

Skills use progressive disclosure. What stays in the resident system prompt is mainly name and description; the full `SKILL.md` is loaded on demand by the model with `read`. If extensions register same-name tools, commands or flags, the loader can also produce a collision diagnostic.

This part already goes beyond the bare loop yet stays replaceable: an SDK host can swap the ResourceLoader and construct a different product from a database, a remote package index or enterprise configuration.

## The Extension Rail: Extensibility Comes with Full Permissions

A Pi extension is an in-process TypeScript / JavaScript module. It can:

- register or replace tools, commands, providers, flags and renderers;
- intercept user input;
- modify the system prompt before the Agent starts;
- observe or rewrite provider request/response;
- block before `tool_call`;
- modify tool results;
- control session switch, fork, tree and compaction;
- persist custom session entries;
- launch arbitrary local processes.

This extension seam is strong enough that permission gates, protected paths, subagents, MCP, Git checkpoints, sandbox routing and complete workflows can all be added back as packages. [Extensions](https://pi.dev/docs/latest/extensions)

It is also dangerous enough. Extensions run with the same rights as the Pi process: they can read credentials, modify sessions, launch commands and replace providers. Pi packages support npm, Git and local sources, and missing packages can even be installed after a project is trusted; the official docs therefore warn directly that packages have full system access and installers must review the source. [Packages](https://pi.dev/docs/latest/packages)

A plugin marketplace often primes you to expect "feature modules"; a Pi package is closer to "installing a program with local machine rights into the Agent runtime". Composability is an API boundary; it does not automatically become a security boundary.

## What Project Trust Guards, and What It Lets Pass

[Pi Security](https://pi.dev/docs/latest/security) defines project trust narrowly:

- it decides whether project-level settings, resources, packages and extensions load;
- it asks by default when dynamic project resources exist;
- the decision is stored by canonical directory in `~/.pi/agent/trust.json`;
- non-interactive mode shows no popup and follows the global default or CLI override.

It explicitly does not do three things:

1. it does not constrain how the model uses tools after startup;
2. it provides no sandbox for Bash, network or credentials;
3. `AGENTS.md` / `CLAUDE.md` context can still load by default.

So rejecting project trust can stop a repository from executing its own TypeScript extensions, but it cannot stop repository docs from feeding malicious text to the model, nor stop the model from touching local resources with default Bash access.

This is not a documentation hole. Pi publicly places prompt injection and local agent risks outside its product security boundary; it only promises not to let unapproved projects silently change startup configuration and executable resources.

## Having No Built-In Sandbox Is a Deliberate Trade-Off

Pi has no built-in filesystem, process, network or credential permission system. Default tools and extensions inherit the OS user rights of whoever launched Pi.

The official reason deserves serious attention: a partial in-process sandbox still depends on the host shell, filesystem, package manager, credentials and extension code, and can easily make users mistake incomplete restrictions for real isolation. A true boundary should come from the operating system, a virtual machine or a container. [Security](https://pi.dev/docs/latest/security)

The deployment options officially listed show exactly how responsibility moves outward:

- **the whole Pi process in Docker / OpenShell**: model loop, tools and extensions all inside the outer isolation;
- **host Pi + Gondolin micro-VM**: Pi and provider credentials stay on the host while built-in tools are routed into the micro-VM;
- **minimal mounts and short-lived credentials**: give only the files, network and keys the task needs.

These options have boundaries too:

- a read-write bind mount can still modify the host workspace;
- mounting `~/.pi/agent` into a container exposes auth, settings, trust decisions and sessions;
- Gondolin isolates only forwarded built-in tools; third-party extension tools may keep executing on the host;
- the external sandbox's policy, updates, tenant isolation and recovery belong to the operator.

Pi's security aesthetic is not "the fewer security mechanisms the better". The more accurate statement is: **it never promises isolation at a layer where no complete boundary can form.** This choice is honest, and it also puts the default risk of running bare Pi directly on the user.

## Where the Things Removed from Core Actually Go

| What Pi deliberately omits | Replacement path | New owner of the duty |
|---|---|---|
| Plan Mode | direct prompting, `PLAN.md`, extension | user / workflow author |
| Todo | `TODO.md`, extension | user / repository |
| MCP | CLI + README, Skill, extension | CLI author / package author |
| Subagent | bash, tmux, another Pi, package | user / orchestrator author |
| Permission popup | tool gate extension, external policy sandbox | extension / operator |
| Sandbox | Docker, OpenShell, Gondolin, VM | host / platform operator |
| Background Bash | tmux, extension process manager | user / extension |
| Git checkpoint | Git commands, checkpoint extension | repository owner |
| Completion eval | tests, CI, review, stop extension | user / embedding host |
| Enterprise RBAC / audit | SDK/RPC outer platform | integrator / organization |

This table reveals the real aesthetic of Pi's design: it does not compete for the definition of "the one correct workflow". Plain files, Git, tmux, CLI, containers and packages are all replaceable external components.

The problems live in the same table. Different extensions can have completely different semantics for context inheritance, permission inheritance, failure propagation, idempotency, cleanup and UI; a team cannot infer behavior from "it is a Pi package" alone.

## Counterfactual: Stuff All of These Abilities Back into the Kernel

Suppose Pi built in:

- a fixed Plan;
- a Todo state machine;
- an MCP client;
- one subagent topology;
- a set of permission popups;
- a background process manager;
- a Git checkpoint policy.

Users would get a fuller, more consistent out-of-box experience. Teams could document, train and support more easily.

The kernel would simultaneously have to answer a mass of questions that have no universal answer:

- must a Plan be approved by a human?
- how does Todo synchronize with model context?
- when do MCP tool schemas load?
- which prompts, credentials and tools do subagents inherit?
- which commands should pop up, and what about non-interactive mode?
- how are background processes recovered, cleaned up and fed stdin?
- who stashes a dirty Git worktree, and when to commit?

These answers would turn an embeddable substrate into a coding agent with product biases. That is not necessarily worse, only a different category.

Pi chooses to keep the most stable, composable mechanisms in core and push organizational preferences to the outer layers. This resembles the Unix compositional outlook, but the analogy stops there: a Pi extension is not a low-privilege little process, and default Bash has no capability sandbox. The composability of Unix pipes cannot magically supply Pi with security isolation.

## How to Audit Your Own Agent Kernel with Pi

If you are writing an Agent loop, Pi's value is not a feature list to copy but a deletion test.

For every capability about to enter core, ask five questions:

1. **Without it, can the model–tool–feedback loop still run?**
2. **Does it express a stable mechanism, or one team's workflow preference?**
3. **Once externalized, is there still a clear API, event and persistence location?**
4. **Who takes over security, recovery, compatibility and upgrade duties?**
5. **Could users mistake a compositional interface for a strong isolation boundary?**

Some things are fit for deletion:

- specific approval copy;
- specific task graphs;
- specific providers;
- specific multi-Agent roles;
- specific Git workflows.

Some things must be explicitly handed over once deleted:

- abort and error propagation;
- tool argument validation;
- provider stop reasons;
- session durability;
- extension startup order;
- OS permission and credential boundaries;
- concurrent write conflicts;
- idempotency and recovery of external side effects.

The criterion for a minimal kernel therefore should not be lines of code. It must make mechanisms replaceable while giving every duty a name.

## My Judgment: Borrow Pi's Subtraction, Not Its Default Risks

Pi's strength is reducing the Agent back to an understandable state loop. Provider, loop, tools, events and abort form the small kernel; the coding shell, session tree, resource loader and extensions form a replaceable harness; plain files and OS tools keep carrying planning, tasks, concurrency and versioning.

This structure suits developers familiar with shell, Git, containers and supply-chain risk, and teams that want to embed via SDK/RPC, pick their own provider and build their own product layer. It does not suit zero-trust, strong-audit, central-RBAC or multi-tenant environments without hardening first.

I would borrow three of its subtractions:

- the kernel owns only stable mechanisms;
- session state and model context are explicitly separated;
- the extension seam comes before built-in workflows.

I would not treat security as a product preference you can delete at will. Bare Pi hands consequences to the current OS user, and extensions hold equal rights. If a task touches untrusted repositories, long unattended runs or remote side effects, an outer container, credential scope, Git/CI acceptance and recovery policy must land before "minimalism".

A small kernel is very free. The other face of freedom is that the host must really be a host.

## References

- [Pi v0.84.1 release](https://github.com/earendil-works/pi/releases/tag/v0.84.1)
- [Pi repository at v0.84.1](https://github.com/earendil-works/pi/tree/53fa77ccd8a279eb87e92294ef3687b03ff80112)
- [Pi Agent loop source](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/agent/src/agent-loop.ts)
- [Pi Agent state source](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/agent/src/agent.ts)
- [Pi SessionManager source](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/coding-agent/src/core/session-manager.ts)
- [Pi ResourceLoader source](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/coding-agent/src/core/resource-loader.ts)
- [Pi AgentSession source](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/coding-agent/src/core/agent-session.ts)
- [Pi AI types](https://github.com/earendil-works/pi/blob/53fa77ccd8a279eb87e92294ef3687b03ff80112/packages/ai/src/types.ts)
- [Pi usage](https://pi.dev/docs/latest/usage)
- [Pi extensions](https://pi.dev/docs/latest/extensions)
- [Pi packages](https://pi.dev/docs/latest/packages)
- [Pi security](https://pi.dev/docs/latest/security)
- [Pi sessions](https://pi.dev/docs/latest/sessions)
- [Pi compaction](https://pi.dev/docs/latest/compaction)
- [Pi containerization](https://pi.dev/docs/latest/containerization)
- [Pi author: Pi coding agent design rationale](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)
- [Pi author: What if you do not need MCP?](https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/)
