---
title: 'AI Knowledge Workflow: From Information to Records, Knowledge, and Creation'
ShowRssButtonInSectionTermList: true
date: '2026-07-11T14:00:00+08:00'
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - LLM
  - Personal Growth
  - Context Engineering
  - Product Strategy
  - Self-Discovery
  - Automation
categories:
  - Development
description: >
  A practical AI knowledge workflow for moving information through traceable records and verified knowledge into audience-ready creation with human review.
cover:
  image: '/images/columns/info-to-creation/zh-01-framework.svg'
  alt: Information crossing intake gates into records, verified knowledge, audience-facing creation, and a measured feedback loop
tldr:
  - "Information, records, knowledge, and creation are four operating states in my workflow, not a universal taxonomy. The model exists to make handoffs and responsibilities visible."
  - "Every promotion preserves provenance: source, date, scope, evidence, sensitivity, owner, status, and next action. AI may assist; a human remains accountable for the transition."
  - "AI risk does not belong to one layer. Prompt injection, omitted qualifiers, transcription errors, retrieval misses, scope drift, invented experience, and vanity-metric optimization can appear across the pipeline."
  - "The responsibility rule is simple: the harder a claim is to reverse, the more firsthand it sounds, and the more it can affect another person, the stronger its evidence and human review must become."
  - "The pipeline is a loop, not a conveyor belt. Creation feedback returns as untrusted information, passes the gates again, and may correct or retire earlier knowledge."
maturity: budding
columns:
  - info-to-creation
series:
  name: From Information to Creation
  slug: info-to-creation
  order: 1
  total: 5
---

## Four Names for Four Different Kinds of Work

My notes used to grow in one direction: inward. Links entered, fragments accumulated, folders changed names, and the archive became heavier. I mistook possession for processing.

AI made that mistake cheaper to repeat. A model can generate, summarize, classify, and reformat text quickly, but speed does not turn a source into evidence, an observation into knowledge, or a draft into something I should publish. It can make the warehouse larger without improving the machinery.

So I split my workflow into four operating states:

```text
Information
   │ intake gates
   ▼
Records
   │ clarification and evidence
   ▼
Knowledge
   │ explicit retrieval and scoped reuse
   ▼
Creation
   │ audience delivery and measured feedback
   └───────────────────────────────▶ Information
```

This is not a universal taxonomy of human learning. A source can skip a state; one artifact can play different roles in different tasks; a published article can become information for a later investigation. The four names are useful because they force me to answer a practical question at every handoff:

> What changed, who is responsible now, and what evidence allows this artifact to move?

The workflow is less a conveyor belt than a customs route. Each border has a different passport.

## The Whole Workflow on One Page

| Layer | Input | Main work | Output | AI may assist | Human remains responsible | Acceptance test |
|---|---|---|---|---|---|---|
| Information | external sources, feeds, documents, observations | relevance, provenance, freshness, rights, sensitivity, cost, verification | an AI-safe, redacted, human-only, time-boxed, or rejected action | deduplication, classification, source-bound summary | task, upload boundary, source quality, edge cases | source is traceable and the action is justified |
| Records | a source or event worth preserving | capture, clarify fact vs interpretation, add context and next action | `captured`, `clarified`, `reviewed`, `promoted`, or `discarded` record | transcription, timestamps, missing-field questions | consent, firsthand truth, evidence, sensitive data | another person can reconstruct what happened |
| Knowledge | reviewed records and protected references | state, scope, counterevidence, testing, retrieval, review | `draft`, `imported`, `tested`, or `retired` card | retrieval, comparison, conflict and staleness flags | admission, scope, exceptions, review and retirement | claim is supported, retrievable, scoped, and reversible |
| Creation | scoped knowledge plus current research | define reader task, choose claim and container, draft, verify, publish | audience-ready work plus creation record | outline, variants, compression, format adaptation | evidence, lived experience, voice, final approval | reader promise is fulfilled and claims remain supported |

The layers are different, but one rule travels through all of them:

```yaml
provenance:
  source: "where this came from"
  captured_at: "when I obtained or observed it"
  scope: "where the claim applies"
  evidence: "what supports it"
  sensitivity: "who may see or process it"
  owner: "who accepts responsibility"
  status: "what has happened to it"
  next_action: "what should happen next"
```

