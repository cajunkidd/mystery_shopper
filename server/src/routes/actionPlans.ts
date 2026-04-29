import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { notify } from "../notifications.js";

const router = Router();
router.use(requireAuth);

const createBody = z.object({
  assignedToId: z.string().uuid(),
  reviewId: z.string().uuid().optional(),
  category: z.string().min(1),
  description: z.string().min(1),
  dueDate: z.string(),
});

// POST /shops/:id/action-plans
router.post("/shops/:id/action-plans", requireRole("store_manager", "district_manager", "admin"), async (req, res) => {
  const parsed = createBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const ap = await prisma.actionPlan.create({
    data: {
      shopId: req.params.id,
      reviewId: parsed.data.reviewId,
      assignedToId: parsed.data.assignedToId,
      assignedById: req.user!.id,
      category: parsed.data.category,
      description: parsed.data.description,
      dueDate: new Date(parsed.data.dueDate),
    },
  });
  await notify(
    prisma,
    parsed.data.assignedToId,
    "action_plan_assigned",
    `New action plan: ${parsed.data.category}`,
    parsed.data.description,
    `/action-plans`,
  );
  res.status(201).json({ actionPlan: ap });
});

// GET /action-plans?scope=mine|assigned-by-me
router.get("/action-plans", async (req, res) => {
  const u = req.user!;
  const scope = req.query.scope as string | undefined;
  let where: Record<string, unknown> = {};
  if (scope === "mine" || u.role === "employee") where = { assignedToId: u.id };
  else if (scope === "assigned-by-me") where = { assignedById: u.id };
  else if (u.role === "store_manager") where = { shop: { locationId: u.primaryLocationId ?? "__none__" } };
  // admin & district see all by default
  const plans = await prisma.actionPlan.findMany({
    where,
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    include: {
      shop: { select: { id: true, shopDate: true, type: true, locationId: true } },
      assignedTo: { select: { id: true, fullName: true } },
      assignedBy: { select: { id: true, fullName: true } },
    },
  });
  res.json({ actionPlans: plans });
});

router.post("/action-plans/:id/acknowledge", async (req, res) => {
  const ap = await prisma.actionPlan.findUnique({ where: { id: req.params.id } });
  if (!ap) return res.status(404).json({ error: "not_found" });
  if (ap.assignedToId !== req.user!.id) return res.status(403).json({ error: "forbidden" });
  const updated = await prisma.actionPlan.update({
    where: { id: ap.id },
    data: { status: "acknowledged", acknowledgedAt: new Date() },
  });
  res.json({ actionPlan: updated });
});

router.post("/action-plans/:id/complete", async (req, res) => {
  const ap = await prisma.actionPlan.findUnique({ where: { id: req.params.id } });
  if (!ap) return res.status(404).json({ error: "not_found" });
  if (ap.assignedToId !== req.user!.id) return res.status(403).json({ error: "forbidden" });
  const updated = await prisma.actionPlan.update({
    where: { id: ap.id },
    data: { status: "completed", completedAt: new Date() },
  });
  res.json({ actionPlan: updated });
});

// Bulk reassign — manager+ only. Reassigns every plan in `ids` to a new
// employee. Useful when an employee leaves or transfers — you don't want
// to manually click through every open plan.
const bulkReassignBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  toUserId: z.string().uuid(),
});
router.post(
  "/action-plans/bulk-reassign",
  requireRole("store_manager", "district_manager", "admin"),
  async (req, res) => {
    const parsed = bulkReassignBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
    const target = await prisma.user.findUnique({ where: { id: parsed.data.toUserId } });
    if (!target || !target.active) return res.status(400).json({ error: "invalid_target" });
    const result = await prisma.actionPlan.updateMany({
      where: { id: { in: parsed.data.ids } },
      data: { assignedToId: parsed.data.toUserId },
    });
    // Notify the new assignee in one batched call (one notification per plan
    // would spam — a single rollup is friendlier).
    if (result.count > 0) {
      await notify(
        prisma,
        parsed.data.toUserId,
        "action_plan_assigned",
        `${result.count} action plans were reassigned to you`,
        "Reassignment from a manager.",
        "/action-plans",
      );
    }
    res.json({ reassigned: result.count });
  },
);

// Bulk verify — accepts up to 100 action plan IDs at once. Manager+ only;
// each plan must be in 'completed' state to flip to 'verified'.
const bulkVerifyBody = z.object({ ids: z.array(z.string().uuid()).min(1).max(100) });
router.post(
  "/action-plans/bulk-verify",
  requireRole("store_manager", "district_manager", "admin"),
  async (req, res) => {
    const parsed = bulkVerifyBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
    const result = await prisma.actionPlan.updateMany({
      where: { id: { in: parsed.data.ids }, status: "completed" },
      data: { status: "verified", verifiedAt: new Date() },
    });
    res.json({ verified: result.count });
  },
);

const verifyBody = z.object({ verificationNotes: z.string().optional() });
router.post("/action-plans/:id/verify", requireRole("store_manager", "district_manager", "admin"), async (req, res) => {
  const parsed = verifyBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const updated = await prisma.actionPlan.update({
    where: { id: req.params.id },
    data: { status: "verified", verifiedAt: new Date(), verificationNotes: parsed.data.verificationNotes },
  });
  res.json({ actionPlan: updated });
});

export default router;
