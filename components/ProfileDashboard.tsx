import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, Crown,
  CheckCircle, 
  Search, Filter, ArrowUp, ArrowDown,
  Settings, Moon, Bell, Shield, 
  ChevronRight, X,
  BookOpen, Clock, ArrowDownUp, HelpCircle,
    BarChart2, Flame, Target, Check, Loader2
} from 'lucide-react';
import { UserAttempt } from '../types';
import { supabase } from '../supabaseClient';
import { fetchCompletedExams } from '../utils/examUtils';
import { getUserStreak, formatStreakDisplay } from '../utils/streak';
import SkeletonLoader from './SkeletonLoader';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { ExamSummary, getExamsSummary, examDetailKey, getExamDetail } from '../utils/examQueries';

type SettingsTab = 'SETTINGS' | 'ANALYTICS' | 'PROFILE' | 'NOTIFICATIONS' | 'HELP';

const StatCard = ({ icon: Icon, label, value, sub, colorClass, bgClass }: any) => (
  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3 transition-all hover:shadow-md">
    <div className={`p-2.5 rounded-lg ${bgClass}`}>
      <Icon size={18} className={colorClass} />
    </div>
    <div className="min-w-0">
      <div className="text-xl font-bold text-gray-900 leading-tight truncate">{value}</div>
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide truncate">{label}</div>
      {sub && <div className="text-[9px] text-gray-400 mt-0.5 truncate">{sub}</div>}
    </div>
  </div>
);

