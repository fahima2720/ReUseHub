import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ListingForm } from "@/components/listing-form";
import { EmptyState } from "@/components/listing-card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchListing } from "@/lib/listings";

export const Route = createFileRoute("/_authenticated/edit/$id")({
  head: () => ({
    meta: [
      { title: "Edit listing — ReUseHub" },
      { name: "description", content: "Update your ReUseHub listing." },
      { property: "og:title", content: "Edit listing — ReUseHub" },
      { property: "og:description", content: "Update your ReUseHub listing." },
    ],
  }),
  component: Edit,
});

function Edit() {
  const { id } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["listing", id], queryFn: () => fetchListing(id) });

  if (q.isLoading) return <div className="container-page max-w-2xl py-10"><Skeleton className="h-96" /></div>;
  const l = q.data;
  if (!l || (l.owner_id !== user?.id && !isAdmin))
    return (
      <div className="container-page max-w-2xl py-10">
        <EmptyState title="You can't edit this listing" body="Only the owner can edit a listing." action={<Link to="/dashboard" className="text-primary underline">Back to my listings</Link>} />
      </div>
    );

  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="mb-8 text-3xl font-bold">Edit listing</h1>
      <ListingForm
        initial={l}
        submitLabel="Save changes"
        onSubmit={async (v) => {
          // RLS re-checks ownership on the server; the trigger blocks owner changes
          const { error } = await supabase.from("listings").update(v).eq("id", id);
          if (error) throw error;
          qc.invalidateQueries();
          toast.success("Listing updated.");
          navigate({ to: "/dashboard" });
        }}
      />
    </div>
  );
}
