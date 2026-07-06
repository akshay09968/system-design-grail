# Cheat Sheets

The morning-of review, everything on two screens: the numbers, the decision tables, and the pattern triggers. Each row links back to its full page — this is the index of the site's muscle memory, not a substitute for it.

## The numbers ([full page](../foundations/estimation.md))

| Latency | | Throughput anchors | |
|---|---|---|---|
| Memory ref | ~100 ns | Tuned API node | 1–10k RPS |
| NVMe read | ~20–100 µs | nginx static/proxy | 50k+ RPS |
| Same-AZ RTT | ~0.5 ms | Postgres (indexed) | 10–50k QPS |
| Cross-region RTT | 30–150 ms | Redis | 100k+ ops/s/core |
| Intercontinental | ~200 ms | Kafka partition | ~10–20 MB/s |
| TLS cold start | 1–2 RTT | One big box | 128 cores / TBs RAM / 25 Gbps |

**Recipes**: QPS ≈ DAU × actions ÷ 10⁵, peak 3×. Storage = rate × size × 3 (replication) × retention. [Little's law](../foundations/latency-throughput.md): concurrency = throughput × latency. Availability: serial multiplies, parallel multiplies the *un*availabilities. [Fan-out tail](../foundations/latency-throughput.md): P(all N fast) = pᴺ — 0.99¹⁰⁰ ≈ 37%.

**Cost anchors** ([full page](../devops/cost-capacity.md)): compute ~$0.04/vCPU-hr · egress ~$0.05–0.09/GB · NAT ~$0.045/GB · cross-AZ ~$0.01–0.02/GB · S3 $0.023 → $0.001/GB-mo by tier.

## Decision tables

**Datastore by access pattern** ([full page](../data/nosql.md))

| Pattern | Reach for |
|---|---|
| Relational, transactional, ad-hoc queries | [PostgreSQL + the ladder](../data/sql-at-scale.md) |
| Key lookup at scale, sessions, counters | [KV / Redis / DynamoDB](../caching/redis.md) |
| Single-partition range reads (feeds, time series) | [Wide-column, query-first modeling](../data/nosql.md) |
| Full-text search | Search index (fed by [CDC](../data/analytics.md)) |
| Relationship traversals ≥3 deep | Graph — but [start with SQL joins](../data/nosql.md) |
| Blobs | [Object storage + CDN, metadata in DB](../data/object-storage.md) |
| Analytics | [Columnar: lake/warehouse via CDC](../data/analytics.md) — never the OLTP primary |

**Consistency by data class** ([full page](../foundations/consistency-models.md)): money/inventory → linearizable + [idempotency keys](../messaging/delivery-semantics.md) · own-content visibility → [read-your-writes](../foundations/consistency-models.md) (leader reads or LSN tokens) · social/catalog → eventual + bounded staleness · counters/presence → eventual, approximate.

**Async & delivery** ([full pages](../messaging/index.md)): user waits on it → sync; else queue. Tasks → [competing consumers](../messaging/async-fundamentals.md); events/fan-out/replay → [Kafka-shaped log](../messaging/kafka.md). Delivery = at-least-once + [idempotent consumers](../messaging/delivery-semantics.md), always say so. Ordering → per-key partitions, never global.

**Caching sentence** ([full page](../caching/fundamentals.md)): *cache-aside + TTL-with-jitter + delete-on-write + single-flight + negative caching + L1/L2 for hot keys* — six clauses, recite as one.

**Resilience sentence** ([full page](../distributed/resilience.md)): *budget timeouts with deadline propagation; edge-only retries, 3 max, exponential + full jitter, under a retry budget; per-dependency breakers with stale-serving fallbacks; bulkheaded pools; priority load-shedding at admission.*

**Scaling ladder** ([SQL](../data/sql-at-scale.md) / [general](../foundations/scalability.md)): optimize queries → pool → cache → replicas → bigger box → partition tables → split by function → shard (pre-split logical shards, [Snowflake IDs](../distributed/time-ordering.md), the key chosen for [cardinality + load + query-presence + isolation](../data/partitioning.md)).

**Multi-region** ([full page](../devops/multi-region.md)): ask *why* (DR/latency/residency) → the ladder (multi-AZ → backups → pilot light → warm → active-passive → active-active) → data via **regional homing** → [static stability](../devops/multi-region.md) + shared-fate audit.

## Pattern triggers (hear X → reach for Y)

| Trigger in the prompt | Pattern |
|---|---|
| "Viral / celebrity / hot item" | [Hot key: L1 cache, salting, dedicated shard](../caching/failure-modes.md) |
| "Users see their own post instantly" | [Read-your-writes mechanisms](../foundations/consistency-models.md) |
| "Exactly once" | [At-least-once + idempotency, say the truth](../messaging/delivery-semantics.md) |
| "Only one worker may..." | [The ladder: ownership > CAS > lease+fencing > lock](../distributed/coordination.md) |
| "Feed / timeline" | [Push/pull hybrid fan-out](../case-studies/news-feed.md) |
| "Upload files/video" | [Presigned URLs, multipart, CDN](../data/object-storage.md) |
| "Real-time updates" | [SSE if one-way; WebSockets + pub/sub backbone if duplex](../networking/apis.md) |
| "Search-as-you-type" | [Typeahead: prefix structures + cached top-K](../case-studies/typeahead.md) |
| "Count views/likes at scale" | [Approximate: HLL, sharded counters, batch-flush](../caching/redis.md) |
| "Schedule / delayed jobs" | [ZSET or delay queues + reclaim leases](../case-studies/job-scheduler.md) |
| "Third-party integration" | [Webhooks signed + retried + reconciliation poll](../networking/apis.md) |
| "Now make it 10×" | [The bottleneck sequence, narrated in order](../foundations/scalability.md) |
| "What if X dies?" | [The four questions + degraded-mode menu](../foundations/thinking-in-systems.md) |
| "Deploy this safely" | [Flag → canary + analysis → waves → expand-contract](../devops/deployments.md) |

## The operability close ([your signature](../foundations/devops-lens.md))

*"Observability: [RED histograms per service, queue age, end-to-end traces](../observability/fundamentals.md). SLO: [burn-rate alerts, multi-window](../observability/slos.md). Rollout: [flag-gated, canaried by cell, auto-rollback](../devops/deployments.md). Failure: [the two scariest boxes have named degraded modes](../distributed/resilience.md), and the failover is [game-day'd quarterly](../observability/chaos.md)."*

Four sentences. Almost nobody else in the loop will say them. That's the edge — go collect it.
