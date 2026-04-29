import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();
router.use(requireAuth);

router.get("/me", async (req, res) => {
  const userId = req.user!.id;
  const shops = await prisma.shop.findMany({
    where: { evaluatedEmployeeId: userId, status: { not: "draft" } },
    orderBy: { shopDate: "desc" },
    take: 20,
    select: { id: true, shopDate: true, type: true, percentage: true, totalScore: true, totalMax: true, status: true },
  });
  const openPlans = await prisma.actionPlan.count({
    where: { assignedToId: userId, status: { in: ["open", "acknowledged", "in_progress", "overdue"] } },
  });
  const trailing = shops.slice(0, 3);
  const trailingAvg = trailing.length ? trailing.reduce((a, s) => a + s.percentage, 0) / trailing.length : 0;
  const personalBest = shops.reduce((a, s) => Math.max(a, s.percentage), 0);
  res.json({
    latest: shops[0] ?? null,
    trailingAvg,
    personalBest,
    openActionPlans: openPlans,
    history: shops,
  });
});

router.get("/location/:id", async (req, res) => {
  const u = req.user!;
  if (u.role === "employee") return res.status(403).json({ error: "forbidden" });
  if (u.role === "store_manager" && u.primaryLocationId !== req.params.id) return res.status(403).json({ error: "forbidden" });

  const shops = await prisma.shop.findMany({
    where: { locationId: req.params.id, status: { not: "draft" } },
    orderBy: { shopDate: "desc" },
    take: 100,
    include: { evaluatedEmployee: { select: { id: true, fullName: true } } },
  });
  const queue = await prisma.shop.findMany({
    where: { locationId: req.params.id, status: { in: ["submitted", "under_review"] } },
    orderBy: { submittedAt: "desc" },
    include: { evaluatedEmployee: { select: { id: true, fullName: true } } },
  });
  const avg = shops.length ? shops.reduce((a, s) => a + s.percentage, 0) / shops.length : 0;
  res.json({ avgPercentage: avg, queue, recent: shops });
});

router.get("/company", async (req, res) => {
  if (req.user!.role !== "admin") return res.status(403).json({ error: "forbidden" });
  const shops = await prisma.shop.findMany({
    where: { status: { not: "draft" } },
    select: { percentage: true, locationId: true, shopDate: true, type: true },
  });
  const byLocation = new Map<string, { count: number; total: number }>();
  for (const s of shops) {
    const k = s.locationId;
    const cur = byLocation.get(k) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += s.percentage;
    byLocation.set(k, cur);
  }
  const locations = await prisma.location.findMany();
  const rows = locations.map((l) => {
    const r = byLocation.get(l.id);
    return { locationId: l.id, name: l.name, code: l.code, count: r?.count ?? 0, avg: r ? r.total / r.count : 0 };
  });
  res.json({ totalShops: shops.length, locations: rows });
});

export default router;
