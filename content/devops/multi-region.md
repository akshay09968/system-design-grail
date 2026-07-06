# Multi-Region & DR

"We'll just go multi-region" is the most expensive sentence in system design, and interviewers dangle it as bait. Multi-region is where every trade-off in this site converges — [CAP](../foundations/cap-pacelc.md) meets [replication](../data/replication.md) meets [DNS honesty](../networking/dns.md) meets [correlated failure](../foundations/reliability-availability.md) meets a 2× bill — and the mark of seniority is climbing toward it *rung by rung, for a stated reason*, rather than leaping because the phrase sounds like rigor.

Start with **why**, because the three reasons produce three *different architectures*: **disaster recovery** (surviving a regional failure — rare, real, and mostly about data and rehearsal), **latency** (physics — but [CDN and edge](../networking/cdn.md) solve most of it without touching your data tier), and **data residency** (law — EU data stays in EU, which mandates *placement*, not necessarily *redundancy*). Scale is almost never the honest reason; one region holds more capacity than nearly any workload needs.

## RTO, RPO, and the ladder

Two numbers govern everything: **RPO** (recovery point objective — how much data you may lose; set by [replication mode: async lag *is* your RPO](../data/replication.md)) and **RTO** (recovery time objective — how long until service resumes; set less by technology than by *detection + decision + execution + verification*, and the decision step — a human with authority saying "fail over now" — routinely dominates; put a name and a threshold in the runbook or your real RTO includes a 40-minute meeting).

The ladder, each rung ~an order costlier than the last:

1. **Multi-AZ, single region** — the default, and genuinely excellent: [independent failure domains](../foundations/reliability-availability.md) with sub-millisecond latency between them, synchronous replication viable, one deploy target. Covers every failure mode except "the region."
2. **Backup & restore cross-region** — [tested backups](../data/sql-at-scale.md) + IaC that can rebuild. RPO hours, RTO hours-to-days, cost ≈ storage. Honest and sufficient for a surprising share of businesses.
3. **Pilot light** — data replicating continuously; minimal infrastructure warm; scale up on disaster. RPO minutes, RTO ~an hour, if the [rebuild automation is rehearsed](iac-gitops.md).
4. **Warm standby** — a scaled-down full stack serving test traffic. RPO seconds-to-minutes, RTO minutes.
5. **Active-passive, fast failover** — full-size standby, [traffic steering](../networking/dns.md) ready. RTO in minutes with rehearsal; ~2× cost; the standby's rot is your enemy (untested = fiction).
6. **Active-active** — both regions serve; a region's loss is capacity reduction, not failover. The availability summit — and the data problem's front door.

The Staff sentence about the ladder: *climb only when the current rung's residual risk is your top remaining risk* — most companies proclaiming rung 6 need rung 3 executed well.

## The data problem (there is only one)

Stateless tiers multi-region trivially ([photocopiers](../foundations/scalability.md)); **state is the entire difficulty**. Active-active with one logical dataset writable everywhere is [the multi-leader problem](../data/replication.md), conflicts and all. The honest menu:

- **Regional homing — the pattern that usually wins.** Every tenant/user has a *home region* owning their writes ([single-leader per key](../data/replication.md)); other regions serve reads or proxy writes home. Conflicts are structurally impossible, residency falls out free (EU tenants homed in EU), and "active-active" is true at the *fleet* level while staying single-writer at the *data* level. Cross-tenant data stays rare and append-ish by design.
- **Read-local, write-global** — replicas everywhere, writes to one global leader: great read latency, write latency = geography, failover = [the promotion story](../data/replication.md) at region scale.
- **Consensus-replicated (Spanner/Cockroach-class)** — truly global writes with [quorums spanning regions](../distributed/consensus.md): correctness bought with cross-region RTTs on the write path ([the PACELC bill](../foundations/cap-pacelc.md), itemized) and a [witness-region](../distributed/consensus.md) topology to make majorities meaningful.
- **CRDTs / merge-by-design** — for the narrow domains that genuinely tolerate it ([carts, counters, presence](../data/replication.md)).

And the failover fine print everyone skips: **failback**. The failed region returns — stale, cold-cached, possibly holding [un-replicated writes from before the failure](../data/replication.md) (your RPO, arriving as reconciliation homework). Rejoin is a *gradual, verified* traffic shift with [warmed caches](../caching/failure-modes.md) and data reconciliation — rushing failback causes the second outage of the day.

