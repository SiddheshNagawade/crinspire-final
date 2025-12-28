/**
 * MCQ Answer Validation with OR logic
 * Supports single answers (e.g., "A") and OR-separated answers (e.g., "A or B")
 */

/**
 * Parse MCQ answer string to handle OR logic
 * @param answerStr - The answer string (e.g., "A", "A or B", "A OR B")
 * @returns Array of valid answer options
 */
export const parseMCQAnswer = (answerStr: string): string[] => {
  if (!answerStr || typeof answerStr !== 'string') return [];
  
  const trimmed = answerStr.trim();
  
  // Check for OR-separated values (e.g., "A or B" or "A OR B")
  if (/\bor\b/i.test(trimmed)) {
    return trimmed.split(/\s+or\s+/i).map(p => p.trim().toUpperCase()).filter(v => v.length > 0);
  }
  
  // Single answer
  return [trimmed.toUpperCase()];
};

/**
 * Check if a student's MCQ answer is correct
 * Handles single answers and OR-separated acceptable answers
 * @param studentAnswer - The student's answer string (e.g., "A")
 * @param correctAnswer - The correct answer string (e.g., "A" or "A or B")
 * @returns boolean - true if student answer matches any of the correct options
 */
export const isMCQAnswerCorrect = (studentAnswer: string | undefined, correctAnswer: string | undefined): boolean => {
  if (!studentAnswer || !correctAnswer) return false;
  
  const studentAns = studentAnswer.trim().toUpperCase();
  const validOptions = parseMCQAnswer(correctAnswer);
  
  return validOptions.includes(studentAns);
};

/**
 * Format MCQ answer for display
 * @param answerStr - The answer string
 * @returns formatted string for display
 */
export const formatMCQAnswer = (answerStr: string | undefined): string => {
  if (!answerStr) return 'N/A';
  
  const options = parseMCQAnswer(answerStr);
  if (options.length > 1) {
    return options.join(' or ');
  }
  
  return options[0] || answerStr;
};
