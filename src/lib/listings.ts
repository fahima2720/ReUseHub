import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ListingType = Database["public"]["Enums"]["listing_type"];
export type ItemCondition = Database["public"]["Enums"]["item_condition"];
export type ListingStatus = Database["public"]["Enums"]["listing_status"];

export const CONDITIONS: { value: ItemCondition; label: string }[] = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
];
export const STATUSES: { value: ListingStatus; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold / Given away" },
];

export const conditionLabel = (c: ItemCondition) => CONDITIONS.find((x) => x.value === c)?.label ?? c;
export const statusLabel = (s: ListingStatus) => STATUSES.find((x) => x.value === s)?.label ?? s;

export const formatPrice = (type: ListingType, price: number | null) =>
  type === "donation" || price == null ? "FREE" : `৳${Number(price).toLocaleString("en-US")}`;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export const LISTING_SELECT =
  "id, title, description, listing_type, price, item_condition, status, location, image_url, created_at, owner_id, category_id, categories(name, slug), profiles(full_name, location, created_at)";

export type ListingRow = {
  id: string;
  title: string;
  description: string;
  listing_type: ListingType;
  price: number | null;
  item_condition: ItemCondition;
  status: ListingStatus;
  location: string;
  image_url: string | null;
  created_at: string;
  owner_id: string | null;
  category_id: number;
  categories: { name: string; slug: string } | null;
  profiles: { full_name: string; location: string | null; created_at: string } | null;
};

export type BrowseFilters = {
  q?: string;
  category?: string;
  type?: ListingType;
  condition?: ItemCondition;
  min?: number;
  max?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
};

export const PAGE_SIZE = 12;

/** Escape characters that have meaning inside PostgREST ilike / or() filters. */
const safeTerm = (s: string) => s.replace(/[%_,()*\\]/g, " ").trim().slice(0, 80);

export async function fetchListings(f: BrowseFilters) {
  const page = Math.max(1, f.page ?? 1);
  let q = supabase
    .from("listings")
    .select(LISTING_SELECT.replace("categories(name, slug)", "categories!inner(name, slug)"), { count: "exact" })
    .eq("status", "available");

  if (f.q) {
    const t = safeTerm(f.q);
    if (t) q = q.or(`title.ilike.%${t}%,description.ilike.%${t}%`);
  }
  if (f.category) q = q.eq("categories.slug", f.category);
  if (f.type) q = q.eq("listing_type", f.type);
  if (f.condition) q = q.eq("item_condition", f.condition);
  if (f.type !== "donation") {
    if (f.min != null) q = q.gte("price", f.min);
    if (f.max != null) q = q.lte("price", f.max);
  }

  if (f.sort === "price_asc") q = q.order("price", { ascending: true, nullsFirst: true });
  else if (f.sort === "price_desc") q = q.order("price", { ascending: false, nullsFirst: false });
  else q = q.order("created_at", { ascending: false });

  const from = (page - 1) * PAGE_SIZE;
  const { data, error, count } = await q.range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: (data ?? []) as unknown as ListingRow[], total: count ?? 0, page };
}

export async function fetchCategories() {
  const { data, error } = await supabase.from("categories").select("id, name, slug").order("name");
  if (error) throw error;
  return data;
}

export async function fetchListing(id: string) {
  const { data, error } = await supabase.from("listings").select(LISTING_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as ListingRow | null;
}

// ---------- Image upload ----------
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Check magic bytes so a renamed .exe can't pass as .jpg */
async function sniffImage(file: File): Promise<string | null> {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return "webp";
  return null;
}

export async function validateImage(file: File): Promise<string | null> {
  if (!ALLOWED.includes(file.type)) return "Only JPG, PNG or WebP images are allowed.";
  if (file.size > MAX_IMAGE_BYTES) return "Image must be 5 MB or smaller.";
  if (!(await sniffImage(file))) return "This file is not a valid image.";
  return null;
}

export async function uploadImage(userId: string, file: File) {
  const ext = (await sniffImage(file))!;
  // Server-safe random filename inside the user's own folder (storage policy enforces the folder)
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("listing-images").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage
    .from("listing-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (e2) throw e2;
  return data.signedUrl;
}
