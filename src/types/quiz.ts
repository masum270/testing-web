export interface MCQ {
  id: string;
  subject: string;
  chapter: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type?: string;
  isAiGenerated?: boolean;
  imageUrl?: string;
}

export interface ExamSessionConfig {
  subject: string;
  chapter: string; // 'all' or specific chapter name or label
  selectedChapters?: string[]; // optional array of specific selected chapters (e.g. for Goddo/Poddo multi-select)
  questionCount: number;
  timeLimitSeconds: number;
}

export interface UserAnswerRecord {
  questionId: string;
  selectedOptionIndex: number | null; // null if skipped
  isCorrect: boolean;
  timeSpentSeconds: number;
}

export interface ExamResult {
  id: string;
  date: string;
  subject: string;
  chapter: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  accuracy: number;
  scoreXP: number;
  xpEarned?: number;
  newLevel?: number;
  isLevelUp?: boolean;
  timeTakenSeconds: number;
  rank?: number;
  totalParticipants?: number;
  answers: {
    question: MCQ;
    selectedOptionIndex: number | null;
    isCorrect: boolean;
  }[];
}

export interface UserProfile {
  name: string;
  rollNo?: string;
  school?: string;
  avatar: string;
  totalXP: number;
  level: number;
  totalExams: number;
  totalCorrect: number;
  totalAttempted: number;
  accuracyHistory: number[];
  attemptedIds: string[];
  recentExams: ExamResult[];
}

export interface SubjectInfo {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  category: 'Science' | 'Arts' | 'Commerce' | 'General';
  color: string;
  accentBg: string;
  totalMCQs: number;
  chapters: string[];
  goddoChapters?: string[];
  poddoChapters?: string[];
  sections?: { title: string; chapters: string[] }[];
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  school: string;
  district?: string;
  avatar: string;
  level: number;
  totalXP: number;
  totalExams: number;
  totalSolvedMCQs: number;
  accuracy: number;
  isCurrentUser?: boolean;
}
