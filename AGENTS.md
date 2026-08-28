# AGENTS.md — CELPIP Speaking Trainer

> Conventions for any agent working in this repo. Kept lean because it loads
> every session. Durable facts: [PROJECT_OS.md](PROJECT_OS.md).
> Active phases: [ROADMAP.md](ROADMAP.md). Deferred work:
> [PARKING_LOT.md](PARKING_LOT.md). Strategy: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md),
> [GTM_FINDINGS.md](GTM_FINDINGS.md).

## Session start

Read [PROJECT_OS.md](PROJECT_OS.md) and [ROADMAP.md](ROADMAP.md) before
proposing changes. Skim [PARKING_LOT.md](PARKING_LOT.md) so you do not re-open
a settled deferral.

## Running the app

Local dev is `python3 -m http.server 4173 --bind 127.0.0.1` from the repo
root. Open `http://localhost:4173` in **Chrome or Edge only** (Web Speech
API dependency). The Claude Code launcher config is in
[.claude/launch.json](.claude/launch.json).

## Testing (mandatory before push)

Open `http://localhost:4173/tests.html` and confirm all 17 regression tests
are green. The suite drives the real app with a mock microphone; it is safe
to run in the same browser you practice in. If you add a feature, add a test.

## Editing conventions

- **Vanilla JS, no build step.** Each script is an IIFE exposing one
  `window.*` global. Do not add a bundler, `package.json`, or ES modules
  without an explicit decision (this would break the tests.html mock
  injection). See [PROJECT_OS.md Decisions Log](PROJECT_OS.md).
- **Strict script load order** in [index.html](index.html): `data → drilldata
  → analysis → ambience → drills → app`. Match the same order in
  [tests.html](tests.html) if you add a script.
- **Cache-bust `?v=N`** on every script/CSS tag in both HTML files, together,
  when JS/CSS changes ([index.html:10,36-41](index.html)).
- **Persist under `celpipTrainer.<name>.v1`** namespaced `localStorage` keys.
  Reserve room for a `.v2` migration; do not overwrite existing schemas.
- **No em dashes in prose or docs.** Use commas, colons, or parentheses.
- **No secrets, no telemetry, no fetch to external hosts** except Google
  Fonts and the optional `assets/test-centre-noise.mp3`. The
  "all-local-nothing-uploaded" promise is load-bearing for both privacy copy
  and the score-fairness argument.

## Content authoring

All practice content (prompts, model answers, drill items, scenes, rubric
guides) is original-authored for this app. **Do not paste in Paragon
material** or content from public CELPIP question banks; the IP-cleanliness
of [js/data.js](js/data.js) and [js/drilldata.js](js/drilldata.js) is a
decision, not an accident.

## Deploying

Pushing to `main` publishes to GitHub Pages immediately. There is no CI
gate. Run the regression suite locally first (see Testing above) and bump
`?v=N` on any JS/CSS change.

## When you disagree with a decision

The [PROJECT_OS.md Decisions Log](PROJECT_OS.md) uses ADR-lite entries: each
records what *forced* the choice. If circumstances change, add a new entry
that **SUPERSEDES** the old one; do not silently rewrite the old entry.
