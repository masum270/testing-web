import React, { useState, useEffect, useMemo } from 'react';
import { AuthUser } from '../types/auth.js';
import { db, auth, googleProvider, signInWithPopup, signInWithRedirect } from '../firebase.js';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Filter,
  Search,
  Sparkles,
  ArrowRight,
  Lock,
  Layers,
  Image as ImageIcon,
  Flame,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

export interface ChapterPhotoDoc {
  id: string;
  subject: string;
  chapter: string;
  type: string;
  photoUrl: string;
  title: string;
  description?: string;
  questionCount: number;
  createdAt?: any;
  createdBy?: string;
  isActive: boolean;
}

interface PracticePageProps {
  currentUser: AuthUser | null;
  onStartExamWithFilter: (subject: string, chapter: string, type: string) => void;
  onNavigateHome: () => void;
}

const SUBJECT_TABS = [
  { id: 'all', label: 'সকল বিষয় (All)' },
  { id: 'পদার্থবিজ্ঞান', label: 'পদার্থবিজ্ঞান' },
  { id: 'রসায়ন', label: 'রসায়ন' },
  { id: 'জীববিজ্ঞান', label: 'জীববিজ্ঞান' },
  { id: 'বাংলা ১ম পত্র', label: 'বাংলা ১ম পত্র' },
  { id: 'সাধারণ গণিত', label: 'সাধারণ গণিত' },
  { id: 'উচ্চতর গণিত', label: 'উচ্চতর গণিত' }
];

const TYPE_FILTERS = [
  'All Type',
  'বোর্ড প্রশ্ন',
  'মেডিকেল টাইপ',
  'ভার্সিটি টাইপ',
  'ডেন্টাল টাইপ',
  'সহজ',
  'কঠিন'
];

export const PracticePage: React.FC<PracticePageProps> = ({
  currentUser,
  onStartExamWithFilter,
  onNavigateHome
}) => {
  const [photos, setPhotos] = useState<ChapterPhotoDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedType, setSelectedType] = useState('All Type');
  const [searchQuery, setSearchQuery] = useState('');

  // Real-time listener for chapter_photos collection where isActive == true
  useEffect(() => {
    try {
      const q = query(collection(db, 'chapter_photos'), where('isActive', '==', true));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const list: ChapterPhotoDoc[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...(d.data() as any) });
          });
          setPhotos(list);
          setLoading(false);
        },
        (err) => {
          console.warn('chapter_photos snapshot notice:', err);
          setLoading(false);
        }
      );
      return () => unsub();
    } catch (e) {
      setLoading(false);
    }
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (e: any) {
        alert('Google Login failed: ' + (e?.message || 'Login error'));
      }
    }
  };

  // Filter photos by subject, type and search
  const filteredPhotos = useMemo(() => {
    return photos.filter((p) => {
      const matchSubject =
        selectedSubject === 'all' ||
        p.subject?.toLowerCase().includes(selectedSubject.toLowerCase());
      const matchType =
        selectedType === 'All Type' ||
        p.type?.toLowerCase() === selectedType.toLowerCase() ||
        p.type === 'All';
      const matchSearch =
        !searchQuery.trim() ||
        p.chapter?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.title?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSubject && matchType && matchSearch;
    });
  }, [photos, selectedSubject, selectedType, searchQuery]);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 font-sans max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>ফটোগ্রাফিক চ্যাপ্টার ফিল্টার & প্র্যাকটিস</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-800 dark:text-slate-100">
          তোমার পছন্দের চ্যাপ্টার নির্বাচন করো
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          বিজ্ঞানের প্রতিটি অধ্যায়ের বোর্ড, মেডিকেল ও ভার্সিটি স্ট্যান্ডার্ড প্রশ্নের জন্য নির্ধারিত ফটো কার্ডে ক্লিক করে সরাসরি অনুশীলন শুরু করো।
        </p>
      </div>

      {/* Guest Gating / Preview with Blur */}
      {!currentUser ? (
        <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
          {/* Background Blurred Demo Cards */}
          <div className="absolute inset-0 filter blur-md opacity-30 pointer-events-none p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-48 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600"></div>
            <div className="h-48 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600"></div>
            <div className="h-48 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600"></div>
          </div>

          <div className="relative z-10 max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
              Google দিয়ে Login করে ফটো ফিল্টার দেখতে পারবে
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              সমস্ত অধ্যায়ভিত্তিক স্পেশাল ফটো কার্ড দেখতে এবং টেস্ট দিতে অনুগ্রহ করে গুগল দিয়ে দ্রুত সাইন-ইন সম্পন্ন করুন।
            </p>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-xl shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              গুগল দিয়ে প্রবেশ করুন
            </button>
          </div>
        </div>
      ) : (
        /* Logged In Student View */
        <div className="space-y-6">
          {/* Top Subject Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
            {SUBJECT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedSubject(tab.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedSubject === tab.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filter Bar: Types & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Type Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {TYPE_FILTERS.map((tName) => (
                <button
                  key={tName}
                  onClick={() => setSelectedType(tName)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedType === tName
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:opacity-80'
                  }`}
                >
                  {tName}
                </button>
              ))}
            </div>

            {/* Search input */}
            <div className="relative sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="চ্যাপ্টারের নাম খুঁজুন..."
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500"
              />
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
            </div>
          </div>

          {/* Photos Grid */}
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs text-slate-500 font-bold">চ্যাপ্টার ফটো লোড হচ্ছে...</p>
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="py-16 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-8 space-y-3">
              <HelpCircle className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                এই চ্যাপ্টারে এখনো কোনো ফটো আপলোড করা হয়নি
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                অ্যাডমিন কর্তৃক ফটো আপলোড করা হলে সেগুলো সাথে সাথেই এখানে দৃশ্যমান হবে।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredPhotos.map((item) => (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => onStartExamWithFilter(item.subject, item.chapter, item.type)}
                  className="group relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer bg-slate-900 border border-slate-800"
                >
                  {/* Photo with Overlay */}
                  <div className="h-52 w-full relative overflow-hidden bg-slate-800">
                    <img
                      src={item.photoUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-xs text-white border border-white/20">
                        {item.subject}
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs">
                        {item.type}
                      </span>
                    </div>

                    {/* Bottom Info on Image */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-lg font-black text-white tracking-tight drop-shadow-md">
                        {item.chapter}
                      </h3>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] font-semibold text-indigo-300">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600/90 text-white shadow-xs">
                          {item.questionCount || 40} টি প্রশ্ন
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Hover Practice Button */}
                  <div className="p-3 bg-slate-950 flex items-center justify-between text-xs font-bold text-indigo-400 group-hover:text-white group-hover:bg-indigo-600 transition-colors">
                    <span>অনুশীলন শুরু করুন</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PracticePage;
