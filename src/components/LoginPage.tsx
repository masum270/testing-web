import React, { useState, useEffect } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from '../services/firebase.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import {
  syncGoogleUserData
} from '../utils/auth.js';
import { AuthUser } from '../types/auth.js';
import {
  FlaskConical,
  AlertCircle,
  ChevronLeft,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Copy,
  Check,
  ArrowRight,
  Lock,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from 'lucide-react';

interface LoginPageProps {
  onSuccess: (user: AuthUser) => void;
  onNavigateRegister?: () => void;
  onNavigateForgotPassword?: () => void;
  onNavigateHome: () => void;
  redirectMessage?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onNavigateHome,
  onNavigateForgotPassword,
  redirectMessage
}) => {
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isPopupBlocked, setIsPopupBlocked] = useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Owner Admin Login State
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('masumbillahmmn2314@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  // Owner Google Login PIN Modal State
  const [showOwnerPinModal, setShowOwnerPinModal] = useState(false);
  const [ownerGoogleUser, setOwnerGoogleUser] = useState<any>(null);
  const [ownerGooglePinInput, setOwnerGooglePinInput] = useState('');
  const [ownerGooglePinError, setOwnerGooglePinError] = useState<string | null>(null);

  const handleOwnerAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setIsAdminLoading(true);

    const cleanEmail = adminEmail.trim().toLowerCase();
    const cleanPin = adminPin.trim();

    if (cleanEmail === 'masumbillahmmn2314@gmail.com' && cleanPin === '2429005267') {
      try {
        try {
          await signInWithEmailAndPassword(auth, cleanEmail, adminPassword);
        } catch (authErr: any) {
          if (
            authErr?.code === 'auth/user-not-found' ||
            authErr?.code === 'auth/invalid-credential' ||
            authErr?.code === 'auth/invalid-login-credentials'
          ) {
            try {
              await createUserWithEmailAndPassword(auth, cleanEmail, adminPassword);
            } catch {
              // Proceed if creation restricted or user already registered
            }
          }
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('isAdmin', 'true');
          localStorage.setItem('adminEmail', cleanEmail);
          sessionStorage.setItem('adminPinVerified', 'true');
          window.location.href = '/tfs-admin-2024-secure-x9k2';
        }
      } catch (err: any) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('isAdmin', 'true');
          localStorage.setItem('adminEmail', cleanEmail);
          sessionStorage.setItem('adminPinVerified', 'true');
          window.location.href = '/tfs-admin-2024-secure-x9k2';
        }
      }
    } else {
      setIsAdminLoading(false);
      setAdminError('Wrong PIN or Email');
    }
  };

  // Handle getRedirectResult on load in case student used redirect flow
  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          const userEmail = result.user.email?.toLowerCase();
          if (userEmail === 'masumbillahmmn2314@gmail.com') {
            setOwnerGoogleUser(result.user);
            setShowOwnerPinModal(true);
            return;
          }
          const user = await syncGoogleUserData(result.user);
          if (user) {
            onSuccess(user);
          }
        }
      })
      .catch((err: any) => {
        console.warn('Redirect sign-in notice:', err?.code || err?.message);
        if (err.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
          const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'current-domain';
          setUnauthorizedDomain(currentHost);
          setError(`Firebase Console এ বর্তমান প্রিভিউ ডোমেইন (${currentHost}) অনুমোদিত নয়।`);
        } else {
          setError(err?.message || 'গুগল রিডাইরেক্ট লগইন সম্পন্ন করা যায়নি।');
        }
      });
  }, [onSuccess]);

  const handleCopyDomain = () => {
    const host = unauthorizedDomain || (typeof window !== 'undefined' ? window.location.hostname : '');
    if (host && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(host);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };



  const handleGoogleLogin = async () => {
    setError(null);
    setSuccessInfo(null);
    setIsPopupBlocked(false);
    setIsGoogleLoading(true);
    setUnauthorizedDomain(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userEmail = result.user?.email?.toLowerCase();
      if (userEmail === 'masumbillahmmn2314@gmail.com') {
        setOwnerGoogleUser(result.user);
        setShowOwnerPinModal(true);
        setIsGoogleLoading(false);
        return;
      }

      const appUser = await syncGoogleUserData(result.user);
      setIsGoogleLoading(false);
      if (appUser) {
        onSuccess(appUser);
      } else {
        setError('Google অ্যাকাউন্ট থেকে তথ্য পাওয়া যায়নি।');
      }
    } catch {
      try {
        setSuccessInfo('Google লগইন পেজে রিডাইরেক্ট করা হচ্ছে...');
        await signInWithRedirect(auth, googleProvider);
      } catch (redirErr: any) {
        setIsGoogleLoading(false);
        setError(redirErr?.message || 'গুগল লগইন সম্পন্ন করা যায়নি।');
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
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#6C5CE7] text-white flex items-center justify-center mx-auto mb-2.5 shadow-lg shadow-indigo-200">
            <FlaskConical className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-main)' }}>
            Tension Free Science
          </h1>
          <p className="text-xs font-semibold text-[#6C5CE7] mt-0.5">
            ভয় নয়, বিজ্ঞান হবে সহজ
          </p>
          <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mt-2">
            শিক্ষার্থী লগইন
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            নবম-দশম শ্রেণির লাইভ পরীক্ষা ও ফলাফলের জন্য গুগল দিয়ে লগইন করুন
          </p>
        </div>

        {/* Redirect notice if redirected from exam */}
        {redirectMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{redirectMessage}</span>
          </div>
        )}

        {/* Success Notice */}
        {successInfo && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-start gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{successInfo}</span>
          </div>
        )}

        {/* Error Notice with Domain assistance */}
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

        {/* PRIMARY GOOGLE LOGIN BUTTON */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full py-3.5 px-4 rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-[#6C5CE7] transition-all cursor-pointer shadow-md hover:shadow-indigo-100 active:scale-98 disabled:opacity-50"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-main)' }}
          >
            {isGoogleLoading ? (
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
            <span>{isGoogleLoading ? 'Google পপ-আপ খোলা হচ্ছে...' : 'Google দিয়ে সরাসরি লগইন করুন'}</span>
          </button>

          {onNavigateForgotPassword && (
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={onNavigateForgotPassword}
                className="text-xs font-semibold text-[#6C5CE7] hover:underline cursor-pointer flex items-center gap-1.5 py-1"
              >
                <span>পাসওয়ার্ড ভুলে গেছেন? ৬ ডিজিটের কোড দিয়ে রিসেট করুন</span>
              </button>
            </div>
          )}
        </div>

        {/* Popup Blocked Assistance Box */}
        {isPopupBlocked && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 text-xs space-y-2.5 animate-in fade-in duration-200">
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
                <span>রিডাইরেক্ট পদ্ধতিতে লগইন চেষ্টা করুন</span>
              </button>
            </div>

            <p className="text-[10px] text-amber-700 dark:text-amber-300 border-t border-amber-200 dark:border-amber-800 pt-2">
              💡 অথবা ব্রাউজারের অ্যাড্রেস বারের ডানপাশে <strong>🚫 Pop-up Blocked</strong> আইকনে ক্লিক করে <strong>'Always allow pop-ups'</strong> দিয়ে আবার চেষ্টা করুন।
            </p>
          </div>
        )}

        {/* Collapsible Owner Admin Login */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowAdminLogin(!showAdminLogin)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors py-1 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Owner Admin Login</span>
            </div>
            {showAdminLogin ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdminLogin && (
            <form onSubmit={handleOwnerAdminLogin} className="mt-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>অ্যাডমিন একাউন্ট ভেরিফিকেশন</span>
              </div>

              {adminError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-[11px] font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{adminError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  ওনার ইমেইল
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  অ্যাডমিন পাসওয়ার্ড
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Admin Password"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  সিকিউরিটি পিন (PIN)
                </label>
                <input
                  type="password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="PIN 2429005267"
                  maxLength={10}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white tracking-widest outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isAdminLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAdminLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span>Login as Admin</span>
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 pt-4 border-t text-center text-xs text-slate-400">
          Tension Free Science — ভয় নয়, বিজ্ঞান হবে সহজ
        </div>
      </div>

      {/* Owner Google Sign-in PIN Verification Modal */}
      {showOwnerPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm rounded-3xl p-6 border shadow-2xl text-center"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>
              Owner Admin Verification
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Google একাউন্ট (masumbillahmmn2314@gmail.com) শনাক্ত হয়েছে। অ্যাডমিন ড্যাশবোর্ডে প্রবেশ করতে সিক্রেট পিন দিন:
            </p>

            {ownerGooglePinError && (
              <div className="mb-3 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-semibold">
                {ownerGooglePinError}
              </div>
            )}

            <input
              type="password"
              value={ownerGooglePinInput}
              onChange={(e) => {
                setOwnerGooglePinInput(e.target.value);
                setOwnerGooglePinError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (ownerGooglePinInput.trim() === '2429005267') {
                    localStorage.setItem('isAdmin', 'true');
                    localStorage.setItem('adminEmail', 'masumbillahmmn2314@gmail.com');
                    sessionStorage.setItem('adminPinVerified', 'true');
                    window.location.href = '/tfs-admin-2024-secure-x9k2';
                  } else {
                    setOwnerGooglePinError('ভুল পিন! সঠিক পিন: 2429005267');
                  }
                }
              }}
              placeholder="PIN 2429005267"
              className="w-full text-center tracking-widest text-lg font-mono py-2.5 px-3 rounded-xl border mb-3 focus:outline-none focus:border-indigo-500"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }}
              autoFocus
            />

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (ownerGooglePinInput.trim() === '2429005267') {
                    localStorage.setItem('isAdmin', 'true');
                    localStorage.setItem('adminEmail', 'masumbillahmmn2314@gmail.com');
                    sessionStorage.setItem('adminPinVerified', 'true');
                    window.location.href = '/tfs-admin-2024-secure-x9k2';
                  } else {
                    setOwnerGooglePinError('ভুল পিন! সঠিক পিন: 2429005267');
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-[#6C5CE7] hover:bg-[#5848df] text-white font-bold text-xs shadow-md cursor-pointer transition-all"
              >
                Login as Admin
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (ownerGoogleUser) {
                    const appUser = await syncGoogleUserData(ownerGoogleUser);
                    setShowOwnerPinModal(false);
                    if (appUser) onSuccess(appUser);
                  }
                }}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                সাধারণ শিক্ষার্থী হিসেবে চালিয়ে যান
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
