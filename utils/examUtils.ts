import { supabase } from '../supabaseClient';

/**
 * Mark an exam as completed by the current user
 */
export const markExamAsCompleted = async (examId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('completed_exams')
      .upsert({
        user_id: user.id,
        exam_id: examId,
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,exam_id'
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error marking exam as completed:', error);
    return { success: false, error };
  }
};

/**
 * Fetch all completed exam IDs for the current user
 */
export const fetchCompletedExams = async (): Promise<Set<string>> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Set();
    }

    const { data, error } = await supabase
      .from('completed_exams')
      .select('exam_id')
      .eq('user_id', user.id);

    if (error) throw error;
    
    return new Set(data?.map(row => row.exam_id) || []);
  } catch (error) {
    console.error('Error fetching completed exams:', error);
    return new Set();
  }
};

/**
 * Check if a specific exam is completed by the current user
 */
export const isExamCompleted = async (examId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    const { data, error } = await supabase
      .from('completed_exams')
      .select('id')
      .eq('user_id', user.id)
      .eq('exam_id', examId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
    
    return !!data;
  } catch (error) {
    console.error('Error checking exam completion:', error);
    return false;
  }
};
