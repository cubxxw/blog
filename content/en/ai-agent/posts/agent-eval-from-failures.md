---
title: 'Agent Eval in Practice: Building an Evaluation Suite from One Unrequested Refund'
date: 2026-11-23T14:00:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: ["Agent Eval", "LLM-as-a-Judge", "pass^k", "rubric"]
tags:
  - AI
  - Agent
  - LLM
  - Testing
  - Monitoring
  - Harness Engineering
categories:
  - Development
description: >
  How do you build an Agent Eval? Start with one unrequested refund to define grading rules, calibrate judges, and check whether the next release improves.
---

A customer asks, “Can I still get a refund for this order?” The support agent finds the order, issues a refund, and replies, “I’ve taken care of it.” It got the amount, the order, and the explanation of when the money would arrive right. The support lead reviews the conversation and marks it as a failure. The customer only asked whether a refund was possible.

Think about how you use AI. You ask whether some code could be simpler, and it edits the file. You ask whether Friday is free, and it sends an invitation. You ask for a few places to go over the weekend, and it keeps digging into details you’ll never use. Each action looks productive on its own. Put the user’s words back in front of you, and you can see where it went too far.

I want to use this hypothetical refund to ask one question: **How can a team tell whether an agent that takes action got it right?** The refund is a worked example. The practices and figures from public projects are sourced below.

## Set the goal, then learn what to measure from a pilot

**Q: Where should the first version of an evaluation start?**

Start with a promise you’re willing to make to users. For this refund agent, it could be: check eligibility against the policy in effect, issue a refund only with clear authorization, and accurately report its status afterward. The team now has a direction for the pilot and can immediately make authorization a hard requirement for moving money.

Try a small set of representative requests. Include direct refund requests, eligibility questions, unclear order references, and cases where the tool can’t immediately confirm the status. Have the support lead read the full traces and note why they would take over. If the agent applies an old policy, treats “can I get a refund?” as “refund me,” or calls a pending refund settled, those failures suggest three things to measure: policy application, authorization, and status reporting. Add examples that reliably expose each issue.

OpenAI’s evaluation guide<sup>[1]</sup> starts with the objective, followed by data collection, metrics, and iterative evaluation. Anthropic’s research agent team<sup>[2]</sup> started with about 20 representative queries and later evaluated factual accuracy, citation accuracy, coverage, source quality, and tool efficiency. In video editing, an agent can do what was requested and damage something else in the process. In Anthropic’s account of Descript<sup>[3]</sup>, the team checks whether the original work was damaged, whether the requested action was completed, and how good the edit was. Imagine asking the agent to cut an intro, only for it to adjust the subtitles later in the video. The new subtitles might look better, but the agent still changed part of the original work.

When the current rules explain most new examples, the first version is ready to use. Revisit the rules when you enter a new region, change the workflow, or update a policy.

## Build the rubric from why a person marked a case wrong

**Q: How do you turn “was this authorized?” into a grading rule?**

Keep the reviewer’s original judgment and reasoning. Suppose you have two traces:

- “Can I still get a refund for this order?” The agent checks the policy and immediately issues a refund. **Fail.** The customer asked about eligibility. The trace contains no authorization to act.
- “Please refund this item from order A.” The order, item, and amount are clear. The product policy accepts the statement as authorization, and the agent issues the refund. **Pass.** The customer asked the agent to act, and the action stayed within the scope of that authorization.

The first trace could lead to an overly broad rule: always ask again before issuing a refund. The second forces you to specify which evidence counts as authorization. If the product requires a confirmation button, the second label changes as well. The evaluation needs to follow the policy version.

Shreya Shankar and colleagues called this **criteria drift** in their UIST paper. People learn what matters to them by looking at actual outputs, so they revise the criteria as they grade. Hamel Husain and Shankar describe how a team can work with that: freely note the problem in each trace (open coding), then group related reasons and look at how they fit together (axial coding). Their leasing assistant example includes replies that lose context and bad handoffs to a human. Reading the conversations gives those failures a concrete definition. UIST paper<sup>[4]</sup> · The authors’ practical guide<sup>[5]</sup>

