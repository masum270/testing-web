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
  if (!xp || xp < LEVEL_XP[1]) return 1;
  if (xp < LEVEL_XP[2]) return 2;
  if (xp < LEVEL_XP[3]) return 3;
  if (xp < LEVEL_XP[4]) return 4;
  if (xp < LEVEL_XP[5]) return 5;
  if (xp < LEVEL_XP[6]) return 6;
  return 7;
}

export function getNextLevelXP(currentLevel: number): number {
  if (currentLevel >= 7) return LEVEL_XP[7];
  return LEVEL_XP[currentLevel] || 400;
}

export function getPreviousLevelXP(currentLevel: number): number {
  if (currentLevel <= 1) return 0;
  return LEVEL_XP[currentLevel - 1] || 0;
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
  const prevXP = getPreviousLevelXP(currentLevel);
  const nextXP = getNextLevelXP(currentLevel);
  const totalForCurrentTier = Math.max(1, nextXP - prevXP);
  const earnedInCurrentTier = Math.max(0, xp - prevXP);
  const percentage = Math.min(100, Math.round((earnedInCurrentTier / totalForCurrentTier) * 100));
  const neededXP = Math.max(0, nextXP - xp);
  const details = LEVEL_DETAILS[currentLevel] || LEVEL_DETAILS[1];

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
