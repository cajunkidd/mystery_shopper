import { describe, it, expect } from "vitest";
import { capabilitiesFor } from "./permissions.js";

describe("capabilitiesFor", () => {
  it("admin has every capability except filing appeals (per §9: only employees file)", () => {
    const c = capabilitiesFor("admin");
    expect(c.fileAppeal).toBe(false);
    const everythingElse = Object.entries(c).filter(([k]) => k !== "fileAppeal");
    expect(everythingElse.every(([, v]) => v === true)).toBe(true);
  });

  it("employee can file appeals but cannot review or adjust scores", () => {
    const c = capabilitiesFor("employee");
    expect(c.fileAppeal).toBe(true);
    expect(c.reviewShop).toBe(false);
    expect(c.adjustScore).toBe(false);
    expect(c.viewAuditLog).toBe(false);
  });

  it("store managers cannot file appeals (they receive them)", () => {
    expect(capabilitiesFor("store_manager").fileAppeal).toBe(false);
    expect(capabilitiesFor("store_manager").resolveAppeal).toBe(true);
  });

  it("district managers can export company reports; store managers cannot", () => {
    expect(capabilitiesFor("district_manager").exportCompanyReports).toBe(true);
    expect(capabilitiesFor("store_manager").exportCompanyReports).toBe(false);
  });

  it("only admin can edit rubrics", () => {
    expect(capabilitiesFor("admin").editRubric).toBe(true);
    expect(capabilitiesFor("district_manager").editRubric).toBe(false);
    expect(capabilitiesFor("store_manager").editRubric).toBe(false);
    expect(capabilitiesFor("employee").editRubric).toBe(false);
  });
});
