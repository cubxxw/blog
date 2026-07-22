---
url: "/projects/gpt-researcher/"
title: 'GPT Researcher Explained: Open Source Deep Research Agent'
date: 2025-04-14T16:17:27+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Open Source
  - Project Learning
description: >
  GPT Researcher is a free, self-hosted alternative to ChatGPT Deep Research: an open source agent that turns 20+ web sources into cited 2,000+ word reports in minutes. This deep dive covers its LangGraph multi-agent architecture, installation with Docker, real API costs, and when to pick it over closed tools.
aliases:
  - /posts/ai-projects/gpt-researcher/
tldr:
  - "GPT Researcher is an open source deep research agent that plans a question, gathers web and local sources, validates evidence, and generates cited reports."
  - "The project has evolved beyond a CLI agent: it now includes multi-agent workflows, local-document hybrid research, frontend options, observability, and an MCP server for assistant integrations."
  - "Its strongest value is controllable research automation. Its main risks are source quality, API cost, scraping reliability, and the need to evaluate citations rather than trust generated prose."
faq:
  - q: "What is GPT Researcher?"
    a: "GPT Researcher is an open source autonomous AI agent that automates deep research tasks. It combines large language models with real-time web search and local document processing, aggregating more than 20 sources to produce objective research reports of over 2,000 words in minutes, replacing manual research that traditionally takes weeks."
  - q: "How do I install and run GPT Researcher?"
    a: "Clone the GitHub repository, install Python dependencies with requirements.txt or Poetry, then copy .env.example to .env and add at least one LLM API key (such as OpenAI) and one search engine key (such as Tavily). You can run research tasks via cli.py or main.py, and the project ships a Dockerfile and docker-compose for containerized deployment."
  - q: "How does GPT Researcher's multi-agent architecture work?"
    a: "The core package splits research into modules: retrievers run web searches and scrape pages with tools like BeautifulSoup, Selenium, and Playwright; processors clean and summarize content; memory maintains research context; and report synthesizes the final document. A separate multi_agents module uses LangGraph to orchestrate stateful multi-agent workflows with loops and conditional branches for deeper research."
  - q: "How is GPT Researcher different from ChatGPT Deep Research?"
    a: "GPT Researcher is open source and self-hosted. You choose your own LLM provider (OpenAI, Anthropic, and others) and search engine (Tavily, Google, Bing, DuckDuckGo), and you can mix web sources with local documents for hybrid research. Costs come only from your own API calls, and the entire research pipeline is configurable and extensible."
  - q: "How much does GPT Researcher cost to run?"
    a: "The software itself is free and open source. Running costs come from LLM API calls used for planning, summarizing, and report generation, and deep research runs consume noticeably more tokens. Because it supports multiple LLM providers and search engines, you can pick cheaper models to keep spend under control."
---

