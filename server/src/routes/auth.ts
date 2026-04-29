import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, signToken, verifyPassword } from "../auth.js";

const router = Router();

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  const parsed = loginBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !user.active) return res.status(401).json({ error: "invalid_credentials" });
  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "invalid_credentials" });
  const token = signToken(user.id);
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      primaryLocationId: user.primaryLocationId,
      districtIds: user.districtIds,
    },
  });
});

router.post("/logout", (_req, res) => {
  // Stateless JWT — client just discards the token.
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

export default router;
