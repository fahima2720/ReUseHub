import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { supportCategories, supportCategoryLabel, supportTicketSchema } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/support/new")({
  validateSearch: (search: Record<string, unknown>): { listing?: string } => ({ listing: typeof search.listing === "string" ? search.listing : undefined }),
  head: () => ({ meta: [
    { title: "New support ticket — ReUseHub" },
    { name: "description", content: "Contact the ReUseHub team about your account, a listing or a bug." },
    { property: "og:title", content: "New support ticket — ReUseHub" },
    { property: "og:description", content: "Ask the ReUseHub team for help." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: NewTicket,
});

const selectCls = "h-10 w-full rounded-md border border-input bg-card px-3 text-sm";
const uuidRe = /^[0-9a-f-]{36}$/i;

function NewTicket() {
  const { listing } = Route.useSearch();
  const listingId = listing && uuidRe.test(listing) ? listing : undefined;
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  return <div className="container-page max-w-xl py-10">
    <Link to="/support" className="text-sm text-muted-foreground hover:text-foreground">← Back to support</Link>
    <h1 className="mt-2 text-3xl font-bold">New support ticket</h1>
    <form className="mt-6 space-y-4" noValidate onSubmit={async (e) => {
      e.preventDefault();
      if (!user) return;
      const parsed = supportTicketSchema.safeParse({ ...Object.fromEntries(new FormData(e.currentTarget)), related_listing_id: listingId ?? "" });
      setErrors({});
      if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message]))); return; }
      setBusy(true);
      const { data, error } = await supabase.from("support_tickets").insert({
        user_id: user.id, category: parsed.data.category, subject: parsed.data.subject,
        description: parsed.data.description, related_listing_id: parsed.data.related_listing_id ?? null,
      }).select("id").single();
      setBusy(false);
      if (error) return toast.error(error.message.includes("5 support tickets") ? "You can open up to 5 tickets per 24 hours." : "Couldn't create the ticket. Please try again.");
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
      toast.success("Ticket created. We'll get back to you soon.");
      navigate({ to: "/support/$id", params: { id: data.id } });
    }}>
      {listingId && <p className="rounded-md border bg-muted/40 p-3 text-sm">This ticket will be linked to the listing you were viewing.</p>}
      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <select id="category" name="category" defaultValue={listingId ? "listing" : ""} className={selectCls} aria-invalid={!!errors.category}>
          <option value="" disabled>Choose a category</option>
          {supportCategories.map((c) => <option key={c} value={c}>{supportCategoryLabel[c]}</option>)}
        </select>
        {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" maxLength={100} aria-invalid={!!errors.subject} />
        {errors.subject && <p className="text-sm text-destructive">{errors.subject}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={6} maxLength={2000} aria-invalid={!!errors.description} />
        {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
      </div>
      <Button type="submit" disabled={busy} className="w-full sm:w-auto">{busy ? "Submitting…" : "Submit ticket"}</Button>
    </form>
  </div>;
}
