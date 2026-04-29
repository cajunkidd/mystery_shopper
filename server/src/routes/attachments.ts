import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import { upload, uploadPath, UPLOAD_DIR } from "../uploads.js";

const router = Router();
router.use(requireAuth);

// Upload attached to a shop (e.g. mystery caller audio recording, photos)
router.post("/shops/:id/attachments", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no_file" });
  const shop = await prisma.shop.findUnique({ where: { id: req.params.id } });
  if (!shop) return res.status(404).json({ error: "shop_not_found" });

  const isAudio = req.file.mimetype.startsWith("audio/");
  const setAsAudio = req.body.role === "audio" || (isAudio && shop.type === "call");

  const attachment = await prisma.attachment.create({
    data: {
      shopId: shop.id,
      shopAnswerId: req.body.shopAnswerId || null,
      filePath: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSizeBytes: req.file.size,
      uploadedById: req.user!.id,
      retentionUntil: isAudio ? new Date(Date.now() + 365 * 86400 * 1000) : null,
    },
  });
  if (setAsAudio) {
    await prisma.shop.update({
      where: { id: shop.id },
      data: { audioFileId: attachment.id },
    });
  }
  res.status(201).json({ attachment });
});

// Stream a file. Tokens come via Authorization header.
router.get("/attachments/:id/file", async (req, res) => {
  const att = await prisma.attachment.findUnique({ where: { id: req.params.id } });
  if (!att) return res.status(404).json({ error: "not_found" });

  // Role gating: employees can only access attachments on their own shops once review is completed.
  if (att.shopId) {
    const shop = await prisma.shop.findUnique({
      where: { id: att.shopId },
      include: { review: true },
    });
    if (!shop) return res.status(404).json({ error: "shop_not_found" });
    const u = req.user!;
    if (u.role === "employee") {
      if (shop.evaluatedEmployeeId !== u.id) return res.status(403).json({ error: "forbidden" });
      // §6.7: comments visible to employee only after manager release. Audio same rule.
      if (!shop.review || shop.review.status !== "completed") {
        return res.status(403).json({ error: "not_yet_released" });
      }
    } else if (u.role === "store_manager" && shop.locationId !== u.primaryLocationId) {
      return res.status(403).json({ error: "forbidden" });
    }
  }

  const abs = path.resolve(uploadPath(att.filePath));
  // Defense in depth: ensure the resolved path is still within UPLOAD_DIR.
  if (!abs.startsWith(path.resolve(UPLOAD_DIR))) {
    return res.status(400).json({ error: "bad_path" });
  }
  if (!fs.existsSync(abs)) return res.status(404).json({ error: "file_missing" });
  res.setHeader("Content-Type", att.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${att.originalName.replace(/"/g, "")}"`);
  fs.createReadStream(abs).pipe(res);
});

router.delete("/attachments/:id", async (req, res) => {
  const att = await prisma.attachment.findUnique({ where: { id: req.params.id } });
  if (!att) return res.status(404).json({ error: "not_found" });
  if (att.uploadedById !== req.user!.id && req.user!.role !== "admin") {
    return res.status(403).json({ error: "forbidden" });
  }
  await prisma.attachment.delete({ where: { id: att.id } });
  const abs = uploadPath(att.filePath);
  if (fs.existsSync(abs)) fs.unlinkSync(abs);
  res.json({ ok: true });
});

export default router;
