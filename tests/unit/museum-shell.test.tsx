import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import HomePage from "../../app/page";
import RootLayout from "../../app/layout";
import { Dialog } from "../../components/ui/dialog";

describe("museum shell", () => {
  it("exposes named primary navigation that can be reached with the keyboard", async () => {
    const user = userEvent.setup();

    render(
      <RootLayout>
        <HomePage />
      </RootLayout>,
    );

    const navigation = screen.getByRole("navigation", { name: "Primary navigation" });
    const museumLink = screen.getByRole("link", { name: "Museum" });

    expect(navigation).toBeVisible();

    await user.tab();
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("link", { name: "Almost Museum home" })).toHaveFocus();

    await user.tab();

    expect(museumLink).toHaveFocus();
  });

  it("keeps keyboard focus within an open dialog", async () => {
    const user = userEvent.setup();

    render(
      <Dialog isOpen onOpenChange={() => undefined} title="Move to Archive">
        <button type="button">Confirm move</button>
      </Dialog>,
    );

    const closeButton = screen.getByRole("button", { name: "Close dialog" });
    const confirmButton = screen.getByRole("button", { name: "Confirm move" });

    expect(screen.getByRole("dialog")).toHaveFocus();

    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.tab();
    expect(confirmButton).toHaveFocus();

    await user.tab();
    expect(closeButton).toHaveFocus();
  });
});
