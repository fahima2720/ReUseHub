import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validateUpload } from "@/lib/uploads";

export const uploadListingFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: FormData) => data)
  .handler(async ({ data, context }) => {
    const file = data.get("file");
    const kind = data.get("kind");
    if (!(file instanceof File) || (kind !== "image" && kind !== "pdf")) throw new Error("Choose a file.");
    const error = await validateUpload(file, kind);
    if (error) throw new Error(error);
    const bucket = kind === "pdf" ? "listing-documents" : "listing-images";
    const ext = kind === "pdf" ? "pdf" : file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
    const path = `${context.userId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await context.supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    if (kind === "pdf") return { path, url: null };
    const { data: signed, error: signError } = await context.supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (signError) {
      await context.supabase.storage.from(bucket).remove([path]);
      throw signError;
    }
    // Browser-visible URLs must use the hosted storage origin, not a sandbox server address.
    const hosted = import.meta.env.VITE_SUPABASE_URL as string;
    const url = new URL(signed.signedUrl);
    const origin = new URL(hosted);
    url.protocol = origin.protocol;
    url.host = origin.host;
    return { path, url: url.toString() };
  });