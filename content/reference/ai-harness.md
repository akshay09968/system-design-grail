# AI Practice Harness

The site teaches; the harness makes you *perform*. `ai/grail.py` is a CLI that
turns Claude models (Opus, Sonnet, or Haiku — selectable per session) into
practice partners **grounded in this site's own pages** — the AI interviews,
drills, and grades you using the Grail's rubrics, terminology, and expected
answers rather than generic internet advice.

## Setup

```bash
.venv/bin/pip install anthropic
export ANTHROPIC_API_KEY=sk-ant-...    # console.anthropic.com → API keys
```

## The four modes

**Mock interviewer** — a rigorous Staff-level interviewer runs a realistic
session: states the prompt, lets you drive, probes trade-offs, kills nodes,
scales your numbers 10×, and never lectures. Say `:grade` and it breaks
character to score you on the [five rubric axes](../interviews/framework.md)
with [level calibration](../interviews/communication.md).

```bash
python3 ai/grail.py interview -t chat
```

**Drill sergeant** — rapid-fire active recall: one question, your answer, a
one-word verdict plus the missing clause, next question. Escalates as you hit;
circles back to misses. Pairs with the [drills page](../interviews/drills.md);
run it on `-m haiku` and volume costs pennies.

```bash
python3 ai/grail.py drill -t distributed -m haiku
```

**Design reviewer** — write a design (timed, ideally — [the framework's](../interviews/framework.md)
45 minutes), then get Staff-review grading: per-axis scores with quoted
evidence, the five follow-ups an interviewer would attack next, and the level
call.

```bash
python3 ai/grail.py review -t news-feed --file my-design.md
```

**Tutor** — targeted questions answered in the site's house style (intuition →
mechanics → numbers → trade-offs, failure story attached), always citing which
page teaches it fully.

```bash
python3 ai/grail.py ask -t kafka "When is Kafka the wrong choice?"
```

## Practical notes

- **Topics**: any section (`caching`, `devops`, ...) or page slug (`chat`,
  `kafka`, `payments`). The harness loads those pages as grounding.
- **Cost**: the grounding is prompt-cached, so multi-turn sessions re-read it
  at ~10% price (watch the `cache-hit` counter in the per-turn usage line).
  Interviews on Sonnet cost well under a dollar; Haiku drills cost pennies.
- **`--dry-run`** shows exactly what would be sent (model, files, token
  estimate) without needing an API key.
- Full details: `ai/README.md` in the repo.

The practice loop this enables, end to end: [study a page](../interviews/study-plans.md) →
[drill it](../interviews/drills.md) → rehearse the case study out loud → run a
mock against the harness → `:grade` → study the gaps it names. That loop,
repeated, is [the whole regimen](../interviews/question-bank.md) with the
partner problem solved.
