import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { messageSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ListingImage } from "@/components/listing-card";

type Conversation = { listing_id: string; other_id: string; latest_at: string; unread: number; name: string | null; title: string | null; image_url: string | null; status: string | null; preview: string };

export function ConversationInbox() {
  const { user } = useAuth();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const q = useQuery({ queryKey: ["inbox", "conversations", user?.id, offset], enabled: !!user, refetchInterval: 30_000, queryFn: async () => {
    const { data, error } = await supabase.rpc("inbox_conversations", { _offset: offset });
    if (error) throw error;
    return data as unknown as Conversation[];
  }});
  if (selected) return <ConversationThread key={`${selected.listing_id}:${selected.other_id}`} conversation={selected} back={() => setSelected(null)} />;
  return <div className="space-y-3">
    {q.isLoading && <p role="status" className="text-sm text-muted-foreground">Loading conversations…</p>}
    {q.isError && <Button variant="outline" onClick={() => q.refetch()}>Retry conversations</Button>}
    {!q.isLoading && !q.isError && !q.data?.length && <p className="text-sm text-muted-foreground">No conversations yet.</p>}
    {q.data?.slice(0, 20).map((c) => <Button key={`${c.listing_id}:${c.other_id}`} variant="outline" className="h-auto w-full justify-start gap-3 whitespace-normal p-4 text-left" onClick={() => setSelected(c)}>
      <ListingImage src={c.image_url} alt={c.title ?? "Deleted listing"} className="size-14 shrink-0 rounded-md" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{c.name ?? "Member"}</span><time className="text-xs text-muted-foreground">{new Date(c.latest_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time></span>
        <span className="block text-xs text-muted-foreground">{c.title ?? "Deleted listing"}</span>
        <span className="block truncate text-sm">{c.preview}</span>
      </span>
      {c.unread > 0 && <Badge>{c.unread} New</Badge>}
    </Button>)}
    <div className="flex gap-2">
      {offset > 0 && <Button variant="outline" onClick={() => setOffset(Math.max(0, offset - 20))}>Previous</Button>}
      {(q.data?.length ?? 0) > 20 && <Button variant="outline" onClick={() => setOffset(offset + 20)}>Next</Button>}
    </div>
  </div>;
}

function ConversationThread({ conversation: c, back }: { conversation: Conversation; back: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [limit, setLimit] = useState(30);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ["inbox", "thread", user?.id, c.listing_id, c.other_id, limit], enabled: !!user, refetchInterval: 15_000, queryFn: async () => {
    if (!user) return [];
    const { data, error } = await supabase.from("inquiries").select("id,sender_id,recipient_id,message,created_at,read_at").eq("listing_id", c.listing_id).or(`and(sender_id.eq.${user.id},recipient_id.eq.${c.other_id}),and(sender_id.eq.${c.other_id},recipient_id.eq.${user.id})`).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit + 1);
    if (error) throw error;
    return data;
  }});
  const listing = useQuery({ queryKey: ["conversation-listing", c.listing_id], queryFn: async () => {
    const { data, error } = await supabase.from("listings").select("status,owner_id").eq("id", c.listing_id).maybeSingle();
    if (error) throw error;
    return data;
  }});
  const refresh = async () => { await Promise.all([qc.invalidateQueries({ queryKey: ["inbox"] }), qc.invalidateQueries({ queryKey: ["unread-inquiries"] })]); };
  const markRead = async (id: string) => {
    const { error } = await supabase.rpc("mark_inquiry_read", { _id: id });
    if (error) return toast.error("Couldn't mark message as read.");
    await refresh();
  };
  const messages = q.data?.slice(0, limit).reverse() ?? [];
  const received = q.data?.find((m) => m.recipient_id === user?.id);
  const canSend = listing.data?.status === "available" && (received || listing.data.owner_id === c.other_id);
  return <div className="space-y-4">
    <Button variant="ghost" onClick={back}>Back to conversations</Button>
    <h2 className="text-lg font-semibold">{c.name ?? "Member"} · {c.title ? <Link to="/item/$id" params={{ id: c.listing_id }} className="text-primary hover:underline">{c.title}</Link> : "Deleted listing"}</h2>
    {q.isLoading && <p role="status">Loading messages…</p>}
    {q.isError && <Button variant="outline" onClick={() => q.refetch()}>Retry messages</Button>}
    {(q.data?.length ?? 0) > limit && <Button variant="outline" onClick={() => setLimit(limit + 30)}>Load earlier messages</Button>}
    <ul className="space-y-3">{messages.map((m) => <li key={m.id} className={m.sender_id === user?.id ? "ml-8 rounded-lg border bg-secondary p-4" : "mr-8 rounded-lg border bg-card p-4"}>
      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{m.sender_id === user?.id ? "You" : c.name ?? "Member"}</span><time dateTime={m.created_at}>{new Date(m.created_at).toLocaleString("en-GB")}</time></div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm">{m.message}</p>
      {m.recipient_id === user?.id && !m.read_at && <div className="mt-2 flex gap-2"><Badge>New</Badge><Button size="sm" variant="outline" onClick={() => markRead(m.id)}>Mark as read</Button></div>}
    </li>)}</ul>
    {canSend && <form className="space-y-2" onSubmit={async (event) => {
      event.preventDefault();
      if (!user) return;
      const parsed = messageSchema.safeParse(text);
      if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Invalid message.");
      setBusy(true);
      try {
        const { error } = await supabase.from("inquiries").insert({ listing_id: c.listing_id, sender_id: user.id, recipient_id: user.id, reply_to_id: received?.id ?? null, message: parsed.data });
        if (error) throw error;
        // A successful reply reads received messages, never the sender's messages.
        for (const message of messages.filter((m) => m.recipient_id === user.id && !m.read_at)) {
          const { error: readError } = await supabase.rpc("mark_inquiry_read", { _id: message.id });
          if (readError) toast.error("Reply sent, but a read indicator couldn't be updated.");
        }
        setText(""); await refresh(); toast.success("Reply sent.");
      } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't send reply."); }
      finally { setBusy(false); }
    }}>
      <label htmlFor="thread-reply" className="text-sm font-medium">Reply</label>
      <Textarea id="thread-reply" rows={3} value={text} onChange={(event) => setText(event.target.value)} required />
      <p className={text.trim().length > 5000 ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{text.trim().length.toLocaleString()} / 5,000</p>
      <Button disabled={busy} type="submit">{busy ? "Sending…" : "Send reply"}</Button>
    </form>}
    {!canSend && !listing.isLoading && <p className="text-xs text-muted-foreground">This listing is no longer accepting messages.</p>}
  </div>;
}