# Architecture Diagram - Result Data Flow (After Fixes)

## Component Hierarchy & Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser URL                             │
│                    /exam/:examId (exam route)                   │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                  App.tsx (Main Shell)                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Context Provider:                                        │  │
│  │  • exams: ExamPaper[]                                    │  │
│  │  • sessionResponses: UserResponse                        │  │
│  │  • selectedExamId: string (old state-based)             │  │
│  │  • handleExamSubmit(responses, timeSpent, examId?)      │  │
│  │  • lastSubmissionId: string                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Functions:                                                      │
│  • calculateScore(exam, responses)                             │
│  • handleExamSubmit() ← Validation + DB Storage               │
│    - Uses isNATAnswerCorrect() for ranges                     │
│    - Uses isMCQAnswerCorrect() for OR logic                   │
│    - Stores to exam_submissions table                         │
│    - Caches to sessionStorage                                 │
└─────────────────────────────────────────────────────────────────┘
                               ↓
            ┌──────────────────┬──────────────────┐
            ↓                  ↓                  ↓
     ┌────────────┐     ┌────────────┐   ┌────────────┐
     │ /dashboard │     │ /admin     │   │  /exam/:id │
     │ ProfileDash│     │ AdminPanel │   │ STUDENT    │
     └────────────┘     └────────────┘   │ INTERFACE  │
                                         └────────────┘
                                                ↓
                    ┌───────────────────────────┴─────────────────┐
                    │                                             │
                    ↓                                             ↓
         [Question Display]                            [Exam Submission]
                                                                  ↓
                    ┌─────────────────────────────────────────────┘
                    │
                    ↓ handleExamSubmit(responses, timeSpent, examId)
                    │                                      ↑
                    │                        FROM useParams() ✅
                    │
        ┌─────────────────────────────┐
        │  App.handleExamSubmit()      │
        ├─────────────────────────────┤
        │ 1. examIdToSubmit =          │
        │    examIdOverride || ...     │
        │ 2. calculateScore() {        │
        │    - NAT: isNATCorrect()     │
        │    - MCQ: isMCQCorrect()     │
        │    - MSQ: exact match        │
        │ }                            │
        │ 3. Build studentAnswers[]    │
        │ 4. Insert to exam_submissions│
        │    INSERT {                 │
        │      user_id,               │
        │      exam_id: ✅ examId,   │
        │      student_answers,       │
        │      submitted_at,          │
        │      expires_at: +24h       │
        │    }                        │
        │ 5. Cache to sessionStorage   │
        │    setItem('exam_review_'   │
        │      ${submissionId}, ...) │
        │ 6. Return submissionId      │
        └─────────────────────────────┘
                    ↓
        ┌─────────────────────────────┐
        │  SessionStorage             │
        ├─────────────────────────────┤
        │ last_result_data: {         │
        │   examId,                   │
        │   responses,                │
        │   submissionId              │
        │ }                           │
        │                             │
        │ exam_review_${submissionId} │
        │ {full submission data}      │
        └─────────────────────────────┘
                    ↓
        ┌─────────────────────────────┐
        │  LocalStorage               │
        ├─────────────────────────────┤
        │ latest_submission_          │
        │ ${examId}: {                │
        │   submissionId,             │
        │   expiresAt: +24h           │
        │ }                           │
        └─────────────────────────────┘
                    ↓
            navigate('/result')
                    ↓
        ┌─────────────────────────────┐
        │  ResultScreen.tsx           │
        ├─────────────────────────────┤
        │ Data Source Priority:       │
        │ 1. Context (immediate)      │
        │ 2. SessionStorage (fallback)│
        │                             │
        │ Shows:                      │
        │ • Total Score               │
        │ • Correct/Wrong/Skipped     │
        │ • Section breakdown         │
        │ • Topic analytics           │
        │                             │
        │ Button:                     │
        │ "View solutions (24h)"      │
        │ onClick → fetch from        │
        │ localStorage link           │
        └─────────────────────────────┘
                    ↓
    navigate('/exam-review/{submissionId}')
                    ↓
        ┌──────────────────────────────┐
        │  ExamReview.tsx (IMPROVED)  │
        ├──────────────────────────────┤
        │ 1. Check Auth ✅             │
        │    supabase.auth.getSession()│
        │                              │
        │ 2. Try SessionStorage ✅     │
        │    getItem('exam_review_'    │
        │      ${submissionId})        │
        │    → Fast, no RLS needed     │
        │                              │
        │ 3. Fetch from Supabase ✅   │
        │    .from('exam_submissions') │
        │    .eq('id', submissionId)   │
        │    → RLS: user_id matches    │
        │    → Checks expires_at       │
        │                              │
        │ 4. Fetch Questions ✅       │
        │    .from('questions')        │
        │    .in('id', qIds)          │
        │                              │
        │ 5. Render with Validation    │
        │    - NAT: formatNATAnswer()  │
        │    - MCQ: option highlights  │
        │    - Display marks           │
        └──────────────────────────────┘
                    ↓
        ┌──────────────────────────────┐
        │  Detailed Solution Review    │
        ├──────────────────────────────┤
        │ For each question:           │
        │ • Question text/image        │
        │ • Student's answer           │
        │ • Correct answer             │
        │ • Marks earned               │
        │ • Visual indicators          │
        │   ✓ = correct                │
        │   ✖ = wrong                  │
        │   (highlight) = should pick  │
        │                              │
        │ Navigation:                  │
        │ • Previous/Next buttons      │
        │ • Question number selector   │
        └──────────────────────────────┘
