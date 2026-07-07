---
hide:
  - navigation
  - toc
---

# The System Design Grail

**System design mastery, from the only perspective that has actually watched systems fail: operations.**

Most system design resources teach boxes and arrows. This one teaches boxes, arrows, and *what happens at 3 a.m. when one of the boxes catches fire* — because that is what separates a memorized answer from an engineer the interviewer wants on their team. Ninety-plus deep-dive pages, sixteen full case studies, and a thread of production judgment running through all of it: every topic carries a gold **DevOps lens** callout (how it bites in production), a purple **Staff+ altitude** callout (the judgment layer — evolution, cost, org-shape), and a teal **In the interview** callout (how to deploy it under questioning, with the follow-ups pre-answered).

[Start with Foundations](foundations/index.md){ .md-button .md-button--primary }
[Interview Playbook](interviews/index.md){ .md-button }
[Case Studies](case-studies/index.md){ .md-button }

---

## How to use this site

**Preparing for interviews (2–4 weeks out).** Read [Foundations](foundations/index.md) end to end, then the [Interview Playbook](interviews/index.md), then one [case study](case-studies/index.md) per day — using the topic sections as deep-dive references whenever a walkthrough exposes a gap. The [practice regimen](interviews/question-bank.md) makes it a schedule.

**Refreshing a concept.** Press ++s++ and search. Every page is self-contained: intuition first, then mechanics, then numbers, then trade-offs, then the production failure story.

**Building toward Staff/Principal/CTO.** Read one section per week in order — each builds on the last — and treat the purple callouts as your syllabus: they are the altitude layer, distilled. Then [Leadership & Strategy](leadership/index.md) teaches the medium those levels actually work in — docs, reviews, strategy, org design, executive craft — and the [resources page](reference/resources.md) maps the deeper literature.

**Cramming tonight.** Every section index has an *"If you are cramming"* note. Trust them, and end on the [cheat sheets](interviews/cheatsheets.md).

## The curriculum

<div class="grid cards" markdown>

-   **1 · [Foundations](foundations/index.md)**

    ---
    The DevOps lens, thinking in systems, scalability, reliability math, latency & Little's law, CAP/PACELC, consistency models, estimation. *The vocabulary everything else is written in.*

-   **2 · [Networking & Edge](networking/index.md)**

    ---
    TCP/TLS physics, DNS honestly, HTTP 1.1→3, API styles, load balancing, proxies & gateways, CDNs. *The price list of every arrow you'll ever draw.*

-   **3 · [Data & Storage](data/index.md)**

    ---
    B-trees vs. LSM, SQL at scale, the NoSQL refusals, replication, sharding, transactions & isolation, sagas & outbox, object storage, analytics. *Where the difficulty concentrates.*

-   **4 · [Caching](caching/index.md)**

    ---
    The patterns, Redis as a Swiss army knife, and the named disasters — stampede, avalanche, penetration, hot keys, the dependency cliff.

-   **5 · [Messaging & Streaming](messaging/index.md)**

    ---
    Queues as shock absorbers, Kafka as a commit log, the truth about exactly-once, event sourcing & CQRS with honest bills attached.

-   **6 · [Distributed Systems](distributed/index.md)**

    ---
    Gray failures, metastability, clocks that lie, Raft, fencing tokens, the anti-cascade toolkit, rate limiting. *The theory your on-call scars already paid for.*

-   **7 · [DevOps & Platform](devops/index.md)**

    ---
    Linux at scale, containers, Kubernetes as a worked distributed system, mesh, CI/CD, deployment strategies, IaC/GitOps, secrets, cloud networking, multi-region, cost. *The crown jewel — your unfair advantage, systematized.*

-   **8 · [Observability & SRE](observability/index.md)**

    ---
    Metrics, logs, traces as one workflow; SLOs & burn rates; alerting that respects sleep; incidents & postmortems; chaos as the scientific method.

-   **9 · [Security](security/index.md)**

    ---
    Sessions vs. JWTs honestly, OAuth/OIDC without fog, zero trust as three sentences, defense in depth, and the five-minute review checklist.

-   **10 · [Interview Playbook](interviews/index.md)**

    ---
    The seven-phase framework, requirements & estimation as weapons, Senior vs. Staff vs. Principal on the same question, cheat sheets, practice system.

-   **11 · [Case Studies](case-studies/index.md)**

    ---
    Eleven classics from URL shortener to a Dynamo-style KV store — plus five DevOps specials (metrics, logs, CI/CD, scheduler, flags) where you have home-field advantage.

-   **12 · [Leadership & Strategy](leadership/index.md)**

    ---
    The Staff→Principal→CTO layer: design docs & RFCs, architecture reviews, technology strategy, org design, and executive craft. *The medium changes; this teaches the new one.*

-   **13 · [Reference](reference/index.md)**

    ---
    The glossary (every term, linked to its lesson) and the resource list that's actually worth your hours.

</div>

## Why the DevOps lens wins

Interviewers grade two things: whether your design works on the whiteboard, and whether they believe it would survive contact with reality. The second is where operations experience is an unfair advantage — you have *seen* retry storms, cascading failures, hot shards, and deploys that took down the dashboards needed to debug them. This site turns that experience into interview currency, and then into career currency: the [Staff+ callouts](foundations/devops-lens.md) are the judgment layer — trade-offs priced, migrations sequenced, blast radii bounded — that turns "strong senior" into "obvious next-level hire."

And past the interviews: these ideas are genuinely beautiful. The same law governs your thread pools and the queue at your coffee shop. A shopping-cart requirement, held stubbornly enough, generates half of modern database design. Somewhere between [Little's law](foundations/latency-throughput.md) and [the fencing token](distributed/coordination.md), the field stops being interview material and starts being a lens — and that's when it gets fun.
