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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { registerUser } from '@/lib/auth';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginClick: () => void;
}

// Multi-select Dropdown Component for Cities (Max 2)
function CityMultiSelect({ cities, selectedCities, onCityToggle, maxSelections }: {
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
    <div className="space-y-2">
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
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
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
        
        {isOpen && (
          <div 
            className="fixed inset-0 z-0" 
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
      
      {selectedCities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCities.map((cityId) => {
            const city = cities.find((c: any) => c.id.toString() === cityId);
            return city ? (
              <Badge key={cityId} variant="secondary" className="flex items-center gap-1">
                {city.name}, {city.state}
                <X 
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onCityToggle(cityId)}
                />
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

// Multi-select Dropdown Component for Pujas
function PujaMultiSelect({ pujas, selectedPujas, onPujaToggle }: {
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
    <div className="space-y-2">
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
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
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
        
        {isOpen && (
          <div 
            className="fixed inset-0 z-0" 
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
      
      {selectedPujas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedPujas.map((pujaId) => {
            const puja = pujas.find((p: any) => p.id.toString() === pujaId);
            return puja ? (
              <Badge key={pujaId} variant="secondary" className="flex items-center gap-1">
                {puja.name}
                <X 
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onPujaToggle(pujaId)}
                />
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  mobile: z.string().length(10, 'Mobile number must be 10 digits'),
  age: z.coerce.number().min(18, 'You must be at least 18 years old'),
  gender: z.enum(['male', 'female', 'other'], {
    required_error: 'Please select a gender',
  }),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  registrationType: z.enum(['customer', 'guruji'], {
    required_error: 'Please select a registration type',
  }),
  aadhar: z.string().optional(),
  caste: z.string().optional(),
  // Additional fields for Guruji registration
  experience: z.coerce.number().min(0, 'Experience must be a positive number').optional(),
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  location: z.string().optional(),
  languages: z.string().optional(),
  terms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions',
  }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterModal({ isOpen, onClose, onLoginClick }: RegisterModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedPujas, setSelectedPujas] = useState<string[]>([]);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      mobile: '',
      age: undefined,
      gender: undefined,
      password: '',
      registrationType: 'customer', // Default to customer registration
      aadhar: '',
      caste: '',
      experience: undefined,
      specialization: '',
      qualification: '',
      location: '',
      languages: '',
      terms: false
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      // Call the actual registration API
      const result = await registerUser(data);
      
      if (result.success) {
        toast({
          title: 'Registration Successful',
          description: result.message,
        });
        onClose();
        form.reset();
        
        // Redirect all users to dashboard (both customers and gurujis)
        setLocation('/dashboard');
      } else {
        toast({
          title: 'Registration Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to register. Please try again.',
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-white border border-gray-200">
        <DialogHeader className="bg-white border-b border-gray-100 pb-4">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Create Your Account
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 flex-1 overflow-y-auto pr-2 bg-white" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
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
                    <FormLabel>Mobile Number *</FormLabel>
                    <FormControl>
                      <Input 
                        type="tel" 
                        {...field} 
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 10) {
                            field.onChange(value);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
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
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="registrationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Type *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="guruji">Guruji</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="aadhar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aadhar Number (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Additional fields for Guruji registration */}
              {form.watch('registrationType') === 'guruji' && (
                <>
                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Years of Experience *</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} placeholder="e.g. 5" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="specialization"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Puja Specializations *</FormLabel>
                        <FormControl>
                          <PujaMultiSelect 
                            pujas={pujas}
                            selectedPujas={selectedPujas}
                            onPujaToggle={(pujaId) => {
                              const newPujas = selectedPujas.includes(pujaId)
                                ? selectedPujas.filter(id => id !== pujaId)
                                : [...selectedPujas, pujaId];
                              setSelectedPujas(newPujas);
                              field.onChange(newPujas.join(','));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="qualification"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qualification *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Jyotish Acharya, Sanskrit Scholar" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Cities * (Maximum 2)</FormLabel>
                        <FormControl>
                          <CityMultiSelect 
                            cities={cities}
                            selectedCities={selectedCities}
                            maxSelections={2}
                            onCityToggle={(cityId) => {
                              const newCities = selectedCities.includes(cityId)
                                ? selectedCities.filter(id => id !== cityId)
                                : selectedCities.length < 2 
                                  ? [...selectedCities, cityId]
                                  : selectedCities;
                              setSelectedCities(newCities);
                              field.onChange(newCities.join(','));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="languages"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Languages Known *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Hindi, English, Sanskrit" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              
              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2 flex flex-row items-start space-x-3 space-y-0 py-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>I agree to the Terms and Conditions *</FormLabel>
                      <p className="text-sm text-neutral-500">
                        By registering, you agree to our{" "}
                        <a href="/terms" className="text-primary hover:text-primary-500">Terms of Service</a>
                        {" "}and{" "}
                        <a href="/privacy" className="text-primary hover:text-primary-500">Privacy Policy</a>.
                      </p>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="col-span-1 md:col-span-2 flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Register
                </Button>
              </div>
            </form>
          </Form>
        </div>
        
        <div className="mt-3 pt-3 text-center border-t border-gray-200 flex-shrink-0 bg-white">
          <p className="text-sm text-neutral-600">
            Already have an account?{" "}
            <Button variant="link" onClick={onLoginClick} className="p-0 font-medium text-primary hover:text-primary-500">
              Login
            </Button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
