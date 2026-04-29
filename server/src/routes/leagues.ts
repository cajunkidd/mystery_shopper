import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";

const router = Router();
router.use(requireAuth);

router.get("/leagues", async (_req, res) => {
  const leagues = await prisma.league.findMany({ orderBy: { periodStart: "desc" } });
  res.json({ leagues });
});

const upsertLeague = z.object({
  name: z.string().min(1),
  tier: z.number().int().min(1).default(1),
  periodStart: z.string(),
  periodEnd: z.string(),
  storeIds: z.array(z.string().uuid()).min(2).max(8),
});

router.post("/leagues", requireRole("admin"), async (req, res) => {
  const parsed = upsertLeague.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  const league = await prisma.league.create({
    data: {
      name: parsed.data.name,
      tier: parsed.data.tier,
      periodStart: new Date(parsed.data.periodStart),
      periodEnd: new Date(parsed.data.periodEnd),
      storeIds: parsed.data.storeIds,
    },
  });
  res.status(201).json({ league });
});

router.get("/leagues/:id/standings", async (req, res) => {
  const league = await prisma.league.findUnique({ where: { id: req.params.id } });
  if (!league) return res.status(404).json({ error: "not_found" });

  const shops = await prisma.shop.findMany({
    where: {
      locationId: { in: league.storeIds },
      status: { not: "draft" },
      shopDate: { gte: league.periodStart, lte: league.periodEnd },
    },
    select: { locationId: true, percentage: true },
  });
  const byLoc = new Map<string, { count: number; total: number }>();
  for (const s of shops) {
    const cur = byLoc.get(s.locationId) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += s.percentage;
    byLoc.set(s.locationId, cur);
  }
  const locations = await prisma.location.findMany({ where: { id: { in: league.storeIds } } });
  const standings = locations
    .map((l) => {
      const r = byLoc.get(l.id);
      return {
        locationId: l.id,
        name: l.name,
        code: l.code,
        avg: r ? r.total / r.count : 0,
        count: r?.count ?? 0,
      };
    })
    .sort((a, b) => b.avg - a.avg);
  // Per §10: only top 3 + most-improved are shown publicly. We return the full ranking
  // for admin views; UI is responsible for trimming to top 3 + most-improved.
  res.json({ league, standings });
});

// Challenges
router.get("/challenges", async (_req, res) => {
  const challenges = await prisma.challenge.findMany({
    where: { active: true },
    orderBy: { startsAt: "desc" },
  });
  res.json({ challenges });
});

const challengeBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startsAt: z.string(),
  endsAt: z.string(),
  metric: z.enum(["avg_score", "score_above_threshold_count", "category_avg"]),
  category: z.string().nullable().optional(),
  threshold: z.number().nullable().optional(),
});

router.post("/challenges", requireRole("admin"), async (req, res) => {
  const parsed = challengeBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  const c = await prisma.challenge.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      metric: parsed.data.metric,
      category: parsed.data.category ?? null,
      threshold: parsed.data.threshold ?? null,
      active: true,
    },
  });
  res.status(201).json({ challenge: c });
});

export default router;
