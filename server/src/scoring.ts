import type { Prisma } from "@prisma/client";

type AnswerInput = {
  questionId: string;
  answerValue?: unknown;
  comment?: string | null;
};

type QuestionForScoring = {
  id: string;
  questionType: string;
  maxScore: number;
  weight: number;
  options: Prisma.JsonValue;
};

export function scoreAnswer(question: QuestionForScoring, answerValue: unknown): number {
  const max = question.maxScore;
  switch (question.questionType) {
    case "yes_no":
      return answerValue === true || answerValue === "yes" ? max : 0;
    case "scale_1_5": {
      const n = Number(answerValue);
      if (Number.isNaN(n)) return 0;
      const clamped = Math.max(1, Math.min(5, n));
      return ((clamped - 1) / 4) * max;
    }
    case "multi_choice": {
      const opts = (question.options as { value: string; score?: number }[] | null) ?? [];
      const found = opts.find((o) => o.value === answerValue);
      if (!found) return 0;
      return typeof found.score === "number" ? found.score : max;
    }
    case "free_text":
    case "photo_required":
    case "audio_required":
      // Subjective / presence-only — scoring done by reviewer; default to max if any value present.
      return answerValue ? max : 0;
    default:
      return 0;
  }
}

export function computeShopTotals(
  questions: QuestionForScoring[],
  answers: AnswerInput[],
): { totalScore: number; totalMax: number; percentage: number; perAnswer: { questionId: string; score: number }[] } {
  const byId = new Map(questions.map((q) => [q.id, q]));
  let totalScore = 0;
  let totalMax = 0;
  const perAnswer: { questionId: string; score: number }[] = [];
  for (const q of questions) {
    totalMax += q.maxScore;
  }
  for (const a of answers) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    const s = scoreAnswer(q, a.answerValue);
    totalScore += s;
    perAnswer.push({ questionId: a.questionId, score: s });
  }
  const percentage = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
  return { totalScore, totalMax, percentage, perAnswer };
}
