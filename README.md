# The System Design Grail

System design mastery from a DevOps perspective — a local-first reference site
for interview preparation and concept refreshing. Deep exposition, production
war stories, real numbers, and interview playbooks in one place.

## Run it

```bash
./serve.sh            # live-reloading site at http://127.0.0.1:8000
```

First-time setup was done automatically (a Python venv in `.venv/` with
`mkdocs-material`). To recreate it on another machine:

```bash
python3 -m venv .venv
.venv/bin/pip install mkdocs-material
./serve.sh
```

To produce a static build (output in `site/`, host anywhere):

```bash
.venv/bin/mkdocs build
```

The build uses plain `.html` links, so you can also open `site/index.html`
directly from Finder — everything works except search, which needs any static
server (`./serve.sh` or `python3 -m http.server -d site`).

## Layout

```
mkdocs.yml        # site config + navigation
content/          # all pages (plain Markdown — edit freely)
  foundations/    #   one directory per section
  ...
  assets/         #   logo
  stylesheets/    #   custom styling (gold "DevOps lens" + teal "interview" callouts)
docs/superpowers/specs/   # design doc for this site
site/             # generated static site (never edit by hand)
```

## Extending it

Add a Markdown file under the right section directory, then add it to `nav:`
in `mkdocs.yml`. House style per page: intuition → mechanics → numbers →
trade-offs → failure modes, plus two callouts:

```markdown
!!! ops "DevOps lens"
    How this topic shows up in production.

!!! interview "In the interview"
    How to deploy this knowledge under questioning.
```

## AI practice harness

`ai/grail.py` turns Claude models (Opus/Sonnet/Haiku, selectable) into a mock
interviewer, drill sergeant, design grader, or tutor — grounded in this site's
own pages. Setup and usage: `ai/README.md`. Quick taste:

```bash
.venv/bin/pip install anthropic && export ANTHROPIC_API_KEY=sk-ant-...
python3 ai/grail.py interview -t chat        # mock interview, rubric-graded
python3 ai/grail.py drill -t caching -m haiku  # cheap rapid-fire recall
```

## Publishing (optional)

Any static host works (`site/` is self-contained). With a GitHub repo,
`.venv/bin/mkdocs gh-deploy` publishes to GitHub Pages in one command.
