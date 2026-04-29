import express from "express";
import cors from "cors";
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

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "5mb" }));

app.get("/api/v1/health", (_req, res) => res.json({ ok: true }));

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

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "server_error" });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Stine Mystery Shop API listening on :${port}`);
});
