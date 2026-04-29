// Demo data seed. Idempotent — safe to re-run; tagged rows are wiped first
// so the demo state is reset rather than duplicated.
//
// What it produces (after the base seed has run):
//   - 8 graded shops across 2 employees, mixing visit + call
//   - one mid-review and one closed shop
//   - one action plan + one appeal
//   - one training module + one auto-style assignment
//   - one league with two stores

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_TAG = "demo:";

async function main(): Promise<void> {
  // Wipe prior demo state so re-runs converge.
  await prisma.huntReveal.deleteMany({ where: { huntCampaign: { name: { startsWith: DEMO_TAG } } } });
  await prisma.huntCampaign.deleteMany({ where: { name: { startsWith: DEMO_TAG } } });
  await prisma.calibrationEntry.deleteMany({ where: { session: { name: { startsWith: DEMO_TAG } } } });
  await prisma.calibrationSession.deleteMany({ where: { name: { startsWith: DEMO_TAG } } });
  await prisma.league.deleteMany({ where: { name: { startsWith: DEMO_TAG } } });
  await prisma.trainingAssignment.deleteMany({ where: { trainingModule: { code: { startsWith: DEMO_TAG } } } });
  await prisma.trainingModule.deleteMany({ where: { code: { startsWith: DEMO_TAG } } });
  await prisma.appeal.deleteMany({ where: { reason: { startsWith: DEMO_TAG } } });
  await prisma.actionPlan.deleteMany({ where: { description: { startsWith: DEMO_TAG } } });
  await prisma.shopAnswer.deleteMany({ where: { shop: { shopperName: { startsWith: DEMO_TAG } } } });
  await prisma.review.deleteMany({ where: { shop: { shopperName: { startsWith: DEMO_TAG } } } });
  await prisma.shop.deleteMany({ where: { shopperName: { startsWith: DEMO_TAG } } });

  const sulphur = await prisma.location.findUnique({ where: { code: "STN-SUL" } });
  const lakeCharles = await prisma.location.findUnique({ where: { code: "STN-LCH" } });
  if (!sulphur || !lakeCharles) {
    throw new Error("Run `npm run seed` first — base locations are missing.");
  }

  const alex = await prisma.user.findUnique({ where: { email: "alex.employee@stine.test" } });
  const robin = await prisma.user.findUnique({ where: { email: "robin.employee@stine.test" } });
  const casey = await prisma.user.findUnique({ where: { email: "casey.employee@stine.test" } });
  const manager = await prisma.user.findUnique({ where: { email: "manager.sulphur@stine.test" } });
  if (!alex || !robin || !casey || !manager) {
    throw new Error("Run `npm run seed` first — base users are missing.");
  }

  const visitRubric = await prisma.rubric.findFirst({
    where: { type: "visit", status: "active" },
    include: { sections: { include: { questions: true } } },
  });
  if (!visitRubric) throw new Error("No active visit rubric — run `npm run seed` first.");

  const greeting = visitRubric.sections.find((s) => s.name === "Greeting");
  const productKnowledge = visitRubric.sections.find((s) => s.name === "Product Knowledge");
  if (!greeting || !productKnowledge) throw new Error("Visit rubric is missing expected sections.");

  // Helper to create a shop with deterministic per-question scores so totals match.
  async function createShop(opts: {
    employeeId: string;
    locationId: string;
    daysAgo: number;
    score: "great" | "okay" | "bad";
    submitted?: boolean;
  }): Promise<{ id: string; percentage: number }> {
    const allQuestions = visitRubric!.sections.flatMap((s) => s.questions);
    const answers = allQuestions.map((q) => {
      let value: unknown = "yes";
      let scoreAwarded = q.maxScore;
      if (q.questionType === "scale_1_5") {
        const n = opts.score === "great" ? 5 : opts.score === "okay" ? 3 : 1;
        value = n;
        scoreAwarded = ((n - 1) / 4) * q.maxScore;
      } else if (q.questionType === "yes_no") {
        const yes = opts.score === "great" ? true : opts.score === "okay" ? Math.random() > 0.4 : Math.random() > 0.7;
        value = yes ? "yes" : "no";
        scoreAwarded = yes ? q.maxScore : 0;
      }
      return { questionId: q.id, answerValue: value, scoreAwarded };
    });
    const totalMax = allQuestions.reduce((a, q) => a + q.maxScore, 0);
    const totalScore = answers.reduce((a, x) => a + x.scoreAwarded, 0);
    const percentage = (totalScore / totalMax) * 100;
    const shopDate = new Date(Date.now() - opts.daysAgo * 86400 * 1000);
    const shop = await prisma.shop.create({
      data: {
        rubricId: visitRubric!.id,
        rubricVersion: visitRubric!.version,
        type: "visit",
        locationId: opts.locationId,
        shopDate,
        evaluatedEmployeeId: opts.employeeId,
        shopperName: `${DEMO_TAG}Demo Shopper`,
        narrative:
          opts.score === "great"
            ? `${DEMO_TAG}Outstanding interaction. Greeted on entry, walked me through three options, asked for the sale.`
            : opts.score === "okay"
            ? `${DEMO_TAG}Adequate. Greeting was warm but product knowledge was thin and there was no close attempt.`
            : `${DEMO_TAG}No greeting at all; associate stayed behind the counter on a personal call.`,
        status: opts.submitted === false ? "submitted" : "closed",
        submittedAt: shopDate,
        closedAt: opts.submitted === false ? null : new Date(shopDate.getTime() + 86400 * 1000),
        totalScore,
        totalMax,
        percentage,
        source: "manual_entry",
        createdById: manager!.id,
        answers: { create: answers.map((a) => ({ questionId: a.questionId, answerValue: a.answerValue as never, scoreAwarded: a.scoreAwarded })) },
      },
    });
    return { id: shop.id, percentage };
  }

  await createShop({ employeeId: alex.id, locationId: sulphur.id, daysAgo: 28, score: "okay" });
  await createShop({ employeeId: alex.id, locationId: sulphur.id, daysAgo: 21, score: "okay" });
  await createShop({ employeeId: alex.id, locationId: sulphur.id, daysAgo: 14, score: "great" });
  const alexLatest = await createShop({ employeeId: alex.id, locationId: sulphur.id, daysAgo: 5, score: "great" });

  const robinPending = await createShop({
    employeeId: robin.id,
    locationId: sulphur.id,
    daysAgo: 3,
    score: "bad",
    submitted: false,
  });
  await createShop({ employeeId: robin.id, locationId: sulphur.id, daysAgo: 30, score: "bad" });

  await createShop({ employeeId: casey.id, locationId: lakeCharles.id, daysAgo: 10, score: "great" });
  await createShop({ employeeId: casey.id, locationId: lakeCharles.id, daysAgo: 2, score: "okay" });

  // One in-progress review on the pending shop.
  await prisma.review.create({
    data: { shopId: robinPending.id, reviewerId: manager.id, status: "in_progress" },
  });

  // One overdue action plan + one open one.
  await prisma.actionPlan.create({
    data: {
      shopId: alexLatest.id,
      assignedToId: alex.id,
      assignedById: manager.id,
      category: "Close",
      description: `${DEMO_TAG}Practice asking for the sale on every visit this week.`,
      dueDate: new Date(Date.now() - 2 * 86400 * 1000),
      status: "overdue",
    },
  });
  await prisma.actionPlan.create({
    data: {
      shopId: alexLatest.id,
      assignedToId: alex.id,
      assignedById: manager.id,
      category: "Greeting",
      description: `${DEMO_TAG}Greet every customer within 30 seconds of entering.`,
      dueDate: new Date(Date.now() + 7 * 86400 * 1000),
      status: "open",
    },
  });

  // One open appeal on the bad robin shop.
  const robinBad = await prisma.shop.findFirst({
    where: { evaluatedEmployeeId: robin.id, percentage: { lt: 50 } },
    orderBy: { shopDate: "asc" },
  });
  if (robinBad) {
    await prisma.appeal.create({
      data: {
        shopId: robinBad.id,
        filedById: robin.id,
        reason: `${DEMO_TAG}I greeted within 5 seconds; the shopper miscounted.`,
      },
    });
    await prisma.shop.update({ where: { id: robinBad.id }, data: { status: "appealed" } });
  }

  // One training module + assignment.
  const greetingModule = await prisma.trainingModule.create({
    data: {
      code: `${DEMO_TAG}greeting-101`,
      name: "Greeting Excellence",
      description: "Five-minute refresher on Stine's house greeting standard.",
      url: "https://stine.test/lms/greeting-101",
      durationMinutes: 5,
      rubricSectionMatch: "Greeting",
    },
  });
  await prisma.trainingAssignment.create({
    data: {
      userId: robin.id,
      trainingModuleId: greetingModule.id,
      shopId: robinBad?.id ?? null,
      triggerSection: "Greeting",
      triggerScorePct: 40,
      status: "assigned",
    },
  });

  // One league.
  await prisma.league.create({
    data: {
      name: `${DEMO_TAG}Southwest LA Q-current`,
      tier: 1,
      periodStart: new Date(Date.now() - 60 * 86400 * 1000),
      periodEnd: new Date(Date.now() + 30 * 86400 * 1000),
      storeIds: [sulphur.id, lakeCharles.id],
    },
  });

  console.log("Demo data ready. Sign in as manager.sulphur@stine.test to see a populated dashboard.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
