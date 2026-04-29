# Stine Mystery Shop & Caller Performance Platform — Build Specification

> **For: Claude Code**
> **Project owner:** Kyle Manuel, Director of IT, Stine LLC
> **Date drafted:** April 2026
> **Stack:** TypeScript / React / Node (same pattern as Stine Contract Manager), new repo
> **Hosting target:** Stine internal infrastructure
> **Status:** Build spec — derived from competitive research across 8 mystery shopping platforms and gamification design literature

---

## 0. How to use this document

This is a build spec, not a feature wishlist. Phases 1–4 are sequenced; do not skip ahead. Each phase has explicit acceptance criteria. The data model in §4 is authoritative — if a feature in §6 conflicts with the data model, the data model wins and the feature gets reshaped.

When in doubt during implementation, prefer the **simplest version that satisfies the acceptance criteria** for the current phase. Save sophistication for later phases. The Contract Manager codebase is the reference for conventions (auth, layout shell, API patterns, deploy).

---

## 1. Product summary

An internal Stine LLC application for managing the full lifecycle of mystery shopper and mystery caller evaluations across 14 locations (13 Louisiana, 1 Mississippi). Replaces the current spreadsheet/email-driven workflow.

**Primary jobs to be done:**

1. Ingest mystery shop and mystery caller results (initially manual entry; agency import later)
2. Route results to the right store manager for review and coaching action
3. Give employees a clear view of their own performance, history, and improvement plans
4. Give managers and leadership a dashboard view of trends across employees, stores, and regions
5. Drive measurable behavior change through a gamification layer that recognizes and rewards (additively, not punitively)

**Primary user roles:**

- **Employee** — sees own scores, history, action plans, can comment / appeal
- **Store Manager** — reviews shops for their location, assigns coaching, resolves appeals
- **District/Regional Manager** — roll-up across multiple stores, escalation point
- **Admin (Kyle / IT / HR)** — rubric authoring, user management, system config, all data

---

## 2. Phased rollout

Build in this order. Do not start a later phase until the previous phase's acceptance criteria are met and the phase is in production for at least 2 weeks of real use.

### Phase 1 — Core Scorecard & Coaching Loop (MVP)
The minimum viable product. Must work end-to-end before anything else gets built.

**Includes:**
- User auth and roles
- Rubric/template builder (admin only)
- Shop result entry (manual)
- Manager review workflow
- Employee view of their own results
- Coaching notes and action plans
- Appeals/disputes
- Basic per-employee and per-location dashboards
- Branded PDF export per shop

**Acceptance:** A mystery shop can be entered, routed to a manager, reviewed, generate an action plan, the employee can acknowledge and optionally appeal, and the appeal can be resolved. End-to-end, no edge cases missing.

### Phase 2 — Audio Review & Mystery Caller Workflow
Mystery callers are a separate evaluation type with their own UX requirements.

**Includes:**
- Audio file upload tied to a shop record
- Embedded audio player with timestamp-anchored comments
- Caller-specific rubric template (different from in-store visit rubric)
- Privacy/retention controls for audio

**Acceptance:** A caller recording can be uploaded, a reviewer can leave time-anchored comments, and the audio plus comments are visible to the employee being evaluated (subject to manager release).

### Phase 3 — Gamification Layer
Built only after 30–60 days of clean baseline data exists in production. Without baseline data, employees compete against noise.

**Includes:**
- Points engine
- Badges (earned, permanent)
- Leagues (small groups of stores)
- Personal-best tracking
- Most-improved recognition
- Manager bonus points (with required justification)
- Store-level streaks and challenges
- "The Hunt" mechanic (Phase 3b — see §6.5)

**Acceptance:** Gamification module can be toggled per location. Disabling it does not break the core app.

### Phase 4 — Advanced Analytics & Cross-System Intelligence
Connects mystery shop data to operational data.

**Includes:**
- BisTrack data integration (sales, AOV, conversion per location)
- Side-by-side analytics (e.g., correlation between product-knowledge scores and AOV)
- AI-powered comment summarization and theme clustering (Anthropic API, same pattern as Contract Manager)
- Microlearning loop (low score → assigned training → re-test)
- Scheduled email digests for managers
- Agency import pipeline (CSV / email / API depending on what the agency supports)

