import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Clock, BarChart2, Layers, CheckCircle, ArrowRight, Shield, 
  Zap, Users, Award, Star, ChevronDown, MessageCircle, HelpCircle 
} from 'lucide-react';
import CrinspireLogo from './CrinspireLogo';
import { useNavigate, useOutletContext } from 'react-router-dom';

const JumbledText = ({ text, trigger }: { text: string, trigger: boolean }) => {
  const [displayChars, setDisplayChars] = useState(text.split('').map((char, i) => ({
    char,
    x: Math.random() * 100 - 50,
    y: Math.random() * 100 - 50,
    r: Math.random() * 360,
    o: 0
  })));

  useEffect(() => {
    if (trigger) {
      setTimeout(() => {
        setDisplayChars(text.split('').map(char => ({ char, x: 0, y: 0, r: 0, o: 1 })));
      }, 100);
    }
  }, [trigger, text]);

  return (
    <span className="inline-block">
      {displayChars.map((c, i) => (
        <span 
          key={i} 
          className="inline-block transition-all duration-1000 ease-out"
          style={{ 
            transform: `translate(${c.x}px, ${c.y}px) rotate(${c.r}deg)`, 
            opacity: c.o,
            width: c.char === ' ' ? '0.5em' : 'auto' 
          }}
        >
          {c.char}
        </span>
      ))}
    </span>
  );
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const context = useOutletContext<any>();
  const [activeFaqIndex, setActiveFaqIndex] = useState<number>(0);
  const [mounted, setMounted] = useState(false);
  
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const [howItWorksVisible, setHowItWorksVisible] = useState(false);

  const onLogin = () => navigate('/login');
  const onSignUp = () => navigate('/login', { state: { authMode: 'REGISTER' } });
  const onPricing = () => navigate('/pricing');
  const onGetStarted = () => navigate('/login');
  const onDashboard = () => {
    if (context?.isAuthenticatedStudent) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const faqs = [
      { q: "Is Crinspire Simulator free?", a: "Yes! You can sign up and attempt starter papers completely for free. We also offer premium plans for access to all previous year papers and advanced analytics." },
      { q: "Can I attempt papers on Mobile?", a: "Yes, you can access the platform on mobile, but we strongly recommend using a Desktop or Laptop to simulate the actual exam interface and layout." },
      { q: "Are the questions authentic?", a: "Absolutely. We source questions directly from official past year papers (UCEED, CEED, NIFT, NID) to ensure you practice with the real standard." },
      { q: "How does the evaluation work?", a: "Our system instantly evaluates NAT (Numerical), MCQ, and MSQ questions upon submission, providing you with an immediate score and accuracy breakdown." },
      { q: "Do you provide solutions?", a: "Yes, detailed solutions are available after submitting the exam for premium users, helping you understand where you went wrong." }
  ];

  useEffect(() => {
    setMounted(true);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHowItWorksVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (howItWorksRef.current) {
      observer.observe(howItWorksRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const customStyles = `
    html {
        scroll-behavior: smooth;
    }
    @keyframes float {
      0% { transform: translateY(0px) rotate(-2deg); }
      50% { transform: translateY(-15px) rotate(-2deg); }
      100% { transform: translateY(0px) rotate(-2deg); }
    }
    @keyframes scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .animate-float-custom {
      animation: float 6s ease-in-out infinite;
    }
    .animate-scroll {
      animation: scroll 30s linear infinite;
    }
    .faq-wheel-container {
      perspective: 1000px;
    }
  `;

  const instituteList = "IIT Bombay • IIT Delhi • IIT Guwahati • IIT Hyderabad • IIT Indore • IIT Roorkee • IIT Kanpur • IIT Jodhpur • IIITDM Jabalpur • ";

  return (
    <div className="min-h-screen bg-white font-sans text-[#111827] overflow-x-hidden">
      <style>{customStyles}</style>

      {/* Navbar - Fixed to top */}
      <nav className="fixed top-0 left-0 w-full bg-white/90 backdrop-blur-md border-b border-[#E5E7EB] z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={onDashboard}>
            <CrinspireLogo className="w-10 h-10 group-hover:scale-105 transition-transform" />
            <h1 className="text-3xl font-bold tracking-tight text-[#1F2937]" style={{ fontFamily: 'Chokokutai' }}>Crinspire</h1>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#4B5563]">
            <a href="#features" className="hover:text-[#8AA624] transition-colors relative group">
                Features
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#8AA624] transition-all group-hover:w-full"></span>
            </a>
            <a href="#how-it-works" className="hover:text-[#8AA624] transition-colors relative group">
                How It Works
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#8AA624] transition-all group-hover:w-full"></span>
            </a>
            <button onClick={onPricing} className="hover:text-[#8AA624] transition-colors relative group">
                Pricing
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#8AA624] transition-all group-hover:w-full"></span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={onLogin}
              className="px-5 py-2.5 text-sm font-bold text-[#1F2937] hover:bg-[#F3F4F6] rounded-lg transition-colors"
            >
              Login
            </button>
            <button 
              onClick={onSignUp}
              className="px-5 py-2.5 text-sm font-bold bg-[#8AA624] text-white rounded-lg hover:bg-[#728a1d] shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* 1. HERO SECTION */}
      <section className="pt-32 pb-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
          
          {/* Left Column (60%) */}
          <div className="lg:col-span-3 flex flex-col items-start justify-center z-10">
            <h1 className="text-5xl md:text-7xl font-extrabold text-[#111827] mb-8 tracking-tight leading-[1.1] text-left">
              Master Design Exams <br />
              <span className="text-[#8AA624] inline-block relative">
                 with Interactive Papers
                 <svg className="absolute w-full h-3 -bottom-1 left-0 text-[#8AA624] opacity-30" viewBox="0 0 200 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.00025 6.99997C25.7509 2.486 132.442 -2.34485 199.964 4.52433" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
              </span>
            </h1>
            
            <p className="text-[#6B7280] text-lg font-medium max-w-xl mb-10 leading-relaxed">
              Experience the actual exam environment before the big day. Practice numericals, multiple select, and multiple choice questions under timed conditions.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4 w-full">
              <button 
                onClick={onGetStarted}
                className="w-full sm:w-auto px-8 py-4 bg-[#8AA624] text-white rounded-xl font-bold text-lg hover:bg-[#728a1d] shadow-lg transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                Start Practicing Free <ArrowRight size={20} />
              </button>
              
              <div className="flex flex-col items-start justify-center h-full pt-2 sm:pt-0 sm:pl-2">
                 <button 
                    onClick={onPricing}
                    className="text-[#1F2937] font-bold hover:text-[#8AA624] transition-colors text-sm flex items-center"
                 >
                    View Pro Plans
                 </button>
                 <span className="text-xs text-[#9CA3AF] mt-1">Join 10,000+ students</span>
              </div>
            </div>
          </div>

          {/* Right Column (40%) - Floating Mockup */}
          <div className="lg:col-span-2 relative hidden lg:block h-[500px]">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-[#F3F4F6] to-[#E5E7EB] rounded-full blur-3xl opacity-50 -z-10"></div>
             
             <div className="absolute inset-0 flex items-center justify-center animate-float-custom">
                <div className="relative w-full aspect-[4/3] bg-white rounded-2xl shadow-2xl border-4 border-[#1F2937] overflow-hidden transform hover:scale-105 transition-transform duration-500">
                   <div className="absolute top-0 w-full h-8 bg-[#1F2937] flex items-center px-4 gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                   </div>
                   <div className="pt-12 px-6 pb-6 h-full bg-gray-50 flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                          <div className="h-4 w-24 bg-gray-200 rounded"></div>
                          <div className="h-8 w-24 bg-red-100 rounded text-red-500 text-xs font-bold flex items-center justify-center">01:59:00</div>
                      </div>
                      <div className="flex-1 flex gap-4">
                          <div className="flex-1 bg-white rounded border border-gray-200 shadow-sm p-4">
                              <div className="h-4 w-3/4 bg-gray-200 rounded mb-4"></div>
                              <div className="h-32 bg-gray-100 rounded mb-4"></div>
                              <div className="space-y-2">
                                  <div className="h-8 w-full bg-gray-50 rounded border border-gray-200"></div>
                                  <div className="h-8 w-full bg-gray-50 rounded border border-gray-200"></div>
                              </div>
                          </div>
                          <div className="w-16 bg-white rounded border border-gray-200 p-2 space-y-2">
                              {[1,2,3,4,5].map(i => <div key={i} className={`h-8 w-full rounded ${i===3 ? 'bg-green-500' : 'bg-gray-100'}`}></div>)}
                          </div>
                      </div>
                   </div>
                </div>
             </div>

             <div className="absolute bottom-10 right-0 animate-float-badge z-20">
                <div className="bg-white px-5 py-3 rounded-xl shadow-xl border border-[#E5E7EB] flex items-center gap-3">
                   <div className="bg-yellow-50 p-2 rounded-full text-yellow-500"><Star size={20} fill="currentColor"/></div>
                   <div>
                      <div className="font-bold text-[#1F2937] leading-none">4.9/5</div>
                      <div className="text-xs text-[#6B7280] mt-1">500+ Reviews</div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* 2. STATS SECTION */}
      <section className="py-16 bg-white border-y border-[#E5E7EB] relative overflow-hidden">
         <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 opacity-5 pointer-events-none whitespace-nowrap z-0">
             <div className="inline-block animate-scroll text-8xl font-black text-gray-900">
                {instituteList} {instituteList}
             </div>
         </div>

         <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
               <div className="text-center opacity-70 scale-90">
                   <div className="text-3xl font-bold text-[#1F2937]">UCEED</div>
                   <div className="text-xs uppercase tracking-wider font-bold text-[#6B7280] mt-1">Entrance Exam</div>
               </div>
               
               <div className="text-center relative transform scale-110 md:scale-125 z-10 px-8 py-4 rounded-2xl bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100">
                   <div className="absolute inset-0 bg-[#8AA624] opacity-5 rounded-2xl blur-lg animate-pulse"></div>
                   <div className="text-5xl font-extrabold text-[#1F2937] relative">
                      10k+
                   </div>
                   <div className="text-sm uppercase tracking-wider font-bold text-[#8AA624] mt-2 relative">Active Students</div>
               </div>

               <div className="text-center opacity-70 scale-90">
                   <div className="text-3xl font-bold text-[#1F2937]">CEED</div>
                   <div className="text-xs uppercase tracking-wider font-bold text-[#6B7280] mt-1">Entrance Exam</div>
               </div>
            </div>
         </div>
      </section>

      {/* 3. FEATURES SECTION */}
      <section id="features" className="py-24 bg-[#F9FAFB] scroll-mt-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1F2937] mb-4">A Powerful Toolkit</h2>
            <p className="text-[#6B7280] text-lg max-w-2xl mx-auto">
              Replicating the exact exam day environment to build your confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <div className="bg-white p-8 rounded-xl border border-[#E5E7EB] hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden h-full">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#8AA624] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                <div className="w-12 h-12 bg-[#F3F4F6] rounded-lg flex items-center justify-center text-[#8AA624] mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                    <Clock size={24} />
                </div>
                <h3 className="text-xl font-bold text-[#1F2937] mb-3">Real-time Timer</h3>
                <p className="text-[#6B7280] leading-relaxed">Experience the pressure of the ticking clock just like the real exam center.</p>
             </div>

             <div className="bg-white p-8 rounded-xl border border-[#E5E7EB] hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden h-full">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#8AA624] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                <div className="w-12 h-12 bg-[#F3F4F6] rounded-lg flex items-center justify-center text-[#8AA624] mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                    <Layers size={24} />
                </div>
                <h3 className="text-xl font-bold text-[#1F2937] mb-3">Exact Interface Replica</h3>
                <p className="text-[#6B7280] leading-relaxed">Don't be surprised on exam day. Our UI matches the official TCS iON interface down to the pixel.</p>
             </div>

             <div className="bg-white p-8 rounded-xl border border-[#E5E7EB] hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden h-full">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#8AA624] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                <div className="w-12 h-12 bg-[#F3F4F6] rounded-lg flex items-center justify-center text-[#8AA624] mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                    <BarChart2 size={24} />
                </div>
                <h3 className="text-xl font-bold text-[#1F2937] mb-3">Deep Analytics</h3>
                <p className="text-[#6B7280] leading-relaxed">Track accuracy, time spent per question, and strong/weak topics.</p>
             </div>

             <div className="bg-white p-8 rounded-xl border border-[#E5E7EB] hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden h-full">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#8AA624] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                <div className="w-12 h-12 bg-[#F3F4F6] rounded-lg flex items-center justify-center text-[#8AA624] mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                    <Shield size={24} />
                </div>
                <h3 className="text-xl font-bold text-[#1F2937] mb-3">Section Logic</h3>
                <p className="text-[#6B7280] leading-relaxed">Practice NAT, MSQ, and MCQ sections with accurate negative marking rules.</p>
             </div>

             <div className="bg-white p-8 rounded-xl border border-[#E5E7EB] hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden h-full opacity-90">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#8AA624] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                <div className="absolute top-4 right-4 bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Coming Soon</div>
                <div className="w-12 h-12 bg-[#F3F4F6] rounded-lg flex items-center justify-center text-[#8AA624] mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                    <Users size={24} />
                </div>
                <h3 className="text-xl font-bold text-[#1F2937] mb-3">Peer Comparison</h3>
                <p className="text-[#6B7280] leading-relaxed">See where you stand against thousands of other aspirants.</p>
             </div>

             <div className="bg-white p-8 rounded-xl border border-[#E5E7EB] hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden h-full opacity-90">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#8AA624] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                <div className="absolute top-4 right-4 bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Coming Soon</div>
                <div className="w-12 h-12 bg-[#F3F4F6] rounded-lg flex items-center justify-center text-[#8AA624] mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                    <Award size={24} />
                </div>
                <h3 className="text-xl font-bold text-[#1F2937] mb-3">Detailed Solutions</h3>
                <p className="text-[#6B7280] leading-relaxed">Step-by-step explanations for every NAT and MSQ problem.</p>
             </div>
          </div>
        </div>
      </section>

      {/* 4. VIDEO SECTION */}
      <section id="video-section" className="py-24 px-6 bg-[#111827] text-white overflow-hidden relative scroll-mt-28">
         <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#8AA624] opacity-5 rounded-full blur-3xl pointer-events-none"></div>

         <div className="max-w-5xl mx-auto relative">
             <div className="w-full relative">
                <div className="relative rounded-xl overflow-hidden border-4 border-[#374151] shadow-2xl aspect-video bg-gray-900 mx-auto">
                     <iframe 
                        className="w-full h-full"
                        src="https://www.youtube.com/embed/U7pDXneas4?autoplay=0&controls=1&rel=0" 
                        title="Crinspire Video Walkthrough"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowFullScreen
                     ></iframe>
                </div>
             </div>
         </div>
      </section>

      {/* 5. HOW IT WORKS - INTERACTIVE ANIMATION */}
      <section id="how-it-works" className="py-32 px-6 bg-white overflow-hidden scroll-mt-28" ref={howItWorksRef}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1F2937] text-center mb-20">
            <JumbledText text="How It Works ?" trigger={howItWorksVisible} />
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            <div className="hidden md:block absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                 <svg className="absolute top-12 left-[15%] w-[25%] h-32" style={{ overflow: 'visible' }}>
                    <path d="M0 0 C 100 0, 100 100, 200 120" fill="none" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="6 4" />
                 </svg>
                 <svg className="absolute top-44 left-[40%] w-[25%] h-32" style={{ overflow: 'visible' }}>
                    <path d="M0 0 C 100 0, 100 100, 200 120" fill="none" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="6 4" />
                 </svg>
                 <svg className="absolute top-80 left-[65%] w-[25%] h-32" style={{ overflow: 'visible' }}>
                    <path d="M0 0 C 100 0, 100 100, 200 120" fill="none" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="6 4" />
                 </svg>
            </div>

            {/* Steps ... */}
            {[
                { icon: Users, color: 'blue', title: "Create Account", desc: "Sign up for free to access starter mock papers." },
                { icon: Layers, color: 'purple', title: "Select Exam", desc: "Choose from UCEED, CEED, NIFT or NID papers." },
                { icon: Play, color: 'yellow', title: "Simulate", desc: "Attempt the paper in a timed, distraction-free environment." },
                { icon: BarChart2, color: 'green', title: "Analyze", desc: "Get instant results and detailed performance metrics." }
            ].map((step, i) => {
                const colors: {[key: string]: string} = { 
                    blue: 'bg-blue-50 text-blue-600', 
                    purple: 'bg-purple-50 text-purple-600', 
                    yellow: 'bg-yellow-50 text-yellow-600', 
                    green: 'bg-green-50 text-green-600' 
                };
                const delay = i * 300;
                const rotate = i % 2 === 0 ? '1deg' : '-1deg';
                const initialY = -50 - (i * 150);

                return (
                    <div 
                        key={i}
                        className={`relative z-10 flex flex-col items-center text-center transition-all duration-1000 ease-out ${i > 0 ? 'mt-12 md:mt-' + (i === 1 ? '24' : i === 2 ? '48' : '72') : ''}`}
                        style={{
                            opacity: howItWorksVisible ? 1 : 0,
                            transform: howItWorksVisible ? `translateY(0) rotate(${rotate})` : `translateY(${initialY}px)`,
                            transitionDelay: `${delay}ms`
                        }}
                    >
                        <div className="w-full bg-white border border-[#E5E7EB] p-8 rounded-2xl shadow-sm relative hover:scale-105 transition-transform">
                            <div className="absolute -top-4 -right-4 w-12 h-12 bg-[#1F2937] text-white rounded-xl flex items-center justify-center font-black text-xl shadow-lg border-4 border-white">{i+1}</div>
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto ${colors[step.color]}`}>
                                <step.icon size={28} fill={step.color === 'yellow' ? 'currentColor' : 'none'} />
                            </div>
                            <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                            <p className="text-sm text-gray-500">{step.desc}</p>
                        </div>
                    </div>
                );
            })}

          </div>
        </div>
      </section>

      {/* 6. BENEFITS SECTION */}
      <section className="py-24 bg-[#F9FAFB] overflow-hidden">
         <div className="max-w-4xl mx-auto px-6 relative flex items-center justify-center">
             <div className="w-full md:w-[70%] z-10 transform hover:-translate-y-2 transition-transform duration-300">
                <div className="bg-white border-2 border-[#10B981] p-8 rounded-2xl shadow-xl">
                   <div className="flex justify-between items-start mb-6">
                       <h3 className="text-3xl font-bold text-[#1F2937]">For Students</h3>
                       <div className="p-3 bg-green-50 rounded-xl text-[#10B981]"><Users size={32} /></div>
                   </div>
                   <ul className="space-y-4">
                      <li className="flex items-start gap-4 text-gray-700 text-lg">
                          <CheckCircle size={24} className="text-[#10B981] mt-1 shrink-0"/> Practice with precision and get exam-ready.
                      </li>
                      <li className="flex items-start gap-4 text-gray-700 text-lg">
                          <CheckCircle size={24} className="text-[#10B981] mt-1 shrink-0"/> Understand weak areas through deep analytics.
                      </li>
                      <li className="flex items-start gap-4 text-gray-700 text-lg">
                          <CheckCircle size={24} className="text-[#10B981] mt-1 shrink-0"/> Build stamina with real 3-hour mock tests.
                      </li>
                   </ul>
                </div>
             </div>
         </div>
      </section>

      {/* 7. FAQ SECTION */}
      <section className="py-20 px-6 bg-[#111827] text-white overflow-hidden relative">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
         <div className="max-w-3xl mx-auto relative z-10">
             <h2 className="text-3xl font-extrabold text-center mb-10 tracking-tight">
                 Common Questions
             </h2>
             
             <div className="h-[600px] flex flex-col items-center justify-center relative w-full">
                 <div className="faq-wheel-container w-full max-w-4xl flex flex-col items-center justify-center relative">
                     {faqs.map((item, idx) => {
                         const offset = idx - activeFaqIndex;
                         const absOffset = Math.abs(offset);
                         const isActive = idx === activeFaqIndex;
                         
                         let styles = "";
                         if (isActive) {
                            styles = "scale-105 opacity-100 z-30 my-2 bg-white text-[#1F2937] shadow-[0_0_35px_rgba(16,185,129,0.3)]";
                         } else if (absOffset === 1) {
                            styles = "scale-100 opacity-80 z-20 my-1 bg-[#374151] text-gray-200 cursor-pointer hover:opacity-100 shadow-sm";
                         } else {
                            styles = "scale-95 opacity-60 z-10 my-0 bg-[#374151] text-gray-300 cursor-pointer hover:opacity-80";
                         }

                         return (
                            <div 
                                key={idx}
                                onMouseEnter={() => setActiveFaqIndex(idx)}
                                className={`w-full rounded-2xl p-6 transition-all duration-300 ease-out transform ${styles}`}
                            >
                                <div className="flex justify-between items-center">
                                    <h3 className={`text-xl font-bold ${isActive ? 'text-[#1F2937]' : 'text-current'}`}>
                                       {item.q}
                                    </h3>
                                    {isActive && <div className="bg-[#10B981] text-white p-1 rounded-full"><CheckCircle size={16}/></div>}
                                </div>
                                
                                <div className={`mt-2 text-base leading-relaxed transition-all duration-300 overflow-hidden ${isActive ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <p className="text-[#4B5563] font-medium border-t border-gray-200 pt-3 text-sm">
                                        {item.a}
                                    </p>
                                </div>
                            </div>
                         )
                     })}
                 </div>
             </div>
         </div>
      </section>

      {/* 8. FINAL CTA */}
      <section className="py-24 px-6 bg-white text-[#1F2937] relative overflow-hidden border-t border-gray-100">
        <div className="max-w-4xl mx-auto relative z-10 text-center">
               <h2 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
                   Ready to Build Your <br />
                   <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1F2937] to-[#4B5563]">Future?</span>
               </h2>
               <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto">
                 Join thousands of designers who trust Crinspire. Start for free today.
               </p>
               
               <div className="flex flex-col sm:flex-row gap-4 justify-center">
                   <button onClick={onSignUp} className="group px-8 py-4 bg-[#1F2937] text-white rounded-xl font-bold text-lg hover:bg-[#000] transition-colors flex items-center justify-center shadow-lg hover:shadow-xl hover:-translate-y-1">
                      Sign Up Now 
                      <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20}/>
                   </button>
                   <button onClick={onPricing} className="px-8 py-4 bg-white border-2 border-[#E5E7EB] text-[#1F2937] rounded-xl font-bold text-lg hover:bg-gray-50 hover:border-[#D1D5DB] transition-all">
                      Explore Features
                   </button>
               </div>
        </div>
      </section>
      
      {/* 9. FOOTER */}
      <footer className="bg-white border-t border-[#E5E7EB] pt-16 pb-8 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-8">
            <div className="lg:col-span-2 space-y-6 relative">
                <div className="absolute top-0 left-0 w-12 h-1 bg-[#1F2937]"></div>
                <div className="pt-4">
                    <div className="flex items-center gap-2 mb-4">
                        <CrinspireLogo className="w-8 h-8 text-[#1F2937]" />
                        <span className="font-bold text-xl text-[#1F2937]" style={{ fontFamily: 'Chokokutai' }}>Crinspire</span>
                    </div>
                    <p className="text-gray-500 max-w-sm">
                        Platform for design entrance exam preparation. We help you simulate, analyze, and conquer.
                    </p>
                    <div className="flex gap-4 pt-2">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-[#1F2937] hover:text-white transition-colors cursor-pointer"><MessageCircle size={18}/></div>
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-[#1F2937] hover:text-white transition-colors cursor-pointer"><CheckCircle size={18}/></div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-8">
                <div>
                    <h4 className="font-bold text-[#1F2937] mb-6">Product</h4>
                    <ul className="space-y-3 text-sm text-[#6B7280]">
                        <li><a href="#" className="hover:text-[#8AA624] transition-colors">Features</a></li>
                        <li><a href="#" className="hover:text-[#8AA624] transition-colors">Pricing</a></li>
                        <li><a href="#" className="hover:text-[#8AA624] transition-colors">Testimonials</a></li>
                        <li><a href="#" className="hover:text-[#8AA624] transition-colors">FAQ</a></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold text-[#1F2937] mb-6">Resources</h4>
                    <ul className="space-y-3 text-sm text-[#6B7280]">
                        <li><a href="#" className="hover:text-[#8AA624] transition-colors">Blog</a></li>
                        <li><a href="#" className="hover:text-[#8AA624] transition-colors">Help Center</a></li>
                        <li><a href="#" className="hover:text-[#8AA624] transition-colors">Syllabus</a></li>
                        <li><a href="#" className="hover:text-[#8AA624] transition-colors">Past Papers</a></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold text-[#1F2937] mb-6">Legal</h4>
                    <ul className="space-y-3 text-sm text-[#6B7280]">
                        <li><a href="#" className="hover:text-[#8AA624] transition-colors">Privacy</a></li>
                        <li><a href="#" className="hover:text-[#8AA624] transition-colors">Terms</a></li>
                        <li><a href="#" className="hover:text-[#8AA624] transition-colors">Cookie Policy</a></li>
                    </ul>
                </div>
            </div>
        </div>
        
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-[#E5E7EB] flex flex-col md:flex-row justify-between items-center text-xs text-[#9CA3AF]">
            <div>© 2024 Crinspire. All rights reserved.</div>
            <div className="mt-2 md:mt-0 flex gap-6">
                <span>Made for Designers</span>
                <span>•</span>
                <span>Bangalore, India</span>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;