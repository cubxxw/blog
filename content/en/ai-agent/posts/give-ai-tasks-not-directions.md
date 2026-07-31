---
title: 'Give AI Tasks, Not Just Direction: Define Done First'
ShowRssButtonInSectionTermList: true
date: '2026-07-11T16:30:00+08:00'
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - LLM
  - Agent
  - Context Engineering
  - Productivity
  - Learning
categories:
  - Development
description: >
  Explore direction with AI, then define the finish line yourself. A six-part task card turns open-ended conversation into work you can test, review, and trust.
cover:
  image: '/images/blog/give-ai-tasks-not-directions.svg'
  alt: A six-part AI task card connecting an open direction to a verifiable result
tldr:
  - Explore direction with AI, but let a person own the value trade-offs, accountability, and Definition of Done before execution begins.
  - A useful task states its goal, inputs, constraints, output, acceptance criteria, and stop conditions.
  - Important AI work needs multiple trials, deterministic checks where possible, and human review where judgment or risk remains.
  - A conversation earns its time when it changes a decision or leaves behind something that can be inspected.
maturity: budding
---

## After Three Hours, What Is Left on the Table?

I have had evenings that began with a modest intention: settle the angle of an essay. Soon I was discussing titles with AI, then business models, then the meaning of work. The conversation flowed beautifully. When I closed the window, the page was still blank.

That does not make the conversation worthless. It reveals that **exploration and execution are different kinds of work**.

During exploration, an open question is useful. I want AI to challenge an assumption, offer another frame, compare possibilities, or list what I have failed to notice. At that point, insisting on a fixed destination too early can make the work smaller than it needs to be.

But once I commit to producing something, another round of “What else could we do?” often creates more branches when I need a path. The work now needs a finish line.

The rule I use is simple:

> Direction can be explored together. The Definition of Done cannot be outsourced.

## The Boundary Is Not “Humans Think, AI Executes”

“Give AI tasks, not directions” is useful because it is memorable. Taken literally, however, it draws the wrong boundary.

AI can help shape direction. It can organize evidence, expose blind spots, compare approaches, and suggest a route I would not have found alone. I do not need to pretend that I always know the answer before the conversation begins.

What AI cannot do on my behalf is decide what is worth pursuing, accept the consequences of publication, or declare that the work is good enough. When exploration becomes commitment, three responsibilities return to the human:

- **Value trade-offs:** Who is this for? What may be sacrificed, and what must survive?
- **Accountability:** Who owns factual errors, copyright risks, and the final judgment?
- **Definition of Done:** What observable evidence will count as complete, and what should make the work stop?

Good collaboration is closer to navigation than to operating a machine. We can read the weather together. Someone still has to choose the harbor and answer for where the ship lands.

## The Six-Part Task Card

Before opening the chat, I now try to fill in six fields:

```text
Goal:
  What problem should this task solve, for whom, and why does it matter?

Inputs:
  Which drafts, data, links, and background may the AI use?
  Which items are context rather than evidence?

Constraints:
  What facts, tone, length, scope, and boundaries must not change?

Output:
  What exactly should be delivered, in what format, and where?

Acceptance criteria:
  What observable checks determine whether the result passes?
  Which checks are mechanical, and which require judgment?

Stop conditions:
  When must the AI pause and ask?
  How many attempts are allowed, and what happens when evidence is missing?
```

The field I used to omit was the last one. Without stop conditions, an agent can travel a long way on a bad assumption. With them, “I do not know” is not a failure. It is a timely return of control.

This small card is not a substitute for conversation. It is the bridge between conversation and commitment. It turns an intention in my head into a contract that both sides can inspect.

## Before and After: Editing One Essay

Suppose I have a 1,800-word reflection about working with AI and want to turn it into a short, practical essay.

My old request might have been:

```text
Improve this essay. Make it deeper and sound more like me.
```

There is nothing malicious or foolish about that prompt. It is simply impossible to verify. “Deeper” and “more like me” ask the model to guess. When the result feels wrong, my only response is another feeling: “Try again.”

Here is the same assignment after the judgment has been made explicit:

