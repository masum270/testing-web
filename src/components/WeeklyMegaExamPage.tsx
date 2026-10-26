import React, { useState, useEffect } from 'react';
import { AuthUser } from '../types/auth.js';
import { MCQ, ExamResult } from '../types/quiz.js';
import { db } from '../firebase.js';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { ExamHall } from './ExamHall.js';
import {
  Trophy,
  Clock,
  Award,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Play,
  Share2,
  Medal,
  Crown,
  ChevronLeft
} from 'lucide-react';
import { motion } from 'framer-motion';

export interface MegaExamDoc {
  id: string;
  weekId: string;
  title: string;
  weekStart: string;
  weekEnd: string;
  questions: MCQ[];
  durationMinutes: number;
  isActive: boolean;
  totalMarks: number;
}

interface WeeklyMegaExamPageProps {
  currentUser: AuthUser | null;
  onNavigateLogin: () => void;
  onNavigateHome: () => void;
}

export const WeeklyMegaExamPage: React.FC<WeeklyMegaExamPageProps> = ({
  currentUser,
  onNavigateLogin,
  onNavigateHome
}) => {
  const [activeMegaExam, setActiveMegaExam] = useState<MegaExamDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [userResult, setUserResult] = useState<any | null>(null);
  const [isExamActive, setIsExamActive] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [timeLeftStr, setTimeLeftStr] = useState('');

  // 1. Fetch active Mega Exam
  useEffect(() => {
    try {
      const q = query(collection(db, 'mega_exams'), where('isActive', '==', true));
      const unsub = onSnapshot(
        q,
        (snap) => {
          if (!snap.empty) {
            const first = snap.docs[0];
            setActiveMegaExam({ id: first.id, ...(first.data() as any) });
          } else {
            setActiveMegaExam(null);
          }
          setLoading(false);
        },
        (err) => {
          console.warn('mega_exams snapshot notice:', err);
          setLoading(false);
        }
      );
      return () => unsub();
    } catch (e) {
      setLoading(false);
    }
  }, []);

  // 2. Check if current user already submitted this week's exam
  useEffect(() => {
    if (!currentUser || !activeMegaExam) return;

    const checkParticipation = async () => {
      try {
        const resId = `mega_${activeMegaExam.id}_${currentUser.id}`;
        const snap = await getDocs(
          query(
            collection(db, 'mega_exam_results'),
            where('megaExamId', '==', activeMegaExam.id),
            where('userId', '==', currentUser.id)
          )
        );
        if (!snap.empty) {
          setUserResult(snap.docs[0].data());
        }
      } catch (e) {
        // Ignored
      }
    };
    checkParticipation();
  }, [currentUser, activeMegaExam]);

  // 3. Realtime Mega Exam Leaderboard
  useEffect(() => {
    if (!activeMegaExam) return;

    try {
      const q = query(
        collection(db, 'mega_exam_results'),
        where('megaExamId', '==', activeMegaExam.id),
        orderBy('score', 'desc'),
        limit(20)
      );
      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: any[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
          setLeaderboard(list);
        },
        (err) => console.warn('mega leaderboard err:', err)
      );
      return () => unsub();
    } catch (e) {
      // Ignored
    }
  }, [activeMegaExam]);

  // 4. Calculate countdown to weekEnd
  useEffect(() => {
    if (!activeMegaExam?.weekEnd) return;

    const updateCountdown = () => {
      const target = new Date(activeMegaExam.weekEnd).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeftStr('পরীক্ষা সমাপ্ত');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      setTimeLeftStr(`${days} দিন ${hours} ঘণ্টা ${minutes} মিনিট`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [activeMegaExam]);

  // Finish Mega Exam
  const handleFinishMegaExam = async (result: ExamResult) => {
    setIsExamActive(false);
    if (!currentUser || !activeMegaExam) return;

    const megaResult = {
      megaExamId: activeMegaExam.id,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      photoURL: currentUser.avatar || '',
      score: result.scoreXP,
      correctCount: result.correctCount,
      wrongCount: result.wrongCount,
      totalQuestions: result.totalQuestions,
      accuracy: result.accuracy,
      timeTakenSeconds: result.timeTakenSeconds,
      submittedAt: new Date().toISOString(),
      createdAt: serverTimestamp()
    };

    setUserResult(megaResult);

    try {
      const docRef = doc(db, 'mega_exam_results', `mega_${activeMegaExam.id}_${currentUser.id}`);
      await setDoc(docRef, megaResult);
    } catch (e) {
      console.warn('mega_exam_results save notice:', e);
    }
  };

  if (isExamActive && activeMegaExam && currentUser) {
    return (
      <ExamHall
        subject="সাপ্তাহিক মেগা এক্সাম"
        chapter="পূর্ণাঙ্গ সিলেবাস (১০০ MCQ)"
        initialQuestions={activeMegaExam.questions}
        timeLimitSeconds={(activeMegaExam.durationMinutes || 60) * 60}
        currentUser={currentUser}
        onFinishExam={handleFinishMegaExam}
        onExitExam={() => setIsExamActive(false)}
      />
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 font-sans max-w-7xl mx-auto space-y-8">
      {/* Back button */}
      <button
        onClick={onNavigateHome}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        হোমে ফিরে যান
      </button>

      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden p-8 sm:p-12 border border-amber-500/30 bg-gradient-to-r from-amber-600 via-purple-700 to-indigo-900 text-white shadow-2xl">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-black uppercase tracking-wider">
            <Trophy className="w-4 h-4 text-amber-300" />
            <span>সাপ্তাহিক মেগা মডেল টেস্ট</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
            {activeMegaExam ? activeMegaExam.title : '🏆 Weekly Mega Exam (100 MCQ)'}
          </h1>

          <p className="text-xs sm:text-sm text-indigo-100">
            সম্পূর্ণ বইয়ের ১০০টি স্ট্যান্ডার্ড নৈর্ব্যক্তিক প্রশ্নের উপর ৬০ মিনিটের লাইভ মডেল টেস্ট। সারা দেশের শিক্ষার্থীদের সাথে নিজের মেধা যাচাই করে পদক অর্জন করো!
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-semibold">
            <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-xl border border-white/10">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>সময়সীমা: ৬০ মিনিট</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-xl border border-white/10">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>মোট প্রশ্ন: ১০০ টি MCQ</span>
            </div>
            {timeLeftStr && (
              <div className="flex items-center gap-1.5 bg-amber-500/30 text-amber-300 px-3 py-1.5 rounded-xl border border-amber-400/30 font-bold">
                <Calendar className="w-4 h-4" />
                <span>বাকি সময়: {timeLeftStr}</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-4">
            {!currentUser ? (
              <button
                onClick={onNavigateLogin}
                className="px-8 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-black rounded-2xl shadow-xl transition-all cursor-pointer flex items-center gap-2 text-sm"
              >
                <span>পরীক্ষা দিতে গুগল দিয়ে লগইন করুন</span>
              </button>
            ) : userResult ? (
              <div className="p-4 rounded-2xl bg-black/40 border border-emerald-400/30 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-300 text-sm block">
                    তুমি ইতিমধ্যে এই সপ্তাহের মেগা এক্সামে অংশ নিয়েছো!
                  </span>
                  <span className="text-xs text-slate-300">
                    তোমার স্কোর: {userResult.score} / ১০০ (সঠিক: {userResult.correctCount} টি)
                  </span>
                </div>
              </div>
            ) : activeMegaExam && activeMegaExam.questions?.length > 0 ? (
              <button
                onClick={() => setIsExamActive(true)}
                className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black rounded-2xl shadow-xl transition-all cursor-pointer flex items-center gap-2 text-sm transform hover:scale-102"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>মেগা এক্সাম শুরু করুন (১০০ MCQ)</span>
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-xs text-amber-200">
                শীঘ্রই নতুন সপ্তাহের মেগা এক্সাম সক্রিয় করা হবে।
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mega Exam Leaderboard Table */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" />
              সাপ্তাহিক মেগা এক্সাম লিডারবোর্ড
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              এই সপ্তাহের ১০০ নম্বরের মডেল টেস্টে শীর্ষস্থান অধিকারী শিক্ষার্থীদের তালিকা
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            রিয়েল-টাইম
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-600 dark:text-slate-300">
                <th className="p-3.5 text-center w-16">র‌্যাংক</th>
                <th className="p-3.5">শিক্ষার্থী</th>
                <th className="p-3.5 text-center">স্কোর (Score)</th>
                <th className="p-3.5 text-center">সঠিক উত্তর</th>
                <th className="p-3.5 text-center">সময়</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    এখনও কোনো শিক্ষার্থী মেগা এক্সাম সম্পন্ন করেনি। তুমিই প্রথম হও!
                  </td>
                </tr>
              ) : (
                leaderboard.map((item, idx) => {
                  const isCurrent = currentUser && (currentUser.id === item.userId || currentUser.email === item.userEmail);
                  return (
                    <tr
                      key={item.id || idx}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                        isCurrent ? 'bg-amber-50/50 dark:bg-amber-950/20 font-bold' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        {idx === 0 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-slate-900 font-black">
                            🥇
                          </span>
                        ) : idx === 1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-900 font-black">
                            🥈
                          </span>
                        ) : idx === 2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-600 text-white font-black">
                            🥉
                          </span>
                        ) : (
                          <span className="font-bold text-slate-500">{idx + 1}</span>
                        )}
                      </td>
                      <td className="p-3.5 flex items-center gap-2.5">
                        {item.photoURL ? (
                          <img src={item.photoURL} alt="" className="w-7 h-7 rounded-full object-cover border" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                            {item.userName ? item.userName.charAt(0) : 'U'}
                          </div>
                        )}
                        <div>
                          <span className="font-bold block text-slate-800 dark:text-slate-100">
                            {item.userName || 'শিক্ষার্থী'}
                          </span>
                          {isCurrent && <span className="text-[10px] text-amber-600 font-bold">(তুমি)</span>}
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        {item.score || 0}
                      </td>
                      <td className="p-3.5 text-center text-slate-600 dark:text-slate-400 font-semibold">
                        {item.correctCount || 0} / {item.totalQuestions || 100}
                      </td>
                      <td className="p-3.5 text-center font-mono text-slate-500">
                        {Math.floor((item.timeTakenSeconds || 0) / 60)} মি. {(item.timeTakenSeconds || 0) % 60} সে.
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WeeklyMegaExamPage;
