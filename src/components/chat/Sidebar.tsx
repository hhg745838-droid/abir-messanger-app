import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Conversation, UserProfile } from '../../types';
import {
  Search,
  MessageSquare,
  Sun,
  Moon,
  LogOut,
  HelpCircle,
  X,
  User,
  CheckCheck,
  Circle,
  Plus,
  Settings,
} from 'lucide-react';
import { searchUsers, getOrCreateConversation } from '../../services/chatService';
import { formatTime, getInitials, getAvatarColor } from '../../utils/helpers';

interface Props {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (convId: string) => void;
  onOpenSetupGuide: () => void;
  onOpenProfile: () => void;
}

export const Sidebar: React.FC<Props> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onOpenSetupGuide,
  onOpenProfile,
}) => {
  const { userProfile, theme, toggleTheme, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim() || !userProfile) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = window.setTimeout(async () => {
      const results = await searchUsers(searchQuery, userProfile.uid);
      setSearchResults(results);
      setIsSearching(false);
    }, 250);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, userProfile]);

  const handleStartChatWithUser = async (targetUser: UserProfile) => {
    if (!userProfile) return;
    setSearchQuery('');
    setSearchResults([]);
    const convId = await getOrCreateConversation(userProfile, targetUser);
    if (convId) {
      onSelectConversation(convId);
    }
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shrink-0 select-none">
      {/* Top Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-gray-900 dark:text-white leading-tight">
              MyMessenger
            </h1>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              Real-time Chat & Calling
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenSetupGuide}
            title="Firebase & Architecture Setup Guide"
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenProfile}
            title="Profile Settings"
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={logout}
            title="Sign out"
            className="p-2 rounded-xl text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* User Search Bar */}
      <div className="p-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by @username or name..."
            className="w-full pl-9 pr-9 py-2 bg-gray-100 dark:bg-gray-800/80 border border-transparent dark:border-gray-700/60 rounded-xl text-xs md:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results Dropdown / Panel */}
      {searchQuery.trim().length > 0 && (
        <div className="p-2 mx-3 mb-2 bg-gray-50 dark:bg-gray-800/90 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-lg max-h-64 overflow-y-auto">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1">
            {isSearching ? 'Searching Users...' : `Results (${searchResults.length})`}
          </div>

          {searchResults.length === 0 && !isSearching && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
              No user found matching "@{searchQuery}"
            </p>
          )}

          {searchResults.map((user) => (
            <button
              key={user.uid}
              onClick={() => handleStartChatWithUser(user)}
              className="w-full p-2 rounded-xl flex items-center gap-3 hover:bg-white dark:hover:bg-gray-700/70 text-left transition cursor-pointer group"
            >
              <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className={`w-full h-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${getAvatarColor(
                      user.displayName
                    )}`}
                  >
                    {getInitials(user.displayName)}
                  </div>
                )}
                {user.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                  {user.displayName}
                </p>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-mono truncate">
                  @{user.username}
                </p>
              </div>

              <div className="p-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition">
                <Plus className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
        <div className="px-3 py-1 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          <span>Conversations</span>
          <span>{conversations.length}</span>
        </div>

        {conversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              No conversations yet
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
              Use the search bar above to find friends by their username and start chatting!
            </p>
          </div>
        ) : (
          conversations.map((conv) => {
            const partnerUid = conv.participants.find((id) => id !== userProfile?.uid);
            const partner = partnerUid ? conv.participantDetails?.[partnerUid] : null;
            const isSelected = conv.id === activeConversationId;
            const unread = userProfile?.uid && conv.unreadCount?.[userProfile.uid] ? conv.unreadCount[userProfile.uid] : 0;
            const isTyping = partnerUid && conv.typing?.[partnerUid];

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full p-2.5 rounded-2xl flex items-center gap-3 transition text-left cursor-pointer group ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/50 shadow-sm'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800/60 border border-transparent'
                }`}
              >
                {/* Avatar with Presence */}
                <div className="relative w-11 h-11 rounded-full overflow-hidden shrink-0">
                  {partner?.photoURL ? (
                    <img
                      src={partner.photoURL}
                      alt={partner.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-full h-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${getAvatarColor(
                        partner?.displayName || 'user'
                      )}`}
                    >
                      {getInitials(partner?.displayName)}
                    </div>
                  )}
                </div>

                {/* Conversation Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className={`text-xs font-semibold truncate ${unread > 0 ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                      {partner?.displayName || 'Chat Participant'}
                    </h4>
                    {conv.updatedAt && (
                      <span className="text-[10px] text-gray-400 shrink-0 ml-1">
                        {formatTime(conv.updatedAt)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    {isTyping ? (
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                        typing...
                      </p>
                    ) : (
                      <p
                        className={`text-xs truncate ${
                          unread > 0
                            ? 'font-bold text-gray-900 dark:text-white'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {conv.lastMessage?.text || 'Start chatting...'}
                      </p>
                    )}

                    {unread > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-bold shrink-0">
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Current User Bottom Bar */}
      {userProfile && (
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0">
              {userProfile.photoURL ? (
                <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
              ) : (
                <div
                  className={`w-full h-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${getAvatarColor(
                    userProfile.displayName
                  )}`}
                >
                  {getInitials(userProfile.displayName)}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                {userProfile.displayName}
              </p>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-mono truncate">
                @{userProfile.username}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
