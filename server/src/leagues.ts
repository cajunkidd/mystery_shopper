// League promotion/demotion at quarter-end (§6.5).
//
// "Promotions/demotions between leagues happen at quarter end
//  (top of bottom league moves up; bottom of top league moves down)."
//
// Strategy:
//   - Each league has a tier (1 = top). Rollover only swaps stores between
//     adjacent tiers — top tier's lowest avg swaps with the next tier's
//     highest avg.
//   - Idempotent: setting `rolledOverAt` prevents double-rollover.

import type { PrismaClient } from "@prisma/client";

async function avgByLocation(
  prisma: PrismaClient,
  storeIds: string[],
  start: Date,
  end: Date,
): Promise<Map<string, number>> {
  const shops = await prisma.shop.findMany({
    where: {
      locationId: { in: storeIds },
      status: { not: "draft" },
      shopDate: { gte: start, lte: end },
    },
    select: { locationId: true, percentage: true },
  });
  const agg = new Map<string, { total: number; count: number }>();
  for (const s of shops) {
    const cur = agg.get(s.locationId) ?? { total: 0, count: 0 };
    cur.total += s.percentage;
    cur.count += 1;
    agg.set(s.locationId, cur);
  }
  const out = new Map<string, number>();
  for (const id of storeIds) {
    const a = agg.get(id);
    out.set(id, a && a.count ? a.total / a.count : 0);
  }
  return out;
}

export interface RolloverResult {
  rolledOver: number;
  swaps: { topLeagueId: string; bottomLeagueId: string; demotedStoreId: string; promotedStoreId: string }[];
}

export async function rolloverLeagues(prisma: PrismaClient, now: Date): Promise<RolloverResult> {
  const due = await prisma.league.findMany({
    where: { periodEnd: { lt: now }, rolledOverAt: null },
    orderBy: { tier: "asc" },
  });
  if (due.length === 0) return { rolledOver: 0, swaps: [] };

  const byTier = new Map<number, typeof due>();
  for (const l of due) {
    const list = byTier.get(l.tier) ?? [];
    list.push(l);
    byTier.set(l.tier, list);
  }
  const tiers = Array.from(byTier.keys()).sort((a, b) => a - b);
  const swaps: RolloverResult["swaps"] = [];

  for (let i = 0; i < tiers.length - 1; i++) {
    const top = byTier.get(tiers[i])![0];
    const bottom = byTier.get(tiers[i + 1])![0];
    const topAvgs = await avgByLocation(prisma, top.storeIds, top.periodStart, top.periodEnd);
    const bottomAvgs = await avgByLocation(prisma, bottom.storeIds, bottom.periodStart, bottom.periodEnd);
    const topRanked = Array.from(topAvgs.entries()).sort((a, b) => a[1] - b[1]);
    const bottomRanked = Array.from(bottomAvgs.entries()).sort((a, b) => b[1] - a[1]);
    if (topRanked.length === 0 || bottomRanked.length === 0) continue;
    const demote = topRanked[0][0];
    const promote = bottomRanked[0][0];
    if (demote === promote) continue;

    const newTopIds = top.storeIds.map((id) => (id === demote ? promote : id));
    const newBottomIds = bottom.storeIds.map((id) => (id === promote ? demote : id));
    await prisma.league.update({ where: { id: top.id }, data: { storeIds: newTopIds, rolledOverAt: now } });
    await prisma.league.update({ where: { id: bottom.id }, data: { storeIds: newBottomIds, rolledOverAt: now } });
    swaps.push({ topLeagueId: top.id, bottomLeagueId: bottom.id, demotedStoreId: demote, promotedStoreId: promote });
  }

  // Mark stragglers (leagues without an adjacent tier).
  for (const l of due) {
    const fresh = await prisma.league.findUnique({ where: { id: l.id } });
    if (fresh && !fresh.rolledOverAt) {
      await prisma.league.update({ where: { id: l.id }, data: { rolledOverAt: now } });
    }
  }
  return { rolledOver: due.length, swaps };
}
