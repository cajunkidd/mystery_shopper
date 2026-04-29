# Stine Mystery Shop & Caller Performance Platform — Feature Tutorial

> Companion to `STINE_MYSTERY_SHOP_APP_SPEC.md`. This walks through the application's capabilities by user journey, phase by phase, and ends with explicit attribution of which features were inspired by which competitor.

---

## How to use this tutorial

The platform is built in four sequenced phases. Each section below shows you what you can do in that phase and how to do it. If a feature you're looking for isn't here, check which phase it lives in — Phase 3 (gamification) and Phase 4 (AI/analytics) only light up after the earlier phases are in production.

You'll get the most out of this tutorial if you read the section that matches your role first:

- **Employee** → §1 (roles), Phase 1 §"Employee view", Phase 2 §"Listening to your caller review", Phase 3 §"Personal best & badges"
- **Store Manager** → all of Phase 1 and Phase 2, plus Phase 3 §"Manager bonus & leagues"
- **District / Regional Manager** → Phase 1 §"Reviewing & escalations", Phase 4 §"Roll-up dashboards"
- **Admin (IT / HR)** → Phase 1 §"Building a rubric", §"Permissions", Phase 3 §"Configuring gamification", Phase 4 §"Imports & integrations"

---

## 1. Roles at a glance

The app has four roles. What you see on every screen is filtered by your role.

| Role | What this role is for |
|---|---|
| **Employee** | Frontline associate being evaluated. Sees only their own results, action plans, and badges. Can file appeals. |
| **Store Manager** | Owns a single location. Reviews shops for their store, writes coaching notes, assigns action plans, resolves appeals, awards manager bonus points. |
| **District / Regional Manager** | Roll-up across multiple stores. Receives escalated appeals, sees heat-maps across their district. |
| **Admin (Kyle / IT / HR)** | Full system access. Authors rubrics, manages users and locations, configures gamification, views audit logs, runs company-wide reports. |

**A note on tone:** the entire UI is intentionally developmental, not punitive. You'll see the word "action plan" instead of "deficiency," "coaching note" instead of "infraction," and public displays only ever show top performers and most-improved — never bottom-of-pack rankings. This is a deliberate design choice (see the attribution table for why).

---

## 2. Phase 1 — Core scorecard & coaching loop

This is the MVP and the foundation everything else builds on. End-to-end, it lets a mystery shop be entered, routed to a manager, reviewed, turned into an action plan, acknowledged by the employee, optionally appealed, and resolved.

### 2.1 Building a rubric (Admin)

Rubrics are the scoring templates used to grade each shop. There's a different rubric per shop type — in-store visit, mystery call, web inquiry, social inquiry — and rubrics are versioned so historical shops always render correctly even after the rubric changes.

**To build one:**

1. Go to **Admin → Rubrics → New Rubric**.
2. Pick a name (e.g. "In-Store Visit v3"), a `type`, and start in `draft` status.
3. Add **sections** by drag-and-drop (e.g. Greeting, Product Knowledge, Close). Each section has a weight and max score; section totals roll up to the rubric total automatically.
4. Inside each section, add **questions**. For each one, choose a question type:
   - `yes_no`
   - `scale_1_5`
   - `multi_choice`
   - `free_text`
   - `photo_required`
   - `audio_required`
5. Add **conditional logic** where it matters. Example: "If answer to Q4 = No, then Q5 (comment) is required." The builder has a small UI for this — no JSON.
6. Mark questions that need **photo or audio attachments** at submit time.
7. **Save as Draft** as you go. When ready, **Activate**. Activating retires the previous active version of the same `type` automatically.

> Rubrics become immutable once activated. To change scoring, create a new version, activate it, and the previous one moves to `retired`. Any historical shop keeps rendering against the version it was scored on.

### 2.2 Entering a shop (Manual entry)

Phase 1 is manual entry only — agency imports come in Phase 4. The entry flow is a wizard:

1. **Location** → pick the store.
2. **Date / Time** → when the shop happened.
3. **Type** → visit, call, web inquiry, social inquiry. The matching active rubric loads automatically.
4. **Shopper info** → `shopper_name` (display) and optional `shopper_external_ref` (agency ID). Don't enter shopper home addresses or personal contact info — by policy, only display name and reference number.
5. **Evaluated employee** *(optional)* → pick the associate, or leave blank if the shop evaluates the store rather than a named person.
6. **Section-by-section answers** → walk through each rubric section. Required fields, conditional logic, and photo/audio requirements are validated as you go.
7. **Narrative** → free-text overall comment from the shopper.
8. **Submit**.

