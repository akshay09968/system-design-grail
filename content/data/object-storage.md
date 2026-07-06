# Object, Block & File Storage

Databases get the glory, but object storage holds the actual internet: every photo, video, backup, ML dataset, log archive, container image, and data lake on Earth lives in something shaped like S3. It's arguably the most consequential storage system ever built — and in interviews it's the quiet workhorse that separates complete designs from database-only ones, because *any* system with media, uploads, backups, or big data needs this page in its diagram.

## The three abstractions

| | Block | File | Object |
|---|---|---|---|
| Interface | raw device (read sector N) | POSIX tree (open/seek/write) | HTTP: GET/PUT whole objects by key |
| Sharing | one attacher (typically) | many clients, shared tree | planet-scale concurrent |
| Latency | lowest (µs–ms) | low-ms | ms–tens of ms, first-byte |
| Scale ceiling | volume-sized | painful (metadata is the wall) | **effectively none** |
| Cost/GB | highest | high | **lowest, tiered lower** |
| Habitat | database volumes (EBS), boot disks | lift-and-shift apps, shared configs, home dirs (NFS/EFS) | media, backups, lakes, artifacts — *everything at rest* |

The pattern behind the table: each abstraction trades interface richness for scale. Block gives you every byte addressable and one consumer; POSIX gives you hierarchy and rename-atomicity and pays for it in metadata coordination (the reason "scale out NFS" is a haunted phrase); objects give up in-place mutation entirely — **whole-object PUT/GET, no partial update** — and in exchange the flat keyspace partitions perfectly and scales without visible limit ([the KV refusal](nosql.md), applied to bytes).

## The object model's power features

- **Keys, not folders** — `photos/2026/07/cat.jpg` is one flat key; the "folders" are a prefix illusion. Listing is by prefix; design keys for your access patterns (and their [shard-ability](partitioning.md)).
- **Multipart upload** — big objects go up as parallel, individually-retryable parts, assembled on completion. This is *the* mechanic for large files: parallelism for throughput, resumability for flaky links.
- **Range GET** — read bytes 40,000,000–41,000,000 of a 2 GB file: video seeking, Parquet column pruning ([analytics](analytics.md)), and resumable downloads, all one header.
- **Presigned URLs — the design pattern that should be reflexive.** Your service *signs* a time-limited URL; the client uploads/downloads **directly to object storage**, never streaming bytes through your API fleet. Your servers handle authorization and metadata (tiny), the object store handles bandwidth (enormous). Any interview featuring uploads — photos, video, attachments — should include this sentence: *"clients get a presigned URL and talk to S3 directly; my service never touches the bytes."*
- **Versioning & conditional writes** — object versions defend against overwrite/delete mistakes; and modern S3 supports strong read-after-write consistency (since 2020 — the eventual-consistency folklore is obsolete) plus compare-and-swap conditional PUTs, which is quietly enabling whole databases and queues to be built *on* object storage.

## Durability: the eleven-nines machinery

"99.999999999% durable" isn't marketing mist; it's engineering you can name:

- **Erasure coding** — objects split into *k* data + *m* parity fragments (say 6+3) spread across ≥3 AZs: any 6 of 9 fragments reconstruct the object. Tolerance of 3 simultaneous losses at **1.5× storage overhead**, versus 3× for triple replication — the arithmetic that makes exabyte durability affordable. (Hot/small objects often stay replicated for latency; big/cool ones get coded — engines mix.)
- **Continuous scrubbing** — background processes forever re-read fragments, verify checksums, and re-code any rot away. Durability is a *process*, not a property: bits decay, and the system out-repairs the decay rate.
- **Durability ≠ availability** — eleven nines durable, "only" three-to-four nines *available*: the bytes essentially cannot be lost, but you can absolutely fail to reach them for minutes. Design accordingly (and remember the greater truth: none of those nines protect you from *your own delete* — versioning, MFA-delete, and object-lock exist because the biggest threat to data is authorized software).

## The economics: tiering is the design

Object storage is where storage cost becomes an architecture problem, because the price ladder is steep — order-of-magnitude for 1 PB/month: Standard ~$20k+, Infrequent-Access ~$12k, archive classes ~$1–4k — with retrieval fees and latency (minutes–hours for deep archive) climbing as storage cost falls. The design moves:

