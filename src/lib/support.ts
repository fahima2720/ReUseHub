import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SupportStatus = "open" | "in_progress" | "resolved" | "closed";
export type SupportCategory = "account" | "listing" | "report_user" | "bug" | "other";

export const adminTicketsQuery = () => queryOptions({
  queryKey: ["admin", "support-tickets"],
  queryFn: async () => {
    const { data, error } = await supabase.from("support_tickets")
      .select("id, subject, category, status, assigned_admin_id, admin_has_unread, updated_at")
      .order("updated_at", { ascending: false }).limit(500);
    if (error) throw error;
    return data;
  },
});

export const myTicketsQuery = (userId: string) => queryOptions({
  queryKey: ["support-tickets", userId],
  queryFn: async () => {
    const { data, error } = await supabase.from("support_tickets")
      .select("id, subject, category, status, updated_at, user_has_unread")
      .eq("user_id", userId).order("updated_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data;
  },
});

export const ticketQuery = (id: string) => queryOptions({
  queryKey: ["support-ticket", id],
  queryFn: async () => {
    const { data, error } = await supabase.from("support_tickets")
      .select("*, listings:related_listing_id(id, title)").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const ticketMessagesQuery = (id: string) => queryOptions({
  queryKey: ["support-messages", id],
  queryFn: async () => {
    const { data, error } = await supabase.from("support_messages")
      .select("id, body, sender_id, is_internal_note, created_at, profiles:sender_id(full_name)")
      .eq("ticket_id", id).order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  },
});

export const statusVariant = (s: SupportStatus) =>
  s === "open" ? "default" : s === "in_progress" ? "secondary" : "outline";
