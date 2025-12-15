import React, { useState } from 'react';
import { Lock, Mail, User, BookOpen, Calendar, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from './supabaseClient';
import { authenticateInstructor } from './utils/adminAuth';

interface Props {
  onInstructorLogin: () => void;
  onStudentLogin: (details: { name: string; email: string; age?: string }) => void;
  onGuestAccess: () => void;
}

const LoginScreen: React.FC<Props> = ({ onInstructorLogin, onStudentLogin, onGuestAccess }) => {
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'INSTRUCTOR'>('STUDENT');
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>('LOGIN');

  // Instructor State
  const [iEmail, setIEmail] = useState('');
  const [iPassword, setIPassword] = useState('');
  const [iForgotEmail, setIForgotEmail] = useState('');
  
  // Student State
  const [sName, setSName] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sAge, setSAge] = useState('');
  const [sPassword, setSPassword] = useState('');
  const [sConfirmPass, setSConfirmPass] = useState('');
  const [sForgotEmail, setSForgotEmail] = useState('');
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const clearErrors = () => {
    setError('');
    setSuccessMsg('');
  };

  const handleInstructorLoginLogic = async (e: React.FormEvent) => {
      e.preventDefault();
      clearErrors();
      setLoading(true);
      
      try {
        // Use the secure admin authentication that checks admin_whitelist
        const result = await authenticateInstructor(iEmail, iPassword);
        
        if (result.success && result.isAdmin) {
          onInstructorLogin();
        } else {
          setError(result.error || 'Authentication failed');
        }
      } catch (error: any) {
        setError(error.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      clearErrors();
      setLoading(true);

      const email = activeTab === 'INSTRUCTOR' ? iForgotEmail : sForgotEmail;
      
      if (!email) {
          setError('Please enter your email address');
          setLoading(false);
          return;
      }

      try {
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/reset-password`
          });

          if (resetError) {
              setError(resetError.message);
          } else {
              setSuccessMsg('Password reset link sent! Check your email.');
              setTimeout(() => {
                  setAuthMode('LOGIN');
                  if (activeTab === 'INSTRUCTOR') setIForgotEmail('');
                  else setSForgotEmail('');
              }, 2000);
          }
      } catch (error: any) {
          setError(error.message || 'Failed to send reset link');
      } finally {
          setLoading(false);
      }
  };

  const handleStudentAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      clearErrors();
      setLoading(true);

      if (authMode === 'REGISTER') {
          // Registration Logic
          if (!sName || !sEmail || !sAge || !sPassword || !sConfirmPass) {
              setError("All fields are required.");
              setLoading(false);
              return;
          }
          if (sPassword !== sConfirmPass) {
              setError("Passwords do not match.");
              setLoading(false);
              return;
          }

          const { data, error: signUpError } = await supabase.auth.signUp({
              email: sEmail,
              password: sPassword,
              options: {
                  data: {
                      full_name: sName,
                      age: sAge
                  }
              }
          });


          if (signUpError) {
              setError(signUpError.message);
          } else {
              // Registration creates the user in auth.users
              // The handle_new_user trigger creates the profile with name and age
              setSuccessMsg('✅ Registration successful! Check your email to verify your account, then you can login.');
              // Clear form
              setSName('');
              setSEmail('');
              setSAge('');
              setSPassword('');
              setSConfirmPass('');
              setAuthMode('LOGIN');
          }

      } else {
          // Login Logic
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
              email: sEmail,
              password: sPassword
          });

          if (signInError) {
              setError(signInError.message);
          } else if (data.user) {
              // Fetch extra details from metadata or profiles
              const name = data.user.user_metadata.full_name || 'Student';
              const age = data.user.user_metadata.age || '';
              onStudentLogin({ name, email: sEmail, age });
          }
      }
      setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-xl shadow-md border border-[#E5E7EB] w-full max-w-md overflow-hidden">
        
        {/* Tab Header */}
        <div className="flex border-b border-[#E5E7EB]">
            <button 
                onClick={() => { setActiveTab('STUDENT'); clearErrors(); }}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center transition-colors ${activeTab === 'STUDENT' ? 'bg-white text-[#1F2937] border-b-2 border-[#1F2937]' : 'bg-[#F9FAFB] text-[#6B7280] hover:text-[#1F2937]'}`}
            >
                <User size={16} className="mr-2"/> Candidate
            </button>
            <button 
                onClick={() => { setActiveTab('INSTRUCTOR'); clearErrors(); }}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center transition-colors ${activeTab === 'INSTRUCTOR' ? 'bg-white text-[#1F2937] border-b-2 border-[#1F2937]' : 'bg-[#F9FAFB] text-[#6B7280] hover:text-[#1F2937]'}`}
            >
                <Lock size={16} className="mr-2"/> Instructor
            </button>
        </div>

        <div className="p-8">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#F9FAFB] rounded-full border border-[#E5E7EB] flex items-center justify-center mx-auto mb-4 text-[#1F2937]">
                    {activeTab === 'STUDENT' ? <BookOpen size={28} /> : <Lock size={28} />}
                </div>
                <h1 className="text-2xl font-bold text-[#111827]">
                    {activeTab === 'STUDENT' ? (authMode === 'LOGIN' ? 'Welcome Back' : authMode === 'FORGOT_PASSWORD' ? 'Reset Password' : 'Create Account') : (authMode === 'FORGOT_PASSWORD' ? 'Reset Password' : 'Instructor Access')}
                </h1>
                <p className="text-[#6B7280] mt-2 text-sm">
                    {authMode === 'FORGOT_PASSWORD'
                        ? 'Enter your email to receive a password reset link'
                        : activeTab === 'STUDENT' 
                        ? (authMode === 'LOGIN' ? 'Login to continue your exam preparation' : 'Register to start taking mock exams') 
                        : 'Manage exams and settings'}
                </p>
            </div>

            {error && (
                <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded text-[#EF4444] text-sm text-center font-medium animate-pulse">
                    {error}
                </div>
            )}
            
            {successMsg && (
                <div className="mb-6 p-3 bg-green-50 border border-green-100 rounded text-[#10B981] text-sm text-center font-medium">
                    {successMsg}
                </div>
            )}

            {/* INSTRUCTOR TAB */}
            {activeTab === 'INSTRUCTOR' ? (
                authMode === 'FORGOT_PASSWORD' ? (
                    // INSTRUCTOR FORGOT PASSWORD FORM
                    <form onSubmit={handleForgotPassword} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-[#374151] uppercase mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF]" size={18} />
                                <input
                                type="email"
                                value={iForgotEmail}
                                onChange={(e) => setIForgotEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1F2937] focus:ring-1 focus:ring-[#1F2937] text-[#1F2937] bg-white transition-all placeholder-gray-400"
                                placeholder="name@example.com"
                                required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#1F2937] text-white font-bold py-3.5 rounded-lg hover:bg-[#0F1419] transition-all shadow-md active:transform active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>

                        <div className="mt-4 text-center text-sm">
                            <button 
                                type="button"
                                onClick={() => {
                                    setAuthMode('LOGIN');
                                    setIForgotEmail('');
                                    clearErrors();
                                }}
                                className="text-[#1F2937] hover:underline font-medium"
                            >
                                ← Back to Login
                            </button>
                        </div>
                    </form>
                ) : (
                    // INSTRUCTOR LOGIN FORM
                    <form onSubmit={handleInstructorLoginLogic} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-[#374151] uppercase mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF]" size={18} />
                                <input
                                type="email"
                                value={iEmail}
                                onChange={(e) => setIEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1F2937] focus:ring-1 focus:ring-[#1F2937] text-[#1F2937] bg-white transition-all placeholder-gray-400"
                                placeholder="name@example.com"
                                required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[#374151] uppercase mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF]" size={18} />
                                <input
                                type="password"
                                value={iPassword}
                                onChange={(e) => setIPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1F2937] focus:ring-1 focus:ring-[#1F2937] text-[#1F2937] bg-white transition-all placeholder-gray-400"
                                placeholder="••••••••"
                                required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#1F2937] text-white font-bold py-3.5 rounded-lg hover:bg-[#0F1419] transition-all shadow-md active:transform active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? 'Signing In...' : 'Sign In'}
                        </button>

                        <div className="mt-4 text-center text-sm">
                            <button 
                                type="button"
                                onClick={() => {
                                    setAuthMode('FORGOT_PASSWORD');
                                    clearErrors();
                                }}
                                className="text-[#6B7280] hover:text-[#1F2937] font-medium"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    </form>
                )
            ) : (
                // STUDENT TAB
                authMode === 'FORGOT_PASSWORD' ? (
                    // STUDENT FORGOT PASSWORD FORM
                    <form onSubmit={handleForgotPassword} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-[#374151] uppercase mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF]" size={18} />
                                <input
                                type="email"
                                value={sForgotEmail}
                                onChange={(e) => setSForgotEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1F2937] focus:ring-1 focus:ring-[#1F2937] text-[#1F2937] bg-white transition-all placeholder-gray-400"
                                placeholder="name@example.com"
                                required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#1F2937] text-white font-bold py-3.5 rounded-lg hover:bg-[#0F1419] transition-all shadow-md active:transform active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>

                        <div className="mt-4 text-center text-sm">
                            <button 
                                type="button"
                                onClick={() => {
                                    setAuthMode('LOGIN');
                                    setSForgotEmail('');
                                    clearErrors();
                                }}
                                className="text-[#1F2937] hover:underline font-medium"
                            >
                                ← Back to Login
                            </button>
                        </div>
                    </form>
                ) : (
                    // STUDENT LOGIN/REGISTER FORM
                    <form onSubmit={handleStudentAuth} className="space-y-4">
                        {authMode === 'REGISTER' && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-[#374151] uppercase mb-2">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF]" size={18} />
                                        <input
                                        type="text"
                                        value={sName}
                                        onChange={(e) => setSName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1F2937] focus:ring-1 focus:ring-[#1F2937] text-[#1F2937] bg-white transition-all placeholder-gray-400"
                                        placeholder="John Doe"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#374151] uppercase mb-2">Age</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF]" size={18} />
                                        <input
                                        type="number"
                                        value={sAge}
                                        onChange={(e) => setSAge(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1F2937] focus:ring-1 focus:ring-[#1F2937] text-[#1F2937] bg-white transition-all placeholder-gray-400"
                                        placeholder="e.g. 18"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-[#374151] uppercase mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF]" size={18} />
                                <input
                                type="email"
                                value={sEmail}
                                onChange={(e) => setSEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1F2937] focus:ring-1 focus:ring-[#1F2937] text-[#1F2937] bg-white transition-all placeholder-gray-400"
                                placeholder="name@example.com"
                                required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[#374151] uppercase mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF]" size={18} />
                                <input
                                type="password"
                                value={sPassword}
                                onChange={(e) => setSPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1F2937] focus:ring-1 focus:ring-[#1F2937] text-[#1F2937] bg-white transition-all placeholder-gray-400"
                                placeholder="••••••••"
                                required
                                />
                            </div>
                        </div>

                        {authMode === 'REGISTER' && (
                            <div>
                                <label className="block text-xs font-bold text-[#374151] uppercase mb-2">Re-enter Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF]" size={18} />
                                    <input
                                    type="password"
                                    value={sConfirmPass}
                                    onChange={(e) => setSConfirmPass(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1F2937] focus:ring-1 focus:ring-[#1F2937] text-[#1F2937] bg-white transition-all placeholder-gray-400"
                                    placeholder="••••••••"
                                    required
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#1F2937] text-white font-bold py-3.5 rounded-lg hover:bg-[#0F1419] transition-all shadow-md active:transform active:scale-[0.98] mt-2 flex items-center justify-center disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : (authMode === 'LOGIN' ? 'Login' : 'Register Now')} <ArrowRight size={16} className="ml-2"/>
                        </button>

                        {authMode === 'LOGIN' && (
                            <div className="mt-2 text-center text-sm">
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setAuthMode('FORGOT_PASSWORD');
                                        clearErrors();
                                    }}
                                    className="text-[#6B7280] hover:text-[#1F2937] font-medium"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        )}

                        <div className="mt-6 text-center text-sm">
                            <span className="text-[#6B7280]">
                                {authMode === 'LOGIN' ? "Don't have an account?" : "Already have an account?"}
                            </span>
                            <button 
                                type="button"
                                onClick={() => {
                                    setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN');
                                    clearErrors();
                                }}
                                className="ml-2 font-bold text-[#1F2937] hover:underline"
                            >
                                {authMode === 'LOGIN' ? 'Register' : 'Login'}
                            </button>
                        </div>
                    </form>
                )
            )}

            <div className="mt-8 pt-6 border-t border-[#F3F4F6] text-center">
                <button onClick={onGuestAccess} className="text-sm font-medium text-[#6B7280] hover:text-[#1F2937] flex items-center justify-center mx-auto transition-colors">
                    <ArrowLeft size={16} className="mr-1" /> Back to Home
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
