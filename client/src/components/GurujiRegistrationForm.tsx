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
import { MapPin, Upload, FileText, UserCheck, AlertCircle, X, Plus, Loader2 } from 'lucide-react';

const gurujiRegistrationSchema = z.object({
  bio: z.string().min(50, 'Bio must be at least 50 characters').max(500, 'Bio must be less than 500 characters'),
  experience: z.coerce.number().min(1, 'Experience must be at least 1 year').max(50, 'Experience cannot exceed 50 years'),
  location: z.string().min(5, 'Location must be at least 5 characters'),
  pricePerHour: z.coerce.number().min(100, 'Price must be at least ₹100').max(10000, 'Price cannot exceed ₹10,000'),
  cities: z.array(z.string()).min(1, 'Select at least 1 city').max(2, 'Maximum 2 cities allowed'),
  pujas: z.array(z.string()).min(1, 'Select at least 1 puja specialization'),
  languages: z.array(z.string()).min(1, 'Select at least 1 language'),
  isOnline: z.boolean().default(false),
  isOffline: z.boolean().default(true),
  isConsultation: z.boolean().default(false),
  aadharNumber: z.string().length(12, 'Aadhar number must be 12 digits'),
  profilePicture: z.string().optional(),
  certificates: z.array(z.string()).optional(),
});

type GurujiRegistrationForm = z.infer<typeof gurujiRegistrationSchema>;

const LANGUAGES = [
  'Hindi', 'English', 'Sanskrit', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 
  'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu', 'Odia'
];

interface GurujiRegistrationFormProps {
  onSuccess?: () => void;
}

// City Searchable Dropdown Component
function CitySearchableDropdown({ cities, selectedCities, onCityToggle, maxSelections }: {
  cities: any[];
  selectedCities: string[];
  onCityToggle: (cityId: string) => void;
  maxSelections: number;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredCities = cities.filter(city => 
    city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    city.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative">
      <Input
        type="text"
        placeholder="Search and select cities (e.g., type 'nag' for Nagpur)..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setIsOpen(true)}
        className="w-full"
      />
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredCities.length > 0 ? (
            filteredCities.map((city: any) => (
              <div
                key={city.id}
                className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer ${
                  selectedCities.length >= maxSelections && !selectedCities.includes(city.id.toString()) 
                    ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => {
                  if (selectedCities.length < maxSelections || selectedCities.includes(city.id.toString())) {
                    onCityToggle(city.id.toString());
                    setSearchTerm('');
                    setIsOpen(false);
                  }
                }}
              >
                <Checkbox
                  checked={selectedCities.includes(city.id.toString())}
                  className="mr-2"
                />
                <span className="text-sm">{city.name}, {city.state}</span>
              </div>
            ))
          ) : (
            <div className="p-3 text-sm text-gray-500">No cities found</div>
          )}
        </div>
      )}
      
      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// Puja Searchable Dropdown Component
