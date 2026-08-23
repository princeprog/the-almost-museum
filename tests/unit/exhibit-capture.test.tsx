import Dexie from "dexie";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExhibitCapture } from "@/components/exhibit-capture";
import { ExhibitRepository } from "@/lib/persistence";

const databaseNames = new Set<string>();
const repositories = new Set<ExhibitRepository>();
const createObjectUrl = vi.fn<(blob: Blob) => string>();
const revokeObjectUrl = vi.fn<(url: string) => void>();

function createRepository(name: string): ExhibitRepository {
  databaseNames.add(name);
  const repository = new ExhibitRepository({
    databaseName: name,
    createId: (() => {
      let index = 0;
      return () => `capture-${++index}`;
    })(),
    now: () => new Date("2026-08-23T03:00:00.000Z"),
  });
  repositories.add(repository);
  return repository;
}

function createLocalFile(contents: BlobPart, name: string, type: string): File {
  return Object.assign(new Blob([contents], { type }), { name }) as File;
}

async function completeIdentity(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole("textbox", { name: "Working title" }), "Harbor wayfinding study");
  await user.selectOptions(screen.getByRole("combobox", { name: "Exhibit type" }), "experiment");
  await user.click(screen.getByRole("button", { name: "Continue to evidence" }));
}

afterEach(async () => {
  for (const repository of repositories) repository.close();
  repositories.clear();
  for (const name of databaseNames) await Dexie.delete(name);
  databaseNames.clear();
});

beforeEach(() => {
  createObjectUrl.mockReset();
  createObjectUrl.mockReturnValue("blob:artifact-preview");
  revokeObjectUrl.mockReset();
  Object.defineProperties(URL, {
    createObjectURL: { configurable: true, value: createObjectUrl },
    revokeObjectURL: { configurable: true, value: revokeObjectUrl },
  });
});

