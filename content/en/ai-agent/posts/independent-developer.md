---
title: 'Independent Developer Roadmap: From Problem Validation to a Maintainable MVP'
date: 2025-04-15T20:53:12+08:00
lastmod: 2026-07-31T12:00:00+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - Solo Builder
  - Product Strategy
  - Development
  - Git
  - Docker
  - Testing
  - Deployment
categories:
  - Development
description: >
  A practical 2026 roadmap for solo builders: validate demand, choose a minimal stack, ship a maintainable MVP, charge early, and preserve a clear exit path.
cover:
  image: /images/covers/ai-agent/2025/independent-developer.png
  alt: A solo developer's path from problem validation to a maintainable MVP
  caption: A technology stack is not a shopping list. It is a set of commitments you should be able to reverse.
aliases:
  - /projects/independent-developer/
  - /posts/ai-projects/independent-developer/
url: /ai-agent/posts/independent-developer/
tldr:
  - The first MVP is often a paid manual service, not software. Prove the problem, its frequency, and willingness to pay before automating it.
  - A minimal stack reduces the number of languages, runtimes, and sources of truth. Familiar, ordinary technology usually reaches real users faster.
  - Tests, CI, logs, and backups are external memory for a one-person team. Build guardrails around the failures that would cost the most.
  - Managed services buy speed, but databases, authentication, payments, and analytics still need an export path, replacement plan, and known exit cost.
  - Launch is the start of maintenance. Every feature should justify who uses it, what it improves, what it costs, and when it should be removed.
---

Independent development creates a seductive illusion: once the stack is chosen, the product is halfway built.

I used to make long lists—frontend framework, database, authentication, payments, email, analytics, monitoring. The more complete the list looked, the safer I felt. But that safety came from the feeling of construction, not from evidence that anyone needed the thing.

My rule is simpler now: **the scarce resource for an independent developer is not code. It is the ability to place limited attention on the right problem.** A stack should help you move cheaply, learn quickly, and reverse a decision while the evidence is still thin.

This guide follows a product from problem validation to maintenance and, if necessary, shutdown. It does not rank fashionable tools or repeat prices and free-tier limits that may be obsolete next month. Product boundaries mentioned below reflect official documentation available on **July 31, 2026**. Before adopting a service, verify its current regions, quotas, terms, and data-processing commitments yourself.

## Validate the Problem Before You Validate the Technology

A problem worth building around usually has three signals:

1. **A specific person:** not “creators,” but “Chinese SaaS founders who organize customer interviews three times a week.”
2. **A cost that already exists:** the person uses a spreadsheet, hires help, copies and pastes, or tolerates recurring mistakes. If there is no present workaround, there may be no urgency.
3. **An observable commitment:** they share real data, schedule another session, introduce a colleague, or—best of all—pay. “That sounds useful” is politeness, not proof.

I begin with roughly ten problem interviews, without treating ten as a magical number. I ask about the past: When did this last happen? What did you do? How long did it take? What happened when it failed? I avoid “Would you use a product that…?” because people are generous with imaginary futures.

Then I deliver the result manually. A form collects the input; I do the essential work behind the scenes; the user receives the outcome. This concierge version is intentionally unscalable. If nobody returns for the manual service, automation will only let me travel faster in the wrong direction.

### The validation gate

Before building the product, I want at least two of these:

- different people in the same narrow segment describe the same recurring problem;
- a user gives me real data or invests time in setup;
- the delivered result is used, not merely praised;
- someone prepays, subscribes, or makes a concrete trial commitment;
- a user comes back without being chased.

If the evidence is absent, narrow the audience or change the problem. **Sunk cost is not a reason to continue. It is merely an expensive form of feedback.**

## Draw the Smallest Loop, Then Choose the Smallest Stack

An MVP is not a polished product with fewer features. It is the shortest loop that tests the riskiest assumption:

```text
Target user arrives → provides essential input → receives the core result
→ takes the next action → I can observe the outcome
```

Everything outside that loop can wait. Team workspaces, themes, elaborate roles, plugin systems, native apps, and multi-region failover may all be sensible later. At the beginning, there is no evidence that they belong ahead of the first useful delivery.

My default is one primary language, one relational database, and one deployment path. If I can build the backend confidently in Go or Python, I do not add another runtime for fashion. If a mature full-stack framework can serve both pages and APIs, I do not begin with microservices. For one person, context switching is an infrastructure cost.

### Decisions by product stage

| Stage | Uncertainty to remove | Sufficient implementation | Defer for now | Signal to advance |
| --- | --- | --- | --- | --- |
| Problem discovery | Who hurts, when, and why now? | Interviews, landing page, form, manual service | Full accounts, automation | Users commit time, data, or money |
| Chargeable prototype | Is the core result valuable? | Monolith, one database, manual operations screen | Microservices, complex roles, native apps | Repeat use or payment |
| Repeatable delivery | Can I serve a small group reliably? | Essential tests, CI, logs, backups, payment webhooks | Multi-region systems, event buses, abstractions | Failures begin to affect real customers |
| Stable growth | Where is the measured bottleneck? | Add caching, queues, or monitoring to that bottleneck | A rewrite for hypothetical scale | Metrics show a persistent constraint |
| Contraction or exit | What is still worth maintaining? | Export, migration, downgrade, shutdown workflow | Features intended to hide poor retention | Revenue, use, or strategy no longer holds |

