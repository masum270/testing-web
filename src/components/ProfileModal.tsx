import React, { useState } from 'react';
import { UserProfile } from '../types/quiz.js';
import { toBengaliNumber, calculateLevelProgress, calculateAccuracy } from '../utils/quizLogic.js';
import {
  User,
  GraduationCap,
  Award,
  Trophy,
  CheckCircle2,
  Clock,
  X,
  RotateCcw,
  Save,
  Star
} from 'lucide-react';

interface ProfileModalProps {
  user: UserProfile;
  onClose: () => void;
  onUpdateProfile: (updated: UserProfile) => void;
  onResetData: () => void;
}

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&auto=format&fit=crop&q=80'
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  onClose,
  onUpdateProfile,
  onResetData
}) => {
  const [name, setName] = useState(user.name);
  const [school, setSchool] = useState(user.school || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar);
  const [isSaved, setIsSaved] = useState(false);

  const xpProgress = calculateLevelProgress(user.totalXP);
  const accuracy = calculateAccuracy(user.totalCorrect, user.totalAttempted);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...user,
      name: name.trim() || 'শিক্ষার্থী',
      school: school.trim() || 'বাংলাদেশ মাধ্যমিক বিদ্যালয়',
      avatar: selectedAvatar
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--card-border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 sm:w-6 sm:h-6 text-violet-200" />
            <h3 className="text-lg sm:text-xl font-bold">আমার প্রোফাইল ও পরিসংখ্যান</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all cursor-pointer"
            aria-label="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Level & XP Banner */}
          <div
            className="p-4 rounded-2xl border flex items-center justify-between"
            style={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--card-border)'
            }}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#6C5CE7] text-white flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  লেভেল {toBengaliNumber(user.level)}
                </span>
                <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                  মোট {toBengaliNumber(user.totalXP)} XP
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                পরবর্তী লেভেলের জন্য আর {toBengaliNumber(100 - xpProgress)} XP প্রয়োজন
              </p>
            </div>

            <div className="w-24 text-right">
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#6C5CE7] h-full rounded-full transition-all"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-[#6C5CE7] mt-0.5 block">
                {toBengaliNumber(xpProgress)}% পূর্ণ
              </span>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Avatar Selector */}
            <div>
              <label className="text-xs font-bold block mb-2" style={{ color: 'var(--text-main)' }}>
                প্রোফাইল ছবি নির্বাচন করো:
              </label>
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {AVATAR_OPTIONS.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedAvatar(imgUrl)}
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      selectedAvatar === imgUrl
                        ? 'border-[#6C5CE7] ring-2 ring-violet-300 scale-105'
                        : 'border-slate-300 dark:border-slate-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={imgUrl} alt="Avatar" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-main)' }}>
                শিক্ষার্থীর নাম:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: সাকিব হাসান"
                required
                className="w-full px-4 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 transition-all"
                style={{
                  backgroundColor: 'var(--bg)',
                  borderColor: 'var(--card-border)',
                  color: 'var(--text-main)'
                }}
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-main)' }}>
                বিদ্যালয় বা কলেজের নাম:
              </label>
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="যেমন: ঢাকা রেসিডেনসিয়াল মডেল কলেজ"
                className="w-full px-4 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 transition-all"
                style={{
                  backgroundColor: 'var(--bg)',
                  borderColor: 'var(--card-border)',
                  color: 'var(--text-main)'
                }}
              />
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="p-2.5 sm:p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--card-border)' }}>
                <span className="text-[10px] text-slate-400 block font-medium">মোট পরীক্ষা</span>
                <span className="text-sm sm:text-base font-bold" style={{ color: 'var(--text-main)' }}>{toBengaliNumber(user.totalExams)} টি</span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--card-border)' }}>
                <span className="text-[10px] text-slate-400 block font-medium">সঠিক উত্তর</span>
                <span className="text-sm sm:text-base font-bold text-emerald-600">{toBengaliNumber(user.totalCorrect)} টি</span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--card-border)' }}>
                <span className="text-[10px] text-slate-400 block font-medium">গড় নির্ভুলতা</span>
                <span className="text-sm sm:text-base font-bold text-[#6C5CE7]">{toBengaliNumber(accuracy)}%</span>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onResetData}
                className="text-xs font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ডেটা রিসেট</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#6C5CE7] hover:bg-[#5848df] text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaved ? 'সংরক্ষিত!' : 'সংরক্ষণ করো'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
