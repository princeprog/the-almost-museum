import { Input as InputPrimitive } from "@base-ui/react/input";
import * as React from "react";

import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<typeof InputPrimitive> & {
  label: string;
  hint?: string;
};

function Input({ "aria-describedby": ariaDescribedBy, className, hint, id, label, required, type, ...props }: InputProps) {
  const generatedId = React.useId();
  const inputId = id ?? `field-${generatedId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [ariaDescribedBy, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="museum-field">
      <label className="museum-field__label" htmlFor={inputId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <InputPrimitive
        aria-describedby={describedBy}
        className={cn(
          "museum-input h-8 w-full min-w-0 border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
          className,
        )}
        data-slot="input"
        id={inputId}
        required={required}
        type={type}
        {...props}
      />
      {hint ? <span className="museum-field__hint" id={hintId}>{hint}</span> : null}
    </div>
  );
}

export { Input };
