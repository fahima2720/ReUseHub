import { describe, expect, it } from "vitest";
import { listingSchema, messageSchema } from "@/lib/validation";

const listing = { title: "Study table", description: "A sturdy wooden study table.", category_id: 1, listing_type: "sale", price: "500", item_condition: "good", location: "Dhaka" };
describe("ReUseHub business rules", () => {
  it("requires a sale price greater than zero after rounding", () => {
    for (const price of ["0", "-1", "0.001", "", "NaN"]) expect(listingSchema.safeParse({ ...listing, price }).success).toBe(false);
    expect(listingSchema.parse(listing).price).toBe(500);
  });
  it("stores NULL price for a free donation", () => {
    expect(listingSchema.parse({ ...listing, listing_type: "donation", price: "500" }).price).toBeNull();
  });
  it("limits messages to 5–1000 trimmed characters", () => {
    expect(messageSchema.safeParse("    hi    ").success).toBe(false);
    expect(messageSchema.safeParse("a".repeat(1001)).success).toBe(false);
    expect(messageSchema.parse("  Hello  ")).toBe("Hello");
  });
});