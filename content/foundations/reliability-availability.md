# Reliability & Availability

Availability is the only property of your system that appears in contracts, headlines, and postmortems alike — and it's governed by arithmetic most engineers have never actually done. This page does the arithmetic. It's short, it's brutal, and once you've internalized it you will never again nod along when someone promises five nines.

First, the vocabulary, because interviewers test it: **reliability** is the system doing the *correct* thing (not corrupting data, not returning wrong answers); **availability** is it doing *anything* (responding at all); **durability** is data surviving (a system can be down all week and still durable). They trade differently: a system that fails stopped is available less but reliable more than one that limps along returning garbage.

## The nines, in human units

"99.9% available" sounds like a lot until you convert it:

| Availability | Downtime / year | Downtime / month | What it really means |
|---|---|---|---|
| 99% ("two nines") | 3.65 days | ~7.3 hours | Hobby project |
| 99.9% | 8.77 hours | ~43.8 min | Solid internal service |
| 99.95% | 4.38 hours | ~21.9 min | Serious SaaS tier |
| 99.99% | 52.6 min | ~4.4 min | Requires automation — humans can't respond fast enough |
| 99.999% | 5.26 min | ~26 sec | No human in any loop; few systems truly need or achieve this |

Two readings of that table matter. First: at four nines, your *monthly* budget is 4.4 minutes — one bad deploy spends a quarter's budget, which is why availability engineering is mostly *deployment* engineering (more below). Second: each additional nine costs roughly **10× the engineering** — redundancy, automation, testing of the automation, multi-region — while the business value of the next nine usually doesn't 10×. Knowing which nine your system actually needs is a Staff-level judgment, and "fewer nines than you think" is usually the right answer for everything that isn't payments or safety.

## The composition math (do this in interviews)

Availability composes multiplicatively, and the results surprise people every time.

**Serial chains — dependencies multiply pain.** A request that traverses five components, each 99.9% available:

> 0.999 × 0.999 × 0.999 × 0.999 × 0.999 = 0.999⁵ ≈ **99.5%**

