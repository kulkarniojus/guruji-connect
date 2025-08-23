import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";

// Define our services
const services = [
  {
    id: "online-puja",
    title: "Online Puja Booking",
    description:
      "Book pujas online from the comfort of your home and participate virtually in real-time",
    image: "/images/childpuja.png",
  },
  {
    id: "online-consultation",
    title: "Online Consultation",
    description:
      "Get expert guidance from verified pandits via video call for astrological or spiritual advice",
    image:
      "https://images.unsplash.com/photo-1542856391-010fb87dcfed?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "brahmin-booking",
    title: "Brahmin Booking",
    description:
      "Book experienced Brahmins for various religious ceremonies at your home or preferred location",
    image:
      "https://images.unsplash.com/photo-1557031751-30f159e4ac6c?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "special-occasions",
    title: "Special Occasions",
    description:
      "Book for special occasions like Varsha shradha, Kumarika, Vat Savitri puja, Mangalagaur, and more",
    image:
      "https://images.unsplash.com/photo-1590177600178-8444b586eccc?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "satyanarayan-puja",
    title: "Satyanarayan Puja",
    description:
      "A sacred ritual dedicated to Lord Vishnu that brings prosperity, well-being and spiritual growth",
    image:
      "https://images.unsplash.com/photo-1555400038-63f5ba517a47?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "traditional-puja",
    title: "Traditional Puja Ceremony",
    description:
      "Experience authentic Hindu rituals performed by trained priests following ancient Vedic traditions",
    image: "/images/puja_ceremony.svg",
  },
];

export default function Services() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

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
            {services.map((service) => (
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
                    href={`/services/${service.id}`}
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
        <div className="flex justify-center space-x-2 mt-4 md:hidden">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <button
              key={index}
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
