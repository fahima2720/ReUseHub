import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState, ListingImage, TypeBadge } from "@/components/listing-card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { LISTING_SELECT, STATUSES, formatDate, formatPrice, type ListingRow, type ListingStatus } from "@/lib/listings";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My listings — ReUseHub" },
      { name: "description", content: "Manage the items you're selling or giving away." },
      { property: "og:title", content: "My listings — ReUseHub" },
      { property: "og:description", content: "Manage your ReUseHub listings." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["my-listings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("listings").select(LISTING_SELECT).eq("owner_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ListingRow[];
    },
  });

  const setStatus = async (id: string, status: ListingStatus) => {
    const { error } = await supabase.from("listings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Availability updated.");
    qc.invalidateQueries();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Listing deleted.");
    qc.invalidateQueries();
  };

  return (
    <div className="container-page py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My listings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Signed in as {profile?.full_name} · {profile?.email}</p>
        </div>
        <Button asChild><Link to="/sell">List an item</Link></Button>
      </div>

      {q.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : q.isError ? (
        <EmptyState title="Couldn't load your listings" body="Please try again." action={<Button variant="outline" onClick={() => q.refetch()}>Try again</Button>} />
      ) : !q.data?.length ? (
        <EmptyState title="You haven't listed anything yet" body="Sell something you no longer use, or give it away to someone nearby." action={<Button asChild><Link to="/sell">Create your first listing</Link></Button>} />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {q.data.map((l) => (
            <li key={l.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <ListingImage src={l.image_url} alt={l.title} className="size-20 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <TypeBadge type={l.listing_type} />
                  <span className="text-sm font-semibold">{formatPrice(l.listing_type, l.price)}</span>
                </div>
                <Link to="/item/$id" params={{ id: l.id }} className="mt-1 block truncate font-medium hover:underline">{l.title}</Link>
                <p className="text-xs text-muted-foreground">Listed {formatDate(l.created_at)} · {l.categories?.name}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor={`st-${l.id}`}>Availability</label>
                <select id={`st-${l.id}`} value={l.status} onChange={(e) => setStatus(l.id, e.target.value as ListingStatus)} className="h-9 rounded-md border bg-card px-2 text-sm">
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <Button asChild variant="outline" size="sm"><Link to="/edit/$id" params={{ id: l.id }}>Edit</Link></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive">Delete</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                      <AlertDialogDescription>“{l.title}” and all messages about it will be permanently removed.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove(l.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
