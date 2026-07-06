# Proxies & API Gateways

Between clients and services sits a family of middleboxes — reverse proxies, API gateways, sidecars — that exist for one architectural reason: **some concerns belong to every request, and implementing them in every service is how platforms rot**. TLS, auth, rate limits, retries, observability: write them 40 times in 40 services (badly, driftingly) or once, in the box every request traverses. The entire topic is about *where cross-cutting logic lives* — which makes it, at Staff altitude, a governance question wearing a networking costume.

## Forward vs. reverse: whose side are you on?

A **forward proxy** represents *clients* going out (corporate egress, VPNs — the server sees the proxy, not the user). A **reverse proxy** represents *servers* facing in (the user sees the proxy, never the topology behind it). Same software, opposite allegiance. System design conversations are 95% reverse-proxy conversations, with one big DevOps exception covered below: controlled egress.

## The reverse proxy's job description

What nginx/HAProxy/Envoy/Caddy actually do in front of your fleet, beyond [load balancing](load-balancing.md) (its own page):

- **TLS termination** — certificates, ciphers, and handshake CPU handled once, at the boundary; services behind speak plaintext or mesh-mTLS. Cert rotation becomes a proxy concern instead of forty services' concern.
- **Buffering — the underrated one.** The proxy absorbs *slow clients*: it reads a mobile user's dribbling upload at 3G pace, then replays it to your service in one fast gulp — so your expensive application worker is occupied for 5 ms instead of 45 s. In reverse, it buffers responses so services aren't held hostage by slow readers. This is why "nginx in front" measurably raises backend throughput even with zero caching, and it's the structural defense against slowloris-style slow-request attacks.
- **Static content & caching** — serve files and cacheable responses without waking the application; a micro-[CDN](cdn.md) one hop from the service.
- **Compression, request normalization, header hygiene** — gzip/brotli at the edge; strip/inject headers; enforce size limits before garbage reaches app code.
- **First-line protection** — connection limits, basic rate limits, IP rules; the cheap outer layer of the [security onion](../security/index.md).

## API gateway: a reverse proxy that learned your API

An **API gateway** is a reverse proxy with API-level opinions — it knows about *consumers, routes, and contracts*, not just connections:

- **Authentication & authorization** — validate JWTs/API keys/OAuth at the door ([security](../security/index.md)); services behind receive verified identity headers and skip re-implementing auth 40 times.
- **Per-consumer rate limiting & quotas** — free tier 100 req/min, enterprise 10k; usage metering for billing ([rate limiting](../distributed/rate-limiting.md)).
- **Routing & composition** — path-to-service mapping, protocol translation (REST outside → gRPC inside), occasionally response aggregation (with a caveat coming).
- **Developer surface** — keys, portals, versioned docs, analytics: the *product* wrapper around your API.

Managed forms: AWS API Gateway, Kong, Apigee, Cloudflare; or Envoy/nginx dressed up with plugins. The distinction from a plain L7 LB is not the binary — it's **whether the box knows who the caller is and what they're entitled to**.

One boundary worth policing hard: gateway aggregation vs. **BFF** (backend-for-frontend). Fan-out composition *for a specific client experience* is application logic and belongs in a BFF owned by that client's team ([API styles](apis.md)); the gateway stays generic. Blur this and you've begun building the failure mode two sections down.

## Sidecars: the proxy, pluralized

The [service mesh](../devops/service-mesh.md) move: instead of one central proxy, run a small L7 proxy (Envoy) **next to every instance**, and every service-to-service call traverses two of them (client's sidecar out, server's sidecar in). What this buys: cross-cutting concerns (mTLS, retries, timeouts, telemetry, traffic splits) for **east-west** traffic — uniformly, in any language, with no library upgrades. What it costs: +1–2 ms and real CPU per hop, and — the operational headline — a **config control plane whose pushes now have fleet-wide blast radius**.

The topology cheat sheet:

| Box | Traffic | Knows about | Typical concern |
|---|---|---|---|
| Reverse proxy / LB | north-south | connections, routes | TLS, buffering, balancing |
| API gateway | north-south | **consumers & contracts** | auth, quotas, versioning |
| Sidecar / mesh | east-west | service identity | mTLS, retries, telemetry |
| Egress proxy | outbound | destinations | allowlists, credential injection |

