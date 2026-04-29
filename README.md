# Stine Mystery Shop & Caller Performance Platform

Internal app for managing mystery shop and mystery caller evaluations across Stine LLC's 14 locations. See `STINE_MYSTERY_SHOP_APP_SPEC.md` for the authoritative build spec.

**Status:** Phases 1–3 + parts of Phase 4. Includes Phase 4 Anthropic-powered comment summarization, agency CSV import, audit log + admin viewer, leagues, challenges, and the district dashboard.

## Stack

- **Backend** (`server/`): Node + TypeScript, Express, Prisma ORM, PostgreSQL, JWT auth, Zod validation, PDFKit
- **Frontend** (`client/`): React + TypeScript, Vite, Tailwind, React Router

## Repo layout

```
server/                     Express API
  prisma/schema.prisma      Phase 1 + skeleton for later phases (gamification, audit, etc.)
  prisma/seed.ts            14 locations + sample users + visit/call rubrics
  src/routes/               auth, users, locations, rubrics, shops, reviews, action plans, appeals, comments, dashboards
  src/scoring.ts            Score calculation per question type
  src/auth.ts               JWT + role middleware

client/                     React SPA
  src/pages/                Login, Dashboard, ShopList, ShopWizard, ShopDetail, ActionPlans, Appeals
  src/pages/admin/          Rubrics, RubricEditor, Users
  src/components/Layout.tsx Top-nav layout shell with role-aware nav
  src/auth.tsx              Auth context
```

## Getting started

### Prerequisites

- Node 20+
- A running PostgreSQL instance (local Docker is fine)

### Backend

```bash
cd server
cp .env.example .env       # set DATABASE_URL and JWT_SECRET
npm install
npm run prisma:generate
npm run prisma:migrate     # creates the database schema
npm run seed               # 14 locations + sample users + active rubrics
npm run dev                # API on http://localhost:4000
```

### Frontend

```bash
cd client
npm install
npm run dev                # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:4000`.

## Seeded test users

| Email                            | Password       | Role             |
|----------------------------------|----------------|------------------|
| kyle@stine.test                  | admin1234      | admin            |
| manager.sulphur@stine.test       | manager1234    | store_manager    |
| manager.lc@stine.test            | manager1234    | store_manager    |
| district.sw@stine.test           | district1234   | district_manager |
| alex.employee@stine.test         | employee1234   | employee         |
| robin.employee@stine.test        | employee1234   | employee         |
| casey.employee@stine.test        | employee1234   | employee         |

## Phase 1 acceptance walkthrough

1. Sign in as `manager.sulphur@stine.test`, click **Enter Shop**, run the wizard for an Alex / Robin shop, submit.
2. Sign in as `alex.employee@stine.test` — see the shop in your list and dashboard tiles.
3. Back as the manager, open the shop, fill **Manager review**, add an action plan, click **Mark review complete**.
4. As Alex, **Acknowledge** and **Mark complete** the action plan; optionally **File an appeal**.
5. Manager resolves the appeal under **Appeals**.
6. **Export PDF** from any shop detail page.

## Environment

Beyond `DATABASE_URL` and `JWT_SECRET`, set `ANTHROPIC_API_KEY` to enable the AI summary + theme features (otherwise those endpoints return 503). Defaults to `claude-sonnet-4-6` per spec §6.9; override via `ANTHROPIC_MODEL`.

## What's now implemented (beyond Phase 1)

- **Attachments** — multer-backed file upload + retrieval, with role gating (employees can only access caller audio after manager release, per §6.7).
- **Phase 2 audio review** — caller shops have an audio upload + waveform-style player with click-to-seek time-anchored comments.
- **Phase 3 points engine** — runs on review-complete: `shop_score × type-multiplier × streak-bonus`, plus improvement bonus, plus manager bonus. Append-only ledger (§10 anti-pattern: no mutation).
- **Phase 3 badges** — Veteran / Centurion / Phone Pro / Comeback Kid / Bounce Back, evaluated on review-complete and permanent.
- **Leaderboard** — top 3 + most-improved only (no bottom-of-pack rankings, per §10).
- **Notifications** — in-app bell with unread counter; triggers wired for shop submitted, review completed, action plan assigned, badge earned.
- **Heatmap** — locations × rubric sections, color-coded; filterable by shop type. Available to managers and above.
- **District dashboard endpoint** — roll-up across stores in a district with open-appeal counter.
- **Unit tests** — `npm run test` exercises the scoring engine and points engine (17 tests covering yes/no, scale, multi-choice, streak bonus capping, improvement threshold, manager bonus).

