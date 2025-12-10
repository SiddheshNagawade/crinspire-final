import React from 'react';
import { QuestionType } from '../types';
import { ArrowLeft, CheckCircle, XCircle, MinusCircle, BarChart2, PieChart, Target } from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';

interface CategoryAnalysis {
  name: string;
  totalQuestions: number;
  correct: number;
  totalMarks: number;
  scoredMarks: number;
}

const ResultScreen: React.FC = () => {
  const navigate = useNavigate();
  const { sessionResponses, exams, selectedExamId } = useOutletContext<any>();
  
  const exam = exams.find((e: any) => e.id === selectedExamId);
  const responses = sessionResponses;

  if (!exam) {
      return (
          <div className="min-h-screen flex items-center justify-center flex-col">
              <p>No result data found.</p>
              <button onClick={() => navigate('/dashboard')} className="mt-4 text-blue-600 underline">Return Dashboard</button>
          </div>
      );
  }

  // --- Calculation Logic ---

  let totalMarks = 0;
  let maxMarks = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;

  const sectionResults = exam.sections.map((section: any) => {
    let secScore = 0;
    let secMax = 0;
    let secCorrect = 0;
    let secWrong = 0;
    let secSkipped = 0;

    section.questions.forEach((q: any) => {
      const userAns = responses[q.id];
      secMax += q.marks;

      let isCorrect = false;
      let isAttempted = userAns !== undefined && userAns !== '' && (Array.isArray(userAns) ? userAns.length > 0 : true);

      if (!isAttempted) {
        secSkipped++;
        return; 
      }

      if (q.type === QuestionType.NAT || q.type === QuestionType.MCQ) {
         if (String(userAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) {
           isCorrect = true;
         }
      } else if (q.type === QuestionType.MSQ) {
         const userArr = Array.isArray(userAns) ? userAns.sort() : [];
         const correctArr = Array.isArray(q.correctAnswer) ? [...q.correctAnswer].sort() : [];
         
         if (JSON.stringify(userArr) === JSON.stringify(correctArr)) {
             isCorrect = true;
         }
      }

      if (isCorrect) {
        secScore += q.marks;
        secCorrect++;
      } else {
        secScore -= q.negativeMarks; 
        secWrong++;
      }
    });

    totalMarks += secScore;
    maxMarks += secMax;
    correctCount += secCorrect;
    wrongCount += secWrong;
    skippedCount += secSkipped;

    return {
      ...section,
      score: secScore,
      maxScore: secMax,
      correct: secCorrect,
      wrong: secWrong,
      skipped: secSkipped
    };
  });

  const categoryMap: { [key: string]: CategoryAnalysis } = {};
  
  exam.sections.forEach((sec: any) => {
      sec.questions.forEach((q: any) => {
          const cat = q.category || 'Uncategorized';
          if (!categoryMap[cat]) {
              categoryMap[cat] = { name: cat, totalQuestions: 0, correct: 0, totalMarks: 0, scoredMarks: 0 };
          }
          const data = categoryMap[cat];
          data.totalQuestions++;
          data.totalMarks += q.marks;

          const userAns = responses[q.id];
          let isCorrect = false;
           if (q.type === QuestionType.NAT || q.type === QuestionType.MCQ) {
                if (String(userAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) isCorrect = true;
           } else if (q.type === QuestionType.MSQ) {
               const userArr = Array.isArray(userAns) ? userAns.sort() : [];
               const correctArr = Array.isArray(q.correctAnswer) ? [...q.correctAnswer].sort() : [];
               if (JSON.stringify(userArr) === JSON.stringify(correctArr)) isCorrect = true;
           }

           if (isCorrect) {
               data.correct++;
               data.scoredMarks += q.marks;
           } else if (userAns) {
               data.scoredMarks -= q.negativeMarks;
           }
      });
  });

  const categories = Object.values(categoryMap);

  return (
    <div className="min-h-screen bg-[#F3F4F6] p-8 font-sans text-[#111827]">
       <div className="max-w-6xl mx-auto space-y-8">
           {/* Header */}
           <div className="flex items-center justify-between">
               <h1 className="text-3xl font-bold text-[#1F2937]">Performance Analysis</h1>
               <button onClick={() => navigate('/dashboard')} className="bg-white border border-[#D1D5DB] px-6 py-2 rounded-lg text-[#1F2937] hover:bg-[#F9FAFB] flex items-center shadow-sm font-medium transition-colors">
                   <ArrowLeft size={18} className="mr-2"/> Back to Home
               </button>
           </div>

           {/* Top Stats Cards */}
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col items-center justify-center">
                    <span className="text-[#6B7280] text-sm uppercase font-bold tracking-wider mb-2">Total Score</span>
                    <div className="text-4xl font-extrabold text-[#1F2937]">{totalMarks.toFixed(2)} <span className="text-lg text-[#9CA3AF] font-medium">/ {maxMarks}</span></div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col items-center justify-center">
                     <span className="text-[#10B981] text-sm uppercase font-bold tracking-wider mb-2 flex items-center"><CheckCircle size={16} className="mr-1"/> Correct</span>
                     <div className="text-3xl font-bold text-[#111827]">{correctCount}</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col items-center justify-center">
                     <span className="text-[#EF4444] text-sm uppercase font-bold tracking-wider mb-2 flex items-center"><XCircle size={16} className="mr-1"/> Incorrect</span>
                     <div className="text-3xl font-bold text-[#111827]">{wrongCount}</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col items-center justify-center">
                     <span className="text-[#9CA3AF] text-sm uppercase font-bold tracking-wider mb-2 flex items-center"><MinusCircle size={16} className="mr-1"/> Skipped</span>
                     <div className="text-3xl font-bold text-[#111827]">{skippedCount}</div>
                </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* Section Breakdown */}
               <div className="lg:col-span-2 bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                   <div className="p-6 border-b border-[#E5E7EB] bg-[#F8F9FA]">
                       <h2 className="text-lg font-bold text-[#1F2937] flex items-center"><BarChart2 size={20} className="mr-2 text-[#3B82F6]"/> Section-wise Breakdown</h2>
                   </div>
                   <div className="p-6 overflow-x-auto">
                       <table className="w-full text-sm text-left">
                           <thead className="bg-[#F3F4F6] text-[#6B7280] uppercase font-bold text-xs">
                               <tr>
                                   <th className="px-4 py-3 rounded-l-lg">Section</th>
                                   <th className="px-4 py-3">Score</th>
                                   <th className="px-4 py-3">Accuracy</th>
                                   <th className="px-4 py-3 text-green-600">Correct</th>
                                   <th className="px-4 py-3 text-red-500">Wrong</th>
                                   <th className="px-4 py-3 rounded-r-lg text-gray-500">Skipped</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-[#E5E7EB]">
                               {sectionResults.map((sec: any) => {
                                   const attempts = sec.correct + sec.wrong;
                                   const accuracy = attempts > 0 ? Math.round((sec.correct / attempts) * 100) : 0;
                                   return (
                                       <tr key={sec.id} className="hover:bg-[#F9FAFB] transition-colors">
                                           <td className="px-4 py-4 font-bold text-[#1F2937]">{sec.name}</td>
                                           <td className="px-4 py-4 font-medium">{sec.score.toFixed(2)} / {sec.maxScore}</td>
                                           <td className="px-4 py-4">
                                               <div className="flex items-center">
                                                   <span className="w-12 text-right mr-2">{accuracy}%</span>
                                                   <div className="w-16 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                                                       <div className="h-full bg-[#3B82F6]" style={{ width: `${accuracy}%` }}></div>
                                                   </div>
                                               </div>
                                           </td>
                                           <td className="px-4 py-4 text-[#10B981] font-bold">{sec.correct}</td>
                                           <td className="px-4 py-4 text-[#EF4444] font-bold">{sec.wrong}</td>
                                           <td className="px-4 py-4 text-[#9CA3AF] font-bold">{sec.skipped}</td>
                                       </tr>
                                   );
                               })}
                           </tbody>
                       </table>
                   </div>
               </div>

               {/* Category Analytics */}
               <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col">
                   <div className="p-6 border-b border-[#E5E7EB] bg-[#F8F9FA]">
                       <h2 className="text-lg font-bold text-[#1F2937] flex items-center"><PieChart size={20} className="mr-2 text-[#8B5CF6]"/> Topic Analytics</h2>
                   </div>
                   <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar max-h-[500px]">
                       {categories.length > 0 ? categories.map((cat, idx) => {
                           const percentage = cat.totalMarks > 0 ? Math.round((cat.scoredMarks / cat.totalMarks) * 100) : 0;
                           let statusColor = "bg-[#D1D5DB]";
                           let statusText = "Neutral";
                           
                           if (percentage >= 70) { statusColor = "bg-[#10B981]"; statusText = "Strong"; }
                           else if (percentage >= 40) { statusColor = "bg-[#FCD34D]"; statusText = "Average"; }
                           else { statusColor = "bg-[#EF4444]"; statusText = "Needs Improvement"; }

                           return (
                               <div key={idx} className="space-y-2">
                                   <div className="flex justify-between items-end">
                                       <div>
                                            <div className="text-sm font-bold text-[#1F2937]">{cat.name}</div>
                                            <div className="text-xs text-[#6B7280]">{cat.correct}/{cat.totalQuestions} Questions Correct</div>
                                       </div>
                                       <div className="text-right">
                                            <div className={`text-xs font-bold px-2 py-0.5 rounded text-white mb-1 inline-block ${statusColor}`}>{statusText}</div>
                                            <div className="text-sm font-bold text-[#111827]">{cat.scoredMarks.toFixed(1)} <span className="text-[#9CA3AF] font-normal">/ {cat.totalMarks}</span></div>
                                       </div>
                                   </div>
                                   <div className="h-2.5 w-full bg-[#F3F4F6] rounded-full overflow-hidden border border-[#E5E7EB]">
                                       <div className={`h-full ${statusColor}`} style={{ width: `${Math.max(0, percentage)}%` }}></div>
                                   </div>
                               </div>
                           );
                       }) : (
                           <div className="text-center text-[#9CA3AF] py-8">No category data available for this exam.</div>
                       )}
                   </div>
               </div>
           </div>

           {/* Insights / Tips */}
           <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-6 flex items-start gap-4">
               <div className="bg-[#3B82F6] text-white p-2 rounded-lg mt-1"><Target size={24}/></div>
               <div>
                   <h3 className="text-[#1E40AF] font-bold text-lg mb-2">Detailed Insights</h3>
                   <ul className="list-disc pl-5 text-[#1E3A8A] space-y-1 text-sm">
                       <li>You attempted <strong>{correctCount + wrongCount}</strong> out of <strong>{exam.sections.reduce((acc: any, s: any)=>acc+s.questions.length,0)}</strong> questions.</li>
                       <li>Your accuracy rate is <strong>{wrongCount + correctCount > 0 ? Math.round((correctCount / (correctCount+wrongCount))*100) : 0}%</strong>. Focus on reducing negative marks in the MCQ section.</li>
                       {categories.some(c => (c.scoredMarks/c.totalMarks) < 0.4) && (
                           <li>Review topics tagged as <strong>Needs Improvement</strong>. Practice more questions in these categories to boost your score.</li>
                       )}
                   </ul>
               </div>
           </div>
       </div>
    </div>
  );
};

export default ResultScreen;