# HTTP: 1.1 → 2 → 3

HTTP's three modern generations are one continuous story with a single villain: **head-of-line blocking**. Each version killed it at one layer and exposed it at the next, until HTTP/3 finally chased it out of the kernel entirely. Told this way, the versions stop being trivia and become a case study in how protocols evolve — and interviews reward the story far more than the feature lists.

## HTTP/1.1: one lane per conversation

HTTP/1.1 (1997) is plain text over TCP with persistent connections (`keep-alive`) — and one brutal constraint: **one request at a time per connection**. Response must follow request before the next request can use the lane. Pipelining (send several requests, receive ordered responses) was specified but died in practice: one slow response blocks all behind it — application-layer head-of-line blocking — and enough middleboxes mishandled it that browsers gave up.

The workarounds became folklore: browsers open **~6 parallel connections per host**; sites *sharded domains* (`img1.example.com`, `img2...`) to get 6 more lanes each; concatenated JS bundles and image sprites existed purely to reduce request count. An entire generation of web performance "best practices" was really "coping mechanisms for one-lane connections" — worth knowing because several became *anti*-patterns under HTTP/2, a delicious interview nugget.

Don't condescend to it, though: HTTP/1.1 remains everywhere — simple, debuggable with `curl` and eyeballs, universally supported. Load balancers very commonly speak HTTP/2 to clients and *HTTP/1.1 to your backends* over pooled, warm connections where its weaknesses barely matter.

## HTTP/2: many lanes, one road

HTTP/2 (2015, from Google's SPDY) keeps HTTP's semantics and replaces the wire format: **binary framing** with many concurrent **streams multiplexed on one TCP connection**. Dozens of requests and responses interleave frame-by-frame on a single lane-less road. Plus **HPACK header compression** (huge win — headers are repetitive and cookies are fat), stream prioritization, and server push (clever, unused, formally deprecated — safe to say "push is dead" in interviews).

Multiplexing solved application-layer HOL blocking and made domain sharding counterproductive (it splits your one warm connection into several cold ones). For APIs it enabled something bigger: **gRPC** rides HTTP/2's streams directly ([next page](apis.md)).

**But the villain moved down a floor.** All those streams share one TCP byte stream, and TCP guarantees *ordered* delivery of the whole thing: **one lost packet stalls every stream** until retransmission — transport-layer head-of-line blocking. On clean networks, invisible. On lossy networks (mobile!), HTTP/2 can genuinely underperform HTTP/1.1, because 1.1's six independent connections meant a loss only froze *one-sixth* of the traffic. "Why can HTTP/2 be slower than 1.1?" is a top-tier depth probe, and this is the answer.

## HTTP/3: leave TCP entirely

You can't fix TCP's ordering guarantee without replacing TCP — and you can't replace TCP, because every kernel and middlebox on Earth ossified around it. So **QUIC** rebuilds transport in **userspace over UDP**: streams that are *independently* reliable and ordered (a lost packet stalls only its own stream — HOL blocking finally dead at every layer), **TLS 1.3 fused in** (transport + crypto handshake together: 1 RTT cold, 0-RTT resumed, vs. TCP+TLS's 2–3), and **connection migration** — connections identified by IDs, not the IP/port 4-tuple, so walking out of Wi-Fi coverage onto cellular *keeps the connection alive* instead of resetting every transfer. Userspace was the meta-move: QUIC iterates at software speed, not kernel-decade speed.

Costs, because there are always costs: UDP gets second-class treatment from some networks/middleboxes (fallback to h2 required — that's what `Alt-Svc` negotiation is for), more CPU per byte than kernel-optimized TCP paths, and operational tooling (LBs, captures, debugging) matured years behind. Adoption pattern in practice: **h3 at the edge** (browser↔CDN, where lossy last miles and mobile roaming live — most of the internet's h3 traffic today) and **h2/h1.1 behind it** (datacenter networks are clean; TCP is fine there).

