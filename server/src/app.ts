import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
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

const startedAt = Date.now();

export function buildApp(): express.Express {
  const app = express();
  // Trust proxy in deploy environments (X-Forwarded-For from a load balancer);
  // disabled in tests so express-rate-limit doesn't complain about the loopback.
  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173", credentials: true }));
  app.use(express.json({ limit: "5mb" }));

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
    res.json({ routes: collectRoutes(app) });
  });

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
