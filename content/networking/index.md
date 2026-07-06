# Networking & Edge

Every arrow you draw on a whiteboard is a network hop, and every hop has a price list: round trips, handshakes, serialization, failure modes. This section is about knowing that price list cold — from the moment a user's device asks "where is this domain?" to the moment your load balancer picks a backend. It's also where DevOps engineers are already dangerous: you've debugged the 40 ms latency mystery, watched a TTL betray a failover, and know why "it's always DNS" is only half a joke.

## The journey of a request

The pages follow a request inward from the user:

<div class="grid cards" markdown>

-   **[Networking fundamentals](fundamentals.md)**

    ---
    TCP, UDP, TLS, sockets, file descriptors, and connection pooling — the physics underneath every arrow, and the four classic network incidents.

-   **[DNS](dns.md)**

    ---
    The internet's oldest eventually-consistent database: resolution, TTL politics, DNS load balancing and failover, and why it's in half of all outage stories.

-   **[HTTP: 1.1 → 2 → 3](http.md)**

    ---
    Three protocol generations, each killing the previous one's head-of-line blocking — a genuinely great engineering story with interview teeth.

-   **[API styles](apis.md)**

    ---
    REST, gRPC, GraphQL, WebSockets, SSE, long polling, webhooks — how to choose, defend the choice, and version it for a decade.

-   **[Load balancing](load-balancing.md)**

    ---
    L4 vs. L7, the algorithms and when each wins, health checks that lie, and connection draining — the component every design contains.

-   **[Proxies & API gateways](proxies-gateways.md)**

    ---
    Reverse proxies, gateways, and sidecars: the middleboxes where cross-cutting concerns live, and when they become the bottleneck.

-   **[CDN](cdn.md)**

    ---
    Edge caching as the highest-leverage read-scaling tool in existence — cache keys, invalidation, origin shielding, and the egress bill.

</div>

## If you are cramming

[Load balancing](load-balancing.md) and [CDN](cdn.md) appear in virtually every interview design; read those two plus the *In the interview* callouts of the rest. The "what happens when you type a URL" warm-up lives in [fundamentals](fundamentals.md).
