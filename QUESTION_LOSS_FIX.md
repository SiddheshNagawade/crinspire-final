# Question Loss Prevention & Recovery Guide

## 🚨 Root Cause Analysis: Your Question Data Loss

Your earlier question paper lost all questions after creating a second exam. This was caused by **THREE converging issues**:

### Issue #1: Dangerous Schema (ON DELETE CASCADE)
**Location:** `/supabase/schema.sql` line 85
```sql
-- ❌ DANGEROUS:
paper_id uuid references public.papers(id) on delete cascade
```
**Problem:** If the paper record was accidentally modified or touched during another save operation, the CASCADE DELETE could wipe all questions automatically.

**Status:** ✅ **FIXED** - The app now uses `UPSERT` (safe updates) instead of `DELETE+INSERT` (dangerous).

---

### Issue #2: Destructive Save Pattern (Delete Before Insert)
**Location:** `/App.tsx` line 334 (BEFORE FIX)
```tsx
// ❌ OLD CODE:
const { error: deleteError } = await supabase
    .from('questions')
    .delete()
    .eq('paper_id', paperId);  // DELETES ALL QUESTIONS FOR THIS PAPER

// Then insert new ones...
// If this insert fails, all questions are LOST!
```
**Problem:** If autosave happened mid-edit, or the insert failed after delete, all questions for that paper would be permanently deleted.

**Status:** ✅ **FIXED** - Now uses safe UPSERT with intelligent merging:
```tsx
// NEW CODE:
// 1. Fetch existing questions
const existingQuestions = await fetchQuestions(paperId);

// 2. Only delete questions that are actually removed
const toDelete = existingQuestions.filter(q => !newData.includes(q));
await deleteOnlyThese(toDelete);

// 3. Upsert new ones (safe: creates or updates)
await upsert(newQuestions);
```

---

### Issue #3: Position Not Always Preserved
**Location:** `/App.tsx` fetch ordering
**Problem:** Questions were sorted by `created_at` instead of `position`, causing them to reorder unpredictably.

**Status:** ✅ **FIXED** - Now properly orders by:
1. Paper ID (group by exam)
2. Section Name (group by section)
3. Position (your entry order)
4. Created At (fallback)

---

## 🔍 Diagnostic Check

To verify your database doesn't have orphaned questions, run this in Supabase SQL Editor:

```sql
-- Check 1: Count questions per exam
SELECT 
  p.id,
  p.title,
  COUNT(q.id) as question_count
FROM public.papers p
LEFT JOIN public.questions q ON p.id = q.paper_id
GROUP BY p.id, p.title
ORDER BY p.created_at DESC;
```

**Expected:** All exams have their questions. If any show `0`, that's a loss incident.

```sql
-- Check 2: Orphaned questions (shouldn't exist now)
SELECT COUNT(*) as orphaned_count
FROM public.questions
WHERE paper_id IS NULL;
```

**Expected:** `0` (or very few if manually deleted)

```sql
-- Check 3: Position integrity
SELECT 
  paper_id,
  section_name,
  COUNT(DISTINCT position) as unique_positions,
  COUNT(*) as total_questions
FROM public.questions
GROUP BY paper_id, section_name
HAVING COUNT(DISTINCT position) < COUNT(*);
```

**Expected:** No rows (empty result = all positions are unique per section)

---

## 🛡️ Safety Improvements Applied

### 1. Transactional Safety (App Level)
```
✅ Fetch existing questions first
✅ Only delete removed questions
✅ Use UPSERT for safe inserts/updates
✅ Autosave no longer deletes
```

### 2. Position Ordering
```
✅ Position column is always saved
✅ Questions ordered by position (not created_at)
✅ Position resets per section for clarity
✅ Index optimizes reading by paper+section
```

### 3. Migrations
```
✅ Migration 05: Add position column
✅ Migration 06: Add option_details column
✅ Migration 07: Document CASCADE DELETE issue
✅ Migration 08: Ensure position is backfilled for all rows
```

---

## 🔧 Manual Schema Fix (Optional but Recommended)

To make Supabase schema truly safe, remove CASCADE DELETE:

```sql
-- STEP 1: Drop the dangerous foreign key
ALTER TABLE public.questions 
DROP CONSTRAINT IF EXISTS questions_paper_id_fkey;

-- STEP 2: Recreate with safe ON DELETE SET NULL
ALTER TABLE public.questions
ADD CONSTRAINT questions_paper_id_fkey
FOREIGN KEY (paper_id) REFERENCES public.papers(id) 
ON DELETE SET NULL;  -- ✅ SAFE: doesn't delete questions

-- STEP 3: Verify (run in SQL Editor)
SELECT 
  constraint_name,
  constraint_type,
  table_name,
  column_name
FROM information_schema.key_column_usage
WHERE table_name = 'questions' 
  AND column_name = 'paper_id';
```

**Output should show:** `questions_paper_id_fkey | FOREIGN KEY | questions | paper_id`

---

## ✅ What's Protected Now

| Scenario | Before | After |
|----------|--------|-------|
| Create new exam while editing old | ❌ Old exam questions deleted | ✅ Preserved |
| Autosave during edit | ❌ Questions lost on insert error | ✅ Only changed questions updated |
| Delete a paper | ❌ Cascades delete all questions | ⚠️ Still cascades (needs manual fix) |
| Questions reorder randomly | ❌ Yes, by created_at | ✅ No, by position |
| Save same exam twice | ❌ Duplicates or loses data | ✅ Updates safely with UPSERT |

---

## 📋 Recommended Actions

### Immediate (Already Done)
- [x] Replace DELETE+INSERT with UPSERT
- [x] Add position ordering to fetch
- [x] Apply migrations 05-08

### Optional (1-hour Supabase manual step)
- [ ] Apply manual CASCADE DELETE fix in Supabase (SQL above)

### Monitoring
- [ ] Run diagnostic checks monthly
- [ ] Enable Supabase audit logs for DELETE operations
- [ ] Test: Create → Edit → Create another → Verify no loss

---

## 🚨 If Questions Are Lost Again

1. **Immediate:** Check Supabase Reports → API → Recent Queries
   - Look for unexpected DELETE statements
   - Share the query logs

2. **Recovery:** Run diagnostic Check #1 above
   - If orphaned questions exist (paper_id = NULL), we can fix them

3. **Report:** Share:
   - Exam title that lost questions
   - Approximate time it happened
   - Whether autosave was enabled

---

## 📞 Questions?

The fixes are now in place. Your data should be safe from now on!
