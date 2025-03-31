import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Star } from 'lucide-react';

// Define popular pujas
const popularPujas = [
  {
    id: 'satyanarayan',
    name: 'Satyanarayan Puja',
    price: 1500,
    description: 'A puja dedicated to Lord Vishnu, performed for prosperity and well-being of the family.',
    rating: 4.8,
    bookings: 120,
    image: 'https://images.unsplash.com/photo-1602602444238-8a75da8578c6?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80'
  },
  {
    id: 'ganesh-puja',
    name: 'Ganesh Puja',
    price: 1200,
    description: 'A ceremony to worship Lord Ganesha, performed for removing obstacles and bringing good fortune.',
    rating: 4.9,
    bookings: 145,
    image: 'https://images.unsplash.com/photo-1602989372721-7d65d54a74ef?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80'
  },
  {
    id: 'griha-pravesh',
    name: 'Griha Pravesh',
    price: 2500,
    description: 'A housewarming ceremony performed before entering a new home to invoke positive energy and blessings.',
    rating: 4.7,
    bookings: 98,
    image: 'https://images.unsplash.com/photo-1599946347960-dbf2caca5ba5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80'
  }
];

export default function PopularPujas() {
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 font-poppins">Popular Pujas</h2>
          <p className="mt-2 text-lg text-neutral-600">Most frequently booked pujas on our platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {popularPujas.map(puja => (
            <Card 
              key={puja.id}
              className="bg-neutral-50 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <img src={puja.image} alt={puja.name} className="w-full h-48 object-cover" />
              <CardContent className="p-5">
                <div className="flex justify-between mb-2">
                  <h3 className="font-semibold text-lg text-neutral-900 font-poppins">{puja.name}</h3>
                  <span className="text-primary font-semibold">₹{puja.price}</span>
                </div>
                <p className="text-neutral-600 text-sm mb-4">{puja.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    <span className="ml-1 text-sm text-neutral-600">{puja.rating} ({puja.bookings}+ bookings)</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      className="inline-flex items-center px-3 py-1 text-sm font-medium rounded text-primary hover:bg-primary-50"
                      asChild
                    >
                      <Link href={`/puja/${puja.id}`}>
                        <a>View Details</a>
                      </Link>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="inline-flex items-center px-3 py-1 border border-primary text-sm font-medium rounded text-primary bg-white hover:bg-primary-50"
                      asChild
                    >
                      <Link href={`/booking?puja=${puja.id}`}>
                        <a>Book Now</a>
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button asChild>
            <Link href="/pujas">View All Pujas</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
