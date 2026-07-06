# CDN

You cannot negotiate with the speed of light. A user in Sydney talking to a server in Virginia pays ~200 ms per round trip forever, no matter how good your code is — so the only winning move is to *stop making the trip*: put copies of your content in hundreds of locations and serve each user from the nearest one. That's a CDN, and it is pound-for-pound the highest-leverage component in any read-heavy design: one architectural decision that simultaneously buys latency, origin protection, availability, DDoS absorption, and a smaller egress bill. Interviewers expect it in your diagram reflexively; what separates candidates is knowing *how it actually earns each of those wins*.

## The machinery

A CDN is a planet-wide read-through cache hierarchy. Users reach the nearest **PoP** (point of presence — the [anycast](dns.md) trick: one IP, announced from 300 cities, BGP delivers each user to the closest). On a miss, the edge asks up the hierarchy — regional cache, then **origin shield** (a designated PoP that alone talks to your origin), then origin. Two mechanical details do disproportionate work:

- **Request collapsing:** a thousand simultaneous misses for the same object become *one* origin fetch; the other 999 wait for that response. The CDN is a built-in [thundering-herd](../caching/failure-modes.md) shield — during a viral moment or a mass cache expiry, your origin sees ones, not thousands.
- **Origin shield:** without it, 300 PoPs can each miss independently — 300 origin fetches for one object. With it, worst case is ~1. Shield turns "global fleet of caches" into "one polite client" from origin's perspective.

The economics ride along: CDN egress is priced *below* cloud-origin egress, and every hit is origin bandwidth you didn't buy. Hit rate math deserves saying the strong way: **origin load is proportional to (1 − hit rate), so going from 90% to 99% hits cuts origin traffic 10×** — the last few points of hit rate matter more than the first eighty.

## What's cacheable (more than you think)

Static assets are the obvious layer — JS, CSS, images, fonts. The interesting frontier is everything else:

- **Video is secretly static.** HLS/DASH streaming chops video into small segment files plus manifests — which means "stream YouTube" is really "serve millions of tiny immutable files," a perfect CDN workload. This single insight carries half the [video-streaming case study](../case-studies/video-streaming.md).
- **APIs and dynamic HTML** cache too, with short TTLs: a public product page or search-suggest response cached 30 s at the edge absorbs enormous read load at zero visible staleness. The two header spells that make it safe: **`stale-while-revalidate`** (serve the stale copy instantly, refresh asynchronously — users never wait on revalidation) and **`stale-if-error`** (serve the stale copy when origin is *down* — a free availability nine: your site survives its own origin outage for cached content).
- **Private content** via **signed URLs/cookies** — time-limited signatures let the CDN serve user-specific files (paid video, private photos) without a round trip to your auth. The [security](../security/index.md) and video case-study pages lean on this.

## Cache keys: where hit rates go to die

The cache key — by default URL + designated headers/params — decides whether the CDN sees your traffic as thousands of copies of one thing or one copy each of a million things. **Cardinality is the enemy**:

- UTM/tracking params: `?utm_source=twitter` makes every marketing campaign a separate cached copy of the same page. *Strip or ignore non-functional params in the key* — the classic day-one CDN config fix.
- Unnormalized keys: param order, trailing slashes, case — each variant is a separate miss.
- `Vary: Cookie` or per-user params on shared content: hit rate quietly collapses toward zero and your CDN becomes an expensive TLS terminator.

The architectural version of the fix is a design principle worth quoting: **split the personal from the shared**. One cacheable response for the product page (same for everyone) + one tiny uncacheable call for "your cart, your name." Designing APIs so the heavy payloads are user-independent is how cacheability gets *engineered in* rather than hoped for.

## Invalidation: the famous hard problem, mostly solved

"There are only two hard things in computer science: cache invalidation and naming things" — and the CDN world's answer is elegant because it *uses naming to defeat invalidation*:

