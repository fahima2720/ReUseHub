import { describe, expect, it } from "vitest";
import { listingSchema, messageSchema, profileSchema } from "@/lib/validation";

const listing = { title: "Study table", description: "A sturdy wooden study table.", category_id: 1, listing_type: "sale", price: "500", item_condition: "good", location: "Dhaka" };
describe("ReUseHub business rules", () => {
  it("limits profile names to 2–80 characters", () => {
    const profile = { full_name: "Eva", phone: "0123456789" };
    for (const length of [1, 81]) expect(profileSchema.safeParse({ ...profile, full_name: "a".repeat(length) }).success).toBe(false);
    for (const length of [2, 80]) expect(profileSchema.safeParse({ ...profile, full_name: "a".repeat(length) }).success).toBe(true);
  });
  it("accepts only the signup phone pattern of 7–20 characters", () => {
    for (const phone of ["123456", "1".repeat(21), "01234abc"]) expect(profileSchema.safeParse({ full_name: "Eva", phone }).success).toBe(false);
    for (const phone of ["1234567", "+12-345 678", "1".repeat(20)]) expect(profileSchema.safeParse({ full_name: "Eva", phone }).success).toBe(true);
  });
  it("makes location optional and limits it to 80 characters", () => {
    const profile = { full_name: "Eva", phone: "0123456789" };
    expect(profileSchema.safeParse(profile).success).toBe(true);
    expect(profileSchema.safeParse({ ...profile, location: "a".repeat(80) }).success).toBe(true);
    expect(profileSchema.safeParse({ ...profile, location: "a".repeat(81) }).success).toBe(false);
  });
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