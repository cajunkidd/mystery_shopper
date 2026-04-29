import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import locationRoutes from "./routes/locations.js";
import rubricRoutes from "./routes/rubrics.js";
import shopRoutes from "./routes/shops.js";
import reviewRoutes from "./routes/reviews.js";
import actionPlanRoutes from "./routes/actionPlans.js";
import appealRoutes from "./routes/appeals.js";
import commentRoutes from "./routes/comments.js";
import dashboardRoutes from "./routes/dashboards.js";
import attachmentRoutes from "./routes/attachments.js";
import gamificationRoutes from "./routes/gamification.js";
import notificationRoutes from "./routes/notifications.js";
import aiRoutes from "./routes/ai.js";
import importRoutes from "./routes/imports.js";
import leagueRoutes from "./routes/leagues.js";
import adminRoutes from "./routes/admin.js";
import huntRoutes from "./routes/hunt.js";
import meRoutes from "./routes/me.js";
import calibrationRoutes from "./routes/calibration.js";
import trainingRoutes from "./routes/training.js";
import { prisma } from "./db.js";
import { requestLogger } from "./logging.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Read package.json once at startup so /version is a constant-time response.
function readBuildVersion(): { version: string; node: string } {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // src/app.ts → ../package.json at dev; dist/app.js → ../package.json at build.
  const candidates = [path.join(here, "..", "package.json"), path.join(here, "..", "..", "package.json")];
  for (const c of candidates) {
    try {
      const pkg = JSON.parse(fs.readFileSync(c, "utf8")) as { version?: string };
      if (pkg.version) return { version: pkg.version, node: process.version };
    } catch {
      /* try next */
    }
  }
  return { version: "0.0.0", node: process.version };
}
const BUILD_VERSION = readBuildVersion();