## Latest additions

- **Test coverage for new logic** — 10 new tests:
  * `extractShopFromPdf` posts the PDF as a base64 document block (not in the cached system prompt) and the schema requires every field; throws when `ANTHROPIC_API_KEY` is missing.
  * Audit fan-out: rubric activate/retire, appeal resolve, user role-change, deactivate, and the negative case (no audit entry when only `fullName` changes).
- **Notification preferences (§8)** — `User` gained `notifyByEmail` (default true) and `notifyBySms` (default false). New `/me/preferences` GET/PATCH endpoints. Settings page at `/settings` reachable from the user-name area in the header. In-app channel is always on per §8; toggles take effect when email / SMS infrastructure is wired up.

**71 vitest tests pass** (up from 61).

## Earlier additions

- **Security middleware** — `helmet()` is on by default; `/auth/login` has a per-IP rate limit of 20 requests / 5 minutes (skipped in tests). Set `TRUST_PROXY=1` behind a load balancer.
- **Phase 4 PDF agency import** — `POST /imports/pdf-preview` sends the uploaded PDF to Anthropic (vision-capable Sonnet) with a structured-outputs schema and returns the extracted location code/name, date, shopper, narrative, and type. Surfaced as a "Phase 4: agency PDF preview" card on `/admin/import`.
- **Configurable retention via SystemConfig** — new `config.ts` reads `audio.retention_days`, `appeal.escalation_days`, `gamification.enabled` from the SystemConfig table (60s in-process cache; sane defaults). New `/admin/config` UI exposes them with help text per setting.
- **Bulk verify action plans** — `POST /action-plans/bulk-verify` accepts up to 100 IDs at a time. UI button on `/action-plans` flips all currently-completed plans in one call.

## Earlier additions

- **Audit log expansion (§11)** — now writes entries on appeal `status_change`, rubric `status_change` (activate / retire), shop `export_pdf`, user `self_data_export`, and user `role_change` / `deactivate` / `reactivate`. The admin viewer at `/admin/audit-log` already filters by entity type.
- **Rubric duplicate** — `POST /rubrics/:id/duplicate` creates a draft of the next version with all sections + questions copied. Surfaced as a "Duplicate" button on the Rubrics admin page.
- **League tier UI** — admin form now sets `tier`; the list sorts by tier ascending and shows a "rolled over" badge once the period rollover has happened.
- **Richer health endpoint** — `/health` now reports `uptimeSeconds`, `db: "ok"|"error"`, and `dbLatencyMs` (does a `SELECT 1` per call). Useful for k8s liveness/readiness or external uptime probes.

## Earlier additions

- **League auto-promotion at period end (§6.5)** — `League` gained `tier` and `rolledOverAt`. Hourly scheduler calls `rolloverLeagues` which, for each adjacent tier pair, swaps the lowest-avg store in the upper tier with the highest-avg store in the next tier down. Idempotent via `rolledOverAt`. 3 tests cover the no-op, swap, and idempotency cases.
- **Retest auto-evaluation** — when a manager links a retest shop to a training assignment, the server computes that shop's percentage on the trigger section and notifies the employee if it improved by ≥10 points.
- **Action plan + training co-creation** — when training is auto-assigned during review-complete, an action plan referencing the training module is also created so the employee sees one unified queue. 2 tests cover the with-reviewer and without-reviewer paths.
- **Action plan filters** — `/action-plans` now offers scope (mine / assigned by me / all in scope) and status filters in the UI.
- **More integration tests** — coverage for: forbidding store managers from CSV user import, district managers from rubric activate, employees from running jobs, plus rejection of wrong-secret / non-existent-user / expired tokens. **61 tests total.**

## Earlier additions

- **Training-module admin UI** — `/admin/training`: create, edit, activate/deactivate training modules. The `rubricSectionMatch` field is what auto-assignment keys off.
- **Retest linking** — managers can link a follow-up shop to a verified or completed training assignment from the Training page; the assignment then renders a "retest →" link to the new shop.
- **Bulk user CSV import** — Users page has a "+ Bulk import users from CSV" expandable. Each row's temporary password is returned in-memory only (never persisted in plain) so the admin can hand it out and rotate.
- **Calibration shop picker** — Calibration detail now offers a select-from-list instead of typing UUIDs.
- **Shop list filters** — date range (`from`/`to`), status, and type filters surfaced in the UI; backend already supported them.

## Earlier additions

