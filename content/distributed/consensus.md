# Consensus

Consensus is how a group of machines agrees on one thing — one value, one leader, one next entry in a log — despite crashes, delays, and partitions. It sounds academic until you list what "one thing" means in production: *who is the primary right now* ([failover](../data/replication.md)), *is this lock held* ([coordination](coordination.md)), *what's in the cluster config* (Kubernetes' entire worldview), *what's the order of committed transactions* (every NewSQL store). Consensus is the primitive underneath every strongly-consistent promise anyone has ever made you — and you run it in production today whether you know it or not.

## Why it's genuinely hard, in two sentences

In an asynchronous network you [cannot distinguish slow from dead](failure-modes.md), and a famous impossibility result (FLP) says no deterministic protocol can *guarantee* both safety and progress under even one crash — which is why every practical protocol uses timeouts and randomness to make progress *probable* while keeping safety *absolute*. And the concrete disaster all this machinery exists to prevent has a name you already know: **split brain** — two nodes both believing they're leader, both accepting writes, [two divergent histories](../data/replication.md).

## Quorum intuition: the overlap trick

Before any protocol details, the load-bearing idea: **any two majorities of the same set must share at least one member.** From that single pigeonhole fact:

- Two leaders can't be elected in the same term — each needs a majority, majorities overlap, and the shared voter votes once.
- Committed data can't be lost by elections — committed means "on a majority"; any future leader needs a majority vote; the overlap member carries the data forward.
- **Cluster sizing falls out**: 3 nodes tolerate 1 failure (majority 2), 5 tolerate 2 (majority 3); even sizes buy nothing (4 nodes still need 3 — same tolerance as 3 nodes, more coordination); beyond 5–7, bigger quorums just mean slower agreement — consensus clusters are sized for *fault tolerance*, never for load.

## Raft, taught properly

