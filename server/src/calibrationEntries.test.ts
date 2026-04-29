// Verifies the calibration entries route upserts on (sessionId, shopId,
// reviewerId) so a reviewer can submit, then re-submit with a corrected
// score, without creating a duplicate row.

import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

const JWT_SECRET = "calibration-secret";
process.env.JWT_SECRET = JWT_SECRET;
process.env.SCHEDULER_DISABLED = "1";
process.env.NODE_ENV = "test";

const calibrationUpsert = vi.fn();
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
    calibrationEntry: {
      upsert: (args: unknown) => calibrationUpsert(args),
    },
    calibrationSession: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    location: { findMany: vi.fn().mockResolvedValue([]) },
    rubric: { findMany: vi.fn().mockResolvedValue([]) },
    auditLog: { findMany: vi.fn().mockResolvedValue([]) },
    notification: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
  },
}));

const MGR = {
  id: "11111111-1111-4111-8111-111111111111",
  role: "store_manager",
  active: true,
  fullName: "M",
  email: "m@x",
  primaryLocationId: "loc-A",
  districtIds: [],
  passwordHash: "",
};
const EMP = {
  id: "22222222-2222-4222-8222-222222222222",
  role: "employee",
  active: true,
  fullName: "E",
  email: "e@x",
  primaryLocationId: "loc-A",
  districtIds: [],
  passwordHash: "",
};
const SESSION = "33333333-3333-4333-8333-333333333333";
const SHOP = "44444444-4444-4444-8444-444444444444";

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
  calibrationUpsert.mockReset();
});

describe("POST /calibration/:id/entries", () => {
  it("upserts on (sessionId, shopId, reviewerId) so re-submit corrects", async () => {
    calibrationUpsert.mockResolvedValueOnce({ id: "e1", scorePercentage: 75 });
    const res = await request(app)
      .post(`/api/v1/calibration/${SESSION}/entries`)
      .set("Authorization", `Bearer ${tk(MGR.id)}`)
      .send({ shopId: SHOP, scorePercentage: 75 });
    expect(res.status).toBe(201);

    const args = calibrationUpsert.mock.calls[0][0];
    // Compound unique — this is what makes re-submit idempotent per reviewer.
    expect(args.where.sessionId_shopId_reviewerId).toEqual({
      sessionId: SESSION,
      shopId: SHOP,
      reviewerId: MGR.id,
    });
    // Update path carries the new score.
    expect(args.update.scorePercentage).toBe(75);
    // Create path includes the reviewer (from JWT, not body — important).
    expect(args.create.reviewerId).toBe(MGR.id);
  });

  it("rejects scores outside 0-110", async () => {
    const res = await request(app)
      .post(`/api/v1/calibration/${SESSION}/entries`)
      .set("Authorization", `Bearer ${tk(MGR.id)}`)
      .send({ shopId: SHOP, scorePercentage: 150 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_body");
    expect(res.body.details).toBeDefined();
  });

  it("forbids employees", async () => {
    const res = await request(app)
      .post(`/api/v1/calibration/${SESSION}/entries`)
      .set("Authorization", `Bearer ${tk(EMP.id)}`)
      .send({ shopId: SHOP, scorePercentage: 75 });
    expect(res.status).toBe(403);
  });
});
