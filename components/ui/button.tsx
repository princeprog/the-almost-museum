import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ className, type = "button", variant = "primary", ...props }: Readonly<ButtonProps>) {
  const classes = ["museum-button", `museum-button--${variant}`, className].filter(Boolean).join(" ");

  return <button className={classes} type={type} {...props} />;
}
