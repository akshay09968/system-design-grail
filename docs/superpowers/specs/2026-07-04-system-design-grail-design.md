# The System Design Grail — Design Doc

**Date:** 2026-07-04
**Status:** Approved autonomously (user's `/goal` directive instructs proceeding without pausing for questions; interactive approval gates from the brainstorming skill are therefore replaced by documented decisions here).

## Purpose

A local-first website that makes its owner (a DevOps engineer) the best of the best at system design — the single reference for interview preparation and concept refreshing. It must be an excellent *expositor*: build intuition first, then mechanics, then numbers, then trade-offs — not a bullet-point cheat sheet.

## Success criteria

1. Comprehensive: every major system design topic covered in genuine depth (no stubs).
2. DevOps-angled: every topic connects to production operations — deploys, incidents, observability, capacity, cost.
3. Interview-ready: every page ends with how to *use* the knowledge in an interview; a dedicated Interview Playbook and full case-study walkthroughs exist.
4. Usable offline and locally: one command to serve; full-text search; dark mode; readable diagrams.
5. Maintainable: plain Markdown content the owner can extend.

## Approaches considered

| Approach | Verdict |
|---|---|
| **MkDocs Material** (chosen) | Best content-to-chrome ratio: built-in search, navigation, dark mode, Mermaid, admonitions. Python-only toolchain, one-command serve. Effort goes into content, not plumbing. |
| Hand-rolled static HTML/CSS/JS | Full design control but search + nav for ~70 pages would consume the effort budget that should go into content quality. |
| Docusaurus / VitePress (Node) | Heavier toolchain and build times; React/Vue overhead buys nothing for a text-first reference. |

## Architecture

- **Generator:** MkDocs + Material theme, installed in `.venv/`.
- **Content root:** `content/` (`docs_dir: content`), so `docs/` stays free for meta-documents like this spec.
- **Output:** `site/` (static, host-anywhere). `use_directory_urls: false` so the built site is browsable even from `file://`; search requires `./serve.sh` (or any static server).
- **Theme identity:** dark-first "grail" palette — near-black with gold accents; custom `ops` (DevOps lens, gold wrench) and `interview` (teal chat bubble) admonitions; Mermaid diagrams; system fonts (no CDN dependency).

## Information architecture (nav tabs → pages)

1. **Foundations** — DevOps lens, thinking in systems, scalability, reliability & availability, latency & throughput, CAP/PACELC, consistency models, estimation.
2. **Networking & Edge** — networking fundamentals, DNS, HTTP/1.1→3, API styles (REST/gRPC/GraphQL/WebSockets/SSE/webhooks), load balancing, proxies & API gateways, CDN.
3. **Data & Storage** — storage engines (B-tree/LSM), SQL at scale, NoSQL landscape, replication, partitioning & sharding, transactions & isolation, distributed transactions, object/block/file storage, analytics pipelines.
4. **Caching** — fundamentals & strategies, Redis deep dive, cache failure modes (stampede, hot keys, invalidation).
5. **Messaging & Streaming** — async fundamentals, Kafka deep dive, delivery semantics & idempotency, event-driven architecture (event sourcing, CQRS).
6. **Distributed Systems** — failure modes & fallacies, time & ordering, consensus (Raft/Paxos/quorums), coordination (locks, leases, fencing), resilience patterns, rate limiting.
7. **DevOps & Platform** — Linux/OS fundamentals for scale, containers deep dive, Kubernetes architecture, K8s workloads & traffic, K8s autoscaling & capacity, service mesh, CI/CD system design, deployment strategies, IaC & GitOps, secrets & identity, cloud networking, multi-region & DR, cost & capacity (FinOps).
8. **Observability & SRE** — observability fundamentals, metrics & Prometheus, logging at scale, distributed tracing, SLI/SLO/error budgets, alerting design, incident management, chaos engineering.
9. **Security** — authn/authz (OAuth2/OIDC/JWT/mTLS), zero trust, secrets, DDoS & edge protection, secure design review checklist.
10. **Interview Playbook** — the step-by-step framework with timing, requirements & estimation technique, communication tactics, cheat sheets, question bank & practice plan.
11. **Case Studies** — classics (URL shortener, rate limiter, notifications, chat, news feed, video streaming, typeahead, web crawler, ride-hailing/proximity, payments, KV store) + DevOps specials (metrics/monitoring system, log aggregation pipeline, CI/CD platform, distributed job scheduler, feature-flag system).
12. **Reference** — glossary, resources (books/papers/blogs), latency & capacity cheat sheet cross-links.

## Page template (the expositor contract)

Every content page follows: hook (why this matters in production and interviews) → intuition → mechanics (how it actually works) → real numbers → trade-offs → failure modes → `!!! ops "DevOps lens"` → `!!! interview "In the interview"` (deployment of the knowledge + likely follow-ups) → cross-links. Diagrams (Mermaid) wherever they beat prose; tables for enumerable facts.

## Build order & verification

Scaffold → Foundations → each section in nav order → Interview Playbook → Case Studies → Reference → final home page with full card grid → link-check pass. `mkdocs build --strict` after every section (fails on broken links). Nav grows only as sections are completed, so the site never contains stubs.

## Error handling

- `--strict` build gate catches broken links/nav drift.
- No CDN-dependent assets (fonts off, Mermaid bundled by Material) so the site works offline.
- If PyPI is unavailable at a future update, content remains plain Markdown, readable anywhere.

## Out of scope

Hosting/deployment (README documents `mkdocs gh-deploy` and static hosting options), authentication, comments, spaced-repetition tooling.
