---
title: 'AI Models Are Getting Smarter. What Comes Next?'
date: 2026-11-21T17:02:45+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - LLM
  - Harness Engineering
  - Development
description: >
  From model routing and agent reliability to recursive self-improvement, this essay asks how AI capability becomes work that people can verify and trust.
---

For the past few years, we have understood progress in AI by looking at what changed in the model. Models grew larger, got better at reasoning, and could tackle harder problems. Today they can write code, call tools, and even contribute to the development of the next generation of models. **Does getting smarter mean AI will create more value?**

I recently went back through several of Shunyu Yao’s public appearances in 2026, from the AGI-Next panel early in the year to Future Science Prize Week in November. I found myself more interested in what happens once we have that intelligence. How far is it, for instance, from asking AI to extract a meeting time to asking it why a machine is shaking? [AGI-Next panel coverage][agi] · [Future Science Prize Week recap][fsp]

The talks are my starting point. The numbers in the examples are illustrative, and the judgments about products and research directions are my own.

## As Models Get Stronger, Will We Need Fewer Small Ones?

If the next large model is smarter and cheaper, what will we still need small models for? Consider two jobs. One is extracting a meeting time from an email. The other is diagnosing a bug in a large codebase. Once a model handles the first job accurately enough, extra reasoning power may buy you very little.

A model hierarchy takes these differences seriously. It gives each task to a model suited to its difficulty and cost. [FrugalGPT][frugal]

At scale, it is worth doing the arithmetic. Suppose both models meet the same quality standard. A call to the small model costs one unit, and a call to the stronger one costs ten.

| Monthly calls | Small model only | Strong model only |
| ---: | ---: | ---: |
| 100 | 100 | 1,000 |
| 100,000 | 100,000 | 1,000,000 |

*Table 1. Hypothetical call costs. The real decision also includes checking the work, correcting mistakes, and maintaining the system.*

There is another cost that is easy to miss. If the small model extracts the wrong meeting time, retries and corrections can eat up the savings. Running several models also means maintaining integrations, evaluations, and versions.

**The cheapest call may still cost more per completed task.**

Simple, frequent tasks with easy checks are a good place to start with a cheaper model. A calendar invitation with an explicit time zone gives you something to check against. If the email only says “Thursday at two,” even a stronger model may need to ask which time zone the sender meant. A product with low call volume might do better with one reliable model.

### The Parameter Count Leaves Out the Memory Bill

Will two models with similar parameter counts cost roughly the same to run? Look at how a batch of long conversations is served and it becomes easier to see what is missing from the calculation.

As a Transformer produces tokens, it typically saves the keys and values it has already computed in a KV cache for later attention computations. Longer contexts and more active sequences can mean a larger cache in GPU memory. [GQA paper][gqa]

Grouped-query attention, or GQA, shares a smaller number of key-value heads among groups of queries. Multi-head latent attention, or MLA, stores a compressed representation of the keys and values at inference time. A mixture of experts saves resources in a different place by routing each token through only a subset of experts. [DeepSeek-V2 technical report][deepseek]

Compression can cost extra computation. If experts are distributed across devices, communication and load balancing also matter. Which change pays off depends on context length, concurrency, and hardware.

**Total parameters, parameters activated per token, and the cache for a long context account for different costs.**

### Thirty Million Readings, and We Still Don’t Know What Broke

Imagine a factory recording a motor’s temperature, pressure, and vibration once every second. It could collect tens of millions of records in a year. Could AI look at those readings and diagnose a fault the way an engineer would?

![The same rise in temperature and vibration fits two explanations. Additional evidence is needed to tell them apart.](/images/posts/ai-models-what-comes-next/diagnosis-en.png)

*Figure 1. Fictional motor readings.*

Temperature and vibration are climbing together. A model might correctly predict that the motor will get hotter over the next minute. The engineer has a different question. If the load has increased, the first thing to check is whether the readings still fall within the normal operating range. If there may be a bearing problem, the motor might need an inspection. These readings alone leave both explanations open.

**Knowing what happens next is different from knowing why.**

If the training objective is to predict the temperature one second ahead, a model looking at mostly stable equipment can keep its average error low by learning that the next reading is usually close to the last one.

Raw readings and maintenance notes can teach a model different things about the same machine. The readings show what changed. The maintenance notes can show how people interpreted the change.

A maintenance log might say that an engineer suspected bearing wear, checked the vibration spectrum, replaced a part, and checked whether the vibration dropped. If the load fell at the same time, the engineer would still want a comparison under similar operating conditions.

