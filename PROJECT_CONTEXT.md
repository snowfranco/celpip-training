# CELPIP Trainer — Project Context

> Working strategy doc. Everything here is a **belief to be pressure-tested**, not a settled fact.
> Items marked **[VERIFY]** are assumptions with money riding on them — check before building on top.
> Items marked **[OPEN]** are gaps I could not fill from what you told me.

Last updated: 2026-08-24

---

## 1. The product

An all-in CELPIP training app, entered through a **Speaking wedge**.

The long-term shape is a complete CELPIP prep destination — Speaking, Writing, Reading, Listening —
so a user never has to leave for the other three. But the thing that makes it *worth choosing* is
Speaking, and that is what gets built, polished, and sold first.

**Why Speaking is the wedge:** it is the only skill a learner genuinely cannot self-assess. Reading
and Listening have answer keys — a PDF can do that job, which is why every incumbent is adequate at
them. Writing needs a grader. Speaking needs a grader *and* a recording environment *and* real test
timing, and almost nobody does that well for a self-study price. The wedge is not "we do Speaking
too" — it is "we are the place you go when Speaking is what's costing you the band."

### Build phases

| Phase | Scope | Role |
|---|---|---|
| **1 — now** | Speaking, deep. 8 tasks, real timing, recording, feedback, drills, progress. | The differentiator. The reason to pay. |
| **2** | Writing. Both CELPIP writing tasks with rubric-level grading. | The second productive skill; second place bands are lost. |
| **3** | Reading + Listening. | **Table stakes, deliberately undifferentiated.** Exists so the product is a complete destination and users don't churn to a competitor for the other half. Positioned as coverage, never as the selling point. |

**The discipline this requires:** Phase 3 is a retention and completeness play, not a differentiation
play. It must be built cheaply and must never consume the effort that belongs to Speaking and
Writing. The moment Reading content starts eating the roadmap, the wedge is being lost.

### What exists today (2026-08-24)

Speaking only. Static browser app, no backend, no accounts. 8 tasks with official timings, 40
practice questions with Level 10+ model answers, illustrated scenes for Tasks 3/4 and 8, full mock
test mode, test-centre noise simulation, pronunciation drills, local progress history. Feedback is
**Web Speech API + heuristics** — pace, fillers, keyword coverage, transitions, pauses, volume. There
is no LLM in the product yet.

---

## 2. Segment

> Stated as belief. This is the load-bearing assumption; everything downstream rests on it.

Two segments, both **high-stakes, deadline-driven, and already-motivated**. Neither is a casual
learner. Both are people for whom a language band is a gate on their life, not a credential.

### Primary — Express Entry point-chasers

Skilled immigrants, typically already in Canada on a work permit or already employed, who need
**CLB 10** because it is the top bracket in the CRS first-official-language table and the difference
between CLB 9 and CLB 10 is the points gap that decides whether their draw comes. **[VERIFY: current
IRCC CRS language point tables — this is the entire economic rationale for the segment and it should
be confirmed against IRCC directly, not from memory.]**

- **Sophistication:** high. Professionals with good functional English. They are not learning English —
  they are learning to *perform* English under a rubric and a clock. They already know their CRS score
  to the point.
- **They have usually taken the test at least once.** They know which skill sank them.
- **Willingness to pay:** high, and rational. The ROI is permanent residency. A $40 pass against a
  PR application is not a purchase decision, it is a rounding error.
- **Why they'd choose this over the mainstream alternative:** the mainstream alternative is a question
  bank plus answer keys plus a forum. It tells them *what* the test asks. It cannot tell them why
  their Speaking answer scores 9 instead of 10. That last band is exactly the thing they're buying,
  and it's exactly the thing nobody sells them.

### Secondary — Licensure candidates

Internationally-trained nurses, engineers, pharmacists, and similar, who need a specific band for a
professional college or regulator.

- **Sophistication:** high in their domain, variable in test strategy.
- **Willingness to pay:** high — often with an employer, settlement agency, or bridging-program budget
  behind them, and a hard deadline set by someone else.
- **[VERIFY]** Which regulators accept CELPIP (vs IELTS-only), and what band each requires per skill.
  This determines whether the secondary segment is one segment or five, and whether the product needs
  per-skill band targets rather than a single "CLB 10" goal.

### What both share (and why they're one product, not two)

Both are **repeat or near-repeat test-takers with a numeric target, a deadline, and a specific weak
skill.** That shared shape is what makes one product serve both: *"you know your number, you know
which skill is costing you it, and you have weeks not years."*