**Acceptance:** A manager can see "stores with product-knowledge < 70% have 12% lower AOV" type insights without manual analysis.

---

## 3. Architecture & stack

Mirror Contract Manager unless explicitly noted.

- **Frontend:** React + TypeScript, same component library and design system as Contract Manager
- **Backend:** Node + TypeScript, same auth and middleware patterns
- **Database:** Same database engine as Contract Manager (PostgreSQL assumed; confirm against Contract Manager repo at start)
- **File storage:** Stine infrastructure for audio files (mystery caller recordings) and document attachments. Encrypt at rest. See §11 for retention rules.
- **AI calls (Phase 4):** Anthropic API via the same wrapper used in Contract Manager's contract summary feature
- **Deployment:** Same hosting and CI/CD pipeline as Contract Manager
- **Auth:** SSO / company directory if Contract Manager uses it; otherwise email + password with role assignment

**Repo structure:** New repo, do not fork Contract Manager. Reuse libraries and shared components by extracting them to a shared internal package only if more than two pieces are duplicated.

---

## 4. Data model (authoritative)

### 4.1 Core entities

```
User
  id (uuid)
  email (unique)
  full_name
  role (enum: employee, store_manager, district_manager, admin)
  primary_location_id (fk → Location, nullable for admin/district)
  district_ids (array of uuid, for district_manager)
  hire_date
  active (bool)
  created_at, updated_at

Location
  id (uuid)
  code (string, e.g. "STN-SUL" for Sulphur)
  name (string)
  address, city, state, zip
  district (string, e.g. "Southwest LA")
  active (bool)

Rubric
  id (uuid)
  name (string, e.g. "In-Store Visit v3", "Mystery Caller v2")
  type (enum: visit, call, web_inquiry, social_inquiry)
  version (int)
  status (enum: draft, active, retired)
  total_max_score (int, computed from sections)
  created_by, created_at, retired_at

RubricSection
  id (uuid)
  rubric_id (fk)
  name (e.g. "Greeting", "Product Knowledge", "Close")
  display_order (int)
  weight (decimal, contribution to total)
  max_score (int)

RubricQuestion
  id (uuid)
  section_id (fk)
  text (string)
  question_type (enum: yes_no, scale_1_5, multi_choice, free_text, photo_required, audio_required)
  weight (decimal)
  max_score (int)
  options (jsonb, for multi_choice)
  conditional_logic (jsonb, e.g. "if answer = no, comment required")
  required (bool)
  display_order (int)
```

### 4.2 Shop results

```
Shop
  id (uuid)
  rubric_id (fk → Rubric, snapshot the version used)
  rubric_version (int, denormalized)
  type (enum: visit, call, web_inquiry, social_inquiry)
  location_id (fk → Location)
  shop_date (date)
  shop_time (time, nullable)
  evaluated_employee_id (fk → User, nullable — some shops evaluate the store, not a specific employee)
  shopper_name (string, nullable — internal/external shopper)
  shopper_external_ref (string, nullable — agency reference number)
  status (enum: draft, submitted, under_review, action_assigned, closed, appealed)
  total_score (decimal, computed)
  total_max (decimal, denormalized from rubric)
  percentage (decimal, computed)
  narrative (text, the shopper's overall comment)
  audio_file_id (fk → Attachment, nullable, for caller shops)
  source (enum: manual_entry, agency_import, internal_shop)
  created_by (fk → User)
  created_at, updated_at, submitted_at, closed_at

ShopAnswer
  id (uuid)
  shop_id (fk)
  question_id (fk → RubricQuestion)
  answer_value (jsonb)  -- handles all answer types
  score_awarded (decimal)
  comment (text, nullable)
  attachment_ids (array of uuid)

Attachment
  id (uuid)
  shop_id (fk, nullable)
  shop_answer_id (fk, nullable)
  file_path (string)
  file_type (string)
  file_size_bytes (int)
  duration_seconds (int, nullable, for audio)
  uploaded_by (fk → User)
  uploaded_at
  retention_until (date, computed from policy)
```

### 4.3 Coaching workflow