```text
Goal:
  Turn the attached 1,800-word reflection into a 1,000–1,200-word essay.
  A software engineer using an agent for the first time should finish
  able to write a task card of their own.

Inputs:
  Use only the attached draft. You may retain personal experiences from it.
  Do not add external claims or invented examples.

Constraints:
  Preserve the judgment: “Direction can be explored together;
  the Definition of Done cannot be outsourced.”
  Do not present personal observations as universal psychological causes.
  Avoid corporate filler such as “leverage,” “paradigm,” and “unlock.”
  Keep each paragraph under 120 words.

Output:
  Deliver a Markdown essay in this order:
  scene, boundary, six-part task card, complete before-and-after example,
  verification, conclusion.
  Add a separate change log after the essay.

Acceptance criteria:
  The essay is 1,000–1,200 words.
  All six task-card fields appear.
  It contains one complete before-and-after assignment.
  Every factual claim is supported by the source draft.
  I will review voice, judgment, and publication risk.

Stop conditions:
  If the draft cannot support a conclusion, write “author evidence needed”
  instead of filling the gap.
  If two constraints conflict, stop and list the conflict.
  Make at most two revision attempts; after that, return the work for
  human resolution.
```

A good response should also report against the contract instead of merely announcing that it is finished:

```text
Result:
  - Main text: 1,086 words; length check passed.
  - All six task-card fields and one complete before-and-after example included.
  - Two trend claims unsupported by the source draft were removed.
  - Author voice still requires human review.

Decision needed:
  Keep the navigation metaphor in the ending, or replace it with a
  more restrained direct statement?
```

The improvement is not that the prompt became longer. Longer prompts can be just as vague as short ones. The improvement is that there is less hidden guessing. The AI knows what to deliver, I know what to inspect, and both of us know when the task should return to me.

## A Finish Line Is Not Proof of Reliability

Defining done does not make a model deterministic. The same task can produce a strong result in one run and miss a requirement in the next. Open-ended research and writing are especially variable because several answers may be reasonable.

Anthropic's official guide, [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents), offers a useful vocabulary for this problem. It defines a **task** as a test with specified inputs and success criteria, a **trial** as one attempt at that task, and a **grader** as the logic used to score an aspect of performance. Because model outputs vary between runs, Anthropic recommends multiple trials for more dependable results and combining grader types according to the work: code-based checks where an answer can be verified, model-based graders for flexible rubrics, and human graders for expert or subjective judgment.

I translate that into three layers for ordinary work:

1. **Deterministic checks.** Count words, validate links, lint formats, run tests, and confirm required fields. If a script can answer the question, do not replace it with a feeling.
2. **Multiple trials.** Run important tasks more than once. Look for repeated failures and unstable requirements instead of treating one elegant answer as proof.
3. **Human review.** A person signs off on facts, voice, value judgments, and risk. For higher-stakes work, keep the sources and change history as well.

Not every grocery list needs an evaluation harness. The effort should rise with the cost of failure. But even a small writing task benefits from separating “the heading exists” from “the argument is honest.” One is mechanically checkable; the other remains a human responsibility.

The deeper lesson from evals is not to turn life into a benchmark. It is to stop confusing a plausible output with a reliable process.

## Why Open-Ended Conversation Can Feel Like Progress

I used to tell myself a harsher story: if a conversation with AI felt effortless, perhaps I had learned nothing. I no longer think that claim can carry so much weight.

What I can say is narrower and more honest. In my own work, fluent conversation sometimes gives me the sensation of movement before I have made a decision or produced an artifact. Each reply opens another door, so continuing feels easier than choosing. That is an observation about my behavior, not a law of human psychology.

The test is not whether the conversation was long or enjoyable. The test is what changed.

Perhaps I discarded a weak assumption. Perhaps I discovered that the question itself was wrong. Perhaps I wrote a task card and produced a draft. Exploration can leave behind a better decision even when it does not leave behind a file.

What deserves suspicion is a conversation that changes neither judgment nor reality, yet leaves me feeling that the work has already been done.

## Let the Conversation Acquire Weight

Before I ask AI for another answer, I now ask two questions:

**Am I exploring, or am I executing?**

**If I am executing, what evidence would let me say this is complete?**

During exploration, I welcome disagreement and surprise. During execution, I write down the goal, inputs, constraints, output, acceptance criteria, and stop conditions. Then I test what can be tested, repeat what must be reliable, and review what still belongs to judgment.

Direction does not have to be lonely. It can be discovered in dialogue. But value, responsibility, and the final sentence—“this is done”—remain in human hands.

---

*Related reading: [Friction Is Growth](/en/growth/posts/friction-is-growth/) | [Installing Quality Gates Into Your AI Workflow](../engineering-discipline-ai-workflow/) | [From Information to Creation](../info-to-creation-the-framework/).*
