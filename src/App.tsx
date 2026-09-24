import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CallProvider } from './context/CallContext';
import { Sidebar } from './components/chat/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { UserDetailsPanel } from './components/chat/UserDetailsPanel';
import { LoginScreen } from './components/auth/LoginScreen';
import { UsernameModal } from './components/modals/UsernameModal';
import { CallModal } from './components/modals/CallModal';
import { SetupGuideModal } from './components/modals/SetupGuideModal';
import { ProfileModal } from './components/modals/ProfileModal';
import { ImageViewerModal } from './components/modals/ImageViewerModal';
import { Conversation, ChatMessage, UserProfile } from './types';
import { subscribeToConversations } from './services/chatService';
import { MessageSquare, Loader2, Sparkles } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './config/firebase';

const MessengerDashboard: React.FC = () => {
  const { currentUser, userProfile, loading } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [activePartnerProfile, setActivePartnerProfile] = useState<UserProfile | null>(null);
  const [currentChatMessages, setCurrentChatMessages] = useState<ChatMessage[]>([]);

  // Modals state
  const [isSetupGuideOpen, setIsSetupGuideOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Subscribe to user conversations
  useEffect(() => {
    if (!userProfile?.uid) return;

    const unsubscribe = subscribeToConversations(userProfile.uid, (convs) => {
      setConversations(convs);
    });

    return () => unsubscribe();
  }, [userProfile?.uid]);

  // Active conversation object
  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  // Fetch partner profile when active conversation changes
  useEffect(() => {
    if (!activeConversation || !userProfile) {
      setActivePartnerProfile(null);
      return;
    }

    const partnerUid = activeConversation.participants.find((id) => id !== userProfile.uid);
    if (!partnerUid) return;

    getDoc(doc(db, 'users', partnerUid)).then((snap) => {
      if (snap.exists()) {
        setActivePartnerProfile(snap.data() as UserProfile);
      } else {
        const fallback = activeConversation.participantDetails?.[partnerUid];
        if (fallback) {
          setActivePartnerProfile({
            uid: partnerUid,
            displayName: fallback.displayName,
            photoURL: fallback.photoURL,
            username: fallback.username,
            email: '',
          });
        }
      }
    });
  }, [activeConversation, userProfile]);

  // Loading state
  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-gray-950 text-gray-800 dark:text-white">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/30 mb-4 animate-bounce">
          <MessageSquare className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Starting MyMessenger...</span>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!currentUser) {
    return (
      <>
        <LoginScreen onOpenSetupGuide={() => setIsSetupGuideOpen(true)} />
        <SetupGuideModal
          isOpen={isSetupGuideOpen}
          onClose={() => setIsSetupGuideOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* 1. Left Sidebar (Hidden on mobile if a conversation is selected) */}
      <div className={`h-full ${activeConversationId ? 'hidden md:flex' : 'flex w-full md:w-auto'}`}>
        <Sidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={(id) => setActiveConversationId(id)}
          onOpenSetupGuide={() => setIsSetupGuideOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
      </div>

      {/* 2. Middle Chat Area */}
      <div className={`h-full flex-1 flex flex-col ${!activeConversationId ? 'hidden md:flex' : 'flex'}`}>
        {activeConversation ? (
          <ChatArea
            conversation={activeConversation}
            onBackToConversations={() => setActiveConversationId(null)}
            onToggleDetails={() => setShowDetailsPanel((prev) => !prev)}
            onOpenImage={(url) => setPreviewImageUrl(url)}
            onMessagesLoaded={(msgs) => setCurrentChatMessages(msgs)}
          />
        ) : (
          /* Empty Chat Splash */
          <div className="h-full flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-gray-900 select-none">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600/10 to-indigo-600/10 dark:from-blue-600/20 dark:to-indigo-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to MyMessenger
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6 leading-relaxed">
              Select a conversation from the sidebar or search for users by their unique @username to start chatting or place voice and video calls.
            </p>
            <button
              onClick={() => setIsSetupGuideOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              View Firebase & WebRTC Setup Guide
            </button>
          </div>
        )}
      </div>

      {/* 3. Right Details Panel (Desktop side or slide-over) */}
      {showDetailsPanel && activePartnerProfile && (
        <UserDetailsPanel
          user={activePartnerProfile}
          messages={currentChatMessages}
          onClose={() => setShowDetailsPanel(false)}
          onOpenImage={(url) => setPreviewImageUrl(url)}
        />
      )}

      {/* Global Modals */}
      <UsernameModal />
      <CallModal />
      <SetupGuideModal
        isOpen={isSetupGuideOpen}
        onClose={() => setIsSetupGuideOpen(false)}
      />
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
      <ImageViewerModal
        imageUrl={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CallProvider>
        <MessengerDashboard />
      </CallProvider>
    </AuthProvider>
  );
}
