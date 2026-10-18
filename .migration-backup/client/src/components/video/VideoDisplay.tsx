import React, { useRef, useEffect } from 'react';
import { useVideoConference } from '@/context/VideoConferenceContext';

interface VideoDisplayProps {
  className?: string;
}

export function VideoDisplay({ className = '' }: VideoDisplayProps) {
  const {
    localStream,
    remoteStream,
    isCallActive,
    isCalling
  } = useVideoConference();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Set the local stream to the local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Set the remote stream to the remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Remote Video (Full Screen) */}
      {remoteStream && isCallActive ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
          {isCalling ? (
            <div className="text-center">
              <div className="inline-block h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-white text-lg">Calling...</p>
            </div>
          ) : (
            <p className="text-white text-lg">Waiting for connection...</p>
          )}
        </div>
      )}

      {/* Local Video (Small Overlay) */}
      {localStream && (
        <div className="absolute bottom-4 right-4 w-1/4 max-w-[180px] aspect-video rounded-lg overflow-hidden shadow-lg border-2 border-background">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted // Must be muted to avoid echo
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}