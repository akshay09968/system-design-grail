# Storage Engines

Every database war — Postgres vs. Cassandra, MySQL vs. RocksDB-anything, "SQL vs. NoSQL" itself — is secretly an argument between two data structures. Learn the two and the entire product landscape reorganizes itself into physics: not "which database is better" but "which amplification profile does this workload want." This is the single deepest depth-signal available in data questions, because almost nobody in the candidate pool can explain *why* their chosen database is fast.

The problem every engine solves: give me **durable writes** and **fast reads** on hardware with one loud opinion — **sequential I/O is vastly cheaper than random I/O** (historically 100× on disks; still meaningful on NVMe, where sequential throughput and write-endurance both favor it).

## The write-ahead log: durability's one weird trick

Before any engine updates its clever structures, it appends the change to a **write-ahead log** (WAL) and fsyncs. That's the durability moment — everything after is optimization. Crash mid-anything? Replay the log. The WAL is why databases can buffer, batch, and rearrange real work in memory without fear, and why **group commit** (fsync once for N transactions' log entries) lets a database commit tens of thousands of transactions per second through a device that only does a few thousand fsyncs.

You've met the WAL under all its stage names: Postgres WAL, InnoDB redo log, Cassandra commitlog, MongoDB journal, etcd's raft log. And hold the thought that *the log is the primary artifact and the tables are derived views* — that idea escapes the database and becomes [replication](replication.md) (ship the log), [CDC](analytics.md) (tail the log), Kafka (be the log), and [event sourcing](../messaging/event-driven.md) (admit the log was the truth all along). Few ideas in this site rhyme across more pages.

## B-trees: update in place, optimize for reads

The B-tree (1970, and still champion) keeps rows in **pages** (~8–16 KB) arranged in a wide, shallow tree — fanout in the hundreds means a billion rows in 3–4 levels, and the top levels live permanently in RAM. A point read: walk 3–4 pages, likely 1 actual disk read. A range scan: find the start leaf, walk siblings — data is physically *in order*, which is why B-trees eat `BETWEEN` queries and `ORDER BY ... LIMIT` for breakfast.

Writes are the compromise: find the page, modify it **in place**, write it back — *random* I/O, page-at-a-time (change 100 bytes, rewrite 8 KB — write amplification), with page splits when full and fragmentation over time. The WAL absorbs the durability cost, and the buffer pool absorbs repeat touches, but fundamentally the B-tree spends write performance to buy read performance and ordering.

Home turf: the OLTP row stores — Postgres, MySQL/InnoDB, SQL Server, Oracle — where reads dominate, range queries matter, and per-row latency is king.

## LSM-trees: never update anything, optimize for writes

The log-structured merge tree refuses random writes entirely:

1. Writes go to the WAL (durability) and an in-memory sorted structure (**memtable**).
2. When full, the memtable flushes to disk as an **immutable sorted file** (SSTable) — one big *sequential* write.
3. Background **compaction** merges SSTables, discarding overwritten values and tombstoned deletes.

Writes are memory-speed plus sequential flushes — LSM engines ingest at rates B-trees can't approach, and immutable sorted files compress beautifully (columnar-ish runs of similar data), often halving storage. The bill lands on reads: a key might live in the memtable *or any of a dozen SSTables*, so reads consult several files — mitigated by **Bloom filters** (per-SSTable "definitely not here" checks that make misses cheap) and per-file indexes, but a point read still costs more than a B-tree's.

**Compaction is the whole game operationally.** It's a permanent background workload rewriting your data — and the engine's tuning surface is really one triangle: **write amplification** (bytes rewritten per byte ingested — leveled compaction rewrites aggressively), **read amplification** (files consulted per read — size-tiered lets files pile up), **space amplification** (dead data awaiting compaction — size-tiered can briefly need 2× disk). Pick any two, pay the third; "leveled vs. size-tiered compaction" is just choosing which corner to pay. When ingest outruns compaction, engines **stall writes** on purpose (RocksDB's write stalls, Cassandra's climbing pending-compactions) — the database is fine, the *debt collector* is behind, and every LSM operator eventually learns to graph that debt.

Home turf: RocksDB/LevelDB (the embedded engine inside half of modern infra), Cassandra/ScyllaDB, HBase, InfluxDB — write-heavy, append-mostly workloads: [metrics, logs](../case-studies/metrics-system.md), events, feeds.

## The scorecard

| | B-tree | LSM-tree |
|---|---|---|
| Write path | random, in-place, page-granular | sequential, append-only |
| Write throughput | good | **exceptional** |
| Point read | **1 tree walk, predictable** | memtable + N files (Bloom-mitigated) |
| Range scan | **native, in-order pages** | merge across files (fine, costlier) |
| Background work | vacuum/defrag (modest) | **compaction (a lifestyle)** |
| Compression | moderate | **strong** (immutable sorted runs) |
| Latency character | steady | fast p50, compaction-sensitive tail |
| Canonical homes | Postgres, MySQL, SQL Server | RocksDB, Cassandra, HBase |

