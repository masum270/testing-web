export type TeamRole = 'super_admin' | 'admin' | 'moderator';

export interface TeamPermissions {
  canAddQuestion: boolean;
  canEditQuestion: boolean;
  canDeleteQuestion: boolean;
  canBulkUpload: boolean;
  canViewUsers: boolean;
  canManageTeam: boolean;
  canViewLogs: boolean;
  canViewLiveExam: boolean;
  canViewLeaderboard: boolean;
}

export interface TeamMember {
  email: string;
  name: string;
  role: TeamRole;
  addedBy: string;
  addedAt: string;
  status: 'active' | 'suspended';
  permissions: TeamPermissions;
}

export interface ExamSessionDoc {
  sessionId: string;
  userId: string;
  userEmail: string;
  userName: string;
  photoURL?: string;
  subject: string;
  chapter: string;
  startTime: string;
  lastActiveTime: string;
  status: 'live' | 'finished' | 'abandoned';
  totalQuestions: number;
  answeredCount: number;
  currentQuestionIndex: number;
  progressPercent: number;
  device?: string;
  ip?: string;
  answers?: Record<string, number>;
}

export interface ExamResultDoc {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  photoURL?: string;
  subject: string;
  chapter: string;
  score: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  timeTaken: number;
  submittedAt: string;
  answers?: Record<string, number>;
  rank?: number;
}

export interface AdminLogDoc {
  id?: string;
  action: string;
  performedBy: string;
  userRole?: string;
  details: string;
  timestamp: string;
}

export interface SecurityLogDoc {
  id?: string;
  event: string;
  attemptedBy: string;
  details: string;
  timestamp: string;
}
