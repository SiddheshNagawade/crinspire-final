import { supabase } from '../supabaseClient';
import { ExamPaper } from '../types';

export interface ExamSummary {
  id: string;
  title: string;
  year: number;
  examType: string;
  durationMinutes: number;
  isPremium?: boolean;
  // Optional fields if present in DB; kept flexible
  description?: string;
  tags?: string[];
  status?: string;
  totalQuestions?: number; // optionally set when known
}

export const examsSummaryKey = ['examsSummary'] as const;
export const examDetailKey = (examId: string) => ['examDetail', examId] as const;

/**
 * Lightweight list of exams (papers) without sections/questions.
 */
export async function getExamsSummary(): Promise<ExamSummary[]> {
  // Select only known-safe columns to avoid errors on missing fields
  const { data, error } = await supabase
    .from('papers')
    .select('id,title,year,exam_type,duration_minutes,is_premium')
    .order('year', { ascending: false });
  if (error) throw error;
  return (data || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    year: p.year,
    examType: p.exam_type,
    durationMinutes: p.duration_minutes || 120,
    isPremium: !!p.is_premium,
    // optional: derive fields later if needed
  }));
}

/**
 * Full exam payload: sections + ordered questions with optionDetails.
 */
export async function getExamDetail(examId: string): Promise<ExamPaper> {
  // Fetch paper info
  const { data: paper, error: paperErr } = await supabase
    .from('papers')
    .select('*')
    .eq('id', examId)
    .maybeSingle();
  if (paperErr) throw paperErr;
  if (!paper) throw new Error('Paper not found');

  // Fetch explicit sections ordering if available
  const { data: sectionsData, error: sectionsError } = await supabase
    .from('sections')
    .select('*')
    .eq('paper_id', examId)
    .order('position', { ascending: true });

  const hasSectionsTable = !sectionsError && Array.isArray(sectionsData);

  // Fetch questions with deterministic ordering
  let questions: any[] | null = null;
  const { data: questionsByPosition, error: questionsByPositionError } = await supabase
    .from('questions')
    .select('*')
    .eq('paper_id', examId)
    .order('section_name', { ascending: true })
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (questionsByPositionError) {
    const msg = (questionsByPositionError as any)?.message || '';
    if (typeof msg === 'string' && msg.toLowerCase().includes('position') && msg.toLowerCase().includes('does not exist')) {
      const { data: questionsByCreatedAt, error: questionsByCreatedAtError } = await supabase
        .from('questions')
        .select('*')
        .eq('paper_id', examId)
        .order('section_name', { ascending: true })
        .order('created_at', { ascending: true });
      if (questionsByCreatedAtError) throw questionsByCreatedAtError;
      questions = questionsByCreatedAt || [];
    } else {
      throw questionsByPositionError;
    }
  } else {
    questions = questionsByPosition || [];
  }

  // Group questions by section
  const questionsBySection: { [sectionName: string]: any[] } = {};
  (questions || []).forEach((q: any) => {
    const secName = q.section_name || 'General';
    if (!questionsBySection[secName]) questionsBySection[secName] = [];
    questionsBySection[secName].push({
      id: q.id,
      text: q.text,
      imageUrl: q.image_url,
      type: q.type,
      options: q.options,
      optionDetails: q.option_details,
      correctAnswer: q.correct_answer,
      marks: q.marks,
      negativeMarks: q.negative_marks,
      category: q.category,
      position: q.position || 0,
    });
  });
  Object.keys(questionsBySection).forEach((secName) => {
    questionsBySection[secName].sort((a, b) => (a.position || 0) - (b.position || 0));
  });

  // Build sections from table or derive
  let sectionsArray: any[] = [];
  if (hasSectionsTable && (sectionsData || []).length > 0) {
    sectionsArray = (sectionsData || []).map((sec: any) => ({
      id: sec.id,
      name: sec.name,
      questions: questionsBySection[sec.name] || [],
    }));
  } else {
    const sectionNames = Object.keys(questionsBySection).sort();
    sectionsArray = sectionNames.map((secName, idx) => ({
      id: `sec-${examId}-${idx}`,
      name: secName,
      questions: questionsBySection[secName],
    }));
  }

  return {
    id: paper.id,
    title: paper.title,
    year: paper.year,
    examType: paper.exam_type,
    durationMinutes: paper.duration_minutes || 120,
    isPremium: !!paper.is_premium,
    sections: sectionsArray,
  };
}
