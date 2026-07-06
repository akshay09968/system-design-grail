# API Styles

Databases get replaced, services get rewritten, whole languages come and go — but APIs are forever. An interface, once others depend on it, outlives every implementation behind it, which makes "REST or gRPC or GraphQL?" a question about **audience and coupling**, not fashion. The rule that organizes this whole page: *choose by who calls you, how much you trust them to evolve with you, and what the conversation shape is* (request/response? stream? notification?).

## REST: the default, for reasons that hold

REST models the world as **resources** (`/users/42/orders`) manipulated with HTTP's verbs, each request self-contained. Its superpower is everything HTTP gives you for free: **caching** (GETs cache at every layer including [CDNs](cdn.md) — no other style gets this), status codes every client on Earth understands, conditional requests, and `curl`-grade debuggability. For a **public API** — unknown callers, decade lifespans, humans reading docs — REST is nearly always right.

The craft details that separate senior answers from tutorials:

- **Idempotency by design.** GET/PUT/DELETE are naturally idempotent; POST is not — so real-money APIs (Stripe is the canonical citation) accept an **`Idempotency-Key` header**: server stores the key + response, replays return the stored response, and retries become safe. This one pattern is the answer to a whole family of interview probes about network failures during payment.
- **Pagination: cursor beats offset.** `?offset=100000` forces the DB to walk 100k rows and *skips/duplicates items* when data changes mid-scroll. Cursor pagination (`?after=<opaque token encoding last-seen key>`) is O(1) per page and stable under writes. Offset is fine for small admin lists; cursors for anything feed-shaped.
- **Versioning = don't.** The mature strategy is *additive evolution*: add fields, never rename/remove/repurpose; clients must ignore unknown fields. Reach for `/v2` only for true semantic breaks, and treat it as the multi-year deprecation program it is — every version you run is a fleet you operate.

