# Stine Mystery Shop & Caller Performance Platform

Internal Stine LLC application. See `STINE_MYSTERY_SHOP_APP_SPEC.md` for the
full build specification.

> **Status:** Scaffold only. None of the Phase 1 features described in the
> spec have been implemented yet. The `app/` directory is an empty
> Vite + React + TypeScript skeleton so the project can be launched locally.

## Prerequisites

- Node.js 20+ (tested on 22)
- npm 10+

## Launch (development)

```bash
cd app
npm install        # first time only
npm run dev
```

Vite will print a local URL (default `http://localhost:5173`). Open it in a
browser.

## Production build

```bash
cd app
npm run build      # outputs to app/dist
npm run preview    # serves the built bundle locally
```

## Type-check / lint

```bash
cd app
npm run lint
```

## Repo layout

```
.
├── STINE_MYSTERY_SHOP_APP_SPEC.md   # authoritative build spec
├── README.md                        # this file
└── app/                             # Vite + React + TypeScript frontend scaffold
    ├── src/
    ├── index.html
    ├── package.json
    └── vite.config.ts
```

A backend (Node + TypeScript), database (PostgreSQL), and auth layer are
called for by the spec but have not been added yet — they will come with
Phase 1 implementation work.
