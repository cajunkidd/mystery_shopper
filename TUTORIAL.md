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