## The scorecard

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Transport | TCP | TCP | **QUIC/UDP** |
| Concurrency | 1 per conn (×6 conns) | multiplexed streams | multiplexed, **independent** streams |
| HOL blocking | at HTTP layer | at TCP layer | none |
| Handshake (cold, with TLS) | 2–3 RTT | 2–3 RTT | **1 RTT** (0-RTT resume) |
| Header compression | none | HPACK | QPACK |
| Survives IP change | no | no | **yes** (migration) |
| Debuggability | telnet-grade | tooling needed | tooling required |

## The rest of the modern HTTP toolkit

- **TLS everywhere:** cert chains, **SNI** (how one IP hosts many TLS sites — and why plaintext SNI leaks hostnames, hence ECH), session resumption. One caution worth citing: **0-RTT data is replayable** — idempotent requests only.
- **Compression:** gzip is table stakes; **brotli/zstd** win 15–25% more on text. Compress at the edge; never compress secrets alongside attacker-controlled input (the BREACH class of attacks — one sentence of security literacy that lands well).
- **Caching semantics:** `Cache-Control`, `ETag`/`If-None-Match` (304s turn full downloads into header exchanges), and the quietly powerful `stale-while-revalidate` — serve the stale copy instantly, refresh in background. These headers are the API the entire [CDN](cdn.md) layer is built on; a candidate fluent in them designs edge behavior *declaratively* instead of hand-waving "the CDN caches it."

!!! ops "DevOps lens"
    Where HTTP versions bite operationally: **gRPC needs L7 awareness end-to-end** — an L4 LB in front of HTTP/2 pins all streams of a client to one backend and breaks per-request balancing (the classic "gRPC only hits one pod" incident; fix with Envoy/mesh or client-side LB). **h2 connection coalescing** surprises routing: browsers reuse one connection for any hostname covered by the cert + resolving to the same IP — traffic for `a.example.com` arrives on `b.example.com`'s connection, confusing per-host rules. **Protocol downgrade debugging**: users mysteriously on h1.1 usually means a middlebox stripped ALPN or UDP/443 is blocked (watch your h3 fallback rates). And **keep-alive hygiene between LB and backends**: idle-timeout mismatches (LB holds connections longer than the backend) produce sporadic 502s that vanish under retry — a genre of ghost incident every operator eventually hunts.

!!! staff "Staff+ altitude"
    Protocol choice is a **fleet-wide latency/cost lever you pull once, centrally** — at the edge and in shared libraries/meshes, never team-by-team. Markers: (1) *Quantify before migrating* — h3's wins concentrate on lossy, high-RTT, mobile-heavy traffic; if your product is desktop-on-fiber talking to one region, the migration buys single-digit ms and costs real ops maturity. Segment your RUM data by network type first. (2) *Standardize internal RPC deliberately* — "h2+gRPC everywhere inside" buys deadlines, streaming, and typed contracts, but commits the org to L7-aware infrastructure forever; that trade belongs in a platform decision record, not in whichever team ships first. (3) *Own the ossification lesson* — QUIC's userspace escape from kernel-speed evolution is a pattern to reuse: when a layer you depend on evolves too slowly, the Staff move is sometimes to route around it in software you control (and to notice when *your* platform has become the ossified layer someone else routes around).

!!! interview "In the interview"
    Tell the arc in three sentences — *"1.1 serializes requests per connection, so browsers opened six; h2 multiplexes streams over one TCP connection but a single lost packet stalls them all; h3 moves to QUIC over UDP so streams lose independently, and fuses TLS for 1-RTT setup"* — and you've displayed more protocol understanding than most candidates manage in ten minutes. Then deploy the two nuggets on demand: *why h2 can lose to 1.1* (lossy links: one shared TCP stream vs. six independent ones), and *why h3 matters most on mobile* (loss + roaming + handshake economy). If asked where each belongs: h3 client↔edge, h2 for gRPC and edge↔origin on clean paths, h1.1 happily surviving on warm LB↔backend pools where its flaws are irrelevant.

**Next:** [API styles](apis.md) — REST, gRPC, GraphQL, and the real-time trio, chosen by audience and coupling rather than fashion.
