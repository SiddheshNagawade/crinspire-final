# Result Data Flow - Complete Architecture

## Overview
This document explains how exam results flow through the system after a student submits an exam, from submission to review.

---

## Complete Data Flow

### Phase 1: Exam Submission
**When:** Student clicks "Submit Exam" in StudentExamInterface
**Location:** `components/StudentExamInterface.tsx` → `App.tsx`

1. Student answers exam questions and clicks submit
2. `StudentExamInterface.performSubmit()` is called (line ~320)
3. Calls `handleExamSubmit(responses, timeSpent, examId)` with **examId from URL params**
4. **Navigation:** `navigate('/result')` → ResultScreen

```typescript
// StudentExamInterface.tsx line 315
const performSubmit = async () => {
    await handleExamSubmit(responses, timeSpent, examId); // ← examId passed!
    navigate('/result');
};
```

---

### Phase 2: Score Calculation & Database Storage
**Location:** `App.tsx` `handleExamSubmit()` function (lines 746-890)

#### 2A. Initialization
```typescript
const examIdToSubmit = examIdOverride || selectedExamId; // Uses examIdOverride from StudentExamInterface
const selectedExam = exams.find(e => e.id === examIdToSubmit);
```

#### 2B. Per-Question Answer Processing
For each question in the exam:
- **NAT Questions:** Uses `isNATAnswerCorrect()` to validate ranges and OR logic (e.g., "65 or 1.12-1.14")
- **MCQ Questions:** Uses `isMCQAnswerCorrect()` to validate with OR logic (e.g., "A or B")
- **MSQ Questions:** Exact array match after sorting

Builds `studentAnswers[]` array with structure:
```typescript
{
    question_id: string,
    selected_option_ids?: string[],      // For MCQ/MSQ
    selected_value?: string,              // For NAT
    correct_value?: string,               // For NAT - can be "65 or 1.12-1.14"
    marks_earned: number,
    is_correct: boolean,
    correct_option_ids?: string[],
    question_type: QuestionType,
    attempted: boolean,
    max_marks: number
}
```

#### 2C. Database Insert
```typescript
const { data: submissionRow, error: submissionError } = await supabase
    .from('exam_submissions')
    .insert([{
        user_id: session.user.id,
        exam_id: selectedExam.id,           // ← Correct exam_id from examIdOverride
        student_answers: studentAnswers,    // ← Full answer details
        total_marks: totalMarks,
        total_questions: totalQuestions,
        passed,
    }])
    .select()
    .single();
```

**Result:** `submissionRow` contains:
- `id` (uuid) - unique submission ID
- `user_id` - authenticated user
- `exam_id` - the exam taken
- `student_answers` - all question/answer details
- `submitted_at` - timestamp
- `expires_at` - 24 hours from now

#### 2D: Caching & Navigation
```typescript
// Cache full submission data for SessionStorage access
sessionStorage.setItem(`exam_review_${submissionRow.id}`, JSON.stringify(submissionRow));

// Store quick result data
sessionStorage.setItem('last_result_data', JSON.stringify({
    examId: selectedExam.id,
    responses: responses,
    submissionId: submissionRow.id,
    timestamp: Date.now()
}));

// Store submission link for 24h recall
localStorage.setItem(`latest_submission_${selectedExam.id}`, JSON.stringify({
    submissionId: submissionRow.id,
    examId: selectedExam.id,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
}));
```

---

### Phase 3: Result Display
**Location:** `components/ResultScreen.tsx`

1. **Data Source Priority:**
   - ✅ Context (`sessionResponses` + `exams` + `selectedExamId`) - immediate from submission
   - ⚠️ SessionStorage (`last_result_data`) - fallback if context is empty
   - ❌ Fails if neither available

2. **Submission Link Lookup:**
   - Reads from localStorage: `latest_submission_${activeExamId}`
   - Checks if not expired (24 hours)
   - Sets `submissionIdForReview` for "View solutions" button

3. **Button:** "View solutions (24h)" navigates to `/exam-review/{submissionId}`

```typescript
<button
    onClick={() => submissionIdForReview && navigate(`/exam-review/${submissionIdForReview}`)}
>
    View solutions (24h)
</button>
```

---

### Phase 4: Detailed Review
**Location:** `components/ExamReview.tsx`

#### 4A: Submission Retrieval (Improved)
```typescript
// Step 1: Check authentication
const { data: { session }, error: sessionError } = await supabase.auth.getSession();
if (!session?.user) {
    setError('Please log in to view your exam review.');
    return;
}

// Step 2: Try SessionStorage first (fastest)
const cached = sessionStorage.getItem(`exam_review_${submissionId}`);
if (cached) {
    submission = JSON.parse(cached);
    console.log('Loaded submission from sessionStorage');
}

// Step 3: Fall back to Supabase if needed
if (!submission) {
    const { data, error: fetchError } = await supabase
        .from('exam_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();
    
    if (fetchError) {
        throw new Error(`Failed to fetch submission: ${fetchError.message}`);
    }
    submission = data;
}

// Step 4: Fetch questions
const qIds = submission.student_answers.map(s => s.question_id);
const { data: qData, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .in('id', qIds);
```

