import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Crown } from 'lucide-react';
import { ExamPaper, UserResponse, QuestionType } from './types';
import CrinspireLogo from './components/CrinspireLogo';
import { supabase } from './supabaseClient';
import { updateUserStreak } from './utils/streak';
import { checkCurrentUserAdminStatus } from './utils/adminAuth';
import { loadRazorpayScript, initiatePayment, openRazorpayCheckout, verifyPayment } from './utils/paymentUtils';
import { SUBSCRIPTION_PLANS } from './config/razorpay';
import Toast from './components/Toast';

type SubscriptionTier = 'FREE' | 'PRO_MONTHLY' | 'PRO_SAVER';

interface StudentDetails {
    name: string;
    email: string;
    age?: string;
    subscriptionStart?: string;
    subscriptionEnd?: string;
}

const App: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogoClick = (e?: React.MouseEvent) => {
        // prevent any parent handlers from executing
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // If we're on the dashboard (or a dashboard subroute), refresh instead
        if (location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard')) {
            window.location.reload();
            return;
        }

        // Do nothing for exam/result/instructions routes to avoid navigating away
        if (
            location.pathname === '/result' ||
            location.pathname.startsWith('/exam') ||
            location.pathname.startsWith('/instructions')
        ) {
            return; // noop
        }

        // Otherwise navigate to the landing page
        navigate('/');
    };
  
  const [exams, setExams] = useState<ExamPaper[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [loadingExams, setLoadingExams] = useState(true);
  
  const [studentDetails, setStudentDetails] = useState<StudentDetails>({ 
    name: 'Guest', 
    email: 'guest@example.com' 
  });
  const [subscription, setSubscription] = useState<SubscriptionTier>('FREE');
  const [isAuthenticatedInstructor, setIsAuthenticatedInstructor] = useState(false);
  const [isAuthenticatedStudent, setIsAuthenticatedStudent] = useState(false);
  const [sessionResponses, setSessionResponses] = useState<UserResponse>({});
  const [lastSubmissionId, setLastSubmissionId] = useState<string | null>(null);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToastMessage(message);
        setToastType(type);
        setToastVisible(true);
        setTimeout(() => setToastVisible(false), 3500);
    };

  // --- Supabase Data Fetching ---

  useEffect(() => {
      checkUserSession();
      fetchExams();
  }, []);

  useEffect(() => {
      const stored = localStorage.getItem('last_submission_id');
      if (stored) setLastSubmissionId(stored);
  }, []);

  const checkUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
          const userEmail = session.user.email || '';

          // Check admin whitelist using the robust function (prefers user_id)
          const isAdmin = await checkCurrentUserAdminStatus();
          if (isAdmin) {
              setIsAuthenticatedInstructor(true);
              setSubscription('PRO_SAVER');
          }

          const { data: profile } = await supabase
              .from('profiles')
              .select('is_premium, full_name, age, subscription_start_date, subscription_expiry_date')
              .eq('id', session.user.id)
              .maybeSingle();

          // Normalize age value (prefer DB profile, fallback to user_metadata)
          const rawAge = profile?.age ?? session.user.user_metadata?.age;
          const normalizedAge = rawAge !== null && rawAge !== undefined && String(rawAge).trim() !== '' ? String(rawAge) : undefined;

          // Check if subscription has expired
          let isPremiumFlag = false;
          if (profile?.is_premium) {
              if (profile.subscription_expiry_date) {
                  const expiryDate = new Date(profile.subscription_expiry_date);
                  const now = new Date();
                  if (expiryDate > now) {
                      isPremiumFlag = true;
                  } else {
                      // Subscription expired - update profile to revoke premium
                      isPremiumFlag = false;
                      const { error: revokeError } = await supabase
                          .from('profiles')
                          .update({ is_premium: false })
                          .eq('id', session.user.id);
                      if (revokeError) console.error('Failed to revoke expired premium:', revokeError);
                  }
              } else {
                  // Fallback: if is_premium is true but no expiry, keep it (grandfathered)
                  isPremiumFlag = true;
              }
          }

          setStudentDetails({
              name: profile?.full_name || session.user.user_metadata?.full_name || 'Student',
              email: userEmail,
              age: normalizedAge,
              subscriptionStart: profile?.subscription_start_date,
              subscriptionEnd: profile?.subscription_expiry_date
          });

          // Admins always get pro access; otherwise set based on premium flag
          if (isAdmin) {
              setSubscription('PRO_SAVER');
          } else {
              setSubscription(isPremiumFlag ? 'PRO_SAVER' : 'FREE');
          }

          setIsAuthenticatedStudent(true);
      }
  };

  const fetchExams = async () => {
    setLoadingExams(true);
    try {
        const { data: papers, error: papersError } = await supabase
            .from('papers')
            .select('*')
            .order('year', { ascending: false });
        
        if (papersError) throw papersError;
        
        const paperList = papers || [];
        if (paperList.length === 0) {
             setExams([]);
             setLoadingExams(false);
             return;
        }

        const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .order('position', { ascending: true })
            .order('created_at', { ascending: true });

        if (questionsError) throw questionsError;

        const reconstructedExams: ExamPaper[] = paperList.map((p: any) => {
            const paperQuestions = questions?.filter((q: any) => q.paper_id === p.id) || [];
            
            const sectionsMap: {[key: string]: any[]} = {};
            
            paperQuestions.forEach((q: any) => {
                const secName = q.section_name || 'General';
                if (!sectionsMap[secName]) sectionsMap[secName] = [];
                sectionsMap[secName].push({
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
                   position: q.position || 0
                });
            });

            // Sort questions within each section by position
            Object.keys(sectionsMap).forEach(secName => {
                sectionsMap[secName].sort((a, b) => (a.position || 0) - (b.position || 0));
            });

            const sections: any[] = Object.keys(sectionsMap).map((secName, idx) => ({
                id: `sec-${p.id}-${idx}`,
                name: secName,
                questions: sectionsMap[secName]
            }));

            return {
                id: p.id,
                title: p.title,
                year: p.year,
                examType: p.exam_type,
                durationMinutes: p.duration_minutes || 120,
                isPremium: !!p.is_premium,
                sections: sections
            };
        });

        setExams(reconstructedExams);

    } catch (err) {
        console.error("Error fetching exams:", err);
    } finally {
        setLoadingExams(false);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    try {
        const { error: attemptsError } = await supabase
            .from('user_attempts')
            .delete()
            .eq('paper_id', examId);
        
        if (attemptsError) {
             console.warn("Could not delete associated attempts:", attemptsError);
        }

        const { error: questionsError } = await supabase
            .from('questions')
            .delete()
            .eq('paper_id', examId);
        
        if (questionsError) throw questionsError;

        const { error: paperError } = await supabase
            .from('papers')
            .delete()
            .eq('id', examId);
        
        if (paperError) throw paperError;

        setExams(prev => prev.filter(exam => exam.id !== examId));
        if (selectedExamId === examId) setSelectedExamId(null);
        
        alert('✅ Exam deleted successfully!');
    } catch (error: any) {
        console.error('Delete error:', error);
        alert('❌ Failed to delete: ' + (error.message || error));
    }
  };

  const base64ToBlob = async (url: string): Promise<Blob> => {
    try {
        const res = await fetch(url);
        return await res.blob();
    } catch (e) {
        console.error("Blob conversion failed", e);
        throw e;
    }
  }

  const handleAdminSave = async (savedExam: ExamPaper) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: userData } = await supabase.auth.getUser();

        if (!session) {
            throw new Error("You are not logged in. Please log in again.");
        }

        const isNewExam = !savedExam.id || savedExam.id.toString().startsWith('temp') || savedExam.id.length < 20;

        const paperPayload: any = {
            title: savedExam.title,
            year: savedExam.year,
            exam_type: savedExam.examType,
            duration_minutes: savedExam.durationMinutes,
            is_premium: savedExam.isPremium,
        };

        if (!isNewExam) {
            paperPayload.id = savedExam.id;
        }

        const { data: paperData, error: paperError } = await supabase
            .from('papers')
            .upsert(paperPayload)
            .select()
            .single();

        if (paperError) {
            console.error('Failed to save exam:', paperError.message);
            throw paperError;
        }
        if (!paperData) throw new Error("No data returned from paper save");
        
        const paperId = paperData.id;

        const { error: deleteError } = await supabase
            .from('questions')
            .delete()
            .eq('paper_id', paperId);
            
        if (deleteError) throw deleteError;

        const questionsToInsert = [];

        for (const section of savedExam.sections) {
            for (const q of section.questions) {
                let finalImageUrl = q.imageUrl;

                if (q.imageUrl && q.imageUrl.startsWith('data:')) {
                    try {
                        const blob = await base64ToBlob(q.imageUrl);
                        const fileName = `${paperId}/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
                        const { data: uploadData, error: uploadError } = await supabase.storage
                            .from('exam-images')
                            .upload(fileName, blob);
                        
                        if (uploadError) {
                            console.error("Image upload failed", uploadError);
                        } else {
                            const { data: { publicUrl } } = supabase.storage.from('exam-images').getPublicUrl(fileName);
                            finalImageUrl = publicUrl;
                        }
                    } catch (imgErr) {
                        console.error("Image processing error", imgErr);
                    }
                }

                // Process option images if present
                let finalOptionDetails = q.optionDetails;
                if (q.optionDetails && q.optionDetails.length > 0) {
                    finalOptionDetails = await Promise.all(q.optionDetails.map(async (opt) => {
                        if (opt.imageData && opt.imageData.startsWith('data:')) {
                            try {
                                const blob = await base64ToBlob(opt.imageData);
                                const fileName = `${paperId}/options/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
                                const { data: uploadData, error: uploadError } = await supabase.storage
                                    .from('exam-images')
                                    .upload(fileName, blob);
                                if (!uploadError) {
                                    const { data: { publicUrl } } = supabase.storage.from('exam-images').getPublicUrl(fileName);
                                    return { ...opt, imageData: publicUrl };
                                }
                            } catch (imgErr) {
                                console.error('Option image upload failed', imgErr);
                            }
                        }
                        return opt;
                    }));
                }

                questionsToInsert.push({
                    paper_id: paperId,
                    section_name: section.name,
                    text: q.text,
                    image_url: finalImageUrl,
                    type: q.type,
                    marks: q.marks,
                    negative_marks: q.negativeMarks,
                    options: q.options || [], 
                    option_details: finalOptionDetails || null,
                    correct_answer: q.correctAnswer, 
                    category: q.category
                });
            }
        }
        
        if (questionsToInsert.length > 0) {
            // Add position index to preserve insertion order
            const questionsWithPosition = questionsToInsert.map((q, index) => ({
                ...q,
                position: index + 1
            }));
            const { error: insertError } = await supabase.from('questions').insert(questionsWithPosition);
            if (insertError) throw insertError;
        }

        await fetchExams();
        alert('✅ Exam saved successfully!');
    } catch (error: any) {
        console.error('Save error details:', error);
        
        let msg = "Unknown error";
        if (typeof error === 'string') {
            msg = error;
        } else if (error instanceof Error) {
            msg = error.message;
        } else if (typeof error === 'object' && error !== null) {
            const sbError = error as any;
            if (sbError.message) {
                msg = sbError.message;
                if (sbError.details) msg += ` (${sbError.details})`;
                if (sbError.hint) msg += ` Hint: ${sbError.hint}`;
            } else {
                try {
                    msg = JSON.stringify(error);
                } catch {
                    msg = "Object (serialization failed)";
                }
            }
        }
        
        alert('❌ Failed to save. ' + msg);
    }
  };

  const handleStudentLogin = (details: {name: string, email: string, age?: string}) => {
      setStudentDetails(prev => ({ ...prev, ...details }));
      setIsAuthenticatedStudent(true);
      checkUserSession();
      navigate('/dashboard');
  };

  const handleInstructorLogin = () => {
      setIsAuthenticatedInstructor(true);
      navigate('/admin');
  };

  const startExamFlow = (examId: string) => {
    setSelectedExamId(examId);
    navigate(`/instructions/${examId}`);
  };

  const handleProfileUpdate = (newName: string) => {
      setStudentDetails(prev => ({
          ...prev,
          name: newName
      }));
  };

  const calculateScore = (exam: ExamPaper, responses: UserResponse) => {
    let score = 0;
    let maxScore = 0;
    let correctCount = 0;
    let wrongCount = 0;

    exam.sections.forEach(sec => {
      sec.questions.forEach(q => {
        const userAns = responses[q.id];
        maxScore += q.marks;

        let isCorrect = false;
        let isAttempted = userAns !== undefined && userAns !== '' && (Array.isArray(userAns) ? userAns.length > 0 : true);

        if (!isAttempted) return;

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
            score += q.marks;
            correctCount++;
        } else {
            score -= q.negativeMarks;
            wrongCount++;
        }
      });
    });

    const accuracy = (correctCount + wrongCount) > 0 ? (correctCount / (correctCount + wrongCount)) * 100 : 0;
    return { score, maxScore, accuracy };
  };

  const handleExamSubmit = async (responses: UserResponse, timeSpent: number): Promise<string | null> => {
    setSessionResponses(responses);

    const selectedExam = exams.find(e => e.id === selectedExamId);
    if (!selectedExam) {
        console.error("No exam selected during submission");
        navigate('/dashboard');
        return null;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
        navigate('/login');
        return null;
    }

    const safeTimeSpent = Math.max(0, Math.floor(timeSpent || 0));

    // Build detailed per-question answers for review
    const studentAnswers: any[] = [];
    let totalMarks = 0;
    let totalQuestions = 0;
    let totalMaxMarks = 0;

    selectedExam.sections.forEach(sec => {
        sec.questions.forEach(q => {
            totalQuestions += 1;
            totalMaxMarks += q.marks;
            const userAns = responses[q.id];
            const isAttempted = userAns !== undefined && userAns !== '' && (Array.isArray(userAns) ? userAns.length > 0 : true);

            // Derive correct option ids
            let correctOptionIds: string[] = [];
            if (q.optionDetails && q.optionDetails.length > 0) {
                correctOptionIds = q.optionDetails
                    .map((opt, idx) => ({ opt, label: String.fromCharCode(65 + idx) }))
                    .filter(({ opt }) => opt.isCorrect)
                    .map(({ opt, label }) => opt.id || label);
            } else if (Array.isArray(q.correctAnswer)) {
                correctOptionIds = [...q.correctAnswer];
            } else if (typeof q.correctAnswer === 'string') {
                correctOptionIds = [q.correctAnswer];
            }

            let selectedOptionIds: string[] | undefined;
            let selectedValue: string | undefined;
            let correctValue: string | undefined;
            let isCorrect = false;

            if (q.type === QuestionType.NAT) {
                selectedValue = typeof userAns === 'string' ? userAns : undefined;
                correctValue = typeof q.correctAnswer === 'string' ? q.correctAnswer : undefined;
                isCorrect = isAttempted && selectedValue !== undefined && correctValue !== undefined && selectedValue.trim().toLowerCase() === correctValue.trim().toLowerCase();
            } else if (q.type === QuestionType.MCQ) {
                selectedOptionIds = userAns ? [String(userAns)] : [];
                const correct = correctOptionIds[0];
                isCorrect = isAttempted && selectedOptionIds.length === 1 && correctOptionIds.includes(selectedOptionIds[0]);
                correctOptionIds = correct ? [correct] : correctOptionIds;
            } else if (q.type === QuestionType.MSQ) {
                selectedOptionIds = Array.isArray(userAns) ? [...userAns].sort() : [];
                const expected = [...correctOptionIds].sort();
                isCorrect = isAttempted && JSON.stringify(selectedOptionIds) === JSON.stringify(expected);
            }

            const marksEarned = !isAttempted
                ? 0
                : isCorrect
                ? q.marks
                : -q.negativeMarks;

            totalMarks += marksEarned;

            studentAnswers.push({
                question_id: q.id,
                selected_option_ids: selectedOptionIds,
                selected_value: selectedValue,
                correct_value: correctValue,
                marks_earned: marksEarned,
                is_correct: isCorrect,
                correct_option_ids: correctOptionIds,
                question_type: q.type,
                attempted: isAttempted,
                max_marks: q.marks,
            });
        });
    });

    const passed = totalMarks >= 0;

    try {
        // Keep legacy attempts table for analytics/streaks
        const scoreData = calculateScore(selectedExam, responses);
        const { error: insertError } = await supabase.from('user_attempts').insert([{
            user_id: session.user.id,
            paper_id: selectedExam.id,
            responses: responses,
            time_spent: safeTimeSpent,
            score: scoreData.score,
            max_score: scoreData.maxScore,
            accuracy: scoreData.accuracy
        }]);

        if (insertError) {
            console.error("Supabase insert error:", insertError);
        } else {
            try {
                await updateUserStreak(session.user.id);
            } catch (e) {
                console.error('Failed to update streak', e);
            }
        }

        // Insert detailed submission for review
        const { data: submissionRow, error: submissionError } = await supabase
            .from('exam_submissions')
            .insert([{
                user_id: session.user.id,
                exam_id: selectedExam.id,
                student_answers: studentAnswers,
                total_marks: totalMarks,
                total_questions: totalQuestions,
                passed,
            }])
            .select()
            .single();

        if (submissionError) {
            console.error('Failed to save submission for review:', submissionError);
            return null;
        }

        // Cache for session-bound review page and allow dashboard recall within 24h
        sessionStorage.setItem(`exam_review_${submissionRow.id}`, JSON.stringify(submissionRow));
        // Store result data for back navigation from ExamReview
        sessionStorage.setItem('last_result_data', JSON.stringify({
            examId: selectedExam.id,
            responses: responses,
            submissionId: submissionRow.id,
            timestamp: Date.now()
        }));
        setLastSubmissionId(submissionRow.id);
        localStorage.setItem('last_submission_id', submissionRow.id);
        localStorage.setItem(`latest_submission_${selectedExam.id}`, JSON.stringify({
            submissionId: submissionRow.id,
            examId: selectedExam.id,
            expiresAt: submissionRow.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }));

        return submissionRow.id as string;
    } catch (error) {
        console.error("Critical error during exam submission:", error);
        return null;
    }
  };

  const handleUpgrade = async (plan: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
          alert("Please login to upgrade.");
          navigate('/login');
          return;
      }

      try {
          // Handle free tier immediately
          if (plan === 'FREE') {
              // If user is logged in, send to dashboard; otherwise ask to login
              navigate('/dashboard');
              return;
          }
          // Map UI plan ids to config keys in SUBSCRIPTION_PLANS
          let planKey: keyof typeof SUBSCRIPTION_PLANS = 'monthly';
          if (plan === 'PRO_MONTHLY') planKey = 'monthly';
          else if (plan === 'PRO_SAVER') planKey = 'six_months';
          else if ((plan as any) in SUBSCRIPTION_PLANS) planKey = plan as any;

          // Ensure Razorpay script is loaded
          const loaded = await loadRazorpayScript();
          if (!loaded) {
              alert('Failed to load Razorpay SDK.');
              return;
          }

          // Initiate order via Supabase function (create-order)
          const init = await initiatePayment(planKey, session.user.id, studentDetails.email, studentDetails.name);
          const { orderId, amount } = init;

          // Open checkout; pass signature back for verification
          openRazorpayCheckout(
            orderId,
            amount,
            studentDetails.email,
            studentDetails.name,
            async (paymentId: string, returnedOrderId: string, signature?: string) => {
                            try {
                                const verify = await verifyPayment(paymentId, returnedOrderId, signature || '', session.user.id);
                                if (verify.success) {
                                    // set subscription based on chosen plan
                                    if (plan === 'PRO_MONTHLY') setSubscription('PRO_MONTHLY');
                                    else setSubscription('PRO_SAVER');
                                    await checkUserSession();
                                    showToast('Payment Successful! Premium features unlocked.', 'success');
                                    navigate('/dashboard');
                                } else {
                                    showToast('Payment verification failed.', 'error');
                                }
                            } catch (err: any) {
                                console.error('Verification error:', err);
                                showToast(err.message || 'Payment verification failed', 'error');
              }
            },
                        (errMsg: string) => {
                            showToast(errMsg || 'Payment cancelled or failed', 'info');
                        }
          );

      } catch (err: any) {
          console.error('Payment Error:', err);
          showToast(err.message || 'Something went wrong.', 'error');
      }
  };

    // --- RENDER ---
  return (
    <div className="min-h-screen flex flex-col bg-white">
            {/* Navbar (hidden on /exam pages) */}
            {!location.pathname.startsWith('/exam') && (
                <nav className="h-16 border-b border-[#E5E7EB] bg-white flex items-center justify-between px-6 lg:px-12 sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-3 cursor-pointer" onClick={handleLogoClick} role="button" aria-label="Crinspire Home">
          <CrinspireLogo style={{ width: '35px', height: '35px' }} />
          <h1 className="text-[25px] font-bold tracking-tight text-[#1F2937]" style={{ fontFamily: 'Chokokutai' }}>Crinspire</h1>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticatedStudent ? (
            <>
              {subscription === 'FREE' && (
                <button onClick={() => navigate('/pricing')} className="hidden md:flex items-center gap-2 text-xs font-bold bg-[#FCD34D]/20 text-[#B45309] px-3 py-1.5 rounded-full border border-[#FCD34D]">
                  <Crown size={14}/> Upgrade to Pro
                </button>
              )}
              <button onClick={() => navigate('/dashboard')} className="text-sm font-medium text-[#1F2937] hover:text-[#8AA624] transition-colors flex items-center gap-2 px-3 py-1.5 rounded hover:bg-[#F3F4F6]">
                <LayoutDashboard size={14} /> Dashboard
              </button>
              <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  setIsAuthenticatedStudent(false);
                  navigate('/login');
                }}
                className="text-sm font-medium text-[#EF4444] hover:text-[#B91C1C] transition-colors flex items-center gap-2 px-3 py-1.5 rounded hover:bg-[#FEE2E2]"
              >
                <LogOut size={14} /> Logout
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/pricing')} className="text-sm font-medium text-[#1F2937] hover:text-[#8AA624] transition-colors">Pricing</button>
              <button onClick={() => navigate('/login')} className="text-sm font-medium text-[#1F2937] hover:text-[#8AA624] transition-colors">Login</button>
            </>
          )}
        </div>
                </nav>
            )}

      {/* Page Content */}
      <main className="flex-grow">
        <Outlet context={{
          exams,
          subscription,
          studentDetails,
          isAuthenticatedStudent,
          isAuthenticatedInstructor,
          sessionResponses,
          selectedExamId,
          handleStudentLogin,
          handleInstructorLogin,
          startExamFlow,
          handleProfileUpdate,
          handleDeleteExam,
          handleAdminSave,
          handleExamSubmit,
          handleUpgrade,
          calculateScore,
          lastSubmissionId
        }} />
      </main>
        {/* Toast */}
        <Toast message={toastMessage} type={toastType} visible={toastVisible} onClose={() => setToastVisible(false)} />
    </div>
  );
};

export default App;