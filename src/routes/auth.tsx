import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({
    mode: z.enum(["login", "signup"]).optional().catch(undefined),
    redirect: z.string().optional().catch(undefined),
  }),
  head: () => ({
    meta: [
      { title: "Log in or sign up — ReUseHub" },
      { name: "description", content: "Create a ReUseHub account to sell, donate and message other members." },
      { property: "og:title", content: "Log in or sign up — ReUseHub" },
      { property: "og:description", content: "Join ReUseHub to sell or give away items." },
    ],
  }),
  component: AuthPage,
});

export const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().regex(/^[0-9+\- ]{7,20}$/, "Enter a valid phone number (7–20 digits)"),
  location: z.string().trim().max(80).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(72)
    .regex(/[A-Za-z]/, "Include at least one letter").regex(/[0-9]/, "Include at least one number"),
});

const safeRedirect = (r?: string) => (r && r.startsWith("/") && !r.startsWith("//") ? r : "/dashboard");

function AuthPage() {
  const { mode = "login", redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: safeRedirect(redirect) });
  }, [user, redirect, navigate]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setErrors({});
    if (mode === "signup") {
      const parsed = signupSchema.safeParse(fd);
      if (!parsed.success) {
        setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
        return;
      }
      setBusy(true);
      const { email, password, ...meta } = parsed.data;
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin, data: { ...meta, location: meta.location || null } },
      });
      setBusy(false);
      if (error) return toast.error(error.message.toLowerCase().includes("registered") ? "An account with this email already exists." : error.message);
      // Supabase returns a user with no identities when the email is already taken
      if (data.user && data.user.identities?.length === 0) return toast.error("An account with this email already exists.");
      setCheckEmail(true);
    } else {
      if (!fd.email || !fd.password) return setErrors({ email: !fd.email ? "Email is required" : "", password: !fd.password ? "Password is required" : "" });
      setBusy(true);
      const { error } = await supabase.auth.signInWithPassword({ email: fd.email.trim(), password: fd.password });
      setBusy(false);
      if (error) return toast.error(error.message.includes("confirm") ? "Please confirm your email first." : "Incorrect email or password.");
      toast.success("Welcome back!");
    }
  };

  if (checkEmail)
    return (
      <div className="container-page max-w-md py-16 text-center">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="mt-2 text-muted-foreground">We sent a confirmation link. Click it to activate your account, then log in.</p>
        <Button asChild className="mt-6"><Link to="/auth">Back to log in</Link></Button>
      </div>
    );

  return (
    <div className="container-page max-w-md py-12">
      <div className="rounded-xl border bg-card p-6 shadow-card sm:p-8">
        <h1 className="text-2xl font-bold">{mode === "signup" ? "Create your account" : "Log in to ReUseHub"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signup" ? "Sell or give away items in minutes." : "Good to see you again."}
        </p>
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          {mode === "signup" && <Field errors={errors} name="full_name" label="Full name" autoComplete="name" required />}
          <Field errors={errors} name="email" label="Email" type="email" autoComplete="email" required />
          {mode === "signup" && (
            <>
              <Field errors={errors} name="phone" label="Phone number" type="tel" autoComplete="tel" required placeholder="01XXXXXXXXX" />
              <Field errors={errors} name="location" label="Location (optional)" autoComplete="address-level2" placeholder="e.g. Mirpur, Dhaka" />
            </>
          )}
          <Field errors={errors} name="password" label="Password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required />
          {mode === "signup" && <p className="text-xs text-muted-foreground">At least 8 characters with a letter and a number.</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signup" ? "Already have an account? " : "New to ReUseHub? "}
          <Link to="/auth" search={{ mode: mode === "signup" ? "login" : "signup", redirect }} className="font-medium text-primary hover:underline">
            {mode === "signup" ? "Log in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ name, label, type = "text", errors, ...rest }: { name: string; label: string; type?: string; errors: Record<string, string>; autoComplete?: string; required?: boolean; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-err` : undefined} {...rest} />
      {errors[name] && <p id={`${name}-err`} className="text-xs text-destructive">{errors[name]}</p>}
    </div>
  );
}