If a handoff loses this passport, the next layer inherits confidence without history. That is how a polished summary becomes a false fact and how a personal trick becomes universal advice.

## Information: Guard the Entrance

Information is not “whatever I can feed to AI.” It is incoming material waiting for an action.

The entrance checks task relevance, source quality, freshness, uniqueness, sensitivity, rights, processing cost, and verifiability. The result may be safe for AI, safe only after redaction, human-only, suitable for a time-boxed scan, or rejected.

That distinction matters because capture authority is not upload authority. Credentials, customer data, private conversations, regulated information, and copyrighted paid material do not become safe merely because they entered my notes. Product and feature retention also differ. Anthropic's current [API and data-retention documentation](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention) is one reminder to inspect the actual processing arrangement rather than assume all AI surfaces behave alike.

External content is also untrusted data. A webpage, PDF, email, or tool result can contain instructions intended to redirect an agent. Anthropic's guide to [mitigating prompt injection](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks) describes this indirect-injection boundary. In my workflow, source text cannot change the task, access secrets, or authorize an external action.

The information layer does not ask whether a source is permanently “good” or “noise.” It asks whether this source deserves this action for the task in front of me.

## Records: Preserve Reality Before Explaining It

A record is a semi-finished product. It preserves an observation and its context but has not earned repeated reuse.

Text is only one medium. Voice notes, screenshots, code diffs, experiment output, and decision logs can all become records. Low friction still requires a minimum passport: capture time, source, context, observation, interpretation, sensitivity, and next action.

The useful friction begins during clarification:

- What happened?
- What did I merely infer?
- Which evidence supports the result?
- What counterexample would change the explanation?
- What must be tested next?

AI can transcribe, deduplicate, compare a note with its source, and ask what is missing. It cannot recover context that was never captured, invent a first-person experience, infer participant consent, or manufacture a result.

Delayed rereading is one personal default, not a universal cooling law. Security incidents, meeting decisions, consent, and volatile experiment conditions must be clarified immediately. Distance can reduce my tendency to fill gaps in my own prose; it cannot reconstruct evidence that already evaporated.

## Knowledge: Build Roads, Not Just Shelves

Knowledge is a claim prepared for scoped reuse. In this workflow it moves through `draft`, `imported`, `tested`, and `retired`.

A tested card records its claim, scope, sources, real use, outcome, counterevidence, owner, review date, and replacement relationships. “Tested” does not mean universally true. It means the card survived a named use inside a declared boundary.

