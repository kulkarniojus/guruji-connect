import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';

// Define our services
const services = [
  {
    id: 'online-puja',
    title: 'Online Puja Booking',
    description: 'Book pujas online from the comfort of your home and participate virtually in real-time',
    image: 'https://images.unsplash.com/photo-1584721901817-1823f3b8ad3d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'online-consultation',
    title: 'Online Consultation',
    description: 'Get expert guidance from verified pandits via video call for astrological or spiritual advice',
    image: 'https://images.unsplash.com/photo-1595503240812-7286dafaddc1?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'brahmin-booking',
    title: 'Brahmin Booking',
    description: 'Book experienced Brahmins for various religious ceremonies at your home or preferred location',
    image: 'https://images.unsplash.com/photo-1594661387748-3d7c037a0a91?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'special-occasions',
    title: 'Special Occasions',
    description: 'Book for special occasions like Varsha shradha, Kumarika, Vat Savitri puja, Mangalagaur, and more',
    image: 'https://images.unsplash.com/photo-1617473346681-58383870ca6a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
  },
];

export default function Services() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -300, behavior: 'smooth' });
      setScrollPosition(carouselRef.current.scrollLeft - 300);
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 300, behavior: 'smooth' });
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
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 font-poppins">Our Services</h2>
          <p className="mt-2 text-lg text-neutral-600">Connect with experienced Gurujis for various puja services</p>
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
                className="bg-neutral-50 rounded-lg shadow-sm overflow-hidden w-72 hover:shadow-md transition-shadow duration-300 flex-shrink-0 snap-start"
              >
                <img 
                  src={service.image} 
                  alt={service.title} 
                  className="w-full h-40 object-cover" 
                />
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg text-neutral-900 font-poppins">{service.title}</h3>
                  <p className="mt-2 text-neutral-600 text-sm">{service.description}</p>
                  <Link href={`/services/${service.id}`}>
                    <a className="mt-4 inline-flex items-center text-primary hover:text-primary-700">
                      Learn more
                      <ChevronRight className="h-5 w-5 ml-1" />
                    </a>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Navigation buttons */}
          <Button 
            variant="outline" 
            size="icon" 
            className={`absolute left-0 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-2 shadow-md text-neutral-700 hidden md:flex hover:bg-neutral-50 ${scrollPosition <= 0 ? 'invisible' : 'visible'}`}
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
        
        <div className="text-center mt-8">
          <Button asChild className="px-5 py-3">
            <Link href="/services">View All Services</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
