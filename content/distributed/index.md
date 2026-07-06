# Distributed Systems

A distributed system is one where a computer you've never heard of can break your program. Everything in the previous sections — replicas, shards, queues, caches — quietly assumed answers to the questions this section asks directly: How do you know a node is dead? Whose clock do you believe? How do machines agree on anything? What stops one failure from becoming all failures? These six pages are the theory that operations people have been living empirically for years — every on-call scar you have is one of these pages, experienced before it was explained.

<div class="grid cards" markdown>

-   **[Failure modes & fallacies](failure-modes.md)**

    ---
    Partial failure, gray failures, cascades, and metastable states — the taxonomy of how distributed systems actually break.

-   **[Time & ordering](time-ordering.md)**

    ---
    Why no two clocks agree, Lamport and vector clocks, TrueTime, and the GC-pause-during-a-lease story every operator should know.

-   **[Consensus](consensus.md)**

    ---
    Raft explained properly, Paxos contextualized, quorum intuition, and why consensus is expensive enough to centralize.

-   **[Coordination, locks & leases](coordination.md)**

    ---
    Leader election, distributed locks that actually hold, fencing tokens, and the etcd/ZooKeeper style of small strong cores.

-   **[Resilience patterns](resilience.md)**

    ---
    Timeouts, retries with backoff and jitter, circuit breakers, bulkheads, load shedding — the complete anti-cascade toolkit.

-   **[Rate limiting](rate-limiting.md)**

    ---
    Token bucket to sliding window, local to distributed enforcement, and what to answer when the limiter itself fails.

</div>

## If you are cramming

[Resilience patterns](resilience.md) and [rate limiting](rate-limiting.md) appear directly in interview designs; read those fully. From the rest, take the fencing-token story ([coordination](coordination.md)) and the retry-amplification cascade ([failure modes](failure-modes.md)) — they're the two highest-signal five-minute reads in this section.