// Hand-curated descriptions for the most-used endpoints. Keys are
// "METHOD /full/path"; missing entries surface as null on /_routes.
const ROUTE_DESCRIPTIONS: Record<string, string> = {
  // auth
  "POST /api/v1/auth/login": "Exchange email + password for a JWT (7-day expiry)",
  "POST /api/v1/auth/logout": "Stateless: client drops its token",
  "GET /api/v1/auth/me": "Current authenticated user",
  // me
  "GET /api/v1/me/preferences": "Per-user notification channel toggles",
  "PATCH /api/v1/me/preferences": "Update notification channel toggles",
  "GET /api/v1/me/permissions": "§9 capabilities for the current user's role",
  "GET /api/v1/me/export": "§11 self-serve data export as JSON",
  // shops
  "GET /api/v1/shops": "List shops (filterable by status/type/from/to/q/locationId/evaluatedEmployeeId)",
  "POST /api/v1/shops": "Create a shop (manual entry; pass submit:true to route to a manager)",
  "GET /api/v1/shops/:id": "Shop detail with rubric, answers, comments, action plans, appeals",
  "POST /api/v1/shops/:id/submit": "Move a draft shop to under_review",
  "GET /api/v1/shops/:id/pdf": "Branded per-shop PDF (logged in audit)",
  "POST /api/v1/shops/:id/summary": "AI summary + sentiment (manager+ only)",
  "POST /api/v1/shops/bulk-summary": "Bulk AI summary for up to 10 shops",
  "POST /api/v1/shops/:id/attachments": "Upload an attachment (per-shop or per-answer)",
  "POST /api/v1/shops/:id/comments": "Add a comment (general or audio-anchored via audioTimestampSeconds)",
  "POST /api/v1/shops/:id/review": "Open or claim a review",
  "POST /api/v1/shops/:id/action-plans": "Create an action plan tied to this shop",
  "POST /api/v1/shops/:id/appeals": "Employee files an appeal on their own shop",
  // reviews
  "PATCH /api/v1/reviews/:id": "Update review (summary, score adjustment, bonus)",
  "POST /api/v1/reviews/:id/complete": "Mark review complete; awards points + evaluates badges + auto-assigns training",
  // action plans
  "GET /api/v1/action-plans": "List action plans (?scope=mine|assigned-by-me)",
  "POST /api/v1/action-plans/:id/acknowledge": "Employee acknowledges",
  "POST /api/v1/action-plans/:id/complete": "Employee marks complete",
  "POST /api/v1/action-plans/:id/verify": "Manager verifies (with optional verificationNotes)",
  "POST /api/v1/action-plans/bulk-verify": "Verify up to 100 completed plans at once",
  "POST /api/v1/action-plans/bulk-reassign": "Reassign up to 100 plans to a different employee",
  // appeals
  "GET /api/v1/appeals": "List appeals (?scope=open)",
  "POST /api/v1/appeals/:id/resolve": "Resolve an appeal (audited)",
  "POST /api/v1/appeals/:id/escalate": "Escalate to district manager",
  // dashboards
  "GET /api/v1/dashboards/me": "Employee dashboard (personal best, trend, latest, plans)",
  "GET /api/v1/dashboards/location/:id": "Store dashboard (queue, recent, avg)",
  "GET /api/v1/dashboards/district/:district": "District roll-up",
  "GET /api/v1/dashboards/company": "Company-wide roll-up (admin only)",
  "GET /api/v1/dashboards/heatmap": "Locations × rubric sections heatmap",
  // gamification
  "GET /api/v1/gamification/me": "Points + badges for current user",
  "GET /api/v1/gamification/leaderboard": "Top 3 + most-improved (?scope=store|district|company)",
  "GET /api/v1/gamification/badges": "List all active badges",
  // hunt
  "GET /api/v1/hunt/active": "Active Hunt campaigns",
  "POST /api/v1/hunt/campaigns/:id/reveal": "Manager records a successful reveal",
  "POST /api/v1/hunt/campaigns/:id/guess": "Employee guesses which past shop was a Hunt",
  // training
  "GET /api/v1/training/assignments": "List training assignments",
  "POST /api/v1/training/assignments/:id/complete": "Employee marks training complete",
  "POST /api/v1/training/assignments/:id/verify": "Manager verifies",
  "POST /api/v1/training/assignments/:id/retest": "Link a retest shop and auto-evaluate trigger section",
  // imports
  "POST /api/v1/imports/preview": "CSV preview (admin)",
  "POST /api/v1/imports/commit": "CSV commit with rubric mapping",
  "POST /api/v1/imports/users": "Bulk user creation from CSV",
  "POST /api/v1/imports/pdf-preview": "Anthropic-powered single-shop PDF extract",
  // calibration
  "GET /api/v1/calibration": "List calibration sessions",
  "POST /api/v1/calibration/:id/entries": "Submit an independent score (idempotent upsert)",
  // ops
  "GET /api/v1/health": "DB + AI + scheduler status",
  "GET /api/v1/version": "Build version + Node version",
  "GET /api/v1/_routes": "This endpoint — auto-collected route listing",
  // admin
  "GET /api/v1/admin/overview": "Operational counts for the admin dashboard",
  "POST /api/v1/admin/jobs/run": "Manually run the scheduler",
  "GET /api/v1/admin/audit-log": "Audit log with friendly actor + entity labels",
  "GET /api/v1/admin/config": "SystemConfig key/value list",
  "PATCH /api/v1/admin/config/:key": "Set a SystemConfig value (cached 60s in-process)",
  "GET /api/v1/admin/outbox": "Deferred-email outbox (?status=pending|sent|failed)",
};

const startedAt = Date.now();

