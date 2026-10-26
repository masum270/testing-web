import React, { useEffect, useState } from 'react';
import { AuthUser } from '../types/auth.js';
import { db } from '../firebase.js';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { Flame, Trophy, Award, Gift, Sparkles, Check, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DailyStreakProps {
  user: AuthUser | null;
  onNavigatePractice?: () => void;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  totalDays: number;
  rewardsClaimed?: { [key: string]: boolean };
}

export const DailyStreak: React.FC<DailyStreakProps> = ({ user, onNavigatePractice }) => {
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 1,
    longestStreak: 1,
    lastActiveDate: '',
    totalDays: 1,
    rewardsClaimed: {}
  });
  const [newReward, setNewReward] = useState<{ days: number; points: number } | null>(null);

  useEffect(() => {
    if (!user) return;

    const syncStreak = async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

        const streakRef = doc(db, 'user_streaks', user.id);
        const snap = await getDoc(streakRef);

        let data: StreakData;

        if (snap.exists()) {
          const prev = snap.data() as StreakData;
          if (prev.lastActiveDate === todayStr) {
            // Already counted today
            data = prev;
          } else if (prev.lastActiveDate === yesterdayStr) {
            // Continued streak
            const nextCurrent = (prev.currentStreak || 0) + 1;
            const nextLongest = Math.max(prev.longestStreak || 0, nextCurrent);
            const rewards = prev.rewardsClaimed || {};

            let rewardBonus = 0;
            if (nextCurrent >= 3 && !rewards['3_days']) {
              rewards['3_days'] = true;
              rewardBonus += 10;
              setNewReward({ days: 3, points: 10 });
            }
            if (nextCurrent >= 7 && !rewards['7_days']) {
              rewards['7_days'] = true;
              rewardBonus += 50;
              setNewReward({ days: 7, points: 50 });
            }

            data = {
              currentStreak: nextCurrent,
              longestStreak: nextLongest,
              lastActiveDate: todayStr,
              totalDays: (prev.totalDays || 0) + 1,
              rewardsClaimed: rewards
            };

            await setDoc(streakRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });

            if (rewardBonus > 0) {
              const userRef = doc(db, 'users', user.id);
              await updateDoc(userRef, {
                streakPoints: increment(rewardBonus),
                totalXP: increment(rewardBonus)
              });
            }
          } else {
            // Broken streak, reset to 1
            data = {
              currentStreak: 1,
              longestStreak: prev.longestStreak || 1,
              lastActiveDate: todayStr,
              totalDays: (prev.totalDays || 0) + 1,
              rewardsClaimed: prev.rewardsClaimed || {}
            };
            await setDoc(streakRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
          }
        } else {
          // First time streak
          data = {
            currentStreak: 1,
            longestStreak: 1,
            lastActiveDate: todayStr,
            totalDays: 1,
            rewardsClaimed: {}
          };
          await setDoc(streakRef, { ...data, createdAt: serverTimestamp() });
        }

        setStreak(data);
      } catch (e) {
        console.warn('Streak update deferred:', e);
      }
    };

    syncStreak();
  }, [user]);

  const daysList = ['সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি', 'রবি'];
  const currentStreak = streak.currentStreak || 1;

  return (
    <div className="relative overflow-hidden rounded-3xl p-5 border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent backdrop-blur-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Flame & Streak count */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
            <Flame className="w-7 h-7 fill-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-800 dark:text-slate-100">
                {currentStreak} দিনের স্ট্রিক! 🔥
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                রেকর্ড: {streak.longestStreak || 1} দিন
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              প্রতিদিন অন্তত একটি চ্যাপ্টার অনুশীলন করে স্ট্রিক ধরে রাখুন
            </p>
          </div>
        </div>

        {/* Right: Quick practice trigger */}
        {onNavigatePractice && (
          <button
            onClick={onNavigatePractice}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md hover:shadow-lg transition-all cursor-pointer whitespace-nowrap"
          >
            <span>আজকের অনুশীলন</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 7-Days Flame Track */}
      <div className="mt-4 pt-3 border-t border-amber-500/15 flex items-center justify-between gap-2 overflow-x-auto py-1">
        {daysList.map((dayName, idx) => {
          const isDone = idx < (currentStreak % 7 === 0 && currentStreak > 0 ? 7 : currentStreak % 7);
          const isCurrentTarget = idx === (currentStreak % 7);

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1 min-w-[36px]">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  isDone
                    ? 'bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-500/20'
                    : isCurrentTarget
                    ? 'bg-orange-500/20 border-2 border-dashed border-orange-500 text-orange-600 animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400'
                }`}
              >
                <Flame className={`w-4 h-4 ${isDone ? 'fill-white' : ''}`} />
              </div>
              <span className="text-[10px] font-medium text-slate-500">{dayName}</span>
            </div>
          );
        })}
      </div>

      {/* Milestone Rewards notification modal */}
      <AnimatePresence>
        {newReward && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className="max-w-sm w-full bg-slate-900 border border-amber-500/30 rounded-3xl p-6 text-center text-white shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 mx-auto flex items-center justify-center shadow-lg shadow-orange-500/40 mb-4">
                <Gift className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-black text-amber-400">অভিনন্দন! স্ট্রিক রিওয়ার্ড 🎁</h3>
              <p className="text-sm text-slate-300 mt-2">
                তুমি সফলভাবে <span className="font-bold text-white">{newReward.days} দিন</span> স্ট্রিক বজায় রেখেছো!
              </p>
              <div className="my-4 py-3 px-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                <span className="text-2xl font-black text-amber-400">+{newReward.points} এক্সপি বোনাস</span>
              </div>
              <button
                onClick={() => setNewReward(null)}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl font-bold text-xs text-white shadow-md cursor-pointer"
              >
                ধন্যবাদ, চালিয়ে যাব!
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DailyStreak;
