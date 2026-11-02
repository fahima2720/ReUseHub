export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export async function validateUpload(file: File, kind: "image" | "pdf"): Promise<string | null> {
  if (!file.size) return "The file is empty.";
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (kind === "pdf") {
    if (file.size > MAX_PDF_BYTES) return "PDF must be 10 MB or smaller.";
    if (file.type !== "application/pdf" || !/\.pdf$/i.test(file.name) || String.fromCharCode(...b.slice(0, 5)) !== "%PDF-") return "Choose a valid PDF file.";
    return null;
  }
  if (file.size > MAX_IMAGE_BYTES) return "Image must be 5 MB or smaller.";
  const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a;
  const webp = String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP";
  if (!((file.type === "image/jpeg" && jpg) || (file.type === "image/png" && png) || (file.type === "image/webp" && webp))) return "Choose a valid JPG, PNG or WebP image.";
  return null;
}