## Egress: the proxy nobody draws

Outbound traffic — your services calling third parties — deserves the same choke point inbound gets, and DevOps engineers are usually the only people in the room who know it. An **egress proxy/gateway** gives you: destination allowlists (a compromised pod can't exfiltrate to anywhere-dot-com), centralized credential injection (the API key for the payment provider lives in the proxy, not in 40 services' env vars), one place for third-party TLS pinning, retry/circuit-breaker policy toward vendors, and — priceless during incidents — a single log of *everything your platform said to the outside world*. NAT gateway costs and IP-allowlisted partners (they want your stable egress IPs) live here too. Mentioning controlled egress unprompted in a security or compliance-flavored design is a reliably strong signal.

## The failure mode: the gateway becomes the monolith

The gravitational pattern, observed everywhere: the gateway is *so conveniently in the path* that logic accretes — a header tweak for team A, a response rewrite for team B, retry quirks for team C, then actual business rules in Lua/plugins. Two years later: a thousand-line config nobody fully understands, every product change needs a gateway change, the platform team is a deploy bottleneck for the whole company, and a config typo has all-services blast radius. The discipline that prevents it is one rule: **policy in the gateway, semantics in services.** Policy = authn, quotas, TLS, routing, observability (generic, consumer-scoped, product-agnostic). Semantics = anything that knows what an *order* or a *playlist* is. The moment a gateway config mentions a business noun, it's in the wrong layer.

!!! ops "DevOps lens"
    Proxy fleets fail in two signature ways. **(1) Config-push outages** — the dataplane is fine; a bad routing/filter config deployed everywhere simultaneously is the incident (industry postmortems are full of these). Treat proxy/mesh config as code with the *full* pipeline: validation, canary instances, staged rollout, instant rollback — "it's just config" is how global outages introduce themselves. **(2) Timeout laddering** — every layer (client → CDN → gateway → LB → service) has its own timeout, and when an inner timeout exceeds an outer one, the outer layer gives up first: the client sees a 504 while the backend *completes the work* (and a retry doubles it — hello, duplicate orders). Rule: **timeouts strictly decrease inward**, budgets explicit at every hop, and idempotency assumed nowhere. Also yours to own: buffer sizes vs. upload limits (the 413/502-on-large-body genre) and header size limits (the "login breaks only for users with huge cookies" mystery).

!!! staff "Staff+ altitude"
    This layer *is* platform governance. Markers: (1) **The gateway is your paved road's tollbooth** — new services get auth, quotas, TLS, and telemetry by *registering a route*, not by writing code; that's how a platform team scales policy across 200 services without reviewing 200 implementations. (2) **Draw the policy/semantics line in writing** and enforce it in review — the monolith-gateway failure is organizational, so the defense must be too (route ownership per team, config codeowners, a documented "what may live here" contract). (3) **Budget the middlebox tax honestly** — gateway + mesh + egress can add 3–5 proxy traversals per user request; each is justified alone, but the *sum* belongs in the [latency budget](../foundations/latency-throughput.md), and a Staff review occasionally deletes a layer instead of adding one. (4) **Centralize vs. distribute deliberately**: central gateway = one blast radius, one team's velocity limit; mesh = distributed blast radius, config-plane risk. Choosing per concern — auth central, retries distributed — beats ideology in either direction.

!!! interview "In the interview"
    Place the boxes with intent: *"API gateway at the edge — JWT validation, per-key quotas, REST-to-gRPC translation; behind it plain L7 balancing; service-to-service concerns live in the mesh sidecars; outbound third-party calls go through an egress proxy with allowlists and injected credentials."* Four boxes, four scoped jobs — that's a complete middlebox story in twenty seconds. High-yield probes: *"gateway vs. load balancer?"* (consumers-and-contracts vs. connections-and-requests); *"where would auth live and why not in each service?"* (once at the boundary + identity propagation, drift and 40-implementations argument); *"what's risky about a mesh?"* (config push blast radius + the added hops — answering with *operational* costs, not features, is the senior tell); *"client gets 504 but the order was created — what happened?"* (timeout ladder inversion + non-idempotent retry — then fix it: decreasing timeouts, idempotency keys).

**Next:** [CDN](cdn.md) — the biggest lever in read-path performance, and the cache-invalidation lessons that come with planetary scale.
