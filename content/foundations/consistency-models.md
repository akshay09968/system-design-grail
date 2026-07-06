# Consistency Models

A user posts a comment, the page refreshes, and the comment is gone. They post it again — now it's there twice. The bug report says "the site ate my comment." Nothing crashed, no error was logged, every service was green. What happened is that their write went to the primary, their next read went to a replica that hadn't heard the news yet, and their double-post landed after replication caught up.

That support ticket is a **consistency model** made visible. Consistency models are contracts about *what reads are allowed to see* in a system where data has more than one copy — and since every scalable system copies data (replicas, caches, CDNs, search indexes), you are always operating under one of these contracts, whether you chose it or it chose you.

## The ladder, strongest to weakest

Each rung down surrenders a guarantee and buys latency, availability, or throughput. The art is knowing the *cheapest rung your data can stand on*.

**Linearizability (single-copy illusion).** Every operation appears to happen atomically at some instant between its start and finish, and once *anyone* sees a write, *everyone* does. The system behaves as if there were exactly one copy. This is what "strong consistency" should mean when people say it precisely. Cost: coordination on the critical path — quorums, leader confirmation, possibly cross-region round trips (the ELC tax from [PACELC](cap-pacelc.md)). Needed for: locks, leader election, unique-username claims, balance checks before withdrawal — anything where two nodes believing different truths causes real damage.

**Sequential consistency.** Everyone agrees on *one* total order of operations, but that order needn't match real time (a write can appear "delayed"). Rarely offered by name in products; useful mostly as the theoretical rung between linearizable and causal.

**Causal consistency (the elegant sweet spot).** Operations that are causally related — you *read* the post, then wrote your comment — are seen by everyone in that order. Concurrent, unrelated operations may be seen in different orders by different observers, and nobody is harmed. Causal is the strongest model achievable without giving up availability during partitions, which makes it something of a theoretical celebrity. Its guarantee is exactly "no comment appears before the post it replies to" — the anomaly ladder's most user-visible rung fixed, at a fraction of linearizability's cost.

**Bounded staleness.** Reads may lag, but by no more than X seconds (or K versions). An honest, monitorable contract — "the dashboard is at most 30 seconds behind" — and often exactly what analytics and feeds actually need.

**Eventual consistency.** If writes stop, replicas converge... eventually. Note what this does *not* promise: nothing about *when*, and nothing about what you see *meanwhile* (reads can go backwards in time as your requests bounce between replicas). Eventual consistency is not a consistency model so much as a truce — and yet, paired with good client-centric guarantees below, it powers most of what you use daily.

## Client-centric guarantees: what users actually notice

Here's the insight that reorganizes the whole topic: **users never observe your replication topology — they observe their own session.** Four session guarantees cover nearly every anomaly a human can perceive:

| Guarantee | Promise | The bug it prevents |
|---|---|---|
| **Read-your-writes** | You always see your own updates | The vanished comment |
| **Monotonic reads** | Your view never moves backwards in time | Refresh shows the comment, refresh again — gone once more |
| **Monotonic writes** | Your writes apply in the order you made them | Profile update #2 overwritten by delayed #1 |
| **Writes-follow-reads** | Your write lands after the data you were looking at | Reply ordered before the post you replied to |

And the mechanisms that buy them — this list is interview gold, because "how do you guarantee read-your-writes behind async replicas?" is a canonical follow-up:

1. **Sticky routing** — pin the session to one replica (or the leader). Simple; breaks on failover and complicates load balancing.
2. **Read-own-data from the leader** — route reads *of the user's own records* to the primary, everything else to replicas. Cheap and surgical; the common production answer.
3. **Causal tokens / LSN fencing** — the write returns a position (log sequence number, timestamp); subsequent reads carry it, and a replica serves the read only if it has replayed past that position (else waits or forwards). This is the elegant general mechanism — read-your-writes without pinning anything.
4. **Client-side patching** — optimistically render the user's own write from local state while replication catches up. The UI *is* part of the consistency architecture; most social apps do this shamelessly.

## Tunable consistency: quorums as a dial

Dynamo-family stores (Cassandra, Scylla, Riak, DynamoDB) expose the contract per operation. With **N** replicas, writes acknowledged by **W**, reads consulting **R**:

