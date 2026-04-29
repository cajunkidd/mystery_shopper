import { describe, it, expect } from "vitest";
import { ageBadge } from "./aging";

const NOW = new Date("2026-04-29T12:00:00Z").getTime();

describe("ageBadge", () => {
  it("returns 'draft' when there's no submittedAt", () => {
    expect(ageBadge(null, NOW)).toEqual({ label: "draft", cls: expect.stringContaining("slate") });
  });

  it("returns 'today' for a same-day submission", () => {
    const r = ageBadge(new Date(NOW - 60_000).toISOString(), NOW);
    expect(r.label).toBe("today");
  });

  it("uses amber styling for 2-4 day-old submissions", () => {
    const r = ageBadge(new Date(NOW - 3 * 86_400_000).toISOString(), NOW);
    expect(r.label).toContain("3d");
    expect(r.cls).toContain("amber");
  });

  it("uses rose styling for 5+ day-old submissions", () => {
    const r = ageBadge(new Date(NOW - 6 * 86_400_000).toISOString(), NOW);
    expect(r.label).toContain("6d");
    expect(r.cls).toContain("rose");
  });

  it("clamps to whole-day buckets — 23h ago is still 0d", () => {
    const r = ageBadge(new Date(NOW - 23 * 3_600_000).toISOString(), NOW);
    expect(r.label).toBe("today");
  });
});
