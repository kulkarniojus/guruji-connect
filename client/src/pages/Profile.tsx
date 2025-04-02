import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { UserCircle, MapPin, UserCog, History, Phone, Mail, Shield, PencilLine, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";

type UserProfile = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  age: number;
  gender: string;
  role: string;
  aadhar?: string;
  caste?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

type GurujiProfile = {
  id: number;
  userId: number;
  bio?: string;
  experience?: number;
  specialization?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  radius: number;
  isOnline: boolean;
  isOffline: boolean;
  isConsultation: boolean;
  rating: number;
  totalReviews: number;
};

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [gurujiProfile, setGurujiProfile] = useState<GurujiProfile | null>(null);
  
  // Fetch user data
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    staleTime: 60000, // 1 minute
  });
  
  // Fetch guruji profile if user is a guruji
  const { data: gurujiData, isLoading: gurujiLoading } = useQuery({
    queryKey: ["/api/gurujis/profile"],
    staleTime: 60000,
    enabled: !!user && user.role === "guruji",
  });
  
  // Bookings history
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/bookings"],
    staleTime: 60000,
    enabled: !!user,
  });
  
  useEffect(() => {
    if (userData) {
      setUserProfile(userData);
    }
    
    if (gurujiData) {
      setGurujiProfile(gurujiData);
    }
  }, [userData, gurujiData]);
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handleSave = () => {
    // In a real app, this would save changes to the server
    toast({
      title: "Success",
      description: "Profile updated successfully",
    });
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    // Reset any unsaved changes
    if (userData) {
      setUserProfile(userData);
    }
    if (gurujiData) {
      setGurujiProfile(gurujiData);
    }
    setIsEditing(false);
  };
  
  if (userLoading || (user?.role === "guruji" && gurujiLoading)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!userProfile) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Profile not found</h1>
        <p>Unable to load your profile information. Please try again later.</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - User profile & photo */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="text-center">
              <Avatar className="w-24 h-24 mx-auto">
                <AvatarImage src="" alt={`${userProfile.firstName} ${userProfile.lastName}`} />
                <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                  {userProfile.firstName[0]}{userProfile.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="mt-4">{userProfile.firstName} {userProfile.lastName}</CardTitle>
              <CardDescription>
                <span className="flex items-center justify-center gap-1">
                  <UserCircle className="h-4 w-4" /> {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{userProfile.mobile}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{userProfile.email}</span>
                </div>
                {userProfile.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p>{userProfile.address}</p>
                      <p>{userProfile.city}, {userProfile.state} {userProfile.pincode}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleEdit} className="w-full" variant="outline">
                <PencilLine className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </CardFooter>
          </Card>
          
          {/* Identity verification */}
          {userProfile.aadhar && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Identity Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span>Aadhar Card</span>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Right column - Tabs & details */}
        <div className="md:col-span-2">
          <Tabs defaultValue="personal">
            <TabsList className="w-full">
              <TabsTrigger value="personal" className="flex-1">Personal Information</TabsTrigger>
              {userProfile.role === "guruji" && (
                <TabsTrigger value="guruji" className="flex-1">Guruji Details</TabsTrigger>
              )}
              <TabsTrigger value="history" className="flex-1">Booking History</TabsTrigger>
            </TabsList>
            
            {/* Personal Information Tab */}
            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Your personal details are kept private and are only used for verification purposes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName" 
                        value={userProfile.firstName}
                        disabled={!isEditing}
                        onChange={(e) => setUserProfile({...userProfile, firstName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName" 
                        value={userProfile.lastName}
                        disabled={!isEditing}
                        onChange={(e) => setUserProfile({...userProfile, lastName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        value={userProfile.email}
                        disabled={!isEditing}
                        onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobile">Mobile</Label>
                      <Input 
                        id="mobile" 
                        value={userProfile.mobile}
                        disabled={true} // Mobile cannot be edited
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input 
                        id="age" 
                        type="number"
                        value={userProfile.age}
                        disabled={!isEditing}
                        onChange={(e) => setUserProfile({...userProfile, age: parseInt(e.target.value, 10)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Input 
                        id="gender" 
                        value={userProfile.gender}
                        disabled={!isEditing}
                        onChange={(e) => setUserProfile({...userProfile, gender: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input 
                      id="address" 
                      value={userProfile.address || ""}
                      disabled={!isEditing}
                      onChange={(e) => setUserProfile({...userProfile, address: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input 
                        id="city" 
                        value={userProfile.city || ""}
                        disabled={!isEditing}
                        onChange={(e) => setUserProfile({...userProfile, city: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input 
                        id="state" 
                        value={userProfile.state || ""}
                        disabled={!isEditing}
                        onChange={(e) => setUserProfile({...userProfile, state: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input 
                        id="pincode" 
                        value={userProfile.pincode || ""}
                        disabled={!isEditing}
                        onChange={(e) => setUserProfile({...userProfile, pincode: e.target.value})}
                      />
                    </div>
                  </div>
                </CardContent>
                {isEditing && (
                  <CardFooter className="flex justify-end space-x-2">
                    <Button onClick={handleCancel} variant="outline">Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>
            
            {/* Guruji Details Tab */}
            {userProfile.role === "guruji" && (
              <TabsContent value="guruji">
                <Card>
                  <CardHeader>
                    <CardTitle>Guruji Details</CardTitle>
                    <CardDescription>
                      Your professional information visible to clients.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {gurujiProfile ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="specialization">Specialization</Label>
                            <Input 
                              id="specialization" 
                              value={gurujiProfile.specialization || ""}
                              disabled={!isEditing}
                              onChange={(e) => setGurujiProfile({...gurujiProfile, specialization: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="experience">Years of Experience</Label>
                            <Input 
                              id="experience" 
                              type="number"
                              value={gurujiProfile.experience || 0}
                              disabled={!isEditing}
                              onChange={(e) => setGurujiProfile({...gurujiProfile, experience: parseInt(e.target.value, 10)})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="radius">Service Radius (km)</Label>
                            <Input 
                              id="radius" 
                              type="number"
                              value={gurujiProfile.radius}
                              disabled={!isEditing}
                              onChange={(e) => setGurujiProfile({...gurujiProfile, radius: parseInt(e.target.value, 10)})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="rating">Rating</Label>
                            <div className="flex items-center gap-2">
                              <span className="text-yellow-500">{gurujiProfile.rating.toFixed(1)} ★</span>
                              <span className="text-muted-foreground">({gurujiProfile.totalReviews} reviews)</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="bio">Bio</Label>
                          <textarea 
                            id="bio" 
                            className="w-full min-h-[100px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            value={gurujiProfile.bio || ""}
                            disabled={!isEditing}
                            onChange={(e) => setGurujiProfile({...gurujiProfile, bio: e.target.value})}
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-2">
                          <Label>Service Types Offered</Label>
                          <div className="flex flex-wrap gap-2">
                            <div className={`px-4 py-2 rounded-full ${gurujiProfile.isOffline ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                              Offline Services
                            </div>
                            <div className={`px-4 py-2 rounded-full ${gurujiProfile.isOnline ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                              Online Services
                            </div>
                            <div className={`px-4 py-2 rounded-full ${gurujiProfile.isConsultation ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                              Consultations
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <UserCog className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="mt-4">Your guruji profile has not been set up. Please contact the administrator.</p>
                      </div>
                    )}
                  </CardContent>
                  {isEditing && gurujiProfile && (
                    <CardFooter className="flex justify-end space-x-2">
                      <Button onClick={handleCancel} variant="outline">Cancel</Button>
                      <Button onClick={handleSave}>Save Changes</Button>
                    </CardFooter>
                  )}
                </Card>
              </TabsContent>
            )}
            
            {/* Booking History Tab */}
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Booking History</CardTitle>
                  <CardDescription>
                    Your past and upcoming bookings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {bookingsLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  ) : bookingsData && bookingsData.length > 0 ? (
                    <div className="space-y-4">
                      {bookingsData.map((booking: any) => (
                        <div key={booking.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-medium">{booking.pujaName || "Service Booking"}</h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(booking.date).toLocaleDateString('en-US', { 
                                  day: 'numeric', 
                                  month: 'short', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                              booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                              booking.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Type:</span> {booking.type}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Amount:</span> ₹{booking.amount}
                            </div>
                            <div>
                              <span className="text-muted-foreground">City:</span> {booking.city}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Duration:</span> {booking.duration} min
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <History className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="mt-4">You don't have any bookings yet.</p>
                      <Button className="mt-4" variant="outline">Book a Service</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}