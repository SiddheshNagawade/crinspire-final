
export enum QuestionType {
  NAT = 'NAT', // Numerical Answer Type
  MSQ = 'MSQ', // Multiple Select Question
  MCQ = 'MCQ', // Multiple Choice Question
}

export enum QuestionStatus {
  NOT_VISITED = 'not_visited',
  NOT_ANSWERED = 'not_answered',
  ANSWERED = 'answered',
  MARKED_FOR_REVIEW = 'marked_for_review',
  ANSWERED_MARKED_FOR_REVIEW = 'answered_marked_for_review',
}

export interface Question {
  id: string;
  text: string;
  imageUrl?: string;
  type: QuestionType;
  options?: string[]; // For MCQ and MSQ (legacy plain text options)
  optionDetails?: QuestionOption[]; // Enhanced options with text/image and correctness
  correctAnswer?: string | string[]; // Single string for NAT/MCQ, array for MSQ
  marks: number;
  negativeMarks: number;
  category?: string; // For analytics (e.g., "Arithmetic", "Visual Spatial")
}

export interface QuestionOption {
  id: string;
  type: 'text' | 'image';
  text?: string;
  imageData?: string; // base64/Data URL for quick preview/storage
  altText?: string;
  isCorrect: boolean;
}

export interface Section {
  id: string;
  name: string;
  questions: Question[];
}

export interface ExamPaper {
  id: string;
  year: number;
  title: string;
  examType: string; // New field: 'UCEED', 'CEED', 'NID', 'NIFT', etc.
  durationMinutes: number;
  isPremium?: boolean; // New field: Determines if the exam is locked for free users
  sections: Section[];
}

export interface UserResponse {
  [questionId: string]: string | string[]; // Answer value
}

export interface UserQuestionStatus {
  [questionId: string]: QuestionStatus;
}

export interface ExamSession {
  examId: string;
  responses: UserResponse;
  status: UserQuestionStatus;
  remainingTime: number; // in seconds
  currentSectionIndex: number;
  currentQuestionIndex: number;
  isComplete: boolean;
}

export interface UserAttempt {
  id: string;
  created_at: string;
  user_id: string;
  paper_id: string;
  responses: UserResponse;
  time_spent: number;
  score: number;
  max_score: number;
  accuracy: number;
  paper_title?: string; // For display purposes
  exam_type?: string; // For filtering
}

// Razorpay Types
declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  created_at: number;
}

export interface RazorpayPaymentHandlerResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
