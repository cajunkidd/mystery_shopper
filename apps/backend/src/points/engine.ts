// Implements the concrete rules in spec §6.5 "Points engine".
// Append-only ledger semantics live in the data layer; this module is pure math.

export type ShopType = "visit" | "call" | "special";

export interface PointsInput {
  shopScore: number; // 0–100
  shopType: ShopType;
  consecutiveAtOrAbove85: number; // count *including* this shop if it qualifies
  trailing3ShopAverage: number | null; // null when fewer than 3 prior shops
  managerBonus?: number; // 0–25, requires justification at the API layer
}

export interface PointsBreakdown {
  base: number;
  typeMultiplier: number;
  streakMultiplier: number;
  improvementBonus: number;
  managerBonus: number;
  total: number;
}

const TYPE_MULTIPLIERS: Record<ShopType, number> = {
  visit: 1.2,
  call: 1.0,
  special: 1.5,
};

export function computePoints(input: PointsInput): PointsBreakdown {
  const base = clamp(input.shopScore, 0, 100);
  const typeMultiplier = TYPE_MULTIPLIERS[input.shopType];

  // Streak: +10% per consecutive shop ≥85, capped at +50%.
  const streakSteps = input.shopScore >= 85 ? Math.max(0, input.consecutiveAtOrAbove85 - 1) : 0;
  const streakMultiplier = 1 + Math.min(0.5, streakSteps * 0.1);

  // Improvement: +20 if shop is ≥15 above the trailing 3-shop average.
  const improvementBonus =
    input.trailing3ShopAverage !== null && input.shopScore - input.trailing3ShopAverage >= 15
      ? 20
      : 0;

  const managerBonus = clamp(input.managerBonus ?? 0, 0, 25);

  const total = Math.round(base * typeMultiplier * streakMultiplier + improvementBonus + managerBonus);

  return { base, typeMultiplier, streakMultiplier, improvementBonus, managerBonus, total };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
