import React from 'react';
import { UserProfile } from '../types/quiz.js';
import { AuthUser } from '../types/auth.js';
import { ThemeId } from '../types/theme.js';
import { toBengaliNumber, calculateLevelProgress } from '../utils/quizLogic.js';
import { ThemeSwitcher } from './ThemeSwitcher.js';
import {
  FlaskConical,
  Trophy,
  Youtube,
  BookOpen,
  Star,
  LogIn,
  UserPlus,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Layers,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  user: UserProfile;
  authUser: AuthUser | null;
  currentTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  currentView: string;
  onNavigate: (view: 'home' | 'videos' | 'leaderboard' | 'practice' | 'mega-exam' | 'login' | 'register') => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  authUser,
  currentTheme,
  onThemeChange,
  currentView,
  onNavigate,
  onOpenProfile,
  onLogout
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const xpProgress = calculateLevelProgress(user.totalXP);

  const handleNav = (view: 'home' | 'videos' | 'leaderboard' | 'practice' | 'mega-exam' | 'login' | 'register') => {
    setMobileMenuOpen(false);
    onNavigate(view);
  };

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-md shadow-xs transition-colors duration-300"
      style={{
        backgroundColor: 'var(--nav-bg)',
        borderColor: 'var(--card-border)'
      }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-2">
        {/* Brand Logo & Tagline */}
        <div
          onClick={() => handleNav('home')}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none shrink-0"
        >
          {/* Science Flask Logo Icon */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#6C5CE7] to-[#8c7ae6] flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform shrink-0 relative">
            <FlaskConical className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-900 text-[9px] font-black px-1 rounded-sm shadow-xs">
              TFS
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-xl tracking-tight leading-none" style={{ color: 'var(--text-main)' }}>
                Tension Free <span className="text-[#6C5CE7]">Science</span>
              </span>
            </div>
            <p className="text-[10px] sm:text-xs font-semibold text-[#6C5CE7] tracking-wide mt-0.5 truncate">
              ভয় নয়, বিজ্ঞান হবে সহজ
            </p>
          </div>
        </div>

        {/* Center Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 p-1 rounded-2xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
          <button
            onClick={() => handleNav('home')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              currentView === 'home'
                ? 'bg-[#6C5CE7] text-white shadow-xs'
                : 'hover:opacity-80'
            }`}
            style={currentView !== 'home' ? { color: 'var(--text-main)' } : {}}
          >
            পরীক্ষা
          </button>

          <button
            onClick={() => handleNav('practice')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentView === 'practice'
                ? 'bg-[#6C5CE7] text-white shadow-xs'
                : 'hover:opacity-80'
            }`}
            style={currentView !== 'practice' ? { color: 'var(--text-main)' } : {}}
          >
            <Layers className="w-4 h-4 text-violet-500" />
            <span>অনুশীলন (ফটো)</span>
          </button>

          <button
            onClick={() => handleNav('mega-exam')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer relative ${
              currentView === 'mega-exam'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs'
                : 'hover:opacity-80'
            }`}
            style={currentView !== 'mega-exam' ? { color: 'var(--text-main)' } : {}}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>মেগা এক্সাম</span>
            <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase ml-0.5">
              Live
            </span>
          </button>

          <button
            onClick={() => handleNav('videos')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentView === 'videos'
                ? 'bg-[#6C5CE7] text-white shadow-xs'
                : 'hover:opacity-80'
            }`}
            style={currentView !== 'videos' ? { color: 'var(--text-main)' } : {}}
          >
            <Youtube className="w-4 h-4 text-red-500" />
            <span>ভিডিও ক্লাস</span>
          </button>

          <button
            onClick={() => handleNav('leaderboard')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentView === 'leaderboard'
                ? 'bg-[#6C5CE7] text-white shadow-xs'
                : 'hover:opacity-80'
            }`}
            style={currentView !== 'leaderboard' ? { color: 'var(--text-main)' } : {}}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>লিডারবোর্ড</span>
          </button>
        </nav>

        {/* Right Section: Theme Switcher + Auth/Profile */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Theme Switcher Button */}
          <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />

          {/* If Logged In: Show Level, XP & Profile Avatar */}
          {authUser ? (
            <div className="flex items-center gap-2">
              {/* Level & XP Capsule (hidden on very small mobile) */}
              <div className="hidden md:flex flex-col items-end mr-1">
                <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                  <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md text-[11px]">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    লেভেল {toBengaliNumber(user.level)}
                  </span>
                  <span className="text-slate-400 font-normal">
                    {toBengaliNumber(user.totalXP)} XP
                  </span>
                </div>
                {/* XP progress bar */}
                <div className="w-24 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
                  <div
                    className="bg-[#6C5CE7] h-full rounded-full transition-all duration-500"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
              </div>

              {/* Profile Avatar Button */}
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-1.5 p-1 sm:p-1.5 sm:pr-2.5 rounded-2xl border hover:border-[#6C5CE7] transition-all cursor-pointer"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}
                title="প্রোফাইল দেখুন"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-cover ring-2 ring-violet-200"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#6C5CE7] text-white flex items-center justify-center font-bold text-xs ring-2 ring-violet-200">
                    {authUser.name ? authUser.name.trim().charAt(0) : <UserIcon className="w-3.5 h-3.5" />}
                  </div>
                )}
                <span className="text-xs font-bold max-w-[80px] sm:max-w-[100px] truncate hidden sm:inline" style={{ color: 'var(--text-main)' }}>
                  {authUser.name.split(' ')[0]}
                </span>
              </button>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="লগআউট"
                aria-label="লগআউট"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          ) : (
            /* If Logged Out: Show Login & Register Buttons */
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => handleNav('login')}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--card-border)',
                  color: 'var(--text-main)'
                }}
              >
                <LogIn className="w-3.5 h-3.5 text-[#6C5CE7]" />
                <span>লগইন</span>
              </button>

              <button
                onClick={() => handleNav('register')}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#6C5CE7] hover:bg-[#5848df] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">নিবন্ধন</span>
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl border"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--card-border)',
              color: 'var(--text-main)'
            }}
            aria-label="মেনু খুলুন"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden px-4 pt-2 pb-4 border-b space-y-1.5 animate-in slide-in-from-top duration-200"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--card-border)'
          }}
        >
          <button
            onClick={() => handleNav('home')}
            className={`w-full px-4 py-2.5 rounded-xl text-left text-sm font-bold flex items-center gap-2 ${
              currentView === 'home' ? 'bg-[#6C5CE7] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            style={currentView !== 'home' ? { color: 'var(--text-main)' } : {}}
          >
            <BookOpen className="w-4 h-4" />
            <span>পরীক্ষা</span>
          </button>

          <button
            onClick={() => handleNav('practice')}
            className={`w-full px-4 py-2.5 rounded-xl text-left text-sm font-bold flex items-center gap-2 ${
              currentView === 'practice' ? 'bg-[#6C5CE7] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            style={currentView !== 'practice' ? { color: 'var(--text-main)' } : {}}
          >
            <Layers className="w-4 h-4 text-violet-500" />
            <span>অনুশীলন (ফটো অধ্যায়)</span>
          </button>

          <button
            onClick={() => handleNav('mega-exam')}
            className={`w-full px-4 py-2.5 rounded-xl text-left text-sm font-bold flex items-center justify-between ${
              currentView === 'mega-exam' ? 'bg-[#6C5CE7] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            style={currentView !== 'mega-exam' ? { color: 'var(--text-main)' } : {}}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>সাপ্তাহিক মেগা এক্সাম</span>
            </div>
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
              Live
            </span>
          </button>

          <button
            onClick={() => handleNav('videos')}
            className={`w-full px-4 py-2.5 rounded-xl text-left text-sm font-bold flex items-center gap-2 ${
              currentView === 'videos' ? 'bg-[#6C5CE7] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            style={currentView !== 'videos' ? { color: 'var(--text-main)' } : {}}
          >
            <Youtube className="w-4 h-4 text-red-500" />
            <span>ভিডিও ক্লাস (@TensionFreeScience)</span>
          </button>

          <button
            onClick={() => handleNav('leaderboard')}
            className={`w-full px-4 py-2.5 rounded-xl text-left text-sm font-bold flex items-center gap-2 ${
              currentView === 'leaderboard' ? 'bg-[#6C5CE7] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            style={currentView !== 'leaderboard' ? { color: 'var(--text-main)' } : {}}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>লিডারবোর্ড</span>
          </button>

          {authUser && (
            <div className="pt-2 border-t mt-2 flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                লেভেল {toBengaliNumber(user.level)} • {toBengaliNumber(user.totalXP)} XP
              </span>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="text-xs font-bold text-rose-500 hover:underline flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>লগআউট</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