describe("ExhibitCapture", () => {
  it("marks the capture form ready after client hydration", async () => {
    const repository = createRepository("almost-museum-capture-hydration");

    render(<ExhibitCapture repository={repository} />);

    await waitFor(() => expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "false"));
  });

  it("keeps an incomplete identity step in place and explains the required fields", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-capture-validation");

    render(<ExhibitCapture repository={repository} />);

    await user.click(screen.getByRole("button", { name: "Continue to evidence" }));

    expect(screen.getByRole("heading", { name: "Give the work a place" })).toBeVisible();
    expect(screen.getByText("Add a title before continuing.")).toBeVisible();
    expect(screen.getByText("Choose an Exhibit type before continuing.")).toBeVisible();
  });

  it("moves keyboard focus to an assertive validation summary when a step cannot continue", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-capture-validation-focus");

    render(<ExhibitCapture repository={repository} />);
    await user.click(screen.getByRole("button", { name: "Continue to evidence" }));

    const summary = screen.getByRole("alert");
    expect(summary).toHaveFocus();
    expect(summary).toHaveTextContent("Add a title before continuing.");
  });

  it("keeps a missing initial status in the identity step even though the form starts unfinished", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-capture-status-validation");

    render(<ExhibitCapture repository={repository} />);
    await user.type(screen.getByRole("textbox", { name: "Working title" }), "Harbor wayfinding study");
    await user.selectOptions(screen.getByRole("combobox", { name: "Exhibit type" }), "experiment");
    const status = screen.getByRole("combobox", { name: "Initial status" });

    expect(status).toHaveValue("unfinished");
    fireEvent.change(status, { target: { value: "" } });
    await user.click(screen.getByRole("button", { name: "Continue to evidence" }));

    expect(screen.getByRole("heading", { name: "Give the work a place" })).toBeVisible();
    expect(screen.getByText("Choose an initial status before continuing.")).toBeVisible();
  });

  it("preserves identity values when moving back from evidence", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-capture-preserve");

    render(<ExhibitCapture repository={repository} />);
    await user.type(screen.getByRole("textbox", { name: "Working title" }), "Harbor wayfinding study");
    await user.selectOptions(screen.getByRole("combobox", { name: "Exhibit type" }), "experiment");
    await user.type(screen.getByRole("textbox", { name: "Tags" }), "harbor, navigation");
    await user.click(screen.getByRole("button", { name: "Continue to evidence" }));
    await user.click(screen.getByRole("button", { name: "Back to identity" }));

    expect(screen.getByRole("textbox", { name: "Working title" })).toHaveValue("Harbor wayfinding study");
    expect(screen.getByRole("combobox", { name: "Exhibit type" })).toHaveValue("experiment");
    expect(screen.getByRole("textbox", { name: "Tags" })).toHaveValue("harbor, navigation");
    expect(screen.getByRole("progressbar", { name: "Capture progress" })).toHaveAttribute("value", "1");
  });

  it("keeps optional link and note evidence until the Exhibit is saved", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-capture-evidence");
    const navigatedTo: string[] = [];

    render(<ExhibitCapture onNavigate={(href) => navigatedTo.push(href)} repository={repository} />);
    await completeIdentity(user);

    await user.type(screen.getByRole("textbox", { name: "Link label" }), "Reference sketch");
    await user.type(screen.getByRole("textbox", { name: "Link address" }), "https://example.com/sketch");
    await user.click(screen.getByRole("button", { name: "Add link" }));
    await user.type(screen.getByRole("textbox", { name: "Note label" }), "A small reminder");
    await user.type(screen.getByRole("textbox", { name: "Note" }), "The queue needed calmer handoffs.");
    await user.click(screen.getByRole("button", { name: "Add note" }));

    expect(screen.getByText("Reference sketch")).toBeVisible();
    expect(screen.getByText("A small reminder")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Continue to story" }));
    await user.type(screen.getByRole("textbox", { name: "Museum label" }), "A quieter route through the harbor");
    await user.click(screen.getByRole("button", { name: "Save Exhibit" }));

    await waitFor(async () => {
      const [exhibit] = await repository.listExhibits();
      expect(exhibit?.title).toBe("Harbor wayfinding study");
      expect(navigatedTo).toEqual([`/exhibit?id=${exhibit?.id}`]);
      await expect(repository.listArtifacts(exhibit!.id)).resolves.toEqual([
        expect.objectContaining({ kind: "link", label: "Reference sketch", url: "https://example.com/sketch" }),
        expect.objectContaining({ kind: "note", label: "A small reminder", note: "The queue needed calmer handoffs." }),
      ]);
    });
  });

  it("previews a supported local file, makes it downloadable, and saves it with the Exhibit", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-capture-file");
    const navigatedTo: string[] = [];
    const image = createLocalFile("map image", "harbor-map.png", "image/png");

    render(<ExhibitCapture onNavigate={(href) => navigatedTo.push(href)} repository={repository} />);
    await completeIdentity(user);
    await user.upload(screen.getByLabelText(/Choose an image, PDF, or audio file/), image);

    expect(screen.getByRole("img", { name: "Preview of harbor-map.png" })).toHaveAttribute("src", "blob:artifact-preview");
    expect(screen.getByRole("link", { name: "Download harbor-map.png" })).toHaveAttribute("download", "harbor-map.png");
    expect(createObjectUrl).toHaveBeenCalledWith(expect.objectContaining({ size: image.size, type: "image/png" }));

    await user.click(screen.getByRole("button", { name: "Continue to story" }));
    await user.type(screen.getByRole("textbox", { name: "Museum label" }), "A route worth returning to");
    await user.click(screen.getByRole("button", { name: "Save Exhibit" }));

    await waitFor(async () => {
      const [exhibit] = await repository.listExhibits();
      expect(navigatedTo).toEqual([`/exhibit?id=${exhibit?.id}`]);
    });
  });

  it("removes an unsaved file and releases its object URL", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-capture-file-remove");
    const image = createLocalFile("map image", "harbor-map.png", "image/png");

    render(<ExhibitCapture repository={repository} />);
    await completeIdentity(user);
    await user.upload(screen.getByLabelText(/Choose an image, PDF, or audio file/), image);
    await user.click(screen.getByRole("button", { name: "Remove harbor-map.png" }));

    expect(screen.queryByRole("img", { name: "Preview of harbor-map.png" })).not.toBeInTheDocument();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:artifact-preview");
  });

  it("uses the total pending file bytes for quota warnings and refreshes after removal", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-capture-quota");
    const estimate = vi.fn().mockResolvedValue({ quota: 1_000, usage: 600 });
    Object.defineProperty(navigator, "storage", { configurable: true, value: { estimate } });
    const firstImage = createLocalFile(new Uint8Array(100), "first.png", "image/png");
    const secondImage = createLocalFile(new Uint8Array(150), "second.png", "image/png");

    render(<ExhibitCapture repository={repository} />);
    await completeIdentity(user);
    const input = screen.getByLabelText(/Choose an image, PDF, or audio file/);
    await user.upload(input, firstImage);
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    await user.upload(input, secondImage);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Your collection is approaching this browser's local storage limit.",
    );

    await user.click(screen.getByRole("button", { name: "Remove second.png" }));

    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    expect(estimate).toHaveBeenCalledTimes(3);
  });

  it("saves a valid Exhibit with its creation history and navigates to its record", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-capture-save");
    const navigatedTo: string[] = [];

    render(<ExhibitCapture onNavigate={(href) => navigatedTo.push(href)} repository={repository} />);
    await completeIdentity(user);
    await user.click(screen.getByRole("button", { name: "Continue to story" }));

    await user.click(screen.getByRole("button", { name: "Save Exhibit" }));
    expect(screen.getByText("Add a museum label before saving.")).toBeVisible();

    await user.type(screen.getByRole("textbox", { name: "Museum label" }), "A quieter route through the harbor");
    await user.click(screen.getByRole("button", { name: "Save Exhibit" }));

    await waitFor(async () => {
      const [exhibit] = await repository.listExhibits();
      expect(navigatedTo).toEqual([`/exhibit?id=${exhibit?.id}`]);
      await expect(repository.getHistory(exhibit!.id)).resolves.toEqual([
        expect.objectContaining({ type: "created", summary: "Created Exhibit." }),
      ]);
    });
  });

  it("offers a keyboard-reachable, narrow-safe form and protects cancellation", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-capture-cancel");
    const navigatedTo: string[] = [];
    const { container } = render(<ExhibitCapture onNavigate={(href) => navigatedTo.push(href)} repository={repository} />);

    expect(container.querySelector(".exhibit-capture")).toBeInTheDocument();
    expect(container.querySelector(".exhibit-capture__step-panel")).toBeInTheDocument();

    expect(screen.getByRole("textbox", { name: "Working title" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("combobox", { name: "Exhibit type" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Cancel capture" }));
    expect(screen.getByRole("dialog", { name: "Leave this Exhibit?" })).toBeVisible();
    expect(navigatedTo).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Keep capturing" }));
    expect(screen.queryByRole("dialog", { name: "Leave this Exhibit?" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel capture" }));
    await user.click(screen.getByRole("button", { name: "Leave without saving" }));
    expect(navigatedTo).toEqual(["/museum"]);
  });
});
