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

  const control = (
    <InputPrimitive
      aria-describedby={describedBy}
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      data-slot="input"
      id={inputId}
      required={required}
      type={type}
      {...props}
    />
  );

  if (label === "" && hint === undefined) return control;

  return (
    <div className="museum-field">
      <label className="museum-field__label" htmlFor={inputId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {control}
      {hint ? <span className="museum-field__hint" id={hintId}>{hint}</span> : null}
    </div>
  );
}

export { Input };
