# Networking Fundamentals

The network is not an implementation detail below your architecture — it *is* the medium your architecture lives in. Every service boundary you draw is a decision to pay network prices: round trips, handshakes, serialization, partial failure. This page is the price list, told through the life of one request, plus the four classic network incidents every operator eventually stars in.

## The life of a request (cold start)

A user's device wants `https://api.example.com/feed`. Before your code runs even once:

1. **DNS resolution** — possibly cached (~0 ms), possibly a full walk (~20–120 ms). [Its own page](dns.md).
2. **TCP handshake** — SYN → SYN-ACK → ACK: **1 round trip** before any data.
3. **TLS handshake** — TLS 1.3: **1 round trip** (TLS 1.2: two); session resumption or QUIC 0-RTT can shrink it further.
4. **The request itself** — finally, and the response rides back on a congestion window still warming up (slow start, below).

On a 50 ms RTT mobile path, that's 100–150 ms of *pure protocol* before byte one of payload — which is the entire quantitative argument for three of the biggest ideas in this site: **connection reuse** (pay the setup once, not per request), **edge termination** (terminate TLS 30 ms from the user, not 300 — see [CDN](cdn.md)), and **fewer, fatter calls** (each fine-grained microservice hop re-pays some version of these costs). When candidates wave at "network overhead," this list is what they're waving at. Know it in milliseconds.

## TCP: the contract and its fine print

TCP gives you a **reliable, ordered byte stream** over an unreliable packet network — retransmission, deduplication, reordering, flow control, all invisible. The fine print is where engineering lives:

**Slow start.** A new connection doesn't trust the network yet; the congestion window begins small and roughly doubles per RTT until loss or limit. Translation: **cold connections are slow for the first several round trips** — a fresh connection transferring a 1 MB response can take 4–6 RTTs just growing its window. This is the *second*, less-known reason connection pooling and keep-alive matter: reused connections are pre-warmed. It's also why HTTP/2's "one connection instead of six" had subtle costs ([next page](http.md)).

**Congestion control.** TCP continuously probes for the path's fair share, backing off on loss (or on delay, in BBR's case). You mostly feel it as: throughput on a long fat pipe is capped by `window ÷ RTT` — high-RTT links need big windows for high throughput (the bandwidth-delay product), and loss on high-RTT paths is devastating. Cross-continent replication being slower than the raw bandwidth suggests? This.

**Head-of-line blocking.** Ordered delivery means one lost packet stalls *everything behind it* in the stream until retransmitted — even bytes that already arrived. Multiplex many logical requests onto one TCP connection and one loss freezes all of them. This single flaw drove the entire HTTP/2 → HTTP/3 evolution.

**Nagle vs. delayed ACK (the 40 ms mystery).** Nagle's algorithm batches tiny sends until the previous is acked; delayed ACK holds acks up to ~40 ms hoping to piggyback. Combined: small request-response protocols mysteriously stall ~40 ms per exchange. Fix: `TCP_NODELAY`, which every serious RPC library sets. Knowing *why* the latency histogram has a spike at 40 ms is the kind of detail that ends an interviewer's probing early.

## UDP: reliability à la carte