export function buildApp(): express.Express {
  const app = express();
  // Trust proxy in deploy environments (X-Forwarded-For from a load balancer);
  // disabled in tests so express-rate-limit doesn't complain about the loopback.
  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  // CSP: SPA + API + same-origin blob/data URLs for downloaded attachments
  // and PDFs. No third-party scripts; the SPA is served from the same origin
  // by nginx in docker, and Vite dev needs HMR (eased in dev only).
  const isDev = process.env.NODE_ENV !== "production";
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: isDev ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] : ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind injects inline style attributes
          imgSrc: ["'self'", "data:", "blob:"],
          mediaSrc: ["'self'", "blob:"],
          connectSrc: ["'self'", ...(isDev ? ["ws:", "http://localhost:4000"] : [])],
          fontSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: "same-origin" },
    }),
  );
  app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173", credentials: true }));
  // Skip compression for the audio/PDF stream endpoints — they're already
  // compressed binary and double-compressing wastes CPU.
  app.use(
    compression({
      filter: (req, res) => {
        const ct = res.getHeader("Content-Type");
        if (typeof ct === "string" && (ct.startsWith("audio/") || ct === "application/pdf" || ct.startsWith("image/"))) {
          return false;
        }
        return compression.filter(req, res);
      },
    }),
  );
  app.use(express.json({ limit: "5mb" }));
  app.use(requestLogger);

  // Mount a tight rate limit on the login route only — the rest of the API
  // is gated by JWT and the points/badges endpoints aren't worth abusing.
  if (process.env.NODE_ENV !== "test") {
    app.use(
      "/api/v1/auth/login",
      rateLimit({
        windowMs: 5 * 60 * 1000,
        limit: 20,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: "rate_limited" },
      }),
    );
  }

  app.get("/api/v1/health", async (_req, res) => {
    const t0 = Date.now();
    let db: "ok" | "error" = "ok";
    try {
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch {
      db = "error";
    }
    res.json({
      ok: db === "ok",
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      db,
      dbLatencyMs: Date.now() - t0,
      ai: {
        configured: !!process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      },
      scheduler: {
        enabled: process.env.SCHEDULER_DISABLED !== "1" && process.env.NODE_ENV !== "test",
      },
    });
  });

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", userRoutes);
  app.use("/api/v1/locations", locationRoutes);
  app.use("/api/v1/rubrics", rubricRoutes);
  app.use("/api/v1/shops", shopRoutes);
  app.use("/api/v1", reviewRoutes);
  app.use("/api/v1", actionPlanRoutes);
  app.use("/api/v1", appealRoutes);
  app.use("/api/v1", commentRoutes);
  app.use("/api/v1", attachmentRoutes);
  app.use("/api/v1/dashboards", dashboardRoutes);
  app.use("/api/v1/gamification", gamificationRoutes);
  app.use("/api/v1/notifications", notificationRoutes);
  app.use("/api/v1", aiRoutes);
  app.use("/api/v1", importRoutes);
  app.use("/api/v1", leagueRoutes);
  app.use("/api/v1", huntRoutes);
  app.use("/api/v1", meRoutes);
  app.use("/api/v1", calibrationRoutes);
  app.use("/api/v1", trainingRoutes);
  app.use("/api/v1/admin", adminRoutes);

  app.get("/api/v1/_routes", (_req, res) => {
    const routes = collectRoutes(app).map((r) => ({
      ...r,
      description: ROUTE_DESCRIPTIONS[`${r.method} ${r.path}`] ?? null,
    }));
    res.json({ routes });
  });

  app.get("/api/v1/version", (_req, res) => {
    res.json(BUILD_VERSION);
  });

  // OpenAPI spec — read once at startup. Served as YAML so Swagger / Redoc /
  // openapi-typescript can ingest directly. Falls through quietly if the file
  // isn't shipped (e.g. a partial Docker image).
  const openapiPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "openapi.yaml");
  const openapiAlt = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "openapi.yaml");
  const openapiYaml = (() => {
    for (const p of [openapiPath, openapiAlt]) {
      try {
        return fs.readFileSync(p, "utf8");
      } catch {
        /* try next */
      }
    }
    return null;
  })();
  if (openapiYaml) {
    app.get("/api/v1/openapi.yaml", (_req, res) => {
      res.setHeader("Content-Type", "application/yaml");
      res.setHeader("Cache-Control", "private, max-age=300");
      res.send(openapiYaml);
    });
  }

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  });

  return app;
}

interface RouteDescriptor {
  method: string;
  path: string;
}

// Walk Express's router stack and emit { method, path } for every registered
// route. Used by GET /_routes for cheap auto-documentation.
export function collectRoutes(app: express.Express): RouteDescriptor[] {
  const out: RouteDescriptor[] = [];
  // Express's internals; the shape is stable but typing is loose.
  type Layer = {
    route?: { path: string; methods: Record<string, boolean> };
    name?: string;
    handle?: { stack?: Layer[] };
    regexp?: RegExp;
  };
  function visit(layers: Layer[] | undefined, prefix: string): void {
    for (const layer of layers ?? []) {
      if (layer.route) {
        const methods = Object.entries(layer.route.methods)
          .filter(([, on]) => on)
          .map(([m]) => m.toUpperCase());
        for (const method of methods) {
          out.push({ method, path: prefix + layer.route.path });
        }
      } else if (layer.name === "router" && layer.handle?.stack) {
        const sub = (layer.regexp?.source ?? "").replace(/\\\//g, "/");
        const m = sub.match(/^\^(.+?)\\\/\?\(\?=\\\/\|\$\)/);
        const mountedAt = m ? m[1].replace(/\\\//g, "/").replace(/\\/g, "") : "";
        visit(layer.handle.stack, prefix + mountedAt);
      }
    }
  }
  visit((app as unknown as { _router?: { stack?: Layer[] } })._router?.stack, "");
  return out
    .filter((r) => r.path.startsWith("/api"))
    .sort((a, b) => a.path.localeCompare(b.path));
}
