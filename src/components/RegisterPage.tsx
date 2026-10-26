import React, { useState, useEffect } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from '../services/firebase.js';
import {
  registerUser,
  syncGoogleUserData,
  resendVerificationEmail,
  loginAsDemoStudent
} from '../utils/auth.js';
import { AuthUser } from '../types/auth.js';
import {
  FlaskConical,
  Mail,
  Lock,
  User,
  Building,
  ArrowRight,
  AlertCircle,
  ChevronLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  ShieldAlert,
  Copy,
  Check,
  Sparkles
} from 'lucide-react';

interface RegisterPageProps {
  onSuccess: (user: AuthUser) => void;
  onNavigateLogin: () => void;
  onNavigateHome: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onSuccess,
  onNavigateLogin,
  onNavigateHome
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [studentClass, setStudentClass] = useState<'9' | '10'>('10');
  const [school, setSchool] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isPopupBlocked, setIsPopupBlocked] = useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Handle getRedirectResult on page load to complete redirect registration/login
  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          const user = await syncGoogleUserData(result.user);
          if (user) {
            onSuccess(user);
          }
        }
      })
      .catch((error: any) => {
        console.error('getRedirectResult error in RegisterPage:', error);
        if (error.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
          const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'current-domain';
          setUnauthorizedDomain(currentHost);
          setError(`Domain not authorized: Firebase Console এ বর্তমান ডোমেইন (${currentHost}) অনুমোদিত নয়।`);
        } else {
          setError(error.message || 'গুগল রিডাইরেক্ট নিবন্ধন সম্পন্ন করা যায়নি।');
        }
      });
  }, [onSuccess]);

  // Verification state after successful registration
  const [registeredUser, setRegisteredUser] = useState<AuthUser | null>(null);
  const [emailCooldown, setEmailCooldown] = useState(60);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!registeredUser || emailCooldown <= 0) return;
    const timer = setInterval(() => {
      setEmailCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [registeredUser, emailCooldown]);

  const handleCopyDomain = () => {
    const host = unauthorizedDomain || (typeof window !== 'undefined' ? window.location.hostname : '');
    if (host && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(host);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const handleDemoLogin = () => {
    const demo = loginAsDemoStudent();
    onSuccess(demo);
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsPopupBlocked(false);
    setIsGoogleLoading(true);
    setUnauthorizedDomain(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const appUser = await syncGoogleUserData(result.user);
      setIsGoogleLoading(false);
      if (appUser) {
        onSuccess(appUser);
      } else {
        setError('Google একাউন্ট থেকে তথ্য পাওয়া যায়নি।');
      }
    } catch (error: any) {
      setIsGoogleLoading(false);
      const host = typeof window !== 'undefined' ? window.location.hostname : 'current-domain';
      console.warn('Google registration attempt notice:', error.code || error.message);

      if (
        error.code === 'auth/popup-blocked' ||
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request'
      ) {
        setIsPopupBlocked(true);
        try {
          console.log('Popup blocked, trying redirect...', error.code);
          await signInWithRedirect(auth, googleProvider);
        } catch (redirErr: any) {
          if (redirErr.code === 'auth/unauthorized-domain' || redirErr?.message?.includes('unauthorized-domain')) {
            setUnauthorizedDomain(host);
            setError(`Firebase Console এ বর্তমান প্রিভিউ ডোমেইন (${host}) অথোরাইজ করা নেই।`);
          } else {
            setError('ব্রাউজারে গুগল পপ-আপ ব্লক হয়েছে। পপ-আপ অনুমতি দিন অথবা ডেমো শিক্ষার্থী হিসেবে প্রবেশ করুন।');
          }
        }
      } else if (
        error.code === 'auth/unauthorized-domain' ||
        error?.message?.includes('unauthorized-domain') ||
        error?.message?.includes('auth/unauthorized-domain')
      ) {
        setUnauthorizedDomain(host);
        setError(`Firebase Console এ বর্তমান প্রিভিউ ডোমেইন (${host}) অথোরাইজ করা নেই।`);
      } else {
        setError(error?.message || 'গুগল দিয়ে নিবন্ধন করতে সমস্যা হয়েছে।');
      }
    }
  };

  const handleGoogleRedirectLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      setIsGoogleLoading(false);
      setError(err?.message || 'Google রিডাইরেক্ট শুরু করা যায়নি।');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    setIsLoading(true);

    try {
      const res = await registerUser({
        name,
        email,
        password,
        studentClass,
        school
      });

      setIsLoading(false);

      if (res.success && res.user) {
        setRegisteredUser(res.user);
        setEmailCooldown(60);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'নিবন্ধন করার সময় ত্রুটি দেখা দিয়েছে। আবার চেষ্টা করুন।');
    }
  };

  const handleResend = async () => {
    if (emailCooldown > 0) return;
    setError(null);
    setResendStatus(null);
    try {
      const res = await resendVerificationEmail();
      if (res.success) {
        setEmailCooldown(60);
        setResendStatus(res.message);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError('ভেরিফিকেশন ইমেইল পুনরায় পাঠাতে সমস্যা হয়েছে।');
    }
  };

  // If successfully registered, show verification success card
  if (registeredUser) {
    return (
      <div className="min-h-screen py-10 px-4 flex flex-col justify-center items-center">
        <div
          className="w-full max-w-md rounded-3xl p-6 sm:p-8 border shadow-xl animate-in zoom-in-95 duration-200 text-center"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <Mail className="w-8 h-8" />
          </div>

          <h1 className="text-xl font-extrabold" style={{ color: 'var(--text-main)' }}>
            Gmail এ ভেরিফিকেশন লিংক পাঠানো হয়েছে!
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            আমরা <strong className="text-indigo-600 dark:text-indigo-400">{registeredUser.email}</strong> ঠিকানায় একটি ভেরিফিকেশন লিংক পাঠিয়েছি।
          </p>

          <div
            className="my-5 p-4 rounded-2xl border text-xs text-left space-y-2"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--card-border)' }}
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>আপনার জিমেইল ইনবক্স বা স্প্যাম ফোল্ডার চেক করুন।</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>ইমেইলে দেওয়া লিংকে ক্লিক করে অ্যাকাউন্ট ভেরিফাই করুন।</span>
            </div>
          </div>

          {resendStatus && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 text-xs font-medium">
              {resendStatus}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => onSuccess(registeredUser)}
              className="w-full py-3 rounded-2xl bg-[#6C5CE7] hover:bg-[#5848df] text-white font-bold text-sm shadow-md shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>সরাসরি অ্যাপে প্রবেশ করুন</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={emailCooldown > 0}
              onClick={handleResend}
              className="w-full py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-main)' }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                {emailCooldown > 0
                  ? `পুনরায় ইমেইল পাঠাতে অপেক্ষা (${emailCooldown}s)`
                  : 'ভেরিফিকেশন ইমেইল আবার পাঠান'}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 flex flex-col justify-center items-center">
      {/* Back to Home Button */}
      <div className="w-full max-w-md mb-3 flex items-center justify-between">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>হোমে ফিরে যাও</span>
        </button>
      </div>

      <div
        className="w-full max-w-md rounded-3xl p-6 sm:p-8 border shadow-xl animate-in zoom-in-95 duration-200"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}
      >
        {/* Brand Header */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-[#6C5CE7] text-white flex items-center justify-center mx-auto mb-2 shadow-lg shadow-indigo-200">
            <FlaskConical className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-main)' }}>
            Tension Free Science
          </h1>
          <p className="text-xs font-semibold text-[#6C5CE7] mt-0.5">
            ভয় নয়, বিজ্ঞান হবে সহজ
          </p>
          <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mt-2">
            নতুন শিক্ষার্থী সরাসরি নিবন্ধন
          </h2>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-medium flex items-start gap-2.5 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-1 space-y-2">
              <span className="font-semibold block">{error}</span>

              {(unauthorizedDomain || error.toLowerCase().includes('authorized') || error.toLowerCase().includes('domain')) && (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900 text-[11px] text-slate-700 dark:text-slate-300 space-y-2 mt-2">
                  <p className="font-bold text-rose-600 dark:text-rose-400">
                    Firebase Console এ ডোমেইনটি অনুমোদিত নয়:
                  </p>
                  
                  <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <code className="flex-1 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold truncate px-1">
                      {unauthorizedDomain || (typeof window !== 'undefined' ? window.location.hostname : 'current-domain')}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyDomain}
                      className="px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/50 text-[#6C5CE7] dark:text-indigo-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all shrink-0"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? 'কপি হয়েছে!' : 'কপি'}</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-normal">
                    Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains এ উপরের ডোমেইনটি যুক্ত করতে পারেন।
                  </p>

                  <div className="pt-1 flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={handleDemoLogin}
                      className="w-full py-2 px-3 rounded-xl bg-[#6C5CE7] hover:bg-[#5848df] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>ডেমো শিক্ষার্থী হিসেবে সরাসরি অ্যাপে প্রবেশ করুন</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <a
                      href="https://console.firebase.google.com/project/gen-lang-client-0170019612/authentication/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-1.5 px-2 rounded-lg border border-slate-300 dark:border-slate-700 text-center text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Firebase Console এ Authorized Domains পেজ খুলুন</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Full Name */}
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-main)' }}>
              শিক্ষার্থীর পূর্ণ নাম:
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: সাকিব হাসান"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 transition-all"
                style={{
                  backgroundColor: 'var(--bg)',
                  borderColor: 'var(--card-border)',
                  color: 'var(--text-main)'
                }}
              />
            </div>
          </div>

          {/* Email (Gmail) */}
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-main)' }}>
              ইমেইল এড্রেস (Gmail):
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


          {/* Password with Eye Show/Hide Toggle */}
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-main)' }}>
              পাসওয়ার্ড:
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 transition-all"
                style={{
                  backgroundColor: 'var(--bg)',
                  borderColor: 'var(--card-border)',
                  color: 'var(--text-main)'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
                aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                title={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Class (9 or 10) */}
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-main)' }}>
              শ্রেণি নির্বাচন করো:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStudentClass('9')}
                className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  studentClass === '9'
                    ? 'bg-violet-50 text-[#6C5CE7] border-[#6C5CE7] dark:bg-violet-950/60'
                    : 'border-slate-200 text-slate-600 dark:border-slate-700'
                }`}
              >
                নবম শ্রেণি (Class 9)
              </button>
              <button
                type="button"
                onClick={() => setStudentClass('10')}
                className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  studentClass === '10'
                    ? 'bg-violet-50 text-[#6C5CE7] border-[#6C5CE7] dark:bg-violet-950/60'
                    : 'border-slate-200 text-slate-600 dark:border-slate-700'
                }`}
              >
                দশম শ্রেণি / এসএসসি (Class 10)
              </button>
            </div>
          </div>

          {/* School (Optional) */}
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-main)' }}>
              বিদ্যালয়ের নাম (ঐচ্ছিক):
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="যেমন: রাজউক উত্তরা মডেল কলেজ / ভিকারুননিসা নূন"
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
            className="w-full py-3 rounded-2xl bg-[#6C5CE7] hover:bg-[#5848df] text-white font-bold text-sm shadow-md shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            <span>{isLoading ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'রেজিস্ট্রেশন ও ভেরিফিকেশন লিংক পাঠান'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: 'var(--card-border)' }} />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase">
            <span className="px-2 font-bold" style={{ backgroundColor: 'var(--card)', color: 'var(--text-muted)' }}>
              অথবা সরাসরি
            </span>
          </div>
        </div>

        {/* Direct Google Single-Click Registration with Real Popup */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading || isGoogleLoading}
          className="w-full py-2.5 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
          style={{ borderColor: 'var(--card-border)', color: 'var(--text-main)' }}
        >
          {isGoogleLoading ? (
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.1 7.5 23 12 23z"
              />
            </svg>
          )}
          <span>{isGoogleLoading ? 'Google পপ-আপ খোলা হচ্ছে...' : 'Google দিয়ে সরাসরি একাউন্ট খুলুন'}</span>
        </button>

        {/* Instant Demo Student Button */}
        <button
          type="button"
          onClick={handleDemoLogin}
          className="w-full mt-2.5 py-2.5 px-4 rounded-2xl bg-indigo-50/80 hover:bg-indigo-100/90 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-[#6C5CE7] dark:text-indigo-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>ডেমো শিক্ষার্থী হিসেবে এক ক্লিকে প্রবেশ করুন</span>
        </button>

        {/* Popup Blocked Assistance Box */}
        {isPopupBlocked && (
          <div className="mt-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 text-xs space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs">গুগল পপ-আপ উইন্ডোটি ব্লক হয়েছে</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-200 mt-0.5 leading-relaxed">
                  ব্রাউজার বা প্রিভিউ ফ্রেমের সিকিউরিটি সেটিং পপ-আপ ব্লক করেছে। নিচের যেকোনো একটি বিকল্প ব্যবহার করুন:
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <a
                href={typeof window !== 'undefined' ? window.location.href : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all text-center no-underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>নতুন ট্যাবে সম্পূর্ণ স্ক্রিনে খুলুন (প্রস্তাবিত)</span>
              </a>

              <button
                type="button"
                onClick={handleGoogleRedirectLogin}
                className="w-full py-2 px-3 rounded-xl border border-amber-400 dark:border-amber-700 bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-100 font-bold text-xs hover:bg-amber-100/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>রিডাইরেক্ট পদ্ধতিতে নিবন্ধন চেষ্টা করুন</span>
              </button>
            </div>

            <p className="text-[10px] text-amber-700 dark:text-amber-300 border-t border-amber-200 dark:border-amber-800 pt-2">
              💡 অথবা ব্রাউজারের অ্যাড্রেস বারের ডানপাশে <strong>🚫 Pop-up Blocked</strong> আইকনে ক্লিক করে <strong>'Always allow pop-ups'</strong> দিয়ে আবার চেষ্টা করুন।
            </p>
          </div>
        )}

        {/* Login Prompt */}
        <div
          className="mt-4 pt-3 border-t text-center text-xs"
          style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
        >
          <span>ইতিমধ্যে অ্যাকাউন্ট আছে? </span>
          <button
            onClick={onNavigateLogin}
            className="font-bold text-[#6C5CE7] hover:underline cursor-pointer"
          >
            সরাসরি লগইন করুন
          </button>
        </div>
      </div>
    </div>
  );
};
