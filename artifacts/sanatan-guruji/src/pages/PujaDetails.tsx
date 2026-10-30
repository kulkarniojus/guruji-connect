import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Helmet } from 'react-helmet';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Tag, CheckCircle2, ChevronLeft } from 'lucide-react';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import type { Puja } from '../../../shared/schema';
import PujaImage from '@/components/PujaImage';

export default function PujaDetails() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/puja/:id');
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  // Redirect to home if no ID is provided
  useEffect(() => {
    if (!match) {
      setLocation('/');
    }
  }, [match, setLocation]);
  
  // Fetch puja details
  const { data: puja, isLoading, isError } = useQuery<Puja>({
    queryKey: [`/api/pujas/${params?.id}`],
    enabled: !!params?.id
  });
  
  const handleBookNow = () => {
    if (puja) {
      // Type cast inside the function to access id safely
      const pujaToBook = puja as Puja;
      // Use the same selected-puja parameter as the catalogue cards.
      setLocation(`/booking?pujaId=${pujaToBook.id}`);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        {!isMobile && <Header />}
        <main className="container mx-auto px-4 py-8 md:py-12">
          <div className="flex items-center mb-6">
            <Button variant="ghost" size="sm" onClick={() => setLocation('/')} className="mr-2">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <Skeleton className="h-[300px] w-full rounded-lg mb-6" />
              <Skeleton className="h-12 w-3/4 mb-4" />
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-6 w-3/4 mb-6" />
              
              <Separator className="my-6" />
              
              <Skeleton className="h-8 w-1/3 mb-4" />
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-6 w-full mb-2" />
            </div>
            
            <div>
              <Skeleton className="h-[200px] w-full rounded-lg mb-4" />
              <Skeleton className="h-10 w-full mb-4" />
            </div>
          </div>
        </main>
        {!isMobile && <Footer />}
      </div>
    );
  }
  
  if (isError || !puja) {
    return (
      <div className="min-h-screen bg-white">
        {!isMobile && <Header />}
        <main className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Puja</h1>
          <p className="text-gray-600 mb-6">We couldn't load the details for this puja. Please try again later.</p>
          <Button onClick={() => setLocation('/')}>Return to Home</Button>
        </main>
        {!isMobile && <Footer />}
      </div>
    );
  }
  
  // Cast puja to the correct type to fix TypeScript errors
  const pujaData = puja as Puja;
  
  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{pujaData.name ? `${pujaData.name} | Vaidik Dhara` : 'Loading... | Vaidik Dhara'}</title>
        <meta name="description" content={pujaData.name && pujaData.description ? `Book ${pujaData.name} - ${pujaData.description}` : 'Book spiritual services at Vaidik Dhara'} />
      </Helmet>
      
      {!isMobile && <Header />}
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => setLocation('/')} className="mr-2">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <PujaImage imageUrl={pujaData.imageUrl} name={pujaData.name} className="mb-6 rounded-lg" />
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{pujaData.name}</h1>
            
            
            <p className="text-lg text-gray-700 mb-6">{pujaData.description}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-primary mr-2" />
                <span className="text-sm text-gray-600">{pujaData.duration} minutes</span>
              </div>
              <div className="flex items-center">
                <Tag className="h-5 w-5 text-primary mr-2" />
                <span className="text-sm text-gray-600">{pujaData.type} puja</span>
              </div>
            </div>
            
            <Separator className="my-6" />
            
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">What's Included</h2>
              <ul className="space-y-2">
                {pujaData.items && pujaData.items.map((item: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
                {(!pujaData.items || pujaData.items.length === 0) && (
                  <li className="text-gray-500">No specific items listed for this puja.</li>
                )}
              </ul>
            </div>
            
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Puja Benefits</h2>
              <p className="text-gray-700">
                This sacred ceremony helps in bringing prosperity, peace, and spiritual growth to 
                your life and home. It creates a positive energy environment and removes obstacles.
              </p>
            </div>
          </div>
          
          <div>
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-500 mb-1">Starting from</p>
                  <p className="text-3xl font-bold text-primary">₹{pujaData.price ?? pujaData.basePrice}</p>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base Price</span>
                    <span className="font-medium">₹{pujaData.basePrice}</span>
                  </div>
                  {pujaData.price != null && pujaData.price !== pujaData.basePrice && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Special Price</span>
                      <span className="font-medium">₹{pujaData.price}</span>
                    </div>
                  )}
                </div>
                
                <Button className="w-full" size="lg" onClick={handleBookNow}>
                  Book Now
                </Button>
                
                <p className="text-xs text-gray-500 text-center mt-4">
                  No payment required until your booking is confirmed
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      {!isMobile && <Footer />}
    </div>
  );
}