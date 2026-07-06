# DevOps & Platform

This is the section nobody else in the candidate pool can match you on — and the one that turns "solid design" into "I want this person running our infrastructure." It's also where system design and platform engineering are revealed to be the same discipline: a Kubernetes cluster *is* a distributed system (etcd is [consensus](../distributed/consensus.md), controllers are [reconciliation loops](iac-gitops.md), the scheduler is a [bin-packing service](kubernetes-autoscaling.md)); a CI/CD pipeline *is* a [queue-and-workers design](../messaging/async-fundamentals.md); a deploy strategy *is* [applied reliability math](../foundations/reliability-availability.md). Read these pages as both: how to operate the platform, and how to *design systems like it* in interviews.

<div class="grid cards" markdown>

-   **[Linux fundamentals for scale](linux-fundamentals.md)**

    ---
    Processes, file descriptors, memory and the OOM killer, cgroups — the substrate every abstraction eventually leaks down to.

-   **[Containers deep dive](containers.md)**

    ---
    Namespaces + cgroups + layered images: what a container actually is, and why that matters for security and density.

-   **[Kubernetes architecture](kubernetes-architecture.md)**

    ---
    The control plane as a distributed system: etcd, reconciliation loops, and the fail-static property that saves your weekends.

-   **[Kubernetes workloads & traffic](kubernetes-workloads.md)**

    ---
    Deployments, Services, Ingress, probes done right, and the pod lifecycle that decides whether deploys drop requests.

-   **[Kubernetes autoscaling & capacity](kubernetes-autoscaling.md)**

    ---
    Requests vs. limits, HPA/VPA/CA/Karpenter, and the bin-packing economics underneath.

-   **[Service mesh](service-mesh.md)**

    ---
    mTLS, traffic management, and observability by sidecar — what it buys, what it costs, when it's worth it.

-   **[CI/CD as a system](cicd.md)**

    ---
    The pipeline as a distributed system design: runners, artifacts, caching, and the trust boundary nobody draws.

-   **[Deployment strategies](deployments.md)**

    ---
    Rolling, blue-green, canary, flags — and the schema-migration choreography that makes them real.

-   **[IaC & GitOps](iac-gitops.md)**

    ---
    Terraform state as a distributed systems problem, drift, and reconciliation as an architectural pattern.

-   **[Secrets & identity](secrets-identity.md)**

    ---
    Vault/KMS, workload identity over static credentials, and rotation as a designed capability.

-   **[Cloud networking](cloud-networking.md)**

    ---
    VPCs, security groups, NAT economics, PrivateLink, and the network path every design implicitly assumes.

-   **[Multi-region & DR](multi-region.md)**

    ---
    RTO/RPO honestly, active-passive vs. active-active, data gravity, and the failover you actually rehearse.

-   **[Cost & capacity](cost-capacity.md)**

    ---
    FinOps as engineering: unit economics, rightsizing, spot strategies, and capacity planning with lead times.

</div>

## If you are cramming

[Deployment strategies](deployments.md) and [multi-region & DR](multi-region.md) surface directly in interviews. [Kubernetes architecture](kubernetes-architecture.md) is your depth reserve when infrastructure comes up. The rest is your ambient advantage — mine them for the *DevOps lens* callouts you'll deploy in every other topic.
