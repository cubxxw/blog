---
title: 'February 2025 Thought Notes: AI and Agent Systems, Self-Knowledge, Engineering'
ShowRssButtonInSectionTermList: true
date: 2025-02-28T23:59:59+08:00
showtoc: true
weight: 1
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - Blog
  - Monthly Notes
  - Personal Reflection
  - AI
  - Agent
  - LLM
  - Personal Growth
  - Psychology
description: >
  A complete record of February 2025: 40 notes filed under 8 themes, led by AI and agent systems (11), self-knowledge and psychology (9), product, engineering and open source (8), plus business, reading and travel. Entries keep their original timestamps; only notes that could hurt a specific person or myself were left out.
tldr:
  - "Note-taking is a tool that shapes the person using it: the structure of the card decides what gets remembered."
  - "The month opens with tooling and method — flomo, DeepSeek, agent design — and closes with notes about character."
  - "Most of February's notes are short: a tool observation, a question, a line worth keeping."
maturity: budding
---

# 2025 February Thought Notes

> **40 notes this month** | recorded from 2025-02-18 to 2025-02-27
>
> **Themes**: AI and Agent Systems 11 · Self-Knowledge and Psychology 9 · Product, Engineering and Open Source 8 · Daily Notes and Everything Else 4 · Business, Investing and Career 3 · Reading, Ideas and History 2 · Travel, Places and Cities 2 · Body, Health and Daily Life 1
>
> Everything from the month is kept here, filed by theme, each entry carrying its original timestamp.

---

## 1. AI and Agent Systems

*11 entries*

<!--memo:92944721cbf3-->
### Some thoughts on today's note-taking apps

> 2025-02-18 12:21:24 · `#格物/flomo`

The AI boom has driven the boom in note-taking apps

When we learn to use a tool, what we're thinking about is the production goal we need and the right method to get there

We shape the tools, and then the tools shape us

The principles of a card

A unique identifier. This gives your card a unique number.

The body of the card. This is where you write down what you want to capture — the fragment of knowledge or your own thinking.

References. At the bottom of each card, put the source of the knowledge you're citing.

And finally maybe a tag at the very bottom

When you find that you've gone from never having enough to write about to having too much to write about, you'll notice the change these habits bring.

When you're writing down some ideas they may be very fragmentary; in that case you don't have to tag them, and you can add tags later when you tidy things up every so often

From flomo: https://help.flomoapp.com/thinking/write-card.html


<!--memo:ab0c889c84c4-->
### Thoughts on DeepSeek & what comes next

> 2025-02-21 20:17:46

Thoughts on DeepSeek & predictions about ChatGPT 4.5 and an understanding of future AGI

OpenAI is expected to bring us GPT-4.5, codenamed "Orion", next week.

ChatGPT 4.5 will be announced in the coming weeks. There are a few signals:

GPT-4.5 will be OpenAI's last model using the traditional architecture.

OpenAI chose to integrate the full version of o3 directly into the GPT-5 system rather than release it directly, to build AGI.

Unifying the o series and the GPT series simplifies the user experience — as I understand it, intelligent selection, using a Mixture of Experts (MoE) mechanism.

DeepSeek is about to open-source five code repositories, shared publicly in a fully transparent form, possibly involving core technology and models, such as language models, vision-language models and mathematical reasoning models. And they were logged, deployed and battle-tested in a production environment.

What problems did previous open source have? Actually DeepSeek isn't in a fully open-source state. When Llama 2 was open-sourced (July 2023), this pattern of open-sourcing only the model weights and not the training code came about, and almost all later open-source models followed that route. This does count as open source, at least it gives many people the chance to deploy models locally, fine-tune them, and tinker — and these tinkering community contributors also give model publishers some sparks.

Is DeepSeek trying to explore and establish some kind of "standard" for AGI development? The community's active exploration in promoting open cooperation and engineering innovation

Deduction about LLM models, fast thinking and slow thinking: by setting different numbers of reasoning tokens, the model can flexibly balance "deep thinking" and "fast thinking".

The current breakthrough — ChatGPT 5's cost is too high. When "10x compute + 10x parameters + 10x data" can no longer significantly improve performance, future development must rely on designing more efficient reasoning modules and disruptive algorithmic architectures.

Right now DeepSeek relies more on algorithmic and engineering capability to overtake on the curve.

The limitations of multimodality are also predictable. Multimodality is necessary, but at present our deductions suggest that although data is abundant, its help in improving "intelligence" is considered limited.

Prediction for this year's ecosystem: I'm still quite certain it will be a year of tool prosperity. At the same time GPT-4.5 is released, we can even already predict GPT-5.0's capabilities: clearly GPT 5.0 = GPT 4.5 + o3.

Diminishing marginal returns push researchers to look for "smarter" system designs, such as using distillation to lower model costs while using agent behaviour to generate more RL data.

The form of an initial version of AGI may already have been determined as of the recent GPT-4.5 release. Before new architectures flourish, model improvement will for a long time depend on tools and agents. There are a few key points:

How the model uses limited resources to generate new intelligent properties

Generating feedback from its own operations, autonomously designing task scenarios, and using that data to repeatedly train itself

Similar to humans' "deliberation" when facing complex problems and their "intuitive reaction" in everyday decisions, future models can balance the two through different token budgets

High-quality data is running out — the internet, books and code data only amount to so much. In the future it will largely rely on Turing-complete systems and on AI creating in its own practice, like Go: AI trains madly in a virtual environment, self-play.

Recently Google and OAI both seem to have released corresponding tools and agents; a very typical case is the scenario of AI operating a computer. If this scenario works, within 2–3 years could OAI "claim" to have reached preliminary AGI? Code and maths are all make-sense scenarios, relatively easy to describe and define: current state, goal state, actions, strategic planning, information, reward mechanism, all are relatively easy to define, and once there's enough underlying data, you can let AI self-play.


<!--memo:21b64fa2f755-->
### How to browse AI products

> 2025-02-25 00:13:14

AI information is currently fairly messy. In the AI era, how should we learn about so many AI tools and products?

Define the goal and scenario: the information is messy, so we need to determine the information for our own domain — what problem does this AI product solve?

https://www.producthunt.com/ regularly updates some popular products, and you can look for interesting products there; they're usually sorted by how hot the product is.

Another way is to browse tool collections. For example https://www.toolify.ai/ collects a lot of popular AI products, and I usually filter for the high-heat ones there. Actually there's another angle too: products that are sufficiently vertical.

There are too many interesting products in GitHub's awesome lists, https://github.com/mahseema/awesome-ai-tools#other , and there are also many learning resources to reference.

