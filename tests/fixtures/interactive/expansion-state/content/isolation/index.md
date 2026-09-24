---
title: "Fixture State Isolation"
date: 2026-01-01T00:00:00+08:00
type: posts
---

Fixture page for multi-instance isolation and failure fallback: two healthy
session-tree instances sharing one spec, one runtime-invalid instance (the
executable schema rejects it, the static view must stay intact), and one
instance of each other GROUP state kind.

{{< interactive kind="session-tree" id="tree-a" spec="session-tree-v1" >}}

{{< interactive kind="session-tree" id="tree-b" spec="session-tree-v1" >}}

{{< interactive kind="session-tree" id="tree-broken" spec="session-tree-broken-v1" >}}

{{< interactive kind="session-scope" id="scope-a" spec="session-scope-v1" >}}

{{< interactive kind="memory-lineage" id="lineage-a" spec="memory-lineage-v1" >}}
