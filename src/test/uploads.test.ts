import { describe, expect, it } from "vitest";
import { validateUpload, MAX_IMAGE_BYTES, MAX_PDF_BYTES } from "@/lib/uploads";

describe("uploaded file validation", () => {
  it("accepts PDF signatures only with PDF MIME and extension", async () => {
    expect(await validateUpload(new File(["%PDF-1.4\n%%EOF"], "manual.pdf", { type: "application/pdf" }), "pdf")).toBeNull();
    expect(await validateUpload(new File(["MZ executable"], "fake.pdf", { type: "application/pdf" }), "pdf")).not.toBeNull();
    expect(await validateUpload(new File(["%PDF-1.4"], "manual.exe", { type: "application/pdf" }), "pdf")).not.toBeNull();
  });
  it("rejects PDFs larger than 10 MB", async () => {
    expect(await validateUpload(new File([new Uint8Array(MAX_PDF_BYTES + 1)], "large.pdf", { type: "application/pdf" }), "pdf")).not.toBeNull();
  });
  it("rejects photos larger than 5 MB and PDF content disguised as a photo", async () => {
    expect(await validateUpload(new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "large.png", { type: "image/png" }), "image")).not.toBeNull();
    expect(await validateUpload(new File(["%PDF-1.4"], "fake.png", { type: "image/png" }), "image")).not.toBeNull();
    expect(await validateUpload(new File([new Uint8Array([255,216,255,0])], "photo.jpg", { type: "image/jpeg" }), "image")).toBeNull();
  });
});