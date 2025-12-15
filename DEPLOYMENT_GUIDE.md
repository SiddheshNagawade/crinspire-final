# Rich Option Details - Deployment Guide

## What Changed

Your admin panel now supports **text AND image options** for MSQ/MCQ questions. This guide walks you through deploying the changes.

---

## Step 1: Update Supabase Database Schema

**Run this SQL in your Supabase SQL Editor:**

1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy and paste the contents of `supabase/alter_option_details.sql`
4. Click "Run"

This will:
- Add `option_details` column to `public.questions` table
- Backfill existing questions from legacy `options` format
- Add constraints and indexes

---

## Step 2: Verify Storage Bucket

Make sure your Supabase Storage has an `exam-images` bucket:

1. Go to Supabase Dashboard → Storage
2. If `exam-images` doesn't exist, create it:
   - Click "Create new bucket"
   - Name: `exam-images`
   - Visibility: **Public**
   - Click Create

---

## Step 3: Deploy Your Code

Your code changes are already complete:

✅ **AdminPanel.tsx** - Creates rich options with text/images  
✅ **StudentExamInterface.tsx** - Displays options with images  
✅ **App.tsx** - Saves/loads `optionDetails` to/from Supabase  

Just push your code:

```bash
git add .
git commit -m "Add rich option details support (text + images)"
git push origin main
```

---

## How It Works

### Admin Creates Question:
1. Admin selects MSQ or MCQ question type
2. For each option, they can:
   - Enter text
   - Upload an image
   - Mark as correct
3. On save:
   - Images uploaded to Supabase Storage
   - Option details saved to `option_details` JSONB column

### Student Takes Exam:
1. Questions load from `public.questions`
2. If `option_details` exists → show rich options
3. If not → fallback to legacy `options` array
4. Options display as either text or image
5. Student selects using labels (A, B, C, D...)

---

## Data Structure

### In Database (`option_details` column):
```json
[
  {
    "id": "opt-123",
    "type": "text",
    "text": "First option",
    "isCorrect": true
  },
  {
    "id": "opt-456", 
    "type": "image",
    "imageData": "https://storage.supabase.co/.../image.png",
    "altText": "Diagram showing...",
    "isCorrect": false
  }
]
```

### In Code (`Question.optionDetails`):
```typescript
optionDetails?: QuestionOption[];

interface QuestionOption {
  id: string;
  type: 'text' | 'image';
  text?: string;
  imageData?: string;
  altText?: string;
  isCorrect: boolean;
}
```

---

## Testing Checklist

After deployment:

- [ ] Run the SQL migration in Supabase
- [ ] Login as instructor
- [ ] Create a new MSQ question
- [ ] Add 4 options:
  - Option A: text only
  - Option B: image only
  - Option C: text + image
  - Option D: text only
- [ ] Mark A and C as correct
- [ ] Save the exam
- [ ] Login as student
- [ ] Start the exam
- [ ] Verify options display correctly
- [ ] Select some options
- [ ] Submit and check results

---

## Backward Compatibility

Old questions without `option_details`:
- ✅ Will continue to work
- ✅ Use legacy `options` array (comma-separated text)
- ✅ Display as plain text options

New questions with `option_details`:
- ✅ Support text, images, or both
- ✅ Store rich metadata (alt text, correctness)
- ✅ Display beautifully in student UI

---

## Troubleshooting

### Images not uploading?
- Check Supabase Storage → `exam-images` bucket exists and is public
- Check browser console for errors

### Options not appearing for students?
- Verify `option_details` column exists in database
- Check browser console for data structure

### Old exams broken?
- The system falls back to legacy `options` array
- Run the SQL migration to backfill `option_details`

---

## Need Help?

Check:
1. Browser console (F12 → Console tab)
2. Supabase logs (Dashboard → Logs)
3. Network tab (F12 → Network) for API errors

---

**That's it! Your exam system now supports rich options with images. 🎉**
