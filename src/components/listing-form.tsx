import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CONDITIONS, STATUSES, fetchCategories, uploadImage, validateImage, type ListingRow } from "@/lib/listings";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { listingSchema, listingPhotosSchema } from "@/lib/validation";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";

export { listingSchema } from "@/lib/validation";

export type ListingInput = z.output<typeof listingSchema> & { image_url: string | null; image_urls: string[] };

const selectCls = "h-10 w-full rounded-md border border-input bg-card px-3 text-sm";

export function ListingForm({
  initial,
  defaultType = "sale",
  submitLabel,
  onSubmit,
}: {
  initial?: ListingRow;
  defaultType?: "sale" | "donation";
  submitLabel: string;
  onSubmit: (v: ListingInput) => Promise<void>;
}) {
  const { user, profile } = useAuth();
  const cats = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const [type, setType] = useState<"sale" | "donation">(initial?.listing_type ?? defaultType);
  const [photos, setPhotos] = useState<{ url: string; file?: File }[]>(initial?.image_url ? [{ url: initial.image_url }] : []);
  const objectUrls = useRef(new Set<string>());
  const [photosReady, setPhotosReady] = useState(!initial);
  const [picking, setPicking] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const urls = objectUrls.current;
    return () => { urls.forEach((url) => URL.revokeObjectURL(url)); };
  }, []);
  const images = useQuery({
    queryKey: ["listing-images", initial?.id],
    enabled: !!initial,
    queryFn: async () => {
      if (!initial) return [];
      const { data, error } = await supabase.from("listing_images").select("image_url").eq("listing_id", initial.id).order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    if (photosReady || !images.data) return;
    if (images.data.length) setPhotos(images.data.map((image) => ({ url: image.image_url })));
    setPhotosReady(true);
  }, [images.data, photosReady]);

  const pick = async (files: File[]) => {
    if (!files.length) return;
    if (photos.length + files.length > 5) { setErrors((e) => ({ ...e, image: "Choose up to 5 photos." })); return; }
    setPicking(true);
    try {
      for (const file of files) {
        const error = await validateImage(file);
        if (error) { setErrors((e) => ({ ...e, image: error })); return; }
      }
      const added = files.map((file) => {
        const url = URL.createObjectURL(file);
        objectUrls.current.add(url);
        return { url, file };
      });
      setErrors(({ image: _i, ...rest }) => rest);
      setPhotos((current) => [...current, ...added]);
    } finally { setPicking(false); }
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!photosReady || picking || busy) return;
    const fd = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const parsed = listingSchema.safeParse({ ...fd, listing_type: type });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setErrors({});
    if (!user) return toast.error("Please log in before publishing.");
    setBusy(true);
    try {
      if (photos.length > 5) throw new Error("Choose up to 5 photos.");
      const uploaded = [];
      for (const photo of photos) {
        uploaded.push({ url: photo.file ? await uploadImage(user.id, photo.file) : photo.url });
      }
      setPhotos(uploaded);
      const image_urls = listingPhotosSchema.parse(uploaded.map((photo) => photo.url));
      await onSubmit({ ...parsed.data, image_url: image_urls[0] ?? null, image_urls });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const err = (k: string) => errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">What would you like to do?</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["sale", "donation"] as const).map((t) => (
            <label key={t} className={cn("cursor-pointer rounded-lg border bg-card p-4 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring", type === t && "border-primary bg-secondary")}>
              <input type="radio" name="listing_type_radio" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
              <span className="block font-semibold">{t === "sale" ? "Sell it" : "Give it away free"}</span>
              <span className="text-muted-foreground">{t === "sale" ? "Set a price" : "Price will show as FREE"}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={initial?.title} maxLength={100} placeholder="e.g. Wooden study table with drawer" aria-invalid={!!errors.title} />
        {err("title")}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={initial?.description} rows={5} maxLength={2000} placeholder="Size, age, any defects, pickup details…" aria-invalid={!!errors.description} />
        {err("description")}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="category_id">Category</Label>
          <select id="category_id" name="category_id" defaultValue={initial?.category_id ?? ""} className={selectCls} aria-invalid={!!errors.category_id}>
            <option value="" disabled>Select a category</option>
            {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {err("category_id")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="item_condition">Condition</Label>
          <select id="item_condition" name="item_condition" defaultValue={initial?.item_condition ?? ""} className={selectCls} aria-invalid={!!errors.item_condition}>
            <option value="" disabled>Select condition</option>
            {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          {err("item_condition")}
        </div>
        {type === "sale" && (
          <div className="space-y-1.5">
            <Label htmlFor="price">Price (৳)</Label>
            <Input id="price" name="price" type="number" min={1} step="1" inputMode="decimal" defaultValue={initial?.price ?? ""} aria-invalid={!!errors.price} />
            {err("price")}
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="location">Pickup location</Label>
          <Input id="location" name="location" defaultValue={initial?.location ?? profile?.location ?? ""} maxLength={80} placeholder="e.g. Mirpur, Dhaka" aria-invalid={!!errors.location} />
          {err("location")}
        </div>
        {initial && (
          <div className="space-y-1.5">
            <Label htmlFor="status">Availability</Label>
            <select id="status" name="status" defaultValue={initial.status} className={selectCls}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="image">Photos</Label>
        <div className="flex flex-wrap gap-4">
          {photos.map((photo, index) => <div key={photo.url} className="relative">
            <img src={photo.url} alt={index === 0 ? "Cover photo" : `Item photo ${index + 1}`} className="size-28 rounded-md border object-cover" />
            <Button type="button" variant="outline" size="icon" className="absolute right-1 top-1 size-7" title={`Remove photo ${index + 1}`} aria-label={`Remove photo ${index + 1}`} disabled={busy || picking || !photosReady} onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}><X className="size-4" /></Button>
          </div>)}
        </div>
        <Input id="image" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy || picking || !photosReady || photos.length >= 5} onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ""; void pick(files); }} />
        <p className="text-xs text-muted-foreground">Up to 5 photos. JPG, PNG or WebP, up to 5 MB each. First photo is the cover.</p>
        {images.isError && <p className="text-xs text-destructive">Couldn't load photos. <Button type="button" variant="link" size="sm" onClick={() => images.refetch()}>Try again</Button></p>}
        {err("image")}
      </div>

      <Button type="submit" size="lg" disabled={busy || picking || !photosReady} className="w-full sm:w-auto">{busy ? "Saving…" : submitLabel}</Button>
    </form>
  );
}
