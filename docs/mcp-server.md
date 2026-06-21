# cubxxw-blog MCP Server

A zero-dependency [Model Context Protocol](https://modelcontextprotocol.io) server
that exposes this blog's content as tools, so AI clients (Claude Desktop, Cursor,
ChatGPT desktop, …) can search and read posts directly.

It reuses the same content index (`static/data/content-index.json` /
`netlify/functions/_generated/content-index.json`) that powers the site's in-page
AI Q&A, so search behaviour stays consistent. No build step, no external packages —
just Node 18+.

## Tools

| Tool | Purpose |
|------|---------|
| `search_blog` | Keyword search across all posts (bilingual). Returns ranked title / permalink / tags / excerpt. Args: `query` (required), `language` (`en`\|`zh`, optional), `limit` (1-20, default 8). |
| `get_blog_post` | Fetch the full markdown of one post by `relativePath` (as returned by `search_blog`, e.g. `zh/ai-technology/posts/argo-cd.md`). |

## Setup — Claude Desktop

Edit `claude_desktop_config.json`
(macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "cubxxw-blog": {
      "command": "node",
      "args": ["/absolute/path/to/blog/scripts/mcp-server.mjs"]
    }
  }
}
```

Restart Claude Desktop. You can then ask things like *"search cubxxw's blog for
Argo CD"* and Claude will call the tool.

## Setup — Cursor

Add to `.cursor/mcp.json` (or the global Cursor MCP settings) the same
`command`/`args` block.

## Refreshing the index

The server reads a prebuilt index. After writing new posts, regenerate it:

```bash
node scripts/generate-content-index.mjs
```

## Smoke test

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | node scripts/mcp-server.mjs
```

## Notes

- Protocol version `2024-11-05` (widest client support).
- `get_blog_post` rejects path traversal and only serves files under `content/`.
- Output is capped at 24 000 characters per post (`truncated: true` flags it).
