# Study Plans & Tracker

Three plans for three runways, plus a progress tracker whose checkboxes **persist in your browser** (localStorage — tick them as you go; they'll be waiting when you return). Whichever plan you run: read actively, [drill after each section](drills.md), and rehearse out loud — [the regimen](question-bank.md) is what converts reading into interview performance.

## The 48-hour cram

For the interview that's already scheduled. Ruthless triage — depth where it pays, callouts elsewhere.

- [ ] **Evening 1:** [The DevOps lens](../foundations/devops-lens.md) → [Thinking in systems](../foundations/thinking-in-systems.md) → [Estimation](../foundations/estimation.md) (memorize the numbers table)
- [ ] **Evening 1:** [The framework](framework.md) — then announce it to an empty room twice
- [ ] **Day 2 morning:** [URL shortener](../case-studies/url-shortener.md) + [news feed](../case-studies/news-feed.md), studied then rehearsed out loud, 40 min each
- [ ] **Day 2 afternoon:** [Cache failure modes](../caching/failure-modes.md), [resilience patterns](../distributed/resilience.md), [delivery semantics](../messaging/delivery-semantics.md) — the three highest-yield follow-up pages
- [ ] **Day 2 evening:** [Drills](drills.md) — Foundations + case-study sections; re-drill misses
- [ ] **Morning of:** [Cheat sheets](cheatsheets.md) only. No new material. You know things.

## The 3-week interview sprint

The standard prep arc — one pass of everything, weighted toward performance.

- [ ] **Week 1 — foundations & data:** all of [Foundations](../foundations/index.md) (2 pages/day), then [Data & Storage](../data/index.md) cram-priority order: [replication](../data/replication.md), [partitioning](../data/partitioning.md), [storage engines](../data/storage-engines.md), rest as reading
- [ ] **Week 1:** [Framework](framework.md) + [requirements & estimation](requirements-estimation.md); rehearse the 90-second opening against 3 prompts
- [ ] **Week 2 — components & first blood:** [Caching](../caching/index.md), [Messaging](../messaging/index.md), [Distributed Systems](../distributed/index.md) sections; [Networking](../networking/index.md) cram notes
- [ ] **Week 2:** four case studies studied-and-rehearsed ([shortener](../case-studies/url-shortener.md), [rate limiter](../case-studies/rate-limiter.md), [feed](../case-studies/news-feed.md), [chat](../case-studies/chat.md)) + **first mock**
- [ ] **Week 3 — altitude & polish:** [Communication & levels](communication.md) (record yourself once), one DevOps special rehearsed ([metrics](../case-studies/metrics-system.md) or [CI/CD](../case-studies/cicd-platform.md)), 2 transfer prompts cold ([question bank](question-bank.md))
- [ ] **Week 3:** [Observability](../observability/index.md) SLO + alerting pages, [deployments](../devops/deployments.md), [multi-region](../devops/multi-region.md) — the operability-close ammunition
- [ ] **Week 3:** second mock + [drills](drills.md) full pass; final days per the cram plan

## The 12-week mastery track

The fall-in-love, Staff-trajectory path: everything, in order, with practice woven in. One section ≈ one week; the pace is deliberate — retention beats coverage.

- [ ] **Weeks 1–2:** [Foundations](../foundations/index.md) complete + [framework](framework.md); start the habit: one [drill section](drills.md) per week, one estimation rep per day
- [ ] **Weeks 3–4:** [Networking](../networking/index.md) + [Data & Storage](../data/index.md) complete; rehearse [shortener](../case-studies/url-shortener.md) + [KV store](../case-studies/kv-store.md)
- [ ] **Week 5:** [Caching](../caching/index.md) + [Messaging](../messaging/index.md); rehearse [rate limiter](../case-studies/rate-limiter.md) + [notifications](../case-studies/notifications.md)
- [ ] **Week 6:** [Distributed Systems](../distributed/index.md) complete — the fencing-token and metastability stories told out loud until fluent
- [ ] **Weeks 7–8:** [DevOps & Platform](../devops/index.md) complete (your crown jewel — read every Staff+ callout twice); rehearse both [CI/CD](../case-studies/cicd-platform.md) and [scheduler](../case-studies/job-scheduler.md) specials
- [ ] **Week 9:** [Observability & SRE](../observability/index.md) + [Security](../security/index.md); rehearse [metrics system](../case-studies/metrics-system.md) + [log pipeline](../case-studies/log-pipeline.md)
- [ ] **Week 10:** remaining case studies ([feed](../case-studies/news-feed.md), [chat](../case-studies/chat.md), [video](../case-studies/video-streaming.md), [proximity](../case-studies/proximity.md), [payments](../case-studies/payments.md)); first mock
- [ ] **Week 11:** [Communication & levels](communication.md) deep work — record two sessions, run the Principal-layer-only exercise on three prompts; transfer prompts
- [ ] **Week 12:** second + third mocks, [drills](drills.md) full pass, weak-section re-reads; then one paper from [resources](../reference/resources.md) per week, forever — that's the habit that compounds past the interview

## Progress tracker

Every page in the Grail. Tick as you *finish* (read + drilled), not as you skim. State persists per-browser.

### Foundations
- [ ] [The DevOps lens](../foundations/devops-lens.md)
- [ ] [Thinking in systems](../foundations/thinking-in-systems.md)
- [ ] [Scalability](../foundations/scalability.md)
- [ ] [Reliability & availability](../foundations/reliability-availability.md)
- [ ] [Latency & throughput](../foundations/latency-throughput.md)
- [ ] [CAP & PACELC](../foundations/cap-pacelc.md)
- [ ] [Consistency models](../foundations/consistency-models.md)
- [ ] [Estimation](../foundations/estimation.md)

### Networking & Edge
- [ ] [Fundamentals](../networking/fundamentals.md)
- [ ] [DNS](../networking/dns.md)
- [ ] [HTTP 1.1→3](../networking/http.md)
- [ ] [API styles](../networking/apis.md)
- [ ] [Load balancing](../networking/load-balancing.md)
- [ ] [Proxies & gateways](../networking/proxies-gateways.md)
- [ ] [CDN](../networking/cdn.md)

### Data & Storage
- [ ] [Storage engines](../data/storage-engines.md)
- [ ] [SQL at scale](../data/sql-at-scale.md)
- [ ] [NoSQL landscape](../data/nosql.md)
- [ ] [Replication](../data/replication.md)
- [ ] [Partitioning & sharding](../data/partitioning.md)
- [ ] [Transactions & isolation](../data/transactions.md)
- [ ] [Distributed transactions](../data/distributed-transactions.md)
- [ ] [Object/block/file storage](../data/object-storage.md)
- [ ] [Analytics & pipelines](../data/analytics.md)

### Caching
- [ ] [Fundamentals](../caching/fundamentals.md)
- [ ] [Redis deep dive](../caching/redis.md)
- [ ] [Failure modes](../caching/failure-modes.md)

### Messaging & Streaming
- [ ] [Async fundamentals](../messaging/async-fundamentals.md)
- [ ] [Kafka deep dive](../messaging/kafka.md)
- [ ] [Delivery semantics](../messaging/delivery-semantics.md)
- [ ] [Event-driven architecture](../messaging/event-driven.md)

### Distributed Systems
- [ ] [Failure modes & fallacies](../distributed/failure-modes.md)
- [ ] [Time & ordering](../distributed/time-ordering.md)
- [ ] [Consensus](../distributed/consensus.md)
- [ ] [Coordination, locks & leases](../distributed/coordination.md)
- [ ] [Resilience patterns](../distributed/resilience.md)
- [ ] [Rate limiting](../distributed/rate-limiting.md)

### DevOps & Platform
- [ ] [Linux fundamentals](../devops/linux-fundamentals.md)
- [ ] [Containers](../devops/containers.md)
- [ ] [Kubernetes architecture](../devops/kubernetes-architecture.md)
- [ ] [K8s workloads & traffic](../devops/kubernetes-workloads.md)
- [ ] [K8s autoscaling & capacity](../devops/kubernetes-autoscaling.md)
- [ ] [Service mesh](../devops/service-mesh.md)
- [ ] [CI/CD as a system](../devops/cicd.md)
- [ ] [Deployment strategies](../devops/deployments.md)
- [ ] [IaC & GitOps](../devops/iac-gitops.md)
- [ ] [Secrets & identity](../devops/secrets-identity.md)
- [ ] [Cloud networking](../devops/cloud-networking.md)
- [ ] [Multi-region & DR](../devops/multi-region.md)
- [ ] [Cost & capacity](../devops/cost-capacity.md)

### Observability & SRE
- [ ] [Fundamentals](../observability/fundamentals.md)
- [ ] [Metrics & Prometheus](../observability/metrics.md)
- [ ] [Logging at scale](../observability/logging.md)
- [ ] [Distributed tracing](../observability/tracing.md)
- [ ] [SLOs & error budgets](../observability/slos.md)
- [ ] [Alerting design](../observability/alerting.md)
- [ ] [Incident management](../observability/incidents.md)
- [ ] [Chaos engineering](../observability/chaos.md)

### Security
- [ ] [Authentication & authorization](../security/authn-authz.md)
- [ ] [Defense in depth](../security/defense-in-depth.md)

### Interview Playbook
- [ ] [The framework](framework.md)
- [ ] [Requirements & estimation](requirements-estimation.md)
- [ ] [Communication & levels](communication.md)
- [ ] [Cheat sheets](cheatsheets.md)
- [ ] [Question bank & practice](question-bank.md)
- [ ] [Drills — full pass](drills.md)

### Case Studies
- [ ] [URL shortener](../case-studies/url-shortener.md)
- [ ] [Rate limiter](../case-studies/rate-limiter.md)
- [ ] [Notification system](../case-studies/notifications.md)
- [ ] [Chat system](../case-studies/chat.md)
- [ ] [News feed](../case-studies/news-feed.md)
- [ ] [Video streaming](../case-studies/video-streaming.md)
- [ ] [Typeahead](../case-studies/typeahead.md)
- [ ] [Web crawler](../case-studies/web-crawler.md)
- [ ] [Proximity & ride-hailing](../case-studies/proximity.md)
- [ ] [Payments](../case-studies/payments.md)
- [ ] [KV store](../case-studies/kv-store.md)
- [ ] [Metrics system](../case-studies/metrics-system.md)
- [ ] [Log pipeline](../case-studies/log-pipeline.md)
- [ ] [CI/CD platform](../case-studies/cicd-platform.md)
- [ ] [Job scheduler](../case-studies/job-scheduler.md)
- [ ] [Feature flags](../case-studies/feature-flags.md)

### Mocks & rehearsals
- [ ] Framework opening rehearsed ×3
- [ ] Case study rehearsed out loud ×2 (recorded once)
- [ ] Transfer prompt attempted cold ×2
- [ ] Mock interview #1
- [ ] Mock interview #2

### Leadership & Strategy (the Staff→CTO track)
- [ ] [The path: Senior → CTO](../leadership/the-path.md)
- [ ] [Design docs, RFCs & ADRs](../leadership/design-docs.md)
- [ ] [Architecture reviews](../leadership/architecture-reviews.md)
- [ ] [Technology strategy](../leadership/technology-strategy.md)
- [ ] [Engineering org design](../leadership/org-design.md)
- [ ] [Executive craft](../leadership/executive-craft.md)
- [ ] Three career stories written down (a system, a strategy, an org change) — [why](../leadership/the-path.md)
- [ ] One design doc written to the [anatomy](../leadership/design-docs.md) (real work, not practice)
- [ ] One quarterly engineering-health one-pager shipped for your area — [the exercise](../leadership/executive-craft.md)
