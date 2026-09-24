import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  updateDoc,
} from 'firebase/firestore';
import {
  ref as rtdbRef,
  onValue,
  onDisconnect,
  set as setRtdb,
  serverTimestamp as rtdbServerTimestamp,
} from 'firebase/database';
import { auth, db, rtdb, googleProvider } from '../config/firebase';
import { UserProfile, OperationType } from '../types';
import { handleFirestoreError } from '../utils/firestoreErrors';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  needsUsername: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  loginWithGoogle: (forceRedirect?: boolean) => Promise<void>;
  loginWithNumberOrEmail: (numberOrEmail: string, password: string) => Promise<void>;
  signupWithNumberOrEmail: (numberOrEmail: string, password: string, name?: string) => Promise<void>;
  registerUsername: (username: string, bio?: string) => Promise<{ success: boolean; error?: string }>;
  updateProfileDetails: (updates: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Helper to normalize phone number or email to a valid Firebase email format
export const normalizeNumberOrEmail = (input: string): { email: string; isPhone: boolean; raw: string } => {
  const trimmed = input.trim();
  if (trimmed.includes('@')) {
    return { email: trimmed.toLowerCase(), isPhone: false, raw: trimmed };
  }
  // Strip non-digit characters except leading plus
  const digits = trimmed.replace(/\D/g, '');
  return {
    email: `phone_${digits}@mymessenger.app`,
    isPhone: true,
    raw: trimmed,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('mymessenger_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('mymessenger_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Helper to ensure user document users/{FirebaseAuthUID} exists
  const syncUserProfileDoc = useCallback(async (user: FirebaseUser) => {
    const userDocRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userDocRef);
      if (!snap.exists()) {
        const initialProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
          displayName: user.displayName || 'User',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
          username: '', // Missing username triggers username setup modal
          createdAt: serverTimestamp(),
          lastSeen: serverTimestamp(),
          online: true,
          status: 'active',
          bio: '',
        };
        await setDoc(userDocRef, initialProfile, { merge: true });
        setUserProfile(initialProfile);
        setNeedsUsername(true);
      } else {
        const data = snap.data() as UserProfile;
        await updateDoc(userDocRef, {
          online: true,
          lastSeen: serverTimestamp(),
          displayName: user.displayName || data.displayName,
          photoURL: user.photoURL || data.photoURL,
          email: user.email || data.email,
        }).catch(() => {});
        setUserProfile(data);
        setNeedsUsername(!data.username || data.username.trim() === '');
      }
    } catch (err) {
      console.warn('Profile sync notice:', err);
    }
  }, []);

  // Process redirect results from Google signInWithRedirect on boot
  useEffect(() => {
    let isMounted = true;
    getRedirectResult(auth)
      .then(async (result) => {
        if (!isMounted) return;
        if (result?.user) {
          await syncUserProfileDoc(result.user);
        }
      })
      .catch((err) => {
        console.warn('Firebase Redirect Auth notice:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [syncUserProfileDoc]);

  // Auth & Presence Listener
  useEffect(() => {
    let unsubDoc: (() => void) | null = null;
    let unsubConnected: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (!user) {
        setUserProfile(null);
        setNeedsUsername(false);
        setLoading(false);
        if (unsubDoc) unsubDoc();
        if (unsubConnected) unsubConnected();
        return;
      }

      const userDocRef = doc(db, 'users', user.uid);

      // Listen to User Profile Document in Firestore
      unsubDoc = onSnapshot(
        userDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as UserProfile;
            setUserProfile(data);
            setNeedsUsername(!data.username || data.username.trim() === '');
          } else {
            syncUserProfileDoc(user);
          }
          setLoading(false);
        },
        (error) => {
          console.warn('Firestore user profile listener notice:', error);
          setLoading(false);
        }
      );

      // Presence: Sync Firestore online status
      updateDoc(userDocRef, {
        online: true,
        lastSeen: serverTimestamp(),
      }).catch(() => {});

      // Setup Realtime Database Presence if RTDB is active
      if (rtdb) {
        try {
          const userStatusRtdbRef = rtdbRef(rtdb, `/status/${user.uid}`);
          const connectedRef = rtdbRef(rtdb, '.info/connected');

          unsubConnected = onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
              onDisconnect(userStatusRtdbRef)
                .set({
                  online: false,
                  lastSeen: rtdbServerTimestamp(),
                })
                .catch(() => {});

              setRtdb(userStatusRtdbRef, {
                online: true,
                lastSeen: rtdbServerTimestamp(),
              }).catch(() => {});

              updateDoc(userDocRef, {
                online: true,
                lastSeen: serverTimestamp(),
              }).catch(() => {});
            }
          });
        } catch (err) {
          console.warn('RTDB presence listener notice:', err);
        }
      }

      const handleBeforeUnload = () => {
        updateDoc(userDocRef, {
          online: false,
          lastSeen: serverTimestamp(),
        }).catch(() => {});
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    });

    return () => {
      unsubscribeAuth();
      if (unsubDoc) unsubDoc();
      if (unsubConnected) unsubConnected();
    };
  }, [syncUserProfileDoc]);

  // Google Sign-In: supports both signInWithPopup and signInWithRedirect fallback
  const loginWithGoogle = async (forceRedirect = false) => {
    if (forceRedirect) {
      await signInWithRedirect(auth, googleProvider);
      return;
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user) {
        await syncUserProfileDoc(result.user);
      }
    } catch (error: any) {
      const code = error?.code;
      // If popup was blocked or unsupported, fallback to redirect
      if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
        console.warn('Popup blocked, falling back to signInWithRedirect...', error);
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw error;
    }
  };

  // Sign In with Number or Email + Password
  const loginWithNumberOrEmail = async (numberOrEmail: string, password: string) => {
    const { email } = normalizeNumberOrEmail(numberOrEmail);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await syncUserProfileDoc(userCredential.user);
    }
  };

  // Sign Up with Number or Email + Password
  const signupWithNumberOrEmail = async (numberOrEmail: string, password: string, name = '') => {
    const { email, isPhone, raw } = normalizeNumberOrEmail(numberOrEmail);
    if (isPhone && raw.replace(/\D/g, '').length < 6) {
      throw new Error('Please enter a valid phone number (at least 6 digits).');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const displayName = name.trim() || (isPhone ? `User ${raw}` : email.split('@')[0]);

    await updateProfile(user, {
      displayName,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
    }).catch(() => {});

    const userDocRef = doc(db, 'users', user.uid);
    const initialProfile: UserProfile = {
      uid: user.uid,
      email: isPhone ? '' : email,
      phoneNumber: isPhone ? raw : '',
      displayName,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
      username: '', // prompts username setup
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      online: true,
      status: 'active',
      bio: '',
    };
    await setDoc(userDocRef, initialProfile, { merge: true });
    setUserProfile(initialProfile);
    setNeedsUsername(true);
  };

  const registerUsername = async (rawUsername: string, bio = '') => {
    if (!currentUser) throw new Error('Not authenticated');

    const username = rawUsername.trim().toLowerCase();
    const regex = /^[a-z0-9_]{3,30}$/;
    if (!regex.test(username)) {
      return {
        success: false,
        error: 'Username must be 3-30 characters long and contain only lowercase letters, numbers, and underscores.',
      };
    }

    try {
      const usernameDocRef = doc(db, 'usernames', username);
      const usernameSnap = await getDoc(usernameDocRef);

      if (usernameSnap.exists()) {
        const existingData = usernameSnap.data();
        if (existingData.uid !== currentUser.uid) {
          return { success: false, error: `The username "@${username}" is already taken. Please choose another.` };
        }
      }

      const batch = writeBatch(db);
      batch.set(usernameDocRef, {
        uid: currentUser.uid,
        username,
        reservedAt: serverTimestamp(),
      });

      const userDocRef = doc(db, 'users', currentUser.uid);
      const profileData: Partial<UserProfile> = {
        uid: currentUser.uid,
        username,
        displayName: currentUser.displayName || username,
        photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
        email: currentUser.email || '',
        phoneNumber: userProfile?.phoneNumber || '',
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        online: true,
        status: 'active',
        bio: bio.trim(),
      };

      batch.set(userDocRef, profileData, { merge: true });
      await batch.commit();

      setNeedsUsername(false);
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `usernames/${username}`);
    }
  };

  const updateProfileDetails = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        ...updates,
        lastSeen: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const logout = async () => {
    if (currentUser) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, {
          online: false,
          lastSeen: serverTimestamp(),
        });
      } catch {}
    }
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        needsUsername,
        theme,
        toggleTheme,
        loginWithGoogle,
        loginWithNumberOrEmail,
        signupWithNumberOrEmail,
        registerUsername,
        updateProfileDetails,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