```
Review
  id (uuid)
  shop_id (fk, unique — one review per shop)
  reviewer_id (fk → User)  -- typically store_manager
  status (enum: pending, in_progress, completed)
  manager_summary (text)
  manager_score_adjustment (decimal, nullable, with required justification)
  manager_score_justification (text, required if adjustment present)
  bonus_points_awarded (int, nullable, 0–25, with required justification)
  bonus_justification (text)
  reviewed_at

ActionPlan
  id (uuid)
  shop_id (fk)
  review_id (fk)
  assigned_to (fk → User)  -- the employee
  assigned_by (fk → User)  -- the manager
  category (string — should map to a RubricSection.name)
  description (text)
  due_date (date)
  status (enum: open, acknowledged, in_progress, completed, verified, overdue)
  acknowledged_at, completed_at, verified_at
  verification_notes (text)
  training_module_id (fk, nullable, Phase 4)

Appeal
  id (uuid)
  shop_id (fk)
  filed_by (fk → User)  -- the employee
  filed_at
  reason (text, required)
  requested_change (text)
  status (enum: open, under_review, approved, partially_approved, denied)
  resolver_id (fk → User)  -- store_manager initially, can escalate to district_manager
  resolution_notes (text)
  resolved_at
  score_adjustment_applied (decimal, nullable)

Comment
  id (uuid)
  shop_id (fk, nullable)
  action_plan_id (fk, nullable)
  appeal_id (fk, nullable)
  audio_timestamp_seconds (int, nullable — for time-anchored comments on caller audio)
  author_id (fk → User)
  body (text)
  created_at
```

### 4.4 Gamification (Phase 3 — separate schema, can be disabled cleanly)

```
PointsLedger  -- append-only, never updated
  id (uuid)
  user_id (fk → User)
  source_type (enum: shop_score, streak_bonus, manager_bonus, improvement_bonus, badge_earned, hunt_reveal)
  source_ref_id (uuid)  -- references the shop, badge, etc.
  points (int, can be negative for adjustments)
  reason (text)
  awarded_by (fk → User, nullable — null for system awards)
  awarded_at

Badge
  id (uuid)
  code (string, unique, e.g. "greeting_gold")
  name, description
  icon_path
  category (enum: absolute, improvement, tenure, special)
  earn_criteria (jsonb — declarative rule the points engine evaluates)
  active (bool)

UserBadge
  id (uuid)
  user_id, badge_id (composite unique)
  earned_at
  earning_shop_id (fk → Shop, nullable)
  -- badges are permanent; do not soft-delete

League
  id (uuid)
  name (e.g. "Southwest LA League")
  period_start, period_end
  store_ids (array of uuid)

LeagueStanding
  id (uuid)
  league_id, location_id, period
  rank (int)
  total_points (int)
  computed_at

Challenge  -- store-level, time-bound
  id (uuid)
  name, description
  starts_at, ends_at
  metric (enum: avg_score, score_above_threshold_count, category_avg)
  category (string, nullable)
  threshold (decimal, nullable)
  active (bool)

ChallengeParticipation
  id (uuid)
  challenge_id, location_id
  current_value, target_value
  completed (bool)

HuntCampaign  -- Phase 3b
  id (uuid)
  name, description
  starts_at, ends_at
  scenarios (jsonb — predefined triggers and codewords)
  active (bool)

HuntReveal
  id (uuid)
  hunt_campaign_id (fk)
  shop_id (fk)
  recognized_employee_id (fk → User)
  identified_by_employees (array of uuid)  -- employees who guessed correctly
  revealed_at
```

### 4.5 Audit & system

```
AuditLog
  id (uuid)
  actor_id (fk → User, nullable)
  entity_type, entity_id
  action (enum: create, update, delete, status_change, score_change, login, etc.)
  before (jsonb), after (jsonb)
  occurred_at, ip_address, user_agent

SystemConfig
  key (string, unique)
  value (jsonb)
  updated_by, updated_at
-- examples: "gamification.enabled", "audio.retention_days", "appeal.escalation_days"
```

---

## 5. API surface (REST, mirror Contract Manager conventions)

