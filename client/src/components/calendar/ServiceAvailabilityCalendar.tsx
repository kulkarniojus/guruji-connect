import { useState, useEffect, useMemo } from 'react';
import { addDays, format, parse, startOfWeek, getDay, isSameDay, isAfter, isBefore, setHours, setMinutes, isToday } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Clock, CalendarIcon, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceAvailabilityCalendarProps {
  serviceId: number | null;
  gurujiId: number | null;
  city?: string;
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

export function ServiceAvailabilityCalendar({ serviceId, gurujiId, city }: ServiceAvailabilityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const { toast } = useToast();

  // Fetch availability data for the entire month
  const { data: availabilityData, isLoading, refetch } = useQuery({
    queryKey: ['availability', serviceId, gurujiId, city, selectedMonth],
    queryFn: async () => {
      // Construct the query parameters
      const params = new URLSearchParams();
      if (serviceId) params.append('pujaId', serviceId.toString());
      if (gurujiId) params.append('gurujiId', gurujiId.toString());
      if (city) params.append('city', city);
      params.append('date', format(selectedMonth, 'yyyy-MM-dd'));

      const response = await fetch(`/api/availability?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch availability data');
      }
      return response.json();
    },
    enabled: true,
    staleTime: 1000 * 60 * 5, // Cache data for 5 minutes
  });

  // When selected month changes, refetch the availability data
  useEffect(() => {
    refetch();
  }, [selectedMonth, refetch]);

  // Update available slots when data changes or selected date changes
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
      // If the selected date is in a different month, update the month view
      if (date.getMonth() !== selectedMonth.getMonth() || 
          date.getFullYear() !== selectedMonth.getFullYear()) {
        setSelectedMonth(date);
      }
    }
  };

  // Function to handle month change
  const handleMonthChange = (date: Date) => {
    setSelectedMonth(date);
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
    if (serviceId) bookingParams.append('puja', serviceId.toString());
    if (gurujiId) bookingParams.append('guruji', gurujiId.toString());
    if (city) bookingParams.append('city', city);
    if (selectedDate) bookingParams.append('date', format(selectedDate, 'yyyy-MM-dd'));
    bookingParams.append('time', slot.startTime);
    
    // Determine the booking type based on services
    bookingParams.append('type', 'offline');

    window.location.href = `/booking?${bookingParams.toString()}`;
  };

  // Create a date cell renderer that shows availability information
  const CustomDay = (props: any) => {
    const { date: day, selected: isSelected, outside: isOutsideMonth } = props;
    
    if (!availabilityData || isOutsideMonth) {
      return (
        <div className={cn(
          "w-full h-10 flex items-center justify-center relative text-sm",
          isOutsideMonth && "text-muted-foreground opacity-50",
          isSelected && "bg-primary text-primary-foreground rounded-md"
        )}>
          <span>{format(day, 'd')}</span>
        </div>
      );
    }

    // Find the day's availability data
    const dayData = availabilityData.find((item: DayAvailability) => {
      const itemDate = parse(item.date, 'yyyy-MM-dd', new Date());
      return isSameDay(itemDate, day);
    });

    // Calculate availability metrics
    const hasAvailability = dayData && dayData.slots.some((slot: TimeSlot) => slot.available);
    const availableCount = dayData ? dayData.slots.filter((slot: TimeSlot) => slot.available).length : 0;
    const totalCount = dayData ? dayData.slots.length : 0;
    const availabilityPercentage = totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 0;

    // Determine the background color based on availability percentage
    let availabilityColor = 'bg-gray-100';
    if (hasAvailability) {
      if (availabilityPercentage > 66) {
        availabilityColor = 'bg-green-100';
      } else if (availabilityPercentage > 33) {
        availabilityColor = 'bg-yellow-100';
      } else {
        availabilityColor = 'bg-red-100';
      }
    }

    return (
      <div
        className={cn(
          "w-full h-10 flex flex-col items-center justify-center relative text-sm cursor-pointer",
          isToday(day) && "border border-primary",
          isSelected ? "bg-primary text-primary-foreground rounded-md" : availabilityColor,
          !hasAvailability && !isSelected && "text-muted-foreground"
        )}
      >
        <span className={cn("font-medium", isSelected && "text-primary-foreground")}>
          {format(day, 'd')}
        </span>
        
        {hasAvailability && !isSelected && (
          <div className="absolute bottom-1 flex items-center justify-center space-x-1 text-[8px]">
            <span className={availabilityPercentage > 50 ? "text-green-600" : "text-amber-600"}>
              {availableCount}/{totalCount}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Memoize the time slots rendering to prevent unnecessary re-renders
  const TimeSlots = useMemo(() => {
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

    if (availableSlots.length === 0) {
      return (
        <div className="mt-4 text-center p-6 bg-gray-50 rounded-md border border-dashed">
          <CalendarIcon className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">No Available Slots</h3>
          <p className="text-sm text-muted-foreground">
            There are no available time slots for the selected date. Please try another date.
          </p>
        </div>
      );
    }

    // Group slots by morning, afternoon, and evening
    const morningSlots = availableSlots.filter(slot => slot.startTime.includes('AM'));
    const afternoonSlots = availableSlots.filter(
      slot => slot.startTime.includes('PM') && parseInt(slot.startTime.split(':')[0]) < 5
    );
    const eveningSlots = availableSlots.filter(
      slot => slot.startTime.includes('PM') && parseInt(slot.startTime.split(':')[0]) >= 5
    );

    return (
      <div className="mt-4 space-y-4">
        {morningSlots.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
              <span className="h-5 w-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mr-2">
                <span className="text-xs">AM</span>
              </span>
              Morning
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {morningSlots.map((slot, index) => (
                <SlotCard key={`morning-${index}`} slot={slot} onBook={handleBookSlot} />
              ))}
            </div>
          </div>
        )}
        
        {afternoonSlots.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
              <span className="h-5 w-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mr-2">
                <span className="text-xs">PM</span>
              </span>
              Afternoon
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {afternoonSlots.map((slot, index) => (
                <SlotCard key={`afternoon-${index}`} slot={slot} onBook={handleBookSlot} />
              ))}
            </div>
          </div>
        )}
        
        {eveningSlots.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
              <span className="h-5 w-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center mr-2">
                <span className="text-xs">EVE</span>
              </span>
              Evening
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {eveningSlots.map((slot, index) => (
                <SlotCard key={`evening-${index}`} slot={slot} onBook={handleBookSlot} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }, [availableSlots, isLoading, selectedDate, handleBookSlot]);

  // Calendar legend component
  const CalendarLegend = () => (
    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
      <div className="flex items-center">
        <div className="w-3 h-3 bg-green-100 mr-1 rounded-sm"></div>
        <span>High Availability</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 bg-yellow-100 mr-1 rounded-sm"></div>
        <span>Medium Availability</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 bg-red-100 mr-1 rounded-sm"></div>
        <span>Low Availability</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 border border-primary mr-1 rounded-sm"></div>
        <span>Today</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Calendar section */}
        <div className="md:w-1/2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Select Date</h3>
            <Select value={calendarView} onValueChange={(value) => setCalendarView(value as 'month' | 'week')}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month View</SelectItem>
                <SelectItem value="week">Week View</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                onMonthChange={handleMonthChange}
                className="rounded-md"
                disabled={date => 
                  isBefore(date, new Date(new Date().setHours(0, 0, 0, 0))) || // Disable past dates
                  isAfter(date, addDays(new Date(), 90))    // Only allow booking up to 90 days in advance
                }
                components={{
                  Day: CustomDay
                }}
                showOutsideDays={false}
                initialFocus
              />
              
              <CalendarLegend />
            </CardContent>
          </Card>
        </div>
        
        {/* Time slots section */}
        <div className="md:w-1/2">
          <h3 className="text-lg font-medium mb-4">Available Time Slots</h3>
          <Card>
            <CardContent className="p-4">
              <div className="mb-4 border-b pb-3">
                <h4 className="font-medium text-lg">
                  {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {serviceId ? "For selected service" : "For all services"}
                  {gurujiId ? " and selected Guruji" : ""}
                  {city ? ` in ${city}` : ""}
                </p>
              </div>
              
              {TimeSlots}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Slot card component
function SlotCard({ slot, onBook }: { slot: TimeSlot, onBook: (slot: TimeSlot) => void }) {
  return (
    <Card 
      className={cn(
        "overflow-hidden transition-colors border",
        slot.available 
          ? "hover:border-green-300 border-green-200" 
          : "bg-gray-50 border-gray-200"
      )}
    >
      <CardContent className="p-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{slot.startTime}</span>
          </div>
          
          {slot.available ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
              <Check className="h-3 w-3" /> Available
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
              <X className="h-3 w-3" /> Booked
            </Badge>
          )}
        </div>
        
        {slot.gurujiName && (
          <p className="text-xs text-muted-foreground mt-1">Reserved by: {slot.gurujiName}</p>
        )}
        
        <Button 
          variant={slot.available ? "default" : "outline"}
          size="sm"
          className="w-full mt-2"
          disabled={!slot.available}
          onClick={() => onBook(slot)}
        >
          {slot.available ? "Book This Slot" : "Unavailable"}
        </Button>
      </CardContent>
    </Card>
  );
}