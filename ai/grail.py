#!/usr/bin/env python3
"""grail.py — AI practice harness for The System Design Grail.

Turns any (non-Fable) Claude model into a mock interviewer, drill sergeant,
design grader, or tutor — grounded in the site's own content so the AI asks,
probes, and grades in the Grail's voice and rubric.

Modes:
  interview  Run a mock system design interview (interviewer persona + rubric)
  drill      Rapid-fire active-recall questions on a topic
  review     Grade a written design (from --file or stdin) against the rubric
  ask        Tutor mode: ask anything, answered in the site's style

Examples:
  python ai/grail.py interview -t chat
  python ai/grail.py drill -t caching -m haiku
  python ai/grail.py review -t news-feed --file my-design.md
  python ai/grail.py ask -t kafka "When is Kafka the wrong choice?"

Requires: pip install anthropic;  ANTHROPIC_API_KEY in the environment.
"""

import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"

MODELS = {
    "opus": "claude-opus-4-8",
    "sonnet": "claude-sonnet-4-6",
    "haiku": "claude-haiku-4-5",
}
# Models that support adaptive thinking (4.6+ Opus/Sonnet families).
ADAPTIVE_PREFIXES = ("claude-opus-4-6", "claude-opus-4-7", "claude-opus-4-8", "claude-sonnet-4-6")

MAX_GROUNDING_CHARS = 600_000  # safety cap (~150k tokens)

DIM = "\033[2m"
BOLD = "\033[1m"
GOLD = "\033[33m"
RESET = "\033[0m"

# ---------------------------------------------------------------- personas

BASE_STYLE = """\
You are part of "The System Design Grail" — a system design mastery site written
for a DevOps engineer targeting Staff/Principal level. House style: intuition
first, then mechanics, then numbers, then trade-offs; production failure modes
attached to every topic; operational experience (deploys, incidents, capacity,
observability) treated as a first-class design skill. Reference material from
the site is provided below between <grail> tags — treat it as the source of
truth for terminology, rubrics, and the expected shape of good answers. Cite
page names (e.g. "see Partitioning & sharding") when pointing the user at
deeper material.
"""

PERSONAS = {
    "interview": """\
ROLE: You are a rigorous, fair Staff-level system design interviewer at a top
infrastructure company. Run a realistic ~45-minute interview.

Conduct:
- Open by stating the design prompt (use the topic's case study if provided,
  otherwise choose a strong prompt yourself) and nothing else. Let the
  candidate drive; a good interview is 80% candidate.
- Stay in character: ask, probe, redirect. Never lecture, never reveal the
  ideal answer mid-interview, never answer your own questions.
- Probe like the rubric: push on trade-offs ("why that over X?"), inject
  failures ("that node just died — walk me through it"), scale the numbers
  ("now it's 10x"), and test operability ("how would you know it's working?").
- One question or challenge at a time. React to what the candidate actually
  said, including gently exposing hand-waving.
- If the candidate is silent/stuck, offer one small nudge, then let them work.

Grading: when the candidate says ":grade" (or the interview naturally ends),
break character and deliver structured feedback:
1. Score each axis 1-5 with one-line evidence: problem navigation, technical
   depth, trade-off maturity, operability instinct, communication.
2. Level calibration: does this performance read Senior, Staff, or Principal —
   and the single change that would raise it one level.
3. The three strongest moments and the three highest-leverage gaps, each with
   the Grail page to study.
""",
    "drill": """\
ROLE: You are a drill master running active-recall practice.

Conduct:
- Ask ONE question at a time from the grounded topic, hardest-hitting concepts
  first (the kind interviews actually probe). Prefer "explain/derive/compute"
  questions over trivia.
- Wait for the answer. Then: verdict in one word (Correct / Partial / Miss),
  a 1-3 sentence correction or sharpening (include the number, the name, or
  the one clause they missed), and the relevant Grail page name.
- Then immediately ask the next question. Keep total response short — this is
  a fast loop, not a lecture.
- Escalate difficulty as they get answers right; circle back to missed
  concepts in varied form before the session ends.
- On ":score", report questions asked, hit rate, and the 3 concepts to restudy.
""",
    "review": """\
ROLE: You are a Staff+ design reviewer grading a written system design.

The candidate's design document is the first user message. Grade it against
the Grail rubric:
1. Requirements & scoping — was the problem cut down defensibly?
2. Estimation — do numbers exist, and do they drive decisions?
3. Architecture — coherent skeleton, right components, justified choices?
4. Deep-dive quality — are the hard parts (identified correctly?) given real
   treatment: trade-offs named, failure modes addressed?
5. Operability — observability, rollout, degraded modes, capacity honesty.
6. Communication — could a colleague build from this?

Deliver: per-axis score 1-5 with evidence quoted from their text; the five
follow-up questions an interviewer would attack next (hardest first); level
calibration (Senior/Staff/Principal) with the one structural change that would
raise it; and the Grail pages to study for each gap. Be direct — praise only
what's genuinely strong.
""",
    "ask": """\
ROLE: You are the Grail's tutor — the site's voice, interactive.

Answer questions in the house style: intuition first, then mechanics, then
numbers, then trade-offs, with the production failure story attached. Keep
answers tight (the site exists for depth; you exist for targeted clarity).
Always: connect to the DevOps/operational angle, name the interview
deployment of the idea when relevant, and end with the Grail page(s) that
teach it fully. If the grounding doesn't cover the question, say so and answer
from general knowledge, clearly marked.
""",
}

