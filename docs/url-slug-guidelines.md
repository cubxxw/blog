# URL/Slug Naming Guidelines

This document establishes consistent slug naming rules for the blog to maintain URL quality and prevent broken links.

## General Principles

1. **Use lowercase letters only** - Slugs should be all lowercase (e.g., `ai-gateway`, not `AI-Gateway`)
2. **Use hyphens as separators** - Use `-` instead of `_` or spaces (e.g., `api-gateway`, not `api_gateway` or `api gateway`)
3. **Be descriptive but concise** - Slugs should clearly indicate content while remaining readable
4. **Avoid special characters** - Only use lowercase letters, numbers, and hyphens

## Common Spelling Rules

| Incorrect | Correct | Note |
|-----------|---------|------|
| `getway` | `gateway` | Common typo - "gateway" is the correct spelling |
| `k8s-` | `kubernetes-` | Use full name for clarity, except in tags |
| `llm-` | `llm-` | Acceptable abbreviation for LLM-related content |
| `ai-` | `ai-` | Acceptable prefix for AI-related content |

## File Naming Convention

For content files in `content/`:

- **English posts**: `content/en/{category}/{slug}.md`
- **Chinese posts**: `content/zh/{category}/{slug}.md`

The filename should match the primary slug used in the front matter.

## Aliases/Redirects

When renaming files or correcting slugs:

1. **Always add aliases** for the old slug to preserve existing links
2. **Update all internal references** to use the new slug
3. **Document the change** in the commit message

Example:
```yaml
aliases:
  - /posts/old-slug/
  - /zh/posts/old-slug/
```

## Category/Slug Structure

Recommended URL structure:
- `/posts/{slug}/` - General blog posts
- `/projects/{slug}/` - Project pages
- `/growth/posts/{slug}/` - Personal growth/reflection posts
- `/ai-technology/posts/{slug}/` - AI/technology technical posts
- `/travel/{slug}/` - Travel-related posts

## Checklist Before Publishing

- [ ] Slug uses only lowercase letters, numbers, and hyphens
- [ ] Spelling is verified (especially common words like "gateway")
- [ ] Slug is descriptive of the content
- [ ] For renames, aliases are added for old URLs
- [ ] Internal links are updated to use the correct slug

## History

- **2026-04-06**: Established guidelines after fixing `ai-getway` → `ai-gateway` typo
