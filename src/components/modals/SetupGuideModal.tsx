import React, { useState } from 'react';
import {
  X,
  Shield,
  Database,
  Radio,
  FileCode,
  CheckCircle,
  Copy,
  Terminal,
  ExternalLink,
  Layers,
  PhoneCall,
  Activity,
} from 'lucide-react';
import { testConnection } from '../../config/firebase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupGuideModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'webrtc' | 'deploy'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus('Checking connection to Firebase project...');
    const res = await testConnection();
    setTestStatus(res.message);
    setIsTesting(false);
  };

  const firestoreRulesCode = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }

    function isSignedIn() { return request.auth != null; }
    function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }

    match /users/{userId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.auth.uid == userId;
      allow update: if isSignedIn() && request.auth.uid == userId;
    }

    match /usernames/{username} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.resource.data.uid == request.auth.uid;
      allow update, delete: if isSignedIn() && resource.data.uid == request.auth.uid;
    }

    match /conversations/{conversationId} {
      allow read, update: if isSignedIn() && request.auth.uid in resource.data.participants;
      allow create: if isSignedIn() && request.auth.uid in request.resource.data.participants;

      match /messages/{messageId} {
        allow read: if isSignedIn() && (request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants);
        allow create: if isSignedIn() && request.resource.data.senderId == request.auth.uid;
        allow update: if isSignedIn() && (request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants);
      }
    }

    match /calls/{callId} {
      allow read, update, delete: if isSignedIn() && (resource.data.callerId == request.auth.uid || resource.data.receiverId == request.auth.uid);
      allow create: if isSignedIn() && request.resource.data.callerId == request.auth.uid;

      match /{subcol}/{candId} {
        allow read, write: if isSignedIn();
      }
    }
  }
}`;

  const storageRulesCode = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /conversations/{conversationId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.resource.size < 25 * 1024 * 1024;
    }
    match /avatars/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId && request.resource.size < 5 * 1024 * 1024;
    }
  }
}`;

  const rtdbRulesCode = `{
  "rules": {
    "status": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Firebase & WebRTC Deployment Guide
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Connected Project: <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">mesenger-b000f</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Test Status Banner */}
        {testStatus && (
          <div className="px-6 py-2.5 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
            <span>Result: {testStatus}</span>
            <button onClick={() => setTestStatus(null)} className="text-blue-500 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 px-6 gap-6 text-sm font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            Overview & Schema
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'rules'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <Shield className="w-4 h-4" />
            Security Rules
          </button>
          <button
            onClick={() => setActiveTab('webrtc')}
            className={`py-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'webrtc'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            STUN / TURN Calling
          </button>
          <button
            onClick={() => setActiveTab('deploy')}
            className={`py-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'deploy'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <Terminal className="w-4 h-4" />
            Deploy Instructions
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6 text-sm text-gray-600 dark:text-gray-300">
              <div className="bg-blue-50/60 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200 dark:border-blue-900/40">
                <h4 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Firebase Services Activated
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  The application is fully wired with your project credentials (<code className="text-blue-600">mesenger-b000f</code>). Realtime listeners, authentication, presence, file storage, and WebRTC signaling are active.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">1. Firestore Collections</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">/users/{'{uid}'}</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Stores user profile, unique username, display name, photo, online status, and lastSeen.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">/usernames/{'{username}'}</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Atomic registry mapping lowercase username to UID, enforcing 100% global uniqueness.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">/conversations/{'{convId}'}</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Deterministic ID: <code className="text-xs font-semibold">sort(uid1, uid2).join('_')</code> prevents duplicate conversations. Contains typing states & unread counts.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">/conversations/{'{id}'}/messages</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Subcollection of ordered messages supporting text, images, attachments, and sent/read statuses.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">/calls/{'{callId}'}</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      WebRTC signaling doc with offer/answer SDP and subcollections for ICE candidates.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">RTDB: /status/{'{uid}'}</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Realtime Database heartbeat using <code className="text-xs">.info/connected</code> and <code className="text-xs">onDisconnect()</code>.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">2. Firebase Authentication Provider</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  In Firebase Console &rarr; <strong>Authentication</strong> &rarr; <strong>Sign-in method</strong>, enable:
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg w-fit">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Google Sign-In (Enabled)
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-6">
              {/* Firestore Rules */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-blue-500" />
                    Firestore Security Rules (firestore.rules)
                  </h4>
                  <button
                    onClick={() => copyToClipboard(firestoreRulesCode, 'firestore')}
                    className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 font-semibold hover:underline cursor-pointer"
                  >
                    {copiedKey === 'firestore' ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === 'firestore' ? 'Copied!' : 'Copy Rules'}
                  </button>
                </div>
                <pre className="p-3.5 bg-gray-950 text-gray-200 rounded-xl text-xs font-mono overflow-x-auto max-h-56 leading-relaxed border border-gray-800">
                  {firestoreRulesCode}
                </pre>
              </div>

              {/* Storage Rules */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-emerald-500" />
                    Storage Rules (storage.rules)
                  </h4>
                  <button
                    onClick={() => copyToClipboard(storageRulesCode, 'storage')}
                    className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 font-semibold hover:underline cursor-pointer"
                  >
                    {copiedKey === 'storage' ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === 'storage' ? 'Copied!' : 'Copy Rules'}
                  </button>
                </div>
                <pre className="p-3.5 bg-gray-950 text-gray-200 rounded-xl text-xs font-mono overflow-x-auto max-h-36 leading-relaxed border border-gray-800">
                  {storageRulesCode}
                </pre>
              </div>

              {/* RTDB Rules */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-purple-500" />
                    Realtime Database Rules (database.rules.json)
                  </h4>
                  <button
                    onClick={() => copyToClipboard(rtdbRulesCode, 'rtdb')}
                    className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 font-semibold hover:underline cursor-pointer"
                  >
                    {copiedKey === 'rtdb' ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === 'rtdb' ? 'Copied!' : 'Copy Rules'}
                  </button>
                </div>
                <pre className="p-3.5 bg-gray-950 text-gray-200 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-gray-800">
                  {rtdbRulesCode}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'webrtc' && (
            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
              <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40">
                <h4 className="font-bold text-amber-900 dark:text-amber-300 mb-1">
                  STUN vs TURN: Why & When TURN Is Required
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                  WebRTC allows direct peer-to-peer audio and video transmission. Google STUN servers (<code className="text-xs font-mono">stun.l.google.com:19302</code>) resolve public IP addresses for over 85% of normal home and mobile networks.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-gray-900 dark:text-white mb-1.5">Symmetric NAT & Corporate Firewalls:</h5>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  When two users are behind symmetric NATs (common in universities, corporate VPNs, or strict cellular carriers), direct P2P connections cannot punch through. A <strong>TURN (Traversal Using Relays around NAT)</strong> server relays encrypted media streams when direct P2P is blocked.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/60 space-y-2">
                <h5 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200">
                  Configuring Production TURN in MyMessenger
                </h5>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  You can plug in your own Twilio, Xirsys, or Coturn credentials securely in <code className="text-blue-600 dark:text-blue-400">src/context/CallContext.tsx</code>:
                </p>
                <pre className="p-3 bg-gray-950 text-gray-200 rounded-lg text-xs font-mono overflow-x-auto">
{`const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // Add your production TURN relay here:
    // {
    //   urls: 'turn:turn.example.com:3478',
    //   username: 'user',
    //   credential: 'password'
    // }
  ]
};`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'deploy' && (
            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
              <h4 className="font-bold text-gray-900 dark:text-white">
                Deploying to Firebase Hosting & Cloud Run
              </h4>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                  <p className="font-semibold text-xs text-gray-700 dark:text-gray-200 mb-2">
                    Step 1: Install Firebase CLI & Login
                  </p>
                  <pre className="p-3 bg-gray-950 text-emerald-400 rounded-lg text-xs font-mono">
                    npm install -g firebase-tools{"\n"}
                    firebase login
                  </pre>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                  <p className="font-semibold text-xs text-gray-700 dark:text-gray-200 mb-2">
                    Step 2: Deploy Security Rules & Indexes
                  </p>
                  <pre className="p-3 bg-gray-950 text-emerald-400 rounded-lg text-xs font-mono">
                    firebase deploy --only firestore:rules,storage,database
                  </pre>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                  <p className="font-semibold text-xs text-gray-700 dark:text-gray-200 mb-2">
                    Step 3: Build & Deploy Frontend
                  </p>
                  <pre className="p-3 bg-gray-950 text-emerald-400 rounded-lg text-xs font-mono">
                    npm run build{"\n"}
                    firebase deploy --only hosting
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between text-xs text-gray-500">
          <span>MyMessenger • Production Ready</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold hover:opacity-90 transition cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
