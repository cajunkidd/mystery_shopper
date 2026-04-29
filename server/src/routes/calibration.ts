import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { summarizeCalibration } from "../calibration.js";

const router = Router();
router.use(requireAuth);

router.get("/calibration", requireRole("admin", "district_manager"), async (_req, res) => {
  const sessions = await prisma.calibrationSession.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { entries: true } } },
  });
  res.json({ sessions });
});

const createBody = z.object({
  name: z.string().min(1),
  notes: z.string().optional(),
});

router.post("/calibration", requireRole("admin"), async (req, res) => {
  const parsed = createBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  const session = await prisma.calibrationSession.create({
    data: { ...parsed.data, createdById: req.user!.id },
  });
  res.status(201).json({ session });
});

router.get("/calibration/:id", requireRole("admin", "district_manager", "store_manager"), async (req, res) => {
  const session = await prisma.calibrationSession.findUnique({
    where: { id: req.params.id },
    include: { entries: true },
  });
  if (!session) return res.status(404).json({ error: "not_found" });
  const stats = summarizeCalibration(session.entries);
  res.json({ session, stats });
});

const submitBody = z.object({
  shopId: z.string().uuid(),
  scorePercentage: z.number().min(0).max(110),
  notes: z.string().optional(),
});

router.post("/calibration/:id/entries", requireRole("store_manager", "district_manager", "admin"), async (req, res) => {
  const parsed = submitBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  const entry = await prisma.calibrationEntry.upsert({
    where: {
      sessionId_shopId_reviewerId: {
        sessionId: req.params.id,
        shopId: parsed.data.shopId,
        reviewerId: req.user!.id,
      },
    },
    update: { scorePercentage: parsed.data.scorePercentage, notes: parsed.data.notes },
    create: {
      sessionId: req.params.id,
      shopId: parsed.data.shopId,
      reviewerId: req.user!.id,
      scorePercentage: parsed.data.scorePercentage,
      notes: parsed.data.notes,
    },
  });
  res.status(201).json({ entry });
});

export default router;
