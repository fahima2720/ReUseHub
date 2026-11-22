import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PasswordFieldProps = {
  name: string;
  label: string;
  error?: string;
  autoComplete?: string;
  required?: boolean;
};

export function PasswordField({ name, label, error, autoComplete, required }: PasswordFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <Input id={name} name={name} type={show ? "text" : "password"} required={required} autoComplete={autoComplete}
          aria-invalid={!!error} aria-describedby={error ? `${name}-err` : undefined} className="pr-10" />
        <button type="button" onClick={() => setShow((value) => !value)} aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p id={`${name}-err`} className="text-xs text-destructive">{error}</p>}
    </div>
  );
}