```

---

## Database Schema

```
┌──────────────────────────────────────────────────┐
│            Supabase (PostgreSQL)                 │
├──────────────────────────────────────────────────┤
│                                                  │
│  auth.users                                      │
│  ├─ id (UUID)                                    │
│  └─ email, encrypted_password, etc.              │
│                                                  │
│  papers (Exams)                                  │
│  ├─ id (UUID) ← exam_id                         │
│  ├─ title, year, type                           │
│  └─ sections, questions                         │
│                                                  │
│  questions                                       │
│  ├─ id (UUID)                                    │
│  ├─ text, type (NAT/MCQ/MSQ)                    │
│  ├─ correctAnswer (can be ranges!)              │
│  ├─ marks, negativeMarks                        │
│  └─ optionDetails (rich format)                 │
│                                                  │
│  exam_submissions ◄────── OUR FOCUS             │
│  ├─ id (UUID) ← submissionId                    │
│  ├─ user_id (UUID) → auth.users                 │
│  ├─ exam_id (UUID) ← FROM examIdOverride ✅    │
│  ├─ student_answers (JSONB):                    │
│  │  [{                                          │
│  │    question_id,                              │
│  │    selected_value (NAT),                    │
│  │    correct_value (can be "65 or 1.12-1.14"),│
│  │    selected_option_ids (MCQ/MSQ),           │
│  │    correct_option_ids,                       │
│  │    is_correct,                               │
│  │    marks_earned,                             │
│  │    question_type,                            │
│  │    attempted                                 │
│  │  }]                                          │
│  ├─ total_marks, total_questions                │
│  ├─ passed (boolean)                            │
│  ├─ submitted_at (TIMESTAMPTZ)                  │
│  ├─ expires_at (TIMESTAMPTZ) ← +24h             │
│  │                                              │
│  │  RLS Policies:                               │
│  │  • SELECT: user_id = auth.uid() OR is_admin()
│  │  • INSERT: auth.uid() = user_id              │
│  └─                                             │
│                                                  │
│  user_attempts (Legacy Analytics)               │
│  ├─ id, user_id, paper_id                       │
│  ├─ responses, time_spent                       │
│  └─ score, accuracy                             │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## State Flow Diagram

