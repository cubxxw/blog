# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: article-chat-legibility-contracts.spec.ts >> compact article reading >> 568px short AI keeps initial, held selection, Stop, full quote, Clear and 503 Retry within 320/256/224px
- Location: tests/e2e/article-chat-legibility-contracts.spec.ts:163:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('.asel-toolbar')
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" locator('.asel-toolbar') with timeout 5000ms
  - waiting for locator('.asel-toolbar')
    14 × locator resolved to <div inert="" role="toolbar" aria-hidden="true" aria-label="文章选区工具" class="asel-toolbar">…</div>
       - unexpected value "hidden"

```

```yaml
- link "Skip to main content":
  - /url: "#main-content"
- banner:
  - navigation:
    - link "cubxxw":
      - /url: https://cubxxw.com/zh/
    - button "搜索 (Cmd/Ctrl + K)"
    - button "Toggle theme":
      - img
      - img
    - list "Language":
      - listitem:
        - link "English":
          - /url: /growth/posts/2026-07-14-what-remains-when-taken-apart/
          - text: EN
      - listitem: / 中
    - button "打开导航菜单":
      - img
- main:
  - article:
    - text: Xinwei Xiong · 2026 年 7 月 14 日 13 分钟 · 6313 字 · 中 |
    - link "EN":
      - /url: https://cubxxw.com/growth/posts/2026-07-14-what-remains-when-taken-apart/
    - link "主页":
      - /url: https://cubxxw.com/zh/
    - text: »
    - link "Growth & Life":
      - /url: https://cubxxw.com/zh/growth/
    - heading "拆到最后，剩下的才是你：一场关于无我、痛苦与\"怎么说都可以\"的追问" [level=1]
    - paragraph: 从一束阳光穿过白内障眼球的意象出发，一路拆解自我——无我、五蕴、缘起，直到概念的相对性让人眩晕："怎么说都可以，那还追求什么？"这篇文章不给现成答案，只主张一点：相对性是站在生命外面看的性质，不是走在路上的性质。拆到最后，那个你怎么用"空""无常""执著"都消解不掉、依然压手的残余，才是你的地面。痛，正是它压手的证据。
    - complementary "核心要点":
      - heading "提要" [level=2]
      - list:
        - listitem: 一只看不清的眼睛，抹掉了光和影的分界——分界从来不在世界里，是眼睛（和心）加上去的。
        - listitem: 拆自我像拆马车：轮子不是车，车轴不是车，全拆开摆一地，“我”无处藏身。这是无我，不是“我不存在”。
        - listitem: “怎么说都可以”的眩晕，是站在地图前太久的错觉。地图上每条路都能随便标注，可你一旦走进去，脚下只有一条。
        - listitem: 拆到最后，有些东西你怎么用“空”“无常”去消解它，它还是压手——那个残余就是你的地面，而且它对你是唯一的。
        - listitem: 成长不是找到一个不再痛的答案，是学会站在“拆”与“认”之间：有些东西拆不掉，也不该拆，痛是它压手的证据。
    - figure:
      - img "拆到最后，剩下的才是你：一场关于无我、痛苦与\"怎么说都可以\"的追问"
    - blockquote:
      - paragraph: 这篇文章的种子，是一场持续了几轮的对话——从"广东热不热"的闲聊，一路滑进"生命是由什么构成的"。 它不打算给你一个答案，因为真正值钱的东西，恰恰在没有答案的地方长出来。
    - paragraph:
      - button "一束光穿过浑浊的晶体，光与影的分界在散射中软化、消融 — open full size"
    - separator
    - heading "引：一个看起来很温柔、其实很危险的问题" [level=2]
    - paragraph: 先讲一个朋友抛出的问题。
    - paragraph: 她说，她一直在想：从身上拿掉多少东西，她就不再是她自己了？
    - paragraph: 这个问句听起来很温柔，像在数一个人身上的行李。但你只要认真往下走两步，就会发现它有牙。因为它逼你一样一样地拿：拿掉工作，你还是你吗？还是。拿掉记忆呢？拿掉身体呢？拿掉那些让你之所以是你的经历、口音、爱过的人？一直拿下去，到某个地方，“你"会不会突然就不在了？如果会，那个临界点在哪？如果不会——那"你"到底是被哪一样东西撑着的？
    - paragraph:
      - text: 我们那场对话的真正源头，其实是
      - strong: 痛苦
      - text: 。是"人为什么会痛苦"这个更古老的问题。顺着它往回追，会追到一个几乎所有传统都指向的嫌疑犯：
      - strong: 自我
      - text: 。痛苦源于"我执”，源于有一个"我"在那里，怕失去、求不得、放不下。于是问题就翻转成了：这个"我"，到底是什么做的？它经得起拆吗？
    - paragraph: 这篇文章，就是沿着"拆"这条路一直走到底，看看走到尽头，手里还剩下什么。
    - paragraph: 我想提前说清楚：这不是一篇让你"看开"的文章。恰恰相反，它想在你以为已经看开了的地方，再往回拉你一把。
    - separator
    - heading "第一层：一束光，和一只看不清的眼睛" [level=2]
    - paragraph: 先从一个意象讲起，它是这场讨论里最美的一块。
    - paragraph:
      - strong: 一束阳光，加上一个白内障患者的眼球，能看到穿过窗户的阴影。
    - paragraph: 如果只从光学上看，这句话是成立的，而且动人。白内障让晶状体变浑浊，光穿过时不再干净地折射，转而被散射开。所以对这样一只眼睛来说，一束阳光不会是锐利的光柱——它会晕开、发白、带着光晕，边缘化成雾。而窗棂投下的阴影，本该是清晰的几何线条，在散射之下会变软、发灰、互相渗透。
    - paragraph: 这里有个东西值得停下来看。
    - paragraph:
      - text: 一只
      - strong: 清晰
      - text: 的眼睛，看到的是"光和影的分界"——仿佛"光"是一个东西，“影"是另一个东西，中间有一条真实的、客观的界线。而那只
      - strong: 浑浊
      - text: 的眼睛，把这条线抹掉了。它看到的几乎是"光和影的和解”：界限消失了，一切浸在同一层柔光里。
    - paragraph:
      - text: 我们太容易觉得那只看不清的眼睛是"有缺陷的"。但换个角度：那条被抹掉的分界线，本来就不在世界里。世界里只有连续变化的光强，从最亮到最暗是一条平滑的斜坡。是
      - strong: 清晰的眼睛
      - text: （和它背后的大脑）在那条斜坡上，硬切了一刀，说"这边是光、那边是影"。分界不是世界给的，是
      - strong: 看的人加上去的
      - text: 。
    - paragraph:
      - text: 那只浑浊的眼睛，某种意义上，反而看到了更接近实相的东西——
      - strong: 分别消融的地方
      - text: 。
    - paragraph:
      - text: 记住这个动作：
      - strong: 我们习惯把自己切出来的线，当成世界本来就有的线。
      - text: 接下来拆"自我"，用的是同一把刀，只不过这次，切的是我们自己。
    - separator
    - heading "第二层：开始拆——一辆马车，和一个找不到的\"我\"" [level=2]
    - paragraph: 现在把这把刀转向"我"。
    - paragraph: 有一部很老的佛经叫《弥兰陀王问经》，里面记了一场对话。一位僧人那先，问国王弥兰陀：你是坐马车来的，那我问你，什么是"马车"？
    - paragraph: 车轮是马车吗？不是，车轮只是车轮。 车轴是马车吗？不是。 车厢、辕木、缰绳，是马车吗？都不是。 那把它们全拆开，一件一件摆在地上——“马车"在哪里？
    - paragraph: 找不到。地上只有一堆零件。可是你又不能说马车不存在——你分明是坐着它来的。
    - paragraph:
      - text: 结论是：
      - strong: “马车"不是任何一个零件，也不是零件的简单堆叠；它是这些零件按某种关系装配起来、正在运作时，我们给这个整体起的一个名字。
      - text: 抽掉关系，只剩零件；抽掉零件，关系也无处附着。马车是"缘起"的——依条件而暂时成立，不是本来就搁在那里的现成物。
    - paragraph: “我"也一样。
    - paragraph: 顺着这条路拆下去：没有了元素、器官，就没有肉体上的我；没有了经历、意识、思考，就没有灵魂上的我。两边都拆完，中间那个"我”，没有一个单独的藏身之处。
    - paragraph:
      - text: 佛学把这套拆法系统化成了
      - strong: 五蕴
      - text: ——色、受、想、行、识。色是物质与身体；受是感受（苦、乐、不苦不乐）；想是辨认与概念化；行是意志、习性、造作的冲动；识是了别、觉知。所谓"我”，就是这五股不断流动的过程暂时聚在一起，被我们命名为一个人。你在每一蕴里翻找，都找不到一个叫"我"的核心。这就是
      - strong: 无我
      - text: 。
    - paragraph: 这里有一个极其容易滑过去、但千万不能滑过去的地方：
    - paragraph:
      - strong: 无我，不是"我不存在”。
    - paragraph:
      - text: 说"什么都不存在"，佛学有个专门的词骂它，叫"断灭见"，是明确反对的。窗上那道阴影确实"在"——你看得见它、它随太阳移动——但你找不到一个叫"阴影"的实体。它只是"光被遮挡"这个条件关系的显现。“我"也是。我不是不存在，我是
      - strong: 以一种和直觉不同的方式存在
      - text: ：不是一个东西，是一个正在发生的过程。
    - paragraph:
      - text: 一个更好的比方是
      - strong: 烛火
      - text: 。火焰一直在那儿，你叫得出它的名字，它会照亮、会灼手。但组成火焰的气体分子，每一刻都是新的、烧完就走的。你找不到火焰的"本体”，你只找到一场持续进行的燃烧。生命更像
      - strong: 一条河，而不是河里的水
      - text: ——它从来不是"由零件组成的一个东西"。
    - paragraph:
      - text: 有意思的是，科学拆到最后，给的是同一个答案。构成你的原子，和构成一块石头、一口空气的原子，是同一批；而且它们还在不断流进流出——你今天身上的大部分原子，几年前不在你身上，几年后也会离开。从物质上看，你也只是一种
      - strong: 维持了一段时间的模式
      - text: ，而非"一堆特殊材料"。
    - paragraph: 无论从哪条路进去——佛学的五蕴，还是科学的原子——拆到最后，都没有拆出一个叫"我本身"或"生命本身"的东西。
    - paragraph: 到这一步，很多人会觉得通透、轻盈，甚至有点欣快。“原来我是假的”，“原来一切都是缘起”，“原来没什么好抓的”。
    - paragraph: 请先别急着轻盈。因为紧接着，是这场追问里最危险的一个悬崖。
    - separator
    - heading "第三层：拆穿了概念，然后眩晕了" [level=2]
    - paragraph:
      - text: 当你把"我"拆成缘起、拆成五蕴、拆成一场燃烧之后，会发生一件事：
      - strong: 词，开始失灵。
    - paragraph: 你会发现，同一件事，怎么说都可以。
    - paragraph: 一个母亲为孩子揪心——你可以叫它"执著"，也可以叫它"爱"。 一个人为所爱之人的离去哀恸——你可以叫它"我执带来的苦"，也可以叫它"一个生命对另一个生命的分量"。 失去——你可以叫它"无常的正常运作"，也可以叫它"伤害"。
    - paragraph: 每一个词，都能两头说。褒可以翻成贬，深情可以翻成愚痴，坚持可以翻成放不下。而且你找不到一个客观的裁判，来判定哪种说法"对"。
    - paragraph: 于是就有了那句真正的痛点：
    - blockquote:
      - paragraph: “怎么说好像都可以。这样真的好吗？很多名词可以有意义也可以没意义。不知道要追求什么了。”
    - paragraph: 这是一种非常具体的眩晕。它不是抽象的哲学难题，它会让人在半夜里真的空掉——如果正确和错误只是相对于某个情况才出现的词，如果万事万物本就没有对错之分，那我到底还要奔向什么？我凭什么早起、凭什么努力、凭什么为任何一件事心疼？既然都可以，那就都不必。
    - paragraph: 这个悬崖是真的。很多聪明人拆自我拆到这里，就掉下去了——他们没有变得自由，反倒变得虚无。看穿了一切之后，什么都托不住他们了。
    - paragraph: 如果这篇文章到这里就结束，那它是有害的。所以真正的重点，从下一段开始。
    - separator
    - heading "转折：那个\"怎么说都可以\"，是地图上的性质，不是路上的性质" [level=2]
    - paragraph:
      - text: 我想跟你顶一句：
      - strong: “怎么说都可以”，可能不是世界的性质，只是站在世界外面看时，才会有的性质。
    - paragraph: 分清两个位置。
    - paragraph:
      - text: 当你在讨论里、在聊天框里、在脑子里反复掂量的时候，你是
      - strong: 站在生命外面
      - text: ，指着它。从那个位置看，一切都可翻转：揪心可以叫执著也可以叫爱，失去可以叫无常也可以叫伤害。词在这里是工具，不是镜子——它们天生就能两头说。这不是缺陷，这就是词的用法本身。语言是一张
      - strong: 地图
      - text: ，而地图上的每一条路，你都可以随便标注、随便重命名。
    - paragraph: 但请注意那位母亲。
    - paragraph:
      - text: 在她揪心的
      - strong: 当下
      - text: ，她并不觉得"怎么说都行"。她没有在心里权衡"这或许是执著、或许是爱，两种读法都成立"。她就是疼。哀恸的人也一样——他不是在几个解释之间挑选，他是被按在那里，动弹不得。
    - paragraph:
      - strong: “都可以"是地图上的性质，不是走在路上的性质。
    - paragraph: 你半夜里那种眩晕，是因为你在地图前站得太久了，久到忘记：地图上每条路都能随便标注，可你一旦真的走进去，脚下就只有一条。你没法同时既向左又向右。你没法一边真的爱一个人、一边同时"也可以不爱”。到了真实的一步里，那些在纸面上并列的可能性，会坍缩成唯一的一个当下。
    - paragraph: 相对性是真的——但它只在你抽身出来、把生命摊在纸上看的时候才成立。你没法一直站在纸前面。你终究要走回路里。而路里没有"怎么说都可以"，路里只有你正在走的这一步。
    - separator
    - heading "第四层：拆到最后，什么东西还压手" [level=2]
    - paragraph: 那么，方向从哪里来？
    - paragraph:
      - text: 我的答案是：
      - strong: 不从"把概念想通"里来。
      - text: 概念永远想不通，它天生就滑，你再想十年，它还是两头都能说。你没法靠把词想清楚来获得方向，因为词本身就是设计来两头说的。
    - paragraph: 方向从另一个地方来。
    - paragraph:
      - text: 把能拆的都拆掉、能翻转的都翻转完之后——
      - strong: 看还剩下什么，没有变轻。
    - paragraph:
      - text: 你和你的朋友已经拆了很多：拆掉了器官的我、意识的我，一路拆到无我，拆到缘起，拆到"怎么说都可以"。那就接着往下问一句：拆到这一步，
      - strong: 有没有哪样东西，你怎么用"无常"“空"“执著"去消解它，它还是压手？
    - paragraph: 如果有——那个东西，就是你的地面。
    - paragraph:
      - text: 它不是被论证出来的，它是
      - strong: 拆剩下的
      - text: 。所有能被"其实这也是缘起"“其实这也是空"轻飘飘化解掉的东西，都被这套拆法筛掉了、变轻了、飘走了。唯独有些东西，你明明已经承认它无自性、承认它是耦合、承认它终将消散，可它
      - strong: 依然压手
      - text: ——你一想到失去它就疼，这个疼不因为你"想通了"而减一分。
    - paragraph:
      - text: 那个筛不掉的残余，就是你真正在乎的东西。而且——这一点很重要——
      - strong: 它对你是唯一的
      - text: 。别人拆剩下的，未必和你一样。这不是一条能被普遍推导出来的真理，这是
      - strong: 你的
      - text: 地面。它拆不掉，不是因为你还不够聪明、拆得还不够彻底，是因为它本来就不属于"可拆解"的那一类。
    - paragraph: 这就是为什么，我不同意把所有痛苦都归给"我执”。
    - paragraph: “痛苦源于ego"是一种讲法，很有力，但不是唯一的真相。有些痛苦确实来自我执——求不得、怕失去、放不下一个注定要移动的影子。这类苦，看破它是缘起，确实能松手。
    - paragraph:
      - text: 但也有一些痛苦，恰恰是因为
      - strong: 有我、有爱、有牵挂
      - text: 才成立的。一个母亲为孩子揪心，一个人为所爱之人的离去哀恸——你当然可以说这是执著，然后着手把它拆掉。但你也可以说：
      - strong: 这正是"这一个生命"之所以是它自己的东西。
      - text: 把所有痛苦都当成要被消解的错觉，可能会不小心，把生命里最重的那部分，也一起拆掉。
    - paragraph:
      - text: 回到最开头那个温柔又危险的问题：
      - strong: 拿掉多少东西，她还是她？
    - paragraph:
      - text: 也许答案不在"拿到无我为止”。也许答案是：
      - strong: 有些东西，一拿掉，那个"她"就不在了。
      - text: 而"会牵挂、会痛的能力”，很可能正是那种拿不掉的东西。痛，不是需要被清除的故障。在这里，
      - strong: 痛是它压手的证据
      - text: ——是那样东西还在、还重、还属于你的证据。
    - separator
    - heading "第五层：关于\"想要一个答案\"这件事" [level=2]
    - paragraph: 还有最后一块，得诚实地处理。
    - paragraph: 你渴望一个明确的答案。人本来就渴望。面对"怎么说都可以"的空，人会本能地想要一个地方站稳，想要有谁——宇宙、佛经、一个更聪明的人、或者一个AI——递给你一句"就是这样”，然后你照着做。
    - paragraph: 我不想像某些讲法那样，反手告诉你"这渴望也是执著，放下吧"。这渴望很正当，它是人在深渊边上想找根绳子，没什么可羞愧的。
    - paragraph: 但有件事值得提醒你，而且它可能是这整篇文章里，最反直觉的一句：
    - paragraph:
      - strong: 假如真有一个明确答案，由宇宙或佛经或谁递到你手里，那你接下来，就只是在执行一份说明书。
    - paragraph:
      - text: 一个被给定的、明确的、放之四海皆准的答案，会取消掉一件事：你自己。因为凡是能被别人替你想清楚、替你说满的东西，长出来的都不是"你的"。
      - strong: 那个没有答案的空，恰恰是"你的东西"唯一能生长的地方。
    - paragraph: 你怕的那个"不知道要追求什么"的空白，和你要的那个"自由"，是同一个东西。自由从来不是"有人告诉我该往哪走"，自由是"没人告诉我，而我仍然得走"。它当然不舒服。空白总是不舒服的。但你没法既要"完全的自由"，又要"有人替我把方向定死"——这两个是同一枚硬币的两面，你不能只留正面。
    - paragraph: 所以，那个空白不是要被填上的坑，是要被认领的地。
    - separator
    - heading "收束：站在\"拆\"与\"认\"之间" [level=2]
    - paragraph:
      - text: 这场追问的源头是痛苦。走到这里，我想说的是：
      - strong: 转折不在"找到答案就不痛了"。
    - paragraph: 真正的转折，是学会同时握住两只手。
    - paragraph:
      - text: 一只手是
      - strong: 拆
      - text: ：拆到无我，拆到缘起，拆到松手离苦。这一手让你不被那些本可以放下的东西，绑在原地反复受苦——不为一个注定要移动的影子，在它移动时痛不欲生。这是佛学给的，是真东西。
    - paragraph:
      - text: 另一只手是
      - strong: 认
      - text: ：承认有些耦合一旦成形，就成了不可还原的"这一个"。承认有些东西拆不掉，也不该拆。承认痛，是它压手的证据，而不是需要被修好的故障。这一手让你不至于在拆穿一切之后，掉进那个"怎么说都可以、所以什么都不必"的虚无里。
    - paragraph: 绝大多数人只学会一只手。要么一路拆到虚无，聪明而空洞，什么都托不住；要么死死攥住，一样都不敢放，被自己在乎的东西反复碾过。
    - paragraph:
      - text: 而成长——真正"幅度非常高"的那种成长——大概就发生在你学会
      - strong: 让两只手同时张开又同时用力
      - text: 的那一刻：清醒地知道一切都是缘起、都会流散、都可以两头说；同时又清醒地认领那几样拆不掉的、只属于你的、会让你疼的东西，并且
      - strong: 不因为它们"经不起哲学推敲"就把它们扔掉
      - text: 。
    - paragraph: 看破，是为了不再无谓地受苦。 认领，是为了还配得上去爱。
    - paragraph:
      - text: 一只看不清的眼睛，抹掉了光和影那条本不存在的分界，让人看见它们本是一体。而一颗成熟的心，做的是相反又相通的事：它看穿了所有分界都是自己划的，却依然选择，在那片连续的柔光里，为某几样东西，重新划下一道
      - strong: 它明知是自己划的、却甘愿为之负责
      - text: 的线。
    - paragraph: 那道线，就是你。
    - blockquote:
      - paragraph: 拆到最后，剩下的不是一个答案。 剩下的是一小片，你怎么拆都拆不掉、也不愿拆掉的东西。 那不是你的局限，那是你的地面。
    - list:
      - listitem:
        - link "Philosophy":
          - /url: https://cubxxw.com/zh/tags/philosophy/
      - listitem:
        - link "Buddhism":
          - /url: https://cubxxw.com/zh/tags/buddhism/
      - listitem:
        - link "Self-Discovery":
          - /url: https://cubxxw.com/zh/tags/self-discovery/
      - listitem:
        - link "Inner Work":
          - /url: https://cubxxw.com/zh/tags/inner-work/
      - listitem:
        - link "Personal Growth":
          - /url: https://cubxxw.com/zh/tags/personal-growth/
    - navigation "文章导航":
      - link "上一篇 你以为你是玩家，可「玩家」也是一个角色：重读游戏三昧":
        - /url: https://cubxxw.com/zh/growth/posts/2026-07-20-the-player-is-also-a-role/
      - link "下一篇 摩擦即成长：当 AI 替你消除一切阻力，请主动留下一些":
        - /url: https://cubxxw.com/zh/growth/posts/friction-is-growth/
    - text: 分享这篇文章
    - button "生成文章分享卡": 分享卡片
    - button "复制链接":
      - img
    - button "分享到微信":
      - img
    - link "分享到 X / Twitter":
      - /url: https://x.com/intent/tweet/?text=%E6%8B%86%E5%88%B0%E6%9C%80%E5%90%8E%EF%BC%8C%E5%89%A9%E4%B8%8B%E7%9A%84%E6%89%8D%E6%98%AF%E4%BD%A0%EF%BC%9A%E4%B8%80%E5%9C%BA%E5%85%B3%E4%BA%8E%E6%97%A0%E6%88%91%E3%80%81%E7%97%9B%E8%8B%A6%E4%B8%8E%22%E6%80%8E%E4%B9%88%E8%AF%B4%E9%83%BD%E5%8F%AF%E4%BB%A5%22%E7%9A%84%E8%BF%BD%E9%97%AE+%E2%80%94+%E4%BB%8E%E4%B8%80%E6%9D%9F%E9%98%B3%E5%85%89%E7%A9%BF%E8%BF%87%E7%99%BD%E5%86%85%E9%9A%9C%E7%9C%BC%E7%90%83%E7%9A%84%E6%84%8F%E8%B1%A1%E5%87%BA%E5%8F%91%EF%BC%8C%E4%B8%80%E8%B7%AF%E6%8B%86%E8%A7%A3%E8%87%AA%E6%88%91%E2%80%94%E2%80%94%E6%97%A0%E6%88%91%E3%80%81%E4%BA%94%E8%95%B4%E3%80%81%E7%BC%98%E8%B5%B7%EF%BC%8C%E7%9B%B4%E5%88%B0%E6%A6%82%E5%BF%B5%E7%9A%84%E7%9B%B8%E5%AF%B9%E6%80%A7%E8%AE%A9%E4%BA%BA%E7%9C%A9%E6%99%95%EF%BC%9A%26%2334%3B%E6%80%8E%E4%B9%88%E8%AF%B4%E9%83%BD%E5%8F%AF%E4%BB%A5%EF%BC%8C%E9%82%A3%E8%BF%98%E8%BF%BD%E6%B1%82%E4%BB%80%E4%B9%88%EF%BC%9F%26%2334%3B%E8%BF%99%E7%AF%87%E6%96%87%E7%AB%A0%E4%B8%8D%E7%BB%99%E7%8E%B0%E6%88%90%E7%AD%94%E6%A1%88%EF%BC%8C%E5%8F%AA%E4%B8%BB%E5%BC%A0%E4%B8%80%E7%82%B9%EF%BC%9A%E7%9B%B8%E5%AF%B9%E6%80%A7%E6%98%AF%E7%AB%99%E5%9C%A8%E7%94%9F%E5%91%BD%E5%A4%96%E9%9D%A2%E7%9C%8B%E7%9A%84%E6%80%A7%E8%B4%A8%EF%BC%8C%E4%B8%8D%E6%98%AF%E8%B5%B0%E5%9C%A8%E8%B7%AF%E4%B8%8A%E7%9A%84%E6%80%A7%E8%B4%A8%E3%80%82%E6%8B%86%E5%88%B0%E6%9C%80%E5%90%8E%EF%BC%8C%E9%82%A3%E4%B8%AA%E4%BD%A0%E6%80%8E%E4%B9%88%E7%94%A8%26%2334%3B%E2%80%A6&url=https%3a%2f%2fcubxxw.com%2fzh%2fgrowth%2fposts%2f2026-07-14-what-remains-when-taken-apart%2f&hashtags=Philosophy%2cBuddhism%2cSelf-Discovery%2cInnerWork%2cPersonalGrowth
      - img
    - link "通过邮件分享":
      - /url: mailto:?subject=%E6%8B%86%E5%88%B0%E6%9C%80%E5%90%8E%EF%BC%8C%E5%89%A9%E4%B8%8B%E7%9A%84%E6%89%8D%E6%98%AF%E4%BD%A0%EF%BC%9A%E4%B8%80%E5%9C%BA%E5%85%B3%E4%BA%8E%E6%97%A0%E6%88%91%E3%80%81%E7%97%9B%E8%8B%A6%E4%B8%8E%22%E6%80%8E%E4%B9%88%E8%AF%B4%E9%83%BD%E5%8F%AF%E4%BB%A5%22%E7%9A%84%E8%BF%BD%E9%97%AE&body=%E6%8B%86%E5%88%B0%E6%9C%80%E5%90%8E%EF%BC%8C%E5%89%A9%E4%B8%8B%E7%9A%84%E6%89%8D%E6%98%AF%E4%BD%A0%EF%BC%9A%E4%B8%80%E5%9C%BA%E5%85%B3%E4%BA%8E%E6%97%A0%E6%88%91%E3%80%81%E7%97%9B%E8%8B%A6%E4%B8%8E%22%E6%80%8E%E4%B9%88%E8%AF%B4%E9%83%BD%E5%8F%AF%E4%BB%A5%22%E7%9A%84%E8%BF%BD%E9%97%AE%0A%0A%E4%BB%8E%E4%B8%80%E6%9D%9F%E9%98%B3%E5%85%89%E7%A9%BF%E8%BF%87%E7%99%BD%E5%86%85%E9%9A%9C%E7%9C%BC%E7%90%83%E7%9A%84%E6%84%8F%E8%B1%A1%E5%87%BA%E5%8F%91%EF%BC%8C%E4%B8%80%E8%B7%AF%E6%8B%86%E8%A7%A3%E8%87%AA%E6%88%91%E2%80%94%E2%80%94%E6%97%A0%E6%88%91%E3%80%81%E4%BA%94%E8%95%B4%E3%80%81%E7%BC%98%E8%B5%B7%EF%BC%8C%E7%9B%B4%E5%88%B0%E6%A6%82%E5%BF%B5%E7%9A%84%E7%9B%B8%E5%AF%B9%E6%80%A7%E8%AE%A9%E4%BA%BA%E7%9C%A9%E6%99%95%EF%BC%9A%26%2334%3B%E6%80%8E%E4%B9%88%E8%AF%B4%E9%83%BD%E5%8F%AF%E4%BB%A5%EF%BC%8C%E9%82%A3%E8%BF%98%E8%BF%BD%E6%B1%82%E4%BB%80%E4%B9%88%EF%BC%9F%26%2334%3B%E8%BF%99%E7%AF%87%E6%96%87%E7%AB%A0%E4%B8%8D%E7%BB%99%E7%8E%B0%E6%88%90%E7%AD%94%E6%A1%88%EF%BC%8C%E5%8F%AA%E4%B8%BB%E5%BC%A0%E4%B8%80%E7%82%B9%EF%BC%9A%E7%9B%B8%E5%AF%B9%E6%80%A7%E6%98%AF%E7%AB%99%E5%9C%A8%E7%94%9F%E5%91%BD%E5%A4%96%E9%9D%A2%E7%9C%8B%E7%9A%84%E6%80%A7%E8%B4%A8%EF%BC%8C%E4%B8%8D%E6%98%AF%E8%B5%B0%E5%9C%A8%E8%B7%AF%E4%B8%8A%E7%9A%84%E6%80%A7%E8%B4%A8%E3%80%82%E6%8B%86%E5%88%B0%E6%9C%80%E5%90%8E%EF%BC%8C%E9%82%A3%E4%B8%AA%E4%BD%A0%E6%80%8E%E4%B9%88%E7%94%A8%26%2334%3B%E2%80%A6%0A%0Ahttps%3A%2F%2Fcubxxw.com%2Fzh%2Fgrowth%2Fposts%2F2026-07-14-what-remains-when-taken-apart%2F%0A%0ATopics%3A+Growth+%26+Life%0ATags%3A+Philosophy%2C+Buddhism%2C+Self-Discovery%2C+Inner+Work%2C+Personal+Growth
      - img
    - link "分享到 LinkedIn":
      - /url: https://www.linkedin.com/shareArticle?mini=true&url=https%3a%2f%2fcubxxw.com%2fzh%2fgrowth%2fposts%2f2026-07-14-what-remains-when-taken-apart%2f&title=%E6%8B%86%E5%88%B0%E6%9C%80%E5%90%8E%EF%BC%8C%E5%89%A9%E4%B8%8B%E7%9A%84%E6%89%8D%E6%98%AF%E4%BD%A0%EF%BC%9A%E4%B8%80%E5%9C%BA%E5%85%B3%E4%BA%8E%E6%97%A0%E6%88%91%E3%80%81%E7%97%9B%E8%8B%A6%E4%B8%8E%22%E6%80%8E%E4%B9%88%E8%AF%B4%E9%83%BD%E5%8F%AF%E4%BB%A5%22%E7%9A%84%E8%BF%BD%E9%97%AE&summary=%E4%BB%8E%E4%B8%80%E6%9D%9F%E9%98%B3%E5%85%89%E7%A9%BF%E8%BF%87%E7%99%BD%E5%86%85%E9%9A%9C%E7%9C%BC%E7%90%83%E7%9A%84%E6%84%8F%E8%B1%A1%E5%87%BA%E5%8F%91%EF%BC%8C%E4%B8%80%E8%B7%AF%E6%8B%86%E8%A7%A3%E8%87%AA%E6%88%91%E2%80%94%E2%80%94%E6%97%A0%E6%88%91%E3%80%81%E4%BA%94%E8%95%B4%E3%80%81%E7%BC%98%E8%B5%B7%EF%BC%8C%E7%9B%B4%E5%88%B0%E6%A6%82%E5%BF%B5%E7%9A%84%E7%9B%B8%E5%AF%B9%E6%80%A7%E8%AE%A9%E4%BA%BA%E7%9C%A9%E6%99%95%EF%BC%9A%26%2334%3B%E6%80%8E%E4%B9%88%E8%AF%B4%E9%83%BD%E5%8F%AF%E4%BB%A5%EF%BC%8C%E9%82%A3%E8%BF%98%E8%BF%BD%E6%B1%82%E4%BB%80%E4%B9%88%EF%BC%9F%26%2334%3B%E8%BF%99%E7%AF%87%E6%96%87%E7%AB%A0%E4%B8%8D%E7%BB%99%E7%8E%B0%E6%88%90%E7%AD%94%E6%A1%88%EF%BC%8C%E5%8F%AA%E4%B8%BB%E5%BC%A0%E4%B8%80%E7%82%B9%EF%BC%9A%E7%9B%B8%E5%AF%B9%E6%80%A7%E6%98%AF%E7%AB%99%E5%9C%A8%E7%94%9F%E5%91%BD%E5%A4%96%E9%9D%A2%E7%9C%8B%E7%9A%84%E6%80%A7%E8%B4%A8%EF%BC%8C%E4%B8%8D%E6%98%AF%E8%B5%B0%E5%9C%A8%E8%B7%AF%E4%B8%8A%E7%9A%84%E6%80%A7%E8%B4%A8%E3%80%82%E6%8B%86%E5%88%B0%E6%9C%80%E5%90%8E%EF%BC%8C%E9%82%A3%E4%B8%AA%E4%BD%A0%E6%80%8E%E4%B9%88%E7%94%A8%26%2334%3B%E2%80%A6&source=https%3a%2f%2fcubxxw.com%2fzh%2fgrowth%2fposts%2f2026-07-14-what-remains-when-taken-apart%2f
      - img
    - button "分享":
      - img
    - button "更多":
      - img
    - region "读者回响":
      - heading "读者回响" [level=3]
      - text: — 加入讨论
  - button "目录"
  - text: 继续阅读
  - heading "相关文章 / Related Posts" [level=3]
  - link "Philosophy Buddhism 你以为你是玩家，可「玩家」也是一个角色：重读游戏三昧 2026-07-20 20 min":
    - /url: /zh/growth/posts/2026-07-20-the-player-is-also-a-role/
    - text: Philosophy Buddhism
    - paragraph: 你以为你是玩家，可「玩家」也是一个角色：重读游戏三昧
    - text: 2026-07-20 20 min
  - link "Philosophy Psychology 历史不能只活在一个尺度里：与 Archer 的一场夜谈 2026-08-06 5 min":
    - /url: /zh/growth/posts/history-needs-more-than-one-scale/
    - text: Philosophy Psychology
    - paragraph: 历史不能只活在一个尺度里：与 Archer 的一场夜谈
    - text: 2026-08-06 5 min
  - link "Personal Growth Self-Discovery 在泉州读弘一：看破之后，继续把人生当真 2026-08-03 7 min":
    - /url: /zh/growth/posts/2026-08-03-hongyi-quanzhou-game-of-life/
    - text: Personal Growth Self-Discovery
    - paragraph: 在泉州读弘一：看破之后，继续把人生当真
    - text: 2026-08-03 7 min
