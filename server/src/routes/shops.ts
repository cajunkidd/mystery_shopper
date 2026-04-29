import { Router } from "express";
import { z } from "zod";
import PDFDocument from "pdfkit";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import { computeShopTotals } from "../scoring.js";

const router = Router();
router.use(requireAuth);

// Filter shops based on role
function buildShopWhere(user: NonNullable<Express.Request["user"]>, query: Record<string, unknown>) {
  const where: Record<string, unknown> = {};
  if (query.locationId) where.locationId = query.locationId;
  if (query.status) where.status = query.status;
  if (query.type) where.type = query.type;
  if (query.evaluatedEmployeeId) where.evaluatedEmployeeId = query.evaluatedEmployeeId;

  if (user.role === "admin") return where;
  if (user.role === "district_manager") {
    return { ...where, location: { district: { in: user.districtIds.length ? user.districtIds : [""] } } };
  }
  if (user.role === "store_manager") {
    return { ...where, locationId: user.primaryLocationId ?? "__none__" };
  }
  // employee: only their own shops
  return { ...where, evaluatedEmployeeId: user.id };
}

router.get("/", async (req, res) => {
  const where = buildShopWhere(req.user!, req.query as Record<string, unknown>);
  const shops = await prisma.shop.findMany({
    where,
    orderBy: { shopDate: "desc" },
    take: Number(req.query.limit ?? 50),
    include: {
      location: { select: { id: true, code: true, name: true } },
      evaluatedEmployee: { select: { id: true, fullName: true } },
      review: { select: { status: true } },
    },
  });
  res.json({ shops });
});

router.get("/:id", async (req, res) => {
  const shop = await prisma.shop.findUnique({
    where: { id: req.params.id },
    include: {
      location: true,
      evaluatedEmployee: { select: { id: true, fullName: true, email: true } },
      createdBy: { select: { id: true, fullName: true } },
      answers: true,
      review: { include: { reviewer: { select: { id: true, fullName: true } } } },
      actionPlans: { include: { assignedTo: { select: { id: true, fullName: true } } } },
      appeals: true,
      comments: { include: { author: { select: { id: true, fullName: true } } }, orderBy: { createdAt: "asc" } },
      rubric: {
        include: {
          sections: {
            orderBy: { displayOrder: "asc" },
            include: { questions: { orderBy: { displayOrder: "asc" } } },
          },
        },
      },
    },
  });
  if (!shop) return res.status(404).json({ error: "not_found" });

  // role gating
  const u = req.user!;
  if (u.role === "employee" && shop.evaluatedEmployeeId !== u.id) return res.status(403).json({ error: "forbidden" });
  if (u.role === "store_manager" && shop.locationId !== u.primaryLocationId) return res.status(403).json({ error: "forbidden" });

  res.json({ shop });
});

const answerInput = z.object({
  questionId: z.string().uuid(),
  answerValue: z.any(),
  comment: z.string().optional(),
});

const createBody = z.object({
  rubricId: z.string().uuid(),
  type: z.enum(["visit", "call", "web_inquiry", "social_inquiry"]),
  locationId: z.string().uuid(),
  shopDate: z.string(),
  shopTime: z.string().optional(),
  evaluatedEmployeeId: z.string().uuid().nullable().optional(),
  shopperName: z.string().optional(),
  shopperExternalRef: z.string().optional(),
  narrative: z.string().optional(),
  answers: z.array(answerInput),
  submit: z.boolean().optional(),
});

router.post("/", async (req, res) => {
  const parsed = createBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  const data = parsed.data;

  const rubric = await prisma.rubric.findUnique({
    where: { id: data.rubricId },
    include: { sections: { include: { questions: true } } },
  });
  if (!rubric) return res.status(404).json({ error: "rubric_not_found" });

  const allQuestions = rubric.sections.flatMap((s) => s.questions);
  const totals = computeShopTotals(allQuestions, data.answers);

  const shop = await prisma.shop.create({
    data: {
      rubricId: data.rubricId,
      rubricVersion: rubric.version,
      type: data.type,
      locationId: data.locationId,
      shopDate: new Date(data.shopDate),
      shopTime: data.shopTime,
      evaluatedEmployeeId: data.evaluatedEmployeeId ?? null,
      shopperName: data.shopperName,
      shopperExternalRef: data.shopperExternalRef,
      narrative: data.narrative,
      status: data.submit ? "submitted" : "draft",
      submittedAt: data.submit ? new Date() : null,
      totalScore: totals.totalScore,
      totalMax: totals.totalMax,
      percentage: totals.percentage,
      source: "manual_entry",
      createdById: req.user!.id,
      answers: {
        create: data.answers.map((a) => {
          const score = totals.perAnswer.find((p) => p.questionId === a.questionId)?.score ?? 0;
          return {
            questionId: a.questionId,
            answerValue: a.answerValue,
            scoreAwarded: score,
            comment: a.comment,
          };
        }),
      },
    },
  });

  // Auto-create a pending review for the location's primary store_manager(s) if submitted.
  if (data.submit) {
    const manager = await prisma.user.findFirst({
      where: { role: "store_manager", primaryLocationId: data.locationId, active: true },
    });
    if (manager) {
      await prisma.review.create({
        data: { shopId: shop.id, reviewerId: manager.id, status: "pending" },
      });
      await prisma.shop.update({ where: { id: shop.id }, data: { status: "under_review" } });
    }
  }

  res.status(201).json({ id: shop.id });
});

