# ROADMAP — CELPIP Speaking Trainer

> The Status Board is the source of truth. Phase Detail is the explanation.
> Deferred items live in [PARKING_LOT.md](PARKING_LOT.md); durable facts and
> decisions live in [PROJECT_OS.md](PROJECT_OS.md).

Last updated: 2026-08-28

## Status Board

| Phase | What | Status | Shipped |
|-------|------|--------|---------|
| 1 | Speaking wedge (heuristic feedback) | ✅ shipped | 2026-08 |
| 1a | Test Centre Noise ("Distraction Mode") | ✅ shipped | 2026-08 |
| 1b | Pronunciation Drills (4 categories) | ✅ shipped | 2026-08 |
| 1c | Regression self-test suite (17 tests) | ✅ shipped | 2026-08 |
| 2 | Writing module (both CELPIP writing tasks) | ⏳ next | — |
| 3 | LLM-based Speaking feedback (engine upgrade) | 💡 planned | — |
| 4 | Reading + Listening (table stakes) | 💡 planned | — |
| — | Calibration & score-accuracy evidence | 🅿️ parked | — (see [PARKING_LOT.md](PARKING_LOT.md)) |

---

## Phase Detail

### Phase 1 — Speaking wedge · ✅ shipped 2026-08

[HU] The differentiator. Practice all 8 official CELPIP speaking tasks under
real per-task timing, record via the browser, receive automatic heuristic
feedback with a Level estimate against the Level-10+ target.

**What was built.**
- 8 tasks with official timings (`js/data.js`): Giving Advice 30s/90s,
  Personal Experience 30s/60s, Describing a Scene 30s/60s, Making Predictions
  30s/60s, Comparing & Persuading 60s/60s, Difficult Situation 60s/60s,
  Expressing Opinions 30s/90s, Unusual Situation 30s/60s.
- 40 original prompts (5 per task), each with a Level 10+ model answer, pro
  tips, power phrases, and a recommended structure.
- Illustrated SVG scenes for Tasks 3, 4 (12 scenes), and 8 (unusual objects).
- Heuristic scoring engine ([js/analysis.js](js/analysis.js)) covering the
  12 metrics in the rubric: overall, task fulfillment, coherence, pace, um,
  filler, vocabulary, connectors, pauses, length, negative tone, volume.
- Full Mock Test mode (all 8 tasks in sequence) plus single-task practice.
- Automatic post-recording flow: timer ends → AI feedback → report saved,
  no manual step ([Decisions Log](PROJECT_OS.md), 2026-08-24 entry).
- Local progress history and a report replayer under "My Progress"
  (`localStorage` under `celpipTrainer.history.v1`).

**Key files.** [index.html](index.html), [css/app.css](css/app.css),
[js/data.js](js/data.js), [js/analysis.js](js/analysis.js),
[js/app.js](js/app.js).

**Decisions made.** Automatic feedback flow, original-authored content,
heuristic-only scoring (no LLM), Chrome/Edge-only via Web Speech API. Full
rationale: [PROJECT_OS.md Decisions Log](PROJECT_OS.md).

**Open items.** See [PARKING_LOT.md](PARKING_LOT.md).

**What it unlocks.** A shippable, self-graded practice loop. Phase 2 can
reuse the same recording infrastructure, storage schema, ambience engine,
and regression harness for the Writing module (though Writing does not
record audio, so most of the recording chain will be bypassed).

---

### Phase 1a — Test Centre Noise · ✅ shipped 2026-08

[HU] Environmental fidelity: a procedural "walla" ambience engine
([js/ambience.js](js/ambience.js)) that simulates a crowded test centre
without speaking any real words (so it cannot leak text into the user's
speech-to-text transcript).

**Key files.** [js/ambience.js](js/ambience.js),
[assets/README.txt](assets/README.txt) (custom-audio override),
`.claude/launch.json`.

**What was built.** Three levels (`quiet`, `medium`, `high`), a five-second
preview on the task intro, live level-switching mid-recording, a 🎧 badge on
reports produced under noise, and a custom-audio override where dropping
`assets/test-centre-noise.mp3` into `assets/` loops that file instead of the
synthesizer.

**Decisions made.** Ship as a first-class feature, not a nice-to-have
([PROJECT_OS.md Decisions Log](PROJECT_OS.md), 2026-08-24 entry).

**What it unlocks.** A concrete environmental-fidelity claim for GTM copy
(the "I have already done this" centerpiece from
[PROJECT_CONTEXT.md §3](PROJECT_CONTEXT.md)).

---

### Phase 1b — Pronunciation Drills · ✅ shipped 2026-08

[AI] A separate practice mode: read-aloud scoring against a known target.
The Web Speech API transcribes what it actually heard; the scorer aligns
target vs heard word-by-word and marks each word green (clear), yellow
(check the ending), or red (misheard).

**Key files.** [js/drills.js](js/drills.js),
[js/drilldata.js](js/drilldata.js).