Versioned `/api/v1/...`. JSON only. JWT or session auth depending on Contract Manager's pattern. All list endpoints support pagination (`?page=`, `?limit=`), filtering, and sort.

```
# Auth & users
POST   /auth/login
POST   /auth/logout
GET    /auth/me
GET    /users               (admin, district)
POST   /users               (admin)
PATCH  /users/:id           (admin)
GET    /users/:id           (self, manager-of, admin)

# Locations
GET    /locations
POST   /locations           (admin)
PATCH  /locations/:id       (admin)

# Rubrics
GET    /rubrics
POST   /rubrics             (admin)
GET    /rubrics/:id
PATCH  /rubrics/:id         (admin, only if status=draft)
POST   /rubrics/:id/activate
POST   /rubrics/:id/retire

# Shops
GET    /shops               (filtered by role)
POST   /shops               (manual entry)
GET    /shops/:id
PATCH  /shops/:id           (limited fields by role)
POST   /shops/:id/submit
POST   /shops/:id/attachments

# Reviews
POST   /shops/:id/review
PATCH  /reviews/:id
POST   /reviews/:id/complete

# Action plans
POST   /shops/:id/action-plans
GET    /action-plans        (filtered: assigned-to-me, assigned-by-me)
PATCH  /action-plans/:id
POST   /action-plans/:id/acknowledge
POST   /action-plans/:id/complete
POST   /action-plans/:id/verify

# Appeals
POST   /shops/:id/appeals
GET    /appeals             (open / mine / my-team)
PATCH  /appeals/:id
POST   /appeals/:id/resolve
POST   /appeals/:id/escalate

# Comments
POST   /shops/:id/comments
POST   /action-plans/:id/comments
POST   /appeals/:id/comments

# Dashboards
GET    /dashboards/me                       (employee)
GET    /dashboards/location/:id             (manager+)
GET    /dashboards/district/:id             (district+)
GET    /dashboards/company                  (admin)
GET    /dashboards/heatmap?dimension=...    (manager+)

# Exports
GET    /shops/:id/pdf
GET    /reports/location/:id?format=pdf|xlsx
GET    /reports/employee/:id?format=pdf

# Gamification (Phase 3)
GET    /gamification/me
GET    /gamification/leaderboard?scope=league|store|district
GET    /gamification/badges
GET    /gamification/leagues/:id
POST   /gamification/manager-bonus           (manager+)
GET    /gamification/challenges
GET    /gamification/hunt/active

# Admin
GET    /admin/audit-log
GET    /admin/config
PATCH  /admin/config/:key
```

---

## 6. Feature requirements by surface

### 6.1 Rubric builder (admin)

- Drag-and-drop section and question reordering.
- Per-question type selector with preview of how it renders.
- Conditional logic builder: "If answer to Q4 = No, then Q5 (comment) is required."
- Photo/audio attachments can be marked required at the question level.
- Weights and max scores entered per question; section totals and rubric total auto-compute.
- Save as draft, then activate. Activating a new version retires the previous version of the same `type`.
- Rubrics are versioned and immutable once activated. A shop snapshot stores the rubric version used, so historical shops always render correctly even after the rubric changes.

### 6.2 Shop entry (manual, Phase 1)

- Wizard format: Location → Date/Time → Type → Rubric (auto-selected by type) → Shopper info → Evaluated employee (optional) → Section-by-section answers → Narrative → Submit.
- Save draft at any step.
- Validation: required fields, conditional logic, attachment requirements.
- On submit: auto-route to the location's primary `store_manager`, status moves to `submitted`, manager gets a notification.

### 6.3 Manager review

- "Needs your attention" queue at top of manager dashboard.
- Side-by-side view: rubric question + shopper answer + employee profile.
- Manager can:
  - Add per-question comments
  - Adjust scores (with required justification, audited)
  - Award bonus points 0–25 (Phase 3, with required justification)
  - Write a manager summary
  - Create one or more action plans
  - Mark review complete
- Once review is complete, employee gets a notification and can view the result.

### 6.4 Employee view

- Dashboard tiles: latest shop, current trend, open action plans, badges (Phase 3), personal best, most improved category.
- Shop list with filters: type, date range, status.
- Shop detail: see all answers, scores, manager notes, narrative. Audio playback for caller shops.
- Action plan list: open and historical, with acknowledge / mark-progress / mark-complete actions.
- Appeal: from any shop, file an appeal with reason and requested change.

