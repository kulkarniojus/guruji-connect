import MainLayout from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Link, useParams } from "wouter";

type Service = {
  id: number;
  slug: string;
  title: string;
  description: string;
  image: string;
  bookingHref: string;
  isActive: boolean;
  sortOrder: number;
};

export default function ServiceDetail() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { data: service, isLoading, isError, refetch } = useQuery<Service>({
    queryKey: ["/api/services", slug],
    queryFn: () => apiRequest("GET", `/api/services/${encodeURIComponent(slug)}`).then(response => response.json()),
    enabled: Boolean(slug),
  });

  return (
    <MainLayout>
      <main className="container mx-auto max-w-5xl px-4 py-8 md:py-12">
        <Button asChild type="button" variant="ghost" className="mb-5 -ml-3">
          <Link href="/services"><ArrowLeft className="mr-2 h-4 w-4" />All services</Link>
        </Button>
        {isLoading ? (
          <div className="space-y-5" aria-label="Loading service">
            <div className="h-72 animate-pulse rounded-xl bg-muted md:h-[420px]" />
            <div className="h-9 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-20 animate-pulse rounded bg-muted" />
          </div>
        ) : isError || !service ? (
          <Card role="alert">
            <CardContent className="flex flex-col items-start gap-3 p-6">
              <h1 className="text-xl font-semibold">Service unavailable</h1>
              <p className="text-sm text-muted-foreground">This service could not be loaded or is no longer available.</p>
              {isError && <Button type="button" variant="outline" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>}
              <Button asChild variant="link" className="px-0"><Link href="/services">Browse available services</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <article className="overflow-hidden rounded-xl border bg-card">
            <div className="h-64 bg-muted sm:h-80 md:h-[430px]">
              <img src={service.image} alt={service.title} decoding="async"
                width={1200} height={800} className="h-full w-full object-cover object-top" />
            </div>
            <div className="grid gap-8 p-5 sm:p-8 md:grid-cols-[1fr_auto] md:items-end md:p-10">
              <div className="max-w-3xl">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{service.title}</h1>
                <p className="mt-4 whitespace-pre-line leading-7 text-muted-foreground">{service.description}</p>
              </div>
              <Button asChild size="lg" className="w-full md:w-auto">
                <Link href={service.bookingHref}>Book Now</Link>
              </Button>
            </div>
          </article>
        )}
      </main>
    </MainLayout>
  );
}
