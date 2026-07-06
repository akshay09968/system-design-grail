# Requirements & Estimation

The first eight minutes of the interview decide what the remaining thirty-seven are *about* — and most candidates spend them on autopilot, asking generic questions ("how many users?") and doing ceremonial math they never use. This page upgrades both phases from ritual to weapon: requirements as *scope control*, estimation as *decision-making*. ([The core estimation toolkit — numbers, recipes, worked examples — lives in Foundations](../foundations/estimation.md); this page is its interview deployment.)

## Requirements: scope is the deliverable

The prompt is deliberately oversized — "design WhatsApp" is six months of work. The graded skill is *cutting it down defensibly*:

**Functional scope — the core-three move.** Enumerate what the product could do, then cut: "WhatsApp is 1:1 chat, group chat, presence, media, calls, stories. **Core: 1:1 delivery, group fan-out, online/offline presence.** I'll park media behind [the presigned-URL pattern](../data/object-storage.md) in one sentence and skip calls entirely — flag if you want those." That paragraph demonstrates product sense, [the courage to defer](../foundations/scalability.md), and gives the interviewer a cheap steering moment — all in twenty seconds.

**Non-functional scope — the questions that change the design.** Not a checklist recital; ask the 3–4 whose answers *reshape architecture*, and know why you're asking ([each maps to a site section](../foundations/index.md)):

| Question | Because it decides |
|---|---|
| Read:write ratio? | [The entire architecture class](../foundations/thinking-in-systems.md) — cache-heavy vs. ingest-shaped |
| Scale now, and in 18 months? | [Which rungs of the ladder](../data/sql-at-scale.md) you design for vs. pre-plan |
| Latency target, and for which operations? | [The budget](../foundations/latency-throughput.md), sync/async boundary, geography |
| What must never be lost / never be wrong? | [Consistency per data class](../foundations/consistency-models.md), [durability posture](../data/replication.md) |
| Global or regional? Residency constraints? | [The multi-region ladder and homing](../devops/multi-region.md) |
| Availability tier — what does downtime cost? | [Which nine, and what it buys](../foundations/reliability-availability.md) |

**The per-data-class instinct** is the differentiator: don't accept "strongly consistent" for the whole system — decompose it. "Messages: never lost, per-conversation ordered. Presence: [approximate, seconds-stale is fine](../foundations/cap-pacelc.md). Profiles: eventual." One sentence, three data classes, three different (cheaper, better) designs unlocked — and you've demonstrated [the five-rows-one-application pattern](../foundations/cap-pacelc.md) before drawing a box.

**Anti-patterns**: interrogating for ten minutes (five questions maximum, then *decide* — comfort with ambiguity is itself scored); accepting the prompt silently (charging into "design Twitter" without scoping reads as junior no matter what follows); and re-litigating scope mid-interview (the phase-1 contract exists so phase-5 depth doesn't drown in "wait, do we support editing?").

## Estimation: arithmetic with a verdict

[The foundations page](../foundations/estimation.md) taught the numbers and recipes; the interview deployment adds three disciplines:

**Every calculation ends in a decision.** The template: *assumption → arithmetic → "so."* "500M DAU × 20 views ÷ 10⁵ ≈ 100k QPS, 300k peak — **so** this is [CDN territory](../networking/cdn.md) and the origin design is almost boring; the real fight is the 100 PB of media — **so** [object storage with tiering](../data/object-storage.md) is where I'll spend our time." Numbers that don't steer the interview are stage props, and interviewers know the difference.

**Estimate at decision points, not just up front.** The opening sizing pass aims the interview; *surgical* estimation mid-design wins it: before choosing [fan-out strategy](../case-studies/news-feed.md) — "average user: 200 followers, so a post = 200 timeline writes; celebrity: 100M, so [push breaks and we go hybrid](../case-studies/news-feed.md)"; before choosing [a cache size](../caching/fundamentals.md) — "hot set is 20% of 500 GB = 100 GB — one Redis cluster, not a fleet." The reflex of *reaching for arithmetic when a choice appears* is the strongest estimation signal there is.

**Know which verdicts recur.** Interview problems cluster into about five estimation shapes: **traffic-boring, storage-hard** (media platforms → tiering and CDN economics); **write-heavy ingest** (metrics, logs, tracking → [batch, partition, append](../foundations/scalability.md)); **fan-out multiplication** (feeds, notifications → [the amplification trace](../foundations/thinking-in-systems.md)); **memory-fits check** ([rate limiters, sessions, presence](../foundations/estimation.md) → "it's 8 GB, one box, the hard part is elsewhere"); and **connection-count** (chat, gaming → [FD/node limits](../networking/fundamentals.md) → fleet size). Recognizing the shape in ten seconds is what practiced candidates do that first-timers can't.

!!! ops "DevOps lens"
    Your capacity-planning experience *is* this skill — say so through the numbers: when you estimate, anchor in operational reality ("a tuned API node does 5k RPS, so 300k peak is ~60 nodes plus [headroom for the scale-out lag](../devops/kubernetes-autoscaling.md) — call it 90"); when you scope non-functionals, ask the operator's versions ("what's the *peak-to-average* ratio? bursty ingest changes everything" — [the queue-as-shock-absorber decision](../messaging/async-fundamentals.md) hangs on it); and deploy [the derived-load instinct](../foundations/estimation.md) nobody else has: "every request also emits ~10 metrics samples and 2 log lines — at 300k RPS [the telemetry pipeline](../case-studies/metrics-system.md) is its own design problem." That last sentence, in a non-observability question, is pure differentiation.

!!! staff "Staff+ altitude"
    At Staff+, requirements gain a **zeroth question**: *should this be built, and what's the simplest thing that could work?* — "before designing a bespoke notification system: at this volume a managed push service + a queue covers v1; the custom fan-out tier earns itself at ~10× — I'll design for that but [sequence it](../foundations/scalability.md)." Estimation gains **cost verdicts** alongside scale verdicts ([the priced sentence](../devops/cost-capacity.md): "~$0.002/user/month, egress-dominated — the CDN contract matters more than the compute design") and **error bars as risk register** ("the 2% upload assumption drives everything; if it's 10%, storage economics flip — I'd instrument that first"). And the requirements phase becomes bidirectional: Staff candidates *volunteer* constraints the interviewer forgot ("I'm assuming compliance wants [EU residency](../devops/multi-region.md) — that homing decision is structural, so let's pin it now"). Asking better questions than the prompt anticipated is the level, demonstrated.

!!! interview "In the interview"
    The two phases compose into an opening you can rehearse as a unit — ninety seconds that sets up everything: scope contract (core three, parked features, flagged assumptions) → the 3 reshaping questions → sizing pass → **the verdict sentence** ("so the hard part is X, and that's where I'll spend our depth"). Practice it against five different prompts and the opening becomes free — zero cognitive load, maximum structural credit — leaving your full attention for [the deep dives where the interview is won](framework.md). One caution: interviewers sometimes *answer* your scoping questions with "you decide." That's not deflection; it's the test. Decide immediately, state the assumption, move — "then I'll assume 100M DAU, read-heavy 50:1, and single-region to start" — because comfort making calls under ambiguity is precisely what the phase measures.

**Next:** [Communication & levels](communication.md) — the same design, narrated at Senior, Staff, and Principal altitude.