### What this rules out

Not for first-time general newcomers browsing prep options, not for students improving English
broadly, not for anyone without a specific band target. Those are bigger markets with less urgency
and more incumbents — chasing them dilutes everything above.

### How to pressure-test it

The belief fails if research shows point-chasers overwhelmingly self-prep with free YouTube and never
buy, or that licensure candidates are locked to IELTS in practice. Either finding reshapes the
segment before anything else gets built.

---

## 3. Emotional centerpiece

**The feeling: "I have already done this. This is just the fifth time."**

Not confidence in the motivational sense — *familiarity*. The specific relief of walking into a test
centre and finding nothing new there. The clock is the clock you've heard. The room noise is noise
you've trained through. The 30 seconds of prep feels like 30 seconds, not like a void.

### The mechanism that produces it

Four parts, in order of how much they contribute:

1. **Exam-faithful automation.** The flow runs itself — record, feedback starts on its own, report
   appears. Nothing to type, no button that doesn't exist in the real exam. Every manual step the
   product adds is a step that breaks the simulation, which is why the flow was built this way.
2. **Environmental fidelity.** Real per-task timings, test-centre ambience, mic-and-headset ritual.
   The body learns the room, not just the answer.
3. **The feedback loop closing fast.** Speak → see the gap → speak again. The improvement is felt,
   not asserted. This is what separates it from a question bank, which can only ever tell you what
   to expect, never how you did.
4. **A visible target.** Every report scores against CLB 10 specifically, not against "good." The
   user always knows the size of the remaining gap.

**The counterfeit to avoid:** motivational praise. If the app tells people they're doing great, the
feeling it produces is comfort, and comfort in a prep product is a lie that gets found out on test
day. The feeling is earned readiness, and it must be earned.

---

## 4. AI feedback: hybrid

**Free tier — local heuristics.** Web Speech API in the browser. Instant, zero marginal cost, no
backend, and recordings never leave the device. It measures: pace, fillers, ums, pauses, transitions,
vocabulary range, length, volume, keyword coverage against the model answer.

**Paid tier — LLM grading.** Transcript graded against the CELPIP rubric by a real model. Judges what
heuristics structurally cannot: task fulfillment, argument quality, coherence, idiomatic range,
register. This is also what makes Phase 2 (Writing) possible at all — Writing has no heuristic
shortcut.

**The line between them, stated plainly:** the free tier **measures**, the paid tier **judges**. A
word counter cannot tell you your argument was thin. That distinction is a positioning boundary
(§6), not just an engineering detail.

### Unit economics — the open risk

This is the sharpest tension in the plan and it is unresolved:

- Hybrid needs a **backend** (key custody, paywall enforcement) — the app currently has none. That is
  real build work and a real hosting cost against a near-zero budget.
- A **flat exam-window pass** buys unlimited grading for 30–60 days. The heaviest users are the
  motivated ones — exactly the ones who bought. Cost scales with engagement while revenue doesn't.
- **Needs a cap or a credit model before launch. → GTM research item R1 (§9).** The strategist is
  briefed to price this, not just flag it. Starting hypothesis to react to: the pass includes a
  generous but finite number of LLM-graded attempts (e.g. 60), with unlimited free-tier practice on
  top, so the simulation is never rationed even when judgment is.
- **The pass price is downstream of this, not independent of it.** Cost per graded attempt sets the
  floor; what the segment will actually pay sets the ceiling. If those two don't leave a gap, the
  hybrid model doesn't work at any price and the tiering has to change.

---

## 5. Business model and constraints

- **Solo operator, near-zero budget.** No ad spend, no team, no contractors, no human graders.
  Anything that requires manual labour per user is out, permanently.
- **One-time purchase — exam-window pass.** A 30–60 day pass matched to how people actually prep:
  intensely, briefly, then they pass and leave. No subscription, because CELPIP prep is structurally
  episodic and a subscription would just be a churn machine with extra steps.
- **The consequence:** LTV is capped and there is no recurring revenue. **Constant new-user flow is
  survival, not growth.** Every strategic decision has to be read through that.
