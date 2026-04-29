import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { runJobs } from "../jobs.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.post("/jobs/run", async (_req, res) => {
  const result = await runJobs();
  res.json({ result });
});

router.get("/overview", async (_req, res) => {
  const [
    users,
    activeUsers,
    locations,
    shops,
    submittedShops,
    actionPlans,
    overduePlans,
    openAppeals,
    badgesEarned,
    trainingOpen,
    rubricsActive,
    leaguesActive,
    auditLast24h,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { active: true } }),
    prisma.location.count(),
    prisma.shop.count({ where: { status: { not: "draft" } } }),
    prisma.shop.count({ where: { status: { in: ["submitted", "under_review"] } } }),
    prisma.actionPlan.count(),
    prisma.actionPlan.count({ where: { status: "overdue" } }),
    prisma.appeal.count({ where: { status: { in: ["open", "under_review"] } } }),
    prisma.userBadge.count(),
    prisma.trainingAssignment.count({ where: { status: { in: ["assigned", "completed"] } } }),
    prisma.rubric.count({ where: { status: "active" } }),
    prisma.league.count({ where: { rolledOverAt: null } }),
    prisma.auditLog.count({ where: { occurredAt: { gte: new Date(Date.now() - 86400 * 1000) } } }),
  ]);

  res.json({
    users: { total: users, active: activeUsers },
    locations,
    shops: { graded: shops, queue: submittedShops },
    actionPlans: { total: actionPlans, overdue: overduePlans },
    openAppeals,
    badgesEarned,
    trainingOpen,
    rubricsActive,
    leaguesActive,
    auditLast24h,
  });
});

router.get("/audit-log", async (req, res) => {
  const where: Record<string, unknown> = {};
  if (req.query.entityType) where.entityType = req.query.entityType;
  if (req.query.actorId) where.actorId = req.query.actorId;
  // Cursor pagination: ?before=<ISO timestamp> returns rows older than that.
  if (req.query.before) {
    where.occurredAt = { lt: new Date(String(req.query.before)) };
  }
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const items = await prisma.auditLog.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: limit,
  });
  const nextBefore = items.length === limit ? items[items.length - 1].occurredAt.toISOString() : null;
  res.json({ items, nextBefore });
});

router.get("/config", async (_req, res) => {
  const items = await prisma.systemConfig.findMany();
  res.json({ items });
});

const configBody = z.object({ value: z.unknown() });
router.patch("/config/:key", async (req, res) => {
  const parsed = configBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const item = await prisma.systemConfig.upsert({
    where: { key: req.params.key },
    update: { value: parsed.data.value as never, updatedBy: req.user!.id },
    create: { key: req.params.key, value: parsed.data.value as never, updatedBy: req.user!.id },
  });
  res.json({ item });
});

export default router;
