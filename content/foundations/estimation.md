# Back-of-Envelope Estimation

Estimation is not arithmetic theater. Its purpose is a *verdict*: which part of this problem is actually hard? Fifty thousand QPS of reads is a yawn (cache it); fifty thousand QPS of *writes* reshapes the whole design; three petabytes a year makes storage — not traffic — the boss fight. Interviewers watch your estimation process to see whether numbers *drive your decisions* or decorate them.

The good news: it's a small closed skill. A dozen memorized numbers, four recipes, and ruthless rounding. Master it and you own one of the few moments in an interview where you can be visibly, quantitatively better than other candidates.

## The rounding discipline

- **One significant figure.** 86,400 seconds/day is **10⁵**. 350M users is **3×10⁸**. You're hunting orders of magnitude, not decimals.
- **State assumptions out loud, then flag them.** "Assume 200M DAU, each opening the feed 5 times a day — correct me if the scale's different."
- **Sanity-check against a known anchor.** Your answer says 2M QPS? Google Search handles ~100k/s. Either you're designing something bigger than Google, or a factor slipped.
- **End with the verdict.** The number is worthless until you say what it *means*: "…so this fits in RAM on one box — the interesting problem is elsewhere."

## Numbers to carry in your head

**Powers of two → storage ladder**

| 2ⁿ | ≈ | Name |
|---|---|---|
| 2¹⁰ | 10³ | KB |
| 2²⁰ | 10⁶ | MB |
| 2³⁰ | 10⁹ | GB |
| 2⁴⁰ | 10¹² | TB |
| 2⁵⁰ | 10¹⁵ | PB |

**Latency numbers (2025-era hardware)**

| Operation | Time |
|---|---|
| L1 cache reference | ~1 ns |
| Main memory reference | ~100 ns |
| Compress 1 KB (snappy) | ~2 µs |
| Read 1 MB sequentially from RAM | ~20–50 µs |
| NVMe SSD random read | ~20–100 µs |
| Read 1 MB sequentially from NVMe | ~200–500 µs |
| Disk (HDD) seek | ~5–10 ms |
| Round trip within one datacenter/AZ | ~0.5 ms |
| Round trip cross-region (same continent) | ~30–80 ms |
| Round trip intercontinental (NY↔Sydney) | ~200 ms |
| TLS handshake (cold) | 1–2 round trips |

The ratios matter more than the values: **memory is ~1000× faster than SSD; SSD is ~100× faster than a cross-region hop; a single intercontinental round trip outweighs hundreds of thousands of memory reads.** Every caching and data-placement decision in this site is those three ratios wearing different hats.

**Object sizes**

| Thing | Size |
|---|---|
| int64 / pointer | 8 B |
| UUID | 16 B |
| Short text post + metadata | ~300 B–1 KB |
| Log line (structured) | ~200 B–1 KB |
| Thumbnail | ~20 KB |
| Photo (compressed) | ~200 KB–2 MB |
| 1080p video | ~5 Mbps ≈ 2 GB/hour |
| 4K video | ~20 Mbps ≈ 9 GB/hour |

**Single-node throughput anchors** (order of magnitude, for "how many servers?" math): a tuned stateless JSON API node: ~1–10k req/s; nginx serving static/proxy: ~50k+ req/s; Postgres, simple indexed queries: ~10–50k QPS; Redis: ~100k+ ops/s per core; Kafka broker: hundreds of MB/s. A modern node: dozens of cores, 100s of GB RAM, 10–25 Gbps NIC (≈1–3 GB/s of payload).

## The four recipes

**1. Traffic:** `QPS ≈ (DAU × actions/day) ÷ 10⁵`, then **peak = 2–5× average**. 100M DAU × 10 reads = 10⁹/day ≈ **10k QPS average, 30k peak**.

**2. Storage:** `daily items × size × replication (×3) × retention`, and remember the derived stores (indexes, caches, backups) often double it again.

**3. Bandwidth:** `QPS × payload size`. 10k QPS × 100 KB responses = **1 GB/s ≈ 8 Gbps** — suddenly the NIC and the CDN bill are design inputs.

**4. Memory/cache:** the 80/20 heuristic — cache the hot 20%; or size from the miss budget: if the DB survives 2k QPS and you face 20k, you need ≥90% hit rate, and the cache must hold your hot set at that rate.

## Worked example 1: photo-sharing app (the classic)

*Assume 500M DAU; each views 20 photos/day; 2% upload one 2 MB photo (stored as 2 MB + 20 KB thumbnail); 5-year horizon.*

- **Read QPS:** 500M × 20 ÷ 10⁵ = **100k avg, ~300k peak** — CDN territory, not database territory.
- **Upload QPS:** 10M/day ÷ 10⁵ = **100 avg, ~300 peak** — trivially small. *Verdict: traffic asymmetry 1000:1 — this is a read-distribution problem.*
- **Storage:** 10M × 2 MB = 20 TB/day → ~7 PB/year → with ×3 replication, **~100 PB over 5 years**. *Verdict: storage is the boss fight → object store + tiering, not a database.*
- **Egress:** 100k QPS × 20 KB (thumbnails, mostly) ≈ 2 GB/s baseline — **the CDN hit rate is a top-three cost lever in the whole design.*