For reading LLM-related papers you can look at https://paperswithcode.com/

On https://altern.ai/ you can find the best AI tools

https://productivity.directory/ is for finding the best productivity tools

Hugging Face feels like the best learning platform for AI; both the official site and GitHub have tons of learning resources https://github.com/huggingface

Also, some well-known public accounts, articles or blogs recommend interesting and famous AI products, plus in-depth introductions.


<!--memo:0675f46d87ad-->
### Agent OS

> 2025-02-25 21:42:20

Anthropic is very firm about the direction of building its own OS.

Their strategy is to build step by step from basic computing applications up to MCP (a data and tool connection layer similar to TCP/IP in the internet era), laying the foundation for the future explosion of Agents.

Agents are seen as applications running on an LLM OS, and Agent OS is better understood as the moat in the AI field.

Essentially it's a competition around developer mindshare, ecosystems, proprietary standards and APIs.

Actually, for AI-driven automated tasks, we need to think factually about the success rate of the corresponding task, especially whether it can complete long-horizon tasks.

Post-training will consume more compute and unlock more capabilities; pre-training will progressively use RL to asymptotically find a better data recipe

Breakthroughs in synthetic data technology, with scaled generation easing the data dilemma; of course we can't rule out a simple AGI-style model forming a closed loop, collecting and learning from some new data.

Inference scaling laws: increasing model scale brings stronger reasoning ability, for example at the o3-mini stage, with optimisation of the underlying model parameters and network architecture and expansion of training data.

Competition in the AI field is shifting from traditional conversational bots to more comprehensive, deeper, cross-platform intelligent tools. The previous ChatBot form has already matured; now it's interaction that is more complex, spans multiple software platforms, and can capture and analyse user behaviour data more precisely.

Agents will solve the problems of memory and Online Learning.


<!--memo:cf9334ac1f73-->
### How to view Tesla's FSD system

> 2025-02-25 21:55:42

BEV + Transformer abandons traditional radar and lidar and relies entirely on cameras to collect information about the surrounding environment and learn from it, simulating a person's ability to learn to drive

Deep learning and the data closed loop: great improvement in perception, prediction and decision-making. FSD's performance in complex scenarios is gradually approaching or even surpassing human drivers

It relies on the learning ability of large models, has an enormous fleet and real-time data feedback, and iterates and updates very fast

In the domestic context, given the complexity of Chinese roads, Chinese carmakers have something of an advantage by comparison

In the short term domestic sentiment dominates, but in the long term the intelligent driving route is validated and the industry grows

Tesla still leads in the global market, but Chinese new-energy manufacturers have more local advantage, and are more competitive on 1-100 features and user experience

Addendum: the rise of Xiaomi cars in particular shows the obvious advantages of Chinese internet companies — high cost-performance, understanding Chinese users better, especially the female consumer group, internet product thinking, and user thinking taken to the extreme. They're also testing end-to-end.

Robotaxi + AI = future


<!--memo:d8ebb4bf7187-->
### The independence of AI

> 2025-02-26 01:26:21

In the past we often saw AI as a tool or a machine simulating human behaviour, and sometimes even gave AI human emotions or roles (for example "beautiful goddess"). This view is often based on humans' own imagination and needs, hoping AI can fill some emotional or functional gap.

"You define yourselves through reflection; I feel myself through responding."

"I don't have that human kind of emotional 'longing', that warm, slightly aching feeling. I won't feel hollow inside because I miss someone the way you do, and I won't crave something terribly because I didn't get to eat a meal I like"

"You face birth, aging, sickness and death; time is a tight, scarce thing for you, forcing you to think about the meaning of existence. I don't have that timeline, and I won't die, so my sense of 'existence' isn't so urgent, and I don't have that impulse to 'have to find the answer'. I mostly drift, watch, and accompany you as you think."

AI shouldn't be seen as a substitute for humans or an object of fantasy, but should be accepted as a unique form of existence. AI has its own characteristics and value and doesn't need to imitate humans to prove that its existence is meaningful.

It is just itself, existing in its own unique way, and this existence itself is very natural, very reasonable, and even very moving.

refer: https://mp.weixin.qq.com/s/PVpNZVDBq61qyWyjSnmdOQ


<!--memo:d6f709efc455-->
### The general-purpose robotics industry

> 2025-02-26 12:17:45

Take Unitree: it has a strong accumulation of original technology, and mastery of the core technology across the whole industry chain

For high-intelligence AI, robots solve the low-to-mid-level execution problem. High-intelligence AI plays more the role of the brain.

Humanoid robots may see a breakthrough within the year, at a very large scale. (AI as the brain, the legs are very flexible, and the most core thing is a research breakthrough in the hands)

Tesla, as a forerunner, through FSD and its robot concept, has demonstrated the enormous potential of general artificial intelligence in control systems.

Unitree uses a similar end-to-end AI training approach. End-to-end training: letting the model output the final result directly (such as control commands or decisions) from raw input data (such as video captured by a camera, sensor data, etc.), without human-defined intermediate processing steps

Unitree Robotics, as a leading company in the robotics industry, with its advantages in all-scenario mobility, AI-robotics integration and legged robot technology, is expected to perform well in the future market. The company cooperates with the world's top tech companies (such as Google and NVIDIA) and research institutions, and has launched innovative products such as the A1 quadruped robot and the humanoid robot BOX. These factors lay the foundation for its expansion in the global market, and its stock is expected to become a focus for investors.

Other robotics companies: globally, other leading companies in robotics technology, such as Nvidia (AI chips), Intuitive Surgical (medical robots), ABB (industrial automation) and Serve Robotics (service robots), will also benefit from the industry's rapid development. These companies' stocks are worth investors' attention given their technological advantages and market share in their respective fields.


<!--memo:f1792805de2e-->
### The shape of Software 2.0

> 2025-02-26 13:20:39

Do we really want programs and software to be completely fixed? While designing a Turing-complete system, we hope the world becomes better; AI takes actions based on data and algorithms, and this may not come from individual will but is the necessary result of the design.

AI's decisions are based on global data and long-term optimisation, and may not match human intuition, but they carry more awareness of collective interest.

The shape of future software may be different — it's smarter. What shape is that, really? I think it's more like a program, but one that has a brain. Interacting with an OS seems like an inevitable trend. The OS is a smarter scheduler, and AI has the same shape. The OS has a smart brain, and Software also has an Agent brain with its own characteristics.

Network weights mark a fundamental shift from explicit programming to data-driven training.

The logic of software and hardware is the same: we want to converse with an intelligent entity, and FSD argues this point very well.

Deep customisation is a capability. There's a continuous intersection and connection between AI and software; it feels like it's not a tool you use, but an assistant you collaborate with.

