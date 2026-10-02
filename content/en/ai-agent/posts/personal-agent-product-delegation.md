---
title: 'Personal Agent Product Research: How Instinct Makes People Willing to Delegate Again'
date: 2026-10-03T00:05:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - Product Strategy
  - Productivity
  - Automation
  - Security
description: >
  Using Instinct as the main case, this article studies why repeat delegation depends on user effort, authorization, and recovery in personal agent products.
series:
  name: 'Personal Agent Studies'
  slug: personal-agent-studies
  order: 1
  total: 2
cover:
  image: /images/personal-agent-studies/product-cover.webp
  alt: 'Concept illustration: a user delegates errands through a phone, with email, calendar, and completion receipts connected to the user''s approval'
---

For a Personal Agent to earn repeated use, the user has to genuinely carry less of the mental load. If handing over an operation still means chasing progress, rereading results, and nagging it to fix mistakes, the delegation is not complete.

One Instinct user documented his own stress test on Reddit: buying snacks across apps and monitoring flight prices, and also researching startups. He was satisfied with part of the results, but he also hit long waits between steps and website verification that required a human to step in. He was willing to let the agent find things and compare prices, and willing to let it prepare an order, but not yet ready to hand over his credit card and let it pay freely. [Original stress-test post](https://www.reddit.com/r/AI_Agents/comments/1wak4is/ive_been_stresstesting_instinct_with_reallife/)

That feedback deserves a closer look than "my assistant can do anything." A person can acknowledge the capability, keep using the product, and still insist on keeping the last step in his own hands. What the user hands over is one particular matter, plus the part of it he allows an agent to handle. If a product flattens those distinctions, it will misread a cautious user as someone who has simply not built trust yet.

I care more about the second delegation. The first may come from novelty; the second starts to involve a practical judgment — last time I handed it over, how much less work did I actually do than doing it myself?

Below, I take Instinct as the main case and follow one matter from the request through the wait, and then to authorization and completion, to see the different choices Poke, Town, and Muse made. Source verification is current as of **October 3, 2026**. I have not tried these products myself, and I have not interviewed founders or reviewers; public interviews, documentation, and user accounts can help us notice mechanisms and problems, but they are not enough to prove that a given design has improved retention. Anonymous posts may carry promotional motives and selection bias, and I will not use them to estimate overall satisfaction.

## The first task has to be small, and it needs a result you can confirm

Instinct describes itself as a personal assistant you can message and call, one that has its own phone and computer and connects to the user's apps and devices. The appeal of that framing is direct: the user only has to say what they want done. [Instinct's website](https://instinct.com/)

But "you can ask me to do anything" also hands the burden of picking a task to the user. On a first meeting, should I have it write an email or buy a plane ticket? If it fails, was it because I did not explain clearly, did not connect the right account, or because it simply cannot do it? A free-text box holds every possibility, and every uncertainty along with it.

In the stress test above, the user drew a boundary between finding products and paying. That boundary does not need to wait for the technology to mature before it has value. Collecting candidate products and checking stock takes up a person's time on its own, and so does sorting out the differences; as long as the agent can reliably finish one of those segments, the user can gain something. A product does not have to prove on first use that it can independently handle a whole life errand. It does need to show the user that this segment is finished, and who is responsible for the next step.

In the same discussion, another user said he used WhatsApp to have Instinct clear promotional mail out of Gmail, and to help with online teaching. The teaching messages were drafted by the agent, and he checked and sent them himself. One detail he liked was that after sending a request he received an emoji reaction, so he knew the assistant had started working. [The WhatsApp user's comment](https://www.reddit.com/r/AI_Agents/comments/1wak4is/comment/pc0gjb5/)

This account provides no email logs, and it does not prove the cleanup was error-free. It still offers a practical product clue: value can appear before sending. The draft spared the user the work of organizing what to say, and reviewing before sending preserved his control over a teaching relationship. Accepting human review does not necessarily weaken the delegation; the key is whether the review is smaller in scope than the original work.

If I were choosing the first task, I would prioritize something the user already has to do, with a result that is easy to accept and a failure that is easy to recover from. For example, turning a batch of email from specified senders into a to-do list with links back to the originals, or preparing a reply draft from a few messages in a thread. This is a design suggestion, not a description of Instinct's current flow. The first time does not need to take over an entire mailbox, and it does not need the user to hand over payment rights up front; after the result is accepted, then ask whether to keep handing over similar matters.

"Sorting the inbox" is still too big. Where to move which emails is one kind of consequence; whether to delete and whether to unsubscribe are different consequences again. Labeling promotional mail is easy to check; deleting an important notification can cost the user far more. Low risk cannot be decided by a feature name alone either: under the same word "archive," a few dozen irrelevant promotions and one contract email under active discussion are completely different things to a person.

Poke's Recipes offer an interesting contrast for this kind of starting point. The official documentation explains that a recipe packages the context needed for first use and a prefilled first message, and also includes the necessary integrations and a share link for installation; edits made after publishing only affect newly joined users. This is a description of a product mechanism, and it does not yet offer completion-rate evidence. [Poke Recipes documentation](https://poke.com/docs/creating-recipes)

I would read it as an "installable first task": the user claims a specific purpose first, then adds the information needed to complete it. Compared with making every person explore the full set of capabilities from a blank conversation, this kind of entry point makes the expected result easier to state, and makes it easier to explain why a permission is needed.

Recipes carry costs too. If the default content promises too much, users will assume that clicking install means someone is already responsible for the matter; and if existing users do not update with new versions, the product team still has to know which set of rules they are running. A delegation packaged as convenience still needs to spell out authorization and run frequency, and to state the stop condition and where the result goes. Install counts can only show that people clicked the entry point; they cannot show that the matter was actually handed over.

The choice of a first task should therefore be reasoned backward from acceptance. Can the user point, within a few minutes, to which emails were handled and which one still needs judgment? Can the user open the original and check without effort? If the only proof of completion is the agent saying "done," the first success may exist only inside the conversation.

## Chat opens the door; the work needs a record you can inspect

The WhatsApp user liked the emoji reaction, and I think it gets closer to the problem than many elaborate progress animations. It solves a small but real thing: the message arrived, and the assistant has accepted the request. The user can look away for now.

Another commenter said that after a day of use, a message showed as read but the assistant did not respond. Someone replied that WhatsApp worked fine for them. Two opposing accounts are not enough to establish a channel failure, the scope of an outage, or its cause, but "read" clearly cannot tell a person what state the task is in now. [Comment from a user who got no response](https://www.reddit.com/r/AI_Agents/comments/1wak4is/comment/pau2h0b/)

In ordinary chat, "read" usually has to do with the other person having seen it. When an agent product places it inside an execution chain, the user keeps speculating: is it working, or did it miss the message? Should I send it again? If I send it again, will it place the order twice? An operation that was supposed to be saved turns into checking whether it is operating.

I would express receipt and start separately, and state blockage and completion each on their own. A short acknowledgment once the request arrives; the necessary status only after it actually starts looking something up; when it is stuck on a login or verification, say which step the user needs to take; at the end, return a result that can be checked. These states do not need to be spread across four chat bubbles, and even less do they need to interrupt the person on every tool call. Only changes that matter to the user deserve to appear in the conversation.

Take a design example for flight-price monitoring: it could confirm up front that "these dates, these airports, alert only, no purchase," and then stay quiet. When the price meets the condition, the message carries the check time, a flight link the user can open, and the next-step options. If the information is stale, it says plainly that it needs reconfirmation. When nothing has changed, the user can still open the task record at will and see when the last successful check happened.

Chat is good for making an ad hoc request, but long-running tasks are easily buried by new messages. If a person has asked about travel and expenses and a family gathering in the same window, then days later wants to stop one of the monitors, he should not have to guess the system's current arrangement from memory of what he wrote. He needs one place where he can see what is running, what has changed, and how to stop it. That place can be a task card the user can open, a web page, or a standalone app; the form depends on the density of tasks.

One Poke user's original post offers a counterexample clue: the author liked the idea of a proactive assistant inside iMessage, but also wanted a standalone app. The post's identity and promotional relationship have not been verified, so it cannot be used to judge what most people prefer; at a minimum it reminds us that reducing new interfaces does not make the interface choice for every user. [A Poke user's request for a standalone app](https://www.reddit.com/r/AskVibecoders/comments/1uzxhjg/i_need_an_ai_personal_assistant_what_are_the_best/)

There is also a correction that marketing narratives more easily overlook. In the Instinct discussion, a user first said it could handle text messages, and after being pressed admitted he had connected Gmail, Calendar, and Drive, while iPhone messages remained limited. He also said the agent could keep checking product stock and pay after his approval. These are personal accounts; the fact most worth keeping is that he corrected his own understanding of the capability himself. [Follow-up questions and correction about text-message access](https://www.reddit.com/r/AI_Agents/comments/1wak4is/ive_been_stresstesting_instinct_with_reallife/)

**Being able to receive a delegation inside iMessage does not mean being able to read all of a user's iMessage.** If a product makes the entry point and the data permission look like the same thing, users may form wrong expectations about the information it holds. The disappointment that follows — "why didn't you know about this text?" — does not necessarily come from a model with a poor memory; it may come from the product never having explained clearly in the first place.

Town takes a different combination: the assistant has its own `@town.com` address, so the user can email it directly or copy it into an email thread with other people, who do not need to join Town. The documentation also distinguishes mail drafted from the user's account from replies the assistant sends from its own address. These are feature descriptions from the current documentation, and they cannot be used to guarantee that every coordination succeeds. [Town Email documentation](https://www.town.com/docs/using-town/email)

This is natural for business email, because the matter already lives in the email thread. But whether the same message is "sent by me" or "sent by my assistant" changes how the recipient understands it. Hiding the identity may buy short-term smoothness, and it may also raise the relationship cost when something is sent by mistake or steps over a line. A product is better off letting both the initiator and the recipient know who is speaking, who decided the content, and who can take it further.

The comparison below looks only at design choices along a single delegation path. It does not score the products, and it does not treat documented promises as measured experience.

| What has to be decided | The choice in the public material | How to verify it |
| --- | --- | --- |
| How the first request begins | Instinct uses a familiar messaging entry point; a Poke Recipe prefills the purpose and the information needed | Can the user say what they will get without first studying a capability list |
| Where to look while waiting | Instinct users value the immediate response; Town email keeps the thread context | Does the user still have to follow up, resend, or dig through old messages |
| Who speaks for the user outside | Town distinguishes the user's account from the assistant's own address | Can identity, recipient, and content be confirmed before sending; can it be traced after an error |
| What a single purchase allows | Muse documentation describes per-transaction confirmation and a scoped payment credential | Do the amount, merchant, and valid scope the user sees match the actual operation |

The conversation can stay simple, but the task record cannot disappear along with it. What should be reduced most here is the number of times the user explains and follows up.

## The value of proactive work depends on which worry it saves

Continuous monitoring is where a Personal Agent separates itself from single-turn Q&A. The user does not have to come back and ask every time a new result is needed; the agent can wait with the condition attached.

The author of the stress test said the flight task checked about three times a day. That frequency does not prove value on its own: checking often can still mean the wrong dates, only part of the websites, or prices reported to the user long after they expired. It only shows that the task spanned multiple runs. What should actually be delivered is whether, within the conditions the user specified, a change worth acting on has appeared. [Account of the flight-price monitoring](https://www.reddit.com/r/AI_Agents/comments/1wak4is/ive_been_stresstesting_instinct_with_reallife/)

Another detail from the interview connects here. Patrick O'Shaughnessy said that over several months of using Instinct he received about three phone calls; the conversation then gave the example of a call reminding him that a signing deadline was approaching. This comes from a machine transcript of a public interview and has no task log; the deadline reminder should also not be expanded into a fully verified real transaction. [EP.493 official episode page](https://colossus.com/episode/instinct-the-personal-agent/), [public machine transcript](https://podscripts.co/podcasts/invest-like-the-best-with-patrick-oshaughnessy/noah-shinn-building-instinct-the-personal-agent-invest-like-the-best-ep493)

The product judgment I take from this is that proactivity needs to be proportional to the consequence. A routine summary can wait until the user has time; something close to a deadline that requires the person's own action is what may deserve an escalation to a stronger reminder. Saying "I'm still watching it for you" over and over only converts the original worry into a new notification burden.

But few calls do not directly prove the reminders are accurate either. It may be restraint that is exactly right, or it may be missing important events. A product needs to look at both whether it reminded when it should have, and whether the user really needed to act after the reminder. Counting only open rates easily encourages a system to compete for attention with more urgent language.

Another Instinct commenter said he received a job listing every morning at eight; the assistant recommended New York events based on his activity history, registered him and added them to his calendar after he chose, and also handled pickup and refund mail from merchants. The original post contains no transaction receipts, so it cannot confirm that every refund was completed. [Account of job, event, and merchant email use](https://www.reddit.com/r/AI_Agents/comments/1wak4is/ive_been_stresstesting_instinct_with_reallife/)

This set of tasks interests me because it preserves the person's different decisions. Job information arrives on a schedule, the event is chosen by the person, and only after the choice does registration and calendaring begin. A product can be proactive in the preparation stage, wait for the person at the preference judgment, and keep working on the formalities once they are chosen. Proactivity can be allocated along the errand; it does not need one switch for an entire life.

Whether eight in the morning suits someone should be decided by that user's habits. One user liking a scheduled list is no reason to make a morning briefing the default for everyone. The same event recommendation may be useful to someone getting ready to socialize, and nothing but one more email to someone busy with work.

Town user David Berkowitz's first-hand newsletter puts the cost more concretely. He asked where his credits were going, found that background email reading and labeling consumed them and that drafting replies did too, and then turned off some features and the per-meeting briefings; the routine that gathered news for the newsletter was the part he found useful. He also wrote that the assistant imitating his own voice in drafts disappointed him. What is kept here is his August 2026 experience, and the old prices in his piece cannot be treated as today's pricing. [Berkowitz's newsletter on trying Town](https://aimarketersguild.com/p/should-you-hire-an-ai-townie)

This case adds a practical condition to "worrying on my behalf": the worrying has to be about something I care about. How many emails were read in the background or how many briefings were generated cannot prove value by themselves. When the user first has to ask the assistant about the bill and understand the credits, and then turn off automatic work, he has taken on one more management task.

The Town documentation presents Routines as the entry point for ongoing tasks triggered by a schedule or an event. That gives the product a manageable object, but the ability to manage it still has to be realized as costs and results the user can understand. [Town Routines documentation](https://www.town.com/docs/routines)

I would put a visible operating agreement inside an ongoing task: what change it watches, how often it checks, when it notifies, how long it runs, how much it is allowed to consume, and where the one-click pause lives. The monthly bill should also be explained by purpose, so the user can judge whether a given activity is worth continuing. The budget here can be credits, money, or a count of runs; it does not have to expose the underlying tokens.

Proactive recommendations test that agreement further. A mirror of the founder's public post says that Instinct Selections brings in recommendations from chefs, designers, and local guides; the mirror does not include the full media context of the original post, and I have not treated it as a complete publication record. [Mirror of the founder's post](https://twiscan.com/en/x/noahrshinn)

A September 30 report documented users feeling uncomfortable with unsolicited shopping recommendations. [TechCrunch report](https://techcrunch.com/2026/09/30/instincts-new-product-recommendations-are-giving-some-users-the-ick/)

That feedback is worth discussing, but it cannot establish that Selections is already advertising, or that it ranks products by commission. The product question to press is more specific: is the information a user provided to handle a travel errand also used by default to actively suggest buying something new? "Help me miss one less thing" and "find my next purchase for me" involve different goals, and even when they use the same data, they deserve separate consent.

Recommendations can be designed as an on-demand query, or the user can subscribe to a kind of inspiration and set the frequency. If they enter the shopping flow, it is better to explain where the candidates came from, why they were chosen, and whether a commercial relationship exists. Explanation alone cannot remove a conflict of interest, but at least it lets the user know what to check. Turning off recommendations should leave the original errands running, otherwise "optional" becomes freedom in name only.

## Authorization should follow the consequence, not expand automatically with days of use

From the public material, user trust does not come in only two states, complete trust and complete distrust. Some people have Instinct sort email but send it themselves, some let it prepare an order but keep payment, and some are willing to let it monitor across days. Each arrangement stands on its own, and a product needs to accommodate them.

In the interview, Noah Shinn talked about building a delegation relationship gradually, and also stressed letting the user understand what will happen next. I agree with the second direction, but I would not treat "the user has been using it for a few weeks" as a reason to widen every permission. Being familiar with it drafting messages is not the same as authorizing it to send; confirming that it can find flights is not the same as confirming that it can judge fare rules. [Public machine transcript](https://podscripts.co/podcasts/invest-like-the-best-with-patrick-oshaughnessy/noah-shinn-building-instinct-the-personal-agent-invest-like-the-best-ep493)

Permission screens often name tools: read email, write calendar, and access the browser. What users understand more easily is the consequence: will it message other people, will it spend money, will it cancel an existing service, will it let someone else get my information. A product can keep technical permissions, but the confirmation should translate them into concrete actions.

For example, "allow calendar management" may at minimum include seeing free time and holding a slot for yourself, and it may also include inviting other people or changing an existing meeting. Those last three do not have the same impact. Solving all of them with one master switch means fewer clicks, but possibly a higher cost in understanding and in mistakes.

Town's current Modes & Approvals documentation distinguishes permissions for a conversation, a routine, and a specific tool; a conversation's allowed scope resets when a new chat begins, a routine has a persistent setting, and a one-time approval differs from a broader allowance. The documentation was updated on September 30. It therefore cannot be summarized any longer with "every message is approved individually." [Town's current authorization documentation](https://www.town.com/docs/safety/modes-approvals)

These controls can be as fine-grained as the tool level, and the cost is that the user may not be clear about which layer is in effect. If one approval quietly changes future behavior, the click saved today becomes tomorrow's surprise. My design suggestion is to make the approve button state its scope: this single action or this class of action, this conversation or this ongoing task; and after a scope is widened, the task record should carry a revocable entry.

Too-frequent confirmation also harms safety. If every lookup and every label change pops up a prompt of the same strength, users will soon get used to allowing everything along the way. Actions that should be confirmed seriously need a clear enough object and consequence. For a purchase, that is the merchant and the product, plus the total and the delivery; for a send, it is the identity, the recipient, and the final body; for a cancellation, it is the benefit being lost and when it takes effect.

Muse's official safety write-up shows one concrete approach: payment requires human confirmation; a payment to a new site uses a single-use credential that limits the merchant, the amount, and the valid time to that one operation. Authorization is the responsibility of a system outside the model. This is the vendor's description of the design at release; it is not an independent security audit, and it should not be borrowed to describe Instinct's architecture. [Muse's official safety design](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse)

For product people, the important part is that a delegation can finally have a concrete scope. A user agreeing to buy one product does not have to be read as permission to keep spending later. Payment confirmation should not show only a total either; buying the wrong model at the same price or filling in the wrong delivery address still causes a loss. A limit constrains part of the cost; the product, the delivery, and the cancellation terms still need checking.

After an error, an authorization record has another use: helping explain what was approved at the time, what the system actually did, and where the difference lies. It can support customer service and dispute handling, but it does not automatically bring a refund or compensation. Without a public policy or a verified case, I will not promise "someone has your back if it goes wrong" on behalf of any product.

So I would put the recovery entry point next to the completion evidence: whether the order can still be cancelled, what is needed to contact the merchant, how the user takes over, and how the costs already incurred are shown. If a system delivers a polished result only on success and leaves all the searching and negotiating to the user after a failure, the cost of the delegation is still hanging over the user's head.

## A matter involving several people cannot rest on the initiator's authorization alone

When a personal assistant deals with scheduling a meeting, a family event, or caring for parents, it quickly enters other people's lives. Knowing what the initiator wants to do does not yet mean it has the right to require another person to cooperate.

The Instinct interview described coordination between agents: the two people's assistants look for a time that works for both, and information access is provided at different scopes depending on the relationship. This is the founder's description of the product and cannot be expanded into a verified success rate for multi-person coordination. [Public interview transcript](https://podscripts.co/podcasts/invest-like-the-best-with-patrick-oshaughnessy/noah-shinn-building-instinct-the-personal-agent-invest-like-the-best-ep493)

This kind of design has a chance to reduce back-and-forth, but the cost is easily hidden inside the phrase "trusted relationship." Letting a colleague query a few free windows this week is not the same authorization as sharing the whole calendar. Even when the two people know each other, they still need to decide separately what is shared and for how long, and whether it can be passed on to someone else.

My design example would start from the narrowest question: to find thirty minutes this week, return only the available slots; write the invitation after confirmation. If one side needs to reschedule, fall back to candidates both sides can still accept. A refusal and a slow response should both be normal states; the system should not keep chasing the other person on the initiator's behalf just to keep the initiator satisfied.

Family matters call for more caution. The stress-test post mentioned a task related to a parent's walk, but did not explain how it verified whether the walk happened. Location, sensor, or health-data links cannot be filled in from that, and "can message my parents" certainly cannot be stretched into "can confirm my parents' condition." [Original post and related follow-up questions](https://www.reddit.com/r/AI_Agents/comments/1wak4is/ive_been_stresstesting_instinct_with_reallife/)

The product promise for this kind of task should stop at the evidence actually in hand. Sending a question, receiving a reply, and reading authorized data are three different levels. Stating the uncertainty clearly may not sound as good as "I take care of your family for you," but it avoids giving the initiator a reassurance that does not exist.

If convenient coordination requires both sides to use the same product, growth and experience become entangled. Town's approach of copying the assistant into email does not require an outside contact to register, which offers another path for this kind of relationship; its limitation is that it still depends on email habits and thread management. The two forms should be compared by how much back-and-forth and how many additional authorizations one coordination takes, not by how many entry points each one covers. [Town Email documentation](https://www.town.com/docs/using-town/email)

## One missed item can make every later run need rechecking

In the positive cases, the user handed over one segment of the work. In the negative cases, the most expensive change is often that he no longer knows which segments he can trust.

A Muse user who describes himself as a travel consultant posted that he reported about twelve days of use and found quote research helpful at first, followed by extraction from email into a spreadsheet that missed items; he had to reread the output, the assistant repeatedly asked for information it already had, and it repeated a mistake it had just agreed to set as a standing rule. This is one person's unverified account, and the post does not contain enough to establish the model version, the cause of the failure, or platform responsibility. [Original Muse travel-consultant post](https://www.reddit.com/r/MetaAI/comments/1wpdcdd/it_was_great_until_it_wasnt/)

The mechanism worth discussing here does not depend on deciding which product has a "bad memory." When the user does not know which part was missed, the scope of checking expands from the suspect point to everything. The agent can generate a table quickly, but the user has to line the original email up against the whole table again; next time, even if the table is correct, the habit of rechecking may already have taken hold.

Suppose organizing a travel quote takes twenty minutes to do myself, and after the agent handles it the check takes only three minutes — the delegation is useful; if explaining the request takes five minutes, repeated checking while waiting drags on, and in the end twenty minutes go into redoing it, it has only added a layer of process. This is a hypothetical scenario illustrating the attention cost, not a measurement of Muse or Instinct.

I would break the checking cost down within the specific task: which fields need to be exact, which can be summarized, and which ones make the result undeliverable when missing. In a travel quote, the dates and the number of travelers, plus the currency and the cancellation terms, decide whether the result is usable far more than a fluent summary does. If the extraction result keeps the location in the original text and marks missing fields and conflicts, the user can at least focus the check on the unknown parts.

This still does not guarantee that the user never has to double-check. If a product has once marked a wrong field as confirmed, those marks have to be re-verified for reliability. A visible source can shorten the checking path; it cannot replace a correct source, a correct extraction, and a citation that really matches that row.

"Remember this rule from now on" also has to become a checkable change. Let the user see what rule is currently stored and which tasks it applies to, and after editing or deleting it, watch the next run. An apology in the chat does not automatically turn into durable behavior. For repeated work, it is better to do a trial run on a small set of known material, confirm that the rule affects the next result, and then resume automatic execution.

How the agent stops when it is unsure is also part of the experience. It can deliver a partially completed table with the gaps left empty and tell the user which originals still need work; it can pause before sending anything out, so that unknown information is not spread as established fact. The worst arrangement is to announce success in a complete-sounding tone first, and explain the limitations only after the user finds the problem.

There is also a moment that product reviews easily overlook: user takeover. A website asking for verification by the person does not necessarily mean the whole matter has to start over. The system should keep as much of the completed part as possible, say which step needs human action, stop concurrent actions during the takeover, and reconfirm the state after it is handed back. This article does not go into runtime implementation, but whether the user can take over safely directly determines whether the last delegation turns into duplicated work.

In my earlier [article on agent fleet costs](/ai-agent/posts/open-model-cost-collapse-agent-fleet/), I counted human review and retries into the total cost per successful task. The personal agent's books have to be kept the same way, with the time spent watching progress and cleaning up added on. Saving only the clicks while hiding the checking and responsibility on the other end makes the benefit a product calculates far larger than what the user actually feels.

The charging model affects this accounting further. Berkowitz's Town case reminds us that credit-based pricing has to let the user know where the background spending goes; the Instinct founder said in the interview that he opposes the advertising model and discussed a direction of taking a share of merchant transactions. This is a public statement of business intent and cannot be equated with a completed alignment of long-term interests. [First-hand Town newsletter](https://aimarketersguild.com/p/should-you-hire-an-ai-townie), [Instinct interview transcript](https://podscripts.co/podcasts/invest-like-the-best-with-patrick-oshaughnessy/noah-shinn-building-instinct-the-personal-agent-invest-like-the-best-ep493)

A subscription faces the judgment of whether the expense is worth it; a transaction share faces the suspicion of whether it always wants me to buy. Different revenue sources mean different conflicts for the product to account for. A larger transaction volume may come from more shopping, not necessarily from less worry; vendor-reported growth, retention, and transaction scale, without a clear sample and calculation method, are not enough to answer how much work the user actually saved.

I would pay particular attention to several kinds of success that produce no new spending: shutting down a useless monitor and recovering a critical email, and also avoiding a missed refund deadline, or telling the user plainly that no purchase is needed. If an assistant claims to be on the user's side, these outcomes should count as value too. An internal metric that rewards only orders can make the behavior that saves the user the most trouble look unimportant.

## Putting "willing to repeat delegation" into a four-week experiment

This public material makes me more willing to bet on bounded, ongoing delegation: one concrete task, an authorization the user understands, a result with evidence, and a failure the user can take over. This judgment can still be overturned. If real users rarely hand over the same kind of task again even when the boundaries are clear and the results are reliable, it may be only an occasionally convenient tool; if adding status and evidence significantly increases the burden instead, then keep simplifying rather than insisting on filling out the record.

The public feedback holds one more direct challenge: in the Instinct discussion, someone said that after making an effort to use it, he still did not feel it suited him better than the ChatGPT, Claude, or Codex he already had. That is only one person's preference and cannot represent the market; it does remind me that a personal agent needs to prove that ongoing handling really adds something. Adding memory and a few connectors to a chat tool is not necessarily enough to make a user change habits. [Comment from a user who found no fit](https://www.reddit.com/r/AI_Agents/comments/1wak4is/ive_been_stresstesting_instinct_with_reallife/)

I would start with a four-week experiment on the same kind of task, picking a set of real matters that already need repeated handling, such as refund follow-ups and converting email into to-dos, or stock monitoring. What follows is a validation proposal; no product's measured results can be filled into it.

In the first week, record the baseline of the user handling it himself: how long the work actually takes, how long passes before he remembers to check, and where judgment is needed. Then have the agent handle the same kind of task, and record how long the user spends explaining and approving, along with the time spent following up, checking, and fixing. The task complexity in the two conditions should be as comparable as possible; otherwise, if the simplest batch goes to the agent and the most complex batch stays with the person, the conclusion will be manufactured by the sampling.

Then keep observing for three more weeks, giving novelty a chance to fade and multi-day matters a chance to actually run into changes. The results cannot be counted by number of conversations alone; they should go back to the original evidence: whether the refund arrived, whether the to-do matches the original text, and whether the stock alert arrived while the item was still purchasable. When the merchant still has not responded, the status stays incomplete; writing a follow-up email is no reason to count the outcome as a success.

I would keep four observations that are relatively easy to explain:

- **Second effective delegation**: whether the user proactively hands over the same kind of matter again, and whether the result is usable after checking. Rework and follow-ups are recorded separately.
- **Total user investment**: how much time explaining, approving, checking, fixing, and cleaning up take together, compared with handling it himself.
- **Takeover and loss**: where a human had to take over, whether anything was sent by mistake, bought by mistake, or missed past a deadline, and how long recovery took.
- **Net value of proactive work**: how many of the reminders required action, which tasks the user turned off, and which necessary reminders were never sent.

Each of these measures has its blind spots too. A second delegation may come from the task being frequent, and low-frequency, high-value matters cannot be judged in four weeks alone; the time saved may still not be enough if the user avoids it over privacy concerns; and the value of a proactive reminder sometimes shows up as a loss avoided, which cannot easily be converted into minutes saved. The experiment needs to keep these distinctions rather than flattening them into one handsome score.

It is equally important to record who dropped out and why. Interviewing only the heavy users who stayed would erase the people who "did not know what to hand over," found "authorization too tiresome," or "were not willing to pay" from the results. The reasons people left may point more directly at what the product should change next than how many new tricks the people who stayed tried.

If someone is willing to keep handing over information gathering while always keeping the final send or payment, I would accept that product shape first. It already reduces part of the work, and there is no need to force the user to hand over the remaining judgment just to prove the agent is autonomous enough. The real opportunity may also be a reliable assistant that prepares tasks for the user, which then earns wider delegation item by item.

Return to the user at the beginning who was willing to let Instinct find things but not yet willing to let it pay freely. The boundary he drew is clear: this segment can be handled for me, this step I decide. Only if a Personal Agent can remember and respect that boundary, and state the result and the remaining responsibility clearly, does a second delegation have a good enough reason to happen.

## References

- [Instinct's website: product positioning and entry point](https://instinct.com/)
- [Colossus EP.493: Instinct — The Personal Agent, 2026-09-28](https://colossus.com/episode/instinct-the-personal-agent/). The public episode description and chapters were checked; the official full transcript requires a login.
- [EP.493 public machine transcript](https://podscripts.co/podcasts/invest-like-the-best-with-patrick-oshaughnessy/noah-shinn-building-instinct-the-personal-agent-invest-like-the-best-ep493). Used to check the interview passages; it contains ad insertions and transcription errors and is not a new interview.
- [Original Instinct stress-test post and comments](https://www.reddit.com/r/AI_Agents/comments/1wak4is/ive_been_stresstesting_instinct_with_reallife/). Contains user accounts about flight monitoring, jobs and events, and a correction about permissions, none verified against independent logs.
- [The WhatsApp user's specific comment](https://www.reddit.com/r/AI_Agents/comments/1wak4is/comment/pc0gjb5/)
- [The specific comment about a read message that got no response](https://www.reddit.com/r/AI_Agents/comments/1wak4is/comment/pau2h0b/)
- [Poke Recipes official documentation](https://poke.com/docs/creating-recipes)
- [Original Poke user post about a standalone app entry point](https://www.reddit.com/r/AskVibecoders/comments/1uzxhjg/i_need_an_ai_personal_assistant_what_are_the_best/). Used only as a clue about entry-point preference; the promotional relationship was not verified.
- [Town Email official documentation](https://www.town.com/docs/using-town/email)
- [Town Routines official documentation](https://www.town.com/docs/routines)
- [Town Modes & Approvals, updated 2026-09-30](https://www.town.com/docs/safety/modes-approvals)
- [David Berkowitz: Should You Hire an AI Townie?, 2026-08-07](https://aimarketersguild.com/p/should-you-hire-an-ai-townie)
- [Original post of feedback from the Muse travel consultant](https://www.reddit.com/r/MetaAI/comments/1wpdcdd/it_was_great_until_it_wasnt/)
- [Meta: How We Built Safety Into Muse](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse). A vendor description of the design at release, not an independent audit.
- [Mirror of Noah Shinn's public post: Instinct Selections](https://twiscan.com/en/x/noahrshinn). The mirror's reading and media context is limited.
- [TechCrunch: Instinct's new product recommendations are giving some users the ick, 2026-09-30](https://techcrunch.com/2026/09/30/instincts-new-product-recommendations-are-giving-some-users-the-ick/). Only one short paraphrase from it is used in the body.
