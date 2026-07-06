# The NoSQL Landscape

"NoSQL" was never a technology — it's a *negotiating position*. Each family looks at the relational contract (arbitrary queries, joins, transactions, one schema, one node's worth of consistency) and **refuses a clause** to buy a scaling property the relational model couldn't sell. Organize the zoo by *what each family refuses* and the landscape snaps into focus — and "SQL vs. NoSQL," the shallowest question in interviews, becomes an occasion to sound like the person who's operated all of it.

## The four refusals

**Key-value stores refuse queries.** Redis, DynamoDB-as-KV, etcd: `get(key)`, `put(key, value)`, and that's the API. What that austerity buys: *perfect partitionability* (every operation names its key → its shard; nothing ever spans two) and *flat, predictable latency* at any scale. The trade is total: no secondary access paths — if you need "all orders over $100," you needed a different tool or a [secondary index you maintain yourself](partitioning.md). KV is the bedrock layer: sessions, carts, feature flags, counters, [caches](../caching/redis.md), [rate limiters](../distributed/rate-limiting.md).

**Document stores refuse the fixed schema and the join.** MongoDB, CouchDB: store the whole aggregate — the order *with* its line items, addresses, and status history — as one nested document, read and written as a unit. Buys: locality (one read fetches the whole aggregate), developer velocity (the document mirrors the application object), per-document atomicity that covers most real needs. Refuses: cross-aggregate joins (fan-out in app code), and — the honest caveat — the schema didn't disappear, it *moved into your application code*, where every historical document version lives forever unless you migrate it. "Schemaless" means "the schema is now your problem at read time."

**Wide-column stores refuse cross-partition anything.** Cassandra, ScyllaDB, HBase, Bigtable: data lives in **partitions** (hash of partition key → node) and, within a partition, rows sit **physically sorted by clustering columns**. Queries that name a partition key and walk a clustering range are effectively free at any scale — *and nearly everything else is forbidden or a full-cluster scan*. This is the LSM engine ([storage engines](storage-engines.md)) wearing a data model: ingest-anything write speed, linear horizontal scale, multi-datacenter replication as a first-class feature. The price is the modeling inversion below, plus the operational folklore (tombstones!) in the ops callout.

**Graph databases refuse per-hop join cost.** Neo4j, Neptune: relationships are first-class stored adjacencies, so traversing "friends of friends who like X" costs proportional to *edges touched*, not to table sizes joined. When relationship depth ≥ 3 is your core access pattern (fraud rings, social graphs, dependency analysis), nothing else competes; when it isn't, a graph DB is an exotic way to store rows.

## The Dynamo story (read it as a thriller)

