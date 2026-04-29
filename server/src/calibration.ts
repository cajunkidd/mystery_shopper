// Calibration math (§13). Used by the calibration route + tested directly.

export interface CalibrationDelta {
  shopId: string;
  scores: number[];
  delta: number; // max - min
}

export interface CalibrationStats {
  perShop: CalibrationDelta[];
  averageDelta: number;
  passes: boolean; // §13: average delta must be ≤ 8 points
}

export function summarizeCalibration(
  entries: { shopId: string; scorePercentage: number }[],
): CalibrationStats {
  const byShop = new Map<string, number[]>();
  for (const e of entries) {
    const cur = byShop.get(e.shopId) ?? [];
    cur.push(e.scorePercentage);
    byShop.set(e.shopId, cur);
  }
  const perShop: CalibrationDelta[] = [];
  for (const [shopId, scores] of byShop) {
    if (scores.length < 2) continue; // Need at least two reviewers per shop.
    const delta = Math.max(...scores) - Math.min(...scores);
    perShop.push({ shopId, scores, delta });
  }
  const averageDelta = perShop.length
    ? perShop.reduce((a, p) => a + p.delta, 0) / perShop.length
    : 0;
  return { perShop, averageDelta, passes: averageDelta <= 8 };
}