function PujaSearchableDropdown({ pujas, selectedPujas, onPujaToggle }: {
  pujas: any[];
  selectedPujas: string[];
  onPujaToggle: (pujaId: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredPujas = pujas.filter(puja => 
    puja.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    puja.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative">
      <Input
        type="text"
        placeholder="Search and select puja specializations..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setIsOpen(true)}
        className="w-full"
      />
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredPujas.length > 0 ? (
            filteredPujas.map((puja: any) => (
              <div
                key={puja.id}
                className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  onPujaToggle(puja.id.toString());
                  setSearchTerm('');
                  setIsOpen(false);
                }}
              >
                <Checkbox
                  checked={selectedPujas.includes(puja.id.toString())}
                  className="mr-2"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{puja.name}</div>
                  {puja.description && (
                    <div className="text-xs text-gray-500 truncate">{puja.description}</div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-3 text-sm text-gray-500">No pujas found</div>
          )}
        </div>
      )}
      
      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export default function GurujiRegistrationForm({ onSuccess }: GurujiRegistrationFormProps) {
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedPujas, setSelectedPujas] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<GurujiRegistrationForm>({
    resolver: zodResolver(gurujiRegistrationSchema),
    defaultValues: {
      bio: '',
      experience: 1,
      location: '',
      pricePerHour: 500,
      cities: [],
      pujas: [],
      languages: [],
      isOnline: false,
      isOffline: true,
      isConsultation: false,
      aadharNumber: '',
      profilePicture: '',
      certificates: [],
    },
  });

  // Fetch cities
  const { data: cities = [] } = useQuery({
    queryKey: ['/api/cities'],
    select: (data: any[]) => data || [],
  });

  // Fetch pujas
  const { data: pujas = [] } = useQuery({
    queryKey: ['/api/pujas'],
    select: (data: any[]) => data || [],
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: (data: GurujiRegistrationForm) =>
      apiRequest('POST', '/api/guruji/register', data),
    onSuccess: () => {
      toast({
        title: 'Application Submitted!',
        description: 'Your Guruji application has been submitted for review. You will be notified once approved.',
      });
      form.reset();
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit your application. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleCityToggle = (cityId: string) => {
    const newCities = selectedCities.includes(cityId)
      ? selectedCities.filter(id => id !== cityId)
      : selectedCities.length < 2 
        ? [...selectedCities, cityId]
        : selectedCities;
    
    setSelectedCities(newCities);
    form.setValue('cities', newCities);
  };

  const handlePujaToggle = (pujaId: string) => {
    const newPujas = selectedPujas.includes(pujaId)
      ? selectedPujas.filter(id => id !== pujaId)
      : [...selectedPujas, pujaId];
    
    setSelectedPujas(newPujas);
    form.setValue('pujas', newPujas);
  };

  const handleLanguageToggle = (language: string) => {
    const newLanguages = selectedLanguages.includes(language)
      ? selectedLanguages.filter(lang => lang !== language)
      : [...selectedLanguages, language];
    
    setSelectedLanguages(newLanguages);
    form.setValue('languages', newLanguages);
  };

  const onSubmit = (data: GurujiRegistrationForm) => {
    submitMutation.mutate(data);
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-6 w-6" />
          Become a Verified Guruji
        </CardTitle>
        <CardDescription>
          Join our platform as a spiritual guide. Your application will be reviewed by our admin team.
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
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Personal Information</h3>
              
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
                    <FormDescription>
                      Minimum 50 characters. This will be shown to customers.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <Input type="number" min="100" max="10000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Andheri West, Mumbai, Maharashtra" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Service Areas */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Service Areas (Maximum 2 cities)
              </h3>
              
              <div className="space-y-4">
                <CitySearchableDropdown 
                  cities={cities} 
                  selectedCities={selectedCities}
                  onCityToggle={handleCityToggle}
                  maxSelections={2}
                />
                
                {selectedCities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedCities.map((cityId) => {
                      const city = cities.find((c: any) => c.id.toString() === cityId);
                      return city ? (
                        <Badge key={cityId} variant="secondary" className="flex items-center gap-1">
                          {city.name}, {city.state}
                          <X 
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => handleCityToggle(cityId)}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Puja Specializations */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Puja Specializations</h3>
              
              <div className="space-y-4">
                <PujaSearchableDropdown 
                  pujas={pujas} 
                  selectedPujas={selectedPujas}
                  onPujaToggle={handlePujaToggle}
                />
                
                {selectedPujas.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedPujas.map((pujaId) => {
                      const puja = pujas.find((p: any) => p.id.toString() === pujaId);
                      return puja ? (
                        <Badge key={pujaId} variant="secondary" className="flex items-center gap-1">
                          {puja.name}
                          <X 
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => handlePujaToggle(pujaId)}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Languages */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Languages</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {LANGUAGES.map((language) => (
                    <div key={language} className="flex items-center space-x-2">
                      <Checkbox
                        id={`lang-${language}`}
                        checked={selectedLanguages.includes(language)}
                        onCheckedChange={() => handleLanguageToggle(language)}
                      />
                      <Label htmlFor={`lang-${language}`} className="text-sm">
                        {language}
                      </Label>
                    </div>
                  ))}
                </div>
                
                {selectedLanguages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedLanguages.map((language) => (
                      <Badge key={language} variant="secondary" className="flex items-center gap-1">
                        {language}
                        <X 
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleLanguageToggle(language)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Service Types */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Service Types</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="isOffline"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Offline Services
                        </FormLabel>
                        <FormDescription>
                          Visit customer location for pujas
                        </FormDescription>
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
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Online Services
                        </FormLabel>
                        <FormDescription>
                          Conduct pujas via video call
                        </FormDescription>
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
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Consultations
                        </FormLabel>
                        <FormDescription>
                          Provide spiritual guidance
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Verification Documents */}
            <div className="space-y-6">
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
                      Required for identity verification. Your Aadhar details are kept secure and confidential.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <Label>Profile Picture (Optional)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Upload your profile picture</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 5MB</p>
                  <Button type="button" variant="outline" className="mt-2" size="sm">
                    Choose File
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline">
                Save as Draft
              </Button>
              <Button 
                type="submit" 
                disabled={submitMutation.isPending}
                className="min-w-[150px]"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}