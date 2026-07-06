# Analytics & Data Pipelines

Your OLTP database answers "what is order 42?" in a millisecond. Ask it "average order value by region by month for the last two years" and you've asked it to scan half a billion rows while it's supposed to be running checkout — the analyst's query that took down production is a rite-of-passage incident with its own seat at every postmortem table. Analytics isn't OLTP with bigger queries; it's **different physics** (columns, not rows), **different systems** (warehouses and lakes), and a **pipeline** connecting the two worlds that is a design domain of its own — one that DevOps engineers increasingly own under the title "data platform."

## Columnar: why analytics engines win by 100×

Row stores keep each row's fields together — perfect for "fetch order 42, all of it." Analytics touches *three columns of five hundred million rows*, and columnar layout turns that from catastrophe to coffee-break:

- **Read only what you query** — `region`, `amount`, `month` load; the other 40 columns never leave disk.
- **Compression goes superlinear** — a column is a homogeneous run (a million region codes, sorted-ish): dictionary encoding, run-length, delta encoding routinely hit 10×+, and scanning compressed columns beats scanning raw rows outright.
- **Vectorized execution** — engines process column chunks with SIMD instead of interpreting row-at-a-time; CPUs finally get to sprint.

**Parquet/ORC** are this layout as portable files (with per-chunk min/max statistics so engines skip whole blocks — plus [range GETs](object-storage.md) meaning you read only the needed columns *of the needed row-groups* straight out of object storage). One mental model carries the whole topic: OLTP optimizes for *rows you name*; OLAP optimizes for *columns you aggregate*.

## The systems: warehouse, lake, lakehouse

**Warehouses** (Snowflake, BigQuery, Redshift): managed SQL over columnar storage, with the architectural feature that reorganized the market — **separation of storage and compute**: data sits cheap in object storage; compute clusters spin up per workload, scale independently, and *bill by the query*. That's why the marginal question is cheap and the careless one is $5,000 (see the DevOps lens below).

**Lakes**: Parquet files in [object storage](object-storage.md), schema applied at read time. Infinitely cheap and flexible; historically degenerating into the "data swamp" — no transactions, no schema enforcement, `_final_v2_new` directories as version control.

**Lakehouse** (Delta Lake, Apache Iceberg, Hudi): the current era's answer — **table formats** layered over lake files, adding ACID commits, schema evolution, time travel, and compaction. Why it won: **one copy of the data, in open files you own, in your bucket — and query engines compete to read it** (Spark, Trino, DuckDB, Snowflake, BigQuery all speak Iceberg now). The strategic inversion is worth savoring: the moat moved from "whose format holds your data" to "whose engine queries it best," and buyers won.

## Getting the data there

- **ELT, not ETL** — modern order: **E**xtract, **L**oad raw into the warehouse/lake, **T**ransform there (dbt-style SQL, versioned in git, tested in CI — data pipelines finally adopting [software discipline](../devops/cicd.md)). Raw data preserved means transforms are re-runnable; bugs become restatements, not data loss.
- **CDC — the elegant workhorse.** Change Data Capture tails the OLTP database's [WAL](storage-engines.md) (Debezium-class tooling) and streams every row change to [Kafka](../messaging/kafka.md), landing in the lake minutes-fresh. Near-zero source impact (it reads the log, not the tables), no batch windows, and it closes a loop this site has been building for pages: *the log is the database* → ship the log ([replication](replication.md)) → tail the log (CDC) → the [outbox pattern](distributed-transactions.md) is CDC pointed at an events table. One idea, five costumes.
- **Direct event streams** — product analytics and telemetry skip OLTP entirely: clients → collector → Kafka → lake ([the log pipeline](../case-studies/log-pipeline.md)).

The iron rule under all three: **analytics never touches the OLTP primary.** The half-step (point BI at a [read replica](replication.md)) buys months; the real answer is the pipeline, because replicas share the primary's row-store physics and the analyst's join will eventually find them too.

## Batch vs. streaming: cheaper vs. sooner

The trade is simply **freshness vs. cost-and-complexity**. Batch (hourly/daily jobs over partitioned files) is cheap, restatable, debuggable — rerun yesterday when the bug's found. Streaming (Flink/Spark-streaming over Kafka) delivers seconds-fresh answers and buys them with always-on infrastructure, [state management, and the late-data problem](../messaging/event-driven.md) (watermarks — deep dive in the messaging section).