> **R + W > N** → every read set overlaps every write set → reads see the latest acknowledged write.

With N=3: W=2, R=2 is the balanced classic (survives one node loss for both reads and writes, overlap guaranteed). W=1, R=1 is fast, available, and can serve stale data (R+W=2 ≤ 3 — no overlap promised). W=3, R=1 makes reads cheap and writes fragile; W=1, R=3 the reverse. Per-query, you choose: `QUORUM` for the account page, `ONE` for the activity feed — the five-rows-one-application pattern from [CAP](cap-pacelc.md), implemented with a keyword.

Fine print that separates real understanding from the formula: **quorum overlap ≠ linearizability** (concurrent writes can still conflict — you also need a resolution story: last-write-wins timestamps, vector clocks, or [CRDTs](../data/nosql.md), plus read repair and anti-entropy sweeps to actually converge), and **sloppy quorums** (accepting writes on stand-in nodes during failures, for availability) temporarily void the overlap guarantee entirely — Dynamo chose exactly that, on purpose, for the shopping cart.

## The confusion that sinks candidates: consistency ≠ isolation

Two vocabularies collide on the word "serializable," and interviewers know it:

- **Isolation levels** (read committed, snapshot, serializable) govern **concurrent transactions interleaving on one copy** of the data — protecting you from *other people's in-flight transactions*. See [transactions & isolation](../data/transactions.md).
- **Consistency models** (this page) govern **multiple copies agreeing** — protecting you from *stale replicas*.

They're orthogonal axes. A single-node Postgres at `SERIALIZABLE` has perfect isolation and no replication consistency question at all; a Cassandra cluster at `QUORUM` has strong-ish replica consistency and *no multi-statement isolation whatsoever*. **Strict serializability** is the crown that requires both: transactions serialize *and* the order respects real time (Spanner's famous claim, purchased with TrueTime's atomic clocks). In an interview, cleanly separating these two axes when everyone else blurs them is a visible level-up — say "that's an isolation question, not a replication question" exactly once, at the right moment, and watch the interviewer's posture change.

!!! ops "DevOps lens"
    Consistency models are invisible until you monitor them. The metrics that matter: **replication lag** (in *both* seconds and bytes — a quiet primary shows 0-second lag while being days of bytes behind after a burst), **read-repair rate and hinted-handoff depth** on Dynamo-family stores (rising = you're living on the weak rungs), and **conflict/discard rates** under last-write-wins (silent data loss has a metric if you export it). The trap with teeth: **async replication lag becomes data loss at failover.** Lag of 30 seconds means promoting the replica erases 30 seconds of acknowledged writes — your consistency model quietly sets your RPO. If you run async replicas, your *real* durability contract is "primary lifetime + lag," and that number belongs on a dashboard, not in a postmortem.

!!! staff "Staff+ altitude"
    Staff-level consistency work is writing the **contract per data class, in product language**: "your own posts appear instantly (read-your-writes via leader reads); others' posts within 5 seconds (bounded staleness); counters are approximate but never decrease (monotonic)." Three altitude markers: (1) that contract is a *product decision* co-owned with PM/design — client-side patching (mechanism 4) is often cheaper than infrastructure and belongs in the conversation; (2) the weakest sufficient model is a *cost lever* — every unneeded linearizable read is coordination you paid for nothing, and at scale that's a line item; (3) beware consistency *regressions by architecture drift* — adding a cache or a read replica to a path silently rewrites the contract, so the contract must live in design review checklists, not tribal memory.

!!! interview "In the interview"
    Open anomalies with a story, not a definition — the vanished comment gets you further than "linearizability" recited. The three probes to be ready for: *"Your feed reads from replicas — how does a user see their own new post?"* (enumerate the four mechanisms; recommend leader-reads-for-own-data or a causal token, and mention the UI patch as the pragmatic layer); *"What consistency does this design actually need?"* (answer per data class, never per system — money linearizable, social causal-ish, counters eventual); *"Cassandra at QUORUM — is that strong consistency?"* (R+W>N gives overlap, not isolation or conflict-freedom; explain LWW risk in one sentence). And keep the isolation/consistency axes separated cleanly — it's the single most reliable depth signal this topic offers.

**Next:** [Back-of-envelope estimation](estimation.md) — the numbers, the recipes, and the worked examples that make capacity math a party trick.
