---
title: "AI Can't Edit a Shot You Never Filmed: A Solo Creator's Video Pipeline for 2026"
date: 2026-07-19T22:00:00+08:00
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: ['AI video editing', 'video pipeline', 'super individual', 'content distribution', 'ffmpeg', 'PySceneDetect', 'faster-whisper', 'auto-editor', 'EDL', 'screen recording', 'automated publishing', 'AI content labeling', 'solo creator', 'digital nomad']
tags:
  - AI
  - Automation
  - Super Individual
  - Content Strategy
  - Solo Builder
  - Harness Engineering
description: >
  When one person makes videos, the thing that most deserves automation is never the editing itself. After splitting my four content lines — AI product teardowns, screen demos, cafés and cities, hiking — into one reproducible pipeline, I found AI can take over the deterministic haul from footage to timeline, but the hook, the pacing, and the conclusion can't be handed off at all. This is how that pipeline is built, how to standardize the shooting end, how to pick a platform angle, and what automated publishing can actually do in 2026.
tldr:
  - For a super individual, video belongs to the distribution layer, not the production layer. So the metric isn't "does it look good" — it's "did it carry across the thing only you have."
  - One-click AI auto-edit necessarily produces a 60-point cut, because it takes the mean of your footage. In a year of exploding supply, mean content has exactly zero distribution value.
  - The real leverage sits at the shooting end. Freeze each content line into a fixed shot list and editing downgrades from creation to filling in a template — which is the only thing AI can deterministically take over.
  - "A programmable pipeline (split / transcribe / de-silence / LLM-generated EDL / ffmpeg render) is a structural advantage for developers: it turns repeated labor into a versioned asset instead of a fresh act of willpower every episode."
  - Automated publishing in 2026 tops out at semi-automatic. YouTube's official upload API has loosened, TikTok requires an audit and rate-limits you, Douyin and Bilibili demand a business entity, and Xiaohongshu has no publishing API for ordinary developers.
maturity: budding
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

## Why one-click AI auto-edit is structurally a 60

This is the pit I fell into hardest, and it deserves its own section, because the failure isn't "the tools aren't good enough yet." It's structural.

Auto-edit features do three things: detect shot boundaries, score each shot for quality, then order and assemble them against a generic pacing template. They're honestly not bad — the ones I tried produce a structurally complete, editable rough cut, faster than starting from an empty timeline.

The problem is the objective function. **It takes the mean of your footage, and its template is the mean of the whole platform's footage.** Stack two means and you get a cut that is nowhere ugly and nowhere distinctive.

In an era of scarce content supply, 60 points survives. 2026 is not that era. When everyone can produce a 60 with one click, the distribution value of a 60 isn't 60 — it's zero, because algorithms and audiences both select the head of the distribution, never the mean.

There's an implication I think matters: **AI driving the marginal cost of content production toward zero necessarily raises the real cost of content distribution.** Supply explodes, total attention doesn't, so the unit price of attention goes up. Which makes "use AI to raise output" mathematically self-cancelling. Ten times the volume, but expected reach per piece falls faster than ten times.

The version that works is the inverse: **use AI to crush the fixed cost per piece, then pour every hour you saved into the part only you have.** Not ten times the volume — ten times the density of information nobody else could have supplied.

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

**Tier three: judgment you cannot outsource. Not one inch.**

- The first three seconds. The only place that truly decides the outcome, and the place AI is most mediocre — because a good hook is by definition counter-expectation, and a model generates what meets expectation.
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

Capture settings (iPhone + Blackmagic Camera, free):

| Setting | Value | Why |
| --- | --- | --- |
| Frame rate | 4K 24fps | The physical source of "cinematic." 30/60fps reads as news footage |
| Shutter | Locked 1/48s (180° rule) | Sets the amount of motion blur; too fast and the image goes brittle |
| Color | Apple Log (Log 2 on newer bodies) | An order of magnitude more grading latitude |
| ISO | Lowest usable | In dim cafés raise ISO, never touch the shutter |
| WB / focus | Manually locked | Auto's constant brightness drift is the single biggest "cheap phone video" tell |
| Stabilization | Optical only, enhanced modes off | See below |
| Outdoors | Clip-on ND, 5–8 stops | Phones can't stop down; holding 1/48s in daylight will blow out |

