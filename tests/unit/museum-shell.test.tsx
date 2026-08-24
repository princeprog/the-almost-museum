import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import HomePage from "../../app/page";
import { MuseumShell } from "../../components/museum-shell";
import { Dialog } from "../../components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "../../components/ui/field";
import { Input } from "../../components/ui/input";

function DialogTriggerHarness() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)} type="button">Open collection note</button>
      <Dialog isOpen={isOpen} onOpenChange={setIsOpen} title="Collection note">
        <button type="button">Confirm note</button>
      </Dialog>
    </>
  );
}

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
    expect(museumLink).toHaveClass("navigation-link--featured");
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

  it("returns focus to an unchanged trigger when a dialog is dismissed with Escape", async () => {
    const user = userEvent.setup();
    render(<DialogTriggerHarness />);

    const trigger = screen.getByRole("button", { name: "Open collection note" });
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Collection note" })).toBeVisible();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Collection note" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("composes labelled inputs with explicit descriptions", () => {
    render(
      <>
        <p id="collection-guidance">This label is shared across the collection.</p>
        <Field>
          <FieldLabel htmlFor="working-title">Title</FieldLabel>
          <Input aria-describedby="collection-guidance working-title-hint" id="working-title" />
          <FieldDescription id="working-title-hint">Give it a working name.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="alternate-title">Title</FieldLabel>
          <Input id="alternate-title" />
        </Field>
        <Field>
          <FieldLabel htmlFor="source-title">Source title</FieldLabel>
          <Input id="source-title" />
        </Field>
      </>,
    );

    const [firstInput, secondInput] = screen.getAllByRole("textbox", { name: "Title" });
    const firstDescriptions = firstInput.getAttribute("aria-describedby")?.split(" ") ?? [];

    expect(firstInput).toHaveAttribute("id", "working-title");
    expect(secondInput).toHaveAttribute("id", "alternate-title");
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
