# Replication

Replication is keeping the same data on multiple machines, and it's done for exactly three reasons: **survive failures** (availability/durability), **serve more reads** (scale), and **put data near users** (latency). Every replication scheme ever devised is an answer to one deceptively simple question: **who is allowed to accept writes, and when do we tell the client the truth about durability?** Answer that question three different ways and you get the three architectures of this page.

## Single-leader: the workhorse

One node (leader/primary) accepts all writes and streams its change log to followers; reads can go anywhere. This is Postgres/MySQL replication, MongoDB replica sets, Kafka partitions, Redis primary-replica — the overwhelming default, because it dodges the hardest problem entirely: **no write conflicts can exist if only one node writes.** Ordering is whatever the leader says it is.

What actually travels is the **log** ([the WAL again](storage-engines.md)): physical (byte-level WAL shipping — fast, version-locked) or logical/row-based (decoded changes — flexible, feeds [CDC](analytics.md) and cross-version upgrades). Statement-based replication — replaying SQL text — is the cautionary ancestor: `UPDATE ... SET expires = NOW()` evaluates differently on every replica; nondeterminism made it folklore.

**The sync/async dial is your data-loss contract:**

| Mode | Commit waits for | You get | You pay |
|---|---|---|---|
| Async | leader's disk only | fast commits, unbothered by replica health | **failover loses the un-shipped tail** — RPO > 0 |
| Synchronous | ≥1 replica's ack | zero-loss failover to that replica | +1 RTT per commit; *a dead standby stalls all writes* |
| Semi-sync / quorum (e.g., ack from 1-of-2, or Raft-style majority) | some | the production compromise | modest latency; careful config |

Say the async line in interviews exactly this bluntly: *"async replication means the failover loses whatever hadn't shipped — replication lag **is** the RPO."* The failover *procedure* itself (detect via quorum → **fence the old leader** → promote the most-caught-up → redirect) got full treatment in [SQL at scale](sql-at-scale.md); the concept to carry everywhere is **split brain** — an un-fenced old leader still accepting writes while its successor reigns produces two divergent histories, which is why fencing (leases, STONITH, storage revocation) is non-negotiable and why [consensus systems](../distributed/consensus.md) exist.

**Replica lag** and its user-visible anomalies (vanishing comments, time-traveling reads) are the [consistency models](../foundations/consistency-models.md) page in production form — one operational addendum here: lag's usual causes are mundane and findable (single-threaded apply on the replica fighting a parallel leader; one long transaction; a batch job or backfill flooding the WAL; an under-provisioned replica doing double duty for analytics). Monitor it in **seconds and bytes**, alert before your stated RPO, and treat "the nightly job causes lag every night" as a design bug, not weather.

## Multi-leader: writes everywhere, conflicts always

Multiple nodes accept writes and replicate to each other — asynchronously, because synchronously you'd have built expensive single-leader. Legitimate habitats: **multi-region write locality** (each region writes locally, syncs cross-region), **offline-first clients** (your phone's calendar is a leader that syncs later), **collaborative editing** (every cursor is a writer).

The structural truth: **conflicts are not an edge case here; they're the steady state.** Two leaders accepted incompatible writes *by design*; now someone must merge:

- **Last-write-wins** — simple, silently *discards* one write, and "last" depends on [whose clock](../distributed/time-ordering.md) you believe. Acceptable for presence flags; quietly corrupting for anything you'd miss.
- **Per-field / application merge** — Dynamo's cart-union move: merge in the business domain, err in the safe direction ([NoSQL page](nosql.md)).
- **CRDTs** — data structures (counters, sets, sequences) whose merges are mathematically commutative/convergent; the principled core of collaborative apps (Figma-class editors, Riak data types).

The senior advice, stated plainly: multi-leader is a *specialist tool*. For "we need writes in every region," the pragmatic pattern that usually wins is **regional homing** — single-leader *per tenant/user*, with each tenant's home region owning their writes (US users' leader in Virginia, EU users' in Frankfurt): write locality achieved, conflicts structurally impossible, and [data-residency law](../devops/multi-region.md) accidentally satisfied. Reach for true multi-leader only when *the same datum* genuinely must accept writes in multiple places — then budget the merge as a first-class feature.

## Leaderless: nobody's in charge, and that's the feature

