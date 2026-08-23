import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva("museum-button", {
  variants: {
    variant: {
      danger: "museum-button--danger",
      primary: "museum-button--primary",
      quiet: "museum-button--quiet",
      secondary: "museum-button--secondary",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, type = "button", variant = "primary", ...props }: Readonly<ButtonProps>) {
  return <button className={cn(buttonVariants({ variant }), className)} type={type} {...props} />;
}
