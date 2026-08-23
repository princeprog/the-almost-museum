import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button", () => {
  it.each([
    ["primary", "museum-button--primary"],
    ["secondary", "museum-button--secondary"],
    ["quiet", "museum-button--quiet"],
    ["danger", "museum-button--danger"],
  ] as const)("keeps the museum %s variant", (variant, expectedClass) => {
    render(<Button variant={variant}>{variant}</Button>);

    expect(screen.getByRole("button", { name: variant })).toHaveClass(
      "museum-button",
      expectedClass,
    );
  });

  it("composes a Next Link without nesting it inside a button", () => {
    render(
      <Button asChild variant="secondary">
        <Link href="/museum">Enter the museum</Link>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Enter the museum" });

    expect(link).toHaveAttribute("href", "/museum");
    expect(link).toHaveClass("museum-button", "museum-button--secondary");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