**What was built.**
- Four drill categories: Minimal Pairs (sheep/ship…), Hard Words (stress,
  silent letters, -ed/-s endings), Power Phrases (high-scoring connectors),
  and Shadowing (listen to a model, repeat it).
- Automatic trouble-word list (`localStorage` under
  `celpipTrainer.troubleWords.v1`) that surfaces the words the user keeps
  missing so they can re-drill until clear.
- Number/ordinal normalization ("30" ↔ "thirty", "1st" ↔ "first") so the
  scorer does not penalize the recognizer's own text-normalization quirks
  ([js/drills.js:35-49](js/drills.js)).

**Decisions made.** Same "all local, nothing uploaded" rule as Speaking
([js/drills.js:1-4](js/drills.js)).

---

### Phase 1c — Regression self-test suite · ✅ shipped 2026-08

[AI] 17 tests that drive the real app through a mock microphone and cover:
data integrity (8 tasks × 5 prompts, scenes resolve, 12 metric guides, 4
drill categories with clean targets), scoring calibration (all 40 model
answers score ≥ 10; a filler-heavy answer stays ≤ 8; empty transcript scores
M), drill scoring engine (exact match, wrong-vowel substitution, dropped -ed
endings, digit normalization), drill UI (Stop button scores the attempt),
practice flow (record → auto feedback → report saved, and Back-to-practice
does not duplicate), and ambience API (engine present, quiet-by-default,
idempotent).

**Key files.** [tests.html](tests.html), [js/selftest.js](js/selftest.js).

**Decisions made.** No test framework, no headless browser. The suite is a
plain async IIFE, driven from `tests.html` which injects a `MockSR` and
disables `getUserMedia` before the app scripts load. The suite stashes and
restores the user's real `localStorage` around the run, so it is safe to
open in the same browser the user practices in.

**Open items.** See [PARKING_LOT.md](PARKING_LOT.md) for the "no CI gate"
gap and the 100-vs-20 history-cap discrepancy in [README.md:39](README.md)
vs [js/app.js:36](js/app.js).

**What it unlocks.** Confidence to ship changes without a QA pass, and the
scaffolding to add Writing-module tests in Phase 2 without reinventing the
harness.

---

### Phase 2 — Writing module · ⏳ next

[HU] Both CELPIP writing tasks with rubric-level grading, per
[PROJECT_CONTEXT.md §1](PROJECT_CONTEXT.md) build phases. Second wedge; the
second productive skill where CLB 9→10 bands are lost.

**Not started.** No files touched yet. Content is original-authored per the
existing constraint (see [PROJECT_OS.md Decisions Log](PROJECT_OS.md)).

**Design constraints inherited from Phase 1.**
- Automatic feedback flow (no manual "Analyze" click).
- Local-only, no backend.
- Original prompts, model answers, and rubric guides.
- Extend the regression suite in [tests.html](tests.html) rather than fork
  a second harness.

**What it unlocks.** A complete second skill covering the two productive
CELPIP tasks (Speaking + Writing), which together are where CLB 9→10 bands
are lost. Also unblocks Phase 3 (LLM Speaking upgrade), because Writing
would exercise the same LLM/prompt scaffolding.

---

### Phase 3 — LLM-based Speaking feedback (engine upgrade) · 💡 planned

[HU] Replace or augment [js/analysis.js](js/analysis.js) with an LLM-backed
scorer. Called out separately from Phase 2 by Snow's roadmap call on
2026-08-28 (see [PROJECT_OS.md Decisions Log](PROJECT_OS.md)).

**Boundary to respect.**
[PROJECT_CONTEXT.md §6](PROJECT_CONTEXT.md) locks the free tier as
"simulation and measurement, never AI scoring." An LLM upgrade therefore
either lives behind a paid tier or replaces the heuristic on paid attempts
only.

**Open questions.** Which model, at what price per attempt, run in-browser
via user-supplied key or via a first-party backend. All of these change the
"no backend, no accounts" posture from Phase 1, so this phase implies real
infrastructure work.

---

### Phase 4 — Reading + Listening (table stakes) · 💡 planned

[HU] Explicitly a completeness play, not a differentiation play, per
[PROJECT_CONTEXT.md §1](PROJECT_CONTEXT.md). Exists so a paying user does
not churn to a competitor for the other half of the test.

**Discipline this requires.** Must be built cheaply and must never consume
effort that belongs to Phases 2 and 3. The moment Reading content starts
eating the roadmap, the Speaking-then-Writing wedge is being lost.

---

### Parked — Calibration & score-accuracy evidence · 🅿️ parked

[HU] The Aug 2026 GTM finding (see [GTM_FINDINGS.md](GTM_FINDINGS.md)) was
that every competitor asserts scoring accuracy and none evidences it, and
that "publishing how accurate your own scoring is" is the surviving
positioning. Snow's roadmap call on 2026-08-28 chose Writing next, so
calibration is parked — not dropped. Detail: [PARKING_LOT.md](PARKING_LOT.md).
