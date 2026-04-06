# Tag Governance Rules

> **Version**: 1.0.0
> **Date**: 2026-04-06
> **Purpose**: Clear distinction between categories and tags to avoid conceptual overlap (Blog / AI / AI Open Source / Technology / Development)

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Category vs Tag Decision Matrix](#category-vs-tag-decision-matrix)
3. [The 4 Category Architecture](#the-4-category-architecture)
4. [Tag Taxonomy (9 Groups)](#tag-taxonomy-9-groups)
5. [Common Confusion Cases](#common-confusion-cases)
6. [Migration Rules](#migration-rules)
7. [Quick Reference Card](#quick-reference-card)

---

## Core Principles

### The One-Sentence Rule

> **Categories answer "Where does this fit in the site structure?"**
> **Tags answer "What specific topics does this cover?"**

### Key Distinctions

| Aspect | Category | Tag |
|--------|----------|-----|
| **Purpose** | Navigation structure | Topic indexing |
| **Quantity** | Exactly 1 per post | 5-8 per post (flexible) |
| **Stability** | Fixed set (4 categories) | Grows with content |
| **Granularity** | Broad content buckets | Specific technologies/topics |
| **Examples** | `AI & Technology`, `Growth` | `Kubernetes`, `Go`, `LLM`, `DevOps` |

---

## Category vs Tag Decision Matrix

### Decision Flow

```
1. Is this a broad content area that readers browse?
   → YES: Consider Category
   → NO:  It's a Tag

2. Will this have 10+ articles over time?
   → YES: Could be Category
   → NO:  It's a Tag

3. Is this a specific technology/topic/tool?
   → YES: It's a Tag
   → NO:  Continue...

4. Does this describe the author's identity/pillar content?
   → YES: Consider Category
   → NO:  It's a Tag
```

### Common Scenarios

| Concept | Category or Tag? | Reasoning |
|---------|------------------|-----------|
| **AI** | Tag | Specific technology domain |
| **AI Open Source** | Category → Projects | Too broad, better as Projects category |
| **Technology** | Category → AI & Technology | Vague, renamed to AI & Technology |
| **Development** | Category → AI & Technology | Overlaps with Technology, merged |
| **Blog** | Tag | Content type, not topic |
| **Growth** | Category | Pillar content area |
| **Travel** | Category | Pillar content area |
| **Kubernetes** | Tag | Specific technology |
| **LLM** | Tag | Specific AI subdomain |
| **Personal Growth** | Tag | Specific topic within Growth |
| **Open Source** | Tag | Project characteristic |

---

## The 4 Category Architecture

### 1. AI & Technology

**What goes here:**
- Technical tutorials (Kubernetes, Go, DevOps)
- AI/LLM technical deep-dives
- Engineering practices
- Tool development

**What does NOT go here:**
- Project showcases (→ Projects)
- Personal reflection on technology (→ Growth)

**Example posts:**
- "Kubernetes Scheduler Deep Dive"
- "Go Concurrency Patterns"
- "Building LLM Agents with LangChain"

### 2. Projects

**What goes here:**
- AI project analysis (LangChain, GPT-Researcher)
- Independent developer products
- Open source project documentation
- Product feature showcases

**What does NOT go here:**
- Pure technical tutorials (→ AI & Technology)
- Project journey stories (→ Growth)

**Example posts:**
- "LangChain Architecture Analysis"
- "Building AI Gateway: Product Design"
- "NotebookLM RAG Deep Dive"

### 3. Growth

**What goes here:**
- Annual reviews
- Monthly thought notes
- Personal growth methodology
- Career development stories
- Self-discovery in AI age

**What does NOT go here:**
- Technical skill growth (→ AI & Technology)
- Travel experiences (→ Travel)

**Example posts:**
- "2025 Annual Review"
- "Flow State and Deep Work"
- "Metacognitive Transformation"

### 4. Travel

**What goes here:**
- Travel itineraries
- Digital nomad lifestyle
- Cultural exploration
- Adventure records

**What does NOT go here:**
- Technical travel setup (→ Growth or AI & Technology)

**Example posts:**
- "Lhasa: Slow and Heavy"
- "Japan 2025 Journey"
- "Digital Nomad in Southeast Asia"

---

## Tag Taxonomy (9 Groups)

Tags are organized into 9 groups for consistency:

### 1. Programming Languages
`Go`, `Python`, `JavaScript`, `TypeScript`, `Rust`, `Java`

### 2. Cloud Native
`Kubernetes`, `Docker`, `Cloud Native`, `Helm`, `Istio`, `Containerd`

### 3. AI/ML
`AI`, `Machine Learning`, `Deep Learning`, `LLM`, `NLP`, `Computer Vision`, `LangChain`

### 4. Technology
`DevOps`, `Automation`, `Testing`, `Performance`, `Security`, `Monitoring`, `CI/CD`

### 5. Architecture
`Microservices`, `System Design`, `Distributed Systems`, `Event-Driven`

### 6. Tools
`Git`, `GitHub`, `VS Code`, `Linux`, `Vim`, `Docker Desktop`

### 7. Open Source
`Open Source`, `Community`, `Contribution`, `Maintenance`

### 8. Life
`Blog`, `Monthly Notes`, `Personal Growth`, `Self-Discovery`, `Reading`, `Reflection`

### 9. Culture
`Remote Work`, `Team Collaboration`, `Management`, `Leadership`, `Digital Nomad`

---

## Common Confusion Cases

### Case 1: "AI" vs "AI Open Source" vs "AI Technology"

| Term | Type | Usage |
|------|------|-------|
| **AI** | Tag | Use for all AI-related content |
| **AI Open Source** | ~~Category~~ → Projects | Merged into Projects category |
| **AI Technology** | ~~Category~~ → AI & Technology | Merged into AI & Technology category |

**Correct usage:**
```yaml
categories: [Projects]
tags: [AI, Open Source, LangChain, Project Analysis]
```

### Case 2: "Development" vs "Technology"

| Term | Type | Usage |
|------|------|-------|
| **Development** | ~~Category~~ → AI & Technology | Merged |
| **Technology** | ~~Category~~ → AI & Technology | Merged |
| **DevOps** | Tag | Use for DevOps-specific content |

**Correct usage:**
```yaml
categories: [AI & Technology]
tags: [Go, Kubernetes, DevOps, CI/CD]
```

### Case 3: "Blog" as Category or Tag?

| Term | Type | Usage |
|------|------|-------|
| **Blog** | Tag | Content type marker |

**Correct usage:**
```yaml
categories: [Growth]  # or AI & Technology for technical posts
tags: [Blog, Writing, Personal Reflection]
```

### Case 4: "Open Source" Classification

| Term | Type | Usage |
|------|------|-------|
| **Open Source** | Tag | Project characteristic |
| **Projects** | Category | Where project content lives |

**Correct usage:**
```yaml
categories: [Projects]
tags: [Open Source, Contribution, GitHub, Community]
```

### Case 5: Travel + Growth Overlap

| Content | Category | Why |
|---------|----------|-----|
| Travel itinerary | Travel | Primary focus is travel |
| Travel + reflection | Travel + Growth tag | Travel is primary, reflection is secondary |
| Digital nomad philosophy | Growth + Travel tag | Philosophy is primary, travel is context |

---

## Migration Rules

### Category Mappings

| Old Category | New Category | Notes |
|--------------|--------------|-------|
| `Development` | AI & Technology | Merged |
| `Technology` | AI & Technology | Merged |
| `开发 (Development)` | AI & Technology | Merged |
| `技术 (Technology)` | AI & Technology | Merged |
| `AI Open Source` | Projects | Renamed |
| `AI 开源 (AI Open Source)` | Projects | Renamed |
| `Growth` | Growth | Unchanged |
| `成长 (Growth)` | Growth | Unchanged |
| `Personal Development` | Growth | Merged |
| `Travel` | Travel | Unchanged |
| `旅行 (Travel)` | Travel | Unchanged |

### Tag Cleanup Rules

**Remove these tags entirely:**
- `en`, `first` (meaningless)
- CI/CD variables like `${{ steps.meta.outputs.tags }}`
- Placeholder text like `your-dockerhub-username/your-app-name:latest`
- Long descriptive text

**Merge these tags:**
- `golang`, `Golang`, `GO` → `Go`
- `K8s`, `k8s` → `Kubernetes`
- `AI 开源`, `人工智能 (AI)` → `AI`
- `博客`, `博客 (Blog)` → `Blog`

---

## Quick Reference Card

### Category Decision Tree

```
                    ┌─────────────────┐
                    │  What is this   │
                    │  article about? │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Technical    │   │  Personal     │   │   Travel      │
│  Tutorial?    │   │  Growth?      │   │   Experience? │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
     YES│                   │                   │
        ▼                   ▼                   ▼
  ┌───────────┐       ┌───────────┐       ┌───────────┐
  │ AI &      │       │  Growth   │       │  Travel   │
  │ Technology│       │           │       │           │
  └───────────┘       └───────────┘       └───────────┘

        │
        │ NO
        ▼
┌───────────────┐
│ Project Demo  │
│ or Analysis?  │
└───────┬───────┘
        │
     YES│
        ▼
  ┌───────────┐
  │ Projects  │
  └───────────┘
```

### Tag Selection Checklist

When writing a post, ask:

1. **What technologies are covered?** → Add tech tags (`Kubernetes`, `Go`, `LLM`)
2. **What type of content is this?** → Add type tags (`Tutorial`, `Analysis`, `Monthly Notes`)
3. **What domain/field?** → Add domain tags (`Cloud Native`, `DevOps`, `AI`)
4. **What tools are used?** → Add tool tags (`GitHub`, `Docker`, `LangChain`)
5. **Is this open source?** → Add `Open Source` tag
6. **Is there a personal element?** → Add life tags (`Personal Growth`, `Reflection`)

### Example Post Metadata

```yaml
# Example 1: Kubernetes Tutorial
categories: [AI & Technology]
tags: [Kubernetes, Go, Cloud Native, DevOps, Tutorial]

# Example 2: AI Project Analysis
categories: [Projects]
tags: [AI, LangChain, Open Source, Project Analysis, LLM]

# Example 3: Annual Review
categories: [Growth]
tags: [Annual Review, Personal Growth, Reflection, Career Development]

# Example 4: Travel + Reflection
categories: [Travel]
tags: [Travel, Digital Nomad, Cultural Exploration, Photography, Personal Growth]

# Example 5: Technical + Personal Journey
categories: [AI & Technology]
tags: [Go, Open Source, Community, Personal Journey, GitHub]
```

---

## Enforcement

### Pre-Publishing Checklist

- [ ] Exactly 1 category assigned
- [ ] Category is from the 4 core categories
- [ ] 5-8 tags assigned
- [ ] Tags use Title Case
- [ ] No duplicate/synonym tags
- [ ] No placeholder or CI/CD variable tags

### Automated Checks

```bash
# Run tag validation
./scripts/validate-tags.sh

# Check for deprecated categories
./scripts/check-deprecated-categories.sh
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-04-06 | Initial tag governance document |

---

## Related Documents

- [`content/CATEGORIES.md`](../content/CATEGORIES.md) - Category architecture details
- [`TAGS.md`](../TAGS.md) - Tag naming conventions and standards
- [`config/tags-mapping.json`](../config/tags-mapping.json) - Tag synonym mappings
