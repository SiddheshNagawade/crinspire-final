/**
 * NAT (Numerical Answer Type) Validation Utilities
 * Supports both single values and ranges (e.g., "109.9-112.4")
 */

/**
 * Parse a NAT answer string to support combined OR and range logic
 * @param answerStr - The answer string (e.g., "42", "1.12-1.14", "10 OR 20", or "65 or 1.12-1.14")
 * @returns Object with { ranges: Array<{min, max}>, values: number[] }
 */
export const parseNATAnswer = (answerStr: string): { ranges: Array<{min: number, max: number}>; values: number[] } | null => {
  if (!answerStr || typeof answerStr !== 'string') return null;
  
  const trimmed = answerStr.trim();
  const ranges: Array<{min: number, max: number}> = [];
  const values: number[] = [];
  
  // Split by OR to handle combined logic like "65 or 1.12-1.14"
  if (/\bor\b/i.test(trimmed)) {
    const orParts = trimmed.split(/\s+or\s+/i).map(p => p.trim());
    
    orParts.forEach(part => {
      // Check if this part is a range (e.g., "1.12-1.14")
      if (part.includes('-')) {
        const rangeParts = part.split('-').filter(p => p.trim().length > 0);
        if (rangeParts.length === 2) {
          const min = parseFloat(rangeParts[0].trim());
          const max = parseFloat(rangeParts[1].trim());
          if (!isNaN(min) && !isNaN(max) && min <= max) {
            ranges.push({ min, max });
          }
        }
      } else {
        // Single value
        const val = parseFloat(part);
        if (!isNaN(val)) {
          values.push(val);
        }
      }
    });
  } else if (trimmed.includes('-')) {
    // Single range (e.g., "1.12-1.14")
    const parts = trimmed.split('-').filter(p => p.trim().length > 0);
    if (parts.length === 2) {
      const min = parseFloat(parts[0].trim());
      const max = parseFloat(parts[1].trim());
      if (!isNaN(min) && !isNaN(max) && min <= max) {
        ranges.push({ min, max });
      }
    }
  } else {
    // Single value
    const singleValue = parseFloat(trimmed);
    if (!isNaN(singleValue)) {
      values.push(singleValue);
    }
  }
  
  // If we have no ranges or values, return null
  if (ranges.length === 0 && values.length === 0) {
    return null;
  }
  
  return { ranges, values };
};

/**
 * Check if a student's answer is correct for a NAT question
 * Handles single values, ranges, and combined OR logic with ranges
 * @param studentAnswer - The student's answer string
 * @param correctAnswer - The correct answer string (e.g., "65", "1.12-1.14", "10 OR 20", or "65 or 1.12-1.14")
 * @returns boolean - true if answer matches any value or falls within any range
 */
export const isNATAnswerCorrect = (studentAnswer: string | undefined, correctAnswer: string | undefined): boolean => {
  if (!studentAnswer || !correctAnswer) return false;
  
  const studentParsed = parseNATAnswer(studentAnswer);
  const correctParsed = parseNATAnswer(correctAnswer);
  
  if (!studentParsed || !correctParsed) return false;
  
  const studentValue = studentParsed.values[0] ?? (studentParsed.ranges[0]?.min + studentParsed.ranges[0]?.max) / 2;
  
  // Check if student answer matches any specific value
  for (const acceptedValue of correctParsed.values) {
    if (Math.abs(studentValue - acceptedValue) < 0.01) {
      return true;
    }
  }
  
  // Check if student answer falls within any acceptable range
  for (const range of correctParsed.ranges) {
    if (studentValue >= range.min && studentValue <= range.max) {
      return true;
    }
  }
  
  return false;
};

/**
 * Format a NAT answer for display
 * @param answerStr - The answer string
 * @returns formatted string for display
 */
export const formatNATAnswer = (answerStr: string | undefined): string => {
  if (!answerStr) return 'N/A';
  
  const parsed = parseNATAnswer(answerStr);
  if (!parsed) return answerStr;
  
  const parts: string[] = [];
  
  // Add ranges
  parsed.ranges.forEach(range => {
    parts.push(`${range.min}-${range.max}`);
  });
  
  // Add individual values
  parsed.values.forEach(val => {
    parts.push(String(val));
  });
  
  return parts.join(' or ');
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
  
  const parts: string[] = [];
  
  // Add ranges
  parsed.ranges.forEach(range => {
    parts.push(`${range.min} to ${range.max}`);
  });
  
  // Add individual values
  parsed.values.forEach(val => {
    parts.push(String(val));
  });
  
  if (parts.length === 0) return '';
  
  return `(Accepted: ${parts.join(' or ')})`;
};
