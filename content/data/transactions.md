# Transactions & Isolation

The transaction is the most audacious abstraction in databases: *"run these five operations; either all of them happen or none of them do, and no one else ever sees the in-between."* On hardware that can lose power mid-sector-write, serving thousands of concurrent sessions, that promise borders on outrageous — and the machinery that keeps it is worth knowing precisely, because the promise has *fine print*, and the fine print (isolation levels) is where real money bugs live. Most engineers are running at a weaker level than they believe; most "impossible" data corruption is an anomaly the chosen level explicitly permits.

## ACID, precisely

- **Atomicity** — all or nothing, enforced by the [WAL](storage-engines.md) and undo machinery: crash mid-transaction and recovery erases the partial work. Note what atomicity does *not* mean: anything about concurrency (that's I).
- **Consistency** — the odd letter out: it's *your* invariants ("balances never negative," "every order has a customer"), which the database helps enforce (constraints, foreign keys) but fundamentally *you* define. C is a promise about your app, aided by A, I, and D.
- **Isolation** — concurrent transactions don't trample each other. The interesting letter; the rest of this page.
- **Durability** — committed means fsync'd to the WAL (and, if you read [replication](replication.md), you know single-node durability is only as good as the node — sync replication extends D across machines).

## The anomaly zoo (with money attached)

Isolation levels are defined by which of these they permit. Learn them as *incidents*, not definitions:

- **Dirty read** — you read uncommitted work that then rolls back: you made a decision based on data that *never existed*.
- **Non-repeatable read** — same row, twice, different answers within one transaction: your invariant check and your update saw different worlds.
- **Phantom** — your `WHERE` clause matches a *new* row the second time: "no bookings overlap" was true when checked, false when committed.
- **Lost update** — read-modify-write × 2 concurrent: both read balance 100, both write their version, one deposit evaporates.
- **Write skew** — the subtle one, and the interview differentiator. Two on-call doctors each check "is anyone else on call?" — yes, the *other* one — and both go off duty. Each transaction was individually correct; **together they broke an invariant neither touched directly**, because each wrote a *different* row based on reading a shared condition. Snapshot isolation permits this. Most engineers have never heard of it. Payment limit checks, inventory thresholds, and booking constraints are write skew farms.

## The isolation ladder

| Level | Dirty read | Non-repeatable | Phantom | Write skew | Notes |
|---|---|---|---|---|---|
| Read uncommitted | ✗ possible | ✗ | ✗ | ✗ | effectively unused |
| **Read committed** | ✓ prevented | ✗ | ✗ | ✗ | **Postgres default** |
| **Snapshot / repeatable read** | ✓ | ✓ | mostly ✓ | **✗ permitted** | **MySQL-InnoDB default**; PG's REPEATABLE READ is true snapshot |
| Serializable | ✓ | ✓ | ✓ | ✓ prevented | equivalent to some serial order |

Two sentences worth memorizing verbatim: **"Postgres defaults to read committed, MySQL to repeatable read — most teams have never chosen their isolation level, only inherited it."** And: **"Snapshot isolation prevents every anomaly people can easily name, and permits the one they can't — write skew."**

## MVCC: how reads stopped blocking writes

Modern engines implement all this with **multi-version concurrency control**: writes create *new versions* of rows (stamped with transaction IDs) rather than overwriting; each transaction reads the version-set visible to its snapshot. Readers never block writers, writers never block readers — the concurrency miracle that made interactive databases pleasant.

The bill, which operators pay: **old versions accumulate** until no live snapshot needs them — Postgres's dead tuples awaiting [vacuum](sql-at-scale.md), InnoDB's undo log growth. Which yields the operational commandment: **long-running transactions are toxic** — a forgotten `idle in transaction` session or an 8-hour analytics query pins the version horizon fleet-wide: vacuum can't clean, bloat grows, replicas' apply may stall, and eventually you page someone. The fix is cultural + mechanical: statement/transaction timeouts by default, analytics on a [replica](replication.md), and an alert on transaction age.

## Locking: the explicit tools

MVCC handles reads; *conflicting writes* still serialize via row locks. Your toolkit:

- **`SELECT ... FOR UPDATE`** — pessimistic: lock the rows your decision depends on, *then* decide and write. The direct cure for lost updates and check-then-act races ("read balance, verify, deduct" holds the row throughout). Cost: contention — hot rows queue.
- **Optimistic concurrency** — read version, compute, `UPDATE ... WHERE id=? AND version=?`; zero rows updated = someone won the race, so retry. No locks held during think-time; ideal for low contention or user-mediated edits (the web form pattern). Under high contention it degrades into a retry storm — pessimism wins there.
- **Deadlocks** — two transactions, opposite lock orders, forever. Databases detect and kill one (you get an error: **retry it**; deadlock-retry loops are mandatory hygiene, not optional polish). Prevention: touch rows in a consistent global order (sort IDs before updating in bulk).
- **`SKIP LOCKED`** — the hidden gem: `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 10` turns a plain table into a **concurrent job queue** — workers grab unclaimed rows without queueing behind each other. Postgres-backed job systems are built on exactly this; deploying the phrase in an interview signals real practitioner depth.

**Serializable in practice:** Postgres's SSI detects dangerous read-write patterns and *aborts* one transaction (serialization failures are, again, retried, not feared); the overhead is modest for most workloads. The grown-up guidance: **money paths and invariant-critical operations run serializable (or explicit `FOR UPDATE`) with retry loops; bulk read paths stay at read committed.** Isolation is chosen *per operation class*, not per database.

And the last line of defense, always: **constraints**. A unique index on `(account_id, idempotency_key)` or a `CHECK (balance >= 0)` catches the race your application logic missed — when the app's check-then-act loses, the constraint turns silent corruption into a loud, retryable error. Belt, meet suspenders.

!!! ops "DevOps lens"
    The transaction layer pages you through four graphs: **transaction age** (anything alive > minutes is a suspect; `idle in transaction` is the app leaking transactions — usually an ORM session left open around an HTTP call), **lock waits** (a spiking `pg_locks` queue means everyone is stacked behind one transaction — find the head of the convoy, it's often a migration without a [lock timeout](sql-at-scale.md)), **deadlock rate** (a sudden genre-change in deadlock logs usually follows a deploy that reordered updates), and **bloat/undo growth** (MVCC's bill arriving). The incident shapes: the *convoy* (one slow lock-holder, everything queued — kill the head, not the queue), the *retry-storm* (serialization failures retried without backoff amplifying contention), and the *invisible-transaction* (connection pool in transaction mode + app bug = every pooled connection permanently mid-transaction; vacuum horizon frozen fleet-wide). Timeouts on statements, transactions, and lock-waits are the guardrails that convert all three from outages into blips.

!!! staff "Staff+ altitude"
    Markers: (1) **Make isolation an explicit, documented choice** — a one-page "concurrency contract" per critical flow (level, locking pattern, retry policy, invariant constraints) turns folklore into reviewable engineering; the audit question "what's our isolation level and who chose it?" has a depressing default answer at most companies, and fixing that is cheap altitude. (2) **Design invariants toward single rows** — write skew lives where invariants *span* rows; schema that materializes the invariant into one place (an `on_call_count` row updated transactionally, a uniqueness constraint) converts subtle anomalies into ordinary conflicts. This is the single-node ancestor of [aggregate-boundary design](distributed-transactions.md). (3) **Retry loops are architecture** — serializable + optimistic approaches only work if *every* caller retries with backoff; that belongs in the shared data-access layer, not in 40 teams' good intentions. (4) Money flows get the full stack: serializable/`FOR UPDATE`, constraints, idempotency keys, *and* [reconciliation](distributed-transactions.md) — defense in depth because each layer catches the others' misses.

!!! interview "In the interview"
    The write-skew story is your differentiator — tell it in twenty seconds (two doctors, each checks the other is on call, both leave; snapshot isolation permits it because each wrote a different row than they read) and you've demonstrated depth 95% of candidates lack; then land the fix menu: serializable, or `FOR UPDATE` the read-set, or materialize the invariant into a constrained row. Other set pieces: the **lost-update walk** (read-modify-write race → optimistic version-check vs. pessimistic `FOR UPDATE`, chosen by contention level); the **defaults line** (Postgres RC, MySQL RR — "which anomalies is *your* app inheriting?"); and **`SKIP LOCKED`** when queues-on-a-database comes up. Expected probes: *"how do you stop double-spending?"* (lock or serialize the balance check + unique idempotency key + constraint as backstop — layered, not either/or); *"why not run everything serializable?"* (retry rates and throughput under contention; choose per operation class); *"what happens to these two concurrent transfers?"* (walk it level by level — the interviewer is checking you know what the *default* would silently allow).

**Next:** [Distributed transactions](distributed-transactions.md) — when the transaction has to span two shards, or a database and a queue, and the single-node miracle dies.
