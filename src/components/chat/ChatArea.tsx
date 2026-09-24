import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { Conversation, ChatMessage, UserProfile } from '../../types';
import {
  Phone,
  Video,
  Info,
  ArrowLeft,
  Send,
  Smile,
  Paperclip,
  Check,
  CheckCheck,
  Download,
  FileText,
  Image as ImageIcon,
  X,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import {
  subscribeToMessages,
  loadOlderMessages,
  sendMessage,
  markConversationAsRead,
  updateTypingStatus,
} from '../../services/chatService';
import {
  formatTime,
  formatMessageDate,
  formatLastSeen,
  formatFileSize,
  getInitials,
  getAvatarColor,
} from '../../utils/helpers';
import { EmojiPicker } from './EmojiPicker';
import { QueryDocumentSnapshot, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface Props {
  conversation: Conversation;
  onBackToConversations: () => void;
  onToggleDetails: () => void;
  onOpenImage: (url: string) => void;
  onMessagesLoaded?: (messages: ChatMessage[]) => void;
}

const PAGE_SIZE = 25;

export const ChatArea: React.FC<Props> = ({
  conversation,
  onBackToConversations,
  onToggleDetails,
  onOpenImage,
  onMessagesLoaded,
}) => {
  const { userProfile } = useAuth();
  const { startCall } = useCall();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [oldestDoc, setOldestDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);

  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Live partner profile state for fresh presence
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Identify partner UID
  const partnerUid = conversation.participants.find((id) => id !== userProfile?.uid);
  const partnerDetail = partnerUid ? conversation.participantDetails?.[partnerUid] : null;

  // Listen to partner's user document for live presence & lastSeen
  useEffect(() => {
    if (!partnerUid) return;
    const unsub = onSnapshot(doc(db, 'users', partnerUid), (snap) => {
      if (snap.exists()) {
        setPartnerProfile(snap.data() as UserProfile);
      }
    });
    return () => unsub();
  }, [partnerUid]);

  // Subscribe to real-time messages for this conversation
  useEffect(() => {
    if (!conversation.id || !userProfile) return;

    setHasMoreOlder(true);
    const unsubscribe = subscribeToMessages(
      conversation.id,
      PAGE_SIZE,
      (fetchedMessages, oldest) => {
        setMessages(fetchedMessages);
        setOldestDoc(oldest);
        if (onMessagesLoaded) onMessagesLoaded(fetchedMessages);
        
        // Auto scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    );

    // Mark messages as read
    markConversationAsRead(conversation.id, userProfile.uid);

    return () => unsubscribe();
  }, [conversation.id, userProfile]);

  // Load older messages (pagination)
  const handleLoadOlder = async () => {
    if (!oldestDoc || loadingOlder || !hasMoreOlder) return;
    setLoadingOlder(true);

    try {
      const scrollHeightBefore = scrollContainerRef.current?.scrollHeight || 0;
      const { messages: olderMsgs, nextOldestDoc } = await loadOlderMessages(
        conversation.id,
        oldestDoc,
        PAGE_SIZE
      );

      if (olderMsgs.length === 0) {
        setHasMoreOlder(false);
      } else {
        setMessages((prev) => [...olderMsgs, ...prev]);
        setOldestDoc(nextOldestDoc);
        if (!nextOldestDoc || olderMsgs.length < PAGE_SIZE) {
          setHasMoreOlder(false);
        }

        // Maintain scroll position after prepending older messages
        setTimeout(() => {
          if (scrollContainerRef.current) {
            const scrollDiff = scrollContainerRef.current.scrollHeight - scrollHeightBefore;
            scrollContainerRef.current.scrollTop += scrollDiff;
          }
        }, 50);
      }
    } catch (e) {
      console.warn('handleLoadOlder error:', e);
    } finally {
      setLoadingOlder(false);
    }
  };

  // Scroll detection
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 200);

    // Auto load older on reaching top
    if (scrollTop < 30 && hasMoreOlder && !loadingOlder) {
      handleLoadOlder();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // File selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        setFilePreviewUrl(URL.createObjectURL(file));
      } else {
        setFilePreviewUrl(null);
      }
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Send message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !selectedFile) || !userProfile || !partnerUid || isSending) return;

    setIsSending(true);
    const textToSend = inputText;
    const fileToSend = selectedFile;

    // Reset inputs immediately for snappy feel
    setInputText('');
    removeSelectedFile();
    setShowEmojiPicker(false);
    updateTypingStatus(conversation.id, userProfile.uid, false);

    try {
      await sendMessage(conversation.id, userProfile, partnerUid, {
        text: textToSend,
        file: fileToSend,
      });
      scrollToBottom();
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Typing event
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (userProfile) {
      updateTypingStatus(conversation.id, userProfile.uid, e.target.value.length > 0);
    }
  };

  const isPartnerTyping = partnerUid && conversation.typing?.[partnerUid];

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-gray-950 relative overflow-hidden">
      {/* 1. CHAT TOP HEADER */}
      <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          <button
            onClick={onBackToConversations}
            className="md:hidden p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Partner Avatar with Presence dot */}
          <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0">
            {partnerDetail?.photoURL ? (
              <img
                src={partnerDetail.photoURL}
                alt={partnerDetail.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${getAvatarColor(
                  partnerDetail?.displayName || 'user'
                )}`}
              >
                {getInitials(partnerDetail?.displayName)}
              </div>
            )}
            {partnerProfile?.online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900" />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
              {partnerDetail?.displayName || 'Chat Participant'}
            </h2>
            <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 truncate">
              {formatLastSeen(partnerProfile?.lastSeen, partnerProfile?.online)}
            </p>
          </div>
        </div>

        {/* Audio / Video / Details buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {partnerProfile && (
            <>
              <button
                onClick={() => startCall(partnerProfile, 'audio')}
                title="Start Audio Call"
                className="p-2.5 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition cursor-pointer"
              >
                <Phone className="w-5 h-5" />
              </button>

              <button
                onClick={() => startCall(partnerProfile, 'video')}
                title="Start Video Call"
                className="p-2.5 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition cursor-pointer"
              >
                <Video className="w-5 h-5" />
              </button>
            </>
          )}

          <button
            onClick={onToggleDetails}
            title="Conversation Details"
            className="p-2.5 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. MESSAGES SCROLL AREA */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {/* Load older messages trigger */}
        {hasMoreOlder && (
          <div className="text-center py-2">
            <button
              onClick={handleLoadOlder}
              disabled={loadingOlder}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer disabled:opacity-50"
            >
              {loadingOlder ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading older messages...
                </span>
              ) : (
                'Load older messages'
              )}
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
              <Smile className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-1">
              Say hello to {partnerDetail?.displayName}!
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Messages are encrypted, real-time and backed by Firebase Firestore.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === userProfile?.uid;
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const showDate =
              !prevMsg ||
              formatMessageDate(prevMsg.createdAt) !== formatMessageDate(msg.createdAt);

            return (
              <React.Fragment key={msg.id}>
                {/* Date separator pill */}
                {showDate && (
                  <div className="flex items-center justify-center my-3">
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-gray-200/80 dark:bg-gray-800 text-gray-600 dark:text-gray-400 shadow-xs">
                      {formatMessageDate(msg.createdAt)}
                    </span>
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {!isMe && (
                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mb-1">
                      {msg.senderPhoto ? (
                        <img src={msg.senderPhoto} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div
                          className={`w-full h-full flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br ${getAvatarColor(
                            msg.senderName || 'user'
                          )}`}
                        >
                          {getInitials(msg.senderName)}
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`max-w-[78%] md:max-w-[65%] rounded-2xl p-3 shadow-xs transition ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-xs border border-gray-200/60 dark:border-gray-700/60'
                    }`}
                  >
                    {/* Image Message */}
                    {msg.type === 'image' && msg.mediaUrl && (
                      <div className="mb-2 rounded-xl overflow-hidden cursor-pointer group">
                        <img
                          src={msg.mediaUrl}
                          alt="Attachment"
                          onClick={() => msg.mediaUrl && onOpenImage(msg.mediaUrl)}
                          className="max-h-72 w-full object-cover rounded-xl transition duration-200 group-hover:scale-102"
                        />
                      </div>
                    )}

                    {/* File Attachment Message */}
                    {msg.type === 'file' && (
                      <div className={`p-2.5 rounded-xl mb-2 flex items-center gap-3 ${isMe ? 'bg-blue-700/60' : 'bg-gray-100 dark:bg-gray-700/60'}`}>
                        <FileText className="w-7 h-7 shrink-0 text-blue-400" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">{msg.fileName || 'Attachment'}</p>
                          <p className="text-[10px] opacity-75">{formatFileSize(msg.fileSize)}</p>
                        </div>
                        {msg.mediaUrl && (
                          <a
                            href={msg.mediaUrl}
                            download={msg.fileName || 'file'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition text-white"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Text Message */}
                    {msg.text && (
                      <p className="text-xs md:text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {msg.text}
                      </p>
                    )}

                    {/* Timestamp & Status Indicator */}
                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                        isMe ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      <span>{formatTime(msg.createdAt)}</span>
                      {isMe && (
                        <span>
                          {msg.status === 'read' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-sky-200" />
                          ) : (
                            <Check className="w-3.5 h-3.5 opacity-80" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}

        {/* Real-time typing bubble */}
        {isPartnerTyping && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
              {partnerDetail?.photoURL ? (
                <img src={partnerDetail.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-400 flex items-center justify-center text-[10px] text-white">
                  ...
                </div>
              )}
            </div>
            <div className="px-4 py-2.5 rounded-2xl rounded-bl-xs bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-dot-1" />
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-dot-2" />
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-dot-3" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll to Bottom button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-6 z-30 p-2.5 rounded-full bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-xl border border-gray-200 dark:border-gray-700 hover:scale-105 transition cursor-pointer"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* Selected File Preview Strip */}
      {selectedFile && (
        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800/90 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {filePreviewUrl ? (
              <img src={filePreviewUrl} alt="Preview" className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <FileText className="w-7 h-7 text-blue-500" />
            )}
            <div className="truncate">
              <p className="font-semibold text-gray-900 dark:text-white truncate">{selectedFile.name}</p>
              <p className="text-[10px] text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>

          <button
            onClick={removeSelectedFile}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. CHAT INPUT BAR */}
      <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shrink-0 relative">
        {/* Emoji picker dropdown */}
        {showEmojiPicker && (
          <EmojiPicker
            onSelect={(emoji) => setInputText((prev) => prev + emoji)}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}

        <form onSubmit={handleSend} className="flex items-center gap-2">
          {/* File attachment button */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.zip,.txt"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            title="Attach image or file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Emoji toggle button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2.5 rounded-xl text-gray-500 hover:text-amber-500 dark:text-gray-400 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            title="Add emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-gray-800 border border-transparent dark:border-gray-700/60 rounded-2xl text-xs md:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedFile) || isSending}
            className="p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white shadow-md shadow-blue-500/25 transition cursor-pointer disabled:cursor-not-allowed"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
