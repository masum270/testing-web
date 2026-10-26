import React, { useState, useMemo } from 'react';
import { SubjectInfo, ExamSessionConfig } from '../types/quiz.js';
import { SubjectIcon } from './SubjectIcon.js';
import { toBengaliNumber } from '../utils/quizLogic.js';
import {
  Clock,
  BookOpen,
  Layers,
  Sparkles,
  X,
  ChevronRight,
  Zap,
  Check,
  CheckSquare,
  Square
} from 'lucide-react';

interface ExamSetupModalProps {
  subject: SubjectInfo;
  onClose: () => void;
  onStartExam: (config: ExamSessionConfig) => void;
}

export const ExamSetupModal: React.FC<ExamSetupModalProps> = ({
  subject,
  onClose,
  onStartExam
}) => {
  const isBangla1st = subject.id === 'bangla-1st' || subject.name.includes('বাংলা ১ম');

  // Bangla 1st Paper Goddo / Poddo / All Tab selection
  const [banglaTab, setBanglaTab] = useState<'all' | 'goddo' | 'poddo'>('all');

  // Selected chapters list for multi/single selection
  const [selectedChapters, setSelectedChapters] = useState<string[]>(['all']);
  const [selectedCount, setSelectedCount] = useState<number>(15);

  const countOptions = [
    { count: 15, label: '১৫ টি MCQ', time: '১৫ মিনিট' },
    { count: 25, label: '২৫ টি MCQ', time: '২৫ মিনিট' },
    { count: 30, label: '৩০ টি MCQ', time: '৩০ মিনিট' },
    { count: 50, label: '৫০ টি MCQ', time: '৫০ মিনিট' }
  ];

  // Active available chapters list depending on the selected Bangla tab
  const activeChapterList = useMemo(() => {
    if (!isBangla1st) {
      return subject.chapters;
    }
    if (banglaTab === 'goddo') {
      return subject.goddoChapters || subject.chapters.slice(0, 26);
    }
    if (banglaTab === 'poddo') {
      return subject.poddoChapters || subject.chapters.slice(26);
    }
    return subject.chapters;
  }, [subject, isBangla1st, banglaTab]);

  // Handle Bangla section tab change
  const handleTabChange = (newTab: 'all' | 'goddo' | 'poddo') => {
    setBanglaTab(newTab);
    setSelectedChapters(['all']);
  };

  // Toggle chapter selection (supports single or multi-select)
  const toggleChapter = (chapterName: string) => {
    if (chapterName === 'all') {
      setSelectedChapters(['all']);
      return;
    }

    if (selectedChapters.includes('all')) {
      setSelectedChapters([chapterName]);
      return;
    }

    if (selectedChapters.includes(chapterName)) {
      const filtered = selectedChapters.filter((c) => c !== chapterName);
      setSelectedChapters(filtered.length === 0 ? ['all'] : filtered);
    } else {
      setSelectedChapters([...selectedChapters, chapterName]);
    }
  };

  // Select all chapters within the active tab
  const handleSelectAllCurrent = () => {
    setSelectedChapters(['all']);
  };

  const handleStart = () => {
    let chapterLabel = 'সকল অধ্যায়';
    if (!selectedChapters.includes('all')) {
      if (selectedChapters.length === 1) {
        chapterLabel = selectedChapters[0];
      } else {
        chapterLabel = `${selectedChapters[0]} সহ মোট ${selectedChapters.length}টি অধ্যায়`;
      }
    } else if (isBangla1st) {
      if (banglaTab === 'goddo') chapterLabel = 'সকল গদ্য (২৬ অধ্যায়)';
      else if (banglaTab === 'poddo') chapterLabel = 'সকল পদ্য (২৮ অধ্যায়)';
      else chapterLabel = 'সকল অধ্যায় (৫৪ অধ্যায়)';
    }

    const actualChapters = selectedChapters.includes('all')
      ? activeChapterList
      : selectedChapters;

    onStartExam({
      subject: subject.name,
      chapter: chapterLabel,
      selectedChapters: actualChapters,
      questionCount: selectedCount,
      timeLimitSeconds: selectedCount * 60
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh]"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--card-border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          className="p-4 sm:p-5 text-white relative overflow-hidden"
          style={{ backgroundColor: subject.color }}
        >
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner shrink-0">
                <SubjectIcon name={subject.icon} className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20">
                  {subject.nameEn}
                </span>
                <h3 className="text-lg sm:text-xl font-black mt-0.5 truncate">{subject.name}</h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all cursor-pointer shrink-0"
              title="বন্ধ করুন"
              aria-label="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* BANGLA 1ST PAPER SPECIAL TABS: [All - 54 chapters] [গদ্য - 26 chapters] [পদ্য - 28 chapters] */}
          {isBangla1st && (
            <div>
              <label className="text-xs font-bold block mb-1.5 text-slate-500">
                সাহিত্য বিভাগ নির্বাচন:
              </label>
              <div
                className="grid grid-cols-3 p-1 rounded-2xl border gap-1"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--card-border)' }}
              >
                <button
                  type="button"
                  onClick={() => handleTabChange('all')}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    banglaTab === 'all'
                      ? 'bg-[#6C5CE7] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-[#6C5CE7]'
                  }`}
                >
                  All (৫৪ অধ্যায়)
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('goddo')}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    banglaTab === 'goddo'
                      ? 'bg-[#6C5CE7] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-[#6C5CE7]'
                  }`}
                >
                  গদ্য (২৬ অধ্যায়)
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('poddo')}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    banglaTab === 'poddo'
                      ? 'bg-[#6C5CE7] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-[#6C5CE7]'
                  }`}
                >
                  পদ্য (২৮ অধ্যায়)
                </button>
              </div>
            </div>
          )}

          {/* Chapter Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs sm:text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                <BookOpen className="w-4 h-4 text-[#6C5CE7]" />
                <span>
                  অধ্যায় নির্বাচন ({toBengaliNumber(activeChapterList.length)}টি উপলব্ধ):
                </span>
              </label>
              <button
                type="button"
                onClick={handleSelectAllCurrent}
                className="text-[11px] font-bold text-[#6C5CE7] hover:underline cursor-pointer"
              >
                {selectedChapters.includes('all') ? '✓ সকল নির্বাচিত' : 'সবগুলো নির্বাচন করো'}
              </button>
            </div>

            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 sm:max-h-56 overflow-y-auto p-2 border rounded-2xl"
              style={{
                backgroundColor: 'var(--bg)',
                borderColor: 'var(--card-border)'
              }}
            >
              {/* Option: All Chapters */}
              <button
                type="button"
                onClick={() => toggleChapter('all')}
                className={`p-2 sm:p-2.5 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  selectedChapters.includes('all')
                    ? 'bg-[#6C5CE7] text-white shadow-xs'
                    : 'border hover:opacity-85'
                }`}
                style={
                  !selectedChapters.includes('all')
                    ? {
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--card-border)',
                        color: 'var(--text-main)'
                      }
                    : {}
                }
              >
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span>
                    {isBangla1st
                      ? banglaTab === 'goddo'
                        ? 'সকল গদ্য (২৬ অধ্যায় এক সাথে)'
                        : banglaTab === 'poddo'
                        ? 'সকল পদ্য (২৮ অধ্যায় এক সাথে)'
                        : 'সকল অধ্যায় (মিক্সড পরীক্ষা)'
                      : 'সকল অধ্যায় (মিক্সড পরীক্ষা)'}
                  </span>
                </span>
                {selectedChapters.includes('all') && <Check className="w-4 h-4 shrink-0" />}
              </button>

              {/* Individual / Multi Chapters List */}
              {activeChapterList.map((ch, idx) => {
                const isSelected = selectedChapters.includes(ch);
                return (
                  <button
                    key={`${ch}_${idx}`}
                    type="button"
                    onClick={() => toggleChapter(ch)}
                    className={`p-2 sm:p-2.5 rounded-xl text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer truncate ${
                      isSelected
                        ? 'bg-[#6C5CE7] text-white font-bold shadow-xs'
                        : 'border hover:opacity-85'
                    }`}
                    style={
                      !isSelected
                        ? {
                            backgroundColor: 'var(--card)',
                            borderColor: 'var(--card-border)',
                            color: 'var(--text-main)'
                          }
                        : {}
                    }
                  >
                    <span className="truncate flex items-center gap-1.5">
                      <span className="text-[10px] opacity-70">{toBengaliNumber(idx + 1)}.</span>
                      <span className="truncate">{ch}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 fill-current shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
            {!selectedChapters.includes('all') && (
              <p className="text-[11px] font-semibold text-[#6C5CE7] mt-1.5">
                নির্বাচিত অধ্যায়: {toBengaliNumber(selectedChapters.length)} টি (একাধিক বা একক পছন্দ অনুযায়ী পরীক্ষা হবে)
              </p>
            )}
          </div>

          {/* Question Count Selection */}
          <div>
            <label className="text-xs sm:text-sm font-bold flex items-center gap-2 mb-2" style={{ color: 'var(--text-main)' }}>
              <Layers className="w-4 h-4 text-[#6C5CE7]" />
              প্রশ্নের সংখ্যা নির্বাচন করো:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {countOptions.map((opt) => (
                <button
                  key={opt.count}
                  type="button"
                  onClick={() => setSelectedCount(opt.count)}
                  className={`p-2.5 sm:p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    selectedCount === opt.count
                      ? 'border-[#6C5CE7] bg-violet-50 dark:bg-violet-950/60 text-[#6C5CE7] font-bold shadow-xs ring-2 ring-[#6C5CE7]/30'
                      : 'hover:border-slate-400'
                  }`}
                  style={
                    selectedCount !== opt.count
                      ? {
                          backgroundColor: 'var(--card)',
                          borderColor: 'var(--card-border)',
                          color: 'var(--text-main)'
                        }
                      : {}
                  }
                >
                  <div className="text-sm font-bold">{toBengaliNumber(opt.count)} টি</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{toBengaliNumber(opt.count)} মিনিট</div>
                </button>
              ))}
            </div>
          </div>

          {/* Exam Rules Card */}
          <div
            className="border rounded-2xl p-3 sm:p-4"
            style={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--card-border)'
            }}
          >
            <h4 className="text-xs font-bold text-[#6C5CE7] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              পরীক্ষার নিয়মাবলী ও সময়সূচি
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
                <span className="text-slate-400 block text-[10px]">মোট প্রশ্ন</span>
                <span className="font-bold" style={{ color: 'var(--text-main)' }}>{toBengaliNumber(selectedCount)} টি</span>
              </div>
              <div className="p-2 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
                <span className="text-slate-400 block text-[10px]">সময়সীমা</span>
                <span className="font-bold" style={{ color: 'var(--text-main)' }}>{toBengaliNumber(selectedCount)} মিনিট</span>
              </div>
              <div className="p-2 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
                <span className="text-slate-400 block text-[10px]">প্রতি সঠিক উত্তর</span>
                <span className="font-bold text-emerald-600">+{toBengaliNumber(10)} XP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div
          className="p-3 sm:p-4 border-t flex items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--bg)',
            borderColor: 'var(--card-border)'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm hover:opacity-80 transition-all cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            বাতিল
          </button>

          <button
            type="button"
            onClick={handleStart}
            className="flex-1 px-5 py-2.5 sm:py-3 rounded-2xl bg-[#6C5CE7] hover:bg-[#5848df] text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>পরীক্ষা শুরু করো</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
