import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock3, Star } from "lucide-react";
import { Link } from "wouter";
import PujaImage from "@/components/PujaImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Puja } from "@/types/puja";

export default function PopularPujas() {
  const { data: pujas, isLoading, isError, refetch } = useQuery<Puja[]>({
    queryKey: ["/api/pujas"],
  });

  const popularPujas = (pujas ?? []).filter(
    (puja) => puja.isActive !== false && puja.isPopular === true,
  );

  return (
    <section className="relative overflow-hidden bg-[#f7f3ea] py-16 md:py-24">
      <div className="pointer-events-none absolute -right-24 top-8 h-72 w-72 rounded-full border border-[#dfd3bd]/60" />
      <div className="pointer-events-none absolute -right-12 top-20 h-48 w-48 rounded-full border border-[#dfd3bd]/50" />
      <div className="container relative mx-auto px-4 sm:px-6">
        <div className="mb-9 flex flex-col gap-5 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#a26834]">
              Traditional rituals, thoughtfully arranged
            </p>
            <h2 className="font-poppins text-3xl font-semibold tracking-tight text-[#30291f] md:text-4xl">
              Popular Pujas
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-[#70675b]">
              A selection of ceremonies featured by our team. Every puja is
              led by an approved Guruji.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="w-fit rounded-full border-[#c8b89e] bg-transparent px-5 text-[#5c432a] hover:bg-[#eee5d6]"
          >
            <Link href="/pujas" className="inline-flex items-center gap-2">
              View all pujas <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="overflow-hidden rounded-2xl border-[#e9dfce] bg-[#fffdf8]">
                <Skeleton className="aspect-[16/10] w-full rounded-none bg-[#e9e0d2]" />
                <CardContent className="space-y-3 p-5">
                  <Skeleton className="h-6 w-2/3 bg-[#e9e0d2]" />
                  <Skeleton className="h-4 w-full bg-[#e9e0d2]" />
                  <Skeleton className="h-4 w-4/5 bg-[#e9e0d2]" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-[#e5d7c2] bg-[#fffdf8] px-6 py-10 text-center">
            <p className="font-medium text-[#42382c]">Pujas are taking a moment to load.</p>
            <p className="mt-1 text-sm text-[#786d5e]">Please try again.</p>
            <Button
              variant="outline"
              onClick={() => void refetch()}
              className="mt-5 rounded-full border-[#c8b89e] text-[#5c432a]"
            >
              Retry
            </Button>
          </div>
        ) : popularPujas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d9cbb6] bg-[#fbf8f1] px-6 py-10 text-center">
            <Star className="mx-auto h-6 w-6 text-[#a26834]" strokeWidth={1.5} />
            <p className="mt-3 font-medium text-[#42382c]">Featured pujas will appear here.</p>
            <p className="mt-1 text-sm text-[#786d5e]">
              Browse the full catalogue to find a ceremony for your family.
            </p>
            <Button asChild variant="link" className="mt-2 text-[#8c5426]">
              <Link href="/pujas">Explore all pujas</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {popularPujas.map((puja) => (
              <Card
                key={puja.id}
                className="group overflow-hidden rounded-2xl border-[#e7ddcd] bg-[#fffdf8] shadow-[0_8px_26px_rgba(79,57,31,0.055)] transition-shadow duration-300 hover:shadow-[0_16px_36px_rgba(79,57,31,0.12)]"
              >
                <div className="relative">
                  <PujaImage
                    imageUrl={puja.imageUrl}
                    name={puja.name}
                    className="transition-transform duration-500 group-hover:scale-[1.025]"
                  />
                  <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-[#fffaf0]/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8d5527] shadow-sm">
                    <Star className="h-3.5 w-3.5 fill-current" /> Featured
                  </span>
                </div>
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-poppins text-xl font-semibold leading-snug text-[#30291f]">
                      {puja.name}
                    </h3>
                    <span className="shrink-0 pt-1 text-lg font-semibold text-[#9a5b2c]">
                      ₹{puja.price ?? puja.basePrice}
                    </span>
                  </div>
                  <p className="mt-2 min-h-[3rem] text-sm leading-6 text-[#746a5d] line-clamp-2">
                    {puja.description}
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t border-[#eee6d9] pt-4">
                    <span className="inline-flex items-center gap-2 text-sm text-[#746a5d]">
                      <Clock3 className="h-4 w-4 text-[#a26834]" />
                      {puja.duration ? `${puja.duration} min` : "Duration varies"}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="rounded-full px-3 text-[#75502f] hover:bg-[#f5ede0]"
                      >
                        <Link href={`/puja/${puja.id}`}>Details</Link>
                      </Button>
                      <Button
                        asChild
                        size="sm"
                        className="rounded-full bg-[#8e5429] px-4 text-[#fffaf3] hover:bg-[#72401e]"
                      >
                        <Link href={`/booking?pujaId=${puja.id}`}>Book</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}