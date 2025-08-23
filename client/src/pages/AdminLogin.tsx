import { useState } from 'react';
import { useLocation } from 'wouter';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, KeyRound, Mail } from 'lucide-react';

// Login form schema - bypass email validation for admin user
const loginFormSchema = z.object({
  email: z.string().min(1, "Username/Email is required").refine((value) => {
    // Allow 'admin' as special case, otherwise require valid email
    if (value === 'admin') return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }, "Please enter a valid email address or use 'admin'"),
  password: z.string().min(1, "Password is required"),
});

export default function AdminLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof loginFormSchema>) => {
    try {
      setIsLoading(true);
      // For admin login, send as 'email' field even though it might be username
      const loginData = { 
        email: data.email === 'admin' ? 'admin@admin.com' : data.email, 
        password: data.password 
      };
      const response = await apiRequest('POST', '/api/admin/login', loginData);
      const userData = await response.json();
      
      toast({
        title: "Login successful",
        description: "Welcome to the admin dashboard",
      });
      
      setLocation('/admin-dashboard');
    } catch (error) {
      console.error('Admin login error:', error);
      toast({
        title: "Login failed",
        description: "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <Helmet>
        <title>Admin Login | GurujiConnect</title>
        <meta name="description" content="Login to GurujiConnect admin portal" />
      </Helmet>
      
      <div className="w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary mx-auto flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 font-poppins">GurujiConnect Admin</h1>
          <p className="text-neutral-600 mt-2">Sign in to access the admin dashboard</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username/Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                          <Input 
                            placeholder="admin or admin@example.com" 
                            className="pl-10" 
                            {...field} 
                          />
                        </div>
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
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                          <Input 
                            type="password" 
                            placeholder="Enter your password" 
                            className="pl-10" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="link" onClick={() => setLocation('/')}>
              Return to homepage
            </Button>
          </CardFooter>
        </Card>
        
        <p className="text-center text-neutral-600 text-sm mt-6">
          This portal is restricted to administrators only.<br />
          For customer or guruji login, please use the main website.
        </p>
      </div>
    </div>
  );
}
