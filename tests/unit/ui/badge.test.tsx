import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("keeps exhibit metadata semantic, labeled, and variant-addressable", () => {
    render(
      <Badge aria-label="Exhibit type metadata: project" variant="outline">
        Project
      </Badge>,
    );

    const badge = screen.getByLabelText("Exhibit type metadata: project");

    expect(badge.tagName).toBe("SPAN");
    expect(badge).toHaveTextContent("Project");
    expect(badge).toHaveAttribute("data-slot", "badge");
    expect(badge).toHaveAttribute("data-variant", "outline");
  });
});
