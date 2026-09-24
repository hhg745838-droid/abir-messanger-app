export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string;
  email: string;
  createdAt?: any;
  lastSeen?: any;
  online?: boolean;
  bio?: string;
  status?: string;
}

export interface ConversationParticipant {
  uid: string;
  displayName: string;
  photoURL: string;
  username: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantDetails: Record<string, ConversationParticipant>;
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: any;
    type: 'text' | 'image' | 'file';
  };
  updatedAt: any;
  unreadCount?: Record<string, number>;
  typing?: Record<string, boolean>;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  type: 'text' | 'image' | 'file';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  status: 'sent' | 'delivered' | 'read';
  createdAt: any;
}

export type CallType = 'audio' | 'video';
export type CallStatus = 'calling' | 'accepted' | 'rejected' | 'ended' | 'missed';

export interface CallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto?: string;
  receiverId: string;
  receiverName?: string;
  receiverPhoto?: string;
  callType: CallType;
  status: CallStatus;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  createdAt: any;
  endedAt?: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}
