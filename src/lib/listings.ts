import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { uploadListingFile } from "@/lib/uploads.functions";
import { validateUpload } from "@/lib/uploads";
export { MAX_IMAGE_BYTES } from "@/lib/uploads";

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
const safeTerm = (s: string) => s.trim().slice(0, 80);

export async function fetchListings(f: BrowseFilters, signal?: AbortSignal, limit = PAGE_SIZE) {
  const page = Math.max(1, f.page ?? 1);
  let q = supabase
    .rpc("search_listings", { _term: safeTerm(f.q ?? "") })
    .select(LISTING_SELECT.replace("categories(name, slug)", "categories!inner(name, slug)"), { count: "exact" })
    .eq("status", "available");

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
  q = q.order("id", { ascending: false });

  const from = (page - 1) * limit;
  if (signal) q = q.abortSignal(signal);
  const { data, error, count } = await q.range(from, from + limit - 1);
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

export const validateImage = (file: File) => validateUpload(file, "image");
export async function uploadImage(_userId: string, file: File) {
  const data = new FormData();
  data.set("file", file); data.set("kind", "image");
  const result = await uploadListingFile({ data });
  if (!result.url) throw new Error("Image upload failed.");
  return result.url;
}
