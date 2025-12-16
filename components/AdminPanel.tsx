import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, ArrowLeft, Image as ImageIcon, LayoutList, Edit, Clock, ShieldCheck, PlayCircle, FileJson, Download, Crown, Check, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { Question, QuestionOption, QuestionType, Section, ExamPaper } from '../types';
import { getMSQPreview } from '../utils/msq';
import LoadingScreen from './LoadingScreen';
import { useOutletContext, useNavigate } from 'react-router-dom';

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { exams: existingExams, handleAdminSave: onSave, handleDeleteExam: onDelete } = useOutletContext<any>();
  
  const [viewMode, setViewMode] = useState<'LIST' | 'EDITOR'>('LIST');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Editor State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [title, setTitle] = useState('');
  const [examType, setExamType] = useState('UCEED');
  const [duration, setDuration] = useState(120);
  const [isPremium, setIsPremium] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  
  const handleEditExam = (exam: ExamPaper) => {
      setEditingId(exam.id);
      setYear(exam.year);
      setTitle(exam.title);
      setExamType(exam.examType);
      setDuration(exam.durationMinutes);
      setIsPremium(!!exam.isPremium);
      // Deep copy sections to avoid mutating props directly
      setSections(JSON.parse(JSON.stringify(exam.sections)));
      setViewMode('EDITOR');
  };

  const handleCreateNew = () => {
      setEditingId(null);
      setYear(new Date().getFullYear());
      setTitle('');
      setExamType('UCEED');
      setDuration(120);
      setIsPremium(false);
      setSections([{ id: Date.now().toString(), name: 'New Section', questions: [] }]);
      setViewMode('EDITOR');
  };

  // --- SAFE IMMUTABLE STATE UPDATES ---

  const addSection = () => {
    const tempId = `temp-sec-${Date.now()}-${Math.random()}`;
    setSections([...sections, { id: tempId, name: 'New Section', questions: [] }]);
  };

  const updateSectionName = (index: number, name: string) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], name };
    setSections(newSections);
  };

  const deleteSection = (index: number) => {
      if(!window.confirm("Delete this entire section?")) return;
      const newSections = sections.filter((_, i) => i !== index);
      setSections(newSections);
  };

  const addQuestion = (sectionIndex: number) => {
    const newSections = [...sections];
    const sectionToUpdate = { ...newSections[sectionIndex] };
    const tempId = `temp-q-${Date.now()}-${Math.random()}`;
    
    sectionToUpdate.questions = [
        ...sectionToUpdate.questions,
        {
            id: tempId,
            text: '',
            type: QuestionType.NAT,
            marks: 4,
            negativeMarks: 0,
                        options: [],
                        optionDetails: [0,1,2,3].map((i) => ({
                            id: `${tempId}-opt-${i}`,
                            type: 'text',
                            text: '',
                            isCorrect: false,
                        } as QuestionOption)),
            correctAnswer: '',
            category: ''
        }
    ];
    
    newSections[sectionIndex] = sectionToUpdate;
    setSections(newSections);
  };

  const deleteQuestion = (sectionIndex: number, questionIndex: number) => {
    if(!window.confirm("Delete this question?")) return;
    const newSections = [...sections];
    const sectionToUpdate = { ...newSections[sectionIndex] };
    
    sectionToUpdate.questions = sectionToUpdate.questions.filter((_, i) => i !== questionIndex);
    
    newSections[sectionIndex] = sectionToUpdate;
    setSections(newSections);
  };

  const moveQuestionUp = (sectionIndex: number, questionIndex: number) => {
    if (questionIndex === 0) return;
    const newSections = [...sections];
    const questions = [...newSections[sectionIndex].questions];
    [questions[questionIndex - 1], questions[questionIndex]] = [questions[questionIndex], questions[questionIndex - 1]];
    newSections[sectionIndex].questions = questions;
    setSections(newSections);
  };

  const moveQuestionDown = (sectionIndex: number, questionIndex: number) => {
    const newSections = [...sections];
    const questions = newSections[sectionIndex].questions;
    if (questionIndex >= questions.length - 1) return;
    [questions[questionIndex], questions[questionIndex + 1]] = [questions[questionIndex + 1], questions[questionIndex]];
    setSections(newSections);
  };

  const updateQuestion = (sectionIndex: number, questionIndex: number, field: keyof Question, value: any) => {
    const newSections = [...sections];
    const sectionToUpdate = { ...newSections[sectionIndex] };
    const questionsToUpdate = [...sectionToUpdate.questions];
    
    questionsToUpdate[questionIndex] = {
      ...questionsToUpdate[questionIndex],
      [field]: value
    };
    
    sectionToUpdate.questions = questionsToUpdate;
    newSections[sectionIndex] = sectionToUpdate;
    setSections(newSections);
  };

    const ensureOptionDetails = (sectionIndex: number, questionIndex: number) => {
        const newSections = [...sections];
        const sectionToUpdate = { ...newSections[sectionIndex] };
        const questionsToUpdate = [...sectionToUpdate.questions];
        const q = { ...questionsToUpdate[questionIndex] };
        if (!q.optionDetails || q.optionDetails.length === 0) {
            const baseId = `${q.id || 'q'}-opt-${Date.now()}`;
            q.optionDetails = [0, 1, 2, 3].map((i) => ({
                id: `${baseId}-${i}`,
                type: 'text',
                text: '',
                isCorrect: i === 0,
            } as QuestionOption));
            if (q.type === QuestionType.MSQ) {
                q.correctAnswer = ['A'];
            } else if (q.type === QuestionType.MCQ) {
                q.correctAnswer = 'A';
            }
        }
        questionsToUpdate[questionIndex] = q;
        sectionToUpdate.questions = questionsToUpdate;
        newSections[sectionIndex] = sectionToUpdate;
        setSections(newSections);
    };

    const deriveCorrectAnswers = (optionDetails: QuestionOption[]) =>
        optionDetails
            .map((opt, idx) => (opt.isCorrect ? String.fromCharCode(65 + idx) : null))
            .filter(Boolean) as string[];

    const setQuestionType = (sectionIndex: number, questionIndex: number, nextType: QuestionType) => {
        // Functional update so we don't fight other state setters fired in the same tick
        setSections((prev) => {
            const newSections = [...prev];
            const sectionToUpdate = { ...newSections[sectionIndex] };
            const questionsToUpdate = [...sectionToUpdate.questions];
            const existing = { ...questionsToUpdate[questionIndex] };

            const q: Question = { ...existing, type: nextType };

            // Seed options for choice questions and align correctness flags
            if (nextType === QuestionType.MSQ || nextType === QuestionType.MCQ) {
                if (!q.optionDetails || q.optionDetails.length === 0) {
                    const baseId = `${q.id || 'q'}-opt-${Date.now()}`;
                    q.optionDetails = [0, 1, 2, 3].map((i) => ({
                        id: `${baseId}-${i}`,
                        type: 'text',
                        text: '',
                        isCorrect: i === 0,
                    } as QuestionOption));
                }

                if (nextType === QuestionType.MSQ) {
                    q.correctAnswer = deriveCorrectAnswers(q.optionDetails || []);
                } else {
                    let correctIdx = (q.optionDetails || []).findIndex((o) => o.isCorrect);
                    if (correctIdx < 0) correctIdx = 0;
                    q.optionDetails = (q.optionDetails || []).map((opt, idx) => ({ ...opt, isCorrect: idx === correctIdx }));
                    q.correctAnswer = q.optionDetails.length ? String.fromCharCode(65 + correctIdx) : '';
                }
            } else {
                // Reset answer shape for NAT
                if (Array.isArray(q.correctAnswer)) q.correctAnswer = '';
            }

            questionsToUpdate[questionIndex] = q;
            sectionToUpdate.questions = questionsToUpdate;
            newSections[sectionIndex] = sectionToUpdate;
            return newSections;
        });
    };

    const updateOptionField = (sectionIndex: number, questionIndex: number, optionId: string, patch: Partial<QuestionOption>) => {
        const newSections = [...sections];
        const sectionToUpdate = { ...newSections[sectionIndex] };
        const questionsToUpdate = [...sectionToUpdate.questions];
        const q = { ...questionsToUpdate[questionIndex] };
        const optionDetails = (q.optionDetails || []).map((opt) => opt.id === optionId ? { ...opt, ...patch } : opt);
        if (q.type === QuestionType.MSQ) {
            q.correctAnswer = deriveCorrectAnswers(optionDetails);
        }
        q.optionDetails = optionDetails;
        questionsToUpdate[questionIndex] = q;
        sectionToUpdate.questions = questionsToUpdate;
        newSections[sectionIndex] = sectionToUpdate;
        setSections(newSections);
    };

    const addOption = (sectionIndex: number, questionIndex: number) => {
        const newSections = [...sections];
        const sectionToUpdate = { ...newSections[sectionIndex] };
        const questionsToUpdate = [...sectionToUpdate.questions];
        const q = { ...questionsToUpdate[questionIndex] };
        const next: QuestionOption = {
            id: `${q.id}-opt-${Date.now()}`,
            type: 'text',
            text: '',
            isCorrect: false,
        };
        q.optionDetails = [...(q.optionDetails || []), next];
        if (q.type === QuestionType.MSQ) {
            q.correctAnswer = deriveCorrectAnswers(q.optionDetails);
        } else if (q.type === QuestionType.MCQ) {
            // if no correct selected, default to first
            const correctIdx = q.optionDetails.findIndex(o => o.isCorrect);
            const idxToUse = correctIdx >= 0 ? correctIdx : 0;
            q.optionDetails = q.optionDetails.map((opt, idx) => ({ ...opt, isCorrect: idx === idxToUse }));
            q.correctAnswer = String.fromCharCode(65 + idxToUse);
        }
        questionsToUpdate[questionIndex] = q;
        sectionToUpdate.questions = questionsToUpdate;
        newSections[sectionIndex] = sectionToUpdate;
        setSections(newSections);
    };

    const deleteOption = (sectionIndex: number, questionIndex: number, optionId: string) => {
        const newSections = [...sections];
        const sectionToUpdate = { ...newSections[sectionIndex] };
        const questionsToUpdate = [...sectionToUpdate.questions];
        const q = { ...questionsToUpdate[questionIndex] };
        q.optionDetails = (q.optionDetails || []).filter(opt => opt.id !== optionId);
        if (q.type === QuestionType.MSQ) {
            q.correctAnswer = deriveCorrectAnswers(q.optionDetails);
        } else if (q.type === QuestionType.MCQ) {
            const correctIdx = q.optionDetails.findIndex(o => o.isCorrect);
            const idxToUse = correctIdx >= 0 ? correctIdx : (q.optionDetails.length ? 0 : -1);
            q.optionDetails = q.optionDetails.map((opt, idx) => ({ ...opt, isCorrect: idx === idxToUse }));
            q.correctAnswer = idxToUse >= 0 ? String.fromCharCode(65 + idxToUse) : '';
        }
        questionsToUpdate[questionIndex] = q;
        sectionToUpdate.questions = questionsToUpdate;
        newSections[sectionIndex] = sectionToUpdate;
        setSections(newSections);
    };

    const duplicateOption = (sectionIndex: number, questionIndex: number, optionId: string) => {
        const newSections = [...sections];
        const sectionToUpdate = { ...newSections[sectionIndex] };
        const questionsToUpdate = [...sectionToUpdate.questions];
        const q = { ...questionsToUpdate[questionIndex] };
        const option = (q.optionDetails || []).find(o => o.id === optionId);
        if (!option) return;
        const copy: QuestionOption = { ...option, id: `${option.id}-copy-${Date.now()}` };
        q.optionDetails = [...(q.optionDetails || []), copy];
        if (q.type === QuestionType.MSQ) {
            q.correctAnswer = deriveCorrectAnswers(q.optionDetails);
        }
        questionsToUpdate[questionIndex] = q;
        sectionToUpdate.questions = questionsToUpdate;
        newSections[sectionIndex] = sectionToUpdate;
        setSections(newSections);
    };

    const setMCQCorrect = (sectionIndex: number, questionIndex: number, optionId: string) => {
        const newSections = [...sections];
        const sectionToUpdate = { ...newSections[sectionIndex] };
        const questionsToUpdate = [...sectionToUpdate.questions];
        const q = { ...questionsToUpdate[questionIndex] };
        q.optionDetails = (q.optionDetails || []).map((opt, idx) => {
            const isCorrect = opt.id === optionId;
            return { ...opt, isCorrect };
        });
        // correctAnswer as label A/B/C etc
        const correctIdx = q.optionDetails.findIndex(o => o.id === optionId);
        q.correctAnswer = correctIdx >= 0 ? String.fromCharCode(65 + correctIdx) : '';
        questionsToUpdate[questionIndex] = q;
        sectionToUpdate.questions = questionsToUpdate;
        newSections[sectionIndex] = sectionToUpdate;
        setSections(newSections);
    };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, sectionIndex: number, questionIndex: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateQuestion(sectionIndex, questionIndex, 'imageUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

    const handleOptionImageUpload = (e: React.ChangeEvent<HTMLInputElement>, sectionIndex: number, questionIndex: number, optionId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            updateOptionField(sectionIndex, questionIndex, optionId, { imageData: reader.result as string });
        };
        reader.readAsDataURL(file);
    };

  const handleSaveExam = async () => {
    if (!title || sections.length === 0) {
      alert("Please fill in the exam title and add at least one section.");
      return;
    }
    
    setIsSaving(true);
    try {
        const newExam: ExamPaper = {
          id: editingId || Date.now().toString(),
          year,
          title,
          examType,
          durationMinutes: duration,
          isPremium,
          sections
        };
        await onSave(newExam);
        setViewMode('LIST');
    } catch (e) {
        console.error(e);
        // Error alert handled in parent
    } finally {
        setIsSaving(false);
    }
  };

  const handleBulkImport = () => {
      const input = prompt("Paste your Exam JSON structure (sections array or full exam object):");
      if (!input) return;

      try {
          const parsed = JSON.parse(input);
          
          if (Array.isArray(parsed)) {
              setSections(parsed);
          } else if (parsed.sections && Array.isArray(parsed.sections)) {
              if(parsed.title) setTitle(parsed.title);
              if(parsed.durationMinutes) setDuration(parsed.durationMinutes);
              if(parsed.examType) setExamType(parsed.examType);
              if(parsed.year) setYear(parsed.year);
              setIsPremium(!!parsed.isPremium); 
              setSections(parsed.sections);
          } else {
              alert("Invalid JSON structure. Expected an array of sections or an exam object.");
          }
      } catch (e) {
          alert("Invalid JSON. Please check your syntax.");
      }
  };

  const handleExport = () => {
      const examData = {
          title,
          year,
          examType,
          durationMinutes: duration,
          isPremium,
          sections
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(examData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", (title || "exam") + ".json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  // Filter Logic for List View
  const availableCategories = ['ALL', ...Array.from(new Set((existingExams || []).map((e: ExamPaper) => e.examType || 'UCEED')))];
  const filteredExams = (existingExams || []).filter((e: ExamPaper) => selectedCategory === 'ALL' || e.examType === selectedCategory);

  return (
    <div className="min-h-screen bg-[#F3F4F6] font-sans text-[#111827]">
      {isSaving && <LoadingScreen message="Saving Exam..." subtext="Processing questions and uploading images..." />}
      
      {/* Top Navbar */}
      <div className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30 px-8 py-4 flex justify-between items-center shadow-sm">
           <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-[#F3F4F6] rounded-full text-[#6B7280] transition-colors">
                    <ArrowLeft size={20}/>
                </button>
                <h1 className="text-xl font-bold text-[#1F2937]">Instructor Dashboard</h1>
           </div>
           
           <div className="flex bg-[#F3F4F6] p-1 rounded-lg">
               <button 
                onClick={() => setViewMode('LIST')}
                className={`px-4 py-2 rounded text-sm font-bold flex items-center transition-all ${viewMode === 'LIST' ? 'bg-white shadow-sm text-[#1F2937]' : 'text-[#6B7280] hover:text-[#1F2937]'}`}
               >
                   <LayoutList size={16} className="mr-2"/> Manage Exams
               </button>
               <button 
                onClick={handleCreateNew}
                className={`px-4 py-2 rounded text-sm font-bold flex items-center transition-all ${viewMode === 'EDITOR' ? 'bg-white shadow-sm text-[#1F2937]' : 'text-[#6B7280] hover:text-[#1F2937]'}`}
               >
                   <Plus size={16} className="mr-2"/> Create New
               </button>
           </div>
      </div>

      <div className="p-8 max-w-6xl mx-auto">
        
        {viewMode === 'LIST' ? (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-[#1F2937]">Existing Exams</h2>
                    {/* Category Filter */}
                    <div className="flex gap-2">
                        {availableCategories.map((cat: any) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    selectedCategory === cat 
                                    ? 'bg-[#1F2937] text-white shadow-sm' 
                                    : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredExams.map((exam: ExamPaper) => (
                        <div 
                            key={exam.id}
                            className="group bg-white rounded-xl border border-[#E5E7EB] p-6 hover:shadow-lg hover:border-[#D1D5DB] transition-all relative"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider block">
                                            {exam.examType || 'UCEED'} • {exam.year}
                                        </span>
                                        {exam.isPremium && (
                                            <span className="bg-[#FCD34D]/20 text-[#B45309] border border-[#FCD34D] text-[10px] px-1.5 py-0.5 rounded flex items-center font-bold">
                                                <Crown size={10} className="mr-1"/> PREMIUM
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-bold text-[#111827]">
                                        {exam.title}
                                    </h3>
                                </div>
                                <div className="flex gap-2 z-10 relative items-center">
                                     <button 
                                        type="button"
                                        onClick={() => handleEditExam(exam)}
                                        className="p-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded-full text-[#4B5563] transition-colors"
                                        title="Edit Exam"
                                     >
                                        <Edit size={18} />
                                     </button>
                                     
                                     {/* Delete Exam Button */}
                                     <button
                                        type="button"
                                        disabled={deletingId === exam.id}
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`Delete "${exam.title}" permanently? This cannot be undone.`)) {
                                                setDeletingId(exam.id);
                                                await onDelete(exam.id);
                                                setDeletingId(null);
                                            }
                                        }}
                                        className={`ml-2 px-3 py-1.5 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg text-red-600 text-xs font-bold transition-colors cursor-pointer flex items-center ${deletingId === exam.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        title="Delete this exam"
                                    >
                                        {deletingId === exam.id ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Trash2 size={14} className="mr-1" />}
                                        {deletingId === exam.id ? 'Deleting...' : 'Delete'}
                                    </button>

                                </div>
                            </div>

                            <div className="flex items-center gap-6 text-sm text-[#4B5563] mb-6">
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-[#9CA3AF]"/>
                                    {exam.durationMinutes}m
                                </div>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-[#9CA3AF]"/>
                                    {exam.sections.length} Sections
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredExams.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-white border border-dashed border-[#D1D5DB] rounded-xl text-[#9CA3AF]">
                            No exams found in this category.
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-[#1F2937]">
                        {editingId ? 'Edit Exam' : 'Exam Configuration'}
                    </h2>
                    <div className="flex gap-2">
                         <button 
                            type="button"
                            onClick={handleBulkImport}
                            className="text-xs font-bold bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#4B5563] px-3 py-2 rounded flex items-center transition-colors border border-[#E5E7EB]"
                            title="Paste JSON Data"
                         >
                             <FileJson size={14} className="mr-1"/> Import JSON
                         </button>
                         <button 
                            type="button"
                            onClick={handleExport}
                            className="text-xs font-bold bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#4B5563] px-3 py-2 rounded flex items-center transition-colors border border-[#E5E7EB]"
                            title="Download JSON"
                         >
                             <Download size={14} className="mr-1"/> Export
                         </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-[#E5E7EB] p-8 mb-8">
                    {/* General Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">Exam Type</label>
                            <select 
                                value={examType} 
                                onChange={e => setExamType(e.target.value)} 
                                className="w-full p-3 bg-white text-[#1F2937] border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1F2937] transition-colors"
                            >
                                <option value="UCEED">UCEED</option>
                                <option value="CEED">CEED</option>
                                <option value="NIFT">NIFT</option>
                                <option value="NID">NID</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">Exam Year</label>
                            <input 
                                type="number" 
                                value={year} 
                                onChange={e => setYear(parseInt(e.target.value))} 
                                className="w-full p-3 bg-white text-[#1F2937] border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1F2937] transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">Exam Title</label>
                            <input 
                                type="text" 
                                value={title} 
                                onChange={e => setTitle(e.target.value)} 
                                placeholder="e.g. Mock Test 1" 
                                className="w-full p-3 bg-white text-[#1F2937] border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1F2937] transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">Duration (Minutes)</label>
                            <input 
                                type="number" 
                                value={duration} 
                                onChange={e => setDuration(parseInt(e.target.value))} 
                                className="w-full p-3 bg-white text-[#1F2937] border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1F2937] transition-colors"
                            />
                        </div>
                    </div>
                    
                    {/* Premium Toggle */}
                    <div className="mt-8 border-t border-[#E5E7EB] pt-6">
                        <label className="flex items-center cursor-pointer group">
                            <div className="relative">
                                <input 
                                    type="checkbox" 
                                    checked={isPremium} 
                                    onChange={(e) => setIsPremium(e.target.checked)}
                                    className="sr-only"
                                />
                                <div className={`block w-14 h-8 rounded-full transition-colors ${isPremium ? 'bg-[#1F2937]' : 'bg-gray-200'}`}></div>
                                <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform transform ${isPremium ? 'translate-x-6' : ''}`}></div>
                            </div>
                            <div className="ml-4">
                                <div className="text-sm font-bold text-[#1F2937] flex items-center">
                                    Make this test Premium? {isPremium && <Crown size={14} className="ml-2 text-[#F59E0B]"/>}
                                </div>
                                <div className="text-xs text-[#6B7280]">
                                    If checked, Free users will see a lock icon and must upgrade to access.
                                </div>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Sections */}
                <div className="space-y-8">
                    {sections.map((section, sIdx) => (
                        <div key={section.id} className="border border-[#E5E7EB] rounded-lg bg-white overflow-hidden shadow-sm">
                            {/* Section Header */}
                            <div className="p-4 bg-[#F8F9FA] border-b border-[#E5E7EB] flex justify-between items-center">
                                <div className="flex-1 mr-4">
                                    <input 
                                        value={section.name} 
                                        onChange={(e) => updateSectionName(sIdx, e.target.value)}
                                        className="font-bold bg-[#F8F9FA] text-[#1F2937] border-b-2 border-transparent focus:border-[#1F2937] focus:outline-none text-lg w-full hover:border-[#D1D5DB] transition-colors px-2 py-1"
                                        placeholder="Section Name"
                                    />
                                </div>
                                <button type="button" onClick={() => deleteSection(sIdx)} className="text-[#EF4444] hover:bg-[#FEE2E2] p-2 rounded transition-colors" title="Delete Section">
                                    <Trash2 size={18}/>
                                </button>
                            </div>

                            <div className="p-6 bg-white space-y-6">
                                {section.questions.map((q, qIdx) => (
                                    <div key={q.id} className="bg-[#F8F9FA] p-6 rounded-lg border border-[#E5E7EB] relative group hover:border-[#D1D5DB] transition-colors">
                                        
                                        {/* Question Header & Delete Button */}
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="text-xs font-bold text-[#9CA3AF] bg-white px-2 py-1 rounded border border-[#E5E7EB]">Q{qIdx + 1}</div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => moveQuestionUp(sIdx, qIdx)}
                                                    disabled={qIdx === 0}
                                                    className="p-1.5 bg-white border border-[#D1D5DB] text-[#6B7280] rounded hover:bg-[#F3F4F6] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title="Move Up"
                                                >
                                                    <ArrowUp size={14}/>
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={() => moveQuestionDown(sIdx, qIdx)}
                                                    disabled={qIdx === section.questions.length - 1}
                                                    className="p-1.5 bg-white border border-[#D1D5DB] text-[#6B7280] rounded hover:bg-[#F3F4F6] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title="Move Down"
                                                >
                                                    <ArrowDown size={14}/>
                                                </button>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => deleteQuestion(sIdx, qIdx)}
                                                className="p-1.5 bg-white border border-red-200 text-red-500 rounded hover:bg-red-50 transition-colors"
                                                title="Delete Question"
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
                                            <div className="md:col-span-8">
                                                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">Question Text</label>
                                                <textarea 
                                                    value={q.text} 
                                                    onChange={(e) => updateQuestion(sIdx, qIdx, 'text', e.target.value)}
                                                    className="w-full p-3 bg-white text-[#1F2937] border border-[#D1D5DB] rounded-lg h-32 focus:outline-none focus:border-[#1F2937] resize-none whitespace-pre-wrap"
                                                    placeholder="Enter question text here...\n(Line breaks will be preserved)"
                                                />
                                            </div>
                                            <div className="md:col-span-4 space-y-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">Question Type</label>
                                                    <select 
                                                        value={q.type} 
                                                        onChange={(e) => setQuestionType(sIdx, qIdx, e.target.value as QuestionType)}
                                                        className="w-full p-3 bg-white text-[#1F2937] border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1F2937]"
                                                    >
                                                        <option value={QuestionType.NAT}>NAT (Numerical)</option>
                                                        <option value={QuestionType.MSQ}>MSQ (Multiple Select)</option>
                                                        <option value={QuestionType.MCQ}>MCQ (Multiple Choice)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">Category (e.g. Logic)</label>
                                                    <input 
                                                        type="text" 
                                                        value={q.category || ''}
                                                        onChange={(e) => updateQuestion(sIdx, qIdx, 'category', e.target.value)}
                                                        placeholder="e.g. Arithmetic"
                                                        className="w-full p-3 bg-white text-[#1F2937] border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1F2937]"
                                                    />
                                                </div>
                                                <div className="flex gap-4">
                                                    <div className="flex-1">
                                                        <label className="block text-xs font-bold text-[#10B981] uppercase mb-2">Correct (+)</label>
                                                        <input 
                                                            type="number" 
                                                            value={q.marks} 
                                                            onChange={(e) => updateQuestion(sIdx, qIdx, 'marks', parseFloat(e.target.value))} 
                                                            className="w-full p-3 bg-white text-[#1F2937] border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1F2937]"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-xs font-bold text-[#EF4444] uppercase mb-2">Wrong (-)</label>
                                                        <input 
                                                            type="number" 
                                                            value={q.negativeMarks} 
                                                            onChange={(e) => updateQuestion(sIdx, qIdx, 'negativeMarks', parseFloat(e.target.value))} 
                                                            className="w-full p-3 bg-white text-[#1F2937] border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1F2937]"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Image Upload */}
                                        <div className="mb-6 p-4 border border-dashed border-[#D1D5DB] rounded-lg bg-white">
                                            <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2 flex items-center">
                                                <ImageIcon size={14} className="mr-2"/> Image Attachment
                                            </label>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, sIdx, qIdx)} className="text-sm text-[#6B7280] w-full"/>
                                            {q.imageUrl && (
                                                <div className="mt-4 space-y-2">
                                                    <img src={q.imageUrl} alt="Preview" className="h-32 object-contain border p-1 bg-white rounded shadow-sm"/>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuestion(sIdx, qIdx, 'imageUrl', '')}
                                                        className="text-sm text-red-600 border border-red-200 px-3 py-1.5 rounded hover:bg-red-50"
                                                    >
                                                        Delete Image
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Options Logic */}
                                        {q.type === QuestionType.MSQ ? (
                                            <div className="mb-6 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <label className="block text-xs font-bold text-[#6B7280] uppercase">Options (mark all correct)</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!q.optionDetails || q.optionDetails.length === 0) {
                                                                ensureOptionDetails(sIdx, qIdx);
                                                            } else {
                                                                addOption(sIdx, qIdx);
                                                            }
                                                        }}
                                                        className="text-sm font-semibold text-[#1F2937] bg-white border border-[#E5E7EB] px-3 py-1.5 rounded hover:bg-[#F3F4F6]"
                                                    >
                                                        + Add Option
                                                    </button>
                                                </div>

                                                {(q.optionDetails && q.optionDetails.length > 0) ? q.optionDetails.map((opt, oIdx) => (
                                                    <div key={opt.id} className="border border-[#E5E7EB] rounded-lg bg-white p-4 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="text-sm font-semibold text-[#1F2937]">Option {String.fromCharCode(65 + oIdx)}</div>
                                                            <div className="flex items-center gap-3">
                                                                <label className="flex items-center gap-2 text-sm text-[#1F2937]">
                                                                    <span>Type</span>
                                                                    <select
                                                                        value={opt.type}
                                                                        onChange={(e) => updateOptionField(sIdx, qIdx, opt.id, { type: e.target.value as QuestionOption['type'] })}
                                                                        className="border border-[#D1D5DB] rounded px-2 py-1 text-sm"
                                                                    >
                                                                        <option value="text">Text</option>
                                                                        <option value="image">Image</option>
                                                                    </select>
                                                                </label>
                                                                <label className="flex items-center gap-2 text-sm text-[#1F2937]">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={opt.isCorrect}
                                                                        onChange={(e) => updateOptionField(sIdx, qIdx, opt.id, { isCorrect: e.target.checked })}
                                                                    />
                                                                    <span>Is Correct</span>
                                                                </label>
                                                            </div>
                                                        </div>

                                                        {opt.type === 'text' ? (
                                                            <input
                                                                type="text"
                                                                value={opt.text || ''}
                                                                onChange={(e) => updateOptionField(sIdx, qIdx, opt.id, { text: e.target.value })}
                                                                placeholder="Enter option text"
                                                                className="w-full p-3 bg-white text-[#1F2937] border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1F2937]"
                                                            />
                                                        ) : (
                                                            <div className="space-y-3">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={(e) => handleOptionImageUpload(e, sIdx, qIdx, opt.id)}
                                                                    className="text-sm text-[#6B7280]"
                                                                />
                                                                {opt.imageData && (
                                                                    <div className="flex items-start gap-3">
                                                                        <img src={opt.imageData} alt={opt.altText || 'Option image'} className="h-28 w-auto object-contain border p-1 bg-white rounded" />
                                                                        <div className="flex-1 space-y-2">
                                                                            <input
                                                                                type="text"
                                                                                value={opt.altText || ''}
                                                                                onChange={(e) => updateOptionField(sIdx, qIdx, opt.id, { altText: e.target.value })}
                                                                                placeholder="Alt text for accessibility"
                                                                                className="w-full p-2 text-sm border border-[#D1D5DB] rounded"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => duplicateOption(sIdx, qIdx, opt.id)}
                                                                className="text-sm px-3 py-1.5 border border-[#D1D5DB] rounded hover:bg-[#F9FAFB]"
                                                            >
                                                                Duplicate
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => deleteOption(sIdx, qIdx, opt.id)}
                                                                className="text-sm px-3 py-1.5 border border-red-200 text-red-600 rounded hover:bg-red-50"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="text-sm text-[#6B7280] border border-dashed border-[#D1D5DB] p-3 rounded bg-white">
                                                        No options yet. Click "Add Option" to start.
                                                    </div>
                                                )}

                                                {/* Marking preview */}
                                                <div className="border border-[#E5E7EB] rounded-lg bg-white p-4">
                                                    {(() => {
                                                        const optionList = q.optionDetails || [];
                                                        const preview = getMSQPreview(optionList, q.marks || 0);
                                                        const totalCorrect = preview.totalCorrect;
                                                        return (
                                                            <div className="space-y-1 text-sm text-[#111827]">
                                                                <div className="font-semibold">📊 Marking Breakdown (MSQ)</div>
                                                                <div>Correct Answers: {totalCorrect} option(s) marked correct</div>
                                                                <div>All correct selections: +{q.marks || 0}</div>
                                                                {preview.breakdown.partial.map((p) => (
                                                                    <div key={p.count}>Select {p.count}/{totalCorrect} correct: +{p.marks.toFixed(2)}</div>
                                                                ))}
                                                                <div>Any wrong selection: -1</div>
                                                                <div>Unanswered: 0</div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        ) : q.type === QuestionType.MCQ ? (
                                            <div className="mb-6 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <label className="block text-xs font-bold text-[#6B7280] uppercase">Options (select one correct)</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!q.optionDetails || q.optionDetails.length === 0) {
                                                                ensureOptionDetails(sIdx, qIdx);
                                                            } else {
                                                                addOption(sIdx, qIdx);
                                                            }
                                                        }}
                                                        className="text-sm font-semibold text-[#1F2937] bg-white border border-[#E5E7EB] px-3 py-1.5 rounded hover:bg-[#F3F4F6]"
                                                    >
                                                        + Add Option
                                                    </button>
                                                </div>

                                                {(q.optionDetails && q.optionDetails.length > 0) ? q.optionDetails.map((opt, oIdx) => (
                                                    <div key={opt.id} className="border border-[#E5E7EB] rounded-lg bg-white p-4 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="text-sm font-semibold text-[#1F2937]">Option {String.fromCharCode(65 + oIdx)}</div>
                                                            <div className="flex items-center gap-3">
                                                                <label className="flex items-center gap-2 text-sm text-[#1F2937]">
                                                                    <input
                                                                        type="radio"
                                                                        name={`mcq-correct-${q.id}`}
                                                                        checked={opt.isCorrect}
                                                                        onChange={() => setMCQCorrect(sIdx, qIdx, opt.id)}
                                                                    />
                                                                    <span>Correct</span>
                                                                </label>
                                                                <label className="flex items-center gap-2 text-sm text-[#1F2937]">
                                                                    <span>Type</span>
                                                                    <select
                                                                        value={opt.type}
                                                                        onChange={(e) => updateOptionField(sIdx, qIdx, opt.id, { type: e.target.value as QuestionOption['type'] })}
                                                                        className="border border-[#D1D5DB] rounded px-2 py-1 text-sm"
                                                                    >
                                                                        <option value="text">Text</option>
                                                                        <option value="image">Image</option>
                                                                    </select>
                                                                </label>
                                                            </div>
                                                        </div>

                                                        {opt.type === 'text' ? (
                                                            <input
                                                                type="text"
                                                                value={opt.text || ''}
                                                                onChange={(e) => updateOptionField(sIdx, qIdx, opt.id, { text: e.target.value })}
                                                                placeholder="Enter option text"
                                                                className="w-full p-3 bg-white text-[#1F2937] border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1F2937]"
                                                            />
                                                        ) : (
                                                            <div className="space-y-3">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={(e) => handleOptionImageUpload(e, sIdx, qIdx, opt.id)}
                                                                    className="text-sm text-[#6B7280]"
                                                                />
                                                                {opt.imageData && (
                                                                    <div className="flex items-start gap-3">
                                                                        <img src={opt.imageData} alt={opt.altText || 'Option image'} className="h-28 w-auto object-contain border p-1 bg-white rounded" />
                                                                        <div className="flex-1 space-y-2">
                                                                            <input
                                                                                type="text"
                                                                                value={opt.altText || ''}
                                                                                onChange={(e) => updateOptionField(sIdx, qIdx, opt.id, { altText: e.target.value })}
                                                                                placeholder="Alt text for accessibility"
                                                                                className="w-full p-2 text-sm border border-[#D1D5DB] rounded"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => duplicateOption(sIdx, qIdx, opt.id)}
                                                                className="text-sm px-3 py-1.5 border border-[#D1D5DB] rounded hover:bg-[#F9FAFB]"
                                                            >
                                                                Duplicate
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => deleteOption(sIdx, qIdx, opt.id)}
                                                                className="text-sm px-3 py-1.5 border border-red-200 text-red-600 rounded hover:bg-red-50"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="text-sm text-[#6B7280] border border-dashed border-[#D1D5DB] p-3 rounded bg-white">
                                                        No options yet. Click "Add Option" to start.
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}

                                        {/* Answer Logic */}
                                        <div>
                                            <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">Correct Answer</label>
                                            {q.type === QuestionType.MSQ ? (
                                                <div className="p-3 bg-[#ECFDF5] border border-[#10B981] rounded-lg text-sm text-[#064E3B]">
                                                    <div className="font-semibold">Correct answers are set by the checkboxes above.</div>
                                                    <div>
                                                        Current: {(() => {
                                                            const labels = (q.correctAnswer && Array.isArray(q.correctAnswer)) ? q.correctAnswer : [];
                                                            return labels.length ? labels.join(', ') : 'None selected';
                                                        })()}
                                                    </div>
                                                </div>
                                            ) : (
                                                <input 
                                                    type="text" 
                                                    placeholder={q.type === QuestionType.NAT ? "Numeric Value (e.g. 24)" : "Option (e.g. A)"}
                                                    value={q.correctAnswer as string}
                                                    onChange={(e) => updateQuestion(sIdx, qIdx, 'correctAnswer', e.target.value)}
                                                    className="w-full p-3 bg-[#ECFDF5] text-[#111827] border border-[#10B981] rounded-lg font-bold focus:outline-none"
                                                />
                                            )}
                                        </div>

                                    </div>
                                ))}
                                <button 
                                    type="button"
                                    onClick={() => addQuestion(sIdx)}
                                    className="w-full py-4 border-2 border-dashed border-[#D1D5DB] text-[#6B7280] rounded-lg hover:border-[#1F2937] hover:text-[#1F2937] flex justify-center items-center transition-all bg-[#F8F9FA] hover:bg-white font-medium"
                                >
                                    <Plus size={18} className="mr-2"/> Add Question to {section.name}
                                </button>
                            </div>
                        </div>
                    ))}

                    <button 
                        type="button"
                        onClick={addSection}
                        className="w-full py-5 bg-white hover:bg-[#F8F9FA] text-[#1F2937] font-bold rounded-lg border border-[#D1D5DB] flex justify-center items-center shadow-sm transition-all"
                    >
                        <Plus size={20} className="mr-2"/> Add New Section
                    </button>
                </div>

                <div className="mt-8 flex justify-end sticky bottom-8">
                    <button 
                        type="button"
                        onClick={handleSaveExam}
                        disabled={isSaving}
                        className={`bg-[#1F2937] text-white px-8 py-3 rounded-lg font-bold text-lg flex items-center shadow-xl transition-all transform ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#0F1419] hover:-translate-y-1'}`}
                    >
                        {isSaving ? <Loader2 size={20} className="mr-2 animate-spin"/> : <Save size={20} className="mr-2"/>}
                        {editingId ? (isSaving ? 'Updating...' : 'Update Exam') : (isSaving ? 'Saving...' : 'Save Exam')}
                    </button>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;