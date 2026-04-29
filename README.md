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
