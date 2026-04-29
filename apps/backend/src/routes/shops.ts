import { Router } from "express";

export const shopsRouter = Router();

// Phase 1 placeholder — real implementation will hit Postgres.
// Returns an empty list so the frontend can wire to a real endpoint.
shopsRouter.get("/", (_req, res) => {
  res.json({ data: [], page: 1, limit: 25, total: 0 });
});
