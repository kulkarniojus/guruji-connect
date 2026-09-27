import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { io, Socket } from 'socket.io-client';
import SimplePeer from 'simple-peer';
import { useToast } from '@/hooks/use-toast';

// Define the interfaces
interface VideoConferenceContextType {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isCalling: boolean;
  isReceivingCall: boolean;
  isCallActive: boolean;
  callerInfo: { name: string; id: string } | null;
  startCall: (userToCall: string) => Promise<void>;
  answerCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

interface VideoConferenceProviderProps {
  children: React.ReactNode;
}

// Create the context
const VideoConferenceContext = createContext<VideoConferenceContextType | null>(null);

// Create the provider component
export const VideoConferenceProvider: React.FC<VideoConferenceProviderProps> = ({ children }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callerInfo, setCallerInfo] = useState<{ name: string; id: string } | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  const socket = useRef<Socket | null>(null);
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initialize socket connection
  useEffect(() => {
    // Connect to the socket server
    socket.current = io(); // This will connect to the current host
    
    if (socket.current) {
      // Handle incoming calls
      socket.current.on('incomingCall', (data) => {
        setCallerInfo(data.caller);
        setIsReceivingCall(true);
      });
      
      // Handle when a call is accepted
      socket.current.on('callAccepted', (signal) => {
        if (peerRef.current) {
          peerRef.current.signal(signal);
          setIsCallActive(true);
          setIsCalling(false);
        }
      });
      
      // Handle when a call is rejected
      socket.current.on('callRejected', () => {
        endCall();
        toast({
          title: 'Call Rejected',
          description: 'The user rejected your call',
          variant: 'destructive',
        });
      });
      
      // Handle call ended by the other user
      socket.current.on('callEnded', () => {
        if (isCallActive) {
          toast({
            title: 'Call Ended',
            description: 'The other user ended the call',
          });
        }
        endCall();
      });
      
      return () => {
        if (socket.current) {
          socket.current.disconnect();
        }
      };
    }
  }, []);

  // Request permissions only when the user starts or answers a call.
  const getCallStream = async () => {
    if (localStreamRef.current?.active) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast({
        title: 'Camera or microphone unavailable',
        description: 'Allow camera and microphone access to join the call.',
        variant: 'destructive',
      });
      return null;
    }
  };

  useEffect(() => () => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
  }, []);

  // Function to start a call
  const startCall = async (userToCall: string) => {
    if (!socket.current) {
      toast({
        title: 'Error',
        description: 'Cannot establish call connection',
        variant: 'destructive',
      });
      return;
    }
    const stream = await getCallStream();
    if (!stream) return;
    
    setIsCalling(true);
    
    // Create a new peer connection
    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream,
    });
    
    peerRef.current = peer;
    
    // Handle the signal event
    peer.on('signal', (data) => {
      socket.current?.emit('callUser', {
        userToCall,
        signalData: data,
        from: socket.current.id,
      });
    });
    
    // Handle stream from remote peer
    peer.on('stream', (stream) => {
      setRemoteStream(stream);
    });
    
    // Handle peer connection closed
    peer.on('close', () => {
      endCall();
    });
    
    // Handle errors
    peer.on('error', (err) => {
      console.error('Peer connection error:', err);
      toast({
        title: 'Connection Error',
        description: 'There was an error with the call connection',
        variant: 'destructive',
      });
      endCall();
    });
  };

  // Function to answer an incoming call
  const answerCall = async () => {
    if (!socket.current || !callerInfo) {
      toast({
        title: 'Error',
        description: 'Cannot establish call connection',
        variant: 'destructive',
      });
      return;
    }
    const stream = await getCallStream();
    if (!stream) return;
    
    setIsCallActive(true);
    setIsReceivingCall(false);
    
    // Create a new peer connection
    const peer = new SimplePeer({
      initiator: false,
      trickle: false,
      stream,
    });
    
    peerRef.current = peer;
    
    // Handle the signal event
    peer.on('signal', (data) => {
      socket.current?.emit('answerCall', {
        signal: data,
        to: callerInfo.id,
      });
    });
    
    // Handle stream from remote peer
    peer.on('stream', (stream) => {
      setRemoteStream(stream);
    });
    
    // Handle peer connection closed
    peer.on('close', () => {
      endCall();
    });
    
    // Handle errors
    peer.on('error', (err) => {
      console.error('Peer connection error:', err);
      toast({
        title: 'Connection Error',
        description: 'There was an error with the call connection',
        variant: 'destructive',
      });
      endCall();
    });
  };

  // Function to reject an incoming call
  const rejectCall = () => {
    if (!socket.current || !callerInfo) return;
    
    socket.current.emit('rejectCall', {
      to: callerInfo.id,
    });
    
    setIsReceivingCall(false);
    setCallerInfo(null);
  };

  // Function to end an active call
  const endCall = () => {
    if (socket.current) {
      socket.current.emit('endCall', {
        to: callerInfo?.id,
      });
    }
    
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    
    setIsCalling(false);
    setIsCallActive(false);
    setIsReceivingCall(false);
    setCallerInfo(null);
    setRemoteStream(null);
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    
    // Navigate back to previous page
    setLocation('/');
  };

  // Function to toggle audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  // Function to toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  return (
    <VideoConferenceContext.Provider
      value={{
        localStream,
        remoteStream,
        isCalling,
        isReceivingCall,
        isCallActive,
        callerInfo,
        startCall,
        answerCall,
        rejectCall,
        endCall,
        toggleAudio,
        toggleVideo,
        isVideoEnabled,
        isAudioEnabled,
      }}
    >
      {children}
    </VideoConferenceContext.Provider>
  );
};

// Custom hook to use the video context
export const useVideoConference = () => {
  const context = useContext(VideoConferenceContext);
  if (!context) {
    throw new Error('useVideoConference must be used within a VideoConferenceProvider');
  }
  return context;
};