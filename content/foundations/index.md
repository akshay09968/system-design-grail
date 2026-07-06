# Foundations

Everything else in this site — every database choice, every queue, every Kubernetes deep dive, every case study — stands on the eight pages in this section. They give you the vocabulary and the mental models that let you *derive* answers instead of memorizing them. When an interviewer pushes you off the happy path (and a good one always will), these are the pages that keep you standing.

## Reading order

The pages build on each other; read them in order the first time through.

<div class="grid cards" markdown>

-   **[The DevOps lens](devops-lens.md)**

    ---
    Why your operations background is an unfair advantage in system design interviews — and the two gaps you must close to cash it in.

-   **[Thinking in systems](thinking-in-systems.md)**

    ---
    The ten mental models behind every design: read vs. write paths, bottleneck hunting, the four questions to ask of any component.

-   **[Scalability](scalability.md)**

    ---
    Vertical vs. horizontal, why stateless services scale and stateful ones hurt, Amdahl's law, and the scale cube.

-   **[Reliability & availability](reliability-availability.md)**

    ---
    The nines, the math of serial and redundant composition, MTTR as the DevOps lever, and why "independent" failures rarely are.

-   **[Latency & throughput](latency-throughput.md)**

    ---
    Little's law, why averages lie and tails dominate, tail-latency amplification in fan-outs, and latency budgets.

-   **[CAP & PACELC](cap-pacelc.md)**

    ---
    What the theorem actually says (not the triangle myth), where real systems sit, and PACELC — the trade-off you pay even without partitions.

-   **[Consistency models](consistency-models.md)**

    ---
    Linearizability down to eventual consistency, the client-centric guarantees users actually notice, and the isolation-vs-consistency confusion that sinks candidates.

-   **[Back-of-envelope estimation](estimation.md)**

    ---
    The latency numbers, the powers of two, and the standard recipes — with fully worked examples you can reproduce under pressure.

</div>

## If you are cramming

Forty-eight hours before an interview? Read [The DevOps lens](devops-lens.md), [Thinking in systems](thinking-in-systems.md), and [Back-of-envelope estimation](estimation.md), then go straight to the Interview Playbook and two case studies. The other five pages here are what you read *next* time, when you prepare properly.