Save all of it as a preset so it's one tap.

The stabilization line deserves elaboration because it runs against instinct. **Small handheld shake isn't a defect — it's the signal of this style.** Over-stabilized footage floats rather than moves, and reads as fake. What a gimbal strips out is exactly the micro-imperfection that makes motion feel human. So: elbows tucked to the ribs, torso as the stabilizer, knees slightly bent, walk heel-to-toe. That yields a documentary breathing quality rather than cheap high-frequency jitter.

Shoot moving shots on the 0.5x ultra-wide — wide-angle distortion absorbs shake far better than 1x, at the cost of edge warping you can crop out. Use the 1x main camera for close-ups, disable digital zoom, and physically walk closer.

Fixed shot list — eleven shots, 5–10 seconds each, under fifteen minutes total:

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

Other traps: bring a power bank, cold drains batteries fast. Hiking footage is naturally long and eventless, so pacing has to come from speed ramps and music in post. And don't try to document the whole route — documenting the whole route reliably produces something nobody finishes.

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

**Split.** PySceneDetect cuts long takes into discrete clips on content change and emits a timecoded manifest. Note it shipped a breaking release in mid-2026 (timestamp internals reworked, variable frame rate support added) — if you have old scripts, test before upgrading.

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

I grade in DaVinci Resolve; the free version is entirely adequate for one person. Worth knowing: the batch of AI features added over the last two years (script-aligned auto-assembly, searching footage by object or spoken line) are **Studio-only — the free version doesn't have them**. Studio is a one-time purchase and the price hasn't moved in years; once your volume is up, it's one of the better one-off spends available.

