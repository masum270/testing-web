import { ExamResult } from './quiz.js';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  studentClass: '9' | '10';
  school?: string;
  district?: string;
  phoneNumber?: string;
  isVerified: boolean;
  otpCode?: string;
  otpExpiresAt?: number;
  createdAt: string;
  totalXP?: number;
  level?: number;
  totalExams?: number;
  totalCorrect?: number;
  totalAttempted?: number;
  avatar?: string;
  photoURL?: string;
  examHistory?: ExamResult[];
}

export interface AuthSession {
  token: string;
  userId: string;
  email: string;
  name: string;
  expiresAt: number;
}
