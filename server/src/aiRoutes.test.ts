// Route-level tests for the AI endpoints. The ai.ts module is mocked so
// these tests don't need ANTHROPIC_API_KEY — they verify role gating, the
// 503-when-unconfigured path, and the bulk endpoint's per-shop role check.

import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

const JWT_SECRET = "ai-route-secret";
process.env.JWT_SECRET = JWT_SECRET;
process.env.SCHEDULER_DISABLED = "1";
process.env.NODE_ENV = "test";

const summarizeShop = vi.fn();
const clusterThemes = vi.fn();
const extractShopFromPdf = vi.fn();
vi.mock("./ai.js", () => ({
  summarizeShop: (...args: unknown[]) => summarizeShop(...args),
  clusterThemes: (...args: unknown[]) => clusterThemes(...args),
  extractShopFromPdf: (...args: unknown[]) => extractShopFromPdf(...args),
}));

const userMap = new Map<string, unknown>();
const shops = new Map<string, unknown>();
vi.mock("./db.js", () => ({
  prisma: {
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string } }) =>
        where.id && userMap.has(where.id) ? userMap.get(where.id) : null,
      ),
      findMany: vi.fn().mockResolvedValue([]),
    },
    shop: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => shops.get(where.id) ?? null),
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id) => shops.get(id)).filter(Boolean),
      ),
    },
    location: { findMany: vi.fn().mockResolvedValue([]) },
    rubric: { findMany: vi.fn().mockResolvedValue([]) },
    auditLog: { findMany: vi.fn().mockResolvedValue([]) },
    notification: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
  },
}));

const ADMIN = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01", role: "admin", active: true, fullName: "K", email: "k@x", primaryLocationId: null, districtIds: [], passwordHash: "" };
const EMP = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02", role: "employee", active: true, fullName: "E", email: "e@x", primaryLocationId: "loc-A", districtIds: [], passwordHash: "" };
const MGR_A = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03", role: "store_manager", active: true, fullName: "M", email: "m@x", primaryLocationId: "loc-A", districtIds: [], passwordHash: "" };

const SHOP_A = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01";
const SHOP_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02";

function tk(id: string): string {
  return jwt.sign({ sub: id }, JWT_SECRET, { expiresIn: "1h" });
}

let app: import("express").Express;
beforeAll(async () => {
  for (const u of [ADMIN, EMP, MGR_A]) userMap.set(u.id, u);
  shops.set(SHOP_A, {
    id: SHOP_A,
    type: "visit",
    locationId: "loc-A",
    shopDate: new Date("2026-04-01"),
    percentage: 75,
    narrative: "ok",
    answers: [{ question: { text: "Greeted?" }, answerValue: "yes", comment: null }],
  });
  shops.set(SHOP_B, {
    id: SHOP_B,
    type: "visit",
    locationId: "loc-B",
    shopDate: new Date("2026-04-02"),
    percentage: 80,
    narrative: "ok",
    answers: [],
  });
  const { buildApp } = await import("./app.js");
  app = buildApp();
});

beforeEach(() => {
  summarizeShop.mockReset();
  clusterThemes.mockReset();
});

describe("POST /shops/:id/summary", () => {
  it("forbids employees", async () => {
    const res = await request(app)
      .post(`/api/v1/shops/${SHOP_A}/summary`)
      .set("Authorization", `Bearer ${tk(EMP.id)}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it("forbids store managers from another location's shop", async () => {
    // MGR_A's primaryLocationId is loc-A; SHOP_B is at loc-B.
    const res = await request(app)
      .post(`/api/v1/shops/${SHOP_B}/summary`)
      .set("Authorization", `Bearer ${tk(MGR_A.id)}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it("returns the AI summary on success", async () => {
    summarizeShop.mockResolvedValue({
      summary: "Solid greeting, weak close.",
      strengths: ["Greeted within 30s"],
      improvements: ["Ask for the sale"],
      sentiment: "neutral",
    });
    const res = await request(app)
      .post(`/api/v1/shops/${SHOP_A}/summary`)
      .set("Authorization", `Bearer ${tk(MGR_A.id)}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.summary.sentiment).toBe("neutral");
  });

  it("returns 503 when ANTHROPIC_API_KEY is missing", async () => {
    summarizeShop.mockRejectedValue(new Error("anthropic_api_key_missing"));
    const res = await request(app)
      .post(`/api/v1/shops/${SHOP_A}/summary`)
      .set("Authorization", `Bearer ${tk(MGR_A.id)}`)
      .send({});
    expect(res.status).toBe(503);
    expect(res.body.error).toBe("ai_not_configured");
  });

  it("returns 502 on other AI errors", async () => {
    summarizeShop.mockRejectedValue(new Error("network down"));
    const res = await request(app)
      .post(`/api/v1/shops/${SHOP_A}/summary`)
      .set("Authorization", `Bearer ${tk(MGR_A.id)}`)
      .send({});
    expect(res.status).toBe(502);
  });
});

describe("POST /shops/bulk-summary", () => {
  it("rejects > 10 ids", async () => {
    const ids = Array.from({ length: 11 }, (_, i) =>
      `cccccccc-cccc-4ccc-8ccc-cccccccccc${String(i).padStart(2, "0")}`,
    );
    const res = await request(app)
      .post("/api/v1/shops/bulk-summary")
      .set("Authorization", `Bearer ${tk(ADMIN.id)}`)
      .send({ shopIds: ids });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_body");
    expect(res.body.details).toBeDefined();
  });

  it("blocks store managers when any shop is from another location", async () => {
    const res = await request(app)
      .post("/api/v1/shops/bulk-summary")
      .set("Authorization", `Bearer ${tk(MGR_A.id)}`)
      .send({ shopIds: [SHOP_A, SHOP_B] });
    expect(res.status).toBe(403);
    expect(res.body.shopId).toBe(SHOP_B);
  });

  it("returns one result row per shop, with per-shop errors isolated", async () => {
    summarizeShop
      .mockResolvedValueOnce({ summary: "A", strengths: [], improvements: [], sentiment: "neutral" })
      .mockRejectedValueOnce(new Error("flaky"));
    const res = await request(app)
      .post("/api/v1/shops/bulk-summary")
      .set("Authorization", `Bearer ${tk(ADMIN.id)}`)
      .send({ shopIds: [SHOP_A, SHOP_B] });
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.results.find((r: { shopId: string }) => r.shopId === SHOP_A).ok).toBe(true);
    expect(res.body.results.find((r: { shopId: string }) => r.shopId === SHOP_B).ok).toBe(false);
  });
});
