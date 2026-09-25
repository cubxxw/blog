---
title: 'AI 从业者是如何利用 AI 学习英语的'
date: 2026-09-25T14:45:45+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Learning
  - Personal Growth
  - LLM
  - Productivity
description: >
  我研究 Evaluation 时，会先读完整英文字幕，再听访谈、用自己的话复述，最后把资料整理进知识库。本文从使用截图出发，讲清沉浸式翻译、豆包和学习笔记分别能帮什么忙，以及看懂译文后还需要自己完成什么；也为常读英文技术资料的人精选视频、播客、文章和电影入口，提供一份可尝试的复述提示与笔记模板，不承诺速成或量化进步。
cover:
  image: /images/posts/ai-english-learning/youtube-evals-english-transcript.png
  alt: '作者观看 Evaluation 访谈的实际界面：视频双语字幕与右侧英文转录'
  hiddenInSingle: true
---

我最近在研究 Evaluation，也就是怎样评估一个 AI 应用做得好不好。正在看的一期视频，是 Lenny’s Podcast 对 Hamel Husain 和 Shreya Shankar 的访谈。电脑上，视频下方有中英双语字幕，右边打开着转录面板。

我一般会先把整个字幕读一遍，弄清楚他们到底在讲什么。然后再听，主要是练习和回顾。最后，用自己的话把内容讲出来。

学习英语和研究技术，可以用同一份材料往前走：先有想弄明白的问题，才去找文章、找视频；理解之后，再试着把它说清楚。翻译帮我进入内容，复述则让我继续整理它。

![YouTube 上的 Evaluation 访谈：播放器显示中英双语字幕，右侧为标注自动生成的英文转录](/images/posts/ai-english-learning/youtube-evals-english-transcript.png)

