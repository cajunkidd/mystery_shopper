import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { summarizeShop, clusterThemes } from "../ai.js";

const router = Router();
router.use(requireAuth);

// Per-shop AI summary (Phase 4 §6.9). Restricted to managers+ — employees see the raw data.
router.post("/shops/:id/summary", requireRole("store_manager", "district_manager", "admin"), async (req, res) => {
  const shop = await prisma.shop.findUnique({
    where: { id: req.params.id },
    include: {
      answers: { include: { question: true } },
      rubric: { include: { sections: { include: { questions: true } } } },
    },
  });
  if (!shop) return res.status(404).json({ error: "not_found" });
  if (req.user!.role === "store_manager" && shop.locationId !== req.user!.primaryLocationId) {
    return res.status(403).json({ error: "forbidden" });
  }
  try {
    const result = await summarizeShop({
      type: shop.type,
      shopDate: shop.shopDate,
      percentage: shop.percentage,
      narrative: shop.narrative,
      answers: shop.answers.map((a) => ({
        text: a.question.text,
        answer: typeof a.answerValue === "object" ? JSON.stringify(a.answerValue) : String(a.answerValue),
        comment: a.comment,
      })),
    });
    res.json({ summary: result });
  } catch (e) {
    if ((e as Error).message === "anthropic_api_key_missing") {
      return res.status(503).json({ error: "ai_not_configured" });
    }
    console.error(e);
    res.status(502).json({ error: "ai_failed" });
  }
});

// Theme clustering across a location's recent shops.
router.post("/locations/:id/themes", requireRole("store_manager", "district_manager", "admin"), async (req, res) => {
  const u = req.user!;
  if (u.role === "store_manager" && u.primaryLocationId !== req.params.id) return res.status(403).json({ error: "forbidden" });
  const since = new Date(Date.now() - 90 * 86400 * 1000);
  const shops = await prisma.shop.findMany({
    where: { locationId: req.params.id, status: { not: "draft" }, shopDate: { gte: since } },
    take: 50,
    orderBy: { shopDate: "desc" },
    include: {
      comments: { take: 5, orderBy: { createdAt: "desc" }, select: { body: true } },
    },
  });
  try {
    const result = await clusterThemes(
      `Location ${req.params.id}, last 90 days`,
      shops.map((s) => ({
        shopId: s.id,
        date: s.shopDate.toISOString().slice(0, 10),
        percentage: s.percentage,
        narrative: s.narrative,
        topComments: s.comments.map((c) => c.body),
      })),
    );
    res.json({ themes: result });
  } catch (e) {
    if ((e as Error).message === "anthropic_api_key_missing") {
      return res.status(503).json({ error: "ai_not_configured" });
    }
    console.error(e);
    res.status(502).json({ error: "ai_failed" });
  }
});

export default router;
