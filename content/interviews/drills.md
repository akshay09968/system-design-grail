# Drills

Reading builds recognition; **retrieval builds recall** — and interviews run on recall. Each drill below is a question you should answer *out loud, before* expanding the answer. If your answer stalls or misses the core, the link takes you to the lesson. Work a section per sitting; re-drill misses after 48 hours. (For AI-driven drilling with follow-ups and grading, use [the harness](../reference/ai-harness.md): `python ai/grail.py drill -t <topic>`.)

## Foundations

??? question "State Little's law and use it: a service does 2,000 req/s at 50 ms — how many requests are in flight?"
    L = λ × W → 2,000 × 0.05 = **100 in flight**. If workers handle one request each, you need 100+ just to stand still. [Latency & throughput](../foundations/latency-throughput.md)

??? question "Why can a dependency that gets *slow* be worse than one that *dies*?"
    Dead fails fast; slow **consumes concurrency** — latency doubling doubles required in-flight capacity (Little's law), exhausting pools and cascading upstream. [Latency](../foundations/latency-throughput.md), [failure modes](../distributed/failure-modes.md)

??? question "Five services in a serial chain, each 99.9% available — what's the composite, roughly?"
    0.999⁵ ≈ **99.5%** (~43 h/year down). Serial availabilities multiply; every hard dependency divides your ceiling. [Reliability](../foundations/reliability-availability.md)

??? question "With 100-way fan-out where each backend is fast 99% of the time, what fraction of requests see all-fast?"
    0.99¹⁰⁰ ≈ **37%** — per-dependency p99 becomes your user-facing median. Tail amplification is why hyperscalers obsess over p99.9. [Latency](../foundations/latency-throughput.md)

??? question "What does CAP actually let you choose, and when?"
    Only **during a partition**: consistency (refuse/block) or availability (answer, possibly stale). P isn't a choice, and the trade is per-operation, not per-database. [CAP & PACELC](../foundations/cap-pacelc.md)

??? question "What's the everyday cost of strong consistency when there's no partition?"
    **Latency** (PACELC's ELC): coordination round-trips per write — cross-region, that's 60–150 ms, forever. [CAP & PACELC](../foundations/cap-pacelc.md)

??? question "Name the four session guarantees and the bug each prevents."
    Read-your-writes (vanished comment), monotonic reads (time-travel refresh), monotonic writes (reordered updates), writes-follow-reads (reply before post). [Consistency models](../foundations/consistency-models.md)

??? question "The four questions to ask of any component?"
    What if it's **slow**? **dead**? **wrong** (stale/duplicate)? **full**? [Thinking in systems](../foundations/thinking-in-systems.md)

??? question "100M DAU, 10 reads/day each — average and peak QPS?"
    10⁹/day ÷ 10⁵ ≈ **10k QPS average, ~30k peak** (peak = 3× rule). [Estimation](../foundations/estimation.md)

## Networking & Edge

??? question "Why is the very first request to a site so much slower than the rest?"
    Cold path pays DNS + TCP handshake (1 RTT) + TLS (1–2 RTT) + slow-start's small congestion window. Repeat visits reuse all of it. [Fundamentals](../networking/fundamentals.md)

??? question "Why can HTTP/2 be *slower* than HTTP/1.1 on bad networks?"
    All h2 streams share one TCP connection; one lost packet stalls everything (transport HOL blocking). h1.1's six connections lose independently. h3/QUIC fixes it with per-stream reliability. [HTTP](../networking/http.md)

??? question "Why is DNS-based failover slower than the TTL suggests?"
    TTLs are requests, not commands: disobedient resolvers, OS/browser caches, and already-connected clients keep hitting the old IP for hours. Anycast/GSLB beats DNS for fast failover. [DNS](../networking/dns.md)

??? question "Shallow vs. deep health checks — the trade?"
    Deep checks (verify dependencies) fail fleet-wide when a shared dependency blips → LB ejects everyone. Shallow for LB ejection; deep for monitoring humans read. [Load balancing](../networking/load-balancing.md)

??? question "What is 'power of two choices' and why use it?"
    Pick 2 random backends, send to the less loaded: near-optimal balance, O(1) state, avoids least-conn's stale-data herding. [Load balancing](../networking/load-balancing.md)

??? question "How do you make retrying a payment POST safe?"
    **Idempotency keys**: server stores key + response; retries replay the stored response. [APIs](../networking/apis.md)

??? question "Going from 90% to 99% CDN hit rate does what to origin load?"
    Cuts it **10×** — origin load ∝ (1 − hit rate). The last points of hit rate matter most. [CDN](../networking/cdn.md)

??? question "How do hashed asset filenames solve cache invalidation?"
    Content hash = name → immutable → cache forever; deploys publish new names instead of purging. Only the small HTML entry point stays short-TTL. [CDN](../networking/cdn.md)

## Data & Storage

??? question "Why are LSM stores fast at writes and B-trees fast at reads?"
    LSM: append to memtable + sequential flushes, no in-place updates — bill paid via read amplification and compaction. B-tree: one shallow tree walk per read, in-place page updates cost random I/O. [Storage engines](../data/storage-engines.md)

??? question "Recite the relational scaling ladder."
    Optimize queries → pool connections → cache → read replicas → bigger box → partition tables → split by function → shard (last). [SQL at scale](../data/sql-at-scale.md)

??? question "Why is fencing the old primary non-negotiable in failover?"
    An alive-but-partitioned old leader still accepting writes = **split brain**, two divergent histories. Failover = detect → fence → promote → redirect. [Replication](../data/replication.md)

??? question "Async replication lag is really what other number?"
    Your **RPO** — promote a lagging replica and the un-shipped tail is lost acknowledged data. [Replication](../data/replication.md)

??? question "Four properties of a good shard key?"
    High cardinality, even *load* (not just count), present in hot queries (else scatter-gather), aligned with isolation/tenancy boundaries. [Partitioning](../data/partitioning.md)

??? question "Why pre-split logical shards on day one?"
    Scaling out becomes *remapping* logical→physical (data motion only) instead of rehashing every key — the dreaded reshard becomes routine. [Partitioning](../data/partitioning.md)

??? question "Explain write skew in one story."
    Two on-call doctors each check "someone else is on call" and both leave — each transaction valid alone, invariant broken together; **snapshot isolation permits it**. Fix: serializable, `FOR UPDATE` the read set, or materialize the invariant. [Transactions](../data/transactions.md)

??? question "Why did the industry abandon 2PC for cross-service flows?"
    Coordinator failure between phases leaves participants **in-doubt holding locks** — one node's failure becomes everyone's unavailability. Sagas + outbox replaced it. [Distributed transactions](../data/distributed-transactions.md)

??? question "What does the outbox pattern solve, and how?"
    The DB-then-publish dual-write race: write business row **and** event row in one local transaction; a relay (CDC) publishes with at-least-once; consumers dedupe. [Distributed transactions](../data/distributed-transactions.md)

??? question "Design reflex for any upload feature?"
    **Presigned URLs**: service signs, client talks to object storage directly; metadata in DB, bytes in S3, CDN in front. [Object storage](../data/object-storage.md)

## Caching, Messaging, Distributed

??? question "Recite the six-part caching sentence."
    Cache-aside, TTL **with jitter**, **delete**-on-write invalidation, **single-flight** misses, **negative caching**, L1/L2 tiering for hot keys. [Fundamentals](../caching/fundamentals.md)

??? question "Cache dies at 98% hit rate — what does origin see, and what's the plan?"
    **50× load instantly.** Plan (written in advance): survive-cold capacity, or treat cache as tier-0 (replicate/persist/chaos-test) + load-shed + brownout mode + rate-limited refill. [Failure modes](../caching/failure-modes.md)

??? question "Stampede vs. avalanche vs. penetration — one line each."
    Stampede: one hot key expires, N recomputes (single-flight/SWR). Avalanche: mass simultaneous expiry (jitter/warming). Penetration: requests for keys that *don't exist* bypass cache (negative cache/Bloom filter). [Failure modes](../caching/failure-modes.md)

??? question "Why is queue *age* a better alert than queue *depth*?"
    Depth 10k might be 4 seconds or 4 hours of work; **age of oldest** measures the promise actually being broken. [Async fundamentals](../messaging/async-fundamentals.md)

??? question "Why does 'exactly-once delivery' not exist, and what's the honest contract?"
    A lost ack forces resend-or-drop — duplicates or loss, pick one. Contract: **at-least-once + idempotent consumers** (keys/dedupe/versions) = exactly-once *effects*. [Delivery semantics](../messaging/delivery-semantics.md)

??? question "Kafka durability recipe, verbatim?"
    `replication.factor=3, acks=all, min.insync.replicas=2` — tolerate one broker with zero acked-data loss; producers block rather than lose. [Kafka](../messaging/kafka.md)

??? question "Why does adding partitions to a Kafka topic have a hidden cost?"
    Key→partition mapping changes: per-key **ordering breaks** across the boundary. Size partitions generously up front. [Kafka](../messaging/kafka.md)

??? question "Tell the GC-pause lock story and its fix."
    Client holds a lease, pauses past expiry, wakes still believing it holds the lock → two writers. Fix: **fencing tokens** — monotonic token checked *by the resource*; stale writers bounce. [Coordination](../distributed/coordination.md)

??? question "The ladder for 'only one worker may process X'?"
    Partition **ownership** (route, don't lock) → idempotency → atomic claim/CAS → lease + fencing → bare lock (efficiency only). [Coordination](../distributed/coordination.md)

??? question "Full retry discipline in one breath?"
    Idempotent ops only, exponential backoff, **full jitter**, 2–3 attempt cap, one layer only, under a fleet **retry budget** (~10–20%). [Resilience](../distributed/resilience.md)

??? question "What is a metastable failure and why doesn't fixing the trigger fix it?"
    A sustaining feedback loop (retry storm, cold-cache loop) keeps the system pinned after the trigger clears — recovery means **breaking the loop**: shed hard, pause retries, ramp gradually. [Failure modes](../distributed/failure-modes.md)

??? question "Rate limiter algorithm default and why?"
    **Token bucket** — natively encodes sustained-rate + burst, O(1) via lazy refill, atomic as a Redis Lua script. Fixed window's flaw: 2× boundary burst. [Rate limiting](../distributed/rate-limiting.md)

## DevOps, Observability, Security

??? question "What is a container, in one sentence?"
    A Linux process with namespaces scoping what it *sees*, cgroups metering what it *uses*, and a layered image filesystem — not a VM (shared kernel). [Containers](../devops/containers.md)

??? question "What survives when the Kubernetes control plane dies?"
    **The data plane**: running pods keep running, Services keep routing. You lose change (deploys, rescheduling, autoscaling) — fail-static. [K8s architecture](../devops/kubernetes-architecture.md)

??? question "Why do naive deploys drop requests on Kubernetes, and the fix?"
    Endpoint removal propagates asynchronously — nodes route to terminating pods for hundreds of ms. Fix: on SIGTERM fail readiness but keep serving, preStop sleep outwaits propagation, then drain within the grace period. [K8s workloads](../devops/kubernetes-workloads.md)

??? question "Requests vs. limits — what does each actually do?"
    Requests = scheduler's currency (bin-packing, 'fullness'); limits = cgroup enforcement (memory → OOMKill, CPU → throttling — the invisible p99 killer). [K8s autoscaling](../devops/kubernetes-autoscaling.md)

??? question "Why do canary deploys beat blue-green for most fleets?"
    Blast-radius control: 1% meets the bug, automated analysis against control, widen with soak — vs. blue-green's 100%-at-once flip (instant rollback, though). [Deployments](../devops/deployments.md)

??? question "The database migration that never breaks rollback?"
    **Expand–contract**: additive change → dual-write + backfill → flip reads via flag → contract later. Old code must survive new schema. [SQL at scale](../data/sql-at-scale.md), [deployments](../devops/deployments.md)

??? question "What's GitOps, precisely?"
    Git holds complete desired state; in-cluster controllers reconcile continuously. Pull-based (CI never holds cluster creds), drift self-heals, audit = git log. [IaC & GitOps](../devops/iac-gitops.md)

??? question "The workload-identity ladder for service auth?"
    Shared static secrets → per-service secrets in a store → dynamic short-TTL secrets → **attested workload identity** (OIDC/SPIFFE, minutes-lived, nothing stored). [Secrets](../devops/secrets-identity.md)

??? question "Why 'multi-region' needs a why before a how?"
    DR, latency, and residency produce **different architectures** (backup tiers vs. CDN/edge vs. tenant homing). Then climb the ladder rung by rung. [Multi-region](../devops/multi-region.md)

??? question "What's 'static stability'?"
    Surviving a region's loss requires **no control-plane actions**: capacity pre-provisioned, permissions pre-existing. The multi-region elite nugget. [Multi-region](../devops/multi-region.md)

??? question "SLO alerting without threshold noise?"
    **Multi-window burn rate**: page at ~14× budget burn over 1 h (fast fire), ticket at ~3× over 6 h (slow leak). Blips self-clear, slow burns get caught. [SLOs](../observability/slos.md)

??? question "Symptom vs. cause alerting — the rule?"
    **Symptoms page** (users hurting — covers unanticipated failures by definition); **causes annotate** (dashboards, tickets). CPU at 95% is not a page. [Alerting](../observability/alerting.md)

??? question "Cardinality rule for metrics labels?"
    Bounded labels only (endpoint, status, region); **identifiers (user/request IDs) go in logs and traces**. One churning label = billions of series = the monitoring dies first. [Observability](../observability/fundamentals.md)

??? question "JWT revocation — the honest answer?"
    JWTs are valid until expiry. Standard: 5–15 min access tokens + server-side revocable refresh tokens with rotation & reuse detection. A denylist = rebuilding sessions. [AuthN/Z](../security/authn-authz.md)

??? question "Zero trust in three clauses?"
    Authenticate every request regardless of network origin; least privilege everywhere; assume breach (design blast radius for a compromised component). [Defense in depth](../security/defense-in-depth.md)

## Case-study rapid fire

??? question "News feed: why hybrid fan-out?"
    Push (precompute timelines) dies at celebrity scale (10⁸ writes/post); pull dies on read tail (scatter-gather). Hybrid: push for normals, pull-and-merge celebrities at read. [News feed](../case-studies/news-feed.md)

??? question "Chat: what makes reconnection safe?"
    **Sync-by-sequence**: per-conversation sequence numbers; clients request "everything since seq N" — the connection is disposable. [Chat](../case-studies/chat.md)

??? question "Video streaming: the reframe that simplifies everything?"
    Segmented streaming (HLS/DASH) makes video a **static-file problem** — immutable segments on a CDN; your service is just the control plane. [Video](../case-studies/video-streaming.md)

??? question "Typeahead: why precompute top-K per prefix?"
    Short prefixes have millions of descendants — ranking at query time can't meet a 50 ms keystroke budget. Store the answer, not the data. [Typeahead](../case-studies/typeahead.md)

??? question "Crawler: politeness by construction?"
    One back-queue per host, one consumer per queue, per-host delay — per-key ownership makes politeness structural, not aspirational. [Crawler](../case-studies/web-crawler.md)

??? question "Payments: the 'unknown' problem?"
    Processor call times out — charged or not? Never guess: same-key idempotent retry, park in `pending_confirmation` (a legitimate state), resolve by webhook-or-poll, reconcile nightly. [Payments](../case-studies/payments.md)

??? question "Feature flags: the three-layer fail-static stack?"
    Last-known ruleset in memory → signed CDN snapshot on restart → compiled-in defaults. "Yesterday's behavior, never chaos." [Feature flags](../case-studies/feature-flags.md)
