import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EmptyCollectionState } from "@/components/empty-collection-state";

describe("EmptyCollectionState", () => {
  it("offers accessible explicit actions without installing a demo during render", () => {
    const onInstallDemo = vi.fn();

    render(<EmptyCollectionState onInstallDemo={onInstallDemo} />);

    expect(screen.getByRole("heading", { name: "Your collection is empty." })).toBeVisible();
    expect(screen.getByRole("region", { name: "Your collection is empty." })).toHaveAttribute("data-slot", "empty");
    expect(screen.getByRole("link", { name: "Create Exhibit" })).toHaveAttribute("href", "/exhibit/new");
    expect(screen.getByRole("link", { name: "Create Exhibit" })).not.toHaveAttribute("role", "button");
    expect(screen.getByRole("button", { name: "Install Harbor Queue demo" })).toBeVisible();
    expect(onInstallDemo).not.toHaveBeenCalled();
  });

  it("runs demo installation only after its explicit action is activated", async () => {
    const user = userEvent.setup();
    const onInstallDemo = vi.fn();

    render(<EmptyCollectionState onInstallDemo={onInstallDemo} />);

    await user.click(screen.getByRole("button", { name: "Install Harbor Queue demo" }));

    expect(onInstallDemo).toHaveBeenCalledTimes(1);
  });
});
