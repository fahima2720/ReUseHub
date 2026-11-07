import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const emailSchema = z.string().trim().email("Enter a valid email").max(255);

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Forgot Password — ReUseHub" },
      { name: "description", content: "Request a password reset link for your ReUseHub account." },
      { property: "og:title", content: "Forgot Password — ReUseHub" },
      { property: "og:description", content: "Reset your ReUseHub account password." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (err) return setError("We couldn't send the reset email. Please try again in a few minutes.");
    // Always show the same message whether or not the email is registered.
    setSent(true);
  };

  return (
    <div className="container-page max-w-md py-12">
      <div className="rounded-xl border bg-card p-6 shadow-card sm:p-8">
        <h1 className="text-2xl font-bold">Forgot Your Password?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your account email and we'll send you a link to reset your password.
        </p>
        {sent ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-md bg-accent px-3 py-2 text-sm text-foreground" role="status">
              If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.
            </p>
            <Button asChild className="w-full"><Link to="/auth">Back to log in</Link></Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!error} aria-describedby={error ? "email-err" : undefined} />
              {error && <p id="email-err" className="text-xs text-destructive">{error}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Sending…" : "Send Reset Link"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Remembered it?{" "}
              <Link to="/auth" className="font-medium text-primary hover:underline">Back to log in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