You can **save as draft at any step**. On submit:
- Status moves to `submitted`.
- The shop auto-routes to the location's primary `store_manager`.
- The manager gets a notification.

### 2.3 Manager review

When a shop lands in your queue, you'll see it at the top of your dashboard under **"Needs your attention."** Open it and you get a side-by-side view: rubric question, shopper's answer, and the evaluated employee's profile.

You can:

- Add **per-question comments**.
- **Adjust scores** with a required justification (every adjustment is audited and stored in `AuditLog`).
- Write a **manager summary** — a short narrative the employee will see.
- Create one or more **action plans** (see §2.4).
- *(Phase 3 only)* Award **0–25 bonus points** with a required justification.
- Click **Mark Review Complete**.

Once you complete the review, status moves to `action_assigned` (or `closed` if no action plan was needed) and the employee gets a notification.

### 2.4 Action plans (the coaching loop)

An action plan is the bridge from "we found something" to "we did something about it." Each action plan:

- Maps to a `RubricSection` (the category that drove it — e.g. "Greeting").
- Has a description, a due date, and an assigned employee.
- Moves through statuses: `open → acknowledged → in_progress → completed → verified` (with `overdue` if the due date passes).
- Generates notifications: assigned, due in 3 days, overdue.

Both employee and manager can comment on the action plan as it progresses. The manager closes it by clicking **Verify**, which captures verification notes.

### 2.5 Employee view

On the employee dashboard you'll see:

- **Latest shop** — score and status at the top.
- **Trend tile** — your scores over the last several shops.
- **Open action plans** — with one-click acknowledge / mark-progress / mark-complete.
- **Personal best** *(Phase 3)* and **most-improved category**.
- **Badges** *(Phase 3)*.

Clicking into a shop shows you every rubric question, the shopper's answer, the score awarded, the manager's per-question comments, the manager summary, and the original narrative. For mystery caller shops, audio playback shows up here once it's released (see Phase 2).

### 2.6 Filing an appeal

If you disagree with how a shop was scored, you can appeal it directly from the shop detail page.

1. Click **File Appeal**.
2. Enter a **reason** (required) and a **requested change** (e.g. "Score on Q3 should be 5, not 3, because…").
3. Submit.

The appeal:
- Is private. It's visible only to you and your store manager until resolved — never auto-published.
- Routes to your store manager first. They can approve, partially approve, or deny it, with resolution notes.
- Can be **escalated** by the manager to your district manager if needed.
- If approved, any score adjustment is applied to the shop and recorded in the audit log.

You'll get a notification when the appeal is resolved.

### 2.7 Branded PDF export

From any shop detail page, click **Export PDF**. You get a one-page (or multi-page, depending on rubric size) print-ready document with:

- Stine logo, location, shop date, shop type
- All sections, questions, answers, and scores
- Shopper narrative
- Manager summary
- Full action plan list

Use it for one-on-one coaching sessions or to hand off context outside the app.

### 2.8 Dashboards in Phase 1

Each role gets a different dashboard:

- **Employee** — personal trend, latest shop, open action plans.
- **Store manager** — review queue, store score trend, employee comparison within the store, open action plans for the team.
- **District manager** — roll-up across stores, heat-map of stores × rubric sections, top issues, action-plan completion rate, appeal volume.
- **Admin** — company-wide trend, shop volume, repeat-defect rate per category, time-to-remediate per location, appeal escalation rate.

The **heat-map** is reusable: rows are stores or employees, columns are rubric sections, cell color is average score. Click a cell to drill into the underlying shops.

---

## 3. Phase 2 — Audio review & mystery caller workflow

Mystery callers are a different evaluation type than in-store visits and need their own UX. Phase 2 adds audio handling on top of the Phase 1 scorecard so a caller recording can be uploaded, reviewed with timestamp-anchored comments, and released to the employee.

### 3.1 Uploading a caller recording

When you create a shop with `type = call`, the entry wizard adds an **Audio** step:

1. Choose **New Shop → Mystery Caller**. The caller-specific rubric loads automatically (different from the in-store visit rubric).
2. Step through the wizard as in Phase 1 (location, date, shopper info, evaluated employee, etc.).
3. At the **Audio** step, upload the recording. The file is stored on Stine infrastructure, encrypted at rest, and an `Attachment` record is created with the file's duration and a `retention_until` date computed from the policy (default 12 months — see §3.4).
4. Continue through the rubric and submit.

> **Louisiana / Mississippi:** Both states are one-party consent. Internal mystery callers should consent at the start of their engagement, and HR should have an acknowledgment form on file before launch. The app records who uploaded the audio and when, but consent itself is handled outside the app.

