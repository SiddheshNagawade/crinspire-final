-- Migration: add rich optionDetails to questions and backfill
-- Run this in Supabase SQL Editor.

-- 1) Add new column for enhanced options (text/image/isCorrect)
alter table public.questions
  add column if not exists option_details jsonb;

-- 2) Backfill from legacy plain-text options -> option_details
--    Each legacy option becomes an object { id, type: 'text', text, isCorrect }
--    Derive isCorrect from correct_answer when it's a string (MCQ) or array (MSQ)
with q as (
  select id,
         options,
         correct_answer
  from public.questions
)
update public.questions p
set option_details = (
  select jsonb_agg(
    jsonb_build_object(
      'id', concat(p.id::text, '-opt-', i),
      'type', 'text',
      'text', opt,
      'isCorrect', (
        case
          when jsonb_typeof(p.correct_answer) = 'string' then
            -- MCQ/NAT: string like 'A' means index 0 is 'A', etc.
            upper(p.correct_answer::text)::text like concat('"', chr(65+i), '"')
          when jsonb_typeof(p.correct_answer) = 'array' then
            -- MSQ: array of labels e.g. ['A','C']
            (p.correct_answer ?| array[ (chr(65+i)) ])
          else false
        end
      )
    )
  )
  from (
    select p2.id,
           coalesce(p2.options, '[]'::jsonb) as options
    from public.questions p2
    where p2.id = p.id
  ) src,
  lateral (
    select i, (src.options ->> i) as opt
    from generate_series(0, jsonb_array_length(src.options) - 1) as i
  ) opts
)
where p.option_details is null and p.options is not null and jsonb_array_length(p.options) > 0;

-- 3) Optional: Keep legacy columns for compatibility, but you may null them going forward
-- update public.questions set options = null where option_details is not null;

-- 4) Add simple check constraints (optional): ensure option_details is array when provided
alter table public.questions
  add constraint if not exists questions_option_details_is_array
  check (option_details is null or jsonb_typeof(option_details) = 'array');

-- 5) Index for option_details existence to speed up filtering
create index if not exists idx_questions_option_details on public.questions ((option_details is not null));

-- 6) Notes:
-- - Store images in Storage bucket (e.g., exam-images) and save image URLs in option_details objects using key 'imageData' or 'image_url'.
-- - If you plan to store base64 in DB temporarily, it's already supported as text inside the JSON object.
-- - Admin/editor should write to option_details; student UI should prefer option_details when present, fallback to legacy options.
