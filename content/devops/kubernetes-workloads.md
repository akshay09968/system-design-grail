# Kubernetes Workloads & Traffic

The architecture page covered the brain; this one covers the hands — the workload objects that run your code and the traffic machinery that finds it. It's organized around the two moments where theory meets consequence: **how traffic reaches a pod** (Services, Ingress, and the eventual-consistency gap nobody talks about) and **how pods die** (the lifecycle choreography that decides whether every deploy drops requests). Both are [distributed systems content](../distributed/index.md) wearing platform clothes, and both are where "we run Kubernetes" designs quietly succeed or fail.

## Workload objects in one pass

**Pod** — the atom: one or more containers sharing a network namespace (one IP, localhost between containers) and volumes; the [sidecar pattern's](service-mesh.md) enabling structure. Pods are *mortal by design* — never mourned, only replaced ([cattle, not pets](../foundations/scalability.md), enforced by API). **Deployment → ReplicaSet → Pods** — the stateless workhorse: declared replica count, [rolling updates](deployments.md) by creating a new ReplicaSet and shifting counts. **StatefulSet** — for the stateful minority: stable identities (`db-0`, `db-1`), per-pod persistent volumes, ordered rollout — the primitives [replicated databases](../data/replication.md) need (with the honest caveat that the *hard* parts — failover, backup, [fencing](../distributed/coordination.md) — still belong to an operator or your runbooks; StatefulSet is identity plumbing, not a DBA). **DaemonSet** — one per node: [log shippers](../case-studies/log-pipeline.md), node agents, CNI. **Job/CronJob** — run-to-completion with retries and [the scheduler-overlap questions](../case-studies/job-scheduler.md) attached.

## Services: a routing rumor, kept mostly true

A **Service** is a stable virtual IP + DNS name in front of an ever-changing pod set. The mechanics matter for debugging and design: the control plane maintains **EndpointSlices** (which pods are ready); on every node, **kube-proxy** programs iptables/IPVS rules (or [eBPF, in Cilium-class CNIs](linux-fundamentals.md)) translating ServiceIP → some ready pod IP. Three consequences worth owning:

- **It's L4 and random-ish** — per-*connection* distribution, no request awareness: [all the L4 limitations](../networking/load-balancing.md) apply, including the gRPC-pins-to-one-pod problem (fix with [mesh or client-side LB](service-mesh.md)).
- **It's eventually consistent** — pod dies → endpoint update → API → watch → every node's kube-proxy reprograms rules. That pipeline takes hundreds of milliseconds to seconds, during which *nodes route to a corpse*. This gap is unavoidable-by-architecture and is exactly what [graceful shutdown choreography](#the-pod-lifecycle-where-deploys-drop-requests) exists to bridge — the single most practically important fact on this page.
- **Headless Services** (`clusterIP: None`) skip the VIP and return pod IPs directly via DNS — how StatefulSets get per-pod names and how [client-side load balancers](../networking/load-balancing.md) get their endpoint lists.

North-south, the story layers: `LoadBalancer` Services program cloud LBs; **Ingress/Gateway API** adds the [L7 tier](../networking/proxies-gateways.md) (host/path routing, TLS termination) — architecturally your [reverse-proxy page](../networking/proxies-gateways.md) instantiated as cluster config, with the same [config-blast-radius cautions](../networking/proxies-gateways.md).

## Probes: health checks with sharp edges

Kubernetes ships the [health-check trade-offs](../networking/load-balancing.md) as three distinct dials, and confusing them causes real outages:

- **Readiness** — "may I receive traffic?" Fail → removed from endpoints (no restart). This is the *load-balancing* signal: fail it during startup warmup, dependency loss you can't serve through, and — crucially — shutdown.
- **Liveness** — "should I be restarted?" Fail → kubelet kills the container. This is *deadlock insurance only* — and the [deep-check lesson](../networking/load-balancing.md) applies doubled: a liveness probe that checks the database converts every database blip into a **fleet-wide restart storm** (the most common self-inflicted K8s outage in existence). Liveness checks process-internal health, nothing else.
- **Startup** — holds the other probes off until slow-booting apps finish initializing (the JVM's friend).

The design rule in one line: **readiness may know about dependencies (carefully); liveness must not.**

## The pod lifecycle: where deploys drop requests

The choreography every zero-downtime claim depends on. On pod termination:

1. Pod marked Terminating; **endpoint removal begins** (async, fleet-wide — the propagation gap above).
2. `preStop` hook runs; **SIGTERM** goes to PID 1 ([who must actually receive it](containers.md)).
3. Grace period (default 30 s) elapses; **SIGKILL**.

The naive failure: app exits instantly on SIGTERM *while nodes are still routing to it* — connection resets on every deploy, forever, at a rate too low to page but high enough to poison [error budgets](../observability/slos.md). The correct dance, worth reciting: **on SIGTERM, fail readiness, keep serving; `preStop` sleep ~5–10 s** (outwait endpoint propagation); **then drain in-flight work and exit**; grace period sized to real drain time (long-poll/[WebSocket fleets](../networking/apis.md) need app-level drain — GOAWAY, reconnect nudges — [the LB draining story](../networking/load-balancing.md) with pod mechanics). This paragraph is the answer to "why do we see 502s during deploys" at approximately every company.

Placement completes the availability story: **topology spread constraints** across zones ([failure domains as YAML](../foundations/reliability-availability.md)), **PodDisruptionBudgets** so node drains and upgrades can't take too many replicas at once (with the classic deadlock: PDB `minAvailable: 2` on a 2-replica deployment = un-drainable nodes — PDBs encode [N+1 thinking](../foundations/reliability-availability.md), so provision the +1), and anti-affinity where "not on the same node" is load-bearing.

!!! ops "DevOps lens"
    The incident canon for this layer: **deploy-time 502/reset blips** (the lifecycle dance above — check SIGTERM handling, preStop, and who's PID 1); **restart storms** (liveness probing a dependency — audit every liveness probe for network calls; you will find one); **"Service routes to nothing"** (readiness failing fleet-wide because a shared dependency blipped — [the deep-check cascade](../networking/load-balancing.md), K8s edition); **the un-drainable node** (PDB vs. replica-count deadlock stalling cluster upgrades — fleet upgrades blocked by one team's YAML); and **DNS query amplification** ([ndots and search domains](../networking/dns.md) turning every external lookup into 5 queries — CoreDNS capacity is real capacity). Deploy-blip debugging order: endpoint propagation → SIGTERM handling → grace period vs. drain time — it's one of those three, in that order of likelihood.

!!! staff "Staff+ altitude"
    Markers: (1) **The lifecycle dance is a paved-road deliverable** — SIGTERM handling, preStop defaults, probe templates, PDBs, and spread constraints belong in the base chart/library every service inherits; individually-remembered choreography is how 40 teams ship 40 slightly-broken deploys ([the paved-road argument's](../caching/failure-modes.md) fifth appearance — it keeps being the answer because platform *is* the answer). (2) **Probes encode your [health-check philosophy](../networking/load-balancing.md)** — publish the policy (readiness may consider X, liveness never checks Y) as reviewed platform doctrine, because each probe is a distributed-systems decision made by whoever wrote the YAML at 6 p.m. (3) **Stateful-on-K8s is a portfolio decision** — operators have matured (databases on K8s are now defensible), but the honest criteria are operational: does the operator's failover beat your managed service's? Who debugs it at 3 a.m.? Write the decision per stateful system, not per fashion. (4) **Gateway/Ingress topology is your [north-south policy layer](../networking/proxies-gateways.md)** — own it like the tier-0 config system it is.

!!! interview "In the interview"
    The gold here is the **zero-downtime deploy narration** — when any design discussion touches deployment: *"Rolling update; each pod on SIGTERM fails readiness but keeps serving, preStop outwaits endpoint propagation — Service routing is eventually consistent, nodes route to terminating pods for a few hundred ms — then drains in-flight and exits within the grace period; PDBs hold N+1 during node drains; spread constraints keep replicas across zones."* That's five mechanisms and one distributed-systems insight (the propagation gap) in one breath — unfakeable operational depth. Probes to expect: *"how does a Service actually route?"* (EndpointSlices → kube-proxy → iptables/IPVS; L4 per-connection; eventually consistent); *"liveness vs. readiness?"* (restart vs. traffic-removal — and volunteer the restart-storm anti-pattern, it's the strongest signal in the topic); *"how do you run a database on Kubernetes?"* (StatefulSet gives identity + volumes; the *hard* parts are the operator's failover/[fencing](../distributed/coordination.md)/backup logic — then the honest build-vs-managed judgment).

**Next:** [Kubernetes autoscaling & capacity](kubernetes-autoscaling.md) — requests, limits, and the three autoscalers, with the bin-packing economics underneath.
