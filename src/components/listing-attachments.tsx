import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { validateUpload } from "@/lib/uploads";
import { uploadListingFile } from "@/lib/uploads.functions";

export function ListingAttachments({ listingId, editable = false }: { listingId: string; editable?: boolean }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ["listing-attachments", listingId], queryFn: async () => {
    const { data, error } = await supabase.from("listing_attachments").select("id,filename,size_bytes,storage_path").eq("listing_id", listingId).order("created_at");
    if (error) throw error;
    return data;
  }});
  if (!editable && !q.data?.length && !q.isError) return null;
  return <div className="mt-6 space-y-2">
    <h2 className="text-sm font-medium">PDF attachments</h2>
    {q.isLoading && <p className="text-sm text-muted-foreground">Loading documents…</p>}
    {q.isError && <Button variant="outline" size="sm" onClick={() => q.refetch()}>Retry documents</Button>}
    {q.data?.map((file) => <div key={file.id} className="flex flex-wrap items-center gap-2 text-sm">
      <span className="min-w-0 break-all">{file.filename} · {(file.size_bytes / 1024).toFixed(1)} KB</span>
      <Button type="button" variant="outline" size="sm" onClick={async () => {
        const { data, error } = await supabase.storage.from("listing-documents").createSignedUrl(file.storage_path, 300);
        if (error) return toast.error("Couldn't open PDF. Please try again.");
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }}>Open PDF</Button>
      {editable && <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={async () => {
        setBusy(true);
        try {
          const { error } = await supabase.from("listing_attachments").delete().eq("id", file.id);
          if (error) throw error;
          const { error: storageError } = await supabase.storage.from("listing-documents").remove([file.storage_path]);
          if (storageError) toast.error("Document removed from listing; storage cleanup failed.");
          await qc.invalidateQueries({ queryKey: ["listing-attachments", listingId] });
        } catch { toast.error("Couldn't remove document."); }
        finally { setBusy(false); }
      }}>Remove</Button>}
    </div>)}
    {editable && <>
      <Input aria-label="Add PDF attachment" type="file" accept="application/pdf,.pdf" disabled={busy} onChange={async (event) => {
        const file = event.target.files?.[0]; event.target.value = "";
        if (!file) return;
        const validation = await validateUpload(file, "pdf");
        if (validation) return toast.error(validation);
        if (q.data?.some((existing) => existing.filename === file.name && existing.size_bytes === file.size)) return toast.error("This PDF is already attached.");
        setBusy(true);
        let uploadedPath: string | undefined;
        try {
          const data = new FormData(); data.set("file", file); data.set("kind", "pdf");
          const uploaded = await uploadListingFile({ data }); uploadedPath = uploaded.path;
          const { error } = await supabase.from("listing_attachments").insert({ listing_id: listingId, filename: file.name.slice(0, 200), size_bytes: file.size, storage_path: uploaded.path });
          if (error) throw error;
          uploadedPath = undefined;
          await qc.invalidateQueries({ queryKey: ["listing-attachments", listingId] });
          toast.success("PDF attached.");
        } catch (error) {
          if (uploadedPath) await supabase.storage.from("listing-documents").remove([uploadedPath]);
          toast.error(error instanceof Error ? error.message : "PDF upload failed.");
        } finally { setBusy(false); }
      }} />
      <p className="text-xs text-muted-foreground">{busy ? "Uploading / saving PDF…" : "PDF, up to 10 MB. Visible to signed-in users."}</p>
    </>}
  </div>;
}