// Conditional logic for rubric questions, per spec §6.1.
// Supported forms (stored on RubricQuestion.conditionalLogic):
//   { "requireCommentIf": <answerValue> }
//     → if answer === answerValue, the comment field is required
//   { "requireCommentIfIn": [<answerValue>, ...] }
//     → if answer is one of the given values, comment is required

export type ConditionalLogic =
  | { requireCommentIf: unknown }
  | { requireCommentIfIn: unknown[] }
  | null
  | undefined;

export interface AnswerForValidation {
  answerValue: unknown;
  comment?: string | null;
}

export function commentRequired(logic: ConditionalLogic, answer: unknown): boolean {
  if (!logic) return false;
  if ("requireCommentIf" in logic && logic.requireCommentIf !== undefined) {
    return answer === logic.requireCommentIf;
  }
  if ("requireCommentIfIn" in logic && Array.isArray(logic.requireCommentIfIn)) {
    return logic.requireCommentIfIn.includes(answer);
  }
  return false;
}

export function validateAnswer(
  logic: ConditionalLogic,
  answer: AnswerForValidation,
): { ok: true } | { ok: false; reason: string } {
  if (!commentRequired(logic, answer.answerValue)) return { ok: true };
  if (!answer.comment || !answer.comment.trim()) {
    return { ok: false, reason: "comment_required" };
  }
  return { ok: true };
}
