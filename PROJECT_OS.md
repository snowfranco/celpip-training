# PROJECT_OS — CELPIP Speaking Trainer

> The durable-facts file for this repo. Read this first on any fresh session.
> Churning worklist lives in [PARKING_LOT.md](PARKING_LOT.md). Current-state
> phases live in [ROADMAP.md](ROADMAP.md). Agent conventions live in
> [AGENTS.md](AGENTS.md) (symlinked from CLAUDE.md).

**Tag legend.** Every substantive line carries a role tag:
`[HU]` human-owned (provided or confirmed by Snow),
`[AI]` authored by the assistant from the codebase,
`[INFERRED]` a default the assistant chose rather than a deliberate decision.
No `[INFERRED]` entries in this file at bootstrap time; any that appear later
should be resolved into `[HU]` or removed once discussed.

Last updated: 2026-08-28

---

## Purpose

[HU] A Big-Interview-style practice app for the **CELPIP Speaking Test**,
targeting **Level 10+**. Learners practice all 8 official tasks under real
test timing, record themselves, and receive instant heuristic feedback with an
estimated CELPIP level (M-12), an action plan, and Level 10+ model answers.
The wedge is Speaking; Writing and Reading/Listening are planned as later
phases. Full strategy: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).

[HU] Segment: high-stakes deadline-driven test-takers (Express Entry
point-chasers chasing CLB 10, and internationally-trained licensure
candidates). Full segment reasoning: [PROJECT_CONTEXT.md §2](PROJECT_CONTEXT.md).

[HU] Aug 2026 GTM finding: the "AI speaking feedback" wedge is already
occupied; the open ground is **calibration evidence** (publishing scoring
accuracy), delivery-over-template scoring, and Australia. Full analysis:
[GTM_FINDINGS.md](GTM_FINDINGS.md).

---

## Stack

[AI] Pure static browser app, no build step, no backend, no accounts
(`index.html`, `.gitignore`, `.nojekyll`).

[AI] Vanilla JavaScript in per-file IIFEs, all globals hung off `window.*`
(`js/app.js:2`, `js/analysis.js:6`, `js/drills.js:5`, `js/ambience.js:17`,
`js/data.js:2`, `js/drilldata.js:2`). No framework, no bundler, no
`package.json`.

[AI] Web Speech API for transcription (Chrome/Edge only; `js/drills.js:13`
takes `window.SpeechRecognition || window.webkitSpeechRecognition`; README
requires Chrome/Edge).

[AI] Web Audio API for the procedural "walla" test-centre ambience
(`js/ambience.js`).

[AI] Google Fonts for typography (Nunito, `index.html:9`). Only external
dependency at runtime.

[AI] Local dev server: `python3 -m http.server 4173 --bind 127.0.0.1`
(`.claude/launch.json`, `README.md:9-11`). Cached with `?v=10` query strings
on every script/style tag (`index.html:10, 36-41`); bump the version on
release to bust the browser cache.

[AI] Hosting: GitHub Pages, deployed from the default branch (`main`).
Evidence: `.nojekyll` present, remote `snowfranco/celpip-training.git`, no
build config.

[AI] Persistence, two layers:
- **`localStorage`** for small keyed state, four namespaced keys
  (`js/selftest.js:45-46`, `js/app.js:31, 44`, `js/drills.js:17-18`):
  `celpipTrainer.history.v1` (report metadata, last 100, `js/app.js:36`),
  `celpipTrainer.noiseLevel.v1` (test-centre noise setting),
  `celpipTrainer.drillScores.v1` (pronunciation drill scores),
  `celpipTrainer.troubleWords.v1` (auto-collected "words you keep missing").
- **IndexedDB** (`celpipTrainer` DB, `recordings` store) for audio blobs,
  capped at the last 20 recordings (`js/app.js:90-115`). Older reports keep
  their score card but lose playback.

---

## Architecture as it actually is

[AI] Single-page app with a manual view router in [js/app.js](js/app.js).
Six scripts load in strict order in [index.html:36-41](index.html):

```
data.js  →  drilldata.js  →  analysis.js  →  ambience.js  →  drills.js  →  app.js
```

[AI] Each file owns one `window.*` global and one responsibility:

| File | Global | Role |
|---|---|---|
| [js/data.js](js/data.js) | `CELPIP_DATA` | 8 tasks × 5 prompts, illustrated scenes (SVG), rubric with 12 metric guides. Original content authored for this app (`js/data.js:1`). |
| [js/drilldata.js](js/drilldata.js) | `CELPIP_DRILLS` | 4 drill categories: Minimal Pairs, Hard Words, Power Phrases, Shadowing. |
| [js/analysis.js](js/analysis.js) | `CelpipAnalysis` | Heuristic scoring engine: pace, um counter, filler words, connectors, vocabulary range, tone, volume, and a level estimate. |
| [js/ambience.js](js/ambience.js) | `CelpipAmbience` | Procedural walla synth (formant-shaped voices, keyboards, coughs, chairs, reverb). Three levels: `quiet`, `medium`, `high`. Custom override: `assets/test-centre-noise.mp3` if present (`assets/README.txt`). |
| [js/drills.js](js/drills.js) | `CelpipDrills` | Pronunciation drill UI + read-aloud scorer. `CelpipDrills._score` exposed for tests. |
| [js/app.js](js/app.js) | (none) | Main SPA controller. Dashboard, Full Mock Test, Drills, My Progress views. Owns the record → auto feedback → save flow. |

[AI] Two entry HTML files:
- [index.html](index.html) — the product.
- [tests.html](tests.html) — regression harness. Loads a mock
  `SpeechRecognition` and disables `getUserMedia` before the app scripts, so
  17 tests in [js/selftest.js](js/selftest.js) drive the *real* UI
  deterministically with no permission prompts. Tests stash and restore the
  user's real `localStorage` around the run (`js/selftest.js:45-48, 185`).

[AI] No routing library, no state manager, no test framework: the SPA
re-renders on nav click, and the regression suite is a plain async IIFE that
appends a fixed-position panel to the DOM.

---

## Key decisions (from the code)

[HU] **Exam-faithful automatic flow.** After the recording timer ends (or the
user stops), AI feedback and the report appear on their own; there is nothing
to type or click. The report and the recording are saved automatically
(`js/app.js` record flow; enforced by the regression test at
[js/selftest.js:140-153](js/selftest.js)).

[HU] **Original content, no scraping.** All 40 prompts, 40 Level 10+ model
answers, drill items, tips, structures, and scenes are original material
authored for this app (`js/data.js:1`, `js/drilldata.js:1`). Avoids Paragon
IP entanglement.

[HU] **All heuristic, all local, no LLM in the product yet.** Scoring runs in
the browser from transcript text, duration, and volume samples
(`js/analysis.js:1-4`). Nothing leaves the machine. Scores are labeled
"heuristic practice estimates, not official CELPIP scores" (`README.md:64`).

[AI] **Chrome/Edge only.** Web Speech API is a hard dependency for both the
practice feedback loop and the pronunciation drills. Firefox/Safari are
explicitly out of scope (`README.md:15-16`).

[AI] **Vanilla JS + `window.*` globals, no build step.** Every script is
loaded by a `<script>` tag with a `?v=N` cache-buster. Simplest deploy path
for GitHub Pages; also keeps `tests.html` able to substitute mocks before the
app scripts run.

[AI] **Cache-busting via `?v=N` query string.** [index.html:10, 36-41](index.html)
and [tests.html:7, 73-79](tests.html) share one `v=10` marker. Bump on any
JS/CSS release so users pick up the new files.

[AI] **Namespaced, versioned `localStorage` keys.** Every key is
`celpipTrainer.<name>.v1` (see Stack). The `.v1` suffix reserves room for a
future schema migration without wiping user data.

[HU] **Test Centre Noise as a differentiator.** A procedural crowd synth that
speaks *no real words*, so it cannot contaminate the user's speech-to-text
transcript (`js/ambience.js:8-11`). Reports get a 🎧 badge when the user
trained under noise. The custom-audio override (`assets/test-centre-noise.mp3`)
lets the owner drop in a real recording without a code change.

[HU] **Regression suite gates every push.** 17 tests covering data integrity,
scoring calibration, drill scoring, and end-to-end UI flows including the two
bug fixes (drill Stop button; Back-to-practice no longer duplicates the
report). [README.md:60](README.md) mandates running it before every push.

---

## Known constraints

[AI] **Browser only.** No Firefox, no Safari, no mobile app. Chrome or Edge
on macOS, Windows, or ChromeOS.

[AI] **Headphones required for noise practice.** Without them, the ambient
noise reaches the microphone, garbles the transcript, and unfairly lowers the
score. The UI reminds the user (`js/app.js:60`, `js/app.js:55`).

[AI] **No accounts, no cloud sync, no telemetry.** History and drill state
live in the current browser only; a user who wipes site data loses progress.
Multi-device use means starting over on each device.

[AI] **Two-tier storage caps.** Report metadata (score, transcript, prompt,
timestamp) is kept for the last **100 attempts** in `localStorage` under
`celpipTrainer.history.v1` (`js/app.js:36`). Audio recordings are big, so
they live in **IndexedDB** under a separate `celpipTrainer` DB, `recordings`
object store, and are capped at the last **20** (`js/app.js:90-115`). Older
reports keep their score card but lose playback. Any change to persistence
needs to touch both layers.