#### 4B: Question Display
For each question:
- Shows student's answer vs correct answer
- For NAT: Shows ranges with `getNATAnswerRangeDisplay()` (e.g., "Accepted: 65 or 1.12-1.14")
- For MCQ/MSQ: Highlights correct/incorrect options with visual indicators
- Displays marks earned and comparison

---

## Supabase Schema

### Table: `exam_submissions`
```sql
CREATE TABLE exam_submissions (
  id UUID PRIMARY KEY (auto-generated),
  user_id UUID NOT NULL (references auth.users.id),
  exam_id UUID NOT NULL (references papers.id),
  student_answers JSONB NOT NULL,
  total_marks NUMERIC NOT NULL,
  total_questions INTEGER NOT NULL,
  passed BOOLEAN,
  submitted_at TIMESTAMPTZ (default: now()),
  expires_at TIMESTAMPTZ (default: now() + 24 hours)
);
```

### RLS Policies
```sql
-- Only users can view their own submissions
CREATE POLICY "exam_submissions_select_own" ON exam_submissions
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

-- Only authenticated users can insert
CREATE POLICY "exam_submissions_insert_own" ON exam_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## Data Persistence

| Storage | Data | Scope | Duration | Purpose |
|---------|------|-------|----------|---------|
| **Context** | responses, selectedExamId, sessionResponses | App.tsx → Outlet | Current session | Immediate result display |
| **SessionStorage** | last_result_data | Browser tab | Until page close | Fallback for ResultScreen |
| **SessionStorage** | exam_review_${submissionId} | Browser tab | Until page close | Cached submission for ExamReview |
| **LocalStorage** | latest_submission_${examId} | Browser | 24 hours | Persistent submission link |
| **Supabase** | exam_submissions | Database | 24 hours | Authoritative data source |

---

## Troubleshooting Guide

### "No result data found" Error in ResultScreen

**Cause Chain:**
1. Context is empty (no sessionResponses)
2. SessionStorage is also empty (last_result_data not set)
3. No data to display

**Solution:**
- Ensure `StudentExamInterface.performSubmit()` passes `examId` to `handleExamSubmit`
- Verify user is logged in (RLS requires auth)
- Check browser sessionStorage isn't cleared
- ✅ **Fixed:** Updated StudentExamInterface.tsx line 315

### "Failed to fetch submission" Error in ExamReview

**Cause Chain:**
1. SessionStorage is empty (page refresh, new tab, etc.)
2. Tries to fetch from Supabase via exam_submissions
3. RLS policy denies access OR submission expired

**Solutions:**
1. Check user is logged in: `supabase.auth.getSession()`
2. Verify submission exists: Check Supabase exam_submissions table
3. Check 24h expiration: `expires_at` timestamp
4. ✅ **Fixed:** Added auth check and better error messages in ExamReview.tsx

### "Submission not found" Error in ExamReview

**Cause:**
- Submission expired (older than 24 hours)
- Wrong submissionId
- User trying to access another user's submission

**Solution:**
- Submissions auto-expire after 24 hours
- User can view via ResultScreen immediately
- For historical access, implement archive system in future

---

## Testing Checklist

- [ ] Submit exam as logged-in user
- [ ] ResultScreen displays with scores and stats
- [ ] Click "View solutions (24h)" button
- [ ] ExamReview loads with questions and answers
- [ ] NAT answers show correct range formatting (e.g., "65 or 1.12-1.14")
- [ ] MCQ answers show with OR logic validation
- [ ] Navigate between questions in ExamReview
- [ ] Browser refresh on ResultScreen still works (uses sessionStorage)
- [ ] Browser refresh on ExamReview still works (uses sessionStorage cache)
- [ ] Submission link expires after 24 hours

---

## Key Files Modified

1. **StudentExamInterface.tsx** (line 315)
   - ✅ Now passes `examId` to `handleExamSubmit`

2. **App.tsx handleExamSubmit** (lines 746-890)
   - ✅ Accepts `examIdOverride` parameter
   - ✅ Correctly stores exam_id to Supabase
   - ✅ Caches to sessionStorage with submissionId

3. **ExamReview.tsx** (lines 40-120)
   - ✅ Checks authentication before fetching
   - ✅ SessionStorage fallback before Supabase
   - ✅ Better error messages
   - ✅ Console logging for debugging

4. **natValidation.ts**
   - ✅ Supports "65 or 1.12-1.14" format

5. **mcqValidation.ts**
   - ✅ Supports "A or B" OR logic
