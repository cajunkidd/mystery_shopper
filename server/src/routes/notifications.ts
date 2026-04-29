import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const items = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unread = await prisma.notification.count({
    where: { userId: req.user!.id, read: false },
  });
  res.json({ notifications: items, unread });
});

router.post("/:id/read", async (req, res) => {
  const n = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!n || n.userId !== req.user!.id) return res.status(404).json({ error: "not_found" });
  await prisma.notification.update({
    where: { id: n.id },
    data: { read: true, readAt: new Date() },
  });
  res.json({ ok: true });
});

router.post("/read-all", async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, read: false },
    data: { read: true, readAt: new Date() },
  });
  res.json({ ok: true });
});

export default router;
