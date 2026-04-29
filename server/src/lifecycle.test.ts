// End-to-end-ish lifecycle test: shop submit → review complete → action plan
// → employee acknowledge → appeal → resolve. Uses supertest + an in-memory
// prisma stub (no real DB).

import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

const JWT_SECRET = "lifecycle-secret";
process.env.JWT_SECRET = JWT_SECRET;
process.env.SCHEDULER_DISABLED = "1";
process.env.NODE_ENV = "test";

// Tiny in-memory store. Just enough surface to drive the lifecycle.
const db = {
  users: new Map<string, { id: string; email: string; role: string; primaryLocationId: string | null; districtIds: string[]; active: boolean; fullName: string; passwordHash: string }>(),
  locations: new Map<string, { id: string; code: string; name: string; district: string }>(),
  rubrics: new Map<string, { id: string; type: string; version: number; status: string; sections: { id: string; name: string; questions: { id: string; maxScore: number; questionType: string; weight: number; options: unknown }[] }[] }>(),
  shops: new Map<string, Record<string, unknown>>(),
  reviews: new Map<string, Record<string, unknown>>(),
  actionPlans: new Map<string, Record<string, unknown>>(),
  appeals: new Map<string, Record<string, unknown>>(),
  notifications: [] as Record<string, unknown>[],
  pointsLedger: [] as Record<string, unknown>[],
  userBadges: new Map<string, { id: string; userId: string; badgeId: string }>(),
  badges: new Map<string, { id: string; code: string; name: string }>(),
  auditLog: [] as Record<string, unknown>[],
};