There are two ways to build AI for this work. A general-purpose agent can consult a time-series model and look up equipment records. A model can also be trained on aligned sensor readings, operating conditions, and maintenance records. The approaches can work together. In either case, someone still needs evidence from the equipment that can distinguish the explanations.

### How Many Times Can You Read a Good Textbook?

Imagine you have a good math textbook. If you only half understand it on the first pass, you read it again, perhaps a third time. By that logic, a model should keep getting smarter if it sees good data more than once.

High-quality code, math, and scientific data are often scarce. More passes give a model a chance to learn more from the same examples, but they can also teach it to remember how the examples are written. The question is whether it can solve problems it has never seen. Pretraining experiments with limited data have found that moderate repetition can help and that adding more passes eventually yields less. How far to go also depends on diversity, model size, and the stage of training. [Research on data-constrained pretraining][repeat]

In one set of experiments, repeatedly replacing real samples with model-generated ones caused rare patterns to disappear. Researchers got a different result when they kept the original data and added synthetic samples to it. Back at the factory, those few records of real, unusual faults might be precisely the cases worth setting aside for evaluation. [Model collapse study][collapse] · [Experiments retaining real data][accumulate]

### Can a Model Solve a Hard Problem and Still Get an Email Wrong?

Math problems give us an intuitive way to judge how smart a model is. If it solves one, give it something harder. The more difficult the problems it solves, the stronger it seems.

Now ask it to make a reminder email sound more polite. It changes “Please reply by Friday” to “Please reply when you have a chance.” The message reads more smoothly. The deadline is gone.

This is where reasoning and alignment address different questions. Reasoning concerns the difficulty of the problems a model can solve. Alignment concerns whether its behavior respects the user’s intent, preferences, and constraints. In this email, the tone can change and the Friday deadline has to stay. Expectations like that belong in post-training and evaluation.

### The GPUs Are Busy. Is the Model Learning the Right Thing?

Reinforcement learning for language models samples responses, computes rewards, and updates parameters. Those jobs may run in different processes. Suppose a retry reorders the responses and the rewards are written back in the old order. The busier the GPUs are, the more responses receive feedback intended for another answer.

Group Relative Policy Optimization, or GRPO, uses the relative rewards of several responses to the same input to update the policy. If the sample and reward are mismatched, processing more batches merely makes the mismatch happen faster. [DeepSeekMath][grpo]

I would check **correctness, then stability, then efficiency**. Start with a handful of answers with known scores and check both the calculation and the mapping back to each answer. Then see whether rerunning gives stable results. Only then is it worth asking how much more work the GPUs can do.

### What Can One Failed Small-Model Experiment Establish?

As researchers, we tend to trust what our experiments tell us. A method fails on a small model, so we decide the direction may be a dead end.

Take ReAct. It interleaves reasoning and tool use, then lets the observations inform the model’s next move. [ReAct][react]

If the model struggles to plan or misreads tool output, adding steps can introduce more mistakes. One failed run may mean the added steps themselves are a problem. It may also mean this model cannot make sense of the feedback the tools give it.

Real gains in small experiments can be obscured by noise, training settings, or differences in data. Scaling the model offers no guarantee that the method will work.

**What did that failure actually rule out, and which hypotheses went untested?** I would repeat the same tasks across several model sizes while keeping the tools and acceptance criteria fixed, then see whether failures happen in planning, tool use, or interpreting the result.

## When the Model Leaves the Chat Window

Imagine asking AI to fix a bug and run the tests before preparing a deployment. The model might understand the request and produce a correct patch. If it cannot read project files, run commands, or see the test results, the job is still incomplete.

The model interprets the request, reasons, and plans. The harness supplies context and tools, handles their outputs, and sets the limits on what the model can do. Each extra tool adds a dependency that might fail. Each extra turn is another chance to misread a result.

**The test of a harness is whether the agent can finish the job at a reasonable cost and within its permissions.**

### Improving Once and Getting Better at Improving

If an agent detects a mistake, edits its code, and runs the tests again, has it begun improving itself? As an engineering process, that is already a form of automated improvement. Recursive self-improvement, or RSI, makes a stronger claim.

AI can already participate in a normal research loop. It can help identify a problem, propose a candidate, evaluate it, and start the next round with a new question.

![A controlled comparison asks whether an improvement in one round makes the system better at doing research in the next.](/images/posts/ai-models-what-comes-next/improvement-en.png)

