import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'wouter';
import { Star } from 'lucide-react';

export default function PopularPujas() {
  const { data: pujas = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/pujas'],
  });

  // Show only active pujas marked as popular, or first 3 active pujas as fallback
  const popularPujas = pujas.filter((p: any) => p.isActive !== false && p.isPopular).slice(0, 3);
  const displayPujas = popularPujas.length > 0
    ? popularPujas
    : pujas.filter((p: any) => p.isActive !== false).slice(0, 3);

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 font-poppins">Popular Pujas</h2>
          <p className="mt-2 text-lg text-neutral-600">Most frequently booked pujas on our platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="rounded-lg overflow-hidden shadow-sm">
                  <Skeleton className="w-full h-48" />
                  <CardContent className="p-5 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))
            : displayPujas.map((puja: any) => (
                <Card
                  key={puja.id}
                  className="bg-neutral-50 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  {puja.imageUrl ? (
                    <img src={puja.imageUrl} alt={puja.name} className="w-full h-48 object-cover" />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-amber-200 flex items-center justify-center">
                      <span className="text-4xl">🪔</span>
                    </div>
                  )}
                  <CardContent className="p-5">
                    <div className="flex justify-between mb-2">
                      <h3 className="font-semibold text-lg text-neutral-900 font-poppins">{puja.name}</h3>
                      <span className="text-primary font-semibold">
                        {puja.price ? `₹${puja.price}` : puja.basePrice ? `₹${puja.basePrice}` : ''}
                      </span>
                    </div>
                    <p className="text-neutral-600 text-sm mb-4 line-clamp-2">{puja.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Star className="h-5 w-5 text-yellow-400 fill-current" />
                        <span className="ml-1 text-sm text-neutral-600">
                          {puja.duration ? `${puja.duration} min` : 'In-person'}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          className="inline-flex items-center px-3 py-1 text-sm font-medium rounded text-primary hover:bg-primary-50"
                          asChild
                        >
                          <Link href={`/puja/${puja.id}`}>View Details</Link>
                        </Button>
                        <Button
                          variant="outline"
                          className="inline-flex items-center px-3 py-1 border border-primary text-sm font-medium rounded text-primary bg-white hover:bg-primary-50"
                          asChild
                        >
                          <Link href={`/booking?pujaId=${puja.id}`}>Book Now</Link>
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
