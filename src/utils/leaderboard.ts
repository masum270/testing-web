import { LeaderboardEntry, UserProfile, ExamResult } from '../types/quiz.js';
import { calculateAccuracy, calculateLevel } from './quizLogic.js';
import { getRegisteredUsers, getCurrentUser } from './auth.js';

export type TimeFilter = 'all' | 'today' | 'week';

export interface LeaderboardFilterOptions {
  subject?: string;
  timeframe?: TimeFilter;
  sortBy?: 'score' | 'mcqs';
}

function isWithinTimeframe(dateStr: string, timeframe: TimeFilter): boolean {
  if (timeframe === 'all') return true;
  const examTime = new Date(dateStr).getTime();
  if (isNaN(examTime)) return false;

  const now = Date.now();
  if (timeframe === 'today') {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return examTime >= todayStart.getTime();
  }
  if (timeframe === 'week') {
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    return examTime >= oneWeekAgo;
  }
  return true;
}

function isSubjectMatch(examSubject: string, targetSubject: string): boolean {
  if (!targetSubject || targetSubject === 'all' || targetSubject === 'সকল বিষয়') {
    return true;
  }
  const cleanTarget = targetSubject.trim().toLowerCase();
  const cleanExam = (examSubject || '').trim().toLowerCase();
  return cleanExam === cleanTarget || cleanExam.includes(cleanTarget) || cleanTarget.includes(cleanExam);
}

/**
 * Computes strictly real user leaderboard from getRegisteredUsers()
 * - Deduplicates: const unique = Array.from(new Map(users.map(u => [u.id, u])).values())
 * - Sorts descending by totalXP
 * - If no users have taken exams, returns empty array
 */
export function getFilteredLeaderboard(
  currentUser?: UserProfile,
  options: LeaderboardFilterOptions = {}
): LeaderboardEntry[] {
  if (typeof window === 'undefined') return [];

  const { subject = 'all', timeframe = 'all', sortBy = 'score' } = options;

  // Fetch from getRegisteredUsers() only
  const allUsers = getRegisteredUsers();

  // Deduplicate users by ID
  const uniqueUsers = Array.from(new Map(allUsers.map((u) => [u.id, u])).values());

  const activeUser = getCurrentUser();

  const entries: LeaderboardEntry[] = [];

  for (const u of uniqueUsers) {
    const isThisCurrentUser = !!(
      (activeUser && activeUser.id === u.id) ||
      (currentUser && currentUser.name && u.name && currentUser.name.trim().toLowerCase() === u.name.trim().toLowerCase())
    );

    const history: ExamResult[] = Array.isArray(u.examHistory) ? [...u.examHistory] : [];

    let scoreXP = u.totalXP || 0;
    let totalExams = u.totalExams || 0;
    let totalCorrect = u.totalCorrect || 0;
    let totalAttempted = u.totalAttempted || 0;

    // Filter by subject/timeframe if selected
    if (subject !== 'all' || timeframe !== 'all') {
      const matching = history.filter((e) => isSubjectMatch(e.subject, subject) && isWithinTimeframe(e.date, timeframe));
      totalExams = matching.length;
      scoreXP = 0;
      totalCorrect = 0;
      totalAttempted = 0;
      matching.forEach((e) => {
        scoreXP += e.scoreXP || 0;
        totalCorrect += e.correctCount || 0;
        totalAttempted += (e.totalQuestions - (e.skippedCount || 0)) || 0;
      });
    }

    // Only include users who have earned XP or taken exams
    if (scoreXP > 0 || totalExams > 0) {
      entries.push({
        rank: 0,
        id: u.id,
        name: u.name || 'শিক্ষার্থী',
        school: u.school || 'বাংলাদেশ মাধ্যমিক বিদ্যালয়',
        district: u.district || 'ঢাকা',
        avatar: u.avatar || '',
        level: calculateLevel(scoreXP),
        totalXP: scoreXP,
        totalExams,
        totalSolvedMCQs: totalCorrect,
        accuracy: calculateAccuracy(totalCorrect, totalAttempted || 1),
        isCurrentUser: isThisCurrentUser
      });
    }
  }

  // Sort descending: highest score first
  entries.sort((a, b) => {
    if (sortBy === 'mcqs') {
      if (b.totalSolvedMCQs !== a.totalSolvedMCQs) return b.totalSolvedMCQs - a.totalSolvedMCQs;
      return b.totalXP - a.totalXP;
    }
    if (b.totalXP !== a.totalXP) return b.totalXP - a.totalXP;
    return b.totalSolvedMCQs - a.totalSolvedMCQs;
  });

  return entries.map((entry, idx) => ({
    ...entry,
    rank: idx + 1
  }));
}

export function getRealLeaderboard(currentUser?: UserProfile): LeaderboardEntry[] {
  return getFilteredLeaderboard(currentUser, { subject: 'all', timeframe: 'all' });
}