- **Channels obviously available today:** SEO (long-tail: task-specific, band-specific, "CELPIP
  speaking task 5"), YouTube/TikTok, Reddit and Facebook newcomer and PR-applicant communities, word
  of mouth inside tight immigrant networks.
- **No channel is ruled out.** Near-zero budget is a *current constraint on what can be spent*, not a
  standing veto on a channel. Paid acquisition, partnerships (settlement agencies, bridging programs,
  regulators, immigration consultants, employers), affiliates, and direct outreach all stay on the
  table for the GTM strategist to explore and cost. A channel gets ruled out only when the analysis
  shows it can't work — never by assumption. Where a channel needs budget, the strategist should say
  what the smallest real test costs and what it would have to return; a channel that pays for itself
  out of pass revenue is not blocked by a zero starting budget.
- **The one hard filter:** solo operator hours. A channel that requires ongoing manual labour per
  user or per partner has to justify that cost explicitly, because there is no one to do it.
- **Distribution asset worth noting:** the free tier is not a loss leader, it is a distribution
  strategy in itself. It has to be good enough to be recommended by name in a Facebook group.

---

## 6. Honest boundaries

Claims the GTM must **never** make. These are hard limits on positioning, not soft preferences.

1. **Not official, not affiliated.** No relationship with Paragon Testing Enterprises or CELPIP. All
   scores are practice estimates, not official band scores, and **no correlation study backs them**.
   This is a trademark-safety requirement as much as an honesty one — **[VERIFY]** permissible
   nominative use of the CELPIP mark before any marketing copy ships.
2. **No score guarantee.** Never promise CLB 10, any band, PR approval, or licensure. The product
   supplies practice and feedback; the outcome depends on the user's work and the real examiner.
3. **Browser and hardware dependent.** Requires Chrome or Edge, a working mic, and granted mic
   permission. Speech recognition accuracy varies with accent and background noise — which is
   uncomfortable, because **accented speakers are the entire market**. Never sell transcription
   accuracy as a feature; treat recognition errors as a known failure mode and surface them honestly
   (as the drills already do, showing word-by-word what was heard).
4. **The free tier measures, it does not judge.** Local heuristics count pace, fillers, and keywords.
   They cannot evaluate argument quality or idiomatic range. **The free tier must never be marketed
   as "AI scoring."** Only the paid LLM tier does rubric-level judgment.

**Positioning that survives all four:** *"Practice CELPIP Speaking under real conditions, and get
told specifically what's costing you the band."* No official claim, no guarantee, no overstatement of
what the free tier does.

> **Hard constraint on any GTM pitch.** The most obvious move in this category — *"free AI CELPIP
> scoring"* — is ruled out by boundary 4. The free tier is a **simulation and measurement** offer;
> only the paid tier may be described as judgment or scoring. Any launch plan built on free AI
> scoring is unusable, no matter how well it would work.

---

## 7. Kill criterion

> Written before research, deliberately. If research meets this condition, surface it in the first
> third of the session.

**Nobody pays.** If engaged free users don't convert to the exam-window pass at a viable rate, the
one-time-purchase model as designed is dead.

The criterion exists in **two forms**, because the launch form cannot fire during desk research and
the research form cannot wait for launch.

### Form A — post-launch gate (set 2026-08-24)

- **"Engaged" free user** = has completed **≥3 recorded speaking attempts**.
- **Conversion floor** = **below 4%** of engaged free users buy the pass, measured over the
  **first 200 engaged users**.

Below 4% at n=200, the one-time-purchase model is dead as designed.

**Instrumentation dependency:** measuring this requires attempt counts and purchases per user. The
app stores progress locally with no accounts and no analytics, so **today this is unmeasurable.**
Whatever backend carries the paywall must carry this counter too — same piece of work, and it should
not ship without it.

### Form B — research-stage proxy (fires during the GTM session)

Form A cannot trigger from a desk. Its research-stage equivalent:

> **If research shows this population does not pay for CELPIP prep at all** — self-preps on free
> YouTube, Facebook groups, and the official free samples, and demonstrably converts on nothing —
> that is "nobody pays" arriving early. Say so plainly and stop.

This is checkable on day zero, which is why it goes first. Treat a *weak* payment signal (they pay,
but for tutors rather than software; or only for official Paragon material) as a **reshape trigger**
rather than a kill — and say which shape it implies.

### What a kill actually kills

The pass model, not necessarily the product. If Form A or B fires, the honest next question is
whether a **different layer** monetizes — a different tier structure, a different buyer (agencies,
consultants, employers, schools paying on the learner's behalf), or a conclusion that there is no
direct revenue here and the value is something else. **No fallback has been identified yet; that is
a gap, not a verdict.** If the research surfaces one, that is a finding worth more than the original
plan.

### Secondary signals worth watching (not kill criteria, but reshape triggers)

- **Trust failure.** Users who used the app and then sat the real exam report that the estimated level
  didn't track their actual band. This doesn't kill the business but it kills the *promise* — collect
  real scores from the first ~30 users who test, and treat a mismatch as an emergency.
- **Discovery failure.** Organic channels don't produce a repeatable trickle. With a one-time pass,
  this is slow death rather than sudden death, which makes it easier to ignore for too long.

---

## 8. Open questions and next actions

| # | Item | Owner | Why it matters |
|---|---|---|---|
| 1 | **[VERIFY]** Current IRCC CRS language point tables — confirm CLB 10 is the top bracket and quantify the CLB 9→10 gap | GTM | The entire economic rationale for the primary segment |
| 2 | **[VERIFY]** Which professional regulators accept CELPIP, and required bands per skill | GTM | Determines if the secondary segment is one segment or five |
| 3 | **[VERIFY]** Nominative use rules for the CELPIP trademark | GTM | Gates all marketing copy |
| 4 | ~~Kill-criterion numbers~~ — **set 2026-08-24** (≥3 attempts; <4% at n=200), plus research-stage proxy | — | Closed |
| 5 | **[OPEN]** LLM cost per graded attempt and credit structure | GTM → R1 | Unit economics are currently unbounded |
| 6 | **[OPEN]** Backend decision — cheapest thing that enforces a paywall, holds an API key, **and counts attempts per user** | Build | Blocks the paid tier *and* makes the kill criterion unmeasurable until it exists |
| 7 | **[OPEN]** What point-chasers use today, and whether they pay | GTM → **Part 2 steps 1–4** | Directly tests the segment belief |
| 8 | **[OPEN]** Full channel exploration, including paid and partnership | GTM → R2, feeding step 6 | No channel is ruled out by assumption (§5) |

---

## 9. Supplementary research items

Two items that the numbered steps in Part 2 do **not** already cover. Segment size, where the users
gather, the competitive scan, and willingness-to-pay are all owned by Part 2 steps 1–4 — do not
duplicate them here.

### R1 — Cost side of the unit economics (input to step 4)

Step 4 owns *price*. R1 owns *cost*, which sets the floor step 4 has to clear.

- Realistic **cost per graded speaking attempt**, and per graded writing task (Phase 2) — from actual
  current model pricing and realistic transcript lengths, not a guess.
- **Expected attempts per paying user over a pass window, modelling the heavy tail, not the average.**
  A point-chaser with three weeks and a PR application riding on it is not a light user, and the
  heaviest users are by definition the ones who paid.
- A recommended structure: hard credit cap, soft cap with top-ups, tiered passes, or something else.
  One constraint not to violate: **free-tier practice stays unlimited.** The simulation is the
  product; rationing it breaks the emotional centerpiece (§3). Ration judgment, never practice.
- **If the cost floor and step 4's price ceiling don't leave a workable gap, say so plainly.** That
  reshapes the tiering before anything gets built, and it is a more valuable finding than a price.

### R2 — Channel exploration (input to step 6)

Step 6 *selects* the two or three moves. R2 is the candidate set it selects from — so run R2 first
and let step 6 cut it down, rather than doing channel thinking twice.

- Every plausible channel: organic (SEO, YouTube, TikTok, Reddit, Facebook groups, word of mouth),
  paid (search, social, community sponsorships), and partnership (settlement agencies, bridging
  programs, immigration consultants, employers of internationally-trained professionals, regulators,
  ESL schools, affiliates).
- For each: reachable volume, likely cost, time-to-first-user, and **solo-operator hours per week to
  sustain it.** That last column is the real filter here, not budget.
- For paid and partnership channels: **the smallest real test, what it costs, and what it must return
  to justify continuing.** A zero starting budget does not block a channel that pays for itself out
  of pass revenue; it blocks a channel needing money upfront with no read on return. Say which kind
  each one is. Do not drop a channel for costing money — drop it for not returning.
- Rank on **repeatable trickle vs one-off spike.** A one-time pass makes constant new-user flow
  survival rather than growth, so a spike channel is worth far less here than it would be for a
  subscription product.

---

## 10. Moat candidates (input to step 5)

Read before assessing copyability, so the assessment aims at the real candidates.

**Start from the honest baseline:** today the product is a static web app — a question bank, timing
logic, and heuristic scoring. A competent developer rebuilds the current build in a fortnight. There
is **no difficulty moat** and pretending otherwise wastes the analysis.

The three candidates actually worth testing:

1. **Breadth and maintenance.** Four skills, a large calibrated question bank with model answers,
   drills, scenes, and timing fidelity — kept correct as the test format changes. Not hard, but
   tedious and ongoing. Classic breadth moat: cheap to start, expensive to sustain.
2. **Calibration data — the only one that compounds.** Real users reporting their real exam bands
   against the app's estimate. That corpus makes the scoring measurably accurate over time, and a
   copier cannot clone it because it accrues only from having had users first. It is also the direct
   answer to the trust-failure signal in §7. **If any moat exists, it is probably this one** — which
   makes "collect real scores from users who test" a strategic act, not a QA chore.
3. **Position.** Being the named default for CELPIP speaking practice inside immigrant communities.
   Real but fragile, and worth nothing without 1 or 2 underneath.

**The absorption question:** Paragon Testing owns the test, the rubric, and the actual score data. If
they ship AI speaking feedback in their own prep, most of this is obviated in one release. Assess
what resists that — and note that boundary 1 (§6) means this product can never compete on
officialness, only on practice environment and feedback speed.

---

## 11. Settled vs. up for grabs

Part 3 says *assume I can change the product*. This is what that permission actually covers.

### Settled — treat as given

- The **two segments** (§2) as the people being served. Their *size and reachability* are open to
  research; the choice to serve them is not.
- The **emotional centerpiece** (§3) — earned familiarity, produced by exam-faithful simulation. This
  is what the pitch anchors on.
- The **four honest boundaries** (§6). Non-negotiable, including the free-AI-scoring prohibition.
- **Solo operator.** No headcount, no human graders, no per-user manual labour.
- **Speaking is the wedge.** Phase order can be argued; abandoning Speaking as the differentiator
  would be a different product.

### Up for grabs — challenge these if the research demands it

- **The one-time exam-window pass.** If step 4 finds a better shape, say so. §7 explicitly allows the
  monetized layer to change.
- **Price, tiering, and the free/paid line** — as long as boundary 4 holds.
- **The hybrid free-heuristics / paid-LLM split.** If generic LLMs obviate the paid tier, or if the
  free tier can't carry distribution, the split should change.
- **Phase order.** If Writing is the sharper wedge, or Reading/Listening are load-bearing for
  retention sooner than assumed, argue it.
- **Who the buyer is.** The learner is assumed. Agencies, consultants, employers, and schools paying
  on the learner's behalf are unexplored and may be better.
- **Whether the shape is right at all.** If what reaches these people is a different product, say
  that rather than routing around it.


# GTM Strategist Brief — Parts 2 & 3

> Prefaced by `PROJECT_CONTEXT.md`. Read that first; it is the source of truth for segment, product,
> boundaries, kill criterion, and what is settled vs. open.

---

## Part 2: What I need, in order

Run these in sequence. If step 0 or 1 fails, stop and tell me before building anything on top of a
dead premise.

**0. Kill-criterion check.** Restate my kill criterion in your own words — both forms. Form A is the
post-launch gate (below 4% of engaged free users buying the pass, at n=200) and **cannot fire from a
desk**; note it and set it aside. Form B is the one live this session: **if research shows this
population does not pay for CELPIP prep at all — self-preps free and converts on nothing — that is
"nobody pays" arriving early. Say so plainly and stop.** A weak payment signal (they pay, but for
tutors rather than software, or only for official material) is a reshape trigger, not a kill — say
which reshape it implies. Watch for Form B throughout, not just at the start.

**1. Segment pressure-test, first.** Is the reachable, monetizable population of these two exact
people large enough to matter? Search for real present-day size and location: Express Entry
candidates retaking for CLB 10, and internationally-trained professionals needing a CELPIP band for
licensure. Verify the premise underneath the primary segment — that CLB 10 is the top CRS language
bracket and the CLB 9→10 gap is worth real points — since the whole segment rationale rests on it. If
the population is too small, say so in the first third, because that changes the shape of everything
after.

**2. Find the users, where they gather now.** The literal present-day places this segment congregates
and can be reached. For this market that means Facebook groups, WhatsApp and Telegram groups, Reddit
(r/ImmigrationCanada, r/canadaexpressentry and similar), YouTube comment sections, newcomer and
settlement-agency networks, licensure and bridging-program cohorts, and immigration-consultant
audiences — search each rather than assuming. Treat every population number and every "they hang out
at X" as a claim to verify or label as an assumption. Flag the reachability catch where a large pool
carries anti-promotion norms or closed doors; reach and size are different things, and immigrant
community groups are often both huge and tightly moderated.

**3. Find the space, and run the obviation check.** What occupies this position today. Then the
pivotal question, in the two forms it takes here — search current offerings directly and assume your
training data is stale:

- **Does Paragon Testing (the test maker) already ship AI speaking feedback in its own prep?** They
  own the test, the rubric, and the real score data. If the core promise is already in their box, or
  is one release away, say so.
- **Do generic LLMs already obviate this?** A user can paste a transcript into ChatGPT or Claude and
  ask for CELPIP feedback, free, today. State plainly whether that is good enough. The claimed
  defense is the simulation — real timing, recording, test-centre noise, drills — not the judgment.
  Test that claim rather than accepting it.

Also: does anyone already offer AI speaking feedback specifically for CELPIP, at what quality and
price? Deliver a one-sentence defensible position, plus the two or three positions I should refuse
because they sit on an incumbent's home turf.

**4. Business-model honesty.** Is direct monetization real? Search what comparable prep products
actually charge and what their conversion reality looks like. Name the willingness-to-pay evidence
you rely on and rate it **strong, moderate, or weak**. Anchor the price question on what these
segments already spend on the test itself, tutors, and consultants — a PR applicant's reference price
is set by what they have already paid IRCC, not by what an app usually costs. Read R1 in the preface
for the cost floor; your job is the ceiling and whether a workable gap exists between them. If the
honest answer is "monetize a different layer," "the buyer is an agency or employer rather than the
learner," or "there is no direct revenue and the value is X," say that — the preface explicitly
allows the monetized layer to change.

**5. Moat durability and copyability.** How cheaply is the core rebuilt once the idea is named and
revealed. Read §10 of the preface first — it names the honest baseline (no difficulty moat; the
current build is a fortnight's work for a competent developer) and the three candidates worth
testing: breadth-and-maintenance, **calibration data from real users reporting real exam bands**, and
position. Tell me which of these I actually have and which is worth investing in. Assess whether
Paragon could absorb the differentiator in a single release, and what resists that.

**6. The GTM.** Given 0 through 5: the two or three moves that reach the most of the right people for
the **best return per dollar and per solo-operator hour** — not simply the least spend. A paid or
partnership channel that returns more than it costs is not disqualified by a zero starting budget;
say what the smallest real test costs and what it must return. Select from the candidate set in R2 of
the preface rather than regenerating it. Each move gets its artifact (a writeup, a demo, a launch
surface) and one leads. Anchor the pitch on the emotional centerpiece: **earned familiarity — "I have
already done this."** Rank moves on whether they produce a repeatable trickle or a one-off spike,
because a one-time pass makes constant new-user flow survival rather than growth. Respect the hard
constraint in §6 of the preface: the free tier may be pitched as simulation and measurement, never as
AI scoring. Name what you cut and why. State the first honest metric of traction — rarely a vanity
count.

---

## Part 3: How to work this session

- **Segment test before anything.** Confront a too-small or unreachable segment at the top, so the
  rest of the strategy is built on ground that holds.
- **Search current facts and label evidence against inference.** This space moves faster than your
  training data. Verify before asserting. Mark what is searched-and-confirmed, what is inferred, and
  what stays unverified. Wrong facts are worse than missing ones here, because I will act on this.
- **Cheapest-to-disprove first.** Run the legs in order of how cheaply each can be falsified.
  Viability and demand are checkable early and come before feasibility. Avoid the failure where a
  month of feasibility work compounds on a viability leg that one search would have killed on day
  zero.
- **Say when the shape is wrong.** If the honest answer is that the thing which reaches people is a
  different product, say it rather than routing around it. Assume I can change the product if the
  strategy demands it — see §11 of the preface for what is settled and what is genuinely open.
- **Decision-grade and tight.** Answer first. Give verdicts and skip the survey of every option that
  exists. Two or three moves that matter, with the reason the rest were cut. A small true GTM beats a
  large invented one, so hold the line against comfortable fiction.
- **One adversarial pass before you finish.** Re-read your own conclusion with an explicit kill
  mandate and name the strongest case against it.

**Output shape:** lead with the answer; label evidence against inference throughout; positioning as
one defensible sentence plus the positions to refuse; GTM as a short ordered list of moves with the
cuts named and a first metric of traction.

