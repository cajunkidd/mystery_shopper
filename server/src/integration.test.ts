// Integration smoke tests — exercise the Express stack + middleware without a DB.
// We mock the prisma client so we can assert on auth + role gating cleanly.

import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

const JWT_SECRET = "test-secret";
process.env.JWT_SECRET = JWT_SECRET;
process.env.SCHEDULER_DISABLED = "1";
process.env.NODE_ENV = "test";

// Map of user id → record. Tests register users here and findUnique resolves
// from the map — more robust than .mockResolvedValueOnce queues, which break
// if any code path triggers an extra findUnique call.
const userMap = new Map<string, unknown>();
const findUnique = vi.fn(async ({ where }: { where: { id: string } }) => userMap.get(where.id) ?? null);
vi.mock("./db.js", () => ({
  prisma: {
    $queryRawUnsafe: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    user: { findUnique },
    location: { findMany: vi.fn().mockResolvedValue([]) },
    rubric: { findMany: vi.fn().mockResolvedValue([]) },
    auditLog: { findMany: vi.fn().mockResolvedValue([]) },
    notification: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
  },
}));

const ADMIN = {
  id: "u-admin",
  email: "kyle@stine.test",
  fullName: "Kyle Manuel",
  role: "admin" as const,
  primaryLocationId: null,
  districtIds: [] as string[],
  active: true,
  passwordHash: "x",
};
const EMPLOYEE = {
  id: "u-emp",
  email: "alex@stine.test",
  fullName: "Alex",
  role: "employee" as const,
  primaryLocationId: "loc-1",
  districtIds: [] as string[],
  active: true,
  passwordHash: "x",
};

function token(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "1h" });
}

let app: import("express").Express;
beforeAll(async () => {
  const { buildApp } = await import("./app.js");
  app = buildApp();
});

describe("auth", () => {
  it("rejects requests with no token", async () => {
    const res = await request(app).get("/api/v1/locations");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("missing_token");
  });

  it("rejects requests with a malformed token", async () => {
    const res = await request(app).get("/api/v1/locations").set("Authorization", "Bearer garbage");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_token");
  });

  it("accepts a valid token and exposes the locations endpoint", async () => {
    userMap.set(EMPLOYEE.id, EMPLOYEE);
    const res = await request(app)
      .get("/api/v1/locations")
      .set("Authorization", `Bearer ${token(EMPLOYEE.id)}`);
    expect(res.status).toBe(200);
    expect(res.body.locations).toEqual([]);
  });

  it("returns the current user from /auth/me", async () => {
    userMap.set(ADMIN.id, ADMIN);
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token(ADMIN.id)}`);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("admin");
  });
});

describe("role gating", () => {
  it("forbids employees from listing users", async () => {
    userMap.set(EMPLOYEE.id, EMPLOYEE);
    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${token(EMPLOYEE.id)}`);
    expect(res.status).toBe(403);
  });

  it("forbids employees from the audit log", async () => {
    userMap.set(EMPLOYEE.id, EMPLOYEE);
    const res = await request(app)
      .get("/api/v1/admin/audit-log")
      .set("Authorization", `Bearer ${token(EMPLOYEE.id)}`);
    expect(res.status).toBe(403);
  });

  it("allows admins to read the audit log", async () => {
    userMap.set(ADMIN.id, ADMIN);
    const res = await request(app)
      .get("/api/v1/admin/audit-log")
      .set("Authorization", `Bearer ${token(ADMIN.id)}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it("rejects deactivated users even with valid tokens", async () => {
    userMap.set("u-deactivated", { ...EMPLOYEE, id: "u-deactivated", active: false });
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token("u-deactivated")}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_user");
  });
});

describe("health", () => {
  it("/health is open and reports ok + uptime + db", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBeDefined();
    expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(["ok", "error"]).toContain(res.body.db);
  });
});

describe("more role gating", () => {
  it("forbids store managers from CSV import (admin only)", async () => {
    const MGR = { ...EMPLOYEE, id: "u-mgr-i", role: "store_manager" as const };
    userMap.set(MGR.id, MGR);
    const res = await request(app)
      .post("/api/v1/imports/users")
      .set("Authorization", `Bearer ${token(MGR.id)}`)
      .send({ rows: [], mapping: { email: "email", fullName: "name", role: "role" } });
    expect(res.status).toBe(403);
  });

  it("forbids district managers from rubric activate (admin only)", async () => {
    const DM = { ...EMPLOYEE, id: "u-dm", role: "district_manager" as const };
    userMap.set(DM.id, DM);
    const res = await request(app)
      .post("/api/v1/rubrics/some-id/activate")
      .set("Authorization", `Bearer ${token(DM.id)}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it("forbids employees from running scheduled jobs", async () => {
    userMap.set(EMPLOYEE.id, EMPLOYEE);
    const res = await request(app)
      .post("/api/v1/admin/jobs/run")
      .set("Authorization", `Bearer ${token(EMPLOYEE.id)}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it("rejects token signed with the wrong secret", async () => {
    userMap.set(EMPLOYEE.id, EMPLOYEE);
    const wrong = (await import("jsonwebtoken")).default.sign({ sub: EMPLOYEE.id }, "wrong-secret", {
      expiresIn: "1h",
    });
    const res = await request(app).get("/api/v1/locations").set("Authorization", `Bearer ${wrong}`);
    expect(res.status).toBe(401);
  });

  it("rejects token for a non-existent user id", async () => {
    const res = await request(app)
      .get("/api/v1/locations")
      .set("Authorization", `Bearer ${token("u-ghost")}`);
    expect(res.status).toBe(401);
  });

  it("rejects expired tokens", async () => {
    userMap.set(EMPLOYEE.id, EMPLOYEE);
    const expired = (await import("jsonwebtoken")).default.sign({ sub: EMPLOYEE.id }, JWT_SECRET, {
      expiresIn: -10,
    });
    const res = await request(app).get("/api/v1/locations").set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });
});
