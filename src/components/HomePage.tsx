import React, { useState, useEffect } from 'react';
import { SubjectInfo, UserProfile } from '../types/quiz.js';
import { SUBJECTS } from '../data/subjects.js';
import { SubjectIcon } from './SubjectIcon.js';
import { toBengaliNumber, calculateAccuracy } from '../utils/quizLogic.js';
import { VideoItem } from '../types/video.js';
import videosData from '../data/videos.json' with { type: 'json' };
import { VideoPlayerModal } from './VideoPlayerModal.js';
import {
  FlaskConical,
  Sparkles,
  ArrowRight,
  Search,
  Award,
  CheckCircle,
  HelpCircle,
  Target,
  Flame,
  ChevronRight,
  BookOpen,
  Youtube,
  Play,
  Clock,
  ExternalLink,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { AuthUser } from '../types/auth.js';
import { DailyStreak } from './DailyStreak.js';

interface HomePageProps {
  user: UserProfile;
  authUser?: AuthUser | null;
  isLoggedIn: boolean;
  onSelectSubject: (subject: SubjectInfo) => void;
  onQuickStart: () => void;
  onNavigateVideos: () => void;
  onNavigateLogin: () => void;
  onNavigatePractice?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  user,
  authUser,
  isLoggedIn,
  onSelectSubject,
  onQuickStart,
  onNavigateVideos,
  onNavigateLogin,
  onNavigatePractice
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'All' | 'Science' | 'General'>('All');
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>(videosData as VideoItem[]);

  useEffect(() => {
    const loadVideos = async () => {
      try {
        const res = await fetch("/data/videos.json");
        const text = await res.text();
        if (text.includes("<!doctype") || text.includes("<html")) return [];
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVideos(parsed);
        }
        return parsed;
      } catch {
        return [];
      }
    };
    loadVideos();
  }, []);

  const overallAccuracy = calculateAccuracy(user.totalCorrect, user.totalAttempted);

  // Top 4 featured videos for home page
  const featuredVideos = videos.slice(0, 4);

  // Filter subjects based on search query and category
  const filteredSubjects = SUBJECTS.filter((subject) => {
    const matchesSearch =
      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.chapters.some((ch) => ch.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      activeCategory === 'All' ||
      (activeCategory === 'Science' && subject.category === 'Science') ||
      (activeCategory === 'General' && subject.category === 'General');

    return matchesSearch && matchesCategory;
  });

  const handleSubjectClick = (sub: SubjectInfo) => {
    if (!isLoggedIn) {
      onNavigateLogin();
      return;
    }
    onSelectSubject(sub);
  };

  const handleQuickStartClick = () => {
    if (!isLoggedIn) {
      onNavigateLogin();
      return;
    }
    onQuickStart();
  };

  return (
    <div className="min-h-screen pb-16 overflow-x-hidden">
      {/* Hero Section */}
      <section
        className="relative overflow-hidden pt-8 pb-12 sm:pt-14 sm:pb-16 border-b transition-colors"
        style={{
          background: 'var(--hero-gradient)',
          borderColor: 'var(--card-border)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold mb-5 shadow-xs"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--card-border)',
                color: 'var(--primary)'
              }}
            >
              <FlaskConical className="w-3.5 h-3.5 text-[#6C5CE7]" />
              <span>ভয় নয়, বিজ্ঞান হবে সহজ • নবম ও দশম শ্রেণি</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight sm:leading-tight break-words" style={{ color: 'var(--text-main)' }}>
              Tension Free <span className="text-[#6C5CE7]">Science</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-3.5 text-base sm:text-lg font-normal leading-relaxed break-words" style={{ color: 'var(--text-muted)' }}>
              বিজ্ঞান আর কঠিন লাগবে না! এনসিটিবি কারিকুলাম ভিত্তিক ৩১২+ লাইভ MCQ পরীক্ষা, 
              অধ্যায়ভিত্তিক পুঙ্খানুপুঙ্খ ব্যাখ্যা এবং Tension Free Science ইউটিউব ভিডিও ক্লাস।
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <button
                onClick={handleQuickStartClick}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#6C5CE7] hover:bg-[#5848df] text-white font-bold text-base shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoggedIn ? (
                  <>
                    <Sparkles className="w-5 h-5 text-yellow-300" />
                    <span>এখনই পরীক্ষা দাও</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>লগইন করে পরীক্ষা দাও</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                onClick={onNavigateVideos}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border font-bold text-base shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--card-border)',
                  color: 'var(--text-main)'
                }}
              >
                <Youtube className="w-5 h-5 text-red-500" />
                <span>আমাদের ভিডিও ক্লাস</span>
              </button>
            </div>

            {/* Daily Streak Section (Part 5) */}
            {authUser && (
              <div className="mt-8 max-w-4xl mx-auto text-left">
                <DailyStreak user={authUser} onNavigatePractice={onNavigatePractice} />
              </div>
            )}

            {/* Performance Summary Bar */}
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 max-w-4xl mx-auto">
              <div className="rounded-2xl p-3.5 sm:p-4 border shadow-xs text-center" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
                <div className="w-8 h-8 rounded-xl bg-violet-100 text-[#6C5CE7] flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div className="text-xl sm:text-2xl font-black" style={{ color: 'var(--text-main)' }}>
                  {toBengaliNumber(user.totalExams)} টি
                </div>
                <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>মোট পরীক্ষা</div>
              </div>

              <div className="rounded-2xl p-3.5 sm:p-4 border shadow-xs text-center" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#00B894] flex items-center justify-center mx-auto mb-2">
                  <Target className="w-4 h-4" />
                </div>
                <div className="text-xl sm:text-2xl font-black" style={{ color: 'var(--text-main)' }}>
                  {toBengaliNumber(overallAccuracy)}%
                </div>
                <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>গড় নির্ভুলতা</div>
              </div>

              <div className="rounded-2xl p-3.5 sm:p-4 border shadow-xs text-center" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2">
                  <Flame className="w-4 h-4" />
                </div>
                <div className="text-xl sm:text-2xl font-black" style={{ color: 'var(--text-main)' }}>
                  {toBengaliNumber(user.totalXP)}
                </div>
                <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>অর্জিত মোট XP</div>
              </div>

              <div className="rounded-2xl p-3.5 sm:p-4 border shadow-xs text-center" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
                <div className="w-8 h-8 rounded-xl bg-pink-100 text-[#FD79A8] flex items-center justify-center mx-auto mb-2">
                  <Award className="w-4 h-4" />
                </div>
                <div className="text-xl sm:text-2xl font-black" style={{ color: 'var(--text-main)' }}>
                  লেভেল {toBengaliNumber(user.level)}
                </div>
                <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>বর্তমান র‍্যাঙ্ক</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: YouTube Videos Highlight Section (New requirement 3) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b" style={{ borderColor: 'var(--card-border)' }}>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
                <Youtube className="w-5 h-5 fill-white" />
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                আমাদের ভিডিও ক্লাস
              </h2>
            </div>
            <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Tension Free Science চ্যানেলের সেরা ভিডিওগুলো সাইটের ভেতরেই দেখো
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://www.youtube.com/@TensionFreeScience?sub_confirmation=1"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Youtube className="w-4 h-4 fill-white" />
              <span>YouTube Channel e Subscribe Koro</span>
            </a>
            <button
              onClick={onNavigateVideos}
              className="px-3 py-1.5 rounded-xl border text-xs font-bold hover:underline transition-colors cursor-pointer"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--card-border)',
                color: 'var(--text-main)'
              }}
            >
              সবগুলো ভিডিও →
            </button>
          </div>
        </div>

        {/* 4 Featured Videos Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {featuredVideos.map((video) => (
            <div
              key={video.id}
              onClick={() => setActiveVideo(video)}
              className="group rounded-2xl border overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--card-border)'
              }}
            >
              <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md group-hover:scale-115 transition-transform">
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </div>
                </div>
                <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {video.duration}
                </span>
              </div>

              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#6C5CE7] bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded">
                    {video.subject}
                  </span>
                  <h3 className="font-bold text-xs sm:text-sm mt-1.5 line-clamp-2 leading-snug group-hover:text-[#6C5CE7] transition-colors" style={{ color: 'var(--text-main)' }}>
                    {video.title}
                  </h3>
                </div>
                <div className="mt-3 pt-2 border-t flex items-center justify-between text-[11px]" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
                  <span>{video.views} ভিউ</span>
                  <span className="font-semibold text-red-600 flex items-center gap-0.5">
                    চালান <Play className="w-3 h-3 fill-current" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION: Subject Grid Section (Responsive: Mobile 1 col, Tablet 2, Desktop 3/4) */}
      <section id="subjects-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--card-border)' }}>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <span className="w-2.5 h-5 bg-[#6C5CE7] rounded-full inline-block" />
              পাঠ্যবইয়ের ১২টি বিষয় ও অধ্যায়
            </h2>
            <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              অধ্যায়ভিত্তিক পরীক্ষা দাও, নেগেটিভ স্কোরিংহীন নির্ভুল প্র্যাকটিস করো
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="বিষয় বা অধ্যায় খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 transition-all"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--card-border)',
                color: 'var(--text-main)'
              }}
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveCategory('All')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeCategory === 'All'
                ? 'bg-[#6C5CE7] text-white shadow-xs'
                : 'border hover:opacity-80'
            }`}
            style={
              activeCategory !== 'All'
                ? {
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--card-border)',
                    color: 'var(--text-muted)'
                  }
                : {}
            }
          >
            সকল বিষয় ({toBengaliNumber(SUBJECTS.length)})
          </button>
          <button
            onClick={() => setActiveCategory('Science')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeCategory === 'Science'
                ? 'bg-[#6C5CE7] text-white shadow-xs'
                : 'border hover:opacity-80'
            }`}
            style={
              activeCategory !== 'Science'
                ? {
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--card-border)',
                    color: 'var(--text-muted)'
                  }
                : {}
            }
          >
            বিজ্ঞান বিভাগ (৪)
          </button>
          <button
            onClick={() => setActiveCategory('General')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeCategory === 'General'
                ? 'bg-[#6C5CE7] text-white shadow-xs'
                : 'border hover:opacity-80'
            }`}
            style={
              activeCategory !== 'General'
                ? {
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--card-border)',
                    color: 'var(--text-muted)'
                  }
                : {}
            }
          >
            আবশ্যিক ও অন্যান্য (৮)
          </button>
        </div>

        {/* Responsive Grid: Mobile 1 column, Tablet 2 columns, Desktop 3/4 columns */}
        {filteredSubjects.length === 0 ? (
          <div className="text-center py-16 rounded-3xl border shadow-xs mt-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
            <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>কোনো বিষয় খুঁজে পাওয়া যায়নি</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>অনুসন্ধান পরিবর্তন করে আবার চেষ্টা করুন।</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 mt-6">
            {filteredSubjects.map((sub) => (
              <div
                key={sub.id}
                onClick={() => handleSubjectClick(sub)}
                className="group relative rounded-3xl p-5 border shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--card-border)'
                }}
              >
                <div>
                  <div className="flex items-start justify-between mb-3.5">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105"
                      style={{ backgroundColor: sub.color }}
                    >
                      <SubjectIcon name={sub.icon} className="w-6 h-6" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {sub.category === 'Science' ? 'বিজ্ঞান' : 'আবশ্যিক'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/50 text-[#6C5CE7] border border-violet-100 dark:border-violet-800">
                        {toBengaliNumber(sub.totalMCQs)} প্রশ্ন
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold group-hover:text-[#6C5CE7] transition-colors break-words" style={{ color: 'var(--text-main)' }}>
                    {sub.name}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                    {sub.nameEn}
                  </p>

                  {/* Chapters Chips */}
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {sub.chapters.slice(0, 3).map((ch, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-lg border truncate max-w-[120px]"
                        style={{
                          backgroundColor: 'var(--bg)',
                          borderColor: 'var(--card-border)',
                          color: 'var(--text-muted)'
                        }}
                      >
                        {ch}
                      </span>
                    ))}
                    {sub.chapters.length > 3 && (
                      <span className="text-[10px] font-medium text-slate-400 px-1 py-0.5">
                        +{toBengaliNumber(sub.chapters.length - 3)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    অধ্যায়ভিত্তিক পরীক্ষা
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-[#6C5CE7] group-hover:bg-[#6C5CE7] group-hover:text-white flex items-center justify-center transition-all">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Video Modal Player */}
      {activeVideo && (
        <VideoPlayerModal video={activeVideo} onClose={() => setActiveVideo(null)} />
      )}
    </div>
  );
};
