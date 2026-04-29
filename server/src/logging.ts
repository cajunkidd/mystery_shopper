// Lightweight request logger. One line per response with method, path, status,
// and elapsed ms. Skips /health to keep load-balancer probes out of the log.
//
// Output shape:
//   2026-04-29T10:21:33.412Z  POST   /api/v1/shops                   201  147ms

import type { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === "test" || req.path === "/api/v1/health") return next();
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const line = `${new Date().toISOString()}  ${req.method.padEnd(6)} ${req.originalUrl.padEnd(40)} ${String(res.statusCode).padEnd(4)} ${ms}ms`;
    if (res.statusCode >= 500) console.error(line);
    else console.log(line);
  });
  next();
}
