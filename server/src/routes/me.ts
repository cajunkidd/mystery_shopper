import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import { audit } from "../audit.js";

const router = Router();
router.use(requireAuth);

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
