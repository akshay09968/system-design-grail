# Case Studies

Sixteen full walkthroughs — the eleven classics every interview loop draws from, plus five **DevOps specials** where your operational background is home-field advantage. Each follows [the framework](../interviews/framework.md): requirements → estimation-with-verdict → API & data model → high-level design → the deep dives where the interview is won → the operability close. Read them actively ([the practice regimen](../interviews/question-bank.md)): pause at each decision, answer first, then compare.

## The classics

<div class="grid cards" markdown>

- **[URL shortener](url-shortener.md)** — the opener: key generation, read-heavy caching, and more depth than its reputation suggests.
- **[Rate limiter](rate-limiter.md)** — token buckets, Lua atomicity, and the fail-open/fail-closed question.
- **[Notification system](notifications.md)** — fan-out, providers, priorities, and idempotency end to end.
- **[Chat system](chat.md)** — the stateful-connection tier, per-conversation ordering, presence at scale.
- **[News feed](news-feed.md)** — push vs. pull fan-out and the celebrity problem, the canon's favorite trade-off.
- **[Video streaming](video-streaming.md)** — upload pipeline, transcoding DAG, and the CDN doing 95% of the work.
- **[Typeahead](typeahead.md)** — prefix structures, top-K caching, and a latency budget measured in keystrokes.
- **[Web crawler](web-crawler.md)** — frontier queues, politeness, dedup at billions, and trap-hardening.
- **[Proximity & ride-hailing](proximity.md)** — geo-indexing, live location ingest, and the matching loop.
- **[Payment system](payments.md)** — ledgers, sagas, idempotency, reconciliation: correctness as the product.
- **[Key-value store](kv-store.md)** — build Dynamo from parts you already own: the section-capstone design.

</div>

## The DevOps specials

<div class="grid cards" markdown>

- **[Metrics system](metrics-system.md)** — write-heavy TSDB, cardinality economics, and alert evaluation.
- **[Log pipeline](log-pipeline.md)** — the 26 TB/day walkthrough: buffer, index philosophy, retention tiers.
- **[CI/CD platform](cicd-platform.md)** — queues, DAGs, hermetic caching, and the trust boundary.
- **[Job scheduler](job-scheduler.md)** — distributed cron: leases, fencing, and at-least-once execution.
- **[Feature flags](feature-flags.md)** — a config control plane: fail-static, canary-able, milliseconds to kill.

</div>

## If you are cramming

[URL shortener](url-shortener.md) and [news feed](news-feed.md) cover the two most common prompts; [chat](chat.md) covers the hardest common one. If your loop might offer a choice, rehearse one DevOps special — [metrics](metrics-system.md) or [CI/CD](cicd-platform.md) — and [take it when offered](../interviews/question-bank.md).
