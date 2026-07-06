# Delivery Semantics & Idempotency

Here is the uncomfortable theorem underneath every messaging system: **over an unreliable network, you cannot deliver a message exactly once.** The proof fits in a sentence — the sender's acknowledgment can always be lost, at which point the sender must choose: resend (risking a duplicate) or don't (risking a loss). That binary choice, made at every hop, is the entire topic. "Exactly-once delivery" as commonly imagined is a marketing phrase; what actually exists is **exactly-once *processing effects***, engineered by making duplicates harmless. This page is how.

## The three contracts

- **At-most-once** — fire and forget: no retry on silence. Never duplicates, sometimes loses. Correct for data whose next update supersedes this one anyway: metrics samples, presence pings, live cursors. (Losing 0.1% of CPU samples is noise; blocking the app to deliver them is an outage — [the UDP/statsd argument](../networking/fundamentals.md).)
- **At-least-once** — retry until acknowledged. Never loses, sometimes duplicates. **The default contract of every serious queue** ([SQS's visibility timeout mechanically guarantees it](async-fundamentals.md); Kafka consumers replay from their last committed offset after a crash — everything between processing and offset-commit is redelivered).
- **Exactly-once** — achievable only as *end-to-end engineering*: at-least-once delivery + deduplication at the effect. The delivery layer retries; the processing layer makes retries invisible. Anyone selling it as a transport property is selling the first half and hoping you don't audit the second.

Where duplicates come from, concretely (worth having on your fingertips): producer retries after a lost ack (the message arrived *twice*), consumer crashes after doing the work but before acking (redelivery reruns the work), visibility timeout expires mid-processing (a *slow* consumer looks dead — now two consumers hold the same message), rebalances replay uncommitted offsets, and DLQ redrives resurrect the already-processed. None of these are bugs. **Duplicates are the contract.**

## Idempotency: the art of harmless retries

An operation is idempotent when doing it twice equals doing it once. Some operations are born idempotent; the rest must have it installed:

**Natural idempotency** — absolute writes: `SET status = 'shipped'`, `PUT /users/42 {…}`, upserts keyed on natural IDs. Twice is once by construction. Where you can *design* operations into this shape, do — "set the value" beats "apply the delta" wherever both express the intent. The born-guilty operations are the relative ones: `INCR balance`, `append line`, `send email` — each replay compounds.

**Idempotency keys** — the general-purpose install, [met at the API layer](../networking/apis.md), now seen from the consumer's side. Every message/request carries a unique key (event ID, `Idempotency-Key`); the processor records processed keys and short-circuits repeats. The craft is in three details interviewers probe:

1. **The check and the effect must be atomic.** `if not seen(key): do_work(); mark_seen(key)` has a crash window between work and mark — and a race window between two concurrent deliveries of the same key. The fixes are the [transactions toolbox](../data/transactions.md): insert the key into a unique-constrained table *in the same transaction as the business write* (the constraint violation IS the dedupe signal — belt and suspenders in one clause), or reserve the key first (`INSERT ... ON CONFLICT DO NOTHING`, proceed only if you won).
2. **Store the *result*, not just the fact** — replays should return the original response (the [Stripe pattern](../networking/apis.md)); "already done" plus the answer beats "already done" plus a shrug, because the caller retried precisely *because* they never saw the answer.
3. **Scope and expiry** — keys are per-operation (same key, different payload = reject loudly: that's a bug upstream, not a retry), and the dedup store needs a TTL matched to the redelivery horizon (24–72 h covers queue retention + DLQ redrives; infinite dedup tables become their own [capacity problem](../foundations/estimation.md)).

**Sequence/version-based dedup** — when messages are per-entity ordered ([per-key partitions](kafka.md)), consumers can track *last version applied per entity* and drop anything ≤ it: O(1) state per entity instead of per message, and it also catches reordering. This is how [CDC appliers](../data/analytics.md) and event-sourced projections dedupe at scale.

## Exactly-once, where it genuinely exists

Three real implementations, each with an honest scope:

- **Kafka's transactional pipelines** — *consume → process → produce, atomically, within Kafka*: offsets commit and output records publish in one transaction; a crash replays into an abort, downstream readers (in `read_committed` mode) never see partials. Genuine exactly-once **for Kafka-to-Kafka topologies** (Streams/Flink pipelines). The moment your processor touches an external system — a database, an email API — you're back to idempotency, because that system wasn't in the transaction.
- **The outbox + dedup sandwich** — [transactional outbox](../data/distributed-transactions.md) upstream (event published iff business write committed) + idempotent consumer downstream (event applied iff not already applied). Each half is at-least-once; the composition has exactly-once *effects*. This is the pattern actually running the world's order pipelines.
- **End-to-end natural idempotency** — the whole pipeline expressed as upserts/absolute states, so duplicates are structurally invisible. The cheapest version when the domain allows it.

And the two operations that resist all of it, worth naming in interviews: **side effects that leave the system** — the email, the SMS, the third-party charge. You can't unsend, and dedup depends on the *vendor's* idempotency support (pass your key through if they take one — payment processors do; email APIs increasingly do). Where the vendor won't, you choose your failure honestly: at-most-once (rare lost email) usually beats at-least-once (double charge notification) for messaging, and the reverse for money — with [reconciliation](../data/distributed-transactions.md) sweeping behind both.

## Choosing per data class

| Data | Contract | Why |
|---|---|---|
| Metrics, presence, telemetry | at-most-once | superseded in seconds; loss is noise |
| Emails, notifications | at-least-once + vendor key, or deliberate at-most-once | duplicate annoys, loss is usually tolerable |
| Orders, payments, inventory | at-least-once + full idempotency + reconciliation | duplicates are money; losses are lawsuits |
| Analytics events | at-least-once + dedup-in-query or approximate | volume makes perfect dedup uneconomical; [HLL forgives](../caching/redis.md) |
| CDC / state replication | at-least-once + version dedup | absolute states make replays no-ops |

!!! ops "DevOps lens"
    Duplicates have dashboards: **duplicate-rate per consumer** (dedup-hit counter — a step change means someone's retry policy or visibility timeout regressed; the "timeout shorter than p99 processing time" bug *manifests as* a duplicate storm at scale), **dedup-store health** (it's on the critical path now — its latency is your processing latency, its outage is your correctness outage: decide *fail-open vs. fail-closed* per stream, in writing — fail-open on metrics, fail-closed on payments), **dedup-table growth** (TTL working? the unbounded idempotency table is a slow-motion disk incident), and **reconciliation drift** as the backstop metric that catches what dedup missed. Game-day it: inject duplicates in staging deliberately (replay a partition, redrive a DLQ) and watch whether effects double — it's the cheapest correctness chaos test in existence, and the first run almost always finds a consumer somebody swore was idempotent.

!!! staff "Staff+ altitude"
    Markers: (1) **Idempotency is platform, not folklore** — the key-generation, dedup-storage, and retry-with-backoff machinery belongs in the shared consumer/client libraries with metrics built in; forty teams hand-rolling `if not seen(key)` will ship the atomicity race forty times ([the paved-road argument](../caching/failure-modes.md), third appearance, because it keeps being true). (2) **Contracts per stream, written down** — the table above, instantiated for your org, with fail-open/fail-closed decisions attached; ambiguity here is how "we lost 0.3% of orders during the rebalance" becomes a surprise instead of a violated document. (3) **Push idempotency across org boundaries** — require idempotency keys in vendor selection, offer them in your own public APIs, and pass keys through end-to-end (an idempotent interior wrapped in non-idempotent edges is theater). (4) The deepest version of this page is a *data-modeling* stance: prefer absolute states and append-only facts over mutable deltas in event design — systems whose messages say *what is true* rather than *what to do* get exactly-once effects nearly for free, which is half the argument for [event-driven architecture](event-driven.md).

!!! interview "In the interview"
    "How do you handle duplicate messages?" is nearly guaranteed in any queue-bearing design; the complete 30-second answer: *"At-least-once is the contract — duplicates come from lost acks, crash-before-commit, and timeout redeliveries. Consumers are idempotent: every event carries an ID; I insert it into a unique-keyed dedup table in the same transaction as the business write, so the constraint catches the race; results are stored so replays return the original response, keys expire past the redelivery horizon."* Follow-ups it pre-empts: *"exactly-once?"* (doesn't exist as delivery; exists as effects — cite Kafka transactions' honest scope and the outbox+dedup sandwich); *"what about the email?"* (side effects that leave the system can't be deduped by you — vendor keys or a deliberate at-most-once choice, plus reconciliation); *"where does the dedup state live?"* (unique-constrained table for transactional streams, [Redis with TTL](../caching/redis.md) for high-volume tolerant ones — and name the fail-open/fail-closed choice when it's down). Bonus signal: the [SQS visibility-timeout duplicate storm](async-fundamentals.md) as a war story explains *mechanically* why all this exists.

**Next:** [Event-driven architecture](event-driven.md) — when events stop being notifications and become the source of truth.