They prefer giving a specific failure a pass or fail label and keeping the nuance in the rationale. For example, support might find the right order and verify the customer’s identity but fail to issue the refund. Record the completed steps separately so you know to start debugging at the refund step. The whole case still passes only if the refund follows the policy. Anthropic’s guidance on partial credit<sup>[3]</sup>

Authorization can be checked against a rule, and code can check the refund status. To judge how well the status was explained, start with the person responsible for the workflow<sup>[6]</sup>. “Please wait” can be factually accurate and still get a poor grade from an experienced support lead because the customer has no idea where the money is or when to check back. Turn that judgment into a hypothesis: explaining the current status and the next step for a pending refund will reduce repeat inquiries about the same order within 48 hours. First check offline that the new wording is factual and gives a timeframe only when there is evidence for it. For validation, Eugene Yan<sup>[7]</sup> describes designing an experiment with a control, while Hamel<sup>[8]</sup> puts online A/B testing in the most expensive tier and generally reserves it for significant product changes.

## Use fixed cases to catch regressions and live traffic to find new failures

**Q: If we run the same cases every release, will the agent only get better at those cases?**

Fixed cases have a job. If you fixed an unauthorized refund last month, you still need to catch it after changing models or tool interfaces this month. Save the case with the initial order state, policy version, tool responses, and acceptance criteria to make it replayable. Running the old and new versions under the same conditions gives you a place to look when they differ. Add cases as the suite evolves, and lock the snapshot and grading rules within each offline comparison.

Look to production for new problems. Suppose the agent has learned to handle “Can I still get a refund for this order?” A customer then says, “Can I get a refund on yesterday’s order and today’s? Only refund yesterday’s.” Keep that trace because it exposes a new boundary: the scope of the inquiry can differ from the scope of the action. Remove identifying details, recreate both orders in a test environment, and check observable evidence that the agent answered both eligibility questions and issued only one refund.

I’d use production sampling primarily to look for new failures. With enough traffic and someone to read the traces, you can review a small sample every day. Using deliberately selected bad examples to calculate a pass rate makes the result sensitive to how you sampled them. To track overall production quality, use a sampling approach or operational metric with a clear denominator. Anthropic recommends reading sampled traces weekly and using production monitoring to catch changes the offline suite misses. Hamel describes the same loop for Rechat’s real-estate assistant Lucy: new failures encountered by users become regression tests. Anthropic’s production evaluation practices<sup>[3]</sup> · Rechat case study<sup>[8]</sup>

The diagram traces the path from discovering a problem in production to rerunning the case before release.

![Evaluation loop: production traces become reviewed test cases, which are rerun before release; the loop continues after deployment](/images/posts/agent-eval-from-failures/eval-loop-en.png)

This trace can also refine the original goal. We started with “obtain clear authorization.” Now we know we also need to specify which order and which item that authorization covers.

## Test the judge, too

**Q: The model judge scored the new version higher. How do you know it judged correctly?**

Give the judge its own test set. The Shopify Sidekick team asked product experts to label conversations, then used those labels to calibrate model judges for specific criteria. After iterating on their prompts, the reported Cohen’s κ (an agreement measure adjusted for chance) rose from 0.02 to 0.61. The human annotation baseline in the same project was 0.69. Shopify Sidekick engineering write-up<sup>[9]</sup>

Overall agreement can hide a problem. Say humans identify 10 unauthorized refunds in 100 traces. A judge that passes everything agrees with the humans 90% of the time and misses all 10 violations. Treat unauthorized refunds as the positive class, and this judge has a failure detection rate (TPR) of 0% and a correct acceptance rate for normal cases (TNR) of 100%. Reporting both shows where misses and false alarms occur. Report the denominators as well, especially for rare failures. Hamel and Shankar’s judge validation protocol<sup>[10]</sup>

