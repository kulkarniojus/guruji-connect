import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock3, Search, Star, X } from "lucide-react";
import { Link } from "wouter";
import PujaImage from "@/components/PujaImage";
import MainLayout from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Puja } from "@/types/puja";

export default function PujasList() {
  const [search, setSearch] = useState("");
  const { data: pujas, isLoading, isError, refetch } = useQuery<Puja[]>({
    queryKey: ["/api/pujas"],
  });

  const activePujas = useMemo(
    () => (pujas ?? []).filter((puja) => puja.isActive !== false),
    [pujas],
  );
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredPujas = useMemo(() => {
    if (!normalizedSearch) return activePujas;
    return activePujas.filter((puja) =>
      [puja.name, puja.description, puja.type]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase().includes(normalizedSearch)),
    );
  }, [activePujas, normalizedSearch]);

  return (
    <MainLayout>
      <main className="min-h-[70dvh] bg-[#f7f3ea]">
        <section className="relative overflow-hidden border-b border-[#e6dac7] bg-[#eee4d2]">
          <div className="pointer-events-none absolute -right-12 -top-24 h-80 w-80 rounded-full border border-[#d5c4a9]" />
          <div className="pointer-events-none absolute right-8 top-12 h-48 w-48 rounded-full border border-[#d5c4a9]/70" />
          <div className="container relative mx-auto px-4 py-12 sm:px-6 md:py-16">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#a26834]">
              Find the right ceremony for your family
            </p>
            <h1 className="font-poppins text-3xl font-semibold tracking-tight text-[#30291f] md:text-5xl">
              The Puja Catalogue
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#70675b] md:text-lg">
              Explore traditional pujas guided by approved Gurujis. Compare
              ceremonies, timings and details before choosing what feels right.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full max-w-xl">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b7a65]"
                />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search pujas by name or tradition"
                  aria-label="Search pujas"
                  className="h-12 rounded-full border-[#d6c6ad] bg-[#fffdf8] pl-11 pr-11 text-[#3e352a] placeholder:text-[#9b8c78] focus-visible:ring-[#a26834]"
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#88765f] transition-colors hover:bg-[#efe6d8] hover:text-[#473a2b]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {!isLoading && !isError && (
                <p className="text-sm text-[#766b5d]" aria-live="polite">
                  <span className="font-semibold text-[#44392c]">{filteredPujas.length}</span>
                  {" "}of {activePujas.length} {activePujas.length === 1 ? "puja" : "pujas"}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-9 sm:px-6 md:py-12">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card
                  key={index}
                  className="overflow-hidden rounded-2xl border-[#e7ddcd] bg-[#fffdf8]"
                >
                  <Skeleton className="aspect-[16/10] w-full rounded-none bg-[#e9e0d2]" />
                  <CardContent className="space-y-3 p-5">
                    <Skeleton className="h-6 w-3/5 bg-[#e9e0d2]" />
                    <Skeleton className="h-4 w-full bg-[#e9e0d2]" />
                    <Skeleton className="h-4 w-4/5 bg-[#e9e0d2]" />
                    <Skeleton className="h-10 w-full bg-[#e9e0d2]" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isError || !pujas ? (
            <div className="rounded-2xl border border-[#e5d7c2] bg-[#fffdf8] px-6 py-14 text-center">
              <p className="font-poppins text-xl font-semibold text-[#42382c]">
                We couldn’t load the catalogue.
              </p>
              <p className="mt-2 text-sm text-[#786d5e]">
                Check your connection, then try again.
              </p>
              <Button
                onClick={() => void refetch()}
                className="mt-5 rounded-full bg-[#8e5429] px-5 text-[#fffaf3] hover:bg-[#72401e]"
              >
                Try again
              </Button>
            </div>
          ) : activePujas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d9cbb6] bg-[#fbf8f1] px-6 py-16 text-center">
              <Star className="mx-auto h-7 w-7 text-[#a26834]" strokeWidth={1.4} />
              <h2 className="mt-4 font-poppins text-xl font-semibold text-[#42382c]">
                The catalogue is being prepared.
              </h2>
              <p className="mt-2 text-sm text-[#786d5e]">
                Please check back soon for available ceremonies.
              </p>
            </div>
          ) : filteredPujas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d9cbb6] bg-[#fbf8f1] px-6 py-16 text-center">
              <Search className="mx-auto h-7 w-7 text-[#a26834]" strokeWidth={1.5} />
              <h2 className="mt-4 font-poppins text-xl font-semibold text-[#42382c]">
                No pujas match “{search.trim()}”
              </h2>
              <p className="mt-2 text-sm text-[#786d5e]">
                Try another name or clear your search to browse the full catalogue.
              </p>
              <Button
                variant="outline"
                onClick={() => setSearch("")}
                className="mt-5 rounded-full border-[#c8b89e] text-[#5c432a]"
              >
                Clear search
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredPujas.map((puja) => (
                <Card
                  key={puja.id}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border-[#e7ddcd] bg-[#fffdf8] shadow-[0_7px_24px_rgba(79,57,31,0.045)] transition-shadow duration-300 hover:shadow-[0_14px_32px_rgba(79,57,31,0.11)]"
                >
                  <div className="relative overflow-hidden">
                    <PujaImage
                      imageUrl={puja.imageUrl}
                      name={puja.name}
                      className="transition-transform duration-500 group-hover:scale-[1.025]"
                    />
                    {puja.isPopular && (
                      <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-[#fffaf0]/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8d5527] shadow-sm">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        Popular
                      </span>
                    )}
                  </div>
                  <CardContent className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="font-poppins text-xl font-semibold leading-snug text-[#30291f]">
                        {puja.name}
                      </h2>
                      <span className="shrink-0 pt-1 text-lg font-semibold text-[#9a5b2c]">
                        ₹{puja.price ?? puja.basePrice}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-[#746a5d]">
                      {puja.description}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium uppercase tracking-[0.08em] text-[#807363]">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5 text-[#a26834]" />
                        {puja.duration ? `${puja.duration} min` : "Duration varies"}
                      </span>
                      <span className="rounded-full bg-[#f2ebdf] px-2.5 py-1 text-[#705739]">
                        {puja.type === "online" ? "Online" : "In person"}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="gap-2 border-t border-[#eee6d9] px-5 py-4 sm:px-6">
                    <Button
                      asChild
                      variant="outline"
                      className="flex-1 rounded-full border-[#c8b89e] text-[#65482b] hover:bg-[#f5ede0]"
                    >
                      <Link href={`/puja/${puja.id}`}>View details</Link>
                    </Button>
                    <Button
                      asChild
                      className="flex-1 rounded-full bg-[#8e5429] text-[#fffaf3] hover:bg-[#72401e]"
                    >
                      <Link
                        href={`/booking?pujaId=${puja.id}`}
                        className="inline-flex items-center justify-center gap-2"
                      >
                        Book now <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </MainLayout>
  );
}