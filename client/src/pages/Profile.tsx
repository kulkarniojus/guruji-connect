import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Helmet } from 'react-helmet';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, User, Phone, Mail, MapPin, Calendar, AlertCircle, Save, UserX, CreditCard, CheckCircle, ChevronRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Profile update form schema
const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  mobile: z.string().length(10, "Mobile number must be 10 digits"),
  age: z.coerce.number().min(18, "You must be at least 18 years old"),
});

// Password change form schema
const passwordFormSchema = z.object({
  currentPassword: z.string().min(6, "Password must be at least 6 characters"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function Profile() {
  const [activeTab, setActiveTab] = useState('profile');
  const [isPasswordChangeOpen, setIsPasswordChangeOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Redirect if not logged in
  useEffect(() => {
    if (!user && !isLoading) {
      setLocation('/');
    }
  }, [user, isLoading, setLocation]);

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      mobile: user?.mobile || '',
      age: user?.age || 18,
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Fetch bookings for the user
  const { data: bookings = [], isLoading: isBookingsLoading } = useQuery({
    queryKey: ['/api/bookings'],
    enabled: !!user,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileFormSchema>) => {
      const response = await apiRequest('PUT', `/api/users/${user?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string, newPassword: string }) => {
      const response = await apiRequest('POST', `/api/auth/change-password`, data);
      return response.json();
    },
    onSuccess: () => {
      setIsPasswordChangeOpen(false);
      passwordForm.reset();
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Password change failed",
        description: "Failed to change password. Please check your current password and try again.",
        variant: "destructive",
      });
    }
  });

  // Deactivate account mutation
  const deactivateAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/users/${user?.id}/deactivate`, {});
      return response.json();
    },
    onSuccess: () => {
      logout();
      setLocation('/');
      toast({
        title: "Account deactivated",
        description: "Your account has been deactivated",
      });
    },
    onError: (error) => {
      toast({
        title: "Deactivation failed",
        description: "Failed to deactivate account. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Set form values when user data is available
  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        mobile: user.mobile || '',
        age: user.age || 18,
      });
    }
  }, [user, profileForm]);

  const onProfileSubmit = async (data: z.infer<typeof profileFormSchema>) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = async (data: z.infer<typeof passwordFormSchema>) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  const onDeactivateAccount = async () => {
    deactivateAccountMutation.mutate();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Helmet>
        <title>Profile | PujaConnect</title>
        <meta name="description" content="Manage your profile and account settings" />
      </Helmet>

      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 font-poppins">Your Profile</h1>
          <p className="text-neutral-600">Manage your profile and account settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Profile sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarFallback className="text-xl font-semibold">
                      {user.firstName?.charAt(0) || ''}
                      {user.lastName?.charAt(0) || ''}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-semibold">{user.firstName} {user.lastName}</h2>
                  <p className="text-neutral-500 mt-1">{user.role}</p>
                </div>

                <Separator className="my-4" />

                <div className="space-y-3">
                  <Button 
                    variant={activeTab === 'profile' ? "default" : "ghost"} 
                    className="w-full justify-start"
                    onClick={() => setActiveTab('profile')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Button>
                  <Button 
                    variant={activeTab === 'bookings' ? "default" : "ghost"} 
                    className="w-full justify-start"
                    onClick={() => setActiveTab('bookings')}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Bookings
                  </Button>
                  <Button 
                    variant={activeTab === 'security' ? "default" : "ghost"} 
                    className="w-full justify-start"
                    onClick={() => setActiveTab('security')}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Payment Methods
                  </Button>
                  <Button 
                    variant={activeTab === 'security' ? "default" : "ghost"} 
                    className="w-full justify-start"
                    onClick={() => setActiveTab('security')}
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Security
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your personal information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={profileForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="mobile"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Mobile Number</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    readOnly 
                                    disabled 
                                    className="bg-neutral-100" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="age"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Age</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    {...field} 
                                    onChange={(e) => field.onChange(parseInt(e.target.value))} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <Button 
                          type="submit" 
                          disabled={updateProfileMutation.isPending}
                        >
                          {updateProfileMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                {user.role === 'guruji' && (
                  <Card className="mt-8">
                    <CardHeader>
                      <CardTitle>Guruji Profile</CardTitle>
                      <CardDescription>Update your professional information</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <Label htmlFor="bio">Bio</Label>
                          <textarea
                            id="bio"
                            rows={4}
                            className="mt-1 w-full p-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                            placeholder="Tell clients about yourself"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="specialization">Specialization</Label>
                          <Input
                            id="specialization"
                            className="mt-1"
                            placeholder="What pujas do you specialize in?"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="experience">Experience (years)</Label>
                          <Input
                            id="experience"
                            type="number"
                            className="mt-1"
                            min={0}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            className="mt-1"
                            placeholder="Your city"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="service-radius">Service Radius (km)</Label>
                          <Input
                            id="service-radius"
                            type="number"
                            className="mt-1"
                            min={1}
                            max={50}
                            defaultValue={10}
                          />
                        </div>
                      </div>
                      
                      <Button>
                        <Save className="mr-2 h-4 w-4" />
                        Save Guruji Profile
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="bookings">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Bookings</CardTitle>
                    <CardDescription>View and manage your booking history</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isBookingsLoading ? (
                      <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : bookings.length > 0 ? (
                      <div className="space-y-4">
                        {bookings.map((booking: any) => (
                          <div key={booking.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center">
                                  <StatusBadge status={booking.status} />
                                  <h3 className="text-lg font-medium ml-2">{booking.pujaName || 'Puja Booking'}</h3>
                                </div>
                                <p className="text-neutral-600 text-sm mt-1">
                                  {new Date(booking.date).toLocaleDateString('en-US', { 
                                    month: 'long', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  })} at {new Date(booking.date).toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </p>
                                <div className="flex items-center text-sm text-neutral-600 mt-2">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  <span>{booking.city}{booking.address ? `, ${booking.address}` : ''}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">₹{booking.amount}</p>
                                <Button variant="outline" size="sm" className="mt-2">
                                  View Details
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Calendar className="h-8 w-8 text-neutral-400" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">No bookings yet</h3>
                        <p className="text-neutral-600 mb-6">
                          You haven't made any bookings yet. Start by booking a puja or consultation.
                        </p>
                        <Button onClick={() => setLocation('/booking')}>
                          Book a Puja
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                    <CardDescription>Manage your payment methods</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 border rounded-lg">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center mr-4">
                            <CreditCard className="h-5 w-5 text-neutral-600" />
                          </div>
                          <div>
                            <p className="font-medium">Add New Payment Method</p>
                            <p className="text-sm text-neutral-500">Add a credit card or other payment method</p>
                          </div>
                        </div>
                        <Button variant="outline">
                          Add Method
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle>Account Security</CardTitle>
                    <CardDescription>Manage your account security settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Change Password</p>
                        <p className="text-sm text-neutral-500">Update your account password</p>
                      </div>
                      <Button variant="outline" onClick={() => setIsPasswordChangeOpen(true)}>
                        Change
                      </Button>
                    </div>
                    
                    <div className="flex justify-between items-center p-4 border rounded-lg border-red-200 bg-red-50">
                      <div>
                        <p className="font-medium text-red-800">Deactivate Account</p>
                        <p className="text-sm text-red-700">Temporarily disable your account</p>
                      </div>
                      <Button variant="destructive" onClick={() => setIsDeactivateOpen(true)}>
                        Deactivate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      
      <Footer />

      {/* Password Change Dialog */}
      <Dialog open={isPasswordChangeOpen} onOpenChange={setIsPasswordChangeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and a new password to change it.
            </DialogDescription>
          </DialogHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsPasswordChangeOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Deactivate Account Dialog */}
      <Dialog open={isDeactivateOpen} onOpenChange={setIsDeactivateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate your account? This action is reversible but will disable your account temporarily.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mt-2">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                Your bookings and personal information will be preserved, but you won't be able to login until you contact support to reactivate your account.
              </p>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeactivateOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              variant="destructive"
              onClick={onDeactivateAccount}
              disabled={deactivateAccountMutation.isPending}
            >
              {deactivateAccountMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Deactivate Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let color;
  let label;

  switch (status) {
    case 'pending':
      color = 'bg-amber-50 text-amber-700 border-amber-200';
      label = 'Pending';
      break;
    case 'confirmed':
      color = 'bg-blue-50 text-blue-700 border-blue-200';
      label = 'Confirmed';
      break;
    case 'in_progress':
      color = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      label = 'In Progress';
      break;
    case 'completed':
      color = 'bg-green-50 text-green-700 border-green-200';
      label = 'Completed';
      break;
    case 'cancelled':
      color = 'bg-red-50 text-red-700 border-red-200';
      label = 'Cancelled';
      break;
    default:
      color = 'bg-neutral-50 text-neutral-700 border-neutral-200';
      label = status;
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium border ${color}`}>
      {label}
    </span>
  );
}
