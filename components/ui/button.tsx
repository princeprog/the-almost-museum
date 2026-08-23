import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "museum-button group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        danger: "museum-button--danger bg-destructive text-primary-foreground hover:bg-destructive/90",
        default: "museum-button--primary bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "museum-button--danger bg-destructive text-primary-foreground hover:bg-destructive/90",
        ghost: "museum-button--quiet hover:bg-muted hover:text-foreground",
        link: "museum-button--quiet text-primary underline-offset-4 hover:underline",
        outline: "museum-button--secondary border-border bg-background hover:bg-muted hover:text-foreground",
        primary: "museum-button--primary bg-primary text-primary-foreground hover:bg-primary/90",
        quiet: "museum-button--quiet hover:bg-muted hover:text-foreground",
        secondary: "museum-button--secondary border-border bg-background hover:bg-muted hover:text-foreground",
      },
      size: {
        default: "h-8 gap-1.5 px-2.5",
        icon: "size-8 p-0",
        "icon-lg": "size-9 p-0",
        "icon-sm": "size-7 p-0",
        "icon-xs": "size-6 p-0",
        lg: "h-9 gap-1.5 px-3",
        sm: "h-7 gap-1 px-2.5",
        xs: "h-6 gap-1 px-2 text-xs",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "primary",
    },
  },
);

type ButtonProps = useRender.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  asChild = false,
  children,
  className,
  render,
  size = "default",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  let child: React.ReactElement | undefined;

  if (asChild) {
    if (!React.isValidElement(children)) {
      throw new Error("Button with asChild requires exactly one React element.");
    }

    child = children;
  }

  return useRender({
    defaultTagName: "button",
    props: {
      ...props,
      children: asChild ? undefined : children,
      className: cn(buttonVariants({ className, size, variant })),
      type: asChild ? undefined : type,
    },
    render: asChild ? child : render,
    state: {
      size,
      slot: "button",
      variant,
    },
  });
}

export { Button, buttonVariants };
