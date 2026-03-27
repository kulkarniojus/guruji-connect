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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { MapPin, Upload, FileText, UserCheck, AlertCircle, X, Loader2, Video } from 'lucide-react';

const gurujiRegistrationSchema = z.object({
  firstName: z.string().min(2, 'First name required'),
  lastName: z.string().min(2, 'Last name required'),
  email: z.string().optional(),
  mobile: z.string().optional(),
  age: z.coerce.number().min(18, 'Must be at least 18').max(100, 'Invalid age'),
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

const LANGUAGES = [
  'Hindi', 'English', 'Sanskrit', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 
  'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu', 'Odia'
];

const RELIGIONS = ['Hindu', 'Buddhist', 'Jain', 'Sikh', 'Other'];

interface GurujiRegistrationFormProps {
  onSuccess?: () => void;
}

function PujaDropdown({ pujas, selectedPujas, onToggle }: {
  pujas: any[];
  selectedPujas: string[];
  onToggle: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = pujas.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <Input
        placeholder="Search and select puja specializations..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {filtered.length > 0 ? filtered.map((p: any) => (
              <div
                key={p.id}
                className="flex items-center gap-2 p-3 hover:bg-orange-50 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(p.id.toString());
                  setSearch('');
                  setOpen(false);
                }}
              >
                <Checkbox
                  checked={selectedPujas.includes(p.id.toString())}
                  className="pointer-events-none"
                />
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  {p.description && <div className="text-xs text-gray-500">{p.description}</div>}
                </div>
              </div>
            )) : (
              <div className="p-3 text-sm text-gray-500">No pujas found</div>
            )}
          </div>
        </>
      )}
    </div>
  );
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

  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ['/api/cities'],
    select: (data: any[]) => data || [],
  });

  const { data: pujas = [], isLoading: pujasLoading } = useQuery({
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

  const handlePujaToggle = (id: string) => {
    const updated = selectedPujas.includes(id)
      ? selectedPujas.filter(x => x !== id)
      : [...selectedPujas, id];
    setSelectedPujas(updated);
    form.setValue('pujas', updated);
  };

  const handleServiceAreaToggle = (cityId: string) => {
    const updated = selectedServiceAreas.includes(cityId)
      ? selectedServiceAreas.filter(x => x !== cityId)
      : [...selectedServiceAreas, cityId];
    setSelectedServiceAreas(updated);
    form.setValue('serviceAreas', updated);
  };

  const handleLanguageToggle = (lang: string) => {
    const updated = selectedLanguages.includes(lang)
      ? selectedLanguages.filter(x => x !== lang)
      : [...selectedLanguages, lang];
    setSelectedLanguages(updated);
    form.setValue('languages', updated);
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
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Service Areas</h3>
              <FormDescription>Select cities where you can provide services</FormDescription>
              
              {citiesLoading ? (
                <div className="text-sm text-gray-500">Loading cities...</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 border rounded-lg p-4 max-h-48 overflow-y-auto">
                  {cities.map((c: any) => (
                    <div key={c.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`city-${c.id}`}
                        checked={selectedServiceAreas.includes(c.id.toString())}
                        onCheckedChange={() => handleServiceAreaToggle(c.id.toString())}
                      />
                      <Label htmlFor={`city-${c.id}`} className="text-sm cursor-pointer">
                        {c.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {selectedServiceAreas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedServiceAreas.map(id => {
                    const city = cities.find((c: any) => c.id.toString() === id);
                    return city ? (
                      <Badge key={id} variant="secondary" className="flex items-center gap-1">
                        {city.name}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => handleServiceAreaToggle(id)} />
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
              {form.formState.errors.serviceAreas && (
                <p className="text-sm text-red-500">{form.formState.errors.serviceAreas.message}</p>
              )}
            </div>

            <Separator />

            {/* Puja Specializations */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Puja Specializations</h3>

              {pujasLoading ? (
                <div className="text-sm text-gray-500">Loading pujas...</div>
              ) : (
                <PujaDropdown
                  pujas={pujas}
                  selectedPujas={selectedPujas}
                  onToggle={handlePujaToggle}
                />
              )}

              {selectedPujas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedPujas.map(id => {
                    const puja = pujas.find((p: any) => p.id.toString() === id);
                    return puja ? (
                      <Badge key={id} variant="secondary" className="flex items-center gap-1">
                        {puja.name}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => handlePujaToggle(id)} />
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
              {form.formState.errors.pujas && (
                <p className="text-sm text-red-500">{form.formState.errors.pujas.message}</p>
              )}
            </div>

            <Separator />

            {/* Languages */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Languages</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {LANGUAGES.map(lang => (
                  <div key={lang} className="flex items-center space-x-2">
                    <Checkbox
                      id={`lang-${lang}`}
                      checked={selectedLanguages.includes(lang)}
                      onCheckedChange={() => handleLanguageToggle(lang)}
                    />
                    <Label htmlFor={`lang-${lang}`} className="text-sm cursor-pointer">
                      {lang}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedLanguages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedLanguages.map(lang => (
                    <Badge key={lang} variant="secondary" className="flex items-center gap-1">
                      {lang}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => handleLanguageToggle(lang)} />
                    </Badge>
                  ))}
                </div>
              )}
              {form.formState.errors.languages && (
                <p className="text-sm text-red-500">{form.formState.errors.languages.message}</p>
              )}
            </div>

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
