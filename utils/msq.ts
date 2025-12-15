import { QuestionOption } from '../types';

/**
 * Calculate marks for MSQ based on UCEED-style rules.
 * - Any incorrect selection => -1
 * - No selection => 0
 * - Partial correct => proportional positive marks
 * - All correct => full marks
 */
export function calculateMSQMarks(
  selectedIds: string[],
  options: QuestionOption[],
  fullMarks: number
) {
  const correctIds = options.filter(o => o.isCorrect).map(o => o.id);
  const correctSelected = selectedIds.filter(id => correctIds.includes(id)).length;
  const incorrectSelected = selectedIds.filter(id => !correctIds.includes(id)).length;
  const totalCorrect = correctIds.length || 1; // prevent divide-by-zero

  if (selectedIds.length === 0) return 0;
  if (incorrectSelected > 0) return -1;
  if (correctSelected === totalCorrect) return fullMarks;
  return (correctSelected / totalCorrect) * fullMarks;
}

export function getMSQPreview(options: QuestionOption[], fullMarks: number) {
  const totalCorrect = Math.max(options.filter(o => o.isCorrect).length, 1);
  const partial = Array.from({ length: totalCorrect - 1 }, (_, i) => ({
    count: i + 1,
    marks: ((i + 1) / totalCorrect) * fullMarks,
  }));
  return {
    totalCorrect,
    breakdown: {
      fullCorrect: fullMarks,
      partial,
      anyWrong: -1,
      unanswered: 0,
    },
  };
}