- region "邮件订阅":
  - heading "新文章写好，先寄给你" [level=2]
  - paragraph: 每有新文章，寄一封信到你的邮箱。双重确认，随时退订。
  - text: 邮箱地址
  - textbox "邮箱地址":
    - /placeholder: you@example.com
  - button "订阅"
  - paragraph
  - text: 更喜欢 RSS？
  - link "全部 · RSS":
    - /url: /zh/index.xml
  - link "JSON":
    - /url: /zh/feed.json
  - link "OPML":
    - /url: /zh/subscriptions.opml
  - link "Growth & Life":
    - /url: /zh/growth/index.xml
  - link "AI Agent":
    - /url: /zh/ai-agent/index.xml
  - link "Engineering":
    - /url: /zh/engineering/index.xml
  - link "空间 · CUBXXW OS":
    - /url: /zh/projects/index.xml
  - link "所有文章":
    - /url: /zh/articles/index.xml
- contentinfo "站点导航":
  - paragraph: 继续读
  - list:
    - listitem:
      - link "专栏":
        - /url: /zh/columns/
    - listitem:
      - link "AI Agent":
        - /url: /zh/ai-agent/
    - listitem:
      - link "工程":
        - /url: /zh/engineering/
    - listitem:
      - link "成长":
        - /url: /zh/growth/
    - listitem:
      - link "全部文章":
        - /url: /zh/articles/
    - listitem:
      - link "归档":
        - /url: /zh/archives/
    - listitem:
      - link "旅行":
        - /url: /zh/travel/
  - paragraph: 产品
  - list:
    - listitem:
      - link "Talent Signal":
        - /url: /zh/projects/#talent-signal
    - listitem:
      - link "IMStage":
        - /url: /zh/projects/#imstage
    - listitem:
      - link "Solo Compass":
        - /url: /zh/projects/#solo-compass
    - listitem:
      - link "DayPage":
        - /url: /zh/projects/#daypage
    - listitem:
      - link "Telepace":
        - /url: /zh/projects/#telepace
    - listitem:
      - link "Apply Agent":
        - /url: /zh/projects/#apply-agent
    - listitem:
      - link "Agent Diff Guard":
        - /url: /zh/projects/#agent-diff-guard
    - listitem:
      - link "全部产品 →":
        - /url: /zh/projects/#studio-products
  - paragraph: 订阅与联系
  - list:
    - listitem:
      - link "关于 · 阅读地图":
        - /url: /zh/about/
    - listitem:
      - link "RSS":
        - /url: /zh/index.xml
    - listitem:
      - link "JSON Feed":
        - /url: /zh/feed.json
    - listitem:
      - link "GitHub":
        - /url: https://github.com/cubxxw
    - listitem:
      - link "邮件":
        - /url: mailto:3293172751nss@gmail.com
