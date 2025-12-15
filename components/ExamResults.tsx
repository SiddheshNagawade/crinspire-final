import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

interface ExamSubmission {
  id: string;
  exam_id: string;
  total_marks: number;
  total_questions: number;
  passed: boolean;
  submitted_at: string;
  student_answers: StudentAnswer[];
}

interface StudentAnswer {
  is_correct: boolean;
  attempted?: boolean;
  marks_earned: number;
  max_marks?: number;
}

const ExamResults: React.FC = () => {
  const navigate = useNavigate();
  const { submissionId } = useParams<{ submissionId: string }>();
  const [submission, setSubmission] = useState<ExamSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSubmission = async () => {
      if (!submissionId) return;
      try {
        const { data, error: fetchError } = await supabase
          .from('exam_submissions')
          .select('*')
          .eq('id', submissionId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Submission not found');
        setSubmission(data as ExamSubmission);
        sessionStorage.setItem(`exam_review_${submissionId}`, JSON.stringify(data));
      } catch (err: any) {
        setError(err.message || 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };
    fetchSubmission();
  }, [submissionId]);

  const stats = useMemo(() => {
    if (!submission) return null;
    const answers = submission.student_answers || [];
    const correctCount = answers.filter((a) => a.is_correct).length;
    const attemptedCount = answers.filter((a) => a.attempted).length;
    const incorrectCount = Math.max(0, attemptedCount - correctCount);
    const skippedCount = Math.max(0, submission.total_questions - attemptedCount);
    const totalMax = answers.reduce((sum, a) => sum + (a.max_marks || 0), 0);
    const accuracy = submission.total_questions > 0
      ? Math.round((correctCount / submission.total_questions) * 100)
      : 0;
    return { correctCount, incorrectCount, skippedCount, totalMax, accuracy };
  }, [submission]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg max-w-md">
          <p className="font-semibold">Error loading results</p>
          <p className="text-sm">{error || 'Submission not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Exam Submitted Successfully! ✅</h1>
          <p className="text-gray-600">Submitted on {new Date(submission.submitted_at).toLocaleString()}</p>
        </div>

        <div className={`rounded-2xl shadow-2xl p-12 mb-8 text-center text-white ${submission.passed ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-red-400 to-red-600'}`}>
          <div className="text-6xl font-bold mb-2">{submission.total_marks.toFixed(2)}</div>
          <div className="text-2xl opacity-90 mb-4">out of {(stats?.totalMax || submission.total_questions).toFixed(2)} marks</div>
          <div className="text-4xl font-semibold">{stats?.accuracy}% accuracy</div>
          <div className="mt-4 text-lg">{submission.passed ? 'PASSED 🎉' : 'NOT PASSED'}</div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-green-600">{stats?.correctCount}</div>
            <div className="text-gray-600 text-sm mt-2">Correct</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-red-600">{stats?.incorrectCount}</div>
            <div className="text-gray-600 text-sm mt-2">Incorrect</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{stats?.skippedCount}</div>
            <div className="text-gray-600 text-sm mt-2">Skipped</div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => navigate(`/exam-review/${submission.id}`)}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition"
          >
            📖 View Solutions & Review
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold transition"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="mt-8 bg-blue-100 border border-blue-400 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">📌 Note:</p>
          <p>Your detailed solutions are stored in this browser session. Closing or refreshing will clear them.</p>
        </div>
      </div>
    </div>
  );
};

export default ExamResults;
