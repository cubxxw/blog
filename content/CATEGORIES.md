# Category Architecture

> **Version**: 2.0.0
> **Date**: 2026-04-06
> **Purpose**: Unified top-level information architecture for the blog

## Overview

This blog uses a **4-category architecture** aligned with the author's identity as **AI Builder, Open Source Contributor, and Digital Nomad**.

## Core Categories

### 1. AI & Technology

**Purpose**: Technical content about AI/LLM, Kubernetes, Go, DevOps, and engineering practices.

**Coverage**:
- AI/LLM applications and frameworks (LangChain, AutoGPT, Agents)
- Kubernetes cloud-native technologies (K8s components, GitOps, Service Mesh)
- Go language engineering (concurrency, tooling, cross-platform)
- DevOps practices (CI/CD, testing, deployment, monitoring)

**Previous mappings**:
- `Development` → AI & Technology
- `Technology` → AI & Technology
- `开发 (Development)` → AI & Technology
- `技术 (Technology)` → AI & Technology

**Sample tags**: `Kubernetes`, `Go`, `AI`, `LLM`, `DevOps`, `Cloud Native`, `LangChain`, `GitOps`, `CI/CD`, `Microservices`

---

### 2. Projects

**Purpose**: AI open source project deep-dives, product builds, and independent development work.

**Coverage**:
- AI project analysis (LangChain, GPT-Researcher, Jina, etc.)
- Independent developer products
- Product demos and feature showcases
- Project documentation and usage guides

**Previous mappings**:
- `AI Open Source` → Projects
- `Projects` → Projects
- `AI 开源 (AI Open Source)` → Projects

**Sample tags**: `Open Source`, `AI Projects`, `Product Development`, `Independent Developer`, `Project Analysis`

---

### 3. Growth

**Purpose**: Personal growth, annual reviews, mindset shifts, efficiency methods, and life reflections.

**Coverage**:
- Annual reviews (2023, 2024, 2025...)
- Monthly thought notes
- Personal growth methodology (GTD, Flow State, Metacognition)
- Career development and open source journey
- Self-discovery in the AI age

**Previous mappings**:
- `Growth` → Growth
- `成长 (Growth)` → Growth
- `Personal Development` → Growth
- `个人成长 (Personal Development)` → Growth

**Sample tags**: `Personal Growth`, `Annual Review`, `Flow State`, `GTD`, `Metacognition`, `Self-Discovery`, `Career Development`, `Open Source Journey`

---

### 4. Travel

**Purpose**: Travel experiences, digital nomad lifestyle, cultural exploration, and adventure records.

**Coverage**:
- Travel itineraries and guides
- Digital nomad lifestyle
- Cultural immersion and local experiences
- Adventure and outdoor activities

**Previous mappings**:
- `Travel` → Travel
- `旅行 (Travel)` → Travel
- `冒险 (Adventure)` → Travel (as tag)

**Sample tags**: `Travel`, `Digital Nomad`, `Adventure`, `Cultural Exploration`, `Travel Photography`, `Remote Work`

---

## Category Decision Matrix

| Content Type | Primary Category | Secondary Category |
|--------------|------------------|-------------------|
| Kubernetes tutorial | AI & Technology | - |
| LangChain project demo | AI & Technology | Projects |
| Annual review | Growth | - |
| Travel itinerary | Travel | Growth (optional) |
| AI project analysis | Projects | AI & Technology |
| Open source contribution story | Growth | Projects |
| GTD methodology | Growth | - |
| Go tool development | AI & Technology | Projects |
| Digital nomad setup | Travel | Growth |
| Sora AI guide | AI & Technology | - |

---

## Tag Guidelines

### What goes in Category vs Tag?

**Categories (1 per post)**:
- Broad content buckets for navigation
- Answer: "Where does this fit in the site structure?"
- Stable, limited set (4 categories)

**Tags (5-8 per post)**:
- Specific topics and technologies
- Answer: "What specific topics does this cover?"
- Flexible, can grow with content

**Examples**:

```yaml
# AI Technology Tutorial
categories: [AI & Technology]
tags: [Kubernetes, Go, DevOps, Tutorial, Cloud Native]

# AI Project Deep-Dive
categories: ["Projects"]
tags: [LangChain, AI, Open Source, Project Analysis, LLM]

# Annual Review
categories: ["Growth"]
tags: [Annual Review, Personal Growth, Reflection, Career Development]

# Travel Experience
categories: ["Travel"]
tags: [Travel, Digital Nomad, Cultural Exploration, Photography]
```

---

## Migration Notes

### Content Distribution (Current State)

| Old Category | Count | New Category |
|--------------|-------|--------------|
| Development | 47 | AI & Technology |
| Technology | 45 | AI & Technology |
| AI Open Source | 20 | Projects |
| Growth | 28 | Growth |
| Travel | 3 | Travel |
| Projects | 2 | Projects |
| Personal Development | 2 | Growth |
| 成长 (Growth) | 8 | Growth |
| 技术 (Technology) | 6 | AI & Technology |

### Migration Script

```bash
# Run the migration script
./scripts/migrate-categories.sh
```

The script will:
1. Backup all content files
2. Replace old category names with new standardized names
3. Preserve tags unchanged
4. Generate a migration report

---

## Future Considerations

- **Do not add new top-level categories** unless content volume exceeds 100+ posts in a new distinct area
- **Use tags for granularity** within categories
- **Consider series/collections** for recurring content types (e.g., "Monthly Thoughts", "Project Deep-Dive")
- **Review annually** to ensure categories still reflect content strategy

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-04-06 | Unified to 4-category architecture |
| 1.0.0 | 2026-03-28 | Initial tagging standards document |
