---
title: "A Solo Creator's AI Video Editing Pipeline That Actually Works"
date: 2026-07-19T22:00:00+08:00
lastmod: 2026-07-31T20:00:00+08:00
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Automation
  - Super Individual
  - Content Strategy
  - Solo Builder
  - Harness Engineering
categories:
  - Development
description: >
  A practical AI video editing pipeline for solo creators: structure shoots, automate rough cuts, keep judgment human, and publish safely across platforms.
tldr:
  - For a solo creator, video is mainly a distribution layer. The useful question is not whether a cut looks expensive, but whether it carries something only you could have learned.
  - In my tests, one-click AI auto-edit produced serviceable rough cuts but flattened the choices that made the footage specific.
  - The highest leverage sits at the shooting end. A repeatable shot list turns much of editing from invention into a template that software can reliably assist.
  - "A programmable pipeline (split / transcribe / de-silence / LLM-generated EDL / ffmpeg render) is a structural advantage for developers: it turns repeated labor into a versioned asset instead of a fresh act of willpower every episode."
  - "In my July 2026 review, publishing still worked best as a semi-automatic system: automate the package, then use only verified official delivery paths."
maturity: budding
cover:
  image: /images/covers/ai-agent/2026/solo-creator-video-pipeline.jpeg
  alt: "A solo creator's AI video editing pipeline from camera to publication"
---

Last winter I ran a very ugly set of numbers.

I'd spent an entire afternoon in a café, writing code and shooting footage in between — about forty minutes of material across phone and screen recording. I started editing that evening and exported at 1:30 in the morning. The finished cut was fifty-eight seconds.

Forty minutes of footage. Six hours of editing. Fifty-eight seconds of output. And the numbers on it were mediocre.

My first reaction was "my editing is too slow, I need AI." So for the next month I tried everything: auto-edit, beat sync, auto-captions, auto-color. Efficiency did improve — six hours came down to two and a half. But the finished videos got *less* watched.

It took me a while to see that I'd asked the wrong question from the start. **The problem was never "editing is slow." It was that I hadn't decided what I was cutting toward before I started shooting.** Editing took six hours because those forty minutes had no structure — I was using the timeline to do work that belonged before I left the house, and AI was accelerating precisely the part I shouldn't have been doing.

This is how I rebuilt it. It's both a set of judgments (what to hand to AI, what not to give up an inch of) and a procedure you can follow (capture settings, directory conventions, commands, publishing architecture). I run four content lines: AI product and technical teardowns, screen demos, cafés and cities, and a smaller amount of hiking. The four are handled differently, but they share one pipeline.

## Put video back in the right layer

