import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { passwordSchema } from "./auth";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Reset Password — ReUseHub" },
      { name: "description", content: "Choose a new password for your ReUseHub account." },
      { property: "og:title", content: "Reset Password — ReUseHub" },
      { property: "og:description", content: "Choose a new password for your ReUseHub account." },
    ],
  }),
  component: ResetPasswordPage,
});

type Status = "checking" | "ready" | "invalid" | "done";

function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    let settled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        settled = true;
        setStatus("ready");
      }
    });
    // The recovery token in the URL is processed asynchronously; if no
    // PASSWORD_RECOVERY event arrives, the link is invalid or expired.
    const timer = setTimeout(async () => {
      if (settled) return;
      const { data } = await supabase.auth.getSession();
      if (!settled) setStatus(data.session ? "ready" : "invalid");
    }, 1500);
    return () => {
      settled = true;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    const next: Record<string, string> = {};
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) next.password = parsed.error.issues[0].message;
    if (!confirm) next.confirm = "Please confirm your new password.";
    else if (confirm !== password) next.confirm = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setErrors({ password: "This reset link is no longer valid. Please request a new one." });
    await supabase.auth.signOut();
    setStatus("done");
  };

  return (
    <div className="container-page max-w-md py-12">
      <div className="rounded-xl border bg-card p-6 shadow-card sm:p-8">
        <h1 className="text-2xl font-bold">Reset Password</h1>
        {status === "checking" && <p className="mt-4 text-sm text-muted-foreground">Checking your reset link…</p>}
        {status === "invalid" && (
          <div className="mt-4 space-y-4">
            <p className="rounded-md bg-accent px-3 py-2 text-sm text-foreground" role="alert">
              This reset link is invalid or has expired. Request a new one to continue.
            </p>
            <Button asChild className="w-full"><Link to="/forgot-password">Request a new link</Link></Button>
          </div>
        )}
        {status === "done" && (
          <div className="mt-4 space-y-4">
            <p className="rounded-md bg-accent px-3 py-2 text-sm text-foreground" role="status">
              Your password has been updated. You can now log in with your new password.
            </p>
            <Button asChild className="w-full"><Link to="/auth">Back to log in</Link></Button>
          </div>
        )}
        {status === "ready" && (
          <>
            <p className="mt-1 text-sm text-muted-foreground">Choose a new password for your account.</p>
            <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
              <PasswordField name="password" label="New Password" show={showNew} onToggle={() => setShowNew((v) => !v)} error={errors.password} autoComplete="new-password" />
              <PasswordField name="confirm" label="Confirm New Password" show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} error={errors.confirm} autoComplete="new-password" />
              <p className="text-xs text-muted-foreground">At least 8 characters with a letter and a number.</p>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Updating…" : "Reset Password"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function PasswordField({ name, label, show, onToggle, error, autoComplete }: {
  name: string; label: string; show: boolean; onToggle: () => void; error?: string; autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <Input id={name} name={name} type={show ? "text" : "password"} required autoComplete={autoComplete}
          aria-invalid={!!error} aria-describedby={error ? `${name}-err` : undefined} className="pr-10" />
        <button type="button" onClick={onToggle} aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p id={`${name}-err`} className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
