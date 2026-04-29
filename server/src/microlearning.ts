// Microlearning loop (§6.9 / Phase 4):
// "low score → assigned training → re-test"
//
// On review complete, compute the percentage for each rubric section.
// For any section below the threshold, find a TrainingModule whose
// rubricSectionMatch fits the section name and auto-assign it.

import type { PrismaClient } from "@prisma/client";

export const LOW_SECTION_THRESHOLD = 70;

interface ShopForMicrolearning {
  id: string;
  evaluatedEmployeeId: string;
  reviewerId?: string | null;
}

export async function assignTrainingForLowSections(
  prisma: PrismaClient,
  shop: ShopForMicrolearning,
): Promise<{ assignmentIds: string[]; actionPlanIds: string[] }> {
  if (!shop.evaluatedEmployeeId) return { assignmentIds: [], actionPlanIds: [] };

  const answers = await prisma.shopAnswer.findMany({
    where: { shopId: shop.id },
    include: { question: { select: { maxScore: true, section: { select: { id: true, name: true } } } } },
  });
  const sectionAgg = new Map<string, { name: string; score: number; max: number }>();
  for (const a of answers) {
    const sid = a.question.section.id;
    const cur = sectionAgg.get(sid) ?? { name: a.question.section.name, score: 0, max: 0 };
    cur.score += a.scoreAwarded;
    cur.max += a.question.maxScore;
    sectionAgg.set(sid, cur);
  }

  const ids: string[] = [];
  const actionPlanIds: string[] = [];
  for (const [, sec] of sectionAgg) {
    if (sec.max === 0) continue;
    const pct = (sec.score / sec.max) * 100;
    if (pct >= LOW_SECTION_THRESHOLD) continue;

    const module = await prisma.trainingModule.findFirst({
      where: { active: true, rubricSectionMatch: sec.name },
    });
    if (!module) continue;

    // Don't double-assign the same module to the same user when it's still open.
    const existing = await prisma.trainingAssignment.findFirst({
      where: {
        userId: shop.evaluatedEmployeeId,
        trainingModuleId: module.id,
        status: { in: ["assigned", "completed"] },
      },
    });
    if (existing) continue;

    const a = await prisma.trainingAssignment.create({
      data: {
        userId: shop.evaluatedEmployeeId,
        trainingModuleId: module.id,
        shopId: shop.id,
        triggerSection: sec.name,
        triggerScorePct: pct,
      },
    });
    ids.push(a.id);

    // Co-create an action plan that points to the training module so the
    // employee sees one unified todo list, not two parallel queues.
    if (shop.reviewerId) {
      const ap = await prisma.actionPlan.create({
        data: {
          shopId: shop.id,
          assignedToId: shop.evaluatedEmployeeId,
          assignedById: shop.reviewerId,
          category: sec.name,
          description: `Complete training: ${module.name}${module.url ? ` (${module.url})` : ""}`,
          dueDate: new Date(Date.now() + 14 * 86400 * 1000),
        },
      });
      actionPlanIds.push(ap.id);
    }
  }
  return { assignmentIds: ids, actionPlanIds };
}
