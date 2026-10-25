import { z } from "zod";

export const listingSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(2000),
  category_id: z.coerce.number().int().positive("Choose a category"),
  listing_type: z.enum(["sale", "donation"]),
  price: z.string().optional(),
  item_condition: z.enum(["new", "like_new", "good", "fair"]),
  location: z.string().trim().min(2, "Location is required").max(80),
  status: z.enum(["available", "reserved", "sold"]).optional(),
}).transform((v, ctx) => {
  if (v.listing_type === "donation") return { ...v, price: null };
  const n = Number(v.price);
  const rounded = Math.round(n * 100) / 100;
  if (!v.price || !Number.isFinite(n) || rounded <= 0 || n > 10_000_000) {
    ctx.addIssue({ code: "custom", path: ["price"], message: "Sale items need a price greater than 0" });
    return z.NEVER;
  }
  return { ...v, price: rounded };
});

export const messageSchema = z.string().trim().min(5).max(1000);

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  phone: z.string().trim().regex(/^[0-9+\- ]{7,20}$/, "Enter a valid phone number (7–20 digits)"),
  location: z.string().trim().max(80).optional(),
});