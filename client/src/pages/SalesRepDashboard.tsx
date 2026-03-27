import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, UserPlus, Users, LogOut, User, Phone, Mail, MapPin, CreditCard, Calendar, Star } from 'lucide-react';

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];
const LANGUAGES = ['Hindi', 'English', 'Sanskrit', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam'];
const PUJA_SPECIALIZATIONS = ['Satyanarayan Puja', 'Ganesh Puja', 'Lakshmi Puja', 'Griha Pravesh', 'Navratri Puja', 'Rudrabhishek', 'Vivah Puja', 'Namkaran', 'Annaprashan', 'Mundan'];

// ── Customer Registration Schema ──────────────────────────────────────────
const customerSchema = z.object({
  firstName: z.string().min(2, 'First name required'),
  lastName: z.string().min(2, 'Last name required'),
  email: z.string().email('Valid email required'),
  mobile: z.string().length(10, 'Mobile must be 10 digits'),
  password: z.string().min(6, 'Minimum 6 characters'),
  age: z.coerce.number().min(18, 'Must be 18+').max(100, 'Enter valid age'),
  gender: z.enum(['male', 'female', 'other']),
  dob: z.string().min(1, 'Date of birth required'),
  aadhar: z.string().length(12, 'Aadhar must be 12 digits'),
  caste: z.string().optional(),
  address: z.string().min(5, 'Full address required'),
  city: z.string().min(1, 'City required'),
  state: z.string().min(1, 'State required'),
  pincode: z.string().length(6, 'Pincode must be 6 digits'),
  photoUrl: z.string().optional(),
});

// ── Guruji Registration Schema ────────────────────────────────────────────
const gurujiSchema = z.object({
  firstName: z.string().min(2, 'First name required'),
  lastName: z.string().min(2, 'Last name required'),
  email: z.string().email('Valid email required'),
  mobile: z.string().length(10, 'Mobile must be 10 digits'),
  password: z.string().min(6, 'Minimum 6 characters'),
  age: z.coerce.number().min(18, 'Must be 18+').max(100, 'Enter valid age'),
  gender: z.enum(['male', 'female', 'other']),
  dob: z.string().min(1, 'Date of birth required'),
  aadhar: z.string().length(12, 'Aadhar must be 12 digits'),
  caste: z.string().optional(),
  religion: z.string().optional(),
  address: z.string().min(5, 'Full address required'),
  city: z.string().min(1, 'City required'),
  state: z.string().min(1, 'State required'),
  pincode: z.string().length(6, 'Pincode must be 6 digits'),
  photoUrl: z.string().optional(),
  bio: z.string().min(30, 'Bio must be at least 30 characters'),
  experience: z.coerce.number().min(1, 'At least 1 year experience').max(60),
  location: z.string().min(3, 'Location required'),
  pricePerHour: z.coerce.number().min(100, 'Min ₹100').max(50000),
  languages: z.string().min(1, 'Select at least one language'),
  pujaSpecialization: z.string().min(1, 'Enter puja specializations'),
  servesCity: z.string().min(1, 'Enter city of service'),
  isOnline: z.boolean().default(false),
  isOffline: z.boolean().default(true),
});

type CustomerForm = z.infer<typeof customerSchema>;
type GurujiForm = z.infer<typeof gurujiSchema>;

function FieldSection({ title }: { title: string }) {
  return (
    <div className="col-span-2">
      <Separator className="my-2" />
      <p className="text-sm font-semibold text-orange-700 uppercase tracking-wide mt-3 mb-1">{title}</p>
    </div>
  );
}

// ── Customer Registration Form ────────────────────────────────────────────
function RegisterCustomerTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      firstName: '', lastName: '', email: '', mobile: '', password: '',
      age: 25, gender: 'male', dob: '', aadhar: '', caste: '',
      address: '', city: '', state: '', pincode: '', photoUrl: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: CustomerForm) => apiRequest('POST', '/api/sales-rep/register-customer', data),
    onSuccess: async (res) => {
      const user = await res.json();
      toast({ title: 'Customer Registered!', description: `${user.firstName} ${user.lastName} has been registered.` });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/sales-rep/registrations'] });
    },
    onError: async (err: any) => {
      const msg = err.message || 'Registration failed';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-orange-600" /> Register New Customer</CardTitle>
        <CardDescription>Fill in all KYC details for the customer</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="grid grid-cols-2 gap-4">
            <FieldSection title="Personal Information" />

            <FormField control={form.control} name="firstName" render={({ field }) => (
              <FormItem><FormLabel>First Name *</FormLabel><FormControl><Input placeholder="Ramesh" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="lastName" render={({ field }) => (
              <FormItem><FormLabel>Last Name *</FormLabel><FormControl><Input placeholder="Sharma" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email *</FormLabel><FormControl><Input type="email" placeholder="ramesh@example.com" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="mobile" render={({ field }) => (
              <FormItem><FormLabel>Mobile *</FormLabel><FormControl><Input placeholder="9876543210" maxLength={10} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem><FormLabel>Password *</FormLabel><FormControl><Input type="password" placeholder="Min 6 characters" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="age" render={({ field }) => (
              <FormItem><FormLabel>Age *</FormLabel><FormControl><Input type="number" placeholder="25" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="gender" render={({ field }) => (
              <FormItem><FormLabel>Gender *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="dob" render={({ field }) => (
              <FormItem><FormLabel>Date of Birth *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FieldSection title="KYC / Identity" />
            <FormField control={form.control} name="aadhar" render={({ field }) => (
              <FormItem><FormLabel>Aadhaar Number *</FormLabel><FormControl><Input placeholder="12-digit Aadhaar" maxLength={12} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="caste" render={({ field }) => (
              <FormItem><FormLabel>Caste / Category</FormLabel><FormControl><Input placeholder="General / OBC / SC / ST" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="photoUrl" render={({ field }) => (
              <FormItem className="col-span-2"><FormLabel>Photo URL</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FieldSection title="Address" />
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem className="col-span-2"><FormLabel>Full Address *</FormLabel><FormControl><Textarea placeholder="House No, Street, Area" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="city" render={({ field }) => (
              <FormItem><FormLabel>City *</FormLabel><FormControl><Input placeholder="Mumbai" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="state" render={({ field }) => (
              <FormItem><FormLabel>State *</FormLabel><FormControl><Input placeholder="Maharashtra" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="pincode" render={({ field }) => (
              <FormItem><FormLabel>Pincode *</FormLabel><FormControl><Input placeholder="400001" maxLength={6} {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="col-span-2 mt-2">
              <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Register Customer
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ── Guruji Registration Form ──────────────────────────────────────────────
function RegisterGurujiTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<GurujiForm>({
    resolver: zodResolver(gurujiSchema),
    defaultValues: {
      firstName: '', lastName: '', email: '', mobile: '', password: '',
      age: 35, gender: 'male', dob: '', aadhar: '', caste: '', religion: '',
      address: '', city: '', state: '', pincode: '', photoUrl: '',
      bio: '', experience: 5, location: '', pricePerHour: 500,
      languages: '', pujaSpecialization: '', servesCity: '',
      isOnline: false, isOffline: true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: GurujiForm) => {
      const payload = {
        ...data,
        cities: data.servesCity.split(',').map(s => s.trim()),
        pujas: data.pujaSpecialization.split(',').map(s => s.trim()),
        languages: data.languages.split(',').map(s => s.trim()),
      };
      return apiRequest('POST', '/api/sales-rep/register-guruji', payload);
    },
    onSuccess: async (res) => {
      const result = await res.json();
      toast({ title: 'Guruji Registered!', description: `${result.user.firstName} ${result.user.lastName} registered, pending approval.` });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/sales-rep/registrations'] });
    },
    onError: async (err: any) => {
      toast({ title: 'Error', description: err.message || 'Registration failed', variant: 'destructive' });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-orange-600" /> Register New Guruji</CardTitle>
        <CardDescription>Complete KYC and professional profile for the Guruji</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="grid grid-cols-2 gap-4">
            <FieldSection title="Personal Information" />
            <FormField control={form.control} name="firstName" render={({ field }) => (
              <FormItem><FormLabel>First Name *</FormLabel><FormControl><Input placeholder="Pandit Ramesh" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="lastName" render={({ field }) => (
              <FormItem><FormLabel>Last Name *</FormLabel><FormControl><Input placeholder="Sharma" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email *</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="mobile" render={({ field }) => (
              <FormItem><FormLabel>Mobile *</FormLabel><FormControl><Input placeholder="9876543210" maxLength={10} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem><FormLabel>Password *</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="age" render={({ field }) => (
              <FormItem><FormLabel>Age *</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="gender" render={({ field }) => (
              <FormItem><FormLabel>Gender *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="dob" render={({ field }) => (
              <FormItem><FormLabel>Date of Birth *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FieldSection title="KYC / Identity" />
            <FormField control={form.control} name="aadhar" render={({ field }) => (
              <FormItem><FormLabel>Aadhaar Number *</FormLabel><FormControl><Input placeholder="12-digit Aadhaar" maxLength={12} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="caste" render={({ field }) => (
              <FormItem><FormLabel>Caste / Category</FormLabel><FormControl><Input placeholder="Brahmin / OBC / etc." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="religion" render={({ field }) => (
              <FormItem><FormLabel>Religion</FormLabel><FormControl><Input placeholder="Hindu / Buddhist / Jain etc." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="photoUrl" render={({ field }) => (
              <FormItem className="col-span-2"><FormLabel>Photo URL</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FieldSection title="Address" />
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem className="col-span-2"><FormLabel>Full Address *</FormLabel><FormControl><Textarea placeholder="House No, Street, Area" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="city" render={({ field }) => (
              <FormItem><FormLabel>City *</FormLabel><FormControl><Input placeholder="Mumbai" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="state" render={({ field }) => (
              <FormItem><FormLabel>State *</FormLabel><FormControl><Input placeholder="Maharashtra" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="pincode" render={({ field }) => (
              <FormItem><FormLabel>Pincode *</FormLabel><FormControl><Input placeholder="400001" maxLength={6} {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FieldSection title="Professional Profile" />
            <FormField control={form.control} name="bio" render={({ field }) => (
              <FormItem className="col-span-2"><FormLabel>Bio / About *</FormLabel><FormControl><Textarea placeholder="Experienced Vedic pandit with deep knowledge of Hindu rituals..." rows={3} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="experience" render={({ field }) => (
              <FormItem><FormLabel>Experience (Years) *</FormLabel><FormControl><Input type="number" placeholder="5" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="pricePerHour" render={({ field }) => (
              <FormItem><FormLabel>Price Per Hour (₹) *</FormLabel><FormControl><Input type="number" placeholder="500" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem><FormLabel>Service Location *</FormLabel><FormControl><Input placeholder="e.g. Mumbai, Thane" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="servesCity" render={({ field }) => (
              <FormItem><FormLabel>Serves Cities * (comma separated)</FormLabel><FormControl><Input placeholder="Mumbai, Pune" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="languages" render={({ field }) => (
              <FormItem><FormLabel>Languages * (comma separated)</FormLabel><FormControl><Input placeholder="Hindi, Sanskrit, Marathi" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="pujaSpecialization" render={({ field }) => (
              <FormItem className="col-span-2"><FormLabel>Puja Specializations * (comma separated)</FormLabel><FormControl><Input placeholder="Satyanarayan Puja, Ganesh Puja, Griha Pravesh" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="col-span-2 flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.watch('isOnline')} onChange={e => form.setValue('isOnline', e.target.checked)} className="h-4 w-4" />
                <span className="text-sm">Available Online</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.watch('isOffline')} onChange={e => form.setValue('isOffline', e.target.checked)} className="h-4 w-4" />
                <span className="text-sm">Available Offline</span>
              </label>
            </div>

            <div className="col-span-2 mt-2">
              <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Star className="h-4 w-4 mr-2" />}
                Register Guruji
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ── My Registrations Tab ──────────────────────────────────────────────────
function MyRegistrationsTab() {
  const { data: registrations, isLoading } = useQuery<any[]>({
    queryKey: ['/api/sales-rep/registrations'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!registrations || registrations.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No registrations yet. Register your first customer or Guruji!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {registrations.map((user: any) => (
        <Card key={user.id} className="hover:shadow-md transition-shadow">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{user.firstName} {user.lastName}</p>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{user.email}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{user.mobile}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Badge variant={user.role === 'guruji' ? 'default' : 'secondary'} className={user.role === 'guruji' ? 'bg-orange-600' : ''}>
                  {user.role === 'guruji' ? 'Guruji' : 'Customer'}
                </Badge>
                {user.city && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center justify-end gap-1">
                    <MapPin className="h-3 w-3" />{user.city}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : ''}
                </p>
              </div>
            </div>
            {user.aadhar && (
              <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                <CreditCard className="h-3 w-3" />
                <span>Aadhaar: {user.aadhar.slice(0, 4)}••••••••{user.aadhar.slice(-4)}</span>
                {user.dob && <><Calendar className="h-3 w-3 ml-2" /><span>DOB: {user.dob}</span></>}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────
export default function SalesRepDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const salesRepUser = (() => {
    try { return JSON.parse(localStorage.getItem('salesRepUser') || '{}'); } catch { return {}; }
  })();

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout', {});
    } catch (_) {}
    localStorage.removeItem('salesRepUser');
    toast({ title: 'Logged out', description: 'See you soon!' });
    setLocation('/sales-rep');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sales Representative Portal</h1>
            <p className="text-sm text-gray-500">
              Welcome, {salesRepUser.firstName || 'Rep'} {salesRepUser.lastName || ''}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="register-customer">
          <TabsList className="grid grid-cols-3 mb-8 w-full max-w-lg">
            <TabsTrigger value="register-customer">Register Customer</TabsTrigger>
            <TabsTrigger value="register-guruji">Register Guruji</TabsTrigger>
            <TabsTrigger value="registrations">My Registrations</TabsTrigger>
          </TabsList>

          <TabsContent value="register-customer">
            <RegisterCustomerTab />
          </TabsContent>
          <TabsContent value="register-guruji">
            <RegisterGurujiTab />
          </TabsContent>
          <TabsContent value="registrations">
            <MyRegistrationsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
