import React, { useState } from 'react';
import { User, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';

const InstructionScreen: React.FC = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { exams, studentDetails } = useOutletContext<any>();
  
  const exam = exams.find((e: any) => e.id === examId);
  const studentName = studentDetails?.name || "Guest User";
  const email = studentDetails?.email || "guest@example.com";

  const [agreed, setAgreed] = useState(false);
  const [page, setPage] = useState<1 | 2>(1);

  const handleStart = () => {
     navigate(`/exam/${examId}`);
  };

  if (!exam) return <div className="p-8">Loading exam details...</div>;

  return (
    <div className="flex flex-col h-screen bg-white font-sans text-[#111827]">
      {/* Header */}
      <div className="h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-6 shadow-sm z-10">
        <h1 className="text-xl font-bold text-[#1F2937]">Instructions</h1>
        <div className="text-sm text-[#6B7280] font-medium">{exam.title}</div>
      </div>

      <div className="flex flex-1 overflow-hidden bg-[#F3F4F6]">
        {/* Main Content */}
        <div className="flex-1 bg-white m-4 rounded-lg border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-center text-2xl font-serif mb-8 text-[#111827]">Please read the instructions carefully</h2>
              
              <h3 className="font-bold border-b border-[#E5E7EB] pb-2 mb-4 text-[#1F2937] uppercase text-sm tracking-wider">General Instructions</h3>
              
              <ol className="list-decimal pl-6 space-y-3 text-[#4B5563] leading-relaxed text-sm md:text-base">
                <li>Total duration of examination is <span className="font-bold text-[#1F2937]">{exam.durationMinutes} minutes</span>.</li>
                <li>The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself. You will not be required to end or submit your examination.</li>
                <li>The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols:
                  <div className="mt-6 mb-6 grid gap-3 p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                    <div className="flex items-center">
                        <span className="w-8 h-8 flex items-center justify-center bg-[#D1D5DB] rounded text-[#1F2937] mr-4 font-bold text-xs shadow-sm">1</span> 
                        <span className="text-sm">You have not visited the question yet.</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-8 h-8 flex items-center justify-center bg-[#FCD34D] rounded text-white mr-4 font-bold text-xs shadow-sm">2</span> 
                        <span className="text-sm">You have not answered the question.</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-8 h-8 flex items-center justify-center bg-[#10B981] rounded text-white mr-4 font-bold text-xs shadow-sm">3</span> 
                        <span className="text-sm">You have answered the question.</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-8 h-8 flex items-center justify-center bg-[#3B82F6] rounded-full text-white mr-4 font-bold text-xs shadow-sm">4</span> 
                        <span className="text-sm">You have NOT answered the question, but have marked the question for review.</span>
                    </div>
                    <div className="flex items-center">
                      <div className="relative w-8 h-8 mr-4 shadow-sm">
                          <span className="absolute inset-0 flex items-center justify-center bg-[#8B5CF6] text-white rounded-full font-bold text-xs">5</span>
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#10B981] rounded-full border border-white"></span>
                      </div>
                       <span className="text-sm">The question(s) "Answered and Marked for Review" will be considered for evaluation.</span>
                    </div>
                  </div>
                </li>
                <li>You can click on the "&gt;" arrow which appears to the left of question palette to collapse the question palette thereby maximizing the question window.</li>
              </ol>

              {page === 2 && (
                <div className="mt-10 border-t border-[#E5E7EB] pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <h3 className="font-bold border-b border-[#E5E7EB] pb-2 mb-4 text-[#EF4444] flex items-center">
                     <AlertCircle size={18} className="mr-2" />
                     Declaration & Confirmation
                   </h3>
                   <div className="p-6 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg">
                      <label className="flex items-start cursor-pointer select-none">
                          <input 
                              type="checkbox" 
                              className="mt-1 mr-4 w-5 h-5 accent-[#EF4444] cursor-pointer" 
                              checked={agreed} 
                              onChange={(e) => setAgreed(e.target.checked)}
                          />
                          <span className="text-sm text-[#7F1D1D] leading-relaxed">
                          I have read and understood the instructions. All computer hardware allotted to me are in proper working condition. I declare that I am not in possession of / not wearing / not carrying any prohibited gadget like mobile phone, bluetooth devices etc. /any prohibited material with me into the Examination Hall. I agree that in case of not adhering to the instructions, I shall be liable to be debarred from this Test and/or to disciplinary action.
                          </span>
                      </label>
                   </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer inside card */}
          <div className="p-4 border-t border-[#E5E7EB] bg-[#F8F9FA] flex justify-between items-center">
             {page === 2 ? (
                <button 
                    onClick={() => setPage(1)}
                    className="px-6 py-2 border border-[#D1D5DB] rounded bg-white hover:bg-[#F3F4F6] text-[#1F2937] font-medium flex items-center transition-colors shadow-sm"
                >
                    <ChevronLeft size={16} className="mr-1"/> Previous
                </button>
            ) : <div></div>}

            {page === 1 ? (
                <button 
                    onClick={() => setPage(2)}
                    className="px-6 py-2 border border-[#D1D5DB] rounded bg-white hover:bg-[#F3F4F6] text-[#1F2937] font-medium flex items-center transition-colors shadow-sm"
                >
                    Next <ChevronRight size={16} className="ml-1"/>
                </button>
            ) : (
                <button 
                    onClick={handleStart}
                    disabled={!agreed}
                    className={`px-8 py-2 text-white font-bold rounded shadow-md transition-all flex items-center
                        ${agreed ? 'bg-[#1F2937] hover:bg-[#0F1419] transform hover:-translate-y-0.5' : 'bg-[#9CA3AF] cursor-not-allowed'}`}
                >
                    I am ready to begin
                </button>
            )}
          </div>
        </div>

        {/* Sidebar (Profile) */}
        <div className="w-80 m-4 ml-0 hidden lg:flex flex-col gap-4">
           <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 flex flex-col items-center shadow-sm sticky top-4">
               <div className="w-24 h-24 bg-[#F3F4F6] rounded-full border border-[#E5E7EB] flex items-center justify-center overflow-hidden mb-4 relative group">
                    <User size={48} className="text-[#9CA3AF]" />
                    <div className="absolute inset-0 bg-black/5 hidden group-hover:flex items-center justify-center transition-all"></div>
               </div>
               <h2 className="font-bold text-lg text-[#111827] text-center">{studentName}</h2>
               <div className="mt-2 w-full bg-[#F3F4F6] py-2 px-3 rounded text-xs text-[#6B7280] text-center break-all font-mono border border-[#E5E7EB]">
                  {email}
               </div>
               <div className="mt-6 w-full border-t border-[#E5E7EB] pt-4">
                  <div className="flex justify-between text-xs text-[#6B7280] mb-2">
                    <span>System Name:</span>
                    <span className="font-bold text-[#1F2937]">C001</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#6B7280]">
                    <span>Language:</span>
                    <span className="font-bold text-[#1F2937]">English</span>
                  </div>
               </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default InstructionScreen;