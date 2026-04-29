# Stine Mystery Shop & Caller Performance Platform

Internal app for managing mystery shop and mystery caller evaluations across Stine LLC's 14 locations. See `STINE_MYSTERY_SHOP_APP_SPEC.md` for the authoritative build spec.

**Status:** Phase 1 MVP plus Phase 2 audio review and the Phase 3 gamification core (points engine, badges, leaderboard, notifications, heatmap).

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

## What's still intentionally not here

- **Phase 3b** — "The Hunt" mechanic (schema is in place, no UI/routes yet).
- **Phase 3** — leagues + challenges (schema is in place; promotions/demotions logic deferred until baseline data exists).
- **Phase 4** — agency CSV import, BisTrack integration, Anthropic-powered comment summarization.
- **Email / SMS** — spec calls for them; this slice is in-app only.
- **Rubric drag-and-drop** — basic add/remove only.
- **Photo/video evidence on shop answers** — attachments support exists but the wizard UI doesn't surface per-question uploads yet.

## Open spec questions (from §15) deferred

These need answers from Kyle / HR before production:

1. Source of mystery shop data going forward (agency PDF/email/CSV?)
2. Where mystery caller recordings live today
3. Appeal escalation authority (default: store_manager → district_manager)
4. Existing recognition programs the gamification layer should feed
5. Calibration owner for reviewer agreement
6. HR sign-off on employee notice + acknowledgment forms
