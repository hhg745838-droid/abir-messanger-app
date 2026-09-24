import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  onSnapshot,
  increment,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { Conversation, ChatMessage, UserProfile, OperationType } from '../types';
import { handleFirestoreError } from '../utils/firestoreErrors';
import { getConversationId } from '../utils/helpers';
import { soundManager } from '../utils/audio';

// Search users by exact or prefix username
export async function searchUsers(rawQuery: string, currentUid: string): Promise<UserProfile[]> {
  const qStr = rawQuery.trim().toLowerCase().replace(/^@/, '');
  if (!qStr) return [];

  const resultsMap = new Map<string, UserProfile>();
  const usersRef = collection(db, 'users');

  try {
    // 1. Prefix query on username
    const prefixQuery = query(
      usersRef,
      where('username', '>=', qStr),
      where('username', '<=', qStr + '\uf8ff'),
      limit(10)
    );
    const prefixSnap = await getDocs(prefixQuery);
    prefixSnap.forEach((docSnap) => {
      const u = docSnap.data() as UserProfile;
      if (u.uid !== currentUid) {
        resultsMap.set(u.uid, u);
      }
    });

    // 2. If exact match didn't fill it, check displayName search as well
    if (resultsMap.size < 5) {
      const allRecentSnap = await getDocs(query(usersRef, limit(25)));
      allRecentSnap.forEach((docSnap) => {
        const u = docSnap.data() as UserProfile;
        if (
          u.uid !== currentUid &&
          (u.displayName?.toLowerCase().includes(qStr) || u.username?.toLowerCase().includes(qStr))
        ) {
          resultsMap.set(u.uid, u);
        }
      });
    }

    return Array.from(resultsMap.values());
  } catch (error) {
    console.warn('Search query fallback or error:', error);
    return [];
  }
}

// Get or Create 1-on-1 conversation safely without duplicates
export async function getOrCreateConversation(
  currentUser: UserProfile,
  targetUser: UserProfile
): Promise<string> {
  const convId = getConversationId(currentUser.uid, targetUser.uid);
  const convRef = doc(db, 'conversations', convId);

  try {
    const snap = await getDoc(convRef);
    if (!snap.exists()) {
      const newConv: Conversation = {
        id: convId,
        participants: [currentUser.uid, targetUser.uid],
        participantDetails: {
          [currentUser.uid]: {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            username: currentUser.username,
          },
          [targetUser.uid]: {
            uid: targetUser.uid,
            displayName: targetUser.displayName,
            photoURL: targetUser.photoURL,
            username: targetUser.username,
          },
        },
        updatedAt: serverTimestamp(),
        unreadCount: {
          [currentUser.uid]: 0,
          [targetUser.uid]: 0,
        },
        typing: {
          [currentUser.uid]: false,
          [targetUser.uid]: false,
        },
      };

      await setDoc(convRef, newConv);
    } else {
      // Ensure current user's latest name/photo is fresh in participantDetails
      await updateDoc(convRef, {
        [`participantDetails.${currentUser.uid}.displayName`]: currentUser.displayName,
        [`participantDetails.${currentUser.uid}.photoURL`]: currentUser.photoURL,
        [`participantDetails.${currentUser.uid}.username`]: currentUser.username,
      }).catch(() => {});
    }

    return convId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `conversations/${convId}`);
  }
}

// Subscribe to real-time conversation list
export function subscribeToConversations(
  currentUid: string,
  callback: (conversations: Conversation[]) => void
) {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', currentUid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const convs: Conversation[] = [];
      snapshot.forEach((doc) => {
        convs.push({ id: doc.id, ...doc.data() } as Conversation);
      });

      // Sort client-side by updatedAt descending so we don't block on Firestore indexing
      convs.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
        return timeB - timeA;
      });

      callback(convs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'conversations');
    }
  );
}

// Subscribe to paginated messages for a conversation
export function subscribeToMessages(
  convId: string,
  pageSize: number,
  callback: (messages: ChatMessage[], oldestDoc: QueryDocumentSnapshot | null) => void
) {
  const messagesRef = collection(db, 'conversations', convId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(pageSize));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });

      const oldestDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
      // Reverse to chronological order (oldest to newest)
      callback(msgs.reverse(), oldestDoc);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `conversations/${convId}/messages`);
    }
  );
}