```
START: User on /exam/{examId}
│
├─ useParams() → examId ✅
│
├─ StudentExamInterface displays exam
│
├─ User answers questions
│
├─ User clicks "Submit"
│
└─ performSubmit()
   │
   ├─ handleExamSubmit(responses, timeSpent, examId) ✅ NEW
   │
   └─ App.tsx handleExamSubmit()
      │
      ├─ examIdToSubmit = examIdOverride ✅ NEW
      │
      ├─ selectedExam = exams.find(e => e.id === examIdToSubmit) ✅ NEW
      │
      ├─ For each question:
      │  ├─ NAT: isNATAnswerCorrect(answer, correctValue)
      │  ├─ MCQ: isMCQAnswerCorrect(answer, correctValue)
      │  └─ MSQ: exact array match
      │
      ├─ Build studentAnswers array
      │
      ├─ INSERT exam_submissions
      │  └─ exam_id: selectedExam.id ✅ CORRECT
      │
      ├─ Cache: sessionStorage.setItem(`exam_review_${id}`, ...)
      │
      └─ Return submissionId
         │
         └─ navigate('/result')
            │
            ├─ ResultScreen reads from:
            │  ├─ Context (sessionResponses + exams)
            │  └─ SessionStorage fallback (last_result_data)
            │
            ├─ Shows "View solutions (24h)" button
            │
            └─ onClick navigate('/exam-review/{submissionId}')
               │
               └─ ExamReview.tsx
                  │
                  ├─ Check auth ✅
                  │
                  ├─ Try sessionStorage ✅
                  │
                  ├─ Fetch from Supabase if needed ✅
                  │
                  ├─ Fetch related questions ✅
                  │
                  └─ Display review with validation ✅

END: User sees detailed solution review
```

---

## 24-Hour Lifecycle

```
Timeline:
├─ T+0h: Submission created
│  ├─ exam_submissions.expires_at = T+24h
│  ├─ sessionStorage cached
│  ├─ localStorage link stored
│  └─ User sees results immediately
│
├─ T+0h to T+24h: Full Access
│  ├─ SessionStorage: instant (no DB)
│  ├─ Supabase: fast (with RLS auth)
│  └─ localStorage link: valid
│
├─ T+24h: Auto-Expiration
│  ├─ expires_at timestamp passed
│  ├─ Supabase query filters by: expires_at > now()
│  ├─ localStorage link: expiresAt < now()
│  ├─ "View solutions" button disabled
│  └─ User sees "Results have expired"
│
└─ T+24h+: Historical Access
   ├─ Supabase: records hidden (RLS)
   ├─ localStorage link: shows expired
   └─ User must take new exam for review
```

---

## Error Handling Flow

```
User accesses ExamReview:

├─ No Auth Session?
│  └─ Error: "Please log in to view your exam review."
│
├─ SessionStorage empty AND Supabase query fails?
│  └─ Check error type:
│     ├─ "FetchError" → DB unavailable
│     ├─ "Unauthorized" → RLS denied (wrong user)
│     └─ "NotFound" → Submission expired (24h)
│
├─ Questions not found in DB?
│  └─ Error: "Questions not found in database."
│
├─ student_answers empty?
│  └─ Error: "No answers found in this submission."
│
└─ All good?
   └─ Display review ✅
```

---

## Key Improvements Summary

```
BEFORE FIX:
StudentExamInterface → handleExamSubmit(responses, timeSpent)
                                      ↓
                          selectedExamId = undefined
                                      ↓
                    exam_id stored = undefined
                                      ↓
                          ExamReview FAILS
                          

AFTER FIX:
StudentExamInterface → handleExamSubmit(responses, timeSpent, examId)
                                                              ↑
                                              FROM useParams()
                                      ↓
                          examIdToSubmit = examId
                                      ↓
                    exam_id stored = CORRECT VALUE ✅
                                      ↓
                          ExamReview WORKS ✅
```
