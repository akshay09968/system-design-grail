# Latency & Throughput

Every performance conversation you will ever have reduces to three quantities: **latency** (how long one request takes), **throughput** (how many complete per second), and **concurrency** (how many are in flight right now). Most engineers treat them as vibes. They are in fact locked together by one of the most useful equations in all of computing — and once you can wield it, plus one uncomfortable truth about percentiles, you can predict system behavior that surprises everyone else in the room.

## Little's law: the equation you'll use forever

For any stable system — a service, a queue, a thread pool, a coffee shop:

> **L = λ × W**  →  *concurrency = throughput × latency*

Items in the system equal arrival rate times time spent inside. No assumptions about distributions, arrival patterns, or implementation. It's not an approximation; it's bookkeeping — which is why it's inescapable.

Watch how much work it does:

- **Capacity sizing.** Service handles 2,000 req/s at 50 ms mean latency → 2,000 × 0.05 = **100 requests in flight**. If each worker handles one request, you need 100 workers *just to stand still* — before headroom.
- **Finding the real limit.** Same service, but a downstream dependency degrades and latency doubles to 100 ms. Concurrency needed doubles to 200. Your pool holds 150 → the pool saturates, requests queue behind it, and *your* service is now "down" — **though nothing about your code changed**. This is why slow dependencies are deadlier than dead ones: dead fails fast, slow *consumes concurrency*, and concurrency is the finite resource.
- **Reading the graph backwards.** Concurrency (in-flight requests) climbing while throughput is flat means latency is rising — you're watching saturation happen in the only metric that leads.

The law also explains the **hockey stick** every operator has seen: queueing delay grows roughly like 1/(1 − utilization). At 50% busy, queues are negligible; at 80%, delay has quadrupled; at 95%, it's twentyfold and climbing a wall. Systems don't degrade linearly — they feel fine, feel fine, feel fine, and then fall over within a few percent of traffic growth. This single curve is the argument for headroom, for load shedding, and for never celebrating "we're running at 90% utilization" (that's not efficiency; that's standing on the cliff edge).

## Percentiles: averages are propaganda

Mean latency is the most misleading number in your dashboard. A service doing 99 requests at 10 ms and 1 request at 2,000 ms averages ~30 ms — "great" — while 1% of users are having an experience 200× worse than the story you're telling yourself. Latency distributions are violently skewed; the mean is dragged by the tail while describing nobody.

So we speak in percentiles: **p50** (median — the typical experience), **p95/p99** (the unlucky ones), **p99.9** (the very unlucky, who at scale are still thousands of people per hour). Two non-obvious truths give percentiles their teeth:

**Your best customers live in the tail.** The user with the fattest account, most items, most followers, most history triggers the most work per request — heavy users are *disproportionately* the p99. Optimizing the median while the tail rots means your most valuable users get your worst experience.

**Fan-out amplifies the tail into the mainstream.** A request that touches 100 backends (a search, a feed assembly, a microservice cascade) completes only when the *slowest* touch completes. If each backend is "fast" 99% of the time:

> P(all 100 fast) = 0.99¹⁰⁰ ≈ **37%**

Your per-service p99 is your *user-facing median*. This is tail-latency amplification, and it's why hyperscalers obsess over p99.9: at sufficient fan-out, there is no such thing as a rare slow request. It's also the quantitative reason microservice sprawl has a latency bill even when every individual service looks healthy.

**Tail-taming toolkit** (each is a case-study talking point): hedged requests (send the laggard a duplicate after the 95th-percentile deadline, take the first answer — a few percent extra load erases most of the tail); aggressive timeouts + fallbacks (bound the damage); avoiding fan-out (batch APIs, denormalized reads); isolating heavy users (partitioning, per-tenant limits). And one measurement honesty rule: never average percentiles across instances — a fleet-wide "average p99" is statistically meaningless; aggregate the histograms.

## Latency budgets: engineering, not vibes

A product requirement — "page loads in 300 ms" — becomes engineering the moment you *spend* it hop by hop:

| Hop | Budget |
|---|---|
| DNS + TLS + TCP (amortized by connection reuse) | 20 ms |
| CDN/edge → origin, request + response transit | 40 ms |
| API gateway + auth | 15 ms |
| Application logic | 50 ms |
| Cache read (hit path) | 5 ms |
| Database (the miss path) | 100 ms |
| Serialization + render slack | 70 ms |

The budget forces every real conversation at once: the DB gets 100 ms *only if* the cache absorbs most reads; a synchronous call to a 150 ms third-party API simply **does not fit** — it must go async or get a cache; and cross-region hops (60–150 ms of pure physics — light in fiber covers ~200 km/ms, and New York→Sydney round-trips ~200 ms no matter how good your code is) can be afforded exactly zero times. Geography is a latency decision: this arithmetic, not fashion, is why data lives near users and why [CDNs](../networking/cdn.md) and [multi-region](../devops/multi-region.md) architectures exist.

Throughput has its own budget levers, mostly about **amortizing overhead**: batching (100 writes per round trip), pipelining (don't await serially), connection reuse (TLS handshakes are ~1–2 round trips you pay only on cold connections), compression (spend CPU to buy bandwidth), and parallelism *below the saturation knee* — after which more parallelism just deepens queues (Little again).

!!! ops "DevOps lens"
    Instrument for percentiles or fly blind: **histograms, not averages** (Prometheus histograms; and know that bucket boundaries quantize your p99 — a bucket edge at 100 ms and 250 ms means "p99 = 180 ms" is fiction between them). Watch for **coordinated omission**: naive load-testing clients wait for each response before sending the next, so when the server stalls, the client *stops generating the requests that would have suffered* — the tool reports a rosy tail precisely during the stall. Serious tools (wrk2, k6 with arrival-rate executors) fix this by holding the arrival schedule. And alert on the tail, not the mean: the mean pages you after the incident; the p99 pages you during the prelude.

!!! staff "Staff+ altitude"
    Staff-level latency work is **portfolio management of the budget**. You'll be the one saying: "We spend 40 ms of every request on an auth hop that could be a signed token verified locally — that's the single biggest line item in the budget, bigger than all database tuning combined." Or: "This proposed service split adds two network hops to the checkout path; the org boundary is worth having, but let's not put it *inside* the latency-critical loop." The altitude marker is connecting the physics to money and structure: latency budgets shape service boundaries, data placement, and vendor choices — not the other way around. And on SLOs: choose the percentile that matches user harm (p99 of *checkout*, p50 of *batch export*) instead of decorating every service with an identical "p99 < 200 ms" that nobody derived.

!!! interview "In the interview"
    Little's law is a spotlight move — use it explicitly: *"At 5,000 req/s and 40 ms, that's 200 in flight; with 8 workers per node at ~25 concurrent each, that's one rack of headroom — this tier isn't the problem."* Thirty seconds, and you've demonstrated capacity math nobody else in the loop will attempt. When the interviewer says "make it faster," walk the budget, don't grab at caches: identify the biggest line item first, and mention the tail explicitly — *"the fan-out to 40 shards makes per-shard p99 our median, so I'd hedge the stragglers."* Expected follow-ups: *"p99 doubled but p50 is flat — what's happening?"* (a subpopulation is slow: hot shard, GC on some nodes, heavy tenants — the tail isolates the victim class); *"how do you load test this honestly?"* (constant arrival rate, watch coordinated omission, measure at the client).

**Next:** [CAP & PACELC](cap-pacelc.md) — what the famous theorem actually says, and the trade-off you pay even on a sunny day.