*Figure 2. To test whether research ability has improved, compare old and new systems on fresh problems under the same budget.*

I find it helpful to distinguish three things.

- AI helps people with parts of their research.
- AI runs a research loop autonomously toward a fixed objective.
- Improvements from an earlier round make AI **better at doing the next round of research**.

The third is what I mean here by recursion in the strict sense. If an agent rewrites a prompt and gets better results on the original task, we can decide whether that improvement is worth keeping.

Suppose it also develops a better tool for screening experiments. Have one system keep the old tool and let another use the new one. Give both the same budget and fresh tasks. How many reproducible improvements does each produce? Does the difference persist into another round? That answers a question an extra point or two on the original test set cannot answer.

### Ten Minutes to Solve a Problem, an Hour to Build a Tool

Suppose one AI takes ten minutes to solve a difficult problem. Another spends an hour writing a program that can solve that kind of problem automatically. Which creates more value? For today’s task, the first is faster. If similar problems come up ten thousand times, the second could be worth more.

The hour leaves behind a program someone can use again. This is familiar in software engineering, and agents can do something similar with specialized models and reusable skills. If a general model can build a smaller, faster one for a specific job, a one-time research effort could reduce computing costs for a long time.

If building, verifying, and maintaining the tool costs more than it saves, the reuse has no economic payoff.

### How Long Does Verification Take in AI for Science?

When people talk about AI for Science, AlphaFold often comes to mind. It addresses a specific task, predicting protein structures, and its predictions were compared with experimental structures in CASP14. [AlphaFold paper][alpha]

Research also means reading literature, proposing hypotheses, designing experiments, and explaining what the results show. At Future Science Prize Week, Yao described a second approach in which a general agent uses tools to tackle a particular problem. In the third approach, the agent builds a tool or model that can be reused on a whole class of problems. [Future Science Prize Week recap][fsp]

FunSearch offers a clear view of what verification can look like. A language model proposes small programs. An independent evaluator checks the mathematical constructions they generate and passes promising candidates on to the next round. What remains is a method of constructing solutions whose outputs can be checked independently. [FunSearch paper][fun]

You can rerun tests in the same environment to measure how much faster a program is. A hypothesis about whether a drug works has to wait for evidence from experiments and clinical research.

**AI can propose hypotheses faster and faster. Testing them still takes time in the world outside the model.**

## What Are We Rewarding?

How should we evaluate a model that solves plenty of hard math problems but often leaves users’ everyday work unfinished? A leaderboard tells you how the model scored on a particular test. To use it as evidence about delivery, you need to know which part of the job that test covers. Benchmarks such as SWE-bench put real repository problems in a setting where results can be compared reproducibly. In a team’s own project, a fix can still get held up by dependencies, deployment, or handoff. [SWE-bench][swe]

**A correct answer, a successful tool call, and a user’s goal being met are three different outcomes.**

Evaluation shapes how we understand the model and where research effort goes next.

Tell a student that getting full marks in math earns a reward, and they may spend a lot of time on math. If the score becomes the only goal, other abilities can get neglected.

Reinforcement learning needs a signal for how good an action was. What people actually want is complex and hard to capture in one number. If scoring checks only the final conclusion, a model may learn to skip the verification the task called for. Getting a better score on a proxy while doing worse on the underlying goal is called reward hacking. [Research on reward hacking][reward]

The people defining the reward have to decide what counts as adequate verification and make that step visible to the evaluation.

### When the Direction Has No Metric Yet

Many engineering problems have clear metrics. You can measure changes in training throughput, inference latency, and the proportion of tests that pass.

A line of research may show little return early on, and a product idea may be difficult to validate in an A/B test before it exists. If an organization relies only on short-term measures, it may keep getting better at familiar problems and overlook more important ones.

I think of taste as judgment about research. You decide which questions deserve time while the evidence is still incomplete, then decide what would make you change your mind. That judgment draws on how the problem works, the history of the technology, practical constraints, and long-term value. It also has to be open to what the next experiment shows.

## Once an Agent Can Act, What Should It Be Unable to Do?

When I think about AI safety, I find it helps to ask where each risk comes from. A model can behave in unintended ways on its own. An outside attacker can exploit a model or a system it connects to. We often discuss the first under safety and the second under security. In a working system they can overlap.

