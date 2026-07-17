# Data & Storage

Remember the rule from [Thinking in systems](../foundations/thinking-in-systems.md): the stateless parts of your architecture scale by photocopier, and all the concentrated difficulty drains into one place — the data tier. This section is that place. It's the longest section in the site because it deserves to be: nearly every famous outage, every gnarly interview follow-up, and every genuinely hard architectural decision is a data decision wearing some other costume.

The section is sequenced from the metal upward: how a single node stores bytes durably, then how copies of data stay in agreement, then how data too big for one node gets split, then the transactional guarantees layered on top — and finally the storage systems that aren't databases at all.

<div class="grid cards" markdown>

-   **[Storage engines](storage-engines.md)**

    ---
    B-trees vs. LSM-trees — the two data structures secretly running the entire database industry — plus WALs, indexes, and the amplification triangle.

-   **[SQL at scale](sql-at-scale.md)**

    ---
    How far one relational database actually goes: replicas, failover, connection pooling, and zero-downtime schema migrations.

-   **[The NoSQL landscape](nosql.md)**

    ---
    Key-value, document, wide-column, graph — what each model buys, and the Dynamo lineage that reshaped the industry.

-   **[Replication](replication.md)**

    ---
    Leader-follower, multi-leader, leaderless; sync vs. async and the data-loss window; what failover really involves.

-   **[Partitioning & sharding](partitioning.md)**

    ---
    Hash vs. range, consistent hashing, choosing a shard key you won't regret, hot partitions, and the dreaded reshard.

-   **[Transactions & isolation](transactions.md)**

    ---
    ACID precisely, the isolation ladder and its anomalies, MVCC, and optimistic vs. pessimistic locking.

-   **[Distributed transactions](distributed-transactions.md)**

    ---
    Two-phase commit and why the industry fled from it; sagas, the outbox pattern, and idempotent reconciliation.

-   **[Object, block & file storage](object-storage.md)**

    ---
    The three storage abstractions, S3-style architecture, durability math, and tiering economics.

-   **[Analytics & data pipelines](analytics.md)**

    ---
    OLTP vs. OLAP, columnar formats, warehouses vs. lakes, batch vs. streaming, and CDC as the connective tissue.

-   **[Database migrations](migrations.md)**

    ---
    Replacing the system of record in flight: backfill + CDC, dark reads, the write-freeze math, and rollback that stays alive.

</div>

## If you are cramming

[Replication](replication.md) and [Partitioning & sharding](partitioning.md) are the two pages interviews lean on hardest — nearly every "now scale the database" follow-up is answered from them. Read [storage engines](storage-engines.md) third: it's the depth that separates you when someone asks *why* Cassandra writes fast.
