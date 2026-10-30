import { useState } from "react";
import { clearBookingDraft } from "@/components/booking/bookingDraft";
import { useLocation } from "wouter";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";

export default function Hero() {
  const [, setLocation] = useLocation();
  const [city, setCity] = useState<string>("");
  const [puja, setPuja] = useState<string>("");
  const [pujaSearch, setPujaSearch] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const { toast } = useToast();

  // Fetch cities from API
  const { data: citiesData = [], isLoading: isCitiesLoading } = useQuery({
    queryKey: ["/api/cities"],
    select: (data: any[]) =>
      data.map((city) => ({
        value: city.name.toLowerCase().replace(/\s+/g, "-"),
        label: `${city.name}, ${city.state}`,
      })),
  });

  // Fetch pujas from API
  const { data: pujasData = [], isLoading: isPujasLoading } = useQuery({
    queryKey: ["/api/pujas"],
    select: (data: any[]) =>
      data.map((puja) => ({
        value: puja.id.toString(),
        label: puja.name,
      })),
  });

  const handleSearch = () => {
    // Validate mandatory fields
    if (!city) {
      toast({
        title: "City is required",
        description: "Please select a city to continue",
        variant: "destructive",
      });
      return;
    }

    if (!puja) {
      toast({
        title: "Puja name is required",
        description: "Please select a puja to continue",
        variant: "destructive",
      });
      return;
    }

    if (!date) {
      toast({
        title: "Date is required",
        description: "Please select a date to continue",
        variant: "destructive",
      });
      return;
    }

    // Build query parameters
    const params = new URLSearchParams();
    params.append("city", city);
    params.append("puja", puja);
    params.append("date", date.toISOString());

    // Find puja label to pass along
    const selectedPuja = pujasData.find((p) => p.value === puja);
    if (selectedPuja) {
      params.append("pujaName", selectedPuja.label);
    }

    // Redirect to booking page with query params
    // A new search is not a return from authentication for an old booking.
    clearBookingDraft();
    setLocation(`/booking?${params.toString()}`);
  };

  return (
    <section className="bg-gradient-to-r from-primary to-primary-600 text-white">
      <div className="container mx-auto w-full px-4 py-8 sm:py-12 md:py-20">
        <div className="flex w-full min-w-0 flex-col md:flex-row items-center">
          <div className="w-full min-w-0 md:w-1/2 mb-8 md:mb-0">
            <h1 className="break-words text-3xl md:text-4xl lg:text-5xl font-bold mb-4 font-poppins leading-tight">
              Connecting Hearts with Vaidik Wisdom
            </h1>
            <p className="text-lg md:text-xl mb-8 text-white text-opacity-90">
              Book online or in-person puja services, consultations, and more
              with expert Gurujis all over India
            </p>

            {/* Search form */}
            <div className="w-full min-w-0 bg-white text-foreground rounded-lg p-4 shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <label
                    htmlFor="city"
                    className="block text-xs font-medium text-neutral-700 mb-1"
                  >
                    City
                  </label>
                  <Select
                    value={city}
                    onValueChange={(value) => setCity(value)}
                    disabled={isCitiesLoading}
                  >
                    <SelectTrigger id="city" className="w-full">
                      <SelectValue
                        placeholder={
                          isCitiesLoading ? "Loading cities..." : "Select City"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {citiesData.map((city) => (
                        <SelectItem key={city.value} value={city.value}>
                          {city.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-1">
                  <label
                    htmlFor="puja"
                    className="block text-xs font-medium text-neutral-700 mb-1"
                  >
                    Puja Name
                  </label>
                  <Select
                    value={puja}
                    onValueChange={(value) => setPuja(value)}
                    disabled={isPujasLoading}
                  >
                    <SelectTrigger id="puja" className="w-full">
                      <SelectValue
                        placeholder={
                          isPujasLoading ? "Loading pujas..." : "Select Puja"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="sticky top-0 z-10 bg-popover p-2">
                        <Input aria-label="Search pujas on home page" placeholder="Search pujas..." value={pujaSearch}
                          onChange={e => setPujaSearch(e.target.value)} onKeyDown={e => { if (e.key !== 'Escape') e.stopPropagation(); }} />
                      </div>
                      {pujasData.filter(p => p.label.toLowerCase().includes(pujaSearch.trim().toLowerCase())).map((puja) => (
                        <SelectItem key={puja.value} value={puja.value}>
                          {puja.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-1">
                  <label
                    htmlFor="date"
                    className="block text-xs font-medium text-neutral-700 mb-1"
                  >
                    Date & Time
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-full text-left justify-start font-normal",
                          !date && "text-muted-foreground",
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
                        fromDate={new Date()}
                        onSelect={setDate}
                        disabled={day => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return day < today;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-neutral-700 mb-1 invisible">
                    Search
                  </label>
                  <Button onClick={handleSearch} className="w-full">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    Find Guruji
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full min-w-0 md:w-1/2 md:pl-12">
            {/* We'll use a placeholder image that's commonly used for spiritual services */}
            <img
              src="/images/puja_ceremony.png"
              alt="Puja ceremony"
              className="rounded-lg shadow-xl w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
