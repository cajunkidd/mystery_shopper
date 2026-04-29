// Targeted tests for the bulk action-plan endpoints. Stubs prisma so we can
// assert on the where + data shape without a real DB.

import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

const JWT_SECRET = "bulk-secret";
process.env.JWT_SECRET = JWT_SECRET;
process.env.SCHEDULER_DISABLED = "1";
process.env.NODE_ENV = "test";

const updateMany = vi.fn();
const userFindUnique = vi.fn();
const notificationCreate = vi.fn();
const userMap = new Map<string, unknown>();

vi.mock("./db.js", () => ({
  prisma: {
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; email?: string } }) => {
        if (where.id && userMap.has(where.id)) return userMap.get(where.id);
        return userFindUnique(where);
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    actionPlan: {
      updateMany: (args: unknown) => updateMany(args),
    },
    notification: {
      create: (args: unknown) => notificationCreate(args),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    location: { findMany: vi.fn().mockResolvedValue([]) },
    rubric: { findMany: vi.fn().mockResolvedValue([]) },
    auditLog: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
  },
}));

const MGR = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "mgr@stine.test",
  fullName: "Manager",
  role: "store_manager",
  primaryLocationId: "loc-1",
  districtIds: [],
  active: true,
  passwordHash: "x",
};
const EMP = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "emp@stine.test",
  fullName: "Employee",
  role: "employee",
  primaryLocationId: "loc-1",
  districtIds: [],
  active: true,
  passwordHash: "x",
};

const A1 = "33333333-3333-4333-8333-333333333333";
const A2 = "44444444-4444-4444-8444-444444444444";

function tk(id: string): string {
  return jwt.sign({ sub: id }, JWT_SECRET, { expiresIn: "1h" });
}

let app: import("express").Express;
beforeAll(async () => {
  userMap.set(MGR.id, MGR);
  userMap.set(EMP.id, EMP);
  const { buildApp } = await import("./app.js");
  app = buildApp();
});
beforeEach(() => {
  updateMany.mockClear();
  userFindUnique.mockReset();
  notificationCreate.mockClear();
});

describe("bulk-verify", () => {
  it("flips up to 100 completed plans to verified in one call", async () => {
    updateMany.mockResolvedValueOnce({ count: 3 });
    const ids = [A1, A2, "55555555-5555-4555-8555-555555555555"];
    const res = await request(app)
      .post("/api/v1/action-plans/bulk-verify")
      .set("Authorization", `Bearer ${tk(MGR.id)}`)
      .send({ ids });
    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(3);
    const args = updateMany.mock.calls[0][0];
    // Filter must require status=completed so verify can't promote an open plan.
    expect(args.where.status).toBe("completed");
    expect(args.where.id.in).toEqual(ids);
    expect(args.data.status).toBe("verified");
    expect(args.data.verifiedAt).toBeInstanceOf(Date);
  });

  it("rejects bodies with no ids", async () => {
    const res = await request(app)
      .post("/api/v1/action-plans/bulk-verify")
      .set("Authorization", `Bearer ${tk(MGR.id)}`)
      .send({ ids: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_body");
  });

  it("forbids employees", async () => {
    const res = await request(app)
      .post("/api/v1/action-plans/bulk-verify")
      .set("Authorization", `Bearer ${tk(EMP.id)}`)
      .send({ ids: [A1] });
    expect(res.status).toBe(403);
  });
});

describe("bulk-reassign", () => {
  it("reassigns ids to a target user and sends one rolled-up notification", async () => {
    updateMany.mockResolvedValueOnce({ count: 4 });
    notificationCreate.mockResolvedValueOnce({});
    const res = await request(app)
      .post("/api/v1/action-plans/bulk-reassign")
      .set("Authorization", `Bearer ${tk(MGR.id)}`)
      .send({ ids: [A1, A2], toUserId: EMP.id });
    expect(res.status).toBe(200);
    expect(res.body.reassigned).toBe(4);

    const args = updateMany.mock.calls[0][0];
    expect(args.data.assignedToId).toBe(EMP.id);
    // Only one notification is created — not one per plan.
    expect(notificationCreate).toHaveBeenCalledTimes(1);
    const notif = notificationCreate.mock.calls[0][0].data;
    expect(notif.userId).toBe(EMP.id);
    expect(notif.kind).toBe("action_plan_assigned");
    expect(notif.title).toMatch(/4 action plans/);
  });

  it("rejects when target user does not exist", async () => {
    userFindUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .post("/api/v1/action-plans/bulk-reassign")
      .set("Authorization", `Bearer ${tk(MGR.id)}`)
      .send({ ids: [A1], toUserId: "99999999-9999-4999-8999-999999999999" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_target");
  });
});
