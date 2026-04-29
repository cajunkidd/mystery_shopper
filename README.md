# Stine Mystery Shopper

Internal Stine LLC platform for managing mystery shop and mystery caller evaluations across all locations. Replaces the current spreadsheet/email workflow with a scorecard, coaching, and (later) gamification loop.

The full product spec lives in [`STINE_MYSTERY_SHOP_APP_SPEC.md`](./STINE_MYSTERY_SHOP_APP_SPEC.md). This README covers only how to download, run, and test the codebase.

> **Status:** Phase 1 scaffold. The app boots, the frontend talks to the backend, and the points engine is unit-tested. Most spec features are not yet implemented — see the spec for the phased plan.

---

## Repository layout

```
mystery_shopper/
├── apps/
│   ├── backend/        Node + TypeScript + Express API (port 4000)
│   └── frontend/       React + TypeScript + Vite UI    (port 5173)
├── STINE_MYSTERY_SHOP_APP_SPEC.md
└── package.json        npm workspaces root
```

---

## Prerequisites

- **Node.js ≥ 20** (`node --version`)
- **npm ≥ 10** (ships with Node 20)
- **git**

PostgreSQL is called out in the spec but is not yet required — the Phase 1 scaffold has no database wiring.

---

## Download

```bash
git clone <repo-url> mystery_shopper
cd mystery_shopper
git checkout claude/add-download-testing-guide-A2IyH   # or main once merged
npm install
```

`npm install` at the root installs all workspace dependencies in one pass.

---

## Run

Open two terminals from the repo root.

**Terminal 1 — backend** (http://localhost:4000):

```bash
npm run dev --workspace @stine/backend
```

**Terminal 2 — frontend** (http://localhost:5173):

```bash
npm run dev --workspace @stine/frontend
```

Visit http://localhost:5173. You should see the scaffold page with a JSON blob from the backend health endpoint:

```json
{ "status": "ok", "service": "mystery-shopper-backend" }
```

The Vite dev server proxies `/api/*` to the backend, so the frontend code talks to `/api/v1/...` without CORS gymnastics.

You can also start both at once with `npm run dev` from the root.

### Useful endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/health` | liveness probe |
| GET | `/api/v1/shops` | empty list placeholder until DB lands |

---

## Test

Run all tests (every workspace):

```bash
npm test
```

Run a single workspace:

```bash
npm test --workspace @stine/backend
npm test --workspace @stine/frontend
```

Watch mode while developing the backend:

```bash
npm run test:watch --workspace @stine/backend
```

### What's covered today

- `apps/backend/src/points/engine.test.ts` — unit tests for the spec §6.5 points engine: type multipliers, streak accumulation/cap, improvement bonus threshold, and manager-bonus clamping.

### What still needs tests (per spec §13)

- Score calculation across full rubrics
- Conditional logic evaluator (e.g. "if Q4 = No, Q5 comment required")
- Permission middleware (the §9 matrix)
- Shop → review → action plan → appeal lifecycle integration test

Add tests next to the code under test, named `*.test.ts` / `*.test.tsx`. Vitest picks them up automatically.

---

## Build

```bash
npm run build               # both workspaces
npm run build --workspace @stine/backend
npm run build --workspace @stine/frontend
```

Backend output: `apps/backend/dist/`. Run with `npm start --workspace @stine/backend`.
Frontend output: `apps/frontend/dist/` (static assets — serve from any CDN or behind the backend).

---

## Manual smoke test

1. `npm install` succeeds.
2. `npm test` is green.
3. `npm run dev --workspace @stine/backend` logs `[backend] listening on http://localhost:4000`.
4. `curl http://localhost:4000/api/v1/health` returns `{"status":"ok",...}`.
5. `npm run dev --workspace @stine/frontend` opens http://localhost:5173 and shows the same JSON pulled through the proxy.

If all five pass, the scaffold is healthy. From here, follow the spec phases in order — Phase 1 acceptance (§2) is the next real milestone.

---

## Troubleshooting

- **`EADDRINUSE` on 4000 or 5173** — another process is on the port. Either kill it or set `PORT=4001 npm run dev --workspace @stine/backend` and update `apps/frontend/vite.config.ts` proxy target.
- **Frontend shows "Pinging backend…" forever** — the backend isn't running, or the proxy target in `vite.config.ts` doesn't match the backend's port.
- **Node version mismatch** — install Node 20 LTS via `nvm install 20 && nvm use 20`.
