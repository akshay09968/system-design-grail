# The Path: Senior → Staff → Principal → CTO

Titles are lagging indicators. Nobody gets promoted to Staff and *then* starts doing Staff work — the level is granted to people already operating at it, usually for a year or more. That makes the career question concrete: **what is the work of the next level, and how do you start doing it from the seat you're in?** This page is the map — what actually changes at each altitude, the archetypes the levels hide, and the moves that make invisible leadership work visible.

## What actually changes

The levels differ less in difficulty than in *medium* — each one trades a familiar instrument for a more leveraged, less legible one:

| | Senior | Staff | Principal | CTO |
|---|---|---|---|---|
| **Scope** | a system | a system of systems | the org's technical direction | business ↔ technology fit |
| **Time horizon** | quarters | 1–2 years | 2–5 years | the company's lifetime |
| **Primary artifact** | code + designs | [docs, reviews](design-docs.md), [migrations](technology-strategy.md) | [strategy, standards, bets](technology-strategy.md) | [the org, capital, narrative](executive-craft.md) |
| **Impact measured by** | what you shipped | what you *enabled* | what you directed & prevented | company outcomes |
| **Relationship to code** | writer | reviewer & unblocking writer | reader | sponsor |
| **Ambiguity handled** | "build this well" | "figure out what to build" | "figure out what matters" | "figure out what business we're in, technically" |

Two consequences worth internalizing early. First: **the skills are cumulative, not substitutive** — a Principal who can't drop to [storage-engine depth](../data/storage-engines.md) on demand is a strategist nobody trusts; the altitude is earned by the floor ([the levels page](../interviews/communication.md) made this point for interviews; it's truer for the job). Second: **legibility drops as leverage rises** — everyone can see your shipped feature; almost nobody sees the outage that didn't happen because your [design review](architecture-reviews.md) caught the split-brain. Managing that visibility gap is a real skill, below.

## The Staff archetypes

"Staff engineer" hides four different jobs (Will Larson's taxonomy, which the industry adopted because it's true):

- **Tech lead** — runs a team's technical direction alongside an EM; the most common path, the most people-facing.
- **Architect** — owns a critical *area's* direction (data platform, API surface, infrastructure) across teams; lives in [docs and reviews](design-docs.md).
- **Solver** — parachuted into the hardest, vaguest problems; deep work, low meeting load, high trust required.
- **Right hand** — extends an executive's bandwidth; part strategist, part diplomat, part [firefighter](../observability/incidents.md).

