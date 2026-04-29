import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import { audit } from "../audit.js";
import { capabilitiesFor } from "../permissions.js";

const router = Router();
router.use(requireAuth);

router.get("/me/permissions", (req, res) => {
  res.json({ role: req.user!.role, capabilities: capabilitiesFor(req.user!.role) });
});

router.get("/me/preferences", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { notifyByEmail: true, notifyBySms: true },
  });
  res.json({ preferences: user });
});

const prefsBody = z.object({
  notifyByEmail: z.boolean().optional(),
  notifyBySms: z.boolean().optional(),
});

router.patch("/me/preferences", async (req, res) => {
  const parsed = prefsBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: parsed.data,
    select: { notifyByEmail: true, notifyBySms: true },
  });
  res.json({ preferences: user });
});

// §11 — "Right to know: employees can request a full export of their own data."
router.get("/me/export", async (req, res) => {
  const userId = req.user!.id;
  const [user, shops, actionPlans, appeals, comments, points, badges, notifications] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, role: true, hireDate: true, createdAt: true },
    }),
    prisma.shop.findMany({
      where: { evaluatedEmployeeId: userId },
      include: {
        location: { select: { code: true, name: true } },
        review: true,
        answers: { include: { question: { select: { text: true } } } },
      },
    }),
    prisma.actionPlan.findMany({ where: { assignedToId: userId } }),
    prisma.appeal.findMany({ where: { filedById: userId } }),
    prisma.comment.findMany({ where: { authorId: userId } }),
    prisma.pointsLedger.findMany({ where: { userId } }),
    prisma.userBadge.findMany({ where: { userId }, include: { badge: true } }),
    prisma.notification.findMany({ where: { userId } }),
  ]);

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    user,
    shops,
    actionPlans,
    appeals,
    comments,
    points,
    badges,
    notifications,
  };

  await audit(prisma, req, "user", userId, "self_data_export", null, {
    shops: shops.length,
    actionPlans: actionPlans.length,
    appeals: appeals.length,
  });
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="stine-mystery-shop-data-${userId.slice(0, 8)}.json"`,
  );
  res.send(JSON.stringify(exportPayload, null, 2));
});

export default router;
