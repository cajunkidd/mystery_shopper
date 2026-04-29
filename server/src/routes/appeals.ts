import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";

const router = Router();
router.use(requireAuth);

const fileBody = z.object({
  reason: z.string().min(1),
  requestedChange: z.string().optional(),
});

router.post("/shops/:id/appeals", async (req, res) => {
  const parsed = fileBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const shop = await prisma.shop.findUnique({ where: { id: req.params.id } });
  if (!shop) return res.status(404).json({ error: "shop_not_found" });
  if (shop.evaluatedEmployeeId !== req.user!.id) return res.status(403).json({ error: "forbidden" });

  const appeal = await prisma.appeal.create({
    data: {
      shopId: shop.id,
      filedById: req.user!.id,
      reason: parsed.data.reason,
      requestedChange: parsed.data.requestedChange,
    },
  });
  await prisma.shop.update({ where: { id: shop.id }, data: { status: "appealed" } });
  res.status(201).json({ appeal });
});

router.get("/appeals", async (req, res) => {
  const u = req.user!;
  let where: Record<string, unknown> = {};
  if (u.role === "employee") where = { filedById: u.id };
  else if (u.role === "store_manager") where = { shop: { locationId: u.primaryLocationId ?? "__none__" } };
  const scope = req.query.scope as string | undefined;
  if (scope === "open") where = { ...where, status: { in: ["open", "under_review"] } };
  const appeals = await prisma.appeal.findMany({
    where,
    orderBy: { filedAt: "desc" },
    include: {
      shop: { select: { id: true, shopDate: true, locationId: true, percentage: true } },
      filedBy: { select: { id: true, fullName: true } },
    },
  });
  res.json({ appeals });
});

const resolveBody = z.object({
  status: z.enum(["approved", "partially_approved", "denied"]),
  resolutionNotes: z.string().min(1),
  scoreAdjustmentApplied: z.number().nullable().optional(),
});

router.post("/appeals/:id/resolve", requireRole("store_manager", "district_manager", "admin"), async (req, res) => {
  const parsed = resolveBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const appeal = await prisma.appeal.update({
    where: { id: req.params.id },
    data: {
      status: parsed.data.status,
      resolutionNotes: parsed.data.resolutionNotes,
      scoreAdjustmentApplied: parsed.data.scoreAdjustmentApplied,
      resolverId: req.user!.id,
      resolvedAt: new Date(),
    },
  });
  // Move shop back out of appealed status
  await prisma.shop.update({
    where: { id: appeal.shopId },
    data: { status: "closed" },
  });
  res.json({ appeal });
});

router.post("/appeals/:id/escalate", requireRole("store_manager", "admin"), async (req, res) => {
  const appeal = await prisma.appeal.update({
    where: { id: req.params.id },
    data: { status: "under_review", resolverId: null },
  });
  res.json({ appeal });
});

export default router;
