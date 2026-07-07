# Design Docs, RFCs & ADRs

Here is the transition nobody announces: at Staff+, your primary output stops being code and becomes **documents that make groups of people converge**. A design doc is not paperwork *about* the work — at this level it *is* the work: one document read by thirty engineers, three teams, and two skeptical directors does what no amount of hallway persuasion can, and it keeps doing it while you sleep. Writing them well is the single highest-leverage skill on the Staff+ ladder, and it's a craft with learnable mechanics.

## Why writing wins

Four properties no meeting has: **scale** (1 doc : N readers, asynchronously, across time zones); **rigor** (prose exposes hand-waving that slides survive — "we'll handle failover appropriately" dies on the page); **memory** (the org can re-read *why* long after everyone involved has left — see ADRs below); and **fairness** (the best argument wins on paper more often than the loudest voice wins in a room). Amazon banned slides for prose memos on exactly this reasoning; you don't need the mandate to adopt the practice.

## Anatomy of a design doc

The structure below is the industry's convergent form — and every section maps to a discipline this site already taught:

1. **Context & problem** — what hurts, for whom, with numbers ([estimation](../foundations/estimation.md) opens documents just like it opens interviews). One paragraph a new reader can follow.
2. **Goals / non-goals** — the scope contract ([the core-three move](../interviews/requirements-estimation.md), written down). Non-goals are the load-bearing half: they're where you pre-empt the scope creep that kills reviews.
3. **Proposed design** — the [skeleton](../foundations/thinking-in-systems.md): stores, flows, boundaries; diagrams with labeled arrows; the [sync/async line](../foundations/thinking-in-systems.md) drawn. Depth proportional to risk — deep on the novel parts, one line on the boring ones.
4. **Alternatives considered** — the section experienced reviewers read *first*, and the honesty test of the whole document: **a doc with weak alternatives is an advertisement, not an analysis.** Each alternative gets its genuine best case and the specific reason it loses *here* ([the trade-off template](../foundations/thinking-in-systems.md), in prose). Always include the boring option and "do nothing."
5. **Failure modes & risks** — [the four questions](../foundations/thinking-in-systems.md), answered before reviewers ask them; blast radius; the [degraded modes](../distributed/resilience.md).
6. **Rollout & migration** — how we get there from *here*, reversibly ([expand-contract](../data/sql-at-scale.md), [flags, waves](../devops/deployments.md)); the design that can't be shipped incrementally isn't finished.
7. **Cost** — [the costed paragraph](../devops/cost-capacity.md): order-of-magnitude infra + engineering time. Its absence is the most common Staff-doc gap.
8. **Open questions & decision requested** — what you actually need from readers. A doc that doesn't name its decision gets discussion instead of decisions.

**Ceremony scales with reversibility.** A two-way-door decision (easily reversed) deserves a one-pager and a fast yes; a one-way door ([shard keys](../data/partitioning.md), public APIs, [datastore choices](../data/nosql.md), org boundaries) deserves the full form and real review. Applying heavyweight process to reversible choices is how organizations calcify; applying lightweight process to irreversible ones is how they end up on the [migration treadmill](technology-strategy.md).

## Writing craft: the moves that separate good docs

- **Write the reader's objections first.** Draft, then simulate your three toughest reviewers and answer them *in the text*. A pre-empted objection is a review comment that never happens.
- **Numbers over adjectives.** "Significant load" is an argument; "40k QPS peak, [do the math]" is a fact. Every "large/slow/expensive" in a draft is a place a number should be.
- **BLUF — bottom line up front.** Recommendation in the first five lines. Readers who trust you stop there; skeptics read on with the conclusion framing the evidence. Suspense is for novels.
- **One idea per document.** The doc proposing a new queue *and* a reorg *and* a datastore migration gets none of them approved. Split it.
- **Make it skimmable** — headers that carry the argument by themselves, bold key sentences, tables for enumerable things ([the same rules as this site](../interviews/communication.md), because reading is reading).

## The RFC process: socialize, then broadcast

The document is half the craft; the *process* is the other half:

