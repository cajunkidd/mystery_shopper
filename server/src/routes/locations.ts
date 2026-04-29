import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });
  // Locations change rarely; lets the browser reuse for 5 minutes per session.
  // private so a shared CDN never serves it across users (location filter is
  // role-gated; this endpoint isn't but the data isn't sensitive).
  res.setHeader("Cache-Control", "private, max-age=300");
  res.json({ locations });
});

const upsertBody = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  district: z.string().optional(),
  active: z.boolean().optional(),
});

router.post("/", requireRole("admin"), async (req, res) => {
  const parsed = upsertBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const loc = await prisma.location.create({ data: parsed.data });
  res.status(201).json({ location: loc });
});

router.patch("/:id", requireRole("admin"), async (req, res) => {
  const parsed = upsertBody.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const loc = await prisma.location.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ location: loc });
});

export default router;
