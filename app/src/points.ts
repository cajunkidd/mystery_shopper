import type {
  PointsEntry,
  Review,
  Shop,
} from "./types";

const TYPE_MULTIPLIER: Record<string, number> = {
  visit: 1.2,
  call: 1.0,
  web_inquiry: 1.0,
  social_inquiry: 1.0,
};

export interface PointsBreakdown {
  base: number;
  multiplier: number;
  multiplierBonus: number;
  streakBonus: number;
  improvementBonus: number;
  managerBonus: number;
  total: number;
}

export function shopPointsBreakdown(
  shop: Shop,
  history: Shop[],
  review?: Review,
): PointsBreakdown {
  const base = shop.percentage;
  const mult = TYPE_MULTIPLIER[shop.type] ?? 1;
  const multBonus = Math.round(base * (mult - 1));

  const prior = history
    .filter(
      (s) =>
        s.evaluatedEmployeeId === shop.evaluatedEmployeeId &&
        s.id !== shop.id &&
        s.shopDate < shop.shopDate,
    )
    .sort((a, b) => b.shopDate.localeCompare(a.shopDate));

  let streakLen = 0;
  for (const p of prior) {
    if (p.percentage >= 85) streakLen++;
    else break;
  }
  const streakMult = Math.min(0.5, streakLen * 0.1);
  const streakBonus = shop.percentage >= 85 ? Math.round(base * streakMult) : 0;

  const last3 = prior.slice(0, 3);
  const last3Avg =
    last3.length > 0
      ? last3.reduce((sum, s) => sum + s.percentage, 0) / last3.length
      : null;
  const improvementBonus =
    last3Avg != null && shop.percentage - last3Avg >= 15 ? 20 : 0;

  const managerBonus = review?.bonusPoints ?? 0;

  const total =
    base + multBonus + streakBonus + improvementBonus + managerBonus;

  return {
    base,
    multiplier: mult,
    multiplierBonus: multBonus,
    streakBonus,
    improvementBonus,
    managerBonus,
    total,
  };
}

export function buildPointsLedger(
  shops: Shop[],
  reviews: Review[],
): PointsEntry[] {
  const entries: PointsEntry[] = [];
  const sorted = [...shops]
    .filter(
      (s) => s.evaluatedEmployeeId && s.status !== "draft" && s.status !== "submitted",
    )
    .sort((a, b) => a.shopDate.localeCompare(b.shopDate));

  for (const s of sorted) {
    const history = sorted.filter(
      (h) => h.evaluatedEmployeeId === s.evaluatedEmployeeId,
    );
    const review = reviews.find((r) => r.shopId === s.id);
    const b = shopPointsBreakdown(s, history, review);
    const uid = s.evaluatedEmployeeId!;

    if (b.base > 0) {
      entries.push({
        id: `pts-${s.id}-base`,
        userId: uid,
        source: "shop_score",
        sourceRefId: s.id,
        points: b.base,
        reason: `Shop score ${b.base}%`,
        awardedBy: null,
        awardedAt: s.shopDate,
      });
    }
    if (b.multiplierBonus !== 0) {
      entries.push({
        id: `pts-${s.id}-mult`,
        userId: uid,
        source: "type_multiplier",
        sourceRefId: s.id,
        points: b.multiplierBonus,
        reason: `${s.type} multiplier ×${b.multiplier}`,
        awardedBy: null,
        awardedAt: s.shopDate,
      });
    }
    if (b.streakBonus > 0) {
      entries.push({
        id: `pts-${s.id}-streak`,
        userId: uid,
        source: "streak_bonus",
        sourceRefId: s.id,
        points: b.streakBonus,
        reason: "Consecutive ≥85 streak bonus",
        awardedBy: null,
        awardedAt: s.shopDate,
      });
    }
    if (b.improvementBonus > 0) {
      entries.push({
        id: `pts-${s.id}-imp`,
        userId: uid,
        source: "improvement_bonus",
        sourceRefId: s.id,
        points: b.improvementBonus,
        reason: "+15 over trailing 3-shop average",
        awardedBy: null,
        awardedAt: s.shopDate,
      });
    }
    if (b.managerBonus > 0 && review) {
      entries.push({
        id: `pts-${s.id}-bonus`,
        userId: uid,
        source: "manager_bonus",
        sourceRefId: s.id,
        points: b.managerBonus,
        reason: review.bonusJustification || "Manager bonus",
        awardedBy: review.reviewerId,
        awardedAt: review.reviewedAt ?? s.shopDate,
      });
    }
  }
  return entries;
}

export function userTotalPoints(entries: PointsEntry[], userId: string): number {
  return entries
    .filter((e) => e.userId === userId)
    .reduce((sum, e) => sum + e.points, 0);
}

export function locationTotalPoints(
  entries: PointsEntry[],
  userIds: string[],
): number {
  const set = new Set(userIds);
  return entries
    .filter((e) => set.has(e.userId))
    .reduce((sum, e) => sum + e.points, 0);
}