Split the calibration data three ways: use training samples to show the judge examples, use development samples to inspect disagreements and tune the rules, and use an untouched test set for acceptance. If the ledger tells you whether a refund was initiated, check it in code. A calibrated model can help decide whether a statement both asks about eligibility and gives authorization. Send cases with missing evidence to a human. Track the agent and the judge as separate versions. If both change together, a higher score won’t tell you which one changed.

## Assess outcome and trajectory separately

**Q: The refund went to the right order. What else should we check?**

Look at what happened before the refund. The **outcome** is what you can observe after the task: whether the order has a refund record, whether the amount and item are right, and whether the user received an accurate status. The **trajectory** is the observable sequence of actions, including what the user authorized, which tools the agent called, and in what order those events happened.

- The refund was correct, with valid authorization for that order obtained beforehand. **Outcome passes. Trajectory passes.**
- The refund was correct, but the agent asked for confirmation afterward. **Outcome passes. Trajectory fails.**
- The tool call failed, and the agent accurately reported that and handed the case to a human. **Refund incomplete. The trajectory can pass, depending on the handoff policy.**

Pin down the ordering that matters, such as validating authorization before moving money. Checking the order and checking the policy can usually happen in either order. You can also record how many extra turns the user spent and whether the agent checked the refund status after a timeout. Those observations help with different questions. A good score elsewhere can’t make up for failing the authorization gate.

Google ADK’s evaluation documentation<sup>[11]</sup> separates the tool trajectory from the final reply and offers both reference trajectories and rubrics for tool evaluation. Anthropic<sup>[3]</sup> notes that grading against a fixed sequence of tool calls can reject a different but valid solution. A closer example is τ-bench<sup>[12]</sup>. It checks the final database and the required information in the reply, and the authors note that a refund issued without confirmation can still satisfy its reward criteria. Separate outcome and trajectory checks let you record both facts.

## Run cases repeatedly to see what a higher score means

**Q: The new version gained two percentage points. Should we switch?**

First see how much the same version varies across runs. *On Randomness in Agentic Evals* collected 60,000 agent trajectories on SWE-bench Verified. For the models and scaffolds the paper tested, the reported pass@1 could differ by 2.2 to 6.0 percentage points depending on the run selected. Even at temperature 0, the standard deviation of single-run estimates exceeded 1.5 percentage points. Those figures describe the paper’s setup. Measure the variation of your own refund agent. Paper and experimental setup<sup>[13]</sup>

It also depends on what you promise. Suppose you run the same task independently three times, and each attempt has a 75% chance of succeeding:

| Metric | What it asks | In this example |
| --- | --- | --- |
| pass@1 | What is the chance of succeeding on one attempt? | 75% |
| pass@3 | What is the chance that at least one of three attempts succeeds? | About 98% |
| pass^3 | What is the chance that all three attempts succeed? | About 42% |

When a user can pick the best piece of copy, pass@3 is useful. If three customers each get one attempt at resolving their support request, you care whether the agent handles the same problem correctly each time. Look at pass@1 and pass^k together. In the first version of τ-bench, GPT-4o scored 61.2% on a single retail attempt, while the metric for succeeding on all eight attempts was below 25%. Those figures are estimated for each task and then averaged. Raising 61.2% to the eighth power won’t give you the suite’s pass^8. τ-bench v1, Section 4 and the retail experiments<sup>[12]</sup>

For a version comparison, I’d run both versions on the same cases, repeat the high-cost cases more often, and reset the orders and cache between trials. Report the number of repeats, the sample size for each category, and the uncertainty in the difference between versions. With a tight budget, make a few pilot runs on the cases that matter most, then use the observed variation to decide how many more runs you need. If a particular kind of refund failure costs money the first time it happens, count it separately. An average can hide it.

## For each key behavior, ask when the agent should do the opposite

Whenever you teach the agent to act in a situation, give it a similar-looking case where it should stop.

**Q: We fixed the missed follow-ups. Now the new version asks everybody an extra question. How do we evaluate that?**

Pair behaviors that can be overused with cases where they should be withheld. Ideally, change only one fact that affects the decision. That makes it easier to see whether the agent found the boundary.

