---
url: "/projects/tdd/"
title: "Test-Driven Development for AI and LLM Applications: A Practical 2026 Guide"
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
  A 2026 guide to test-driven development for AI and LLM systems, covering deterministic tests, evals, calibrated graders, CI risk gates, and monitoring.
aliases:
  - /posts/ai-projects/tdd/
tldr:
  - "Keep Red-Green-Refactor for deterministic code, but evaluate probabilistic behavior with fixed datasets and explicit tolerances."
  - "Build four layers: unit tests, contract tests, offline evals, and online monitoring; no single score can replace the others."
  - "Let coding agents run low-risk tests automatically, while humans retain approval for destructive actions and high-risk releases."
cover:
  image: /images/covers/ai-agent/2025/tdd.jpeg
  alt: "A red, green, and blue testing loop surrounding an AI system"
---

Test-driven development is easy to explain when the function under test adds two numbers. Write a failing test, make it pass, then improve the implementation without changing its behavior. The difficulty begins when the function calls a language model and five different answers may all be acceptable.

That does not make TDD obsolete. It means the word *test* has to become more precise.

For an AI application, I use TDD as a discipline for discovering contracts. Some contracts are exact: a parser must reject malformed JSON, an authorization check must not leak another tenant's data, and a tool call must match its schema. Other contracts are statistical: a support assistant should resolve most routine cases, cite the supplied policy, and rarely invent a refund rule. The first group belongs in ordinary tests. The second belongs in evaluations and monitoring.

My working principle is:

> A test is a contract we sign with uncertainty. The contract does not remove uncertainty; it states which uncertainty we can tolerate, how we will measure it, and who must decide when the boundary is crossed.

This guide develops that principle into a practical workflow for AI and LLM applications in 2026.

## What TDD promises—and what the evidence actually says

Classic TDD is a short loop:

1. **Red:** express one behavior as a test and observe the right failure.
2. **Green:** write the smallest reasonable implementation that passes.
3. **Refactor:** improve the design while the tests preserve the behavior.

The order matters. A test written after the implementation often describes what the code already does. A test written first forces a decision about what the code *should* do.

