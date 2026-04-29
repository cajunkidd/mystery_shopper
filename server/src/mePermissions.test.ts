// Verifies /me/permissions returns the §9 capability matrix for the
// authenticated user's role.

import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

const JWT_SECRET = "perm-secret";
process.env.JWT_SECRET = JWT_SECRET;
process.env.SCHEDULER_DISABLED = "1";
process.env.NODE_ENV = "test";

const userMap = new Map<string, unknown>();
vi.mock("./db.js", () => ({
  prisma: {
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string } }) =>
        where.id && userMap.has(where.id) ? userMap.get(where.id) : null,
      ),
      findMany: vi.fn().mockResolvedValue([]),
    },
    location: { findMany: vi.fn().mockResolvedValue([]) },
    rubric: { findMany: vi.fn().mockResolvedValue([]) },
    auditLog: { findMany: vi.fn().mockResolvedValue([]) },
    notification: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
  },
}));

const ADMIN = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", role: "admin", active: true, fullName: "Admin", email: "a@x", primaryLocationId: null, districtIds: [], passwordHash: "" };
const EMP = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", role: "employee", active: true, fullName: "E", email: "e@x", primaryLocationId: null, districtIds: [], passwordHash: "" };
const MGR = { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", role: "store_manager", active: true, fullName: "M", email: "m@x", primaryLocationId: null, districtIds: [], passwordHash: "" };

function tk(id: string): string {
  return jwt.sign({ sub: id }, JWT_SECRET, { expiresIn: "1h" });
}

let app: import("express").Express;
beforeAll(async () => {
  userMap.set(ADMIN.id, ADMIN);
  userMap.set(EMP.id, EMP);
  userMap.set(MGR.id, MGR);
  const { buildApp } = await import("./app.js");
  app = buildApp();
});

describe("GET /me/permissions", () => {
  it("returns admin caps for an admin", async () => {
    const res = await request(app)
      .get("/api/v1/me/permissions")
      .set("Authorization", `Bearer ${tk(ADMIN.id)}`);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("admin");
    expect(res.body.capabilities.editRubric).toBe(true);
    expect(res.body.capabilities.manageUsers).toBe(true);
    expect(res.body.capabilities.fileAppeal).toBe(false);
  });

  it("employee can file appeals but not review", async () => {
    const res = await request(app)
      .get("/api/v1/me/permissions")
      .set("Authorization", `Bearer ${tk(EMP.id)}`);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("employee");
    expect(res.body.capabilities.fileAppeal).toBe(true);
    expect(res.body.capabilities.reviewShop).toBe(false);
    expect(res.body.capabilities.editRubric).toBe(false);
  });

  it("store manager can resolve but not file appeals", async () => {
    const res = await request(app)
      .get("/api/v1/me/permissions")
      .set("Authorization", `Bearer ${tk(MGR.id)}`);
    expect(res.body.capabilities.fileAppeal).toBe(false);
    expect(res.body.capabilities.resolveAppeal).toBe(true);
    expect(res.body.capabilities.exportCompanyReports).toBe(false);
  });

  it("rejects unauthenticated", async () => {
    const res = await request(app).get("/api/v1/me/permissions");
    expect(res.status).toBe(401);
  });
});
