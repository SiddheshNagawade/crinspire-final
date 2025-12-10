import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, Crown,
  CheckCircle, 
  Search, Filter, ArrowUp, ArrowDown,
  Settings, Moon, Bell, Shield, 
  ChevronRight, X,
  BookOpen, Clock, ArrowDownUp, HelpCircle,
  BarChart2, Flame, Target
} from 'lucide-react';
import { ExamPaper, UserAttempt } from '../types';
import { supabase } from '../supabaseClient';
import SkeletonLoader from './SkeletonLoader';
import { useOutletContext, useNavigate } from 'react-router-dom';

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
  const { studentDetails, exams, subscription, startExamFlow, handleUpgrade, handleProfileUpdate } = useOutletContext<any>();

  const [attempts, setAttempts] = useState<UserAttempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(true);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('SETTINGS');

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');

  const [editForm, setEditForm] = useState({ fullName: studentDetails.name, age: studentDetails.age || '' });
  const [savingProfile, setSavingProfile] = useState(false);

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

    let streak = 0;
    if (attempts.length > 0) {
        const dates = Array.from(new Set(attempts.map(a => new Date(a.created_at).toDateString())));
        streak = dates.length; 
    }

    return { totalTests, bestAccuracy, streak };
  }, [attempts]);

  const availableCategories = ['ALL', ...Array.from(new Set((exams || []).map((e: ExamPaper) => e.examType || 'UCEED')))];
  
  const filteredExams = useMemo(() => {
      let filtered = exams || [];
      if (selectedCategory !== 'ALL') {
          filtered = filtered.filter((e: ExamPaper) => e.examType === selectedCategory);
      }
      return filtered.sort((a: ExamPaper, b: ExamPaper) => {
          if (sortOrder === 'NEWEST') return b.year - a.year;
          return a.year - b.year;
      });
  }, [exams, selectedCategory, sortOrder]);

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
            value={stats.streak} 
            sub="Keep it up!"
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

         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
             {filteredExams.length === 0 ? (
                 <div className="col-span-full py-12 text-center bg-white border border-dashed border-gray-200 rounded-xl text-gray-400">
                     No exams found in this category.
                 </div>
             ) : (
                 filteredExams.map((exam: ExamPaper) => {
                     const isLocked = subscription === 'FREE' && exam.isPremium;
                     return (
                        <div 
                            key={exam.id}
                            onClick={() => !isLocked && startExamFlow(exam.id)}
                            className={`group bg-white rounded-xl border p-5 transition-all duration-200 relative overflow-hidden flex flex-col justify-between min-h-[160px]
                                ${isLocked 
                                ? 'border-gray-200 opacity-75' 
                                : 'border-gray-200 hover:border-gray-300 hover:shadow-md cursor-pointer'}`}
                        >
                            {!isLocked && <div className="absolute top-0 left-0 w-1 h-full bg-[#8AA624] opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                            
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
                                    <span className="flex items-center"><Shield size={12} className="mr-1"/> {exam.sections.length} Sec</span>
                                </div>
                                <span className="font-bold text-gray-900 group-hover:translate-x-1 transition-transform flex items-center">
                                    Start <ChevronRight size={12} className="ml-1"/>
                                </span>
                            </div>
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
                             <div className="font-bold text-gray-900">{stats.streak}</div>
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