import MainLayout from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RefreshCw } from "lucide-react";

type Service = { id: number; slug: string; title: string; description: string; image: string; bookingHref: string; isActive: boolean; sortOrder: number };

export default function ServicesPage() {
  const { data: serviceRows = [], isLoading, isError, refetch } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    queryFn: () => apiRequest("GET", "/api/services").then(response => response.json()),
  });
  const services = serviceRows.filter(service => service.isActive).slice().sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <MainLayout>
      <div className="container mx-auto py-12">
        <h1 className="text-3xl font-bold mb-2">Our Services</h1>
        <p className="text-gray-600 mb-8 max-w-3xl">
          Discover our comprehensive range of spiritual and religious services,
          designed to meet your needs whether you're seeking online or in-person
          ceremonies.
        </p>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Loading services">
            {[0, 1, 2].map(item => <div key={item} className="h-80 animate-pulse rounded-lg bg-muted" />)}
          </div>
        ) : isError ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <span>Services could not be loaded. Please try again.</span>
            <Button type="button" variant="outline" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
          </div>
        ) : services.length === 0 ? (
          <p className="rounded-md border bg-card p-8 text-center text-muted-foreground">No services are available at the moment.</p>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card
              key={service.id}
              className="overflow-hidden h-full flex flex-col"
            >
              <div className="h-48 overflow-hidden">
                <img
                  src={service.image}
                  alt={service.title}
                  loading="lazy"
                  decoding="async"
                  width={1200}
                  height={800}
                  className="w-full h-full object-cover object-top transition-transform hover:scale-105"
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
                  <Link href={`/services/${service.slug}`}>View service</Link>
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
