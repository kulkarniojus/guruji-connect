import React, { useState } from 'react';
import { ServiceAvailabilityCalendar } from './ServiceAvailabilityCalendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

export function AvailabilityPage() {
  const [selectedGurujiId, setSelectedGurujiId] = useState<number | undefined>();
  const [selectedPujaId, setSelectedPujaId] = useState<number | undefined>();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<string | undefined>();
  
  // Fetch pujas
  const { data: pujas = [] } = useQuery({
    queryKey: ['pujas'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/pujas');
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch pujas:', error);
        return [];
      }
    }
  });
  
  // Fetch gurujis
  const { data: gurujis = [] } = useQuery({
    queryKey: ['gurujis'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/users?role=guruji');
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch gurujis:', error);
        return [];
      }
    }
  });
  
  const handleDateSelect = (date: Date, availability: any) => {
    setSelectedDate(date);
    setSelectedSlot(undefined); // Reset selected slot when date changes
    
    console.log('Selected date:', format(date, 'yyyy-MM-dd'));
    console.log('Availability:', availability);
  };
  
  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
  };
  
  const handleBookAppointment = () => {
    if (!selectedDate || !selectedSlot) {
      alert('Please select a date and time slot');
      return;
    }
    
    alert(`Booking appointment on ${format(selectedDate, 'yyyy-MM-dd')} at ${selectedSlot}`);
    // Here you would navigate to the booking form or submit the booking
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Service Availability Calendar</CardTitle>
            <CardDescription>
              Check availability and book your preferred time slot
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Filters */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="puja-select" className="block text-sm font-medium mb-2">
                    Select Service Type
                  </label>
                  <Select onValueChange={(value) => setSelectedPujaId(Number(value))}>
                    <SelectTrigger id="puja-select" className="w-full">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {pujas.map((puja: any) => (
                        <SelectItem key={puja.id} value={puja.id.toString()}>
                          {puja.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label htmlFor="guruji-select" className="block text-sm font-medium mb-2">
                    Select Guruji (Optional)
                  </label>
                  <Select onValueChange={(value) => setSelectedGurujiId(Number(value))}>
                    <SelectTrigger id="guruji-select" className="w-full">
                      <SelectValue placeholder="Any Guruji" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Any Available Guruji</SelectItem>
                      {gurujis.map((guruji: any) => (
                        <SelectItem key={guruji.id} value={guruji.id.toString()}>
                          {guruji.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Selected Info */}
                {selectedDate && (
                  <Card className="mt-6 bg-muted/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Selected Appointment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-1">
                        <span className="font-medium">Date:</span> {format(selectedDate, 'MMMM d, yyyy')}
                      </p>
                      {selectedSlot && (
                        <p className="text-sm mb-1">
                          <span className="font-medium">Time:</span> {selectedSlot}
                        </p>
                      )}
                      {selectedPujaId && (
                        <p className="text-sm mb-1">
                          <span className="font-medium">Service:</span> {
                            pujas.find((p: any) => p.id === selectedPujaId)?.name || 'Unknown'
                          }
                        </p>
                      )}
                      {selectedGurujiId && selectedGurujiId > 0 && (
                        <p className="text-sm mb-1">
                          <span className="font-medium">Guruji:</span> {
                            gurujis.find((g: any) => g.id === selectedGurujiId)?.name || 'Unknown'
                          }
                        </p>
                      )}
                      
                      <Button 
                        onClick={handleBookAppointment}
                        className="w-full mt-4"
                        disabled={!selectedDate || !selectedSlot}>
                        Book Appointment
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              {/* Calendar */}
              <div className="lg:col-span-2">
                <ServiceAvailabilityCalendar 
                  pujaId={selectedPujaId}
                  gurujiId={selectedGurujiId}
                  onSelectDate={handleDateSelect}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}