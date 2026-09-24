import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  MessageSquare,
  ShieldCheck,
  Video,
  Radio,
  Sparkles,
  HelpCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

interface Props {
  onOpenSetupGuide: () => void;
}

export const LoginScreen: React.FC<Props> = ({ onOpenSetupGuide }) => {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ title: string; message: string; actionUrl?: string; actionLabel?: string } | null>(null);

  const handleGoogleSignIn = async (useRedirect = false) => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle(useRedirect);
    } catch (err: any) {
      console.error('Firebase Auth Error:', err);
      const code = err?.code || '';

      if (code === 'auth/configuration-not-found') {
        setError({
          title: 'Authentication Not Configured in Firebase Console',
          message:
            "Firebase Authentication has not been initialized for project 'mesenger-b000f'. In the Firebase Console, go to Build > Authentication, click 'Get started', and enable the Google sign-in provider.",
          actionUrl: 'https://console.firebase.google.com/project/mesenger-b000f/authentication/providers',
          actionLabel: 'Open Firebase Console > Authentication',
        });
      } else if (code === 'auth/operation-not-allowed') {
        setError({
          title: 'Google Sign-In Provider Disabled',
          message:
            "Google provider is disabled in Firebase Console. Go to Authentication > Sign-in method, click Google, and enable it.",
          actionUrl: 'https://console.firebase.google.com/project/mesenger-b000f/authentication/providers',
          actionLabel: 'Enable Google in Firebase Console',
        });
      } else if (code === 'auth/unauthorized-domain') {
        const currentHost = window.location.hostname;
        setError({
          title: 'Unauthorized Domain',
          message: `The domain '${currentHost}' is not authorized. Go to Firebase Console > Authentication > Settings > Authorized domains and add '${currentHost}'.`,
          actionUrl: 'https://console.firebase.google.com/project/mesenger-b000f/authentication/settings',
          actionLabel: 'Add Domain in Firebase Console',
        });
      } else if (code === 'auth/popup-blocked') {
        setError({
          title: 'Popup Blocked by Browser',
          message: 'Your browser blocked the Google login popup. Please allow popups or use redirect sign-in.',
        });
      } else if (code === 'auth/popup-closed-by-user') {
        setError({
          title: 'Sign-In Closed',
          message: 'The sign-in popup was closed before completing authentication. Please click Continue with Google to try again.',
        });
      } else if (code === 'auth/network-request-failed') {
        setError({
          title: 'Network Connection Issue',
          message: 'Unable to reach Firebase servers. Please verify your internet connection and try again.',
        });
      } else {
        setError({
          title: 'Sign-In Error',
          message: err?.message || 'An unexpected error occurred during Google Sign-in. Please try again.',
        });
      }
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
      <main className="max-w-4xl w-full mx-auto my-auto py-12 flex flex-col lg:flex-row items-center gap-12">
        {/* Left Value Proposition */}
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>WebRTC Voice/Video & Firebase Realtime Chat</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Connect in real-time with Anyone, Anywhere.
          </h1>

          <p className="text-base text-gray-600 dark:text-gray-400 max-w-lg leading-relaxed">
            Experience ultra-fast 1-on-1 private messaging, peer-to-peer WebRTC voice & video calls, unique @handles, and instant online presence.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-2 text-left">
            <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-800 backdrop-blur-sm">
              <Video className="w-5 h-5 text-blue-500 mb-1.5" />
              <h4 className="text-xs font-bold">WebRTC P2P Calls</h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Low-latency video and crystal clear audio.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-800 backdrop-blur-sm">
              <Radio className="w-5 h-5 text-emerald-500 mb-1.5" />
              <h4 className="text-xs font-bold">Realtime Presence</h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Live typing bubbles & online/offline sync.
              </p>
            </div>
          </div>
        </div>

        {/* Right Sign-in Card */}
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200/80 dark:border-gray-800 p-8 text-center backdrop-blur-xl">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Get Started
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            Sign in securely with your Google account to claim your username and start chatting.
          </p>

          {/* Granular Error Display with Firebase Console deep link */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 text-left space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div>
                  <h5 className="font-bold text-xs text-rose-900 dark:text-rose-200">{error.title}</h5>
                  <p className="mt-1 leading-relaxed">{error.message}</p>
                </div>
              </div>

              {error.actionUrl && (
                <div className="pt-1 pl-6">
                  <a
                    href={error.actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400 underline hover:no-underline"
                  >
                    <span>{error.actionLabel}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Google Sign-in Button */}
          <button
            onClick={() => handleGoogleSignIn(false)}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/80 text-gray-800 dark:text-white font-semibold rounded-2xl border border-gray-300 dark:border-gray-700 shadow-md flex items-center justify-center gap-3 transition duration-200 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
            <span>{loading ? 'Signing In...' : 'Continue with Google'}</span>
          </button>

          {/* Fallback Redirect Button for restrictive popups / mobile webviews */}
          <div className="mt-3">
            <button
              onClick={() => handleGoogleSignIn(true)}
              disabled={loading}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium inline-flex items-center gap-1 transition cursor-pointer"
            >
              <span>Having popup trouble? Use Redirect Sign-In</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400">
            Connected to project <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">mesenger-b000f</span>.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto py-4 text-center text-xs text-gray-400">
        MyMessenger • Real-time Firebase & WebRTC Application
      </footer>
    </div>
  );
};
