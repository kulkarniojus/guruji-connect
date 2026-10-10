import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type Service = { id: number; slug: string; title: string; description: string; image: string; isActive: boolean; sortOrder: number };

export default function Services() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const { data: serviceRows = [], isLoading, isError, refetch } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    queryFn: () => apiRequest("GET", "/api/services").then(response => response.json()),
  });
  const services = serviceRows.filter(service => service.isActive).slice().sort((a, b) => a.sortOrder - b.sortOrder);

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -300, behavior: "smooth" });
      setScrollPosition(carouselRef.current.scrollLeft - 300);
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 300, behavior: "smooth" });
      setScrollPosition(carouselRef.current.scrollLeft + 300);
    }
  };

  // Handle scroll events to update button visibility
  const handleScroll = () => {
    if (carouselRef.current) {
      setScrollPosition(carouselRef.current.scrollLeft);
    }
  };

  return (
    <section className="py-8 md:py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-xl md:text-3xl font-bold text-neutral-900 font-poppins">
            Our Services
          </h2>
          <p className="mt-2 text-sm md:text-lg text-neutral-600">
            Connect with experienced Gurujis for various puja services
          </p>
        </div>

        <div className="relative">
          {/* Service Categories Carousel */}
          <div
            ref={carouselRef}
            onScroll={handleScroll}
            className="overflow-x-auto scrollbar-hide pb-4 flex space-x-4 snap-x"
          >
            {isLoading ? (
              [0, 1, 2].map(item => <div key={item} className="h-72 w-64 flex-shrink-0 animate-pulse rounded-lg bg-neutral-100 md:w-72" aria-hidden="true" />)
            ) : isError ? (
              <div role="alert" className="flex w-full flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-sm text-neutral-700 sm:flex-row sm:items-center sm:justify-between">
                <span>Services could not be loaded.</span>
                <Button type="button" variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
              </div>
            ) : services.length === 0 ? (
              <p className="w-full py-8 text-center text-sm text-neutral-600">No services are available at the moment.</p>
            ) : services.map((service) => (
              <Card
                key={service.id}
                className="bg-neutral-50 rounded-lg shadow-sm overflow-hidden w-64 md:w-72 hover:shadow-md transition-shadow duration-300 flex-shrink-0 snap-start"
              >
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-32 md:h-40 object-cover"
                />
                <CardContent className="p-3 md:p-4">
                  <h3 className="font-semibold text-base md:text-lg text-neutral-900 font-poppins">
                    {service.title}
                  </h3>
                  <p className="mt-1 md:mt-2 text-neutral-600 text-xs md:text-sm">
                    {service.description}
                  </p>
                  <Link
                    href={`/services/${service.slug}`}
                    className="mt-2 md:mt-4 inline-flex items-center text-primary hover:text-primary-700 cursor-pointer text-sm"
                  >
                    Learn more
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Navigation buttons - shown only on desktop */}
          <Button
            variant="outline"
            size="icon"
            className={`absolute left-0 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-2 shadow-md text-neutral-700 hidden md:flex hover:bg-neutral-50 ${scrollPosition <= 0 ? "invisible" : "visible"}`}
            onClick={scrollLeft}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-2 shadow-md text-neutral-700 hidden md:flex hover:bg-neutral-50"
            onClick={scrollRight}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Dot indicators for mobile */}
        {services.length > 1 && (
        <div className="flex justify-center space-x-2 mt-4 md:hidden">
          {services.map((service, index) => (
            <button
              key={service.id}
              type="button"
              aria-label={`Show service ${index + 1}`}
              aria-current={index === Math.floor(scrollPosition / 300) ? "true" : undefined}
              className={`h-2 w-2 rounded-full ${index === Math.floor(scrollPosition / 300) ? "bg-primary" : "bg-neutral-300"}`}
              onClick={() => {
                if (carouselRef.current) {
                  carouselRef.current.scrollTo({
                    left: index * 300,
                    behavior: "smooth",
                  });
                }
              }}
            />
          ))}
        </div>
        )}

        <div className="text-center mt-6 md:mt-8">
          <Button
            asChild
            className="px-4 py-2 md:px-5 md:py-3 text-sm md:text-base"
          >
            <Link href="/services">View All Services</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
