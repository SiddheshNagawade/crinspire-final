import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { QuestionType } from '../types';

interface StudentAnswer {
  question_id: string;
  selected_option_ids?: string[];
  selected_value?: string;
  correct_value?: string;
  marks_earned: number;
  is_correct: boolean;
  correct_option_ids?: string[];
  question_type: QuestionType | string;
}

interface DbQuestion {
  id: string;
  text: string;
  image_url?: string;
  type: QuestionType | string;
  options?: string[];
  option_details?: any[];
  correct_answer?: string | string[];
  marks: number;
  negative_marks: number;
}

const ExamReview: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState<DbQuestion[]>([]);
  const [studentAnswers, setStudentAnswers] = useState<StudentAnswer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!submissionId) return;
      try {
        let submission: any = null;
        const cached = sessionStorage.getItem(`exam_review_${submissionId}`);
        if (cached) {
          submission = JSON.parse(cached);
        } else {
          const { data, error: fetchError } = await supabase
            .from('exam_submissions')
            .select('*')
            .eq('id', submissionId)
            .single();
          if (fetchError) throw fetchError;
          submission = data;
          sessionStorage.setItem(`exam_review_${submissionId}`, JSON.stringify(data));
        }

        setStudentAnswers(submission.student_answers || []);
        const qIds = (submission.student_answers || []).map((s: any) => s.question_id);
        const { data: qData, error: qErr } = await supabase
          .from('questions')
          .select('*')
          .in('id', qIds);
        if (qErr) throw qErr;
        
        // Sort questions to match the order of student_answers
        const orderedQuestions = qIds.map((qId: string) => 
          qData?.find((q: any) => q.id === qId)
        ).filter(Boolean);
        
        setQuestions(orderedQuestions || []);
      } catch (e: any) {
        setError(e.message || 'Failed to load review');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [submissionId]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = studentAnswers[currentQuestionIndex];

  // Helper function to convert option IDs to labels (A, B, C, etc.)
  const getOptionLabelsFromIds = (optionIds: string[] | undefined): string => {
    if (!optionIds || optionIds.length === 0 || !currentQuestion) return '';
    
    const rich = currentQuestion.option_details || [];
    const labels: string[] = [];
    
    if (rich.length > 0) {
      // For questions with option_details, map IDs to labels
      optionIds.forEach(selectedId => {
        rich.forEach((opt: any, idx: number) => {
          const label = String.fromCharCode(65 + idx);
          const optId = opt.id || label;
          if (optId === selectedId) {
            labels.push(label);
          }
        });
      });
    } else {
      // For legacy questions, IDs are already labels (A, B, C)
      return optionIds.join(', ');
    }
    
    return labels.length > 0 ? labels.join(', ') : optionIds.join(', ');
  };

  const optionItems = useMemo(() => {
    if (!currentQuestion) return [] as any[];
    const rich = currentQuestion.option_details || [];
    if (rich.length > 0) {
      return rich.map((opt: any, idx: number) => {
        const label = String.fromCharCode(65 + idx);
        // Use opt.id if it exists, otherwise fall back to label (A, B, C, etc.)
        const optionId = opt.id || label;
        return {
          id: optionId,
          label: label,
          text: opt.text || '',
          image: opt.imageData || opt.image_url || opt.image || null,
          alt: opt.altText || 'Option',
          isCorrect: !!opt.isCorrect,
        };
      });
    }
    const legacy = currentQuestion.options || [];
    return legacy.map((text: string, idx: number) => ({
      id: String.fromCharCode(65 + idx),
      label: String.fromCharCode(65 + idx),
      text,
      image: null,
      alt: 'Option',
      isCorrect: Array.isArray(currentQuestion.correct_answer)
        ? (currentQuestion.correct_answer as string[]).includes(String.fromCharCode(65 + idx))
        : (currentQuestion.correct_answer as string | undefined) === String.fromCharCode(65 + idx),
    }));
  }, [currentQuestion]);

  const statusForOption = (optionId: string) => {
    if (!currentAnswer) return 'neutral';
    const selected = currentAnswer.selected_option_ids || [];
    const correct = currentAnswer.correct_option_ids || [];
    
    const isSelected = selected.includes(optionId);
    const isCorrect = correct.includes(optionId);
    
    if (isSelected && isCorrect) return 'correct_selected';
    if (isSelected && !isCorrect) return 'wrong_selected';
    if (!isSelected && isCorrect) return 'correct_not_selected';
    return 'neutral';
  };

  const optionStyle = (status: string) => {
    switch (status) {
      case 'correct_selected':
        return 'bg-green-50 border-3 border-green-600 shadow-md';
      case 'wrong_selected':
        return 'bg-red-50 border-3 border-red-600 shadow-md';
      case 'correct_not_selected':
        return 'bg-yellow-50 border-3 border-yellow-500 shadow-md';
      default:
        return 'bg-white border-2 border-gray-300';
    }
  };

  const optionLabel = (status: string) => {
    switch (status) {
      case 'correct_selected':
        return { text: 'Your answer (Correct)', color: 'text-green-700' };
      case 'wrong_selected':
        return { text: 'Your answer (Wrong)', color: 'text-red-700' };
      case 'correct_not_selected':
        return { text: 'Correct answer', color: 'text-yellow-700' };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !currentQuestion || !currentAnswer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-6 py-4 rounded-lg max-w-md text-center">
          <p className="font-semibold text-lg mb-2">Review unavailable</p>
          <p className="text-sm mb-4">{error || 'No review data found for this submission.'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isNat = (currentAnswer.question_type === QuestionType.NAT || currentQuestion.type === QuestionType.NAT);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Solution Review</h1>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            ← Back to Results
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <span className="text-lg font-semibold">Question {currentQuestionIndex + 1} of {questions.length}</span>
          </div>
          
          {/* Show what student marked */}
          {!isNat && currentAnswer.selected_option_ids && currentAnswer.selected_option_ids.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded text-sm border border-blue-200">
              <strong className="text-blue-900">You Marked:</strong> <span className="text-blue-700 font-semibold">{getOptionLabelsFromIds(currentAnswer.selected_option_ids)}</span>
            </div>
          )}
          {!isNat && (!currentAnswer.selected_option_ids || currentAnswer.selected_option_ids.length === 0) && (
            <div className="mb-4 p-3 bg-gray-50 rounded text-sm border border-gray-200">
              <strong className="text-gray-700">You Marked:</strong> <span className="text-gray-500 italic">Not attempted</span>
            </div>
          )}
          
          <div className="w-full bg-gray-300 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900" style={{ whiteSpace: 'pre-wrap' }}>
            {currentQuestion.text}
          </h2>
          {currentQuestion.image_url && (
            <img src={currentQuestion.image_url} alt="Question" loading="lazy" className="max-w-full max-h-[320px] object-contain mb-4" />
          )}

          {isNat ? (
            <div className="mt-4 space-y-2">
              <div className={`p-4 rounded border ${currentAnswer.is_correct ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                <div className="text-sm text-gray-600 font-semibold">Your Answer</div>
                <div className="text-xl font-bold text-gray-900">{currentAnswer.selected_value || 'No answer'}</div>
              </div>
              <div className="p-4 rounded border border-blue-500 bg-blue-50">
                <div className="text-sm text-gray-600 font-semibold">Correct Answer</div>
                <div className="text-xl font-bold text-gray-900">{currentAnswer.correct_value || 'N/A'}</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {optionItems.map((opt) => {
                const status = statusForOption(opt.id);
                const label = optionLabel(status);
                return (
                  <div key={opt.id} className={`p-4 rounded-lg ${optionStyle(status)} transition relative`}>
                    {label && (
                      <div className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded ${label.color} bg-white/80 shadow-sm`}>
                        {label.text}
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="font-bold text-gray-900 text-lg min-w-[32px]">{opt.label}.</div>
                      <div className="flex-1 space-y-2">
                        {opt.text && <p className="font-semibold text-gray-900 pr-24">{opt.text}</p>}
                        {opt.image && (
                          <img src={opt.image} alt={opt.alt} loading="lazy" className="max-h-[151px] max-w-[188px] object-contain rounded bg-white border border-gray-200" />
                        )}
                      </div>
                      <span className="text-3xl whitespace-nowrap flex items-center gap-1 ml-2">
                        {status === 'correct_selected' && (
                          <>
                            <span className="text-green-600">✓</span>
                            <span className="text-green-600">✓</span>
                          </>
                        )}
                        {status === 'wrong_selected' && <span className="text-red-600 font-bold">✖</span>}
                        {status === 'correct_not_selected' && <span className="text-yellow-600 font-bold">✓</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-4 justify-between">
          <button
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-3 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            ← Previous
          </button>

          <div className="flex gap-2 justify-center flex-wrap max-w-2xl">
            {questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`w-10 h-10 rounded-full font-semibold transition ${
                  idx === currentQuestionIndex
                    ? 'bg-blue-600 text-white'
                    : studentAnswers[idx]?.is_correct
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                }`}
                title={`Q${idx + 1}: ${studentAnswers[idx]?.is_correct ? 'Correct' : 'Wrong'}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
            disabled={currentQuestionIndex === questions.length - 1}
            className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            Next →
          </button>
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>📌 This review is stored in this browser session. Closing or refreshing clears it.</p>
        </div>
      </div>
    </div>
  );
};

export default ExamReview;
