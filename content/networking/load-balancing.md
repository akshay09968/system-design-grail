# Load Balancing

Every whiteboard design contains the same little box — "LB" — and it is astonishing how rarely candidates can say what's inside it. Which is a wasted opportunity, because the load balancer is where scalability and availability *physically meet*: it's the machinery that makes N servers look like one, and the first component that must notice when one of the N is lying about being alive. Operators know this box intimately — you've tuned its health checks, cursed its draining behavior, and read its access logs at 3 a.m. This page turns that familiarity into interview-grade precision.

## L4 vs. L7: the first fork

**Layer 4 (transport)** balances *connections*: it sees IPs and ports, picks a backend, and forwards packets — via NAT, tunneling, or direct server return. It never parses HTTP, which makes it protocol-agnostic, nearly unbreakable, and absurdly fast (millions of connections, line-rate throughput; AWS NLB, HAProxy in TCP mode, IPVS, Google Maglev).

**Layer 7 (application)** *terminates* the connection, reads the request, and makes decisions with full knowledge: route `/api/v2` here, this gRPC method there; retry idempotent failures on another backend; terminate TLS; rewrite headers; split 1% to the canary. It costs more CPU and adds a few hundred microseconds — and it's where all the interesting policy lives (nginx, Envoy, HAProxy, AWS ALB).

| | L4 | L7 |
|---|---|---|
| Sees | IPs, ports, connections | requests, headers, methods, streams |
| Balances | per **connection** | per **request** |
| TLS | passes through (usually) | terminates |
| Retries/canary/routing | no | yes |
| Throughput ceiling | enormous | large but CPU-bound |
| Typical role | edge tier, raw TCP, in front of L7 fleet | routing, gRPC, canaries, everything HTTP |

The two stack rather than compete: a common production spine is **anycast IP → L4 tier → L7 tier → services**. And remember the HTTP/2 lesson from the [protocol page](http.md): multiplexed protocols *demand* L7 — an L4 balancer pins every stream of a connection to one backend, which is the classic "gRPC only load-balances on connect" incident.

## The algorithms, and the one worth showing off

- **Round robin / weighted RR** — fine when requests cost the same; weights handle heterogeneous hardware and canaries.
- **Least connections / least request** — better when request costs vary wildly (connection count proxies for load). Subtle failure in *distributed* LB fleets: each balancer has stale local counts, so they **herd** — all simultaneously dogpile the backend that looked idle a moment ago.
- **Latency/EWMA-aware** — route by observed response times; adapts to brownouts, not just deaths.
- **Power of two random choices (P2C)** — pick two backends at random, send to the less loaded. Sounds like a bar trick; is actually near-optimal: it avoids both round robin's blindness and least-conn's herding, with O(1) state and beautiful math behind it (exponential improvement over pure random). It's the default in Envoy and Finagle, and *naming it, with the herding rationale, is a legitimate interview flex*.
- **Hashing (IP hash, consistent hashing)** — when affinity matters: same client/key to same backend (session caches, WebSocket reconnects). Consistent hashing with bounded loads keeps affinity while capping hot spots — full treatment in [partitioning](../data/partitioning.md).

## Health checks: the part that causes outages

A load balancer is only as smart as its opinion of who's alive, and that opinion is a distributed-systems problem in miniature.

**Active checks** probe (`/healthz` every 5 s, 2 failures = out). The design question interviewers love: **how deep should the check be?** A *shallow* check ("process is up, port answers") misses real breakage (DB unreachable). A *deep* check ("verify my database, cache, and downstream dependencies") fails **fleet-wide when a shared dependency blips** — every instance reports unhealthy simultaneously, the LB ejects *everything*, and a 5-second cache hiccup becomes a total outage. The mature answer: shallow-ish liveness for the LB (is *this instance* broken vs. its peers?), deep checks only in monitoring where a human interprets them. Never let a shared dependency's health decide *individual* instance ejection.

**Passive checks (outlier detection)** watch real traffic — eject a backend whose error rate or latency deviates from the fleet. Catches gray failures that probes miss (the instance that answers `/healthz` in 2 ms and real queries in 8 s).

**The safety valves**, which separate people who've operated LBs from people who've drawn them: **panic threshold / fail-open** — when more than ~50% of backends look unhealthy, Envoy-class balancers *ignore health entirely* and route to everyone, on the theory that the checks are lying (they usually are — see deep-check cascade above) and some service beats none. **Slow start** — a rejoining backend gets a ramp, not a fire hose (cold caches + full share of traffic = instant re-ejection, forever — the flapping loop). **Flap damping** — hysteresis so a marginal instance doesn't oscillate in and out.

