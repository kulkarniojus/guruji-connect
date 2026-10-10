import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { MapPin, Upload, FileText, UserCheck, AlertCircle, Loader2, Video } from 'lucide-react';
import { LanguagesField, PujaSpecializationsField, ServiceAreasField } from '@/components/GurujiSelectionFields';

const gurujiRegistrationSchema = z.object({
  firstName: z.string().min(2, 'First name required'),
  lastName: z.string().min(2, 'Last name required'),
  email: z.string().optional(),
  mobile: z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits'),
  age: z.coerce.number().min(18, 'Must be at least 18').max(100, 'Invalid age'),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dob: z.string().optional(),
  caste: z.string().optional(),
  religion: z.string().min(2, 'Religion required'),
  bio: z.string().min(50, 'Bio must be at least 50 characters').max(500, 'Bio must be less than 500 characters'),
  experience: z.coerce.number().min(1, 'Experience must be at least 1 year').max(50, 'Experience cannot exceed 50 years'),
  address: z.string().min(5, 'Full address required'),
  city: z.string().min(2, 'City required'),
  state: z.string().min(2, 'State required'),
  pincode: z.string().length(6, 'Pincode must be 6 digits'),
  pricePerHour: z.coerce.number().min(100, 'Price must be at least ₹100').max(50000, 'Price cannot exceed ₹50,000'),
  serviceAreas: z.array(z.string()).min(1, 'Select at least 1 service city'),
  pujas: z.array(z.string()).min(1, 'Select at least 1 puja specialization'),
  languages: z.array(z.string()).min(1, 'Select at least 1 language'),
  isOnline: z.boolean().default(false),
  isOffline: z.boolean().default(true),
  isConsultation: z.boolean().default(false),
  aadharNumber: z.string().length(12, 'Aadhar number must be 12 digits'),
  profilePicture: z.string().optional(),
  videoUrl: z.string().optional(),
  certificates: z.array(z.string()).optional(),
});

type GurujiRegistrationFormData = z.infer<typeof gurujiRegistrationSchema>;

const RELIGIONS = ['Hindu', 'Buddhist', 'Jain', 'Sikh', 'Other'];

interface GurujiRegistrationFormProps {
  onSuccess?: () => void;
}