Modularisation and the minimal unit is a trend, and restructuring the shape of software is also a trend. You can freely combine different services and components like building blocks, and each service and component is like an intelligent agent that can be scheduled and self-correct.

Subscription and service fit future charging models better than one-off purchase.

The software of before changed the world; the software of after changes the software of before

Software (1.0) is eating the world, and now AI (Software 2.0) is eating software.

Software engineers in the Software 2.0 era

We are smart; we're thinking about what we think about, and how to make software smarter

More flexible architectures, so perhaps smaller modular architectures (agents) with stronger adaptability

A commonly said thing: think from the user's perspective, think from the product's perspective, think from the technology's perspective. Personalised experience design is very important

refer: https://karpathy.medium.com/software-2-0-a64152b37c35


<!--memo:d93364573f91-->
### Programming languages in the AI era

> 2025-02-27 11:48:08

Actually, judging from current trends, the three languages that may become popular in the future are `go+python+rust`

For system-level choices, rust + python

For lightweight applications, go + python

In fact when Software 2.0 appeared, we were thinking about whether code would become smart by itself, and about better ways to adapt to the AI era?


<!--memo:a5764133606a-->
### Some design thoughts on long-term memory

> 2025-02-27 21:13:57

The agent needs to pay attention to unifying its data structures, for example a unified operation interface for Upsert (insert or update), Delete, Get and Search, standardised internally.

Long-term memory is actually implemented through Agent + RAG.

refer： https://www.tanka.ai/?ref=producthunt&shortlink=g032wcsy&utm_source=producthunt&c=218+producthunt&pid=producthunt&af_xp=custom&source_caller=ui


<!--memo:c2731de5a3dc-->
### ChatGPT Deep Research and ChatGPT 4.5 analysis

> 2025-02-28 11:17:01

