# Section Rename & Delete Fix

## Problem
When renaming or deleting sections:
- **Renaming**: Old section names remained in the database, and new names created empty duplicate sections
- **Deleting**: Deleted sections stayed in the database after reload
- **Deleting with questions**: Questions from deleted sections also remained

## Root Cause Analysis

### Renaming Issue
The code used `upsert` with `onConflict: 'paper_id,name'`. This means:
- When you renamed "NAT" → "NAT1", the system treated "NAT1" as a **new section** (because no record with that name existed)
- The old "NAT" record remained untouched
- Result: Both "NAT" (empty) and "NAT1" (with questions) existed in the database

### Deletion Issue
The save logic only **upserved** sections (insert/update), but never **deleted** them:
- Deleted sections from the UI were never removed from the database
- When the page reloaded, the deleted sections reappeared

### Questions in Deleted Sections
When a section was deleted, its questions lingered:
- They weren't associated with any visible section
- They cluttered the database

---

## Solution

### 1. Fetch Existing Sections Before Save
```tsx
const { data: existingSections } = await supabase
    .from('sections')
    .select('*')
    .eq('paper_id', paperId);
```

### 2. Find & Delete Removed Sections
```tsx
const newSectionNames = new Set(savedExam.sections.map(s => s.name));

const sectionsToDelete = existingSections
    .filter(s => !newSectionNames.has(s.name))
    .map(s => s.id);

if (sectionsToDelete.length > 0) {
    await supabase
        .from('sections')
        .delete()
        .in('id', sectionsToDelete);
}
```

### 3. Track & Delete Questions from Deleted Sections
```tsx
const activeSectionNames = new Set(savedExam.sections.map(s => s.name));

const questionsFromDeletedSections = existingQuestions
    .filter(q => !activeSectionNames.has(q.section_name))
    .map(q => q.id);

// Later, when deleting questions:
const allQuestionsToDelete = [...new Set([
    ...toDelete,  // Normal deletions
    ...questionsFromDeletedSections  // From deleted sections
])];
```

### 4. Upsert Remaining Sections
With old sections deleted, upserting current sections works correctly:
- Renamed sections have their old names deleted first, so they're inserted fresh ✓
- Existing sections still get updated properly ✓

---

## Changes Made

**File**: [App.tsx](App.tsx)

### Change 1: Delete Removed Sections Before Upsert
**Location**: Lines 423-460
- Fetch existing sections for the paper
- Identify sections that no longer exist in the UI
- Delete those sections from the database
- Then proceed with upsert of current sections

### Change 2: Track Questions from Deleted Sections
**Location**: Lines 494-495
- Build a set of active section names
- Find all questions belonging to deleted sections

### Change 3: Delete Questions from Deleted Sections
**Location**: Lines 658-669
- Combine questions marked for deletion with questions from deleted sections
- Delete all of them in one operation
- Log the breakdown for debugging

---

## Behavior Changes

### Before Fix ❌
```
✏️ Rename "NAT" → "NAT1":
   Database before: [NAT, MSQ, MCQ]
   Database after: [NAT, NAT1, MSQ, MCQ]  ← Old "NAT" stays!
   
🗑️ Delete "MCQ":
   Database before: [NAT, MSQ, MCQ]
   Database after: [NAT, MSQ, MCQ]  ← "MCQ" stays!
   After reload: "MCQ" reappears
```

### After Fix ✅
```
✏️ Rename "NAT" → "NAT1":
   Database before: [NAT, MSQ, MCQ]
   Step 1: Delete old "NAT"
   Step 2: Upsert [NAT1, MSQ, MCQ]
   Database after: [NAT1, MSQ, MCQ]  ✓ Clean rename
   
🗑️ Delete "MCQ":
   Database before: [NAT, MSQ, MCQ]
   Step 1: Delete "MCQ" section
   Step 2: Delete all questions with section_name="MCQ"
   Step 3: Upsert [NAT, MSQ]
   Database after: [NAT, MSQ]  ✓ Clean deletion
   After reload: "MCQ" is gone for good
```

---

## Testing

### Test 1: Section Rename
1. Create exam with sections: NAT, MSQ, MCQ
2. Rename "NAT" → "NAT-Numeric"
3. Save
4. Check console: Should see `🗑️ Deleting removed sections: [old-NAT-id]`
5. Reload page
6. Verify: Only "NAT-Numeric" exists, no "NAT" ✓

### Test 2: Section Delete
1. Create exam with sections: NAT, MSQ, MCQ
2. Delete "MCQ" section
3. Save
4. Check console: Should see `🗑️ Deleting removed sections: [MCQ-id]`
5. Check console: Should see questions from deleted sections count
6. Reload page
7. Verify: Only NAT and MSQ exist ✓

### Test 3: Rename + Delete
1. Create exam: [NAT, MSQ, MCQ]
2. Rename NAT → "NAT-Full", Delete MSQ
3. Save
4. Console should show:
   - Deleting 2 sections (old "NAT" and "MSQ")
   - Deleting questions from "MSQ"
5. Reload
6. Verify: Only ["NAT-Full", "MCQ"] exist ✓

---

## Technical Details

### Database Queries
1. **Fetch existing sections**: `SELECT * FROM sections WHERE paper_id = ?`
2. **Delete sections**: `DELETE FROM sections WHERE id IN (...)`
3. **Fetch existing questions**: `SELECT * FROM questions WHERE paper_id = ?`
4. **Delete questions**: `DELETE FROM questions WHERE id IN (...)`
5. **Upsert sections**: `UPSERT sections ON CONFLICT(paper_id, name) DO UPDATE`

### Performance Impact
- ✅ Minimal: Added only 1 extra SELECT query per save
- ✅ Efficient: Uses bulk deletes, not individual row deletes
- ✅ Safe: Checks if sections table exists before operations

### Backward Compatibility
- ✅ Still handles sections table not existing (graceful degradation)
- ✅ All existing exam data remains intact
- ✅ No schema changes needed

---

## Summary

**Problem**: Renamed and deleted sections were persisting in the database  
**Solution**: Delete old/removed sections before upserting new ones  
**Result**: Clean section management with proper cleanup  
**Status**: ✅ **FIXED** - Ready to deploy

---

## If Issues Persist

If sections still appear after deletion:
1. Check browser DevTools Console for error logs
2. Check if the `sections` table exists in Supabase
3. Verify cascade delete is working: `DELETE FROM sections WHERE id = ?`
4. Clear browser cache: `localStorage.clear()`
5. Check Supabase database directly for orphaned records

If you see duplicate sections on reload:
1. Check the console output during save
2. Look for "💾 Saving sections" log
3. Verify the section names in the upsert payload
4. The fix fetches sections and deletes them first—ensure no errors occur
