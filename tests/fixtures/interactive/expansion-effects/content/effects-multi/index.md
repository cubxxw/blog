---
title: "Fixture Effects Multi"
date: 2026-01-01T00:00:00+08:00
type: posts
---

Effects group fixture: two `effect-recovery` instances (isolation), one
`gitops-reconcile` and one reused `agent-loop` verifier trace. Served in BOTH
locales by the fixture mounts (en at `/effects-multi/`, zh at `/zh/effects-multi/`).

{{< interactive kind="effect-recovery" id="fx-n8n" spec="effect-recovery-n8n-v1" >}}

{{< interactive kind="effect-recovery" id="fx-lg" spec="effect-recovery-langgraph-v1" >}}

{{< interactive kind="gitops-reconcile" id="fx-gitops" spec="gitops-reconcile-v1" >}}

{{< interactive kind="agent-loop" id="fx-loop" spec="loop-verifier-v1" >}}