const ProfileDashboard: React.FC = () => {
    const { studentDetails, subscription, handleUpgrade, handleProfileUpdate } = useOutletContext<any>();
  const navigate = useNavigate();
    const queryClient = useQueryClient();

  const [attempts, setAttempts] = useState<UserAttempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(true);
  const [latestSubmissions, setLatestSubmissions] = useState<Record<string, { id: string; expiresAt?: string }>>({});

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('SETTINGS');

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');
  const [completedExamIds, setCompletedExamIds] = useState<Set<string>>(new Set());
    const [streak, setStreak] = useState<number>(0);
    const [longestStreak, setLongestStreak] = useState<number>(0);

  const [editForm, setEditForm] = useState({ fullName: studentDetails.name, age: studentDetails.age || '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Handler to load submission and navigate to result screen
  const handleViewResult = async (submissionId: string, examId: string) => {
    try {
      // Load submission from DB
      const { data: submission, error } = await supabase
        .from('exam_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();
      
      if (error) throw error;
      
      // Reconstruct responses object from student_answers
      const responses: Record<string, any> = {};
      (submission.student_answers || []).forEach((ans: any) => {
        if (ans.question_type === 'NAT') {
          responses[ans.question_id] = ans.selected_value;
        } else if (ans.question_type === 'MSQ') {
          responses[ans.question_id] = ans.selected_option_ids || [];
        } else if (ans.question_type === 'MCQ') {
          responses[ans.question_id] = ans.selected_option_ids?.[0] || '';
        }
      });
      
      // Cache the data for result screen
      sessionStorage.setItem('last_result_data', JSON.stringify({
        examId: examId,
        responses: responses,
        submissionId: submissionId,
        timestamp: Date.now()
      }));
      
      // Navigate to result screen
      navigate('/result');
    } catch (error) {
      console.error('Failed to load result:', error);
      alert('Failed to load result. Please try again.');
    }
  };

  useEffect(() => {
    const loadCompletedExams = async () => {
      const completed = await fetchCompletedExams();
      setCompletedExamIds(completed);
    };
    loadCompletedExams();
  }, []);

    useEffect(() => {
        const loadStreak = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;
                const info = await getUserStreak(session.user.id);
                if (info) {
                    setStreak(info.currentStreak || 0);
                    setLongestStreak(info.longestStreak || 0);
                } else {
                    const dates = Array.from(new Set(attempts.map(a => new Date(a.created_at).toDateString())));
                    setStreak(dates.length);
                }
            } catch (e) {
                console.error('Failed to fetch streak', e);
                const dates = Array.from(new Set(attempts.map(a => new Date(a.created_at).toDateString())));
                setStreak(dates.length);
            }
        };
        loadStreak();
    }, [attempts.length]);

  useEffect(() => {
    const fetchRecentSubmissions = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        
        const nowIso = new Date().toISOString();
        const { data, error } = await supabase
          .from('exam_submissions')
          .select('id, exam_id, expires_at')
          .eq('user_id', session.user.id)
          .gt('expires_at', nowIso)
          .order('submitted_at', { ascending: false });
        if (error) throw error;
        const map: Record<string, { id: string; expiresAt?: string }> = {};
        (data || []).forEach((row: any) => {
          if (!map[row.exam_id]) {
            map[row.exam_id] = { id: row.id, expiresAt: row.expires_at };
          }
        });
        setLatestSubmissions(map);
      } catch (err) {
        console.error('Failed to fetch recent submissions', err);
      }
    };
    fetchRecentSubmissions();
  }, []);

  useEffect(() => {
    const fetchAttempts = async () => {
      setLoadingAttempts(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data, error } = await supabase
            .from('user_attempts')
            .select('*, paper:papers(title)')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

          if (error) throw error;
          const mappedData = data?.map((d: any) => ({
             ...d,
             paper_title: d.paper?.title
          })) || [];
          setAttempts(mappedData);
        }
      } catch (error) {
        console.error("Error fetching attempts:", error);
      } finally {
        setLoadingAttempts(false);
      }
    };
    fetchAttempts();
  }, []);

  const stats = useMemo(() => {
    const totalTests = attempts.length;
    
    const bestAccuracy = attempts.length > 0 
      ? Math.max(...attempts.map(a => a.accuracy || 0)) 
      : 0;

    return { totalTests, bestAccuracy, streak };
  }, [attempts]);

    const { data: examsSummary, isLoading: loadingExamsSummary, isFetching: fetchingExamsSummary, error: examsSummaryError } = useQuery({
    queryKey: ['examsSummary'],
    queryFn: getExamsSummary,
  });

  const availableCategories = ['ALL', ...Array.from(new Set((examsSummary || []).map((e: ExamSummary) => e.examType || 'UCEED')))];

  const filteredExams = useMemo(() => {
      let filtered = (examsSummary || []) as ExamSummary[];
      if (selectedCategory !== 'ALL') {
          filtered = filtered.filter((e) => e.examType === selectedCategory);
      }
      return filtered.sort((a, b) => {
          if (sortOrder === 'NEWEST') return b.year - a.year;
          return a.year - b.year;
      });
  }, [examsSummary, selectedCategory, sortOrder]);

  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopySupportEmail = async () => {
      try {
          await navigator.clipboard.writeText('crinspire.help@gmail.com');
          setCopiedEmail(true);
          setTimeout(() => setCopiedEmail(false), 1500);
      } catch (err) {
          console.error('Failed to copy email', err);
      }
  };

  const handleProfileSave = async () => {
      setSavingProfile(true);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          const { error } = await supabase
              .from('profiles')
              .update({ full_name: editForm.fullName, age: editForm.age })
              .eq('id', session.user.id);
          
          if (error) throw error;

          handleProfileUpdate(editForm.fullName);
          alert("Profile updated successfully!");
      } catch (err) {
          console.error(err);
          alert("Failed to update profile.");
      } finally {
          setSavingProfile(false);
      }
  };

  const renderGreeting = () => (
    <div className="bg-[#1F2937] text-white rounded-2xl p-8 mb-8 relative overflow-hidden shadow-lg">
       <div className="absolute top-0 right-0 w-64 h-64 bg-[#8AA624] rounded-full blur-[80px] opacity-20 translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
       <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {studentDetails.name.split(' ')[0]}!</h1>
            <p className="text-gray-300 max-w-md">
               You're on a roll! Consistency is the key to cracking design entrance exams. Let's practice.
            </p>
          </div>
          <div className="flex gap-3">
             <button 
                onClick={() => setIsSettingsOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-lg font-bold text-sm backdrop-blur-sm transition-all flex items-center"
             >
                <Settings size={16} className="mr-2"/> Settings
             </button>
          </div>
       </div>
    </div>
  );

  const renderStatsSidebar = () => (
      <div className="space-y-4 sticky top-24">
          <div className="flex items-center justify-between mb-2 px-1">
             <h3 className="font-bold text-gray-800 text-sm">Your Progress</h3>
          </div>
          
          <StatCard 
            icon={CheckCircle} 
            label="Tests Taken" 
            value={stats.totalTests} 
            bgClass="bg-blue-50" 
            colorClass="text-blue-600"
          />
          <StatCard 
            icon={Flame} 
            label="Day Streak" 
                        value={formatStreakDisplay(streak)} 
                        sub={longestStreak ? `Best: ${longestStreak} days` : 'Keep it up!'}
            bgClass="bg-orange-50" 
            colorClass="text-orange-500"
          />
          <StatCard 
            icon={Target} 
            label="Best Accuracy" 
            value={`${Math.round(stats.bestAccuracy)}%`} 
            bgClass="bg-green-50" 
            colorClass="text-green-600"
          />
                    <StatCard 
                        icon={Crown} 
                        label="Plan Status" 
                        value={subscription === 'FREE' ? 'Free Plan' : 'Premium'} 
                        sub={subscription === 'FREE' ? 'Upgrade to unlock' : (studentDetails.subscriptionEnd ? `Expires ${new Date(studentDetails.subscriptionEnd).toLocaleDateString()}` : 'Active')}
                        bgClass={subscription === 'FREE' ? "bg-gray-100" : "bg-yellow-50"} 
                        colorClass={subscription === 'FREE' ? "text-gray-500" : "text-yellow-600"}
                    />

          {subscription === 'FREE' && (
             <div className="mt-6 bg-gradient-to-br from-[#1F2937] to-gray-900 rounded-xl p-6 text-white shadow-lg text-center">
                 <Crown size={24} className="mx-auto text-[#FCD34D] mb-3"/>
                 <h4 className="font-bold text-md mb-1">Unlock Pro</h4>
                 <p className="text-[10px] text-gray-400 mb-3">Get access to all papers, detailed solutions, and advanced analytics.</p>
                      <button 
                          onClick={() => handleUpgrade('PRO_MONTHLY')}
                    className="w-full py-2 bg-[#FCD34D] text-[#78350F] font-bold rounded-lg text-xs hover:bg-[#FBBF24] transition-colors"
                 >
                    Upgrade Now
                 </button>
             </div>
          )}
      </div>
  );

  const renderExamList = () => (
      <div>
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
             <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <BookOpen className="mr-2" size={20} /> Available Tests
             </h2>
             
             <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex gap-1">
                    {availableCategories.slice(0, 4).map((cat: any) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                selectedCategory === cat 
                                ? 'bg-[#1F2937] text-white shadow-sm' 
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <div className="w-px h-4 bg-gray-200 mx-1"></div>
                <button 
                    onClick={() => setSortOrder(prev => prev === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
                    className="p-1.5 hover:bg-gray-50 rounded-md text-gray-500"
                    title="Sort Order"
                >
                    <ArrowDownUp size={14} />
                </button>
             </div>
         </div>

         {/* Inline loading banner */}
         {fetchingExamsSummary && (
           <div className="mb-3 flex items-center gap-2 text-xs font-bold text-gray-600">
             <Loader2 size={14} className="animate-spin" /> Loading papers...
           </div>
         )}

         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
             {loadingExamsSummary ? (
                 <SkeletonLoader type="card" count={6} />
             ) : examsSummaryError ? (
                 <div className="col-span-full py-12 text-center bg-white border border-dashed border-red-200 rounded-xl text-red-600">
                     Failed to load papers. Please retry.
                 </div>
             ) : filteredExams.length === 0 ? (
                 <div className="col-span-full py-12 text-center bg-white border border-dashed border-gray-200 rounded-xl text-gray-400">
                     No exams found in this category.
                 </div>
             ) : (
                 filteredExams.map((exam: ExamSummary) => {
                     const isLocked = subscription === 'FREE' && exam.isPremium;
                     const isCompleted = completedExamIds.has(exam.id);
                     return (
                        <div 
                            key={exam.id}
                            onMouseEnter={() => queryClient.prefetchQuery({ queryKey: examDetailKey(exam.id), queryFn: () => getExamDetail(exam.id) })}
                            onFocus={() => queryClient.prefetchQuery({ queryKey: examDetailKey(exam.id), queryFn: () => getExamDetail(exam.id) })}
                            onClick={() => {
                              if (isLocked) return;
                              // Prioritize detail load for clicked exam
                              queryClient.fetchQuery({ queryKey: examDetailKey(exam.id), queryFn: () => getExamDetail(exam.id) });
                              navigate(`/instructions/${exam.id}`, { state: { examSummary: exam } });
                            }}
                            className={`group bg-white rounded-xl border p-5 transition-all duration-200 relative overflow-hidden flex flex-col justify-between min-h-[160px]
                                ${isLocked 
                                ? 'border-gray-200 opacity-75' 
                                : 'border-gray-200 hover:border-gray-300 hover:shadow-md cursor-pointer'}`}
                        >
                            {!isLocked && <div className="absolute top-0 left-0 w-1 h-full bg-[#8AA624] opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                            
                            {/* Completion Tick in Top Right */}
                            {isCompleted && (
                                <div className="absolute top-3 right-3 bg-[#8AA624] rounded p-1">
                                    <Check size={16} className="text-white" strokeWidth={3} />
                                </div>
                            )}
                            
                            {isLocked && (
                                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center p-4 text-center">
                                    <Shield size={20} className="text-gray-400 mb-2" />
                                        <button 
                                        onClick={(e) => { e.stopPropagation(); handleUpgrade('PRO_MONTHLY'); }}
                                        className="text-xs font-bold bg-[#1F2937] text-white px-3 py-1.5 rounded-lg hover:bg-black transition-colors"
                                    >
                                        Unlock Premium
                                    </button>
                                </div>
                            )}

                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex gap-2 mb-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded">
                                            {exam.examType || 'UCEED'}
                                        </span>
                                        {exam.isPremium && (
                                            <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-1.5 py-0.5 rounded flex items-center font-bold">
                                                <Crown size={10} className="mr-1"/> PRO
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#8AA624] transition-colors leading-tight mb-4">
                                    {exam.title}
                                </h3>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-50 pt-3">
                                                                <div className="flex items-center gap-3">
                                                                        <span className="flex items-center"><Clock size={12} className="mr-1"/> {exam.durationMinutes}m</span>
                                                                        {/* Sections count deferred to detail load; avoid blocking */}
                                                                </div>
                                <span className="font-bold text-gray-900 group-hover:translate-x-1 transition-transform flex items-center">
                                    Start <ChevronRight size={12} className="ml-1"/>
                                </span>
                            </div>

                                                        {latestSubmissions[exam.id] && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewResult(latestSubmissions[exam.id].id, exam.id);
                                }}
                                className="mt-3 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded-lg px-3 py-2 w-full hover:bg-blue-100 transition-colors"
                              >
                                View result & solutions (24h)
                                {latestSubmissions[exam.id].expiresAt && (
                                  <span className="block text-[10px] font-medium text-blue-500 mt-1">Expires {new Date(latestSubmissions[exam.id].expiresAt as string).toLocaleString()}</span>
                                )}
                              </button>
                            )}
                        </div>
                     );
                 })
             )}
         </div>
      </div>
  );
  
  const renderSettingsContent = () => {
     switch (activeTab) {
        case 'SETTINGS':
           return (
              <div className="space-y-6">
                  <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Account Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Full Name</label>
                              <input 
                                  type="text" 
                                  value={editForm.fullName}
                                  onChange={(e) => setEditForm({...editForm, fullName: e.target.value})}
                                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1F2937] bg-white text-gray-900"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Age</label>
                              <input 
                                  type="number" 
                                  value={editForm.age}
                                  onChange={(e) => setEditForm({...editForm, age: e.target.value})}
                                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1F2937] bg-white text-gray-900"
                              />
                          </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                          <button 
                            onClick={handleProfileSave}
                            disabled={savingProfile}
                            className="bg-[#1F2937] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-black transition-colors disabled:opacity-50"
                          >
                            {savingProfile ? 'Saving...' : 'Save Changes'}
                          </button>
                      </div>
                  </div>
                  
                  <div className="border-t border-gray-100 pt-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Preferences</h3>
                      <div className="space-y-3">
                         <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                             <div className="flex items-center gap-3">
                                 <Moon size={18} className="text-gray-600"/>
                                 <span className="text-sm font-medium text-gray-700">Dark Mode</span>
                             </div>
                             <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                                <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition"/>
                             </div>
                         </div>
                      </div>
                  </div>
              </div>
           );
        
        case 'ANALYTICS':
            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 rounded-xl">
                            <div className="text-sm text-blue-600 font-bold mb-1">Average Score</div>
                            <div className="text-2xl font-bold text-gray-900">
                                {attempts.length > 0 ? (attempts.reduce((a,b) => a + (b.score || 0), 0) / attempts.length).toFixed(1) : 0}
                            </div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-xl">
                            <div className="text-sm text-green-600 font-bold mb-1">Highest Accuracy</div>
                            <div className="text-2xl font-bold text-gray-900">
                                {Math.round(stats.bestAccuracy)}%
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Attempts</h3>
                        {loadingAttempts ? <SkeletonLoader type="table" count={3} /> : (
                            attempts.length === 0 ? (
                                <p className="text-gray-500 text-sm">No attempts yet. Start practicing!</p>
                            ) : (
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-500 font-bold">
                                            <tr>
                                                <th className="px-4 py-3">Exam</th>
                                                <th className="px-4 py-3">Date</th>
                                                <th className="px-4 py-3">Score</th>
                                                <th className="px-4 py-3">Accuracy</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {attempts.slice(0, 5).map(attempt => (
                                                <tr key={attempt.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-medium text-gray-900">{attempt.paper_title || 'Unknown Paper'}</td>
                                                    <td className="px-4 py-3 text-gray-500">{new Date(attempt.created_at).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3 font-bold">{attempt.score.toFixed(1)}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${attempt.accuracy >= 70 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                            {Math.round(attempt.accuracy)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        )}
                    </div>
                </div>
            );
        
        case 'PROFILE':
             return (
                 <div className="text-center py-8">
                     <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto flex items-center justify-center text-gray-400 mb-4">
                         <User size={48} />
                     </div>
                     <h2 className="text-2xl font-bold text-gray-900">{studentDetails.name}</h2>
                     <p className="text-gray-500 mb-6">{studentDetails.email}</p>
                     
                     <div className="inline-flex gap-4 text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-200">
                         <div className="text-center px-4 border-r border-gray-200">
                             <div className="font-bold text-gray-900">{stats.totalTests}</div>
                             <div>Tests</div>
                         </div>
                         <div className="text-center px-4 border-r border-gray-200">
                             <div className="font-bold text-gray-900">{streak}</div>
                             <div>Streak</div>
                         </div>
                         <div className="text-center px-4">
                             <div className="font-bold text-gray-900">{subscription === 'FREE' ? 'Free' : 'Pro'}</div>
                             <div>Plan</div>
                         </div>
                     </div>
                 </div>
             );

        default:
            return <div className="text-gray-500 text-center py-10">Select a tab to view details.</div>;
     }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans text-[#111827]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-9">
                {renderGreeting()}
                {renderExamList()}
            </div>

            <div className="lg:col-span-3 hidden lg:block">
                {renderStatsSidebar()}
            </div>
        </div>
      </div>

            <div className="border-t border-gray-200 bg-white/70 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-sm text-gray-700">
                    <div className="space-y-1">
                        <div className="font-semibold text-gray-900">Need help or have queries?</div>
                        <div className="text-gray-600">We typically respond within 24 hours on weekdays.</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={handleCopySupportEmail}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white shadow-sm hover:border-[#1F2937] hover:text-[#1F2937] transition-all"
                            title="Click to copy our support email"
                        >
                            <span className="font-semibold">crinspire.help@gmail.com</span>
                            <span className="text-xs text-gray-500">{copiedEmail ? 'Copied!' : 'Tap to copy'}</span>
                        </button>
                    </div>
                </div>
            </div>

      {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
                  
                  <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
                      <div className="p-6 border-b border-gray-200">
                          <h2 className="text-xl font-bold text-gray-900 flex items-center">
                              <Settings size={20} className="mr-2"/> Panel
                          </h2>
                      </div>
                      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                          {[
                              { id: 'SETTINGS', icon: Settings, label: 'Settings' },
                              { id: 'ANALYTICS', icon: BarChart2, label: 'Analytics' },
                              { id: 'PROFILE', icon: User, label: 'Profile' },
                              { id: 'NOTIFICATIONS', icon: Bell, label: 'Notifications' },
                              { id: 'HELP', icon: HelpCircle, label: 'Help & Support' }
                          ].map(tab => (
                              <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as SettingsTab)}
                                className={`w-full flex items-center px-4 py-3 text-sm font-bold rounded-lg transition-colors ${
                                    activeTab === tab.id 
                                    ? 'bg-[#1F2937] text-white' 
                                    : 'text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                  <tab.icon size={18} className="mr-3"/> {tab.label}
                              </button>
                          ))}
                      </nav>
                  </div>

                  <div className="flex-1 flex flex-col bg-white">
                      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                          <h3 className="text-lg font-bold text-gray-800">
                              {activeTab.charAt(0) + activeTab.slice(1).toLowerCase()}
                          </h3>
                          <button 
                             onClick={() => setIsSettingsOpen(false)}
                             className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                          >
                              <X size={20}/>
                          </button>
                      </div>
                      <div className="flex-1 p-8 overflow-y-auto">
                          {renderSettingsContent()}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ProfileDashboard;