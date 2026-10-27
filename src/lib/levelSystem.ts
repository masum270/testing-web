export interface LevelConfig {
  level: number;
  name: string;
  minXP: number;
  badge: string;
  color: string;
}

export const LEVEL_XP: Record<number, number> = {
  1: 400,
  2: 1000,
  3: 2200,
  4: 3500,
  5: 5000,
  6: 7000,
  7: 10000
};

export const LEVEL_DETAILS: { [lvl: number]: { title: string; badge: string; color: string } } = {
  0: { title: 'নবীন শিক্ষার্থী (Newbie)', badge: '🌱', color: 'from-slate-500 to-emerald-600' },
  1: { title: 'নবীন বিজ্ঞানী (Rookie)', badge: '🌱', color: 'from-emerald-500 to-teal-600' },
  2: { title: 'অনুসন্ধানী শিক্ষার্থী (Explorer)', badge: '🔭', color: 'from-cyan-500 to-blue-600' },
  3: { title: 'দক্ষ গবেষক (Researcher)', badge: '🧪', color: 'from-blue-600 to-indigo-600' },
  4: { title: 'বিজ্ঞান মাস্টার (Master)', badge: '⚡', color: 'from-indigo-600 to-purple-600' },
  5: { title: 'গ্র্যান্ডমাস্টার (Grandmaster)', badge: '👑', color: 'from-purple-600 to-pink-600' },
  6: { title: 'আইনস্টাইন স্কলার (Einstein Scholar)', badge: '🌌', color: 'from-amber-500 to-orange-600' },
  7: { title: 'লেজেন্ডারি লেভেল (Legendary)', badge: '🏆', color: 'from-rose-500 to-red-600' }
};

export const EXAM_XP_REWARD = 100;

export function calcLevel(xp: number): number {
  if (xp >= 10000) return 7;
  if (xp >= 7000) return 6;
  if (xp >= 5000) return 5;
  if (xp >= 3500) return 4;
  if (xp >= 2200) return 3;
  if (xp >= 1000) return 2;
  if (xp >= 400) return 1;
  return 0;
}

export function getNextLevelXP(currentLevel: number): number {
  if (currentLevel >= 7) return 10000;
  return LEVEL_XP[currentLevel + 1] || 400;
}

export function getPreviousLevelXP(currentLevel: number): number {
  if (currentLevel <= 0) return 0;
  return LEVEL_XP[currentLevel] || 0;
}

export function getLevelProgress(xp: number): {
  currentLevel: number;
  prevXP: number;
  nextXP: number;
  percentage: number;
  neededXP: number;
  title: string;
  badge: string;
} {
  const currentLevel = calcLevel(xp);
  const prevXP = currentLevel === 0 ? 0 : LEVEL_XP[currentLevel] || 0;
  const nextXP = currentLevel >= 7 ? 10000 : (LEVEL_XP[currentLevel + 1] || 400);
  const totalForCurrentTier = Math.max(1, nextXP - prevXP);
  const earnedInCurrentTier = Math.max(0, xp - prevXP);
  const percentage = currentLevel >= 7 ? 100 : Math.min(100, Math.round((earnedInCurrentTier / totalForCurrentTier) * 100));
  const neededXP = Math.max(0, nextXP - xp);
  const details = LEVEL_DETAILS[currentLevel] || LEVEL_DETAILS[0];

  return {
    currentLevel,
    prevXP,
    nextXP,
    percentage,
    neededXP,
    title: details.title,
    badge: details.badge
  };
}
