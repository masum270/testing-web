import React, { useState, useRef } from 'react';
import { generateCode, sendOTPEmail, verifyOTPCode } from '../lib/otpService.js';
import { getRegisteredUsers, saveRegisteredUsers, hashPassword } from '../utils/auth.js';
import { db, doc, updateDoc, setDoc } from '../firebase.js';
import {
  X,
  Mail,
  KeyRound,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface ForgotPasswordModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCodeDisplay, setGeneratedCodeDisplay] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 1: Send OTP
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('সঠিক Gmail এড্রেস লিখুন।');
      return;
    }

    setIsLoading(true);
    try {
      const code = generateCode();
      await sendOTPEmail(cleanEmail, 'reset', code);
      console.log(`[TFS OTP] Password reset code for ${cleanEmail}: ${code}`);
      setGeneratedCodeDisplay(code);

      // Show alert with code for instant testing as instructed
      alert(`আপনার ৬ ডিজিটের রিসেট কোড: ${code}\n\n(কনসোলে ও স্ক্রিনেও কোডটি প্রদর্শিত হয়েছে)`);

      setIsLoading(false);
      setStep(2);
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'ওটিপি কোড পাঠানো যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    }
  };

  // OTP inputs handling
  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];

    if (value.length > 1) {
      // Handle paste
      const pasted = value.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newDigits[index] = value;
    setOtpDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Step 2: Verify OTP and Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const enteredCode = otpDigits.join('');
    if (enteredCode.length !== 6) {
      setError('সম্পূর্ণ ৬ ডিজিটের ওটিপি কোড প্রদান করুন।');
      return;
    }

    if (newPassword.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('পাসওয়ার্ড দুটি মিলছে না!');
      return;
    }

    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      // Verify code in Firestore
      await verifyOTPCode(cleanEmail, enteredCode, 'reset');

      // Update password in local storage registered users
      const users = getRegisteredUsers();
      const updatedUsers = users.map((u) => {
        if (u.email.toLowerCase() === cleanEmail) {
          return {
            ...u,
            passwordHash: hashPassword(newPassword)
          };
        }
        return u;
      });
      saveRegisteredUsers(updatedUsers);

      // Attempt updating Firestore user if doc exists
      try {
        const userRef = doc(db, 'users', cleanEmail);
        await updateDoc(userRef, {
          passwordHash: hashPassword(newPassword),
          updatedAt: new Date().toISOString()
        }).catch(() => {
          // If doc id is UID or doesn't exist, we fallback safely
        });
      } catch (e) {
        // Safe fallback
      }

      setIsLoading(false);
      setStep(3);
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'কোডটি সঠিক নয় বা মেয়াদ শেষ হয়েছে।');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-3xl p-6 sm:p-8 border shadow-2xl animate-in zoom-in-95 duration-200"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b" style={{ borderColor: 'var(--card-border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-[#6C5CE7] flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base sm:text-lg" style={{ color: 'var(--text-main)' }}>
              {step === 1 && 'পাসওয়ার্ড পুনরুদ্ধার'}
              {step === 2 && '৬ ডিজিটের কোড যাচাই'}
              {step === 3 && 'পাসওয়ার্ড পরিবর্তন সফল'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            style={{ color: 'var(--text-main)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Enter Gmail */}
        {step === 1 && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              আপনার নিবন্ধিত Gmail এড্রেসটি লিখুন। আমরা ৬ ডিজিটের সিকিউরিটি কোড পাঠিয়ে যাচাই করব।
            </p>

            <div>
              <label className="text-xs font-bold block mb-1 text-slate-700 dark:text-slate-300">
                জিমেইল এড্রেস:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 transition-all"
                  style={{
                    backgroundColor: 'var(--bg)',
                    borderColor: 'var(--card-border)',
                    color: 'var(--text-main)'
                  }}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-[#6C5CE7] hover:bg-[#5848df] text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'কোড পাঠানো হচ্ছে...' : '৬ ডিজিটের কোড পাঠান'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: Enter 6-digit OTP & New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                  কোড পাঠানো হয়েছে: <strong className="text-slate-700 dark:text-slate-200">{email}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[11px] text-[#6C5CE7] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>পরিবর্তন</span>
                </button>
              </div>

              {generatedCodeDisplay && (
                <div className="p-2 mb-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-center">
                  <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                    টেস্টিং কোড: <span className="font-mono font-bold tracking-widest text-sm text-purple-900 dark:text-purple-100">{generatedCodeDisplay}</span>
                  </span>
                </div>
              )}

              <label className="text-xs font-bold block mb-2 text-slate-700 dark:text-slate-300">
                ৬ ডিজিটের OTP কোড লিখুন:
              </label>

              {/* 6 Digit Input Boxes */}
              <div className="grid grid-cols-6 gap-2 sm:gap-2.5 my-2">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-full h-12 text-center text-lg font-bold font-mono rounded-xl border border-slate-300 dark:border-slate-700 focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/30 outline-none transition-all"
                    style={{
                      backgroundColor: 'var(--bg)',
                      color: 'var(--text-main)'
                    }}
                    autoFocus={index === 0}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1 text-slate-700 dark:text-slate-300">
                নতুন পাসওয়ার্ড:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="কমপক্ষে ৬ অক্ষর"
                  className="w-full pl-10 pr-4 py-2 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 transition-all"
                  style={{
                    backgroundColor: 'var(--bg)',
                    borderColor: 'var(--card-border)',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1 text-slate-700 dark:text-slate-300">
                নতুন পাসওয়ার্ড নিশ্চিত করুন:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="পুনরায় একই পাসওয়ার্ড দিন"
                  className="w-full pl-10 pr-4 py-2 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 transition-all"
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
              className="w-full py-3 rounded-2xl bg-[#6C5CE7] hover:bg-[#5848df] text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'যাচাই করা হচ্ছে...' : 'পাসওয়ার্ড রিসেট সম্পন্ন করুন'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 3: Success Screen */}
        {step === 3 && (
          <div className="space-y-4 py-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-base sm:text-lg" style={{ color: 'var(--text-main)' }}>
              পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              আপনার নতুন পাসওয়ার্ডটি সফলভাবে সংরক্ষণ করা হয়েছে। এখন নতুন পাসওয়ার্ড দিয়ে লগইন করতে পারেন।
            </p>
            <button
              type="button"
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full py-3 rounded-2xl bg-[#6C5CE7] hover:bg-[#5848df] text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>লগইন পেজে যান</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
