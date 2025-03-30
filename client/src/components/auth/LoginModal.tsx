import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
// Temporary disable authentication
// import { useAuth } from '@/context/AuthContext';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/otp-input';
import { Loader2 } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterClick: () => void;
}

export default function LoginModal({ isOpen, onClose, onRegisterClick }: LoginModalProps) {
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  // Temporarily mock auth functions
  const sendOtp = async () => true;
  const login = async () => true;

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setMobile(value);
    }
  };

  const handleGetOTP = async () => {
    if (mobile.length !== 10) {
      toast({
        title: 'Invalid mobile number',
        description: 'Please enter a valid 10-digit mobile number',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const success = await sendOtp(mobile);
      if (success) {
        setStep('otp');
        toast({
          title: 'OTP Sent',
          description: 'An OTP has been sent to your mobile number',
        });
      } else {
        toast({
          title: 'Failed to send OTP',
          description: 'Please try again later',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send OTP. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (otp.length !== 6) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter a valid 6-digit OTP',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(mobile, otp);
      if (success) {
        toast({
          title: 'Login Successful',
          description: 'You have been logged in successfully',
        });
        onClose();
      } else {
        toast({
          title: 'Login Failed',
          description: 'Invalid OTP. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to login. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    try {
      const success = await sendOtp(mobile);
      if (success) {
        toast({
          title: 'OTP Resent',
          description: 'A new OTP has been sent to your mobile number',
        });
      } else {
        toast({
          title: 'Failed to resend OTP',
          description: 'Please try again later',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resend OTP. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setStep('mobile');
    setMobile('');
    setOtp('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-neutral-900 font-poppins">
            Login to PujaConnect
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-6 space-y-6">
          {step === 'mobile' ? (
            <div className="mb-6">
              <Label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-1">
                Mobile Number
              </Label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-neutral-500 sm:text-sm">+91</span>
                </div>
                <Input
                  type="tel"
                  id="phone"
                  value={mobile}
                  onChange={handleMobileChange}
                  className="pl-12 pr-20"
                  placeholder="Enter 10 digit mobile number"
                />
                <div className="absolute inset-y-0 right-0 flex items-center">
                  <Button
                    type="button"
                    onClick={handleGetOTP}
                    disabled={isLoading || mobile.length !== 10}
                    className="rounded-r-md"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Get OTP
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <Label htmlFor="otp" className="block text-sm font-medium text-neutral-700 mb-1">
                Enter OTP
              </Label>
              <div className="mt-1">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                  className="gap-2 justify-center"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <p className="mt-2 text-sm text-neutral-500">
                  Didn't receive the OTP?{" "}
                  <Button
                    variant="link"
                    onClick={handleResendOTP}
                    disabled={isLoading}
                    className="p-0 text-primary hover:text-primary-500"
                  >
                    Resend OTP
                  </Button>
                </p>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="sm:flex sm:flex-row-reverse">
          {step === 'mobile' ? (
            <Button type="button" onClick={handleGetOTP} disabled={isLoading || mobile.length !== 10}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Get OTP
            </Button>
          ) : (
            <Button type="button" onClick={handleLogin} disabled={isLoading || otp.length !== 6}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Login
            </Button>
          )}
          <Button type="button" variant="outline" onClick={handleCancel} className="mt-3 sm:mt-0 sm:mr-3">
            Cancel
          </Button>
        </DialogFooter>

        <div className="pt-3 text-center border-t border-neutral-200">
          <p className="text-sm text-neutral-600">
            Don't have an account?{" "}
            <Button variant="link" onClick={onRegisterClick} className="p-0 font-medium text-primary hover:text-primary-500">
              Register now
            </Button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
