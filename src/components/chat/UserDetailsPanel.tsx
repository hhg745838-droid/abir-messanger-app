import React from 'react';
import { UserProfile, ChatMessage } from '../../types';
import {
  X,
  Phone,
  Video,
  AtSign,
  Mail,
  Calendar,
  Image as ImageIcon,
  Check,
  Copy,
  Info,
} from 'lucide-react';
import { getInitials, getAvatarColor, formatLastSeen } from '../../utils/helpers';
import { useCall } from '../../context/CallContext';

interface Props {
  user: UserProfile | null;
  messages: ChatMessage[];
  onClose: () => void;
  onOpenImage: (url: string) => void;
}

export const UserDetailsPanel: React.FC<Props> = ({
  user,
  messages,
  onClose,
  onOpenImage,
}) => {
  const { startCall } = useCall();
  const [copied, setCopied] = React.useState(false);

  if (!user) return null;

  const sharedImages = messages.filter((m) => m.type === 'image' && m.mediaUrl);

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(`@${user.username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-80 h-full border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col shrink-0 select-none overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500" />
          Contact Details
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Profile Overview */}
      <div className="p-6 text-center border-b border-gray-100 dark:border-gray-800">
        <div className="relative w-24 h-24 mx-auto mb-3">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-full h-full rounded-full object-cover ring-4 ring-blue-500/20 shadow-md"
            />
          ) : (
            <div
              className={`w-full h-full rounded-full flex items-center justify-center text-3xl font-bold text-white bg-gradient-to-br ${getAvatarColor(
                user.displayName
              )}`}
            >
              {getInitials(user.displayName)}
            </div>
          )}
          {user.online && (
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900" />
          )}
        </div>

        <h4 className="text-base font-bold text-gray-900 dark:text-white mb-0.5">
          {user.displayName}
        </h4>
        <button
          onClick={handleCopyUsername}
          className="text-xs text-blue-600 dark:text-blue-400 font-mono hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <AtSign className="w-3 h-3" />
          {user.username}
          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-60" />}
        </button>

        <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {formatLastSeen(user.lastSeen, user.online)}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => startCall(user, 'audio')}
            className="flex-1 py-2 px-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Phone className="w-4 h-4" />
            Audio Call
          </button>
          <button
            onClick={() => startCall(user, 'video')}
            className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Video className="w-4 h-4" />
            Video Call
          </button>
        </div>
      </div>

      {/* Bio & Information */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3 text-xs">
        <div>
          <span className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">
            Bio
          </span>
          <p className="text-gray-700 dark:text-gray-300 mt-1 italic">
            {user.bio || 'No bio provided.'}
          </p>
        </div>

        <div className="pt-2 flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Mail className="w-3.5 h-3.5 text-gray-400" />
          <span className="truncate">{user.email || 'Email private'}</span>
        </div>
      </div>

      {/* Shared Media Gallery */}
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
            Shared Photos ({sharedImages.length})
          </span>
        </div>

        {sharedImages.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No shared media yet</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {sharedImages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => msg.mediaUrl && onOpenImage(msg.mediaUrl)}
                className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 hover:opacity-80 transition cursor-pointer group"
              >
                <img
                  src={msg.mediaUrl}
                  alt="Shared media"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
