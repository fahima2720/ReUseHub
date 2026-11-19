import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/listings";
import { statusVariant, ticketMessagesQuery, ticketQuery } from "@/lib/support";
import { supportCategoryLabel, supportMessageSchema, supportStatusLabel } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/support/$id")({
  head: () => ({ meta: [
    { title: "Support ticket — ReUseHub" },
    { name: "description", content: "Conversation with the ReUseHub support team." },
    { property: "og:title", content: "Support ticket — ReUseHub" },
    { property: "og:description", content: "Your ReUseHub support conversation." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "robots", content: "noindex" },
  ] }),
  component: TicketPage,
});

function TicketPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const ticket = useQuery(ticketQuery(id));
  const messages = useQuery({ ...ticketMessagesQuery(id), enabled: !!ticket.data });
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const needsRead = !!ticket.data && (ticket.data.user_has_unread || ticket.data.admin_has_unread);
  useEffect(() => {
    if (!needsRead) return;
    supabase.rpc("mark_ticket_read", { _ticket_id: id }).then(({ error }) => {
      if (!error) { qc.invalidateQueries({ queryKey: ["support-tickets"] }); qc.invalidateQueries({ queryKey: ["support-unread"] }); }
    });
  }, [needsRead, id, qc]);

  if (ticket.isPending) return <div className="container-page max-w-3xl space-y-4 py-10"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-32" /><Skeleton className="h-48" /></div>;
  if (ticket.isError) return <div className="container-page max-w-3xl py-10"><p className="text-sm text-muted-foreground">Couldn't load this ticket.</p><Button className="mt-3" variant="outline" onClick={() => ticket.refetch()}>Try again</Button></div>;
  if (!ticket.data) return <div className="container-page max-w-md py-16 text-center">
    <h1 className="text-2xl font-bold">Ticket not found</h1>
    <p className="mt-2 text-sm text-muted-foreground">This ticket doesn't exist or you don't have access to it.</p>
    <Button asChild className="mt-6"><Link to="/support">Back to support</Link></Button>
  </div>;

  const t = ticket.data;
  const closed = t.status === "closed";

  return <div className="container-page max-w-3xl py-10">
    <Link to="/support" className="text-sm text-muted-foreground hover:text-foreground">← Back to support</Link>
    <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
      <h1 className="text-2xl font-bold sm:text-3xl">{t.subject}</h1>
      <Badge variant={statusVariant(t.status)}>{supportStatusLabel[t.status]}</Badge>
    </div>
    <p className="mt-1 text-sm text-muted-foreground">{supportCategoryLabel[t.category]} · Opened {formatDate(t.created_at)}
      {t.listings && <> · <Link to="/item/$id" params={{ id: t.listings.id }} className="underline hover:text-foreground">{t.listings.title}</Link></>}
    </p>
    <div className="mt-6 rounded-lg border bg-card p-4">
      <p className="whitespace-pre-line text-sm leading-relaxed">{t.description}</p>
    </div>

    {/* Admin controls slot */}
    <div id="admin-ticket-controls" />

    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">Conversation</h2>
      {messages.isPending ? <div className="space-y-3"><Skeleton className="h-16 w-3/4" /><Skeleton className="ml-auto h-16 w-3/4" /></div>
        : messages.isError ? <Button variant="outline" onClick={() => messages.refetch()}>Reload messages</Button>
        : messages.data.length === 0 ? <p className="text-sm text-muted-foreground">No replies yet. Our team will respond here.</p>
        : <ul className="space-y-3">
            {messages.data.map((m) => {
              const mine = m.sender_id === user?.id;
              return <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${m.is_internal_note ? "border border-dashed bg-muted" : mine ? "bg-primary text-primary-foreground" : "border bg-card"}`}>
                  <p className="whitespace-pre-line">{m.body}</p>
                  <p className={`mt-1 text-xs ${mine && !m.is_internal_note ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {mine ? "You" : m.sender_id === t.user_id ? (m.profiles?.full_name ?? "Member") : "ReUseHub support"}{m.is_internal_note && " · internal note"} · {formatDate(m.created_at)}
                  </p>
                </div>
              </li>;
            })}
          </ul>}
    </section>

    {closed ? <p className="mt-6 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">This ticket is closed. Open a new ticket if you need more help.</p> :
    <form className="mt-6 space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      if (!user) return;
      const parsed = supportMessageSchema.safeParse(body);
      if (!parsed.success) return toast.error(parsed.error.issues[0].message);
      setBusy(true);
      const { error } = await supabase.from("support_messages").insert({ ticket_id: id, sender_id: user.id, body: parsed.data });
      setBusy(false);
      if (error) return toast.error("Couldn't send your reply. Please try again.");
      setBody("");
      qc.invalidateQueries({ queryKey: ["support-messages", id] });
      qc.invalidateQueries({ queryKey: ["support-ticket", id] });
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
    }}>
      <label htmlFor="reply" className="sr-only">Your reply</label>
      <Textarea id="reply" rows={3} maxLength={2000} placeholder="Write a reply…" value={body} onChange={(e) => setBody(e.target.value)} />
      <Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send reply"}</Button>
    </form>}
  </div>;
}
