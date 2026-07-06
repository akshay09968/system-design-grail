# Redis Deep Dive

Redis started as a cache and became the junk drawer of the internet's state — sessions, rate limits, leaderboards, queues, locks, presence, pub/sub — because it made one bargain most databases refuse: *keep everything in memory, run one thread, and expose data structures instead of tables.* The result does 100k+ operations per second per core at sub-millisecond latency, with atomicity so cheap it's free. Understanding Redis deeply pays twice: it's in practically every real architecture, and its design choices are a miniature course in systems trade-offs.

## Why it's fast (and the shadow of that speed)

Three ingredients: **memory only** (no disk in the read path), **a single-threaded command loop** (no locks, no contention — commands execute one at a time, to completion), and an [epoll event loop](../networking/fundamentals.md) multiplexing tens of thousands of connections onto that thread. Pipelining stacks requests per round trip; recent versions offload I/O to helper threads — but *command execution remains single-file*.

The shadow: **one slow command stalls everyone**. `KEYS *` on a big keyspace, `SMEMBERS` on a 10M-member set, an ambitious Lua script, even deleting a giant key — each is a full stop for every client. Half of all Redis incidents are this one sentence. (Cures: `SCAN` over `KEYS`, `UNLINK` over `DEL` for big keys, Lua kept tiny, and the slowlog watched.)

## Data structures as the API

The genius move: Redis speaks *structures*, so a huge share of system-design components collapse into single commands:

