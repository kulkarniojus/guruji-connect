import React, { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { VideoDisplay } from '@/components/video/VideoDisplay';
import { VideoControls } from '@/components/video/VideoControls';
import { IncomingCallModal } from '@/components/video/IncomingCallModal';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useVideoConference } from '@/context/VideoConferenceContext';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

export default function VideoCall() {
  const params = useParams<{ id?: string }>();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    startCall,
    isCallActive
  } = useVideoConference();

  // Get the room ID from the URL params
  const roomId = params.id;

  // Fetch room info and join the call when the component mounts
  useEffect(() => {
    if (!roomId) {
      toast({
        title: 'Error',
        description: 'Invalid room ID',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    const joinCall = async () => {
      try {
        // Fetch room information from the server
        const response = await apiRequest('GET', `/api/video-conference/${roomId}`);
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to join video call');
        }
        
        const { callerId, calleeId } = await response.json();
        
        // If the current user is not part of this call, redirect
        if (user && (user.id !== callerId && user.id !== calleeId)) {
          toast({
            title: 'Access Denied',
            description: 'You are not a participant in this call',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }
        
        // Start the call with the other participant
        if (user && user.id === callerId) {
          await startCall(calleeId.toString());
        }
        
      } catch (error) {
        console.error('Error joining call:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to join video call',
          variant: 'destructive',
        });
        navigate('/');
      }
    };

    joinCall();
  }, [roomId, user, navigate, toast, startCall]);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center p-4 bg-background border-b">
        <Button 
          variant="ghost" 
          className="mr-2"
          onClick={() => navigate('/')}
          disabled={isCallActive}
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          Back
        </Button>
        <h1 className="text-xl font-semibold">Video Call</h1>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col relative">
        <VideoDisplay className="flex-1" />
        
        {/* Controls at the bottom */}
        <div className="p-4 w-full flex justify-center">
          <VideoControls />
        </div>
      </div>
      
      {/* Incoming call modal */}
      <IncomingCallModal />
    </div>
  );
}