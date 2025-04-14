import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogClose 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Loader2, 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Info, 
  Award, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  Calendar,
  AlertTriangle 
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Types
interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  age: number;
  gender: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  aadhar?: string;
  caste?: string;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: string;
}

interface GurujiProfile {
  id: number;
  userId: number;
  user?: User;
  bio?: string;
  experience?: number;
  specialization?: string;
  location: string;
  radius?: number;
  pricePerHour: number;
  isOnline: boolean;
  isOffline: boolean;
  isConsultation: boolean;
  isAvailable: boolean;
  aadharVerified: boolean;
  documentsVerified: boolean;
  verificationDate?: string;
  rating: number;
  totalReviews: number;
  languages?: string[];
  certificates?: string[];
  profilePictureUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApplicationStatus {
  status: 'pending' | 'approved' | 'rejected' | 'all';
}

// Main Component
export function GurujiApplicationManagement({ status }: ApplicationStatus) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<GurujiProfile | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('personal');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch guruji profiles
  const { 
    data: gurujiProfiles, 
    isLoading, 
    error 
  } = useQuery<GurujiProfile[]>({
    queryKey: ['/api/admin/gurujis'],
    // Simulating API behavior - this would be replaced with actual API in production
    queryFn: async () => {
      // In a real application, this should call the server API
      // For now we'll return mock data that matches our expected schema
      // Mock data should include profiles with pending, approved, and rejected status
      return getMockGurujiProfiles();
    }
  });