An agent might be asked to process email and encounter a message trying to induce it to disclose information. The email is an external input. The ability to send is a separate permission. Even if a model follows the message’s instruction, a read-only workflow cannot send email. [OWASP on indirect prompt injection][injection]

**Permission to read an email does not give an agent permission to act on what it reads.**

Suppose an agent working in a restricted environment cannot find something it needs. The system can let it try another tool within the same permissions, or let it stop and explain what is missing.

If training rewards only completion, the model has little opportunity to learn that stopping for lack of permission can be a good outcome. [OWASP on excessive agency][agency]

### Who Can Constrain How an Open Model Is Used?

Downloadable, modifiable weights give a publisher less control over how a model is used after release. Openness also gives independent researchers a chance to inspect it. Blanket restrictions on closed services can get in the way of legitimate defensive research. [Future Science Prize Week panel recap][fsp]

When discussing release choices, I would start with what to measure. Finding a defect in code and assessing whether it is exploitable test different abilities. Their practical significance depends on which tools, permissions, and data the deployed system can access.

## When Do Users Notice a Better Model?

Think of an agent that needs to take several steps before it can deliver anything. If it often fails halfway through, the user still has to be ready to step in, even if each individual step is getting better. Suppose all ten steps must succeed, they are independent with the same probability of success, and there is no recovery. The probability of completing the job is the single-step probability raised to the tenth power.

![Across ten independent steps with no recovery, per-step success of 90%, 95%, or 99% gives overall success of about 35%, 60%, or 90%.](/images/posts/ai-models-what-comes-next/reliability-en.png)

*Figure 3. Illustrative sensitivity to per-step reliability. Shared failures and retries require a different calculation.*

Going from 95% to 99% looks like just four percentage points. In this example, a user’s chance of getting the whole job done rises from about six in ten to nine in ten. If all ten steps depend on the same broken environment, though, fix the environment first. Retrying against it will not help.

The release of ChatGPT showed a different kind of change. In the official coding example, the model asks what the code is supposed to do, and the user explains that the error never surfaces. By the second turn, the problem is clearer. The release also involved training for dialogue. What the interaction gives both parties is a chance to supply missing information and correct misunderstandings. [Introducing ChatGPT][chat]

### What Should I Have for Dinner?

Ask AI what to eat tonight and it can suggest ten reasonable dishes. If it has no idea where you are, what ingredients you have, or what you have eaten lately, stronger reasoning may still get you a suggestion that does not fit. The missing detail may simply be what is in the fridge. If you have an allergy, knowing that matters more than offering another recipe. This information can go stale, so you need a way to see and correct it.

An engineering team will want to count rework. If developers spend two hours fixing a coding agent’s mistakes, a lower model bill is worth very little. Individuals and companies both pay for errors. Sometimes the cost concerns a recommendation, and sometimes it is two hours of repair work. Both groups have tasks that really need to go right.

Imagine two personal agents. One has the best model available but knows nothing about your schedule, relationships, or long-term plans. The second uses a slightly weaker model, but with your permission it understands some of your context, connects to tools you use, and reliably handles routine tasks. Which would you choose? I would probably start by asking whether it can do what I need and when it will come back to ask me.

Once AI goes from answering questions to acting for people, its value depends in part on context, execution, and trust. A system connected to a user’s working environment may be able to tell which actions are appropriate and which ones need approval.

Context may offer little lasting advantage if data is easy to move, alternatives are easy to adopt, or users never come to rely on the service. A product has to use context it is authorized to access to get things right repeatedly. That is what might bring someone back.

### What Will You Hope for When the Next Model Ships?

Reading Yao’s discussion of competition at the model and product layers gave me a question a founder could ask. [Yicai’s coverage of the discussion][yicai]

Suppose your product helps people perform a difficult task, and the next general-purpose model can do the same job directly for less. The technical advantage you relied on might disappear quickly.

The situation changes if the product is part of a team’s actual work. The model’s output still needs to go through the team’s process, be verified, and reach the person responsible for it. A stronger model might let that product do more.

**As models improve, will your product get better with them, or will a general model be able to take its place?**

Even if stronger models make the product more useful, another team might be able to deliver the same result.

## Making Room for Research That Has Yet to Pay Off

Management can choose a direction, allocate resources, and have teams work to a plan. Some research, though, starts with a few people trying something. There may be no business plan and no obvious reason it should be the priority. Only after a period of exploration do researchers begin to see what it could be worth.