- **Microlearning loop (§6.9)** — `TrainingModule` registry; on review-complete, sections scoring below 70% auto-assign the matching module (matched by section name). 5 unit tests cover the threshold, double-assign guard, and missing-module skip.
- **Hunt employee guessing (§6.5)** — employees can guess which past shop was a Hunt; correct guesses earn 10 points (no penalty for wrong guesses, per §10). One guess per campaign per employee, enforced server-side.
- **Manager weekly digest (§8)** — scheduler now generates an in-app digest notification once a week per store manager: shop count + average, queue size, open appeals, open action plans.
- **End-to-end lifecycle test** — supertest exercises shop submit → review → action plan → acknowledge → appeal → resolve, asserting on the in-memory state after each step. 50 vitest tests total.

## Earlier additions

- **Scheduled jobs** — runs every hour: action plans past their due date flip to `overdue` (notifying employee + manager), 3-day reminders go out once per plan, and attachments past `retentionUntil` are deleted from disk + the `audioFileId` pointer cleared. Disable in tests via `SCHEDULER_DISABLED=1`. Manual trigger at `POST /admin/jobs/run`.
- **Calibration check (§13)** — admin creates a calibration session; reviewers submit independent scores; `summarizeCalibration()` computes per-shop deltas and an average. Pass/fail UI badge applies the §13 8-point threshold.
- **AI sentiment** — the AI summary now includes `sentiment` (positive/neutral/negative). Surfaced as a colored badge on the shop detail; lets managers prioritize negative narratives per spec §6.9.
- **Integration tests** — supertest exercises the live Express stack with the prisma client mocked. Covers token validation, role gating on `/admin/audit-log`, and rejection of deactivated users. 38 tests total.

## Earlier additions

- **Conditional logic** — rubric questions can carry `{ requireCommentIf: <value> }` or `{ requireCommentIfIn: [...] }`. Wizard validates client-side; the API revalidates on submit and returns `400 conditional_logic_failed`.
- **Per-question photo attachments** — managers can attach photos to individual rubric answers from the shop detail page; thumbnails render inline.
- **Hunt mechanic (§6.5)** — admin can create a Hunt campaign window with scenarios; managers record reveals, which award 50 hunt-reveal points + notify the recognized employee.
- **Self-serve data export (§11)** — `/me/export` returns the employee's full data as JSON; an "Download my data" button on the employee dashboard.
- **Gamification admin** — `/admin/gamification` page with tabs for Leagues, Challenges, and Hunt campaigns.
- **Rubric drag-and-drop** — sections and questions can be reordered via native HTML5 DnD (drafts only).

## What's now implemented (Phase 4 partial)

- **AI comment summarization** — per-shop developmental summary (`summary` + `strengths` + `improvements`) and per-location theme clustering. Uses Anthropic SDK, `claude-sonnet-4-6`, adaptive thinking, structured outputs (json_schema), and a `cache_control` breakpoint on the stable system prompt for prompt caching. Vitest verifies the cache breakpoint is on the system block, not on the volatile per-shop content.
- **Agency CSV import** — admin upload → header preview → column mapping (location code, date, narrative, employee email, rubric questions) → bulk shop creation, with per-row error reporting.
- **Audit log** — admin viewer at `/admin/audit-log`. Score adjustments on reviews are written via the audit helper.
- **District dashboard** — `/districts/:name` rolls up shop count, open appeals, and per-store averages.
- **Leagues + challenges** — schema + CRUD endpoints. Standings respect §10 (top 3 + most-improved only).

## What's still intentionally not here

- **Phase 3b** — "The Hunt" mechanic (schema is in place, no UI/routes yet).
- **League auto-promotion/demotion** — the cron job to apply standings at quarter-end is not implemented.
- **Phase 4** — BisTrack integration, microlearning training modules, scheduled email digests.
- **Email / SMS** — spec calls for them; this slice is in-app only.
- **Rubric drag-and-drop** — basic add/remove only.
- **Per-question photo/audio attachments in the wizard** — attachments work for shop-level audio (Phase 2) but the wizard doesn't surface per-question uploads.

## Open spec questions (from §15) deferred

These need answers from Kyle / HR before production:

1. Source of mystery shop data going forward (agency PDF/email/CSV?)
2. Where mystery caller recordings live today
3. Appeal escalation authority (default: store_manager → district_manager)
4. Existing recognition programs the gamification layer should feed
5. Calibration owner for reviewer agreement
6. HR sign-off on employee notice + acknowledgment forms