  // Mock guruji profiles for demo purposes
  // In a real implementation, this data would come from the API
  const getMockGurujiProfiles = () => {
    return [
      {
        id: 1,
        userId: 101,
        user: {
          id: 101,
          firstName: "Ramesh",
          lastName: "Sharma",
          email: "ramesh.sharma@example.com",
          mobile: "+91 9876543210",
          age: 45,
          gender: "Male",
          address: "123 Temple Street",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400001",
          aadhar: "XXXX-XXXX-1234",
          isVerified: false,
          isBlocked: false,
          createdAt: "2023-01-15T10:30:00Z"
        },
        bio: "I am a traditional Vedic priest with over 20 years of experience performing various pujas and rituals.",
        experience: 20,
        specialization: "Satyanarayan Puja, Griha Pravesh",
        location: "Mumbai, Maharashtra",
        radius: 25,
        pricePerHour: 1500,
        isOnline: true,
        isOffline: true,
        isConsultation: true,
        isAvailable: true,
        aadharVerified: false,
        documentsVerified: false,
        verificationDate: null,
        rating: 0,
        totalReviews: 0,
        languages: ["Hindi", "Marathi", "English", "Sanskrit"],
        certificates: ["Vedic_Education.jpg", "Priest_Training_Certificate.jpg"],
        profilePictureUrl: "https://randomuser.me/api/portraits/men/32.jpg",
        createdAt: "2023-01-15T10:30:00Z",
        updatedAt: "2023-01-15T10:30:00Z",
        applicationStatus: "pending"
      },
      {
        id: 2,
        userId: 102,
        user: {
          id: 102,
          firstName: "Sunita",
          lastName: "Acharya",
          email: "sunita.acharya@example.com",
          mobile: "+91 9765432109",
          age: 38,
          gender: "Female",
          address: "45 Divine Avenue",
          city: "Pune",
          state: "Maharashtra",
          pincode: "411001",
          aadhar: "XXXX-XXXX-5678",
          isVerified: false,
          isBlocked: false,
          createdAt: "2023-02-20T14:15:00Z"
        },
        bio: "Specialized in traditional women's ceremonies with a focus on Mangalagaur and Satyanarayan pujas.",
        experience: 15,
        specialization: "Mangalagaur, Women's ceremonies",
        location: "Pune, Maharashtra",
        radius: 15,
        pricePerHour: 1200,
        isOnline: true,
        isOffline: true,
        isConsultation: false,
        isAvailable: true,
        aadharVerified: false,
        documentsVerified: false,
        verificationDate: null,
        rating: 0,
        totalReviews: 0,
        languages: ["Hindi", "Marathi", "English"],
        certificates: ["Traditional_Rituals_Certificate.jpg"],
        profilePictureUrl: "https://randomuser.me/api/portraits/women/45.jpg",
        createdAt: "2023-02-20T14:15:00Z",
        updatedAt: "2023-02-20T14:15:00Z",
        applicationStatus: "pending"
      },
      {
        id: 3,
        userId: 103,
        user: {
          id: 103,
          firstName: "Mohan",
          lastName: "Joshi",
          email: "mohan.joshi@example.com",
          mobile: "+91 9567432108",
          age: 60,
          gender: "Male",
          address: "78 Spiritual Lane",
          city: "Varanasi",
          state: "Uttar Pradesh",
          pincode: "221001",
          aadhar: "XXXX-XXXX-9012",
          isVerified: true,
          isBlocked: false,
          createdAt: "2023-03-05T09:45:00Z"
        },
        bio: "Senior priest from Varanasi with expertise in traditional Vedic rituals and astrological consultations.",
        experience: 40,
        specialization: "Vedic rituals, Astrological consultations",
        location: "Varanasi, Uttar Pradesh",
        radius: 20,
        pricePerHour: 2000,
        isOnline: true,
        isOffline: true,
        isConsultation: true,
        isAvailable: true,
        aadharVerified: true,
        documentsVerified: true,
        verificationDate: "2023-03-10T12:00:00Z",
        rating: 4.8,
        totalReviews: 25,
        languages: ["Hindi", "Sanskrit", "English"],
        certificates: ["Vedic_Expert.jpg", "Astrology_Certificate.jpg", "Varanasi_Temple_Recognition.jpg"],
        profilePictureUrl: "https://randomuser.me/api/portraits/men/67.jpg",
        createdAt: "2023-03-05T09:45:00Z",
        updatedAt: "2023-03-10T12:00:00Z",
        applicationStatus: "approved"
      },
      {
        id: 4,
        userId: 104,
        user: {
          id: 104,
          firstName: "Bhaskar",
          lastName: "Rao",
          email: "bhaskar.rao@example.com",
          mobile: "+91 9876543219",
          age: 42,
          gender: "Male",
          address: "23 Devotion Road",
          city: "Bangalore",
          state: "Karnataka",
          pincode: "560001",
          aadhar: "XXXX-XXXX-3456",
          isVerified: false,
          isBlocked: false,
          createdAt: "2023-01-25T11:30:00Z"
        },
        bio: "Tech-savvy modern priest specializing in online consultations and simplified rituals.",
        experience: 12,
        specialization: "Online pujas, Simplified rituals",
        location: "Bangalore, Karnataka",
        radius: 30,
        pricePerHour: 1000,
        isOnline: true,
        isOffline: false,
        isConsultation: true,
        isAvailable: true,
        aadharVerified: false,
        documentsVerified: false,
        verificationDate: null,
        rating: 0,
        totalReviews: 0,
        languages: ["Kannada", "English", "Hindi", "Telugu"],
        certificates: ["Modern_Priesthood_Course.jpg"],
        profilePictureUrl: "https://randomuser.me/api/portraits/men/22.jpg",
        createdAt: "2023-01-25T11:30:00Z",
        updatedAt: "2023-01-25T11:30:00Z",
        applicationStatus: "pending"
      },
      {
        id: 5,
        userId: 105,
        user: {
          id: 105,
          firstName: "Lakshmi",
          lastName: "Gupta",
          email: "lakshmi.gupta@example.com",
          mobile: "+91 9765432187",
          age: 35,
          gender: "Female",
          address: "56 Sacred Circle",
          city: "Chennai",
          state: "Tamil Nadu",
          pincode: "600001",
          aadhar: "XXXX-XXXX-7890",
          isVerified: false,
          isBlocked: false,
          createdAt: "2023-02-10T13:20:00Z"
        },
        bio: "Specializing in Tamil rituals and ceremonies with a modern approach.",
        experience: 8,
        specialization: "Tamil rituals, Modern ceremonies",
        location: "Chennai, Tamil Nadu",
        radius: 20,
        pricePerHour: 1300,
        isOnline: true,
        isOffline: true,
        isConsultation: true,
        isAvailable: true,
        aadharVerified: false,
        documentsVerified: false,
        verificationDate: null,
        rating: 0,
        totalReviews: 0,
        languages: ["Tamil", "English", "Telugu"],
        certificates: ["Tamil_Rituals_Expert.jpg", "Cultural_Heritage_Certificate.jpg"],
        profilePictureUrl: "https://randomuser.me/api/portraits/women/28.jpg",
        createdAt: "2023-02-10T13:20:00Z",
        updatedAt: "2023-02-10T13:20:00Z",
        applicationStatus: "rejected"
      }
    ];
  };

  // Filter profiles based on the selected status
  const filteredProfiles = gurujiProfiles?.filter((profile: any) => {
    if (status === 'all') return true;
    return profile.applicationStatus === status;
  }) || [];

