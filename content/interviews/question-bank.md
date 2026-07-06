# Question Bank & Practice

The canon of system design questions is smaller than it looks — a few dozen prompts, most of which are the same five or six underlying shapes wearing different products. This page maps the canon to this site's [case studies](../case-studies/index.md), names the shapes so you can recognize a "new" question as an old one in costume, and lays out a practice regimen that builds the actual skill: performing design out loud, under a clock.

## The canon, mapped

**The classics** (asked everywhere, at every level):

| Question | Case study | The shape underneath |
|---|---|---|
| URL shortener | [full walkthrough](../case-studies/url-shortener.md) | Key generation, read-heavy caching, redirects |
| Rate limiter | [full walkthrough](../case-studies/rate-limiter.md) | [Algorithms + distributed state](../distributed/rate-limiting.md) |
| Notification system | [full walkthrough](../case-studies/notifications.md) | Queue fan-out, providers, [idempotency](../messaging/delivery-semantics.md) |
| Chat (WhatsApp/Slack) | [full walkthrough](../case-studies/chat.md) | [Stateful connections](../networking/apis.md), per-key ordering, presence |
| News feed (Twitter/Instagram) | [full walkthrough](../case-studies/news-feed.md) | Push/pull fan-out, [the celebrity problem](../caching/failure-modes.md) |
| Video streaming (YouTube/Netflix) | [full walkthrough](../case-studies/video-streaming.md) | [Object storage + CDN + pipeline](../data/object-storage.md) |
| Typeahead / autocomplete | [full walkthrough](../case-studies/typeahead.md) | Prefix structures, [cached top-K](../caching/fundamentals.md) |
| Web crawler | [full walkthrough](../case-studies/web-crawler.md) | [Frontier queue, politeness, dedup](../messaging/async-fundamentals.md) |
| Ride-hailing / proximity (Uber) | [full walkthrough](../case-studies/proximity.md) | Geo-indexing, [matching, location ingest](../caching/redis.md) |
| Payment system | [full walkthrough](../case-studies/payments.md) | [Ledgers, sagas, reconciliation](../data/distributed-transactions.md) |
| Key-value store (Dynamo-style) | [full walkthrough](../case-studies/kv-store.md) | [The NoSQL page as a design](../data/nosql.md) |

**The DevOps specials** (increasingly asked, and *your* home turf — [the full argument](../foundations/devops-lens.md)):

| Question | Case study | Why it favors you |
|---|---|---|
| Metrics/monitoring system | [full walkthrough](../case-studies/metrics-system.md) | [You've operated the real one](../observability/metrics.md) |
| Log aggregation pipeline | [full walkthrough](../case-studies/log-pipeline.md) | [The volume math is your daily bread](../observability/logging.md) |
| CI/CD platform | [full walkthrough](../case-studies/cicd-platform.md) | [Queue-DAG-artifact-trust](../devops/cicd.md), lived |
| Distributed job scheduler | [full walkthrough](../case-studies/job-scheduler.md) | [Leases, fencing, exactly-once-ish](../distributed/coordination.md) |
| Feature flag system | [full walkthrough](../case-studies/feature-flags.md) | [Config planes and fail-static](../devops/deployments.md) |

**The shapes** — recognize these and no question is truly new: *read-heavy content* (shortener, feeds, video, typeahead → [cache/CDN/precompute](../foundations/thinking-in-systems.md)); *write-heavy ingest* (metrics, logs, tracking → [partition/batch/append](../foundations/scalability.md)); *fan-out* (feeds, notifications, chat → [push/pull + amplification math](../case-studies/news-feed.md)); *stateful connections* (chat, gaming, collaboration → [connection tier + pub/sub backbone](../case-studies/chat.md)); *coordination-critical* (schedulers, payments, inventory → [idempotency + ownership + fencing](../distributed/coordination.md)); *matching/geo* (ride-hailing, delivery → [spatial index + streaming location](../case-studies/proximity.md)). When a prompt lands, your first silent question is *which shapes is this made of?* — most real products are two shapes stapled together (Instagram = read-heavy content + fan-out; Uber Eats = matching + fan-out).

## The practice regimen

Knowledge accumulates by reading; the *performance* skill builds only one way — **out loud, timed, repeatedly**:

1. **Study phase** (per case study): read the walkthrough actively — pause at each design decision, answer before reading on, [run the four questions](../foundations/thinking-in-systems.md) on each component yourself.
2. **Rehearsal phase**: 48 hours later, take the same prompt cold — 40 minutes, whiteboard or tablet, **speaking continuously** to an empty room. The silence where your narration stalls is the exact spot to re-study. (Recording and reviewing one of these per week is [the communication page's](communication.md) highest-ROI exercise.)
3. **Transfer phase**: take an *unmapped* prompt (design Strava, Ticketmaster, a parking system, Google Docs) and run the full [framework](framework.md) — the test is whether the shapes transfer, and ticket-buying (inventory + contention + [the thundering herd on drop day](../caching/failure-modes.md)) or collaborative editing ([CRDTs/OT + presence](../data/replication.md)) will tell you honestly.
4. **Mock phase**: humans, ideally strangers — peers, mock platforms, or the strongest engineer who'll say yes. Ask them to interrupt, redirect, and push back mid-flow; [handling the twist](framework.md) is a skill reading cannot build. Two mocks minimum before the real loop; the first one is always rough, which is precisely why it shouldn't be the real one.

**Cadence for a 3–4 week runway**: week 1 — [Foundations](../foundations/index.md) + framework + two classics studied-and-rehearsed; week 2 — four more case studies (mix classics and specials) + first mock; week 3 — transfer prompts + deep-dive weak sections (the rehearsal stalls tell you which) + second mock; final days — [cheat sheets](cheatsheets.md), re-rehearse your two strongest walkthroughs (confidence is a legitimate prep target), sleep.

!!! staff "Staff+ altitude"
    Adjust practice to the loop you're actually facing: Staff+ loops add **design-review interviews** (critique a flawed design — practice by [running the four questions and the review lenses](../foundations/thinking-in-systems.md) against sample architectures, out loud), **deep retrospectives** ("walk me through the hardest system you've operated" — [structure your war stories](../observability/incidents.md) as detection → decision → systemic fix, and have three ready: an outage, a migration, a design you reversed), and **the whether-questions** ([build-vs-buy, sequencing, kill decisions](communication.md)) — practice by taking any canon prompt and answering *only* the Principal layer for ten minutes: what would you buy, defer, refuse? If that layer feels thin, the [Staff+ callouts across this site](../foundations/devops-lens.md) are your syllabus — they were written to be exactly that.

!!! interview "In the interview"
    Question-selection meta, for when loops offer choice or interviewers ask "what would you like to design?": pick the prompt whose *shape you've rehearsed*, not the product you use most — familiarity with the app is worth far less than fluency with the pattern. And if you're offered a DevOps special, **take it every time**: the [metrics system](../case-studies/metrics-system.md) or [CI/CD platform](../case-studies/cicd-platform.md) prompt hands you home-field advantage that no generic candidate can match — you'll be describing systems you've *operated in anger*, and [that smell](../foundations/devops-lens.md) is the strongest signal you can emit. The site's closing advice for the night before: don't cram new material — re-read [the DevOps lens](../foundations/devops-lens.md) and your two rehearsed walkthroughs, review the [cheat sheets](cheatsheets.md), and remember that the interviewer is hoping you're good. Go be what they're hoping for.

**Next:** the [Case Studies](../case-studies/index.md) themselves — every walkthrough above, in full.
