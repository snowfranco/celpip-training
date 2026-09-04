# PARKING_LOT — CELPIP Speaking Trainer

> Deferred features, known bugs, and ideas. Churning worklist. Durable facts
> and decisions live in [PROJECT_OS.md](PROJECT_OS.md); active phases live in
> [ROADMAP.md](ROADMAP.md).

Last updated: 2026-08-28

---

## Strategic parking (promotable to a phase)

### Calibration & score-accuracy evidence
[HU] From [GTM_FINDINGS.md](GTM_FINDINGS.md): every CELPIP prep competitor
asserts scoring accuracy and none evidences it; the survivable positioning
is publishing how accurate our own scoring is. Parked (not dropped) because
Snow's roadmap call on 2026-08-28 put Writing next. Promote to `⏳ next` if
Phase 2 slips, or if a partner surfaces a real-band dataset we can calibrate
against.

- Needs: a mechanism to collect real users' post-exam CELPIP band results and
  compare to our heuristic estimates for the same attempts. Implies accounts
  or at least an anonymous opt-in reporting flow — neither exists today.
- Blocked by: "no backend, no accounts" posture (see
  [PROJECT_OS.md Known constraints](PROJECT_OS.md)).

### Australia positioning
[HU] From [GTM_FINDINGS.md](GTM_FINDINGS.md): Australia is called out as
open ground alongside calibration and delivery-over-template scoring. No
concrete tasks yet; a research spike lives here until it earns a phase.

### Delivery-over-template scoring
[HU] From [GTM_FINDINGS.md](GTM_FINDINGS.md): third piece of open ground.
The current heuristic scorer rewards template phrases (connectors, opening
markers, closing markers — see [js/analysis.js:17-58](js/analysis.js)),
which is fine for Level 10+ *templates* but does not distinguish a
well-delivered answer from a well-templated one. A future scoring pass
should credit natural delivery: rhythm variety, prosody, emphasis, not just
whether "as a result" appears.

---

## Bugs & inconsistencies to resolve

### No CI gate on the regression suite
[AI] [tests.html](tests.html) requires opening a browser to run the 17
regression tests. There is no headless/CI runner, so nothing enforces "green
before push" other than the human. If the workflow shifts to a bot or
another contributor, a headless runner (Playwright / Puppeteer / Deno) or a
GitHub Action becomes necessary.

### `main` deploys immediately to production
[AI] Pushing to `main` publishes to GitHub Pages with no staging URL and no
CI gate. Related to the item above. A `staging` branch + Pages preview, or
`main` = staging with `release` = production, would close this gap without
adding a backend.

---

## Feature ideas (unsorted)

### Custom test-centre audio
[AI] Already supported via [assets/README.txt](assets/README.txt): drop a
royalty-free `test-centre-noise.mp3` into `assets/` and the Busy Lab / Full
Chaos levels loop it instead of the synthesizer. Currently undocumented in
the app UI itself. Consider surfacing this in the noise panel (e.g. "Using
custom audio" indicator) once a real file exists.

### Progress export / import
[AI] All state is in `localStorage`. A user who wipes site data or switches
browsers loses everything. A JSON export/import button would be small and
would unlock cross-device continuity without a backend. Would also help
Phase-3 planning by giving a shape for what "sync" would eventually carry.

### Live noise switching hint
[AI] Noise level can already be changed mid-recording ([js/app.js](js/app.js)
`ambience().setLevel(...)`). Consider surfacing a small "Switched to Busy
Lab" toast so the change is discoverable, otherwise learners may not know
the control is live rather than gated to the intro screen.

---

## Notes for future backfills

- No `TODO` / `FIXME` / `HACK` / `XXX` markers exist in the codebase as of
  2026-08-28 (verified via `grep -rn -E 'TODO|FIXME|HACK|XXX'`). If any
  appear, prefer moving them here rather than leaving them in code.
- Strategy docs at repo root ([PROJECT_CONTEXT.md](PROJECT_CONTEXT.md),
  [GTM_BRIEF.md](GTM_BRIEF.md), [GTM_FINDINGS.md](GTM_FINDINGS.md)) are the
  long-form background for anything on this list. This file is intentionally
  brief; pull rationale from those when promoting an item to a phase.