  // Further filter profiles based on search query
  const searchedProfiles = filteredProfiles.filter((profile) => {
    const searchText = searchQuery.toLowerCase();
    const userFullName = `${profile.user?.firstName} ${profile.user?.lastName}`.toLowerCase();
    const userEmail = profile.user?.email.toLowerCase();
    const userMobile = profile.user?.mobile.toLowerCase();
    const location = profile.location.toLowerCase();
    
    return (
      userFullName.includes(searchText) ||
      userEmail.includes(searchText) ||
      userMobile.includes(searchText) ||
      location.includes(searchText) ||
      profile.specialization?.toLowerCase().includes(searchText)
    );
  });

  // Approve application mutation
  const approveApplicationMutation = useMutation({
    mutationFn: async (id: number) => {
      // In a real app, this would call the API
      // For demo purposes, we'll simulate success
      // apiRequest('PUT', `/api/admin/gurujis/${id}/approve`, {})
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/gurujis'] });
      toast({
        title: 'Success',
        description: 'Guruji application has been approved',
        variant: 'default',
      });
      setIsDetailsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve application',
        variant: 'destructive',
      });
    }
  });

  // Reject application mutation
  const rejectApplicationMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number, reason: string }) => {
      // In a real app, this would call the API
      // For demo purposes, we'll simulate success
      // apiRequest('PUT', `/api/admin/gurujis/${id}/reject`, { reason })
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/gurujis'] });
      toast({
        title: 'Success',
        description: 'Guruji application has been rejected',
        variant: 'default',
      });
      setIsRejectDialogOpen(false);
      setIsDetailsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject application',
        variant: 'destructive',
      });
    }
  });

  // View application details
  const handleViewDetails = (profile: GurujiProfile) => {
    setSelectedProfile(profile);
    setIsDetailsDialogOpen(true);
  };

  // Handle approve application
  const handleApproveApplication = () => {
    if (selectedProfile) {
      approveApplicationMutation.mutate(selectedProfile.id);
    }
  };

  // Handle reject application
  const handleRejectApplication = () => {
    setIsRejectDialogOpen(true);
  };

  // Submit rejection
  const handleSubmitRejection = () => {
    if (selectedProfile && rejectionReason) {
      rejectApplicationMutation.mutate({ 
        id: selectedProfile.id, 
        reason: rejectionReason 
      });
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          {status === 'pending' && 'Pending Applications'}
          {status === 'approved' && 'Approved Gurujis'}
          {status === 'rejected' && 'Rejected Applications'}
          {status === 'all' && 'All Guruji Profiles'}
        </h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search applications..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center text-red-500 p-4 border border-red-200 rounded-md">
          Error loading applications. Please try again.
        </div>
      ) : searchedProfiles.length === 0 ? (
        <div className="text-center p-8 border rounded-md">
          <p className="text-muted-foreground">No applications found matching your criteria.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Applied On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {searchedProfiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">
                    {profile.user?.firstName} {profile.user?.lastName}
                  </TableCell>
                  <TableCell>{profile.location}</TableCell>
                  <TableCell>{profile.experience} years</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {profile.specialization || 'Not specified'}
                  </TableCell>
                  <TableCell>{formatDate(profile.createdAt)}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        profile.applicationStatus === 'approved' 
                          ? 'default' 
                          : profile.applicationStatus === 'rejected'
                            ? 'destructive'
                            : 'outline'
                      }
                    >
                      {profile.applicationStatus === 'pending' && 'Pending Review'}
                      {profile.applicationStatus === 'approved' && 'Approved'}
                      {profile.applicationStatus === 'rejected' && 'Rejected'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleViewDetails(profile)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Application Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Guruji Application Details</DialogTitle>
          </DialogHeader>

          {selectedProfile && (
            <div>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="md:w-1/3">
                  <div className="rounded-lg overflow-hidden border aspect-square">
                    {selectedProfile.profilePictureUrl ? (
                      <img 
                        src={selectedProfile.profilePictureUrl} 
                        alt={`${selectedProfile.user?.firstName} ${selectedProfile.user?.lastName}`} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <User className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="md:w-2/3">
                  <h2 className="text-2xl font-bold mb-2">
                    {selectedProfile.user?.firstName} {selectedProfile.user?.lastName}
                  </h2>
                  <div className="flex items-center text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{selectedProfile.location}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="outline">
                      {selectedProfile.experience} Years Experience
                    </Badge>
                    {selectedProfile.languages?.map((language, index) => (
                      <Badge key={index} variant="secondary">
                        {language}
                      </Badge>
                    ))}
                  </div>
                  <p className="mb-4">{selectedProfile.bio}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Phone className="h-4 w-4 mr-2" />
                      <span>{selectedProfile.user?.mobile}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Mail className="h-4 w-4 mr-2" />
                      <span>{selectedProfile.user?.email}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Applied on {formatDate(selectedProfile.createdAt)}</span>
                    </div>
                    <div className="flex items-center">
                      <Badge 
                        variant={
                          selectedProfile.applicationStatus === 'approved' 
                            ? 'default' 
                            : selectedProfile.applicationStatus === 'rejected'
                              ? 'destructive'
                              : 'outline'
                        }
                      >
                        {selectedProfile.applicationStatus === 'pending' && 'Pending Review'}
                        {selectedProfile.applicationStatus === 'approved' && 'Approved'}
                        {selectedProfile.applicationStatus === 'rejected' && 'Rejected'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="personal">
                    <User className="h-4 w-4 mr-2" />
                    Personal Info
                  </TabsTrigger>
                  <TabsTrigger value="professional">
                    <Award className="h-4 w-4 mr-2" />
                    Professional Info
                  </TabsTrigger>
                  <TabsTrigger value="certificates">
                    <FileText className="h-4 w-4 mr-2" />
                    Certificates
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="personal">
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Full Name</h4>
                          <p>{selectedProfile.user?.firstName} {selectedProfile.user?.lastName}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Age</h4>
                          <p>{selectedProfile.user?.age} years</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Gender</h4>
                          <p>{selectedProfile.user?.gender}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Email</h4>
                          <p>{selectedProfile.user?.email}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Mobile</h4>
                          <p>{selectedProfile.user?.mobile}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Aadhar</h4>
                          <p>{selectedProfile.user?.aadhar || 'Not provided'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Address</h4>
                          <p>
                            {selectedProfile.user?.address}, {selectedProfile.user?.city}, {selectedProfile.user?.state} - {selectedProfile.user?.pincode}
                          </p>
                        </div>
                        {selectedProfile.user?.caste && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Caste</h4>
                            <p>{selectedProfile.user?.caste}</p>
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Aadhar Verification</h4>
                          <Badge variant={selectedProfile.aadharVerified ? "default" : "outline"}>
                            {selectedProfile.aadharVerified ? "Verified" : "Not Verified"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="professional">
                  <Card>
                    <CardHeader>
                      <CardTitle>Professional Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Experience</h4>
                          <p>{selectedProfile.experience} years</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Service Location</h4>
                          <p>{selectedProfile.location}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Service Radius</h4>
                          <p>{selectedProfile.radius} km</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Price Per Hour</h4>
                          <p>₹{selectedProfile.pricePerHour}</p>
                        </div>
                        <div className="md:col-span-2">
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Specialization</h4>
                          <p>{selectedProfile.specialization || 'Not specified'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Languages</h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedProfile.languages?.map((language, index) => (
                              <Badge key={index} variant="secondary">
                                {language}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Service Types</h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedProfile.isOnline && (
                              <Badge variant="outline">Online</Badge>
                            )}
                            {selectedProfile.isOffline && (
                              <Badge variant="outline">In-Person</Badge>
                            )}
                            {selectedProfile.isConsultation && (
                              <Badge variant="outline">Consultation</Badge>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Document Verification</h4>
                          <Badge variant={selectedProfile.documentsVerified ? "default" : "outline"}>
                            {selectedProfile.documentsVerified ? "Verified" : "Not Verified"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="certificates">
                  <Card>
                    <CardHeader>
                      <CardTitle>Uploaded Certificates</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedProfile.certificates && selectedProfile.certificates.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedProfile.certificates.map((certificate, index) => (
                            <div key={index} className="border rounded-md p-2">
                              <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                <span className="text-sm font-medium">{certificate}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-6">
                          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No certificates uploaded</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DialogFooter className="mt-6">
            {selectedProfile?.applicationStatus === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={handleRejectApplication}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={handleApproveApplication}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
            {selectedProfile?.applicationStatus === 'approved' && (
              <Button
                variant="outline"
                onClick={handleRejectApplication}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Revoke Approval
              </Button>
            )}
            {selectedProfile?.applicationStatus === 'rejected' && (
              <Button
                onClick={handleApproveApplication}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Rejection Reason</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-sm text-muted-foreground">
              Please provide a reason for rejecting this application. This information will be shared with the applicant.
            </p>
            <Label htmlFor="rejectionReason">Reason</Label>
            <Input
              id="rejectionReason"
              className="mt-2"
              placeholder="Enter rejection reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleSubmitRejection}
              disabled={!rejectionReason.trim()}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}