1. **Immutable, content-hashed URLs (the gold standard).** Build pipelines emit `app.3f9d2c.js`; the content *is* the name, so it can never be stale — cache forever (`immutable, max-age=1yr`). Deploys don't purge anything; they publish new names. The only mutable object left is the small HTML entry point that references the hashes — give *it* a short TTL or no-store. This one pattern turns deployment-time cache consistency from a distributed-systems problem into a naming convention.
2. **Surrogate keys / cache tags** for everything that can't be renamed: tag cached objects with entity IDs (`product-1234`) and purge by tag when the entity changes — one API call invalidates every page that included that product. This is how commerce and news sites do near-real-time correctness at the edge.
3. **Soft purge** — mark stale rather than delete, so the next request revalidates but users still get instant (stale-while-revalidate) responses. Purge without the miss storm.

Blunt full purges remain what they always were: an emergency lever that turns your own CDN into a self-inflicted thundering herd against origin (request collapsing and shields are what keep that survivable).

## Edge compute: keeping cacheability under personalization

Edge functions (Cloudflare Workers, Lambda@Edge, Fastly Compute) run small logic *at the PoP*: auth-token verification, A/B bucket assignment, geo-based rewrites, header normalization. Their highest use in system design is **defending cacheability** — do the per-user 5% (choose a variant, check a signature) at the edge, so the heavy 95% (the response body) stays a shared cached object. Anti-use: migrating business logic to the edge because it's fashionable — you gain milliseconds and lose debuggability, consistency, and your [data's proximity](../foundations/latency-throughput.md); the edge computes *about requests*, origin computes *about data*.

!!! ops "DevOps lens"
    The CDN belongs *inside* your deploy pipeline, not next to it: hashed-asset publishing before HTML flips (upload new assets → then release the HTML that references them — reverse the order and users fetch names that don't exist yet), surrogate-key purges fired by the CMS/deploy hooks, and purge-verification as a pipeline step. Monitor **hit rate by content class** (one number hides everything — assets at 99.9% can mask API caching at 40%), origin request rate (your real capacity requirement), and 5xx-at-edge vs. 5xx-at-origin separately. Debug with the cache-status headers (`X-Cache`, `CF-Cache-Status`, `Age`) — reading `MISS, MISS, HIT, Age: 3` fluently is the fastest way to answer "is the CDN even caching this?", which is the first question of every CDN incident. And know your purge SLA: "seconds globally" is a marketing number worth verifying before your legal team needs an article gone.

!!! staff "Staff+ altitude"
    Markers: (1) **Cacheability as an architectural requirement** — push it upstream into API and page design (shared/personal split, hashable assets, taggable entities); retrofitting cacheability after launch is a rewrite wearing a config's costume. (2) **The CDN as availability strategy, priced** — `stale-if-error` + long grace on your top pages is the cheapest nine you will ever buy; write it into the DR plan explicitly ("cached browse experience survives full origin loss; checkout degrades"). (3) **Multi-CDN honestly** — real vendor-risk hedge (CDNs have had global outages taking half the internet with them) bought at the price of least-common-denominator features (your surrogate-key scheme, edge functions, and config pipeline must now work ×2) plus a steering layer (DNS/RUM-based). Most companies below the top traffic tier are better served by one CDN + a rehearsed bypass mode; a Staff engineer says which and why with numbers. (4) **Egress economics at contract scale** — commit curves, origin-shield savings, and per-region pricing are design inputs; at video/software-distribution volumes, the CDN bill shapes the architecture more than the p99 does.

!!! interview "In the interview"
    Reflexes first: any read-heavy, global, or media-bearing design gets a CDN in the first diagram, with the sentence *"static and media at the edge with hashed immutable URLs; the HTML shell short-TTL; API reads cached 30 s with stale-while-revalidate, stale-if-error for origin outages."* That's four techniques by name in one breath. The probes to be ready for: *"how do you invalidate?"* (the three-tier answer: hashed names for assets, surrogate-key purge for entities, soft purge over hard); *"what's your hit rate and why does it matter?"* (origin load ∝ 1 − hit rate; 90→99 is a 10× origin cut); *"how does the CDN help availability?"* (stale-if-error + request collapsing + DDoS absorption at the edge); *"personalized pages — CDN useless?"* (no: split personal from shared, personalize at the edge, cache the heavy shared body). And for video questions, lead with the secret: *"segmented streaming makes video a static-file problem — the CDN is the delivery system; origin only makes manifests and segments."*

**Next up:** the [Data & Storage](../data/index.md) section — where the state actually lives, starting with the two data structures that secretly run the database industry.
