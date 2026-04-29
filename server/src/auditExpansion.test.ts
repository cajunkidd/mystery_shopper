// Verify the new audit() call sites fire on the right events.
// Uses supertest + an in-memory prisma stub focused on the audit surface.

import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

const JWT_SECRET = "audit-secret";
process.env.JWT_SECRET = JWT_SECRET;
process.env.SCHEDULER_DISABLED = "1";
process.env.NODE_ENV = "test";

const auditEntries: { entityType: string; action: string; entityId: string }[] = [];
const rubrics = new Map<string, { id: string; type: string; status: string; version: number }>();
const appeals = new Map<string, { id: string; shopId: string; status: string }>();
const users = new Map<string, { id: string; role: string; active: boolean; primaryLocationId: string | null; districtIds: string[]; passwordHash: string; email: string; fullName: string }>();

vi.mock("./db.js", () => ({
  prisma: {
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    auditLog: {
      create: vi.fn(async ({ data }: { data: { entityType: string; action: string; entityId: string } }) => {
        auditEntries.push({ entityType: data.entityType, action: data.action, entityId: data.entityId });
        return data;
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string } }) => (where.id ? users.get(where.id) ?? null : null)),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const cur = users.get(where.id);
        if (!cur) throw new Error("not found");
        const next = { ...cur, ...data };
        users.set(where.id, next);
        return next;
      }),
    },
    rubric: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => rubrics.get(where.id) ?? null),
      findFirst: vi.fn(async () => null),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const cur = rubrics.get(where.id)!;
        const next = { ...cur, ...data };
        rubrics.set(where.id, next);
        return next;
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    appeal: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => appeals.get(where.id) ?? null),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const cur = appeals.get(where.id)!;
        const next = { ...cur, ...data };
        appeals.set(where.id, next);
        return next;
      }),
    },
    shop: {
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

const ADMIN = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "kyle@stine.test",
  fullName: "Kyle",
  role: "admin",
  primaryLocationId: null,
  districtIds: [],
  active: true,
  passwordHash: "x",
};
const EMP = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "alex@stine.test",
  fullName: "Alex",
  role: "employee",
  primaryLocationId: null,
  districtIds: [],
  active: true,
  passwordHash: "x",
};

function tk(id: string): string {
  return jwt.sign({ sub: id }, JWT_SECRET, { expiresIn: "1h" });
}

let app: import("express").Express;
beforeAll(async () => {
  users.set(ADMIN.id, ADMIN);
  users.set(EMP.id, EMP);
  const { buildApp } = await import("./app.js");
  app = buildApp();
});

describe("audit fan-out", () => {
  it("logs rubric activate", async () => {
    const id = "44444444-4444-4444-8444-444444444444";
    rubrics.set(id, { id, type: "visit", status: "draft", version: 1 });
    auditEntries.length = 0;
    const res = await request(app)
      .post(`/api/v1/rubrics/${id}/activate`)
      .set("Authorization", `Bearer ${tk(ADMIN.id)}`)
      .send({});
    expect(res.status).toBe(200);
    expect(auditEntries).toContainEqual({ entityType: "rubric", action: "status_change", entityId: id });
  });

  it("logs rubric retire", async () => {
    const id = "55555555-5555-4555-8555-555555555555";
    rubrics.set(id, { id, type: "call", status: "active", version: 1 });
    auditEntries.length = 0;
    const res = await request(app)
      .post(`/api/v1/rubrics/${id}/retire`)
      .set("Authorization", `Bearer ${tk(ADMIN.id)}`)
      .send({});
    expect(res.status).toBe(200);
    expect(auditEntries).toContainEqual({ entityType: "rubric", action: "status_change", entityId: id });
  });

  it("logs appeal status_change on resolve", async () => {
    const id = "66666666-6666-4666-8666-666666666666";
    appeals.set(id, { id, shopId: "shop-1", status: "open" });
    auditEntries.length = 0;
    const res = await request(app)
      .post(`/api/v1/appeals/${id}/resolve`)
      .set("Authorization", `Bearer ${tk(ADMIN.id)}`)
      .send({ status: "denied", resolutionNotes: "Reviewed; original score stands." });
    expect(res.status).toBe(200);
    expect(auditEntries).toContainEqual({ entityType: "appeal", action: "status_change", entityId: id });
  });

  it("logs role_change when an admin updates a user's role", async () => {
    auditEntries.length = 0;
    const res = await request(app)
      .patch(`/api/v1/users/${EMP.id}`)
      .set("Authorization", `Bearer ${tk(ADMIN.id)}`)
      .send({ role: "store_manager" });
    expect(res.status).toBe(200);
    expect(auditEntries).toContainEqual({ entityType: "user", action: "role_change", entityId: EMP.id });
  });

  it("logs deactivate when an admin sets active=false", async () => {
    users.set(EMP.id, { ...EMP, active: true, role: "store_manager" });
    auditEntries.length = 0;
    const res = await request(app)
      .patch(`/api/v1/users/${EMP.id}`)
      .set("Authorization", `Bearer ${tk(ADMIN.id)}`)
      .send({ active: false });
    expect(res.status).toBe(200);
    expect(auditEntries).toContainEqual({ entityType: "user", action: "deactivate", entityId: EMP.id });
  });

  it("does not log when no auditable field changes", async () => {
    users.set(EMP.id, { ...EMP, fullName: "Old Name", role: "store_manager", active: true });
    auditEntries.length = 0;
    const res = await request(app)
      .patch(`/api/v1/users/${EMP.id}`)
      .set("Authorization", `Bearer ${tk(ADMIN.id)}`)
      .send({ fullName: "New Name" });
    expect(res.status).toBe(200);
    expect(auditEntries).toHaveLength(0);
  });
});

describe("notification preferences", () => {
  it("returns the current user's email/sms toggles", async () => {
    users.set(EMP.id, { ...EMP, role: "employee", active: true });
    // First reset whatever the audit tests left behind.
    const res = await request(app)
      .get("/api/v1/me/preferences")
      .set("Authorization", `Bearer ${tk(EMP.id)}`);
    expect(res.status).toBe(200);
    expect(res.body.preferences).toBeDefined();
  });

  it("rejects malformed bodies", async () => {
    const res = await request(app)
      .patch("/api/v1/me/preferences")
      .set("Authorization", `Bearer ${tk(EMP.id)}`)
      .send({ notifyByEmail: "yes please" });
    expect(res.status).toBe(400);
  });
});
