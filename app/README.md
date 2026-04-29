# Stine Mystery Shop — Demo

A self-contained Vite + React + TypeScript demo of the platform described in
`../STINE_MYSTERY_SHOP_APP_SPEC.md`. All data is in-memory; nothing persists
across reloads. Covers all four phases of the spec at a demo level.

## Run

```
cd app
npm install
npm run dev
```

Use the **Acting as** dropdown in the top-right to switch roles. Each role
sees a different set of nav items and surfaces.

## Phase 1 — Core scorecard & coaching loop

- Role-aware app shell (employee / store manager / district manager / admin)
- Dashboards per role
- 5-step shop entry wizard (basics → rubric → answers → narrative → review)
- Manager review with audited score adjustment + bonus points + justification
- Action plans (create / acknowledge / mark complete / verify)
- Private appeals (file / approve / partially approve / deny + adjustment)
- Per-shop discussion thread
- Inbox dropdown in the top bar
- Branded PDF export via print stylesheet
- Admin: rubric viewer, user list, system config, audit log
- Employee: data export (JSON), notification preferences

## Phase 2 — Audio review

- Caller-shop audio player with simulated playback
- Click-to-seek timeline with timestamp-anchored comments
- Markers on timeline for each comment

## Phase 3 — Gamification (toggleable per location)

- Points engine with shop score + type multiplier + ≥85 streak bonus +
  improvement bonus + manager bonus
- Append-only points ledger per employee
- Badges across four categories (absolute / improvement / tenure / special)
- League standings with top-3 + most-improved (no bottom-of-pack ranking
  per spec §10)
- Store challenges with progress
- The Hunt mechanic with codeword scenarios + reveals
- Personal-best dashboard with score trend chart
- Admin toggle: gamification on/off company-wide and per location

## Phase 4 — Cross-system intelligence

- BisTrack mock data (sales, AOV, foot traffic) for all locations
- Cross-system analytics page with PK × AOV correlation insight
- AI insights panel on each shop (canned summary + theme clustering +
  sentiment via the same Anthropic API wrapper as Contract Manager)
- Microlearning modules tagged by category, recommended based on weakest
  rubric section in recent shops
- Manager weekly digest preview (email/print)
- Agency CSV import wizard with field-mapping preview

## Suggested demo path

1. Start as **Marcus Trahan** (store manager) — see review queue, open
   `shop-004` to walk through the manager review flow.
2. Switch to **Tyler Fontenot** (employee) — see personal-best chart, open
   `shop-001` to see manager review, action plan, AI insights, and discussion.
3. Switch to **Ben Hebert** — open `shop-003` (caller) to demo the audio
   review timeline + the open appeal.
4. Switch to **Kyle Manuel** (admin) — visit Analytics for cross-system
   insights, Agency Import to bring in the sample CSV, System Config to
   toggle gamification per-location, and Audit Log.
5. Toggle gamification off in System Config and confirm the core app
   still works (per spec §6.5 acceptance criteria).
