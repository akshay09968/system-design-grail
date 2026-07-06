# Security

Security in system design interviews is rarely a whole question and always a scoring surface: the candidate who authenticates their webhooks, scopes their tokens, and knows where the TLS terminates collects quiet points on every design, and at Staff level "how would this be attacked?" is a first-class review lens. Two pages cover what system design actually demands — identity (the part that appears in every design) and layered defense (the part that appears in every incident) — with [secrets & workload identity](../devops/secrets-identity.md) already covered in the DevOps section as the third pillar.

<div class="grid cards" markdown>

-   **[Authentication & authorization](authn-authz.md)**

    ---
    Sessions vs. JWTs honestly, OAuth2/OIDC without the acronym fog, the revocation problem, and authorization models from RBAC to ReBAC.

-   **[Defense in depth](defense-in-depth.md)**

    ---
    Zero trust as an architecture, the layered model, DDoS and edge protection, data protection posture, and the secure-design checklist.

-   **[Secrets & identity](../devops/secrets-identity.md)** *(in DevOps & Platform)*

    ---
    Vault/KMS, envelope encryption, workload identity, and rotation as engineering.

</div>

## If you are cramming

Read the JWT-vs-session and revocation sections of [authn-authz](authn-authz.md) — they're the most probed security topics in system design — and the checklist at the end of [defense in depth](defense-in-depth.md), which doubles as your review pass for any design you present.