Dynamo-style ([Cassandra, Riak](nosql.md)): clients write to **W** of N replicas and read from **R**, with **R + W > N** for overlap ([quorum math](../foundations/consistency-models.md)). No leader means **no failover drama at all** — a node dying is not an *event*, just a quorum member absent; availability is smooth, symmetric, beautiful. The machinery that makes convergence real: **sloppy quorums + hinted handoff** (neighbors cover for the dead, deliver later), **read repair** (fix stale replicas on the read path), **anti-entropy** (Merkle-tree background sync), versioning (vector clocks or per-cell timestamps) to detect concurrent writes — whose *resolution* is still LWW-or-merge, same menu as multi-leader, because leaderless is multi-leader with statistics instead of hierarchy.

## The scorecard

| | Single-leader | Multi-leader | Leaderless |
|---|---|---|---|
| Write conflicts | impossible | **the steady state** | on concurrency (quorum overlap detects) |
| Failover | a *procedure* (fence! promote!) | none needed per-region | **not a concept** |
| Write latency | 1 node (+sync cost) | local region | W-of-N parallel |
| Consistency ceiling | linearizable (with care) | eventual + merge | tunable, eventual-ish |
| Operational drama | concentrated in failover | concentrated in conflicts | spread thin (repair discipline) |
| Default habitat | almost everything | geo-write / offline / collab | high-availability KV at scale |

!!! ops "DevOps lens"
    Replication's operational commandments: (1) **Lag is a first-class SLO** — dashboard in seconds *and* bytes, alarmed against the RPO your business thinks it has. (2) **Semi-sync needs a failure story** — the mode that "can't lose data" stalls every commit when its standby dies; know whether yours degrades to async (data-loss window returns, silently) or blocks (availability gone), because that toggle *is* your CAP position in a config file. (3) **Replicas are not backups.** Replication faithfully copies your `DELETE FROM users` at light speed to every copy; backups + PITR protect against yesterday's mistake, replicas only against hardware. Say this in any DR conversation and watch operators nod. (4) **Failover is rehearsed, quarterly** — an untested promotion runbook is a hypothesis; game-day it. (5) Watch the *replication storm* genre: schema changes, backfills, and compaction all multiply log volume; the replica that lags every deploy is telling you your change pipeline and your RPO are coupled.

!!! staff "Staff+ altitude"
    Markers: (1) **RPO/RTO as written business contracts** — "async with ~2 s typical lag: we may lose seconds of acknowledged writes in a leader failure; here's the annual probability and the alternative's latency bill" is a paragraph a Staff engineer writes for product leadership *before* the incident, converting a technical dial into an informed business bet. (2) **Regional homing over multi-leader** as the default answer to write-locality asks — conflicts avoided by *assignment* beat conflicts resolved by *cleverness*; keep true multi-leader for the narrow collab/offline domains where it's structural, and insist those arrive with a merge design attached. (3) **Topology reviews look for the un-replicated thing** — the "highly available" system whose leader database spans three AZs while its *lock service, config store, or ID generator* quietly lives on one node; replication reviews are dependency-graph reviews. (4) Know the exotic option exists — chain replication, witness replicas, log-as-a-service (Aurora-style storage-level replication) — so "why not" has an answer, not a shrug.

!!! interview "In the interview"
    The reliable set pieces: **"What happens when the primary dies?"** → the four-beat walk (quorum detection → fencing, *with the split-brain explanation* → promote most-caught-up → redirect), closed with "and async lag is our data-loss window — if RPO must be zero, we pay a sync standby's latency." **"Users in Europe complain writes are slow"** → regional homing before multi-leader, with the conflict rationale. **"How does Cassandra survive node loss so smoothly?"** → leaderless has no failover to perform; sloppy quorums + hinted handoff carry the gap, repair reconciles. And when *you're* proposing a design, pre-empt the probe: name the scheme, the sync mode, and the RPO in one sentence — *"single-leader per shard, quorum-sync to one of two standbys: sub-second failover, zero-loss, +2 ms on writes."* Precision there ends replication questioning early, which is exactly what you want — the [next page](partitioning.md) is where the harder follow-ups live.

**Next:** [Partitioning & sharding](partitioning.md) — the least reversible decision in system design, and how to make it like you'll live with it for a decade. (You will.)
