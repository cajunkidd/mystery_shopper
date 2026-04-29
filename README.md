# Stine Mystery Shop & Caller Performance Platform

Internal app for managing mystery-shop and mystery-caller evaluations across Stine LLC's 14 locations. See `STINE_MYSTERY_SHOP_APP_SPEC.md` for the authoritative build spec.

**Status:** Phases 1–3 (Core, Audio Review, Gamification) plus most of Phase 4 (AI summaries + theme clustering, sentiment, agency CSV + PDF import, microlearning loop). The base app is feature-complete against the spec apart from the explicit out-of-scope items at the bottom of this file.

## Stack

- **Server** (`server/`): Node 20 + TypeScript, Express, Prisma ORM, PostgreSQL, JWT auth, Zod validation, helmet + rate-limit, multer, PDFKit, Anthropic SDK
- **Client** (`client/`): React 18 + TypeScript, Vite, Tailwind, React Router, vitest + RTL
- **Tests:** 87 total (71 server + 16 client)

## Quickstart

### Prerequisites

- Node 20+
- PostgreSQL 14+ (local Docker is fine)

### Backend

```bash
cd server
cp .env.example .env       # set DATABASE_URL and JWT_SECRET; ANTHROPIC_API_KEY is optional
npm install
npm run prisma:generate
npm run prisma:migrate     # creates the database schema
npm run seed               # 14 locations + sample users + active rubrics
npm run seed:demo          # optional: 8 sample shops, 1 appeal, 2 action plans, 1 league
npm run dev                # API on http://localhost:4000
```

### Frontend

```bash
cd client
npm install
npm run dev                # http://localhost:5173 — proxies /api to :4000
```

### Docker (one-command bring-up)

```bash
docker compose up --build
# web → http://localhost:8080, api → http://localhost:4000, postgres → :5432
docker compose exec api npm run seed       # one-time
docker compose exec api npm run seed:demo  # optional sample data
```

`docker-compose.yml` boots Postgres + the API + an nginx-served SPA. The API container runs `prisma migrate deploy` on startup, so you don't need to migrate manually. Pass `ANTHROPIC_API_KEY` from your shell environment to enable the AI features.

## Environment

| Variable             | Required | Default                  | Notes                                                |
| -------------------- | -------- | ------------------------ | ---------------------------------------------------- |
| `DATABASE_URL`       | yes      | —                        | Postgres connection string                           |
| `JWT_SECRET`         | yes      | —                        | Sign secret for session JWTs (7-day expiry)          |
| `CLIENT_ORIGIN`      | no       | `http://localhost:5173`  | CORS origin allowlist                                |
| `ANTHROPIC_API_KEY`  | no       | —                        | Enables `/shops/:id/summary`, theme clustering, PDF import (else 503) |
| `ANTHROPIC_MODEL`    | no       | `claude-sonnet-4-6`      | Per spec §6.9 ("most current Sonnet")                |
| `TRUST_PROXY`        | no       | unset                    | Set to `1` behind a load balancer                    |
| `SCHEDULER_DISABLED` | no       | unset                    | Set to `1` to skip the in-process scheduler          |
| `PORT`               | no       | `4000`                   | API port                                             |

## Seeded test users

| Email                        | Password       | Role             |
|------------------------------|----------------|------------------|
| kyle@stine.test              | admin1234      | admin            |
| manager.sulphur@stine.test   | manager1234    | store_manager    |
| manager.lc@stine.test        | manager1234    | store_manager    |
| district.sw@stine.test       | district1234   | district_manager |
| alex.employee@stine.test     | employee1234   | employee         |
| robin.employee@stine.test    | employee1234   | employee         |
| casey.employee@stine.test    | employee1234   | employee         |

## Phase 1 acceptance walkthrough

1. Sign in as `manager.sulphur@stine.test`. Click **Enter Shop**, run the wizard for an Alex / Robin shop, submit.
2. Sign in as `alex.employee@stine.test` — see the shop in your list and dashboard tiles.
3. Back as the manager, open the shop. Fill **Manager review**, add an action plan, click **Mark review complete**.
4. As Alex, **Acknowledge** and **Mark complete** the action plan; optionally **File an appeal**.
5. Manager resolves the appeal under **Appeals**.
6. **Export PDF** from any shop detail page.

