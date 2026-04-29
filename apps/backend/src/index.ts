import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health.js";
import { shopsRouter } from "./routes/shops.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/v1/health", healthRouter);
app.use("/api/v1/shops", shopsRouter);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`[backend] listening on http://localhost:${port}`);
});
