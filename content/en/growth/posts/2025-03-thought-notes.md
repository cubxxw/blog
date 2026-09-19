---
title: 'March 2025 Thought Notes: AI and Agent Systems, Self-Knowledge, Engineering'
ShowRssButtonInSectionTermList: true
date: 2025-03-31T23:59:59+08:00
showtoc: false
weight: 1
tocopen: false
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
  A complete record of March 2025: 52 notes across 7 themes, led by AI and agent systems (21), self-knowledge and psychology (15) and product, engineering and open source (8). Entries keep their original timestamps; only notes that could hurt a specific person or myself were left out.
tldr:
  - "Distillation plus reinforcement learning showed up again and again in March, from inference and code review to multimodal applications."
  - "AI agents moved from chat to actually acting, with MCP and similar protocols doing the coordination work."
  - "Experience beats opinion: honest conversation and reading other people's cultural context is what actually resolves conflict."
maturity: budding
---

# 2025 March Thought Notes

> **52 notes this month** | recorded from 2025-03-01 to 2025-03-22
>
> **Themes**: AI and Agent Systems 21 · Self-Knowledge and Psychology 15 · Product, Engineering and Open Source 8 · Daily Notes and Everything Else 4 · Business, Investing and Career 2 · Travel, Places and Cities 1 · Reading, Ideas and History 1
>
> Everything from the month is kept here, filed by theme, each entry carrying its original timestamp.

## Quick Navigation

**52 records this month, filed under 7 themes:**

