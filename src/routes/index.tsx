import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Camera, MessageSquare, Recycle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ListingCard, EmptyState } from "@/components/listing-card";
import { fetchCategories, fetchListings } from "@/lib/listings";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ReUseHub — Give Things a Second Life" },
      { name: "description", content: "A local marketplace to sell pre-owned items or give usable things away for free." },
      { property: "og:title", content: "ReUseHub — Give Things a Second Life" },
      { property: "og:description", content: "Sell pre-owned items or give them away for free to someone nearby." },
    ],
  }),
  component: Home,
});

function Home() {
  const recent = useQuery({ queryKey: ["listings", "recent"], queryFn: () => fetchListings({ sort: "newest" }) });
  const free = useQuery({ queryKey: ["listings", "free-home"], queryFn: () => fetchListings({ type: "donation" }) });
  const cats = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  return (
    <>
      <section className="container-page grid items-center gap-10 py-10 md:grid-cols-[1fr_1.1fr] md:py-16">
        <div>
          <p className="mb-3 text-sm font-semibold text-primary">Local second-hand marketplace</p>
          <h1 className="text-4xl font-bold leading-[1.05] sm:text-5xl">Give things a second life.</h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Sell the things you no longer use, or give them away for free. Find good furniture, books and electronics from people near you.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/browse">Explore items <ArrowRight className="size-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/sell" search={{ type: "donation" }}>Give away for free</Link></Button>
          </div>
        </div>
        <img src={hero} alt="Pre-owned chair, books and a plant set aside to give away" width={1600} height={912} className="aspect-[16/10] w-full rounded-xl object-cover" />
      </section>

      <section className="container-page py-6" aria-labelledby="cat-h">
        <h2 id="cat-h" className="mb-4 text-xl font-semibold">Browse by category</h2>
        <div className="flex flex-wrap gap-2">
          {cats.data?.map((c) => (
            <Link key={c.id} to="/browse" search={{ category: c.slug }} className="rounded-full border bg-card px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary">
              {c.name}
            </Link>
          ))}
          {cats.isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-24 rounded-full" />)}
        </div>
      </section>

      <ListingSection title="Recently listed" link={{ label: "See all", search: {} }} query={recent} />
      <ListingSection title="Free to a good home" link={{ label: "All free items", search: { type: "donation" as const } }} query={free} />

      <section className="container-page py-12" aria-labelledby="how-h">
        <h2 id="how-h" className="mb-6 text-xl font-semibold">How it works</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Camera, t: "List it", b: "Snap a photo, set a price or mark it free. Takes about two minutes." },
            { icon: MessageSquare, t: "Get messages", b: "Interested people send you an inquiry. Reply from your inbox." },
            { icon: Recycle, t: "Hand it over", b: "Meet up, pass it on and mark the listing as sold or given away." },
          ].map((s, i) => (
            <li key={s.t} className="rounded-lg border bg-card p-5">
              <s.icon className="size-5 text-primary" aria-hidden />
              <p className="mt-3 text-xs font-semibold text-muted-foreground">Step {i + 1}</p>
              <h3 className="font-sans text-base font-semibold tracking-normal">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.b}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

function ListingSection({
  title,
  link,
  query,
}: {
  title: string;
  link: { label: string; search: { type?: "donation" } };
  query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof fetchListings>>>>;
}) {
  return (
    <section className="container-page py-8">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Link to="/browse" search={link.search} className="text-sm font-medium text-primary hover:underline">{link.label}</Link>
      </div>
      {query.isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)}</div>
      ) : query.isError ? (
        <EmptyState title="Couldn't load items" body="Please refresh the page to try again." />
      ) : query.data!.rows.length === 0 ? (
        <EmptyState title="Nothing here yet" body="Be the first to list something." />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {query.data!.rows.slice(0, 4).map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}
    </section>
  );
}