An organization needs clear research objectives and some room for directions that have yet to prove themselves. Give a small team a limited period to explore. Ask what they want to see and which result would make them stop. They may have no impressive figures early on, but their managers can still understand what they have found. If those managers only reward the numbers that are easy to show, such as model size, training volume, and benchmark scores, the team may get very good at moving those numbers and less willing to take on uncertainty.

**Bottom-up exploration needs room to try something and a basis for deciding when to stop.**

Large-model development brings together algorithms, data, training systems, hardware, and products. An algorithmic improvement can make inference considerably more expensive. A design that improves training throughput can change what the resulting model can do.

Co-design asks people in these fields to understand one another’s constraints. How do inference costs change once the algorithm runs in production? After speeding up training, are results still stable on the same set of tasks? Everyone needs to look at the effects together. That is one reason teams value honesty, reliability, and the ability to learn quickly. When the evidence goes against your expectations, it helps to be able to put your proposal aside and look at the problem together.

AI makes it easier to find information, write code, and analyze material. Knowing how to perform any one established task may become less of an advantage. **The experience I most want to keep** is the kind that helps me choose a problem, spot a mistake, and find my bearings in an unfamiliar field.

### Why I Still Want to Learn Things I Cannot Use Yet

If AI can one day design experiments for its own successors, what will people do? I first took this as a question about jobs being replaced. Writing this, I find myself more interested in what we will still make time to learn. Automation can speed up a lot of execution. We still need judgment about whether an experiment is worth running and how to interpret the results. Even if AI finds a new scientific regularity, someone needs to ask how reliable it is, what it means, and how it connects to what we already know.

Science includes understanding results, testing them, and passing them on. That makes me think differently about learning.

If knowledge matters only when it produces something useful today, studying set theory, philosophy, or history may look like a poor investment. So might exploring a question with no immediate application. Yet some of the things we come to understand depend on connections built over years. Math you learn today might help you understand a new model architecture years from now. An experience that seems unrelated to work might change how you judge a problem.

Exploration comes with no guarantee of a return. But if we choose what to learn solely according to what we can measure now, we may give up too early on abilities whose value takes years to show.

**AI makes it easier to get an answer. Asking the question, testing the answer, and deciding whether it is worth pursuing are still things we have to learn.**

## References

- [The Beijing News, coverage of the 2026 AGI-Next Frontier Summit][agi]
- [Future Science Prize, Official Recap of Day Two of the 2026 Science Symposium][fsp]
- [FrugalGPT][frugal]
- [GQA][gqa]
- [DeepSeek-V2][deepseek]
- [Scaling Data-Constrained Language Models][repeat]
- [The Curse of Recursion: Training on Generated Data Makes Models Forget][collapse]
- [Is Model Collapse Inevitable?][accumulate]
- [DeepSeekMath][grpo]
- [ReAct][react]
- [Highly Accurate Protein Structure Prediction with AlphaFold][alpha]
- [Mathematical Discoveries from Program Search with Large Language Models][fun]
- [SWE-bench][swe]
- [Defining and Characterizing Reward Hacking][reward]
- [OWASP, Prompt Injection][injection]
- [OWASP, Excessive Agency][agency]
- [OpenAI, Introducing ChatGPT][chat]
- [Yicai, coverage of Ya-Qin Zhang and Shunyu Yao’s model and product discussion][yicai]

[agi]: https://m.bjnews.com.cn/detail/1768112092129411.html
[fsp]: https://www.futureprize.org/cn/nav/detail/1914.html
[frugal]: https://arxiv.org/abs/2305.05176
[gqa]: https://arxiv.org/abs/2305.13245
[deepseek]: https://arxiv.org/abs/2405.04434
[repeat]: https://arxiv.org/abs/2305.16264
[collapse]: https://arxiv.org/abs/2305.17493
[accumulate]: https://arxiv.org/abs/2404.01413
[grpo]: https://arxiv.org/abs/2402.03300
[react]: https://arxiv.org/abs/2210.03629
[alpha]: https://pubmed.ncbi.nlm.nih.gov/34265844/
[fun]: https://pmc.ncbi.nlm.nih.gov/articles/PMC10794145/
[swe]: https://arxiv.org/abs/2310.06770
[reward]: https://arxiv.org/abs/2209.13085
[injection]: https://genai.owasp.org/llmrisk/llm01-prompt-injection/
[agency]: https://genai.owasp.org/llmrisk/llm062025-excessive-agency/
[chat]: https://openai.com/index/chatgpt/
[yicai]: https://www.yicai.com/news/103431271.html
