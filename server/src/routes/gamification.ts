import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";

const router = Router();
router.use(requireAuth);

router.get("/me", async (req, res) => {
  const userId = req.user!.id;
  const ledger = await prisma.pointsLedger.findMany({
    where: { userId },
    orderBy: { awardedAt: "desc" },
    take: 50,
  });
  const total = ledger.reduce((a, l) => a + l.points, 0);
  const badges = await prisma.userBadge.findMany({
    where: { userId },
    include: { badge: true },
    orderBy: { earnedAt: "desc" },
  });
  res.json({ totalPoints: total, recent: ledger, badges });
});

// Leaderboard — only top 3 + most-improved (per §10 anti-pattern: never show bottom-of-pack).
router.get("/leaderboard", async (req, res) => {
  const scope = (req.query.scope as string) ?? "store";
  const u = req.user!;
  let userIds: string[] = [];
  if (scope === "store") {
    const locId = (req.query.locationId as string | undefined) ?? u.primaryLocationId;
    if (!locId) return res.json({ scope, top: [], mostImproved: null });
    const users = await prisma.user.findMany({
      where: { primaryLocationId: locId, role: "employee", active: true },
      select: { id: true },
    });
    userIds = users.map((x) => x.id);
  } else if (scope === "district") {
    const ids = u.role === "admin" ? undefined : u.districtIds;
    const locs = await prisma.location.findMany({
      where: ids ? { district: { in: ids } } : {},
      select: { id: true },
    });
    const locIds = locs.map((l) => l.id);
    const users = await prisma.user.findMany({
      where: { primaryLocationId: { in: locIds }, role: "employee", active: true },
      select: { id: true },
    });
    userIds = users.map((x) => x.id);
  } else if (scope === "company") {
    const users = await prisma.user.findMany({
      where: { role: "employee", active: true },
      select: { id: true },
    });
    userIds = users.map((x) => x.id);
  }

  if (userIds.length === 0) return res.json({ scope, top: [], mostImproved: null });

  const sums = await prisma.pointsLedger.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds } },
    _sum: { points: true },
  });
  const userMap = new Map(
    (await prisma.user.findMany({ where: { id: { in: userIds } } })).map((u2) => [u2.id, u2.fullName]),
  );
  const ranked = sums
    .map((s) => ({ userId: s.userId, fullName: userMap.get(s.userId) ?? "?", points: s._sum.points ?? 0 }))
    .sort((a, b) => b.points - a.points);
  const top = ranked.slice(0, 3);

  // Most improved: largest delta in average percentage between trailing 30 days and prior 30 days.
  const now = Date.now();
  const cutoffRecent = new Date(now - 30 * 86400 * 1000);
  const cutoffPrior = new Date(now - 60 * 86400 * 1000);
  const shops = await prisma.shop.findMany({
    where: {
      evaluatedEmployeeId: { in: userIds },
      shopDate: { gte: cutoffPrior },
      status: { not: "draft" },
    },
    select: { evaluatedEmployeeId: true, shopDate: true, percentage: true },
  });
  type Bucket = { recent: number[]; prior: number[] };
  const buckets = new Map<string, Bucket>();
  for (const s of shops) {
    const id = s.evaluatedEmployeeId!;
    const cur = buckets.get(id) ?? { recent: [], prior: [] };
    if (s.shopDate >= cutoffRecent) cur.recent.push(s.percentage);
    else cur.prior.push(s.percentage);
    buckets.set(id, cur);
  }
  let best: { userId: string; fullName: string; delta: number } | null = null;
  for (const [id, b] of buckets) {
    if (b.recent.length === 0 || b.prior.length === 0) continue;
    const recentAvg = b.recent.reduce((a, x) => a + x, 0) / b.recent.length;
    const priorAvg = b.prior.reduce((a, x) => a + x, 0) / b.prior.length;
    const delta = recentAvg - priorAvg;
    if (delta > 0 && (!best || delta > best.delta)) {
      best = { userId: id, fullName: userMap.get(id) ?? "?", delta };
    }
  }
  res.json({ scope, top, mostImproved: best });
});

router.get("/badges", async (_req, res) => {
  const badges = await prisma.badge.findMany({ where: { active: true }, orderBy: { category: "asc" } });
  res.json({ badges });
});

// Manager bonus is awarded inline via Review.bonusPointsAwarded; this endpoint covers ad-hoc bonuses.
router.post("/manager-bonus", requireRole("store_manager", "district_manager", "admin"), async (req, res) => {
  const { userId, points, reason } = req.body as { userId?: string; points?: number; reason?: string };
  if (!userId || !points || !reason) return res.status(400).json({ error: "invalid_body" });
  if (points <= 0 || points > 25) return res.status(400).json({ error: "out_of_range" });
  const entry = await prisma.pointsLedger.create({
    data: {
      userId,
      sourceType: "manager_bonus",
      points,
      reason,
      awardedById: req.user!.id,
    },
  });
  res.status(201).json({ entry });
});

export default router;
