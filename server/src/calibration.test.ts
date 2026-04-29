import { describe, it, expect } from "vitest";
import { summarizeCalibration } from "./calibration.js";

describe("summarizeCalibration", () => {
  it("computes per-shop delta as max minus min", () => {
    const r = summarizeCalibration([
      { shopId: "s1", scorePercentage: 80 },
      { shopId: "s1", scorePercentage: 75 },
      { shopId: "s2", scorePercentage: 90 },
      { shopId: "s2", scorePercentage: 100 },
    ]);
    expect(r.perShop).toHaveLength(2);
    expect(r.perShop.find((p) => p.shopId === "s1")?.delta).toBe(5);
    expect(r.perShop.find((p) => p.shopId === "s2")?.delta).toBe(10);
    expect(r.averageDelta).toBe(7.5);
  });

  it("ignores shops with only one reviewer", () => {
    const r = summarizeCalibration([
      { shopId: "s1", scorePercentage: 80 },
      { shopId: "s2", scorePercentage: 90 },
      { shopId: "s2", scorePercentage: 92 },
    ]);
    expect(r.perShop).toHaveLength(1);
    expect(r.perShop[0].shopId).toBe("s2");
  });

  it("passes when avg delta is at the §13 threshold of 8", () => {
    const r = summarizeCalibration([
      { shopId: "s1", scorePercentage: 80 },
      { shopId: "s1", scorePercentage: 88 },
    ]);
    expect(r.averageDelta).toBe(8);
    expect(r.passes).toBe(true);
  });

  it("fails when avg delta exceeds 8", () => {
    const r = summarizeCalibration([
      { shopId: "s1", scorePercentage: 70 },
      { shopId: "s1", scorePercentage: 85 },
    ]);
    expect(r.passes).toBe(false);
  });
});