Grading order for Log footage: apply a conversion LUT to restore, balance with color wheels, pull saturation down 5–10%, push shadows slightly cyan-green and highlights slightly warm, then add film grain last (20–30% strength, don't max it). On export, turn off any "smooth motion" or frame interpolation option — shot at 24fps, export at 24fps; interpolation erases everything you did to earn that cadence.

I use CapCut for vertical versions and captions, because its auto-caption and templates genuinely are fast. One caution: **its terms grant a very broad license over content uploaded to its cloud.** If you care about rights in your footage, edit and export locally and leave cloud sync off. This matters especially if you handle client footage or unreleased material.

## The four content lines are one persona

This section is about platform angle, but it has to start from positioning, because the angle is a corollary of the positioning.

My initial mistake was treating the four lines as four subjects and hunting for "an angle nobody's covered" within each. That road doesn't go anywhere, because the empty slots in every subject are being filled fast.

The reframe: **the four lines aren't four subjects. They're four exposure levels of one person.**

```
                     one persona
      "one person running a fleet of agents, working from anywhere"
                          │
      ┌────────────┬──────┴───────┬────────────┐
      │            │              │            │
  AI teardowns  screen demos    cafés        hiking
      │            │              │            │
  highest       proof of        texture of   the human part
  information   process         a life       (proof you're real)
  density
      │            │              │            │
  builds        builds          builds       builds
  expertise     credibility     closeness    memorability
```

The middle two are the mainline; the outer two are support. Teardowns establish what you know, screen demos prove you actually built it, cafés and hiking prove that the person saying all this is a specific human being and not an account.

The benefit of this structure: **content on any line tops up the other three.** The screen shot you filmed in a café shows the audience you writing code; a throwaway line in a technical demo — "I rewrote this in a café in Chiang Mai" — feeds the persona line for free. Treat them as four independent subjects and you get four separate cost centers instead.

### The angle: don't crowd into reviews

AI tool reviews are the reddest ocean of 2026, precisely because AI itself has floored the cost of producing them. Anyone can spend two hours and ship "I tried ten AI editing tools."

My judgment: **shift from "how is this tool" to "I actually finished something with it."**

The difference is that the first is replicable information and the second is non-replicable process evidence. AI can generate the first and not the second, because the second requires you to have genuinely spent time failing. And both audiences and algorithms are rapidly getting better at telling whether you actually did the thing.

Three formats I now prioritize:

1. **Full process records.** Not "how to use X" but "I finished Y with X and hit these three specific pits." With real numbers, real error messages, real workarounds.
2. **Costs and ledgers.** "What this stack costs me a month." "Which subscription I cancelled and why." Extremely hard to fabricate, because it requires actual invoices.
3. **Counterintuitive negative conclusions.** "I used this feature for three months and then turned it off." Negative conclusions are naturally scarce, because they require enough long-term use to be willing to state one.

### Platform differences

| Platform | Form | My role for it | Angle |
| --- | --- | --- | --- |
| Bilibili | Long | Home base, full process | Technical depth and complete narrative; the audience tolerates length |
| YouTube | Long + Shorts | English content, long-tail compounding | Search long tail in the English technical audience, plus nomad content |
| Xiaohongshu | Vertical short + photo posts | Lifestyle line and light technical | Search-driven; titles must carry long-tail keywords |
| Douyin | Vertical short | Acquisition, not home base | Strong hook, low information density but a memorable beat |

One point worth emphasizing: **on Xiaohongshu, search now accounts for a large share of traffic, and search traffic converts markedly better than recommendation traffic.** That means titles and tags should be written for keywords, not as copy. "A café in Shenzhen's Longhua where you can sit all afternoon" beats "today's vibe" by a wide margin, because the first one can be found.

Long and short are not two sets of footage. My approach: **make the long one first, then cut shorts out of it.** The reverse doesn't work, because short-form material lacks the context to support a long piece. This has to be decided at capture time — shoot to the long-form standard and the shorts are a free byproduct.

## Automated publishing: what it can honestly do

This is the area where I found the online information least reliable. Plenty of articles read as if you plug in an API and get one-click cross-platform distribution. The reality is a good distance from that.

Here's roughly where things stand as I checked them:

**YouTube is the only one that's friendly to individual developers.** The official Data API offers an upload endpoint, and the quota loosened twice over the past year — first the per-upload quota cost dropped substantially, then uploads were split into their own daily bucket instead of competing with reads and searches for the same pool. For personal automation that's basically enough. (Check Google's quota docs yourself for the current numbers; this area moves.)

**TikTok has an official direct-post endpoint, but the barrier is the audit.** The API supports direct publishing, but you must pass a separate content-posting review; until you do, everything posted through the API is forced to self-only visibility. After approval there are still rate limits (a few calls per minute per token, tens of videos per day per account). Workable for an individual, but budget one to two weeks for review.

**Douyin and Bilibili require a business entity.** Both open platforms have publishing capability, but registration requires a company — a business license, and in Bilibili's case a stamped letter of authorization. There's essentially no path for an individual developer.

**Xiaohongshu has no official publishing channel for ordinary developers.** I checked this one carefully because it contradicts a lot of what's written online. The open platform's public capabilities are mostly commerce and data; on the content side it's mainly read access. Those third-party services advertising a "Xiaohongshu publishing API" work by taking your content and generating a QR code that you still scan with your phone to complete the post in the app — which is itself proof that no pure server-side path exists.

**On browser-automation projects.** There is a set of open-source tools that do multi-platform one-click publishing through simulated login and browser automation. They cover a lot of platforms and they do work. But the risk needs stating plainly: they bypass official authentication, they generally violate both developer and user agreements, and the exposure includes risk-control bans, cookie leakage, and compliance liability under the relevant data laws. **My own choice is not to run them on my main account.** If you do use them, at least don't point them at the account you spent years building — your audience is the one asset actually compounding, and gambling it to save a few minutes of manual upload doesn't price out.

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
         ├──► TikTok    : official API (after audit)
         ├──► Bilibili / Douyin : manual upload, paste
         │                        the copy from manifest
         └──► Xiaohongshu : manual, from the phone
```

The value of this architecture is that **the manual part is compressed into pure mechanical motion.** At publish time I'm not inventing titles, re-cropping aspects, or writing tags — the manifest already has them. What's left is "open app, pick file, paste copy," under two minutes per platform.

One judgment I want to make explicit: **chasing 100% automation here is net negative.** That last manual upload is a forced review window — more than once I've caught a wrong title, a bad cover, or simply decided a piece shouldn't go out at all. Full automation deletes that window. This is one of the few places I keep a human in the loop deliberately, not because the technology can't do it, but because it's worth it.

## Compliance: don't skip this

In 2026, if you make AI-assisted content, labeling rules are a hard constraint, not an option.

**China's Measures for Labeling AI-Generated Synthetic Content took effect on 1 September 2025.** The core requirement is dual labeling: explicit labels (text, audio, or graphic cues the user can clearly perceive — and downloaded or exported files must carry them too) and implicit labels (content attributes, service provider information, and a content ID embedded in file metadata). Coverage spans text, audio, images, video, and virtual scenes — **AI-written copy and AI-generated cover images are in scope, and partial AI use must be labeled too.** Responsibility is three-way: service providers apply labels, app distribution platforms verify them at review, and users must proactively declare and use the platform's labeling function when posting. Deleting, altering, forging, or concealing labels is explicitly prohibited.

In practice that's three things: tick the declaration when you've used AI-generated visuals or voice; don't strip metadata on export; label AI-generated covers the same way.

**Two things on the YouTube side.** First, synthetic content disclosure: content realistic enough to be mistaken for real people, places, or events must be flagged in Studio. Second, the old "repetitious content" policy was renamed and broadened; it now targets mass templated production — mechanical TTS over stock slideshows, word-for-word script reading, stacking with no narrative structure — on a three-strike path from warning to suspension to permanent removal from the partner program.

One widely repeated misconception worth clearing up: **applying an AI disclosure label does not itself affect monetization.** What gets penalized is low-quality mass production, not AI assistance. If the content has original value and isn't an assembly-line copy, using AI doesn't affect eligibility. (Everything I found on this point was secondhand; I couldn't pull the official help-center text, so verify it yourself.)

**On generative video.** My advice is conservative: **don't use it to fabricate real scenes.** Don't generate a café that doesn't exist or a place you've never been. It gets recognized, and once it does, what you lose is credibility across all your content — a cost far larger than the shooting time you saved. The two legitimate uses are abstract transition textures and clearly-presented effects shots.

One fact that must be updated in passing: OpenAI's Sora shut down in the first half of 2026 — web and app first, with an announced end date for the API as well. If you find a tutorial that still lists it in the toolchain, that article is out of date. Which incidentally makes a point: **don't bind a critical stage of your pipeline to a single closed-source service.** The core of mine — ffmpeg, scene detection, transcription, de-silencing — is all local open source. That isn't purism; it's that they won't tell me one morning they're shutting down next month.

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

**Some notes.** I checked tool status, pricing, and platform policy while writing, but this area moves extremely fast — the past year alone brought Sora's shutdown, Topaz ending perpetual licenses in favor of subscription-only, and CapCut's international tiers being restructured upward. Any tutorial written six months ago has stale clauses in it. Verify against vendor sites before committing. Specific numbers on quotas and review rules (YouTube's daily upload ceiling, TikTok's rate limits) came mostly from secondhand sources; the direction is reliable, the exact figures should come from official docs. And on the claim that Xiaohongshu has no general official publishing API — I couldn't get positive confirmation from official documentation and inferred it from indirect evidence. If you have first-hand information to the contrary, I'd like to hear it.