The most valuable column is “Defer for now.” Independent development is not simply company development with fewer people. Attention lost to complexity cannot be replenished by another team.

## Database and API: Keep the Boundary in Your Hands

### Start with a relational database

Most subscription products, utilities, and content applications can begin with PostgreSQL or MySQL. Users, orders, permissions, and state transitions benefit from constraints and transactions. I add a document store, vector database, or time-series database only when a demonstrated access pattern makes the relational model the wrong tool.

Even an early schema deserves a few durable rules:

- give every business record a stable ID, creation time, and update time;
- store money as integers in the smallest currency unit or as fixed-precision decimals, never floating point;
- constrain important states instead of treating arbitrary strings as a state machine;
- enforce uniqueness, foreign keys, and access controls close to the data;
- version schema changes and document either rollback or a forward repair;
- export regularly and rehearse a restore—having a backup is not the same as being able to recover.

[Supabase](https://supabase.com/docs/guides/getting-started/architecture) is built around PostgreSQL and combines managed authentication, storage, realtime features, and other services. That integration removes assembly work; it does not remove responsibility for row-level security, key isolation, migrations, or recovery. [PlanetScale](https://planetscale.com/docs/what-is-planetscale) provides managed relational database products based on Vitess and PostgreSQL. Its Vitess path is MySQL-compatible, but compatibility is not identity; review the documented [MySQL compatibility constraints](https://planetscale.com/docs/vitess/troubleshooting/mysql-compatibility) before a migration.

I do not choose a distributed database because the product might someday become large. I ask concrete exit questions instead: Can I export standard data? Can I reproduce the setup locally? Is the application coupled to a proprietary SDK? How many queries and authorization rules would a migration rewrite?

### Design the contract before the framework

An internal API still needs explicit inputs, outputs, errors, and authorization. REST is enough for many MVPs. GraphQL, RPC, and event-driven designs should be earned by real client-composition, throughput, or asynchronous workflow needs.

For every create operation, decide:

- who may call it and where identity comes from;
- how input is validated and unknown fields are handled;
- whether a retry creates a duplicate;
- how success, business conflict, and system failure differ;
- which request ID appears in logs and which sensitive values never do;
- how long an older client contract remains supported.

Payment callbacks, email jobs, and third-party webhooks will be duplicated, delayed, and delivered out of order. Design for that reality. An event ID or business uniqueness constraint is cheaper than deleting duplicate orders during an incident.

## Git, Docker, and CI: Put Personal Memory into the System

Git matters even when nobody else commits. It makes each change explainable and reversible. I prefer small commits with one intention, messages that capture why, and short-lived branches. Secrets never enter the repository; `.env.example` contains names and harmless examples only.

Docker is not an admission ticket for an MVP. If a managed platform builds reliably from the repository and local development matches production, a container may add no immediate value. I introduce it when:

- the application depends on system libraries or several processes;
- CI and local environments repeatedly disagree;
- the workload must move between hosts;
- workers or self-hosted services need a consistent runtime.

A production image should pin meaningful base versions, run as a non-root user, expose a health check, and keep state in an external database or object store. Do not leave the only database file inside an application container that can be replaced at any time.

The smallest useful CI pipeline is:

```text
format and static checks → unit/integration tests → build → migration check
```

A successful main-branch build may trigger deployment. Production migrations and irreversible operations still deserve an explicit gate. CI is not ceremonial plumbing; it stops a tired future version of me from shipping a known mistake.

## Testing: Protect the Most Expensive Failure

“An MVP does not need tests” mistakes testing for maximizing coverage. A solo product needs tests allocated by risk:

1. unit-test pure business rules such as pricing, permissions, and state transitions;
2. integration-test database queries, authentication, and third-party adapters;
3. end-to-end test only a few critical journeys—signup, the core task, payment, and cancellation;
4. keep a pre-release checklist for work that cannot be automated reliably.

[Cypress](https://docs.cypress.io/app/end-to-end-testing/writing-your-first-end-to-end-test) can exercise browser journeys; Playwright and other tools can do the same. The framework is not the important decision. End-to-end tests are slower and more sensitive to their environment, so reserve them for paths that can directly damage revenue or trust.

My minimum release line is:

- a new user can reach the core result;
- authorization tests prove that one user cannot read another user's data;
- payment and quota operations tolerate safe retries;
- the migration has run in a temporary environment;
- errors are recorded and correlated with a request;
- the previous version has a known rollback path.

Coverage can reveal a blind spot, but it cannot certify reliability. One test proving that a repeated webhook cannot grant or charge twice is worth more than ten tests coupled to implementation details.

## Deployment, Payments, and Analytics: You Outsource Work, Not Responsibility

### Deployment

[Vercel](https://vercel.com/docs/functions) is designed around supported web frameworks and function runtimes. [Cloudflare Pages and Workers](https://developers.cloudflare.com/pages/) combine static delivery with an edge-oriented execution model. Both can shorten the path to a public URL, and both have runtime, duration, package, region, and plan-specific boundaries. Verify those boundaries before moving a conventional long-running process into a function, and do not assume compute is automatically close to the database.

My deployment checklist outlives any provider:

- separate development, preview, and production;
- assign responsibility for domains, TLS, least privilege, and secret rotation—even if that person is always me;
- keep compute and data near each other, while reviewing residency and cross-border requirements separately;
- include request IDs in structured logs, but never passwords, tokens, or complete payment details;
- maintain health checks, error alerts, backups, and a rehearsed restore;
- know how to export the data and start the application elsewhere.

### Payments

A payment button is the smallest visible piece of an order, entitlement, refund, tax, dispute, and reconciliation state machine. Choose a provider only after deciding the target market, business entity, settlement country, and tax responsibilities.

A payment processor such as Stripe and a Merchant of Record such as [Lemon Squeezy](https://docs.lemonsqueezy.com/help/getting-started/what-is-lemonsqueezy) have different responsibility boundaries. A Merchant of Record can take responsibility for parts of the transaction and tax process within its agreement. That does not imply the developer has no filing, privacy, or consumer-protection duties in every jurisdiction. Supported countries, payment methods, fees, and review rules change; confirm them in official terms on the day you integrate.

Never treat a “payment succeeded” screen in the browser as truth. Update entitlements only after server-side webhook verification. Store the external event ID and state, tolerate duplicates and reordering, and leave yourself a manual reconciliation path.

### Analytics

Collect only data that can change a decision. An MVP commonly needs four event groups:

- a visitor reached the value proposition;
- they started and completed the core task;
- they failed or left at a known step;
- they returned and paid.

[Umami](https://docs.umami.is/docs) is designed to reduce personal-data collection and can operate without cookies. That alone does not prove that every deployment, configuration, and jurisdiction is exempt from consent requirements. Custom event payloads, IP handling, hosting location, data combination, and the user's jurisdiction all matter. The privacy notice must describe what the product actually collects; seek professional advice when the risk warrants it.

Do not record every click “for later.” More collection creates more privacy responsibility, interpretation work, and noise.

## Maintenance and Exit Cost: Interest Starts Accruing at Launch

For every external service, I keep a short dependency card:

| Question | Required answer |
| --- | --- |
| What work does it take over? | Data, identity, builds, payments, or observability |
| Where does the data live? | Region, format, retention, and backup method |
| How do I leave? | Export command, alternative, and likely rewrite surface |
| What happens when it fails? | User impact, degraded mode, and manual recovery |
| Who can access it? | Secret location, permission scope, and rotation method |
| When will I review it? | A metric threshold or a fixed review date |

Planning exit cost does not mean avoiding SaaS. I gladly buy capabilities I do not yet need to master. I simply refuse to make migration a problem for an exhausted future self. Standard SQL, ordinary object formats, narrow adapters, and regular exports are inexpensive escape routes.

Each month I review only signals that can change an action: activation, retention, paid conversion, errors, recovery time, and cost to serve one user. If nobody uses a feature, delete it. If manual work grows with every customer, automate it. If infrastructure cost rises without an increase in user value, inspect the design before upgrading the plan.

A shutdown also deserves a design: notify users, stop renewals, offer exports, handle refunds and legal retention, revoke keys, and remove data that no longer has a reason to exist. A system you can end responsibly is a system you truly own.

## If I Started Again Today

I would work in this order:

1. write one page defining the user, situation, present alternative, and riskiest assumption;
2. interview real users and manually deliver one useful result;
3. build only the core loop as a monolith in the language I know best;
4. choose one relational database and define constraints, migrations, and exports first;
5. preserve small changes in Git and run checks, tests, and builds in CI;
6. end-to-end test the critical journey and deploy a preview environment;
7. add server-verified payments and the minimum decision-changing analytics;
8. rehearse logging, alerting, backup, restore, and exit paths once;
9. choose the next task from user behavior, not from technology news.

AI can generate scaffolding, test drafts, and migration plans. It cannot prove that a user is in pain, and it cannot assume production responsibility. Generated code still needs contract, dependency, security, and test review. Speed is useful when it gets evidence sooner; it is harmful when it only accumulates code nobody can explain.

## A Stack Is a Set of Commitments

Choosing a database is a commitment about how you hold other people's data. Choosing payments is a commitment about money and entitlement. Choosing a deployment platform is a commitment about recovery. Choosing analytics is a commitment not to collect merely because you can.

So I no longer begin with “Which tool is strongest?” I begin with three questions:

> What is the most dangerous unknown right now?
>
> What is the smallest loop that can test it?
>
> If I am wrong, can I leave cheaply?

The freedom of independent development is not access to every tool. It is knowing which commitments do not need to be made yet. Delay complexity until evidence earns it, keep an exit inside the design, and put one real result into a user's hands as early as possible.
