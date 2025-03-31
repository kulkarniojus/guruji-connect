import { useState } from 'react';
import { useLocation } from 'wouter';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const cities = [
  { value: 'mumbai', label: 'Mumbai' },
  { value: 'delhi', label: 'Delhi' },
  { value: 'bangalore', label: 'Bangalore' },
  { value: 'pune', label: 'Pune' },
  { value: 'chennai', label: 'Chennai' }
];

const pujas = [
  { value: 'satyanarayan', label: 'Satyanarayan Puja' },
  { value: 'griha-pravesh', label: 'Griha Pravesh' },
  { value: 'ganesh-puja', label: 'Ganesh Puja' },
  { value: 'navgraha-shanti', label: 'Navgraha Shanti' },
  { value: 'rudrabhishek', label: 'Rudrabhishek' }
];

export default function MobileHero() {
  const [, setLocation] = useLocation();
  const [city, setCity] = useState<string>('');
  const [puja, setPuja] = useState<string>('');
  const [date, setDate] = useState<Date | undefined>(undefined);

  const handleSearch = () => {
    // Build query parameters
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    if (puja) params.append('puja', puja);
    if (date) params.append('date', date.toISOString());

    // Redirect to booking page with query params
    setLocation(`/booking?${params.toString()}`);
  };

  return (
    <section className="bg-gradient-to-r from-primary to-primary-600 text-white">
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-3 font-poppins leading-tight">
              Connect with verified Pandits for your spiritual needs
            </h1>
            <p className="text-base mb-6 text-white text-opacity-90">
              Book online or in-person puja services with expert Gurujis
            </p>
          </div>
          
          {/* Mobile search form with stacked fields */}
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <div className="flex flex-col space-y-4">
              <div>
                <label htmlFor="mobile-city" className="block text-xs font-medium text-neutral-700 mb-1">City</label>
                <Select onValueChange={(value) => setCity(value)}>
                  <SelectTrigger id="mobile-city" className="w-full">
                    <SelectValue placeholder="Select City" />
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
              
              <div>
                <label htmlFor="mobile-puja" className="block text-xs font-medium text-neutral-700 mb-1">Puja Service</label>
                <Select onValueChange={(value) => setPuja(value)}>
                  <SelectTrigger id="mobile-puja" className="w-full">
                    <SelectValue placeholder="Select Puja" />
                  </SelectTrigger>
                  <SelectContent>
                    {pujas.map((puja) => (
                      <SelectItem key={puja.value} value={puja.value}>
                        {puja.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label htmlFor="mobile-date" className="block text-xs font-medium text-neutral-700 mb-1">Date & Time</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="mobile-date"
                      variant={"outline"}
                      className={cn(
                        "w-full text-left justify-start font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <Button 
                onClick={handleSearch}
                className="w-full"
                size="lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Find Guruji
              </Button>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-8 grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center">
              <div className="bg-white bg-opacity-20 rounded-full p-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-xs">Verified Pandits</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-white bg-opacity-20 rounded-full p-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs">24/7 Support</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-white bg-opacity-20 rounded-full p-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs">Secure Payments</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}