1. **Draft privately, review early.** Show a rough draft to 2–3 people whose objections are most dangerous — *before* wide circulation. **Never surprise a stakeholder in public**: the co-worker who first sees your proposal-touching-their-system in a 40-person channel is now an opponent regardless of the proposal's merits. Pre-socialization converts your sharpest critics into co-authors (credit them; it's cheap and true).
2. **Circulate with a clock.** Comment period with an explicit end ("decision Friday"), a named decision-maker, and the decision requested stated up front. RFCs without deadlines become permanent conversations.
3. **Run the review meeting for the open questions only.** Pre-read culture (or Amazon-style silent reading at the start); the author steers discussion *away* from what's already settled in the text and *toward* the genuinely open. The meeting's output is a decision, minuted in the doc.
4. **Record the outcome — including the dissent.** "Decided: option B. Objections noted: X's concern about cross-region latency — accepted risk, revisit at 10× traffic." Dissent-on-the-record is what makes *disagree and commit* legitimate rather than steamrolling.

## ADRs: institutional memory as a practice

An **Architecture Decision Record** is the design doc's minimalist sibling: half a page per significant decision — context, decision, consequences — numbered and versioned in the repo next to the code. The org failure it prevents is one you've met: *"why is it like this?" — "nobody knows, it predates everyone"* — which is how load-bearing accidents become permanent. ADRs make [Chesterton's fence](technology-strategy.md) inspectable: future engineers (and future *you*) can distinguish "deliberate trade-off, still valid" from "2019 expedient, safe to remove." The discipline that makes them work: written at decision time (not archaeologically), immutable once accepted (superseded by new ADRs, never edited — [the append-only ledger instinct](../case-studies/payments.md), applied to decisions), and linked from the code they govern.

!!! ops "DevOps lens"
    Ops already runs on this craft under other names — recognize the transfer and you're halfway trained: a **[postmortem](../observability/incidents.md)** is a design doc about the past (context, timeline, contributing factors, decisions requested — the blameless discipline *is* the alternatives-considered honesty); a **[runbook](../observability/alerting.md)** is a design doc for 3 a.m. (BLUF taken literally: mitigation first, diagnosis later); a **[production-readiness review](architecture-reviews.md)** is an RFC with a checklist. The ops-specific edge in design docs: your failure-modes and rollout sections will be the best in the room, because you've lived what happens when they're missing. The ops-specific gap: cost and *organizational* consequences sections — lean on [the cost page](../devops/cost-capacity.md) and [org design](org-design.md) deliberately.

!!! staff "Staff+ altitude"
    Markers: (1) **Templates are a paved road** — a good org-wide design-doc template (with the failure-modes, cost, and rollout sections *pre-printed as headings*) raises every team's floor; shipping one is a classic Staff move ([the paved-road argument](../caching/failure-modes.md), applied to thinking). (2) **Docs have SLOs too** — review turnaround norms ("48h for one-pagers, one week for RFCs") prevent the graveyard-of-unreviewed-docs failure mode that teaches engineers to stop writing. (3) **The decision log is a strategy input** — a quarterly read-across of ADRs reveals the org's *actual* technical direction (as opposed to the stated one) the same way [postmortem read-acrosses](../observability/incidents.md) reveal systemic fragility; both feed [strategy](technology-strategy.md). (4) **Kill the meeting-first culture by substitution, not decree** — every time a decision meeting looms, pre-empt it with a one-pager and watch the meeting shrink to twenty minutes of open questions. Demonstrated, the practice spreads itself.

!!! interview "In the interview"
    Staff+ loops test this directly and indirectly. Directly: *"walk me through a design doc you wrote"* — have one rehearsed (sanitized), and walk it as this page's anatomy: the problem's numbers, the non-goals, the alternative you rejected *and why it was genuinely tempting*, the rollout, what you'd change now. The alternatives discussion is where the evaluation happens — it's [trade-off maturity](../interviews/communication.md) with receipts. Indirectly: some companies run written exercises (a one-hour mini-RFC) — the anatomy above is your template, BLUF discipline is your time manager. And in every verbal design interview, the doc mindset shows up as structure: goals/non-goals stated, alternatives named before the interviewer asks, the decision-requested habit becoming "here's my recommendation and the trade I'm accepting." Interviewers describe that candidate as "already operating at the level" — which is, recall, [how the level is actually granted](the-path.md).

**Next:** [Architecture reviews](architecture-reviews.md) — the other side of the table, where you'll spend ten hours for every one you spend authoring.
