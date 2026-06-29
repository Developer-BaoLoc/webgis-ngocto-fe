import type { ReactNode } from "react";

const inputClass =
  "ioc-input ioc-form-control mt-1.5 w-full border-border bg-surface text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

interface InputProps {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}

export function FieldWrapper({ label, required, children, hint }: InputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export { inputClass };
