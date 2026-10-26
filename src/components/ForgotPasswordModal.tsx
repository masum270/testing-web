import React, { useState } from 'react';
import { requestPasswordReset } from '../utils/auth.js';
import {
  X,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface ForgotPasswordModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const res = await requestPasswordReset(email);
      setIsLoading(false);
      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onSuccess();
        }, 3000);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'পাসওয়ার্ড রিসেট লিংক পাঠানো যায়নি।');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="relative w-full max-w-md rounded-3xl p-6 sm:p-8 border shadow-2xl animate-in zoom-in-95 duration-200"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: 'var(--card-border)' }}>
          <h3 className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>
            পাসওয়ার্ড পুনরুদ্ধার
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            style={{ color: 'var(--text-main)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {successMsg ? (
          <div className="space-y-4 py-2 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-base" style={{ color: 'var(--text-main)' }}>
              রিসেট লিংক পাঠানো হয়েছে!
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {successMsg}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-[#6C5CE7] hover:bg-[#5848df] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              ঠিক আছে, বন্ধ করুন
            </button>
          </div>
        ) : (
          <form onSubmit={handleRequestResetLink} className="space-y-4">
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              আপনার নিবন্ধিত Gmail এড্রেসটি লিখুন। আমরা সরাসরি আপনার জিমেইলে আসল পাসওয়ার্ড রিসেট লিংক পাঠাব।
            </p>

            <div>
              <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-main)' }}>
                ইমেইল (Gmail):
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 transition-all"
                  style={{
                    backgroundColor: 'var(--bg)',
                    borderColor: 'var(--card-border)',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-[#6C5CE7] hover:bg-[#5848df] text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'লিংক পাঠানো হচ্ছে...' : 'পাসওয়ার্ড রিসেট লিংক পাঠান'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
