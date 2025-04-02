import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import MainLayout from "@/components/layouts/MainLayout";
import { Puja } from "@/types/puja";

export default function PujasList() {
  const { data: pujas, isLoading, error } = useQuery<Puja[]>({
    queryKey: ['/api/pujas'],
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error || !pujas) {
    return (
      <MainLayout>
        <div className="container mx-auto py-12">
          <h1 className="text-2xl font-bold mb-6">Pujas</h1>
          <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
            <p>Error loading pujas. Please try again later.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-12">
        <h1 className="text-3xl font-bold mb-2">All Pujas</h1>
        <p className="text-gray-600 mb-8">
          Browse our comprehensive collection of traditional pujas available for booking.
        </p>
        
        {pujas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No pujas available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pujas.map((puja) => (
              <Card key={puja.id} className="overflow-hidden h-full flex flex-col">
                {puja.imageUrl && (
                  <div className="h-48 overflow-hidden">
                    <img 
                      src={puja.imageUrl} 
                      alt={puja.name} 
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                    />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle>{puja.name}</CardTitle>
                  <CardDescription>
                    Duration: {puja.duration} minutes | Type: {puja.type === 'online' ? 'Online' : 'In-person'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-gray-600 mb-2">{puja.description}</p>
                  <p className="text-lg font-semibold text-primary">₹{puja.price}</p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={`/puja/${puja.id}`}>View Details</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}