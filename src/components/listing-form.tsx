import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CONDITIONS, STATUSES, fetchCategories, uploadImage, validateImage, type ListingRow } from "@/lib/listings";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const listingSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(100),
    description: z.string().trim().min(10, "Description must be at least 10 characters").max(2000),
    category_id: z.coerce.number().int().positive("Choose a category"),
    listing_type: z.enum(["sale", "donation"]),
    price: z.string().optional(),
    item_condition: z.enum(["new", "like_new", "good", "fair"], { message: "Choose a condition" }),
    location: z.string().trim().min(2, "Location is required").max(80),
    status: z.enum(["available", "reserved", "sold"]).optional(),
  })
  .transform((v, ctx) => {
    if (v.listing_type === "donation") return { ...v, price: null };
    const n = Number(v.price);
    if (!v.price || !Number.isFinite(n) || n <= 0 || n > 10_000_000) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "Sale items need a price greater than 0" });
      return z.NEVER;
    }
    return { ...v, price: Math.round(n * 100) / 100 };
  });

export type ListingInput = z.output<typeof listingSchema> & { image_url: string | null };

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
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initial?.image_url ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    const err = await validateImage(f);
    if (err) { setErrors((e) => ({ ...e, image: err })); return; }
    setErrors(({ image: _i, ...rest }) => rest);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const parsed = listingSchema.safeParse({ ...fd, listing_type: type });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      let image_url = initial?.image_url ?? null;
      if (file) image_url = await uploadImage(user!.id, file);
      await onSubmit({ ...parsed.data, image_url });
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
        <Label htmlFor="image">Photo</Label>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {preview && <img src={preview} alt="Selected item preview" className="size-28 rounded-md border object-cover" />}
          <Input id="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => pick(e.target.files?.[0])} />
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG or WebP, up to 5 MB.</p>
        {err("image")}
      </div>

      <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto">{busy ? "Saving…" : submitLabel}</Button>
    </form>
  );
}