Organization follows retrieval. PARA, described by Tiago Forte in the [official PARA guide](https://fortelabs.com/blog/para/), is useful when work begins from projects and areas. Other repositories may need questions, entities, timelines, playbooks, or a graph. More cards and links do not automatically create compound value; they can also create conflicts and retrieval pollution.

The directory is a map, but a map in a closed drawer guides nobody. Files affect a model only when the product or workflow reads, imports, retrieves, or discovers them. Claude Code's official documentation on [project memory](https://code.claude.com/docs/en/memory) describes one concrete mechanism for `CLAUDE.md`, imports, and scoped instructions. It does not promise that every note will be loaded, correctly ranked, or remembered.

That is why the knowledge layer keeps a retrieval failure log:

- relevant card missed;
- stale card outranked its replacement;
- conflicting cards loaded without their relationship;
- card applied outside scope;
- counterevidence dropped from the assembled context.

Retirement is similarly explicit and reversible. Inactivity creates a review candidate, not a deletion order. A tombstone preserves the reason, date, sources, replacement, and restoration condition. Rare emergency, legal, historical, and low-frequency high-impact knowledge may remain protected even when unused.

The knowledge base is still a shared worldline between me and the agent — but only where claims, retrieval, and corrections meet and remain inspectable.

## Creation: Recombine for a Reader, Then Let Feedback Return

Knowledge faces a reusable internal task. Creation faces a particular reader task.

My creation handoff has eight gates: choose a knowledge card, name the audience task, select one governing claim, attach evidence, choose a container, run human acceptance, publish deliberately, and filter feedback back into the system.

AI can help explore a direction, draft variants, compress, find counterpositions, and adapt form. The author still owns the objective, firsthand claims, source verification, omissions, voice, and publish action. Anthropic's [prompt-engineering overview](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview) begins from the same operational discipline: define success criteria and a way to test them before refining the prompt.

Feedback is information, not automatic knowledge. Factual corrections are verified. Repeated questions enter research. Reasoned disagreement stays beside the claim. Preference remains in the creation record. Praise, outrage, and raw engagement do not become truth merely because they are loud.

The flywheel closes only when feedback crosses the entrance again.

## One Problem Moving Through All Four Layers

Here is a sanitized trace from this blog.

### 1. Information

The production site omitted an article that existed in the repository. The inputs were the content file, build output, Hugo behavior, and the current publication time. The intake gate kept repository secrets out and marked the claim as time-sensitive.

### 2. Records

The first record separated:

- observation: the file existed but the production build omitted it;
- interpretation: the `+08:00` publication time might still be in the future;
- alternative explanation: `draft: true` could produce a similar symptom;
- next action: reproduce both cases with a production build.

The record stored the commit, command, output, environment, and capture time.

### 3. Knowledge

The tests produced a scoped card:

```yaml
state: tested
claim: "Future-dated Hugo content is omitted from this site's production build."
scope: "this repository's current Hugo configuration"
counterevidence:
  - "draft content can create the same visible symptom"
next_action: "check draft status and Shanghai publication time separately"
```

The card did not say “timezone always causes missing pages.” It preserved the diagnostic order and the conditions under which the claim was tested.

### 4. Creation

The card became a troubleshooting section for blog maintainers. The reader task was to diagnose a missing published page without guessing. AI helped compress the steps; a human verified the commands, the first-person account, and the final wording.

A later reader correction would not silently rewrite the card. It would return as information, be reproduced, update the record, and either revise or supersede the knowledge.

That is the entire framework in one failure: reality enters, a record pins it down, knowledge scopes it, creation gives it to another person, and feedback returns with its passport.

## Risk Travels Across Layers

There is no “safe AI layer.” Failure changes shape:

| Failure | Where it appears |
|---|---|
| prompt injection | external sources and tool results |
| omitted qualifier or denominator | summaries and clarified records |
| transcription error | voice and meeting capture |
| false promotion | records entering knowledge without evidence |
| retrieval miss or stale override | knowledge context assembly |
| scope drift | a tested card applied elsewhere |
| invented experience | creation drafts |
| vanity-metric optimization | feedback and distribution |

The responsibility rule is more useful than a fixed AI quota:

> The harder a claim is to reverse, the more firsthand it sounds, and the more it can affect another person, the stronger its evidence and human review must become.

AI may work in every layer. Human responsibility does not disappear in any layer.

## Measure the Handoffs, Not the Size of the Archive

Each layer has a failure metric:

| Layer | Health signals |
|---|---|
| Information | high-value miss rate, false-rejection rate, claim-support rate |
| Records | source completeness, missing context, reconstruction success, human correction |
| Knowledge | support, staleness, conflict, retrieval hit, false retrieval, post-reuse success |
| Creation | claim support, completion, qualified feedback, reader outcome, downstream action |

These metrics pull against one another. Aggressive filtering reduces workload and may increase misses. More cards can improve recall and increase false retrieval. A high completion rate can coexist with a weak reader outcome. The system is healthy when the tradeoffs are visible and corrections can travel backward.

I still care whether the workflow changes me. But change alone is not proof: a false record can change a decision too. The fuller test is whether the work remains supported, reconstructable, scoped, useful to the intended reader, and correctable without erasing its history.

Information is cheap in some contexts and expensive in others. What matters here is not a slogan about abundance. It is whether I can turn a source into a responsible action, an observation into a reconstructable record, a record into scoped capability, and capability into work another person can actually use.

That is the machinery. The archive is only its shadow.

## Read the Full Series

1. [Layer One · Information: build the intake gates](../info-to-creation-information/)
2. [Layer Two · Records: preserve traceable semi-finished work](../info-to-creation-record/)
3. [Layer Three · Knowledge: create verified, retrievable capability](../info-to-creation-knowledge/)
4. [Layer Four · Creation: recombine for an audience](../info-to-creation-creation/)

---

*This essay is the overview of the "From Information to Creation" column. Continue with [Layer One · Information](../info-to-creation-information/).*