// Load older messages (pagination backwards)
export async function loadOlderMessages(
  convId: string,
  lastVisibleDoc: QueryDocumentSnapshot,
  pageSize: number
): Promise<{ messages: ChatMessage[]; nextOldestDoc: QueryDocumentSnapshot | null }> {
  try {
    const messagesRef = collection(db, 'conversations', convId, 'messages');
    const q = query(
      messagesRef,
      orderBy('createdAt', 'desc'),
      startAfter(lastVisibleDoc),
      limit(pageSize)
    );

    const snapshot = await getDocs(q);
    const msgs: ChatMessage[] = [];
    snapshot.forEach((doc) => {
      msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
    });

    const nextOldestDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    return {
      messages: msgs.reverse(),
      nextOldestDoc,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `conversations/${convId}/messages`);
  }
}

// Upload file helper: attempts Firebase Storage with fallback to base64 DataURI
async function uploadChatAttachment(
  convId: string,
  file: File
): Promise<string> {
  try {
    const fileExt = file.name.split('.').pop() || 'bin';
    const filePath = `conversations/${convId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const storageReference = ref(storage, filePath);
    
    const snapshot = await uploadBytes(storageReference, file);
    return await getDownloadURL(snapshot.ref);
  } catch (storageError) {
    console.warn('Firebase Storage upload failed, utilizing resilient DataURI fallback:', storageError);
    // Convert to DataURL for immediate seamless delivery
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }
}

// Send message
export async function sendMessage(
  convId: string,
  sender: UserProfile,
  recipientId: string,
  content: {
    text: string;
    file?: File | null;
  }
): Promise<void> {
  const { text, file } = content;
  if (!text.trim() && !file) return;

  const messagesRef = collection(db, 'conversations', convId, 'messages');
  const messageDocRef = doc(messagesRef);

  let type: 'text' | 'image' | 'file' = 'text';
  let mediaUrl: string | undefined = undefined;
  let fileName: string | undefined = undefined;
  let fileSize: number | undefined = undefined;

  if (file) {
    if (file.type.startsWith('image/')) {
      type = 'image';
    } else {
      type = 'file';
    }
    fileName = file.name;
    fileSize = file.size;
    mediaUrl = await uploadChatAttachment(convId, file);
  }

  const messageData: Partial<ChatMessage> = {
    id: messageDocRef.id,
    conversationId: convId,
    senderId: sender.uid,
    senderName: sender.displayName,
    senderPhoto: sender.photoURL,
    text: text.trim(),
    type,
    mediaUrl,
    fileName,
    fileSize,
    status: 'sent',
    createdAt: serverTimestamp(),
  };

  try {
    // 1. Create message
    await setDoc(messageDocRef, messageData);
    soundManager.playMessagePop(false);

    // 2. Update conversation summary & unread count
    const convRef = doc(db, 'conversations', convId);
    await updateDoc(convRef, {
      lastMessage: {
        text: type === 'text' ? text.trim() : (type === 'image' ? '📷 Image' : `📎 ${fileName}`),
        senderId: sender.uid,
        createdAt: serverTimestamp(),
        type,
      },
      updatedAt: serverTimestamp(),
      [`unreadCount.${recipientId}`]: increment(1),
      [`typing.${sender.uid}`]: false,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `conversations/${convId}/messages/${messageDocRef.id}`);
  }
}

// Mark messages as read and clear unread count
export async function markConversationAsRead(
  convId: string,
  currentUid: string
): Promise<void> {
  try {
    const convRef = doc(db, 'conversations', convId);
    await updateDoc(convRef, {
      [`unreadCount.${currentUid}`]: 0,
    }).catch(() => {});

    // Update status of incoming unread messages
    const messagesRef = collection(db, 'conversations', convId, 'messages');
    const q = query(
      messagesRef,
      where('status', '!=', 'read'),
      limit(20)
    );
    const snap = await getDocs(q);
    snap.forEach((d) => {
      const m = d.data() as ChatMessage;
      if (m.senderId !== currentUid) {
        updateDoc(d.ref, { status: 'read' }).catch(() => {});
      }
    });
  } catch (error) {
    console.warn('markConversationAsRead error:', error);
  }
}

// Broadcast typing indicator
let typingTimeout: number | null = null;
export function updateTypingStatus(
  convId: string,
  currentUid: string,
  isTyping: boolean
) {
  if (typingTimeout) {
    clearTimeout(typingTimeout);
    typingTimeout = null;
  }

  const convRef = doc(db, 'conversations', convId);
  updateDoc(convRef, {
    [`typing.${currentUid}`]: isTyping,
  }).catch(() => {});

  if (isTyping) {
    // Auto clear typing after 3 seconds of inactivity
    typingTimeout = window.setTimeout(() => {
      updateDoc(convRef, {
        [`typing.${currentUid}`]: false,
      }).catch(() => {});
    }, 3000);
  }
}