Raft won the industry (etcd, Consul, CockroachDB, Kafka's KRaft, TiKV...) by being *understandable on purpose*. Its world: time divides into numbered **terms**; each node is **follower**, **candidate**, or **leader**.

**Election.** Followers expect leader heartbeats. Silence past a timeout → become candidate: increment term, vote for self, request votes. Majority → leader. The elegant trick making this converge: **randomized election timeouts** — nodes time out at different moments, so usually one candidate campaigns alone and wins before rivals wake (ties just retry with new random timeouts). One vote per node per term (overlap does the rest). And the safety rule candidates must pass: a voter refuses any candidate whose log is *less up-to-date* than its own — which is precisely what guarantees the new leader already holds everything committed.

**Log replication.** Clients talk to the leader; the leader appends to its log, replicates to followers, and **commits when a majority acknowledges** — then applies and responds. Followers' logs are forced into agreement with the leader's (divergent uncommitted suffixes get overwritten — only *uncommitted* junk can differ, and only committed entries were ever promised). The result, in plain words: **a replicated log with one order, where anything acknowledged survives any minority of failures and any number of leader changes.** That replicated log *is* the product — [state machine replication](../data/replication.md): feed the same log to deterministic state machines and you get identical replicas of anything.

**The subtle bit interviewers love — reads.** A leader answering reads from local state might be *deposed and not know it* (its partition heals slowly; a new leader committed writes elsewhere) — stale reads from a "leader." Fixes: **read-index** (confirm leadership with a majority heartbeat before serving — one cheap round trip) or **leader leases** (serve reads freely within a time window guaranteed exclusive — faster, but now you've [bet on bounded clock drift](time-ordering.md), and you know how that story goes).

**Paxos in one honest paragraph:** the original (1989), provably equivalent in power, famously brutal to internalize; production "Paxos" is really Multi-Paxos, which converges on Raft's shape (stable leader + log). The fair summary for interviews: *"Raft is Paxos with the engineering decisions made for you and the explanation written for humans."* Exotic variants (EPaxos, flexible quorums) exist to shave latency or reorder trade-offs; know they exist, don't build on them casually.

## The bill, and the architecture it forces

Consensus prices every write at **one round trip to a majority, minimum** — fine intra-datacenter (sub-ms), brutal cross-region (the [PACELC tax](../foundations/cap-pacelc.md) in protocol form: majority-across-continents = intercontinental RTT per write, forever). The leader is a [serial bottleneck](../foundations/scalability.md) (hence per-range/per-shard Raft groups in CockroachDB-style systems — many small consensuses instead of one big one). Elections mean *brief, real unavailability windows* (seconds of "no leader" per failover — [CP behavior](../foundations/cap-pacelc.md), visible in your metrics).

Which is why the industry converged on one architecture — **the small strong core**:

> A 3–5 node consensus cluster holds the *metadata* — locks, leases, membership, config, shard maps — while thousands of ordinary nodes do the *work*, consulting the core rarely and caching its answers. Kubernetes **is** this pattern (etcd core, everything else reconciling against it); classic Kafka was (ZooKeeper core); HDFS, Consul-based stacks, every control plane you've operated. Consensus for coordination, not for data; the expensive agreement bought once, in one place, kept small and boring.

That sentence — *consensus for metadata, not data* — is the design discrimination the whole page builds to.

!!! ops "DevOps lens"
    You operate consensus daily (etcd under every Kubernetes cluster), and it has sharp operational teeth: **it's fsync-bound** — every entry commits to disk before acknowledgment, so slow disks (or noisy-neighbor volumes) manifest as *election storms*: fsync stalls → heartbeats miss → followers timeout → elections → repeat. "etcd on slow disks = flapping control plane" has ended many afternoons; give the core dedicated fast storage, always. **Monitor:** leader-change rate and term inflation (churn = network jitter or disk latency), apply/commit lag, quorum health, and DB size (etcd compaction/defrag discipline). **Respect the quorum-loss runbook** before you need it — losing majority halts the cluster *by design* (that's the C in CP); recovery options (restore from snapshot vs. force-new-cluster) are dangerous in opposite ways, and 3 a.m. is not when to first read about them. And never "scale" the core for load — 5 nodes maximum for most uses; scale *reads* via leases/followers, scale *load* by caching the core's answers at the edge.

!!! staff "Staff+ altitude"
    Markers: (1) **Keep the CP core small, boring, and off the data path** — every system that leans on the core inherits its blast radius, so the Staff review of any new "let's put it in etcd" idea is really *"does this need agreement, or just storage?"* (most things need storage). (2) **Blast-radius the core's loss explicitly** — "if etcd loses quorum: scheduling stops, running workloads keep running" is the kind of sentence that should exist, verified, for *your* platform's core; systems that fail-static when the brain is unavailable ([data plane survives control plane](../devops/service-mesh.md)) are the mature shape. (3) **Placement is the multi-region decision** — 2 regions can't do majority sensibly; the answer is a third **witness/tiebreaker** site (tiny node, no data, just votes) — and where quorums span regions, you've priced every write at cross-region RTT: say it in the design doc, or [regional homing](../data/replication.md) probably beats you. (4) The deep pattern to reuse: [scalability is agreeing less](../foundations/scalability.md) — every design that replaces continuous consensus with *rare consensus + long leases + local decisions* is applying the industry's hardest-won lesson.

!!! interview "In the interview"
    Have **Raft-in-two-minutes** rehearsed: terms; randomized timeouts making elections converge; one-vote-per-term + majority overlap = one leader; up-to-date rule = new leaders hold everything committed; replicate-then-majority-commit = acknowledged data survives failures. Then the depth probes: *"why odd numbers?"* (majority math — 4 tolerates no more than 3); *"can a leader serve stale reads?"* (yes if deposed-unknowingly — read-index or leases, and name the lease's clock bet); *"why is etcd disk-latency sensitive?"* (fsync-per-commit → missed heartbeats → elections — pure ops credibility); *"where would you use consensus in this design?"* — the discriminating answer: **metadata only** ("leader election, shard map, locks — via etcd/ZooKeeper; the data path stays on [replication + quorums](../data/replication.md) because consensus per user-write would cost a majority RTT each"). Candidates who *scope* consensus correctly signal more than candidates who can recite it.

**Next:** [Coordination, locks & leases](coordination.md) — consensus put to work: elections you can rent, locks that actually hold, and the fencing token that fixes the GC-pause story.
