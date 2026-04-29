# Stine Mystery Shop — Phase 1 Demo

A self-contained Vite + React + TypeScript demo of the Phase 1 (MVP) scorecard
and coaching loop described in `../STINE_MYSTERY_SHOP_APP_SPEC.md`.

All data is in-memory; nothing persists across reloads. The app ships seed data
covering five locations, five users with different roles, two active rubrics
(in-store visit and mystery caller), and five shops in various review states.

## Run

```
cd app
npm install
npm run dev
```

Use the **Acting as** dropdown in the top-right to switch roles. Each role sees
the surfaces appropriate to it.

## What's wired up

- **Dashboards**: employee, store manager, district manager, admin (each role
  has its own home).
- **Shop entry wizard**: 5-step manual entry (basics → rubric → answers →
  narrative → review).
- **Manager review**: write summary, apply audited score adjustment with
  required justification, award bonus points (Phase 3 hook), complete review.
- **Action plans**: create from review, employee can acknowledge / mark
  complete, manager can verify.
- **Appeals**: employee files private appeal; manager resolves with
  approve / partially approve / deny + optional score adjustment.
- **Heatmap**: store × rubric section average scores on the company dashboard.

## Not yet wired (later phases per the spec)

- Audio review (Phase 2)
- Gamification — points, badges, leagues, hunt, challenges (Phase 3)
- BisTrack integration, AI summarization, agency import (Phase 4)
- Real persistence and auth — currently a static role switcher