UDP is datagrams: no connection, no ordering, no retransmission, no congestion control — a postcard, not a phone call. That's not a deficiency; it's an *option to rebuild exactly the guarantees you need*: DNS (one-shot query/response, retry is trivial), metrics fire-and-forget (statsd — losing 0.1% of samples is fine, blocking the app is not), real-time media and games (a late frame is worthless; skip it, don't retransmit it), and — the modern headline — **QUIC**, which rebuilds reliability *per-stream* in userspace on top of UDP, fixing TCP's head-of-line blocking and making transport evolution deployable without waiting a decade for kernels. The design lesson generalizes: when the default guarantee bundle is wrong for your workload, unbundle it.

## Sockets, file descriptors, and the event loop

Operationally, a connection is a **file descriptor**, and file descriptors are a finite, per-process, ulimit-governed resource. Every operator eventually meets `EMFILE: too many open files` — the outage where the service is healthy but can't accept anyone new.

How one machine holds 100k+ connections is a genuinely great story: the old model (one thread per connection) dies at a few thousand — thread stacks eat memory, context switching eats CPU (the "C10K problem"). The answer is **event-driven I/O**: `epoll`/`kqueue` let one thread ask "which of my 100k sockets have something for me?" and handle only those. This is *the* architectural fact behind nginx, Redis, Node.js, Envoy, HAProxy — a handful of event-loop threads serving enormous connection counts, with the corollary that **blocking the loop blocks everyone** (the Redis "one slow command stalls the world" caveat, the Node.js "don't do CPU work on the loop" rule). Idle connections are nearly free (a few KB of kernel state); *active* concurrency is what costs. That's why WebSocket fleets sized "100k connections per node" are credible — see the [chat case study](../case-studies/chat.md).

## Connection pooling: Little's law with a socket attached

Pools exist because setup is expensive (handshakes + slow start) and because downstream capacity is finite (a Postgres with `max_connections = 500` doesn't care how many pods you scaled to). Sizing is [Little's law](../foundations/latency-throughput.md): concurrent connections needed ≈ throughput × latency. 2,000 QPS against a 25 ms-average dependency ≈ 50 busy connections; pool 75 for burst.

The failure mode is a classic for a reason: dependency slows from 25 ms → 250 ms, required concurrency 10×es, the pool exhausts, requests queue *for a connection* (adding invisible latency that no downstream dashboard shows), timeouts fire, retries multiply load, and now two services are down — the pool transmitted the failure upstream. Pools are both shock absorber and coupling mechanism; give them their own metrics (checked-out count, wait time) or debug this blind. And in the database's case, pools are also *protection for the shared resource* — which is why serious Postgres shops run PgBouncer: thousands of client connections multiplexed onto tens of server connections, because each Postgres connection is a real process with real memory.

!!! ops "DevOps lens"
    The four classic network incidents, so you recognize them from the first graph: **(1) FD exhaustion** — accepts fail while everything else looks healthy; raise ulimits, but *find the leak* (connections not closed on error paths). **(2) Ephemeral port / TIME_WAIT exhaustion** — a client (often a proxy or NAT) making rapid short-lived outbound connections runs out of source ports because closed sockets linger in TIME_WAIT ~60 s; fix with connection reuse, not sysctl heroics. **(3) Conntrack table full** — Linux NAT/firewall tracks every flow; at the limit, *new connections silently drop* while established ones sail on — the most confusing incident shape in networking (Kubernetes nodes and NAT gateways are the usual scenes). **(4) SYN backlog overflow** — accept queue fills (or a SYN flood fakes it), new handshakes dropped, clients see timeouts while the server shows idle CPU. All four share a moral: **connections are inventory** — finite, leakable, and worth graphing like any other resource.

!!! staff "Staff+ altitude"
    Staff engineers treat the network as a **budget that shapes service boundaries**. Every synchronous hop added to a critical path costs ~0.5–2 ms in-datacenter (more with TLS between meshes) *plus* serialization *plus* a new partial-failure mode *plus* a pool to size and monitor — so "should these be two services?" is partly a networking question, and the right answer for a chatty pair is often "merge them or batch the calls." Second altitude marker: **topology awareness as a cost lever** — same-AZ traffic is free-ish and fast, cross-AZ costs real money per GB and ~0.5–1 ms, cross-region costs more of both; zone-aware routing (mesh locality, `topologyKeys`) routinely cuts five-figure monthly bills and p99 simultaneously. Third: know the frontier exists — kernel-bypass (DPDK), RDMA, eBPF-based dataplanes — not to propose them casually, but to answer "what would you do if this hop *had* to be 10 µs?" without hand-waving.

!!! interview "In the interview"
    The canonical warm-up — *"what happens when you type a URL?"* — deserves a rehearsed 60-second version: DNS (cache walk, recursive resolution) → TCP handshake (1 RTT) → TLS 1.3 (1 RTT) → request → response on a warming congestion window → rendering; then one sentence of depth as bait: "and on repeat visits almost all of this vanishes — DNS cached, connection kept alive, TLS resumed, which is why warm p50 and cold p99 look like different products." Expected probes here: *"why is the first request so much slower?"* (handshakes + slow start), *"why does gRPC set TCP_NODELAY?"* (Nagle/delayed-ACK), *"how does one box hold a million connections?"* (event loop + FDs as the real limit), *"pool sized how?"* (Little's law, out loud, with numbers).

**Next:** [DNS](dns.md) — the eventually-consistent database that decides whether users can find you at all.
