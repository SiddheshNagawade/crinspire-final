import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Save, ArrowLeft, Image as ImageIcon, LayoutList, Edit, Clock, ShieldCheck, PlayCircle, FileJson, Download, Crown, Check, Loader2, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { Question, QuestionOption, QuestionType, Section, ExamPaper } from '../types';
import { getMSQPreview } from '../utils/msq';
import LoadingScreen from './LoadingScreen';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getExamsSummary, getExamDetail, examDetailKey } from '../utils/examQueries';
import { importOptionsFromJSON } from '../utils/importOptionsFromJSON';

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { examId } = useParams();
  const queryClient = useQueryClient();
  const { handleAdminSave: onSave, handleDeleteExam: onDelete } = useOutletContext<any>();
  
  // Load summaries for list view
  const { data: examsSummary, isLoading: loadingSummaries } = useQuery({
    queryKey: ['examsSummary'],
    queryFn: getExamsSummary,
    enabled: !examId, // Only load summaries when in list view
  });
  
  // Load full detail when editing specific exam
  const { data: examDetail, isLoading: loadingDetail } = useQuery({
    queryKey: examDetailKey(examId as string),
    queryFn: () => getExamDetail(examId as string),
    enabled: !!examId,
  });
  
  const [viewMode, setViewMode] = useState<'LIST' | 'EDITOR'>(examId ? 'EDITOR' : 'LIST');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showNavPanel, setShowNavPanel] = useState(true);
    const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>('');
    const [importingOptions, setImportingOptions] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0, message: '' });
    const optionsImportInputRef = useRef<HTMLInputElement | null>(null);
        const [showAiJsonFormat, setShowAiJsonFormat] = useState(false);
        const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
        
        // Ref to track total questions
        const editorContainerRef = useRef<HTMLDivElement>(null);

        const jsonImportInputRef = useRef<HTMLInputElement | null>(null);
        const backGuardArmedRef = useRef(false);
  
  // Editor State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [title, setTitle] = useState('');
  const [examType, setExamType] = useState('UCEED');
  const [duration, setDuration] = useState(120);
  const [isPremium, setIsPremium] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);

    const buildSnapshot = () => JSON.stringify({ title, year, examType, duration, isPremium, sections });

    const isDirty = useMemo(() => {
        if (viewMode !== 'EDITOR') return false;
        const snapshot = buildSnapshot();
        // If we don't have a baseline yet, don't block navigation.
        if (!lastSavedSnapshot) return false;
        return snapshot !== lastSavedSnapshot;
    }, [viewMode, title, year, examType, duration, isPremium, sections, lastSavedSnapshot]);

    const confirmDiscardIfDirty = () => {
        if (!isDirty) return true;
        return window.confirm('You have unsaved changes. Leave without saving?');
    };
  
  const handleEditExam = (examSummary: any) => {
      // Navigate to dedicated edit route for staged loading
      navigate(`/admin/edit/${examSummary.id}`);
  };

  const handleCreateNew = () => {
      // Navigate to /admin for list view, reset state for new exam
      navigate('/admin');
      setEditingId(null);
      setYear(new Date().getFullYear());
      setTitle('');
      setExamType('UCEED');
      setDuration(120);
      setIsPremium(false);
      const initialSections = [{ id: crypto.randomUUID(), name: 'New Section', questions: [] }];
      setSections(initialSections);

      // Establish baseline (so warning only appears after edits)
      setLastSavedSnapshot(JSON.stringify({
          title: '',
          year: new Date().getFullYear(),
          examType: 'UCEED',
          duration: 120,
          isPremium: false,
          sections: initialSections
      }));

      setViewMode('EDITOR');
  };

    // Hydrate editor when examDetail loads from URL
  useEffect(() => {
    if (examDetail && examId) {
      setEditingId(examDetail.id);
      setYear(examDetail.year);
      setTitle(examDetail.title);
      setExamType(examDetail.examType);
      setDuration(examDetail.durationMinutes);
      setIsPremium(!!examDetail.isPremium);
      const copiedSections = JSON.parse(JSON.stringify(examDetail.sections));
      setSections(copiedSections);
      
      setLastSavedSnapshot(JSON.stringify({
          title: examDetail.title,
          year: examDetail.year,
          examType: examDetail.examType,
          duration: examDetail.durationMinutes,
          isPremium: !!examDetail.isPremium,
          sections: copiedSections
      }));
      setViewMode('EDITOR');
    } else if (!examId) {
      setViewMode('LIST');
    }
  }, [examDetail, examId]);

  // Browser back button warning (Admin editor only). This does NOT block tab close/refresh.
    // We add a same-URL history guard entry so back doesn't unmount the editor state.
    useEffect(() => {
        if (viewMode !== 'EDITOR') return;

        if (!backGuardArmedRef.current) {
            window.history.pushState({ __adminEditorGuard: true }, '', window.location.href);
            backGuardArmedRef.current = true;
        }

        const onPopState = () => {
            // Back pressed: we landed on the previous history entry (same URL).
            // If user confirms, go back once more to actually leave.
            if (!confirmDiscardIfDirty()) {
                window.history.pushState({ __adminEditorGuard: true }, '', window.location.href);
                backGuardArmedRef.current = true;
                return;
            }

            // Allow leaving without re-prompting
            window.removeEventListener('popstate', onPopState);
            backGuardArmedRef.current = false;
            window.history.back();
        };

        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, [viewMode, isDirty, lastSavedSnapshot, title, year, examType, duration, isPremium, sections]);

    // Reload / tab close warning (Admin editor only) when there are unsaved changes.
    useEffect(() => {
        if (viewMode !== 'EDITOR' || !isDirty) return;

        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            // Most browsers ignore custom text and show a generic confirmation.
            e.preventDefault();
            e.returnValue = '';
        };

        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [viewMode, isDirty]);

    // When exiting editor view, pop the guard entry so normal back behavior returns.
    useEffect(() => {
        if (viewMode !== 'LIST') return;
        if (!backGuardArmedRef.current) return;
        backGuardArmedRef.current = false;
        window.history.back();
    }, [viewMode]);

    // Track current question index based on scroll position
    useEffect(() => {
        if (viewMode !== 'EDITOR') return;

        const handleScroll = () => {
            const allQuestions = [];
            for (let sIdx = 0; sIdx < sections.length; sIdx++) {
                for (let qIdx = 0; qIdx < sections[sIdx].questions.length; qIdx++) {
                    const elem = document.getElementById(`question-${sIdx}-${qIdx}`);
                    if (elem) {
                        allQuestions.push({ index: sIdx * 1000 + qIdx, elem });
                    }
                }
            }

            if (allQuestions.length === 0) return;

            // Find which question is closest to top of viewport (accounting for fixed header)
            const headerHeight = 200; // Approximate height of fixed header
            let closestIndex = 0;
            let closestDistance = Infinity;

            allQuestions.forEach((q) => {
                const rect = q.elem.getBoundingClientRect();
                const distance = Math.abs(rect.top - headerHeight);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestIndex = q.index;
                }
            });

            setCurrentQuestionIndex(closestIndex);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [viewMode, sections.length]);


  // --- SAFE IMMUTABLE STATE UPDATES ---

  // Calculate total questions
  const totalQuestions = useMemo(() => {
    return sections.reduce((sum, section) => sum + section.questions.length, 0);
  }, [sections]);

  // Get all questions in order
  const getAllQuestions = () => {
    const allQuestions = [];
    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      for (let qIdx = 0; qIdx < sections[sIdx].questions.length; qIdx++) {
        allQuestions.push({ sIdx, qIdx });
      }
    }
    return allQuestions;
  };

  // Get current question number (1-indexed)
  const getCurrentQuestionNumber = () => {
    const allQuestions = getAllQuestions();
    for (let i = 0; i < allQuestions.length; i++) {
      const q = allQuestions[i];
      const elemIndex = q.sIdx * 1000 + q.qIdx;
      if (elemIndex === currentQuestionIndex) {
        return i + 1;
      }
    }
    return totalQuestions > 0 ? 1 : 0;
  };

  // Navigate to specific question
  const scrollToQuestion = (sIdx: number, qIdx: number) => {
    const elem = document.getElementById(`question-${sIdx}-${qIdx}`);
    if (elem) {
      setTimeout(() => {
        elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Update current index after scroll
        const index = sIdx * 1000 + qIdx;
        setCurrentQuestionIndex(index);
      }, 50);
    }
  };

  // Navigate to previous question
  const goToPreviousQuestion = () => {
    const allQuestions = getAllQuestions();
    if (allQuestions.length === 0) return;

    const currentNum = getCurrentQuestionNumber();
    if (currentNum > 1) {
      const prevIndex = currentNum - 2;  // Convert to 0-indexed and go back one
      if (prevIndex >= 0) {
        const q = allQuestions[prevIndex];
        scrollToQuestion(q.sIdx, q.qIdx);
      }
    }
  };

  // Navigate to next question
  const goToNextQuestion = () => {
    const allQuestions = getAllQuestions();
    if (allQuestions.length === 0) return;

    const currentNum = getCurrentQuestionNumber();
    if (currentNum < allQuestions.length) {
      const q = allQuestions[currentNum];
      scrollToQuestion(q.sIdx, q.qIdx);
    }
  };

  const addSection = () => {
    const tempId = crypto.randomUUID();
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

  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    const newSections = [...sections];
    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    setSections(newSections);
  };

  const moveSectionDown = (index: number) => {
    if (index >= sections.length - 1) return;
    const newSections = [...sections];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    setSections(newSections);
  };

  const scrollToSection = (index: number) => {
    const element = document.getElementById(`section-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const addQuestion = (sectionIndex: number) => {
    const newSections = [...sections];
    const sectionToUpdate = { ...newSections[sectionIndex] };
    const tempId = crypto.randomUUID();
    
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

  const insertQuestionAfter = (sectionIndex: number, afterQuestionIndex: number) => {
    const newSections = [...sections];
    const sectionToUpdate = { ...newSections[sectionIndex] };
    const tempId = crypto.randomUUID();
    
    const newQuestion: Question = {
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
    };
    
    // Insert the new question after the specified index
    const questions = [...sectionToUpdate.questions];
    questions.splice(afterQuestionIndex + 1, 0, newQuestion);
    sectionToUpdate.questions = questions;
    
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
          id: editingId || crypto.randomUUID(),
          year,
          title,
          examType,
          durationMinutes: duration,
          isPremium,
          sections
        };
                const savedId = await onSave(newExam);
                if (savedId) {
                    setEditingId(savedId);
                }
                const snapshot = JSON.stringify({ title, year, examType, duration, isPremium, sections });
                setLastSavedSnapshot(snapshot);
                setViewMode('LIST');
                navigate('/admin');
    } catch (e) {
        console.error(e);
        // Error alert handled in parent
    } finally {
        setIsSaving(false);
    }
  };

    // Build current draft exam object
    const buildDraftExam = (): ExamPaper => ({
        id: editingId || crypto.randomUUID(),
        year,
        title,
        examType,
        durationMinutes: duration,
        isPremium,
        sections
    });


    const aiJsonFormatTemplate = useMemo(() => {
        const template = {
            title: "<Exam title>",
            year: 2025,
            examType: "UCEED",
            durationMinutes: 120,
            isPremium: false,
            sections: [
                // Section A - NAT (options skipped)
                {
                    sectionName: "NAT",
                    sectionCode: "A",
                    marksPerQuestion: 4,
                    negativeMarks: 0,
                    questions: [
                        {
                            questionNumber: 1,
                            text: "<NAT question text>",
                            type: "NAT",
                            // Accepts single value, range ("min-max"), or OR values ("x or y")
                            correctAnswer: "65-66"
                        }
                    ]
                },
                // Section B - MSQ (multiple correct)
                {
                    sectionName: "MSQ",
                    sectionCode: "B",
                    marksPerQuestion: 5,
                    negativeMarks: -0.5,
                    questions: [
                        {
                            questionNumber: 21,
                            text: "<MSQ question text>",
                            type: "MSQ",
                            optionDetails: [
                                { type: "text", text: "Option A", isCorrect: true },
                                { type: "text", text: "Option B", isCorrect: false },
                                { type: "text", text: "Option C", isCorrect: true },
                                { type: "text", text: "Option D", isCorrect: false }
                            ],
                            // Prefer letters; importer also respects isCorrect flags
                            correctAnswers: ["A", "C"]
                        }
                    ]
                },
                // Section C - MCQ (single correct)
                {
                    sectionName: "MCQ",
                    sectionCode: "C",
                    marksPerQuestion: 3,
                    negativeMarks: -1,
                    questions: [
                        {
                            questionNumber: 41,
                            text: "<MCQ question text>",
                            type: "MCQ",
                            optionDetails: [
                                { type: "text", text: "Option A" },
                                { type: "text", text: "Option B" },
                                { type: "text", text: "Option C" },
                                { type: "text", text: "Option D" }
                            ],
                            // Single letter A-D
                            correctAnswer: "B"
                        }
                    ]
                }
            ]
        };
        return JSON.stringify(template, null, 2);
    }, []);

    const copyAiJsonFormat = async () => {
        try {
            await navigator.clipboard.writeText(aiJsonFormatTemplate);
            alert('AI JSON format copied.');
        } catch {
            alert('Could not copy. Please select and copy manually.');
        }
    };

    const normalizeImported = (parsed: any) => {
        const now = Date.now();
        const asExamObject = Array.isArray(parsed) ? { sections: parsed } : parsed;
        if (!asExamObject || !Array.isArray(asExamObject.sections)) {
            throw new Error('Invalid JSON structure');
        }

        const nextTitle = typeof asExamObject.title === 'string' ? asExamObject.title : title;
        const nextYear = typeof asExamObject.year === 'number' ? asExamObject.year : year;
        const nextExamType = typeof asExamObject.examType === 'string' ? asExamObject.examType : examType;
        const nextDuration = typeof asExamObject.durationMinutes === 'number' ? asExamObject.durationMinutes : duration;
        const nextIsPremium = !!asExamObject.isPremium;

        const normalizeType = (raw: any): QuestionType => {
            const t = String(raw || '').toUpperCase();
            if (t === QuestionType.MCQ) return QuestionType.MCQ;
            if (t === QuestionType.MSQ) return QuestionType.MSQ;
            return QuestionType.NAT;
        };

        const normalizeOptionDetails = (qId: string, raw: any, qType: QuestionType, rawCorrect: any): QuestionOption[] => {
            let source: any[] = [];
            if (Array.isArray(raw?.optionDetails)) source = raw.optionDetails;
            else if (Array.isArray(raw?.option_details)) source = raw.option_details;
            else if (Array.isArray(raw?.options)) source = raw.options;

            const normalized = (source || []).map((opt, idx) => {
                const text = typeof opt?.text === 'string'
                    ? opt.text
                    : (typeof opt?.option_text === 'string' ? opt.option_text : (typeof opt === 'string' ? opt : ''));
                const isCorrect = typeof opt?.isCorrect === 'boolean'
                    ? opt.isCorrect
                    : (typeof opt?.is_correct === 'boolean' ? opt.is_correct : false);
                return {
                    id: typeof opt?.id === 'string' ? opt.id : `${qId}-opt-${idx}`,
                    type: opt?.type === 'image' ? 'image' : 'text',
                    text,
                    imageData: typeof opt?.imageData === 'string' ? opt.imageData : undefined,
                    altText: typeof opt?.altText === 'string' ? opt.altText : undefined,
                    isCorrect,
                } as QuestionOption;
            });

            // If MCQ/MSQ ensure 4 slots exist
            if (qType === QuestionType.MCQ || qType === QuestionType.MSQ) {
                while (normalized.length < 4) {
                    const idx = normalized.length;
                    normalized.push({ id: `${qId}-opt-${idx}`, type: 'text', text: '', isCorrect: false });
                }
            }

            // If raw provides answer letters, set isCorrect accordingly
            const applyLetters = (letters: string[] | string | undefined) => {
                if (!letters) return;
                const arr = Array.isArray(letters) ? letters : [letters];
                const upper = arr.map((l) => String(l).trim().toUpperCase());
                upper.forEach((L) => {
                    const idx = L.charCodeAt(0) - 65; // 'A' -> 0
                    if (idx >= 0 && idx < normalized.length) normalized[idx].isCorrect = true;
                });
            };

            if (qType === QuestionType.MSQ) applyLetters(raw?.correctAnswers || rawCorrect);
            if (qType === QuestionType.MCQ) applyLetters(raw?.correctAnswer || rawCorrect);

            return normalized;
        };

        const deriveCorrectAnswer = (qType: QuestionType, optionDetails: QuestionOption[], rawCorrect: any, raw: any) => {
            // Prefer explicit answers in input
            if (qType === QuestionType.MSQ && Array.isArray(raw?.correctAnswers)) return raw.correctAnswers;
            if ((qType === QuestionType.MCQ || qType === QuestionType.NAT) && (raw?.correctAnswer ?? rawCorrect) !== undefined && (raw?.correctAnswer ?? rawCorrect) !== '') {
                return raw?.correctAnswer ?? rawCorrect;
            }
            if (rawCorrect !== undefined && rawCorrect !== null && rawCorrect !== '') return rawCorrect;
            if (qType === QuestionType.MSQ) {
                return optionDetails
                    .map((o, idx) => (o.isCorrect ? String.fromCharCode(65 + idx) : null))
                    .filter(Boolean);
            }
            if (qType === QuestionType.MCQ) {
                const idx = optionDetails.findIndex((o) => o.isCorrect);
                return idx >= 0 ? String.fromCharCode(65 + idx) : 'A';
            }
            return '';
        };

        const normalizedSections: Section[] = asExamObject.sections.map((sec: any, secIdx: number) => {
            const secId = typeof sec?.id === 'string' ? sec.id : crypto.randomUUID();
            const secName = ((): string => {
                if (typeof sec?.name === 'string') return sec.name;
                if (typeof sec?.section_name === 'string') return sec.section_name;
                if (typeof sec?.sectionName === 'string') return sec.sectionName;
                if (typeof sec?.sectionCode === 'string') {
                    const code = String(sec.sectionCode).trim().toUpperCase();
                    if (code === 'A') return 'NAT';
                    if (code === 'B') return 'MSQ';
                    if (code === 'C') return 'MCQ';
                }
                return `Section ${secIdx + 1}`;
            })();
            const rawQuestions = Array.isArray(sec?.questions) ? sec.questions : [];
            const sectionMarks = typeof sec?.marksPerQuestion === 'number' ? sec.marksPerQuestion : undefined;
            const sectionNegative = typeof sec?.negativeMarks === 'number' ? sec.negativeMarks : undefined;

            const questions: Question[] = rawQuestions.map((rq: any, qIdx: number) => {
                const qId = typeof rq?.id === 'string' ? rq.id : crypto.randomUUID();
                // Derive type: prefer explicit, else from section name
                let qType = normalizeType(rq?.type);
                if (!rq?.type && typeof secName === 'string') {
                    const upper = secName.toUpperCase();
                    if (upper.includes('NAT')) qType = QuestionType.NAT;
                    else if (upper.includes('MSQ')) qType = QuestionType.MSQ;
                    else if (upper.includes('MCQ')) qType = QuestionType.MCQ;
                }
                const optionDetails = normalizeOptionDetails(qId, rq, qType, rq?.correctAnswers ?? rq?.correctAnswer ?? rq?.correct_answer);
                const correctAnswer = deriveCorrectAnswer(qType, optionDetails, rq?.correctAnswer ?? rq?.correct_answer, rq);

                return {
                    id: qId,
                    text: typeof rq?.text === 'string' ? rq.text : '',
                    imageUrl: typeof rq?.imageUrl === 'string' ? rq.imageUrl : (typeof rq?.image_url === 'string' ? rq.image_url : undefined),
                    type: qType,
                    options: optionDetails.map((o) => o.text || ''), 
                    optionDetails,
                    correctAnswer,
                    marks: typeof rq?.marks === 'number' ? rq.marks : (sectionMarks ?? 4),
                    negativeMarks: typeof rq?.negativeMarks === 'number' ? rq.negativeMarks : (typeof rq?.negative_marks === 'number' ? rq.negative_marks : (sectionNegative ?? 0)),
                    category: typeof rq?.category === 'string' ? rq.category : '',
                };
            });

            return { id: secId, name: secName, questions };
        });

        return { nextTitle, nextYear, nextExamType, nextDuration, nextIsPremium, normalizedSections };
    };

    const handleJsonImportFile = async (file: File) => {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const { nextTitle, nextYear, nextExamType, nextDuration, nextIsPremium, normalizedSections } = normalizeImported(parsed);
        setTitle(nextTitle);
        setYear(nextYear);
        setExamType(nextExamType);
        setDuration(nextDuration);
        setIsPremium(nextIsPremium);
        setSections(normalizedSections);
    };

    const onJsonFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        try {
            await handleJsonImportFile(file);
        } catch {
            alert('Invalid JSON file. Please check the format.');
        }
    };

    const onOptionsImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setImportingOptions(true);
        setImportProgress({ current: 0, total: 0, message: 'Starting...' });
        try {
            const result = await importOptionsFromJSON(file, (current, total, message) => {
                setImportProgress({ current, total, message });
            });
            if (result.success) {
                alert(`✅ Success! Imported ${result.successCount} options (images + text preserved).`);
                queryClient.invalidateQueries(examDetailKey(editingId as string));
                queryClient.invalidateQueries(['examsSummary']);
            } else {
                const errorMsg = result.errors.length > 0 ? result.errors.slice(0, 3).join('\n') : 'Unknown error';
                alert(`❌ Import: ${result.successCount}/${result.totalProcessed} OK\n\n${errorMsg}`);
            }
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setImportingOptions(false);
            setImportProgress({ current: 0, total: 0, message: '' });
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
  const availableCategories = ['ALL', ...Array.from(new Set((examsSummary || []).map((e: any) => e.examType || 'UCEED')))];
  const filteredExams = (examsSummary || []).filter((e: any) => selectedCategory === 'ALL' || e.examType === selectedCategory);

  return (
    <div className="min-h-screen bg-[#F3F4F6] font-sans text-[#111827]">
      {isSaving && <LoadingScreen message="Saving Exam..." subtext="Processing questions and uploading images..." />}
      
      {/* Top Navbar */}
      <div className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30 px-8 py-4 flex justify-between items-center shadow-sm">
           <div className="flex items-center gap-4">
                <button
                    onClick={() => {
                        if (viewMode === 'EDITOR' && !confirmDiscardIfDirty()) return;
                        if (viewMode === 'EDITOR' && backGuardArmedRef.current) {
                            window.history.go(-2);
                            return;
                        }
                        navigate(-1);
                    }}
                    className="p-2 hover:bg-[#F3F4F6] rounded-full text-[#6B7280] transition-colors"
                >
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
                    {loadingSummaries ? (
                        <div className="col-span-full py-12 text-center">
                            <Loader2 size={32} className="animate-spin mx-auto mb-3 text-gray-400" />
                            <div className="text-sm text-gray-500">Loading papers...</div>
                        </div>
                    ) : filteredExams.length === 0 ? (
                        <div className="col-span-full py-12 text-center bg-white border border-dashed border-[#D1D5DB] rounded-xl text-[#9CA3AF]">
                            No exams found in this category.
                        </div>
                    ) : (
                        filteredExams.map((exam: any) => (
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
                                                queryClient.invalidateQueries(['examsSummary']);
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
                            </div>
                        </div>
                    ))
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
                        <input
                            ref={jsonImportInputRef}
                            type="file"
                            accept="application/json"
                            onChange={onJsonFileInputChange}
                            className="hidden"
                        />
                         <button 
                            type="button"
                            onClick={() => jsonImportInputRef.current?.click()}
                            className="text-xs font-bold bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#4B5563] px-3 py-2 rounded flex items-center transition-colors border border-[#E5E7EB]"
                            title="Upload JSON file"
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
                         <button
                            type="button"
                            onClick={() => setShowAiJsonFormat((v) => !v)}
                            className="text-xs font-bold bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#4B5563] px-3 py-2 rounded flex items-center transition-colors border border-[#E5E7EB]"
                            title="Show AI JSON format"
                         >
                             <FileJson size={14} className="mr-1"/>
                             {showAiJsonFormat ? 'Hide Format' : 'AI Format'}
                         </button>
                         <input
                            ref={optionsImportInputRef}
                            type="file"
                            accept="application/json"
                            onChange={onOptionsImportChange}
                            className="hidden"
                         />
                         <button
                            type="button"
                            disabled={importingOptions}
                            onClick={() => optionsImportInputRef.current?.click()}
                            className="text-xs font-bold bg-green-50 border border-green-200 hover:bg-green-100 text-green-700 px-3 py-2 rounded flex items-center transition-colors disabled:opacity-50"
                            title="Bulk import options (preserves images and question text)"
                         >
                             {importingOptions ? <Loader2 size={14} className="mr-1 animate-spin" /> : <FileJson size={14} className="mr-1" />}
                             {importingOptions ? `Importing... ${importProgress.current}/${importProgress.total}` : 'Import Options'}
                         </button>
                    </div>
                </div>

                {showAiJsonFormat && (
                    <div className="bg-white rounded-lg shadow-sm border border-[#E5E7EB] p-6 mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <div className="text-sm font-bold text-[#1F2937]">AI JSON Format</div>
                                <div className="text-xs text-[#6B7280]">Use this as the exact output format for your AI prompt.</div>
                            </div>
                            <button
                                type="button"
                                onClick={copyAiJsonFormat}
                                className="text-xs font-bold bg-[#1F2937] hover:bg-black text-white px-3 py-2 rounded flex items-center transition-colors"
                            >
                                Copy
                            </button>
                        </div>
                        <textarea
                            value={aiJsonFormatTemplate}
                            readOnly
                            className="w-full h-64 p-3 font-mono text-xs bg-[#F9FAFB] text-[#111827] border border-[#E5E7EB] rounded-lg focus:outline-none"
                        />
                    </div>
                )}

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
                <div className="flex gap-6 relative">
                    {/* Toggle Button */}
                    <button
                        type="button"
                        onClick={() => setShowNavPanel(!showNavPanel)}
                        className="fixed left-4 top-32 z-40 p-2 bg-white border border-[#E5E7EB] rounded-lg shadow-md hover:bg-[#F3F4F6] transition-colors"
                        title={showNavPanel ? "Hide Navigation" : "Show Navigation"}
                    >
                        {showNavPanel ? <ChevronLeft size={18}/> : <ChevronRight size={18}/>}
                    </button>
                    
                    {/* Question Navigation Arrows - Below toggle button */}
                    <div className="fixed left-4 top-52 z-40 flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={goToPreviousQuestion}
                            disabled={totalQuestions === 0 || getCurrentQuestionNumber() <= 1}
                            className="p-2 bg-white border border-[#E5E7EB] rounded-lg shadow-md hover:bg-[#F3F4F6] transition-colors text-[#1F2937] disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Previous Question"
                        >
                            <ChevronUp size={20} strokeWidth={3} />
                        </button>
                        <button
                            type="button"
                            onClick={goToNextQuestion}
                            disabled={totalQuestions === 0 || getCurrentQuestionNumber() >= totalQuestions}
                            className="p-2 bg-white border border-[#E5E7EB] rounded-lg shadow-md hover:bg-[#F3F4F6] transition-colors text-[#1F2937] disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Next Question"
                        >
                            <ChevronDown size={20} strokeWidth={3} />
                        </button>
                    </div>

                    {/* Left Navigation Panel */}
                    {showNavPanel && (
                        <div className="w-64 flex-shrink-0 sticky top-24 self-start">
                            <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 shadow-sm">
                                <h3 className="text-sm font-bold text-[#1F2937] mb-3 flex items-center">
                                    <LayoutList size={16} className="mr-2"/>
                                    Sections
                                </h3>
                                <div className="space-y-2">
                                    {sections.map((section, sIdx) => (
                                        <button
                                            key={section.id}
                                            type="button"
                                            onClick={() => scrollToSection(sIdx)}
                                            className="w-full text-left px-3 py-2 rounded text-sm bg-[#F8F9FA] hover:bg-[#E5E7EB] text-[#1F2937] transition-colors border border-transparent hover:border-[#D1D5DB] flex items-center justify-between group"
                                        >
                                            <span className="truncate flex-1">{section.name}</span>
                                            <span className="text-xs text-[#9CA3AF] ml-2">({section.questions.length})</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main Sections Content */}
                    <div className="flex-1 space-y-8">
                        {sections.map((section, sIdx) => (
                            <div key={section.id} id={`section-${sIdx}`} className="border border-[#E5E7EB] rounded-lg bg-white overflow-hidden shadow-sm scroll-mt-24">
                                {/* Section Header */}
                                <div className="p-4 bg-[#F8F9FA] border-b border-[#E5E7EB] flex justify-between items-center">
                                    <div className="flex items-center gap-2 flex-1 mr-4">
                                        <button 
                                            type="button" 
                                            onClick={() => moveSectionUp(sIdx)}
                                            disabled={sIdx === 0}
                                            className="p-1.5 bg-white border border-[#D1D5DB] text-[#6B7280] rounded hover:bg-[#F3F4F6] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Move Section Up"
                                        >
                                            <ArrowUp size={16}/>
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => moveSectionDown(sIdx)}
                                            disabled={sIdx === sections.length - 1}
                                            className="p-1.5 bg-white border border-[#D1D5DB] text-[#6B7280] rounded hover:bg-[#F3F4F6] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Move Section Down"
                                        >
                                            <ArrowDown size={16}/>
                                        </button>
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
                                    <React.Fragment key={q.id}>
                                    <div id={`question-${sIdx}-${qIdx}`} className="bg-[#F8F9FA] p-6 rounded-lg border border-[#E5E7EB] relative group hover:border-[#D1D5DB] transition-colors scroll-mt-24">
                                        
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
                                                    <img src={q.imageUrl} alt="Preview" loading="lazy" className="h-32 object-contain border p-1 bg-white rounded shadow-sm"/>
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
                                                                        <img src={opt.imageData} alt={opt.altText || 'Option image'} loading="lazy" className="h-28 w-auto object-contain border p-1 bg-white rounded" />
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
                                    
                                    {/* Insert Question Button */}
                                    <div className="flex justify-center -mt-3 mb-3">
                                        <button
                                            type="button"
                                            onClick={() => insertQuestionAfter(sIdx, qIdx)}
                                            className="group/insert flex items-center gap-2 px-4 py-2 bg-white border-2 border-dashed border-[#D1D5DB] text-[#6B7280] rounded-lg hover:border-[#1F2937] hover:text-[#1F2937] hover:bg-[#F8F9FA] transition-all shadow-sm"
                                            title="Insert question below"
                                        >
                                            <Plus size={16} className="group-hover/insert:scale-110 transition-transform" />
                                            <span className="text-sm font-medium">Insert Question</span>
                                        </button>
                                    </div>
                                    </React.Fragment>
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