### 6.5 Gamification (Phase 3)

**Points engine — concrete rules:**

- Base points = `shop_score` (0–100)
- Type multiplier: visit ×1.2, call ×1.0, special-scenario shop ×1.5
- Streak bonus: +10% per consecutive shop ≥ 85, capped at +50%, resets on a sub-85 shop
- Manager bonus: 0–25 manually awarded, requires justification text (audited)
- Improvement bonus: +20 if shop score is ≥15 above employee's trailing 3-shop average
- All adjustments are append-only entries in `PointsLedger`. Never mutate; always add.

**Badges — three categories, all permanent once earned:**

- **Absolute performance:** Greeting Gold (5 perfect greetings in a quarter), Product Sage (perfect product-knowledge in a quarter), Phone Pro (5 perfect mystery calls).
- **Improvement:** Most Improved (Q1/Q2/Q3/Q4), Bounce Back (recovered 20+ points after a sub-70 shop), Comeback Kid (3 consecutive improving shops).
- **Tenure / volume:** Veteran (50 shops graded), Centurion (100 shops), 100 Club (any shop ≥ 100 if bonuses pushed it there).

**Leagues:**

- Admin groups stores into leagues of 3–5 stores each. Initially: by district / region.
- Each league runs monthly cycles. Promotions/demotions between leagues happen at quarter end (top of bottom league moves up; bottom of top league moves down).
- Standings show top 3 + most-improved store, never bottom-of-pack.

**Personal best dashboard (the most important anti-failure-mode mechanic):**

- Every employee sees their own highest score, latest score, trailing 3-shop average, and trend chart vs. their own history.
- This protects employees who are consistently low on the global leaderboard from feeling singled out (see §10 for why).

**The Hunt mechanic (Phase 3b, optional, admin-toggled):**

- Admin defines a Hunt campaign: a date window with predefined service scenarios containing trigger phrases and codewords.
- Mystery shoppers run those scenarios.
- Employee who delivers the standard gets a follow-up "reveal" visit from the same shopper, plus public recognition in-app, manager notification, and a small physical reward (gift card or similar — managed outside the app).
- Optional: employees can guess which interaction was a Hunt shop after the fact; correct guesses earn smaller bonus points.

**Challenges:**

- Store-level, time-bound. e.g. "30 days without a sub-70 shop." "Q2 closing-technique focus."
- Challenges are read-only opt-in for stores (manager toggles participation) but admin can mandate.

### 6.6 Dashboards

**Employee dashboard:** personal best, trend, latest, action plans, badges, streak status.

**Store manager dashboard:** review queue, store score trend, employee comparison within store, open action plans for team, store streak status, leaderboard position (Phase 3).

**District manager dashboard:** roll-up across stores, heat-map (stores × rubric sections), top issues, action-plan completion rate, appeal volume.

**Admin / company dashboard:** company-wide trend, shop volume, repeat-defect rate per category, time-to-remediate per location, appeal escalation rate, gamification engagement metrics.

**Heatmap component (reusable):** rows = stores or employees, columns = rubric sections, color = average score. Click a cell drills into underlying shops.

### 6.7 Audio review (Phase 2)

- Player with waveform, timestamp scrubber, playback speed.
- Click anywhere on the timeline to anchor a comment to that timestamp.
- Comments list view shows all comments in time order.
- Comments are visible to the employee only after manager releases the review.

### 6.8 PDF export (Phase 1)

- One PDF per shop: header (Stine logo, location, date), all sections and answers, scores, narrative, manager summary, action plan list. Print-ready, branded.
- One-click export from any shop detail page.
- Reusable for one-on-one coaching sessions.

### 6.9 AI features (Phase 4)

- Per-shop comment summary: generate a 2-3 sentence summary of the shopper's open-text comments.
- Theme clustering: across all shops in a quarter for a store/employee/category, identify the top 3 recurring themes.
- Sentiment scoring: flag narrative sections with negative sentiment for manager priority review.
- All AI calls go through the same Anthropic API wrapper used by Contract Manager. Model: most current Claude Sonnet at time of build.