// RFC4122 v4-shaped uuid (16 hex octets, version + variant set).
function uuid(): string {
  const b = new Uint8Array(16);
  for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10, 16).join("")}`;
}

vi.mock("./db.js", () => ({
  prisma: {
    // Prisma's transaction API: array form runs ops in order; returns their results.
    // For tests, just resolve them as-is.
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; email?: string } }) => {
        if (where.id) return db.users.get(where.id) ?? null;
        if (where.email) {
          for (const u of db.users.values()) if (u.email === where.email) return u;
        }
        return null;
      }),
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        for (const u of db.users.values()) {
          let match = true;
          for (const [k, v] of Object.entries(where)) {
            if ((u as unknown as Record<string, unknown>)[k] !== v) match = false;
          }
          if (match) return u;
        }
        return null;
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    location: {
      findMany: vi.fn(async () => Array.from(db.locations.values())),
    },
    rubric: {
      findUnique: vi.fn(async ({ where, include }: { where: { id: string }; include?: unknown }) => {
        const r = db.rubrics.get(where.id);
        if (!r) return null;
        if (include) {
          return {
            ...r,
            sections: r.sections.map((s) => ({ ...s, questions: s.questions })),
          };
        }
        return r;
      }),
    },
    shop: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = uuid();
        const answers = (data.answers as { create: { questionId: string; answerValue: unknown; scoreAwarded: number }[] } | undefined)?.create ?? [];
        const shop = { id, ...data, answers };
        delete (shop as { answers?: unknown }).answers;
        db.shops.set(id, { ...shop, answers });
        return shop;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => db.shops.get(where.id) ?? null),
      findMany: vi.fn(async () => Array.from(db.shops.values())),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const cur = db.shops.get(where.id) ?? {};
        const next = { ...cur, ...data };
        db.shops.set(where.id, next);
        return next;
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },
    review: {
      upsert: vi.fn(async ({ where, create, update }: { where: { shopId: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
        for (const r of db.reviews.values()) {
          if (r.shopId === where.shopId) {
            const next = { ...r, ...update };
            db.reviews.set(r.id as string, next);
            return next;
          }
        }
        const id = uuid();
        const created = { id, ...create };
        db.reviews.set(id, created);
        return created;
      }),
      findUnique: vi.fn(async ({ where, include }: { where: { id?: string; shopId?: string }; include?: { shop?: boolean } }) => {
        let r: Record<string, unknown> | undefined;
        if (where.id) r = db.reviews.get(where.id);
        else if (where.shopId) {
          for (const x of db.reviews.values()) if (x.shopId === where.shopId) r = x;
        }
        if (!r) return null;
        if (include?.shop) return { ...r, shop: db.shops.get(r.shopId as string) };
        return r;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = uuid();
        const r = { id, ...data };
        db.reviews.set(id, r);
        return r;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const r = db.reviews.get(where.id);
        if (!r) throw new Error("review not found");
        const next = { ...r, ...data };
        db.reviews.set(where.id, next);
        return next;
      }),
    },
    actionPlan: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = uuid();
        const ap = { id, ...data, status: "open" };
        db.actionPlans.set(id, ap);
        return ap;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => db.actionPlans.get(where.id) ?? null),
      findMany: vi.fn(async () => Array.from(db.actionPlans.values())),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const ap = db.actionPlans.get(where.id);
        if (!ap) throw new Error("not found");
        const next = { ...ap, ...data };
        db.actionPlans.set(where.id, next);
        return next;
      }),
      count: vi.fn().mockResolvedValue(0),
    },
    appeal: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = uuid();
        const a = { id, ...data, filedAt: new Date(), status: "open" };
        db.appeals.set(id, a);
        return a;
      }),
      findMany: vi.fn(async () => Array.from(db.appeals.values())),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const a = db.appeals.get(where.id);
        if (!a) throw new Error("not found");
        const next = { ...a, ...data };
        db.appeals.set(where.id, next);
        return next;
      }),
      count: vi.fn().mockResolvedValue(0),
    },
    shopAnswer: { findMany: vi.fn().mockResolvedValue([]) },
    pointsLedger: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        db.pointsLedger.push(data);
        return data;
      }),
    },
    userBadge: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(async ({ data }: { data: { userId: string; badgeId: string } }) => {
        const id = uuid();
        const ub = { id, ...data };
        db.userBadges.set(id, ub);
        return ub;
      }),
    },
    badge: { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn().mockResolvedValue(null) },
    auditLog: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        db.auditLog.push(data);
        return data;
      }),
    },
    notification: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        db.notifications.push(data);
        return data;
      }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    trainingModule: { findFirst: vi.fn().mockResolvedValue(null) },
    trainingAssignment: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
  },
}));

// UUIDs (the API uses zod's `z.string().uuid()` validators).
const MGR_ID = "11111111-1111-4111-8111-111111111111";
const EMP_ID = "22222222-2222-4222-8222-222222222222";
const LOC_ID = "33333333-3333-4333-8333-333333333333";
const RUBRIC_ID = "44444444-4444-4444-8444-444444444444";
const QUESTION_ID = "55555555-5555-4555-8555-555555555555";

const MGR = { id: MGR_ID, email: "mgr@stine.test", role: "store_manager" as const, primaryLocationId: LOC_ID, districtIds: [] as string[], active: true, fullName: "Manager", passwordHash: "x" };
const EMP = { id: EMP_ID, email: "emp@stine.test", role: "employee" as const, primaryLocationId: LOC_ID, districtIds: [] as string[], active: true, fullName: "Employee", passwordHash: "x" };
const LOC = { id: LOC_ID, code: "STN-SUL", name: "Sulphur", district: "Southwest LA" };
const RUBRIC = {
  id: RUBRIC_ID,
  type: "visit",
  version: 1,
  status: "active",
  sections: [
    {
      id: "66666666-6666-4666-8666-666666666666",
      name: "Greeting",
      questions: [
        { id: QUESTION_ID, maxScore: 10, questionType: "yes_no", weight: 1, options: null },
      ],
    },
  ],
};

function tk(id: string): string {
  return jwt.sign({ sub: id }, JWT_SECRET, { expiresIn: "1h" });
}

let app: import("express").Express;
beforeAll(async () => {
  db.users.set(MGR.id, MGR);
  db.users.set(EMP.id, EMP);
  db.locations.set(LOC.id, LOC);
  db.rubrics.set(RUBRIC.id, RUBRIC);
  const { buildApp } = await import("./app.js");
  app = buildApp();
});

describe("shop lifecycle", () => {
  let shopId = "";
  let reviewId = "";
  let actionPlanId = "";

  it("manager creates and submits a shop; employee gets routed for review", async () => {
    const r = await request(app)
      .post("/api/v1/shops")
      .set("Authorization", `Bearer ${tk(MGR.id)}`)
      .send({
        rubricId: RUBRIC.id,
        type: "visit",
        locationId: LOC.id,
        shopDate: new Date().toISOString(),
        evaluatedEmployeeId: EMP.id,
        answers: [{ questionId: QUESTION_ID, answerValue: "yes" }],
        submit: true,
      });
    expect(r.status).toBe(201);
    expect(r.body.id).toBeTruthy();
    shopId = r.body.id;

    const shop = db.shops.get(shopId)!;
    expect(shop.status).toBe("under_review");
    // Manager was notified that a shop needs review.
    const submitNotice = db.notifications.find((n) => n.kind === "shop_submitted");
    expect(submitNotice).toBeTruthy();
  });

  it("manager opens the review and patches a summary", async () => {
    const r = await request(app)
      .post(`/api/v1/shops/${shopId}/review`)
      .set("Authorization", `Bearer ${tk(MGR.id)}`)
      .send({});
    expect(r.status).toBe(200);
    reviewId = r.body.review.id;

    const patch = await request(app)
      .patch(`/api/v1/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${tk(MGR.id)}`)
      .send({ managerSummary: "Solid greeting, suggest closing more confidently." });
    expect(patch.status).toBe(200);
  });

  it("manager creates an action plan tied to the review", async () => {
    const r = await request(app)
      .post(`/api/v1/shops/${shopId}/action-plans`)
      .set("Authorization", `Bearer ${tk(MGR.id)}`)
      .send({
        assignedToId: EMP.id,
        reviewId,
        category: "Close",
        description: "Practice asking for the sale on your next 5 customers.",
        dueDate: new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
      });
    expect(r.status).toBe(201);
    actionPlanId = r.body.actionPlan.id;
    // Employee was notified of the assignment.
    expect(db.notifications.find((n) => n.kind === "action_plan_assigned")).toBeTruthy();
  });

  it("manager marks the review complete; employee gets a review-completed notification", async () => {
    const r = await request(app)
      .post(`/api/v1/reviews/${reviewId}/complete`)
      .set("Authorization", `Bearer ${tk(MGR.id)}`)
      .send({});
    expect(r.status).toBe(200);

    const reviewCompleted = db.notifications.find((n) => n.kind === "review_completed");
    expect(reviewCompleted).toBeTruthy();
    // Phase 3: points awarded for the completed shop.
    expect(db.pointsLedger.length).toBeGreaterThan(0);
    expect(db.pointsLedger[0].sourceType).toBe("shop_score");
  });

  it("employee acknowledges the action plan", async () => {
    const r = await request(app)
      .post(`/api/v1/action-plans/${actionPlanId}/acknowledge`)
      .set("Authorization", `Bearer ${tk(EMP.id)}`)
      .send({});
    expect(r.status).toBe(200);
    const ap = db.actionPlans.get(actionPlanId)!;
    expect(ap.status).toBe("acknowledged");
  });

  it("employee files an appeal; status flips to appealed", async () => {
    const r = await request(app)
      .post(`/api/v1/shops/${shopId}/appeals`)
      .set("Authorization", `Bearer ${tk(EMP.id)}`)
      .send({ reason: "I greeted the shopper within 30 seconds." });
    expect(r.status).toBe(201);
    expect(db.shops.get(shopId)!.status).toBe("appealed");
  });

  it("manager resolves the appeal; shop returns to closed", async () => {
    // Re-fetch the appeal id from the in-memory store.
    const appeal = Array.from(db.appeals.values()).find((a) => a.shopId === shopId)!;
    const r = await request(app)
      .post(`/api/v1/appeals/${appeal.id}/resolve`)
      .set("Authorization", `Bearer ${tk(MGR.id)}`)
      .send({ status: "denied", resolutionNotes: "Reviewed timing; original score stands." });
    expect(r.status).toBe(200);
    expect(db.shops.get(shopId)!.status).toBe("closed");
  });
});
