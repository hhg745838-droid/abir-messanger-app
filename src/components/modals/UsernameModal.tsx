import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AtSign, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const UsernameModal: React.FC = () => {
  const { needsUsername, registerUsername, currentUser } = useAuth();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!needsUsername || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username.');
      return;
    }
    setError(null);
    setLoading(true);

    const res = await registerUsername(username, bio);
    if (!res?.success) {
      setError(res?.error || 'Failed to claim username. Please try again.');
    }
    setLoading(false);
  };

  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8">
        <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/30">
          <Sparkles className="w-7 h-7" />
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
          Choose Your Unique Username
        </h2>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
          Welcome to <span className="font-semibold text-blue-600 dark:text-blue-400">MyMessenger</span>! Choose a unique handle so your friends and colleagues can find and call you.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-start gap-2.5 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Username Handle
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <AtSign className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                  setError(null);
                }}
                maxLength={30}
                placeholder="e.g. alex_rivera"
                className="w-full pl-9 pr-10 py-3 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
                autoFocus
              />
              {cleanUsername.length >= 3 && (
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              3-30 characters (lowercase letters, numbers, underscores)
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Bio (Optional)
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={150}
              placeholder="Tell others what you're working on..."
              rows={2}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading || cleanUsername.length < 3}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition duration-200 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Checking & Claiming Handle...</span>
              </>
            ) : (
              <span>Confirm & Start Chatting</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
