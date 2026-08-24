import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { describe, expect, it } from "vitest";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

describe("Button", () => {
  it.each([
    ["default", "bg-primary"],
    ["secondary", "bg-secondary"],
    ["ghost", "hover:bg-muted"],
    ["destructive", "bg-destructive/10"],
  ] as const)("uses the official shadcn %s variant", (variant, expectedClass) => {
    render(<Button variant={variant}>{variant}</Button>);

    const button = screen.getByRole("button", { name: variant });

    expect(button).toHaveAttribute("data-slot", "button");
    expect(button).toHaveClass(expectedClass);
    expect(button).not.toHaveClass("museum-button");
  });

  it("styles a semantic Next Link without assigning it a button role", () => {
    render(
      <Link className={cn(buttonVariants({ variant: "secondary" }))} href="/museum">
        Enter the museum
      </Link>,
    );

    const link = screen.getByRole("link", { name: "Enter the museum" });

    expect(link).toHaveAttribute("href", "/museum");
    expect(link).toHaveClass("bg-secondary");
    expect(link).not.toHaveAttribute("role", "button");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