Your beautiful three-nines services compose into a *two-and-a-half* nines system — 43 hours of annual downtime, from parts that each promise under 9. Every dependency you add divides your ceiling. This is the mathematical case for short dependency chains, and why "can we serve this from cache when the recommendation service is down?" isn't an optimization — it's how the arithmetic is escaped (a *soft* dependency doesn't multiply).

**Parallel redundancy — the multiplication runs in your favor.** Two independent instances, each 99% available, where either can serve:

> 1 − (0.01 × 0.01) = 1 − 0.0001 = **99.99%**

Two mediocre nodes outperform one excellent one — *if* the failure independence is real (it rarely fully is; next section) and *if* failover actually works (it works exactly as often as you test it). This pair of formulas — serial multiplies availabilities, parallel multiplies *un*availabilities — is the entire quantitative core of reliability design. Compute them out loud in an interview and you're in a small minority of candidates.

## MTTR is your lever

Availability = MTBF / (MTBF + MTTR): mean time between failures versus mean time to recover. Two ways to improve it: fail less, or **recover faster** — and recovery is by far the better investment, because failure rate at scale is dominated by things you don't control (hardware, networks, dependencies, human error — the last being the largest single cause of major outages), while recovery time is *entirely* yours. Fast recovery decomposes exactly into the DevOps toolchain: fast **detection** (alert on symptoms in seconds, not on cause-chasing), fast **diagnosis** (observability), fast **mitigation** (rollback in one click, feature flags, traffic shifting — *mitigate first, root-cause later*), and fast, safe **redeploy**. A team that recovers in 4 minutes is 10× more available than a team that recovers in 40 with the same failure rate. This is why "boring" pipeline work is availability work, and why the [SRE section](../observability/index.md) of this site is not a side topic.

!!! ops "DevOps lens"
    Trace where outage minutes actually go and it's rarely the failure — it's the *human latency around it*: 10 minutes until the right alert fires, 15 until the right person sees the right dashboard, 20 debating whether to roll back. The systems-design version of this insight: **design mitigations that don't require understanding.** Rollback, flag-off, and failover work *before* anyone knows the root cause; that's what makes them fast. Any design you present should include one no-diagnosis-required mitigation per failure mode — it's the most operationally literate sentence you can say.

## Redundancy patterns

- **Active–passive**: a standby takes over on failure. Simple, but the standby is a bet — it works only if promotion is automated, rehearsed, and the replica was actually keeping up. Failover time is your downtime.
- **Active–active**: all nodes serve; failure just shrinks capacity. Better availability and no rusty failover path — but now you need statelessness or multi-writer data stories, which is where the [replication](../data/replication.md) rabbit hole begins.
- **N+1 / N+2**: capacity math — enough nodes that losing one (or two, or an AZ) leaves you able to carry peak. The subtlety operators know: N+1 must hold *during your peak, during a deploy* — redundancy that exists only at 3 a.m. on a quiet Tuesday is theater.

**Failure domains** give redundancy its geometry: node < rack < availability zone < region. Redundancy only counts across a domain boundary — two replicas in one rack share a switch; two AZs share a region's control plane; two regions share your DNS provider and your deploy pipeline. Which brings us to the uncomfortable part.

## The lie of independence

That parallel-redundancy formula assumed failures are independent. In production they are correlated by a thousand shared threads, and correlated failure is *the* availability killer at scale:

- **Shared software**: both "redundant" replicas run the same binary — a bug is a 100%-correlated failure. Same for the config push that hits every region in one shot.
- **The deploy pipeline**: your redundancy is fully coupled through the thing that updates it. Most multi-region outages are deploys. (Mitigation: staged rollouts with bake time between waves — turning deployment back into *independent* experiments.)
- **Cascades**: node A dies, its load lands on B, B saturates and dies — redundancy *transmitted* the failure instead of containing it. Requires load shedding and circuit breaking to stop the domino ([resilience patterns](../distributed/resilience.md)).
- **Recovery herds**: everything reboots at once, every cache is cold, every client retries in sync — the recovery *is* the second outage. (Jitter everything.)
- **Hidden shared infrastructure**: the same DNS, the same certificate authority, the same NTP, the same secrets store. Draw your architecture's *actual* dependency graph and the redundancy often evaporates.

A gorgeous counter-technique worth knowing at Staff level: **shuffle sharding.** Instead of all customers sharing all N nodes (any poison customer hurts everyone), assign each customer a random small subset of nodes. Two customers rarely share their whole subset, so a customer who triggers crashes takes out *their* nodes while nearly everyone else's assigned subset survives intact. Blast radius drops from "everyone" to "almost no one" using the same hardware — pure design, zero new machines. It generalizes: **cell-based architecture** partitions the entire stack into independent cells so failures (and risky deploys) are contained by construction.

## Degrade on purpose

The final availability tool is redefining "up." A feed that serves slightly stale content from cache during a database failover is *up*; a checkout that queues orders for later fulfillment when inventory service is down is *up enough*. Build the degradation ladder into the design — full service → stale reads → core-features-only → static page — with each rung triggered automatically. Users forgive degraded; they screenshot down. (The formal version of "how much failure is acceptable" is the error budget, which gets full treatment in [SLOs](../observability/slos.md).)

!!! staff "Staff+ altitude"
    Availability at Staff level is a **portfolio and a price list**, not a virtue. The moves: (1) *Tier the services* — payments at 99.99%, search at 99.9%, recommendations at 99% with graceful fallback; uniform nines are uniform waste. (2) *Buy nines where they're cheap* — a static failover page is a nine for $50; multi-region active-active is a nine for a team-year; spend accordingly. (3) *Interrogate correlation, not components* — in design reviews, the Staff question is never "is there a replica?" but "what do the replicas share?" (4) *Aim the budget at the deploy pipeline* — if most outage minutes are change-induced, progressive delivery is the highest-ROI availability project in the company, which is a very DevOps-shaped conclusion.

!!! interview "In the interview"
    The reliable scoring moves: **do the multiplication** ("five 99.9% hops serial → about 99.5%; that's why I'm making the recommendation call soft — cache fallback, so it drops out of the chain"); **quote MTTR over MTBF** ("I'd rather cut recovery from 40 minutes to 4 than chase failure prevention — here's the rollback story"); and when asked "what if the whole AZ goes down," answer in *failure domains and shared fate* rather than boxes ("we're N+1 across three AZs at the compute layer, but the honest risks are the correlated ones — same binary, same deploy wave, so I'd stage rollouts AZ by AZ"). Expect the trap question *"how do we get five nines?"* — the Staff answer starts with "which part actually needs them?"

**Next:** [Latency & throughput](latency-throughput.md) — Little's law, lying averages, and the tyranny of the tail.
