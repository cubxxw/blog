# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: footnote-preview-contracts.spec.ts >> fine real short-screen Tab >> the existing longest English note keeps native internal Tab off the document scroll chain
- Location: tests/e2e/footnote-preview-contracts.spec.ts:87:7

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 212.1
Received:    212.171875
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to main content":
    - /url: "#main-content"
  - banner [ref=e3]:
    - navigation [ref=e4]:
      - link "cubxxw" [ref=e6] [cursor=pointer]:
        - /url: https://cubxxw.com/
      - generic [ref=e7]:
        - button "Search (Cmd/Ctrl + K)" [ref=e8] [cursor=pointer]
        - button "Toggle theme" [ref=e13] [cursor=pointer]
        - list "Language" [ref=e14]:
          - listitem [ref=e15]:
            - generic "English" [ref=e16]: EN
          - listitem [ref=e17]:
            - text: /
            - link "简体中文" [ref=e18] [cursor=pointer]:
              - /url: /zh/ai-agent/posts/context-engineering-the-new-foundation/
              - text: 中
      - button "Open navigation menu" [ref=e19] [cursor=pointer]
  - main [ref=e21]:
    - article [ref=e23]:
      - generic [ref=e24]:
        - generic [ref=e25]:
          - generic [ref=e26]: Xinwei Xiong
          - generic [ref=e27]: ·
          - generic [ref=e28]: June 22, 2026
        - generic [ref=e29]:
          - generic [ref=e30]: 18 min · 3655 words
          - generic [ref=e31]: ·
          - generic [ref=e32]:
            - text: EN |
            - link "中" [ref=e33] [cursor=pointer]:
              - /url: https://cubxxw.com/zh/ai-agent/posts/context-engineering-the-new-foundation/
      - generic [ref=e34]:
        - generic [ref=e35]:
          - link "Home" [ref=e36] [cursor=pointer]:
            - /url: https://cubxxw.com/
          - text: »
          - link "AI Agent" [ref=e37] [cursor=pointer]:
            - /url: https://cubxxw.com/ai-agent/
        - 'heading "Context Engineering: The New Foundation for AI Agents" [level=1] [ref=e38]'
        - paragraph [ref=e39]: Learn how context engineering improves AI agents through retrieval, compaction, memory, and token budgeting—and why high-signal context beats a larger window.
      - complementary "TL;DR" [ref=e41]:
        - heading "In Brief" [level=2] [ref=e42]
        - list [ref=e44]:
          - listitem [ref=e45]: Prompt engineering is writing one instruction well. Context engineering is deciding, on every inference call, what goes into the whole window, in what order, and what gets evicted. The center of gravity moved from wording to wiring.
          - listitem [ref=e46]: Context is finite, and context rot means recall can worsen as the window grows. The goal is the smallest sufficient set of high-signal tokens, not the largest possible prompt.
          - listitem [ref=e47]: "Two representative frameworks offer complementary views: LangChain’s Write / Select / Compress / Isolate describes actions; Sourcegraph’s Instructions / Retrieval / Memory / Tools describes objects. Neither is an industry standard."
          - listitem [ref=e48]: "Memory and context engineering overlap but are not interchangeable: context engineering curates the present input, while memory also concerns how information persists, evolves, and is retrieved across turns or sessions."
          - listitem [ref=e49]: "My claim: the scarce thing is not the model but the world line—only context can tell an AI who you are, where you are, and what you want. That line deserves to live local-first, in your own hands."
      - figure [ref=e50]:
        - generic [ref=e51]:
          - 'img "A wide schematic of context engineering: the Write / Select / Compress / Isolate pillars feeding an AI, a laptop with notes, and a local-first world line"'
        - paragraph [ref=e52]: "Context engineering: furnishing the model’s room — Write / Select / Compress / Isolate, and the local-first world line between you and the AI."
      - generic [ref=e53]:
        - paragraph [ref=e54]:
          - strong [ref=e55]: Context engineering is the set of strategies for curating, ordering, and evicting the tokens that enter an LLM’s context window on each inference call—system instructions, retrieved documents, conversation history, tool definitions, and memory.
          - text: "The short version is this: prompt engineering optimizes the"
          - emphasis [ref=e56]: wording
          - text: of an instruction; context engineering optimizes the
          - emphasis [ref=e57]: wiring
          - text: of the whole window. Anthropic has articulated this distinction in its engineering guidance, and Karpathy helped popularize the term. The rest of this article takes the emerging discipline apart.
        - blockquote [ref=e58]:
          - text: “
          - paragraph [ref=e59]: “We are not really writing prompts. We are furnishing a room for the model — deciding what gets carried in, where it sits, when it gets moved out. The wording is just a sticky note on the desk. What we are actually doing is the interior work.”
        - paragraph [ref=e60]: "If you had asked me in 2024 “how do I use AI well,” I would most likely have talked to you about prompts: how to phrase instructions, how to set a role, how to give examples. But if you asked me the same question today, my answer would be completely different."
        - paragraph [ref=e61]:
          - text: "Over the past year, engineering practice has increasingly adopted another term:"
          - strong [ref=e62]: context engineering
          - text: . It does not erase prompt engineering; it widens the frame. The center of gravity moves from “how do I write this instruction?” to “how do I decide what the model sees on this inference call?”
        - paragraph [ref=e63]:
          - text: This article wants to do two things. First, with my
          - strong [ref=e64]: Logic Core
          - text: ", take apart this discipline as it forms: what it is, where its boundary with prompt engineering lies, and which design patterns are already running in production. Second, with my"
          - strong [ref=e65]: Sensitivity Core
          - text: ", come back to myself — as someone who treats AI as an environment rather than a tool and stays local-first, why I believe the end of context engineering is a thing I call the"
          - emphasis [ref=e66]: world line
          - text: .
        - separator [ref=e67]
        - 'heading "Draw the boundary first: prompt and context are not the same thing" [level=2] [ref=e68]'
        - paragraph [ref=e69]: The easiest confusion is treating context engineering as “advanced prompt engineering.” They are related, but they are not on the same layer.
        - paragraph [ref=e70]:
          - text: "Anthropic, in its widely cited engineering piece, gives a clean distinction:"
          - strong [ref=e71]: prompt engineering is “methods for writing and organizing LLM instructions,” while context engineering is “the set of strategies for curating and maintaining the optimal set of tokens during LLM inference”
          - text: — a set that includes the system prompt, retrieved documents, conversation history, tool definitions, memory, and everything else that might land in the window but is not a “prompt.”
          - superscript [ref=e72]:
            - link "1" [ref=e73] [cursor=pointer]:
              - /url: "#fn:1"
        - paragraph [ref=e74]:
          - text: "Andrej Karpathy put it more bluntly in his much-shared June 2025 tweet: “+1 for context engineering over prompt engineering… the delicate art and science of filling the context window with just the right information for the next step.”"
          - superscript [ref=e75]:
            - link "2" [ref=e76] [cursor=pointer]:
              - /url: "#fn:2"
        - paragraph [ref=e77]: "And Sourcegraph, in its 2026 practical guide, offered a test I particularly love because it is operational:"
        - blockquote [ref=e78]:
          - text: “
          - paragraph [ref=e79]:
            - text: “If you’re swapping nouns and adjectives, you’re still doing prompt engineering. If you’re changing what data the agent retrieves, in what order, with what re-ranking, and what gets evicted when the context window fills, you’re doing context engineering.”
            - superscript [ref=e80]:
              - link "3" [ref=e81] [cursor=pointer]:
                - /url: "#fn:3"
        - paragraph [ref=e82]:
          - strong [ref=e83]: The center of gravity moved from wording to wiring.
          - text: Of everything I read, that is the line worth keeping. Prompt engineering cares about the literal text; context engineering cares about the plumbing — where data enters, what processing it passes through, how long it stays in the window, and when it gets kicked out.
        - paragraph [ref=e84]: This is not wordplay. When your agent is just a single-turn chatbox, writing one good sentence is almost the entire job. But the moment it has tools, memory, and a retrieval layer, writing the prompt is a small fraction of the whole system; everything else is the context engineering built around it.
        - separator [ref=e85]
        - 'heading "Why “engineering”: context is a finite resource, and it rots" [level=2] [ref=e86]'
        - paragraph [ref=e87]:
          - text: Calling it “engineering” rather than “tricks” has a hard justification. The context window is not a container that is better the larger it gets — it is a
          - strong [ref=e88]: finite resource with diminishing marginal returns
          - text: .
        - paragraph [ref=e89]:
          - text: "Anthropic states it directly: “Context, therefore, must be treated as a finite resource with diminishing marginal returns.” And — “Good context engineering means finding the smallest possible set of high-signal tokens that maximize the likelihood of some desired outcome.”"
          - superscript [ref=e90]:
            - link "1" [ref=e91] [cursor=pointer]:
              - /url: "#fn:1"
        - paragraph [ref=e92]:
          - text: One reason is a phenomenon called
          - strong [ref=e93]: context rot
          - text: ":"
          - strong [ref=e94]: as the number of tokens in a context window grows, a model’s ability to recall information from it can decline.
          - superscript [ref=e95]:
            - link "1" [ref=e96] [cursor=pointer]:
              - /url: "#fn:1"
          - text: Transformer attention forms n² pairwise relationships across n tokens, which Anthropic offers as one possible mechanism—not a complete causal explanation. Training distributions, position encoding, where the evidence appears, the task, and the model itself can all change the result. Chroma’s long-context experiments provide useful empirical evidence, but they are benchmarks rather than a universal law for every production workload.
          - superscript [ref=e97]:
            - link "4" [ref=e98] [cursor=pointer]:
              - /url: "#fn:4"
        - paragraph [ref=e99]:
          - text: "Here is a counterintuitive but crucial detail Anthropic itself stresses:"
          - strong [ref=e100]: minimal does not necessarily mean short.
          - text: What you want is not context cut to the fewest words, but cut to the highest information density — keep the high-signal, drop the low-signal.
        - paragraph [ref=e101]:
          - text: For me, this turns “context is the bottleneck” from a line in my notebook into an engineering question. The limit is not only how capable the model is; it is whether, on
          - emphasis [ref=e102]: this
          - text: inference call, the right evidence reached it. A million tokens of noise can be worth less than a thousand tokens of signal.
        - paragraph [ref=e103]:
          - text: "The small experiment below shows only the capacity relationship: how longer tool results squeeze the remaining room, and where the overflow appears. It is an"
          - strong [ref=e104]: illustrative model
          - text: — it predicts neither answer quality nor real token counts.
        - generic [ref=e105]:
          - generic [ref=e106]:
            - generic [ref=e107]: Interactive figure
            - generic [ref=e108]: Context budget experiment
            - button "Reset" [ref=e109] [cursor=pointer]
          - paragraph [ref=e110]: What happens to the context window when tool results grow?
          - group "Context budget experiment" [ref=e112]:
            - button "Large tool results" [pressed] [ref=e113] [cursor=pointer]
            - button "Compact input" [ref=e114] [cursor=pointer]
            - button "Long conversation" [ref=e115] [cursor=pointer]
          - region [ref=e116]:
            - paragraph [ref=e117]: Large tool results
            - generic [ref=e118]:
              - list [ref=e125]:
                - listitem [ref=e126]:
                  - text: System
                  - generic [ref=e128]: "4"
                - listitem [ref=e129]:
                  - text: History
                  - generic [ref=e131]: "20"
                - listitem [ref=e132]:
                  - text: Tools
                  - generic [ref=e134]: "32"
                - listitem [ref=e135]:
                  - text: Remaining
                  - generic [ref=e137]: "8"
              - paragraph [ref=e138]: Fixed capacity 64 k (illustrative units)
            - generic [ref=e139]:
              - generic [ref=e140]:
                - term [ref=e141]: Used
                - definition [ref=e142]: "56"
              - generic [ref=e143]:
                - term [ref=e144]: Remaining
                - definition [ref=e145]: "8"
              - generic [ref=e146]:
                - term [ref=e147]: Over capacity
                - definition [ref=e148]: "0"
            - paragraph [ref=e149]: "Space is tight: you must decide which history or tool results to keep or remove."
            - generic [ref=e150]:
              - generic [ref=e151]:
                - text: Tool result length：
                - status [ref=e152]: "32"
              - slider "Tool result length：" [ref=e153]: "32"
            - paragraph [ref=e154]
          - group [ref=e155]:
            - generic "▸ View the scenario comparison" [ref=e156] [cursor=pointer]
          - paragraph [ref=e157]: "Observe: once this condition changes, which history or tool results would you keep, and which would you remove?"
          - generic [ref=e158]:
            - paragraph [ref=e159]: Capacity relationships only — this model predicts neither answer quality nor real token counts, and it does not itself compress or remove content.
            - paragraph [ref=e160]: Illustrative data · Model assumptions · Sources
            - list [ref=e161]:
              - listitem [ref=e162]:
                - link "Anthropic — Effective context engineering for AI agents" [ref=e163] [cursor=pointer]:
                  - /url: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
        - separator [ref=e164]
        - heading "Two representative frameworks for the same window" [level=2] [ref=e165]
        - paragraph [ref=e166]:
          - text: Context engineering is still moving quickly, and no standards body has settled on one canonical map. Two
          - strong [ref=e167]: representative and complementary
          - text: "four-part frameworks are nevertheless useful: they are practice-oriented lenses from particular authors and companies, not proof that the field has converged."
        - 'heading "Scheme A (LangChain / Lance Martin): Write / Select / Compress / Isolate" [level=3] [ref=e168]'
        - paragraph [ref=e169]:
          - text: "LangChain’s Lance Martin (who originated this taxonomy) grouped all approaches into four buckets in June 2025:"
          - superscript [ref=e170]:
            - link "5" [ref=e171] [cursor=pointer]:
              - /url: "#fn:5"
          - superscript [ref=e172]:
            - link "6" [ref=e173] [cursor=pointer]:
              - /url: "#fn:6"
        - list [ref=e174]:
          - listitem [ref=e175]:
            - strong [ref=e176]: Write
            - text: — save information
            - strong [ref=e177]: outside
            - text: the context window (drafts, external files, memory).
          - listitem [ref=e178]:
            - strong [ref=e179]: Select
            - text: —
            - strong [ref=e180]: pull
            - text: information
            - strong [ref=e181]: into
            - text: the window when needed.
          - listitem [ref=e182]:
            - strong [ref=e183]: Compress
            - text: — retain only the tokens
            - strong [ref=e184]: required
            - text: to finish the task.
          - listitem [ref=e185]:
            - strong [ref=e186]: Isolate
            - text: —
            - strong [ref=e187]: split up
            - text: the context (e.g. multi-agent, each holding its own slice).
        - 'heading "Scheme B (Sourcegraph): Instructions / Retrieval / Memory / Tools" [level=3] [ref=e188]'
        - paragraph [ref=e189]:
          - text: "Sourcegraph, under an explicit heading “The Four Pillars of Context Engineering,” gives a different cut:"
          - superscript [ref=e190]:
            - link "3" [ref=e191] [cursor=pointer]:
              - /url: "#fn:3"
        - list [ref=e192]:
          - listitem [ref=e193]:
            - strong [ref=e194]: Instructions / system prompt
            - text: — identity, rules, constraints.
          - listitem [ref=e195]:
            - strong [ref=e196]: Retrieval
            - text: — RAG, vector, SQL, file, just-in-time retrieval.
          - listitem [ref=e197]:
            - strong [ref=e198]: Memory
            - text: — short-term (conversation + tool results) plus long-term (preferences, conventions, summaries).
          - listitem [ref=e199]:
            - strong [ref=e200]: Tools
            - text: — the capabilities the agent can call.
        - paragraph [ref=e201]:
          - text: "These two are not competitors. They cut the same ground from two axes:"
          - strong [ref=e202]: what action you take
          - text: (Write / Select / Compress / Isolate) and
          - strong [ref=e203]: what object you manage
          - text: (Instructions / Retrieval / Memory / Tools). Cross them — “Compress the Memory,” “Select for Retrieval” — and you roughly hold the whole map of context engineering.
        - blockquote [ref=e204]:
          - text: “
          - paragraph [ref=e205]:
            - text: "One honest caveat: these two are compatible and mutually reinforcing, but they are"
            - strong [ref=e206]: not the same set of labels
            - text: . Anyone who flattens them into “one four-pillar model” is being lazy. I prefer to treat them as two projections, lighting the same solid from different angles.
        - separator [ref=e207]
        - 'heading "Down to the ground: patterns already in production" [level=2] [ref=e208]'
        - paragraph [ref=e209]:
          - text: Beyond the abstract frameworks, what genuinely excites me is that this year the design patterns of context engineering moved from “war stories” to
          - strong [ref=e210]: first-party API primitives
          - text: and
          - strong [ref=e211]: reproducible engineering practice
          - text: .
        - 'heading "Retrieve, then re-rank: the lesson behind 50 → top-5" [level=3] [ref=e212]'
        - paragraph [ref=e213]:
          - text: "Sourcegraph uses a concrete illustration: retrieve 50 high-recall candidates, then re-rank them to a precise top five instead of dumping all 50 chunks into the prompt."
          - strong [ref=e214]: Those numbers are an example, not universal tuning advice.
          - text: "In a real system, candidate count and top-k should be chosen against recall, latency, cost, and offline evaluation. The durable idea is a two-stage pipeline: miss as little as possible, then use a cross-encoder or cheaper model to pass only the highest-signal evidence into the window."
          - superscript [ref=e215]:
            - link "3" [ref=e216] [cursor=pointer]:
              - /url: "#fn:3"
        - paragraph [ref=e217]:
          - text: "This is the engineering antidote to context rot:"
          - strong [ref=e218]: few and precise beats many and blurry.
        - heading "Cut before it enters the window, not regret after" [level=3] [ref=e219]
        - paragraph [ref=e220]:
          - text: Sourcegraph defines token-budget management as “the discipline of cutting low-signal content
          - emphasis [ref=e221]: before
          - text: "it enters the context window, not after.” Concrete moves: truncating tool outputs, compacting old conversation into a running summary, dropping chunks below a relevance threshold, hard-capping the re-ranker."
          - superscript [ref=e222]:
            - link "3" [ref=e223] [cursor=pointer]:
              - /url: "#fn:3"
        - 'heading "Summarization-based compaction: Claude Code closes the loop" [level=3] [ref=e224]'
        - paragraph [ref=e225]:
          - text: "Claude Code provides an intuitive example: auto-compact is enabled by default and summarizes older conversation history as the window fills. The current documentation describes the behavior and exposes configuration such as"
          - code [ref=e226]: CLAUDE_AUTOCOMPACT_PCT_OVERRIDE
          - text: and
          - code [ref=e227]: CLAUDE_CODE_AUTO_COMPACT_WINDOW
          - text: ; it does not justify treating one percentage as a permanent product guarantee. Models, context sizes, and releases can all move the practical boundary.
          - superscript [ref=e228]:
            - link "7" [ref=e229] [cursor=pointer]:
              - /url: "#fn:7"
          - superscript [ref=e230]:
            - link "8" [ref=e231] [cursor=pointer]:
              - /url: "#fn:8"
        - heading "Anthropic brought three distinct strategies into the API" [level=3] [ref=e232]
        - paragraph [ref=e233]:
          - text: "This is the step with the most signal value: context management is no longer only a script you hand-roll; it is also a platform capability. Anthropic currently documents three first-party strategies for distinct bottlenecks:"
          - superscript [ref=e234]:
            - link "9" [ref=e235] [cursor=pointer]:
              - /url: "#fn:9"
          - superscript [ref=e236]:
            - link "10" [ref=e237] [cursor=pointer]:
              - /url: "#fn:10"
          - superscript [ref=e238]:
            - link "11" [ref=e239] [cursor=pointer]:
              - /url: "#fn:11"
        - list [ref=e240]:
          - listitem [ref=e241]:
            - strong [ref=e242]:
              - text: Server-side compaction (
              - code [ref=e243]: compact_20260112
              - text: )
            - text: summarizes older conversation history at a configurable token threshold and returns a typed compaction block.
          - listitem [ref=e244]:
            - strong [ref=e245]: Server-side context editing
            - text: ", including tool-result clearing ("
            - code [ref=e246]: clear_tool_uses_20250919
            - text: ), selectively removes stale, re-fetchable material before the request reaches the model.
          - listitem [ref=e247]:
            - strong [ref=e248]:
              - text: The memory tool (
              - code [ref=e249]: memory_20250818
              - text: )
            - text: gives the model a protocol for writing to persistent storage
            - strong [ref=e250]: outside
            - text: the window so information can survive across sessions.
        - paragraph [ref=e251]:
          - text: "The Memory tool’s design philosophy suits me well: it is"
          - strong [ref=e252]: client-implemented
          - text: . The API provides the protocol, while
          - strong [ref=e253]: where and how data is stored remains the client’s responsibility; the model decides when and what to save.
          - text: This separates
          - emphasis [ref=e254]: what to remember
          - text: from
          - emphasis [ref=e255]: how to persist it
          - text: .
          - superscript [ref=e256]:
            - link "9" [ref=e257] [cursor=pointer]:
              - /url: "#fn:9"
        - paragraph [ref=e258]:
          - text: There is a second distinction worth keeping current. Client-side SDK compaction remains available through
          - code [ref=e259]: tool_runner
          - text: ", but Anthropic now recommends server-side compaction for most long-running conversations. The Python, TypeScript, and Ruby SDKs mark"
          - code [ref=e260]: compaction_control
          - text: as deprecated. Tool-result clearing and thinking-block clearing remain fine-grained server-side context-editing strategies.
          - superscript [ref=e261]:
            - link "10" [ref=e262] [cursor=pointer]:
              - /url: "#fn:10"
          - text: These identifiers and recommendations are dated; examples are not eternal truth.
        - 'heading "KV-cache hit rate: the underrated lifeline in production" [level=3] [ref=e263]'
        - paragraph [ref=e264]:
          - text: If the patterns above are the art of
          - emphasis [ref=e265]: assembling
          - text: context, the Manus team’s build postmortem is about the
          - emphasis [ref=e266]: economics
          - text: "of context engineering in production. Co-founder Yichao “Peak” Ji states it plainly:"
          - strong [ref=e267]: “the KV-cache hit rate is the single most important metric for a production-stage AI agent… It directly affects both latency and cost.”
          - superscript [ref=e268]:
            - link "12" [expanded] [ref=e269] [cursor=pointer]:
              - /url: "#fn:12"
        - paragraph [ref=e270]:
          - text: "Why does it matter? Because “even a single-token difference can invalidate the cache from that token onward.” The classic anti-pattern:"
          - strong [ref=e271]: putting a timestamp in the system prompt
          - text: — it changes every second, so the cache never hits.
        - paragraph [ref=e272]:
          - text: "From this comes their principle “Mask, Don’t Remove”: tool definitions sit near the front of the context, so any dynamic add/remove of the tool list invalidates the KV-cache. Their fix is not to add or remove tools mid-iteration, but to"
          - strong [ref=e273]: mask token logits directly
          - text: to constrain which action the model can select — preserving the cache while avoiding schema violations.
          - superscript [ref=e274]:
            - link "12" [ref=e275] [cursor=pointer]:
              - /url: "#fn:12"
        - paragraph [ref=e276]:
          - text: "And one design I especially love, almost philosophical:"
          - strong [ref=e277]: the file system as the ultimate context
          - text: — “unlimited in size, persistent by nature.” Compression is always designed to be
          - strong [ref=e278]: restorable
          - text: ": a web page’s content can be dropped from the context"
          - strong [ref=e279]: as long as the URL is preserved.
          - superscript [ref=e280]:
            - link "12" [ref=e281] [cursor=pointer]:
              - /url: "#fn:12"
        - blockquote [ref=e282]:
          - text: “
          - paragraph [ref=e283]:
            - text: This “restorable compression” deserves to be pulled out on its own. It is not deleting information — it is
            - strong [ref=e284]: leaving information a way home
            - text: ". It is isomorphic to how I take notes: the body can be folded, can be summarized, but the link and the source always stay — at any moment you can follow the thread and pull the whole thing back."
        - separator [ref=e285]
        - 'heading "Bring in the vendors: when the “context layer” becomes a product" [level=2] [ref=e286]'
        - paragraph [ref=e287]:
          - text: "If the above is context engineering at the personal/engineering scale, 2026 has a larger line too:"
          - strong [ref=e288]: vendors are starting to sell the “context layer” as a product of its own.
        - paragraph [ref=e289]:
          - text: One documented example is Databricks’
          - strong [ref=e290]: Genie Ontology
          - text: . Databricks presents it as an automatic context layer that
          - strong [ref=e291]: extracts snippets of knowledge
          - text: from tables, queries, dashboards, pipelines, and connected apps, then organizes them into “a living graph of how a company works and what the data inside actually means.”
          - superscript [ref=e292]:
            - link "13" [ref=e293] [cursor=pointer]:
              - /url: "#fn:13"
        - paragraph [ref=e294]:
          - text: "Its thesis is almost the enterprise version of my “context is the bottleneck”:"
          - strong [ref=e295]: the real bottleneck is not the base model, it is the scattered, inaccessible business context.
          - text: Databricks’ own words — business context is “scattered across dashboards, queries, pipelines, wikis, tickets, documents, and chat threads”; and “when AI doesn’t easily find the information it needs, it fills in the gaps with inference, producing answers that are generic at best and wrong at worst.”
          - superscript [ref=e296]:
            - link "13" [ref=e297] [cursor=pointer]:
              - /url: "#fn:13"
        - blockquote [ref=e298]:
          - text: “
          - paragraph [ref=e299]:
            - text: "⚠️ Here I have to be honest with you, and with myself: this Databricks piece is"
            - strong [ref=e300]: vendor product marketing
            - text: ", to be cited as Databricks’"
            - emphasis [ref=e301]: framing/positioning
            - text: ", not as independent proof. The 84.5% vs 52.4% comparison benchmark in the original post was"
            - strong [ref=e302]: refuted
            - text: "in my fact-check, so I will not cite a single one of those numbers — the positioning is fair to cite, the benchmark is not. This is itself a meta-discipline of context engineering:"
            - strong [ref=e303]: every piece of information entering your argument window should first pass the check “is its source good enough for this conclusion?”
        - separator [ref=e304]
        - 'heading "Context vs memory: a window, and the river beyond it" [level=2] [ref=e305]'
        - paragraph [ref=e306]:
          - text: "Here we must clarify a relationship that is often flattened:"
          - strong [ref=e307]: memory and context engineering overlap, but they are not interchangeable.
          - text: External memory must be retrieved, selected, and often compressed before it enters the current context; experiences in the current context may later be distilled into memory.
        - paragraph [ref=e308]:
          - text: A survey submitted in December 2025 and revised in January 2026,
          - emphasis [ref=e309]: Memory in the Age of AI Agents
          - text: (arXiv 2512.13564), distinguishes agent memory from related concepts including LLM memory, RAG, and context engineering. It organizes memory by form, function, and dynamics, and argues that memory deserves treatment as a
          - strong [ref=e310]: first-class primitive
          - text: in agent design.
          - superscript [ref=e311]:
            - link "14" [ref=e312] [cursor=pointer]:
              - /url: "#fn:14"
        - paragraph [ref=e313]:
          - text: The paper does
          - strong [ref=e314]: not
          - text: "support the tidy quotation often attributed to it—“RAG accesses knowledge, context engineering optimizes the immediate window, memory provides persistent identity”—so I will not put those words in the authors’ mouths. What it does support is a more useful point: the concepts are related but should not be collapsed. Agent memory also asks what form information takes, what function it serves, and how it is formed, updated, and retrieved over time."
          - superscript [ref=e315]:
            - link "14" [ref=e316] [cursor=pointer]:
              - /url: "#fn:14"
        - paragraph [ref=e317]:
          - text: "My own image is simpler:"
          - strong [ref=e318]: context engineering arranges what sits in this window now; memory tends the river that continues beyond it.
          - text: The window is cleared and rearranged. The river keeps the possibility of continuity.
        - paragraph [ref=e319]:
          - text: "In the open-source world, Mem0 (arXiv 2504.19413) is a concrete reference point: it is a memory-centric architecture that"
          - strong [ref=e320]: dynamically extracts, consolidates, and retrieves
          - text: salient information from ongoing conversations, precisely to address the fundamental difficulty that “LLMs’ fixed context windows cannot maintain consistency over prolonged multi-session dialogues.”
          - superscript [ref=e321]:
            - link "15" [ref=e322] [cursor=pointer]:
              - /url: "#fn:15"
          - text: "(I deliberately did not cite Mem0’s self-reported benchmark numbers — same discipline: treat unverified numbers with care.)"
        - paragraph [ref=e323]:
          - text: Last year I wrote a
          - link "technical analysis of Mem0" [ref=e324] [cursor=pointer]:
            - /url: /projects/mem0/
          - text: ". Looking back, that piece asked how memory is stored; this one asks how memory and context meet inside an agent. My answer is still a metaphor, not a standard definition:"
          - strong [ref=e325]: context engineering is the art of space; memory is the art of time.
          - text: A continuous agent needs both.
        - separator [ref=e326]
        - 'heading "My claim: the end of context is a “world line”" [level=2] [ref=e327]'
        - paragraph [ref=e328]:
          - text: The previous six sections are the part my Logic Core can verify. In this one I switch to the
          - strong [ref=e329]: Sensitivity Core
          - text: and say things a fact-check cannot underwrite for me, but which I am increasingly sure of. Please read it as
          - emphasis [ref=e330]: my opinion
          - text: ", not as"
          - emphasis [ref=e331]: verified fact
          - text: — and that very distinction is something context engineering taught me.
        - paragraph [ref=e332]:
          - text: "I keep saying one thing:"
          - strong [ref=e333]: AI is not a tool, it is an environment.
          - text: A tool is something you put down after use; an environment is something you are inside of, that perceives you continuously too. And what decides whether AI is a “tool” or an “environment” is exactly the context —
          - strong [ref=e334]: whether it knows your world line.
        - paragraph [ref=e335]:
          - text: "“World line” is a term I borrowed: who you are, where you are right now, what you have done, where you are going, what you care about, what you must not touch. The way we use AI today essentially"
          - strong [ref=e336]: compresses the world line into a prompt every single time
          - text: ", like calling an API: manually packing intent, background, constraints and format and stuffing them in. This is hugely energy-expensive and unsustainable — you cannot re-introduce yourself at the start of every conversation."
        - paragraph [ref=e337]: "The discipline of context engineering is, at bottom, answering “how does the world line get in.” And I believe the real answer is not in some vendor’s cloud “context layer,” but in a place closer to you:"
        - paragraph [ref=e338]:
          - strong [ref=e339]: This line should live local-first, in your own hands.
        - paragraph [ref=e340]: "There are three layers of reasons, mapping neatly onto my dual-core way of judging:"
        - list [ref=e341]:
          - listitem [ref=e342]:
            - paragraph [ref=e343]:
              - strong [ref=e344]: Logic Core (economics and control)
              - text: ": context is your most intimate data — the questions you have asked, the problems you face, the ideas you explore. Storing it by default with a third party is outsourcing ownership of your world line. And Anthropic’s client-implemented Memory tool points exactly to another possibility:"
              - strong [ref=e345]: the model decides what to save, but where and how to store it is up to you.
              - text: That is a local-first-flavored primitive — proof that “keeping context local” is engineering-feasible.
          - listitem [ref=e346]:
            - paragraph [ref=e347]:
              - strong [ref=e348]: Sensitivity Core (trust and intimacy)
              - text: ": a local Markdown memory that only you can read, versus an implicit cloud memory you cannot see — which one deserves more trust? For someone like me who moves between nine countries, with unstable networks and a sensitivity to privacy, local-first was never tech purism, it is a"
              - strong [ref=e349]: way of surviving
              - text: . My world line should not be dreamed up for me somewhere I cannot see.
          - listitem [ref=e350]:
            - paragraph [ref=e351]:
              - strong [ref=e352]: The tension (control vs generativity)
              - text: ": here is a tension I will not resolve. If I structure the entire world line, make it all local — won’t I fall back into the very trap I warn myself about,"
              - emphasis [ref=e353]: using systematization to escape real experience
              - text: "? Yes. So my position is not “total control,” it is “"
              - strong [ref=e354]: use order to protect freedom
              - text: "”: context engineering wires up the high-signal, reusable part; everything that cannot be systematized, that belongs to the present moment, is left to simply happen."
        - paragraph [ref=e355]:
          - text: "Finally, back to a distinction I always use:"
          - strong [ref=e356]: stimulative desire
          - text: vs
          - strong [ref=e357]: generative desire
          - text: ". Chasing a larger context window, longer tokens, more tools — that is stimulative: never enough, hungrier the more you feed it. But treating context engineering as a craft that lets"
          - strong [ref=e358]: AI genuinely grow into your life and evolve alongside you
          - text: "— that is generative: each time you wire the world line a little more precisely, what you get is not a one-off hit, but a structural, self-reinforcing internal reward."
        - blockquote [ref=e359]:
          - text: “
          - paragraph [ref=e360]:
            - text: "Prompt engineering taught us how to say one sentence clearly. Context engineering will teach us something harder and more important:"
            - strong [ref=e361]: how to let a system continuously know who we are.
          - paragraph [ref=e362]: And the home of that thing should not be a smarter model. It should be a line that lives in your own machine — one you can always read, and always pull back — your world line.
        - separator [ref=e363]
        - 'heading "Appendix: this article’s fact discipline" [level=2] [ref=e364]'
        - paragraph [ref=e365]: "While writing this, I applied the article’s own discipline to its evidence: technical claims had to stay within what the cited sources could actually support. Two claims failed that check and are therefore not used as evidence:"
        - list [ref=e366]:
          - listitem [ref=e367]: The Databricks “Genie + Ontology 84.5% vs 52.4% vs 25%” benchmark — failed verification, not cited.
          - listitem [ref=e368]:
            - text: “Multi-agent context isolation outperforms single-agent” — failed verification, treated only as a
            - strong [ref=e369]: pattern
            - text: ", not a proven win."
        - paragraph [ref=e370]:
          - text: Beyond that, OpenAI’s “Dreaming,” memory systems like SaliMory, and the specific controversy around MCP as a “context protocol” produced no independently verifiable sources this round, so this article
          - strong [ref=e371]: intentionally does not elaborate
          - text: on their details. Laying that out plainly is the simplest demonstration of “context quality” I can give you.
        - separator [ref=e372]
        - generic [ref=e373]:
          - separator [ref=e374]
          - list [ref=e375]:
            - listitem [ref=e376]:
              - paragraph [ref=e377]:
                - text: Anthropic, “Effective context engineering for AI agents.”
                - link "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents" [ref=e378] [cursor=pointer]:
                  - /url: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
                - link "↩︎" [ref=e379] [cursor=pointer]:
                  - /url: "#fnref:1"
                - link "↩︎" [ref=e380] [cursor=pointer]:
                  - /url: "#fnref1:1"
                - link "↩︎" [ref=e381] [cursor=pointer]:
                  - /url: "#fnref2:1"
            - listitem [ref=e382]:
              - paragraph [ref=e383]:
                - text: Andrej Karpathy, X (Twitter), 2025-06.
                - link "https://x.com/karpathy/status/1937902205765607626" [ref=e384] [cursor=pointer]:
                  - /url: https://x.com/karpathy/status/1937902205765607626
                - link "↩︎" [ref=e385] [cursor=pointer]:
                  - /url: "#fnref:2"
            - listitem [ref=e386]:
              - paragraph [ref=e387]:
                - text: "Sourcegraph, “Context Engineering: A Practical Guide for AI Agents (2026).”"
                - link "https://sourcegraph.com/blog/context-engineering" [ref=e388] [cursor=pointer]:
                  - /url: https://sourcegraph.com/blog/context-engineering
                - link "↩︎" [ref=e389] [cursor=pointer]:
                  - /url: "#fnref:3"
                - link "↩︎" [ref=e390] [cursor=pointer]:
                  - /url: "#fnref1:3"
                - link "↩︎" [ref=e391] [cursor=pointer]:
                  - /url: "#fnref2:3"
                - link "↩︎" [ref=e392] [cursor=pointer]:
                  - /url: "#fnref3:3"
            - listitem [ref=e393]:
              - paragraph [ref=e394]:
                - text: Chroma Research, “Context Rot.”
                - link "https://www.chroma.research/context-rot" [ref=e395] [cursor=pointer]:
                  - /url: https://www.chroma.research/context-rot
                - link "↩︎" [ref=e396] [cursor=pointer]:
                  - /url: "#fnref:4"
            - listitem [ref=e397]:
              - paragraph [ref=e398]:
                - text: LangChain, “Context Engineering for Agents.”
                - link "https://www.langchain.com/blog/context-engineering-for-agents" [ref=e399] [cursor=pointer]:
                  - /url: https://www.langchain.com/blog/context-engineering-for-agents
                - link "↩︎" [ref=e400] [cursor=pointer]:
                  - /url: "#fnref:5"
            - listitem [ref=e401]:
              - paragraph [ref=e402]:
                - text: Lance Martin, “Context Engineering,” 2025-06-23.
                - link "https://rlancemartin.github.io/2025/06/23/context_engineering/" [ref=e403] [cursor=pointer]:
                  - /url: https://rlancemartin.github.io/2025/06/23/context_engineering/
                - link "↩︎" [ref=e404] [cursor=pointer]:
                  - /url: "#fnref:6"
            - listitem [ref=e405]:
              - paragraph [ref=e406]:
                - text: Claude Code Docs, “Environment variables.”
                - link "https://code.claude.com/docs/en/env-vars" [ref=e407] [cursor=pointer]:
                  - /url: https://code.claude.com/docs/en/env-vars
                - link "↩︎" [ref=e408] [cursor=pointer]:
                  - /url: "#fnref:7"
            - listitem [ref=e409]:
              - paragraph [ref=e410]:
                - text: Claude Code Docs, “Explore the context window.”
                - link "https://code.claude.com/docs/en/context-window" [ref=e411] [cursor=pointer]:
                  - /url: https://code.claude.com/docs/en/context-window
                - link "↩︎" [ref=e412] [cursor=pointer]:
                  - /url: "#fnref:8"
            - listitem [ref=e413]:
              - paragraph [ref=e414]:
                - text: Anthropic Claude Cookbook, “Context engineering with tools.”
                - link "https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools" [ref=e415] [cursor=pointer]:
                  - /url: https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools
                - link "↩︎" [ref=e416] [cursor=pointer]:
                  - /url: "#fnref:9"
                - link "↩︎" [ref=e417] [cursor=pointer]:
                  - /url: "#fnref1:9"
            - listitem [ref=e418]:
              - paragraph [ref=e419]:
                - text: Anthropic Docs, “Context editing.”
                - link "https://platform.claude.com/docs/en/build-with-claude/context-editing" [ref=e420] [cursor=pointer]:
                  - /url: https://platform.claude.com/docs/en/build-with-claude/context-editing
                - link "↩︎" [ref=e421] [cursor=pointer]:
                  - /url: "#fnref:10"
                - link "↩︎" [ref=e422] [cursor=pointer]:
                  - /url: "#fnref1:10"
            - listitem [ref=e423]:
              - paragraph [ref=e424]:
                - text: Anthropic Docs, “Compaction.”
                - link "https://platform.claude.com/docs/en/build-with-claude/compaction" [ref=e425] [cursor=pointer]:
                  - /url: https://platform.claude.com/docs/en/build-with-claude/compaction
                - link "↩︎" [ref=e426] [cursor=pointer]:
                  - /url: "#fnref:11"
            - listitem [ref=e427]:
              - paragraph [ref=e428]:
                - text: "Manus, “Context Engineering for AI Agents: Lessons from Building Manus.”"
                - link "https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus" [ref=e429] [cursor=pointer]:
                  - /url: https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus
                - link "↩︎" [ref=e430] [cursor=pointer]:
                  - /url: "#fnref:12"
                - link "↩︎" [ref=e431] [cursor=pointer]:
                  - /url: "#fnref1:12"
                - link "↩︎" [ref=e432] [cursor=pointer]:
                  - /url: "#fnref2:12"
            - listitem [ref=e433]:
              - paragraph [ref=e434]:
                - text: Databricks, “Introducing Genie One, Genie Ontology, and Genie Agents.”
                - link "https://www.databricks.com/blog/introducing-genie-one-genie-ontology-and-genie-agents" [ref=e435] [cursor=pointer]:
                  - /url: https://www.databricks.com/blog/introducing-genie-one-genie-ontology-and-genie-agents
                - link "↩︎" [ref=e436] [cursor=pointer]:
                  - /url: "#fnref:13"
                - link "↩︎" [ref=e437] [cursor=pointer]:
                  - /url: "#fnref1:13"
            - listitem [ref=e438]:
              - paragraph [ref=e439]:
                - text: “Memory in the Age of AI Agents,” arXiv:2512.13564.
                - link "https://arxiv.org/pdf/2512.13564" [ref=e440] [cursor=pointer]:
                  - /url: https://arxiv.org/pdf/2512.13564
                - link "↩︎" [ref=e441] [cursor=pointer]:
                  - /url: "#fnref:14"
                - link "↩︎" [ref=e442] [cursor=pointer]:
                  - /url: "#fnref1:14"
            - listitem [ref=e443]:
              - paragraph [ref=e444]:
                - text: "“Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory,” arXiv:2504.19413."
                - link "https://arxiv.org/abs/2504.19413" [ref=e445] [cursor=pointer]:
                  - /url: https://arxiv.org/abs/2504.19413
                - link "↩︎" [ref=e446] [cursor=pointer]:
                  - /url: "#fnref:15"
      - region [ref=e447]:
        - generic [ref=e448]:
          - heading "Frequently Asked Questions" [level=2] [ref=e449]
          - generic [ref=e450]: "04"
        - generic [ref=e451]:
          - group [ref=e452]:
            - generic "What is context engineering?" [ref=e453] [cursor=pointer]
            - generic [ref=e456]:
              - paragraph [ref=e457]: Context engineering is the set of strategies for curating and maintaining the most useful tokens that enter an LLM's context window on every inference call—the system prompt, retrieved documents, conversation history, tool definitions, and memory. Anthropic has articulated this distinction in its engineering guidance, and Karpathy helped popularize the broader term.
              - button "Keep asking the AI about this" [ref=e459] [cursor=pointer]
          - group [ref=e465]:
            - generic "How is context engineering different from prompt engineering?" [ref=e466] [cursor=pointer]
          - group [ref=e469]:
            - generic "What is context rot?" [ref=e470] [cursor=pointer]
          - group [ref=e473]:
            - generic "What are the main frameworks for context engineering?" [ref=e474] [cursor=pointer]
      - 'complementary "Column navigation: Agent Engineering" [ref=e477]':
        - generic [ref=e479]:
          - generic [ref=e480]: Column
          - link "Agent Engineering" [ref=e481] [cursor=pointer]:
            - /url: /columns/agent-engineering/
          - generic [ref=e482]: Part 7 of 9
        - 'link "Read next Agent Engineering Harness: The Eight Pillars Behind the 98.4% 08 / 09 · 20 min" [ref=e483] [cursor=pointer]':
          - /url: /ai-agent/posts/agent-engineering-the-98-percent-harness/
          - generic [ref=e484]: Read next
          - generic [ref=e485]: "Agent Engineering Harness: The Eight Pillars Behind the 98.4%"
          - generic [ref=e486]:
            - generic [ref=e487]: 08 / 09
            - generic [ref=e488]: ·
            - generic [ref=e489]: 20 min
        - list [ref=e492]:
          - listitem [ref=e493]:
            - generic [aria-hidden] [ref=e494]: "01"
            - 'link "Claude Tag Deep Dive: From Shared Slack AI to an Organizational Agent Runtime" [ref=e495] [cursor=pointer]':
              - /url: /ai-agent/posts/claude-tag-organizational-agent-runtime/
          - listitem [ref=e496]:
            - generic [aria-hidden] [ref=e497]: "02"
            - 'link "Open Design 0.16.1: A Design Harness for Coding Agents" [ref=e498] [cursor=pointer]':
              - /url: /ai-agent/posts/open-design/
          - listitem [ref=e499]:
            - generic [aria-hidden] [ref=e500]: "03"
            - 'link "Designing devbox-doctor: A Safer Mac Toolchain Audit" [ref=e501] [cursor=pointer]':
              - /url: /ai-agent/posts/devbox-doctor-design/
          - listitem [ref=e502]:
            - generic [aria-hidden] [ref=e503]: "04"
            - 'link "Agent Skill Design: What a Dangerous SKILL.md Taught Me" [ref=e504] [cursor=pointer]':
              - /url: /ai-agent/posts/designing-valuable-agent-skills/
          - listitem [ref=e505]:
            - generic [aria-hidden] [ref=e506]: "05"
            - 'link "Inside open-lovable: Search, Text Protocols, and Sandboxes" [ref=e507] [cursor=pointer]':
              - /url: /ai-agent/posts/dissecting-open-lovable/
          - listitem [ref=e508]:
            - generic [aria-hidden] [ref=e509]: "06"
            - 'link "Relay Agent Architecture in 2026: A Local Implementation Audit" [ref=e510] [cursor=pointer]':
              - /url: /ai-agent/posts/relay-agent-architecture-design/
          - listitem [ref=e511]:
            - generic [aria-hidden] [ref=e512]: "07"
            - generic [ref=e513]:
              - text: "Context Engineering: The New Foundation for AI Agents"
              - generic [ref=e514]: You are here
          - listitem [ref=e515]:
            - generic [aria-hidden] [ref=e516]: "08"
            - 'link "Agent Engineering Harness: The Eight Pillars Behind the 98.4%" [ref=e517] [cursor=pointer]':
              - /url: /ai-agent/posts/agent-engineering-the-98-percent-harness/
          - listitem [ref=e518]:
            - generic [aria-hidden] [ref=e519]: "09"
            - 'link "Agent Identity: From Locke to OpenClaw" [ref=e520] [cursor=pointer]':
              - /url: /ai-agent/posts/agent-identity-from-locke-to-openclaw/
      - generic [ref=e521]:
        - list [ref=e522]:
          - listitem [ref=e523]:
            - link "Context Engineering" [ref=e524] [cursor=pointer]:
              - /url: https://cubxxw.com/tags/context-engineering/
          - listitem [ref=e525]:
            - link "AI" [ref=e526] [cursor=pointer]:
              - /url: https://cubxxw.com/tags/ai/
          - listitem [ref=e527]:
            - link "LLM" [ref=e528] [cursor=pointer]:
              - /url: https://cubxxw.com/tags/llm/
          - listitem [ref=e529]:
            - link "Agent" [ref=e530] [cursor=pointer]:
              - /url: https://cubxxw.com/tags/agent/
          - listitem [ref=e531]:
            - link "MCP" [ref=e532] [cursor=pointer]:
              - /url: https://cubxxw.com/tags/mcp/
        - navigation "Article navigation" [ref=e533]:
          - 'link "Previous Relay Agent Architecture in 2026: A Local Implementation Audit" [ref=e534] [cursor=pointer]':
            - /url: https://cubxxw.com/ai-agent/posts/relay-agent-architecture-design/
            - generic [ref=e535]: Previous
            - generic [ref=e538]: "Relay Agent Architecture in 2026: A Local Implementation Audit"
          - 'link "Next Agent Engineering Harness: The Eight Pillars Behind the 98.4%" [ref=e539] [cursor=pointer]':
            - /url: https://cubxxw.com/ai-agent/posts/agent-engineering-the-98-percent-harness/
            - generic [ref=e540]: Next
            - generic [ref=e543]: "Agent Engineering Harness: The Eight Pillars Behind the 98.4%"
        - generic [ref=e544]:
          - generic [ref=e545]: Share this article
          - generic [ref=e547]:
            - button "Create article card" [ref=e548] [cursor=pointer]:
              - generic [ref=e549]: Share card
            - button "Copy link" [ref=e550] [cursor=pointer]
            - button "分享到微信" [ref=e554] [cursor=pointer]
            - link "分享到 X / Twitter" [ref=e557] [cursor=pointer]:
              - /url: https://x.com/intent/tweet/?text=Context+Engineering%3A+The+New+Foundation+for+AI+Agents+%E2%80%94+Learn+how+context+engineering+improves+AI+agents+through+retrieval%2C+compaction%2C+memory%2C+and+token+budgeting%E2%80%94and+why%E2%80%A6&url=https%3a%2f%2fcubxxw.com%2fai-agent%2fposts%2fcontext-engineering-the-new-foundation%2f&hashtags=ContextEngineering%2cAI%2cLLM%2cAgent%2cMCP
            - link "通过邮件分享" [ref=e560] [cursor=pointer]:
              - /url: mailto:?subject=Context+Engineering%3A+The+New+Foundation+for+AI+Agents&body=Context+Engineering%3A+The+New+Foundation+for+AI+Agents%0A%0ALearn+how+context+engineering+improves+AI+agents+through+retrieval%2C+compaction%2C+memory%2C+and+token+budgeting%E2%80%94and+why%E2%80%A6%0A%0Ahttps%3A%2F%2Fcubxxw.com%2Fai-agent%2Fposts%2Fcontext-engineering-the-new-foundation%2F%0A%0ATopics%3A+AI+Agent%0ATags%3A+Context+Engineering%2C+AI%2C+LLM%2C+Agent%2C+MCP
            - link "分享到 LinkedIn" [ref=e564] [cursor=pointer]:
              - /url: https://www.linkedin.com/shareArticle?mini=true&url=https%3a%2f%2fcubxxw.com%2fai-agent%2fposts%2fcontext-engineering-the-new-foundation%2f&title=Context+Engineering%3A+The+New+Foundation+for+AI+Agents&summary=Learn+how+context+engineering+improves+AI+agents+through+retrieval%2C+compaction%2C+memory%2C+and+token+budgeting%E2%80%94and+why%E2%80%A6&source=https%3a%2f%2fcubxxw.com%2fai-agent%2fposts%2fcontext-engineering-the-new-foundation%2f
            - button "Share" [ref=e569] [cursor=pointer]
            - button "More" [ref=e576] [cursor=pointer]
        - dialog [aria-hidden] [ref=e581]:
          - generic [ref=e583]: Share to
      - region "Responses" [ref=e584]:
        - generic [ref=e585]:
          - heading "Responses" [level=3] [ref=e586]
          - generic [ref=e587]:
            - generic [ref=e588]: —
            - generic [ref=e589]: Join the Dialogue
    - button "Contents" [ref=e591] [cursor=pointer]
    - dialog [aria-hidden] [ref=e592]:
      - tablist [ref=e594]:
        - tab [selected] [ref=e595] [cursor=pointer]:
          - generic [ref=e597]: Contents
        - tab [ref=e598] [cursor=pointer]:
          - generic [ref=e603]: AI
        - tab [ref=e604] [cursor=pointer]:
          - generic [ref=e611]: Share
      - tabpanel [ref=e613]:
        - navigation [ref=e614]:
          - list [ref=e615]:
            - listitem [ref=e616]:
              - link [ref=e617] [cursor=pointer]:
                - /url: "#draw-the-boundary-first-prompt-and-context-are-not-the-same-thing"
                - text: "Draw the boundary first: prompt and context are not the same thing"
            - listitem [ref=e618]:
              - link [ref=e619] [cursor=pointer]:
                - /url: "#why-engineering-context-is-a-finite-resource-and-it-rots"
                - text: "Why “engineering”: context is a finite resource, and it rots"
            - listitem [ref=e620]:
              - link [ref=e621] [cursor=pointer]:
                - /url: "#two-representative-frameworks-for-the-same-window"
                - text: Two representative frameworks for the same window
            - listitem [ref=e622]:
              - link [ref=e623] [cursor=pointer]:
                - /url: "#scheme-a-langchain--lance-martin-write--select--compress--isolate"
                - text: "Scheme A (LangChain / Lance Martin): Write / Select / Compress / Isolate"
            - listitem [ref=e624]:
              - link [ref=e625] [cursor=pointer]:
                - /url: "#scheme-b-sourcegraph-instructions--retrieval--memory--tools"
                - text: "Scheme B (Sourcegraph): Instructions / Retrieval / Memory / Tools"
            - listitem [ref=e626]:
              - link [ref=e627] [cursor=pointer]:
                - /url: "#down-to-the-ground-patterns-already-in-production"
                - text: "Down to the ground: patterns already in production"
            - listitem [ref=e628]:
              - link [ref=e629] [cursor=pointer]:
                - /url: "#retrieve-then-re-rank-the-lesson-behind-50--top-5"
                - text: "Retrieve, then re-rank: the lesson behind 50 → top-5"
            - listitem [ref=e630]:
              - link [ref=e631] [cursor=pointer]:
                - /url: "#cut-before-it-enters-the-window-not-regret-after"
                - text: Cut before it enters the window, not regret after
            - listitem [ref=e632]:
              - link [ref=e633] [cursor=pointer]:
                - /url: "#summarization-based-compaction-claude-code-closes-the-loop"
                - text: "Summarization-based compaction: Claude Code closes the loop"
            - listitem [ref=e634]:
              - link [ref=e635] [cursor=pointer]:
                - /url: "#anthropic-brought-three-distinct-strategies-into-the-api"
                - text: Anthropic brought three distinct strategies into the API
            - listitem [ref=e636]:
              - link [ref=e637] [cursor=pointer]:
                - /url: "#kv-cache-hit-rate-the-underrated-lifeline-in-production"
                - text: "KV-cache hit rate: the underrated lifeline in production"
            - listitem [ref=e638]:
              - link [ref=e639] [cursor=pointer]:
                - /url: "#bring-in-the-vendors-when-the-context-layer-becomes-a-product"
                - text: "Bring in the vendors: when the “context layer” becomes a product"
            - listitem [ref=e640]:
              - link [ref=e641] [cursor=pointer]:
                - /url: "#context-vs-memory-a-window-and-the-river-beyond-it"
                - text: "Context vs memory: a window, and the river beyond it"
            - listitem [ref=e642]:
              - link [ref=e643] [cursor=pointer]:
                - /url: "#my-claim-the-end-of-context-is-a-world-line"
                - text: "My claim: the end of context is a “world line”"
            - listitem [ref=e644]:
              - link [ref=e645] [cursor=pointer]:
                - /url: "#appendix-this-articles-fact-discipline"
                - text: "Appendix: this article’s fact discipline"
    - generic [ref=e646]:
      - generic [ref=e647]:
        - generic [ref=e648]: 继续阅读
        - heading "相关文章 / Related Posts" [level=3] [ref=e649]
      - generic [ref=e650]:
        - 'link "AI Agent Agent Engineering Harness: The Eight Pillars Behind the 98.4% 2026-06-17 20 min" [ref=e651] [cursor=pointer]':
          - /url: /ai-agent/posts/agent-engineering-the-98-percent-harness/
          - generic [ref=e653]:
            - generic [ref=e654]:
              - generic [ref=e655]: AI
              - generic [ref=e656]: Agent
            - paragraph [ref=e657]: "Agent Engineering Harness: The Eight Pillars Behind the 98.4%"
            - generic [ref=e658]:
              - generic [ref=e659]: 2026-06-17
              - generic [aria-hidden] [ref=e660]: ·
              - generic [ref=e661]: 20 min
          - generic [aria-hidden] [ref=e662]: →
        - 'link "Development AI Maintaining a UI on Your Own: A Design System with Figma, Figwright, and AI 2026-09-26 29 min" [ref=e663] [cursor=pointer]':
          - /url: /engineering/posts/2026-09-26-figma-figwright-personal-design-system/
          - generic [ref=e665]:
            - generic [ref=e666]:
              - generic [ref=e667]: Development
              - generic [ref=e668]: AI
            - paragraph [ref=e669]: "Maintaining a UI on Your Own: A Design System with Figma, Figwright, and AI"
            - generic [ref=e670]:
              - generic [ref=e671]: 2026-09-26
              - generic [aria-hidden] [ref=e672]: ·
              - generic [ref=e673]: 29 min
          - generic [aria-hidden] [ref=e674]: →
        - 'link "AI Agent Claude Tag Deep Dive: From Shared Slack AI to an Organizational Agent Runtime 2026-08-05 23 min" [ref=e675] [cursor=pointer]':
          - /url: /ai-agent/posts/claude-tag-organizational-agent-runtime/
          - generic [ref=e677]:
            - generic [ref=e678]:
              - generic [ref=e679]: AI
              - generic [ref=e680]: Agent
            - paragraph [ref=e681]: "Claude Tag Deep Dive: From Shared Slack AI to an Organizational Agent Runtime"
            - generic [ref=e682]:
              - generic [ref=e683]: 2026-08-05
              - generic [aria-hidden] [ref=e684]: ·
              - generic [ref=e685]: 23 min
          - generic [aria-hidden] [ref=e686]: →
  - region "Email newsletter" [ref=e687]:
    - generic [ref=e690]:
      - generic [ref=e691]:
        - heading "New posts, straight to your inbox" [level=2] [ref=e692]
        - paragraph [ref=e693]: One email per new post. Double opt-in, unsubscribe anytime.
      - generic [ref=e694]:
        - generic [ref=e695]:
          - generic [ref=e696]: Email address
          - textbox "Email address" [ref=e697]:
            - /placeholder: you@example.com
        - button "Subscribe" [ref=e698] [cursor=pointer]
        - textbox [aria-hidden] [ref=e701]
      - paragraph [ref=e702]
      - generic [ref=e703]:
        - generic [ref=e704]: Prefer RSS?
        - link "All · RSS" [ref=e705] [cursor=pointer]:
          - /url: /index.xml
        - link "JSON" [ref=e706] [cursor=pointer]:
          - /url: /feed.json
        - link "OPML" [ref=e707] [cursor=pointer]:
          - /url: /subscriptions.opml
        - link "Growth & Life" [ref=e709] [cursor=pointer]:
          - /url: /growth/index.xml
        - link "AI Agent" [ref=e710] [cursor=pointer]:
          - /url: /ai-agent/index.xml
        - link "Engineering" [ref=e711] [cursor=pointer]:
          - /url: /engineering/index.xml
        - link "Space · CUBXXW OS" [ref=e712] [cursor=pointer]:
          - /url: /projects/index.xml
        - link "All Articles" [ref=e713] [cursor=pointer]:
          - /url: /articles/index.xml
  - contentinfo "Site navigation" [ref=e714]:
    - generic [ref=e715]:
      - generic [ref=e716]:
        - paragraph [ref=e717]: Keep Reading
        - list [ref=e718]:
          - listitem [ref=e719]:
            - link "Columns" [ref=e720] [cursor=pointer]:
              - /url: /columns/
          - listitem [ref=e721]:
            - link "AI Agent" [ref=e722] [cursor=pointer]:
              - /url: /ai-agent/
          - listitem [ref=e723]:
            - link "Engineering" [ref=e724] [cursor=pointer]:
              - /url: /engineering/
          - listitem [ref=e725]:
            - link "Growth" [ref=e726] [cursor=pointer]:
              - /url: /growth/
          - listitem [ref=e727]:
            - link "All Posts" [ref=e728] [cursor=pointer]:
              - /url: /articles/
          - listitem [ref=e729]:
            - link "Archives" [ref=e730] [cursor=pointer]:
              - /url: /archives/
          - listitem [ref=e731]:
            - link "Travel" [ref=e732] [cursor=pointer]:
              - /url: /travel/
      - generic [ref=e733]:
        - paragraph [ref=e734]: Products
        - list [ref=e735]:
          - listitem [ref=e736]:
            - link "Talent Signal" [ref=e737] [cursor=pointer]:
              - /url: /projects/#talent-signal
          - listitem [ref=e738]:
            - link "IMStage" [ref=e739] [cursor=pointer]:
              - /url: /projects/#imstage
          - listitem [ref=e740]:
            - link "Solo Compass" [ref=e741] [cursor=pointer]:
              - /url: /projects/#solo-compass
          - listitem [ref=e742]:
            - link "DayPage" [ref=e743] [cursor=pointer]:
              - /url: /projects/#daypage
          - listitem [ref=e744]:
            - link "Telepace" [ref=e745] [cursor=pointer]:
              - /url: /projects/#telepace
          - listitem [ref=e746]:
            - link "Apply Agent" [ref=e747] [cursor=pointer]:
              - /url: /projects/#apply-agent
          - listitem [ref=e748]:
            - link "Agent Diff Guard" [ref=e749] [cursor=pointer]:
              - /url: /projects/#agent-diff-guard
          - listitem [ref=e750]:
            - link "All products →" [ref=e751] [cursor=pointer]:
              - /url: /projects/#studio-products
      - generic [ref=e752]:
        - paragraph [ref=e753]: Subscribe & Connect
        - list [ref=e754]:
          - listitem [ref=e755]:
            - link "About · Start Here" [ref=e756] [cursor=pointer]:
              - /url: /about/
          - listitem [ref=e757]:
            - link "RSS" [ref=e758] [cursor=pointer]:
              - /url: /index.xml
          - listitem [ref=e759]:
            - link "JSON Feed" [ref=e760] [cursor=pointer]:
              - /url: /feed.json
          - listitem [ref=e761]:
            - link "GitHub" [ref=e762] [cursor=pointer]:
              - /url: https://github.com/cubxxw
          - listitem [ref=e763]:
            - link "Email" [ref=e764] [cursor=pointer]:
              - /url: mailto:3293172751nss@gmail.com
  - contentinfo [ref=e765]:
    - generic [ref=e766]:
      - text: © 2026
      - link "Xinwei Xiong (cubxxw) · An Open Archive of Practice and Thought" [ref=e767] [cursor=pointer]:
        - /url: https://cubxxw.com/
  - progressbar "Reading progress" [ref=e768]
  - status
  - status
  - region "Footnote preview" [ref=e769]:
    - generic [aria-hidden] [ref=e770]: At the marker, press ↓ to enter.
    - group "Note content" [ref=e771]:
      - paragraph [ref=e772]:
        - text: "Manus, “Context Engineering for AI Agents: Lessons from Building Manus.”"
        - link "https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus" [ref=e773] [cursor=pointer]:
          - /url: https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus
    - link "Go to note ↓" [active] [ref=e774] [cursor=pointer]:
      - /url: "#fn:12"
  - generic [ref=e775]: Press Arrow Down to enter the preview, or Enter to go to the note.
