import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { profileSchema } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [
    { title: "Profile — ReUseHub" },
    { name: "description", content: "Manage your ReUseHub name, phone number and location." },
    { property: "og:title", content: "Profile — ReUseHub" },
    { property: "og:description", content: "Your ReUseHub profile details." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Profile,
});

function Profile() {
  const { user, profile, loading, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  return <div className="container-page max-w-md py-10">
    <h1 className="text-3xl font-bold">Profile</h1>
    {loading ? <Skeleton className="mt-6 h-64" /> : !profile ?
      <div className="mt-6 space-y-3"><p className="text-sm text-muted-foreground">Couldn't load your profile.</p><Button variant="outline" onClick={() => refresh()}>Try again</Button></div> :
      <form className="mt-6 space-y-4" noValidate onSubmit={async (event) => {
        event.preventDefault();
        if (!user) return;
        const parsed = profileSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
        setErrors({});
        if (!parsed.success) {
          setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])));
          return;
        }
        setBusy(true);
        try {
          const { error, data } = await supabase.from("profiles").update({
            full_name: parsed.data.full_name,
            phone: parsed.data.phone,
            location: parsed.data.location || null,
          }).eq("id", user.id).select("id").single();
          if (error) throw error;
          if (!data) throw new Error("Couldn't save your profile.");
          await refresh();
          toast.success("Profile saved.");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Couldn't save your profile.");
        } finally { setBusy(false); }
      }}>
        <div className="space-y-1.5"><Label>Email</Label><p className="break-all text-sm text-muted-foreground">{profile.email}</p></div>
        {([
          { name: "full_name", label: "Full name", value: profile.full_name, max: 80, autoComplete: "name" },
          { name: "phone", label: "Phone number", value: profile.phone, max: 20, autoComplete: "tel" },
          { name: "location", label: "Location (optional)", value: profile.location ?? "", max: 80, autoComplete: "address-level2" },
        ]).map((field) => <div key={field.name} className="space-y-1.5">
          <Label htmlFor={field.name}>{field.label}</Label>
          <Input id={field.name} name={field.name} defaultValue={field.value} maxLength={field.max} autoComplete={field.autoComplete} type={field.name === "phone" ? "tel" : "text"} required={field.name !== "location"} aria-invalid={!!errors[field.name]} aria-describedby={errors[field.name] ? `${field.name}-err` : undefined} />
          {errors[field.name] && <p id={`${field.name}-err`} className="text-xs text-destructive">{errors[field.name]}</p>}
        </div>)}
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
      </form>}
  </div>;
}