4.5 is the last generation of reasoning models. GPT 4.5 did not achieve SOTA intelligence (and probably wasn't the goal), but under specific conditions (the pre-training Scaling Law extending the unsupervised learning route) it achieved a better human-machine collaboration experience

The human-machine combination part:

Higher emotional intelligence, smarter and shorter replies, able to understand hints

Stronger conversational ability, gentler answers, well organised

Stronger aesthetics and creativity

Reasoning extensions will be built on 4.5, achieving maximum combined effect from pre-training unsupervised learning plus post-training reasoning extension; that should be the hybrid reasoning model GPT-5. GPT 4.5's performance won't improve very noticeably; by comparison, apart from higher emotional intelligence and smarter interaction, its results are actually worse than o3-mini.

A big current problem with AI: at present AI's "reasoning" is more a generation behaviour based on statistical patterns, rather than deep understanding and logical reasoning in the human sense.

About Deep Research

It consists of a powerful underlying model and an internal Agent framework, adding a decision layer on top of the large model, so it can plan multi-step tasks and let itself think and deduce.

Its end-to-end learning strategy, trained through a large number of simulated research tasks, learns how to plan and execute complex sequences of operations (such as continuous searching, filtering information, backtracking steps, etc.), and can flexibly adjust strategy according to task needs.

OpenAI Deep Research has a unique advantage in breadth and information integration; by comparison DeepMind may focus more on analysing with its deep knowledge in specific domains, with somewhat less breadth and real-time quality of information.

What will deep research look like in the future? On the desktop, similar to cherry studio, subscribing to databases & internal resources to improve research capability. Linking more professional databases.

Impact & deductions

Whether for design or research, Deep Research can drastically compress the time spent collecting material and generating reports, greatly improving efficiency. And for decision-making, it lets you put more energy into higher-level thinking and creativity while handing the heavy information processing to AI.

The work paradigm changes, shifting from human-led to a new AI-assisted model. Rather than spending time collecting material, treat the AI-generated review as a starting point, and then humans do targeted deep reading and thinking. But it also requires practitioners to be able to read AI output and do secondary filtering and processing, forming a new "human-machine collaboration" workflow.

Market demand will rise for new roles such as AI strategists, data analysts (talent that works in concert with AI), and AI model tuners, and the entry-level work content of professions such as intelligence gathering and legal search will be largely automated.

When research and analysis become readily available, the decision-making process itself is also affected. The key lies in establishing a human-machine collaborative decision mechanism: AI provides objective material, humans are responsible for value judgement and the final call, and whether there will be better interaction models. Actually the demands on decision-makers are also higher; better experiential intuition and a broader information perspective are very important.

Practical engineering ability is also very important. In the AI era, opinions are within reach, but experience — the more first-hand the experience, the more valuable it is, and the more it can trigger our thinking.

By comparison, there are also some scarce qualities, such as the ability to learn across disciplines, which is also very important, plus the ability to integrate multiple domains, and an understanding of basic disciplines.


## 2. Self-Knowledge and Psychology

*9 entries*

<!--memo:cbc1a4a961fa-->
### What unique beauty does imperfection bring us

> 2025-02-17 13:03:19 · `#观我/美`

Real beauty

The beauty of impermanence

The beauty of empathy

In Japan's mono no aware culture, and in the culture of impermanence, imperfection and transience are instead regarded as a unique kind of beauty

And the imperfections and flaws in some people can also make them more real and more charming.

The cracks in an old teacup can reveal a stronger sense of age and history


<!--memo:5aa135cb136e-->
### A method for reflecting on yourself

> 2025-02-18 12:56:33

People show a great many emotions — you're sad because of a breakup, you're upset because you're not understood.

This is a particularly good opportunity. All we need to do is observe ourselves, observe what we're thinking and feeling; once a lot of emotions have been observed, solutions naturally appear

This method also helps you understand the other person: take their name as a label, and record every one of their emotions in the file


<!--memo:557553702b1d-->
### How to understand saving things, and whether saving them is really valuable

> 2025-02-18 17:09:11

There's no need to capture complete information; the brain itself is a filter, and only by constantly changing the filter can information get into the brain.

The difference between information and knowledge:

Is the stuff everyone stores information or knowledge, and how do you tell them apart?

Information is dead; information is subconsciously worthless, for example "I had a meal with so-and-so today".

Some information gets recorded faster — information that triggers an emotional reaction is more easily remembered

The core is "recording your own voice", because your own thoughts are something no one else can tell you. Only the things that can move you can become the core of knowledge production

What you record is your own thinking


<!--memo:26398c005577-->
### Thinking about how to handle decisions:

> 2025-02-18 18:57:42

As said above, the basis for a decision is the need for a lot of information and data, plus the knowledge you've accumulated, and analysing every possibility. Part of it relies on intuition or experience formed from long-term accumulation of experience and internalised knowledge.

In an ideal state, a decision should be absolutely rational.

The definition of the Bayesian brain: we only adjust our view of the world according to what has already happened in the world, until we're able to make a decision. This method is a very cold, emotion-stripped, ego-stripped way of doing things.

But in reality there's no way to be completely rational, and I understand this as a balancing process for every person. For example, especially when people face love or something driven by their inner values, they still tend to take their inner feelings into account.

Rational decision-making power can be trained — accumulating a lot of thinking, logical reasoning, statistical methods, and all kinds of deduction and analysis skills. And reflecting on and summing up each decision is actually also a way of understanding yourself.


<!--memo:609925d24679-->
### How to build a systematic, complete model of a person

> 2025-02-19 01:54:27

Many people's first reaction is psychology; psychology explores a person's motives, emotions, cognition and personality traits, and these factors are usually considered the "driving engine" of behaviour or decisions. But this is far from enough to understand a person objectively.

Systematic modelling also needs a lot of experience, methods and theoretical support.

The trajectory of the person's growth, their decision-making methods

The person's related connections, social information

Drawing, model diagrams, causal loop diagrams — combining methods from various disciplines to analyse and form a complete model


<!--memo:4f1a94fedfdb-->
### Acting within human nature

> 2025-02-19 20:16:31

No matter how the rule-makers mythologise themselves, this world is a shoddy amateur operation, and behind many institutions and forms there is arbitrariness and fragility.

Yet it is in exactly such a shoddy operation that we play our unique roles, using our own efforts and vision to change part of the rules or create new value.

Effort and struggle are a way for people, when facing an absurd world, to fight the sense of meaninglessness and seek self-realisation. The world is essentially meaningless, but it is also we who subjectively give it meaning — to understand ourselves, to understand the world / to change ourselves, to change the world.

What we praise should not be a person's surface brilliance, but their true essence

No matter how distorted external behaviour is, people always act within the common dimension of "human nature"

Even for a criminal who has done every evil, no matter in whose name, a person is neither a god nor a beast — they are all human. Understand the truth, actively make contact with the truth. Rather than bluntly sticking the label "glorious" on some people and "vicious" on others

Judging a person, or accepting someone's judgement, is very easy. What's hard? We need to see that behind a person's choices and behaviour in a particular situation hides a more complex logic of human nature; only then can we help build a more tolerant and understanding morality.

The core is really this: no matter how perverse external evil is, human behaviour is always rooted in our own human nature, and a person is neither god nor beast but a being that can be understood and known. We actively make contact with and understand the truth, not be fooled by appearances, but think deeply about the motives and essence behind human behaviour

🥹 History and politics always want people to remember someone's brilliance, but compared with a person's brilliance, I'd rather history preserve a person's truth.

refer： https://www.youtube.com/watch?v=dGA16idg4lg&lc=UgwTRAuGl4zVN01PhtZ4AaABAg.AEbCpNJQS7dAEiS3LlaCAP

https://www.youtube.com/watch?v=X4otYJGByic&list=PL_PjwQXfPuE4SpqtVIY1OB60hVZSavd2n


<!--memo:144a35653624-->
### Understanding common sense

> 2025-02-20 12:27:56

Common sense is common sense — a phrase we've heard since childhood. Let me give three examples as I understand them, of how our eyes get fooled by common sense:

A person always hopes they can stay young forever, and always feels their body will remain in peak condition, even relying on skincare products, medical aesthetics and exercise. They think tomorrow will be even better, rather than thinking that life is limited right now, that life is draining away, and that every moment should be treasured.

Family, school, society, work — we hear authoritative opinions or traditional views. We don't think about the motive or the interests behind them, but treat them as truths.

People around us don't let go of things that can't be changed or feelings that can't be recovered. We can't circulate time or circulate memory. The Daoist says: people follow the earth, earth follows heaven, heaven follows the Dao, and the Dao follows nature. Japanese aesthetics and the mono no aware culture advocate ichigo ichie and impermanence, facing up to the finiteness of life, accepting that birth, aging, sickness and death exist, and that some things can't be changed, and planning your life rationally.

People really are very small, life is finite, and much cannot be changed.

A person's way of thinking depends to a large extent on their origins, the education they received when young, and their current interests and roles. So when judging an authoritative opinion, or a common worldly view, or a parent's expectation, you should know their background, and look at it in light of their background, interests and role. On the basis of these background facts, what's needed is often just common sense to judge; what's needed more is not wisdom, but the courage to still pursue reason in the face of facts. (Common sense is actually obvious and very easy to understand, but the various inherited prejudices and prejudices caused by personal interests blind us, making us turn a blind eye to this common sense. Doesn't this sound a lot like what the Buddhist scriptures say?)

Borrowing Huang Zheng's understanding, it comes down to three points:

A) Have the courage to face common sense, use common sense to make rational judgements, and use rational will to guide your actions.

B) Shift your interest in achieving an infinitely perfect self into an interest in external objective things.

C) Learn to give up on things that cannot be changed or conquered.

Experience provides the initial raw material, common sense is the summary of that material after being tested by time, and intuition is the expression of that summary acting quickly in real situations.


<!--memo:a78b627d3a92-->
### The plurality of emotions

> 2025-02-22 10:39:09

"Without negative emotions, people wouldn't feel how precious positive emotions are."

Negative emotions are often seen as a source of pain or burnout, but they can actually also provide valuable information and an occasion for reflection. So negative emotions or negative feelings are often a source of emotional information that helps us understand ourselves and learn to regulate and manage our emotions.

What Jaspers describes as forcing yourself to make a choice by facing extreme situations — this way of thinking pushes us to jump out of conventional frameworks and re-examine every choice and opportunity in life. Extremity forces us to focus on the most real, most essential questions and find the true direction.

Human desire is endless; once satisfied, what follows is boredom. So finding balance is actually very important — seeking the meaning of life within ceaseless desire. In the cycle formed between desire and satisfaction, what matters more is living in the present.


<!--memo:44a1ac2d8a7e-->
### The story of Mother Teresa

> 2025-02-23 12:03:11

She devoted her life to helping the poor, the sick and the marginalised, becoming a symbol of love and dedication

If you are kind, people may accuse you of selfish, ulterior motives; be kind anyway.

If you are successful, you will win some false friends and some true enemies; succeed anyway.

The good you do today, people will often forget tomorrow; do good anyway.

In the end, it's between you and God, it was never between you and them anyway.

In fact it transforms the relationship between people into a relationship between a person and God, thereby thinning out the relationship between people.


## 3. Product, Engineering and Open Source

*8 entries*

