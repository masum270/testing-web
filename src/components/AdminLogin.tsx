import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, AlertCircle } from 'lucide-react';
import { auth } from '../services/firebase.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

interface AdminLoginProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onCancel }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (cleanEmail === 'masumbillahmmn2314@gmail.com' && cleanPin === '2429005267') {
      try {
        try {
          await signInWithEmailAndPassword(auth, cleanEmail, password);
        } catch (authErr: any) {
          if (
            authErr?.code === 'auth/user-not-found' ||
            authErr?.code === 'auth/invalid-credential' ||
            authErr?.code === 'auth/invalid-login-credentials'
          ) {
            try {
              await createUserWithEmailAndPassword(auth, cleanEmail, password);
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
        onSuccess?.();
      } catch (err: any) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('isAdmin', 'true');
          localStorage.setItem('adminEmail', cleanEmail);
          sessionStorage.setItem('adminPinVerified', 'true');
          window.location.href = '/tfs-admin-2024-secure-x9k2';
        }
        onSuccess?.();
      }
    } else {
      setIsLoading(false);
      setError('Wrong PIN or Email');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-gray-900 border border-slate-800 space-y-3">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-400">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Owner Admin Verification</span>
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-[11px] font-medium flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-[11px] font-bold text-slate-300 mb-1">
          Admin Gmail
        </label>
        <div className="relative">
          <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="email"
            placeholder="Enter your Gmail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-700 bg-gray-800 text-white outline-none focus:border-indigo-500"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-slate-300 mb-1">
          Admin Password
        </label>
        <div className="relative">
          <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-700 bg-gray-800 text-white outline-none focus:border-indigo-500"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-slate-300 mb-1">
          Security PIN
        </label>
        <div className="relative">
          <input
            type={showPin ? 'text' : 'password'}
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoComplete="off"
            className="w-full px-3 pr-9 py-2 text-xs rounded-xl border border-slate-700 bg-gray-800 text-white tracking-widest outline-none focus:border-indigo-500 font-mono"
            required
          />
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
          <span>Login as Admin</span>
        </button>
      </div>
    </form>
  );
};
