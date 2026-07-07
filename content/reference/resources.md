# Resources

The short list that earns its hours — annotated with *why* and *when*, because a reading list without opinions is just a longer backlog.

## Books

- **Designing Data-Intensive Applications** — Martin Kleppmann. The canonical deep text; this site's [data](../data/index.md) and [distributed](../distributed/index.md) sections are the interview-ready layer above it. Read it *after* your first pass here, chapter-by-chapter alongside the matching sections. If you read one book, it's this one.
- **Site Reliability Engineering** (the Google SRE book, free online) + **The SRE Workbook**. The source of [SLOs, error budgets](../observability/slos.md), and [incident discipline](../observability/incidents.md). Skim the culture chapters, study the SLO/alerting/postmortem ones.
- **Understanding Distributed Systems** — Roberto Vitillo. The gentlest rigorous on-ramp; excellent pre-DDIA if the theory pages here felt steep.
- **Database Internals** — Alex Petrov. When [storage engines](../data/storage-engines.md) hooked you and you want B-trees and consensus at implementation depth.
- **Release It!** — Michael Nygard. The [resilience patterns](../distributed/resilience.md) with production war stories attached; the book that named bulkheads and made timeouts a philosophy.
- **System Design Interview vol. 1 & 2** — Alex Xu. The interview-prep standard; breadth over depth. Use for question coverage, then come back here for the *why* under each answer.

## Papers (each ~an evening, each worth it)

- **Dynamo** (Amazon, 2007) — [the availability-first thriller](../data/nosql.md); read it after the [KV-store case study](../case-studies/kv-store.md) and watch every mechanism click.
- **Raft: In Search of an Understandable Consensus Algorithm** (Ongaro & Ousterhout) — readable as promised; pairs with [the consensus page](../distributed/consensus.md).
- **Spanner** (Google, 2012) — [TrueTime and commit-wait](../distributed/time-ordering.md); the "pay latency for ordering" masterclass.
- **The Google File System** + **MapReduce** — historical, foundational; where [the big-data lineage](../data/analytics.md) begins.
- **Kafka: a Distributed Messaging System for Log Processing** + Jay Kreps' essay **"The Log"** — the essay especially: [the log-is-the-database worldview](../data/storage-engines.md) in its original voice; arguably the best single blog post in distributed systems.
- **Borg** (Google, 2015) — [Kubernetes' ancestor](../devops/kubernetes-architecture.md); read to see which K8s decisions were inherited scar tissue.
- **Shuffle Sharding** (AWS builders' library) — [blast-radius combinatorics](../foundations/reliability-availability.md) in a short, superb read.
- **Metastable Failures in Distributed Systems** (Bronson et al., HotOS '21) — the paper behind [the concept](../distributed/failure-modes.md) that upgrades your incident vocabulary.

## Engineering blogs (the consistently-worth-it tier)

- **AWS Builders' Library** — Amazon's operational essays ([timeouts and retries, shuffle sharding, static stability](../devops/multi-region.md)) — the closest thing to this site's ops callouts written by the people who coined them.
- **Cloudflare blog** — [networking](../networking/index.md) depth (DNS, DDoS, protocol post-mortems) with real incident forensics.
- **Netflix TechBlog** — [chaos engineering](../observability/chaos.md), regional failover drills, adaptive concurrency.
- **Stripe engineering** — [idempotency, ledgers, API design](../case-studies/payments.md); the payments case study's real-world footnotes.
- **Discord engineering** — [the chat case study](../case-studies/chat.md) at scale, repeatedly (their storage migrations are a series worth binging).
- **Uber engineering** — [geo-indexing (H3), matching, schemaless](../case-studies/proximity.md).
- **Meta engineering** — cache consistency (the TAO and memcache papers/posts pair with [caching](../caching/index.md)), and MyRocks for [the storage-engine swap story](../data/storage-engines.md).
- **Incident write-up collections** — public postmortems (Cloudflare's, Google's, GitHub's) are [free chaos-engineering findings](../observability/incidents.md); read one per week and pattern-match against [the failure-modes taxonomy](../distributed/failure-modes.md).

## The leadership shelf

The companion canon for the [Leadership & Strategy section](../leadership/index.md) — read alongside doing the job, not instead of it:

- **Staff Engineer** — Will Larson. The Staff+ role defined: archetypes, getting the title, operating in it. [The path page](../leadership/the-path.md) is the compressed version; this is the field guide. Pair with the free story collection at StaffEng.com.
- **The Staff Engineer's Path** — Tanya Reilly. The complementary take: the "big picture, execution, leveling up" triad, and the best treatment in print of glue work and cross-team influence.
- **An Elegant Puzzle** — Will Larson. Engineering management as systems thinking — read it even (especially) as an IC: it's the manual for the machine you're operating inside. The migrations chapter underwrites [the strategy page](../leadership/technology-strategy.md).
- **Team Topologies** — Skelton & Pais. The org-design vocabulary [this site uses](../leadership/org-design.md): four team types, three interaction modes, cognitive load as the sizing metric.
- **Accelerate** — Forsgren, Humble & Kim. The research behind the DORA metrics — the evidence that delivery performance predicts business outcomes, i.e., [the executive-craft page's](../leadership/executive-craft.md) footnotes.
- **Good Strategy / Bad Strategy** — Richard Rumelt. The kernel (diagnosis → policy → action) that [the strategy page](../leadership/technology-strategy.md) borrows; the "bad strategy" chapters are a mirror most tech-strategy docs can't survive.
- **The Manager's Path** — Camille Fournier. Even staying IC: it's the map of what your managers are supposed to be doing, which is exactly what you need to work with (and around) them at Staff+.
- **"Choose Boring Technology"** — Dan McKinley (essay, free). Innovation tokens in the original voice; the single most quotable piece of technology strategy ever written.
- **High Output Management** — Andy Grove. The 1983 book every modern management book is quietly rewriting: leverage, meetings as media, managerial output = output of the org beneath you.

## Talks

- **"Mastering Chaos — A Netflix Guide to Microservices"** (Josh Evans) — the microservice operational reality in one hour.
- **Raft visualizations** (thesecretlivesofdata.com) — [consensus](../distributed/consensus.md) animated; ten minutes, permanent intuition.
- **Kleppmann's "Distributed Systems" lecture series** (Cambridge, free on YouTube) — when you want [the theory pages](../distributed/index.md) as a taught course.

## How to use this list

Interview-prep mode: this site → Alex Xu for question breadth → DDIA chapters for your weak sections. Depth mode (the [Staff+ trajectory](../foundations/devops-lens.md)): DDIA cover to cover, one paper per week with notes, one public postmortem per week pattern-matched. The compounding trick either way: after every resource, write the three-sentence version *in your own words* — [the expositor's rule](../interviews/communication.md): if you can't say it briefly, you don't own it yet.