For a DevOps background, the natural on-ramps are **architect** (platform/infrastructure direction — the [paved-road](../caching/failure-modes.md) estate needs an owner and you already think in it) and **solver** (production's hardest problems have always been yours). Know which game you're playing: the archetypes are evaluated differently, and drifting between them unconsciously reads as unfocused.

## Operating at the next level before the title

The mechanism of promotion at these levels is *demonstrated altitude* — and the demonstrations are specific:

- **Write the doc nobody asked for.** The [design doc or strategy memo](design-docs.md) that frames a decision the org is circling — clean diagnosis, honest alternatives, a recommendation — is the single most visible unit of Staff work. One good doc changes how the room sees you.
- **Adopt an orphaned problem.** Every org has a critical, unowned mess (the flaky deploy pipeline, the [unowned cost estate](../devops/cost-capacity.md), the [alert fatigue](../observability/alerting.md) everyone endures). Owning one end-to-end — diagnosis, plan, [migration](technology-strategy.md), finish — is a Staff project regardless of your title.
- **Make your review presence felt.** Show up in [design reviews](architecture-reviews.md) with the questions that change designs; it's the highest-frequency stage on which judgment is visible.
- **Trade glue work for *named* glue work.** Coordination, onboarding, unblocking — essential, invisible, and career-dangerous if unnamed. The fix isn't refusing it; it's converting it into artifacts (the onboarding guide, the [runbook standard](../observability/incidents.md), the process RFC) that carry your name and outlive the moment.
- **Get a sponsor, not just a mentor.** Mentors advise you; **sponsors spend their political capital on you** — putting your name up in calibration, handing you the visible problem. Sponsors are earned by making them look good: deliver on the scoped thing, then ask for the bigger one.

And the disciplines of staying effective once there: **guard maker time** (Staff+ calendars fragment; the work that got you here still needs contiguous hours), **write to think** (your conclusions now travel without you — [the doc craft](design-docs.md) is self-defense), and **stay technical on purpose** (an hour a week in the code you sponsor; the [drills](../interviews/drills.md) exist for exactly this maintenance).

## The CTO reality check

"CTO" is three jobs sharing a business card, and conflating them wrecks career plans:

- **Startup CTO (founding/≤30 eng)** — the best engineer who also hires: 70% building, 30% recruiting and de-risking. Closest to Staff-with-equity.
- **Scale-up CTO (30–300 eng)** — the transition where the job inverts: [org design](org-design.md), [strategy](technology-strategy.md), hiring machinery, and the first real [executive translation](executive-craft.md) duties. Most CTO failures happen here — the skills that built the product don't run the org.
- **Enterprise CTO** — portfolio and governance: capital allocation across technology bets, [risk](executive-craft.md), M&A [due diligence](executive-craft.md), external narrative. Often paired with a VP Eng who runs delivery.

The honest sequencing advice: the Staff→Principal path and the management path *both* lead here, but the CTO seat demands the union — technical credibility (this site's twelve sections) *plus* the org/capital/narrative craft ([the rest of this one](executive-craft.md)). Pick up the second skill set while your first is still sharp.

!!! ops "DevOps lens"
    Your background maps unusually well onto this ladder — with one warning. The assets: **operational judgment is the scarcest Staff+ input** (you've seen systems fail, so your reviews and strategies are grounded in [failure reality](../distributed/failure-modes.md) rather than whiteboard optimism); **cost fluency** is [executive language](../devops/cost-capacity.md) already; **incident command** is leadership-under-pressure with receipts ([the IC bench](../observability/incidents.md) is where many Staff engineers are first *seen*). The warning: ops careers can rail into the **solver-forever trap** — always the firefighter, never the strategist — because firefighting is visible and strategy is slow. The escape is deliberate: after each fire, write [the systemic-fix memo](../observability/incidents.md); convert incident authority into architectural authority, one document at a time.

!!! staff "Staff+ altitude"
    The meta-skill of the whole ladder is **choosing what to work on** — at Senior, work finds you; at Staff+, an infinite queue of plausible work exists and the level is expressed in which 5% you touch. The filter that scales: *leverage* (does this change what a hundred engineers do?), *irreversibility* (one-way doors get your attention; two-way doors get delegated — [the review lens](architecture-reviews.md)), and *counterfactual* (would this happen without you? then let it). Corollary: **saying no is the job** — every yes at this level is a strategy statement, and a Staff engineer who can't decline visible-but-low-leverage work becomes a very senior task rabbit. The polite no that offers the smaller version or the better owner is a skill worth scripting.

!!! interview "In the interview"
    Level-specific loops test level-specific media: **Staff loops** add design-*review* interviews (critique a flawed design — [the toolkit](architecture-reviews.md)), document exercises ("walk me through a design doc you wrote" — have one sanitized and rehearsed), and cross-team stories (influence without authority: the time you changed another team's direction *without* escalating). **Principal loops** ask for strategy narratives ("a technical direction you set and how it played out over 18 months") — structure as diagnosis → policy → actions → measured outcome. **CTO conversations** are business-fluency screens: unit economics, build-vs-buy judgment, org shape, a crisis story told from the [command seat](../observability/incidents.md). The preparation for all three is the same: **three stories, written down** — a system you led, a strategy you set, an org/process you changed — each with the business outcome quantified. [The communication page's](../interviews/communication.md) altitude ladder is the delivery guide.

**Next:** [Design docs, RFCs & ADRs](design-docs.md) — the medium in which all of this work actually happens.