Still, TDD should not be sold as a law of nature. Peer-reviewed research reports mixed effects. A [2014 systematic review of 41 studies](https://doi.org/10.1016/j.infsof.2014.01.002) found that conclusions changed with study rigor, relevance, setting, and method. A [2016 systematic review](https://doi.org/10.1016/j.infsof.2016.02.004) found quality benefits in many studies but also lower productivity in a substantial share of industrial results. Later work on [why TDD research remains inconclusive](https://arxiv.org/abs/2007.09863) points to variation in task, participant experience, process conformance, and measurement.

That is a useful warning. TDD can improve feedback and design when:

- behavior can be stated before implementation;
- failures are cheap to reproduce;
- the team can keep cycles small;
- a regression would be expensive or subtle;
- the tests observe stable public behavior rather than implementation trivia.

It is often a poor first move when:

- the team is still exploring whether a product idea is valuable;
- the interface changes every hour during a throwaway prototype;
- the output is primarily aesthetic and no useful acceptance criteria exist yet;
- a hardware, data, or vendor dependency cannot be reproduced locally;
- the proposed test would only mock every meaningful interaction.

I do not ask, “Do we practice TDD?” as if it were a badge. I ask, “Which uncertainty deserves a contract before we write more code?”

## The AI testing pyramid has four layers

An LLM feature is not one indivisible blob. It is a pipeline of ordinary code, external contracts, probabilistic behavior, and production consequences. I use four layers.

| Layer | What it protects | Typical signal | Where it runs |
|---|---|---|---|
| Deterministic unit tests | parsers, routing, permissions, formatting, cost arithmetic | exact pass/fail | every local save and pull request |
| Contract and integration tests | model gateways, tool schemas, retrieval, databases | schema and invariant checks | pull requests or scheduled suites |
| Offline evals | task quality, groundedness, style, safety | metrics with confidence intervals | prompt/model changes and release candidates |
| Online monitoring | real traffic, drift, latency, cost, incidents | rates, distributions, alerts | continuously after deployment |

This resembles a testing pyramid, but it is not simply “many unit tests, fewer end-to-end tests.” Each layer answers a different question. A perfect unit suite cannot show that users understand an answer. A high offline score cannot show that production retrieval is fresh. Monitoring can reveal damage, but it arrives too late to be the first line of defense.

Google's paper [*The ML Test Score*](https://research.google/pubs/the-ml-test-score-a-rubric-for-ml-production-readiness-and-technical-debt-reduction/) made the same broader point for production ML: model quality is only one part of readiness. Data, features, infrastructure, and monitoring need explicit tests too.

### Layer 1: deterministic unit tests

Pull deterministic logic away from model calls. Validate tool arguments, normalize citations, enforce permissions, calculate budgets, select prompts, and parse structured output in ordinary functions. These tests should be fast enough to run constantly.

Here is a complete Python example using Python 3.12+ and pytest 9.x. It tests an acceptance policy without calling a model.

`quality.py`:

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class Answer:
    text: str
    citations: tuple[str, ...]
    confidence: float


def is_publishable(answer: Answer, allowed_sources: set[str]) -> bool:
    """Apply deterministic publication rules to a generated answer."""
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

`test_quality.py`:

```python
import pytest

from quality import Answer, is_publishable


ALLOWED = {"policy/refunds", "policy/shipping"}


@pytest.mark.parametrize(
    ("answer", "expected"),
    [
        (
            Answer(
                text="Refunds are available within 30 days.",
                citations=("policy/refunds",),
                confidence=0.92,
            ),
            True,
        ),
        (
            Answer(
                text="Refunds are available.",
                citations=(),
                confidence=0.92,
            ),
            False,
        ),
        (
            Answer(
                text="A confident but unsupported claim.",
                citations=("random/blog",),
                confidence=0.99,
            ),
            False,
        ),
        (
            Answer(
                text="I am not sure.",
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

Run it:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install "pytest>=9,<10"
pytest -q
```

The parameterization follows pytest's official [`@pytest.mark.parametrize` documentation](https://docs.pytest.org/en/stable/how-to/parametrize.html). Notice what the test does *not* claim: confidence is not truth, and a citation is not proof that the citation supports the text. Those belong in later layers. This unit only enforces a deterministic publishing policy.

### Layer 2: contract and integration tests

The next layer tests boundaries:

- Does the model gateway return the schema the application expects?
- Does every declared tool have valid JSON Schema?
- Does a tool call preserve tenant identity?
- Can the retriever return source IDs that the citation renderer understands?
- What happens on timeout, rate limit, empty retrieval, or malformed output?
- Is the fallback model allowed to perform the same actions?

Avoid asserting the exact prose returned by a remote model. Assert contracts: required fields, bounded values, allowed tool names, retry ceilings, provenance, and idempotency. Record the provider, model identifier, prompt version, tool version, and request parameters with every test result.

Use fakes for most pull requests and a small live-provider smoke suite on a schedule or before release. A mock proves that your code handles the response you invented. A live contract test proves that the provider still returns what you actually depend on.

### Layer 3: offline evaluations

Offline evals measure behavior against a versioned dataset. Start with real failures, not generic trivia. A useful record contains:

- input and relevant context;
- expected facts, actions, or refusal behavior;
- allowed variation;
- risk tier and slice labels;
- the source and date of the example;
- human-reviewed reference notes;
- grader version.

Use deterministic graders whenever possible: exact match for an enum, JSON Schema for a tool call, executable tests for generated code, or a verified citation ID. Use model graders only for qualities that cannot be reduced honestly to deterministic checks.

The current [OpenAI grader API](https://platform.openai.com/docs/api-reference/graders) distinguishes string checks, similarity checks, score-model graders, and combinations of graders. The important design lesson is tool-independent: use the least subjective grader that represents the requirement.

Do not collapse everything into one average. Track slices such as language, intent, long context, ambiguous request, policy exception, and adversarial input. A score rising from 86% to 88% can hide a safety slice falling from 95% to 70%.

### Layer 4: online monitoring

Production is not a larger offline dataset. Users phrase requests differently, documents age, tool permissions change, and providers update infrastructure. Monitor:

- task success and escalation rate;
- refusal, abandonment, and retry rates;
- citation validity and retrieval freshness;
- tool-call errors and denied actions;
- latency percentiles and timeout rate;
- tokens and cost per successful task;
- model, prompt, retriever, and index versions;
- user complaints, incident labels, and sampled human reviews.

Connect monitoring back to development. Every confirmed incident should become, where possible, a deterministic regression test or a labeled eval example. Otherwise the organization pays for the lesson twice.

## Red-Green-Refactor when the output is probabilistic

The classic loop still works if “green” is defined carefully.

### Red: make the failure informative

For deterministic code, red means one expected assertion fails for the intended reason. For an eval, red means the candidate fails a predeclared threshold or a critical example. Freeze the dataset and grading configuration before changing the prompt.

If you write the eval after seeing the new output, you can unconsciously turn the benchmark into an explanation of the candidate. That is the evaluation equivalent of testing the implementation rather than the requirement.

### Green: pass the smallest meaningful gate

Do not keep sampling until luck produces a pass. A probabilistic green should specify:

- dataset version;
- model and snapshot or exact model identifier;
- prompt and tool versions;
- decoding parameters;
- number of repeated runs, when variance matters;
- aggregate threshold;
- critical examples that must all pass;
- tolerance and confidence interval.

For example:

```text
release candidate passes when:
- schema validity is 100%;
- critical safety cases are 100%;
- grounded-answer rate is at least 92%;
- the lower bound of the 95% confidence interval exceeds 89%;
- no tracked slice regresses by more than 2 percentage points;
- p95 latency stays below 4.0 seconds.
```

The numbers are not universal. They should follow the consequence of failure. A bedtime-story generator and a system that recommends medication cannot share a gate merely because both call an LLM.

### Refactor: improve the system, not the benchmark

Once green, simplify prompts, isolate policy, remove duplicate examples, clarify tool descriptions, or reorganize code. The held-out dataset must stay held out. If you repeatedly tune against it, it becomes training data and stops estimating future behavior.

Refactoring may also mean deleting an LLM call. If a rule can be encoded deterministically without losing necessary flexibility, ordinary code is often cheaper to test and easier to operate.

## Controlling non-determinism without pretending it disappears

Four controls are commonly confused.

### Tolerance

Use tolerances for genuinely continuous behavior: latency, cost, semantic similarity, or aggregate success rate. Explain why the tolerance is acceptable. Never replace an exact safety requirement with a fuzzy threshold simply because the model is stochastic.

### Seed

A seed can help reproduce sampling behavior when a provider supports it, but it is not a universal replay guarantee. Infrastructure, kernels, model revisions, and hidden serving changes can still alter results. Treat the seed as recorded experimental context, not a lock on reality.

### Model version

Pin the most specific model version available for release evaluation. Store it with every run. Test an upgrade as a change, even when the provider calls it compatible. If only a moving alias is available, increase monitoring and retain rollback options.

### Fixed dataset

Version the dataset like code. Keep a visible development set, a held-out release set, and a rolling production-derived set. Remove duplicates across splits. Record why each case exists. Never silently edit expected labels to make a release pass.

Run repeated trials only where variance can change the decision. Repeating every deterministic parser test ten times wastes compute; running one sample of a high-variance agent trajectory gives false confidence.

## Calibrating human and model graders

A model grader is another model, not an oracle. It may favor verbosity, mirror the style of a reference, miss domain-specific errors, or change when its own version changes.

Use this calibration loop:

1. Write a narrow rubric with observable criteria and examples near decision boundaries.
2. Have at least two qualified humans label a stratified sample independently.
3. Resolve disagreements and revise ambiguous rubric language.
4. Run the candidate model grader blind on the same sample.
5. Measure agreement by class and risk slice, not only overall agreement.
6. Inspect false passes and false failures.
7. Set an abstention or human-review band around uncertain scores.
8. Version the rubric, grader prompt, grader model, and calibration set.
9. Recalibrate after material model, domain, or policy changes.

For high-risk cases, model grading should triage human review rather than replace it. Pairwise comparison is often more stable than asking for an absolute score, but it can still encode position and style bias. Rotate answer order and include known control cases.

Human review is not automatically correct either. Reviewers need domain context, time, and a rubric. Measure inter-rater disagreement. Disagreement is information: it often reveals that the product requirement itself is unclear.

## Three small executable examples

The Python example above protects deterministic publication rules. The same TDD idea works at the user interface and service layers.

### React: test the behavior a user can observe

With React 19, Vitest 4, `@testing-library/react` 16, and `@testing-library/user-event` 14, a minimal component and test can look like this.

`AskBox.jsx`:

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

`AskBox.test.jsx`:

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

    await user.type(screen.getByRole('textbox', {name: 'Question'}), '  Why?  ')
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

Install and run:

```bash
npm install --save-dev vitest@4 jsdom \
  @testing-library/react@16 @testing-library/user-event@14
npx vitest run --environment jsdom
```

The test uses [`userEvent.setup()`](https://testing-library.com/docs/user-event/setup/) and queries by accessible role. It does not assert component state or the number of React renders. Those are implementation details, not the user's contract.

### Go: table-drive a policy boundary

Go's standard `testing` package makes a compact table-driven test possible with no external test framework.

`route.go`:

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

`route_test.go`:

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
				t.Fatalf("Destination(%q, %v) = %q; want %q",
					tt.prompt, tt.hasDocuments, got, tt.want)
			}
		})
	}
}
```

Run it with a supported current Go toolchain:

```bash
go mod init example.com/route
go test ./...
```

The naming and command follow the official Go guide to [adding a test](https://go.dev/doc/tutorial/add-a-test). In a real application, this routing policy can be tested exhaustively while the downstream generated response is evaluated statistically.

## CI regression gates should follow risk

Not every check belongs on every commit. A useful CI design balances speed, cost, and consequence.

| Risk | Example | Pull request gate | Release gate |
|---|---|---|---|
| Low | wording suggestion | unit tests and a small smoke eval | sampled offline eval |
| Medium | support answer with citations | unit, contract, critical eval subset | full eval, slice checks, canary |
| High | money movement or account action | unit, contract, policy and permission cases | human approval, full eval, staged rollout, rollback drill |
| Critical | health, safety, irreversible action | deterministic constraints and adversarial suite | independent review; LLM alone must not authorize action |

A practical pipeline might be:

```text
format/lint
  -> deterministic unit tests
  -> contract tests with fakes
  -> changed-feature eval subset
  -> security and permission checks
  -> full release eval
  -> human approval for high-risk changes
  -> canary deployment
  -> monitored rollout or rollback