In 2007 Amazon published the paper that reorganized the industry, and its plot is one stubborn business commitment followed to its logical conclusion: **the shopping cart must never refuse a write** — not during node failures, not during network partitions, not on Black Friday. Choosing availability that fiercely ([CAP](../foundations/cap-pacelc.md): AP, with conviction) forced every exotic mechanism the paper is famous for: **consistent hashing** (no central router to fail — [partitioning](partitioning.md)), **sloppy quorums + hinted handoff** (if a key's home nodes are down, *neighbors accept the write on their behalf* and deliver it later — refusal averted), **vector clocks** (two sides of a partition both accepted writes; someone must detect the conflict), **application-level merge** (the cart resolves conflicts by *union* — resurrect a deleted item rather than lose an added one; wrongness chosen deliberately, in the safe direction), **read repair + Merkle-tree anti-entropy** (convergence as a background process), **gossip** (membership without a master). Every mechanism is the availability commitment paying another installment. That's the deep lesson — *pick the guarantee that is sacred, and let the architecture be its consequence* — and it's a better interview sentence than any product name.

Lineage footnotes worth knowing: **Cassandra** = Dynamo's distribution + Bigtable's data model (that's why it gossips *and* has clustering columns). **DynamoDB the product** ≠ Dynamo the paper — the managed service is a different system (single-digit-ms SLA, adaptive capacity, optional strong reads and transactions) wearing the ancestral name.

## The modeling inversion: queries first

The practical skill that decides success with NoSQL, and the thing teams most often learn *after* migrating:

- **Relational:** model the data's *nature* (normalize entities and relationships) → query anything later. Flexibility is the product.
- **NoSQL:** enumerate the *queries* → build one physical structure per query, denormalized to answer it in one partition read. The access-pattern list is the schema.

Cassandra-flavored example — requirement: "user's timeline, newest first" →

```sql
CREATE TABLE timeline_by_user (
  user_id     uuid,
  posted_at   timeuuid,
  post_id     uuid,
  author_id   uuid,
  body        text,
  PRIMARY KEY ((user_id), posted_at)
) WITH CLUSTERING ORDER BY (posted_at DESC);
```

One partition per user, rows pre-sorted newest-first: the query is a sequential read of one partition prefix. Need "posts by author" too? **Build a second table and write both** — storage is cheap, cross-partition queries are not; duplication *is* the design ([the read-path/write-path trade](../foundations/thinking-in-systems.md), in DDL form). DynamoDB's single-table design and GSIs are the same inversion with different spelling — and GSIs come with their own fine print (async propagation, separate throttling) that bites exactly like a lagging replica.

If you cannot enumerate the queries — genuinely exploratory, ad-hoc, report-shaped access — that *is* the relational use case, and choosing NoSQL there means reimplementing a query planner badly in application code, one Jira ticket at a time.

## The pendulum swings back: NewSQL

The industry's decade-long arc completes: Spanner, CockroachDB, YugabyteDB, Vitess-fronted MySQL, and distributed-ish Aurora offer **SQL, transactions, and horizontal scale** — by paying the [coordination costs](../foundations/cap-pacelc.md) (consensus per write, cross-region commit latency, sophisticated operations) that NoSQL refused, with engineering that makes the bill payable. The honest summary of twenty years: *transactions and SQL were features, not bugs; NoSQL was the industry discovering which features it could live without, and NewSQL is buying some of them back at coordination prices.* In interviews, that one sentence of historical arc marks more seniority than any feature comparison.

!!! ops "DevOps lens"
    Each family has signature incidents; recognizing them is the ops literacy interviewers can't fake-detect. **Cassandra:** *tombstone storms* — deletes are writes (markers that mask data until compaction), so delete-heavy patterns (the infamous "queue in Cassandra" anti-pattern) make reads scan thousands of tombstones per row: latency climbs, `TombstoneOverwhelmingException`, tears. Plus *repair discipline* — anti-entropy repair must run within `gc_grace_seconds` or deleted data resurrects; unrepaired clusters are quietly diverging. **DynamoDB:** *hot-partition throttling* — capacity is per-partition, so one viral key throttles while the table average looks idle (adaptive capacity helps, doesn't repeal physics); watch per-key metrics, not table metrics. **MongoDB:** primary elections during network wobbles → write pauses and (mis-configured `w:1`) rollback of acknowledged writes — write concern *is* your durability contract, read it. **Everywhere:** these systems' background processes (compaction, repair, rebalancing) are the workload — schedule them, meter them, and never let "the database is idle" fool you about disk I/O headroom.

!!! staff "Staff+ altitude"
    Polyglot persistence is a *portfolio with carrying costs*: every store you adopt is a permanent line item of backups, monitoring, upgrade treadmill, security review, capacity planning, and 3 a.m. expertise — so the Staff default is **relational until a named access pattern demands otherwise**, and each exception must arrive with its query list attached (the modeling inversion, used as a governance gate: "no access patterns enumerated, no NoSQL"). Second marker: **migrations between models are rewrites, not lifts** — schema-on-read to schema-on-write (or joins to denormalization) changes application logic, so the "we'll start on Mongo and move to Postgres when we need transactions" plan is two products, not one decision deferred. Third: at organizational scale, pick the *blessed few* — one relational, one KV/cache, one queue, object storage — and make the paved road so good that exotic choices need a written waiver; every additional store is Conway's law invoiced monthly.

!!! interview "In the interview"
    Never answer "SQL or NoSQL?" in the abstract — answer **per access pattern**: *"User and order data: relational — transactional, relational, ad-hoc-queried. Sessions and rate limits: KV. The activity feed: wide-column, one table per query, because it's a single-partition range read at any scale. If we need friends-of-friends fraud checks, that's the one graph-shaped pattern — and I'd start it as SQL joins until depth proves otherwise."* Depth nuggets to deploy when probed: the **Dynamo narrative** (availability commitment → sloppy quorums → merge-by-union — thirty seconds, enormous signal); **tombstones** for "any downsides to Cassandra?"; **hot partitions** for "any downsides to DynamoDB?"; and the **pendulum sentence** when NewSQL comes up. The anti-signal to avoid: choosing by adjective ("we want scale, so NoSQL") — scale is a property of *the access pattern's partitionability*, and saying so is the whole game.

**Next:** [Replication](replication.md) — the machinery of copies: who leads, who lags, and what gets lost when the music stops.