## Repo layout

```
server/
  prisma/schema.prisma          25 models — see §4 of the spec
  prisma/seed.ts                base seed (locations, users, rubrics, badges)
  prisma/seed-demo.ts           idempotent demo data (sample shops, plans, etc.)
  src/index.ts, app.ts          Express bootstrap + buildApp() for tests
  src/auth.ts                   JWT + role middleware
  src/scoring.ts                per-question type scoring (yes_no, scale_1_5, etc.)
  src/conditional.ts            requireCommentIf / requireCommentIfIn
  src/points.ts, badges.ts      Phase 3 points engine + badge evaluator
  src/leagues.ts                Phase 3 league rollover (top 3 + most-improved)
  src/microlearning.ts          Phase 4 auto-assign training on low section scores
  src/calibration.ts            Phase 3 reviewer-agreement math (§13)
  src/ai.ts                     Anthropic SDK wrapper (cached system prompt)
  src/jobs.ts                   hourly scheduler: overdue plans, retention, digests, league rollover
  src/audit.ts, logging.ts      audit trail + request logging
  src/uploads.ts, config.ts     multer + SystemConfig-backed runtime config
  src/routes/                   30+ route files, mostly /api/v1/*
  src/*.test.ts                 71 vitest tests

client/
  src/main.tsx, App.tsx         React Router + ErrorBoundary + lazy admin pages
  src/auth.tsx, api.ts          JWT auth context + fetch wrapper
  src/components/Layout.tsx     top nav + employee mobile bottom nav
  src/components/AudioReview*   §6.7 player with click-to-seek anchored comments
  src/components/NotificationBell.tsx
  src/lib/{csv,aging}.ts        extracted utilities (also tested)
  src/pages/                    employee-facing pages
  src/pages/admin/              admin pages (lazy-loaded)
  src/**/*.test.{ts,tsx}        16 vitest + RTL tests
```

## What's built

The full Phase 1–3 surface plus most of Phase 4. Quick tour by spec section:

- §4 **Data model** — 25 Prisma models covering core, gamification, audit, calibration, training, hunt
- §5 **API** — `/api/v1/_routes` enumerates the surface; auto-generated from Express's router stack
- §6.1 **Rubric builder** — admin UI with drag-and-drop reordering, conditional logic, photo/audio question types, draft → activate → retire (versioned), duplicate-as-new-draft
- §6.2 **Shop entry** — 5-step wizard, draft save, conditional-logic validation, per-question photo/audio uploads
- §6.3 **Manager review** — review queue (oldest-first, with aging badges), score adjustment + audited justification, manager bonus, action plans, AI summary panel
- §6.4 **Employee view** — dashboard with personal-best + trailing-3 + open action plans, shop list, appeals
- §6.5 **Gamification** — append-only PointsLedger, badges (permanent), leagues with auto-promotion at period-end, challenges, Hunt campaigns + employee guessing, leaderboards (top 3 + most-improved per §10)
- §6.6 **Dashboards** — employee, store, district, company; heatmap (location × section)
- §6.7 **Audio review** — multer upload, audio player with timestamp-anchored comments, manager-release gating
- §6.8 **PDF export** — branded per-shop PDF including answers, narrative, manager summary, action plans
- §6.9 **AI** — `summarizeShop` (developmental summary + sentiment), `clusterThemes`, `extractShopFromPdf` agency import. Adaptive thinking, structured outputs, prompt caching on the stable system prompt
- §7 **UI/UX** — mobile-first employee bottom nav, no bottom-of-pack rankings, additive points (no decay)
- §8 **Notifications** — in-app bell; user-level email/sms preferences (forward-looking)
- §9 **Permissions** — role middleware enforces the matrix; supertest covers the matrix
- §11 **Privacy** — audit log on score changes/exports/role changes/deactivations; configurable retention via SystemConfig; self-serve `/me/export`
- §12 **Imports** — CSV + Anthropic-powered PDF preview
- §13 **Calibration** — sessions + entries + average-delta math with the 8-point pass/fail threshold
- §14 **Out of scope** — respected (no recruiting, no GPS, no multi-language, no e-commerce)

