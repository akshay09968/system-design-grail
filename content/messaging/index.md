# Messaging & Streaming

Every mature architecture eventually splits along one line: the work the user must wait for, and everything else. This section is about the "everything else" — the queues that absorb bursts, the logs that remember every event, the delivery guarantees that are always weaker than people claim, and the architectures that treat events as the source of truth. It's also where the [outbox pattern](../data/distributed-transactions.md), [CDC](../data/analytics.md), and "the log is the database" from earlier sections converge into one coherent worldview.

<div class="grid cards" markdown>

-   **[Async fundamentals](async-fundamentals.md)**

    ---
    What a queue actually buys, queue vs. pub/sub, backpressure, poison messages, DLQs, and why a deep queue *is* an outage.

-   **[Kafka deep dive](kafka.md)**

    ---
    Not a queue — a replicated commit log: partitions, consumer groups, ISR durability math, and why that reframe explains everything.

-   **[Delivery semantics & idempotency](delivery-semantics.md)**

    ---
    At-most-once, at-least-once, and the truth about exactly-once — plus the idempotency patterns that make duplicates harmless.

-   **[Event-driven architecture](event-driven.md)**

    ---
    Events as contracts, event sourcing, CQRS, and stream processing with late data — the payoffs and the real bills.

</div>

## If you are cramming

[Delivery semantics](delivery-semantics.md) is the highest-yield page — "how do you handle duplicate messages?" appears in nearly every interview that contains a queue. Then the Kafka page's consumer-group and durability-config sections.
