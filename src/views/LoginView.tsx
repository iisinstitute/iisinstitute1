import React, { useState } from 'react';
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { INITIAL_USERS } from '../lib/demoData.ts';
import { UserProfile } from '../types/index.ts';

export const LoginView: React.FC = () => {
  const { loginWithPhone, loginAsDemoUser, loginWithGoogle } = useAuth();

  const [phone, setPhone] = useState('9820112345');
  const [password, setPassword] = useState('123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await loginWithPhone(phone, password);
      if (!res.success) {
        setErrorMessage(res.message || 'Invalid credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (user: UserProfile) => {
    setPhone(user.phone || '');
    setPassword(user.password || '123');
    setErrorMessage(null);
  };

  const handleDirectDemoLogin = (user: UserProfile) => {
    loginAsDemoUser(user);
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-50 p-4 sm:p-6 lg:p-8">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-blue-100/40 blur-3xl -top-40 -left-20 absolute" />
        <div className="w-[600px] h-[600px] rounded-full bg-purple-100/40 blur-3xl -bottom-40 -right-20 absolute" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Main Card */}
        <div className="overflow-hidden rounded-3xl border border-gray-200/90 bg-white shadow-xl">
          {/* Header Banner */}
          <div className="bg-linear-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 text-white text-center relative">
            <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-2xl bg-white p-2 shadow-lg mb-3">
              <img
                src="/assets/aistudio/image_5aac2d2d.png"
                alt="IIS Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">IIS INSTITUTE</h1>
            <p className="text-xs text-blue-100 mt-1">
              Coaching Institute CRM & Management System
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-0.5 text-[11px] font-medium text-white mt-2 backdrop-blur-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-200" />
              <span>Secure Number & Password Login</span>
            </div>
          </div>

          {/* Form Area */}
          <div className="p-6 sm:p-8">
            {errorMessage && (
              <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-800 animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="flex-1">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Mobile / Phone Number *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-4 text-xs font-semibold text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:bg-white focus:outline-hidden transition-all"
                  />
                </div>
                <p className="mt-1 text-[10px] text-gray-400">
                  e.g. 9820112345 (Admin), 9820334567 (Teacher), 9820556789 (Parent)
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700">
                    Password *
                  </label>
                  <span className="text-[10px] text-purple-600 font-semibold">
                    Demo Pass: 123
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-10 text-xs font-semibold text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:bg-white focus:outline-hidden transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-gray-600 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Remember login on this device</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                <LogIn className="h-4 w-4" />
                <span>{isLoading ? 'Authenticating...' : 'Sign In with Mobile & Password'}</span>
              </button>
            </form>

            {/* Quick Demo Login Section */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2.5 text-center">
                Quick 1-Click Role Login
              </span>
              <div className="grid grid-cols-2 gap-2 text-left">
                {INITIAL_USERS.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleDirectDemoLogin(u)}
                    className={`rounded-xl border p-2.5 text-left transition-all hover:shadow-xs group ${
                      u.role === 'Super Admin'
                        ? 'border-blue-200 bg-blue-50/50 hover:bg-blue-100/70'
                        : u.role === 'Admin'
                        ? 'border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70'
                        : u.role === 'Teacher'
                        ? 'border-purple-200 bg-purple-50/50 hover:bg-purple-100/70'
                        : u.role === 'Accountant'
                        ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70'
                        : 'border-amber-200 bg-amber-50/50 hover:bg-amber-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-gray-900 truncate">{u.role}</span>
                      <Sparkles className="h-3 w-3 text-gray-400 group-hover:text-blue-600 shrink-0" />
                    </div>
                    <span className="font-mono text-[10px] text-gray-500 block">{u.phone}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Information */}
            <div className="mt-6 text-center text-[11px] text-gray-400">
              IIS Institute Educational Management • Academic Session 2026-27
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
