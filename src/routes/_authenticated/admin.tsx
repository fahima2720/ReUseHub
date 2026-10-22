import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState, TypeBadge } from "@/components/listing-card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { LISTING_SELECT, formatDate, formatPrice, statusLabel, type ListingRow } from "@/lib/listings";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — ReUseHub" },
      { name: "description", content: "ReUseHub moderation dashboard." },
      { property: "og:title", content: "Admin — ReUseHub" },
      { property: "og:description", content: "ReUseHub moderation dashboard." },
    ],
  }),
  component: Admin,
});

function Confirm({ label, title, body, onConfirm }: { label: string; title: string; body: string; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive">{label}</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{body}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onConfirm}>{label}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Admin() {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="container-page py-10"><Skeleton className="h-64" /></div>;
  if (!isAdmin)
    return <div className="container-page py-10"><EmptyState title="Admins only" body="You don't have permission to view this page." /></div>;
  return (
    <div className="container-page py-10">
      <h1 className="mb-6 text-3xl font-bold">Admin dashboard</h1>
      <Stats />
      <Tabs defaultValue="listings" className="mt-8">
        <TabsList className="flex-wrap">
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="listings"><ListingsTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function Stats() {
  const q = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_stats");
      if (error) throw error;
      return data as Record<string, number>;
    },
  });
  const items = [["users", "Users"], ["listings", "Listings"], ["sale", "For sale"], ["donation", "Donations"], ["inquiries", "Inquiries"], ["pending_reports", "Pending reports"]];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map(([k, label]) => (
        <div key={k} className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{q.data ? q.data[k] : "–"}</p>
        </div>
      ))}
    </div>
  );
}

const tableCls = "w-full min-w-[40rem] text-left text-sm [&_th]:px-3 [&_th]:py-2 [&_th]:font-medium [&_th]:text-muted-foreground [&_td]:px-3 [&_td]:py-2.5 [&_tr]:border-b";

function ListingsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const q = useQuery({
    queryKey: ["admin", "listings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("listings").select(LISTING_SELECT).order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data as unknown as ListingRow[];
    },
  });
  const rows = (q.data ?? []).filter((l) => (!type || l.listing_type === type) && l.title.toLowerCase().includes(search.toLowerCase()));
  const remove = async (id: string) => {
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Listing removed.");
    qc.invalidateQueries();
  };
  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input aria-label="Search listings" placeholder="Search by title" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select aria-label="Filter by type" value={type} onChange={(e) => setType(e.target.value)} className="h-9 rounded-md border bg-card px-2 text-sm">
          <option value="">All types</option><option value="sale">For sale</option><option value="donation">Donation</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className={tableCls}>
          <thead><tr><th>Title</th><th>Type</th><th>Price</th><th>Status</th><th>Owner</th><th>Listed</th><th /></tr></thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id}>
                <td><Link to="/item/$id" params={{ id: l.id }} className="hover:underline">{l.title}</Link></td>
                <td><TypeBadge type={l.listing_type} /></td>
                <td>{formatPrice(l.listing_type, l.price)}</td>
                <td>{statusLabel(l.status)}</td>
                <td>{l.profiles?.full_name ?? "Sample"}</td>
                <td>{formatDate(l.created_at)}</td>
                <td className="text-right">
                  <Button asChild variant="ghost" size="sm"><Link to="/edit/$id" params={{ id: l.id }}>Edit</Link></Button>
                  <Confirm label="Remove" title="Remove this listing?" body={`“${l.title}” will be permanently deleted.`} onConfirm={() => remove(l.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && !q.isLoading && <p className="p-6 text-center text-sm text-muted-foreground">No listings match.</p>}
      </div>
    </div>
  );
}

type AdminUser = { id: string; full_name: string; email: string; phone: string; location: string | null; is_admin: boolean; listing_count: number; created_at: string };