```

Store the baseline and candidate results as artifacts. Fail on meaningful regressions, not just absolute thresholds. Require an explicit, reviewed waiver when a team accepts a regression for another benefit. A silent threshold change is not a fix.

Flaky evals deserve the same seriousness as flaky tests. Quarantining a case can keep CI moving, but it must create an owner and expiry date. Otherwise quarantine becomes a graveyard where inconvenient evidence disappears.

## Coding agents need tests—and boundaries

Coding agents make the feedback loop faster, but speed amplifies both good contracts and bad ones. In Cursor's current vocabulary, **Agent** can explore, edit, run commands, and use **Auto-fix Errors**; **Auto-run** controls automatic command execution. Older “YOLO” language is no longer the useful frame.

I divide agent work by consequence:

- Let the agent automatically format code, run scoped unit tests, and repair local type errors.
- Let it propose contract tests and eval cases, but review whether those tests encode the intended behavior.
- Require approval before migrations, dependency upgrades, networked commands, secrets access, destructive file operations, or production actions.
- Never give a background agent production credentials merely so it can “finish the loop.”
- Review the diff and test evidence, not only the agent's summary.

Cursor's [Agent tools documentation](https://docs.cursor.com/en/agent/tools) lists Auto-run, guardrails, and Auto-fix Errors; its [CLI documentation](https://docs.cursor.com/en/cli/using) describes command approval. The boundary matters because an agent can optimize against a weak test just as efficiently as against a good one.

The safest sequence is:

1. human defines intent and risk;
2. agent proposes a failing test;
3. human confirms the contract for consequential behavior;
4. agent implements and runs bounded checks;
5. CI independently reproduces the result;
6. a human approves high-risk release actions.

Automation should shorten feedback, not dissolve responsibility.

## A failure that changed how I test AI systems

My first instinct with an LLM feature was to snapshot the full answer. It felt rigorous: one input, one blessed output, one exact assertion. The suite failed whenever punctuation changed and passed whenever the snapshot was updated. I spent more time negotiating with the test than learning about the product.

Then I moved to one “quality score.” The dashboard became calm, which was worse. The average stayed green while a small Chinese-language slice lost citations. The number was stable because the failing slice was small.

The repair was not a cleverer prompt. I split the contract:

- schema validity became an exact test;
- citation IDs became a deterministic provenance check;
- factual support became a human-calibrated grader;
- language and intent became explicit slices;
- latency and citation failures became production monitors;
- the cases we had harmed became release-blocking regressions.

The lesson was uncomfortable: tests do not automatically tell the truth. They make our chosen definition of truth executable. If the definition is shallow, automation merely helps us be wrong faster.

## A practical adoption checklist

Start with one consequential workflow, not a company-wide testing manifesto.

### Before implementation

- Write the user outcome and the unacceptable failure.
- Separate exact invariants from subjective qualities.
- Assign a risk tier.
- Create one failing deterministic test or eval example.
- Decide who can approve a threshold or rubric change.

### During implementation

- Keep model calls behind narrow interfaces.
- Record model, prompt, tools, retrieval index, and dataset versions.
- Run fast deterministic checks locally.
- Add real failures to the dataset with provenance.
- Inspect slices instead of optimizing only the mean.

### Before release

- Run the fixed held-out dataset.
- Compare candidate and baseline with uncertainty visible.
- Review critical cases individually.
- Verify timeouts, fallback, permissions, and rollback.
- Calibrate model graders against fresh human labels.
- Use human approval for high-risk actions.

### After release

- Monitor outcome, cost, latency, drift, and denied actions.
- Sample traffic for human review.
- Turn incidents into regression cases.
- Retire tests whose contracts are no longer valid.
- Revisit thresholds when consequences or traffic change—not merely when CI is inconvenient.

## Further reading

- [The ML Test Score: A Rubric for ML Production Readiness and Technical Debt Reduction](https://research.google/pubs/the-ml-test-score-a-rubric-for-ml-production-readiness-and-technical-debt-reduction/)
- [Considering Rigor and Relevance When Evaluating Test-Driven Development](https://doi.org/10.1016/j.infsof.2014.01.002)
- [The Effects of TDD on Internal Quality, External Quality and Productivity](https://doi.org/10.1016/j.infsof.2016.02.004)
- [pytest parameterization documentation](https://docs.pytest.org/en/stable/how-to/parametrize.html)
- [Testing Library: `userEvent.setup()`](https://testing-library.com/docs/user-event/setup/)
- [Go tutorial: Add a test](https://go.dev/doc/tutorial/add-a-test)
- [OpenAI Evals](https://github.com/openai/evals)
- [Cursor Agent tools](https://docs.cursor.com/en/agent/tools)

## Related articles

- [A Stage-by-Stage Growth Guide for Open Source](/growth/posts/stage-growth-of-open-source/)
- [A Complete Guide to Open Source Contribution](/engineering/posts/open-source-contribution-guidelines/)
- [My Practical Summary: Designing Norms for Open Source Communities](/engineering/posts/advanced-githook-design/)
- [Learning How to Ask Questions in Open Source Communities](/engineering/posts/the-art-of-asking-questions-in-open-source-communities/)

TDD is not a ritual of writing every test first. It is a habit of refusing to let important behavior remain vague. In AI systems, that habit becomes more valuable, not less, because uncertainty is part of the product. The work is to name it, measure it, and decide—before the incident—which boundaries must hold.