> This project is an ongoing effort — learning AI open source projects one step at a time, building real-world practice through hands-on projects, combining AI tools to strengthen the ability to solve complex problems. Everything is documented along the way.
> [Notion List](https://traveling-thistle-a0c.notion.site/Open-Source-Project-Learn-1d2a444a6c008030a24efaa0e3bf5f5c?pvs=4)


## Project Overview

![GPT Researcher workflow](/images/projects/gpt-researcher-workflow.svg)

### Basic Information
- Project Name: GPT Researcher
- GitHub URL: https://github.com/assafelovic/gpt-researcher
- Primary Tech Stack: Python, FastAPI, LangChain, LangGraph, Tavily/search providers, Playwright/Selenium-style crawling, multiple LLM providers

## **1. What GPT Researcher Is**

GPT Researcher is an autonomous research agent for generating cited reports from web and local sources. Instead of asking a model to answer from memory, it decomposes a research task, searches for evidence, processes source content, and synthesizes a report.

That design addresses three common LLM research failures: stale training data, shallow single-source answers, and hallucinated citations. The project is not just a wrapper around a chat model; it is a research pipeline with planning, retrieval, source filtering, summarization, and report generation.

## **2. Updated 2026 Context**

The current GPT Researcher ecosystem is broader than the original "run a research agent from the command line" framing.

The official site now positions it as an open deep research agent with multi-source reports, export formats, local-document research, support for many LLMs and search engines, and multi-agent support. It also highlights academic benchmark results from DeepResearchGym in 2025, where GPT Researcher is reported as ranking highly on citation quality, report quality, and coverage. Treat that as a useful signal, but still validate performance on your own research domains.

The project also exposes an MCP server. That matters because GPT Researcher can become a research tool inside other assistants instead of only being a standalone app. The MCP server separates quick search, deep research, report writing, source retrieval, and context retrieval into callable tools.

## **3. Architecture**

The system can be understood as a loop:

1. The user provides a research question.
2. A planner breaks it into sub-questions or research directions.
3. Retrieval components search the web, fetch pages, and optionally include local documents.
4. Processors clean, summarize, and evaluate source material.
5. A report generator synthesizes the final answer with citations.
6. Multi-agent workflows can assign specialized roles for planning, research, review, and writing.

The LangGraph-based multi-agent workflow is the most interesting part for learning. It turns research into a stateful process: plan, retrieve, critique, refine, and publish. This is closer to how a human research team works than a single prompt-response exchange.

## **4. GPT Researcher vs. ChatGPT Deep Research**

The comparison is not simply "open source vs. closed product." The deeper distinction is control.

| Dimension | GPT Researcher | Hosted deep research products |
|---|---|---|
| Deployment | Self-hosted or embedded | Provider-hosted |
| Models | User-selectable providers | Provider-selected |
| Search | Configurable search engines | Opaque or partially configurable |
| Local docs | Supported through project workflow | Depends on product |
| Cost | Your API and infrastructure cost | Subscription or usage pricing |
| Auditability | Code and pipeline visible | Usually limited |

GPT Researcher is better when you need to customize source selection, run inside a private workflow, or study how research agents work. Hosted products are usually easier when you only need finished reports and do not want to operate infrastructure.

## **5. Engineering Risks**

Source quality is the main risk. More sources do not automatically mean better truth. You still need source ranking, domain filters, duplicate detection, and citation checks.

Scraping is fragile. Websites change layouts, block automation, or load content dynamically. A robust deployment needs fallback search providers and error handling.

Cost can grow quickly. Deep research performs multiple LLM calls for planning, summarization, critique, and report writing. Use model tiers intentionally.

Citation correctness must be evaluated. A citation attached to a sentence does not guarantee the source supports that exact claim.

## **6. Recommended Learning Path**

Start with the CLI or a minimal Python call and run a small research task. Inspect the generated sources before reading the final report.

Next, change the search provider and model. This reveals which parts of the output come from retrieval quality and which come from the synthesis model.

Then run a local-document or hybrid research task. This is where the project becomes more useful for enterprise knowledge work.

Finally, study the LangGraph multi-agent example. Focus on the state object, agent roles, and where the workflow loops back for refinement.

## **7. Current Verdict**

GPT Researcher is one of the better projects for learning applied agent design because it has a concrete job: produce a research report with sources. That makes failures visible. If the report is shallow, citations are weak, or the source mix is biased, you can inspect the pipeline and improve it.

For production, use it as a configurable research subsystem, not as an unquestioned truth engine. Pair it with source policies, evaluation datasets, citation audits, and human review for high-stakes domains.

#### References

1. [assafelovic/gpt-researcher - GitHub](https://github.com/assafelovic/gpt-researcher)
2. [GPT Researcher official site](https://gptr.dev/)
3. [GPT Researcher LangGraph multi-agent docs](https://docs.gptr.dev/docs/gpt-researcher/multi_agents/langgraph)
4. [GPT Researcher MCP server docs](https://docs.gptr.dev/docs/gpt-researcher/mcp-server/getting-started)



## Related Articles

+ [A Staged Growth Guide for Open Source](/growth/posts/stage-growth-of-open-source/)
+ [A Complete Guide to Open Source Contribution (A Handbook for First-Timers)](/engineering/posts/open-source-contribution-guidelines/)
+ [My Practical Summary: Designing Norms in Open Source Communities](/engineering/posts/advanced-githook-design/)
+ [How to Ask Questions in Open Source Communities](/engineering/posts/the-art-of-asking-questions-in-open-source-communities/)
