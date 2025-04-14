import MainLayout from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

const services = [
  {
    id: 'online-puja',
    title: 'Online Puja Booking',
    description: 'Book pujas online from the comfort of your home and participate virtually in real-time. Experience authentic rituals performed by verified pandits, with detailed explanation and guidance throughout the ceremony.',
    image: '/images/online_puja.png',
  },
  {
    id: 'online-consultation',
    title: 'Online Consultation',
    description: 'Get expert guidance from verified pandits via video call for astrological or spiritual advice. Receive personalized solutions for various life challenges based on ancient scriptures and astrological calculations.',
    image: 'https://images.unsplash.com/photo-1542856391-010fb87dcfed?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'brahmin-booking',
    title: 'Brahmin Booking',
    description: 'Book experienced Brahmins for various religious ceremonies at your home or preferred location. Our verified Brahmins are well-versed in traditional rituals and can perform ceremonies according to your family customs.',
    image: 'https://images.unsplash.com/photo-1557031751-30f159e4ac6c?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'special-occasions',
    title: 'Special Occasions',
    description: 'Book for special occasions like Varsha shradha, Kumarika, Vat Savitri puja, Mangalagaur, and more. We provide comprehensive services including all necessary materials and detailed guidance for these important life events.',
    image: 'https://images.unsplash.com/photo-1590177600178-8444b586eccc?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'satyanarayan-puja',
    title: 'Satyanarayan Puja',
    description: 'A sacred ritual dedicated to Lord Vishnu that brings prosperity, well-being and spiritual growth. This puja is performed to fulfill wishes and offer gratitude for blessings received.',
    image: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'traditional-puja',
    title: 'Traditional Puja Ceremony',
    description: 'Experience authentic traditional pujas performed with precise rituals and mantras. Our services include Griha Pravesh, Naamkaran, Mundan, Upanayana, and many more life ceremonies.',
    image: 'https://images.unsplash.com/photo-1579492450119-80542d516179?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'training',
    title: 'Spiritual Training Programs',
    description: 'Learn traditional rituals, Sanskrit mantras, and spiritual practices through our structured training programs. Our courses are designed for individuals of all backgrounds interested in learning authentic practices.',
    image: 'https://images.unsplash.com/photo-1593080358201-08e4fbcf5af8?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'gifts',
    title: 'Religious Gifts & Products',
    description: 'Shop for authentic religious items, puja samagri, idols, books, and other spiritual products. All items are carefully sourced and blessed, ensuring authenticity and positive energy.',
    image: 'https://images.unsplash.com/photo-1589365278144-c9e705f843ba?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
  },
];

export default function ServicesPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-12">
        <h1 className="text-3xl font-bold mb-2">Our Services</h1>
        <p className="text-gray-600 mb-8 max-w-3xl">
          Discover our comprehensive range of spiritual and religious services, designed to meet your needs
          whether you're seeking online or in-person ceremonies.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="overflow-hidden h-full flex flex-col">
              <div className="h-48 overflow-hidden">
                <img 
                  src={service.image} 
                  alt={service.title} 
                  className="w-full h-full object-cover transition-transform hover:scale-105"
                />
              </div>
              <CardHeader className="pb-2">
                <CardTitle>{service.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-gray-600">{service.description}</p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/services/${service.id}`}>Learn More</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}