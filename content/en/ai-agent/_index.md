---
title: "AI Agent"
description: "Agent engineering, context engineering, and Generative Engine Optimization (GEO) — 45+ field notes from building real production AI systems, serialized and ongoing."
keywords: ["AI Agent", "Agent Engineering", "Context Engineering", "LLM Applications", "Large Language Models", "GEO", "Generative Engine Optimization", "AI Native"]
faq:
  - q: What is Agent Engineering?
    a: Agent Engineering is the discipline of building production-grade AI agent systems. Model capability is only a small fraction of the work — most of the engineering lives in the harness (execution framework), tool orchestration, context management, memory systems, and evaluation. The "Agent Engineering Panorama" article in this section maps these layers systematically.
  - q: How is Context Engineering different from prompt engineering?
    a: Prompt engineering optimizes the wording of a single instruction; context engineering manages everything the model can see across an entire session — retrieval results, memory, tool outputs, history compression. As long-running agents become the norm, context engineering is replacing prompt engineering as the new foundation of AI applications.
  - q: What is GEO (Generative Engine Optimization)?
    a: GEO is the practice of making content easier for AI search engines like ChatGPT Search and Perplexity to retrieve and cite. Unlike traditional SEO, which optimizes for click-through ranking, GEO optimizes for the probability of being cited by AI. This section carries a six-part series covering GEO from principles and structured-content tactics to measurement tooling.
  - q: What experience is this section based on?
    a: Everything comes from the author's (Xinwei Xiong / cubxxw) first-hand practice building AI products — open-source projects, production agent deployments, and measured data from this blog's own GEO rebuild — not second-hand summaries. Articles are organized into series; start from part one of any series.
domains:
  - num: "01"
    name: "Agent Engineering"
    kicker: "AGENT ENGINEERING"
    desc: "Harness design, tool orchestration, multi-agent systems — where the 98% of engineering beyond the model actually lives."
    link: "/columns/agent-engineering/"
    link_text: "Agent Engineering column"
  - num: "02"
    name: "Context Engineering"
    kicker: "CONTEXT ENGINEERING"
    desc: "Context, memory, RAG and retrieval — what bounds an agent's intelligence isn't the model, it's what the model can see."
    link: "/ai-agent/posts/context-engineering-the-new-foundation/"
    link_text: "Start with this one"
  - num: "03"
    name: "Generative Engine Optimization"
    kicker: "GEO"
    desc: "When search shifts from giving links to giving answers, visibility is decided by the probability of being cited by AI."
    link: "/columns/geo/"
    link_text: "GEO series"
cascade:
  - type: "posts"
    showtoc: true
    tocopen: true
---

Field notes from Xinwei Xiong (cubxxw) on taking large models out of the chat box and into production systems. The work spans three directions — **agent engineering**, **context engineering**, and **Generative Engine Optimization (GEO)** — all drawn from real builds, real failures, and real retrospectives.