export default function GurujiRegistrationForm({ onSuccess }: GurujiRegistrationFormProps) {
  const [selectedPujas, setSelectedPujas] = useState<string[]>([]);
  const [selectedServiceAreas, setSelectedServiceAreas] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Detect if current user is a sales rep
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
  });
  const isSalesRep = currentUser?.role === 'sales' || currentUser?.role === 'sales_rep';

  const form = useForm<GurujiRegistrationFormData>({
    resolver: zodResolver(gurujiRegistrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      mobile: '',
      age: 30,
      gender: undefined,
      dob: '',
      caste: '',
      religion: '',
      bio: '',
      experience: 1,
      address: '',
      city: '',
      state: '',
      pincode: '',
      pricePerHour: 500,
      serviceAreas: [],
      pujas: [],
      languages: [],
      isOnline: false,
      isOffline: true,
      isConsultation: false,
      aadharNumber: '',
      profilePicture: '',
      videoUrl: '',
      certificates: [],
    },
  });

  const { data: cities = [], isLoading: citiesLoading, isError: citiesError } = useQuery({
    queryKey: ['/api/cities'],
    select: (data: any[]) => data || [],
  });

  const { data: pujas = [], isLoading: pujasLoading, isError: pujasError } = useQuery({
    queryKey: ['/api/pujas'],
    select: (data: any[]) => data || [],
  });

  const submitMutation = useMutation({
    mutationFn: (data: GurujiRegistrationFormData) =>
      apiRequest('POST', '/api/guruji/register', {
        ...data,
        pujas: selectedPujas,
        cities: selectedServiceAreas,
        languages: selectedLanguages,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['/api/auth/me']});
      queryClient.invalidateQueries({queryKey: ['/api/guruji/profile']});
      toast({
        title: 'Application Submitted!',
        description: isSalesRep
          ? 'The Guruji has been registered and their application is pending admin review.'
          : 'Your Guruji application has been submitted for review. You will be notified once approved.',
      });
      form.reset();
      setSelectedPujas([]);
      setSelectedServiceAreas([]);
      setSelectedLanguages([]);
      onSuccess?.();
    },
    onError: (err: any) => {
      toast({
        title: 'Submission Failed',
        description: err?.message || 'Failed to submit the application. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handlePujasChange = (values: string[]) => {
    setSelectedPujas(values);
    form.setValue('pujas', values, { shouldValidate: true });
  };

  const handleServiceAreasChange = (values: string[]) => {
    setSelectedServiceAreas(values);
    form.setValue('serviceAreas', values, { shouldValidate: true });
  };

  const handleLanguagesChange = (values: string[]) => {
    setSelectedLanguages(values);
    form.setValue('languages', values, { shouldValidate: true });
  };

  const onSubmit = (data: GurujiRegistrationFormData) => {
    if (isSalesRep) {
      if (!data.email || !data.email.includes('@')) {
        toast({ title: 'Email required', description: 'Please enter the Guruji\'s email address.', variant: 'destructive' });
        return;
      }
      if (!data.mobile || data.mobile.length !== 10) {
        toast({ title: 'Mobile required', description: 'Please enter a valid 10-digit mobile number.', variant: 'destructive' });
        return;
      }
    }
    submitMutation.mutate({
      ...data,
      pujas: selectedPujas,
      serviceAreas: selectedServiceAreas,
      languages: selectedLanguages,
    });
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-6 w-6" />
          {isSalesRep ? 'Register a New Guruji' : 'Become a Verified Guruji'}
        </CardTitle>
        <CardDescription>
          {isSalesRep
            ? 'Register a new spiritual guide on their behalf. They will receive login credentials via their mobile number.'
            : 'Join our platform as a spiritual guide. Your application will be reviewed by our admin team.'}
        </CardDescription>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Application Review Process</p>
              <p className="text-amber-700 mt-1">
                All applications undergo verification including Aadhar verification, document review, and background checks. 
                This process typically takes 3-5 business days.
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter first name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Phone number - required for all gurujis */}
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="10-digit mobile number" maxLength={10} {...field} />
                    </FormControl>
                    <FormDescription>Enter your 10-digit phone number. This will be used as your password.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Gender, DOB, Caste */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dob"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="caste"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Caste (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="General / OBC / SC / ST" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Sales rep: collect email & mobile for the new guruji's account */}
              {isSalesRep && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-blue-800 mb-3">Guruji Login Credentials</p>
                    <p className="text-xs text-blue-600">These will be used to create the Guruji's account. Their initial password will be their mobile number.</p>
                  </div>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guruji Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="guruji@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guruji Mobile Number *</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="10-digit mobile number" maxLength={10} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input type="number" min="18" max="100" placeholder="Enter your age" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="religion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Religion</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select religion" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {RELIGIONS.map(r => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio / Introduction</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell us about yourself, your spiritual journey, and why you want to be a Guruji..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>Minimum 50 characters. This will be shown to customers.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Years of Experience</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" max="50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pricePerHour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per Hour (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" min="100" max="50000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Details
              </h3>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Address</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 123 Laxmi Nagar, Near Temple" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Nagpur" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Maharashtra" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode</FormLabel>
                      <FormControl>
                        <Input placeholder="6-digit pincode" maxLength={6} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Service Areas */}
            <ServiceAreasField
              cities={cities}
              isLoading={citiesLoading}
              isError={citiesError}
              selected={selectedServiceAreas}
              onChange={handleServiceAreasChange}
              error={form.formState.errors.serviceAreas?.message}
              required
            />

            <Separator />

            {/* Puja Specializations */}
            <PujaSpecializationsField
              pujas={pujas}
              isLoading={pujasLoading}
              isError={pujasError}
              selected={selectedPujas}
              onChange={handlePujasChange}
              error={form.formState.errors.pujas?.message}
              required
            />

            <Separator />

            {/* Languages */}
            <LanguagesField
              selected={selectedLanguages}
              onChange={handleLanguagesChange}
              error={form.formState.errors.languages?.message}
              required
            />

            <Separator />

            {/* Service Types */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Service Types</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="isOffline"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Offline Services</FormLabel>
                        <FormDescription>Visit customer location for pujas</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isOnline"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Online Services</FormLabel>
                        <FormDescription>Conduct pujas via video call</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isConsultation"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Consultations</FormLabel>
                        <FormDescription>Provide spiritual guidance</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Verification Documents */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Verification Documents
              </h3>

              <FormField
                control={form.control}
                name="aadharNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aadhar Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter 12-digit Aadhar number"
                        maxLength={12}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Required for identity verification. Kept secure and confidential.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label>Profile Picture (Optional)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Upload your profile picture</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 5MB</p>
                  <Button type="button" variant="outline" size="sm" className="mt-3">
                    Choose File
                  </Button>
                </div>
              </div>

              <FormField
                control={form.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Introduction Video URL (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Paste YouTube or Google Drive video link"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Share a short video (1-3 min) introducing yourself and your services. This helps customers connect with you.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label>Certificates / Documents (Optional)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Upload certificates or qualification documents</p>
                  <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG up to 10MB each</p>
                  <Button type="button" variant="outline" size="sm" className="mt-3">
                    Choose Files
                  </Button>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-orange-600 hover:bg-orange-700"
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting Application...
                </>
              ) : (
                'Submit Guruji Application'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
