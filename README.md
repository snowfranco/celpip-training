# CELPIP Speaking Trainer — Target Level 10+

A Big-Interview-style practice app for the **CELPIP Speaking Test**. Practice all 8 official
tasks under real test timing, record yourself, and get instant AI-style feedback with an
estimated CELPIP level (M–12), an action plan, and Level 10+ model answers.

## Run it

```bash
python3 -m http.server 4173
```

Then open **http://localhost:4173** in **Google Chrome** (or Edge).

> Chrome (or Edge) is **required** for AI feedback: the app evaluates your recording through
> the Web Speech API, which Safari/Firefox don't support. Allow **camera + microphone** when
> prompted (audio-only works too). Like the real CELPIP exam, the flow is fully automatic:
> record → "A.I. Feedback in progress…" → report. There is nothing to type.

## What's inside

- **8 official tasks** with real CELPIP timings (Giving Advice 30s/90s, Personal Experience 30s/60s,
  Describing a Scene 30s/60s, Making Predictions 30s/60s, Comparing & Persuading 60s/60s,
  Difficult Situation 60s/60s, Expressing Opinions 30s/90s, Unusual Situation 30s/60s)
- **40 original practice questions** (5 per task) with **Level 10+ model answers**, pro tips,
  power phrases, and recommended structures
- **Illustrated scenes** for Tasks 3/4 and **unusual-object images** for Task 8
- **Full Mock Test** mode (all 8 tasks in sequence) and **single-task practice**
- **Test Centre Noise** ("Distraction Mode"): a Quiet / Busy Lab / Full Chaos toggle that plays
  call-centre-style ambience during prep and recording — a synthesized crowd of voices (each with
  pitch, melody, and vowel movement, but no real words that could contaminate your transcript)
  in a reverberant room, plus keyboards, coughs, and chairs. Click a level on the task screen for
  a 5-second preview; switch levels live mid-recording; reports get a 🎧 badge when you trained
  under noise. Wear headphones so the noise doesn't reach your microphone.
  *Prefer a real recording?* Drop any royalty-free ambience MP3 into `assets/` named
  `test-centre-noise.mp3` and the app loops that instead (see `assets/README.txt`).
- **Exam-faithful flow**: when the timer ends (or you stop), AI feedback starts automatically
  and the report appears — the report *and your recording* are saved (browser storage, last 20
  recordings kept), so you can replay any attempt later from **My Progress → View report**
- **A.I. Feedback report**: estimated CELPIP level vs your 10+ target, task fulfillment,
  structure & coherence, pace (wpm), um counter, filler words, vocabulary range, transition
  phrases, pauses, length, tone, and volume — each with targets and improvement tips
- **Pronunciation Drills** (Drills tab): read-aloud scoring — you read a target out loud,
  the speech recognizer shows word-by-word exactly what it heard (green = clear,
  yellow = check the ending, red = misheard). Four drill types: **Minimal Pairs**
  (sheep/ship, three/tree…), **Hard Words** (stress, silent letters, -ed/-s endings),
  **Power Phrases** (high-scoring connector sentences), and **Shadowing** (listen to a
  model passage, repeat it). Misheard words feed a personal **trouble-words list** you
  can re-drill until they clear.
- **Action Plan** tab per metric, **Model Answer** comparison with keyword highlighting,
  progress chart and history (stored locally in your browser)

## Notes

- Scores are **heuristic practice estimates**, not official CELPIP scores.
- All analysis runs locally in your browser; recordings never leave your machine.
- Files: `index.html`, `css/app.css`, `js/app.js` (UI + recording), `js/analysis.js`
  (scoring engine), `js/data.js` (question bank & rubric).