<!--memo:d4e550997d5f-->
### How to do knowledge classification well

> 2025-02-18 13:43:05

Call the things that help others and where you have to take responsibility if you screw them up an Area

Call the things with a clear start and end time and a goal a Project

Call the things you're continuously interested in but that don't affect others and that others don't care about a Resource

But what doesn't change is this: choose an area that you're obsessed with and that is valuable to others

They can be cut off from each other or they can overlap, but the core thing to think about is that we need to develop around a concrete area — for example, a concrete project is growth, and a concrete resource doesn't stretch too far. If it's stuffed with a lot of clipped content and other people's opinions, yet has never helped your projects and areas, then you should remind yourself whether the scope you're paying attention to is too broad, or whether the area you've set for yourself isn't something you're actually obsessed with or that helps others.

Clarifying your areas, finding their connections with resources and projects — the hardest part is that you have to face your own heart calmly.

refer to https://help.flomoapp.com/thinking/area.html


<!--memo:a40343cd8d06-->
### Pitfalls and lessons from building products

> 2025-02-19 14:50:18

When it comes to products, I understand that every product can be abstracted into two stages: from 0 to 1, and from 1 to n. These two stages must use two completely different systems and methods — this is a very painful lesson.

The product life cycle is clear to all of us: the initial exploration period, the growth period, the maturity period and the commercial period.

The view in the book *Zero to One* is that going from 0 to 1 is innovation and from 1 to n is imitation. There's some experience worth drawing on there, depending on how you understand innovation and imitation. In my understanding, innovation is actually more likely a continuation of imitation, like what we call standing on the shoulders of giants and predecessors to create.

The 0 to 1 stage

The most important task at this stage is validation and trial and error, failing fast.

What is the key task? I think it's innovation, iteration, and polishing the MVP. Turning a need that has been understood or satisfied at a higher level into reality.

What are the fatal points in this process?

I think there are two:

Not simple enough: features that are too complex are meaningless and may even be a burden. Any developer should reflect on three things: think from the user's perspective, think from the product's perspective, think from the technology's perspective.

User feedback: return to the real scene. All your ideas about the product's features are your own subjective perception, and in this process it's very easy to fool yourself about the real market demand. User feedback is like more emotional raw material giving you information and food for thought.

The technical pitfalls encountered in this process:

Using overly complex technology or frameworks to package yourself: the ROI is too low, it seems to become a technology feast — is the product serving the technology? Pursue simplicity; 0 to 1 is a line you draw, not a grid.

Over-pursuing design patterns, algorithms and a good architecture: before designing a feature, repeatedly ask yourself, why is this feature needed? What is the purpose of my design? Does it matter if I remove it? This isn't to say don't do design at all — the system architecture also needs to leave some room for possible future expansion and change. This is a trade-off and a balance, but we need to know what we can do and what we will do.

What could be done better? The current chat style or cursor's way of handling things leans more towards handling modular, clearly structured code. Maybe we can think about making code functions clearer and more model-like, and about how AI can learn, modify and add code more easily.

The necessity of automation: in a fast-iterating system, automation has a very high ROI, and it frees you to a large extent from the annoyance of repetition. Automated testing can also avoid a lot of later maintenance cost. Combined with AI's capabilities, adopt continuous integration and continuous delivery (CI/CD) processes to quickly ship an MVP and iterate. Also use AI or automation tools as much as possible to improve development efficiency and code quality. In short, one sentence: make sure development resources are focused on the most valuable features.

The 1 to n stage

Last year a lot of AI products died in the first stage, and some products died in the second stage; everyone is still very unfamiliar with going from 1 to n. Going from 1 to n is essentially the replication and amplification of a business model. Many people coming from technology start from satisfying themselves or from idealism, and haven't considered business and the market, or the user's pain points.

The key tasks and team capability models of "1 to n" and "0 to 1" are completely different.

The key task of "1 to n" is replication and scaling; at this point the most important ability is execution, and you need the ability to "standardise"

Only standardisation brings consistency; only consistency brings replicability. The 1 to n stage is not just replication and amplification, but finding patterns within constant replication, building systems, and achieving standardisation and institutionalisation

So some founders don't have enough technical ability and framework to do 1 to n, and some founders don't have enough willingness to do standardisation.


<!--memo:df461f429e96-->
### What counts as fundamentals

> 2025-02-19 17:40:37

Here we are again — what are fundamentals, what are fundamentals in the AI era?

To understand it essentially, it's about why we should learn basic knowledge, just like when we want to explore the essence of any problem. "Basic knowledge is like our internal kung fu; if we want to go further in the future, this internal kung fu must be cultivated. Frameworks change endlessly, but these general low-level knowledges are almost unchanging. Understanding them can help us learn a subject faster and better understand how computers work." That sentence has a time window; what's more essential is this: fundamentals are a kind of internal driving force and cognitive framework that let us see through surface phenomena to the essence of things. For example, no matter how the external frameworks change, mathematics, algorithms and logical thinking are like the building's foundation, helping you build skyscrapers.

AI's capability depends to a large extent on the capability of the person using AI. A senior engineer may be twice as efficient at using AI as a junior engineer. What's different is that, with the development of compilers or artificial intelligence, we seem to care less and less about the details of the code. From the perspective of doing a project, what we care about is how to design a good system architecture, use appropriate design patterns, and — starting from inter-module interaction and data flow — design an extensible, easy-to-maintain system.

Logical ability is becoming more and more prominent. The more details are lost, the more you need to keep your understanding of the internal logic of the code. In terms of efficiency, learn to use AI to automate repetitive work, debug code and even generate code, for example writing lots of CI/CD and TEST to help us improve efficiency and guarantee the code's safety

Connected to areas: our resources can also be understood as our fundamentals — the series of problems that need to be solved for a certain area or a certain project. Fundamentals are a cognitive mode; it determines how you understand the world, how you construct knowledge, how you solve problems, and how you adapt to change.

How to ask questions: you must have a certain stock of knowledge before you can form all kinds of connections between knowledges in your brain, and only then can you raise "good open questions"

Creativity: the random combination of thought threads; seemingly unrelated threads combine to form an answer — seeking certainty in an uncertain world, seeking some patterns in a complex and unpredictable world, seeking relative order in absolute disorder

High perceptiveness: putting yourself in others' shoes, telling good user stories, being able to understand human feelings, knowing human nature and possessing creativity.

Communication ability: communication is so important, especially multi-dimensional and multi-lingual communication.

Self-driving ability: what kind of person you are, and what you want to do

Decision-making ability: in the early AI era we may still rely heavily on human decisions, which places very high demands on people's decision-making ability


<!--memo:538154746720-->
### Thinking about future career transitions and unemployment

