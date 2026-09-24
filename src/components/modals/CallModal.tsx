import React, { useEffect, useRef } from 'react';
import { useCall } from '../../context/CallContext';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  SwitchCamera,
  User,
  Volume2,
} from 'lucide-react';
import { getInitials, getAvatarColor } from '../../utils/helpers';

export const CallModal: React.FC = () => {
  const {
    activeCall,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isFrontCamera,
    callDuration,
    isConnecting,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Bind local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, activeCall]);

  // Bind remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, activeCall]);

  const formatCallTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. INCOMING CALL SCREEN
  if (incomingCall && !activeCall) {
    const isVideo = incomingCall.callType === 'video';
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
        <div className="w-full max-w-sm bg-gradient-to-b from-gray-900 to-gray-950 rounded-3xl p-8 text-center text-white border border-gray-800 shadow-2xl relative overflow-hidden">
          {/* Animated decorative ring */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-blue-500/10 animate-pulse-ring pointer-events-none" />

          {/* Caller Photo */}
          <div className="relative w-28 h-28 mx-auto mb-6">
            {incomingCall.callerPhoto ? (
              <img
                src={incomingCall.callerPhoto}
                alt={incomingCall.callerName}
                className="w-full h-full rounded-full object-cover ring-4 ring-blue-500/50 shadow-xl"
              />
            ) : (
              <div
                className={`w-full h-full rounded-full flex items-center justify-center text-3xl font-bold bg-gradient-to-br ${getAvatarColor(
                  incomingCall.callerName || 'user'
                )} ring-4 ring-blue-500/50 shadow-xl`}
              >
                {getInitials(incomingCall.callerName)}
              </div>
            )}
            <div className="absolute bottom-1 right-1 p-2 bg-blue-600 rounded-full text-white shadow-md">
              {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            </div>
          </div>

          <h3 className="text-2xl font-bold mb-1 truncate px-2">{incomingCall.callerName}</h3>
          <p className="text-blue-400 font-medium text-sm mb-8 flex items-center justify-center gap-1.5 animate-pulse">
            <Volume2 className="w-4 h-4" />
            Incoming {isVideo ? 'Video' : 'Voice'} Call...
          </p>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={rejectCall}
              className="group flex flex-col items-center gap-2 cursor-pointer focus:outline-none"
            >
              <div className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition transform group-hover:scale-105 active:scale-95">
                <PhoneOff className="w-7 h-7" />
              </div>
              <span className="text-xs text-gray-400 font-medium">Decline</span>
            </button>

            <button
              onClick={acceptCall}
              className="group flex flex-col items-center gap-2 cursor-pointer focus:outline-none"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 transition transform group-hover:scale-105 active:scale-95 animate-bounce">
                <Phone className="w-7 h-7" />
              </div>
              <span className="text-xs text-emerald-400 font-medium">Accept</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE CALL SCREEN
  if (!activeCall) return null;

  const isVideoCall = activeCall.callType === 'video';
  const partnerName = activeCall.callerName || activeCall.receiverName || 'Caller';
  const partnerPhoto = activeCall.callerPhoto || activeCall.receiverPhoto;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg animate-in fade-in">
      <div className="relative w-full h-full max-w-5xl max-h-[92vh] md:rounded-3xl overflow-hidden bg-gray-950 flex flex-col shadow-2xl border border-gray-800">
        
        {/* Top bar info */}
        <div className="absolute top-0 inset-x-0 z-20 p-4 md:p-6 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
              {partnerPhoto ? (
                <img src={partnerPhoto} alt={partnerName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div>
              <h4 className="font-semibold text-base leading-tight">{partnerName}</h4>
              <p className="text-xs text-emerald-400 font-medium">
                {isConnecting ? 'Connecting...' : formatCallTime(callDuration)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur border border-white/10">
              WebRTC P2P
            </span>
          </div>
        </div>

        {/* Video or Voice Center Stage */}
        <div className="relative flex-1 w-full h-full flex items-center justify-center bg-gray-900 overflow-hidden">
          {isVideoCall ? (
            <>
              {/* Remote Video Stream */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Connecting / No Video Placeholder */}
              {(!remoteStream || remoteStream.getVideoTracks().length === 0) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-white">
                  <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center text-4xl font-bold mb-4 ring-4 ring-blue-500/30">
                    {getInitials(partnerName)}
                  </div>
                  <p className="text-lg font-medium text-gray-300">
                    {isConnecting ? 'Establishing WebRTC connection...' : `${partnerName}'s video is paused`}
                  </p>
                </div>
              )}

              {/* Local Video Stream (Picture in Picture) */}
              <div className="absolute bottom-24 right-4 md:bottom-28 md:right-6 w-32 h-44 md:w-44 md:h-60 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-gray-950 z-30 transition-all hover:scale-105">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
                />
                {isVideoOff && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-gray-400">
                    <VideoOff className="w-6 h-6 mb-1" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Camera Off</span>
                  </div>
                )}
                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white">
                  You
                </div>
              </div>
            </>
          ) : (
            /* Voice Calling Stage */
            <div className="flex flex-col items-center justify-center text-white p-8">
              <div className="relative w-36 h-36 mb-6">
                <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-pulse-ring" />
                <div className="relative w-full h-full rounded-full overflow-hidden ring-4 ring-blue-500 shadow-2xl bg-gray-800 flex items-center justify-center">
                  {partnerPhoto ? (
                    <img src={partnerPhoto} alt={partnerName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold">{getInitials(partnerName)}</span>
                  )}
                </div>
              </div>

              <h2 className="text-3xl font-bold mb-2">{partnerName}</h2>
              <p className="text-emerald-400 font-semibold tracking-wide mb-6">
                {isConnecting ? 'Connecting call...' : formatCallTime(callDuration)}
              </p>

              {/* Hidden audio element to playback remote voice */}
              <audio ref={(el) => {
                if (el && remoteStream) {
                  el.srcObject = remoteStream;
                }
              }} autoPlay />
            </div>
          )}
        </div>

        {/* Floating Bottom Control Bar */}
        <div className="absolute bottom-6 inset-x-0 z-30 flex items-center justify-center gap-4 px-4">
          <div className="flex items-center gap-3 md:gap-4 p-3 rounded-full bg-black/70 backdrop-blur-xl border border-white/10 shadow-2xl">
            {/* Mute Mic */}
            <button
              onClick={toggleMute}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              className={`p-3.5 rounded-full transition cursor-pointer ${
                isMuted
                  ? 'bg-rose-600 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Video Toggle (if video call) */}
            {isVideoCall && (
              <button
                onClick={toggleVideo}
                title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
                className={`p-3.5 rounded-full transition cursor-pointer ${
                  isVideoOff
                    ? 'bg-rose-600 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
            )}

            {/* Camera Switch (front/back) for mobile */}
            {isVideoCall && (
              <button
                onClick={switchCamera}
                title="Switch camera"
                className="p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            )}

            {/* End Call */}
            <button
              onClick={endCall}
              title="End call"
              className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer shadow-lg shadow-rose-600/40 ml-2"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
