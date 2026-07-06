# Caching

Caching is the art of lying about where data lives — and it's the only technique in this site that improves latency, throughput, cost, and availability *simultaneously*. The price is always the same currency: staleness, and the occasional spectacular failure mode when a million requests discover the lie at the same moment. Three pages: the theory, the tool everyone actually uses, and the ways it all goes wrong.

<div class="grid cards" markdown>

-   **[Caching fundamentals](fundamentals.md)**

    ---
    The cache hierarchy, the five patterns (cache-aside to write-behind), eviction policies, and the truth about invalidation races.

-   **[Redis deep dive](redis.md)**

    ---
    The Swiss army knife of state: data structures as APIs, single-threaded atomicity, persistence trade-offs, Sentinel and Cluster.

-   **[Cache failure modes](failure-modes.md)**

    ---
    Stampede, avalanche, penetration, hot keys, big keys, and the dependency cliff — the named disasters and their named cures.

</div>

## If you are cramming

Read [failure modes](failure-modes.md) first — "what happens when the cache dies?" is the single most common caching follow-up in interviews, and the jitter/single-flight/negative-cache trio answers most of it. Then skim the pattern table and invalidation section of [fundamentals](fundamentals.md).