- [AI and Agent Systems](#1-ai-and-agent-systems) · 21
- [Self-Knowledge and Psychology](#2-self-knowledge-and-psychology) · 15
- [Product, Engineering and Open Source](#3-product-engineering-and-open-source) · 8
- [Daily Notes and Everything Else](#4-daily-notes-and-everything-else) · 4
- [Business, Investing and Career](#5-business-investing-and-career) · 2
- [Travel, Places and Cities](#6-travel-places-and-cities) · 1
- [Reading, Ideas and History](#7-reading-ideas-and-history) · 1

---
## 1. AI and Agent Systems

*21 entries*

<!--memo:42db951afb1b-->
### Thoughts on the DeepSeek R1 design paper

> 2025-03-01 14:11:41

Engineering thoughts

The engineering significance of the architecture is better than its algorithmic significance; on the engineering side it offers a lot of reference value.

Design thoughts

Distilling a strong model can yield very good results

To cross the boundary of intelligence you still need a strong base model and larger-scale reinforcement learning

Reasoning large models tend to break a question into smaller steps before answering it

With reinforcement learning alone, without supervised fine-tuning, a large model can still show emergent strong reasoning skills.

Giving the model some reference thinking notes is also important; supervised fine-tuning can partly solve the problems of poorly readable output thinking processes and the occasional mixing of Chinese and English.

A minimal-intervention template guides the model to freely explore different approaches to solving problems, without restricting the thinking method, and this may bring many surprises.

A simple, direct reward approach: accuracy reward (answers to maths problems) + format reward (an easy-to-follow chain of thought). Put the "thinking process" inside a specific tag (such as ...), and the answer inside ...; there's no need to train a separate reward model. It feels like a fixed college entrance exam mechanism for screening .... Simple and effective.

R1 also released six small models distilled from R1. The small models also have a certain reasoning ability, and in some scenarios even surpass small models that went directly through reinforcement learning without distillation, which offers some thinking about future model scenarios. Knowledge distillation + reinforced models: small models deliver unexpectedly good results in many application scenarios.


<!--memo:45ab7300e26c-->
### Multimodality & cross-domain thinking

> 2025-03-01 17:30:25

Large model platform + domain fine-tuning + knowledge distillation; the future trend for fine-tuning may be domain supervised fine-tuning plus parameter-efficient fine-tuning (such as LoRA)

Text domain -> multimodality is a trend. More and more attention is on human-machine interaction, with large batches of interaction tools solving this problem, for example cursor; expanding to voice, video and other modalities is also a trend, with AI's realm being all-sensory AI.

Cross-domain knowledge integration is also very important; more complex real-world problems often depend on a thorough grasp of knowledge from different professional domains.

The modularisation trend may borrow architectures like Mixture-of-Experts (MoE), letting different parts specialise in different tasks, thereby improving overall efficiency and performance. This approach can also link to or combine with knowledge from different domains.

As for the results produced by small models, distillation produces better results than directly reinforced models, and saves cost. Distillation technology can effectively transfer these capabilities to smaller, more computationally efficient small models, so that small models can also reach a fairly high performance level in practical applications.


<!--memo:dc3f937ec5fc-->
### How to understand the RFT strategy

> 2025-03-02 21:53:02

The advantages of supervised fine-tuning: DeepSeek R1's pre-training also used it; it's very strong at reproducing features from input text or images, and especially suited to changing a model's tone, style or response format.

Reinforcement learning fine-tuning lets the model reason in entirely new ways within a custom domain, and its learning ability is extremely strong.

Fine-tuning a reinforced model defines the model based on human preferences and rules so its output matches preferences and value criteria. For the first time it lets developers, researchers and machine learning engineers use reinforcement learning to create expert models that excel at tasks in a specific domain; in this process the model automatically adjusts how it learns and thinks.

By comparison, fine-tuning a reinforced model suits reasoning models better and is simpler: only a few dozen use cases are needed to produce very good results. And it doesn't only adjust the logic of the model's output, but also the model's logical thinking and reasoning process.

Compared with DeepSeek's simple scoring logic, here we can also think about using an AI grader.


<!--memo:689187406c98-->
### The shape of Agents

> 2025-03-02 22:43:16

Everyone is on the road of exploring Agents, and the simple Agent product form seems to be nothing more than auto-agent

The combination of Agents and RL — deep research seems to have validated the feasibility of this path.

ref: auto-gpt: https://github.com/Significant-Gravitas/AutoGPT

agent list: https://github.com/e2b-dev/awesome-ai-agents


<!--memo:cbd3ada15614-->
### Handling hallucination

> 2025-03-02 23:14:10

Methods for solving hallucination at the current stage:

Knowledge distillation and soft labels can reduce hallucination; knowledge distillation has the teacher model provide soft labels in the form of probability distributions to fine-tune the student model.

In reinforcement learning, a reward model can guide the LLM to answer honestly

RAG is also an effective means, and the industry generally considers it the most effective.

Chain-of-Verification (CoVe) has the model first generate an initial answer, then plan several fact-checking questions, answer them one by one, and correct the original answer according to the verification results, so it can correct its own errors.

Prompt self-verification guides the model to check its own output. For example, after generating an answer, append an instruction such as "please check whether there is anything uncertain in the above answer, and if so cite reliable sources", prompting the model to think a second time and give grounds or revise the answer.

Tool calling clearly solves some fixed-procedure problems (calculation) and real-time problems (search) well.

Decoding strategy optimisation: lower the temperature, use greedy or beam search rather than random sampling, to improve output reliability

Fine-tuning solutions: add a large number of high-quality, factually accurate examples into a stage, so the model learns to stay cautious when uncertain.

My understanding of hallucination:

Model hallucination can now be controlled to an acceptable range at the product level, and the requirement for hallucination is not uniform across domains:

Open domains: for example the knowledge domain, currently AI's main domain, where it's generally best to design refusal-to-answer and retrieval-augmentation logic, plus a clever testing method: let two or more models cross-validate to get the correct information.

Creation: for now I can't think of downsides; raising the temperature seems more conducive to divergence.

Professional domains: a fairly common scenario — fine-tuning + tool verification. I mentioned reinforced fine-tuning earlier, but in the short term in professional domains I'm more optimistic about the scenario of interaction logic, the overman concept.

ref: https://lilianweng.github.io/posts/2024-07-07-hallucination/#:~:text=balanced%20results%2C%20especially%20in%20terms,metrics%2C%20compared%20to%20two%20baselines


<!--memo:235392f0cb64-->
### Thinking about the universality of AI application scenarios

> 2025-03-02 23:44:16

Application scenarios seem to have been reactivated in 2025, and a large batch of projects again started a lot of thinking.

Deep Research's Agent form is also universal within a certain range. Observe the large number of researchers, many people who need to do a lot of online research or need external context for their tasks; this requires strong reasoning ability and the ability to discriminate among information sources, and also creativity. Obviously, retrieving questions, deeper follow-up questions and deep reasoning form a very apt scenario, and one that was tiring to solve with the old chat mode, which needed frequent searches and follow-ups. Essentially: solving the process of searching and organising information through a large amount of time. This is a general ability, and it is universal.

We always think the code we write is smarter than the model, but as the field develops, models often find better solutions than humans. Try not to let things get fixed, and instead let the model learn for itself.

Data is the red line for a company's survival, and deep research has also proven this to us.

2025 is the year of agents. We're reflecting on how agents will develop, and what role RL will play in 2025 agents?

ref: https://www.youtube.com/watch?v=bNEvJYzoa8A


<!--memo:89ddd97fb27f-->
### Thoughts on RFT

> 2025-03-03 17:10:15

Definition: building on SFT, further optimising the model through reinforcement learning, usually using reward signals (for example rewards generated from human feedback) to guide the model towards outputs that better match user expectations and actual needs.

A few of the most core points: after the pre-trained model produces a large number of samples, the key lies in the filtering process, where some filtering mechanism (a person or some system) selects high-quality samples. This process can significantly improve the model's performance.

So RFT filters, within the generation paths, the reasoning paths that can correctly derive the answer to the problem, including paths with different calculation processes and different expressions.

It introduces diverse reasoning paths, which is also about improving the model's generalisation ability on problems it hasn't seen.


<!--memo:3c1d56050204-->
### Future scenarios for reasoning models

> 2025-03-03 19:11:46

It combines fast thinking and slow thinking, human scenarios, including reinforcement learning, and the characteristics of large models:

Handling vague or incomplete information — in short, incomplete prompts and intent, which the reasoning model slowly reasons out

Finding the key information among a sea of information: especially among large amounts of information, since generalisation ability is very strong, this is what RL is good at. Unsupervised learning lays the foundation, SFT is responsible for remembering details, and RL helps the house adapt to different environments.

Finding connections and subtleties in massive data

Multi-step reasoning and planning — it's extremely good at this, acting as the planner. Then ordinary models do the execution; there are many scenarios for this in applications.

Visual reasoning: not just text, images can also analyse blurry images

Reviewing, improving and debugging code quality. For code whose execution speed isn't very sensitive, I think reasoning is fine


<!--memo:66a581045111-->
### Some predictions

> 2025-03-04 11:57:32

Winner-take-all may appear in the consumer space, but on the enterprise side richer customisation means a single product or platform often won't dominate the whole field

Shifts in business models may have more predictive value than changes in technology trends

Some markets can tolerate many winners, for example cloud — that market is big enough.

The form of an agent manager, not just a chat interface. It's something smarter than a chat interface that manages all agents and their conversations

The three big scenarios of the future: AI, quantum computing, and hybrid scenarios (presence — or the metaverse).

What constrains superintelligence is the law; real trust needs to be established

Guaranteeing the permissions of the agent OS sandbox — it cannot exceed a certain permission level, this is a requirement

Cognitive labour is not fixed. As said before, after unemployment there will also be a new occupational system restructuring, just a level up of cognitive labour. So at a macro level they will redefine the boundary of cognitive labour, rather than making all cognitive labour disappear entirely; the era of human-machine collaboration is getting closer.

From Jasper to ChatGPT, then to Monica and Console, systems will keep fusing tool calling, cloud execution and natural interaction


<!--memo:4c1d7beaf291-->
### Agent OS present and future

> 2025-03-05 12:08:46

Agent OS present and future

The approach currently being practised:

Deep research also has a structure tree, which is a structured representation of operations for this kind of scenario: the model and APIs are called in an agent-like way, then in a while loop it searches + reads + reasons.

The Computer Use feature can read screenshots, move the cursor, click buttons and type text, thereby automatically completing tasks such as filling in forms, looking up information, planning routes and even ordering takeout. A big scenario I can think of is operating a browser: Claude can operate the cursor in a browser, click the relevant position, enter information using a virtual keyboard, and AI can capture and analyse the screen, and can also use various standard tools and software programs

In my own analysis and understanding, actually considering the future shape of software, I lean more towards this logical relationship:

Each APP contains one or more agents, and the APP serves only as an interaction window

An agent OS can manage many agents. This form isn't settled yet; I thought of two possibilities: one keeps a logical relationship with the operating system, where one operating system maintains one agent OS that can schedule all APPs. The other is a unified specification scheduling platform exerting control

Each APP schedule calls all the agents to complete tasks, and it may even be possible to send requests through agents in other APPs; of course it's also possible that the agent OS schedules agents in different apps to complete the corresponding tasks and needs.

An agent is more like a service, released separately, just that compared with a normal service it's a service with intelligence; this part needs specifications and templates

Agent layering logic: application layer, kernel layer, hardware layer.

ref: https://sierra.ai/platform

https://www.alan.app/#:~:text=Controllable%20AI

https://github.com/All-Hands-AI/OpenHands


<!--memo:1d2280552aa1-->
### Thoughts on Manus

> 2025-03-06 16:52:04

My feed was full of chatter about Manus, so here are some thoughts on Manus. The Agent field has seen a huge breakthrough. What's the difference from the traditional chat mode?

chat -> message

chat -> action

AI can now actually take action for you to get results, rather than just giving an answer.

What stands out about the Manus team is very strong engineering ability, and being the first to eat the crab of a general-purpose agent; the results really are very good. Compared with OpenAI's operator it's also much more accessible. In terms of innovation, there aren't really any innovation barriers; this form is really the combined product of computer use + virtual machine + artifacts + a built-in batch of agents. Claude's computer use bet on the right thing.

Calling Manus "the world's first general AI Agent" is a bit of overpraise, since there was AutoGPT and BabyAGI before, and those can count as "general" frameworks; plus OpenAI's operator and deep research are also general agents.

Something as general as Manus doesn't have much of a moat; it can be pushed up through engineering ability, and the recent OpenHands project is an example. Usually a general agent is either internalised by an LLM vendor's model, or built up through the ecosystem advantage of open source.

The browser is more contained: compared with operating a computer, it's not as easy to create infinite loops; there's a lot of open-source GitHub code for browsers, the end-to-end testing tooling is mature, and input and output are clear, making it easy to design a reward system.

Analysis of why the market is so hot:

It really does land in practice and solve real problems.

The last mile between model and business. Traditional large models perform excellently in conversation and content, but still lack an operator, and OpenAI's operator likes to keep things hidden and quiet

The halo of public opinion, the scarcity of the market, plus the "national fortune dividend — with all the previous viral hits like Xiaohongshu and DS". As for now, the results will inevitably stir a huge market reaction, plus entrepreneurs and internet practitioners have overly high expectations for the agent form. But it's also odd — Manus is entirely in English, aimed completely at overseas users; the domestic opinion effect is just quite absurd.

Suspicion of hype: the behaviour of self-media is very strange, a large batch of self-media rushing ahead of tech people to do tests and reviews, which feels like vendor PR. Agents still depend to a large extent on improvements in the base model's capabilities.


<!--memo:e668f538e559-->
### Claude's computer use capability

> 2025-03-08 14:42:00

Manus's core architecture is highly similar to Anthropic's "Computer Use", both relying on a multi-agent virtual machine environment to complete tasks.


<!--memo:47e59514c37c-->
### MCP protocol pattern integration

> 2025-03-08 20:10:51

Why MCP is needed comes mainly down to three factors: 1. the data silo problem; 2. security; 3. a unified standard

The architecture pattern is client-server: the MCP Client corresponds to the large model; the MCP Server exposes external data and interfaces.

The functional modules include three kinds, and each MCP Server can expose all or part of the modules according to actual needs: tools, prompt and resources

The communication mechanism chosen is JSON-RPC 2.0. Anthropic and the community have already provided MCP Server implementations based on Python, TypeScript, Golang and other languages


<!--memo:5f50f31a37fb-->
### Analysis of AI editing tools

> 2025-03-10 15:48:21

I mainly used two: https://clip.opus.pro/

and ByteDance's https://www.capcut.com/


<!--memo:b9c4aeba953e-->
### Some thoughts on Agent development

> 2025-03-14 20:05:56

Agent is the hottest word this year, and this year may also be the first year of Agents.

On how large models use tools, there are currently two mainstream approaches: computer/browser use and agent protocols

The latter is mainly Anthropic's MCP released last year, and of course there's also OpenAI's Function Call, but it focuses more on providing a simple, easy-to-use interface rather than standardisation. MCP's standardised interface can better support diverse tools and scenarios. For example computing 1 + 1 = 2 is very simple, function call is fine, but automating a data analysis workflow is not.

The former, in scenarios lacking standardised interfaces, can quickly achieve functional validation by simulating operations — for example calling various web page operations, calling the use of certain applications. It simulates user operations (at the GUI layer), whereas MCP is at the API layer: one is inefficient, one is efficient, and MCP is more of a long-term standardised form.

If what you're facing is an agent you can't develop or modify, then connecting to external services through the MCP protocol is more advantageous; MCP defines an open and standard interface. Ordinary people can install MCP with one click to implement business capabilities.

Also, agents definitely have classification levels. I feel this especially strongly now, with all kinds of strange agents appearing.

workflow agent: a chain composed of prompts and API calls, with a certain autonomy, but too many constraints.

Professional agent: autonomously decides which to call within the system — for example AutoGPT uses CoT technology to decompose complex problems and dynamically choose the optimal solution path

General agent, Agent's AGI: at the theoretical concept stage

An agent's capability depends on: Agent = LLM + Memory + Planning skills + Tool use

For example Claude's Computer Use is actually also Tool use

Planning skills: the ability to divide a big task into small tasks; reflection and refinement — self-reflection based on existing actions, learning from mistakes to optimise the next action. Besides that, some papers propose a more novel taxonomy: task decomposition, multi-plan selection, external-module-assisted planning, reflection and refinement, memory-augmented planning. Among these, multi-plan selection means giving the AI Agent a "selection wheel", generating multiple plans and picking the best one to execute; external-module-assisted planning means relying on an external planner, like a judge in reinforcement learning. Memory-augmented planning is like a memory bread that remembers past experience and helps with future planning. These methods aren't isolated but interwoven, together improving the AI Agent's planning ability.


<!--memo:ad36d700aac3-->
### Claude Artifacts

> 2025-03-16 14:13:45

Claude Artifacts


<!--memo:d91a86045223-->
### Fireworks and SiliconFlow / OpenRouter

> 2025-03-19 16:15:11

One is a "grand synthesiser" aimed at end applications, the other a "specialist" that digs deep into technical details and satisfies high-end customisation needs.

Fireworks emphasises letting end users see the reasoning process, parameter settings and options, making operation more intuitive and flexible. And it gathers all kinds of models and services into a unified interface, convenient for business-layer users to call directly.


<!--memo:ebed6ae374bd-->
### Cursor's MCP

> 2025-03-20 01:48:17

Cursor's Model Context Protocol (MCP) feels more like a plugin-system protocol, standardising the way applications provide context and tools to a large language model (LLM).

Interestingly, cursor's MCP seems more interesting than Claude's, and even more valuable.

We can imagine the MCP of an AI platform as a pluggable client system that allows users to install and manage MCP servers, and provides a graphical user interface (GUI) or command-line interface (CLI) for configuring and managing MCP servers.

It supports multiple transport protocols (such as stdio and SSE), which can satisfy many different needs

The ability to link various data sources is very interesting.


<!--memo:8663cea61d01-->
### Thinking about context

> 2025-03-20 18:42:32

Context is something the application can control and adjust itself, and this is very important for human-machine interaction.

Cursor controls code documentation through context, for example specifying a website, specifying a file, specifying an external web page address, and specifying git context. Note that the rules can be configured, and you can even set MCP control.


<!--memo:e1e29c712b67-->
### Thinking about WebRTC

> 2025-03-23 21:38:00

RTC gives an end-to-end strategy and has a lot of applicable scenarios in the Internet of Things.

Keep an eye on the use of musetalk and musev.

Some strategies currently supporting RTC:

OpenAI: supports the Realtime API

Hugging Face: Fast RTC, an open-source WebRTC library, which also supports Websocket, plus STT and TTS.


<!--memo:2ceed3760a26-->
### The bloodiest lesson in AI development

> 2025-03-25 17:45:12

Commit more, describe commits more precisely


## 2. Self-Knowledge and Psychology

*15 entries*

<!--memo:8ce5ba6eb2b5-->
### Everyone has opinions; experience is precious

> 2025-03-03 17:22:47 · `#人生/成长`

In the information age there's far too much information and opinion online. I called my dad, and at the end he passed on another opinion to me: my older brother was tutoring his son's homework, and his son couldn't do it, and he said something that my dad later found quite reasonable — that if you can't do it, don't do it, just pick the ones you can do.

I said there are too many opinions in this world. Everyone has opinions, but opinions come from your own life experience, and experience is raw material — the more first-hand the experience, the more it moves others, emotional raw material that makes people think. Growth is your own road; opinions are more like a person's early values and behaviour guide, while personal experience is an important process through which we keep revising and perfecting our self-understanding.

Our parents' experience also has a time window, and opinions even more so can't be applied directly. I said what I learn from it is that only through continuous experience and practice can each person form their own unique views on life, and better respect and understand other people's lives.

So don't be afraid of me growing up, and don't worry that a child's growth deviates from your own experience.


<!--memo:ab813a16def7-->
### My life lesson: you must do what you truly love

> 2025-03-08 14:26:58 · `#人生`

My life lesson: you must do what you truly love.


<!--memo:7ebd1d408ee0-->
### Soulmates

> 2025-03-09 23:44:52

There's a view that in love, most soulmates have one party accommodating downwards.

One party may be more tolerant by nature and better able to accommodate the other. My most essential understanding of a soulmate is a deep relationship with a high degree of fit in spirit, emotion and values. The essence of love is two people communicating deeply and inspiring each other to grow.

I'd say in my understanding love is the interaction between two independent parallel lines — how these two "parallel lines" interact through communication, understanding and cooperation, thereby forming a meaningful connection.

By comparison, "accommodating downwards" doesn't seem very accurate; there's no absolute accommodating downwards. It's just that from your own perspective you may feel the other person brings you a very high level of feeling and tolerance, when actually to some degree the other person may feel the same way, but we can't prove the other's consciousness exists. One-sided accommodation that isn't understood makes this kind of interaction very difficult.

Actually, hasn't it been like this with our parents and teachers since we were little? They kept accommodating us. The process of interaction matters very much, and the process of growth matters very much too.

Most relationships are superficial; a few may bring resonance; very few may be soulmates. Understand and accept this distribution, and don't hold overly high expectations for every relationship.

Whether it's one or two stage-specific resonances or the deep connection a soulmate brings, all are worth experiencing with care, while calmly facing their changes.


<!--memo:687b45765e29-->
### Reactions under the influence of alcohol

> 2025-03-10 12:18:56

Alcohol inhibits brain function; the prefrontal cortex is the region responsible for judgement, decision-making and self-control. When this part is inhibited, a person's rational judgement and self-control decline, so they may unconsciously say things and express emotions they normally suppress or hide.


<!--memo:1c3e036ccc6e-->
### Holi in Nepal

> 2025-03-14 11:55:51

From morning to night I went through a lot. Everyone's face was smeared with colourful powder, everyone was pretty happy, and I felt a bit emotional about Nepal's happiness — contentment brings joy, satisfaction in the inner world

I was happy during the day, and now I feel a bit melancholy. In the evening I happened to run into Mingming jie — Mingming jie, Xiaoxiong and Vanessa — at the crossing

Some friends probably won't meet again; some people probably only get that one encounter in a lifetime; some things, once done, probably won't leave a deep memory in many people. So should we just not do them?

Tomorrow Xiaoxiong and Vanessa will leave Nepal. We spent a long time together in Pokhara, taking classes together, making dinner plans together; in Kathmandu I hadn't realised my friends were about to leave. This meeting suddenly made me feel that this might be the last time.

Mingming jie said one sentence: leaving last again, walking alone again. It sounds a bit desolate hahaha. Walking on the street I couldn't help crying, but I could feel Mingming jie's understanding. We'd talked about it before — Mingming jie asked me how it felt when my friends all left. I said from what I know of myself, sadness is inevitable, and the one who stays is often the more hurt one; more than that it's reflection on that sadness, reflection on impermanence, thinking about the meaning of life, thinking about friendship. We took a group photo on this street — perhaps the last complete group photo.

Understanding impermanence, understanding ichigo ichie: every meeting and parting in life is an epitome of impermanence. Impermanence isn't a cold verdict, it's simply life's true nature, reminding us to accept change and find meaning within change. Impermanence doesn't mean negativity. It makes us better understand how to cherish the present, to grasp every moment spent with family and friends. Just as cherry blossoms fall quickly after blooming, their beauty comes precisely from being brief and imperfect. Our meetings and partings are the same: fleeting, yet shining because of their uniqueness

We treated each other sincerely and treasured every moment we were together, even knowing parting was near. This sincerity wasn't to hold on to anything, but respect for life and a salute to friendship. Perhaps we'll find it hard to meet again in this life, but that feeling won't dissipate with distance; instead, in parting it becomes even more precious


<!--memo:20abdc0405b8-->
### Always on the road of pursuing meaning

> 2025-03-15 12:44:05 · `#人生/成长`

No matter how you choose in life's multiple-choice question there will be regret; people always think the path not taken is full of flowers.

Many things aren't interesting once you see them too clearly. Don't resist, don't hold on.

In such a rich and colourful world, especially with an emotion as complex and multi-dimensional as love, we can often only capture a small part of it, and this tension is precisely the driving force for humanity's constant exploration, learning and growth.

Sex, hugging and dating are all important expressions of love, but they are only the external manifestation of love. The essence of love lies more in the deep emotional bond between people, in understanding and support, and in the process of growing together.

The essence of jealousy lies in inner insecurity and uncertainty about one's own worth.

Facing jealousy towards someone you like, I learned a very good method: understanding and accommodating the other person is very important, resolving misunderstandings, and eliminating unnecessary suspicion.

It's a normal reaction to feel jealous when you meet someone you like. There have been many such phenomena before, but there was never an essential reflection. Understanding and managing this emotion, thinking about why you're jealous, and thinking about why the other person did that — that's very good nourishment, and it can also help both you and the other person grow. Excessive jealousy may be a strong desire to possess.


<!--memo:7a7de585f712-->
### Some thoughts on the Chinese-Nepali hotel owner

> 2025-03-16 12:51:52

Reconstructing the experience

We'd agreed to go out together today. In the morning in Kathmandu I went to my friends' hotel to wait for them. Hotels generally have a common area, and their hotel also had a small common area, run by a Malaysian-Chinese female owner. At the time my friends were chatting and working in the common area. I'm also an AI founder and digital nomad; I waited for them to be free and worked on my computer in the office area alongside them, to avoid trouble — I connected to my own wifi, and used the tissues on their dining table. I don't like troubling others; I carry my own tissues and take them to the bin.

After my friends finished their work they were about to go upstairs to tidy up, and I continued working in the office area. The owner suddenly came over and asked, are you going to stay here? I said no, I'm staying at the hotel next door. Then the owner pressed on: doesn't your hotel have Wi-Fi? I said it does. No private space? I thought about it and the space was pretty good. No common space? I said there is also. Then the owner said this place is for our guests, you're not welcome. My reaction was that the owner was worried about trouble, but I still wanted to keep working a bit, so I said I could pay a tip, and that I'd clean the common area before leaving. The owner said you can go back to your own hotel to work, so I got ready to leave.

Thoughts

I reflected on the owner's motive and behaviour. The owner was very worried about people with no stake in the business occupying her resources. The owner probably took me for an opportunist freeloading a seat. I explained — there are many very nice coffee spaces outside where it's more comfortable to sit, it's just that my friend is staying here and I came to wait for my friend, who would come down right away. At that point the owner seemed a bit guilty, because I had formed a connection: I was waiting for my friend at her hotel, which is a completely reasonable phenomenon. In China, rules and human feeling usually reach a balance: if rules are too strictly enforced there's no human warmth, and if human feeling is overemphasised the rules become a mere formality. So in the Chinese cultural system, the Confucian idea of the mean also emphasises balance.

Actually in Nepali culture, including the hotels I stayed in earlier, I think Nepal's service industry is excellent. Compared with most Chinese cities, Hong Kong, and even Thailand which relies on tourism, I prefer Nepal's culture. Local service is usually known for being friendly and warm. Some things the earlier hotels did well: the places emphasising rules had very prominent postings — clearly transparent rules are usually friendlier to customers than opaque rules. This hotel didn't have that. Also, during the month-plus I lived in Pokhara, one thing made a deep impression on me: the service attitude at a Nepali restaurant there was very moving — the waiter even remembered a particular dish I had ordered two weeks before ....

Reflection

In overseas Chinese culture there's a gradual drift away from the inheritance of Chinese culture. Institutions are usually the product of technology and culture; part of technological change and part of political change will actually also bring some obstacles to cross-cultural communication. Even if one side is accommodating, the other side may be misled by emotion in its objective analysis, for example a natural distrust of me, or distrust of our kind of cultural group. So sometimes subjective influence and experience need correcting: the human tendency to prejudge based on past experience rather than the present communication — yet intuition formed from experience is often outdated or one-sided. This makes me reflect again: building a systematic model of a thing or a national culture, and constantly updating your own modelling system, is very important. Experience and communication are nourishment, emotional raw material; logic and reasoning are the method; the abstracted rational logical structure diagram is the basis for guiding behaviour. Through correct training in this we obtain the stage-appropriate correct intuition, which helps us build an understanding of the true essence of this world. Human nature swings between rules (order) and human feeling (emotion); different cultures and individuals lean differently. Understanding this helps predict and respond to others' reactions.

After all, I've begun to be more tolerant and understanding of different cultures. In its global spread, overseas Chinese culture, as a dynamic system, is the natural result of evolving while adapting to new environments, including globalisation and reform and opening up. Chinese culture changes very dramatically; culture is not fixed but constantly evolving. Understanding this dynamism can reduce negative judgements about "deviation". Experience is the source of perceptual knowledge, but if it isn't verified and updated it can become an obstacle to understanding. Reflection and adjusting intuition are the key to cross-cultural communication.

Also, I'm sorry for the past emotional reaction I had at the time. I could analyse the reason for the owner's emotion, but at the time I didn't go and solve this problem, which produced suspicion and distrust. Cultural differences are relative; there's no absolute right or wrong. Every culture's values and behaviour patterns have their historical and environmental basis. When facing distrust, don't rebut — try to understand the other's background and motives, whether cultural or personal, and then communicate. Also, when communicating, I may have had some mistaken lines of inference and analysis rather than actively approaching the facts and understanding the reasons. Empiricism emphasises perceptual knowledge (such as past experience); rationalism emphasises logical reasoning. Only combining the two forms a comprehensive cognition; relying purely on experience or purely on reason is not enough to deal with complex reality.

Culture and behaviour are a system, whose internal parts are interrelated. Analysing a problem within a systematic framework lets you find the root cause more clearly.

Social contract theory holds that rules are the foundation of social order, but human nature is also driven by emotion. Only by seeking a balance between rules and human feeling can harmony be achieved.

The world is changing, and cognition and behaviour must be updated accordingly. Continuous learning is a necessary condition for adapting to change.


<!--memo:fbfab374b424-->
### Human nature and communication

> 2025-03-17 02:11:36

Regarding that phenomenon with the Nepali owner: human nature includes self-protection, prejudice, emotional dependence and other traits, and all of these make communication difficult.

You can understand the other person's thinking and behaviour (for example why they don't understand you), but the other person may not be able to understand your intent and deeper thoughts. This "one-way transparency" makes you feel like you're talking to a wall

This comes from their cognitive model, because tolerance and understanding require a certain level of cognitive ability, and the other person may not have it.

Actually deeply understanding a certain group of people, or human nature, is very important. I have a new definition of human nature, and may even add it as a future decision factor. For example if I had taken human nature into account, I probably wouldn't have gone on to advise or persuade the Chinese-Nepali owner in Nepal.

Everyone has their own path of growth and limitations; not everyone can change, and it isn't your responsibility to change them. It's just that, based on a certain scenario and cognitive system, and your understanding of the real world, if you think you can slightly change the other person, then try.

Some people find it very hard to think; you can only talk about popular, surface-level things and phenomena. Try to simplify your expression, avoid abstract concepts, and communicate in a way they can understand.


<!--memo:3adb3051257a-->
### Understanding advice

> 2025-03-18 02:59:29

I've said before that giving someone advice is really giving them a useful information source or experience — for example through your own experience, though experience may not be applicable to the era, such as parents' pursuit of stability.

For people you're not very familiar with, try not to give advice. Many people lack the ability to think, and they may even feel you're disrespecting them.

Because the advice I've given friends before, including advice to my parents, depends to some extent on the relationship and sense of trust between the two sides, and some friends really do get your core idea.

Whether to give advice really has no standard answer — it's like finding the balance between "letting go" and "helping", and it mainly depends on your relationship with the other person, the situation at the time, and whether the other person really needs it.

Thinking about proactively offering advice

Cause and effect: you say one extra sentence and you may have influenced someone's thoughts or decisions, which amounts to meddling in their life trajectory. If the advice is bad and things get messed up, you may have to bear some responsibility. But actually, we are responsible for planting the tree and watering it; we can't control the final fruit, since the result still depends on the tree itself. Why agonise over it.

Human nature and advice, the essence of disliking advice

Most people, when hearing advice, are actually considering their self-esteem. Just like today with a retired older brother in Beijing — when his advice came to me I always felt a sense of looking down from above. But analysed rationally, he was telling his own experience, which brings me food for thought, and that is meaningful.

It shows that advice generally may carry the giver's human nature, part of their private motives. Sincere advice is usually easier to accept, because it conveys concern for the other person's wellbeing rather than personal interest. However, completely selfless advice is very hard to achieve in reality — the advice-giver may unintentionally carry a sense of superiority, a desire for control, or the psychology of expecting recognition. Experience is deeper and more first-hand than opinion; and another part: when we tell our experience and opinions, aren't we also reflecting on ourselves? What is our purpose? This is also part of understanding ourselves. ps through reflection, deeply understanding yourself and the other person, human nature.

Another part is actually avoiding a desire for control. Parents and children in China seem especially prone to this. In the rebellious teenage years, some people particularly hate others meddling in their affairs, feeling this is their own turf, and parents can't just order them around either.

Another part feels like it's about trust. It's the same between me and the hotel owner: the other party instead worries about whether I have ulterior motives, or worries whether the views expressed will show up online, in short videos and so on, suspecting you have some little scheme.

How to give advice correctly

Don't rush to speak. Figure out what the other person is thinking, their situation, and the blind spots in their vision.

Advice means offering options, or adding information about options, rather than issuing orders. This is very important. Everyone has their own road to walk and has the right to decide for themselves, even if you think they may trip and fall. As a bystander, we have to respect that autonomy.

Avoid giving advice when the other person's emotions are off, or when they're not rational enough.

Practical guide

If unsure, still ask whether it's okay — though this isn't reliable either. I asked in advance "do you want to hear my thoughts?" and the other person agreed, but inside they still resisted. This part requires analysing the other person's character in light of human nature, and the corresponding cultural system.

Experience often matters more than opinion; experience is more first-hand, and the more first-hand the experience, the more it triggers thinking. So tell more of your own original stories — everyone has opinions.

Ask more questions. I've talked about this on the blog before, around some themes

What do you really want? (cutting straight at the surface excuse)

What have you tried? (avoiding repeating suggestions)

What are you most afraid of happening? (locating the source of fear)

Advice is a strange thing — that's how this world is. Essentially it's also something we come up with after building an ever more real understanding of this world; a more accurate understanding of this kind of person tells us whether they're someone willing to follow advice, and an accurate understanding of things helps us provide accurate advice. It seems the value of advice doesn't lie in what you said, but in what the other person actually took in.


<!--memo:188ed9754075-->
### Some thoughts on human nature

> 2025-03-18 16:04:59

Actually, in the Western individualist view, in 99 percent of cases no matter how serious the mistake a person commits, they will never blame themselves. Compared with Eastern traditional culture, which is influenced by Confucian thought and values humility, self-examination and self-improvement, the West emphasises self-worth and self-motivation more to a certain extent; even after failure, it's easier to protect self-esteem through positive self-suggestion.

Rather than confess, people would rather blame everyone. People fear blame; actually what they fear is not being understood. Understanding replaces accusation — put yourself in the other's shoes and think about why they are like this, and sympathy, goodwill and tolerance are born from that.

Don't criticise, don't accuse, don't complain.

Actually, if you carefully analyse how you get along with the other person, every detail of theirs can give you something to reflect on — for example why they did that, what the reason behind it is; every detail and behaviour of the other person can be reflected upon. But human nature is lazy: intuition and emotion are our natural tools for interacting with the world, and they don't make things too complicated for us. But actually, if you think about every emotion and detail, a person will be very tired, both feeling the emotion of the moment and piecing together the other's motives and character in your head. I understand true wisdom as the balance between the two — intuition and emotion help us feel and understand the world, analysis helps us understand the connections behind things. I feel the charm of growth lies in exactly this: use intuition to feel the other's warmth, use reason to understand the other's inner world, use emotion to embrace the other's imperfections.

To get someone to do something willingly — threats and intimidation can do it too, but the consequences go without saying.

Some people think the desire for sex and success is humanity's eternal driving force.

Some people think the deepest inner drive of human nature is "the craving to be important".

What everyone craves:

A healthy, long life

Things

Sleep

Money & what money buys

An immortal soul in the afterlife

Sexual satisfaction

Children safe and well

The feeling of being valued

At the bottom, human nature deeply craves praise; praise can give a lot of power to relationships between people.

Feeling that you yourself are important is likewise the biggest difference between humans and animals.

When dealing with people, remember this — people are not rational creatures. They are driven by emotion, ruled by prejudice, and pride and vanity are their sources of motivation.

Anger is easy; forgiveness, understanding and pardon are hard — and these are the precious treasures in human nature

To understand all is to forgive all.


<!--memo:b57975462539-->
### Understanding personality

> 2025-03-19 14:56:03

Personality is too broad a topic; it may cover personal charm. Personality refers to the characteristic patterns of an individual's thinking, emotion and behaviour, and the psychological mechanisms hidden or unhidden beneath these patterns; character is a more common word,


<!--memo:0efe698c0780-->
### Thinking about how dogs express themselves

> 2025-03-21 23:29:55

Previously I occasionally got barked at by small dogs — even the very gentle small dogs in Nepal — and I was very puzzled

A friend keeps a dog, and I observed that when dogs compete over food, or when a male dog approaches a female in heat, they make a low growling sound — that's a refusal, telling the other not to come closer. Also, dogs often whimper; at first I thought the dog had a cold, but actually the dog is hoping you'll help it, usually it wants food or wants to go out and play

Dogs have a set of methods of communicating with each other, and we can easily identify them.

For example, staring directly into a dog's eyes represents hostility. Habitually looking at dogs the way you look at people, and getting intimidated, is normal.

Then there's marking territory by urinating. When dogs meet they sniff each other's rear ends; through these smells they identify the owner, distinguish sex among their own kind, detect heat status, mother-child relationships and so on

A dog's tail is the external manifestation of its mood: wagging the tail means happy, tucking the tail means afraid, hanging the tail means depressed, and so on

When dogs meet each other they'll lick the other's mouth corners; this is actually one of the ways dogs greet and communicate, generally meaning they get along well

Sometimes in Nepal dogs sleep during the day and bark at night, and a whole group of dogs becomes active: one dog notices something and barks, and the other dogs, hearing it, join in. This is a kind of alarm call echoing between dogs.

Quite interesting — it's about how dogs express themselves. Language is our way of understanding and interacting with the world; tone, pitch and movement are a dog's way of understanding and interacting with the world. Actually, much of the time our understanding and tolerance come from understanding the logic behind movements and behaviour.

Tolerance is precisely the process from misunderstanding to understanding — not rushing to judge, but exploring the logic behind behaviour.

Dogs don't hide their emotions: a wag or a tuck of the tail and joy or anger is fully visible. People often hide their intent, and language instead becomes a cover. In this contrast, the dog's "truth" seems purer.

The survival logic behind behaviour: why are Nepali dogs more relaxed, lying by the roadside all day without a care, while Chinese dogs guard the house and bark all day? I kept thinking about the reason behind it.

Actually dogs are also a product of their environment.

Nepal's dogs are mostly strays; they've coexisted with people for a long time, the environment is relatively relaxed, the survival pressure on dogs is lower, and they blend in with the environment better.

Chinese dogs are mostly kept at home, and there are fewer stray dogs on the street. Domestic dogs are kept enclosed, have strong territorial awareness, and when a stranger approaches they instinctively bark to guard. A dog's survival depends on its owner; the environment is no longer symbiotic but separated. This tension makes their expression more aggressive.

Existence is always entangled with the world; adapting to this world — one is the freedom of being accepted, the other the guarding of being confined.


<!--memo:195329da1a5a-->
### The extreme of emotion and reason

> 2025-03-22 13:18:46 · `#人生/成长`

There is no absolute binary opposition that can serve as truth; binary opposition is a product of human language and thought, not the true state of the universe. That includes right and wrong: right and wrong depend on the observer's standpoint. For example on moral questions. Daoist thought — Laozi also said misfortune lies where fortune leans, fortune lurks where misfortune hides; good and bad are also part of a dynamic balance.

For example wave-particle duality describes how microscopic particles (such as photons, electrons) simultaneously possess both wave and particle properties. It shows that nature is very complex at the microscopic level, and not a single property.

Thinking, Fast and Slow's two systems

Fast, intuitive thinking, similar to emotion

Slow, analytical thinking, similar to reason

Emotion is more efficient, and thinking that way isn't tiring. Many things in life, for example talking, are mostly unfiltered — actually intuitive behaviour.

Having no logic is also a kind of logic; behind emotion there's also a mechanism. Intuition and emotion create, but their choices, style and expression actually all have a deep "emotional logic".

When emotion reaches its extreme, it breaks through chaos and the self and becomes a deep clarity and cognition — and that is another form of "reason".

What Daoism hopes to achieve — a peace beyond all concepts — is a holistic way of thinking that returns to the source behind all forms.

The core of this thinking lies in "letting go" — letting go of obsessions, letting go of the self, and finally being one with the "Dao"


<!--memo:13e9ea9349ab-->
### What matters most in family education

> 2025-03-22 17:19:31

A friend says many people he knows are from Europe and America, where children are very free, going out to explore the world with the right to choose and pursue their own hobbies.

Is the Western form of happy education really good? Educating children from childhood to think independently, live independently and be responsible for their own lives. We are more influenced by Confucian thought; we emphasise collective feeling, family responsibility and stability.

We understand many Western students as having a lot of bad habits: smoking, smoking marijuana, heavy drinking.

Freedom with a bottom line, independence that still has a sense of belonging. Parents still need a system and structure to control the general direction of growth, and to guarantee the safety bottom line.

Actually the best education should be based on an understanding of the world, an education system that fits how the future world develops,

And contact with nature isn't the most core thing. Cultivating a child's moral character, outlook on life and values is the most important.

Build in the child a sense of the world's complexity, and lead by example yourself; experience matters more than opinion, and teaching by example far outweighs teaching by words.

Everyone has the right to raise their own child; there's no right or wrong.


<!--memo:21e8211f8985-->
### The essence behind the act of following ✨

> 2025-03-29 11:20:05

Who you "follow" looks on the surface like personal taste, but digging deeper it actually reflects a person's inner pursuit of "meaning" and their understanding of "existence".

Following stars is often emotionally driven; stars usually carry some idealised image — beauty, vitality, success, or simply a dream bubble that lets people escape reality.

Following scientists — this group leans more rational, worshipping humanity's intelligence and exploratory spirit. Scientists represent the conquest of the unknown and dedication to truth; people who follow them may care about the bigger narrative of "humanity's progress as a whole", which really does require a bit of passion and patience.

People who follow literary writers. These people are often drawn to the depth of story, emotion and language. Writers dig into human nature through words and explore the light and dark sides of life; those who follow them may be looking for resonance, or trying to understand themselves through someone else's strokes. Literature fans feel more introspective, willing to find answers within the murk.

Human nature has no high or low, noble or base distinction essentially; what each person follows is just a projection of their inner needs. The main thing is whether the process of following is sincere, and whether anything is gained from it.


## 3. Product, Engineering and Open Source

*8 entries*

<!--memo:a3bcdbfc3241-->
### Some small tricks for using cursor

> 2025-03-10 13:07:24 · `#领域/工具使用技巧`

Start from a template. Begin the project by cloning a template from GitHub or another source to provide a solid foundation. Inside Cursor choose the "start from repo" option, and you can also use https://bolt.new/ to create a basic demo — very useful

Combine with trae. In chat mode trae has an obvious cost advantage, and its support for multimodality and images is much better; modifying front-end pages through images works very well. For complex projects, cursor handles agent logic better.

Use agent mode: use Cursor's agent mode (rather than normal mode) to create, edit and manage files through natural-language commands

Good at combining with perplexity, for example when I want to search with perplexity and get API code and examples

Create new conversations in Composer, and keep conversations short.

Iterate and improve constantly

Integrate GitHub Actions for automated testing; cursor is superb for writing tests, with very high ROI.

Speech-to-text tools are also very useful, Whispr Flow

Handing errors to the agent to handle is a very wise choice

Commit often, and keep well-formed tracking records; for cursor this is a very good habit

Deploy the project continuously, using Vercel

Record some commonly used and effective prompts, and collect them


<!--memo:cf4bc54f3415-->
### The logic of service deployment

> 2025-03-11 02:37:34

This fast-iteration stack:

Cloudflare provides a whole set of network services

Keep a suitable cloud server on hand

Choose cloud databases for databases as much as possible

GitOps is a general capability that can be reused and raises efficiency exponentially

Milvus and Pinecone vector databases are indispensable in AI applications

ELK Stack, Prometheus or Grafana are also very important for monitoring how the system is running — methodology

AutoGPT / AgentGPT automatically generate task chains, which is very helpful for validating an MVP

LlamaIndex is a very good tool for backend data management


<!--memo:f8db87760eda-->
### How to quickly learn an open-source project in the AI era

> 2025-03-13 11:13:11

Understand the project's background and goals, and what the project does

Look at the documentation and getting-started guide

Look at the project structure and code architecture

Pick the core modules and key code implementations

Use unit tests to work it out


<!--memo:06cfaf02c5b6-->
### Thinking about front-end trends

> 2025-03-14 17:25:14

There's no denying that AI has brought both opportunity and trouble to part of the front end.

In the AI era it's easier to get started with front end — products like cursor can even take you from 1 to n, and from n to 10; even someone who doesn't understand front end can quickly build a project model.

In any era, interacting with users is still unavoidable. From an objective perspective, let me look at the front-end development trends. The technical threshold is lower, but for people who already know front end it's more efficient: learn a good open-source chat on GitHub, take the template, and many websites and pages can be patched together. For example https://github.com/vercel/ai-chatbot

A minimalist AI search tool https://github.com/zaidmukaddam/scira, and there are also some AI integration tools, for reference see https://tavily.com/

Actually early on, many tools and methods should use services rather than build them, which makes fast validation easier


<!--memo:8900700a1cee-->
### Design and thinking around multimodal chat modes

> 2025-03-16 12:23:19

The current forms of multimodality include: text information, images, sound, video, web pages and data files, sensors, and so on

There are two forms of existence: the format sent, and the format received. For example what you send can be an image, voice or text.

The design logic of Claude Artifacts seems a bit different. Artifacts can generate many kinds of content and provide pioneering opportunities to use interactive elements, from prototypes to fully functional web services. To a certain extent it can automatically choose

Interactive documents

Data and process visualisation

SVG graphics including logos

website structure

Sequence diagrams, complex and visual documents

Artifacts is expected to support more and more types later. Products similar to Artifacts, such as Google Notebooks, have the same form: you can manipulate code and design interactions. https://notebooklm.google/


<!--memo:7ba7d9d52c47-->
### Borrowing and plagiarism

> 2025-03-22 00:11:10

How to understand plagiarism and borrowing?

Both are clearly original, and good product design will eventually converge in public taste: pretty girls are loved by everyone, and graceful body proportions are always easy on the eye. 😊

What is plagiarism? Plagiarism means copying someone else's idea without any thinking, stopping at the level of imitation without any transcendent innovation.

What is borrowing then? Borrowing is having a unique conception of some shape or beautiful appearance after thinking for a long time; after agonising and repeated attempts, suddenly there's a flash — you glimpse that action in the corner of the screen that touches your heart, and suddenly it dawns on you: this is exactly the inspiration I was searching for!

Understanding is not copying, but enriching your own horizon through dialogue with the other.

So the beauty of borrowing lies in this: it isn't plundering someone else's idea, but lighting your own fire from someone else's spark.

Like listening to a sad song after a breakup, when a certain lyric touches something deep inside, that feeling is exactly what you've been looking for...

Creativity is often the crystallisation of collective wisdom. The key is how you "digest" these inspirations into your own thing. Try asking yourself: how does this idea connect to my experience, emotions or goals? What can I add to it?

For example, when you see a poem, you record it, and by recording and repeatedly polishing it, it will gradually become your own unique philosophy. What moves you isn't the poem itself, but the you that it awakens


<!--memo:fcbd66a6357b-->
### Design thoughts on event buses and message event pipelines

> 2025-03-29 11:08:15

Modules are loosely coupled, communicating through events instead of direct calls. Each module only needs to focus on its own business logic, without needing to know the implementation details of other modules

The event bus is like a middleman; each module is developed, tested and deployed independently

New modules and features only need to register into the event pipeline


<!--memo:d6f4b92ebae1-->
### Thinking about the turmoil in Nepal

> 2025-03-30 10:43:33

The main reasons lie in long-term political instability and poor governance, an excessively rapid turnover of governments, and widespread corruption.

The Nepali people's pursuit of stability.

From China's angle, it also hopes to support a governance model with long-term concentration of power and a clear succession system; a republic may mean frequent political turnover and very low efficiency.

It's like the balance of a scale being broken.

The probability of restoration is still relatively low

Repeated government changes and institutional innovation have brought a lot of chaos, but they have also formed a relatively stable power structure and political operating mechanism. Restoring the monarchy would require not only public support, but also overcoming major obstacles at the constitutional and political-reality level.

In Nepal, the main political forces, the military and the international community all lean towards maintaining the existing political system.

Also, even a monarchy cannot fundamentally solve the existing problems.

The key lies in whether political stability and efficient governance can be achieved.

refer：

https://news.cctv.com/2025/03/21/ARTIT8r5j2i9WWruRsLiTuD2250321.shtml


## 4. Daily Notes and Everything Else

*4 entries*

<!--memo:cfb1cf428e13-->
### The bystander's perspective

> 2025-03-10 01:10:15

To you it's your experience, to me it's my life.

Many things really are a case of the participant being lost while the bystander sees clearly. The person inside the situation feels it's so complicated and tangled... but actually, stepping outside and using the simplest universal reasoning is enough to judge.

So the person inside the situation usually shouldn't lightly dismiss the scrutiny and perspective of a bystander.


<!--memo:18c0f6da1e22-->
### Thinking about the cremation temple, second time

> 2025-03-16 16:13:45

What are the "round platforms"? What am I thinking about? Looking from a distance, those round stone platforms are scattered on both sides of the river — some among the trees on the west bank, some close to the cremation area on the east bank. At first I thought they were some kind of altar, and only later did I learn that they may be places where ascetics (Sadhu) practise, or small platforms where believers hold special rituals. They aren't as conspicuous as the cremation platforms, yet they always draw my eye — especially when someone is lying on one, or moving about as if dancing.


<!--memo:94998dde9690-->
### Better not to meet at all

> 2025-03-22 00:10:21

If meeting only brings awkwardness, burden or even pain, then what exactly is the point of deliberately maintaining a relationship? Is it to satisfy your own emotional needs, or to cater to other people's expectations (like your mother's hopes)? I think there's a deeper question hidden in here: is the meaning of a relationship actively pursued, or does it flow out naturally?


<!--memo:f43d0a581c83-->
### Our elders only want to use their experience to secure us a piece of happiness

> 2025-03-29 11:09:24

But this experience may not apply to the future era.

It depends on how the child chooses.

What elders do is provide a safety net, not set limits


## 5. Business, Investing and Career

*2 entries*

<!--memo:690a76c52786-->
### A deep understanding of web3

> 2025-03-02 00:10:11

Blockchain has spawned many technologies, but as far as web3's development goes, the main one is smart contracts. Smart contracts are stored on the blockchain and act as automated business logic that executes once conditions are met. The shape of web3 is understood as a community-driven, self-sufficient economic form.

Analysis of the growth cycle of digital currency: creation -> growth -> speculation -> bubble -> adjustment.

The price of a currency is entirely determined by the market, and currency is the same: new coins and old coins both satisfy demand is strong + supply is limited = market growth. Bitcoin has a cap, and halves every 4 years; a progressively scarcer asset.

Economics' greater fool theory also determines that as long as the market can find a buyer willing to pay a higher price, even if the asset price is unreasonable there will still be willing buyers, until the market can't find a "greater fool" and the bubble bursts.


<!--memo:c10fd28fc272-->
### China's development should be viewed through a generational lens

> 2025-03-10 01:24:47

The affairs on the land of China are endless; don't care about the gain or loss of a single city or pond, be persistent.

A nation is made up of concrete people, created and determined by them. Only when a country has people who seek truth, people who can think independently, people who can record the truth, people who give to this land regardless of gain or loss, people who can defend their own constitutional rights, and people who know this world isn't perfect yet still never give up or tire — only when a country has such minds and souls can we say we are proud of our motherland. Only when a country can truly have such minds and souls can we say we have the confidence to make tomorrow better.

Any mechanism and era needs its cause and effect found. Setting aside the perspective of reform and opening up, the acceleration of reform and opening up actually began to show a relatively steady, declining-slope trend after 2008, so the turning point of the economic cycle has already appeared; we need to realise that the economy has cycles rather than infinite growth.

This generation of leaders are leaders developed during the Cultural Revolution; people and institutions are products of that era. We can also accept a regression of institutions, and believe in the talent of the next generation of Communist Party leaders.


## 6. Travel, Places and Cities

*1 entries*

<!--memo:11f1c2027c00-->
### Walking the same road, meeting your own scenery

> 2025-03-11 14:29:35

My trekking partner likes looking at the path, I like looking at the scenery. For him, looking at the path on the ground and then occasionally looking up at the scenery feels magical — the scenery seems to teleport. For me, the beauty in my eyeballs is constantly changing, and I'm in a flow state every moment, feeling merged with the world. Someone enjoys walking, someone enjoys the scenery.


## 7. Reading, Ideas and History

*1 entries*

<!--memo:1862fd10cae2-->
### Metaphysics

> 2025-03-22 13:34:40

What is above form is called the Dao; what is below form is called the instrument

In the West it's the branch of philosophy that studies the essence of being, the origin of the universe, time, space, causality, the soul, God and other abstract questions.

This is also humanity's ultimate questioning of fundamental questions, and the core of rational philosophy.

Metaphysics, then, studies the "invisible essence" — it doesn't care about "what things look like", but about "why it is like this and what the essence is".

Actually it's different from mysticism; it leans more towards systematised, abstract philosophical thinking. Mysticism often carries intuitive, mystical or cultural-tradition characteristics, and lacks some of metaphysics' systematised rational analysis.

For most people, mysticism may provide a stronger sense of "help" in daily life, because it's closer to emotion and intuition.

Mysticism is very hard — intuitive power, insight, spirituality; it's more like cultivating the Dao. It's too mysterious, and enlightenment seems to need fate.