## What's not built

These items are either deferred or genuinely out of scope:

- **BisTrack integration (§4 Phase 4)** — needs the actual data pipeline at Stine; placeholder only
- **Real email / SMS sending** — `notifyByEmail` / `notifyBySms` toggles exist; no SMTP / Twilio wiring
- **Multi-instance scheduling** — current scheduler runs in-process via `setInterval`; for >1 replica use pg-cron or BullMQ
- **Generated Prisma migration files** — `prisma migrate dev` requires a real Postgres to generate. The Docker image runs `prisma migrate deploy` with whatever's in `prisma/migrations/`, which is currently empty — first deploy needs a `prisma migrate dev --name init` against a fresh DB
- **OpenAPI spec** — auto `GET /_routes` is the lighter substitute
- **More component RTL tests** — coverage exists for NotFound / Login / Settings; the rest of the UI has unit-level coverage on extracted utilities (CSV, aging) plus the integration / lifecycle / audit-fanout tests on the server side

Confirm before launch (per spec §15):

1. Source of mystery-shop data (agency PDF / email / CSV?)
2. Where mystery-caller recordings live today
3. Appeal escalation authority (default: store_manager → district_manager)
4. Existing recognition programs the gamification layer should feed
5. Calibration owner for reviewer agreement
6. HR sign-off on employee notice + acknowledgment forms

## Tests

```bash
cd server && npm test     # 71 vitest tests, ~2s
cd client && npm test     # 16 vitest tests, ~3s
```

CI runs both jobs on every push / PR — see `.github/workflows/ci.yml`.

## Operations

- **Health:** `GET /api/v1/health` returns `ok`, DB latency, AI configured-or-not, scheduler enabled-or-not. Use for k8s liveness/readiness.
- **Version:** `GET /api/v1/version` returns `{ version, node }`.
- **Routes:** `GET /api/v1/_routes` enumerates every registered endpoint.
- **Admin overview:** `/admin` in the UI shows operational counts + a "Run scheduler now" button.
- **Logs:** one line per response with method/path/status/ms; 5xx routes to `console.error`.

## Changelog

Built across many small passes; see `git log` for the chronological detail. The high-level milestones, in order:

1. Phase 1 MVP scaffold (auth, rubric authoring, shop wizard, manager review, action plans, appeals, dashboards, PDF export)
2. Phase 2 audio review + Phase 3 gamification core (points engine, badges, leaderboard, notifications, heatmap)
3. Phase 4 partial: Anthropic AI summaries, agency CSV import, audit log, leagues, challenges, district dashboard
4. Conditional logic, Hunt mechanic, self-serve data export, gamification admin, rubric drag-and-drop
5. Scheduled jobs (overdue plans, retention, digests), calibration, AI sentiment, integration tests
6. Microlearning loop, Hunt employee guessing, weekly digest, end-to-end lifecycle test
7. Training-module admin, retest linking, calibration shop picker, bulk user import, shop list filters
8. League auto-promotion, retest auto-evaluation, training+plan co-creation, more permission tests
9. Audit-log expansion + admin viewer, rubric duplicate, league tier UI, richer health endpoint
10. Helmet + login rate limit, Phase 4 PDF agency import, configurable retention, bulk verify
11. Tests for PDF extract + audit fan-out, notification preferences
12. Schema indexes, bulk AI summary, oldest-first review queue
13. League standings UI, verification notes, shop comment thread
14. Compare two shops side-by-side, code-split admin pages
15. 404 + ErrorBoundary, frontend test setup, `/_routes` auto-doc
16. Wizard photo/audio file inputs (closes wizard rubric coverage)
17. Admin overview, `/health` enrichment, first RTL component test
18. Pagination, bulk reassign, second RTL test (and an a11y fix on Login)
19. User picker for bulk reassign, settings data export, cache headers
20. Demo seed + mobile bottom nav for employees
21. Friendly audit-log labels + Settings RTL test
22. Docker setup, response compression, prod-gate dev creds
23. GitHub Actions CI, request logging, `/version` endpoint
