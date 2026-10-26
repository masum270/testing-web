import React, { useState, useRef, useEffect } from 'react';
import { ThemeId, AVAILABLE_THEMES } from '../types/theme.js';
import { Palette, Check } from 'lucide-react';

interface ThemeSwitcherProps {
  currentTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ currentTheme, onThemeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-xs"
        style={{ backgroundColor: 'var(--card)', color: 'var(--text-main)' }}
        title="থিম পরিবর্তন করুন"
        aria-label="থিম পরিবর্তন করুন"
      >
        <Palette className="w-4 h-4 text-[#6C5CE7]" />
        <span className="hidden sm:inline">থিম</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-2xl shadow-xl border p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--card-border)',
            color: 'var(--text-main)'
          }}
        >
          <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            থিম নির্বাচন করুন
          </div>
          <div className="space-y-1 mt-1">
            {AVAILABLE_THEMES.map((theme) => {
              const isSelected = currentTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    onThemeChange(theme.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-violet-50 text-[#6C5CE7] dark:bg-violet-950/40 dark:text-violet-300'
                      : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 shrink-0 shadow-xs"
                      style={{ backgroundColor: theme.color }}
                    />
                    <div>
                      <div className="leading-tight">{theme.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{theme.nameEn}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#6C5CE7] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
