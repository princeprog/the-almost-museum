import { useId } from "react";
import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function Input({ "aria-describedby": ariaDescribedBy, className, hint, id, label, required, ...props }: Readonly<InputProps>) {
  const generatedId = useId();
  const inputId = id ?? `field-${generatedId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [ariaDescribedBy, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="museum-field">
      <label className="museum-field__label" htmlFor={inputId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input aria-describedby={describedBy} className={cn("museum-input", className)} id={inputId} required={required} {...props} />
      {hint ? <span className="museum-field__hint" id={hintId}>{hint}</span> : null}
    </div>
  );
}
