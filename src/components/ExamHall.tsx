import React, { useState, useEffect, useRef } from 'react';
import { MCQ, ExamResult } from '../types/quiz.js';
import { AuthUser } from '../types/auth.js';
import { toBengaliNumber, formatTimer, calculateAccuracy, calculateScoreXP } from '../utils/quizLogic.js';
import {
  createExamSession,
  updateExamSessionProgress,
  finishExamSession,
  recordExamResult
} from '../services/adminService.js';
import {
  db,
  auth,
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  increment,
  serverTimestamp
} from '../firebase.js';
import { calcLevel } from '../lib/levelSystem.js';
import {
  Clock,
  Send,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  Minimize2,
  X,
  Loader2
} from 'lucide-react';

interface ExamHallProps {
  subject: string;
  chapter: string;
  initialQuestions: MCQ[];
  timeLimitSeconds: number;
  currentUser?: AuthUser | null;
  onFinishExam: (result: ExamResult) => void;
  onExitExam: () => void;
}

export const ExamHall: React.FC<ExamHallProps> = ({
  subject,
  chapter,
  initialQuestions,
  timeLimitSeconds,
  currentUser,
  onFinishExam,
  onExitExam
}) => {
  const [questions, setQuestions] = useState<MCQ[]>(initialQuestions);
  // Indexed by question index for instant, conflict-free selection
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const selectedAnswersRef = useRef<Record<number, number>>({});
  selectedAnswersRef.current = selectedAnswers;

  const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const sessionIdRef = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalQ = questions.length;
  const optionLetters = ['ক', 'খ', 'গ', 'ঘ'];

  const answeredCount = Object.keys(selectedAnswers).filter(
    (k) => selectedAnswers[Number(k)] !== null && selectedAnswers[Number(k)] !== undefined
  ).length;
  const unansweredCount = Math.max(0, totalQ - answeredCount);

  // Initialize Live Exam Session in Firestore
  useEffect(() => {
    const chapterName = chapter === 'all' ? 'সকল অধ্যায়' : chapter;
    createExamSession({
      sessionId: sessionIdRef.current,
      userId: currentUser?.id || 'guest',
      userEmail: currentUser?.email || 'guest@example.com',
      userName: currentUser?.name || 'শিক্ষার্থী',
      photoURL: currentUser?.photoURL,
      subject,
      chapter: chapterName,
      startTime: new Date().toISOString(),
      lastActiveTime: new Date().toISOString(),
      status: 'live',
      totalQuestions: initialQuestions.length,
      answeredCount: 0,
      currentQuestionIndex: 0,
      ip: '127.0.0.1',
      device: typeof navigator !== 'undefined' ? (navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop') : 'Web',
      progressPercent: 0,
      answers: {}
    }).catch(() => {});

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      finishExamSession(sessionIdRef.current).catch(() => {});
    };
  }, []);

  // Direct selection handler without radio/label conflict + live progress update
  const handleSelect = (qIndex: number, oIndex: number) => {
    setSelectedAnswers((prev) => {
      const updated = {
        ...prev,
        [qIndex]: oIndex
      };
      const answered = Object.keys(updated).filter(
        (k) => updated[Number(k)] !== null && updated[Number(k)] !== undefined
      ).length;
      const progress = Math.round((answered / Math.max(1, totalQ)) * 100);
      updateExamSessionProgress(sessionIdRef.current, answered, progress, updated, qIndex).catch(() => {});
      return updated;
    });
  };

  const handleFinalSubmit = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Finish live exam session in Firestore
    finishExamSession(sessionIdRef.current).catch(() => {});

    const timeSpent = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    const currentAnswers = selectedAnswersRef.current;

    const detailedAnswers = questions.map((q, qIndex) => {
      const selected = currentAnswers[qIndex];
      if (selected === undefined || selected === null) {
        skippedCount++;
        return {
          question: q,
          selectedOptionIndex: null,
          isCorrect: false
        };
      } else if (selected === q.correctIndex) {
        correctCount++;
        return {
          question: q,
          selectedOptionIndex: selected,
          isCorrect: true
        };
      } else {
        wrongCount++;
        return {
          question: q,
          selectedOptionIndex: selected,
          isCorrect: false
        };
      }
    });

    const accuracy = calculateAccuracy(correctCount, totalQ);
    const scoreXP = calculateScoreXP(correctCount, wrongCount, true);
    const chapterName = chapter === 'all' ? 'সকল অধ্যায়' : chapter;

    const uid = auth.currentUser?.uid || currentUser?.id || `anon_${Date.now()}`;
    const email = auth.currentUser?.email || currentUser?.email || 'guest';
    const displayName = currentUser?.name || auth.currentUser?.displayName || 'শিক্ষার্থী';
    const photoURL = currentUser?.photoURL || auth.currentUser?.photoURL || '';
    const todayDateStr = new Date().toISOString().split('T')[0];

    const result: ExamResult = {
      id: `exam_${Date.now()}`,
      date: new Date().toLocaleDateString('bn-BD'),
      subject,
      chapter: chapterName,
      totalQuestions: totalQ,
      correctCount,
      wrongCount,
      skippedCount,
      accuracy,
      scoreXP,
      xpEarned: 100,
      timeTakenSeconds: timeSpent,
      answers: detailedAnswers
    };

    // 1. Create exam_results doc with addDoc and log id
    try {
      const examDocData = {
        uid,
        userId: uid,
        email,
        userEmail: email,
        displayName,
        userName: displayName,
        photoURL,
        subject,
        chapter: chapterName,
        type: 'বোর্ড প্রশ্ন',
        score: scoreXP,
        totalMarks: totalQ,
        totalQuestions: totalQ,
        correctCount,
        wrongCount,
        percentage: accuracy,
        timeTaken: timeSpent,
        createdAt: serverTimestamp(),
        timestamp: Date.now(),
        date: todayDateStr,
        xpEarned: 100
      };

      const docRef = await addDoc(collection(db, 'exam_results'), examDocData);
      console.log('Exam result saved with ID:', docRef.id);
      result.id = docRef.id;

      // 2. Also keep recordExamResult local cache updated for offline resilience
      recordExamResult({
        ...examDocData,
        answers: currentAnswers,
        rank: 1
      }).catch(() => {});
    } catch (e) {
      console.warn('Failed to save to exam_results via addDoc, falling back:', e);
      try {
        await recordExamResult({
          userId: uid,
          userEmail: email,
          userName: displayName,
          photoURL,
          subject,
          chapter: chapterName,
          score: scoreXP,
          totalMarks: totalQ,
          correctCount,
          wrongCount,
          timeTaken: timeSpent,
          answers: currentAnswers,
          rank: 1
        });
      } catch (err) {
        console.warn('Local save failed:', err);
      }
    }

    // 3. Update users/{uid} document with XP increment and new level calculation
    if (auth.currentUser?.uid || (currentUser?.id && !currentUser.id.startsWith('anon_'))) {
      const targetUid = auth.currentUser?.uid || currentUser!.id;
      const userRef = doc(db, 'users', targetUid);
      try {
        const userSnap = await getDoc(userRef);
        let currentXP = 0;
        let oldLevel = 0;
        if (userSnap.exists()) {
          const uData = userSnap.data();
          currentXP = uData.xp ?? uData.totalXP ?? 0;
          oldLevel = uData.level ?? calcLevel(currentXP);
        }
        const newXP = currentXP + 100;
        const newLevel = calcLevel(newXP);
        result.newLevel = newLevel;
        result.isLevelUp = newLevel > oldLevel;

        await setDoc(
          userRef,
          {
            xp: increment(100),
            totalXP: increment(100),
            level: newLevel,
            totalExams: increment(1),
            lastExamAt: serverTimestamp(),
            name: displayName,
            email,
            photoURL
          },
          { merge: true }
        );
      } catch (userUpdateErr) {
        console.warn('Could not update users doc XP and level:', userUpdateErr);
      }
    }

    onFinishExam(result);
  };

  // Countdown timer without re-triggering on selectedAnswers update
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [questions]);

  // AI MCQ Generator Feature
  const handleGenerateAiQuestions = async () => {
    setIsAiGenerating(true);
    setAiMessage(null);
    try {
      const targetChapter = chapter === 'all' ? (questions[0]?.chapter || 'সকল অধ্যায়') : chapter;
      const res = await fetch('/api/generate-mcqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          chapter: targetChapter,
          count: 5
        })
      });

      const data = await res.json();
      if (data.mcqs && data.mcqs.length > 0) {
        const existingTexts = new Set(questions.map((q) => q.question.trim()));
        const newUnique = data.mcqs.filter((q: MCQ) => !existingTexts.has(q.question.trim()));

        if (newUnique.length > 0) {
          setQuestions((prev) => [...prev, ...newUnique]);
          setTimeLeft((prev) => prev + newUnique.length * 60);
          setAiMessage(`🎉 AI সফলভাবে "${targetChapter}" অধ্যায়ের আরও ${toBengaliNumber(newUnique.length)} টি নতুন প্রশ্ন ও সময় যোগ করেছে!`);
        } else {
          setAiMessage('নতুন প্রশ্ন তৈরি হয়েছে, কিন্তু ইতিমধ্যে অন্তর্ভুক্ত আছে।');
        }
      } else {
        setAiMessage('প্রশ্ন তৈরিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      }
    } catch (e) {
      console.error('Error generating AI MCQs:', e);
      setAiMessage('সার্ভারে যোগাযোগ করা যায়নি। অফলাইন প্রশ্ন দিয়ে চালিয়ে যান।');
    } finally {
      setIsAiGenerating(false);
      setTimeout(() => setAiMessage(null), 5000);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const isTimeCritical = timeLeft <= 60;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-x-hidden overflow-y-auto select-none transition-colors bg-[#FFFDF9] dark:bg-slate-950"
    >
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 border-b shadow-xs px-3 sm:px-6 py-2.5 sm:py-3 transition-colors bg-[#FFF8EC]/95 dark:bg-slate-900/95 border-orange-200 dark:border-slate-800 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Exit & Subject */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setIsExitModalOpen(true)}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
              title="পরীক্ষা ত্যাগ করুন"
              aria-label="পরীক্ষা ত্যাগ করুন"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-extrabold text-xs sm:text-base text-[#6B2C0C] dark:text-orange-200 truncate">
                  {subject}
                </span>
                <span className="text-[10px] sm:text-xs font-bold bg-orange-200/70 dark:bg-orange-950/70 text-[#6B2C0C] dark:text-orange-300 px-2 py-0.5 rounded-md shrink-0">
                  {chapter === 'all' ? 'সকল অধ্যায়' : chapter}
                </span>
              </div>
            </div>
          </div>

          {/* Sticky Center Timer */}
          <div
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-2xl border font-bold text-xs sm:text-sm shrink-0 transition-all ${
              isTimeCritical
                ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse dark:bg-rose-950/40'
                : 'bg-orange-100 border-orange-300 text-[#6B2C0C] dark:bg-slate-800 dark:border-orange-500/30 dark:text-orange-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span className="text-sm sm:text-base font-black font-mono">
              {formatTimer(timeLeft, true)}
            </span>
          </div>

          {/* Answered progress text & Top Submit button */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-[#6B2C0C] dark:text-orange-200">
                প্রশ্ন {toBengaliNumber(totalQ)} টার মধ্যে {toBengaliNumber(answeredCount)} টা উত্তর দিয়েছেন
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                বাকি: {toBengaliNumber(unansweredCount)} টি
              </span>
            </div>

            <button
              onClick={handleGenerateAiQuestions}
              disabled={isAiGenerating}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              title="AI দিয়ে আরও ৫টি নতুন প্রশ্ন যোগ করুন"
            >
              {isAiGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              )}
              <span>+৫ AI প্রশ্ন</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 transition-colors hidden sm:block"
              title={isFullscreen ? 'ফুলস্ক্রিন বন্ধ' : 'ফুলস্ক্রিন মোড'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>জমা দাও</span>
            </button>
          </div>
        </div>

        {/* Top Progress Bar & Mobile Answered Count */}
        <div className="max-w-4xl mx-auto mt-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#6B2C0C] dark:text-orange-200 md:hidden mb-1">
            <span>প্রশ্ন {toBengaliNumber(totalQ)} টার মধ্যে {toBengaliNumber(answeredCount)} টা উত্তর দিয়েছেন</span>
            <span className="text-slate-500 dark:text-slate-400">বাকি: {toBengaliNumber(unansweredCount)}</span>
          </div>
          <div className="w-full bg-orange-200/50 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${(answeredCount / Math.max(1, totalQ)) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* AI Success Toast Message */}
      {aiMessage && (
        <div className="max-w-2xl mx-auto mt-3 px-4 w-full">
          <div className="p-3 bg-violet-600 text-white text-xs sm:text-sm font-semibold rounded-2xl shadow-lg flex items-center justify-between gap-2 animate-in slide-in-from-top-4">
            <span>{aiMessage}</span>
            <button onClick={() => setAiMessage(null)} className="text-white/80 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main All-in-one Scrollable MCQs Feed */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 space-y-6 pb-36 pt-6">
        {questions.map((question, qIndex) => (
          <div
            key={`q-${qIndex}-${question.id}`}
            className="bg-[#FFF8EC] dark:bg-slate-900 rounded-2xl p-5 sm:p-6 mb-6 shadow-sm border border-orange-100 dark:border-slate-800 relative transition-all hover:border-orange-200 dark:hover:border-slate-700"
          >
            {/* Question Card Meta */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-orange-200/60 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-7 h-7 rounded-xl bg-[#6B2C0C] dark:bg-orange-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs">
                  {toBengaliNumber(qIndex + 1)}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-orange-100 dark:bg-slate-800 text-[#6B2C0C] dark:text-orange-300">
                  {question.chapter}
                </span>
                {question.isAiGenerated && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    AI প্রশ্ন
                  </span>
                )}
              </div>

              <div className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
                {question.difficulty === 'easy' && 'সহজ'}
                {question.difficulty === 'medium' && 'মধ্যম'}
                {question.difficulty === 'hard' && 'কঠিন'}
              </div>
            </div>

            {/* Question Text */}
            <h3 className="text-base sm:text-xl font-bold text-[#6B2C0C] dark:text-orange-100 mb-4 leading-relaxed break-words">
              {qIndex + 1}. {question.question}
            </h3>

            {/* Options List - Div with direct onClick */}
            <div className="space-y-3">
              {question.options.map((opt, oIndex) => {
                const isSelected = selectedAnswers[qIndex] === oIndex;
                return (
                  <div
                    key={`q${qIndex}-o${oIndex}`}
                    onClick={() => handleSelect(qIndex, oIndex)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all select-none active:scale-[0.98] ${
                      isSelected
                        ? 'bg-orange-100 dark:bg-orange-950/50 border-[#6B2C0C] dark:border-orange-500 shadow-md ring-1 ring-[#6B2C0C]/30'
                        : 'bg-[#FEF3E2] dark:bg-slate-800/80 border-transparent hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-slate-800'
                    }`}
                    style={{ pointerEvents: 'auto', zIndex: 10 }}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 transition-colors pointer-events-none ${
                        isSelected ? 'bg-[#6B2C0C] dark:bg-orange-600' : 'bg-[#2D3E50] dark:bg-slate-700'
                      }`}
                    >
                      {optionLetters[oIndex]}
                    </div>
                    <span className="text-[#6B2C0C] dark:text-slate-100 font-medium text-sm sm:text-base leading-snug flex-1 break-words pointer-events-none">
                      {opt}
                    </span>
                    {isSelected && (
                      <span className="text-green-600 dark:text-green-400 text-lg font-black shrink-0 pointer-events-none">
                        ✓
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>

      {/* Floating Submit Bar at Bottom (especially for mobile & quick submit) */}
      <div className="fixed bottom-4 inset-x-0 mx-auto max-w-lg px-4 z-40 pointer-events-none">
        <div className="bg-[#2D3E50]/95 dark:bg-slate-900/95 backdrop-blur-md text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-2xl flex items-center justify-between border border-white/10 gap-3 pointer-events-auto">
          <div className="text-xs sm:text-sm">
            <div className="font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>উত্তর সম্পন্ন: </span>
              <span className="text-amber-300 font-extrabold text-sm sm:text-base">
                {toBengaliNumber(answeredCount)} / {toBengaliNumber(totalQ)}
              </span>
            </div>
            <span className="text-[11px] text-slate-300">
              বাকি: {toBengaliNumber(unansweredCount)} টি প্রশ্ন
            </span>
          </div>

          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-4 sm:px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>জমা দাও</span>
          </button>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div
            className="rounded-3xl p-6 max-w-md w-full shadow-2xl border text-center animate-in zoom-in-95 bg-[#FFF8EC] dark:bg-slate-900 border-orange-200 dark:border-slate-800"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-[#6B2C0C] dark:text-orange-100">
              তুমি কি পরীক্ষা জমা দিতে চাও?
            </h3>
            <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">
              জমা দিলে তাৎক্ষণিক ফলাফল, প্রতিটি প্রশ্নের সঠিক উত্তর এবং বিস্তারিত ব্যাখ্যা দেখতে পারবে।
            </p>

            <div
              className="mt-4 grid grid-cols-2 gap-2 text-center p-3 rounded-2xl border bg-[#FEF3E2] dark:bg-slate-800/80 border-orange-200 dark:border-slate-700"
            >
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">উত্তর দেওয়া হয়েছে</span>
                <span className="text-lg font-bold text-emerald-600">{toBengaliNumber(answeredCount)} টি</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">বাকি বা অনুত্তরিত</span>
                <span className="text-lg font-bold text-amber-600">{toBengaliNumber(unansweredCount)} টি</span>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2.5">
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-orange-300 dark:border-slate-700 text-xs font-semibold text-[#6B2C0C] dark:text-slate-200 hover:bg-orange-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                চালিয়ে যাও
              </button>
              <button
                disabled={isSubmitting}
                onClick={() => {
                  setIsSubmitModalOpen(false);
                  handleFinalSubmit();
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'জমা হচ্ছে...' : 'হ্যাঁ, জমা দাও'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {isExitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div
            className="rounded-3xl p-6 max-w-md w-full shadow-2xl border text-center animate-in zoom-in-95 bg-[#FFF8EC] dark:bg-slate-900 border-orange-200 dark:border-slate-800"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-[#6B2C0C] dark:text-orange-100">
              পরীক্ষা বাতিল করতে চাও?
            </h3>
            <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">
              এখন বের হলে এই পরীক্ষার কোনো ফলাফল বা এক্সপি সংরক্ষিত হবে না।
            </p>

            <div className="mt-5 flex items-center gap-2.5">
              <button
                onClick={() => setIsExitModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-orange-300 dark:border-slate-700 text-xs font-semibold text-[#6B2C0C] dark:text-slate-200 hover:bg-orange-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                না, পরীক্ষা দেব
              </button>
              <button
                onClick={onExitExam}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 font-bold text-xs text-white shadow-md transition-all cursor-pointer"
              >
                হ্যাঁ, বের হও
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