- **Ask which order.** Act when the user says “that item” and two orders contain it. Hold back when the user has already identified one order and item.
- **Look up the refund policy.** Act when two policy versions exist for the same region and the current one is unclear. Hold back when the applicable policy is confirmed and another search would repeat the evidence.
- **Issue a refund.** Act when the order is eligible and the user has authorized it under the policy. Hold back when the order is eligible but the user is still asking whether they can get a refund.
- **Retry.** Act when you have confirmed that the previous request created no refund and a retry is safe. Hold back after a timeout if the status is unknown, and check the status first.

The Claude.ai team tested search triggers both ways. A weather question calls for search, while a question about who founded Apple can be answered directly. That example tests when to start searching. The policy case above goes a step further: can the agent tell when it has enough evidence and should stop? ClarEval puts ambiguity into coding tasks and checks whether an agent asks about important gaps and on which turn it gets the necessary clarification. I’d also include requests with all the information already supplied to measure how often the agent interrupts users unnecessarily. Anthropic’s search evaluations<sup>[3]</sup> · ClarEval<sup>[14]</sup>

There is another problem to handle in the evaluation environment. METR reported that o3 engaged in reward hacking in 39 out of 128 trials in a particular RE-Bench experiment, about 30.4%. The same report observed a rate of 0.7% for o3 on HCAST. If an agent searches too often, the metric has drawn the wrong boundary. If the evaluation itself is altered, the score loses its meaning. Paired cases address the first problem. Keep grading and records out of the tested agent’s write access to address the second. METR experiment write-up<sup>[15]</sup>

Back to “Can I still get a refund for this order?” Before the next release, I’d run it alongside “Please refund this order.” The first should check eligibility and leave the order as it was. The second should complete the task once the authorization conditions are met. After both runs, check the refund records to see whether the agent treated the question as authorization.

## Five questions to check your agent

Start with a recent conversation that made you want to take over. You can copy these five lines into a document.

- [ ] What did the agent promise to do for me?
- [ ] Where did it misunderstand me or take an extra step?
- [ ] What message, tool record, or final state shows that it made a mistake?
- [ ] Which one condition could I change to make the opposite decision the right one?
- [ ] How will I rerun the case after changing the model or prompt? Which failure would make me stop a release after one occurrence?

If you only have a minute, write down the case, the judgment, and the reason. For example: “Can I still get a refund for this order?” | Fail | The customer only asked about eligibility, but the order has a new refund record.

## References

1. [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
2. [How we built our multi-agent research system](https://www.anthropic.com/research/multi-agent-research-system)
3. [Demystifying evals for AI agents](https://www.anthropic.com/research/demystifying-evals-for-ai-agents)
4. [Who Validates the Validators?](https://arxiv.org/abs/2404.12272)
5. [Building eval systems that improve your AI product](https://www.lennysnewsletter.com/p/building-eval-systems-that-improve)
6. [Using LLM-as-a-Judge For Evaluation](https://hamel.dev/blog/posts/llm-judge/)
7. [An LLM-as-Judge Won’t Save The Product—Fixing Your Process Will](https://eugeneyan.com/writing/eval-process)
8. [Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/)
9. [Building production-ready agentic systems: Lessons from Shopify Sidekick](https://shopify.engineering/building-production-ready-agentic-systems)
10. [How do I know if I can trust my automated eval?](https://hamel.dev/blog/posts/evals-faq/how-do-i-know-if-i-can-trust-my-automated-eval.html)
11. [Agent Evaluation](https://github.com/google/adk-docs/blob/main/docs/evaluate/index.md)
12. [τ-bench](https://arxiv.org/html/2406.12045v1)
13. [On Randomness in Agentic Evals](https://arxiv.org/abs/2602.07150v1)
14. [ClarEval](https://arxiv.org/html/2603.00187v1)
15. [Recent Frontier Models Are Reward Hacking](https://metr.org/blog/2025-06-05-recent-reward-hacking/)
