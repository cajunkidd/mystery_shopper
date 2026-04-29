import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { hashPassword, requireAuth, requireRole } from "../auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", requireRole("admin", "district_manager"), async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      primaryLocationId: true,
      districtIds: true,
      active: true,
      hireDate: true,
    },
  });
  res.json({ users });
});

const createBody = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(["employee", "store_manager", "district_manager", "admin"]),
  primaryLocationId: z.string().uuid().nullable().optional(),
  districtIds: z.array(z.string().uuid()).optional(),
  hireDate: z.string().datetime().optional(),
});

router.post("/", requireRole("admin"), async (req, res) => {
  const parsed = createBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  const data = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) return res.status(409).json({ error: "email_exists" });
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      fullName: data.fullName,
      role: data.role,
      passwordHash: await hashPassword(data.password),
      primaryLocationId: data.primaryLocationId ?? null,
      districtIds: data.districtIds ?? [],
      hireDate: data.hireDate ? new Date(data.hireDate) : null,
    },
  });
  res.status(201).json({ id: user.id });
});

router.get("/:id", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, email: true, fullName: true, role: true,
      primaryLocationId: true, districtIds: true, active: true, hireDate: true,
    },
  });
  if (!user) return res.status(404).json({ error: "not_found" });
  // employees can only see themselves
  if (req.user!.role === "employee" && req.user!.id !== user.id) return res.status(403).json({ error: "forbidden" });
  res.json({ user });
});

const patchBody = z.object({
  fullName: z.string().optional(),
  role: z.enum(["employee", "store_manager", "district_manager", "admin"]).optional(),
  primaryLocationId: z.string().uuid().nullable().optional(),
  districtIds: z.array(z.string().uuid()).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

router.patch("/:id", requireRole("admin"), async (req, res) => {
  const parsed = patchBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.password) {
    data.passwordHash = await hashPassword(parsed.data.password);
    delete data.password;
  }
  const user = await prisma.user.update({ where: { id: req.params.id }, data });
  res.json({ id: user.id });
});

export default router;
