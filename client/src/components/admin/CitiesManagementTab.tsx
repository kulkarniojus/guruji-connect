import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, MapPin, X, Check } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Indian states for city management
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep', 'Puducherry'
];

const citySchema = z.object({
  name: z.string().min(2, 'City name must be at least 2 characters'),
  state: z.string().min(1, 'State is required'),
});

type City = {
  id: number;
  name: string;
  state: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function CitiesManagementTab() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof citySchema>>({
    resolver: zodResolver(citySchema),
    defaultValues: {
      name: '',
      state: '',
    },
  });

  // Fetch cities
  const { data: cities = [], isLoading } = useQuery({
    queryKey: ['/api/cities'],
    queryFn: () => apiRequest('GET', '/api/cities').then(res => res.json()),
  });

  // Add city mutation
  const addCityMutation = useMutation({
    mutationFn: (data: z.infer<typeof citySchema>) =>
      apiRequest('POST', '/api/cities', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cities'] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: 'Success',
        description: 'City added successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to add city',
        variant: 'destructive',
      });
    },
  });

  // Update city mutation
  const updateCityMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<City> }) =>
      apiRequest('PUT', `/api/cities/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cities'] });
      setEditingCity(null);
      toast({
        title: 'Success',
        description: 'City updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update city',
        variant: 'destructive',
      });
    },
  });

  // Delete city mutation
  const deleteCityMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest('DELETE', `/api/cities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cities'] });
      toast({
        title: 'Success',
        description: 'City deleted successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete city',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: z.infer<typeof citySchema>) => {
    if (editingCity) {
      updateCityMutation.mutate({ id: editingCity.id, data });
    } else {
      addCityMutation.mutate(data);
    }
  };

  const handleEdit = (city: City) => {
    setEditingCity(city);
    form.setValue('name', city.name);
    form.setValue('state', city.state);
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this city?')) {
      deleteCityMutation.mutate(id);
    }
  };

  const toggleCityStatus = (city: City) => {
    updateCityMutation.mutate({
      id: city.id,
      data: { isActive: !city.isActive },
    });
  };

  const closeDialog = () => {
    setIsAddDialogOpen(false);
    setEditingCity(null);
    form.reset();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Cities Management
            </CardTitle>
            <CardDescription>
              Manage cities where GurujiConnect services are available. Gurujis can select up to 2 cities to serve.
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingCity(null);
                form.reset();
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add City
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCity ? 'Edit City' : 'Add New City'}
                </DialogTitle>
                <DialogDescription>
                  {editingCity ? 'Update city information' : 'Add a new city to the service area'}
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter city name" {...field} />
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
                          <select
                            {...field}
                            className="w-full px-3 py-2 border border-input rounded-md bg-background"
                          >
                            <option value="">Select State</option>
                            {INDIAN_STATES.map((state) => (
                              <option key={state} value={state}>
                                {state}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={closeDialog}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={addCityMutation.isPending || updateCityMutation.isPending}
                    >
                      {addCityMutation.isPending || updateCityMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading cities...</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No cities found. Add the first city to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  cities.map((city: City) => (
                    <TableRow key={city.id}>
                      <TableCell className="font-medium">{city.name}</TableCell>
                      <TableCell>{city.state}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={city.isActive ? 'default' : 'secondary'}
                          className="cursor-pointer"
                          onClick={() => toggleCityStatus(city)}
                        >
                          {city.isActive ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(city.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(city)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(city.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}