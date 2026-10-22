import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Calendar, Flag, MapPin, Tag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ListingCard, ListingImage, TypeBadge } from "@/components/listing-card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { conditionLabel, fetchListing, fetchListings, formatDate, formatPrice, statusLabel } from "@/lib/listings";

export const Route = createFileRoute("/item/$id")({
  loader: async ({ params }) => {
    if (!/^[0-9a-f-]{36}$/i.test(params.id)) throw notFound();
    const listing = await fetchListing(params.id);
    if (!listing) throw notFound();
    return { listing };
  },
  head: ({ loaderData }) => {
    const l = loaderData?.listing;
    const title = l ? `${l.title} — ${formatPrice(l.listing_type, l.price)} | ReUseHub` : "Item — ReUseHub";
    const desc = l ? l.description.slice(0, 150) : "Item details on ReUseHub.";
    return { meta: [{ title }, { name: "description", content: desc }, { property: "og:title", content: title }, { property: "og:description", content: desc }] };
  },
  component: ItemPage,
});

function ItemPage() {
  const { listing: l } = Route.useLoaderData();
  const { user } = useAuth();
  const isOwner = user?.id === l.owner_id;
  const related = useQuery({
    queryKey: ["listings", "related", l.category_id, l.id],
    queryFn: () => fetchListings({ category: l.categories?.slug }),
  });

  return (
    <div className="container-page py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <Link to="/browse" className="hover:text-foreground">Browse</Link> /{" "}
        <Link to="/browse" search={{ category: l.categories?.slug }} className="hover:text-foreground">{l.categories?.name}</Link>
      </nav>
      <div className="grid gap-8 md:grid-cols-[1.2fr_1fr]">
        <ListingImage src={l.image_url} alt={l.title} className="aspect-square w-full rounded-xl border md:aspect-[4/3]" />
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={l.listing_type} />
            {l.status !== "available" && (
              <span className="rounded-full bg-warning px-2.5 py-0.5 text-xs font-semibold text-warning-foreground">{statusLabel(l.status)}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">{l.title}</h1>
          <p className="text-3xl font-bold text-primary">{formatPrice(l.listing_type, l.price)}</p>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Meta icon={Tag} label="Category" value={l.categories?.name ?? "—"} />
            <Meta icon={Tag} label="Condition" value={conditionLabel(l.item_condition)} />
            <Meta icon={MapPin} label="Location" value={l.location} />
            <Meta icon={Calendar} label="Listed" value={formatDate(l.created_at)} />
          </dl>
          <div className="rounded-lg border bg-card p-4 text-sm">
            <p className="flex items-center gap-2 font-medium"><User className="size-4" aria-hidden />
              {l.profiles ? l.profiles.full_name : "ReUseHub sample listing"}
            </p>
            <p className="mt-1 text-muted-foreground">
              {l.profiles
                ? `${l.listing_type === "donation" ? "Donor" : "Seller"} · member since ${formatDate(l.profiles.created_at)}`
                : "Demo data included with the project. Contact is disabled."}
            </p>
          </div>

          {isOwner ? (
            <div className="flex gap-2">
              <Button asChild><Link to="/edit/$id" params={{ id: l.id }}>Edit listing</Link></Button>
              <Button asChild variant="outline"><Link to="/dashboard">My listings</Link></Button>
            </div>
          ) : !l.owner_id ? null : l.status !== "available" ? (
            <p className="text-sm text-muted-foreground">This item is no longer accepting inquiries.</p>
          ) : user ? (
            <InquiryForm listingId={l.id} isFree={l.listing_type === "donation"} />
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-sm">
              <Link to="/auth" search={{ redirect: `/item/${l.id}` }} className="font-medium text-primary hover:underline">Log in</Link>{" "}
              to message the {l.listing_type === "donation" ? "donor" : "seller"}.
            </div>
          )}
        </div>
      </div>

      <section className="mt-10 max-w-3xl">
        <h2 className="mb-2 text-lg font-semibold">Description</h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{l.description}</p>
        {user && !isOwner && <ReportForm listingId={l.id} />}
      </section>

      {related.data && related.data.rows.filter((r) => r.id !== l.id).length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-semibold">More in {l.categories?.name}</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.data.rows.filter((r) => r.id !== l.id).slice(0, 4).map((r) => <ListingCard key={r.id} listing={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function Meta({ icon: Icon, label, value }: { icon: typeof Tag; label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted px-3 py-2">
      <dt className="flex items-center gap-1 text-xs text-muted-foreground"><Icon className="size-3" aria-hidden />{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function InquiryForm({ listingId, isFree }: { listingId: string; isFree: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [msg, setMsg] = useState(isFree ? "Hi! Is this still available? I'd love to pick it up." : "Hi! Is this still available?");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = msg.trim();
    if (m.length < 5 || m.length > 1000) return toast.error("Message must be 5–1000 characters.");
    setBusy(true);
    // recipient_id is overwritten by a database trigger using the listing's real owner
    const { error } = await supabase.from("inquiries").insert({ listing_id: listingId, sender_id: user!.id, recipient_id: user!.id, message: m });
    setBusy(false);
    if (error) return toast.error(error.message.includes("own listing") ? "You can't message yourself." : error.message);
    setSent(true);
    qc.invalidateQueries({ queryKey: ["inbox"] });
    toast.success("Message sent. You'll find replies in your inbox.");
  };

  if (sent)
    return (
      <div className="rounded-lg border bg-secondary p-4 text-sm">
        Message sent. <Link to="/inbox" search={{ tab: "sent" }} className="font-medium text-primary hover:underline">View in inbox</Link>
      </div>
    );

  return (
    <form onSubmit={send} className="space-y-2">
      <label htmlFor="msg" className="text-sm font-medium">Message the {isFree ? "donor" : "seller"}</label>
      <Textarea id="msg" value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} maxLength={1000} required />
      <Button type="submit" disabled={busy} className="w-full sm:w-auto">{busy ? "Sending…" : "Send message"}</Button>
    </form>
  );
}

function ReportForm({ listingId }: { listingId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return <p className="mt-6 text-sm text-muted-foreground">Thanks — our moderators will review this listing.</p>;
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="mt-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive">
        <Flag className="size-3.5" aria-hidden /> Report this listing
      </button>
    );
  return (
    <form
      className="mt-6 space-y-2 rounded-lg border p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (reason.trim().length < 5) return toast.error("Please describe the problem (at least 5 characters).");
        setBusy(true);
        const { error } = await supabase.from("reports").insert({ listing_id: listingId, reporter_id: user!.id, reason: reason.trim() });
        setBusy(false);
        if (error) return toast.error(error.code === "23505" ? "You've already reported this listing." : error.message);
        setDone(true);
      }}
    >
      <label htmlFor="reason" className="text-sm font-medium">What's wrong with this listing?</label>
      <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={2} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="destructive" disabled={busy}>Submit report</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