In [the piece on a super individual's intelligence system](../super-individual-intelligence-system/) I leaned on an argument I want to reuse here: the value of a layer of equipment depends on whether its progress helps only you, or helps all your competitors at the same time.

By that standard, which layer does video editing skill belong to?

It belongs to distribution, not production. That distinction isn't wordplay — it directly determines where your hours should go.

If video were production, "faster and prettier" would be the core metric, and every upgrade to AI editing tools would be pure gain. But for a super individual, video isn't the output. It's the channel that hauls what you already have — the product you built, the pits you fell into, your judgment — into someone else's attention. **A channel's value is not set by how polished the channel is. It's set by whether what it carries is scarce.**

The corollary is counterintuitive and hard: a rough-looking video about something only you know has higher distribution value than a beautiful video about something everyone is saying. And every upgrade in AI editing tools acts on the second half of that sentence — the polish.

So the first judgment: **on video, optimize picture quality until it stops being an obstacle, then stop. Marginal return above that line is very low.** Your time belongs one step earlier — deciding what to shoot.

```
              where the value comes from
                        │
       ┌────────────────┴────────────────┐
       │                                 │
  only you have it              how polished it looks
  (first-hand experience /      (image / color / transitions /
   real numbers / failure        pacing / caption styling)
   details / judgment)
       │                                 │
  AI can't generate it            AI is closing this gap fast
  and can't replace it            and shipping it to everyone
       │                                 │
   ← spend your hours here        good enough is enough →
```

## Why one-click AI auto-edit kept giving me an average cut

This is the pit I fell into hardest, and it deserves its own section, because the failure isn't "the tools aren't good enough yet." It's structural.

Auto-edit features do three things: detect shot boundaries, score each shot for quality, then order and assemble them against a generic pacing template. They're honestly not bad — the ones I tried produce a structurally complete, editable rough cut, faster than starting from an empty timeline.

The problem is the objective function. **It smooths footage toward a generic pacing template.** In my small sample, that produced competent rough cuts with no obvious mistake and no memorable decision. That is useful as a starting point, not a finished editorial judgment.

The version that works for me is the inverse: **use AI to lower the fixed cost per piece, then spend the saved time on evidence and judgment only I can supply.** The goal is not ten times the volume. It is a denser account of what actually happened.

## Cut apart what AI can and can't do

My split is three tiers, and I draw the borders hard, because the fuzzy zone is where the efficiency actually leaks.

**Tier one: deterministic haulage. Hand all of it over.**

These have a single correct answer and a machine can tell right from wrong:

- Transcription — speech to text, for captions and for text-driven editing later.
- Silence and filler removal — the "uh… let me just check" in screen recordings.
- Shot detection — splitting a long take into discrete clips on visual change.
- Format normalization — frame rate, resolution, color space, audio sample rate.
- Caption burn-in, batch cover export, multi-platform aspect cropping.
- Denoise, background removal, upscaling.

I run this tier as scripts, not in a GUI. The reason is the next section.

**Tier two: probabilistic proposals. Let it draft, I decide.**

- Picking candidate segments and quotable lines out of the transcript.
- Generating ten variants of an opening hook.
- Deriving a shot list backwards from a script.
- Generating candidate titles, tags, descriptions, cover copy.
- A color starting point (auto white balance, reference-frame matching).

The operative word is *candidate*. I never take the output directly; I only choose from it. The value of this tier isn't that AI picks well — it's that it converts "start from nothing" into "pick one of twenty," and the second costs an order of magnitude less cognitively.

**Tier three: judgment I still keep.**

- The opening. In my own short-video sample, early exits cluster here, but no universal three-second rule explains every platform or audience.
- Pacing and silence. AI knows where a cut *can* happen, not where it *should*. Whether a pause reads as awkward or as tension lives in the context, not in the waveform.
- Music.
- The final color identity.
- The conclusion. What you actually think.

I've written before about the harness ratio — **the scaffolding is 98.4%, the judgment is 1.6%, and that 1.6% decides whether the other 98.4% is worth anything**. It transfers to video almost unchanged. The vast majority of editing is mechanical labor, but whether the cut is good is decided by a small handful of calls.

## The shooting end is the actual leverage

Back to that six-hour afternoon.

Editing can only be automated if the footage has structure. **AI cannot edit a shot you never filmed, and it can't rescue a pile of material with no internal logic.** So the highest-ROI stretch of the whole pipeline is the ten minutes before you leave the house.

What I do is freeze a shot list per content line and shoot exactly the same shots every time. Editing then downgrades from creation to filling in a template — and filling in a template is automatable.

### The screen demo line (AI teardowns, technical demos)

This line deserves to be engineered end to end, because every stage of it is deterministic with almost no random factors.

Fixed pre-record moves:

- **Write the script before recording.** Not word-for-word — a segmented outline where each segment has one sentence saying what the viewer should understand by the end of it. Without this you will record thirty minutes of wandering.
- **One concept per video.** If you want to cover three, record three.
- **Environment preset**: terminal font at 16–18pt (defaults are unreadable on a phone), clear shell history and distracting prompts, notifications off, a clean demo directory prepared, a separate browser profile with no extensions.
- **Record at a fixed 1920×1080**, crop 9:16 later. The reverse doesn't work.
- **Don't full-screen the window.** Leave a margin so you can add rounded corners and a backdrop in post.

On tools: **OBS is free, open source, stable, and enough for long-form and streaming. If your technical demos go out as short video, the auto zoom-and-pan class of tools is worth paying for** — small text like code is unreadable on a phone unless you push in, and doing that by hand is brutally slow. That's the one editing-side subscription I consider clearly worth it. (Pricing in this category has moved a lot in the last two years; check the vendor's site before you buy.)

