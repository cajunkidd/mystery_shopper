// Badge evaluator — runs after each completed shop review.
// Badges are permanent (§10): never delete UserBadge rows here.

import type { PrismaClient } from "@prisma/client";

interface ShopForBadges {
  id: string;
  type: string;
  percentage: number;
  shopDate: Date;
}

const STARTER_BADGES = [
  { code: "veteran_50", name: "Veteran", description: "50 shops graded.", category: "tenure" as const },
  { code: "centurion", name: "Centurion", description: "100 shops graded.", category: "tenure" as const },
  { code: "phone_pro", name: "Phone Pro", description: "5 perfect mystery calls.", category: "absolute" as const },
  { code: "greeting_gold", name: "Greeting Gold", description: "5 perfect greetings in a quarter.", category: "absolute" as const },
  { code: "comeback_kid", name: "Comeback Kid", description: "3 consecutive improving shops.", category: "improvement" as const },
  { code: "bounce_back", name: "Bounce Back", description: "Recovered 20+ points after a sub-70 shop.", category: "improvement" as const },
];

export async function ensureBadgesSeeded(prisma: PrismaClient): Promise<void> {
  for (const b of STARTER_BADGES) {
    await prisma.badge.upsert({
      where: { code: b.code },
      update: {},
      create: { code: b.code, name: b.name, description: b.description, category: b.category },
    });
  }
}

async function awardOnce(prisma: PrismaClient, userId: string, code: string, earningShopId?: string): Promise<boolean> {
  const badge = await prisma.badge.findUnique({ where: { code } });
  if (!badge) return false;
  const existing = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
  });
  if (existing) return false;
  await prisma.userBadge.create({
    data: { userId, badgeId: badge.id, earningShopId },
  });
  await prisma.pointsLedger.create({
    data: {
      userId,
      sourceType: "badge_earned",
      sourceRefId: badge.id,
      points: 25,
      reason: `Badge earned: ${badge.name}`,
    },
  });
  return true;
}

export async function evaluateBadgesForUser(
  prisma: PrismaClient,
  userId: string,
  latest: ShopForBadges,
): Promise<string[]> {
  const earned: string[] = [];

  const allShops = await prisma.shop.findMany({
    where: { evaluatedEmployeeId: userId, status: { not: "draft" } },
    orderBy: { shopDate: "asc" },
    select: { id: true, type: true, percentage: true, shopDate: true },
  });

  // Tenure badges
  if (allShops.length >= 50 && (await awardOnce(prisma, userId, "veteran_50", latest.id))) earned.push("veteran_50");
  if (allShops.length >= 100 && (await awardOnce(prisma, userId, "centurion", latest.id))) earned.push("centurion");

  // Phone Pro: 5 perfect calls (>= 99%) lifetime.
  if (latest.type === "call") {
    const perfectCalls = allShops.filter((s) => s.type === "call" && s.percentage >= 99).length;
    if (perfectCalls >= 5 && (await awardOnce(prisma, userId, "phone_pro", latest.id))) earned.push("phone_pro");
  }

  // Comeback Kid: 3 consecutive improving shops, ending with the latest one.
  if (allShops.length >= 3) {
    const last3 = allShops.slice(-3);
    if (last3[0].percentage < last3[1].percentage && last3[1].percentage < last3[2].percentage) {
      if (await awardOnce(prisma, userId, "comeback_kid", latest.id)) earned.push("comeback_kid");
    }
  }

  // Bounce Back: prior shop was sub-70, current shop is +20 over that prior.
  if (allShops.length >= 2) {
    const prev = allShops[allShops.length - 2];
    if (prev.percentage < 70 && latest.percentage - prev.percentage >= 20) {
      if (await awardOnce(prisma, userId, "bounce_back", latest.id)) earned.push("bounce_back");
    }
  }

  return earned;
}
