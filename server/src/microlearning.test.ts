import { describe, it, expect, vi } from "vitest";
import { assignTrainingForLowSections, LOW_SECTION_THRESHOLD } from "./microlearning.js";

function mockPrisma(opts: {
  answers: { sectionName: string; scoreAwarded: number; maxScore: number }[];
  module: { id: string; rubricSectionMatch: string } | null;
  hasOpenAssignment?: boolean;
}) {
  const created: { userId: string; trainingModuleId: string; triggerSection: string | null }[] = [];
  const prisma = {
    shopAnswer: {
      findMany: vi.fn().mockResolvedValue(
        opts.answers.map((a) => ({
          scoreAwarded: a.scoreAwarded,
          question: { maxScore: a.maxScore, section: { id: a.sectionName, name: a.sectionName } },
        })),
      ),
    },
    trainingModule: { findFirst: vi.fn().mockResolvedValue(opts.module) },
    trainingAssignment: {
      findFirst: vi.fn().mockResolvedValue(opts.hasOpenAssignment ? { id: "x" } : null),
      create: vi.fn(async ({ data }: { data: { userId: string; trainingModuleId: string; triggerSection: string | null } }) => {
        const row = { id: `a-${created.length}`, ...data };
        created.push(data);
        return row;
      }),
    },
  } as unknown as Parameters<typeof assignTrainingForLowSections>[0];
  return { prisma, created };
}

describe("assignTrainingForLowSections", () => {
  it("assigns nothing when all sections are above threshold", async () => {
    const { prisma, created } = mockPrisma({
      answers: [{ sectionName: "Greeting", scoreAwarded: 18, maxScore: 20 }],
      module: { id: "m1", rubricSectionMatch: "Greeting" },
    });
    const r = await assignTrainingForLowSections(prisma, { id: "s1", evaluatedEmployeeId: "u1" });
    expect(r.assignmentIds).toHaveLength(0);
    expect(created).toHaveLength(0);
  });

  it("assigns when a section is below threshold and a matching module exists", async () => {
    const { prisma, created } = mockPrisma({
      answers: [{ sectionName: "Product Knowledge", scoreAwarded: 10, maxScore: 20 }],
      module: { id: "m1", rubricSectionMatch: "Product Knowledge" },
    });
    const r = await assignTrainingForLowSections(prisma, { id: "s1", evaluatedEmployeeId: "u1" });
    expect(r.assignmentIds).toHaveLength(1);
    expect(created[0].triggerSection).toBe("Product Knowledge");
    expect(created[0].userId).toBe("u1");
  });

  it("does not double-assign an existing open module", async () => {
    const { prisma } = mockPrisma({
      answers: [{ sectionName: "Greeting", scoreAwarded: 5, maxScore: 20 }],
      module: { id: "m1", rubricSectionMatch: "Greeting" },
      hasOpenAssignment: true,
    });
    const r = await assignTrainingForLowSections(prisma, { id: "s1", evaluatedEmployeeId: "u1" });
    expect(r.assignmentIds).toHaveLength(0);
  });

  it("skips when no matching module exists", async () => {
    const { prisma } = mockPrisma({
      answers: [{ sectionName: "Close", scoreAwarded: 5, maxScore: 20 }],
      module: null,
    });
    const r = await assignTrainingForLowSections(prisma, { id: "s1", evaluatedEmployeeId: "u1" });
    expect(r.assignmentIds).toHaveLength(0);
  });

  it("threshold is fixed at the documented value", () => {
    expect(LOW_SECTION_THRESHOLD).toBe(70);
  });
});
