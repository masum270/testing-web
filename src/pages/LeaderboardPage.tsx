import React, { useState, useEffect, useMemo } from 'react';
import { subscribeExamResults } from '../services/adminService.js';
import { ExamResultDoc } from '../types/admin.js';
import { AuthUser } from '../types/auth.js';
import { SUBJECTS } from '../data/subjects.js';
import { toBengaliNumber, formatTimer } from '../utils/quizLogic.js';
import {
  Trophy,
  Crown,
  Medal,
  Search,
  Calendar,
  Clock,
  ArrowRight,
  ChevronLeft,
  Filter,
  CheckCircle2,
  Sparkles,
  Share2,
  ChevronRight
} from 'lucide-react';

interface LeaderboardPageProps {
  currentUser: AuthUser | null;
  onNavigateHome: () => void;
  onStartExam: (subjectName?: string) => void;
  initialSubject?: string;
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({
  currentUser,
  onNavigateHome,
  onStartExam,
  initialSubject
}) => {
  const [results, setResults] = useState<ExamResultDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject || 'all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | 'today' | 'week'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedShare, setCopiedShare] = useState(false);
  const pageSize = 15;

  // Real-time listener for Firestore exam_results
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeExamResults((fetched) => {
      setResults(fetched);
      setIsLoading(false);
    }, selectedSubject === 'all' ? undefined : selectedSubject);

    return () => unsubscribe();
  }, [selectedSubject]);

  // Read URL query param on mount if any
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sub = params.get('subject');
      if (sub) {
        setSelectedSubject(sub);
      }
    }
  }, []);

  // Filter by timeframe and search query
  const filteredResults = useMemo(() => {
    let list = [...results];

    // Timeframe filter
    const now = Date.now();
    if (selectedTimeframe === 'today') {
      const oneDay = 24 * 60 * 60 * 1000;
      list = list.filter((r) => {
        const time = new Date(r.submittedAt).getTime();
        return now - time <= oneDay;
      });
    } else if (selectedTimeframe === 'week') {
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      list = list.filter((r) => {
        const time = new Date(r.submittedAt).getTime();
        return now - time <= oneWeek;
      });
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.userName.toLowerCase().includes(q) ||
          r.userEmail.toLowerCase().includes(q) ||
          r.chapter.toLowerCase().includes(q)
      );
    }

    // Recalculate display rank
    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));
  }, [results, selectedTimeframe, searchQuery]);

  const top3 = filteredResults.slice(0, 3);
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / pageSize));
  const paginatedResults = filteredResults.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleShare = () => {
    if (typeof navigator !== 'undefined') {
      const shareUrl = window.location.href;
      navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 flex items-center justify-center font-black text-xs shadow-md ring-2 ring-amber-300">
          <Crown className="w-4 h-4" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-300 to-slate-200 text-slate-800 flex items-center justify-center font-black text-xs shadow-md ring-2 ring-slate-300">
          <Medal className="w-4 h-4" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-700 to-amber-600 text-white flex items-center justify-center font-black text-xs shadow-md ring-2 ring-amber-600">
          <Medal className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs">
        {toBengaliNumber(rank)}
      </div>
    );
  };

  return (
    <div className="min-h-screen py-6 sm:py-10 px-3 sm:px-6 max-w-6xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border font-bold text-xs shadow-xs transition-all hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          style={{ borderColor: 'var(--card-border)', color: 'var(--text-main)', backgroundColor: 'var(--card)' }}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>হোমে ফিরে যাও</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-main)', backgroundColor: 'var(--card)' }}
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>{copiedShare ? 'লিংক কপি হয়েছে!' : 'লিডারবোর্ড শেয়ার'}</span>
          </button>

          <button
            onClick={() => onStartExam(selectedSubject !== 'all' ? selectedSubject : undefined)}
            className="px-4 py-2 rounded-2xl bg-[#6C5CE7] hover:bg-[#5848df] text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>লাইভ পরীক্ষা দাও</span>
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold mb-3 shadow-xs">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>সারাদেশের লাইভ বিজ্ঞান মেধা তালিকা</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold" style={{ color: 'var(--text-main)' }}>
          লাইভ লিডারবোর্ড ও রেংকিং
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-xl mx-auto">
          পরীক্ষা শেষ করার সাথে সাথে তোমার স্কোর ও অবস্থান এখানে তাৎক্ষণিক আপডেট হয়
        </p>
      </div>

      {/* Subject Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        <button
          onClick={() => {
            setSelectedSubject('all');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            selectedSubject === 'all'
              ? 'bg-[#6C5CE7] text-white shadow-md'
              : 'border hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
          style={selectedSubject !== 'all' ? { borderColor: 'var(--card-border)', color: 'var(--text-main)', backgroundColor: 'var(--card)' } : {}}
        >
          সকল বিষয়
        </button>
        {SUBJECTS.map((sub) => (
          <button
            key={sub.id}
            onClick={() => {
              setSelectedSubject(sub.name);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedSubject === sub.name
                ? 'bg-[#6C5CE7] text-white shadow-md'
                : 'border hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            style={selectedSubject !== sub.name ? { borderColor: 'var(--card-border)', color: 'var(--text-main)', backgroundColor: 'var(--card)' } : {}}
          >
            {sub.name}
          </button>
        ))}
      </div>

      {/* Timeframe & Search Filter Bar */}
      <div
        className="p-3 sm:p-4 rounded-3xl border shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-3"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}
      >
        {/* Time Tabs */}
        <div
          className="flex p-1 rounded-2xl border w-full sm:w-auto"
          style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--card-border)' }}
        >
          <button
            onClick={() => {
              setSelectedTimeframe('all');
              setCurrentPage(1);
            }}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedTimeframe === 'all' ? 'bg-[#6C5CE7] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            সর্বকালীন
          </button>
          <button
            onClick={() => {
              setSelectedTimeframe('week');
              setCurrentPage(1);
            }}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedTimeframe === 'week' ? 'bg-[#6C5CE7] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            এই সপ্তাহ
          </button>
          <button
            onClick={() => {
              setSelectedTimeframe('today');
              setCurrentPage(1);
            }}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedTimeframe === 'today' ? 'bg-[#6C5CE7] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            আজকের পরীক্ষা
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="শিক্ষার্থীর নাম বা অধ্যায় খুঁজুন..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 transition-all"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }}
          />
        </div>
      </div>

      {/* Top 3 Podium Highlights (when available) */}
      {top3.length >= 3 && !searchQuery && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 pt-4">
          {/* Rank 2 */}
          <div
            className="rounded-3xl p-5 border text-center relative order-2 md:order-1 transition-all hover:scale-102 shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}
          >
            <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-800 font-black flex items-center justify-center mx-auto mb-2 text-sm shadow-md">
              ২
            </div>
            <h3 className="font-extrabold text-base truncate" style={{ color: 'var(--text-main)' }}>
              {top3[1].userName}
            </h3>
            <span className="text-[11px] font-semibold text-slate-400 block mb-2">{top3[1].subject}</span>
            <div className="inline-block px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
              {toBengaliNumber(top3[1].score)} / {toBengaliNumber(top3[1].totalMarks)}
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              সময়: {toBengaliNumber(formatTimer(top3[1].timeTaken))}
            </div>
          </div>

          {/* Rank 1 (Tall / Champion) */}
          <div
            className="rounded-3xl p-6 border-2 border-amber-300 dark:border-amber-600 bg-gradient-to-b from-amber-500/10 to-transparent text-center relative order-1 md:order-2 shadow-lg scale-105"
            style={{ backgroundColor: 'var(--card)' }}
          >
            <div className="absolute -top-4 inset-x-0 mx-auto w-8 h-8 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center shadow-md">
              <Crown className="w-4 h-4 fill-amber-950" />
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 font-black flex items-center justify-center mx-auto mb-2 text-base shadow-md mt-1">
              ১
            </div>
            <h3 className="font-black text-lg truncate" style={{ color: 'var(--text-main)' }}>
              {top3[0].userName}
            </h3>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block mb-2">
              🏆 {top3[0].subject} চ্যাম্পিয়ন
            </span>
            <div className="inline-block px-4 py-1.5 rounded-xl bg-amber-400/20 font-black text-base text-amber-700 dark:text-amber-300 border border-amber-300/40">
              {toBengaliNumber(top3[0].score)} / {toBengaliNumber(top3[0].totalMarks)}
            </div>
            <div className="mt-2 text-[11px] font-semibold text-slate-500">
              সময়: {toBengaliNumber(formatTimer(top3[0].timeTaken))}
            </div>
          </div>

          {/* Rank 3 */}
          <div
            className="rounded-3xl p-5 border text-center relative order-3 md:order-3 transition-all hover:scale-102 shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}
          >
            <div className="w-10 h-10 rounded-full bg-amber-700 text-white font-black flex items-center justify-center mx-auto mb-2 text-sm shadow-md">
              ৩
            </div>
            <h3 className="font-extrabold text-base truncate" style={{ color: 'var(--text-main)' }}>
              {top3[2].userName}
            </h3>
            <span className="text-[11px] font-semibold text-slate-400 block mb-2">{top3[2].subject}</span>
            <div className="inline-block px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
              {toBengaliNumber(top3[2].score)} / {toBengaliNumber(top3[2].totalMarks)}
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              সময়: {toBengaliNumber(formatTimer(top3[2].timeTaken))}
            </div>
          </div>
        </div>
      )}

      {/* Main Leaderboard Table */}
      <div
        className="rounded-3xl border shadow-sm overflow-hidden"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}
      >
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-[#6C5CE7] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-500">লাইভ ফলাফল লোড হচ্ছে...</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-main)' }}>
              এখনও কোনো ফলাফল পাওয়া যায়নি
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              প্রথম শিক্ষার্থী হিসেবে পরীক্ষা দিয়ে লিডারবোর্ডের শীর্ষে নিজের নাম লেখাও!
            </p>
            <button
              onClick={() => onStartExam(selectedSubject !== 'all' ? selectedSubject : undefined)}
              className="px-5 py-2.5 rounded-2xl bg-[#6C5CE7] hover:bg-[#5848df] text-white font-bold text-xs shadow-md inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>প্রথম পরীক্ষা শুরু করো</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-[11px] font-bold text-slate-400 uppercase tracking-wider" style={{ borderColor: 'var(--card-border)' }}>
                  <th className="py-3.5 px-4 text-center w-16">র‍্যাংক</th>
                  <th className="py-3.5 px-4">শিক্ষার্থী</th>
                  <th className="py-3.5 px-4">বিষয় ও অধ্যায়</th>
                  <th className="py-3.5 px-4 text-center">প্রাপ্ত স্কোর</th>
                  <th className="py-3.5 px-4 text-center">সময়</th>
                  <th className="py-3.5 px-4 text-right">তারিখ</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs" style={{ borderColor: 'var(--card-border)' }}>
                {paginatedResults.map((item, index) => {
                  const isGuestGated = !currentUser && item.rank && item.rank > 10;
                  const isCurrentUser =
                    currentUser &&
                    (item.userId === currentUser.id ||
                      item.userEmail?.toLowerCase() === currentUser.email?.toLowerCase());

                  if (isGuestGated) {
                    return null;
                  }

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isCurrentUser
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 font-bold border-l-4 border-l-[#6C5CE7]'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center">
                          {renderRankBadge(item.rank || 1)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6C5CE7] to-indigo-400 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                            {item.userName ? item.userName.charAt(0) : 'শ'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm truncate" style={{ color: 'var(--text-main)' }}>
                                {item.userName}
                              </span>
                              {isCurrentUser && (
                                <span className="px-1.5 py-0.5 rounded-md bg-[#6C5CE7] text-white text-[10px] font-black shrink-0">
                                  তুমি
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block truncate">
                              {item.userEmail ? `${item.userEmail.slice(0, 4)}***@${item.userEmail.split('@')[1] || 'gmail.com'}` : 'শিক্ষার্থী'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold block" style={{ color: 'var(--text-main)' }}>
                          {item.subject}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate block max-w-xs">
                          {item.chapter}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-black text-sm text-[#6C5CE7]">
                            {toBengaliNumber(item.score)} / {toBengaliNumber(item.totalMarks)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {toBengaliNumber(Math.round((item.score / Math.max(1, item.totalMarks)) * 100))}% নির্ভুল
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center text-slate-500 dark:text-slate-400 font-mono">
                        {toBengaliNumber(formatTimer(item.timeTaken))}
                      </td>

                      <td className="py-3.5 px-4 text-right text-slate-400 text-[11px]">
                        {new Date(item.submittedAt).toLocaleDateString('bn-BD', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Guest gating prompt below top 10 */}
            {!currentUser && filteredResults.length > 10 && (
              <div className="p-6 border-t bg-gradient-to-b from-transparent via-slate-50/80 to-indigo-50/60 dark:via-slate-900/40 dark:to-indigo-950/40 text-center">
                <div className="max-w-md mx-auto space-y-2.5">
                  <span className="inline-block px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold">
                    শীর্ষ ১০ জন শিক্ষার্থীর ফলাফল দেখানো হচ্ছে
                  </span>
                  <h4 className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                    বাকি {toBengaliNumber(filteredResults.length - 10)} জনের ফলাফল ও নিজের র‍্যাঙ্ক দেখতে লগইন করো
                  </h4>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.location.href = '/login';
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#6C5CE7] hover:bg-[#5848df] text-white font-bold text-xs shadow-md inline-flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <span>গুগল অথবা ইমেইল দিয়ে লগইন</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div
            className="p-3 border-t flex items-center justify-between text-xs"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
          >
            <span>
              পৃষ্ঠা {toBengaliNumber(currentPage)} / {toBengaliNumber(totalPages)} (মোট {toBengaliNumber(filteredResults.length)} জন)
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border text-xs font-bold disabled:opacity-40 cursor-pointer"
                style={{ borderColor: 'var(--card-border)' }}
              >
                পূর্ববর্তী
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border text-xs font-bold disabled:opacity-40 cursor-pointer"
                style={{ borderColor: 'var(--card-border)' }}
              >
                পরবর্তী
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
