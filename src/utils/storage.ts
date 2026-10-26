import { UserProfile, ExamResult } from '../types/quiz.js';
import { calculateLevel } from './quizLogic.js';
import { updateUserExamStats, getCurrentUser } from './auth.js';

const STORAGE_KEY = 'class910_livemcq_user_v1';

// ✅ FRESH - No dummy data
export const DEFAULT_USER_PROFILE: UserProfile = {
  name: '', // empty, will be set after login
  school: '',
  avatar: '', // empty, no default image
  totalXP: 0,
  level: 0,
  totalExams: 0,
  totalCorrect: 0,
  totalAttempted: 0,
  accuracyHistory: [],
  attemptedIds: [],
  recentExams: []
};

export function getUserProfile(): UserProfile {
  if (typeof window === 'undefined') {
    return DEFAULT_USER_PROFILE;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // ✅ Don't auto save dummy, return empty fresh profile
      return DEFAULT_USER_PROFILE;
    }
    const parsed = JSON.parse(raw);
    // Purge old demo user if present in local storage
    if (parsed.name === 'মাসুম বিল্লাহ' || (parsed.totalXP === 140 && parsed.totalExams === 2)) {
      localStorage.removeItem(STORAGE_KEY);
      return DEFAULT_USER_PROFILE;
    }
    return {
      ...DEFAULT_USER_PROFILE,
      ...parsed,
      level: calculateLevel(parsed.totalXP || 0)
    };
  } catch (e) {
    console.error('Error reading user profile from localStorage:', e);
    return DEFAULT_USER_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfile, latestExam?: ExamResult): void {
  if (typeof window === 'undefined') return;
  try {
    profile.level = calculateLevel(profile.totalXP);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));

    // Also sync with tfs_users
    const active = getCurrentUser();
    if (!active) return; // ✅ Don't sync if no logged in user
    const identifier = active.id;
    updateUserExamStats(identifier, {
      totalXP: profile.totalXP,
      level: profile.level,
      totalExams: profile.totalExams,
      totalCorrect: profile.totalCorrect,
      totalAttempted: profile.totalAttempted,
      school: profile.school,
      avatar: profile.avatar,
      latestExam
    });

    window.dispatchEvent(new Event('tfs_leaderboard_updated'));
  } catch (e) {
    console.error('Error saving user profile to localStorage:', e);
  }
}

export function recordExamCompletion(result: ExamResult): UserProfile {
  const current = getUserProfile();

  const newAttemptedIds = [...current.attemptedIds];
  result.answers.forEach((a) => {
    if (!newAttemptedIds.includes(a.question.id)) {
      newAttemptedIds.push(a.question.id);
    }
  });

  const updatedXP = current.totalXP + result.scoreXP;
  const updatedTotalExams = current.totalExams + 1;
  const updatedTotalCorrect = current.totalCorrect + result.correctCount;
  const updatedTotalAttempted = current.totalAttempted + (result.totalQuestions - result.skippedCount);
  const updatedAccuracyHistory = [...current.accuracyHistory.slice(-19), result.accuracy];
  const updatedRecentExams = [result, ...current.recentExams.slice(0, 19)];

  const updated: UserProfile = {
    ...current,
    totalXP: updatedXP,
    level: calculateLevel(updatedXP),
    totalExams: updatedTotalExams,
    totalCorrect: updatedTotalCorrect,
    totalAttempted: updatedTotalAttempted,
    accuracyHistory: updatedAccuracyHistory,
    attemptedIds: newAttemptedIds,
    recentExams: updatedRecentExams
  };

  saveUserProfile(updated, result);
  return updated;
}

// ✅ Extra: Function to make fresh
export function clearUserProfile() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}