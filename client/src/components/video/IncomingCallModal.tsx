import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';
import { useVideoConference } from '@/context/VideoConferenceContext';

export function IncomingCallModal() {
  const {
    isReceivingCall,
    callerInfo,
    answerCall,
    rejectCall
  } = useVideoConference();

  if (!isReceivingCall || !callerInfo) return null;

  return (
    <Dialog open={isReceivingCall} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Incoming Call</DialogTitle>
          <DialogDescription>
            {callerInfo.name || "Someone"} is calling you
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center space-x-4 py-4">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full border-green-500 hover:bg-green-100 hover:text-green-700"
            onClick={answerCall}
          >
            <Phone className="h-5 w-5 text-green-500" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full border-red-500 hover:bg-red-100 hover:text-red-700"
            onClick={rejectCall}
          >
            <PhoneOff className="h-5 w-5 text-red-500" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}