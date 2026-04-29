import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { notify } from "../notifications.js";

const router = Router();
router.use(requireAuth);

router.get("/hunt/active", async (_req, res) => {
  const now = new Date();
  const campaigns = await prisma.huntCampaign.findMany({
    where: { active: true, startsAt: { lte: now }, endsAt: { gte: now } },
    orderBy: { startsAt: "desc" },
  });
  res.json({ campaigns });
});

router.get("/hunt/campaigns", requireRole("admin"), async (_req, res) => {
  const campaigns = await prisma.huntCampaign.findMany({ orderBy: { startsAt: "desc" } });
  res.json({ campaigns });
});

const createBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startsAt: z.string(),
  endsAt: z.string(),
  scenarios: z.array(z.object({
    name: z.string(),
    triggerPhrase: z.string().optional(),
    codeword: z.string().optional(),
    description: z.string().optional(),
  })).optional(),
});

router.post("/hunt/campaigns", requireRole("admin"), async (req, res) => {
  const parsed = createBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  const c = await prisma.huntCampaign.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      scenarios: parsed.data.scenarios as never,
      active: true,
    },
  });
  res.status(201).json({ campaign: c });
});

router.post("/hunt/campaigns/:id/deactivate", requireRole("admin"), async (req, res) => {
  await prisma.huntCampaign.update({ where: { id: req.params.id }, data: { active: false } });
  res.json({ ok: true });
});

// Manager records that an employee delivered the standard during a hunt — this is the
// "reveal" event from §6.5. Hunt-reveal points and a notification are awarded.
const revealBody = z.object({
  shopId: z.string().uuid(),
  recognizedEmployeeId: z.string().uuid(),
});

router.post("/hunt/campaigns/:id/reveal", requireRole("store_manager", "district_manager", "admin"), async (req, res) => {
  const parsed = revealBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  const campaign = await prisma.huntCampaign.findUnique({ where: { id: req.params.id } });
  if (!campaign) return res.status(404).json({ error: "campaign_not_found" });

  const reveal = await prisma.huntReveal.create({
    data: {
      huntCampaignId: campaign.id,
      shopId: parsed.data.shopId,
      recognizedEmployeeId: parsed.data.recognizedEmployeeId,
      identifiedByEmployees: [],
    },
  });
  await prisma.pointsLedger.create({
    data: {
      userId: parsed.data.recognizedEmployeeId,
      sourceType: "hunt_reveal",
      sourceRefId: reveal.id,
      points: 50,
      reason: `Hunt: ${campaign.name}`,
      awardedById: req.user!.id,
    },
  });
  await notify(
    prisma,
    parsed.data.recognizedEmployeeId,
    "hunt_reveal",
    `You earned a Hunt recognition: ${campaign.name}`,
    "A mystery shopper recognized you delivering the standard. Manager will be in touch about the reward.",
  );
  res.status(201).json({ reveal });
});

router.get("/hunt/campaigns/:id/reveals", requireRole("store_manager", "district_manager", "admin"), async (req, res) => {
  const reveals = await prisma.huntReveal.findMany({
    where: { huntCampaignId: req.params.id },
    orderBy: { revealedAt: "desc" },
  });
  res.json({ reveals });
});

// Employee guesses which past shop was a Hunt — correct guesses earn small bonus points.
const guessBody = z.object({ shopId: z.string().uuid() });
router.post("/hunt/campaigns/:id/guess", async (req, res) => {
  const u = req.user!;
  if (u.role !== "employee") return res.status(403).json({ error: "forbidden" });
  const parsed = guessBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });

  const reveal = await prisma.huntReveal.findFirst({
    where: { huntCampaignId: req.params.id, shopId: parsed.data.shopId },
  });

  // Already-guessed guard: each employee can register one guess per campaign.
  const allReveals = await prisma.huntReveal.findMany({
    where: { huntCampaignId: req.params.id },
    select: { id: true, identifiedByEmployees: true },
  });
  const alreadyGuessed = allReveals.some((r) => r.identifiedByEmployees.includes(u.id));
  if (alreadyGuessed) return res.status(409).json({ error: "already_guessed" });

  if (!reveal) {
    // Wrong guess — no penalty per §10 (additive, never punitive).
    return res.json({ correct: false });
  }
  await prisma.huntReveal.update({
    where: { id: reveal.id },
    data: { identifiedByEmployees: { push: u.id } },
  });
  await prisma.pointsLedger.create({
    data: {
      userId: u.id,
      sourceType: "hunt_reveal",
      sourceRefId: reveal.id,
      points: 10,
      reason: "Correct Hunt guess",
    },
  });
  await notify(prisma, u.id, "hunt_guess_correct", "Correct Hunt guess!", "+10 points", "/recognition");
  res.json({ correct: true, points: 10 });
});

export default router;