One honest nuance for the tail-latency row: a B-tree's checkpoint storms and a LSM's compaction spikes are the same genre of problem — background I/O colliding with foreground work — and both are tuned, not eliminated.

## Indexes: buying reads with writes, retail

An index is a **redundant, differently-ordered copy** of part of your data — usually itself a B-tree keyed on the indexed columns pointing back at rows. That framing makes every trade-off obvious:

- Each index turns one logical write into N physical structure updates — a table with six indexes pays a **7× write tax** (heap + 6 trees). "Why is this insert slow?" starts with `\di`.
- **Composite indexes** serve queries matching their *leftmost prefix* — `(user_id, created_at)` accelerates "this user's recent orders" perfectly, and does nothing for queries on `created_at` alone. Design indexes from your query list, not your column list.
- **Covering indexes** (all selected columns present in the index) let the engine skip the table entirely — index-only scans are the difference between "fast" and "instant" for hot list queries, and the mechanical trick behind feed-style pagination at scale.
- The optimizer only helps if statistics are fresh, and it can only choose among indexes that exist: `EXPLAIN` fluency is the cheapest database superpower there is.

LSM engines complicate secondary indexing (the copy must also be log-structured, often eventually-consistent with the base — Cassandra's secondary indexes' checkered reputation) — one reason wide-column data modeling *denormalizes into query-shaped tables* instead ([NoSQL page](nosql.md)).

!!! ops "DevOps lens"
    The storage engine is a background-workload generator, and the background is what pages you. Watch: **compaction/vacuum debt** (pending compactions, dead-tuple counts — Postgres autovacuum falling behind on a hot table is a slow-motion outage: bloat grows, queries crawl, and in the pathological case XID wraparound looms), **write stalls** (RocksDB/Cassandra flush + compaction saturation — ingest "mysteriously" plateaus while CPU looks idle and the disk is 100% busy), **checkpoint/fsync spikes** (p99 heartbeats aligned suspiciously with checkpoint intervals), and **disk headroom** — LSM space amplification means "70% full" can be one big compaction away from "full," and a full disk stops the WAL, which stops *everything*. Rule of thumb worth stating in reviews: an LSM store wants ~30–50% free disk as working room, and any database's real memory requirement is "hot set fits in page cache/buffer pool" — the day the working set outgrows RAM, latency doesn't degrade, it *cliffs*.

!!! staff "Staff+ altitude"
    Engine choice is workload economics: **choosing a database is choosing an amplification profile and a background-maintenance bill.** Markers: (1) *Match amplification to the workload's shape* — telemetry ingest on a B-tree store is paying premium read-optimization for data you'll scan once in aggregate (that's why purpose-built TSDBs are LSM under the hood); a read-dominant product catalog on an LSM store pays compaction forever for write speed it never uses. (2) *Count the indexes in design review* — every "let's also index that" is a permanent write tax and cache dilution; Staff review asks for the *query list* that justifies each. (3) *Storage engines as cost levers at fleet scale* — LSM compression routinely halves storage spend for log/event data; B-tree read efficiency halves CPU for read-heavy OLTP; at petabyte or million-QPS scale these are seven-figure line items hiding inside an "implementation detail." (4) Know that engines are swappable *in principle* (MySQL's pluggable engines, Postgres table AMs, MyRocks at Facebook — a B-tree→LSM swap that cut storage in half) but treat a swap as a migration project with rehearsed rollback, never a config flip.

!!! interview "In the interview"
    This page is your depth reserve — deploy it when the conversation touches *why*. **"Why is Cassandra fast at writes?"** → "LSM engine: writes are a memtable insert plus sequential WAL append; no page is ever updated in place. The bill is read amplification — Bloom filters and compaction keep it survivable." **"What actually happens on an INSERT in Postgres?"** → "WAL append + fsync at commit — that's durability; the heap page and each index update happen in the buffer pool and flush lazily at checkpoints; crash recovery replays the WAL." **"Why is my write-heavy table slow?"** → "Count the indexes — each is a full extra write; then check autovacuum/compaction debt." And the framing sentence that elevates any storage answer: *"this is a B-tree vs. LSM question — read-optimized in-place updates versus write-optimized append-and-compact — and this workload wants the latter."* Interviewers hear product names all day; structure names are how you sound like the person who could *build* the product.

**Next:** [SQL at scale](sql-at-scale.md) — how far one boring relational database actually goes, and the craft of keeping it boring.
