---
title: "Expansion Geometry Fixture"
date: 2026-01-01T00:00:00+08:00
type: posts
---

Fixture page for the geometry expansion kinds (`vector-cosine`,
`flow-bottleneck`): multi-instance isolation, browser semantics, fallback and
mobile checks. Prose before the figures so layout and reading order can be
asserted.

{{< interactive kind="vector-cosine" id="vc-a" spec="vector-cosine-v1" >}}

Between figures.

{{< interactive kind="vector-cosine" id="vc-b" spec="vector-cosine-v1" >}}

{{< interactive kind="flow-bottleneck" id="fb-a" spec="flow-bottleneck-v1" >}}

One instance with runtime-invalid embedded config (produced by the test build;
the executable schema rejects it at runtime and the static fallback must stay
intact) sits beside a healthy sibling below.

{{< interactive kind="flow-bottleneck" id="fb-b" spec="flow-bottleneck-v1" >}}
