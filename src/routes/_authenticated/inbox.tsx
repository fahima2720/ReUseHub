import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { messageSchema } from "@/lib/validation";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/listing-card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/inbox")({
  validateSearch: z.object({ tab: z.enum(["received", "sent"]).optional().catch(undefined) }),
  head: () => ({
    meta: [
      { title: "Inbox — ReUseHub" },
      { name: "description", content: "Messages about your listings and items you're interested in." },
      { property: "og:title", content: "Inbox — ReUseHub" },
      { property: "og:description", content: "Your ReUseHub messages." },
    ],
  }),
  component: Inbox,
});

type Row = {
  id: string; message: string; created_at: string;
  listing: { id: string; title: string; status: string } | null;
  sender: { full_name: string } | null;
  recipient: { full_name: string } | null;
};

function Inbox() {
  const { tab = "received" } = Route.useSearch();
  const navigate = useNavigate({ from: "/inbox" });
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["inbox", tab, user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("inquiries")
        .select("id, message, created_at, listing:listings(id, title, status), sender:profiles!inquiries_sender_id_fkey(full_name), recipient:profiles!inquiries_recipient_id_fkey(full_name)")
        .eq(tab === "received" ? "recipient_id" : "sender_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-3xl font-bold">Inbox</h1>
      <div role="tablist" className="mt-6 flex gap-1 border-b">
        {(["received", "sent"] as const).map((t) => (
          <Button variant="ghost" key={t} role="tab" aria-selected={tab === t} onClick={() => navigate({ search: { tab: t } })}
            className={cn("-mb-px border-b-2 px-4 py-2 text-sm font-medium", tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t === "received" ? "Received" : "Sent"}
          </Button>
        ))}
      </div>
      <div className="mt-6">
        {q.isLoading ? (
          <Skeleton className="h-32" />
        ) : q.isError ? (
          <EmptyState title="Couldn't load messages" body="Please try again." action={<Button variant="outline" onClick={() => q.refetch()}>Try again</Button>} />
        ) : !q.data?.length ? (
          <EmptyState
            title={tab === "received" ? "No messages yet" : "You haven't messaged anyone"}
            body={tab === "received" ? "When someone asks about your items, it shows up here." : "Find something you like and send the owner a message."}
          />
        ) : (
          <ul className="space-y-3">
            {q.data.map((m) => (
              <li key={m.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <p>
                    <span className="font-semibold">{tab === "received" ? m.sender?.full_name : `To ${m.recipient?.full_name}`}</span>
                    {" · "}
                    {m.listing ? <Link to="/item/$id" params={{ id: m.listing.id }} className="text-primary hover:underline">{m.listing.title}</Link> : "Deleted listing"}
                  </p>
                  <time className="text-xs text-muted-foreground" dateTime={m.created_at}>{new Date(m.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm">{m.message}</p>
                {tab === "received" && m.listing?.status === "available" && <ReplyForm message={m} />}
                {tab === "received" && m.listing?.status !== "available" && <p className="mt-2 text-xs text-muted-foreground">This listing is no longer accepting messages.</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ReplyForm({ message }: { message: Row }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  if (!open) return <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpen(true)}>Reply</Button>;
  return <form className="mt-3 space-y-2" onSubmit={async (event) => {
    event.preventDefault();
    if (!user || !message.listing) return;
    const parsed = messageSchema.safeParse(text);
    if (!parsed.success) return toast.error("Message must be 5–1000 characters.");
    setBusy(true);
    try {
      const { error } = await supabase.from("inquiries").insert({ listing_id: message.listing.id, reply_to_id: message.id, sender_id: user.id, recipient_id: user.id, message: parsed.data });
      if (error) throw error;
      toast.success("Reply sent."); setOpen(false); setText("");
      await qc.invalidateQueries({ queryKey: ["inbox"] });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't send reply."); }
    finally { setBusy(false); }
  }}>
    <label htmlFor={`reply-${message.id}`} className="text-sm font-medium">Reply to {message.sender?.full_name}</label>
    <Textarea id={`reply-${message.id}`} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={3} required />
    <div className="flex gap-2"><Button size="sm" disabled={busy} type="submit">{busy ? "Sending…" : "Send reply"}</Button><Button variant="ghost" size="sm" type="button" onClick={() => setOpen(false)}>Cancel</Button></div>
  </form>;
}