- contentinfo:
  - text: © 2026
  - link "熊鑫伟（cubxxw）· 公开的实践与思想档案":
    - /url: https://cubxxw.com/zh/
- progressbar "Reading progress"
- status
- status
```

# Test source

```ts
  1   | import {test,expect,type Page,type Locator} from '../helpers/frozen-site';
  2   | 
  3   | test.use({channel:'chromium',reducedMotion:'reduce'});
  4   | const article=(lang:string)=>`${lang==='zh'?'/zh':''}/growth/posts/2026-07-14-what-remains-when-taken-apart/`;
  5   | const root=(page:Page)=>page.locator('[data-article-chat]');
  6   | const input=(page:Page)=>root(page).locator('.rc-ai-textarea');
  7   | const send=(page:Page)=>root(page).locator('.rc-ai-send');
  8   | const stop=(page:Page)=>root(page).locator('.article-chat-stop');
  9   | const messages=(page:Page)=>root(page).locator('.rc-ai-messages');
  10  | const reference=(page:Page)=>root(page).locator('.article-chat-reference');
  11  | const clear=(page:Page)=>root(page).locator('.article-chat-reference-clear');
  12  | const frames=(page:Page)=>page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  13  | 
  14  | // Only the original ArticleAIClient's local fetch boundary is replaced. No model call.
  15  | async function offlineAI(page:Page){
  16  |   await page.addInitScript(()=>{
  17  |     const original=window.fetch.bind(window),state:any={mode:'json',turns:[]};
  18  |     (window as any).__legibilityAI=state;
  19  |     window.fetch=(input,options)=>{
  20  |       const address=typeof input==='string'?input:input instanceof URL?input.href:input.url;
  21  |       if(new URL(address,location.href).pathname!=='/.netlify/functions/article-ai')return original(input,options);
  22  |       const turn:any={payload:JSON.parse(String(options?.body)),aborts:0};state.turns.push(turn);
  23  |       if(state.mode==='fail')return Promise.resolve(new Response('{"error":"offline"}',{status:503,headers:{'Content-Type':'application/json'}}));
  24  |       if(state.mode==='json')return Promise.resolve(new Response(JSON.stringify({answer:'Controlled reading response.\n\nThis is a second readable paragraph, generated only by this offline verification fixture.'}),{headers:{'Content-Type':'application/json'}}));
  25  |       let ended=false;
  26  |       const stream=new ReadableStream<Uint8Array>({start(controller){
  27  |         turn.delta=(text:string)=>{if(!ended)controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({delta:text})}\n\n`));};
  28  |         options?.signal?.addEventListener('abort',()=>{turn.aborts++;if(!ended){ended=true;controller.error(new DOMException('Aborted','AbortError'));}},{once:true});
  29  |       },cancel(){ended=true;}});
  30  |       return Promise.resolve(new Response(stream,{headers:{'Content-Type':'text/event-stream'}}));
  31  |     };
  32  |   });
  33  | }
  34  | const count=(page:Page)=>page.evaluate(()=>(window as any).__legibilityAI.turns.length);
  35  | const mode=(page:Page,value:string)=>page.evaluate(value=>{(window as any).__legibilityAI.mode=value;},value);
  36  | async function prepare(page:Page,width:number,height:number,lang:string,dark:boolean){
  37  |   await page.setViewportSize({width,height});
  38  |   await page.addInitScript(dark=>{localStorage.setItem('pref-theme',dark?'dark':'light');},dark);
  39  |   await page.goto(article(lang));await expect(root(page)).toHaveAttribute('data-chat-ready','true');
  40  |   await page.evaluate(()=>scrollTo({top:500,behavior:'instant'}));await frames(page);
  41  | }
  42  | async function settled(page:Page){
  43  |   if((page.viewportSize()?.width||0)<1200){
  44  |     await expect(page.locator('#article-bottom-sheet')).toHaveClass(/abs--open/);
  45  |     await expect.poll(()=>page.locator('#article-bottom-sheet').evaluate(el=>{
  46  |       const style=getComputedStyle(el),matrix=style.transform==='none'?null:new DOMMatrixReadOnly(style.transform);
  47  |       return Number(style.opacity)===1&&(!matrix||Math.abs(matrix.m42)<.1)&&!el.getAnimations().some(animation=>animation.playState==='running');
  48  |     })).toBe(true);
  49  |   }await frames(page);
  50  | }
  51  | async function openAI(page:Page){
  52  |   if((page.viewportSize()?.width||0)>=1200)await page.locator('#rc-tab-ai').click();
  53  |   else {await page.locator('#article-fab').click();await page.locator('#abs-tab-ai').click();}
  54  |   await settled(page);await expect(input(page)).toBeVisible();
  55  | }
  56  | async function hit(page:Page,locator:Locator,minHeight=0,minWidth=0){
  57  |   await expect(locator).toBeVisible();const box=(await locator.boundingBox())!,viewport=page.viewportSize()!;
  58  |   expect(box.x).toBeGreaterThanOrEqual(-.1);expect(box.y).toBeGreaterThanOrEqual(-.1);
  59  |   expect(box.x+box.width).toBeLessThanOrEqual(viewport.width+.1);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height+.1);
  60  |   expect(box.height).toBeGreaterThanOrEqual(minHeight-.1);expect(box.width).toBeGreaterThanOrEqual(minWidth-.1);
  61  |   expect(await locator.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  62  |   return box;
  63  | }
  64  | async function font(locator:Locator,minimum:number){
  65  |   expect(await locator.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(minimum);
  66  | }
  67  | async function sameInput(page:Page,original:Awaited<ReturnType<Locator['elementHandle']>>){expect(await input(page).evaluate((el,old)=>el===old,original)).toBe(true);}
  68  | async function selectedRequest(page:Page,lang:string){
  69  |   // Use an actual published paragraph, its original text node and the real toolbar.
  70  |   const candidates=page.locator('.post-content p');
  71  |   const index=await candidates.evaluateAll(elements=>elements.map((el,index)=>({index,length:el.textContent?.length||0,plain:el.childElementCount===0&&el.firstChild?.nodeType===Node.TEXT_NODE})).filter(x=>x.plain&&x.length>80).sort((a,b)=>b.length-a.length)[0].index);
  72  |   const paragraph=candidates.nth(index);await paragraph.evaluate(async el=>{
  73  |     el.scrollIntoView({block:'center',behavior:'instant'});const style=getComputedStyle(el);
  74  |     await document.fonts.load(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,el.textContent||'');await document.fonts.ready;
  75  |   });await frames(page);
  76  |   const selected=await paragraph.evaluate((el,limit)=>{
  77  |     const range=document.createRange();range.setStart(el.firstChild!,0);range.setEnd(el.firstChild!,Math.min(limit,el.firstChild!.textContent!.length));
  78  |     const selection=getSelection()!;selection.removeAllRanges();selection.addRange(range);return range.toString();
  79  |   },lang==='zh'?150:450);
> 80  |   const toolbar=page.locator('.asel-toolbar');await expect(toolbar).toBeVisible();const before=await page.evaluate(()=>scrollY);
      |                                                                     ^ Error: expect(locator).toBeVisible() failed
  81  |   await toolbar.locator('[data-asel-action="ai"]').click();await settled(page);await expect(input(page)).toBeFocused();
  82  |   expect(await page.evaluate(()=>scrollY)).toBe(before);
  83  |   await expect(reference(page).locator('.article-chat-reference-text')).toHaveText(selected);
  84  |   await expect.poll(()=>count(page)).toBeGreaterThan(0);
  85  |   expect(await page.evaluate(()=>(window as any).__legibilityAI.turns.at(-1).payload.selectedText)).toBe(selected);
  86  |   return selected;
  87  | }
  88  | async function leaveAI(page:Page){
  89  |   if((page.viewportSize()?.width||0)<1200){await input(page).focus();await page.keyboard.press('Escape');await expect(page.locator('#article-bottom-sheet')).not.toHaveClass(/abs--open/);}
  90  |   else await page.locator('#rc-tab-toc').click();
  91  | }
  92  | 
  93  | // Only flat computed-color stacks with opacity=1 receive a contrast verdict.
  94  | // Gradients/group opacity remain recorded as unverified; no paper-token shortcut.
  95  | async function contrast(locator:Locator){
  96  |   return locator.evaluate(el=>{
  97  |     type Color=[number,number,number,number];
  98  |     const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const context=canvas.getContext('2d',{willReadFrequently:true})!;
  99  |     const parse=(css:string):Color=>{context.clearRect(0,0,1,1);context.fillStyle=css;context.fillRect(0,0,1,1);const c=context.getImageData(0,0,1,1).data;return[c[0],c[1],c[2],c[3]/255];};
  100 |     const over=(a:Color,b:Color):Color=>{const alpha=a[3]+b[3]*(1-a[3]);return alpha?[(a[0]*a[3]+b[0]*b[3]*(1-a[3]))/alpha,(a[1]*a[3]+b[1]*b[3]*(1-a[3]))/alpha,(a[2]*a[3]+b[2]*b[3]*(1-a[3]))/alpha,alpha]:[0,0,0,0];};
  101 |     const stack=[];let backdrop:Color=[0,0,0,0],eligible=true,foundOpaque=false;
  102 |     for(let node:Element|null=el;node;node=node.parentElement){
  103 |       const style=getComputedStyle(node);stack.push({tag:node.tagName,className:node.className,color:style.color,background:style.backgroundColor,image:style.backgroundImage,opacity:style.opacity});
  104 |       if(Number(style.opacity)!==1)eligible=false;
  105 |       if(!foundOpaque){
  106 |         if(style.backgroundImage!=='none')eligible=false;
  107 |         backdrop=over(backdrop,parse(style.backgroundColor));foundOpaque=backdrop[3]>=.999;
  108 |       }
  109 |     }
  110 |     const luminance=(color:Color)=>color.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,index)=>sum+v*[.2126,.7152,.0722][index],0);
  111 |     eligible=eligible&&foundOpaque;const fg=over(parse(getComputedStyle(el).color),backdrop),a=luminance(fg),b=luminance(backdrop);
  112 |     return{eligible,ratio:eligible?(Math.max(a,b)+.05)/(Math.min(a,b)+.05):null,foreground:getComputedStyle(el).color,backdrop,stack};
  113 |   });
  114 | }
  115 | let sample=0;
  116 | async function readable(locator:Locator,minimum:number){
  117 |   await font(locator,minimum);const result=await contrast(locator);
  118 |   await test.info().attach(`computed-colors-${++sample}`,{contentType:'application/json',body:JSON.stringify(result,null,2)});
  119 |   if(result.eligible)expect(result.ratio).toBeGreaterThanOrEqual(4.5);
  120 | }
  121 | async function scrollInside(page:Page,locator:Locator){
  122 |   await locator.scrollIntoViewIfNeeded();const before=await page.evaluate(()=>scrollY),box=await hit(page,locator);
  123 |   expect(await locator.evaluate(el=>el.scrollHeight-el.clientHeight)).toBeGreaterThan(2);
  124 |   const old=await locator.evaluate(el=>el.scrollTop);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,140);
  125 |   await expect.poll(()=>locator.evaluate(el=>el.scrollTop)).toBeGreaterThan(old);expect(await page.evaluate(()=>scrollY)).toBe(before);
  126 | }
  127 | async function selectedAppearance(page:Page,selected:string,compact:boolean){
  128 |   const quote=root(page).locator('.article-chat-quote').last();await expect(quote).toHaveText(selected);
  129 |   expect(await quote.evaluate(el=>getComputedStyle(el).whiteSpace)).toBe('pre-wrap');
  130 |   expect(await quote.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  131 |   const outer=quote.locator('..');expect(await outer.evaluate(el=>getComputedStyle(el).borderTopWidth)).toBe('0px');expect(await outer.evaluate(el=>getComputedStyle(el).borderRadius)).toBe('0px');
  132 |   expect(await reference(page).evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');expect(await reference(page).evaluate(el=>getComputedStyle(el).borderRadius)).toBe('0px');
  133 |   await readable(root(page).locator('.rc-ai-user-text').last(),14);await readable(root(page).locator('.rc-ai-user-label').last(),12);
  134 |   await font(root(page).locator('.rc-ai-answer-body').last(),14);await font(reference(page).locator('.article-chat-reference-label'),12);await font(reference(page).locator('.article-chat-reference-text'),14);
  135 |   const share=root(page).locator('.rc-ai-share-btn').last();await share.scrollIntoViewIfNeeded();await readable(share,13);await hit(page,share,compact?44:32);
  136 |   const before=(await share.boundingBox())!;await share.hover();expect(await share.evaluate(el=>getComputedStyle(el).transform)).toBe('none');const after=(await share.boundingBox())!;expect(Math.abs(after.y-before.y)).toBeLessThanOrEqual(.1);
  137 |   await scrollInside(page,quote);await scrollInside(page,reference(page).locator('.article-chat-reference-text'));
  138 |   await hit(page,clear(page),44,44);const draft=await input(page).inputValue();await clear(page).click();await expect(reference(page)).toBeHidden();await expect(input(page)).toBeFocused();await expect(input(page)).toHaveValue(draft);await expect(quote).toHaveText(selected);
  139 | }
  140 | 
  141 | test('desktop bilingual light/dark supporting copy, full passage and answer sharing keep a readable hierarchy',async({page})=>{
  142 |   await offlineAI(page);
  143 |   for(const lang of ['zh','en'])for(const dark of [false,true]){
  144 |     await prepare(page,1440,900,lang,dark);await openAI(page);await readable(root(page).locator('.rc-ai-intro-copy'),14);await readable(root(page).locator('.rc-ai-greeting'),14);await font(root(page).locator('.rc-ai-quick-label'),12);
  145 |     expect(await input(page).evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBe(lang==='zh'?13:12.5);
  146 |     await input(page).fill('Unsent reading draft');await leaveAI(page);const selected=await selectedRequest(page,lang);await expect(root(page)).toHaveAttribute('aria-busy','false');await selectedAppearance(page,selected,false);
  147 |     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  148 |   }
  149 | });
  150 | 
  151 | test.describe('compact article reading',()=>{
  152 |   test.use({hasTouch:true,isMobile:true});
  153 |   test('390px bilingual conversation keeps 16px editing, full quote and 44px local actions',async({page})=>{
  154 |     await offlineAI(page);
  155 |     for(const lang of ['zh','en']){
  156 |       await prepare(page,390,844,lang,lang==='en');await openAI(page);await readable(root(page).locator('.rc-ai-intro-copy'),14);await font(input(page),16);await input(page).fill('Preserved phone draft');await leaveAI(page);
  157 |       const original=await input(page).elementHandle(),selected=await selectedRequest(page,lang);await expect(root(page)).toHaveAttribute('aria-busy','false');await sameInput(page,original);await selectedAppearance(page,selected,true);await hit(page,send(page),44,44);await hit(page,input(page));
  158 |       await input(page).press('Escape');await expect(page.locator('#article-bottom-sheet')).not.toHaveClass(/abs--open/);await expect(page.locator('#article-fab')).toBeFocused();
  159 |       expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  160 |     }
  161 |   });
  162 | 
  163 |   test('568px short AI keeps initial, held selection, Stop, full quote, Clear and 503 Retry within 320/256/224px',async({page})=>{
  164 |     await offlineAI(page);await prepare(page,568,320,'zh',true);await openAI(page);
  165 |     const original=await input(page).elementHandle(),sheet=page.locator('#article-bottom-sheet');
  166 |     for(const height of [320,256,224]){
  167 |       await page.setViewportSize({width:568,height});await settled(page);await hit(page,input(page));await hit(page,send(page),44,44);await hit(page,sheet.locator('.abs-handle'));
  168 |       for(const tab of await sheet.locator('.abs-tab').all())await hit(page,tab,44);
  169 |     }
  170 |     // Every original lens is still reachable above the sticky composer, including
  171 |     // the last row at the smallest height; mere DOM presence is not sufficient.
  172 |     expect(await root(page).locator('[data-prompt]').count()).toBeGreaterThanOrEqual(6);
  173 |     for(const chip of await root(page).locator('[data-prompt]').all()){
  174 |       await chip.evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));await frames(page);await hit(page,chip,44);await hit(page,input(page));
  175 |     }
  176 |     for(const tab of ['toc','share']){
  177 |       await page.locator(`#abs-tab-${tab}`).click();await frames(page);expect((await sheet.boundingBox())!.height).toBeLessThanOrEqual(224*.78+.1);
  178 |     }
  179 |     await page.locator('#abs-tab-ai').click();await settled(page);
  180 |     await page.setViewportSize({width:568,height:320});await settled(page);await input(page).fill('Keep the selected-passage draft');await leaveAI(page);await mode(page,'held');
```