One concrete technique: **don't cut out the parts where the demo fails.** I used to delete every error, dead end, and detour and keep only the happy path. The videos where I left them in performed better. The reason isn't hard — anyone can get the happy path by reading the docs. Where you got stuck, and how you got out, is the part nobody can search for. It's also exactly what AI can't generate.

### The café and city line

The goal here is atmosphere plus persona. Information density can be low, but the demand on authenticity is high.

Capture settings I use (iPhone + Blackmagic Camera, free):

| Setting | Value | Why |
| --- | --- | --- |
| Frame rate | 4K 24fps | My preferred cadence; 30/60fps can be better for other subjects |
| Shutter | Locked 1/48s (180° rule) | Sets the amount of motion blur; too fast and the image goes brittle |
| Color | [Apple Log on supported iPhone Pro models](https://support.apple.com/en-euro/109041) | More room for a deliberate grade than a baked-in look |
| ISO | Lowest usable | In dim cafés raise ISO, never touch the shutter |
| WB / focus | Manually locked | Auto's constant brightness drift is the single biggest "cheap phone video" tell |
| Stabilization | Optical only, enhanced modes off | See below |
| Outdoors | Clip-on ND, 5–8 stops | Phones can't stop down; holding 1/48s in daylight will blow out |

Save all of it as a preset so it's one tap.

The stabilization line deserves elaboration because it runs against instinct. **Small handheld shake isn't a defect — it's the signal of this style.** Over-stabilized footage floats rather than moves, and reads as fake. What a gimbal strips out is exactly the micro-imperfection that makes motion feel human. So: elbows tucked to the ribs, torso as the stabilizer, knees slightly bent, walk heel-to-toe. That yields a documentary breathing quality rather than cheap high-frequency jitter.

Shoot moving shots on the 0.5x ultra-wide — wide-angle distortion absorbs shake far better than 1x, at the cost of edge warping you can crop out. Use the 1x main camera for close-ups, disable digital zoom, and physically walk closer.

My fixed shot list is eleven shots, usually 5–10 seconds each:

```
1  storefront / sign (include the door push, useful as a transition)
2  POV pan on entering
3  ordering or menu close-up
4  the pour / the make (capture natural sound: grinder, steam)
5  finding a seat, setting down the bag and laptop
6  hands opening the laptop, typing
7  the screen (terminal / editor — the persona shot)
8  cup landing on the table, close
9  ambient empties ×2–3 (window, lamp, blurred people)
10 locked-off working long take, 3–5 min (16–20× in post)
11 leaving / the light changing
```

The point of this list isn't that it shoots beautifully. It's that **it overlaps completely with the fact that I was going to work in that café anyway, so the marginal cost is near zero.** Sustainable, without relying on willpower.

### The hiking line

The difference from the other two is that **you cannot reshoot**. So the strategy shifts from "get enough footage" to "guarantee a few anchor shots."

I force only four shots and leave the rest to chance:

1. A wide establishing shot at the trailhead (spatial context).
2. POV through the hardest stretch (the only place with narrative tension).
3. One "person tiny inside the landscape" long shot — this class of shot performs everywhere.
4. The look back from the end.

I bring a power bank and resist documenting the whole route. A few anchor moments give me a story; continuous footage usually gives me a storage problem.

## The programmable pipeline

This section is where developers hold a structural advantage over ordinary creators, and I think it's badly underused.

Everyone else's editing flow is "do it again from scratch each time." Yours can be "write it once, run it a hundred times." The difference isn't per-run efficiency — it's **whether it's an asset or a consumable**.

### Footage on disk

A pipeline only runs if the input is predictable. My convention:

```
footage/
  2026-07-19_cafe-shenzhen/
    raw/          # originals, read-only, never modified
    proxy/        # normalized proxies (script-generated)
    audio/        # extracted audio
    transcript/   # transcription json + srt
    scenes/       # split clips
    edl.json      # edit decision list
    out/          # renders
    meta.yaml     # location, topic, target platforms
```

`raw/` being read-only matters. Every intermediate artifact can be rebuilt from `raw/` plus a script, which means when you improve the pipeline you can re-run your entire back catalogue through it.

### Five stages

**Normalize.** Push everything through ffmpeg into one parameter set first, so no downstream stage ever has to handle format variance. It looks like a boring step, but it eliminates the most common failure source in the whole chain.

```bash
ffmpeg -i raw/IMG_0001.MOV -c:v libx264 -crf 18 -r 24 \
       -c:a aac -ar 48000 proxy/0001.mp4
```

**Transcribe.** faster-whisper locally, emitting json (with word-level timestamps) and srt. Word-level timing is the foundation of every text-driven edit downstream; without it you can only cut on sentence boundaries, which isn't precise enough.

Worth noting: faster-whisper's release cadence slowed noticeably after late 2025. I read that as *mature and stable* rather than abandoned — it works and people use it, but don't expect rapid iteration.

**Split.** PySceneDetect cuts long takes into discrete clips on content change and emits a timecoded manifest. [Version 0.7 is a breaking release](https://www.scenedetect.com/docs/latest/api/migration_guide.html): timestamp handling was overhauled for variable-frame-rate video and several APIs moved. I checked the migration guide on 2026-07-31; pin your current version and test old scripts before upgrading.

**De-silence.** auto-editor handles screen recordings and talking segments, stripping silence and filler. It can emit a cut mp4 directly, or a timeline file for a professional NLE. It's the most actively maintained link in this chain and the one I worry about least.

**LLM-generated EDL.** This is what actually strings the previous stages together, and the part I think most people never reach.

The idea: feed the model the transcript plus the scene manifest plus your shot list template, and have it output a *structured edit decision list* — not have it "edit the video." The model handles text, ffmpeg handles pixels, neither crosses over.

```json
{
  "target": {"platform": "youtube_shorts", "aspect": "9:16", "duration_sec": 58},
  "hook": {
    "source": "scenes/0007.mp4",
    "in": 2.4, "out": 5.1,
    "caption": "Shenzhen, $4, and an outlet at every seat",
    "note": "chosen because the outlet is visible — pays off the title immediately"
  },
  "timeline": [
    {"source": "scenes/0003.mp4", "in": 0.0,  "out": 2.8, "speed": 1.0},
    {"source": "scenes/0011.mp4", "in": 12.5, "out": 15.0, "speed": 1.0,
     "audio_lead_in": 0.5},
    {"source": "scenes/0018.mp4", "in": 0.0,  "out": 40.0, "speed": 16.0}
  ],
  "captions_srt": "transcript/final.srt",
  "cta": "ask me for the exact address in the comments"
}
```

With that schema, rendering becomes deterministic code, and **every editing decision becomes diffable, versionable, reusable text**. Last episode's EDL is this episode's template. You can even feed performance data back in — which class of opening retained best goes straight into the prompt that generates the next EDL.

Open-source "LLM writes an EDL" projects have proliferated since 2025, but none of them has reached a production-grade niche as far as I can tell; they're mostly solo or small-team efforts. My advice is **take the idea, not the implementation** — a two-hundred-line script of your own against the structure above is more controllable than adopting any of them.

### Hand the last 20% back to a GUI

The pipeline stops at rough cut. Final color, music, caption styling, and pacing trims I do by hand.

I grade in DaVinci Resolve because I know its controls; that is a workflow preference, not a claim that it is the best or cheapest choice in July 2026. Product tiers and included features change, so I verify them on Blackmagic Design's current product page before recommending a purchase.

Grading order for Log footage: apply a conversion LUT to restore, balance with color wheels, pull saturation down 5–10%, push shadows slightly cyan-green and highlights slightly warm, then add film grain last (20–30% strength, don't max it). On export, turn off any "smooth motion" or frame interpolation option — shot at 24fps, export at 24fps; interpolation erases everything you did to earn that cadence.

I currently use CapCut for some vertical versions and captions because it is quick in my hands. I keep client and unreleased footage in a local workflow; I have not completed a jurisdiction-by-jurisdiction legal review of CapCut's current terms, so I do not turn that personal boundary into legal advice.

## The four content lines are one persona

This section is about platform angle, but it has to start from positioning, because the angle is a corollary of the positioning.

My initial mistake was treating the four lines as four subjects and hunting for "an angle nobody's covered" within each. That road doesn't go anywhere, because the empty slots in every subject are being filled fast.

The reframe: **the four lines aren't four subjects. They're four exposure levels of one person.** Teardowns establish what I know, screen demos prove I built it, and cafés and hiking give that work a place and a human scale. A screen shot filmed in a café can serve two lines at once; treating every line as an independent brand creates four cost centers.

### The angle: don't crowd into reviews

AI tool reviews are the reddest ocean of 2026, precisely because AI itself has floored the cost of producing them. Anyone can spend two hours and ship "I tried ten AI editing tools."

My judgment: **shift from "how is this tool" to "I actually finished something with it."**

The first is replicable information; the second is process evidence. The second requires me to have spent time failing, and the details are usually more useful than another feature list.

Three formats I now prioritize:

1. **Full process records.** Not "how to use X" but "I finished Y with X and hit these three specific pits." With real numbers, real error messages, real workarounds.
2. **Costs and ledgers.** "What this stack costs me a month." "Which subscription I cancelled and why." Extremely hard to fabricate, because it requires actual invoices.
3. **Counterintuitive negative conclusions.** "I used this feature for three months and then turned it off." Negative conclusions are naturally scarce, because they require enough long-term use to be willing to state one.

### Platform differences in my own workflow

This table is a record of how I use the platforms, not a claim about their ranking, audience, or account eligibility:

| Platform | Form I publish | My role for it | Angle I test |
| --- | --- | --- | --- |
| Bilibili | Long | Home base, full process | Technical depth and complete narrative |
| YouTube | Long + Shorts | English content, long-tail compounding | Search long tail in the English technical audience, plus nomad content |
| Xiaohongshu | Vertical short + photo posts | Lifestyle line and light technical | Concrete place and problem terms in titles |
| Douyin | Vertical short | Acquisition, not home base | Strong hook, low information density but a memorable beat |

I have not found a public first-party source that quantifies Xiaohongshu search share or conversion. My narrower observation, from my own posts, is simply that concrete titles keep earning discovery longer than mood copy. "A café in Shenzhen's Longhua where you can sit all afternoon" also tells a human what the post contains; "today's vibe" does not.

Long and short are not two sets of footage. My approach: **make the long one first, then cut shorts out of it.** The reverse doesn't work, because short-form material lacks the context to support a long piece. This has to be decided at capture time — shoot to the long-form standard and the shorts are a free byproduct.

## Automated publishing: what it can honestly do

This is the area where I found the online information least reliable. Plenty of articles read as if you plug in an API and get one-click cross-platform distribution. The reality is a good distance from that.

Here is what I could prove from first-party documentation, checked on 2026-07-31:

**YouTube separates channel permission, API-project verification, and quota.** The [official `videos.insert` method](https://developers.google.com/youtube/v3/docs/videos/insert) can upload a video, but uploads from unverified API projects created after 28 July 2020 are restricted to private visibility until the project passes a compliance audit. That is an app-project restriction, not a statement that the creator's channel is ineligible. Google's [quota calculator](https://developers.google.com/youtube/v3/determine_quota_cost) currently lists a separate Video Uploads bucket, one unit per `videos.insert` call, and a default limit of 100 uploads per day. Those are defaults, not a promise that every channel should publish 100 times.

**TikTok also separates creator authorization from developer-client review.** The creator grants the app permission to post, while the developer's API client has its own audit status. TikTok's [Content Sharing Guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines/) say an unaudited client can post only with `SELF_ONLY` visibility and can serve at most five users in a 24-hour window; audited and unaudited clients remain subject to creator and posting caps, with the latter typically around 15 posts per creator per day. The exact cap can vary. That is an API capability and client-review rule, not blanket eligibility for every creator account.

**For Douyin, Bilibili, and Xiaohongshu, I could not substantiate a universal rule from public first-party documentation.** My 2026-07-31 survey did not establish that every individual is barred, that every business is approved, or that a stable general-purpose server-side publishing endpoint is available to ordinary developers. Their creator-account programs, developer-app reviews, and actual API scopes are separate questions. I therefore keep these destinations manual unless the platform grants a specific application the documented scope it needs.

**On browser automation.** I found projects that simulate login and publishing, but I did not audit each tool or each platform's current agreement. My decision is simpler: I do not give an unofficial publisher the session cookies for my main account. That security boundary matters even before a terms-of-service analysis.

### So the real architecture is semi-automatic

My conclusion: **split publishing into "prepare" and "deliver." Fully automate prepare; handle deliver per platform.**

```
   render complete
         │
         ▼
  ┌───────────────────────────────────────────┐
  │ automatic: generate manifest.yaml          │
  │  · aspect variants (16:9 / 9:16 / 4:5)     │
  │  · per-platform title / description / tags │
  │    (LLM-generated candidates, human-picked)│
  │  · batch cover export                      │
  │  · first-comment / pinned-comment copy     │
  │  · AI-usage disclosure (see next section)  │
  └───────────────────────────────────────────┘
         │
         ├──► YouTube   : official API, automatic
         ├──► TikTok    : official API, within granted scope
         ├──► Bilibili / Douyin : manual unless my app has
         │                        a verified publishing scope
         │                        the copy from manifest
         └──► Xiaohongshu : manual, from the phone
```

The value of this architecture is that **the manual part is compressed into pure mechanical motion.** At publish time I'm not inventing titles, re-cropping aspects, or writing tags — the manifest already has them. What's left is "open app, pick file, paste copy." In my current routine that is brief, though the time varies with each platform's checks.

One judgment I want to make explicit: **chasing 100% automation here is net negative.** That last manual upload is a forced review window — more than once I've caught a wrong title, a bad cover, or simply decided a piece shouldn't go out at all. Full automation deletes that window. This is one of the few places I keep a human in the loop deliberately, not because the technology can't do it, but because it's worth it.

## Compliance: don't skip this

In 2026, AI labeling is part of the publishing design, not a checkbox to remember at the end.

**China's Measures for Labeling AI-Generated Synthetic Content took effect on 1 September 2025.** The [official text](https://www.cac.gov.cn/2025-03/14/c_1743654684782215.htm), which I rechecked on 2026-07-31, defines generated or synthetic text, images, audio, video, and virtual scenes, and distinguishes visible from metadata-based labels. The detailed duties differ by role: generation-service providers add required labels; distribution services inspect or add notices; users publishing generated or synthetic content must declare it and use the platform's labeling feature. The text also prohibits malicious removal, alteration, forgery, or concealment of required labels. It does not support my earlier shortcut that every use of AI assistance triggers an identical label, so I follow the platform flow and preserve provenance instead of inventing a universal rule.

**YouTube has two separate policies.** Its [altered or synthetic content guidance](https://support.google.com/youtube/answer/14328491) requires disclosure for meaningfully altered or generated content that looks realistic, such as a fabricated real event or place. It explicitly says minor edits and production assistance such as outlines, captions, titles, or thumbnails do not require that disclosure. The same page says disclosure itself does not limit audience or monetization.

Separately, YouTube's [channel monetization policy](https://support.google.com/youtube/answer/1311392?hl=en-GB&p=reused_content) renamed “repetitious content” to “inauthentic content” in July 2025 to clarify that repetitive or mass-produced work is ineligible. The reused-content policy remains distinct and evaluates whether borrowed material has meaningful original commentary or transformation. Neither page describes the fictional automatic three-strike sequence I had previously repeated here; enforcement depends on the applicable policy and review.

**On generative video.** My advice is conservative: **don't use it to fabricate real scenes.** Don't generate a café that doesn't exist or a place you've never been. It gets recognized, and once it does, what you lose is credibility across all your content — a cost far larger than the shooting time you saved. The two legitimate uses are abstract transition textures and clearly-presented effects shots.

One timeline needs exact dates. OpenAI's [Sora discontinuation notice](https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation), checked on 2026-07-31, says the web and app experiences ended on 26 April 2026 and the API will end on 24 September 2026. That is a useful architectural warning: **do not bind a critical stage of the pipeline to one hosted service.** My core stages — ffmpeg, scene detection, transcription, de-silencing — can run locally.

## A startup checklist you can follow

Starting from zero, this is the order I'd suggest, and don't optimize any step before moving to the next:

**Week 1: solve only "what to shoot."** Write a shot list for each line and keep it in your phone's notes. Touch no tools this week — shoot the list on the stock camera app if you like. The goal is to validate whether the shot list itself holds up.

**Week 2: freeze capture settings.** Install Blackmagic Camera, save 24fps / 180° shutter / Log / manual locks as a preset. For the screen line, turn the environment prep into a script (font size, clear history, notifications off).

**Week 3: build the minimum pipeline.** Three things only: ffmpeg normalize, faster-whisper transcribe, auto-editor de-silence. Three commands in one shell script. Don't touch EDLs yet.

**Week 4: start shipping, edit by hand.** Cut five pieces from the previous weeks' footage, all manually. The purpose is to learn what your own editing decision pattern is — you can't write a useful EDL prompt without knowing that.

**Month 2: encode the repeated decisions into EDL generation.** By now you have five pieces of experience and you know which identical judgments you make every time. Turn those into a prompt and a schema.

**Month 3: wire up publishing.** YouTube first; consider other platforms only once that runs.

The most counterintuitive thing in this ordering: **build the pipeline only after you've done it manually five times.** The most common failure I've seen (and committed) is the reverse — spend two weeks building beautiful automation, then discover it automates the wrong stage. **You cannot automate a process you haven't yet done correctly.**

## Closing

Back to that afternoon that turned into six hours and fifty-eight seconds.

The same content now takes about twenty minutes to rough cut and an hour of manual finishing. But that isn't the important gain.

The important gain is that I no longer spend a fresh act of willpower each time. **Every video used to be a from-scratch consumable; now every video adds a part to the same machine.** The shot lists get sharper, the EDL templates fit my own rhythm better, the publishing manifest saves more work. That's the difference between an asset and a consumable — and I think it's the only path that works for a super individual making content: not one viral hit, but a fixed cost per piece that keeps falling.

As for where AI sits in this, my view is considerably more conservative than it was a year ago. It took away the 98.4% that's mechanical labor, which is worth a lot. But it can't take the remaining 1.6% — and the more of the first part it takes, the more the second part matters in relative terms, because once everyone's 98.4% has been flattened by the same tools, the small handful of judgments is all that distinguishes you.

So the real question was never "which AI editing tool should I use." It's **whether you have something only you can say.** If you do, the toolchain is just the pipe that carries it out, and a rough pipe is fine. If you don't, the smoothest pipeline in the world is only mass-producing 60s.

---

**Source horizon.** Tool versions, prices, quotas, and review rules can move faster than this essay. The dated first-party links above are the evidence for the claims I make; where public documentation did not prove a conclusion, I kept the statement limited to my own workflow.
