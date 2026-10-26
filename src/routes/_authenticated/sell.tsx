import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { ListingForm } from "@/components/listing-form";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/sell")({
  validateSearch: z.object({ type: z.enum(["sale", "donation"]).optional().catch(undefined) }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "List an item — ReUseHub" },
      { name: "description", content: "Sell a pre-owned item or give it away for free on ReUseHub." },
      { property: "og:title", content: "List an item — ReUseHub" },
      { property: "og:description", content: "Sell or donate an item on ReUseHub." },
    ],
  }),
  component: Sell,
});

function Sell() {
  const { type } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="text-3xl font-bold">List an item</h1>
      <p className="mb-8 mt-1 text-sm text-muted-foreground">Clear photos and honest descriptions get the fastest replies.</p>
      <ListingForm
        defaultType={type ?? "sale"}
        submitLabel="Publish listing"
        onSubmit={async ({ status: _s, image_urls, ...v }) => {
          if (!user) throw new Error("Please log in to publish.");
          const { data, error } = await supabase.from("listings").insert({ ...v, owner_id: user.id }).select("id").single();
          if (error) throw error;
          const { error: photoError } = await supabase.rpc("save_listing_images", { _listing_id: data.id, _image_urls: image_urls });
          if (photoError) {
            await supabase.from("listings").delete().eq("id", data.id);
            throw photoError;
          }
          qc.invalidateQueries({ queryKey: ["listings"] });
          toast.success("Your listing is live.");
          navigate({ to: "/item/$id", params: { id: data.id } });
        }}
      />
    </div>
  );
}
