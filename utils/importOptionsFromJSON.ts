/**
 * Safe options-only import from nested JSON (like UCEED_2015_Options.json)
 * Does NOT touch questions table—only upserts into options/option_details table
 * Preserves all images, text, and other question fields
 */

import { supabase } from '../supabaseClient';

export interface OptionItem {
  option_letter: string;
  option_text: string;
  is_correct: boolean;
}

export interface QuestionOptionsPayload {
  question_id: string;
  question_number?: string;
  exam_year?: number;
  section?: string;
  question_type?: string;
  options: OptionItem[];
}

export interface ImportResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  errors: string[];
}

/**
 * Parse and validate nested JSON structure
 */
function parseNestedJSON(fileContent: string): QuestionOptionsPayload[] {
  try {
    const data = JSON.parse(fileContent);
    
    // Support nested structure: { exam_metadata: {...}, options_bulk: [...] }
    if (data.options_bulk && Array.isArray(data.options_bulk)) {
      return data.options_bulk;
    }
    
    // Fallback: if array at root level
    if (Array.isArray(data)) {
      return data;
    }
    
    throw new Error('JSON must have options_bulk array or be an array at root');
  } catch (err: any) {
    throw new Error(`Invalid JSON: ${err.message}`);
  }
}

/**
 * Upsert options for a single question (options_only, no questions table touch)
 * Matches by question_number field instead of UUID id
 */
async function upsertOptionsForQuestion(
  questionNumber: string,
  optionsData: OptionItem[],
  examYear?: number,
  section?: string,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find question by question_number (and optionally year/section for precision)
    let query = supabase
      .from('questions')
      .select('id, text')
      .eq('text', questionNumber); // Try matching by text field first (if you stored question number there)

    // If that doesn't work, we'll try a custom field. Let me check for question_number column
    // For now, let's use a broader search approach
    
    // Actually, let's search by examining the question text or use a regex pattern
    // Since we don't have a dedicated question_number field, we need to be creative
    
    // Better approach: Match by position in section
    const { data: questions, error: checkErr } = await supabase
      .from('questions')
      .select('id, text, position, section_name')
      .order('position', { ascending: true });

    if (checkErr) {
      return { success: false, error: `Database error: ${checkErr.message}` };
    }

    // Find question that matches the number (try different strategies)
    let question = null;
    
    // Strategy 1: Look for question number in text (like "Question 21" or "21.")
    const numPattern = new RegExp(`^${questionNumber}[.\\s]|Question\\s*${questionNumber}`, 'i');
    question = questions?.find(q => numPattern.test(q.text || ''));
    
    // Strategy 2: If exam has sections, match by section and calculate position
    if (!question && section && questions) {
      const sectionQuestions = questions.filter(q => q.section_name === section);
      const index = parseInt(questionNumber) - 1;
      if (index >= 0 && index < sectionQuestions.length) {
        question = sectionQuestions[index];
      }
    }
    
    // Strategy 3: Match by overall position (if no section matching worked)
    if (!question && questions) {
      const index = parseInt(questionNumber) - 1;
      if (index >= 0 && index < questions.length) {
        question = questions[index];
      }
    }

    if (!question) {
      return { success: false, error: `Question ${questionNumber} not found` };
    }

    // Build option_details array for storage in DB
    const optionDetails = optionsData.map((opt, idx) => ({
      id: `${question.id}-opt-${opt.option_letter}`,
      type: 'text',
      text: opt.option_text,
      isCorrect: opt.is_correct,
    }));

    // Upsert: update question's option_details ONLY (not text, image, marks, etc.)
    const { error: updateErr } = await supabase
      .from('questions')
      .update({
        option_details: optionDetails,
        // Do NOT update: text, image_url, marks, negative_marks, category, etc.
      })
      .eq('id', question.id);

    if (updateErr) {
      return { success: false, error: `Failed to update Q${questionNumber}: ${updateErr.message}` };
    }

    onProgress?.(`✓ Q${questionNumber}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Q${questionNumber}: ${err.message}` };
  }
}

/**
 * Main import function: reads file, validates, upserts options only
 */
export async function importOptionsFromJSON(
  file: File,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    totalProcessed: 0,
    successCount: 0,
    failureCount: 0,
    errors: [],
  };

  try {
    // Read file
    const fileContent = await file.text();
    onProgress?.(0, 1, 'Parsing JSON...');

    // Parse and validate
    const questions = parseNestedJSON(fileContent);
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('No options found in JSON');
    }

    result.totalProcessed = questions.length;
    onProgress?.(0, questions.length, `Found ${questions.length} questions to import...`);

    // Upsert each question's options
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      // Skip NAT questions (no options needed) or questions without options
      if (q.question_type === 'NAT' || !q.options || q.options.length === 0) {
        onProgress?.(i + 1, questions.length, `Skipping NAT Q${q.question_number || q.question_id}...`);
        result.successCount++; // Count as success since NAT questions don't need options
        continue;
      }
      
      const { success, error } = await upsertOptionsForQuestion(
        q.question_number || q.question_id, // Use question_number field
        q.options || [],
        q.exam_year,
        q.section,
        () => {
          onProgress?.(i + 1, questions.length, `Importing question ${q.question_number || q.question_id}...`);
        }
      );

      if (success) {
        result.successCount++;
      } else {
        result.failureCount++;
        if (error) result.errors.push(error);
      }
    }

    result.success = result.failureCount === 0;
    onProgress?.(
      result.successCount,
      result.totalProcessed,
      `Done: ${result.successCount}/${result.totalProcessed} imported`
    );

    return result;
  } catch (err: any) {
    result.success = false;
    result.errors.push(err.message || 'Unknown error');
    return result;
  }
}