History note worth one sentence in interviews: the **Lambda architecture** (run batch *and* streaming pipelines, merge results) was the 2012 answer and its dual-codebase tax is why **Kappa** (stream-only, replay the [log](../messaging/kafka.md) for reprocessing) succeeded it where streaming is genuinely needed. The modern judgment is unromantic: **stream what the product consumes live** (fraud scores, live dashboards, [feed features](../case-studies/news-feed.md)); **batch everything else**; micro-batch when in doubt. "Real-time analytics" requested without a consumer who acts in real time is the most expensive default in data engineering.

Design for **restatement** either way: partition by event date, keep transforms idempotent, and backfills become `rerun --from 2026-06-01` instead of archaeology.

## The quality layer: data as an SLO surface

Mature data platforms treat tables like services: **freshness SLOs** ("orders_daily lands by 06:00 UTC or it pages"), **quality checks in the DAG** (row counts vs. yesterday, null-rate thresholds, referential spot-checks — failures *block* downstream tasks rather than propagating garbage), **lineage** (which dashboards die if this table is late — impact analysis for incidents and deprecations), and **data contracts** at the producer boundary (the OLTP team renaming a column is a *breaking API change* to forty dashboards; schema registries and contracts make that a build failure instead of a Monday-morning mystery — [the gRPC lesson](../networking/apis.md), replayed in data).

!!! ops "DevOps lens"
    Data pipelines are production systems with a distinctive incident portfolio: **the late table** (freshness SLO blown — upstream export died at 02:00; your DAG's retry + alerting discipline decides whether anyone notices before the CEO's dashboard does), **the silent wrong number** (worse than late: a dedupe bug double-counting revenue for a week — quality checks and reconciliation against source-of-truth are your only detectors), **the $5k query** (BigQuery scanning 2 PB because someone dropped the date filter — partition/cluster your tables so pruning protects you *structurally*, set per-team cost quotas, alert on scan-size anomalies), and **the backfill stampede** (reprocessing a year of data through the same cluster that serves today's SLOs — throttle and isolate, [like every backfill](sql-at-scale.md)). Cost governance is a first-class op here: storage-compute separation means spend scales with *carelessness*, not data.

!!! staff "Staff+ altitude"
    Markers: (1) **The platform position**: one copy of truth, in open formats (Iceberg-class), in object storage you control, with engines as replaceable tenants — that stance preserves negotiating leverage and survives vendor churn; signing away the storage layer is the lock-in that compounds. (2) **Data contracts as org design** — the hardest data-quality problems are Conway problems: producers who don't know they're producers break consumers they can't see; contracts + lineage + named table owners convert that from recurring incident to governed interface. (3) **Own the freshness/cost/complexity triangle explicitly** — publish per-domain tiers ("finance: daily batch, restatable, audited; fraud: streaming, seconds, expensive") so "make it real-time" arrives as a costed request, not a vibe. (4) **Analytics capacity is product capacity** — the recommendation model, the pricing engine, the exec dashboard all ride this platform; a Staff engineer treats the pipeline's SLOs with the same gravity as the API's, because the business increasingly runs on the derived data, not the raw.

!!! interview "In the interview"
    The 30-second bolt-on that completes almost any design: *"Analytics: CDC off the primary's WAL — Debezium into Kafka, landing as Iceberg on object storage; dbt transforms in the warehouse; BI reads there. OLTP never serves an analyst."* Four boxes, zero risk to checkout, and it slots into every case study. Depth nuggets on demand: **why columnar** (read-what-you-query + homogeneous compression + vectorization — the 100× isn't magic, it's I/O arithmetic), **lakehouse in one line** ("ACID table formats over open files in object storage — one copy, many engines"), **Lambda→Kappa** history if streaming comes up, and the **restatement design** (date-partitioned, idempotent, replayable) when asked how you fix last Tuesday's bug. Probes: *"real-time dashboards?"* (ask who acts on them in real time; stream that path only), *"how do you know the numbers are right?"* (quality gates in the DAG + reconciliation to source), *"schema changed upstream?"* (data contracts — breaking change caught at CI, not at the dashboard).

**Section complete.** Data at rest is handled; next section: [Caching](../caching/index.md) — the art of lying about where data lives, fast.
