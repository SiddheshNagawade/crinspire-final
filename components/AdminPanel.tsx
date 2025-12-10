import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, ArrowLeft, Image as ImageIcon, LayoutList, Edit, Clock, ShieldCheck, PlayCircle, FileJson, Download, Crown, Check, Loader2 } from 'lucide-react';
import { Question, QuestionType, Section, ExamPaper } from '../types';
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
                                            <div className="text-xs font-bold text-[#9CA3AF] bg-white px-2 py-1 rounded border border-[#E5E7EB]">Q{qIdx + 1}</div>
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
                                                    className="w-full p-3 bg-white text-[#1F2937] border border-[#D1D5DB] rounded-lg h-32 focus:outline-none focus:border-[#1F2937] resize-none"
                                                    placeholder="Enter question text here..."
                                                />
                                            </div>
                                            <div className="md:col-span-4 space-y-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">Question Type</label>
                                                    <select 
                                                        value={q.type} 
                                                        onChange={(e) => updateQuestion(sIdx, qIdx, 'type', e.target.value)}
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
                                            {q.imageUrl && <img src={q.imageUrl} alt="Preview" className="mt-4 h-32 object-contain border p-1 bg-white rounded shadow-sm"/>}
                                        </div>

                                        {/* Options Logic */}
                                        {(q.type === QuestionType.MCQ || q.type === QuestionType.MSQ) && (
                                            <div className="mb-6">
                                                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">Options (Comma separated)</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="A, B, C, D" 
                                                    value={q.options?.join(', ')} 
                                                    onChange={(e) => updateQuestion(sIdx, qIdx, 'options', e.target.value.split(',').map(s => s.trim()))}
                                                    className="w-full p-3 bg-white text-[#1F2937] border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1F2937]"
                                                />
                                            </div>
                                        )}

                                        {/* Answer Logic */}
                                        <div>
                                            <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">Correct Answer</label>
                                            {q.type === QuestionType.MSQ ? (
                                                <input 
                                                    type="text" 
                                                    placeholder="A, C (Comma separated)"
                                                    value={Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}
                                                    onChange={(e) => updateQuestion(sIdx, qIdx, 'correctAnswer', e.target.value.split(',').map(s => s.trim()))}
                                                    className="w-full p-3 bg-[#ECFDF5] text-[#111827] border border-[#10B981] rounded-lg font-bold focus:outline-none"
                                                />
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