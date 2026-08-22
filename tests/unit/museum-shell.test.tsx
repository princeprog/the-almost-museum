import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import HomePage from "../../app/page";
import { MuseumShell } from "../../components/museum-shell";
import { Dialog } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";

describe("museum shell", () => {
  it("exposes named primary navigation that can be reached with the keyboard", async () => {
    const user = userEvent.setup();

    render(
      <MuseumShell>
        <HomePage />
      </MuseumShell>,
    );

    const navigation = screen.getByRole("navigation", { name: "Primary navigation" });
    const museumLink = screen.getByRole("link", { name: "Museum" });

    expect(navigation).toBeVisible();
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(document.querySelector(".museum-paper-texture")).toBeInTheDocument();

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
        <button tabIndex={-1} type="button">Excluded action</button>
        <button style={{ display: "none" }} type="button">Hidden action</button>
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

  it("creates unique input IDs and retains every description reference", () => {
    render(
      <>
        <p id="collection-guidance">This label is shared across the collection.</p>
        <Input aria-describedby="collection-guidance" hint="Give it a working name." label="Title" />
        <Input label="Title" />
        <Input id="source-title" label="Source title" />
      </>,
    );

    const [firstInput, secondInput] = screen.getAllByRole("textbox", { name: "Title" });
    const firstDescriptions = firstInput.getAttribute("aria-describedby")?.split(" ") ?? [];

    expect(firstInput.id).not.toBe(secondInput.id);
    expect(firstDescriptions).toContain("collection-guidance");
    expect(firstDescriptions).toContain(`${firstInput.id}-hint`);
    expect(screen.getByRole("textbox", { name: "Source title" })).toHaveAttribute("id", "source-title");
  });

  it("composes dialog and caller supplied descriptions", () => {
    render(
      <>
        <p id="release-guidance">This action can be revisited from history.</p>
        <Dialog
          aria-describedby="release-guidance"
          description="Release preserves this Exhibit in your collection."
          isOpen
          onOpenChange={() => undefined}
          title="Release Exhibit"
        >
          <button type="button">Release</button>
        </Dialog>
      </>,
    );

    const descriptionIds = screen.getByRole("dialog").getAttribute("aria-describedby")?.split(" ") ?? [];
    const generatedDescription = screen.getByText("Release preserves this Exhibit in your collection.");

    expect(descriptionIds).toContain("release-guidance");
    expect(descriptionIds).toContain(generatedDescription.id);
  });
});
