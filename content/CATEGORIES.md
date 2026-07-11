# Content Architecture

> **Version**: 3.0.0
> **Date**: 2026-07-11
> **Purpose**: Unified information architecture for the blog

## Overview

The blog organizes content along **three axes**, aligned with the author's identity as **AI Builder, Open Source Contributor, and Digital Nomad**:

1. **Sections** (directory = primary classification, one per post)
2. **Tags** (fine-grained topics, 5-8 per post)
3. **Columns** (curated multi-part essay series, opt-in)

> ⚠️ The `categories` taxonomy was **retired in v3.0.0** (2026-07). It duplicated
> the section structure one-to-one and generated near-duplicate list pages.
> Do NOT add `categories:` to frontmatter — the field is ignored.
> Old `/categories/*` URLs 301-redirect to `/archives/`.

## Sections

| Section | Path | Purpose |
|---------|------|---------|
| **AI Agent** | `content/{zh,en}/ai-agent/posts/` | Agent engineering, context engineering, LLM applications, GEO |
| **Engineering** | `content/{zh,en}/engineering/posts/` | Kubernetes cloud-native, Go engineering, DevOps, open-source practice |
| **Growth** | `content/{zh,en}/growth/posts/` | Annual reviews, thought notes, personal growth, relationships |
| **Projects** | `content/{zh,en}/projects/` | Open-source project deep-dives and product builds (flat files, no `posts/` subdir) |

Supporting surfaces (not content sections): `articles` (all-posts aggregator),
`columns` (series landing pages), `travel` (standalone life page), `start-here`
(curated entry), `about`, `archives`, `search`.

### Choosing a section

- Writing about agents, LLMs, context/memory/RAG, AI search → **ai-agent**
- Writing about K8s, Go, CI/CD, deployment, open-source workflow → **engineering**
- Writing about life, reviews, mindset, relationships, learning methods → **growth**
- A deep-dive on one specific open-source project or product → **projects**

History note: `ai-technology` was split into `ai-agent` + `engineering` in v3.0.0.
All old URLs are covered by per-post 301 rules in `static/_redirects`.

## Tags

- 5-8 per post, Title Case English (`Go`, not `golang`)
- Registered names only — see `config/tags-mapping.json` and run `npm run tags:check`
- Never use sentences or summaries as tags

## Columns（专栏）

Multi-part essay series. A post opts in via frontmatter:

```yaml
columns:
  - agent-engineering
```

Each column has a landing page at `content/{zh,en}/columns/<slug>/_index.md`
(frontmatter: `title`, `slug`, `subtitle`, `date`, `description`, `type: columns`).

Active columns: `ignite-and-settle` (点火与沉底), `agent-engineering` (Agent 工程), `geo` (GEO 生成式引擎优化, ongoing).

## Frontmatter example

```yaml
---
title: '文章标题'
date: 2026-07-11T12:00:00+08:00
type: posts
tags: [Agent, Context Engineering, LLM]
description: >
  纯文本描述。
columns:        # optional
  - agent-engineering
---
```
