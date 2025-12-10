import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Crown } from 'lucide-react';
import { ExamPaper, UserResponse, QuestionType } from './types';
import CrinspireLogo from './components/CrinspireLogo';
import { supabase } from './supabaseClient';
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

          setStudentDetails({
              name: profile?.full_name || session.user.user_metadata?.full_name || 'Student',
              email: userEmail,
              age: normalizedAge,
              subscriptionStart: profile?.subscription_start_date,
              subscriptionEnd: profile?.subscription_expiry_date
          });

          // Robustly normalize is_premium (handles boolean, 't'/'f', 'true'/'false', '1'/'0', numeric)
          const rawPremium = profile?.is_premium ?? session.user.user_metadata?.is_premium;
          let isPremiumFlag = false;
          if (typeof rawPremium === 'boolean') {
              isPremiumFlag = rawPremium;
          } else if (typeof rawPremium === 'number') {
              isPremiumFlag = rawPremium === 1;
          } else if (typeof rawPremium === 'string') {
              const low = rawPremium.toLowerCase().trim();
              isPremiumFlag = low === 't' || low === 'true' || low === '1';
          }

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
            .select('*');

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
                   correctAnswer: q.correct_answer,
                   marks: q.marks,
                   negativeMarks: q.negative_marks,
                   category: q.category
                });
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
        console.log("Saving exam...", savedExam);

        const { data: { session } } = await supabase.auth.getSession();
        const { data: userData } = await supabase.auth.getUser();
        console.log('DEBUG: current session', session);
        console.log('DEBUG: current user (getUser)', userData);

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

        console.log("Upserting paper...", paperPayload);

        const { data: paperData, error: paperError } = await supabase
            .from('papers')
            .upsert(paperPayload)
            .select()
            .single();

        if (paperError) {
            console.error('Supabase paper upsert error object:', paperError);
            // include session / user info in console for debugging RLS issues
            console.error('Supabase session at error time:', session);
            console.error('Supabase user at error time:', userData);
            throw paperError;
        }
        if (!paperData) throw new Error("No data returned from paper save");
        
        const paperId = paperData.id;
        console.log("Paper saved with ID:", paperId);

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

                questionsToInsert.push({
                    paper_id: paperId,
                    section_name: section.name,
                    text: q.text,
                    image_url: finalImageUrl,
                    type: q.type,
                    marks: q.marks,
                    negative_marks: q.negativeMarks,
                    options: q.options || [], 
                    correct_answer: q.correctAnswer, 
                    category: q.category
                });
            }
        }
        
        if (questionsToInsert.length > 0) {
            console.log("Inserting questions...", questionsToInsert.length);
            const { error: insertError } = await supabase.from('questions').insert(questionsToInsert);
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

  const handleExamSubmit = async (responses: UserResponse, timeSpent: number) => {
    setSessionResponses(responses);
    
    // Fallback: if selectedExamId is null, try to find it from exams? 
    // Usually selectedExamId is set in startExamFlow. 
    // If user refreshes, they lose state. In a real app we'd use localstorage or url param re-fetch.
    const selectedExam = exams.find(e => e.id === selectedExamId);
    if (!selectedExam) {
        // If we can't find the exam (e.g. reload), we should probably redirect to dashboard 
        // OR try to recover from URL if we were in the exam route. 
        // But handleExamSubmit is called from the exam interface.
        console.error("No exam selected during submission");
        navigate('/dashboard');
        return;
    }

    try {
        let scoreData = calculateScore(selectedExam, responses);
        const safeTimeSpent = Math.max(0, Math.floor(timeSpent || 0));

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            console.log("Saving attempt to Supabase...");
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
                console.log("Attempt saved successfully.");
            }
        }
    } catch (error) {
        console.error("Critical error during exam submission:", error);
    } finally {
        navigate('/result');
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
          calculateScore
        }} />
      </main>
        {/* Toast */}
        <Toast message={toastMessage} type={toastType} visible={toastVisible} onClose={() => setToastVisible(false)} />
    </div>
  );
};

export default App;