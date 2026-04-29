import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { audit } from "../audit.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const where: Record<string, unknown> = {};
  if (req.query.type) where.type = req.query.type;
  if (req.query.status) where.status = req.query.status;
  const rubrics = await prisma.rubric.findMany({
    where,
    orderBy: [{ type: "asc" }, { version: "desc" }],
    include: { _count: { select: { sections: true, shops: true } } },
  });
  // Active rubrics change at activate/retire time; 60 seconds is plenty short
  // to pick those changes up while still cutting wizard-load chatter.
  res.setHeader("Cache-Control", "private, max-age=60");
  res.json({ rubrics });
});

router.get("/:id", async (req, res) => {
  const rubric = await prisma.rubric.findUnique({
    where: { id: req.params.id },
    include: {
      sections: {
        orderBy: { displayOrder: "asc" },
        include: { questions: { orderBy: { displayOrder: "asc" } } },
      },
    },
  });
  if (!rubric) return res.status(404).json({ error: "not_found" });
  res.json({ rubric });
});

const questionInput = z.object({
  text: z.string().min(1),
  questionType: z.enum(["yes_no", "scale_1_5", "multi_choice", "free_text", "photo_required", "audio_required"]),
  weight: z.number().default(1),
  maxScore: z.number().default(1),
  options: z.any().optional(),
  conditionalLogic: z.any().optional(),
  required: z.boolean().default(true),
  displayOrder: z.number(),
});

const sectionInput = z.object({
  name: z.string().min(1),
  displayOrder: z.number(),
  weight: z.number().default(1),
  questions: z.array(questionInput),
});

const createBody = z.object({
  name: z.string().min(1),
  type: z.enum(["visit", "call", "web_inquiry", "social_inquiry"]),
  sections: z.array(sectionInput),
});

function maxFromSections(sections: z.infer<typeof sectionInput>[]): { sectionMax: number[]; total: number } {
  const sectionMax = sections.map((s) => s.questions.reduce((acc, q) => acc + q.maxScore, 0));
  const total = sectionMax.reduce((a, b) => a + b, 0);
  return { sectionMax, total };
}

router.post("/", requireRole("admin"), async (req, res) => {
  const parsed = createBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  const data = parsed.data;
  // version = max existing version of same type + 1
  const prev = await prisma.rubric.findFirst({ where: { type: data.type }, orderBy: { version: "desc" } });
  const nextVersion = (prev?.version ?? 0) + 1;
  const { sectionMax, total } = maxFromSections(data.sections);
  const rubric = await prisma.rubric.create({
    data: {
      name: data.name,
      type: data.type,
      version: nextVersion,
      status: "draft",
      totalMaxScore: total,
      createdById: req.user!.id,
      sections: {
        create: data.sections.map((s, i) => ({
          name: s.name,
          displayOrder: s.displayOrder,
          weight: s.weight,
          maxScore: sectionMax[i],
          questions: {
            create: s.questions.map((q) => ({
              text: q.text,
              questionType: q.questionType,
              weight: q.weight,
              maxScore: q.maxScore,
              options: q.options ?? undefined,
              conditionalLogic: q.conditionalLogic ?? undefined,
              required: q.required,
              displayOrder: q.displayOrder,
            })),
          },
        })),
      },
    },
  });
  res.status(201).json({ id: rubric.id });
});

router.patch("/:id", requireRole("admin"), async (req, res) => {
  const rubric = await prisma.rubric.findUnique({ where: { id: req.params.id } });
  if (!rubric) return res.status(404).json({ error: "not_found" });
  if (rubric.status !== "draft") return res.status(409).json({ error: "rubric_locked" });
  const parsed = createBody.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  // For simplicity: if sections are passed, replace them entirely.
  if (parsed.data.sections) {
    const { sectionMax, total } = maxFromSections(parsed.data.sections);
    await prisma.$transaction([
      prisma.rubricSection.deleteMany({ where: { rubricId: rubric.id } }),
      prisma.rubric.update({
        where: { id: rubric.id },
        data: {
          name: parsed.data.name ?? rubric.name,
          totalMaxScore: total,
          sections: {
            create: parsed.data.sections.map((s, i) => ({
              name: s.name,
              displayOrder: s.displayOrder,
              weight: s.weight,
              maxScore: sectionMax[i],
              questions: {
                create: s.questions.map((q) => ({
                  text: q.text,
                  questionType: q.questionType,
                  weight: q.weight,
                  maxScore: q.maxScore,
                  options: q.options ?? undefined,
                  conditionalLogic: q.conditionalLogic ?? undefined,
                  required: q.required,
                  displayOrder: q.displayOrder,
                })),
              },
            })),
          },
        },
      }),
    ]);
  } else if (parsed.data.name) {
    await prisma.rubric.update({ where: { id: rubric.id }, data: { name: parsed.data.name } });
  }
  res.json({ ok: true });
});

router.post("/:id/activate", requireRole("admin"), async (req, res) => {
  const rubric = await prisma.rubric.findUnique({ where: { id: req.params.id } });
  if (!rubric) return res.status(404).json({ error: "not_found" });
  if (rubric.status !== "draft") return res.status(409).json({ error: "not_draft" });
  // Retire any existing active rubric of the same type.
  await prisma.$transaction([
    prisma.rubric.updateMany({
      where: { type: rubric.type, status: "active" },
      data: { status: "retired", retiredAt: new Date() },
    }),
    prisma.rubric.update({ where: { id: rubric.id }, data: { status: "active" } }),
  ]);
  await audit(prisma, req, "rubric", rubric.id, "status_change",
    { status: "draft" }, { status: "active", type: rubric.type, version: rubric.version });
  res.json({ ok: true });
});

router.post("/:id/retire", requireRole("admin"), async (req, res) => {
  const before = await prisma.rubric.findUnique({ where: { id: req.params.id } });
  await prisma.rubric.update({
    where: { id: req.params.id },
    data: { status: "retired", retiredAt: new Date() },
  });
  await audit(prisma, req, "rubric", req.params.id, "status_change",
    { status: before?.status ?? null }, { status: "retired" });
  res.json({ ok: true });
});

// Duplicate an existing rubric as a new draft of the next version. The
// original stays active; the draft can be edited and activated later.
router.post("/:id/duplicate", requireRole("admin"), async (req, res) => {
  const source = await prisma.rubric.findUnique({
    where: { id: req.params.id },
    include: { sections: { include: { questions: true }, orderBy: { displayOrder: "asc" } } },
  });
  if (!source) return res.status(404).json({ error: "not_found" });
  const latest = await prisma.rubric.findFirst({
    where: { type: source.type },
    orderBy: { version: "desc" },
  });
  const dup = await prisma.rubric.create({
    data: {
      name: `${source.name.replace(/ v\d+$/, "")} v${(latest?.version ?? source.version) + 1}`,
      type: source.type,
      version: (latest?.version ?? source.version) + 1,
      status: "draft",
      totalMaxScore: source.totalMaxScore,
      createdById: req.user!.id,
      sections: {
        create: source.sections.map((s) => ({
          name: s.name,
          displayOrder: s.displayOrder,
          weight: s.weight,
          maxScore: s.maxScore,
          questions: {
            create: s.questions.map((q) => ({
              text: q.text,
              questionType: q.questionType,
              weight: q.weight,
              maxScore: q.maxScore,
              options: q.options ?? undefined,
              conditionalLogic: q.conditionalLogic ?? undefined,
              required: q.required,
              displayOrder: q.displayOrder,
            })),
          },
        })),
      },
    },
  });
  res.status(201).json({ id: dup.id });
});

export default router;