### 3.2 Reviewing audio with time-anchored comments

When you open a caller shop as a reviewer, you'll see an **embedded audio player** with:

- **Waveform** display
- **Timestamp scrubber** — click anywhere on the timeline to jump
- **Playback speed** control (0.5x, 1x, 1.5x, 2x)
- **Comment-anchor button** — drops a comment at the current playhead

To leave a time-anchored comment:

1. Click the timeline (or pause) at the moment you want to mark — e.g. `01:42` when the caller asks about delivery and the rep says "I don't know."
2. Click **Add Comment at 01:42**.
3. Type the comment. It's saved with `audio_timestamp_seconds = 102` against the shop.

All comments appear in a **time-ordered list** alongside the player. Clicking a comment in the list jumps the player to that moment. You can leave as many comments as you want, and other reviewers (manager, district) can add their own.

### 3.3 Releasing the review to the employee

By default, audio comments and the manager's review are **not visible to the employee** until the manager explicitly releases them. This gives the manager a chance to:

- Review the recording themselves first
- Edit or delete any premature comments
- Add the manager summary and action plans before the employee sees the package

Once you click **Mark Review Complete** (the same button as in §2.3), the audio, comments, manager summary, and action plans become visible on the employee's shop detail page. The employee gets a notification and can play the recording, scrub through it, and read the time-anchored comments in context.

### 3.4 Privacy & retention controls

The platform enforces audio retention rules automatically:

- **Default retention:** 12 months from the shop date, after which the audio file is auto-deleted (the `Shop` and `ShopAnswer` records are kept; only the `Attachment` is purged).
- **Configurable** by an admin via `SystemConfig.audio.retention_days`.
- **Legal hold:** an admin can flag a specific `Attachment` to skip auto-delete if it's needed for an HR or legal matter.
- **Audit:** every audio upload, playback, and deletion is recorded in `AuditLog` (admin-visible).
- **PII discipline:** as in Phase 1, only `shopper_name` and `shopper_external_ref` are stored — never shopper home addresses or personal contact info.

Employees retain their **right-to-know** export: a self-serve button in employee settings produces a full export of their own data, including any audio they were evaluated on (subject to retention).

---

## 4. Phase 3 — Gamification

Phase 3 is built only after 30–60 days of clean baseline data exists in production. The whole layer is toggleable per location via `SystemConfig.gamification.enabled` — turning it off does not break the core app.

The design philosophy: gamification is **additive recognition**, not compensation, and never punitive. Public displays only ever show top 3 + most-improved, never bottom-of-pack. Personal-best is the primary individual metric.

### 4.1 How points are earned

Every point ever awarded is appended to a `PointsLedger` row. Nothing is ever mutated — adjustments are new entries with a negative value and a justification.

The points engine has five sources:

| Source | Rule |
|---|---|
| **Base score** | `shop_score` (0–100) becomes the starting points value. |
| **Type multiplier** | visit ×1.2, call ×1.0, special-scenario shop ×1.5 |
| **Streak bonus** | +10% per consecutive shop ≥ 85, capped at +50%. Resets on a sub-85 shop. |
| **Manager bonus** | 0–25 points awarded by a store manager during review, with required justification (audited). |
| **Improvement bonus** | +20 if the shop score is ≥ 15 above the employee's trailing 3-shop average. |

**Worked example.** An employee scores 92 on an in-store visit. They had a 91 and an 88 on the previous two shops, all ≥ 85, so they're on a 3-shop streak (+30%). The manager awards 10 bonus points for an exceptional close. Their trailing 3-shop average was 89.5, so the +20 improvement bonus does not trigger.

```
base       = 92
× type     = 92 × 1.2  = 110.4   (visit)
× streak   = 110.4 × 1.30 = 143.5
+ manager  = 143.5 + 10 = 153.5
+ improve  = 153.5 + 0  = 153.5
```

That's logged as a single `shop_score` ledger entry of 154 (rounded), plus a separate `manager_bonus` ledger entry of 10 with the justification text. Two entries, both append-only.

### 4.2 Badges (permanent, three categories)

Badges are earned, never expire, and never get taken away. Three categories:

**Absolute performance:**
- **Greeting Gold** — 5 perfect greetings in a quarter
- **Product Sage** — perfect product-knowledge in a quarter
- **Phone Pro** — 5 perfect mystery calls

**Improvement:**
- **Most Improved (Q1/Q2/Q3/Q4)** — best quarter-over-quarter delta
- **Bounce Back** — recovered 20+ points after a sub-70 shop
- **Comeback Kid** — 3 consecutive improving shops

