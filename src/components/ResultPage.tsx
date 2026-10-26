import React, { useState } from 'react';
import { ExamResult } from '../types/quiz.js';
import { toBengaliNumber, formatTimer } from '../utils/quizLogic.js';
import {
  Trophy,
  RotateCcw,
  Home,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Award,
  BookOpen,
  Filter,
  Share2,
  Sparkles,
  ChevronDown,
  Check
} from 'lucide-react';

interface ResultPageProps {
  result: ExamResult;
  onRetake: () => void;
  onViewLeaderboard: () => void;
  onGoHome: () => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({
  result,
  onRetake,
  onViewLeaderboard,
  onGoHome
}) => {
  const [filter, setFilter] = useState<'all' | 'wrong' | 'correct' | 'skipped'>('all');
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});

  const optionLetters = ['ক', 'খ', 'গ', 'ঘ'];

  const toggleExplanation = (id: string) => {
    setExpandedExplanations((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredAnswers = result.answers.filter((item) => {
    if (filter === 'correct') return item.isCorrect;
    if (filter === 'wrong') return !item.isCorrect && item.selectedOptionIndex !== null;
    if (filter === 'skipped') return item.selectedOptionIndex === null;
    return true;
  });

  let feedbackTitle = 'দারুণ প্রস্তুতি!';
  let feedbackSubtitle = 'তোমার প্রস্তুতি অত্যন্ত প্রশংসনীয়। নিয়মিত অনুশীলন বজায় রাখো!';
  let circleColor = '#00B894';

  if (result.accuracy < 50) {
    feedbackTitle = 'আরও অনুশীলন প্রয়োজন!';
    feedbackSubtitle = 'নিরাশ হয়ো না। নিচের ব্যাখ্যাগুলো ভালোভাবে পড়ে আবার পরীক্ষা দাও!';
    circleColor = '#FF7675';
  } else if (result.accuracy < 75) {
    feedbackTitle = 'ভালো প্রচেষ্টা!';
    feedbackSubtitle = 'তুমি বেশ ভালো করছ, ভুলগুলো শুধরে নিলে ফুল মার্কস পাওয়া সম্ভব!';
    circleColor = '#6C5CE7';
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-20 overflow-x-hidden">
      {/* Top Congratulatory Hero Card */}
      <div
        className="rounded-3xl p-6 sm:p-10 border shadow-xl text-center relative overflow-hidden mb-6 sm:mb-8 transition-colors"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--card-border)'
        }}
      >
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 mx-auto mb-5 sm:mb-6 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="9"
              fill="transparent"
              className="text-slate-100 dark:text-slate-800"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke={circleColor}
              strokeWidth="9"
              strokeDasharray={251.2}
              strokeDashoffset={251.2 - (251.2 * result.accuracy) / 100}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
              {toBengaliNumber(result.accuracy)}%
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-slate-400 mt-0.5">
              নির্ভুলতা
            </span>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100/80 dark:bg-violet-950/60 text-[#6C5CE7] text-xs font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          {feedbackTitle}
        </div>

        <h1 className="text-xl sm:text-3xl font-extrabold leading-snug break-words" style={{ color: 'var(--text-main)' }}>
          তুমি {toBengaliNumber(result.totalQuestions)} টির মধ্যে {toBengaliNumber(result.correctCount)} টি সঠিক উত্তর দিয়েছো!
        </h1>
        <p className="text-xs sm:text-base max-w-lg mx-auto mt-2 font-medium" style={{ color: 'var(--text-muted)' }}>
          {feedbackSubtitle}
        </p>

        {/* Rank & XP Tags */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {result.rank && (
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-amber-500 text-white font-black text-xs sm:text-sm shadow-md">
              <Trophy className="w-4 h-4 text-yellow-200 fill-yellow-200" />
              <span>
                তোমার অবস্থান: #{toBengaliNumber(result.rank)}
                {result.totalParticipants ? ` (মোট ${toBengaliNumber(result.totalParticipants)} জনের মধ্যে)` : ''}
              </span>
            </div>
          )}

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-xs sm:text-sm shadow-xs">
            <Award className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span>+{toBengaliNumber(result.scoreXP)} XP অর্জিত হয়েছে!</span>
          </div>
        </div>

        {/* Primary CTA Buttons */}
        <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          <button
            onClick={onRetake}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#6C5CE7] hover:bg-[#5848df] text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>আবার পরীক্ষা দাও</span>
          </button>

          <button
            onClick={onViewLeaderboard}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trophy className="w-4 h-4" />
            <span>লিডারবোর্ড দেখো</span>
          </button>

          <button
            onClick={onGoHome}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl border font-bold text-xs sm:text-sm shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--card-border)',
              color: 'var(--text-main)'
            }}
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>হোমে ফিরে যাও</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
        <div className="rounded-2xl p-3.5 sm:p-5 border shadow-xs text-center" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-100 text-[#00B894] flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-xl sm:text-2xl font-black" style={{ color: 'var(--text-main)' }}>
            {toBengaliNumber(result.correctCount)}
          </div>
          <div className="text-[11px] sm:text-xs font-semibold text-emerald-600 mt-0.5">সঠিক উত্তর</div>
        </div>

        <div className="rounded-2xl p-3.5 sm:p-5 border shadow-xs text-center" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-rose-100 text-[#FF7675] flex items-center justify-center mx-auto mb-2">
            <XCircle className="w-5 h-5" />
          </div>
          <div className="text-xl sm:text-2xl font-black" style={{ color: 'var(--text-main)' }}>
            {toBengaliNumber(result.wrongCount)}
          </div>
          <div className="text-[11px] sm:text-xs font-semibold text-rose-500 mt-0.5">ভুল উত্তর</div>
        </div>

        <div className="rounded-2xl p-3.5 sm:p-5 border shadow-xs text-center" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-2">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="text-xl sm:text-2xl font-black" style={{ color: 'var(--text-main)' }}>
            {toBengaliNumber(result.skippedCount)}
          </div>
          <div className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-0.5">উত্তরহীন / স্কিপ</div>
        </div>

        <div className="rounded-2xl p-3.5 sm:p-5 border shadow-xs text-center" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-violet-100 text-[#6C5CE7] flex items-center justify-center mx-auto mb-2">
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-xl sm:text-2xl font-black" style={{ color: 'var(--text-main)' }}>
            {formatTimer(result.timeTakenSeconds, true)}
          </div>
          <div className="text-[11px] sm:text-xs font-semibold text-[#6C5CE7] mt-0.5">ব্যয়িত সময়</div>
        </div>
      </div>

      {/* Detailed Analysis Section */}
      <div
        className="rounded-3xl p-4 sm:p-8 border shadow-xs transition-colors"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--card-border)'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 sm:pb-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
          <div>
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <BookOpen className="w-5 h-5 text-[#6C5CE7]" />
              বিস্তারিত সমাধান ও ব্যাখ্যা
            </h2>
            <p className="text-[11px] sm:text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              সঠিক উত্তর ও পাঠ্যবই ভিত্তিক পুঙ্খানুপুঙ্খ ব্যাখ্যা পড়ে নাও
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#6C5CE7] text-white shadow-xs'
                  : 'border'
              }`}
              style={filter !== 'all' ? { backgroundColor: 'var(--bg)', borderColor: 'var(--card-border)', color: 'var(--text-muted)' } : {}}
            >
              সব ({toBengaliNumber(result.totalQuestions)})
            </button>
            <button
              onClick={() => setFilter('wrong')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'wrong'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300'
              }`}
            >
              ভুল ({toBengaliNumber(result.wrongCount)})
            </button>
            <button
              onClick={() => setFilter('correct')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'correct'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              }`}
            >
              সঠিক ({toBengaliNumber(result.correctCount)})
            </button>
            <button
              onClick={() => setFilter('skipped')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'skipped'
                  ? 'bg-slate-600 text-white shadow-xs'
                  : 'border'
              }`}
              style={filter !== 'skipped' ? { backgroundColor: 'var(--bg)', borderColor: 'var(--card-border)', color: 'var(--text-muted)' } : {}}
            >
              স্কিপ ({toBengaliNumber(result.skippedCount)})
            </button>
          </div>
        </div>

        {/* Questions Breakdown List */}
        <div className="mt-5 space-y-4 sm:space-y-6">
          {filteredAnswers.map((item, idx) => {
            const q = item.question;
            const isAnswered = item.selectedOptionIndex !== null;
            const isCorrect = item.isCorrect;
            const isExplanationOpen = expandedExplanations[q.id] ?? !isCorrect;

            return (
              <div
                key={q.id}
                className="p-4 sm:p-5 rounded-2xl border transition-all"
                style={{
                  backgroundColor: 'var(--bg)',
                  borderColor: isCorrect ? '#A7F3D0' : isAnswered ? '#FECDD3' : 'var(--card-border)'
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-bold">
                      {toBengaliNumber(idx + 1)}
                    </span>
                    <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-md border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }}>
                      {q.chapter}
                    </span>
                  </div>

                  <div>
                    {isCorrect && (
                      <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        সঠিক উত্তর
                      </span>
                    )}
                    {!isCorrect && isAnswered && (
                      <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-rose-700 bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3.5 h-3.5" />
                        ভুল উত্তর
                      </span>
                    )}
                    {!isAnswered && (
                      <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-600 bg-slate-200 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                        <HelpCircle className="w-3.5 h-3.5" />
                        উত্তরহীন
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-sm sm:text-base font-bold leading-snug mb-3.5 break-words" style={{ color: 'var(--text-main)' }}>
                  {q.question}
                </h3>

                {/* 4 Options Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {q.options.map((opt, optIdx) => {
                    const isUserChoice = item.selectedOptionIndex === optIdx;
                    const isRightChoice = q.correctIndex === optIdx;

                    let optStyle = 'border-slate-200';
                    let badge = null;

                    if (isRightChoice) {
                      optStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold';
                      badge = <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-auto" />;
                    } else if (isUserChoice && !isCorrect) {
                      optStyle = 'border-rose-400 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 font-bold';
                      badge = <span className="text-[10px] bg-rose-200 text-rose-800 px-1 rounded font-bold shrink-0 ml-auto">তোমার উত্তর</span>;
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`p-2.5 sm:p-3 rounded-xl border text-xs sm:text-sm flex items-center gap-2 ${optStyle}`}
                        style={!isRightChoice && !(isUserChoice && !isCorrect) ? { backgroundColor: 'var(--card)', borderColor: 'var(--card-border)', color: 'var(--text-main)' } : {}}
                      >
                        <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold shrink-0">
                          {optionLetters[optIdx]}
                        </span>
                        <span className="leading-snug break-words flex-1">{opt}</span>
                        {badge}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                <div className="mt-3 pt-2.5 border-t" style={{ borderColor: 'var(--card-border)' }}>
                  <button
                    onClick={() => toggleExplanation(q.id)}
                    className="flex items-center justify-between w-full text-left text-xs font-bold text-[#6C5CE7] hover:underline cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      এনসিটিবি ব্যাখ্যা ও ধারণা
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${isExplanationOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isExplanationOpen && (
                    <div
                      className="mt-2 p-3 sm:p-3.5 rounded-xl border text-xs sm:text-sm leading-relaxed"
                      style={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--card-border)',
                        color: 'var(--text-main)'
                      }}
                    >
                      <p className="font-semibold text-[#6C5CE7] mb-1">
                        💡 সঠিক উত্তরের বিশ্লেষণ:
                      </p>
                      {q.explanation}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
