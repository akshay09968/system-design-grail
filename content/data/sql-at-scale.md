# SQL at Scale

The best-kept secret in system design: most companies never outgrow one well-run relational database, and most "we had to leave Postgres" stories are really "we never learned to run it" stories. GitHub, Shopify, Stripe, and Basecamp built empires on relational cores. Interviewers know this, and a candidate who scales the boring database *in the right order* — instead of stampeding to shards and exotic stores — reads as someone who has paid for infrastructure with real money and real sleep.

This page is that order: the escalation ladder, then the two operational crafts (failover and zero-downtime migrations) that turn "we use Postgres" into "we run Postgres."

## The scaling ladder

Climb only as far as the pain requires. Each rung is cheaper, safer, and more reversible than the one after it.

**1. Do less work.** Before any architecture: `EXPLAIN` the slow queries, kill the N+1s the ORM manufactures, add the *right* indexes (and delete the write-tax ones nobody uses — [storage engines](storage-engines.md)), paginate by cursor instead of `OFFSET 500000`. It is embarrassing how many "database scaling crises" are three missing indexes and one greedy endpoint. This rung has bought more headroom than every other rung combined.

**2. Pool connections.** Postgres connections are expensive — historically a process each, with per-connection memory — so a thousand microservice pods opening ten connections apiece will kneecap a database that could otherwise handle 10× the load. **PgBouncer** (or RDS Proxy) multiplexes thousands of client connections onto tens of real ones. Know the fine print: *transaction pooling* (the aggressive, useful mode) breaks session state — prepared statements, advisory locks, `SET` — which is a classic gotcha deploy. Size the real pool with [Little's law](../foundations/latency-throughput.md), not vibes.

**3. Cache in front.** The [whole next section](../caching/index.md); one sentence here: every read the cache absorbs is a read the ladder never has to scale.

**4. Read replicas.** Stream the WAL to N followers; route reads to them. Cheap, native, effective for read-heavy loads — with the two truths you must say aloud: replication is **async by default** (lag exists; [read-your-writes](../foundations/consistency-models.md) needs leader-reads or LSN tokens) and **replicas don't help writes** at all. Bonus uses that operators love: point analytics and backups at a replica so they stop mugging production.

**5. Scale up, honestly.** A big NVMe box with the working set in RAM carries astonishing load ([scalability](../foundations/scalability.md)). Buying two years of runway with a hardware order is often the highest-ROI architecture decision available, precisely *because* it costs zero complexity.

**6. Partition tables (not the database).** Native table partitioning (by time, usually) — old partitions drop instantly (`DROP` vs. months of `DELETE` + vacuum agony), indexes stay small, queries prune. This is data lifecycle management, and it's the correct answer for "the events table is 4 TB," which is a different problem than "the database is out of capacity."

**7. Split by function.** Move a bounded context — analytics via [CDC](analytics.md), then maybe orders or audit logs — to its own database. You're buying isolation and independent scaling at the price of cross-database joins and [distributed transactions](distributed-transactions.md). This is the Y-axis of the scale cube, and it's where data architecture starts being organizational architecture.

**8. Shard.** The last rung, deliberately: application-level or via Vitess/Citus-class middleware. Full treatment (and full warning label) on the [partitioning page](partitioning.md). If you reached this rung with rungs 1–7 genuinely exhausted, you're a company with a very good problem.

## Failover: the ten seconds that define your database team

High availability for a leader-based database is a *rehearsed procedure*, not a checkbox:

1. **Detect** — the primary is unreachable... or just slow? GC pause? Network blip? Declaring death too eagerly causes flapping; too lazily burns your [MTTR](../foundations/reliability-availability.md). Real systems use quorum-based detection (Patroni over etcd/Consul) so one observer's netsplit doesn't trigger chaos.
2. **Fence the old primary.** *The* step amateurs skip. If the old leader is alive-but-partitioned and still accepting writes while a new leader is promoted, you have **split brain** — two divergent histories, and reconciling them is somewhere between painful and impossible. Fencing = making the old primary *provably unable* to serve: kill it (STONITH), revoke its storage/VIP, or rely on consensus-held leader leases ([coordination](../distributed/coordination.md)).
3. **Promote** the most-caught-up replica — and here async replication presents its bill: any WAL not yet shipped is **lost**. Your replication mode *is* your RPO: async = seconds of loss possible; synchronous standby = zero loss but every commit pays a replica round-trip and stalls if the standby dies (the usual compromise: one sync standby + several async, or quorum-sync).
4. **Redirect clients** — VIP flip, DNS (with the [TTL honesty problem](../networking/dns.md)), or proxy/pooler re-pointing; then watch the reconnection stampede hit cold caches.

Managed offerings (RDS Multi-AZ, Cloud SQL HA) buy you this procedure pre-rehearsed at ~30–120 s of failover blackout. What they don't buy: your application's behavior *during* the blackout — connection handling, retry discipline, idempotency — which remains, forever, your design problem. That's what interviewers are really probing with "what happens when the primary dies?"

## Zero-downtime schema migrations: the expand–contract craft

Nothing marks operational maturity like changing a schema under live traffic. Naive `ALTER TABLE` takes locks that queue behind long transactions — and every query then queues behind *the lock*: a one-line migration becomes a total outage. The universal discipline is **expand–contract**:

1. **Expand** — add the new (nullable column, new table, new index `CONCURRENTLY`) alongside the old. Nothing reads it yet; deploys stay reversible.
2. **Migrate** — dual-write old + new from the application; **backfill** history in small batches (throttled, resumable — a backfill that saturates the WAL is how migrations create replica-lag incidents).
3. **Switch reads** to the new shape, behind a flag, watching metrics.
4. **Contract** — after soak time: stop old writes, drop old structures. This step happens a deploy (or a month) later, never the same day.

Plus the local fine print: lock-timeouts on every DDL (`lock_timeout = 2s` — fail the migration, not production), `CREATE INDEX CONCURRENTLY`, and MySQL's external tools (gh-ost, pt-online-schema-change) doing shadow-table dances where the engine can't. And the meta-rule that makes it a *system*: schema migrations ship through the [same pipeline as code](../devops/cicd.md) — reviewed, staged, canaried, and rollback-planned, because a migration is a deploy whose blast radius is every service that touches the table.

!!! ops "DevOps lens"
    Four graphs run a relational database: **connections** (by state — a pile of `idle in transaction` is an app bug strangling the pooler), **replication lag** (bytes *and* seconds; alert before your RPO promise, not after — and remember the nightly batch job that "causes" lag every 02:00 is a design smell, not a mystery), **bloat & autovacuum** (dead tuples climbing on a hot table = vacuum losing; the endgame — XID wraparound — is the rare genuinely existential database emergency), and **slow queries** (`pg_stat_statements` — the top-3 by total time page is where rung 1 lives). Incident genres to recognize on sight: the *post-deploy connection storm* (new pods × pool size > max_connections), the *lock queue* (everything waiting on one `ALTER`), the *replica-lag read-your-writes bug spike* after traffic shifts, and the *backup that was never restore-tested* — a backup is a hope until a restore drill makes it a fact. RPO/RTO aren't numbers you write down; they're numbers you *demonstrate* quarterly.

!!! staff "Staff+ altitude"
    The Staff position on relational scale is the **boring-technology thesis, argued with numbers**: every rung of the ladder deferred is complexity-interest not paid — sharding prematurely means paying resharding, cross-shard queries, and two-store expertise *now* against load that may never come, which is why "we'll shard when rung 5's hardware curve crosses rung 8's engineering cost" is a defensible written position. Adjacent altitude markers: (1) **Buy vs. run** — managed databases trade ~20–40% price premium for a rehearsed failover and patching program; below a dedicated DB team's scale that's usually the right buy, and *saying when it stops being right* (egress costs, extension needs, fleet size) is the Staff version of the answer. (2) **Database boundaries are team boundaries** — the shared database is the org's real coupling: every schema change needs N teams' sign-off ([Conway again](../networking/apis.md)); one-database-per-service buys autonomy and pays in [distributed transactions](distributed-transactions.md) — choose per boundary, in writing. (3) **Migrations as a paved road** — at 50 engineers, schema-change safety can't be tribal knowledge; it's tooling (linted migrations, automatic lock-timeout injection, backfill frameworks) that a platform team ships once.

!!! interview "In the interview"
    "Your Postgres is at 100% — what do you do?" is a gift: **walk the ladder in order**, out loud — *"First, EXPLAIN the top queries and check for N+1s; then pooling — a pod fleet can DDoS max_connections; then cache and replicas for reads, noting the read-your-writes caveat; writes still hot? Bigger box buys runway while we partition by time and consider splitting analytics out via CDC. Sharding is the last rung, and here's the shard key I'd be pre-planning."* That answer demonstrates judgment *and* inventory in ninety seconds. Other set pieces to have rehearsed: the **failover walk** (detect via quorum → fence → promote → redirect; async lag = data-loss window; sync = latency tax), and the **expand–contract narration** for "how do you add a column to a 2 TB table?" — the candidate who says "dual-write, batched backfill, flip reads behind a flag, contract later" has ended that line of questioning.

**Next:** [The NoSQL landscape](nosql.md) — what each family refuses, and the shopping-cart paper that reorganized an industry.
