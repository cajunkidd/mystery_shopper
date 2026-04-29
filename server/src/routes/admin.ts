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

  // Resolve actor names + entity labels in two batched lookups so a 50-row
  // page is at most three round-trips (audit + actors + entities-per-type).
  const actorIds = Array.from(new Set(items.map((i) => i.actorId).filter((x): x is string => !!x)));
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, fullName: true, email: true },
  });
  const actorById = new Map(actors.map((u) => [u.id, u]));

  const enriched = await Promise.all(
    items.map(async (i) => {
      const actor = i.actorId ? actorById.get(i.actorId) : null;
      const entityLabel = await resolveEntityLabel(i.entityType, i.entityId);
      return {
        ...i,
        actorLabel: actor ? `${actor.fullName} <${actor.email}>` : null,
        entityLabel,
      };
    }),
  );

  const nextBefore = items.length === limit ? items[items.length - 1].occurredAt.toISOString() : null;
  res.json({ items: enriched, nextBefore });
});

// Map entity-type + id → human-readable label. Returns null when the row was
// deleted (entries stay around even after the underlying entity is gone).
async function resolveEntityLabel(entityType: string, entityId: string): Promise<string | null> {
  switch (entityType) {
    case "user": {
      const u = await prisma.user.findUnique({
        where: { id: entityId },
        select: { fullName: true, email: true },
      });
      return u ? `${u.fullName} <${u.email}>` : null;
    }
    case "rubric": {
      const r = await prisma.rubric.findUnique({
        where: { id: entityId },
        select: { name: true, type: true, version: true },
      });
      return r ? `${r.name} (${r.type} v${r.version})` : null;
    }
    case "review": {
      const r = await prisma.review.findUnique({
        where: { id: entityId },
        select: { shop: { select: { shopDate: true, location: { select: { code: true } } } } },
      });
      return r ? `Review of ${r.shop.location.code} ${r.shop.shopDate.toISOString().slice(0, 10)}` : null;
    }
    case "appeal": {
      const a = await prisma.appeal.findUnique({
        where: { id: entityId },
        select: { shop: { select: { shopDate: true, location: { select: { code: true } } } } },
      });
      return a ? `Appeal on ${a.shop.location.code} ${a.shop.shopDate.toISOString().slice(0, 10)}` : null;
    }
    case "shop": {
      const s = await prisma.shop.findUnique({
        where: { id: entityId },
        select: { shopDate: true, location: { select: { code: true } } },
      });
      return s ? `${s.location.code} ${s.shopDate.toISOString().slice(0, 10)}` : null;
    }
    default:
      return null;
  }
}

router.get("/config", async (_req, res) => {
  const items = await prisma.systemConfig.findMany();
  res.json({ items });
});

// Deferred-email outbox: until SMTP is wired, rows are queued by notify()
// and admins can inspect them here to confirm volume and content.
router.get("/outbox", async (req, res) => {
  const status = (req.query.status as string | undefined) ?? "pending";
  const where: Record<string, unknown> = {};
  if (status === "pending") where.sentAt = null;
  else if (status === "sent") where.sentAt = { not: null };
  else if (status === "failed") where.failedAt = { not: null };
  const items = await prisma.emailOutbox.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(req.query.limit ?? 100), 500),
  });
  res.json({ items });
});

const configBody = z.object({ value: z.unknown() });
router.patch("/config/:key", async (req, res) => {
  const parsed = configBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  const item = await prisma.systemConfig.upsert({
    where: { key: req.params.key },
    update: { value: parsed.data.value as never, updatedBy: req.user!.id },
    create: { key: req.params.key, value: parsed.data.value as never, updatedBy: req.user!.id },
  });
  res.json({ item });
});

export default router;
