import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";

const router = Router();
router.use(requireAuth);

router.get("/training/modules", async (_req, res) => {
  const modules = await prisma.trainingModule.findMany({ orderBy: { name: "asc" } });
  res.json({ modules });
});

const moduleBody = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  url: z.string().url().optional(),
  durationMinutes: z.number().int().positive().optional(),
  rubricSectionMatch: z.string().optional(),
  active: z.boolean().optional(),
});

router.post("/training/modules", requireRole("admin"), async (req, res) => {
  const parsed = moduleBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const m = await prisma.trainingModule.create({ data: parsed.data });
  res.status(201).json({ module: m });
});

router.patch("/training/modules/:id", requireRole("admin"), async (req, res) => {
  const parsed = moduleBody.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const m = await prisma.trainingModule.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ module: m });
});

router.get("/training/assignments", async (req, res) => {
  const u = req.user!;
  const scope = req.query.scope as string | undefined;
  let where: Record<string, unknown> = {};
  if (scope === "mine" || u.role === "employee") where = { userId: u.id };
  else if (u.role === "store_manager") {
    const employees = await prisma.user.findMany({
      where: { primaryLocationId: u.primaryLocationId ?? "__none__", role: "employee" },
      select: { id: true },
    });
    where = { userId: { in: employees.map((x) => x.id) } };
  }
  const items = await prisma.trainingAssignment.findMany({
    where,
    orderBy: [{ status: "asc" }, { assignedAt: "desc" }],
    include: { trainingModule: true },
  });
  res.json({ assignments: items });
});

router.post("/training/assignments/:id/complete", async (req, res) => {
  const a = await prisma.trainingAssignment.findUnique({ where: { id: req.params.id } });
  if (!a) return res.status(404).json({ error: "not_found" });
  if (a.userId !== req.user!.id) return res.status(403).json({ error: "forbidden" });
  const updated = await prisma.trainingAssignment.update({
    where: { id: a.id },
    data: { status: "completed", completedAt: new Date() },
  });
  res.json({ assignment: updated });
});

router.post(
  "/training/assignments/:id/verify",
  requireRole("store_manager", "district_manager", "admin"),
  async (req, res) => {
    const updated = await prisma.trainingAssignment.update({
      where: { id: req.params.id },
      data: { status: "verified", verifiedAt: new Date() },
    });
    res.json({ assignment: updated });
  },
);

const retestBody = z.object({ retestShopId: z.string().uuid() });
router.post(
  "/training/assignments/:id/retest",
  requireRole("store_manager", "district_manager", "admin"),
  async (req, res) => {
    const parsed = retestBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
    const updated = await prisma.trainingAssignment.update({
      where: { id: req.params.id },
      data: { retestShopId: parsed.data.retestShopId },
    });
    res.json({ assignment: updated });
  },
);

export default router;
