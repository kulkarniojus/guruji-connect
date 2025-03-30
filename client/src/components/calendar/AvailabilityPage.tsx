import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ServiceAvailabilityCalendar } from './ServiceAvailabilityCalendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';

export function AvailabilityPage() {
  const [selectedGuruji, setSelectedGuruji] = useState<number | null>(null);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  
  const { data: services } = useQuery({
    queryKey: ['/api/pujas'],
    queryFn: async () => {
      const response = await fetch('/api/pujas');
      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }
      return response.json();
    }
  });

  const { data: gurujis } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users?role=guruji');
      if (!response.ok) {
        throw new Error('Failed to fetch gurujis');
      }
      return response.json();
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Service Availability Calendar</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>
                Select options to view availability
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Services</h3>
                <div className="space-y-2">
                  {services && services.length > 0 ? (
                    services.map((service: any) => (
                      <Button 
                        key={service.id}
                        variant={selectedService === service.id ? "default" : "outline"}
                        className="w-full justify-start"
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
                <h3 className="text-sm font-medium mb-2">Guruji</h3>
                <div className="space-y-2">
                  {gurujis && gurujis.length > 0 ? (
                    gurujis.map((guruji: any) => (
                      <Button 
                        key={guruji.id}
                        variant={selectedGuruji === guruji.id ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setSelectedGuruji(guruji.id)}
                      >
                        {guruji.firstName} {guruji.lastName}
                      </Button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No gurujis available</p>
                  )}
                </div>
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
                <CardHeader>
                  <CardTitle>
                    {selectedService ? 
                      services?.find((s: any) => s.id === selectedService)?.name : 
                      'All Services'} Availability
                  </CardTitle>
                  <CardDescription>
                    {selectedGuruji ? 
                      `For ${gurujis?.find((g: any) => g.id === selectedGuruji)?.firstName || ''} ${gurujis?.find((g: any) => g.id === selectedGuruji)?.lastName || ''}` : 
                      'For all Gurujis'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ServiceAvailabilityCalendar 
                    serviceId={selectedService} 
                    gurujiId={selectedGuruji}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="list" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Available Slots</CardTitle>
                  <CardDescription>
                    List of upcoming available slots
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* This would be populated with availability data */}
                    <p className="text-muted-foreground">
                      Please select a service and/or Guruji to view available slots.
                    </p>
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