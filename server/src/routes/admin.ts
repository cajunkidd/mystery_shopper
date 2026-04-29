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

router.get("/audit-log", async (req, res) => {
  const where: Record<string, unknown> = {};
  if (req.query.entityType) where.entityType = req.query.entityType;
  if (req.query.actorId) where.actorId = req.query.actorId;
  const items = await prisma.auditLog.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: Number(req.query.limit ?? 100),
  });
  res.json({ items });
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
