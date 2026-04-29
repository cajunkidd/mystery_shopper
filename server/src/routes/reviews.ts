import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { awardForCompletedShop } from "../points.js";
import { evaluateBadgesForUser } from "../badges.js";
import { notify } from "../notifications.js";
import { audit } from "../audit.js";
import { assignTrainingForLowSections } from "../microlearning.js";

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
  const before = await prisma.review.findUnique({ where: { id: req.params.id } });
  const review = await prisma.review.update({
    where: { id: req.params.id },
    data: { ...data, status: "in_progress" },
  });
  // §11: every score adjustment is logged.
  if (data.managerScoreAdjustment != null && before?.managerScoreAdjustment !== data.managerScoreAdjustment) {
    await audit(prisma, req, "review", review.id, "score_change",
      { adjustment: before?.managerScoreAdjustment ?? null },
      { adjustment: data.managerScoreAdjustment, justification: data.managerScoreJustification });
  }
  res.json({ review });
});

router.post("/reviews/:id/complete", requireRole("store_manager", "district_manager", "admin"), async (req, res) => {
  const review = await prisma.review.findUnique({
    where: { id: req.params.id },
    include: { shop: true },
  });
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

  // Phase 3: award points + evaluate badges, but only when an employee is being evaluated.
  let breakdown: { sourceType: string; points: number; reason: string }[] = [];
  let earnedBadges: string[] = [];
  if (review.shop.evaluatedEmployeeId) {
    breakdown = await awardForCompletedShop(prisma, {
      userId: review.shop.evaluatedEmployeeId,
      shopId: review.shop.id,
      shopType: review.shop.type,
      percentage: review.shop.percentage,
      bonusPointsAwarded: review.bonusPointsAwarded,
      bonusJustification: review.bonusJustification,
      awardedById: review.reviewerId,
    });
    earnedBadges = await evaluateBadgesForUser(prisma, review.shop.evaluatedEmployeeId, {
      id: review.shop.id,
      type: review.shop.type,
      percentage: review.shop.percentage,
      shopDate: review.shop.shopDate,
    });
    // Phase 4 microlearning: low section scores trigger training assignment.
    const training = await assignTrainingForLowSections(prisma, {
      id: review.shop.id,
      evaluatedEmployeeId: review.shop.evaluatedEmployeeId,
    });
    for (const aId of training.assignmentIds) {
      await notify(
        prisma,
        review.shop.evaluatedEmployeeId,
        "training_assigned",
        "A training module was assigned to you",
        `Linked to your shop on ${review.shop.shopDate.toISOString().slice(0, 10)}.`,
        `/training`,
      );
      void aId;
    }

    // Notify the employee that their review is complete.
    await notify(
      prisma,
      review.shop.evaluatedEmployeeId,
      "review_completed",
      `Your shop on ${review.shop.shopDate.toISOString().slice(0, 10)} has been reviewed`,
      `Score: ${review.shop.percentage.toFixed(0)}%`,
      `/shops/${review.shop.id}`,
    );
    for (const code of earnedBadges) {
      await notify(prisma, review.shop.evaluatedEmployeeId, "badge_earned", `New badge: ${code}`, undefined, `/me/badges`);
    }
  }

  res.json({ ok: true, breakdown, earnedBadges });
});

export default router;
