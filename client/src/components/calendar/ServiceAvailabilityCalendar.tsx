import { useState, useEffect } from 'react';
import { addDays, format, parse, startOfWeek, getDay, isSameDay, isAfter, isBefore, setHours, setMinutes } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface ServiceAvailabilityCalendarProps {
  serviceId: number | null;
  gurujiId: number | null;
}

interface TimeSlot {
  id: number;
  startTime: string;
  endTime: string;
  available: boolean;
  gurujiId?: number;
  gurujiName?: string;
}

interface DayAvailability {
  date: string;
  slots: TimeSlot[];
}

export function ServiceAvailabilityCalendar({ serviceId, gurujiId }: ServiceAvailabilityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const { toast } = useToast();

  // Fetch availability data
  const { data: availabilityData, isLoading } = useQuery({
    queryKey: ['availability', serviceId, gurujiId, selectedDate],
    queryFn: async () => {
      // Construct the query parameters
      const params = new URLSearchParams();
      if (serviceId) params.append('pujaId', serviceId.toString());
      if (gurujiId) params.append('gurujiId', gurujiId.toString());
      if (selectedDate) params.append('date', format(selectedDate, 'yyyy-MM-dd'));

      const response = await fetch(`/api/availability?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch availability data');
      }
      return response.json();
    },
    enabled: !!selectedDate
  });

  // Update available slots when data changes
  useEffect(() => {
    if (availabilityData && selectedDate) {
      // Find the day's availability
      const dayData = availabilityData.find((day: DayAvailability) => {
        const dayDate = parse(day.date, 'yyyy-MM-dd', new Date());
        return isSameDay(dayDate, selectedDate);
      });

      if (dayData) {
        setAvailableSlots(dayData.slots);
      } else {
        setAvailableSlots([]);
      }
    }
  }, [availabilityData, selectedDate]);

  // Function to handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  // Function to handle booking a slot
  const handleBookSlot = (slot: TimeSlot) => {
    if (!slot.available) {
      toast({
        title: "Slot not available",
        description: "This time slot is already booked.",
        variant: "destructive"
      });
      return;
    }

    // Redirect to booking page with pre-filled data
    const bookingParams = new URLSearchParams();
    if (serviceId) bookingParams.append('serviceId', serviceId.toString());
    if (gurujiId) bookingParams.append('gurujiId', gurujiId.toString());
    if (selectedDate) bookingParams.append('date', format(selectedDate, 'yyyy-MM-dd'));
    bookingParams.append('startTime', slot.startTime);
    bookingParams.append('endTime', slot.endTime);

    window.location.href = `/booking?${bookingParams.toString()}`;
  };

  // Custom day renderer for the calendar
  const renderCalendarDay = (day: Date, modifiers: any) => {
    if (!availabilityData) return null;

    // Find the day's availability
    const dayData = availabilityData.find((a) => {
      const dayDate = parse(a.date, 'yyyy-MM-dd', new Date());
      return isSameDay(dayDate, day);
    });

    const hasAvailability = dayData && dayData.slots.some(slot => slot.available);
    
    // Calculate slot summary
    let availableCount = 0;
    let totalCount = 0;
    
    if (dayData) {
      totalCount = dayData.slots.length;
      availableCount = dayData.slots.filter(slot => slot.available).length;
    }

    return (
      <div className={`
        relative w-full h-full p-2
        ${modifiers.selected ? 'bg-primary text-primary-foreground' : ''}
        ${hasAvailability ? 'font-medium' : 'text-muted-foreground'}
      `}>
        <span>{format(day, 'd')}</span>
        {hasAvailability && (
          <div className="absolute bottom-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
        )}
        {totalCount > 0 && (
          <div className="absolute bottom-1 left-1">
            <span className="text-[0.6rem]">{availableCount}/{totalCount}</span>
          </div>
        )}
      </div>
    );
  };

  // This is a simplified way to generate dummy time slots for a day
  // when not using real data
  const generateDummyTimeSlots = (date: Date) => {
    const isToday = isSameDay(date, new Date());
    const isWeekend = [0, 6].includes(getDay(date));
    const slots: TimeSlot[] = [];
    
    // More slots available on weekends
    const startHour = 8;
    const endHour = isWeekend ? 20 : 18;
    
    for (let hour = startHour; hour < endHour; hour++) {
      const isAfternoon = hour >= 12;
      const available = Math.random() > 0.3; // 70% chance of being available
      
      slots.push({
        id: hour,
        startTime: `${hour}:00`,
        endTime: `${hour + 1}:00`,
        available: isToday ? hour > new Date().getHours() && available : available,
        gurujiId: available ? undefined : Math.floor(Math.random() * 5) + 1,
        gurujiName: available ? undefined : `Guruji ${Math.floor(Math.random() * 5) + 1}`
      });
    }
    
    return slots;
  };

  // When no data is loaded, generate dummy slots for display
  const renderTimeSlots = () => {
    if (!selectedDate) return null;

    // If loading, show skeletons
    if (isLoading) {
      return (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Array(6).fill(0).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      );
    }

    // Get slots based on selected date
    const slots = availabilityData ? availableSlots : generateDummyTimeSlots(selectedDate);

    if (slots.length === 0) {
      return (
        <div className="mt-4 text-center p-4">
          <p className="text-muted-foreground">No time slots available for the selected date.</p>
        </div>
      );
    }

    return (
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {slots.map((slot, index) => (
          <Card 
            key={index}
            className={`
              ${slot.available ? 'border-green-200 hover:border-green-300' : 'border-gray-200 bg-gray-50'}
            `}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">{slot.startTime} - {slot.endTime}</span>
                {slot.available ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Available
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Booked
                  </Badge>
                )}
              </div>
              {slot.gurujiName && (
                <p className="text-sm text-muted-foreground mt-1">Reserved by: {slot.gurujiName}</p>
              )}
              <div className="mt-3">
                <Button 
                  variant={slot.available ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                  disabled={!slot.available}
                  onClick={() => handleBookSlot(slot)}
                >
                  {slot.available ? "Book Now" : "Unavailable"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/2">
          <h3 className="text-lg font-medium mb-4">Select Date</h3>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="rounded-md border"
            disabled={date => 
              isBefore(date, startOfWeek(new Date())) || // Disable past dates
              isAfter(date, addDays(new Date(), 90))    // Only allow booking up to 90 days in advance
            }
          />
        </div>
        
        <div className="md:w-1/2">
          <h3 className="text-lg font-medium mb-4">Available Time Slots</h3>
          <div className="bg-white rounded-md border p-4">
            <div className="mb-2">
              <h4 className="font-medium">
                {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
              </h4>
              <p className="text-sm text-muted-foreground">
                {serviceId ? "For selected service" : "For all services"}
                {gurujiId ? " and selected Guruji" : ""}
              </p>
            </div>
            
            {renderTimeSlots()}
          </div>
        </div>
      </div>
    </div>
  );
}