| Structure | Commands | The system-design job |
|---|---|---|
| String | `GET/SET/INCR` | cache values; **counters** (`INCR` is atomic — view counts, [fixed-window rate limits](../distributed/rate-limiting.md)) |
| Hash | `HSET/HGETALL` | objects (session fields, user profiles) without serializing whole blobs |
| List | `LPUSH/BRPOP` | simple work queues (blocking pop = instant worker wakeup) |
| Set | `SADD/SISMEMBER` | dedupe, tags, "already processed?" checks |
| **Sorted set** | `ZADD/ZRANGE/ZRANGEBYSCORE` | **leaderboards** (score = rank, O(log N)); **delayed jobs** (score = run-at time); **sliding-window rate limits** (score = timestamp) |
| Stream | `XADD/XREADGROUP` | lightweight Kafka-ish log with consumer groups ([when to use the real thing](../messaging/kafka.md#where-kafka-is-the-wrong-answer)) |
| HyperLogLog | `PFADD/PFCOUNT` | unique counts in 12 KB at ~0.8% error ([approximate by design](../foundations/scalability.md)) |
| Bitmap | `SETBIT/BITCOUNT` | daily-active flags, feature exposure — a user per bit |
| Geo | `GEOADD/GEOSEARCH` | "drivers within 3 km" ([proximity case study](../case-studies/proximity.md)) |
| Pub/Sub | `PUBLISH/SUBSCRIBE` | ephemeral fan-out (fire-and-forget — disconnected subscribers miss messages): [chat](../case-studies/chat.md), invalidation broadcasts |

Interview fluency here is a party trick that keeps paying: *leaderboard?* — sorted set. *Delayed retry queue?* — sorted set by timestamp, poll with `ZRANGEBYSCORE`. *Dedupe stream events?* — set with TTL. *Count uniques cheaply?* — HyperLogLog. Each answer is one confident sentence where other candidates design a subsystem.

**Atomicity comes free**: single-threading makes every command atomic, `MULTI/EXEC` batches commands atomically (no rollback — it's "all execute," not a transaction), and **Lua scripts** run atomically end-to-end — which is why the canonical distributed patterns (token-bucket rate limiter, lock-release-if-owner) ship as five-line Lua scripts: check-and-act with no race, no locks, no round trips between check and act.

## Persistence: choosing your loss window

Memory-first forces the question disk databases never ask this bluntly:

- **RDB snapshots** — periodic full dumps (binary, compact, fast restart). Loss window = time since last snapshot (minutes). The operational sting: `BGSAVE` **forks** the process — copy-on-write means a write-heavy instance can briefly need up to ~2× memory, and the fork pause grows with heap size. The classic "Redis OOM'd during backup" incident is this paragraph.
- **AOF (append-only file)** — logs every write ([the WAL again](../data/storage-engines.md)); `everysec` fsync = at most ~1 s loss, `always` = durable-per-command and slow. Bigger files, slower restart, periodic rewrite (also a fork).
- **Both** (belt and suspenders; RDB for fast restart, AOF for small loss window) or **neither** — the pure-cache posture: restart empty, refill from origin ([cold-cache herd](failure-modes.md) accepted and planned for).

The posture must match the *role* — which is the next section's real point.

## HA and scale: Sentinel, Cluster, and the async asterisk

**Replication is async.** A promoted replica may be missing the last moments of acknowledged writes — so Redis failover has a *data-loss window by design*. Tattoo the consequence: **Redis is not the source of truth for anything you can't regenerate or afford to lose.** (`WAIT` offers quorum-ish acks at a latency price; it narrows, not closes, the window.)

- **Sentinel** — failover management for non-sharded deployments: sentinel processes (quorum of ≥3, spread across [failure domains](../foundations/reliability-availability.md)) detect primary death, elect, promote, and re-point clients. Split-brain protection is only as good as the quorum topology — two sentinels in one AZ is theater.
- **Cluster** — sharding: the keyspace is divided into **16,384 hash slots**, each owned by a primary (+replicas); clients learn the slot map and go direct (`MOVED`/`ASK` redirects during rebalancing — resharding = migrating slots live). The catch that bites designs: **multi-key operations require all keys in one slot** — hence **hash tags**: `{user:42}:profile` and `{user:42}:sessions` hash on `user:42` only, colocating a user's keys so `MULTI`/Lua still work. Cross-slot atomicity does not exist; design keys accordingly.
- The proxy alternative (Twemproxy/Envoy) trades client smarts for a middle hop — mostly historical or polyglot-client niches now.

**One instance, one role.** The recurring architectural sin is one Redis serving as cache (*wants* `allkeys-lru` eviction, no persistence) *and* session store (*wants* `noeviction`, AOF) *and* queue (*wants* durability and backpressure) — three contradictory configs, one `maxmemory` policy, and whichever role loses the config war fails silently: sessions evicted by cache pressure is the classic. Separate instances per role; they're cheap.

!!! ops "DevOps lens"
    The Redis incident canon, by dashboard signature: **latency spikes with single-command culprits** (slowlog shows `KEYS`/big-collection ops/fat Lua — the single-thread tax collected), **memory doubling then OOM during BGSAVE/AOF-rewrite** (fork + copy-on-write under write load — headroom or replica-side persistence), **`evicted_keys` climbing** (maxmemory reached: capacity problem or missing TTLs — and if this instance holds sessions, that's an *outage*, not a metric), **one cluster node hot** ([hot key](failure-modes.md) — slots balance *keys*, not *traffic*), **replication buffer overflows** during big writes (replicas repeatedly re-syncing — the death spiral), and **fragmentation ratio drifting** (jemalloc holding freed pages — active defrag or a bounce). Watch: p99 via `LATENCY`, slowlog, memory + fragmentation, evictions, replication offset lag, connected clients. And rehearse the failover: Sentinel's promotion is only as fast as its timeouts, and every second is a second of writes at risk.

!!! staff "Staff+ altitude"
    Markers: (1) **Inventory the junk drawer** — Redis accretes roles silently until "the cache" is secretly tier-0 for sessions, rate limits, locks, and a queue; a Staff engineer runs the audit ("for each keyspace: owner, role, loss tolerance, eviction policy, what breaks if this vanishes for 10 minutes?") and splits instances until config matches contract. (2) **Right-tool discipline at the boundaries** — durable queue: [Kafka](../messaging/kafka.md), not lists; source of truth: a [database](../data/index.md); big blobs: [object storage](../data/object-storage.md) with Redis holding pointers; distributed locks: fine for efficiency, but correctness-critical mutual exclusion wants [fencing tokens and consensus stores](../distributed/coordination.md) — "Redlock is contested" is the two-word literacy check. (3) **Managed vs. self-run** is mostly about who rehearses failover and capacity — the software is easy, the 3 a.m. promotion is not. (4) Redis's design itself is a Staff-level lesson to reuse: *constraints (one thread, memory-only) chosen ruthlessly buy properties (atomicity, predictability) that flexibility never delivers.*

!!! interview "In the interview"
    Speed round — structure per problem, one sentence each: leaderboard → sorted set; rate limiter → `INCR`+TTL or ZSET sliding window, *atomic via Lua*; delayed jobs → ZSET scored by run-time; presence → TTL'd keys or bitmaps; uniques → HyperLogLog; proximity → GEO; ephemeral fan-out → pub/sub (with the "disconnected subscribers miss messages" caveat that shows you know it's fire-and-forget). Depth probes: *"why is Redis fast?"* (memory + single thread + event loop — then volunteer the shadow: one slow command blocks all); *"what happens when Redis dies?"* — answer **per role**: cache → cold-start herd, [survivable if planned](failure-modes.md); sessions → mass logout unless persisted/replicated; rate limiter → fail open or closed, *choose deliberately*; *"Redis Cluster multi-key ops?"* (16,384 slots, hash tags to colocate, no cross-slot atomicity); *"can I use Redis as my database?"* (async replication = loss window; fine for regenerable state, wrong for money — and say which of your design's data is which).

**Next:** [Cache failure modes](failure-modes.md) — stampedes, avalanches, penetration, and the cliff where the cache stops being optional.
