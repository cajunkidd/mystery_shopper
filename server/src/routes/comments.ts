import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();
router.use(requireAuth);

const body = z.object({
  body: z.string().min(1),
  audioTimestampSeconds: z.number().int().nonnegative().optional(),
});

router.post("/shops/:id/comments", async (req, res) => {
  const parsed = body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  const c = await prisma.comment.create({
    data: {
      shopId: req.params.id,
      authorId: req.user!.id,
      body: parsed.data.body,
      audioTimestampSeconds: parsed.data.audioTimestampSeconds,
    },
  });
  res.status(201).json({ comment: c });
});

router.post("/action-plans/:id/comments", async (req, res) => {
  const parsed = body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  const c = await prisma.comment.create({
    data: { actionPlanId: req.params.id, authorId: req.user!.id, body: parsed.data.body },
  });
  res.status(201).json({ comment: c });
});

router.post("/appeals/:id/comments", async (req, res) => {
  const parsed = body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  const c = await prisma.comment.create({
    data: { appealId: req.params.id, authorId: req.user!.id, body: parsed.data.body },
  });
  res.status(201).json({ comment: c });
});

export default router;
