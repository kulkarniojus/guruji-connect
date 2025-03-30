import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ServiceAvailabilityCalendar } from './ServiceAvailabilityCalendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { Filter, Calendar, Users, MapPin } from 'lucide-react';

export function AvailabilityPage() {
  const [selectedGuruji, setSelectedGuruji] = useState<number | null>(null);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('mumbai');
  
  const { data: services, isLoading: isServicesLoading } = useQuery({
    queryKey: ['/api/pujas'],
    queryFn: async () => {
      const response = await fetch('/api/pujas');
      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }
      return response.json();
    }
  });

  const { data: gurujis, isLoading: isGurujisLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users?role=guruji');
      if (!response.ok) {
        throw new Error('Failed to fetch gurujis');
      }
      return response.json();
    }
  });

  // List of available cities
  const cities = [
    { value: 'mumbai', label: 'Mumbai' },
    { value: 'delhi', label: 'Delhi' },
    { value: 'bangalore', label: 'Bangalore' },
    { value: 'pune', label: 'Pune' },
    { value: 'chennai', label: 'Chennai' }
  ];

  const clearFilters = () => {
    setSelectedService(null);
    setSelectedGuruji(null);
    setSelectedCity('mumbai');
  };

  const getServiceNameById = (serviceId: number | null) => {
    if (!serviceId || !services || !Array.isArray(services)) return 'All Services';
    const service = services.find((s: any) => s.id === serviceId);
    return service ? service.name : 'All Services';
  };

  const getGurujiNameById = (gurujiId: number | null) => {
    if (!gurujiId || !gurujis || !Array.isArray(gurujis)) return 'All Gurujis';
    const guruji = gurujis.find((g: any) => g.id === gurujiId);
    return guruji ? `${guruji.firstName} ${guruji.lastName}` : 'All Gurujis';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Service Availability Calendar</h1>
          <p className="text-neutral-600">Find and book the best available slots for your preferred services</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center text-lg">
                  <Filter className="mr-2 h-4 w-4" /> 
                  Filters
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="text-xs h-8"
                >
                  Clear All
                </Button>
              </div>
              <CardDescription>
                Refine availability results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex items-center mb-3">
                  <Calendar className="h-4 w-4 mr-2 text-neutral-500" />
                  <h3 className="text-sm font-medium">Services</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {isServicesLoading ? (
                    <div className="col-span-2 h-24 rounded-md bg-neutral-100 animate-pulse"></div>
                  ) : services && services.length > 0 ? (
                    services.map((service: any) => (
                      <Button 
                        key={service.id}
                        variant={selectedService === service.id ? "default" : "outline"}
                        size="sm"
                        className="justify-start text-xs h-auto py-2 truncate"
                        onClick={() => setSelectedService(service.id)}
                      >
                        {service.name}
                      </Button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No services available</p>
                  )}
                </div>
              </div>
              
              <div>
                <div className="flex items-center mb-3">
                  <Users className="h-4 w-4 mr-2 text-neutral-500" />
                  <h3 className="text-sm font-medium">Guruji</h3>
                </div>
                
                <div className="space-y-2">
                  {isGurujisLoading ? (
                    <div className="h-24 rounded-md bg-neutral-100 animate-pulse"></div>
                  ) : gurujis && gurujis.length > 0 ? (
                    gurujis.slice(0, 5).map((guruji: any) => (
                      <Button 
                        key={guruji.id}
                        variant={selectedGuruji === guruji.id ? "default" : "outline"}
                        size="sm"
                        className="w-full justify-start text-xs h-auto py-2"
                        onClick={() => setSelectedGuruji(guruji.id)}
                      >
                        {guruji.firstName} {guruji.lastName}
                        <Badge variant="outline" className="ml-auto">4.8 ★</Badge>
                      </Button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No gurujis available</p>
                  )}
                </div>
              </div>
              
              <div>
                <div className="flex items-center mb-3">
                  <MapPin className="h-4 w-4 mr-2 text-neutral-500" />
                  <h3 className="text-sm font-medium">Location</h3>
                </div>
                
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city.value} value={city.value}>
                        {city.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-3">
          <Tabs defaultValue="calendar">
            <TabsList className="mb-4">
              <TabsTrigger value="calendar">Calendar View</TabsTrigger>
              <TabsTrigger value="list">List View</TabsTrigger>
            </TabsList>
            
            <TabsContent value="calendar" className="mt-0">
              <Card>
                <CardHeader className="pb-3 border-b">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                    <div>
                      <CardTitle className="text-xl">
                        {getServiceNameById(selectedService)}
                      </CardTitle>
                      <CardDescription>
                        {getGurujiNameById(selectedGuruji)} • {cities.find(c => c.value === selectedCity)?.label || selectedCity}
                      </CardDescription>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-primary/10 text-primary">
                        {selectedService ? '1' : 'All'} Service{!selectedService && 's'}
                      </Badge>
                      <Badge variant="outline" className="bg-primary/10 text-primary">
                        {selectedGuruji ? '1' : 'All'} Guruji{!selectedGuruji && 's'}
                      </Badge>
                      <Badge variant="outline" className="bg-primary/10 text-primary">
                        {cities.find(c => c.value === selectedCity)?.label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ServiceAvailabilityCalendar 
                    serviceId={selectedService} 
                    gurujiId={selectedGuruji}
                    city={selectedCity}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="list" className="mt-0">
              <Card>
                <CardHeader className="pb-3 border-b">
                  <CardTitle>Available Slots</CardTitle>
                  <CardDescription>
                    List of upcoming available slots for all dates
                  </CardDescription>
                </CardHeader>
                <CardContent className="py-6">
                  <div className="text-center p-10 bg-neutral-50 rounded-lg border border-dashed">
                    <Calendar className="h-10 w-10 mx-auto text-neutral-400 mb-3" />
                    <h3 className="text-lg font-medium mb-2">List View Coming Soon</h3>
                    <p className="text-sm text-neutral-500 max-w-md mx-auto">
                      We're working on a convenient list view that will show all available slots across multiple dates.
                      For now, please use the Calendar View to find and book slots.
                    </p>
                    <Button 
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        const element = document.querySelector('[data-state="inactive"][value="calendar"]') as HTMLElement;
                        if (element) element.click();
                      }}
                    >
                      Switch to Calendar View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}