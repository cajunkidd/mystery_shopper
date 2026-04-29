import { Router } from "express";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { computeShopTotals } from "../scoring.js";
import { upload } from "../uploads.js";
import fs from "node:fs";
import { uploadPath } from "../uploads.js";

const router = Router();
router.use(requireAuth);

// POST /imports/preview — upload CSV, return parsed rows so the user can map columns.
router.post("/imports/preview", requireRole("admin"), upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no_file" });
  const raw = fs.readFileSync(uploadPath(req.file.filename));
  fs.unlinkSync(uploadPath(req.file.filename));
  let rows: Record<string, string>[];
  try {
    rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
  } catch (e) {
    return res.status(400).json({ error: "csv_parse_failed", detail: (e as Error).message });
  }
  const headers = rows.length ? Object.keys(rows[0]) : [];
  res.json({ rowCount: rows.length, headers, sample: rows.slice(0, 5) });
});

// POST /imports/commit — apply a column mapping and create shops.
const mappingSchema = z.object({
  rubricId: z.string().uuid(),
  rows: z.array(z.record(z.string(), z.unknown())),
  mapping: z.object({
    locationCode: z.string(),
    shopDate: z.string(),
    shopperName: z.string().optional(),
    shopperExternalRef: z.string().optional(),
    narrative: z.string().optional(),
    employeeEmail: z.string().optional(),
    answers: z.array(z.object({ questionId: z.string().uuid(), column: z.string() })),
  }),
});

router.post("/imports/commit", requireRole("admin"), async (req, res) => {
  const parsed = mappingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  const { rubricId, rows, mapping } = parsed.data;
  const rubric = await prisma.rubric.findUnique({
    where: { id: rubricId },
    include: { sections: { include: { questions: true } } },
  });
  if (!rubric) return res.status(404).json({ error: "rubric_not_found" });
  const allQuestions = rubric.sections.flatMap((s) => s.questions);

  const created: string[] = [];
  const errors: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] as Record<string, unknown>;
    try {
      const code = String(r[mapping.locationCode] ?? "").trim();
      const location = code ? await prisma.location.findUnique({ where: { code } }) : null;
      if (!location) {
        errors.push({ row: i + 1, reason: `unknown location code: ${code}` });
        continue;
      }
      const dateStr = String(r[mapping.shopDate] ?? "").trim();
      const shopDate = new Date(dateStr);
      if (Number.isNaN(shopDate.getTime())) {
        errors.push({ row: i + 1, reason: `bad date: ${dateStr}` });
        continue;
      }
      let employeeId: string | null = null;
      if (mapping.employeeEmail) {
        const email = String(r[mapping.employeeEmail] ?? "").trim().toLowerCase();
        if (email) {
          const u = await prisma.user.findUnique({ where: { email } });
          employeeId = u?.id ?? null;
        }
      }
      const answers = mapping.answers.map((m) => ({
        questionId: m.questionId,
        answerValue: r[m.column] ?? null,
      }));
      const totals = computeShopTotals(allQuestions, answers);
      const shop = await prisma.shop.create({
        data: {
          rubricId,
          rubricVersion: rubric.version,
          type: rubric.type,
          locationId: location.id,
          shopDate,
          evaluatedEmployeeId: employeeId,
          shopperName: mapping.shopperName ? String(r[mapping.shopperName] ?? "") || null : null,
          shopperExternalRef: mapping.shopperExternalRef
            ? String(r[mapping.shopperExternalRef] ?? "") || null
            : null,
          narrative: mapping.narrative ? String(r[mapping.narrative] ?? "") || null : null,
          status: "submitted",
          submittedAt: new Date(),
          totalScore: totals.totalScore,
          totalMax: totals.totalMax,
          percentage: totals.percentage,
          source: "agency_import",
          createdById: req.user!.id,
          answers: {
            create: answers.map((a) => ({
              questionId: a.questionId,
              answerValue: a.answerValue as never,
              scoreAwarded: totals.perAnswer.find((p) => p.questionId === a.questionId)?.score ?? 0,
            })),
          },
        },
      });
      created.push(shop.id);
    } catch (e) {
      errors.push({ row: i + 1, reason: (e as Error).message });
    }
  }
  res.json({ created: created.length, errors });
});

export default router;
