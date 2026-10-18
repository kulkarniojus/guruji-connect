import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Phone, Video, VideoOff } from 'lucide-react';
import { useVideoConference } from '@/context/VideoConferenceContext';

interface VideoControlsProps {
  className?: string;
}

export function VideoControls({ className = '' }: VideoControlsProps) {
  const {
    toggleAudio,
    toggleVideo,
    endCall,
    isAudioEnabled,
    isVideoEnabled
  } = useVideoConference();

  return (
    <div className={`flex items-center justify-center gap-4 p-4 bg-background/80 rounded-lg shadow-md ${className}`}>
      <Button
        variant="outline"
        size="icon"
        className={`rounded-full ${isAudioEnabled ? 'bg-green-100' : 'bg-red-100'}`}
        onClick={toggleAudio}
        title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {isAudioEnabled ? (
          <Mic className="h-5 w-5" />
        ) : (
          <MicOff className="h-5 w-5 text-red-500" />
        )}
      </Button>
      
      <Button 
        variant="destructive" 
        size="icon" 
        className="rounded-full"
        onClick={endCall}
        title="End call"
      >
        <Phone className="h-5 w-5 rotate-135" />
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        className={`rounded-full ${isVideoEnabled ? 'bg-green-100' : 'bg-red-100'}`}
        onClick={toggleVideo}
        title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        {isVideoEnabled ? (
          <Video className="h-5 w-5" />
        ) : (
          <VideoOff className="h-5 w-5 text-red-500" />
        )}
      </Button>
    </div>
  );
}