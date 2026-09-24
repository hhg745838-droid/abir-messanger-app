import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auth, firebaseConfig } from '../../config/firebase';
import {
  MessageSquare,
  ShieldCheck,
  Video,
  Radio,
  Sparkles,
  HelpCircle,
  AlertCircle,
  Loader2,
  Terminal,
  Lock,
  Phone,
  User,
  Eye,
  EyeOff,
} from 'lucide-react';

interface Props {
  onOpenSetupGuide: () => void;
}

export const LoginScreen: React.FC<Props> = ({ onOpenSetupGuide }) => {
  const { loginWithGoogle, loginWithNumberOrEmail, signupWithNumberOrEmail } = useAuth();
  
  // Auth Form Mode: 'login' | 'signup'
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [numberOrEmail, setNumberOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);

  // In development, log the diagnostic configuration on mount
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[Firebase Auth Diagnostic]', {
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        apiKey: firebaseConfig.apiKey,
      });
    }
  }, []);

  // Handle Number/Email and Password Sign-In or Sign-Up
  const handleNumberPasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const identifier = numberOrEmail.trim();
    if (!identifier) {
      setError({ message: 'Please enter your phone number or email.' });
      return;
    }
    if (!password || password.length < 6) {
      setError({ message: 'Password must be at least 6 characters.' });
      return;
    }

    setLoading(true);
    try {
      if (authMode === 'signup') {
        await signupWithNumberOrEmail(identifier, password, displayName);
      } else {
        await loginWithNumberOrEmail(identifier, password);
      }
    } catch (err: any) {
      console.error('Password Auth Error:', err);
      const code = err?.code || '';
      let message = err?.message || 'Authentication failed. Please check your credentials.';

      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        message = 'Invalid number/email or password. If you do not have an account, click "Create Account".';
      } else if (code === 'auth/wrong-password') {
        message = 'Incorrect password. Please try again.';
      } else if (code === 'auth/email-already-in-use') {
        message = 'An account already exists with this number/email. Please switch to Sign In.';
      } else if (code === 'auth/weak-password') {
        message = 'Password is too weak. Please use at least 6 characters.';
      } else if (code === 'auth/invalid-email') {
        message = 'Invalid format. Please enter a valid phone number or email.';
      }

      setError({ code: err?.code, message });
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign-in with popup or redirect
  const handleGoogleSignIn = async (useRedirect = false) => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle(useRedirect);
    } catch (err: any) {
      console.error('Firebase Auth Error:', err);
      setError({
        code: err?.code || 'auth/unknown',
        message: err?.message || 'An error occurred during Google authentication.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-slate-900 text-gray-900 dark:text-white p-4 md:p-8 select-none">
      {/* Top Navbar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <MessageSquare className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            MyMessenger
          </span>
        </div>

        <button
          onClick={onOpenSetupGuide}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200 dark:border-gray-700 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-blue-500" />
          <span>Firebase Setup & Docs</span>
        </button>
      </header>

      {/* Hero & Login Card */}
      <main className="max-w-4xl w-full mx-auto my-auto py-8 flex flex-col lg:flex-row items-center gap-10">
        {/* Left Value Proposition */}
        <div className="flex-1 space-y-5 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>WebRTC Voice/Video & Firebase Realtime Chat</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Connect in real-time with Anyone, Anywhere.
          </h1>

          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-lg leading-relaxed">
            Fast 1-on-1 private messaging, WebRTC voice & video calls, unique @usernames, and instant presence. Sign in with your phone number or Google account.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-2 text-left">
            <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-800 backdrop-blur-sm">
              <Video className="w-5 h-5 text-blue-500 mb-1.5" />
              <h4 className="text-xs font-bold">WebRTC P2P Calls</h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Low-latency video and audio.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-800 backdrop-blur-sm">
              <Radio className="w-5 h-5 text-emerald-500 mb-1.5" />
              <h4 className="text-xs font-bold">Realtime Presence</h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Live typing bubbles & online sync.
              </p>
            </div>
          </div>
        </div>

        {/* Right Sign-in Card */}
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200/80 dark:border-gray-800 p-6 sm:p-8 backdrop-blur-xl">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-900 dark:text-white mb-1">
            {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-5">
            {authMode === 'login'
              ? 'Sign in with your phone number/email & password'
              : 'Register with your phone number/email & password'}
          </p>

          {/* Tab Selector: Sign In / Create Account */}
          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                authMode === 'login'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Sign In (লগইন)
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                authMode === 'signup'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Create Account (নতুন একাউন্ট)
            </button>
          </div>

          {/* Displays error code and message */}
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 text-left space-y-1">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div className="flex-1 min-w-0">
                  {error.code && (
                    <span className="font-mono text-[10px] text-rose-500 block mb-0.5">
                      [{error.code}]
                    </span>
                  )}
                  <p className="leading-relaxed break-words">{error.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Number & Password Form */}
          <form onSubmit={handleNumberPasswordAuth} className="space-y-3.5 text-left">
            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name (আপনার নাম)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Abir Hassan"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number or Email (ফোন নাম্বার অথবা ইমেইল)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  required
                  value={numberOrEmail}
                  onChange={(e) => setNumberOrEmail(e.target.value)}
                  placeholder="e.g. 01712345678 or user@mail.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password (পাসওয়ার্ড - সর্বনিম্ন ৬ অক্ষর)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition duration-200 cursor-pointer disabled:opacity-60 text-xs"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : authMode === 'login' ? (
                <span>Sign In with Number / Password (লগইন করুন)</span>
              ) : (
                <span>Create Account (নতুন একাউন্ট খুলুন)</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white dark:bg-gray-900 px-2 text-gray-400">or continue with</span>
            </div>
          </div>

          {/* Google Sign-in Button */}
          <button
            onClick={() => handleGoogleSignIn(false)}
            disabled={loading}
            className="w-full py-2.5 px-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/80 text-gray-800 dark:text-white font-medium rounded-xl border border-gray-300 dark:border-gray-700 shadow-xs flex items-center justify-center gap-2.5 transition duration-200 cursor-pointer disabled:opacity-60 text-xs"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* Development-only Firebase Diagnostic Section */}
          {import.meta.env.DEV && (
            <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-800 text-left">
              <div className="p-2.5 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 font-mono text-[10px] space-y-1">
                <div className="flex items-center justify-between font-bold text-gray-500 uppercase tracking-wider text-[9px] mb-0.5">
                  <span className="flex items-center gap-1">
                    <Terminal className="w-3 h-3 text-blue-500" />
                    Firebase Diagnostic (Dev Only)
                  </span>
                  <span className="px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-sans text-[9px]">
                    DEV
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                  <span className="text-gray-400">hostname:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400 break-all ml-1">
                    {typeof window !== 'undefined' ? window.location.hostname : 'unknown'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                  <span className="text-gray-400">projectId:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 break-all ml-1">
                    {firebaseConfig.projectId}
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                  <span className="text-gray-400">authDomain:</span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400 break-all ml-1">
                    {firebaseConfig.authDomain}
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                  <span className="text-gray-400">apiKey:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400 break-all ml-1">
                    {firebaseConfig.apiKey}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto py-3 text-center text-xs text-gray-400">
        MyMessenger • Real-time Firebase & WebRTC Application
      </footer>
    </div>
  );
};
