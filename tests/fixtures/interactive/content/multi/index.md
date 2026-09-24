---
title: "Fixture Multi"
date: 2026-01-01T00:00:00+08:00
type: posts
---

Fixture page for multi-instance and compatibility checks. Prose before the
figures so layout and reading order can be asserted.

{{< interactive kind="context-budget" id="ctx-a" spec="context-window-v1" >}}

Between figures.

{{< interactive kind="context-budget" id="ctx-b" spec="context-window-v1" >}}

{{< interactive kind="agent-loop" id="loop-a" spec="agent-loop-v1" >}}

One instance with runtime-invalid embedded data (build-time shallow checks
pass, the executable schema rejects it at runtime and the static fallback must
stay intact):

{{< interactive kind="context-budget" id="ctx-broken" spec="broken-runtime-v1" >}}

Legacy `demo-*` shortcodes must keep working alongside the new components:

{{< demo-steps title="Legacy steps" >}}
{{< demo-step label="第一" >}}One.{{< /demo-step >}}
{{< demo-step label="第二" >}}Two.{{< /demo-step >}}
{{< /demo-steps >}}

{{< demo-agent-trace title="Legacy trace" question="hello?" >}}
[
  {"type":"think","text":"legacy"},
  {"type":"answer","text":"still works"}
]
{{< /demo-agent-trace >}}
