import { describe, it, expect } from "vitest";
import { computeShopTotals, scoreAnswer } from "./scoring.js";

describe("scoreAnswer", () => {
  it("scores yes_no full or zero", () => {
    const q = { id: "q1", questionType: "yes_no", maxScore: 10, weight: 1, options: null };
    expect(scoreAnswer(q, true)).toBe(10);
    expect(scoreAnswer(q, "yes")).toBe(10);
    expect(scoreAnswer(q, false)).toBe(0);
    expect(scoreAnswer(q, "no")).toBe(0);
  });

  it("scores scale_1_5 linearly between 1 (=0) and 5 (=max)", () => {
    const q = { id: "q1", questionType: "scale_1_5", maxScore: 20, weight: 1, options: null };
    expect(scoreAnswer(q, 1)).toBe(0);
    expect(scoreAnswer(q, 3)).toBe(10);
    expect(scoreAnswer(q, 5)).toBe(20);
  });

  it("clamps scale_1_5 out-of-range values", () => {
    const q = { id: "q1", questionType: "scale_1_5", maxScore: 8, weight: 1, options: null };
    expect(scoreAnswer(q, 0)).toBe(0);
    expect(scoreAnswer(q, 9)).toBe(8);
  });

  it("scores multi_choice using option-defined scores", () => {
    const q = {
      id: "q1",
      questionType: "multi_choice",
      maxScore: 10,
      weight: 1,
      options: [{ value: "a", score: 3 }, { value: "b", score: 7 }],
    };
    expect(scoreAnswer(q, "a")).toBe(3);
    expect(scoreAnswer(q, "b")).toBe(7);
    expect(scoreAnswer(q, "c")).toBe(0);
  });

  it("treats free_text as max if any value present, 0 otherwise", () => {
    const q = { id: "q1", questionType: "free_text", maxScore: 5, weight: 1, options: null };
    expect(scoreAnswer(q, "answer")).toBe(5);
    expect(scoreAnswer(q, "")).toBe(0);
  });
});

describe("computeShopTotals", () => {
  it("totals score and max across all questions", () => {
    const questions = [
      { id: "q1", questionType: "yes_no", maxScore: 10, weight: 1, options: null },
      { id: "q2", questionType: "scale_1_5", maxScore: 20, weight: 1, options: null },
      { id: "q3", questionType: "yes_no", maxScore: 10, weight: 1, options: null },
    ];
    const result = computeShopTotals(questions, [
      { questionId: "q1", answerValue: true },
      { questionId: "q2", answerValue: 5 },
      { questionId: "q3", answerValue: false },
    ]);
    expect(result.totalScore).toBe(30); // 10 + 20 + 0
    expect(result.totalMax).toBe(40);
    expect(result.percentage).toBe(75);
  });

  it("handles empty answers", () => {
    const questions = [{ id: "q1", questionType: "yes_no", maxScore: 10, weight: 1, options: null }];
    const result = computeShopTotals(questions, []);
    expect(result.totalScore).toBe(0);
    expect(result.totalMax).toBe(10);
    expect(result.percentage).toBe(0);
  });
});