- **Lifecycle policies as code** — objects age through tiers automatically (hot 30 days → IA → archive after 90 → delete after 7 years); the [log-pipeline math](../foundations/estimation.md) only works because of this ladder.
- **Egress is the real bill** — storing 1 PB is thousands; *serving* it across the internet repeatedly is tens of thousands. Hence [CDNs](../networking/cdn.md) in front, compute moved *to* the data ([analytics](analytics.md)), and the "data gravity" of the staff callout.
- **Request pricing punishes tiny objects** — a billion 4 KB objects cost more in PUT/GET fees and list operations than in bytes; pack small records into bundles (or a database — small hot records were never object storage's job).

## The universal split

The pattern that should be muscle memory: **metadata in a database, bytes in object storage.** The photo row (owner, timestamp, dimensions, key) lives in [Postgres](sql-at-scale.md); the photo lives at that key in S3; the [CDN](../networking/cdn.md) serves it by URL. Never bytes in the database (bloat, backup pain, cache pollution), never truth in bucket listings (LIST is slow, unindexed, and not a query language). Corollary pattern: **content-addressed storage** — key = hash of content → free deduplication, natural immutability, cache-forever semantics (the [hashed-asset CDN pattern](../networking/cdn.md) and every container registry are exactly this).

!!! ops "DevOps lens"
    Object storage runs half your platform underneath: [CI/CD artifacts](../devops/cicd.md), container layers, [Terraform state](../devops/iac-gitops.md), backups, [log archives](../case-studies/log-pipeline.md) — so its operational surface is yours even if no product feature touches it. The watch-list: **503 SlowDown responses** (per-prefix request-rate limits are real at extreme scale — key design and client backoff matter), **lifecycle rules verified, not assumed** (the petabyte that never transitioned because a filter didn't match is a five-figure monthly surprise), **cost anomaly alerts** (the horror genre: logging loops writing logs *about* writing logs, cross-region replication doubling silently, versioning retaining every state of a churning file), and **the security file**: public-bucket scanning, default encryption, deny-public org policies — "open S3 bucket" remains one of the most common breach headlines a decade running, and the fix is one policy you set once.

!!! staff "Staff+ altitude"
    Markers: (1) **Data gravity is strategy** — a petabyte in one provider's object store, with egress priced as it is, decides where your compute, analytics, and even acquisitions land for years; multi-cloud "portability" claims that ignore egress arithmetic aren't strategies, they're slideware. A Staff engineer prices the moat explicitly. (2) **Tiering as a FinOps program, owned** — someone must own the lifecycle-policy estate, the storage-class mix report, and the "what are we keeping and why" question; unowned, storage grows monotonically forever (it's the one resource that never complains). (3) **Immutability as a security control** — object-lock/WORM + versioning is your ransomware and rogue-deploy defense, and increasingly a compliance requirement (audit logs, financial records); design retention as *governance*, with legal at the table. (4) Know that the object store is becoming the **substrate layer** — lakehouses, queues, even OLTP-adjacent systems now build on S3 + conditional writes; "just put it on object storage and let engines compete over it" is the current decade's winning data architecture ([next page](analytics.md)).

!!! interview "In the interview"
    Reflexes: any upload feature → **presigned URLs** ("service signs, client talks to S3 directly, bytes never traverse my API"); any media/backup/big-data mention → **metadata-DB + object-bytes split**; any cost probe → **the tier ladder with numbers** ("hot 30 days, IA to 90, archive after — that's the difference between $20k and $2k a month at a petabyte"). Depth nuggets on demand: **erasure coding vs. replication** (6+3 → survive 3 losses at 1.5× overhead — one sentence, big signal), **durability vs. availability** distinction, **multipart + range** for large-file mechanics, and the modern-consistency correction if someone repeats the old eventual-consistency folklore. Probes to expect: *"why not store images in the database?"* (bloat, backups, buffer-pool pollution, and the DB adds nothing — no queries over pixels); *"how does the 5 GB video upload work?"* (presigned multipart, parallel parts, resumable); *"how do you make storage cheap at scale?"* (lifecycle tiering + pack small objects + egress-aware serving via CDN).

**Next:** [Analytics & data pipelines](analytics.md) — row stores answer "what is order 42"; this page is for "what were all four billion orders doing last quarter."
