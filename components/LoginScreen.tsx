import React, { useState, useEffect } from 'react';
import { Lock, Mail, User, BookOpen, Calendar, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { authenticateInstructor } from '../utils/adminAuth';
import { useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { upsertProfileFromClient } from '../utils/profile';


const LoginScreen: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { handleInstructorLogin, handleStudentLogin } = useOutletContext<any>();
  
    const [activeTab, setActiveTab] = useState<'STUDENT' | 'INSTRUCTOR'>('STUDENT');
    const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>(() => {
      // Check if location.state has authMode set to REGISTER
      const state = location.state as any;
      return state?.authMode === 'REGISTER' ? 'REGISTER' : 'LOGIN';
    });

    // Recovery session fallback banner
    const [recoveryActive, setRecoveryActive] = useState(false);

    useEffect(() => {
        // Detect recovery from query param
        try {
            const params = new URLSearchParams(location.search);
            if (params.get('type') === 'recovery') {
                setRecoveryActive(true);
                return;
            }
        } catch {}

        // Or detect if Supabase has a temporary session
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            // If we have a session but arrived via reset flow, advise update
            if (session && session.user) {
                // Supabase does not expose event here, so keep banner optional
                // Show if recent URL contained recovery once (defensive):
                const cameFromAuthCallback = document.referrer.includes('/auth/callback');
                if (cameFromAuthCallback) setRecoveryActive(true);
            }
        })();
    }, [location.search]);

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
            const result = await authenticateInstructor(iEmail, iPassword);
      
            if (result.success && result.isAdmin) {
                handleInstructorLogin();
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

        // Get the correct email based on active tab
        let email = '';
        if (activeTab === 'INSTRUCTOR') {
            email = iForgotEmail.trim();
        } else {
            email = sForgotEmail.trim();
        }
    
        if (!email) {
            setError('Please enter your email address');
            setLoading(false);
            return;
        }

        try {
            const redirectTo = import.meta.env.DEV
                ? 'http://localhost:3004/auth/callback'
                : 'https://www.crinspire.com/auth/callback';

            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo
            });

            if (resetError) {
                setError(resetError.message);
            } else {
                setSuccessMsg('Password reset link sent! Check your email (and spam folder).');
        
                // Clear email and reset mode after 2 seconds
                setTimeout(() => {
                    setAuthMode('LOGIN');
                    if (activeTab === 'INSTRUCTOR') {
                        setIForgotEmail('');
                    } else {
                        setSForgotEmail('');
                    }
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
                if (data && data.user) {
                    // Fill profile details (email, full_name, age)
                    await upsertProfileFromClient(data.user);
                    setSuccessMsg("✅ Registration successful! Check your email (and spam folder) to verify your account, then you can login.");
                    setAuthMode('LOGIN');
                    // Clear form
                    setSName('');
                    setSEmail('');
                    setSAge('');
                    setSPassword('');
                    setSConfirmPass('');
                } else {
                    setSuccessMsg('✅ Registration successful! Check your email (and spam folder) to verify your account, then you can login.');
                    setAuthMode('LOGIN');
                }
            }
        } else {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: sEmail,
                password: sPassword
            });

            if (signInError) {
                setError(signInError.message);
            } else if (data.user) {
                // Update profile on successful login, too (email/full_name/age)
                await upsertProfileFromClient(data.user);
                const name = data.user.user_metadata.full_name || 'Student';
                const age = data.user.user_metadata.age || '';
                handleStudentLogin({ name, email: sEmail, age });
            }
        }
        setLoading(false);
    };

    // Determine which form to show
    const showInstructorForm = activeTab === 'INSTRUCTOR';
    const showForgotPasswordForm = authMode === 'FORGOT_PASSWORD';
    const showRegisterForm = authMode === 'REGISTER' && !showInstructorForm;

    return (
        <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center p-4 font-sans">
            <div className="bg-white rounded-xl shadow-md border border-[#E5E7EB] w-full max-w-md overflow-hidden">
        
                {/* Tab Header */}
                <div className="flex border-b border-[#E5E7EB]">
                    <button 
                        onClick={() => { setActiveTab('STUDENT'); clearErrors(); setAuthMode('LOGIN'); }}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center transition-colors ${activeTab === 'STUDENT' ? 'bg-white text-[#1F2937] border-b-2 border-[#1F2937]' : 'bg-[#F9FAFB] text-[#6B7280] hover:text-[#1F2937]'}`}
                    >
                        <User size={16} className="mr-2"/> Candidate
                    </button>
                    <button 
                        onClick={() => { setActiveTab('INSTRUCTOR'); clearErrors(); setAuthMode('LOGIN'); }}
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
                            {showForgotPasswordForm
                                ? 'Reset Password'
                                : activeTab === 'STUDENT'
                                    ? (authMode === 'LOGIN' ? 'Welcome Back' : 'Create Account')
                                    : 'Instructor Access'
                            }
                        </h1>
                        <p className="text-[#6B7280] mt-2 text-sm">
                            {showForgotPasswordForm
                                ? 'Enter your email to receive a password reset link'
                                : authMode === 'LOGIN'
                                    ? (activeTab === 'STUDENT' ? 'Login to continue your exam preparation' : 'Manage exams and settings')
                                    : 'Register to start taking mock exams'
                            }
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded text-[#EF4444] text-sm text-center font-medium animate-pulse">
                            {error}
                        </div>
                    )}
                    {recoveryActive && (
                        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            You have an active password recovery session.
                            <button
                                onClick={() => navigate('/update-password')}
                                className="ml-2 inline-flex items-center rounded bg-black px-3 py-1 text-white"
                            >
                                Set new password
                            </button>
                        </div>
                    )}
                    {successMsg && (
                        <div className="mb-6 p-3 bg-green-50 border border-green-100 rounded text-[#10B981] text-sm text-center font-medium">
                            {successMsg}
                        </div>
                    )}

                    {/* FORGOT PASSWORD FORM (both tabs) */}
                    {showForgotPasswordForm ? (
                        <form onSubmit={handleForgotPassword} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-[#374151] uppercase mb-2">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF]" size={18} />
                                    <input
                                        type="email"
                                        value={activeTab === 'INSTRUCTOR' ? iForgotEmail : sForgotEmail}
                                        onChange={(e) => {
                                            if (activeTab === 'INSTRUCTOR') {
                                                setIForgotEmail(e.target.value.trim());
                                            } else {
                                                setSForgotEmail(e.target.value.trim());
                                            }
                                        }}
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
                                        setSForgotEmail('');
                                        clearErrors();
                                    }}
                                    className="text-[#1F2937] hover:underline font-medium"
                                >
                                    ← Back to Login
                                </button>
                            </div>
                        </form>
                    ) : showInstructorForm ? (
                        // INSTRUCTOR LOGIN/FORGOT PASSWORD
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
                    ) : (
                        // STUDENT LOGIN/REGISTER
                        <form onSubmit={handleStudentAuth} className="space-y-4">
                            {showRegisterForm && (
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

                            {showRegisterForm && (
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
                                {loading ? 'Processing...' : (authMode === 'LOGIN' ? 'Login' : 'Register Now')} 
                                <ArrowRight size={16} className="ml-2"/>
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
                    )}

                    <div className="mt-8 pt-6 border-t border-[#F3F4F6] text-center">
                        <button onClick={() => navigate('/')} className="text-sm font-medium text-[#6B7280] hover:text-[#1F2937] flex items-center justify-center mx-auto transition-colors">
                            <ArrowLeft size={16} className="mr-1" /> Back to Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;