```

# Test source

```ts
  1   | import {test,expect,type Page,type Locator} from '../helpers/frozen-site';
  2   | 
  3   | test.use({channel:'chromium',reducedMotion:'reduce'});
  4   | const article=(locale='zh')=>`${locale==='zh'?'/zh':''}/ai-agent/posts/context-engineering-the-new-foundation/`;
  5   | const marker=(page:Page)=>page.locator('.post-content a.footnote-ref').first();
  6   | const preview=(page:Page)=>page.locator('#fn-preview-popover');
  7   | const more=(page:Page)=>page.locator('.fn-popover__more');
  8   | const keyboardHint=(page:Page)=>page.locator('.fn-popover__keyboard-hint');
  9   | async function center(ref:Locator,noJS=false){
  10  |   await ref.scrollIntoViewIfNeeded();
  11  |   await ref.evaluate(el=>{const r=el.getBoundingClientRect();scrollTo({top:scrollY+r.y+r.height/2-innerHeight/2,behavior:'instant'});});
  12  |   if(noJS)await ref.evaluate(el=>el.getBoundingClientRect().toJSON());
  13  |   else await ref.page().evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  14  | }
  15  | async function tap(ref:Locator){
  16  |   const box=(await ref.boundingBox())!;await ref.page().touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
  17  | }
  18  | async function actionGeometry(action:Locator){
  19  |   const box=(await action.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  20  |   expect(await action.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  21  |   expect(await action.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);return box;
  22  | }
  23  | async function openPreview(ref:Locator){
  24  |   await tap(ref);await expect(preview(ref.page())).toHaveAttribute('aria-hidden','false');
  25  |   await expect.poll(()=>preview(ref.page()).evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
  26  |   await expect(keyboardHint(ref.page())).toBeHidden();
  27  | }
  28  | async function targetFor(ref:Locator){
  29  |   const href=(await ref.getAttribute('href'))!;return {href,target:ref.page().locator(`[id=${JSON.stringify(decodeURIComponent(href.slice(1)))}]`)};
  30  | }
  31  | 
  32  | for(const locale of ['zh','en'])test.describe(`${locale} coarse native footnotes`,()=>{
  33  |   test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:locale==='zh'?'reduce':'no-preference'});
  34  |   test('first tap keeps the reading point; second tap and More retain native history and Back',async({page})=>{
  35  |     await page.addInitScript(dark=>localStorage.setItem('pref-theme',dark?'dark':'light'),locale==='en');
  36  |     await page.goto(article(locale));const ref=marker(page),{href,target}=await targetFor(ref);await center(ref);
  37  |     const before=await page.evaluate(()=>({y:scrollY,hash:location.hash,history:history.length}));
  38  |     await openPreview(ref);expect(await page.evaluate(()=>location.hash)).toBe(before.hash);expect(await page.evaluate(()=>scrollY)).toBeCloseTo(before.y,0);
  39  |     await expect(preview(page)).toHaveAttribute('role','region');await expect(preview(page)).toHaveAttribute('aria-label',locale==='zh'?'脚注预览':'Footnote preview');await expect(preview(page)).not.toHaveAttribute('aria-modal',/./);
  40  |     await expect(more(page)).toHaveAttribute('href',href);await actionGeometry(more(page));expect(await preview(page).evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
  41  |     await tap(ref);await expect.poll(()=>decodeURIComponent(new URL(page.url()).hash)).toBe(decodeURIComponent(href));await expect(target).toBeInViewport();expect(await page.evaluate(()=>history.length)).toBe(before.history+1);await expect(preview(page)).toHaveAttribute('aria-hidden','true');
  42  |     await page.goBack();await expect.poll(()=>new URL(page.url()).hash).toBe(before.hash);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(before.y,0);
  43  |     await openPreview(ref);const box=await actionGeometry(more(page));await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  44  |     await expect.poll(()=>decodeURIComponent(new URL(page.url()).hash)).toBe(decodeURIComponent(href));await expect(target).toBeInViewport();await expect(preview(page)).toHaveAttribute('aria-hidden','true');
  45  |     await page.goBack();await expect.poll(()=>new URL(page.url()).hash).toBe(before.hash);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(before.y,0);
  46  |   });
  47  | });
  48  | 
  49  | for(const locale of ['zh','en'])test.describe(`${locale} fine keyboard footnotes`,()=>{
  50  |   test.use({viewport:{width:1440,height:900},hasTouch:false,isMobile:false});
  51  |   test('Tab discovers ArrowDown entry; internal citation focus survives and Escape returns without reopening',async({page})=>{
  52  |     await page.addInitScript(dark=>localStorage.setItem('pref-theme',dark?'dark':'light'),locale==='en');await page.goto(article(locale));const ref=marker(page),{href,target}=await targetFor(ref);await center(ref);await page.mouse.move(2,2);
  53  |     // A programmatic preceding-control setup, followed by the actual Tab
  54  |     // into the marker. This is a local keyboard contract, not a whole-page audit.
  55  |     await ref.evaluate(el=>{const nodes=Array.from(document.querySelectorAll<HTMLElement>('a[href],button,input,textarea,[tabindex]')).filter(n=>n.tabIndex>=0&&!n.matches(':disabled')&&n.getClientRects().length&&!n.closest('[inert]')&&getComputedStyle(n).visibility!=='hidden');const previous=nodes[nodes.indexOf(el as HTMLElement)-1];if(!previous)throw new Error('No preceding keyboard control');previous.focus({preventScroll:true});});
  56  |     await page.keyboard.press('Tab');await expect(ref).toBeFocused();await expect(preview(page)).toHaveAttribute('aria-hidden','false');await expect(ref).toHaveAttribute('aria-keyshortcuts',/ArrowDown/);await expect(ref).toHaveAttribute('aria-controls',/fn-preview-popover/);await expect(ref).toHaveAttribute('aria-describedby',/fn-preview-keyboard-help/);
  57  |     await expect(keyboardHint(page)).toBeVisible();await expect(keyboardHint(page)).toHaveText(locale==='zh'?'在标记上按 ↓ 进入预览':'At the marker, press ↓ to enter.');await expect(keyboardHint(page)).toHaveAttribute('aria-hidden','true');expect(await keyboardHint(page).evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);const keyboardBox=await preview(page).boundingBox();
  58  |     const y=await page.evaluate(()=>scrollY);await page.keyboard.press('ArrowDown');const body=page.locator('.fn-popover__body');await expect(body).toBeFocused();expect(await page.evaluate(()=>scrollY)).toBe(y);await expect(keyboardHint(page)).toBeVisible();expect(await preview(page).boundingBox()).toEqual(keyboardBox);
  59  |     const citation=body.locator('a[href]').first();const originalCitation=await citation.getAttribute('href');await page.keyboard.press('Tab');await expect(citation).toBeFocused();await page.waitForTimeout(250);await expect(citation).toBeFocused();await expect(preview(page)).toHaveAttribute('aria-hidden','false');expect(await citation.getAttribute('href')).toBe(originalCitation);await expect(keyboardHint(page)).toBeVisible();expect(await preview(page).boundingBox()).toEqual(keyboardBox);expect(await page.evaluate(()=>scrollY)).toBe(y);
  60  |     await page.keyboard.press('Tab');await expect(more(page)).toBeFocused();await actionGeometry(more(page));await expect(keyboardHint(page)).toBeVisible();expect(await preview(page).boundingBox()).toEqual(keyboardBox);await page.keyboard.press('Escape');await expect(ref).toBeFocused();await expect(preview(page)).toHaveAttribute('aria-hidden','true');expect(await preview(page).evaluate((el:HTMLElement)=>el.inert)).toBe(true);await page.waitForTimeout(250);await expect(preview(page)).toBeHidden();await expect(ref).toBeFocused();
  61  |     await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('.fn-popover'))).toBe(false);
  62  |     await ref.focus();await page.keyboard.press('Enter');await expect.poll(()=>decodeURIComponent(new URL(page.url()).hash)).toBe(decodeURIComponent(href));await expect(target).toBeInViewport();await expect(preview(page)).toHaveAttribute('aria-hidden','true');
  63  |   });
  64  | });
  65  | 
  66  | test.describe('bounded short-screen footnote',()=>{
  67  |   test.use({viewport:{width:568,height:224},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  68  |   test('a long-note fixture scrolls inside the region without moving the article or clipping More',async({page})=>{
  69  |     await page.goto(article());const ref=marker(page);
  70  |     // Local long-content fixture only; the public note remains unchanged.
  71  |     await ref.evaluate(el=>{const note=document.getElementById(decodeURIComponent(el.getAttribute('href')!.slice(1)))!;for(let i=0;i<24;i++){const p=document.createElement('p');p.textContent=`Long note fixture ${i}: reference context remains readable in the bounded preview.`;note.appendChild(p);}});
  72  |     await center(ref);const before=await page.evaluate(()=>({y:scrollY,hash:location.hash,history:history.length}));await openPreview(ref);const pop=preview(page),body=page.locator('.fn-popover__body');const box=(await pop.boundingBox())!;
  73  |     expect(box.x).toBeGreaterThanOrEqual(12);expect(box.y).toBeGreaterThanOrEqual(12);expect(box.x+box.width).toBeLessThanOrEqual(568-12);expect(box.y+box.height).toBeLessThanOrEqual(224-12+.1);await actionGeometry(more(page));
  74  |     expect(await body.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);const bounds=(await body.boundingBox())!;await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.wheel(0,420);await expect.poll(()=>body.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);expect(await page.evaluate(()=>scrollY)).toBe(before.y);expect(await page.evaluate(()=>location.hash)).toBe(before.hash);await expect(pop).toHaveAttribute('aria-hidden','false');await actionGeometry(more(page));
  75  |     await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>pop.evaluate(el=>getComputedStyle(el).transform)).toBe('none');await actionGeometry(more(page));
  76  |     await ref.evaluate((el:HTMLElement)=>el.focus({preventScroll:true}));await expect(ref).toBeFocused();expect(await page.evaluate(()=>scrollY)).toBe(before.y);
  77  |     await page.keyboard.press('ArrowDown');await expect(body).toBeFocused();expect(await page.evaluate(()=>scrollY)).toBe(before.y);expect(await page.evaluate(()=>location.hash)).toBe(before.hash);
  78  |     const citation=body.locator('a[href]').first();await page.keyboard.press('Tab');await expect(citation).toBeFocused();expect(await page.evaluate(()=>({y:scrollY,hash:location.hash,history:history.length}))).toEqual(before);
  79  |     await page.keyboard.press('Tab');await expect(more(page)).toBeFocused();expect(await page.evaluate(()=>({y:scrollY,hash:location.hash,history:history.length}))).toEqual(before);await actionGeometry(more(page));await page.keyboard.press('Shift+Tab');await page.keyboard.press('Shift+Tab');await expect(body).toBeFocused();
  80  |     await page.keyboard.press('End');await expect.poll(()=>body.evaluate(el=>Math.abs(el.scrollHeight-el.clientHeight-el.scrollTop)<2)).toBe(true);expect(await page.evaluate(()=>scrollY)).toBe(before.y);
  81  |     await page.mouse.wheel(0,420);await page.waitForTimeout(100);expect(await page.evaluate(()=>scrollY)).toBe(before.y);expect(await page.evaluate(()=>location.hash)).toBe(before.hash);await expect(pop).toHaveAttribute('aria-hidden','false');await actionGeometry(more(page));await page.keyboard.press('Escape');await expect(ref).toBeFocused();await expect(pop).toHaveAttribute('aria-hidden','true');
  82  |   });
  83  | });
  84  | 
  85  | for(const coarse of [false,true])test.describe(`${coarse?'coarse':'fine'} real short-screen Tab`,()=>{
  86  |   test.use({viewport:{width:568,height:150},isMobile:coarse,hasTouch:coarse,reducedMotion:'no-preference'});
  87  |   test('the existing longest English note keeps native internal Tab off the document scroll chain',async({page})=>{
  88  |     await page.addInitScript(()=>localStorage.setItem('pref-theme','dark'));await page.goto(article('en'));await page.waitForFunction(()=>Array.from(document.querySelectorAll<HTMLLinkElement>('link[as="style"]')).every(link=>link.relList.contains('stylesheet')));await page.evaluate(()=>document.fonts.ready);await expect(page.locator('body')).toHaveClass(/dark/);
  89  |     const refs=page.locator('.post-content a.footnote-ref'),index=await refs.evaluateAll(nodes=>nodes.map((ref,index)=>({index,length:document.getElementById(decodeURIComponent(ref.getAttribute('href')!.slice(1)))?.textContent?.length||0})).sort((a,b)=>b.length-a.length)[0].index),ref=refs.nth(index),original=await ref.elementHandle();await center(ref);await page.mouse.move(2,2);
  90  |     const readPoint=()=>page.evaluate(()=>({y:scrollY,hash:location.hash,history:history.length})),before=await readPoint();await ref.evaluate((el:HTMLElement)=>el.focus({preventScroll:true}));expect(await readPoint()).toEqual(before);
  91  |     await page.keyboard.press('ArrowDown');const pop=preview(page),body=page.locator('.fn-popover__body'),citation=body.locator('a[href]').first();await expect(body).toBeFocused();await expect.poll(()=>pop.evaluate(el=>getComputedStyle(el).opacity)).toBe('1');expect(await readPoint()).toEqual(before);await expect(keyboardHint(page)).toBeVisible();expect(await pop.evaluate(el=>getComputedStyle(el).position)).toBe('fixed');
  92  |     const entry=await pop.boundingBox(),hintBox=await keyboardHint(page).boundingBox();expect(await body.evaluate(el=>el.scrollHeight>el.clientHeight&&el.clientHeight>0)).toBe(true);
> 93  |     const inViewport=async(height:number)=>{const box=(await pop.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(12);expect(box.y).toBeGreaterThanOrEqual(12);expect(box.x+box.width).toBeLessThanOrEqual(568-12);expect(box.y+box.height).toBeLessThanOrEqual(height-12+.1);await actionGeometry(more(page));};await inViewport(150);
      |                                                                                                                                                                                                                                                 ^ Error: expect(received).toBeLessThanOrEqual(expected)
  94  |     await page.keyboard.press('Tab');await expect(citation).toBeFocused();expect(await readPoint()).toEqual(before);expect(await pop.boundingBox()).toEqual(entry);expect(await keyboardHint(page).boundingBox()).toEqual(hintBox);
  95  |     await page.keyboard.press('Tab');await expect(more(page)).toBeFocused();expect(await readPoint()).toEqual(before);expect(await pop.boundingBox()).toEqual(entry);expect(await keyboardHint(page).boundingBox()).toEqual(hintBox);await inViewport(150);
  96  |     await page.setViewportSize({width:568,height:224});await inViewport(224);await expect(more(page)).toBeFocused();await expect(keyboardHint(page)).toBeVisible();expect(await readPoint()).toEqual(before);
  97  |     await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>pop.evaluate(el=>getComputedStyle(el).transform)).toBe('none');await inViewport(224);expect(await readPoint()).toEqual(before);await page.keyboard.press('Shift+Tab');await expect(citation).toBeFocused();expect(await readPoint()).toEqual(before);await page.keyboard.press('Tab');await expect(more(page)).toBeFocused();expect(await readPoint()).toEqual(before);
  98  |     await page.keyboard.press('Escape');expect(await page.evaluate(original=>document.activeElement===original,original)).toBe(true);await expect(ref).toBeFocused();await expect(pop).toHaveAttribute('aria-hidden','true');expect(await pop.evaluate((el:HTMLElement)=>el.inert)).toBe(true);expect(await readPoint()).toEqual(before);await page.waitForTimeout(250);await expect(pop).toBeHidden();expect(await page.evaluate(original=>document.activeElement===original,original)).toBe(true);
  99  |     if(coarse){await openPreview(ref);await expect(keyboardHint(page)).toBeHidden();}
  100 |   });
  101 | });
  102 | 
  103 | test.describe('coarse click intent',()=>{
  104 |   test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  105 |   test('modifiers, non-primary, AT, Space and missing or malformed definitions retain native intent',async({page})=>{
  106 |     const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(article());const ref=marker(page);await center(ref);
  107 |     const decisions=await ref.evaluate(el=>{
  108 |       const recorded:boolean[]=[];const observe=(event:MouseEvent)=>{if(event.target===el){recorded.push(event.defaultPrevented);event.preventDefault();}};document.addEventListener('click',observe);
  109 |       // Record the component's decision before this test alone blocks the
  110 |       // default action, avoiding any navigation/new-tab side effect.
  111 |       for(const flags of [{metaKey:true},{ctrlKey:true},{shiftKey:true},{altKey:true},{button:1},{detail:0}])el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0,detail:1,...flags}));
  112 |       const href=el.getAttribute('href')!;for(const value of ['#missing-footnote-fixture','#%E0%A4%A','#empty-footnote-fixture']){if(value==='#empty-footnote-fixture'){const empty=document.createElement('div');empty.id='empty-footnote-fixture';document.body.appendChild(empty);}el.setAttribute('href',value);el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0,detail:1}));}el.setAttribute('href',href);document.removeEventListener('click',observe);return recorded;
  113 |     });expect(decisions).toEqual(Array(9).fill(false));await expect(preview(page)).toHaveAttribute('aria-hidden','true');
  114 |     await ref.focus();const before=await page.evaluate(()=>({y:scrollY,hash:location.hash}));await page.keyboard.press('Space');await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before.y);expect(await page.evaluate(()=>location.hash)).toBe(before.hash);await expect(preview(page)).toHaveAttribute('aria-hidden','true');expect(errors).toEqual([]);
  115 |   });
  116 | });
  117 | 
  118 | test.describe('native fallback without JavaScript',()=>{
  119 |   test.use({javaScriptEnabled:false,viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  120 |   test('the original marker navigates to the complete note and browser Back restores its reading point',async({page})=>{
  121 |     await page.goto(article());const ref=marker(page),{href,target}=await targetFor(ref);await center(ref,true);const before=await page.evaluate(()=>({y:scrollY,hash:location.hash}));await tap(ref);await expect.poll(()=>decodeURIComponent(new URL(page.url()).hash)).toBe(decodeURIComponent(href));await expect(target).toBeInViewport();await expect(preview(page)).toHaveCount(0);
  122 |     const top=await target.evaluate(el=>el.getBoundingClientRect().top),headerBottom=await page.locator('.header').evaluate(el=>el.getBoundingClientRect().bottom);expect(top).toBeGreaterThanOrEqual(headerBottom-1);
  123 |     await page.goBack();await expect.poll(()=>new URL(page.url()).hash).toBe(before.hash);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(before.y,0);
  124 |   });
  125 | });
  126 | 
  127 | test.describe('owned preview timers',()=>{
  128 |   test.use({viewport:{width:1440,height:900},hasTouch:false,isMobile:false});
  129 |   test('an old hover timer cannot replace a newer focused marker or hide its citation; existing ARIA survives',async({page})=>{
  130 |     await page.addInitScript(()=>{
  131 |       const observer=new MutationObserver(()=>{const ref=document.querySelector('.post-content a.footnote-ref');if(!ref||ref.hasAttribute('data-existing-aria'))return;ref.setAttribute('data-existing-aria','true');ref.setAttribute('aria-describedby','existing-note-description');ref.setAttribute('aria-controls','existing-note-control');ref.setAttribute('aria-keyshortcuts','Alt+N');for(const id of ['existing-note-description','existing-note-control']){const span=document.createElement('span');span.id=id;span.hidden=true;span.textContent='Existing relationship fixture';document.body.appendChild(span);}observer.disconnect();});observer.observe(document,{childList:true,subtree:true});
  132 |     });
  133 |     await page.goto(article());const refs=page.locator('.post-content a.footnote-ref'),a=refs.nth(0),b=refs.nth(1);await center(a);const role=await a.getAttribute('role');await page.mouse.move(2,2);await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  134 |     await a.hover();await b.focus();const href=await b.getAttribute('href');await page.clock.fastForward(120);await expect(more(page)).toHaveAttribute('href',href!);await expect(b).toBeFocused();await expect(preview(page)).toHaveAttribute('aria-hidden','false');
  135 |     await b.press('ArrowDown');const citation=page.locator('.fn-popover__body a[href]').first();await page.keyboard.press('Tab');await expect(citation).toBeFocused();await page.clock.fastForward(250);await expect(citation).toBeFocused();await expect(more(page)).toHaveAttribute('href',href!);
  136 |     await page.locator('[data-search-trigger="nav"]:visible').first().focus();await a.dispatchEvent('mouseleave');await page.clock.fastForward(250);await expect(preview(page)).toHaveAttribute('aria-hidden','true');expect(await preview(page).evaluate((el:HTMLElement)=>el.inert)).toBe(true);expect(await page.evaluate(()=>document.activeElement?.matches('[data-search-trigger="nav"]'))).toBe(true);
  137 |     await expect(a).toHaveAttribute('aria-describedby',/existing-note-description/);await expect(a).toHaveAttribute('aria-describedby',/fn-preview-keyboard-help/);await expect(a).toHaveAttribute('aria-controls',/existing-note-control/);await expect(a).toHaveAttribute('aria-controls',/fn-preview-popover/);await expect(a).toHaveAttribute('aria-keyshortcuts',/Alt\+N/);expect(await a.getAttribute('role')).toBe(role);
  138 |   });
  139 | });
  140 | 
```