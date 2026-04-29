// Points engine — implements §6.5 of STINE_MYSTERY_SHOP_APP_SPEC.md.
// All entries are append-only; never mutate PointsLedger rows.

import type { PrismaClient } from "@prisma/client";

const TYPE_MULTIPLIER: Record<string, number> = {
  visit: 1.2,
  call: 1.0,
  web_inquiry: 1.0,
  social_inquiry: 1.0,
};

export interface AwardInput {
  userId: string;
  shopId: string;
  shopType: string;
  percentage: number;
  bonusPointsAwarded?: number | null;
  bonusJustification?: string | null;
  awardedById?: string | null;
}

export interface BreakdownItem {
  sourceType: string;
  points: number;
  reason: string;
}

export async function computeStreakBonus(
  prisma: PrismaClient,
  userId: string,
  currentShopId: string,
): Promise<{ streakLength: number; bonusPct: number }> {
  // Look back at this user's recent shops (excluding the current one) in chronological reverse order.
  const recent = await prisma.shop.findMany({
    where: {
      evaluatedEmployeeId: userId,
      id: { not: currentShopId },
      status: { not: "draft" },
    },
    orderBy: { shopDate: "desc" },
    take: 10,
    select: { percentage: true },
  });
  let streak = 0;
  for (const s of recent) {
    if (s.percentage >= 85) streak += 1;
    else break;
  }
  // +10% per consecutive shop ≥85, capped at +50%.
  const bonusPct = Math.min(streak * 0.1, 0.5);
  return { streakLength: streak, bonusPct };
}

export async function computeImprovementBonus(
  prisma: PrismaClient,
  userId: string,
  currentShopId: string,
  currentPercentage: number,
): Promise<number> {
  const trailing = await prisma.shop.findMany({
    where: {
      evaluatedEmployeeId: userId,
      id: { not: currentShopId },
      status: { not: "draft" },
    },
    orderBy: { shopDate: "desc" },
    take: 3,
    select: { percentage: true },
  });
  if (trailing.length < 3) return 0;
  const avg = trailing.reduce((a, s) => a + s.percentage, 0) / trailing.length;
  return currentPercentage - avg >= 15 ? 20 : 0;
}

/**
 * Award all points for a completed shop review. Called after Review.complete.
 * Returns a breakdown for client display / audit.
 */
export async function awardForCompletedShop(
  prisma: PrismaClient,
  input: AwardInput,
): Promise<BreakdownItem[]> {
  const breakdown: BreakdownItem[] = [];

  // Base points = score percentage (capped at 100). Special-scenario shops not yet differentiated.
  const base = Math.round(Math.max(0, Math.min(100, input.percentage)));
  const multiplier = TYPE_MULTIPLIER[input.shopType] ?? 1.0;

  const { bonusPct, streakLength } = await computeStreakBonus(prisma, input.userId, input.shopId);

  const adjusted = Math.round(base * multiplier * (1 + bonusPct));
  breakdown.push({
    sourceType: "shop_score",
    points: adjusted,
    reason: `Score ${base} × type ${multiplier.toFixed(1)} × streak ${(1 + bonusPct).toFixed(2)}`,
  });

  await prisma.pointsLedger.create({
    data: {
      userId: input.userId,
      sourceType: "shop_score",
      sourceRefId: input.shopId,
      points: adjusted,
      reason: `Shop score (${input.shopType})`,
    },
  });

  if (streakLength > 0 && bonusPct > 0) {
    breakdown.push({
      sourceType: "streak_bonus",
      points: 0,
      reason: `Streak of ${streakLength} consecutive shops ≥85% (already folded into base)`,
    });
  }

  // Improvement bonus
  const improvement = await computeImprovementBonus(prisma, input.userId, input.shopId, input.percentage);
  if (improvement > 0) {
    await prisma.pointsLedger.create({
      data: {
        userId: input.userId,
        sourceType: "improvement_bonus",
        sourceRefId: input.shopId,
        points: improvement,
        reason: "Score ≥15 above trailing 3-shop average",
      },
    });
    breakdown.push({ sourceType: "improvement_bonus", points: improvement, reason: "≥15 over trailing 3-shop avg" });
  }

  // Manager bonus
  if (input.bonusPointsAwarded && input.bonusPointsAwarded > 0) {
    await prisma.pointsLedger.create({
      data: {
        userId: input.userId,
        sourceType: "manager_bonus",
        sourceRefId: input.shopId,
        points: input.bonusPointsAwarded,
        reason: input.bonusJustification ?? "Manager bonus",
        awardedById: input.awardedById ?? null,
      },
    });
    breakdown.push({
      sourceType: "manager_bonus",
      points: input.bonusPointsAwarded,
      reason: input.bonusJustification ?? "Manager bonus",
    });
  }

  return breakdown;
}

export const __internal_for_tests = { TYPE_MULTIPLIER };
