import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterClick: () => void;
}

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

async function doLogin(email: string, password: string) {
  // Try regular login first
  let res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });

  if (res.ok) {
    const user = await res.json();
    return { success: true, user };
  }

  const errorBody = await res.json().catch(() => ({}));
  
  // If it's an admin email, try admin login
  if (res.status === 401 && (errorBody.message?.includes('admin') || email.toLowerCase().includes('admin'))) {
    const adminRes = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
    if (adminRes.ok) {
      const adminData = await adminRes.json();
      return { success: true, user: adminData.user };
    }
    const adminError = await adminRes.json().catch(() => ({}));
    return { success: false, message: adminError.message || 'Invalid credentials' };
  }

  return { success: false, message: errorBody.message || 'Invalid email or password' };
}

export default function LoginModal({ isOpen, onClose, onRegisterClick }: LoginModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const result = await doLogin(values.email, values.password);
      
      if (result.success && result.user) {
        // Update the auth query cache
        queryClient.setQueryData(['/api/auth/me'], result.user);
        
        toast({
          title: 'Welcome back!',
          description: `Hello, ${result.user.firstName || result.user.name || result.user.email}!`,
        });
        onClose();
        form.reset();

        // Redirect based on role
        if (result.user.role === 'admin') {
          setLocation('/admin-dashboard');
        } else {
          setLocation('/dashboard');
        }
      } else {
        toast({
          title: 'Login Failed',
          description: result.message || 'Invalid email or password',
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

  const handleCancel = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-neutral-900">
            Login to GurujiConnect
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter your email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-between items-center pt-2">
                <Button variant="link" type="button" className="px-0 text-sm">
                  Forgot password?
                </Button>
                <div className="flex space-x-2">
                  <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading} className="bg-orange-600 hover:bg-orange-700">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Login
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>
        
        <div className="pt-3 text-center border-t border-neutral-200">
          <p className="text-sm text-neutral-600">
            Don't have an account?{' '}
            <Button 
              variant="link" 
              onClick={onRegisterClick} 
              className="p-0 font-medium text-orange-600 hover:text-orange-700"
            >
              Register now
            </Button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
