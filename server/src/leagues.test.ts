import { describe, it, expect, vi } from "vitest";
import { rolloverLeagues } from "./leagues.js";

interface FakeLeague {
  id: string;
  tier: number;
  storeIds: string[];
  periodStart: Date;
  periodEnd: Date;
  rolledOverAt: Date | null;
}

function setup(opts: {
  leagues: FakeLeague[];
  shopAvgByLocation: Record<string, number>;
}) {
  const leagues = new Map<string, FakeLeague>();
  for (const l of opts.leagues) leagues.set(l.id, { ...l });

  const prisma = {
    league: {
      findMany: vi.fn(async ({ where, orderBy }: { where: { rolledOverAt: null; periodEnd: { lt: Date } }; orderBy: { tier: "asc" } }) => {
        const list = Array.from(leagues.values())
          .filter((l) => l.rolledOverAt == null && l.periodEnd < where.periodEnd.lt)
          .sort((a, b) => a.tier - b.tier);
        void orderBy;
        return list;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => leagues.get(where.id) ?? null),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<FakeLeague> }) => {
        const cur = leagues.get(where.id);
        if (!cur) throw new Error("not found");
        const next = { ...cur, ...data };
        leagues.set(where.id, next);
        return next;
      }),
    },
    shop: {
      findMany: vi.fn(async ({ where }: { where: { locationId: { in: string[] } } }) => {
        return where.locationId.in.map((id: string) => ({
          locationId: id,
          percentage: opts.shopAvgByLocation[id] ?? 0,
        }));
      }),
    },
  } as unknown as Parameters<typeof rolloverLeagues>[0];

  return { prisma, leagues };
}

describe("rolloverLeagues", () => {
  it("returns no swaps when nothing is past period end", async () => {
    const { prisma } = setup({
      leagues: [
        { id: "l1", tier: 1, storeIds: ["a", "b"], periodStart: new Date("2026-01-01"), periodEnd: new Date("2099-01-01"), rolledOverAt: null },
      ],
      shopAvgByLocation: { a: 90, b: 80 },
    });
    const r = await rolloverLeagues(prisma, new Date("2026-04-01"));
    expect(r.rolledOver).toBe(0);
    expect(r.swaps).toHaveLength(0);
  });

  it("swaps the bottom of the top tier with the top of the bottom tier", async () => {
    const past = new Date("2026-03-31");
    const { prisma, leagues } = setup({
      leagues: [
        { id: "top", tier: 1, storeIds: ["a", "b", "c"], periodStart: new Date("2026-01-01"), periodEnd: past, rolledOverAt: null },
        { id: "bot", tier: 2, storeIds: ["d", "e", "f"], periodStart: new Date("2026-01-01"), periodEnd: past, rolledOverAt: null },
      ],
      shopAvgByLocation: { a: 95, b: 92, c: 70, d: 88, e: 75, f: 60 }, // c is the worst in top, d is the best in bot
    });
    const r = await rolloverLeagues(prisma, new Date("2026-04-01"));
    expect(r.swaps).toEqual([
      { topLeagueId: "top", bottomLeagueId: "bot", demotedStoreId: "c", promotedStoreId: "d" },
    ]);
    expect(leagues.get("top")!.storeIds).toEqual(["a", "b", "d"]);
    expect(leagues.get("bot")!.storeIds).toEqual(["c", "e", "f"]);
    // Both leagues marked as rolled over (idempotency).
    expect(leagues.get("top")!.rolledOverAt).not.toBeNull();
    expect(leagues.get("bot")!.rolledOverAt).not.toBeNull();
  });

  it("is idempotent — already-rolled-over leagues stay untouched", async () => {
    const past = new Date("2026-03-31");
    const stamp = new Date("2026-04-01T00:00:00Z");
    const { prisma } = setup({
      leagues: [
        { id: "top", tier: 1, storeIds: ["a", "b"], periodStart: new Date("2026-01-01"), periodEnd: past, rolledOverAt: stamp },
        { id: "bot", tier: 2, storeIds: ["c", "d"], periodStart: new Date("2026-01-01"), periodEnd: past, rolledOverAt: stamp },
      ],
      shopAvgByLocation: { a: 95, b: 70, c: 90, d: 60 },
    });
    const r = await rolloverLeagues(prisma, new Date("2026-04-15"));
    expect(r.rolledOver).toBe(0);
    expect(r.swaps).toHaveLength(0);
  });
});