## Draining, stickiness, and the balancer's own availability

**Connection draining:** removal from rotation must mean "no *new* work," not "drop everything" — in-flight requests complete within a deregistration delay (30–300 s). Long-lived connections (WebSockets, gRPC streams, SSE) don't fit in any delay; they need *application-level* drain — send GOAWAY / close frames, let clients reconnect elsewhere — which is why every zero-downtime-deploy story for a socket fleet is really a draining story ([deployment strategies](../devops/deployments.md)).

**Sticky sessions** (cookie or IP affinity) exist for state that lives in one instance's memory — and that's the tell: stickiness is a *symptom*. It creates hot instances, breaks on scale-in, and turns every deploy into session loss. The design answer is almost always "externalize the state" ([thinking in systems, model 4](../foundations/thinking-in-systems.md)); reserve genuine stickiness for connection-oriented protocols where it's structural.

**Who balances the balancer?** The recursion is real and its termination is elegant: L7s are balanced by L4s; L4 fleets share traffic via **ECMP** (routers hash flows across equal-cost paths); regions attract users via **anycast + BGP** and/or DNS steering ([DNS page](dns.md)). At the top there is no balancer — just routing protocols doing the job. Client-side balancing is the other escape: thick clients (gRPC with a resolver, or every sidecar in a [service mesh](../devops/service-mesh.md)) fetch the endpoint list and balance themselves — no middle box, richer per-request choice, at the cost of pushing LB logic into every client (which is exactly what a mesh centralizes back into the control plane).

!!! ops "DevOps lens"
    The LB is your best observability vantage point — it sees every request's truth with no app instrumentation to lie: per-backend RPS, error rate, latency percentiles, healthy-host count, connection churn. Two incident genres to know cold: **the 5xx taxonomy** — backend-generated 500s vs. LB-generated 502 (backend closed/reset — often the *idle-timeout mismatch*: backend keep-alive shorter than LB's, so the LB reuses a connection the backend just closed; fix by laddering timeouts, backend > LB) vs. 503 (no healthy backends / queue full) vs. 504 (backend too slow). Each points at a different component; reading them fast is minutes of MTTR. And **retries at the LB**: retry only idempotent methods, only on connect-failure/reset (never on timeout — the request may have executed), with a **retry budget** (e.g., retries ≤ 20% of traffic) so the LB can't turn one struggling backend into a fleet-wide amplification attack ([resilience patterns](../distributed/resilience.md)).

!!! staff "Staff+ altitude"
    The Staff question is never "which algorithm" — it's **where policy lives and what shares fate**. Markers: (1) *Topology as governance* — a central L7 tier gives one place to enforce authn, rate limits, and TLS but concentrates blast radius and creates a platform team bottleneck; sidecar/mesh distributes the dataplane but turns *config push* into your new fleet-wide risk (a bad routing config deployed everywhere at once **is** the outage — canary proxy config like code). (2) *Fail-open vs. fail-closed as a portfolio decision* — panic thresholds, retry budgets, and health-check depth encode "when confused, prefer serving vs. prefer safety"; that preference should be a written, per-tier decision, not an Envoy default nobody read. (3) *Capacity honesty* — the LB is where load shedding belongs (reject early, cheaply, with priority classes) because it's the last place rejection is cheap; a Staff design says *which* requests the LB sacrifices first when the fleet browns out.

!!! interview "In the interview"
    Never draw an unlabeled LB: say **"L7, terminating TLS, health-checked, with outlier ejection"** and you've upgraded a box into a design decision. The scoring moves: name **P2C with the herding rationale** when asked about algorithms; give the **shallow-vs-deep health check** trade-off *before* they probe it (it's a top-three favorite); mention **draining** whenever deploys come up, especially for WebSocket fleets; and terminate the "who balances the balancer" recursion cleanly (ECMP → anycast/DNS). Classic probes: *"LB sends traffic to a dead node — walk me through what happens"* (check interval × threshold = detection window; in-flight failures; passive ejection shortens it); *"how do you deploy behind this LB with zero downtime?"* (deregister → drain → update → health pass → slow-start rejoin); *"single LB — problem?"* (pairs with VRRP, then the recursion story).

**Next:** [Proxies & API gateways](proxies-gateways.md) — the middleboxes where cross-cutting concerns live, and how they quietly become monoliths.