Three multiplications, and the architecture chose itself: CDN-fronted object storage, metadata in a database, uploads almost an afterthought.

## Worked example 2: log pipeline (the DevOps special)

*Assume 10,000 hosts; 100 log lines/host/s; 300 B/line; keep 30 days searchable, 1 year in cold storage.*

- **Ingest:** 10⁴ × 10² = **1M lines/s** = 300 MB/s raw ≈ **26 TB/day**.
- **Kafka sizing:** 300 MB/s ÷ ~20 MB/s per partition ≈ **~16 partitions minimum — run 30–50** for headroom and consumer parallelism; ×3 replication → ~1 GB/s of broker write bandwidth across the cluster.
- **Hot storage:** 26 TB × 30 days ≈ 780 TB raw; ~10:1 compression → **~80 TB** in the search cluster (plus index overhead, often 30–100% — call it 100–150 TB provisioned).
- **Cold:** 26 TB × 365 ÷ 10 ≈ **~1 PB/year compressed** in object storage. *Verdict: nobody greps a petabyte — retention policy and sampling ARE the design; the pipeline is plumbing around them.*

## Worked example 3: rate limiter memory (the "does it even need to be distributed?" check)

*100M active API clients; sliding-window counters; ~2 windows × 40 B per client.*

- 10⁸ × 80 B = **8 GB**. Fits comfortably in one Redis instance's RAM; a replica pair covers availability. *Verdict: the hard part is not memory — it's the 100k+ checks/s and what happens when Redis hiccups (fail open or fail closed?). Estimation just redirected the entire design conversation to the right question.*

## Choreography under pressure

When to estimate: right after requirements, *before* drawing boxes — or surgically, mid-design, when a choice hinges on a magnitude ("before I pick between fan-out strategies: how many followers does a write touch?"). Narrate every step — silent arithmetic is dead air; spoken arithmetic is signal. If a number feels wrong, say so and re-derive in the open: recovering gracefully from a slipped zero is *more* impressive than never slipping, because it proves the sanity-check reflex is real. And never let precision theater creep in — "roughly 100 PB" is the professional answer; "103.68 PB" is the amateur one.

!!! ops "DevOps lens"
    This is the same math as **capacity planning**, with a calendar attached: current load × growth curve + burst headroom, checked against procurement/quota lead time. The habits transfer both ways — if you've ever sized a Kafka cluster or argued an AWS quota increase, you have done interview estimation with real stakes. One production-honed instinct worth voicing: estimate *the derived load, not just the user load* — every user request fans out into cache fills, replication writes, index updates, log lines, and metrics samples; ops people know the metrics pipeline can be bigger than the product it observes (a pod emitting 1,000 series scraped every 15 s across 10k pods is 700k samples/s of self-inflicted write load — see [worked example 2](#worked-example-2-log-pipeline-the-devops-special), which is often really about *your own telemetry*).

!!! staff "Staff+ altitude"
    At Staff level, estimation is how you **kill projects politely and buy the right things**. "Ninety-day retention at this volume is 3 PB hot — before we design anything, is ninety days a requirement or a habit?" is a sentence that saves a team-year. The altitude markers: run the math *before* the architecture debate (magnitude picks the architecture class: RAM-scale → one box and boring tech; PB-scale → object store + async everything); use it for **build-vs-buy** ("at our volume the SaaS bill crosses self-hosting cost in month seven — but self-hosting is two FTEs forever"); and pressure-test *other people's* numbers in design reviews — the most valuable estimation at Staff level is the one that catches a 100× error in someone else's doc before it ships. That's the four questions of [systems thinking](thinking-in-systems.md) applied to spreadsheets instead of servers.

!!! interview "In the interview"
    A 90-second template that works for any problem: *"Let me size this before designing. Assuming X DAU × Y actions ÷ 10⁵ ≈ Z QPS, peak 3Z. Writes are W QPS. Storage: rate × size × 3 replicas × retention ≈ S. Verdict: [the hard part is ___], so I'll spend our time there."* Expected probes: *"Is that a lot?"* (anchor it: "300k QPS is a few hundred well-run nodes — routine; the 100 PB is the real decision"); *"What if it's 10× that?"* (magnitudes, not panic: "reads still CDN-bound; storage crosses into tiering-mandatory"); *"Where would this math break?"* (name your shakiest assumption yourself — the 2% upload rate, the 10:1 compression — before they do; owning your error bars is the most senior move estimation offers).

**Next:** you have the foundations. [Networking & Edge](../networking/index.md) starts the component tour — beginning with what actually happens before your first byte of response.