## Correlated dependencies: the multi-region illusion

The audit that separates real multi-region from theater — hunt the things both regions *share*:

- **The cloud's own control planes** (the industry's recurring lesson: global services with a home region — IAM changes, certificate issuance, even some consoles — degrade globally when *that* region sneezes). Corollary rule: **static stability** — surviving a region's loss must not require *control-plane actions* in the survivor (no "we'll scale up when it happens" — capacity is pre-provisioned; no "we'll update IAM" — permissions pre-exist). Say "statically stable" in an interview and watch the interviewer sit up.
- **Your own single-region tier-0**: the [deploy pipeline](cicd.md), [flag service](deployments.md), [secret store](secrets-identity.md), [monitoring](../observability/index.md) — a "multi-region" app whose feature flags, deploys, and dashboards all live in the primary region fails *with* the primary, or worse, becomes undebuggable exactly when needed. Your observability must survive the region it observes.
- **The deploy wave** — simultaneous global rollouts re-correlate what geography decoupled ([region-by-region with bake time](deployments.md), always).
- **Capacity honesty** — active-active at 2×70% load means a region's loss overloads the survivor into [cascade](../distributed/failure-modes.md); the choices are N+1 at region scale (run each ≤50%, pay for it) or a rehearsed [brownout mode](../distributed/resilience.md) (shed the sheddable when running solo). Choosing neither is choosing surprise.

!!! ops "DevOps lens"
    DR that isn't rehearsed is fiction with a budget line. The practice: **game days** on a calendar (fail the database over; then the region; eventually unannounced), **failover runbooks as decision trees** (trigger thresholds, named decision-makers, verification checklists — the *decision* is the RTO bottleneck, so pre-make it), **replication-lag dashboards per region pair** (your live RPO, [alarmed against the promise](../data/replication.md)), and **quarterly restore tests** (rung 2 is everyone's real safety net; [a backup is a hope until restored](../data/sql-at-scale.md)). Watch the drills for the truth the architecture diagram hides: the DNS TTL that [disobeys](../networking/dns.md), the standby that drifted (it wasn't in the [IaC apply path](iac-gitops.md)), the runbook step referencing a dashboard that lives in the dead region. Every drill finding is an outage refunded.

!!! staff "Staff+ altitude"
    Markers: (1) **Price the rung, present the bet** — "four nines across regions costs ~2.2× and two years of engineering; our measured regional-failure exposure is X hours/decade; here's the EV comparison against rung 3 done excellently" is the paragraph the business actually needs ([the nines-cost curve](../foundations/reliability-availability.md), applied). (2) **Residency and DR are different projects** — EU homing (placement, law, [tenant routing](../data/partitioning.md)) vs. regional survival (redundancy, failover); conflating them buys neither well. (3) **The org is part of the architecture** — a system is multi-region when its *team* is: on-call follows the sun or the pager crosses oceans, runbooks are region-neutral, and no human SPOF holds the failover keys. (4) **Audit for static stability annually** — the correlated-dependency list above rots as new tier-0 services accrete; the Staff job is re-running the "what do both regions share?" hunt before the incident does it for you.

!!! interview "In the interview"
    When the interviewer says "make it multi-region," the winning first move is a question: *"for DR, latency, or residency? They're different designs."* Then the ladder, placed: *"Latency: CDN and edge first — the data tier may not need to move. Residency: regional homing per tenant, which conveniently is also the honest active-active pattern — single-writer per tenant, conflicts impossible. DR: I'd climb the ladder — multi-AZ excellently, cross-region backups tested, then warm standby; active-active only when the data model supports homing."* Close with the two elite nuggets: **static stability** ("the surviving region needs no control-plane actions — capacity pre-provisioned, permissions pre-existing") and **the shared-fate audit** ("the real risks are what both regions share: the deploy pipeline, the flag service, the cloud's own global control planes"). Probes to expect: *"what's your RPO?"* (async lag *is* it — number, not adjective); *"how does traffic move?"* ([GSLB/anycast with DNS-TTL honesty](../networking/dns.md)); *"what breaks when you fail back?"* (stale region, cold caches, reconciliation of the pre-failure tail — gradual rejoin).

**Next:** [Cost & capacity](cost-capacity.md) — the bill as an architecture diagram, and the unit economics that make cost an engineering discipline.
