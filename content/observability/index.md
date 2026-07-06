# Observability & SRE

A system you can't observe is a rumor you're paying hosting fees for. This section is the discipline of *knowing* — metrics, logs, traces — and the practice built on that knowing: SLOs that turn reliability into a budget, alerts that wake the right person for the right reason, incidents run like operations instead of panics, and chaos drills that find the fiction in your failover story before Friday does. For a DevOps engineer this is home; the section's job is to turn fluency into *design vocabulary* — because "how would you know it's working?" is the question that separates complete designs from diagrams.

<div class="grid cards" markdown>

-   **[Observability fundamentals](fundamentals.md)**

    ---
    The three pillars honestly appraised, cardinality as the master constraint, and instrumentation as design.

-   **[Metrics & Prometheus](metrics.md)**

    ---
    The pull model, RED and USE, histograms and why your p99 is quantized, and the cardinality bomb.

-   **[Logging at scale](logging.md)**

    ---
    Structured events, the pipeline design, sampling strategies, and retention as the real architecture.

-   **[Distributed tracing](tracing.md)**

    ---
    Context propagation, sampling economics, and why traces answer the question metrics can't.

-   **[SLOs & error budgets](slos.md)**

    ---
    SLI/SLO/SLA precisely, burn rates with math, and the budget as an engineering-vs-product treaty.

-   **[Alerting design](alerting.md)**

    ---
    Symptom over cause, the fatigue death spiral, and pages that arrive with runbooks attached.

-   **[Incident management](incidents.md)**

    ---
    Roles, severity, communication, and the blameless postmortem that actually changes things.

-   **[Chaos engineering](chaos.md)**

    ---
    Hypothesis-driven failure injection, game days, and finding fiction in the failover story.

</div>

## If you are cramming

[SLOs & error budgets](slos.md) is the single highest-yield page — the vocabulary appears in Staff+ interviews constantly and most candidates fake it. Then [alerting](alerting.md) for the symptom-vs-cause distinction, and the *In the interview* callouts of the rest.
