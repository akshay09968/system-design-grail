# Grail AI Harness

A CLI that turns Claude models into practice partners **grounded in the site's
own content** — the AI interviews, drills, and grades you using the Grail's
rubrics and terminology, not generic advice.

## Setup (once)

```bash
.venv/bin/pip install anthropic
export ANTHROPIC_API_KEY=sk-ant-...   # console.anthropic.com → API keys
```

## The four modes

```bash
# Mock interview: realistic 45-min session, probing follow-ups, rubric grading
python3 ai/grail.py interview -t chat          # interviewer uses the chat case study
python3 ai/grail.py interview                  # interviewer picks the prompt

# Drills: rapid-fire active recall with instant verdicts
python3 ai/grail.py drill -t caching
python3 ai/grail.py drill -t distributed -m haiku   # cheap + fast for volume

# Review: paste/point at a written design, get graded Staff-review feedback
python3 ai/grail.py review -t news-feed --file my-design.md
cat design.md | python3 ai/grail.py review

# Tutor: targeted questions answered in the site's voice, with page citations
python3 ai/grail.py ask -t kafka "When is Kafka the wrong choice?"
python3 ai/grail.py ask "Walk me through fencing tokens again"
```

**Topics** (`-t`): any section directory (`foundations`, `networking`, `data`,
`caching`, `messaging`, `distributed`, `devops`, `observability`, `security`,
`interviews`, `case-studies`) or any page slug (`chat`, `kafka`, `payments`,
`news-feed`, `kubernetes-architecture`, ...). Omit for ungrounded/open mode.

**Models** (`-m`): `opus` (default — claude-opus-4-8, the strongest
interviewer/grader), `sonnet` (claude-sonnet-4-6 — great quality, 60% the
price), `haiku` (claude-haiku-4-5 — cheap, ideal for drill volume). Any full
non-Fable model id also works.

**In-session commands**: `:paste` for multiline answers (end with `.`),
`:grade` / `:score` for feedback, `:q` to quit.

## Cost notes

The harness caches the persona + grounding as a stable prompt prefix
(`cache_control: ephemeral`), so multi-turn sessions re-read it at ~10% of
input price — the per-turn usage line shows `cache-hit N` when it's working.
A grounded interview session typically costs well under a dollar on Sonnet;
drills on Haiku cost pennies. Use `--dry-run` (no key needed) to see exactly
what would be sent: model, grounding files, and estimated token size.
