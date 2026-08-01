# Codex repository configuration

Read the repository's root `CLAUDE.md` before changing content or code. It is
the source of truth for content paths, writing workflows, validation, and PR
rules.

## Repo Skill

- Codex repository skill: `.agents/skills/blog/SKILL.md`
- Claude-facing companion skill: `.claude/skills/blog/SKILL.md`
- Keep credentials, approval policy, sandbox policy, search preferences, and
  MCP connections in the user's Codex configuration.

## Multi-Agent Support

- Use the explorer for read-only evidence gathering.
- Use the reviewer for correctness, security, regression, and test review.
- Use the docs researcher for primary-source API and release-note verification.
- Only delegate when the user or active instructions permit multi-agent work.