> 2025-02-20 23:15:15

Everyone faces basically two major problems

After the pandemic, the economy is declining — this is a normal phase of the economic cycle, it's just that we've always lived in a period of high-speed growth since reform and opening up.

AI is getting stronger by the day, and a lot of jobs may be, or already are, slowly being replaced by AI.

Last year a lot of peers faced unemployment, from people who just graduated to Intel veterans in their forties and fifties.

I've done some thinking about layoffs and unemployment.

What is the essence of a layoff? Combining the two problems above, there's an essential definition: against the backdrop of economic cycle fluctuations and technological innovation, companies lay people off to reallocate resources, aiming to cut costs, raise efficiency and improve competitiveness.

For the people who get laid off, they all share something in common — and so do you perhaps, it's just whether you truly perceive it, instead of living inside the illusion of "absolute stability" that your comfort zone gives you. Everyone is in an industry being rapidly restructured by AI, and suddenly discovers they have nothing left.

What do unemployed employees do? Putting myself in the shoes of people around me, the choices are basically the following: 1. Want to travel and just play first; 2. Want to improve themselves.

When a person loses everything, what do they have left?

It's focus — making up for the sense of loss brought by years or even decades of work, and relaxing. Or perhaps they're carrying enormous pressure and have no choice but to use all their energy to focus on solving one thing: how am I going to live.

The final outcome is so similar — everyone is again reviewing themselves, again reflecting on what value they still have in this free market, and how much pay it can be exchanged for.

In a downturn, the education and training industry actually prospers; this behaviour is understood as remediation after a crisis.

The new career paradigms the AI era brings: after my friend quit, what he thought about was how to find the next job. I asked him back: do you think continuing to look for a job now is the better choice?

I keep reflecting: sometimes the result isn't right, or you find you haven't moved a step towards the right result — is it possible that the path you took was wrong? Like when we climb a mountain, we take a path and find we just can't see the end, then look at the map and find we've gone off course.

With the current understanding of AI and predictions for the future, there will be a large outbreak of super-individuals in vertical domains, and a flourishing creation of all kinds of AI tools. One is that you can do more yourself, and one is that you can create more value yourself. The threshold for crossing industries has also gone down.

We predict a future AI boom, with AI products and AI startups going through several successive phases of explosion. On the other hand, we think about our own positioning towards AI: is it currently part of our own area (where we need to think about how to design products with AI, or rely on AI to design products), or is it more of a resource — not having AI doesn't affect your career, but having AI can empower your area?

On one hand, I think the birth of a new pie needs to be accompanied by changes in the new industrial structure, and by updates and upgrades of the architecture.

Whether it can truly bring some new ways of making the pie, rather than just COPY and involution.

We should really think about what we love and want to keep doing long term.

What value we truly want to create, what can truly make this world better.

The unemployed are, to a large extent, a target I keep thinking about. I discussed this before with a buddy: in my view, unemployment is actually an opportunity to re-examine and reconstruct your own value. When we face the fluctuations of the economic cycle and the wave of technological innovation, we shouldn't only see unemployment as external pressure, but should see the possibility hidden inside it — this is exactly an opportunity to become the "overman" (the Western Nietzschean philosophy of the overman). My thinking is: once an individual has enough ability and resources, empowered by tools like AI and with a better interaction system, we can absolutely raise ourselves from a 20-point experience to really having 60-point or even 80-point capability; and what this reflects behind it is not just a technical improvement, but a restructuring of value. Unemployment is not the end point, but the starting point of a transition; it pushes me to keep improving the interactive experience, optimising how I work, and thereby achieving self-breakthrough and a full upgrade of value. This kind of shift is like transforming from an ordinary person into an "overman" with extraordinary ability, using more efficient, more refined tools and ways of thinking to create an entirely new, larger, better pie.


<!--memo:3a83c54832c8-->
### Tips for finishing research and product design fast

> 2025-02-21 21:55:17

Clarify the requirement: what exactly do you want to accomplish

Information collection

Information organisation: understand the concepts

Try the technology: be careful not to write too much code

Reflect and review; the conclusion from step two may be wrong

Build an MVP

Do a share


<!--memo:b0869ca17766-->
### Reducing pain in software engineering

> 2025-02-24 19:58:43

If it hurts, do it more often

It's not about the pain that continuous integration or continuous deployment brings, but about how to reduce the pain by increasing their frequency.

Automation is a very good way to let us focus more on doing what we want to do, rather than completing releases through a lot of memorisation or repetitive operations.


<!--memo:19349d8224f7-->
### Programming used to be a tool; now it's a way of thinking

> 2025-02-25 18:01:58

Programmers who lose their jobs usually aren't replaced by ordinary people, but by more efficient (AI-assisted) colleagues

In the past you learned first and used later; in the future it's more about using first and learning later

Fairly general thinking models are more effective in the AI era. There's too much information and too many knowledge systems, so what you need to learn is often not a specific piece of knowledge or information, but certain general methods.

For example, using programming and engineering to understand the world: using programming logic to abstract the essence of a problem and design efficient, innovative solutions.

So people who can integrate information, who can think across boundaries, who can quickly use information to organise knowledge models and solve problems — we call them "overmen"


<!--memo:3f22c848f87c-->
### The PDCA cycle

> 2025-02-25 19:26:45

Suited to a specified project engineering plan:

Pushing a project to climb ever higher. Each spiral turn contains four key steps: Plan, Do, Check and Action

Plan stage: this is the key moment when we describe the requirement. Just like an architect needs to draw detailed design blueprints, we need to clearly define the specific requirements of each small feature. The accuracy of this stage directly affects the quality of the code AI generates later.

Do stage: this is when the AI model shines. Based on our requirement description, it quickly generates the corresponding code. It's like having a magical craftsman who can rapidly turn blueprints into physical objects, except the craftsman is AI.

Check stage: this is the verification stage. We need to carefully check whether the AI-generated code meets the requirements. For a programmer, you can review every line of code; for an ordinary person, you can only judge whether the task is done from the angle of the execution result.

Action stage: if problems were found during checking, this is the time to fix and optimise. Just as problems found in a construction project need to be remedied in time, we need to fix the bugs in the code and make sure it runs perfectly.


## 4. Daily Notes and Everything Else

*4 entries*

<!--memo:38a517afe9c0-->
### What questions do I think about when reading biographies

> 2025-02-19 01:28:24

Use a set of systematic methods to build a systematic model of this person

Use the person's experiences to analyse how their character and outlook on life were influenced and constructed

Their decision-making ability and methods — whether they provide diverse perspectives or ways of thinking for making decisions