function UsersTab() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return data as AdminUser[];
    },
  });
  const s = search.toLowerCase();
  const rows = (q.data ?? []).filter((u) => u.full_name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
  const remove = async (id: string) => {
    const { error } = await supabase.rpc("admin_delete_user", { _user_id: id });
    if (error) return toast.error(error.message);
    toast.success("User deleted.");
    qc.invalidateQueries();
  };
  return (
    <div className="mt-4 space-y-3">
      <Input aria-label="Search users" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className={tableCls}>
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Listings</th><th>Joined</th><th /></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name}</td><td>{u.email}</td><td>{u.phone}</td>
                <td>{u.is_admin ? "Admin" : "User"}</td><td>{u.listing_count}</td><td>{formatDate(u.created_at)}</td>
                <td className="text-right">
                  {u.id !== user?.id && <Confirm label="Delete" title="Delete this user?" body={`${u.full_name}'s account, listings and messages will be permanently deleted.`} onConfirm={() => remove(u.id)} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoriesTab() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const q = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name, slug, listings(count)").order("name");
      if (error) throw error;
      return data as unknown as { id: number; name: string; slug: string; listings: { count: number }[] }[];
    },
  });
  const slugify = (s: string) => s.toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin", "categories"] }); qc.invalidateQueries({ queryKey: ["categories"] }); };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 2 || n.length > 40) return toast.error("Name must be 2–40 characters.");
    const { error } = await supabase.from("categories").insert({ name: n, slug: slugify(n) });
    if (error) return toast.error(error.code === "23505" ? "That category already exists." : error.message);
    setName(""); toast.success("Category added."); refresh();
  };
  const save = async () => {
    if (!editing) return;
    const n = editing.name.trim();
    if (n.length < 2 || n.length > 40) return toast.error("Name must be 2–40 characters.");
    const { error } = await supabase.from("categories").update({ name: n, slug: slugify(n) }).eq("id", editing.id);
    if (error) return toast.error(error.code === "23505" ? "That category already exists." : error.message);
    setEditing(null); toast.success("Category renamed."); refresh();
  };
  const remove = async (id: number) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.code === "23503" ? "This category still has listings. Move or delete them first." : error.message);
    toast.success("Category deleted."); refresh();
  };

  return (
    <div className="mt-4 max-w-xl space-y-4">
      <form onSubmit={add} className="flex gap-2">
        <Input aria-label="New category name" placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        <Button type="submit">Add</Button>
      </form>
      <ul className="divide-y rounded-lg border bg-card">
        {q.data?.map((c) => (
          <li key={c.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
            {editing?.id === c.id ? (
              <>
                <Input aria-label="Category name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="h-8" />
                <Button size="sm" onClick={save}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              </>
            ) : (
              <>
                <span className="flex-1 font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.listings[0]?.count ?? 0} listings</span>
                <Button size="sm" variant="ghost" onClick={() => setEditing({ id: c.id, name: c.name })}>Rename</Button>
                <Confirm label="Delete" title={`Delete “${c.name}”?`} body="Categories with listings can't be deleted." onConfirm={() => remove(c.id)} />
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

type Report = { id: string; reason: string; status: "pending" | "reviewed" | "dismissed"; created_at: string; listing: { id: string; title: string } | null; reporter: { full_name: string } | null };

function ReportsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("pending");
  const q = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports").select("id, reason, status, created_at, listing:listings(id, title), reporter:profiles(full_name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Report[];
    },
  });
  const rows = (q.data ?? []).filter((r) => !filter || r.status === filter);
  const update = async (id: string, status: Report["status"]) => {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Report updated."); qc.invalidateQueries({ queryKey: ["admin"] });
  };
  return (
    <div className="mt-4 space-y-3">
      <select aria-label="Filter reports" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 rounded-md border bg-card px-2 text-sm">
        <option value="pending">Pending</option><option value="reviewed">Reviewed</option><option value="dismissed">Dismissed</option><option value="">All</option>
      </select>
      {!rows.length ? <EmptyState title="No reports" body="Nothing needs your attention right now." /> : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border bg-card p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <p>{r.listing ? <Link to="/item/$id" params={{ id: r.listing.id }} className="font-medium text-primary hover:underline">{r.listing.title}</Link> : "Deleted listing"} · reported by {r.reporter?.full_name}</p>
                <span className="text-xs text-muted-foreground">{formatDate(r.created_at)} · {r.status}</span>
              </div>
              <p className="mt-2">{r.reason}</p>
              {r.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => update(r.id, "reviewed")}>Mark reviewed</Button>
                  <Button size="sm" variant="outline" onClick={() => update(r.id, "dismissed")}>Dismiss</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
