import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";

const router = Router();
router.use(requireAuth);

// POST /shops/:id/review — create or fetch the review (called by manager opening a shop)
router.post("/shops/:id/review", requireRole("store_manager", "district_manager", "admin"), async (req, res) => {
  const shop = await prisma.shop.findUnique({ where: { id: req.params.id } });
  if (!shop) return res.status(404).json({ error: "not_found" });
  const review = await prisma.review.upsert({
    where: { shopId: shop.id },
    update: { status: "in_progress" },
    create: { shopId: shop.id, reviewerId: req.user!.id, status: "in_progress" },
  });
  res.json({ review });
});

const patchBody = z.object({
  managerSummary: z.string().optional(),
  managerScoreAdjustment: z.number().nullable().optional(),
  managerScoreJustification: z.string().nullable().optional(),
  bonusPointsAwarded: z.number().int().min(0).max(25).nullable().optional(),
  bonusJustification: z.string().nullable().optional(),
});

router.patch("/reviews/:id", requireRole("store_manager", "district_manager", "admin"), async (req, res) => {
  const parsed = patchBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const data = parsed.data;
  if (data.managerScoreAdjustment != null && !data.managerScoreJustification) {
    return res.status(400).json({ error: "justification_required" });
  }
  if (data.bonusPointsAwarded != null && data.bonusPointsAwarded > 0 && !data.bonusJustification) {
    return res.status(400).json({ error: "bonus_justification_required" });
  }
  const review = await prisma.review.update({
    where: { id: req.params.id },
    data: { ...data, status: "in_progress" },
  });
  res.json({ review });
});

router.post("/reviews/:id/complete", requireRole("store_manager", "district_manager", "admin"), async (req, res) => {
  const review = await prisma.review.findUnique({ where: { id: req.params.id } });
  if (!review) return res.status(404).json({ error: "not_found" });
  await prisma.$transaction([
    prisma.review.update({
      where: { id: review.id },
      data: { status: "completed", reviewedAt: new Date() },
    }),
    prisma.shop.update({
      where: { id: review.shopId },
      data: { status: "action_assigned", closedAt: new Date() },
    }),
  ]);
  res.json({ ok: true });
});

export default router;
