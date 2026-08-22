import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function Input({ className, hint, id, label, required, ...props }: Readonly<InputProps>) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const classes = ["museum-input", className].filter(Boolean).join(" ");

  return (
    <label className="museum-field" htmlFor={inputId}>
      <span className="museum-field__label">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      <input aria-describedby={hintId} className={classes} id={inputId} required={required} {...props} />
      {hint ? <span className="museum-field__hint" id={hintId}>{hint}</span> : null}
    </label>
  );
}