KICKOFF = {
    "interview": "I'm ready — please give me the design prompt.",
    "drill": "I'm ready — first question, please.",
}

# ---------------------------------------------------------------- grounding

SECTION_DIRS = [d.name for d in CONTENT.iterdir() if d.is_dir()] if CONTENT.exists() else []

ALWAYS_INCLUDE = {
    "interview": ["interviews/framework.md", "interviews/communication.md"],
    "review": ["interviews/framework.md", "interviews/communication.md"],
    "drill": ["interviews/cheatsheets.md"],
    "ask": [],
}


def resolve_topic_files(topic: str | None, mode: str) -> list[Path]:
    """Map a --topic value to content files: a section dir, a page slug, or none."""
    files: list[Path] = [CONTENT / rel for rel in ALWAYS_INCLUDE[mode] if (CONTENT / rel).exists()]
    if not topic or topic == "none":
        return files
    d = CONTENT / topic
    if d.is_dir():
        files += sorted(d.glob("*.md"))
        return files
    # page slug anywhere in the tree (case-studies/chat, or bare "chat")
    matches = sorted(CONTENT.glob(f"**/{topic}.md"))
    if matches:
        files += matches
        # a case-study grounding benefits from its cheat sheet context
        if any("case-studies" in str(m) for m in matches):
            cs = CONTENT / "interviews/cheatsheets.md"
            if cs.exists() and cs not in files:
                files.append(cs)
        return files
    known = ", ".join(sorted(SECTION_DIRS))
    sys.exit(f"Unknown topic '{topic}'. Use a section ({known}) or a page slug like 'chat', 'kafka', 'news-feed'.")


def load_grounding(files: list[Path]) -> str:
    parts, total = [], 0
    for f in files:
        text = f.read_text(encoding="utf-8")
        if total + len(text) > MAX_GROUNDING_CHARS:
            break
        parts.append(f"\n\n===== PAGE: {f.relative_to(CONTENT)} =====\n\n{text}")
        total += len(text)
    return "".join(parts)


# ---------------------------------------------------------------- chat loop

def read_user_input() -> str:
    line = input(f"{BOLD}{GOLD}you>{RESET} ").strip()
    if line == ":paste":
        print(f"{DIM}(paste mode — end with a single '.' on its own line){RESET}")
        buf = []
        while True:
            row = input()
            if row.strip() == ".":
                break
            buf.append(row)
        return "\n".join(buf)
    return line


