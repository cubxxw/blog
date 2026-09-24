---
title: "Fixture Safety"
date: 2026-01-01T00:00:00+08:00
type: posts
---

This fixture embeds hostile text through the data pipeline: `</script>`,
quotes, `<`, `&`, Chinese text and newlines must round-trip as inert text and
never execute.

{{< interactive kind="context-budget" id="safety-ctx" spec="safety-strings-v1" >}}

{{< interactive kind="agent-loop" id="safety-loop" spec="safety-strings-loop-v1" >}}