---

## 7. UI / UX principles

- **Don't overdesign.** Match the Contract Manager visual language. Same nav shell, same component library.
- **Mobile-first for employees.** Employees check scores on phones. Mobile-first for the employee view; desktop-first acceptable for manager review and admin.
- **Keep gamification optional in the visual hierarchy.** Points and badges are visible but not the primary thing on a screen. Performance, coaching, and improvement are primary; gamification is the layer on top.
- **No bottom-of-pack rankings ever shown.** Public displays show top 3 + most improved. Personal-best is the only place employees see their own absolute position relative to themselves.
- **Tone is developmental, not punitive.** UI copy reflects this. "Action plan" not "deficiency." "Coaching note" not "infraction."

---

## 8. Notifications

Channels: in-app (always), email (configurable per user), SMS (Phase 2+, opt-in).

Triggers:
- Shop submitted → store manager
- Review completed → evaluated employee
- Action plan assigned → employee
- Action plan due in 3 days → employee, manager (cc)
- Action plan overdue → employee, manager
- Appeal filed → store manager
- Appeal escalated → district manager
- Appeal resolved → employee
- Badge earned → employee (Phase 3)
- Hunt reveal → recognized employee + their store manager (Phase 3b)
- Weekly digest → managers (Phase 4)

---

## 9. Permissions matrix

| Action | Employee | Store Manager | District Mgr | Admin |
|---|---|---|---|---|
| View own shops | ✓ | ✓ | ✓ | ✓ |
| View team shops | — | own location | own district | all |
| Enter shop | — | own location | own district | all |
| Review shop | — | own location | own district | all |
| Adjust score | — | with justification, own location | own district | all |
| Award bonus points | — | own location, max 25/shop | own district | all |
| File appeal | own shops | — | — | — |
| Resolve appeal | — | own location | own district (escalations) | all |
| Create action plan | — | own location | own district | all |
| Edit rubric | — | — | — | ✓ |
| Manage users | — | — | — | ✓ |
| Manage gamification config | — | — | — | ✓ |
| View audit log | — | — | — | ✓ |
| Export company-wide reports | — | — | own district | all |

---

## 10. Anti-patterns to actively avoid

These are real failure modes documented in industry research. Each has a specific design rule attached.

1. **Don't make it punitive or surveillance-feeling.** Public leaderboards show only top performers and most-improved, never bottom-of-pack. Inspired by Disney's "electronic whip" debacle (2008).
2. **Don't replace existing rewards with the game.** Gamification is additive. If Stine has employee-of-the-month or sales bonuses, this app feeds them rather than replacing them.
3. **Don't let people game a single metric.** Rotate emphasis quarterly via Challenges. Keep manager judgment in the loop with bonus-point and adjustment tools so algorithmic-only scoring isn't the whole story.
4. **Don't build novelty that fades.** Design for habit, not buzz. Daily/weekly cadence with small predictable feedback beats big infrequent contests. Refresh challenges quarterly.
5. **Don't create permanent losers.** Leagues (small peer groups) are the structural fix. Personal-best is the primary individual metric. Improvement badges create a separate path to recognition for any skill level.
6. **Don't gamify to substitute for pay.** Gamification is for recognition and learning, not compensation.
7. **Don't expire badges or points.** Lattice's research is explicit that expiring rewards triggers gaming behavior and resentment. Append-only ledger; permanent badges.
8. **Don't auto-publish appeals.** Appeals are between employee and manager until the manager closes them. No public visibility.

---

## 11. Privacy, retention, and compliance

- **Audio retention:** Default 12 months from shop date, then auto-delete unless flagged for legal hold. Configurable in `SystemConfig`.
- **Louisiana call recording:** Louisiana is a one-party consent state; recording is legal when one party consents. Internal mystery callers should consent at the start of their engagement. Confirm Mississippi rules for the Natchez location separately (Mississippi is also one-party consent as of this spec, but verify before launch).
- **Employee notice:** Employees must be informed in writing that mystery shopping is in use and how data is handled. HR should provide acknowledgment forms before launch.
- **PII:** Mystery shopper names should be stored as `shopper_name` (display) and `shopper_external_ref` (agency ID). Don't store shopper home addresses or personal contact info.
- **Data access logs:** Every score view, score adjustment, and export is logged in `AuditLog`. Available to admin only.
- **Right to know:** Employees can request a full export of their own data. Build this as a self-serve button in employee settings.

