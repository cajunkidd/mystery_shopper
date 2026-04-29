import { describe, it, expect } from "vitest";
import { commentRequired, validateAnswer } from "./conditional.js";

describe("commentRequired", () => {
  it("returns false when no logic is set", () => {
    expect(commentRequired(null, "yes")).toBe(false);
    expect(commentRequired(undefined, "yes")).toBe(false);
  });

  it("requires a comment when answer matches requireCommentIf", () => {
    expect(commentRequired({ requireCommentIf: "no" }, "no")).toBe(true);
    expect(commentRequired({ requireCommentIf: "no" }, "yes")).toBe(false);
    expect(commentRequired({ requireCommentIf: false }, false)).toBe(true);
  });

  it("requires a comment when answer is in requireCommentIfIn list", () => {
    expect(commentRequired({ requireCommentIfIn: ["no", 1, 2] }, 1)).toBe(true);
    expect(commentRequired({ requireCommentIfIn: ["no", 1, 2] }, 5)).toBe(false);
  });
});

describe("validateAnswer", () => {
  it("passes when no comment is required", () => {
    const r = validateAnswer({ requireCommentIf: "no" }, { answerValue: "yes" });
    expect(r.ok).toBe(true);
  });

  it("fails when a required comment is missing", () => {
    const r = validateAnswer({ requireCommentIf: "no" }, { answerValue: "no" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("comment_required");
  });

  it("fails when comment is whitespace-only", () => {
    const r = validateAnswer(
      { requireCommentIf: "no" },
      { answerValue: "no", comment: "   " },
    );
    expect(r.ok).toBe(false);
  });

  it("passes when the required comment is present", () => {
    const r = validateAnswer(
      { requireCommentIf: "no" },
      { answerValue: "no", comment: "The associate was on the phone." },
    );
    expect(r.ok).toBe(true);
  });
});
