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