---

## 12. Imports & integrations

### Phase 1 — Manual entry only
No imports. All shops are entered through the wizard. This is intentional — get the workflow right before automating intake.

### Phase 4 — Agency import
Likely formats from outside agencies:
- CSV (most common)
- Email with PDF attachment (parse with Anthropic API in the same pattern as Contract Manager's contract summary feature)
- API webhook (rare; build only if the agency offers it)

Build a generic import pipeline that maps incoming fields to the `Shop` and `ShopAnswer` schema. Confirm field mappings with the agency before each import contract starts.

### Phase 4 — BisTrack integration
Read-only data pull for cross-system intelligence:
- Daily sales by location
- AOV by location and date
- Conversion (transactions / foot traffic) if available

Use the existing BisTrack data pipeline if Stine has one. Don't build a new one for this app.

---

## 13. Testing requirements

Per phase:

- **Unit tests** on the points engine, score calculation, conditional logic evaluator, and permission middleware. These are the highest-risk areas.
- **Integration tests** on the shop → review → action-plan → appeal lifecycle.
- **Manual QA** with at least one real store manager before each phase ships.
- **Calibration check (Phase 3):** before turning on gamification at any location, run a calibration: have two reviewers grade the same 10 shops, compare deltas. If the average delta exceeds 8 points, retrain the rubric or reviewers before enabling gamification.

---

## 14. Out of scope (do not build)

- Mystery shopper recruiting or scheduling — Stine outsources this.
- GPS verification / geofencing — only relevant for in-house shoppers; not Stine's model.
- Multi-language support — single-language deployment.
- Customer-facing CX surveys — separate product, do not conflate.
- E-commerce mystery shopping — Stine doesn't have meaningful e-commerce traffic at the store level.
- Replacement of HR systems for performance reviews — this app *informs* performance reviews; it does not *become* them.

---

## 15. Open questions for Kyle (resolve before Phase 1 starts)

1. **Source of mystery shop data going forward.** Is the agency emailing/PDFing results today, or is there a digital export available? This determines what the Phase 4 import pipeline looks like and whether to start designing for it earlier.
2. **Caller recordings — current state.** Where do mystery caller recordings live today? Hosting them in the app for Phase 2 requires storage architecture decisions (Stine on-prem? cloud blob storage? retention?).
3. **Appeal escalation authority.** Default in this spec is store_manager → district_manager. Confirm with HR.
4. **Existing recognition programs.** What does Stine already do for employee recognition? The gamification layer should feed those programs, not replace them.
5. **Calibration owner.** Who owns reviewer calibration? Likely HR or operations; confirm before Phase 3.
6. **HR sign-off on employee notice.** Confirm the written notice and acknowledgment process before any production data lands.

---

## 16. Reference: research sources used to derive this spec

This spec was derived from analysis of these mystery shopping platforms and gamification design literature:

- Shopmetrics CX (Action Management, Appeals pattern, Action Bar dashboard)
- Checker Software (workflow centralization, AI-powered reporting, role-based access)
- FieldPie (multi-location evaluation patterns, mobile-first field capture)
- SmartSpotter (KPI dashboard with photo/audio/video evidence)
- hyperspace GmbH (closed-loop philosophy, "developmental not punitive" framing, ROI metrics: repeat defect rate / time to remediate / QoQ improvement)
- Secret Shopper (AI sentiment & keyword extraction, multiple shop types: visit/call/web/social)
- GoAudits (performance management cycle: target → measure → root-cause → action → coach; cross-system intelligence)
- Inspectly360 (conditional logic + mandatory attachment requirements)
- INPROVE "The Hunt" (gamification mechanic adapted for §6.5)
- Moonstar / Mobexpert (league system with promotion/demotion)
- Lattice, SHRM, Harvard Business Review, Enigmatic Events (gamification failure modes documented in §10)