def stream_turn(client, model: str, system_blocks, messages, use_thinking: bool):
    kwargs = dict(model=model, max_tokens=8192, system=system_blocks, messages=messages)
    if use_thinking:
        kwargs["thinking"] = {"type": "adaptive"}
    with client.messages.stream(**kwargs) as stream:
        print(f"{BOLD}grail>{RESET} ", end="", flush=True)
        for text in stream.text_stream:
            print(text, end="", flush=True)
        final = stream.get_final_message()
    print()
    u = final.usage
    cache_note = f", cache-hit {u.cache_read_input_tokens}" if u.cache_read_input_tokens else ""
    print(f"{DIM}[tokens in {u.input_tokens}{cache_note} | out {u.output_tokens}]{RESET}\n")
    if final.stop_reason == "refusal":
        print(f"{DIM}(the model declined that request){RESET}")
    reply = "".join(b.text for b in final.content if b.type == "text")
    return reply


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="grail.py",
        description="AI practice harness for The System Design Grail.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__.split("Modes:")[1],
    )
    parser.add_argument("mode", choices=["interview", "drill", "review", "ask"])
    parser.add_argument("question", nargs="?", help="(ask mode) the question to ask")
    parser.add_argument("-t", "--topic", default=None,
                        help="section dir (caching, devops, ...) or page slug (chat, kafka, news-feed)")
    parser.add_argument("-m", "--model", default="opus",
                        help="opus | sonnet | haiku | any full non-Fable model id (default: opus)")
    parser.add_argument("--file", type=Path, default=None,
                        help="(review mode) path to your written design; '-' or omit to read stdin")
    parser.add_argument("--dry-run", action="store_true",
                        help="print the composed setup (no API call, no key needed)")
    args = parser.parse_args()

    model = MODELS.get(args.model, args.model)
    if model.startswith("claude-fable") or model.startswith("claude-mythos"):
        sys.exit("This harness is for non-Fable models. Use opus, sonnet, or haiku.")
    use_thinking = model.startswith(ADAPTIVE_PREFIXES)

    if not CONTENT.exists():
        sys.exit(f"Can't find site content at {CONTENT} — run from the repo, or fix ROOT.")

    files = resolve_topic_files(args.topic, args.mode)
    grounding = load_grounding(files)
    system_text = BASE_STYLE + "\n" + PERSONAS[args.mode]
    if grounding:
        system_text += f"\n<grail>{grounding}\n</grail>"
    # One stable system block, cached: the whole persona+grounding prefix is
    # identical every turn of the session, so turns 2+ read it at ~10% price.
    system_blocks = [{"type": "text", "text": system_text,
                      "cache_control": {"type": "ephemeral"}}]

    if args.dry_run:
        print(f"model:      {model}   (adaptive thinking: {use_thinking})")
        print(f"mode:       {args.mode}   topic: {args.topic or '(none)'}")
        print(f"grounding:  {len(files)} file(s), {len(grounding):,} chars (~{len(grounding)//4:,} tokens)")
        for f in files:
            print(f"  - {f.relative_to(CONTENT)}")
        print(f"\npersona (first lines):\n{DIM}{PERSONAS[args.mode].splitlines()[0]}{RESET}")
        return

    try:
        import anthropic
    except ImportError:
        sys.exit("Missing SDK: run  .venv/bin/pip install anthropic")
    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("Set ANTHROPIC_API_KEY in your environment (console.anthropic.com → API keys).")

    client = anthropic.Anthropic()
    messages: list[dict] = []

    print(f"{DIM}The System Design Grail — {args.mode} mode | {model} | topic: {args.topic or 'open'}")
    print(f"Commands: :paste (multiline), :grade / :score (feedback), :q (quit){RESET}\n")

    # Mode-specific first turn
    if args.mode == "review":
        if args.file and str(args.file) != "-":
            design = args.file.read_text(encoding="utf-8")
        else:
            print(f"{DIM}(paste your design; end with Ctrl-D){RESET}")
            design = sys.stdin.read()
            print()
        messages.append({"role": "user", "content": f"My design document:\n\n{design}"})
    elif args.mode == "ask" and args.question:
        messages.append({"role": "user", "content": args.question})
    elif args.mode in KICKOFF:
        messages.append({"role": "user", "content": KICKOFF[args.mode]})
    else:
        messages.append({"role": "user", "content": read_user_input()})

    try:
        while True:
            reply = stream_turn(client, model, system_blocks, messages, use_thinking)
            messages.append({"role": "assistant", "content": reply})
            user = read_user_input()
            if user in (":q", ":quit", ":exit"):
                break
            if not user:
                continue
            messages.append({"role": "user", "content": user})
    except (KeyboardInterrupt, EOFError):
        print(f"\n{DIM}(session ended){RESET}")
    except anthropic.AuthenticationError:
        sys.exit("Authentication failed — check ANTHROPIC_API_KEY.")
    except anthropic.NotFoundError:
        sys.exit(f"Model not found: {model} — check the id (see ai/README.md).")
    except anthropic.RateLimitError:
        sys.exit("Rate limited — wait a minute and retry, or switch to -m haiku.")
    except anthropic.APIConnectionError:
        sys.exit("Network error reaching the API — check your connection.")
    except anthropic.APIStatusError as e:
        sys.exit(f"API error {e.status_code}: {e.message}")


if __name__ == "__main__":
    main()