**Tenure / volume:**
- **Veteran** — 50 shops graded
- **Centurion** — 100 shops
- **100 Club** — any single shop ≥ 100 (bonuses pushed it past 100)

Each badge has a declarative `earn_criteria` rule the points engine evaluates after every shop. When the rule trips, a `UserBadge` row is created and the employee gets a notification.

> **Why the Improvement category exists.** It creates a separate path to recognition for any skill level. A consistently-mid performer who's getting better should be just as celebrated as a top scorer.

### 4.3 Leagues (peer groups, not company-wide ranking)

Leagues are how the platform avoids "permanent losers." Instead of one company-wide leaderboard, the admin groups stores into **leagues of 3–5 stores each** (typically by district or region). Each league runs **monthly cycles**, and **promotion/demotion happens at quarter end** — top of the bottom league moves up, bottom of the top league moves down.

The league standings page shows:

- **Top 3 stores** for the current cycle
- **Most-improved store** for the current cycle
- Your own store's position **relative to the league**, not to the company

Bottom-of-pack rankings are never displayed publicly. (See the attribution table — this is a deliberate countermeasure to the "electronic whip" failure mode.)

### 4.4 Personal best (the most important screen)

Every employee gets a **Personal Best** dashboard tile that shows:

- **Highest single shop score** ever
- **Latest shop score**
- **Trailing 3-shop average**
- **Trend chart** of their own scores over time, vs. their own history — never vs. peers

This is the only place absolute position is shown to an individual, and it's only ever them vs. them. It protects employees who are consistently low on a global ranking from feeling singled out, while still giving them something concrete to beat.

### 4.5 Manager bonus points (with justification)

During review, the manager can award **0–25 bonus points** with a required justification. Use this when an algorithm wouldn't catch what made the shop exceptional — recovering a frustrated customer, a great cross-sell, an above-and-beyond moment.

1. In the review screen, click **Award Bonus Points**.
2. Enter a value 0–25.
3. Type the justification (required — empty justifications are rejected).
4. Submit. The award lands as a `manager_bonus` row in `PointsLedger` and is recorded in `AuditLog` with the manager's identity.

This keeps human judgment in the loop so algorithmic-only scoring isn't the whole story.

### 4.6 Challenges (store-level, time-bound)

Challenges are short-term, store-level goals. Examples:

- **"30 days without a sub-70 shop"** — a streak-style challenge.
- **"Q2 closing-technique focus"** — a category-average challenge with a threshold (e.g. 85+ on the Close section).

Each challenge has a `metric` (`avg_score`, `score_above_threshold_count`, or `category_avg`), an optional `category` and `threshold`, and a date window. Progress (`current_value` vs. `target_value`) is tracked per location in `ChallengeParticipation`.

Stores opt in via the manager toggle. Admins can also mandate a challenge across all locations. Refresh challenges quarterly — the spec is explicit about not letting any single metric become game-able.

### 4.7 The Hunt (Phase 3b, optional)

The Hunt is an opt-in campaign mechanic that rewards exceptional service caught in the act.

**How it works:**

1. **Admin** defines a **Hunt campaign**: a date window plus a set of predefined service scenarios containing trigger phrases and codewords (e.g. a shopper says "I'm shopping for my dad's project" — codeword detection).
2. **Mystery shoppers** run those scenarios during the campaign window.
3. When an employee delivers the standard, the shopper records the interaction as a Hunt match against that employee.
4. The employee gets a follow-up **"reveal" visit** from the same shopper — they come back, identify themselves, and recognize the employee in person. The app fires a **`hunt_reveal`** event:
   - In-app public recognition (visible on the employee's profile, store dashboard)
   - Notification to the employee and their store manager
   - A small physical reward (gift card or similar) that's coordinated outside the app
5. **Optional guess mechanic.** After the Hunt window closes, employees can submit guesses for which interaction was a Hunt shop. Correct guesses earn smaller bonus points (logged as `hunt_reveal` source in the ledger).

The Hunt is admin-toggled per campaign and never automatic. It's the showpiece of the gamification layer — a deliberate, public, surprising moment of recognition.

### 4.8 Calibration check before turning gamification on

Before enabling gamification at any location, run a **calibration check**:

1. Pick 10 recent shops at the location.
2. Have **two reviewers** independently grade each one against the same rubric.
3. Compare the deltas.
4. **If the average delta exceeds 8 points**, do not turn on gamification yet. Retrain the rubric or the reviewers and re-test.

This protects employees from competing against reviewer noise instead of their own actual performance.

---
