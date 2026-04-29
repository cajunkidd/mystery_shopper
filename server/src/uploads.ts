import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");

if (!fs.existsSync(UPLOAD_ROOT)) {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

const storage = multer.diskStorage({
  destination: UPLOAD_ROOT,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 8);
    const id = crypto.randomBytes(16).toString("hex");
    cb(null, `${id}${ext}`);
  },
});

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/x-m4a",
  "application/pdf",
]);

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("unsupported_mime_type"));
    }
    cb(null, true);
  },
});

export function uploadPath(filename: string): string {
  return path.join(UPLOAD_ROOT, filename);
}

export const UPLOAD_DIR = UPLOAD_ROOT;
