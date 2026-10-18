import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Video } from 'lucide-react';
import { useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface VideoCallButtonProps {
  bookingId: number;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  children?: React.ReactNode;
}

export function VideoCallButton({
  bookingId,
  className = '',
  variant = 'default',
  size = 'default',
  disabled = false,
  children,
}: VideoCallButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const handleStartCall = async () => {
    if (isLoading || disabled) return;

    setIsLoading(true);
    
    try {
      const response = await apiRequest('POST', '/api/video-conference', { bookingId });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start video call');
      }
      
      const { roomId } = await response.json();
      
      // Redirect to video call page with the room ID
      setLocation(`/video-call/${roomId}`);
    } catch (error) {
      console.error('Error starting video call:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start video call',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || isLoading}
      onClick={handleStartCall}
    >
      {isLoading ? (
        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : (
        <Video className="h-4 w-4 mr-2" />
      )}
      {children || 'Start Video Call'}
    </Button>
  );
}