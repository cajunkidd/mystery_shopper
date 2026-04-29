import { describe, it, expect } from "vitest";
import { computePoints } from "./engine.js";

describe("computePoints", () => {
  it("applies the visit type multiplier with no streak or improvement", () => {
    const r = computePoints({
      shopScore: 80,
      shopType: "visit",
      consecutiveAtOrAbove85: 0,
      trailing3ShopAverage: null,
    });
    expect(r.typeMultiplier).toBe(1.2);
    expect(r.streakMultiplier).toBe(1);
    expect(r.improvementBonus).toBe(0);
    expect(r.total).toBe(96); // 80 * 1.2
  });

  it("does not apply a streak bonus on the first qualifying shop", () => {
    const r = computePoints({
      shopScore: 90,
      shopType: "call",
      consecutiveAtOrAbove85: 1,
      trailing3ShopAverage: 88,
    });
    expect(r.streakMultiplier).toBe(1);
  });

  it("applies +10% per consecutive ≥85 shop after the first, capped at +50%", () => {
    const r = computePoints({
      shopScore: 90,
      shopType: "call",
      consecutiveAtOrAbove85: 4,
      trailing3ShopAverage: 88,
    });
    expect(r.streakMultiplier).toBeCloseTo(1.3); // 3 steps * 10%
  });

  it("caps the streak multiplier at +50%", () => {
    const r = computePoints({
      shopScore: 95,
      shopType: "call",
      consecutiveAtOrAbove85: 99,
      trailing3ShopAverage: 90,
    });
    expect(r.streakMultiplier).toBe(1.5);
  });

  it("awards +20 improvement bonus when ≥15 above trailing average", () => {
    const r = computePoints({
      shopScore: 90,
      shopType: "call",
      consecutiveAtOrAbove85: 0,
      trailing3ShopAverage: 70,
    });
    expect(r.improvementBonus).toBe(20);
  });

  it("does not award improvement bonus when under the threshold", () => {
    const r = computePoints({
      shopScore: 80,
      shopType: "call",
      consecutiveAtOrAbove85: 0,
      trailing3ShopAverage: 70,
    });
    expect(r.improvementBonus).toBe(0);
  });

  it("clamps manager bonus into the 0–25 range", () => {
    const r = computePoints({
      shopScore: 70,
      shopType: "visit",
      consecutiveAtOrAbove85: 0,
      trailing3ShopAverage: null,
      managerBonus: 999,
    });
    expect(r.managerBonus).toBe(25);
  });
});
