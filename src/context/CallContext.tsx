import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  addDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { CallSession, CallType, UserProfile, OperationType } from '../types';
import { handleFirestoreError } from '../utils/firestoreErrors';
import { soundManager } from '../utils/audio';

// Public Google STUN servers. No private credentials needed.
export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

interface CallContextType {
  activeCall: CallSession | null;
  incomingCall: CallSession | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isFrontCamera: boolean;
  callDuration: number;
  isConnecting: boolean;
  startCall: (targetUser: UserProfile, type: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  switchCamera: () => Promise<void>;
}

const CallContext = createContext<CallContextType | null>(null);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile } = useAuth();

  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callUnsubRef = useRef<(() => void) | null>(null);
  const candidateUnsubRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<number | null>(null);

  // 1. Listen for incoming calls targeted to currentUser
  useEffect(() => {
    if (!currentUser) return;

    const callsRef = collection(db, 'calls');
    const q = query(
      callsRef,
      where('receiverId', '==', currentUser.uid),
      where('status', '==', 'calling')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        if (incomingCall && !activeCall) {
          soundManager.stopRinging();
          setIncomingCall(null);
        }
        return;
      }

      // If already in an active call, ignore or mark busy
      const callData = snapshot.docs[0].data() as CallSession;
      if (!activeCall) {
        setIncomingCall(callData);
        soundManager.playIncomingRing();
      }
    });

    return () => {
      unsubscribe();
      soundManager.stopRinging();
    };
  }, [currentUser, activeCall]);

  // Clean up media streams and peer connection
  const cleanupCall = () => {
    soundManager.stopRinging();
    soundManager.playEndCallTone();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCallDuration(0);

    if (callUnsubRef.current) {
      callUnsubRef.current();
      callUnsubRef.current = null;
    }
    if (candidateUnsubRef.current) {
      candidateUnsubRef.current();
      candidateUnsubRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setActiveCall(null);
    setIncomingCall(null);
    setIsConnecting(false);
    setIsMuted(false);
    setIsVideoOff(false);
  };

  // Start outgoing call
  const startCall = async (targetUser: UserProfile, type: CallType) => {
    if (!currentUser || !userProfile) return;

    try {
      setIsConnecting(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Create RTCPeerConnection
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // Add local tracks to peer connection
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle remote stream
      const remote = new MediaStream();
      setRemoteStream(remote);
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remote.addTrack(track);
        });
      };

      // Create Call Document in Firestore
      const callDocRef = doc(collection(db, 'calls'));
      const callerCandidatesCollection = collection(callDocRef, 'callerCandidates');

      // ICE candidates from caller
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(callerCandidatesCollection, event.candidate.toJSON()).catch((e) =>
            console.warn('Error adding caller ICE candidate:', e)
          );
        }
      };

      // Create Offer
      const offerDescription = await pc.createOffer();
      await pc.setLocalDescription(offerDescription);

      const callData: CallSession = {
        id: callDocRef.id,
        callerId: currentUser.uid,
        callerName: userProfile.displayName,
        callerPhoto: userProfile.photoURL,
        receiverId: targetUser.uid,
        receiverName: targetUser.displayName,
        receiverPhoto: targetUser.photoURL,
        callType: type,
        status: 'calling',
        offer: {
          sdp: offerDescription.sdp,
          type: offerDescription.type,
        },
        createdAt: serverTimestamp(),
      };

      await setDoc(callDocRef, callData);
      setActiveCall(callData);
      soundManager.playOutgoingRing();

      // Listen for Call Document changes (answer or rejection)
      callUnsubRef.current = onSnapshot(callDocRef, async (snapshot) => {
        const data = snapshot.data() as CallSession;
        if (!data) return;

        if (data.status === 'rejected' || data.status === 'ended') {
          cleanupCall();
          return;
        }

        if (data.status === 'accepted' && data.answer && !pc.currentRemoteDescription) {
          soundManager.stopRinging();
          setIsConnecting(false);
          const answerDescription = new RTCSessionDescription(data.answer);
          await pc.setRemoteDescription(answerDescription);

          // Start duration timer
          timerRef.current = window.setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        }
      });

      // Listen for Receiver ICE candidates
      const receiverCandidatesCollection = collection(callDocRef, 'receiverCandidates');
      candidateUnsubRef.current = onSnapshot(receiverCandidatesCollection, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            pc.addIceCandidate(candidate).catch((e) => console.warn('Candidate add error:', e));
          }
        });
      });
    } catch (error) {
      console.error('startCall failed:', error);
      cleanupCall();
      alert('Unable to access camera or microphone. Please check permissions.');
    }
  };

  // Accept incoming call
  const acceptCall = async () => {
    if (!incomingCall || !currentUser) return;
    soundManager.stopRinging();
    setIsConnecting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall.callType === 'video',
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const remote = new MediaStream();
      setRemoteStream(remote);
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remote.addTrack(track);
        });
      };

      const callDocRef = doc(db, 'calls', incomingCall.id);
      const receiverCandidatesCollection = collection(callDocRef, 'receiverCandidates');

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(receiverCandidatesCollection, event.candidate.toJSON()).catch((e) =>
            console.warn('Error adding receiver candidate:', e)
          );
        }
      };

      // Set remote offer
      if (incomingCall.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      }

      // Create and set local answer
      const answerDescription = await pc.createAnswer();
      await pc.setLocalDescription(answerDescription);

      const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
      };

      await updateDoc(callDocRef, {
        answer,
        status: 'accepted',
      });

      setActiveCall({ ...incomingCall, status: 'accepted', answer });
      setIncomingCall(null);
      setIsConnecting(false);

      // Start duration timer
      timerRef.current = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      // Listen for caller ICE candidates
      const callerCandidatesCollection = collection(callDocRef, 'callerCandidates');
      candidateUnsubRef.current = onSnapshot(callerCandidatesCollection, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            pc.addIceCandidate(candidate).catch((e) => console.warn('Caller candidate error:', e));
          }
        });
      });

      // Listen for call termination
      callUnsubRef.current = onSnapshot(callDocRef, (snapshot) => {
        const data = snapshot.data() as CallSession;
        if (data?.status === 'ended') {
          cleanupCall();
        }
      });
    } catch (error) {
      console.error('acceptCall failed:', error);
      rejectCall();
      alert('Could not access microphone or camera to accept the call.');
    }
  };

  // Reject incoming call
  const rejectCall = async () => {
    if (!incomingCall) return;
    soundManager.stopRinging();
    try {
      const callDocRef = doc(db, 'calls', incomingCall.id);
      await updateDoc(callDocRef, {
        status: 'rejected',
        endedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('rejectCall error:', e);
    }
    setIncomingCall(null);
  };

  // End active call
  const endCall = async () => {
    if (activeCall) {
      try {
        const callDocRef = doc(db, 'calls', activeCall.id);
        await updateDoc(callDocRef, {
          status: 'ended',
          endedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('endCall error:', e);
      }
    }
    cleanupCall();
  };

  // Toggle microphone
  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  // Toggle video track
  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  // Switch camera (front/back on mobile)
  const switchCamera = async () => {
    if (!localStreamRef.current || !pcRef.current) return;
    try {
      const currentVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (!currentVideoTrack) return;

      const newFacing = isFrontCamera ? 'environment' : 'user';
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: newFacing } },
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');

      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }

      currentVideoTrack.stop();
      localStreamRef.current.removeTrack(currentVideoTrack);
      localStreamRef.current.addTrack(newVideoTrack);

      setIsFrontCamera(!isFrontCamera);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    } catch (err) {
      console.warn('switchCamera failed or only 1 camera available:', err);
    }
  };

  return (
    <CallContext.Provider
      value={{
        activeCall,
        incomingCall,
        localStream,
        remoteStream,
        isMuted,
        isVideoOff,
        isFrontCamera,
        callDuration,
        isConnecting,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
        switchCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within a CallProvider');
  return context;
};
