import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OfflinePage from "../../app/offline/page";

describe("offline fallback", () => {
  it("offers a keyboard-reachable recovery route to the cached museum", () => {
    render(<OfflinePage />);

    expect(screen.getByRole("heading", { name: "You can still visit the Museum." })).toBeVisible();
    expect(screen.getByRole("region", { name: "You can still visit the Museum." })).toHaveAttribute("data-slot", "card");
    expect(screen.getByRole("alert")).toHaveTextContent("saved collection");
    expect(screen.getByRole("link", { name: "Try the Museum again" })).toHaveAttribute("href", "/museum");
  });
});