[HU] **No paid tier, no monetization plumbing yet.** The GTM finding is that
the "AI feedback" positioning is already commoditized and free elsewhere; the
survivable positioning is calibration evidence, which the product does not
yet publish. See [GTM_FINDINGS.md](GTM_FINDINGS.md).

[HU] **`main` deploys immediately.** Pushing to `main` is publishing to
production (GitHub Pages default-branch deploy). There is no staging URL and
no CI gate: the human is expected to open `tests.html` locally and see all
17 green before pushing.

---

## Decisions Log (newest first)

Format: ADR-lite. Each entry records what *forced* the choice, not just the
choice. Old entries stay marked SUPERSEDED rather than being deleted.

### [2026-08-28] [HU] Roadmap: Writing next, then LLM-based Speaking feedback

Context: PROJECT_CONTEXT.md phased Writing as Phase 2 and Reading/Listening
as Phase 3, deferring any LLM decision. The Aug 2026 GTM findings confirmed
the AI-speaking-feedback wedge is already commoditized (five competitors,
two free) but did not settle whether calibration or Writing goes first.
Snow's call: Writing next (Phase 2), then upgrade Speaking scoring to an LLM
(Phase 3), then table-stakes Reading/Listening (Phase 4). Calibration
evidence stays on the parking lot as a strategic option, promotable if Phase
2 slips or if a partner surfaces a real-band dataset.

Decision: Roadmap reordered to `Speaking heuristic → Writing → LLM Speaking
→ Reading/Listening`.

Consequence: Writing must ship before the engine upgrade, which delays the
GTM-recommended calibration move; the parking lot flags this so the choice
does not get lost. Writing content will be original-authored, same
constraint as Speaking (avoids Paragon IP overlap).

### [2026-08-24] [HU] Test Centre Noise ships as a first-class feature

Context: The emotional centerpiece is "I have already done this. This is
just the fifth time." (PROJECT_CONTEXT.md §3). Environmental fidelity is
part of that; a silent practice room is not what the real exam sounds like.
Off-the-shelf ambience recordings risk their voices leaking recognizable
words into the user's speech-to-text transcript and contaminating scores.

Decision: Ship a procedural formant-synth "walla" engine
([js/ambience.js](js/ambience.js)) that speaks no real words, with three
levels (`quiet`, `medium`, `high`) and a five-second preview on the task
intro. Provide an `assets/test-centre-noise.mp3` override for owners who
want to drop in a licensed real recording.

Consequence: One more subsystem to maintain, but the transcript is protected
by construction and the differentiator is real. Reports carry a 🎧 badge so
noise-trained attempts are visibly distinct from quiet ones.

### [2026-08-24] [HU] Automatic feedback flow, no manual input step

Context: Big-Interview-style products historically require the user to type
notes or hit "Analyze" after a recording. That breaks the simulation of a
real exam, where the timer runs, you stop talking, and the machine moves on.

Decision: When the recording timer ends (or the user presses Stop), AI
feedback starts automatically and the report is saved. The regression suite
[js/selftest.js:140-153](js/selftest.js) locks this in and asserts a "Back
to practice → no duplicate report" invariant.

Consequence: Any future step added to the record flow that requires a click
before scoring breaks the exam-faithful promise and the regression test. If
a manual step is genuinely needed, it goes *after* the auto-generated report,
not before it.

### [2026-08-24] [HU] Original-authored content, no third-party bank scraping

Context: Paragon (the test maker) is the incumbent and owns the real rubric
and score data. Scraped or repackaged questions carry IP risk and would not
survive a Paragon takedown.

Decision: All 40 prompts, model answers, drill items, scenes, and rubric
guides are original material written for this app (`js/data.js:1`,
`js/drilldata.js:1`).

Consequence: Content is a real ongoing cost. Any future Writing or
Reading/Listening phase inherits the same constraint.

### [2026-08-24] [HU] Vanilla JS on `window.*` globals, no framework, no build

Context: Static GitHub Pages hosting, single-solo-developer velocity, and
the regression harness's need to substitute mocks (`MockSR`, disabled
`getUserMedia`) *before* app code runs.

Decision: Six scripts in strict load order, each an IIFE exposing exactly
one `window.*` global. No React, no bundler, no `package.json`.
[tests.html](tests.html) can therefore inject mocks in a plain inline
`<script>` before the app loads.

Consequence: File sizes grow unchecked (`js/app.js` is already 1036 lines).
The moment a real router, a component tree, or a component-scoped test
runner is needed, this decision must be revisited. Until then it is winning.
