/**
 * NAT (Numerical Answer Type) Validation Utilities
 * Supports both single values and ranges (e.g., "109.9-112.4")
 */

/**
 * Parse a NAT answer string to check if it's a range, single value, or OR-separated values
 * @param answerStr - The answer string (e.g., "42", "109.9-112.4", or "10 OR 20")
 * @returns Object with { isRange: boolean, min: number, max: number, value?: number, orValues?: number[] }
 */
export const parseNATAnswer = (answerStr: string): { isRange: boolean; min: number; max: number; value?: number; orValues?: number[] } | null => {
  if (!answerStr || typeof answerStr !== 'string') return null;
  
  const trimmed = answerStr.trim();
  
  // Check for OR-separated values (e.g., "10 OR 20" or "10 or 20")
  if (/\bor\b/i.test(trimmed)) {
    const orParts = trimmed.split(/\s+or\s+/i).map(p => p.trim());
    const values = orParts.map(p => parseFloat(p)).filter(v => !isNaN(v));
    
    if (values.length >= 2) {
      return { 
        isRange: false, 
        min: Math.min(...values), 
        max: Math.max(...values), 
        orValues: values 
      };
    }
  }
  
  // Check if it's a range (contains "-" with two numbers)
  if (trimmed.includes('-')) {
    // Split and filter out empty strings
    const parts = trimmed.split('-').filter(p => p.trim().length > 0);
    
    // Handle case like "109.9-112.4"
    if (parts.length === 2) {
      const min = parseFloat(parts[0].trim());
      const max = parseFloat(parts[1].trim());
      
      if (!isNaN(min) && !isNaN(max) && min <= max) {
        return { isRange: true, min, max };
      }
    }
  }
  
  // Try to parse as single value
  const singleValue = parseFloat(trimmed);
  if (!isNaN(singleValue)) {
    return { isRange: false, min: singleValue, max: singleValue, value: singleValue };
  }
  
  return null;
};

/**
 * Check if a student's answer is correct for a NAT question
 * Handles single values, ranges, and OR-separated acceptable answers
 * @param studentAnswer - The student's answer string
 * @param correctAnswer - The correct answer string (can be single value, range, or "10 OR 20")
 * @returns boolean - true if answer is correct (within range, exact match, or matches any OR value)
 */
export const isNATAnswerCorrect = (studentAnswer: string | undefined, correctAnswer: string | undefined): boolean => {
  if (!studentAnswer || !correctAnswer) return false;
  
  const studentParsed = parseNATAnswer(studentAnswer);
  const correctParsed = parseNATAnswer(correctAnswer);
  
  if (!studentParsed || !correctParsed) return false;
  
  const studentValue = studentParsed.value ?? (studentParsed.min + studentParsed.max) / 2;
  
  // If correct answer has OR values, check if student answer matches any of them
  if (correctParsed.orValues && correctParsed.orValues.length > 0) {
    return correctParsed.orValues.some(correctVal => Math.abs(studentValue - correctVal) < 0.01);
  }
  
  // Check if student answer falls within the correct range
  return studentValue >= correctParsed.min && studentValue <= correctParsed.max;
};

/**
 * Format a NAT answer for display
 * If it's a range, return "min - max", if OR values return "val1 OR val2", otherwise return the value
 * @param answerStr - The answer string
 * @returns formatted string for display
 */
export const formatNATAnswer = (answerStr: string | undefined): string => {
  if (!answerStr) return 'N/A';
  
  const parsed = parseNATAnswer(answerStr);
  if (!parsed) return answerStr;
  
  if (parsed.orValues && parsed.orValues.length > 0) {
    return parsed.orValues.join(' OR ');
  }
  
  if (parsed.isRange) {
    return `${parsed.min} - ${parsed.max}`;
  }
  
  return String(parsed.value ?? parsed.min);
};

/**
 * Get the answer tolerance/range display string
 * @param answerStr - The correct answer string
 * @returns string describing the acceptable range or OR values
 */
export const getNATAnswerRangeDisplay = (answerStr: string | undefined): string => {
  if (!answerStr) return '';
  
  const parsed = parseNATAnswer(answerStr);
  if (!parsed) return answerStr;
  
  if (parsed.orValues && parsed.orValues.length > 0) {
    return `(Accepted: ${parsed.orValues.join(' OR ')})`;
  }
  
  if (parsed.isRange) {
    return `(Accepted range: ${parsed.min} to ${parsed.max})`;
  }
  
  return `(Exact: ${parsed.value ?? parsed.min})`;
};