*我的实际观看界面。右侧保留英文转录，方便通读和回看；视频来自 [Lenny’s Podcast 这期访谈](https://www.youtube.com/watch?v=BsWxPI9UM4c)。*

## 先有一个想弄明白的问题

在研究 Evaluation 的过程中，我会主动找一手经验、讨论、论文、开源项目和文章。入口可以很简单：先在自己的知识库里提出一个问题，让 AI 帮忙调研相关资源。它找回的内容中也会有视频，我再顺着这些视频继续学，把有用的摘要补进去。

如果你也想试，可以先把问题缩到能拿一份资料来回答的程度。比如，与其一次研究“AI 评测的一切”，不如先问：“我手里有一批 AI 回答，该从哪里看出它的问题？”找到材料后，就有了一个判断：这篇文章、这一段访谈，能不能帮我往下做。

这期访谈恰好给了一个入口。[节目页](https://www.lennysnewsletter.com/p/why-ai-evals-are-the-hottest-new-skill)标出了几个相关位置：16:51 开始讨论记录错误，23:54 谈初始错误分析中人的作用，31:39 谈怎样把记录归为类别。它发布于 2025 年 9 月 25 日，可以沿着这几个位置回看具体演示。

带着问题选材料，还有一个实际好处：你能决定哪些地方值得停下来。一个与你的问题有关的例子，可以多看两遍；暂时用不到的工具名，不必一边看一边全部收集。

## 字幕读懂了，概念还可以再问一层

我平常在电脑端用得多，看 YouTube 时会配合沉浸式翻译。它支持自行配置 DeepSeek；官方文档给出的方式是取得自己的 API Key，再填入扩展。想照着配置，可以直接看[接入说明](https://immersivetranslate.com/zh-Hans/docs/services/deepseek/)。

![同一段 Evaluation 访谈的双语界面：视频下方和右侧转录面板都显示英文及中文对照](/images/posts/ai-english-learning/youtube-evals-bilingual-transcript.png)

*这张截图里，右侧转录也有了中英对照，可以顺着文字理解较长的一段。*

双语对照能帮忙读下去，但有些词要放回具体工作里才明白。截图中的 open coding 就是一个例子。这里的 coding 属于定性分析语境，指对材料作初步记录和标记，与写程序不同；后面再把这些记录整理成较大的类别。节目页也把 open coding 和 axial coding 列为这次讨论的内容。[对应节目说明](https://www.lennysnewsletter.com/p/why-ai-evals-are-the-hottest-new-skill)

遇到这样的词，可以把原句和前后文一起交给 AI，让它解释“这里的人具体在做什么”，再回到演示核对。只问一个词怎么翻译，得到“开放式编码”，问题可能还留在那里。换成一个动作问题，就能继续追问：读的是哪条记录，标出了什么，为什么把几条记录放在一起？

这里还要分清字幕和原话。截图右侧标着自动生成，转录中的专名或技术词需要核对。若一句话读起来不通，可以回听声音、查看讲者自己的文章，别只让翻译模型在错误转录上继续解释。

想给这期视频配一篇文字材料，可以读 Hamel 的 [Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/)。文中用产品案例解释评测，专门讨论如何记录和查看真实交互。读者可以把视频里的动作和文章里的说明放在一起看，确认自己理解的是同一件事。

## 再听一遍，然后留一点空间给自己讲

我会在读过完整字幕之后再听。这一遍已经知道内容的大致方向，听的过程也就是回顾。接下来用自己的话复述，同时把原来的资料重新整理一遍。

如果要把这个过程用于英语练习，可以从一小段开始。通读之后，挑一个你最想解释的概念，暂时收起原文，用几句英语讲清它解决什么问题。不要一开始就要求自己总结完整场访谈。

例如，围绕刚才的错误分析，可以尝试这样说。下面是为练习写的示例，并非嘉宾原话，也不是我的实际对话记录：

> I would start by reading a few real conversations. I would write down what went wrong in each one. Then I would look for similar problems across them.

三句话已经足够接着问了：什么叫 real conversations？一条回答不够好，是少了事实、没回答问题，还是不符合使用场景？如果例子讲不出来，可以先用中文把例子说明白，再试英文。

也可以刻意保留第一遍的说法。先不要让 AI 整段重写，看看自己在哪个地方停住：有时是找不到一个英语表达，有时是知道译名却说不出动作。前一种可以查表达；后一种需要返回材料。这样，下一步做什么会具体一些。

保留初稿、分开检查概念和表达，是在现有流程上可以尝试的做法。它们不代表我已经测过学习效果，也无需把每次复述都变成一次考试。

## 让豆包接着问，给自己留一次修改的机会

我也会结合豆包练习创作和英文输出。豆包的[官方功能介绍](https://www.doubao.com/legal/feature_intro)列出了对话、创作、语音输入和语音输出。具体使用时，按自己客户端实际提供的入口操作即可。

有了刚才那段复述，就可以让它接着问。下面这段提示可以复制后试用，把方括号里的内容替换成自己的资料：

```text
我刚读了这份英文材料：[来源、相关段落或时间点]。
我想用英语解释的问题是：[一个具体问题]。

先等我讲完，我说“讲完了”之后再反馈。
先根据我提供的材料，指出一个需要澄清的概念，并且一次只追问一个问题。
材料不足以判断时，请直接说不确定，不要替来源补结论。
然后选两个最影响理解的英语表达，解释原因，给一个尽量贴近原意的改法。
先不要代写整段，让我自己改一次。
等我改完，请让我换一个例子解释同一概念。
```

这些是给对话设定的练习要求，实际反馈仍然要自己检查。尤其是技术概念，AI 的纠正如果改变了原意，应回到来源看依据。英语部分则可以问得小一点：这个代词到底指什么，这句话有没有把前后顺序说反，有没有更容易说出口的表达。

如果使用的是语音转文字，文字反馈能帮你检查转写出来的句子。它没有保留完整的声音信息，不能仅凭这份文字判断发音好坏。发音拿不准时，仍需回到音频对照。

第二天有余力，也可以不看昨天的成稿，换个例子重新讲一次。比如，昨天解释的是一段客服回答，今天换成一个资料检索场景。把它当作一次小尝试：看看自己还能解释到哪里，哪些地方仍要借助原文。

## 把资料留下来，是为了后面还能追问

我会把整理过的内容放进额外的仓库，作为自己的学习资料集。视频摘要也会补充到对应知识库。后面基于这些材料继续追问，梳理概念之间的关系，理解到一定程度，再写成文章。

复述已经在做一部分整理工作。要把一段话重新讲出来，就需要决定留下什么、怎样排列、哪个例子能说明它。笔记可以保留这些决定，不必只存一篇光滑的 AI 摘要。

如果你暂时没有知识库，用一个普通文档也能开始。下面这个小模板可以复制；它是建议格式，不是我的仓库内部结构：

```text
我在解决的问题：
来源与时间点：标题、链接、相关段落或视频位置
自己的理解：先用能讲清楚的话写，不确定的地方标出来
第一次英文复述：保留自己的原始版本
AI 反馈与本人修订：改了什么，为什么改，是否核对来源
下次问题：还需要找什么证据，或换什么例子再讲
```

其中“下次问题”值得留着。比如，看完一段错误分析，还可以继续问：“这些错误类别换到另一个应用里是否合适？”这就给下一次查资料留了方向。也可以让 AI 找出笔记里两个说法的分歧，分别指出来源，再由自己判断是否只是适用条件不同。

等到要写文章时，来源、自己的解释和仍然存疑的地方都有迹可循。学习英语产生的那段复述，也就留在了研究过程里。

## 资料可以少选一点，但要知道为什么点开

围绕 Evaluation，这期访谈加上 Hamel 的文章，就足够试一轮。换成其他技术问题，也可以从下面几个入口选。这里推荐的是可用的英文材料，不代表这些人物本人用 AI 学英语，也不代表每个频道都需要订阅。

| 想弄明白什么 | 可以从哪里开始 | 怎样接进练习 |
| --- | --- | --- |
| 大语言模型大致怎样工作 | [Karpathy 个人主页](https://karpathy.ai/)列有面向一般受众的视频与 Zero to Hero 技术路线 | 想先理解概念，可选一般受众视频；想跟代码做，再选技术课。先解释一个概念，不必一上来跟完整门课。 |
| 神经网络怎样处理一个具体输入 | [3Blue1Brown 的神经网络第一课](https://www.3blue1brown.com/lessons/neural-networks/)有图文解释和视频入口 | 可以先读图文，再回听对应解释，最后试着讲清图中的一个变化。 |
| 怎样把工程问题讲给别人听 | Simon Willison 的 [Open challenges for AI engineering](https://simonwillison.net/2024/Jun/27/ai-worlds-fair/)附演讲视频及扩展注释稿 | 选择一个小节，比较口头讲法与文字展开方式。这是 2024 年的演讲，涉及产品的信息要按当时背景理解。 |
| 做 AI 工程的人在讨论什么 | [Latent Space 播客](https://www.latent.space/podcast)围绕模型、Agent 和基础设施等话题展开 | 按眼下的问题找一期，再确认是否有可用的节目说明或转录；不必追完更新。 |

播客、文章和课程也不用每天都安排。手里已经有一份想读懂的材料，就先把它读懂，讲出一小段，再决定是否需要第二份。

## 电影也可以只是好好看一场

不想一直看技术内容时，可以换电影。对 AI 故事还有兴趣，可以从 [AlphaGo 官方页面](https://deepmind.google/research/alphago/)进入完整纪录片；想换成职场和日常交流，可以看看《实习生》[The Intern](https://tv.apple.com/us/movie/the-intern/umc.cmc.1wsp9hqbc6n1c87rb9wrudikf)。后一个链接是 Apple TV 美国区页面，列有 English CC，实际所在地区的播放权和字幕需另行确认。

找其他影片时，可以先按自己所在地区查询 [JustWatch](https://support.justwatch.com/article/what-is-just-watch)，再去对应服务看。它提供的是播放渠道导航，会区分订阅、租赁、购买等入口；片库里有一个条目，不等于你当前的订阅已经包含它。

电影可以放松着看，不用强迫自己逐句抄写。碰到一句想用的表达，再回听那个片段，试着换个场景说一遍。没有碰到，也可以把电影看完就结束。

回到我的日常，英语学习依然跟着正在研究的问题走。我会找资料、读字幕、回听，再用自己的话讲出来，把内容整理到知识库，留待继续追问和写作。

如果你现在也有一篇一直想读的英文文章，或者一个只看过翻译的视频，就可以从那里开始。读完后挑一小段，收起原文，讲讲它究竟在说什么。卡住的那一句，可以留在笔记里，作为下次要弄明白的问题。

## 参考资料

- [Lenny’s Podcast：Hamel Husain 与 Shreya Shankar 的 Evaluation 访谈（视频）](https://www.youtube.com/watch?v=BsWxPI9UM4c)
- [Lenny’s Podcast：节目说明与章节位置，2025-09-25](https://www.lennysnewsletter.com/p/why-ai-evals-are-the-hottest-new-skill)
- [沉浸式翻译：DeepSeek 接入说明](https://immersivetranslate.com/zh-Hans/docs/services/deepseek/)
- [Hamel Husain：Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/)
- [豆包：功能介绍](https://www.doubao.com/legal/feature_intro)
- [Andrej Karpathy：视频与课程入口](https://karpathy.ai/)
- [3Blue1Brown：But what is a Neural Network?](https://www.3blue1brown.com/lessons/neural-networks/)
- [Simon Willison：Open challenges for AI engineering，2024-06-27](https://simonwillison.net/2024/Jun/27/ai-worlds-fair/)
- [Latent Space：The AI Engineer Podcast](https://www.latent.space/podcast)
- [Google DeepMind：AlphaGo 与纪录片入口](https://deepmind.google/research/alphago/)
- [Apple TV 美国区：The Intern](https://tv.apple.com/us/movie/the-intern/umc.cmc.1wsp9hqbc6n1c87rb9wrudikf)
- [JustWatch：What is JustWatch?](https://support.justwatch.com/article/what-is-just-watch)
