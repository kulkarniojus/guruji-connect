import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import type { CalendarProps } from '@/components/ui/calendar';

interface Availability {
  date: Date;
  slots: {
    time: string;
    isAvailable: boolean;
  }[];
  type: 'high' | 'medium' | 'low' | 'none';
}

interface ServiceAvailabilityCalendarProps {
  gurujiId?: number;
  pujaId?: number;
  onSelectDate?: (date: Date, availability: Availability) => void;
}

export function ServiceAvailabilityCalendar({ 
  gurujiId, 
  pujaId, 
  onSelectDate 
}: ServiceAvailabilityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Fetch availability data based on gurujiId and pujaId
  const { data: availabilityData = [], isLoading } = useQuery({
    queryKey: ['availability', gurujiId, pujaId],
    queryFn: async () => {
      try {
        const response = await apiRequest(
          'GET',
          `/api/availability?${gurujiId ? `gurujiId=${gurujiId}` : ''}${pujaId ? `&pujaId=${pujaId}` : ''}`
        );
        const data = await response.json();
        
        // Convert string dates to Date objects
        return data.map((item: any) => ({
          ...item,
          date: new Date(item.date)
        }));
      } catch (error) {
        console.error('Failed to fetch availability data:', error);
        return [];
      }
    },
    enabled: !!(gurujiId || pujaId)
  });

  // Mock data in case real data is not available (for preview)
  const mockAvailabilityData = React.useMemo(() => {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    
    const mockData: Availability[] = [];
    
    // Generate mock data for the next 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Random availability type
      const types: ('high' | 'medium' | 'low' | 'none')[] = ['high', 'medium', 'low', 'none'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      
      // Generate random time slots
      const slots = [];
      const startHour = 8; // 8 AM
      const endHour = 20; // 8 PM
      
      for (let hour = startHour; hour < endHour; hour++) {
        // 30-minute increments
        for (let minute of [0, 30]) {
          const isAvailable = Math.random() > 0.3; // 70% chance of being available
          slots.push({
            time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
            isAvailable
          });
        }
      }
      
      mockData.push({
        date,
        slots,
        type: randomType
      });
    }
    
    return mockData;
  }, []);

  // Use real data if available, otherwise use mock data
  const availability = availabilityData.length > 0 ? availabilityData : mockAvailabilityData;

  // Handle date selection
  const handleSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      
      const selectedAvailability = availability.find(a => 
        isSameDay(new Date(a.date), date)
      );
      
      if (selectedAvailability && onSelectDate) {
        onSelectDate(date, selectedAvailability);
      }
    }
  };

  // Determine color for date cells based on availability
  const getDayClassName = (date: Date) => {
    const dayAvailability = availability.find(a => isSameDay(new Date(a.date), date));
    
    if (!dayAvailability) return '';
    
    switch (dayAvailability.type) {
      case 'high':
        return 'bg-green-100 text-green-900 hover:bg-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-900 hover:bg-yellow-200';
      case 'low':
        return 'bg-orange-100 text-orange-900 hover:bg-orange-200';
      case 'none':
        return 'bg-red-100 text-red-900 hover:bg-red-200';
      default:
        return '';
    }
  };

  // Get selected day availability
  const selectedDayAvailability = selectedDate 
    ? availability.find(a => isSameDay(new Date(a.date), selectedDate))
    : undefined;

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Service Availability Calendar</CardTitle>
        <div className="flex justify-center space-x-4 text-sm">
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-green-500 mr-1"></span>
            <span>High</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></span>
            <span>Medium</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-orange-500 mr-1"></span>
            <span>Low</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-red-500 mr-1"></span>
            <span>None</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            className="rounded-md border"
            modifiers={{
              highlighted: availability.map(a => new Date(a.date))
            }}
            modifiersClassNames={{
              highlighted: "highlighted-day"
            }}
            // Custom rendering is used for illustrating availability
            // This will be replaced by a proper implementation using DayPicker's modifiers
            footer={
              <div className="mt-2 text-xs text-center text-muted-foreground">
                {isLoading ? 'Loading availability...' : 'Click a date to see available slots'}
              </div>
            }
          />
        </TooltipProvider>

        {selectedDayAvailability && (
          <div className="mt-4">
            <h3 className="font-medium text-sm mb-2">
              Available Time Slots for {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {selectedDayAvailability.slots.map((slot, index) => (
                <Badge
                  key={index}
                  variant={slot.isAvailable ? 'outline' : 'secondary'}
                  className={cn(
                    "cursor-pointer text-center py-1",
                    slot.isAvailable 
                      ? "hover:bg-primary hover:text-primary-foreground" 
                      : "opacity-50 cursor-not-allowed"
                  )}
                >
                  {slot.time}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}