(HATEOAS — hypermedia links driving clients — is the academically complete REST almost nobody ships. Know the name, don't build your design on it.)

## gRPC: the internal standard

gRPC is **schema-first RPC**: define services and messages in Protocol Buffers, generate typed clients/servers in every language, ship compact binary on HTTP/2 streams. For **service-to-service** calls inside an organization it has quietly become the default, because its features are exactly the microservice pain list:

- **The contract is code.** Protobuf schemas are compile-time interfaces between teams — a typo that would be a 3 a.m. JSON incident is a build failure instead. Evolution has mechanical rules: fields are identified by *number*, so add new numbers freely, never reuse or renumber old ones, mark removed ones `reserved`. Teach those three rules to an interviewer unprompted and you've demonstrated real gRPC experience.
- **Deadlines propagate.** Every call carries a deadline; each hop knows time remaining and can give up early. Cross-service **deadline propagation** is the RPC-layer implementation of the timeout discipline in [resilience patterns](../distributed/resilience.md) — arguably gRPC's most underrated feature.
- **Streaming is native**: server-stream (watch APIs — this is how Kubernetes `kubectl get -w` works), client-stream (uploads, telemetry), bidirectional (chat, sync).
- **Performance**: binary + HPACK + multiplexing = several-fold smaller and meaningfully faster than JSON/1.1 for chatty internal traffic.

The bill: browsers can't speak it natively (grpc-web / a REST gateway at the edge), it demands **L7-aware load balancing** (the "all streams pinned to one pod" incident from the [HTTP page](http.md)), and binary-on-the-wire costs you `curl` debuggability (mitigated by reflection + `grpcurl`, but tooling is a real adoption tax).

## GraphQL: client-shaped queries, server-side bills

GraphQL inverts control: one endpoint, a typed schema, and **the client composes the query** — exactly the fields it wants, across relationships, in one round trip. It exists because mobile teams were either over-fetching bloated REST payloads or making six sequential calls to paint one screen. As a **backend-for-frontend** aggregating many services for many client shapes, it's genuinely excellent.

The bills, which interviewers probe hard: **caching regresses** (everything's a POST to one URL; HTTP/CDN caching is lost — persisted queries claw some back); **N+1 queries** (a nested query naively triggers one DB call per list item; DataLoader-style batching is mandatory, not optional); **unbounded query cost** (clients can request the social graph of everyone — you must ship depth/complexity limits and timeouts, effectively [rate limiting](../distributed/rate-limiting.md) in query-shaped clothing); and **per-field authorization** (REST authorizes URLs; GraphQL must authorize *every resolver* — a security model upgrade teams routinely underestimate).

## The real-time trio

When the server must talk *first*, you leave request/response land. Three tools, in order of increasing machinery:

| | Long polling | **SSE** | WebSockets |
|---|---|---|---|
| Direction | server→client (faked) | server→client | **both** |
| Transport | plain HTTP | plain HTTP stream | upgraded TCP socket |
| Reconnect/resume | inherent (it's polling) | **automatic + `Last-Event-ID`** | build it yourself |
| Proxy/LB friendliness | best | good (mind buffering) | needs care (stickiness, timeouts) |
| Fit | fallback, simplicity | feeds, tickers, notifications, **LLM token streams** | chat, games, collab editing |

The senior heuristic: **SSE is the most underrated of the three** — if data flows one way, it buys real-time with none of WebSocket's operational tax (it's just a long HTTP response: every proxy, LB, and auth layer already understands it). Choose WebSockets only when the client genuinely streams *up* as well. And at scale, remember a WebSocket fleet is a **stateful tier** (the [thinking-in-systems](../foundations/thinking-in-systems.md) state warning made flesh): connections pin to nodes, deploys must drain gracefully, and cross-node delivery needs a pub/sub backbone behind the sockets — the full pattern lives in the [chat case study](../case-studies/chat.md).

## Webhooks: you become the client

For **event delivery to third parties** (payment settled, build finished), you call *them*: they register a URL, you POST events to it. Now you're operating a delivery system, and the craft is entirely in the failure story: **sign every payload** (HMAC + timestamp so they can verify origin and reject replays), **retry with exponential backoff + jitter** for hours-to-days, which forces **consumer idempotency** (deliver-at-least-once + event IDs), promise **no ordering** (sequence numbers if they care), and pair the push with a **reconciliation pull API** ("list events since X") because some webhook will always be missed — push for latency, poll for truth. That last sentence is the entire mature pattern; deploying it in an interview marks you as someone who has *received* flaky webhooks, not just sent them.

## Choosing, in one table

| Interface | Default | Because |
|---|---|---|
| Public API | REST (+ webhooks) | Unknown callers, HTTP ecosystem, cacheability, decade lifespan |
| Internal service↔service | gRPC | Typed contracts between teams, deadlines, streaming, efficiency |
| Mobile/web aggregation | GraphQL BFF | Many client shapes over many services, round-trip economy |
| Server→client one-way | SSE | Real-time without the stateful-fleet tax |
| True bidirectional | WebSockets | It's the only one that actually is |
| Third-party events | Webhooks + poll reconciliation | Push latency, pull truth |

!!! ops "DevOps lens"
    Each style has a signature incident. **WebSockets**: the deploy that disconnects 2M clients at once → reconnect stampede → [thundering herd](../caching/failure-modes.md) on auth and session stores (drain slowly, jitter reconnects, make session resume cheap). **SSE**: an intermediary with response buffering turns your "real-time" stream into 30-second batches (disable proxy buffering explicitly; test through the *real* path). **gRPC**: L4 balancing pins streams → one hot pod (mesh or client-side LB). **GraphQL**: one whale query flatlines the cluster (cost limits are capacity protection, not politeness). **Webhooks you send**: your retry storm is *someone else's* DDoS — backoff and per-endpoint circuit breakers are basic etiquette. **REST**: the pagination endpoint that's secretly `OFFSET 2000000` — the DB incident wearing an API costume.

!!! staff "Staff+ altitude"
    APIs are where Conway's law becomes engineering. Markers: (1) **The API is the org chart's contract** — a gRPC schema between two teams is a treaty; changing it requires diplomacy, so invest in *contract testing and schema registries* before you need them, and treat "who reviews breaking changes?" as a governance question with a named answer. (2) **Deprecation is a program, not an email** — usage telemetry per caller, migration guides, brownouts ("we'll 410 v1 for 5 minutes monthly until you move"), then removal; a Staff engineer budgets this at *design* time, which is why additive evolution is worth so much. (3) **Resist per-team API fashion** — three styles in one product surface triples client complexity and platform tooling; the BFF layer exists precisely so product teams can iterate while the interior stays boring and uniform. (4) On interfaces you *consume*: demand idempotency keys and reconciliation endpoints from vendors — the questions you ask in procurement are system design too.

!!! interview "In the interview"
    Never name a style without naming the audience: *"Public API: REST with idempotency keys and cursor pagination; internally the services talk gRPC for typed contracts and deadline propagation; the mobile app gets a GraphQL BFF so screens don't fan out; live updates ride SSE since it's one-way."* Four choices, four reasons, fifteen seconds — that sentence pattern wins the API portion of any design. Canonical probes: *"REST vs gRPC?"* (audience + coupling, browser reach + cacheability vs. contracts + deadlines — refuse the false "which is better"); *"how do you make retries safe on a payment POST?"* (idempotency keys, stored responses); *"WebSockets or polling for notifications?"* (SSE, actually — one-way; then the stateful-fleet caveat if they push to WebSockets); *"how do webhooks not lose events?"* (they do — signed, retried, idempotent delivery *plus* reconciliation polling).

**Next:** [Load balancing](load-balancing.md) — the component every design contains and most candidates can't actually explain.
