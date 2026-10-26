import { MCQ } from '../types/quiz.js';

/**
 * Convert numbers to Bengali digits
 */
export function toBengaliNumber(num: number | string): string {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (digit) => bnDigits[parseInt(digit, 10)]);
}

/**
 * Format seconds into MM:SS format with optional Bengali numerals
 */
export function formatTimer(totalSeconds: number, inBengali = true): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return inBengali ? toBengaliNumber(formatted) : formatted;
}

/**
 * Calculate user level based on XP: Level = floor(totalXP / 100) + 1 (or 0 if 0 XP)
 */
export function calculateLevel(totalXP: number): number {
  if (totalXP <= 0) return 0;
  return Math.floor(totalXP / 100) + 1;
}

/**
 * Calculate progress percentage towards next level (0 to 100)
 */
export function calculateLevelProgress(totalXP: number): number {
  if (totalXP <= 0) return 0;
  return totalXP % 100;
}

/**
 * Calculate earned XP: +10 XP for correct, -2 XP for wrong (optional negative scoring)
 */
export function calculateScoreXP(correctCount: number, wrongCount: number, penalty = true): number {
  const earned = correctCount * 10;
  const deducted = penalty ? wrongCount * 2 : 0;
  return Math.max(0, earned - deducted);
}

/**
 * Calculate accuracy percentage
 */
export function calculateAccuracy(correctCount: number, totalQuestions: number): number {
  if (totalQuestions <= 0) return 0;
  return Math.round((correctCount / totalQuestions) * 100);
}

/**
 * Fisher-Yates array shuffle (deterministic or random)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Filter and select exam questions without duplicates, prioritizing unattempted questions.
 * Supports multiple selected chapters (e.g. Goddo / Poddo chapter selection in Bangla 1st Paper).
 */
export function selectExamQuestions(
  allMCQs: MCQ[],
  subject: string,
  chapter: string,
  count: number,
  attemptedIds: string[] = [],
  selectedChapters?: string[]
): MCQ[] {
  // Filter by subject
  let pool = allMCQs.filter((q) => q.subject.trim() === subject.trim());

  if (pool.length === 0) {
    // Relaxed subject match
    pool = allMCQs.filter(
      (q) =>
        q.subject.toLowerCase().includes(subject.toLowerCase()) ||
        subject.toLowerCase().includes(q.subject.toLowerCase())
    );
  }

  // Filter by selected chapters if provided and not 'all'
  if (selectedChapters && selectedChapters.length > 0 && !selectedChapters.includes('all')) {
    const chapterSet = new Set(selectedChapters.map((c) => c.trim()));
    const matching = pool.filter((q) => chapterSet.has(q.chapter.trim()));
    if (matching.length > 0) {
      pool = matching;
    }
  } else if (
    chapter &&
    chapter !== 'all' &&
    chapter !== 'সকল অধ্যায়' &&
    chapter !== 'সকল গদ্য' &&
    chapter !== 'সকল পদ্য'
  ) {
    const matching = pool.filter((q) => q.chapter.trim() === chapter.trim());
    if (matching.length > 0) {
      pool = matching;
    }
  }

  if (pool.length === 0) {
    pool = allMCQs.filter((q) => q.subject.trim() === subject.trim());
  }

  if (pool.length === 0) {
    pool = allMCQs;
  }

  // Separate into unattempted and attempted
  const attemptedSet = new Set(attemptedIds);
  const unattempted = pool.filter((q) => !attemptedSet.has(q.id));
  const attempted = pool.filter((q) => attemptedSet.has(q.id));

  // Shuffle both sets
  const shuffledUnattempted = shuffleArray(unattempted);
  const shuffledAttempted = shuffleArray(attempted);

  // Combine: prioritize unattempted, then wrap around with attempted if needed
  const combined = [...shuffledUnattempted, ...shuffledAttempted];

  // Return requested count (or maximum available)
  return combined.slice(0, Math.min(count, combined.length));
}