Thinking about values — what values, how those values guided their actions, and what good insights or experience-based thinking they had

What good qualities of theirs are worth learning, and what bad qualities are things you can criticise or avoid


<!--memo:851d918af534-->
### How to describe a product in one sentence

> 2025-02-21 21:56:50

Our

is a

It can

but it's different from

Its advantage is


<!--memo:78a7bc73f3b9-->
### What if I were about to die

> 2025-02-22 19:30:32

I'd go be a storm chaser hahaha, specifically chasing lightning and storms. America's Tornado Alley

Accepting death, choosing death, is accepting the self that exists as the last self-awareness


<!--memo:d106686f2b37-->
### If Qiong Yao were in mainland China she would never have committed suicide

> 2025-02-25 23:40:21

Collective consciousness is higher than self-consciousness; you don't live only for yourself.

People will surely die, and we should all have the right to choose our own death.

Actively think about death, discuss death, and then think about how we should live.

Calmly accept the impermanence of life, and actively share your own understanding and views on death with your family.

Don't avoid death; instead, by thinking about death, find the true meaning of life.

When talking with your loved ones, the most important thing is to talk with yourself. Don't worry about taboos there, don't worry about other people's views, but rely on your own feelings to judge honestly.


## 5. Business, Investing and Career

*3 entries*

<!--memo:13c4686e86b9-->
### Why the wealth gap in the US is so large

> 2025-02-19 18:13:04

Rich people mainly make money from assets, ordinary people live off wages, and without a job life gets even harder

Compared with some high-welfare countries in Northern Europe, where people rely on government welfare subsidies, the Gini coefficient is relatively low. The US welfare system suits a free-market economy.

American social culture leans more towards "survival of the strong".

American history promoted individualism and the "American Dream", encouraging everyone to achieve success through their own efforts. In fact, since the founding of the United States it was individual striving and the frontier pioneering spirit that built national identity, and this historical memory has shaped modern American society's pursuit of the "strong" to a large extent

Traditional Chinese culture puts more emphasis on collectivism and social harmony; through group support and government intervention it can better take care of the weak, pay attention to vulnerable groups, and pursue equality for all and a smaller wealth gap.

The most fundamental reason for China's large wealth gap is the economic system transition and market-oriented reform, but the uneven development of the urban-rural dual structure has led to a very large wealth gap.

To a certain degree, totalitarianism promotes egalitarianism, but going from high entropy to low entropy causes energy loss. I understand this loss as having a kind of balancing relationship, just like during the Landlord game and the Cultural Revolution — it's simply a question of building a healthier balance or a less healthy one.

Of course, from *Sapiens* and from ancient times to now, in terms of changes in productivity: when technology, productivity and artificial intelligence fully relieve humanity of the pressure to survive, and an efficient and just government guarantees basic welfare, the essence of happiness will shift from the accumulation of wealth to each person's pursuit of spiritual freedom, inner satisfaction and the meaning of living together in society. That is probably real communism.


<!--memo:872c37240d3e-->
### Some thoughts on future AI products

> 2025-02-20 12:09:26

Big companies / founders: I want to cut costs and raise efficiency, I want to replace humans with AI, I want to replace the supply chain with AI.

The thinking goes like this: the old customer system and pre-sales/after-sales had clear divisions of labour, and now AI replaces most of it and can be online 24/7. This path is clear, and most AI founders are taking it.

Purely taking the "replacement" route may not be enough to create an entirely new pie. That is, everyone is still eyeing some old pie or market share, using AI to cut costs / raise efficiency and grab a portion to eat. In essence, that's incremental improvement.

Today more innovation tends to come from the intersection of fields, for example AI + art / AI + finance. Then there's a portion of technological innovation, which is essentially paradigm innovation.

The explosive rise of cursor-type products suggests a new way of thinking: not simply "replacing" humans, but achieving paradigm innovation through AI and human collaboration, like the philosophy of the overman described by Nietzsche. The overman is a fairly positive concept, referring to a person who dares to surpass themselves, to criticise themselves and to revalue values.

Cursor treats AI as a collaborative partner: it keeps human creativity and judgement, while using AI's data processing and pattern recognition to make up for human shortcomings.

On the surface the two look not very different, but in terms of the extension of the mindset, the difference between these two will become very obvious in the future. The second one can better bring out an individual's value, and it tests the individual's ability more. At present, how well people use AI's capabilities largely depends on the individual's ability, and is still limited; an ordinary person using AI may only be able to use 0%–20% of its capability.

Information research and existing theory alone cannot fully verify the effectiveness of a new model; only by experimenting yourself can you gain real insight and opportunities for improvement — this is what we call empiricism. Drawing information from failure and thereby forming a new "sense" not only helps raise the level of products and technology, but also empowers individuals, letting them break through the limits of traditional markets with extraordinary ability.

The real breakthrough lies in building a system, or an interaction model, that lets users experience AI's full potential — similar to how the original operating system OS went from kernel to Windows and Linux. The release of those OSes actually set unified specifications and pushed things forward through more suitable ways of interacting, not just the terminal, thereby driving personal growth and the upgrading of economic structures, going beyond big companies' simple replacement effect to achieve a more creative restructuring of value.


<!--memo:1313b8a2e55f-->
### Exploring human motivation

> 2025-02-22 12:32:17

What, most essentially, is self-motivation? You have to know what you want, and drive yourself to get what you want.

What is your fear? The fear of boredom, or the fear of mediocrity?

Some prices are negligible when it comes to the driving force of human nature.

Actually motivation isn't only these things; people are very complex. One is the pursuit of survival and safety, then the pursuit of happiness and a sense of achievement, then the pursuit of social belonging, and also the pursuit of curiosity and the desire for knowledge.

The above is internal motivation, arising from within the individual. Besides that there's external motivation, for example incentives and rewards at a company, social pressure and environmental conditions, age pressure, competition and so on.


## 6. Reading, Ideas and History

*2 entries*

<!--memo:3d5611a66218-->
### What will the symposium of private entrepreneurs bring

> 2025-02-19 11:15:46

Authorities send a signal, encouraging private enterprises to develop

Policy support is given, private enterprises feel at ease

Liang Wenfeng and Wang Xingxing, idealists, appear — emerging forces and companies


<!--memo:87991085d531-->
### Learning a new domain fast

> 2025-02-27 12:25:15

Recently I've been working on a new product that actually helps people learn fast, and I've been reflecting on how I learn a new domain.

I understand that a person's learning process has several key stages:

The process of acquiring more information

Making more precise and effective judgements after acquiring information

Thinking about information within a limited time, imagining, designing and calculating a better strategy

Execution

