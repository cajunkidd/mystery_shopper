import { describe, it, expect, vi } from "vitest";
import { awardForCompletedShop, computeStreakBonus, computeImprovementBonus } from "./points.js";

function mockPrisma(opts: {
  recentShops?: { percentage: number }[];
  trailingShops?: { percentage: number }[];
}) {
  const created: { sourceType: string; points: number; reason?: string }[] = [];
  const findMany = vi
    .fn()
    .mockImplementationOnce(async () => opts.recentShops ?? []) // streak lookup (take: 10)
    .mockImplementationOnce(async () => opts.trailingShops ?? []); // improvement lookup (take: 3)

  const prisma = {
    shop: { findMany },
    pointsLedger: {
      create: vi.fn(async ({ data }: { data: { sourceType: string; points: number; reason?: string } }) => {
        created.push(data);
        return data;
      }),
    },
  } as unknown as Parameters<typeof awardForCompletedShop>[0];
  return { prisma, created };
}

describe("computeStreakBonus", () => {
  it("returns 0 streak when no recent shops", async () => {
    const prisma = { shop: { findMany: vi.fn().mockResolvedValue([]) } } as unknown as Parameters<typeof computeStreakBonus>[0];
    const r = await computeStreakBonus(prisma, "u1", "shop1");
    expect(r.streakLength).toBe(0);
    expect(r.bonusPct).toBe(0);
  });

  it("counts consecutive shops ≥85", async () => {
    const prisma = {
      shop: {
        findMany: vi.fn().mockResolvedValue([{ percentage: 90 }, { percentage: 88 }, { percentage: 70 }, { percentage: 95 }]),
      },
    } as unknown as Parameters<typeof computeStreakBonus>[0];
    const r = await computeStreakBonus(prisma, "u1", "shop1");
    expect(r.streakLength).toBe(2);
    expect(r.bonusPct).toBeCloseTo(0.2);
  });

  it("caps streak bonus at 50%", async () => {
    const prisma = {
      shop: {
        findMany: vi.fn().mockResolvedValue(Array(8).fill({ percentage: 95 })),
      },
    } as unknown as Parameters<typeof computeStreakBonus>[0];
    const r = await computeStreakBonus(prisma, "u1", "shop1");
    expect(r.bonusPct).toBe(0.5);
  });
});

describe("computeImprovementBonus", () => {
  it("requires 3 trailing shops to compute", async () => {
    const prisma = {
      shop: { findMany: vi.fn().mockResolvedValue([{ percentage: 70 }, { percentage: 72 }]) },
    } as unknown as Parameters<typeof computeImprovementBonus>[0];
    expect(await computeImprovementBonus(prisma, "u1", "s1", 95)).toBe(0);
  });

  it("awards 20 when current ≥15 over trailing avg", async () => {
    const prisma = {
      shop: { findMany: vi.fn().mockResolvedValue([{ percentage: 70 }, { percentage: 72 }, { percentage: 68 }]) },
    } as unknown as Parameters<typeof computeImprovementBonus>[0];
    expect(await computeImprovementBonus(prisma, "u1", "s1", 90)).toBe(20);
  });

  it("returns 0 when current is not ≥15 over trailing avg", async () => {
    const prisma = {
      shop: { findMany: vi.fn().mockResolvedValue([{ percentage: 80 }, { percentage: 82 }, { percentage: 78 }]) },
    } as unknown as Parameters<typeof computeImprovementBonus>[0];
    expect(await computeImprovementBonus(prisma, "u1", "s1", 90)).toBe(0);
  });
});

describe("awardForCompletedShop", () => {
  it("writes shop_score with type multiplier and no streak when no history", async () => {
    const { prisma, created } = mockPrisma({ recentShops: [], trailingShops: [] });
    const breakdown = await awardForCompletedShop(prisma, {
      userId: "u1",
      shopId: "s1",
      shopType: "visit",
      percentage: 80,
    });
    expect(created).toHaveLength(1);
    expect(created[0].sourceType).toBe("shop_score");
    // 80 * 1.2 (visit) * 1.0 (no streak) = 96
    expect(created[0].points).toBe(96);
    expect(breakdown.find((b) => b.sourceType === "shop_score")?.points).toBe(96);
  });

  it("applies streak bonus to base points", async () => {
    const { prisma, created } = mockPrisma({
      recentShops: [{ percentage: 90 }, { percentage: 92 }], // streak of 2 → +20%
      trailingShops: [],
    });
    await awardForCompletedShop(prisma, {
      userId: "u1",
      shopId: "s1",
      shopType: "call",
      percentage: 80,
    });
    // 80 * 1.0 (call) * 1.2 (streak) = 96
    expect(created[0].points).toBe(96);
  });

  it("includes manager bonus as a separate ledger entry", async () => {
    const { prisma, created } = mockPrisma({ recentShops: [], trailingShops: [] });
    await awardForCompletedShop(prisma, {
      userId: "u1",
      shopId: "s1",
      shopType: "visit",
      percentage: 70,
      bonusPointsAwarded: 15,
      bonusJustification: "Customer wrote a thank-you letter",
    });
    expect(created).toHaveLength(2);
    expect(created[1].sourceType).toBe("manager_bonus");
    expect(created[1].points).toBe(15);
    expect(created[1].reason).toContain("thank-you");
  });

  it("includes improvement bonus when score ≥15 over trailing avg", async () => {
    const { prisma, created } = mockPrisma({
      recentShops: [],
      trailingShops: [{ percentage: 60 }, { percentage: 65 }, { percentage: 62 }],
    });
    await awardForCompletedShop(prisma, {
      userId: "u1",
      shopId: "s1",
      shopType: "visit",
      percentage: 90,
    });
    expect(created.find((c) => c.sourceType === "improvement_bonus")?.points).toBe(20);
  });
});
