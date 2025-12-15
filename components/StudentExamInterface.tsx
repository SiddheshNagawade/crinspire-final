import React, { useState, useEffect, useRef } from 'react';
import { User, Info, ChevronLeft, ChevronRight, AlertTriangle, Lock, Loader2, X } from 'lucide-react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import { ExamPaper, QuestionStatus, QuestionType, UserResponse, UserQuestionStatus } from '../types';
import { useBlockNavigation } from '../utils/useBlockNavigation';

const StudentExamInterface: React.FC = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { exams, handleExamSubmit } = useOutletContext<any>();
  const exam = exams.find((e: ExamPaper) => e.id === examId);

  // --- State ---
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<UserResponse>({});
  const [status, setStatus] = useState<UserQuestionStatus>({});
  const [timeLeft, setTimeLeft] = useState(exam?.durationMinutes ? exam.durationMinutes * 60 : 7200);
  const [showPalette, setShowPalette] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittedRef = useRef(false);
  
  // Modal States
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Safety Checks
  const hasSections = exam?.sections && exam.sections.length > 0;
  const currentSection = hasSections ? exam.sections[currentSectionIndex] : null;
  const hasQuestions = currentSection?.questions && currentSection.questions.length > 0;
  const currentQuestion = hasQuestions ? currentSection.questions[currentQuestionIndex] : null;
  
  // Initialization
  useEffect(() => {
    if (!exam || !exam.sections) return;

    // Initialize all questions as not visited
    const initialStatus: UserQuestionStatus = {};
    exam.sections.forEach(sec => {
      sec.questions.forEach(q => {
        initialStatus[q.id] = QuestionStatus.NOT_VISITED;
      });
    });
    setStatus(initialStatus);
    
    // Reset timer when exam loads
    setTimeLeft(exam.durationMinutes ? exam.durationMinutes * 60 : 7200);
  }, [exam]);

  // Update status when visiting a question
  useEffect(() => {
    if (!currentQuestion) return;

    setStatus(prev => {
      const currentStatus = prev[currentQuestion.id];
      if (currentStatus === QuestionStatus.NOT_VISITED) {
        return { ...prev, [currentQuestion.id]: QuestionStatus.NOT_ANSWERED };
      }
      return prev;
    });
  }, [currentQuestion?.id]);

  // Timer
    useEffect(() => {
        if (!hasQuestions) return; 

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 0) {
                    clearInterval(timer);
                    // ensure submit only once
                    if (!submittedRef.current) {
                        submittedRef.current = true;
                        performSubmit();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [hasQuestions]);

  // --- Navigation Guards ---
  
  // Activate router-level navigation blocking during exam
  useBlockNavigation(hasQuestions && !submittedRef.current);
  
  // Block browser back/refresh/close during test
  useEffect(() => {
    if (!hasQuestions || submittedRef.current) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasQuestions]);

  // Disable common shortcuts during test (Ctrl+R, Ctrl+W, F5, Alt+Left)
  useEffect(() => {
    if (!hasQuestions || submittedRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+R or F5 (refresh)
      if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
        e.preventDefault();
        alert('Refreshing during the test is not allowed. Please click Submit to finish.');
        return;
      }
      // Ctrl+W (close tab) - can't fully prevent but warn
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        alert('Closing the test window is not allowed. Please click Submit to finish.');
        return;
      }
      // Alt+Left (browser back)
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        alert('Navigation is disabled during the test. Please click Submit to finish.');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasQuestions]);

  // --- Handlers ---

  const performSubmit = async () => {
        if (!exam) return;
        // guard against double-run
        if (submittedRef.current && isSubmitting) return;
        submittedRef.current = true;
        setIsSubmitting(true);

        // close any open confirm modal first
        setIsSubmitModalOpen(false);

        const duration = exam.durationMinutes || 120;
        const timeSpent = (duration * 60) - Math.max(0, timeLeft);

        // optional: notify the user briefly that auto-submit is occurring
        try {
            await handleExamSubmit(responses, timeSpent);
            navigate('/result');
        } finally {
            // navigation performed immediately after submission attempt
        }
  };

  const handleManualSubmitClick = () => {
      setIsSubmitModalOpen(true);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getTimerColorClass = () => {
      if (timeLeft < 60) return "bg-[#EF4444] text-white animate-pulse"; // Critical
      if (timeLeft < 300) return "bg-[#F59E0B] text-white"; // Warning
      return "bg-[#EFF0F3] text-[#1F2937]"; // Normal
  };

  const handleResponseChange = (val: string | string[]) => {
    if (!currentQuestion) return;
    setResponses(prev => ({ ...prev, [currentQuestion.id]: val }));
  };

  const handleClearResponse = () => {
    if (!currentQuestion) return;
    setResponses(prev => {
      const newResponses = { ...prev };
      delete newResponses[currentQuestion.id];
      return newResponses;
    });
  };

  const saveAndNext = () => {
    if (!currentQuestion) return;
    const hasAnswer = responses[currentQuestion.id] && (Array.isArray(responses[currentQuestion.id]) ? responses[currentQuestion.id].length > 0 : true);
    
    setStatus(prev => ({
      ...prev,
      [currentQuestion.id]: hasAnswer ? QuestionStatus.ANSWERED : QuestionStatus.NOT_ANSWERED
    }));
    
    moveToNextQuestion();
  };

  const markForReviewAndNext = () => {
    if (!currentQuestion) return;
    const hasAnswer = responses[currentQuestion.id] && (Array.isArray(responses[currentQuestion.id]) ? responses[currentQuestion.id].length > 0 : true);
    
    setStatus(prev => ({
      ...prev,
      [currentQuestion.id]: hasAnswer ? QuestionStatus.ANSWERED_MARKED_FOR_REVIEW : QuestionStatus.MARKED_FOR_REVIEW
    }));

    moveToNextQuestion();
  };

  const moveToNextQuestion = () => {
    if (!currentSection || !exam.sections) return;

    if (currentQuestionIndex < currentSection.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (currentSectionIndex < exam.sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
      setCurrentQuestionIndex(0);
    }
  };

  const changeSection = (index: number) => {
    setCurrentSectionIndex(index);
    setCurrentQuestionIndex(0);
  };

  const jumpToQuestion = (qIndex: number) => {
    setCurrentQuestionIndex(qIndex);
  };

  // --- Submit Lock Logic ---
  const totalDurationSeconds = (exam?.durationMinutes || 120) * 60;
  const timeSpentSeconds = totalDurationSeconds - timeLeft;
  // 30 minutes in seconds = 1800
  const LOCK_DURATION = 1800; 
  // Allow submit if exam is shorter than 30 mins, OR if 30 mins have passed
  const isSubmitLocked = (totalDurationSeconds > LOCK_DURATION && timeSpentSeconds < LOCK_DURATION) && !isSubmitting;
  const minutesToUnlock = Math.ceil((LOCK_DURATION - timeSpentSeconds) / 60);

  // --- Render Helpers ---

  const renderQuestionInput = () => {
    if (!currentQuestion) return null;
    const val = responses[currentQuestion.id];
        const richOptions = currentQuestion.optionDetails || [];
        const hasRich = richOptions && richOptions.length > 0;

    if (currentQuestion.type === QuestionType.NAT) {
        const textVal = (val as string) || '';
        return (
            <div className="mt-6">
                <input 
                    type="text" 
                    readOnly
                    value={textVal}
                    className="border border-[#D1D5DB] p-3 w-64 text-right font-bold text-2xl mb-4 bg-white rounded shadow-inner text-[#1F2937]"
                />
                <div className="w-64 grid grid-cols-3 gap-2 bg-[#F3F4F6] p-2 rounded border border-[#E5E7EB]">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((k) => (
                        <button 
                            key={k}
                            onClick={() => {
                                const newVal = textVal + k.toString();
                                handleResponseChange(newVal);
                            }}
                            className="bg-white border border-[#D1D5DB] hover:bg-[#EFF0F3] font-bold py-3 rounded text-lg shadow-sm text-[#1F2937] transition-colors"
                        >
                            {k}
                        </button>
                    ))}
                    <button 
                        onClick={() => {
                            handleResponseChange(textVal.slice(0, -1));
                        }}
                        className="bg-white border border-[#D1D5DB] hover:bg-[#FEE2E2] text-[#EF4444] py-3 rounded font-bold shadow-sm flex items-center justify-center"
                    >
                        ⌫
                    </button>
                </div>
                <button 
                    onClick={() => handleResponseChange('')}
                    className="mt-2 w-64 text-xs font-bold text-[#6B7280] hover:text-[#111827] underline"
                >
                    Clear Input
                </button>
            </div>
        );
    }

    if (currentQuestion.type === QuestionType.MCQ) {
        return (
            <div className="mt-8 space-y-4">
                {(hasRich ? richOptions.map((opt, idx) => ({ opt, label: String.fromCharCode(65 + idx) })) : (currentQuestion.options || []).map((text, idx) => ({ opt: { type: 'text', text }, label: String.fromCharCode(65 + idx) as string })) ).map(({ opt, label }) => (
                    <label key={label} className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all ${val === label ? 'border-[#3B82F6] bg-blue-50' : 'border-[#E5E7EB] hover:bg-[#F9FAFB]'}`}>
                        <input 
                            type="radio" 
                            name={currentQuestion.id}
                            checked={val === label}
                            onChange={() => handleResponseChange(label)}
                            className="w-5 h-5 cursor-pointer accent-[#1F2937] flex-shrink-0"
                        />
                        <div className="ml-4 flex-1 space-y-2">
                            {opt.type === 'image' && opt.imageData ? (
                                <div className="space-y-2">
                                    <img 
                                        src={opt.imageData as string} 
                                        alt={(opt as any).altText || `Option`} 
                                        className="max-h-[151px] max-w-[188px] object-contain border rounded bg-white cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setFullscreenImage(opt.imageData as string)}
                                    />
                                    {opt.text && <span className="text-lg font-medium text-[#111827]">{opt.text}</span>}
                                </div>
                            ) : (
                                <span className="text-lg font-medium text-[#111827]">{opt.text}</span>
                            )}
                        </div>
                    </label>
                ))}
            </div>
        );
    }

    if (currentQuestion.type === QuestionType.MSQ) {
        const selected = (val as string[]) || [];
        return (
            <div className="mt-8 space-y-4">
                {(hasRich ? richOptions.map((opt, idx) => ({ opt, label: String.fromCharCode(65 + idx) })) : (currentQuestion.options || []).map((text, idx) => ({ opt: { type: 'text', text }, label: String.fromCharCode(65 + idx) as string })) ).map(({ opt, label }) => (
                    <label key={label} className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all ${selected.includes(label) ? 'border-[#3B82F6] bg-blue-50' : 'border-[#E5E7EB] hover:bg-[#F9FAFB]'}`}>
                        <input 
                            type="checkbox" 
                            checked={selected.includes(label)}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    handleResponseChange([...(selected || []), label]);
                                } else {
                                    handleResponseChange((selected || []).filter(s => s !== label));
                                }
                            }}
                            className="w-5 h-5 cursor-pointer accent-[#1F2937] flex-shrink-0"
                        />
                        <div className="ml-4 flex-1 space-y-2">
                            {opt.type === 'image' && (opt as any).imageData ? (
                                <div className="space-y-2">
                                    <img 
                                        src={(opt as any).imageData} 
                                        alt={(opt as any).altText || `Option`} 
                                        className="max-h-[151px] max-w-[188px] object-contain border rounded bg-white cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setFullscreenImage((opt as any).imageData)}
                                    />
                                    {(opt as any).text && <span className="text-lg font-medium text-[#111827]">{(opt as any).text}</span>}
                                </div>
                            ) : (
                                <span className="text-lg font-medium text-[#111827]">{(opt as any).text}</span>
                            )}
                        </div>
                    </label>
                ))}
            </div>
        );
    }

    return null;
  };

  // --- Missing Content State ---
  if (!exam) return <div className="p-8">Loading...</div>;

  if (!currentQuestion || !currentSection) {
      return (
          <div className="flex flex-col items-center justify-center h-screen bg-white text-[#111827]">
              <div className="text-center p-8 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] shadow-sm max-w-md">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600">
                      <AlertTriangle size={32} />
                  </div>
                  <h2 className="text-xl font-bold mb-2">Exam Content Unavailable</h2>
                  <p className="text-gray-500 mb-6 text-sm">
                      {!hasSections 
                        ? "This exam paper appears to be empty. No sections were found." 
                        : "The selected section contains no questions."}
                  </p>
                  <button 
                    onClick={() => window.location.href = '/dashboard'}
                    className="bg-[#1F2937] text-white px-6 py-2 rounded-lg font-bold hover:bg-black transition-colors"
                  >
                      Return to Dashboard
                  </button>
              </div>
          </div>
      );
  }

  // --- Stats Calculation for Modal ---
  const totalQuestions = exam.sections.reduce((acc, sec) => acc + sec.questions.length, 0);
  const attemptedCount = Object.keys(responses).length;
  const unattemptedCount = totalQuestions - attemptedCount;

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden font-sans text-[#111827]">
      {/* Header */}
      <header className="h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center space-x-4">
             <h1 className="font-bold text-lg text-[#111827]">{exam.title}</h1>
             <div className="h-6 w-px bg-[#E5E7EB]"></div>
             <span className="text-[#6B7280] text-sm font-medium">{currentSection.name}</span>
        </div>
        <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-full font-mono text-xl font-bold transition-colors shadow-sm flex items-center ${getTimerColorClass()}`}>
                <span className="mr-2 text-sm opacity-80 font-sans font-normal">Time Left:</span>
                {formatTime(timeLeft)}
            </div>

            <div className="w-10 h-10 bg-[#F3F4F6] rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#4B5563]">
                <User size={20}/>
            </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left: Question Area */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden relative z-0">
           {/* Section Tabs */}
           <div className="flex border-b border-[#E5E7EB] px-6 bg-white">
               {exam.sections.map((sec, idx) => (
                   <button
                        key={sec.id}
                        onClick={() => changeSection(idx)}
                        className={`px-6 py-4 text-sm font-bold flex items-center border-b-2 transition-colors focus:outline-none
                            ${currentSectionIndex === idx 
                                ? 'border-[#1F2937] text-[#1F2937]' 
                                : 'border-transparent text-[#6B7280] hover:text-[#111827] hover:border-[#D1D5DB]'}`}
                   >
                       {sec.name}
                       <Info size={14} className="ml-2 opacity-50"/>
                   </button>
               ))}
           </div>

           {/* Question Header */}
           <div className="px-8 py-4 flex justify-between items-center bg-[#F8F9FA] border-b border-[#E5E7EB]">
                <div className="flex items-center space-x-2">
                    <span className="font-bold text-[#1F2937]">Question No. {currentQuestionIndex + 1}</span>
                    <span className="text-[#9CA3AF]">|</span>
                    <span className="text-[#4B5563] text-sm font-medium">Type: {currentQuestion.type}</span>
                    {currentQuestion.category && (
                        <>
                             <span className="text-[#9CA3AF]">|</span>
                             <span className="text-[#3B82F6] text-xs font-bold uppercase bg-blue-50 px-2 py-0.5 rounded">{currentQuestion.category}</span>
                        </>
                    )}
                </div>
                <div className="text-xs text-[#6B7280] font-semibold bg-white border border-[#E5E7EB] px-3 py-1 rounded-full">
                    Correct: <span className="text-[#10B981]">{currentQuestion.marks}</span> | Wrong: <span className="text-[#EF4444]">{currentQuestion.negativeMarks}</span>
                </div>
           </div>

           {/* Question Body - Scrollable */}
           <div className="flex-1 overflow-y-auto p-8 relative">
                <div className="max-w-4xl mx-auto">
                    <div className="text-lg leading-loose mb-8 text-[#111827] font-medium select-none whitespace-pre-wrap break-words">
                        {currentQuestion.text}
                    </div>

                    {currentQuestion.imageUrl && (
                        <div className="mb-8 flex justify-center">
                            <img 
                                src={currentQuestion.imageUrl} 
                                alt="Question" 
                                className="max-h-[302px] max-w-[680px] object-contain border border-[#E5E7EB] rounded shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setFullscreenImage(currentQuestion.imageUrl)}
                            />
                        </div>
                    )}

                    <div className="p-6 bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl inline-block min-w-[320px]">
                        <h4 className="text-xs font-bold text-[#9CA3AF] uppercase mb-2">Your Answer</h4>
                        {renderQuestionInput()}
                    </div>
                </div>
                
                {/* Collapsible Trigger */}
                <button 
                    onClick={() => setShowPalette(!showPalette)}
                    className="absolute top-1/2 right-0 bg-white border border-r-0 border-[#D1D5DB] text-[#4B5563] p-2 rounded-l-md shadow-md hover:bg-[#F3F4F6] z-10 transition-transform"
                >
                   {showPalette ? <ChevronRight size={20}/> : <ChevronLeft size={20}/>}
                </button>
           </div>

           {/* Bottom Actions */}
           <div className="h-20 border-t border-[#E5E7EB] bg-white flex items-center justify-between px-8 shrink-0">
                <div className="space-x-4">
                    <button 
                        onClick={handleClearResponse}
                        className="px-6 py-2.5 border border-[#D1D5DB] bg-white text-[#1F2937] rounded-lg hover:bg-[#F3F4F6] text-sm font-bold transition-colors"
                    >
                        Clear Response
                    </button>
                    <button 
                        onClick={markForReviewAndNext}
                        className="px-6 py-2.5 border border-[#D1D5DB] bg-white text-[#1F2937] rounded-lg hover:bg-[#F3F4F6] text-sm font-bold transition-colors"
                    >
                        Mark for Review & Next
                    </button>
                </div>
                
                <div className="flex space-x-4">
                    <button 
                        onClick={saveAndNext}
                        className="px-6 py-2.5 bg-[#1F2937] text-white rounded-lg hover:bg-[#0F1419] text-sm font-bold shadow-md transition-colors"
                    >
                        Save & Next
                    </button>
                     <button 
                        onClick={handleManualSubmitClick}
                        disabled={isSubmitLocked || isSubmitting}
                        title={isSubmitLocked ? `Button unlocks after 30 minutes. ${minutesToUnlock} min remaining.` : "Submit your exam"}
                        className={`px-8 py-2.5 rounded-lg text-sm font-bold shadow-md transition-colors border border-gray-800 flex items-center gap-2
                            ${(isSubmitLocked || isSubmitting)
                                ? 'bg-black/50 text-white cursor-not-allowed opacity-50' 
                                : 'bg-black text-white hover:bg-gray-800'}`}
                    >
                        {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : (isSubmitLocked && <Lock size={12}/>)}
                        {isSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                </div>
           </div>
        </div>

        {/* Right: Question Palette (Collapsible) */}
        {showPalette && (
            <div className="w-80 bg-[#F3F4F6] border-l border-[#E5E7EB] flex flex-col shrink-0 transition-all duration-300">
                {/* Header */}
                <div className="p-4 bg-white border-b border-[#E5E7EB] flex justify-between items-center">
                    <h3 className="font-bold text-[#111827]">Question Palette</h3>
                    <div className="text-xs text-[#6B7280]">{currentSection.name}</div>
                </div>

                {/* Legend */}
                <div className="p-4 grid grid-cols-2 gap-3 text-[10px] bg-white border-b border-[#E5E7EB] text-[#4B5563]">
                    <div className="flex items-center"><span className="w-4 h-4 bg-[#10B981] rounded mr-2"></span> Answered</div>
                    <div className="flex items-center"><span className="w-4 h-4 bg-[#FCD34D] rounded mr-2"></span> Not Answered</div>
                    <div className="flex items-center"><span className="w-4 h-4 bg-[#D1D5DB] rounded mr-2"></span> Not Visited</div>
                    <div className="flex items-center"><span className="w-4 h-4 bg-[#3B82F6] rounded-full mr-2"></span> Marked</div>
                </div>

                {/* Palette Grid */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <h4 className="text-xs font-bold text-[#9CA3AF] uppercase mb-3">Choose a Question</h4>
                    <div className="grid grid-cols-4 gap-3">
                        {currentSection.questions.map((q, idx) => {
                            const st = status[q.id];
                            
                            // Color Logic from UI Sheet
                            let btnClass = "bg-[#D1D5DB] text-[#1F2937]"; // Not Visited
                            if (st === QuestionStatus.NOT_ANSWERED) btnClass = "bg-[#FCD34D] text-white";
                            if (st === QuestionStatus.ANSWERED) btnClass = "bg-[#10B981] text-white";
                            if (st === QuestionStatus.MARKED_FOR_REVIEW) btnClass = "bg-[#3B82F6] rounded-full text-white";
                            if (st === QuestionStatus.ANSWERED_MARKED_FOR_REVIEW) btnClass = "bg-[#8B5CF6] rounded-full text-white ring-2 ring-[#10B981]";
                            
                            // Highlight current question
                            if (idx === currentQuestionIndex) {
                                btnClass += " ring-2 ring-black ring-offset-1";
                            }

                            return (
                                <button
                                    key={q.id}
                                    onClick={() => jumpToQuestion(idx)}
                                    className={`h-10 w-10 flex items-center justify-center font-bold text-sm rounded shadow-sm transition-all hover:opacity-80 ${btnClass}`}
                                >
                                    {idx + 1}
                                    {st === QuestionStatus.ANSWERED_MARKED_FOR_REVIEW && (
                                        <div className="absolute bottom-0 right-0 w-2 h-2 bg-[#10B981] rounded-full border border-white"></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        )}
      </div>
      
      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex items-center justify-center">
            {fullscreenImage.toLowerCase().endsWith('.svg') ? (
              <object 
                data={fullscreenImage} 
                type="image/svg+xml"
                className="max-w-full max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img 
                src={fullscreenImage} 
                alt="Fullscreen" 
                className="max-w-full max-h-[90vh] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 bg-white hover:bg-gray-200 rounded-full p-2 text-gray-800 transition-colors shadow-lg"
              title="Close (click anywhere)"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}
      
      {/* Submit Confirmation Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-[#E5E7EB]">
                      <h3 className="text-xl font-bold text-[#1F2937]">Submit Examination?</h3>
                      <p className="text-sm text-[#6B7280] mt-1">Please confirm your submission details.</p>
                  </div>
                  <div className="p-6 bg-[#F9FAFB] space-y-4">
                      <div className="flex justify-between items-center p-3 bg-white border border-[#E5E7EB] rounded-lg">
                          <span className="text-sm font-medium text-[#4B5563]">Total Questions</span>
                          <span className="font-bold text-[#1F2937]">{totalQuestions}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white border border-[#E5E7EB] rounded-lg">
                          <span className="text-sm font-medium text-[#10B981]">Answered</span>
                          <span className="font-bold text-[#10B981]">{attemptedCount}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white border border-[#E5E7EB] rounded-lg">
                          <span className="text-sm font-medium text-[#EF4444]">Not Answered</span>
                          <span className="font-bold text-[#EF4444]">{unattemptedCount}</span>
                      </div>
                      
                      {unattemptedCount > 0 && (
                          <div className="text-xs text-[#F59E0B] flex items-center bg-[#FEF3C7] p-2 rounded border border-[#FCD34D]">
                              <AlertTriangle size={14} className="mr-1"/> You have {unattemptedCount} unanswered questions.
                          </div>
                      )}
                  </div>
                  <div className="p-6 border-t border-[#E5E7EB] flex gap-3">
                      <button 
                          onClick={() => setIsSubmitModalOpen(false)}
                          className="flex-1 py-3 border border-[#E5E7EB] rounded-xl font-bold text-[#4B5563] hover:bg-[#F3F4F6] transition-colors"
                      >
                          Resume Test
                      </button>
                      <button 
                          onClick={performSubmit}
                          disabled={isSubmitting}
                          className="flex-1 py-3 bg-[#1F2937] text-white rounded-xl font-bold hover:bg-black transition-colors shadow-lg flex items-center justify-center"
                      >
                          {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2"/> : null}
                          {isSubmitting ? 'Submitting...' : 'Confirm Submit'}
                      </button>
                  </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default StudentExamInterface;