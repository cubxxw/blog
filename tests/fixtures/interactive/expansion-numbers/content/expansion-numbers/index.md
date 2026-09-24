---
title: "Fixture Expansion Numbers"
date: 2026-01-01T00:00:00+08:00
type: posts
---

Fixture page for the numerical explainers. Prose before the figures so
layout and reading order can be asserted. Both locales render this same
file through the fixture content mounts (en at `/expansion-numbers/`, zh at
`/zh/expansion-numbers/`).

{{< interactive kind="reliability-chain" id="chain-a" spec="reliability-chain-v1" >}}

Between figures: a second reliability-chain instance for multi-instance
isolation and id-uniqueness checks.

{{< interactive kind="reliability-chain" id="chain-b" spec="reliability-chain-v1" >}}

{{< interactive kind="task-cost" id="cost-a" spec="task-cost-v1" >}}

{{< interactive kind="notification-threshold" id="notify-a" spec="notification-threshold-v1" >}}

One instance with runtime-invalid embedded data (the executable schema
rejects it at runtime and the static fallback must stay intact while the
healthy siblings still enhance):

{{< interactive kind="reliability-chain" id="chain-broken" spec="reliability-chain-broken-v1" >}}
