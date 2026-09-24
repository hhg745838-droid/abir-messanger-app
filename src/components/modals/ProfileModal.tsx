import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, User, Check, Loader2, AtSign, Mail } from 'lucide-react';
import { getInitials } from '../../utils/helpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { userProfile, updateProfileDetails } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen || !userProfile) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfileDetails({
        displayName: displayName.trim() || userProfile.displayName,
        bio: bio.trim(),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Your Profile</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-20 h-20 rounded-full overflow-hidden ring-4 ring-blue-500/20 shadow-md bg-gray-100 dark:bg-gray-800 mb-2">
            {userProfile.photoURL ? (
              <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-500">
                {getInitials(userProfile.displayName)}
              </div>
            )}
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
            <AtSign className="w-3.5 h-3.5" />
            {userProfile.username}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              maxLength={50}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              Bio / Status
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              rows={3}
              maxLength={150}
              placeholder="Tell others about you..."
            />
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {userProfile.email}
            </span>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : savedSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Saved!
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
