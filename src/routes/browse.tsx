import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ListingCard, EmptyState } from "@/components/listing-card";
import { CONDITIONS, PAGE_SIZE, fetchCategories, fetchListings } from "@/lib/listings";

const searchSchema = z.object({
  q: z.string().max(80).optional().catch(undefined),
  category: z.string().max(40).optional().catch(undefined),
  type: z.enum(["sale", "donation"]).optional().catch(undefined),
  condition: z.enum(["new", "like_new", "good", "fair"]).optional().catch(undefined),
  min: z.coerce.number().min(0).optional().catch(undefined),
  max: z.coerce.number().min(0).optional().catch(undefined),
  sort: z.enum(["newest", "price_asc", "price_desc"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/browse")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Browse items — ReUseHub" },
      { name: "description", content: "Search second-hand items for sale and free donations by category, condition and price." },
      { property: "og:title", content: "Browse items — ReUseHub" },
      { property: "og:description", content: "Search second-hand items and free donations near you." },
    ],
  }),
  component: Browse,
});

const selectCls = "h-10 w-full rounded-md border bg-card px-3 text-sm";

function Browse() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/browse" });
  const [q, setQ] = useState(s.q ?? "");
  const [min, setMin] = useState(s.min?.toString() ?? "");
  const [max, setMax] = useState(s.max?.toString() ?? "");
  useEffect(() => { setQ(s.q ?? ""); }, [s.q]);

  const set = (patch: Partial<z.infer<typeof searchSchema>>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }) });

  const cats = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const list = useQuery({ queryKey: ["listings", "browse", s], queryFn: () => fetchListings(s), placeholderData: keepPreviousData });
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1;
  const isFree = s.type === "donation";

  return (
    <div className="container-page py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{isFree ? "Free items" : "Browse items"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isFree ? "Everything here is free. Message the donor to arrange pickup." : "Pre-owned items for sale and free donations."}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
        <aside aria-label="Filters" className="space-y-5">
          <form onSubmit={(e) => { e.preventDefault(); set({ q: q.trim() || undefined }); }} className="space-y-1.5">
            <label htmlFor="q" className="text-sm font-medium">Keyword</label>
            <div className="flex gap-2">
              <input id="q" value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} placeholder="e.g. lamp" className={selectCls} />
              <Button type="submit" size="sm" className="h-10">Go</Button>
            </div>
          </form>
          <div className="space-y-1.5">
            <label htmlFor="type" className="text-sm font-medium">Listing type</label>
            <select id="type" className={selectCls} value={s.type ?? ""} onChange={(e) => set({ type: (e.target.value || undefined) as never })}>
              <option value="">All</option>
              <option value="sale">For sale</option>
              <option value="donation">Free donation</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cat" className="text-sm font-medium">Category</label>
            <select id="cat" className={selectCls} value={s.category ?? ""} onChange={(e) => set({ category: e.target.value || undefined })}>
              <option value="">All categories</option>
              {cats.data?.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cond" className="text-sm font-medium">Condition</label>
            <select id="cond" className={selectCls} value={s.condition ?? ""} onChange={(e) => set({ condition: (e.target.value || undefined) as never })}>
              <option value="">Any condition</option>
              {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          {!isFree && (
            <form
              className="space-y-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                const mn = min ? Number(min) : undefined;
                const mx = max ? Number(max) : undefined;
                set({ min: mn, max: mx });
              }}
            >
              <span className="text-sm font-medium">Price (৳)</span>
              <div className="flex items-center gap-2">
                <label htmlFor="min" className="sr-only">Minimum price</label>
                <input id="min" type="number" min={0} inputMode="numeric" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value)} className={selectCls} />
                <span aria-hidden>–</span>
                <label htmlFor="max" className="sr-only">Maximum price</label>
                <input id="max" type="number" min={0} inputMode="numeric" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value)} className={selectCls} />
              </div>
              <Button type="submit" variant="outline" size="sm" className="w-full">Apply price</Button>
              <p className="text-xs text-muted-foreground">Price filters hide free items.</p>
            </form>
          )}
          <Button variant="ghost" size="sm" className="w-full" onClick={() => { setQ(""); setMin(""); setMax(""); navigate({ search: {} }); }}>
            Clear all filters
          </Button>
        </aside>

        <section aria-live="polite">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {list.data ? `${list.data.total} item${list.data.total === 1 ? "" : "s"}` : "Loading…"}
              {s.q && <> for “{s.q}”</>}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <span>Sort</span>
              <select className="h-9 rounded-md border bg-card px-2" value={s.sort ?? "newest"} onChange={(e) => set({ sort: e.target.value as never })}>
                <option value="newest">Newest</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
              </select>
            </label>
          </div>

          {list.isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)}</div>
          ) : list.isError ? (
            <EmptyState title="Couldn't load items" body="Something went wrong. Please try again." />
          ) : list.data!.rows.length === 0 ? (
            <EmptyState
              title="No items match your filters"
              body="Try a different keyword, widen the price range or clear some filters."
              action={<Button variant="outline" onClick={() => navigate({ search: {} })}>Clear filters</Button>}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {list.data!.rows.map((l) => <ListingCard key={l.id} listing={l} />)}
              </div>
              {totalPages > 1 && (
                <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
                  <Button variant="outline" size="sm" disabled={(s.page ?? 1) <= 1} asChild={(s.page ?? 1) > 1}>
                    {(s.page ?? 1) > 1 ? <Link to="/browse" search={{ ...s, page: (s.page ?? 1) - 1 }}>Previous</Link> : <span>Previous</span>}
                  </Button>
                  <span className="text-sm">Page {s.page ?? 1} of {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={(s.page ?? 1) >= totalPages} asChild={(s.page ?? 1) < totalPages}>
                    {(s.page ?? 1) < totalPages ? <Link to="/browse" search={{ ...s, page: (s.page ?? 1) + 1 }}>Next</Link> : <span>Next</span>}
                  </Button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
