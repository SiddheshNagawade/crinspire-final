/**
 * Test cases for NAT Range Validation
 * Run these tests to verify the range validation system works correctly
 */

import { parseNATAnswer, isNATAnswerCorrect, formatNATAnswer, getNATAnswerRangeDisplay } from './natValidation';

// ============================================================================
// Test 1: Parse Single Values
// ============================================================================
console.log('=== Test 1: Parse Single Values ===');

const test1a = parseNATAnswer('42');
console.log('parseNATAnswer("42"):', test1a);
// Expected: { isRange: false, min: 42, max: 42, value: 42 }

const test1b = parseNATAnswer('  50.5  ');
console.log('parseNATAnswer("  50.5  "):', test1b);
// Expected: { isRange: false, min: 50.5, max: 50.5, value: 50.5 }

// ============================================================================
// Test 2: Parse Ranges
// ============================================================================
console.log('\n=== Test 2: Parse Ranges ===');

const test2a = parseNATAnswer('109.9-112.4');
console.log('parseNATAnswer("109.9-112.4"):', test2a);
// Expected: { isRange: true, min: 109.9, max: 112.4 }

const test2b = parseNATAnswer('10 - 20');
console.log('parseNATAnswer("10 - 20"):', test2b);
// Expected: { isRange: true, min: 10, max: 20 }

const test2c = parseNATAnswer('-5--2');
console.log('parseNATAnswer("-5--2"):', test2c);
// Expected: { isRange: true, min: -5, max: -2 }

// ============================================================================
// Test 3: NAT Answer Correctness - Single Values
// ============================================================================
console.log('\n=== Test 3: NAT Answer Correctness - Single Values ===');

const test3a = isNATAnswerCorrect('42', '42');
console.log('isNATAnswerCorrect("42", "42"):', test3a);
// Expected: true

const test3b = isNATAnswerCorrect('42', '40');
console.log('isNATAnswerCorrect("42", "40"):', test3b);
// Expected: false

const test3c = isNATAnswerCorrect('42.0', '42');
console.log('isNATAnswerCorrect("42.0", "42"):', test3c);
// Expected: false (different strings after parsing, but same numeric value - depends on implementation)

// ============================================================================
// Test 4: NAT Answer Correctness - Ranges
// ============================================================================
console.log('\n=== Test 4: NAT Answer Correctness - Ranges ===');

const test4a = isNATAnswerCorrect('110', '109.9-112.4');
console.log('isNATAnswerCorrect("110", "109.9-112.4"):', test4a);
// Expected: true

const test4b = isNATAnswerCorrect('109.9', '109.9-112.4');
console.log('isNATAnswerCorrect("109.9", "109.9-112.4"):', test4b);
// Expected: true

const test4c = isNATAnswerCorrect('112.4', '109.9-112.4');
console.log('isNATAnswerCorrect("112.4", "109.9-112.4"):', test4c);
// Expected: true

const test4d = isNATAnswerCorrect('112.5', '109.9-112.4');
console.log('isNATAnswerCorrect("112.5", "109.9-112.4"):', test4d);
// Expected: false

const test4e = isNATAnswerCorrect('109.8', '109.9-112.4');
console.log('isNATAnswerCorrect("109.8", "109.9-112.4"):', test4e);
// Expected: false

const test4f = isNATAnswerCorrect('111.15', '109.9-112.4');
console.log('isNATAnswerCorrect("111.15", "109.9-112.4"):', test4f);
// Expected: true

// ============================================================================
// Test 5: Format NAT Answers
// ============================================================================
console.log('\n=== Test 5: Format NAT Answers ===');

const test5a = formatNATAnswer('42');
console.log('formatNATAnswer("42"):', test5a);
// Expected: "42"

const test5b = formatNATAnswer('109.9-112.4');
console.log('formatNATAnswer("109.9-112.4"):', test5b);
// Expected: "109.9 - 112.4"

// ============================================================================
// Test 6: Get Range Display
// ============================================================================
console.log('\n=== Test 6: Get Range Display ===');

const test6a = getNATAnswerRangeDisplay('42');
console.log('getNATAnswerRangeDisplay("42"):', test6a);
// Expected: "(Exact: 42)"

const test6b = getNATAnswerRangeDisplay('109.9-112.4');
console.log('getNATAnswerRangeDisplay("109.9-112.4"):', test6b);
// Expected: "(Accepted range: 109.9 to 112.4)"

// ============================================================================
// Test 7: Edge Cases
// ============================================================================
console.log('\n=== Test 7: Edge Cases ===');

const test7a = isNATAnswerCorrect('', '42');
console.log('isNATAnswerCorrect("", "42"):', test7a);
// Expected: false

const test7b = isNATAnswerCorrect('42', '');
console.log('isNATAnswerCorrect("42", ""):', test7b);
// Expected: false

const test7c = isNATAnswerCorrect('abc', '42');
console.log('isNATAnswerCorrect("abc", "42"):', test7c);
// Expected: false

const test7d = isNATAnswerCorrect('42', 'abc');
console.log('isNATAnswerCorrect("42", "abc"):', test7d);
// Expected: false

const test7e = isNATAnswerCorrect('-3', '-5--2');
console.log('isNATAnswerCorrect("-3", "-5--2"):', test7e);
// Expected: true

// ============================================================================
// MANUAL TESTING CHECKLIST
// ============================================================================
/*
To test in the app manually:

1. Admin Panel - Create NAT Question
   - [ ] Create question with answer "42"
   - [ ] Create question with answer "109.9-112.4"
   - [ ] Create question with answer "10-20"
   - [ ] Save and reload—answers should persist

2. Exam Taking
   - [ ] Take exam, enter "110" for question with answer "109.9-112.4"
   - [ ] Result should show ✅ Correct
   - [ ] Enter "42.0" for question with answer "42"
   - [ ] Result should show ❌ Incorrect (not exact match)
   - [ ] Enter "113" for question with answer "109.9-112.4"
   - [ ] Result should show ❌ Incorrect

3. Results Screen
   - [ ] Score should be calculated correctly with ranges
   - [ ] Accuracy should reflect range-based checking

4. Review Screen
   - [ ] Single value shows: "Exact: 42"
   - [ ] Range shows: "Accepted range: 109.9 to 112.4"
   - [ ] Student answer displays correctly
   - [ ] Correct/Incorrect highlighting works
*/