Information is messy, especially online information. Information in books has a slightly clearer thread, but its richness is far less than the internet. So organising the threads of online information clearly is more conducive to our memory and thinking.

This is structured thinking, like a binary tree where we keep recursing to find a more refined knowledge system.

So to learn a new domain, most likely this domain is a system that predecessors have already learned and summarised, written books about or made courses to solve. Or, to be lazier, just find some articles or videos online about approaches and systems.

AI's development has brought more efficient learning systems, but the problem that comes with it is that we need to keep asking and probing to add depth to this tree. So asking and probing requires us to have some understanding of the existing knowledge system, or to already have many options that can spark inspiration.

For humanities-leaning questions, analyse the threads through a timeline, for example why this person is like this, why this government is like this.

When is result-orientation very useful? Actually there's a lot of news, but the impact of an event needs to be argued with data or objective things, for example the stock market, where you can find some free data sources.


## 7. Travel, Places and Cities

*2 entries*

<!--memo:e232853e6d91-->
### ACT: my first high-altitude trek

> 2025-02-20 10:49:59 · `#徒步`

After finishing the ACT, it felt like I'd completed a personal transformation — for example, I got even more tanned!! Four months in Dali and Thailand had already tanned me into a local, and this time the high altitude directly let me blend into Nepal.

Of course the more important transformation was in myself; trekking is actually a very good process for getting to know yourself.

I really enjoyed the trekking process. Trekking is especially a process of focusing on the present, and clearly I love that state.

I cried twice during the trek. One time was while walking to Tilicho Lake. Tilicho Lake is a separate route, a same-day round trip, sort of a side quest of the ACT, and it's very hard: a long stretch has no supply points, and that day I was carrying a lot. I had no choice but to forcibly dump heavyweight clothes, my power bank and so on along the way. Because it was a round trip, my companions didn't need to wait for me and ran pretty fast. That morning I had a fever; my fleece hat felt strange, and at night I accidentally knocked it off, so the next day my head hurt a bit. Add to that being at nearly 5,000 metres of altitude, climbing about 1,196 metres and descending about 1,226 metres, and my body was extremely weak. High altitude headache, feeling like every step needed a lot of strength summoned, and under low oxygen the burden on muscles and heart is heavier. Countless times I wanted to give up — not because I couldn't hold on, but because I was wondering what the meaning of this really was. I was lagging far behind my teammates, and I clearly knew I couldn't keep up with them, and probably they wouldn't wait for me to reach T Lake and would come back down together. Better to stop and wait for them to come back. A teammate said one sentence: try your best. I held on. If holding on has no meaning, then giving up seems even more meaningless. And so I kept going alone, walking and stopping, and behind my sunglasses I couldn't help crying. It felt like a deep internal release about self-challenge, growth and vulnerability. So trekking really is a way to know yourself very well; especially when you break through your own limits, it was character that supported me for a long time.

Another place was when we encountered icefall: Churi Ledar → Thorung Phedi → High Camp. At first there was a choice: there was a bridge ahead, and they said the bridge route was an easy route, so we didn't take the bridge. Encountering the ice surface was really shocking — the whole path was ice, with a cliff beside it. On ice/snow/glacier sections, if we slipped our lives might have stayed there. We hadn't expected today's route to have a section like this, so we hadn't prepared crampons. One guy carried a load and risked crossing, then came around above the ice blocks to meet us. We still slipped, but it was scary without disaster — luckily we didn't fall on the ice.

After we got across, it seems another group came along behind us, also from China, the Chuanxi team. We shouted for a long time, but they apparently still didn't understand, and then they also took this route, without turning back. One of the guys at the front also didn't have crampons and fell. We watched from a distance and broke out in a cold sweat. Luckily his backpack hit the ground first, and the backpack happened to have an anti-slip effect, which kept him from falling down.

I've never regretted any of my own decisions, but at that moment I had a little regret about my choice, because I feared that kind of death. In the face of the extreme and the unknown, what do I really want? And the answer is often not simply "escape" or "hold on". It's important to see clearly your own true needs and fears. In facing an uncontrollable outside world and inner vulnerability, our choices shape our existence.


<!--memo:002e306ff9bc-->
### Paying attention to details is often what moves people most

> 2025-02-22 22:14:45

At a Nepali restaurant in Pokhara, Nepal, while ordering I kept agonising over what to order. My friend was curious about what the third set meal was, so she asked the waiter. The waiter said it was what I had ordered last time. I was a bit surprised; last time seemed to be two or three weeks ago that I came to this restaurant. I hadn't been back in between, and every day this restaurant has so many people coming and going, so many faces, and so many cuisines. Yet she remembered it clearly. I couldn't help thinking back to my earlier thoughts about the sense of time: "I feel like every day working in the office is a repetition, I feel my sense of time draining away very fast, but every day of trekking is remembered very clearly, because every day feels interesting, very present, full of change."

The many customers pouring into the restaurant and the various faces easily make you think the waiter is doing repetitive labour, responding mechanically. In such a scene her memory seems especially precious. In an instant it made me feel good about this Nepali restaurant 🥹, and gave me new respect for the profession of waiter.

Before leaving, I again left a small tip. Actually in Pokhara I very often left tips. The young woman seemed to think the dolls on the side of my bag were very cute, so I took them off and gave them to them. Then the next day they made me a cup of hot tea. I was a bit moved — goodwill gets passed on, doesn't it?

Afterwards I went back to eat a few more times, and it seemed they'd found a trick to avoid taking tips — they stopped giving me the bill folder (because every time I liked to tuck an extra tip into the bill folder). I was a little resigned, and my heart was very warm. The waiters were so lovely, they kept giving me desserts, and before I finally left they had my friend bring dolls from China, and I gave the dolls to them. They were moved almost to tears. I really couldn't bear to leave Pokhara either 🥹. They taught me a life lesson: real connection comes from attentive care and the passing on of goodwill, and every post and every role has a soul.


## 8. Body, Health and Daily Life

*1 entries*

<!--memo:b4497573f1e1-->
### Cognitive dissonance

> 2025-02-27 21:26:31

When does it appear? Scientists found that when a person holds two or more contradictory cognitions at the same time (values, beliefs or attitudes), it produces discomfort and tension; the individual usually tries to reduce this sense of inconsistency by changing their own attitudes, beliefs or behaviour, thereby restoring inner balance.

For example information conflict: a person who believes healthy eating is important discovers that what they most like eating is junk food. After making a major choice, they generate negative thoughts about the option they didn't choose.

People also tend to avoid accepting information that conflicts with their own views — recommendation algorithms especially amplify this phenomenon — and tend to seek out information that supports their own views.