router.post("/:id/submit", async (req, res) => {
  const shop = await prisma.shop.findUnique({ where: { id: req.params.id } });
  if (!shop) return res.status(404).json({ error: "not_found" });
  if (shop.status !== "draft") return res.status(409).json({ error: "not_draft" });
  const manager = await prisma.user.findFirst({
    where: { role: "store_manager", primaryLocationId: shop.locationId, active: true },
  });
  await prisma.shop.update({
    where: { id: shop.id },
    data: { status: manager ? "under_review" : "submitted", submittedAt: new Date() },
  });
  if (manager) {
    await prisma.review.upsert({
      where: { shopId: shop.id },
      update: {},
      create: { shopId: shop.id, reviewerId: manager.id, status: "pending" },
    });
  }
  res.json({ ok: true });
});

// PDF export
router.get("/:id/pdf", async (req, res) => {
  const shop = await prisma.shop.findUnique({
    where: { id: req.params.id },
    include: {
      location: true,
      evaluatedEmployee: true,
      review: true,
      actionPlans: true,
      answers: true,
      rubric: {
        include: { sections: { include: { questions: true }, orderBy: { displayOrder: "asc" } } },
      },
    },
  });
  if (!shop) return res.status(404).json({ error: "not_found" });

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="shop-${shop.id.slice(0, 8)}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).text("Stine Mystery Shop Report", { align: "center" });
  doc.moveDown();
  doc.fontSize(11)
    .text(`Location: ${shop.location.name} (${shop.location.code})`)
    .text(`Date: ${shop.shopDate.toISOString().slice(0, 10)}`)
    .text(`Type: ${shop.type}`)
    .text(`Employee: ${shop.evaluatedEmployee?.fullName ?? "—"}`)
    .text(`Score: ${shop.totalScore.toFixed(1)} / ${shop.totalMax.toFixed(0)} (${shop.percentage.toFixed(1)}%)`);
  doc.moveDown();

  const answersById = new Map(shop.answers.map((a) => [a.questionId, a]));
  for (const section of shop.rubric.sections) {
    doc.fontSize(14).fillColor("#000").text(section.name, { underline: true });
    doc.moveDown(0.3);
    for (const q of section.questions) {
      const a = answersById.get(q.id);
      doc.fontSize(11).fillColor("#222").text(`Q: ${q.text}`);
      doc.fontSize(10).fillColor("#444").text(`A: ${JSON.stringify(a?.answerValue ?? "—")}   (${a?.scoreAwarded.toFixed(1) ?? 0}/${q.maxScore})`);
      if (a?.comment) doc.fontSize(9).fillColor("#666").text(`Note: ${a.comment}`);
      doc.moveDown(0.2);
    }
    doc.moveDown(0.5);
  }

  if (shop.narrative) {
    doc.addPage().fontSize(14).text("Shopper Narrative", { underline: true }).moveDown(0.3);
    doc.fontSize(11).text(shop.narrative);
  }
  if (shop.review?.managerSummary) {
    doc.moveDown().fontSize(14).text("Manager Summary", { underline: true }).moveDown(0.3);
    doc.fontSize(11).text(shop.review.managerSummary);
  }
  if (shop.actionPlans.length > 0) {
    doc.moveDown().fontSize(14).text("Action Plans", { underline: true }).moveDown(0.3);
    for (const ap of shop.actionPlans) {
      doc.fontSize(11).text(`• [${ap.category}] ${ap.description} — due ${ap.dueDate.toISOString().slice(0, 10)} (${ap.status})`);
    }
  }
  doc.end();
});

export default router;
