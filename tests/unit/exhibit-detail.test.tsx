import Dexie from "dexie";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ExhibitDetail } from "@/components/exhibit-detail";
import type { Exhibit } from "@/lib/domain";
import { ExhibitRepository } from "@/lib/persistence";

const databaseNames = new Set<string>();
const repositories = new Set<ExhibitRepository>();

function createRepository(name: string): ExhibitRepository {
  databaseNames.add(name);
  let id = 0;
  const repository = new ExhibitRepository({
    databaseName: name,
    createId: () => `detail-${++id}`,
    now: () => new Date("2026-08-23T05:00:00.000Z"),
  });
  repositories.add(repository);
  return repository;
}

async function createExhibit(repository: ExhibitRepository) {
  return repository.captureExhibit({
    title: "Harbor Queue",
    type: "project",
    status: "active",
    museumLabel: "A quieter route through the harbor",
    whyStarted: "The waiting room needed care.",
    tags: ["Harbor"],
  }, [
    { kind: "link", label: "Reference sketch", url: "https://example.com/sketch" },
    { kind: "note", label: "Field note", note: "Keep the handoff calm." },
  ]);
}

function deferred<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve: (value: T) => resolve(value) };
}

afterEach(async () => {
  window.history.replaceState({}, "", "/");
  for (const repository of repositories) repository.close();
  repositories.clear();
  for (const name of databaseNames) await Dexie.delete(name);
  databaseNames.clear();
});

describe("ExhibitDetail", () => {
  it("explains when the query does not name an Exhibit", async () => {
    render(<ExhibitDetail repository={createRepository("almost-museum-detail-missing-query")} search="" />);

    expect(await screen.findByRole("heading", { name: "Choose an Exhibit" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Return to the Museum" })).toHaveAttribute("href", "/museum");
  });

  it("explains when the requested Exhibit is unavailable", async () => {
    render(<ExhibitDetail repository={createRepository("almost-museum-detail-missing-record")} search="?id=missing" />);

    expect(await screen.findByRole("heading", { name: "That Exhibit is not here" })).toBeVisible();
  });

  it("announces attachment validation errors as errors instead of passive status", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-detail-attachment-validation");
    const exhibit = await createExhibit(repository);

    render(<ExhibitDetail repository={repository} search={`?id=${exhibit.id}`} />);
    await screen.findByRole("heading", { name: "Harbor Queue" });
    await user.click(screen.getByRole("button", { name: "Add link" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Add a label and a complete link address before saving the link.");
  });

  it("distinguishes a loading failure from a missing Exhibit and retries without changing the record", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-detail-retry");
    const exhibit = await createExhibit(repository);
    const getExhibit = repository.getExhibit.bind(repository);
    vi.spyOn(repository, "getExhibit")
      .mockRejectedValueOnce(new Error("IndexedDB temporarily unavailable"))
      .mockImplementation(getExhibit);

    render(<ExhibitDetail repository={repository} search={`?id=${exhibit.id}`} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("This Exhibit could not be opened.");
    expect(screen.queryByRole("heading", { name: "That Exhibit is not here" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try opening this Exhibit again" }));

    expect(await screen.findByRole("heading", { name: "Harbor Queue" })).toBeVisible();
  });

  it("refreshes the query Exhibit after same-page history navigation", async () => {
    const repository = createRepository("almost-museum-detail-navigation");
    const first = await createExhibit(repository);
    const second = await repository.createExhibit({
      title: "Unsent field notes",
      type: "message",
      status: "unfinished",
      museumLabel: "A letter worth returning to",
    });
    window.history.replaceState({}, "", `/exhibit?id=${first.id}`);

    render(<ExhibitDetail repository={repository} />);
    expect(await screen.findByRole("heading", { name: "Harbor Queue" })).toBeVisible();

    await act(async () => {
      window.history.replaceState({}, "", `/exhibit?id=${second.id}`);
    });
    expect(await screen.findByRole("heading", { name: "Unsent field notes" })).toBeVisible();

    await act(async () => {
      window.history.replaceState({}, "", "/exhibit");
    });
    expect(await screen.findByRole("heading", { name: "Choose an Exhibit" })).toBeVisible();

    await act(async () => {
      window.history.pushState({}, "", "/exhibit?id=missing");
    });
    expect(await screen.findByRole("heading", { name: "That Exhibit is not here" })).toBeVisible();
  });

  it("refreshes the query Exhibit after a popstate event", async () => {
    const repository = createRepository("almost-museum-detail-popstate");
    const first = await createExhibit(repository);
    const second = await repository.createExhibit({
      title: "Second route",
      type: "idea",
      status: "unfinished",
      museumLabel: "The next place to visit",
    });
    const nativePushState = window.history.pushState;
    window.history.replaceState({}, "", `/exhibit?id=${first.id}`);

    render(<ExhibitDetail repository={repository} />);
    expect(await screen.findByRole("heading", { name: "Harbor Queue" })).toBeVisible();

    await act(async () => {
      nativePushState.call(window.history, {}, "", `/exhibit?id=${second.id}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(await screen.findByRole("heading", { name: "Second route" })).toBeVisible();
  });

  it("restores native history methods after its browser-query listener unmounts", async () => {
    const repository = createRepository("almost-museum-detail-unmount");
    const exhibit = await createExhibit(repository);
    const nativePushState = window.history.pushState;
    window.history.replaceState({}, "", `/exhibit?id=${exhibit.id}`);

    const detail = render(<ExhibitDetail repository={repository} />);
    await screen.findByRole("heading", { name: "Harbor Queue" });
    expect(window.history.pushState).not.toBe(nativePushState);

    detail.unmount();
    expect(window.history.pushState).toBe(nativePushState);
  });

  it("clears unsaved attachment drafts after navigating through a no-ID state", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-detail-draft-reset");
    const first = await createExhibit(repository);
    const second = await repository.createExhibit({
      title: "Second route",
      type: "idea",
      status: "unfinished",
      museumLabel: "The next place to visit",
    });
    window.history.replaceState({}, "", `/exhibit?id=${first.id}`);

    render(<ExhibitDetail repository={repository} />);
    await screen.findByRole("heading", { name: "Harbor Queue" });
    await user.type(screen.getByRole("textbox", { name: "Link label" }), "Unfinished reference");
    await user.type(screen.getByRole("textbox", { name: "Link address" }), "https://example.com/draft");
    await user.type(screen.getByRole("textbox", { name: "Note label" }), "Unfinished note");
    await user.type(screen.getByRole("textbox", { name: "Note" }), "This must not follow the next Exhibit.");

    await act(async () => {
      window.history.replaceState({}, "", "/exhibit");
    });
    expect(await screen.findByRole("heading", { name: "Choose an Exhibit" })).toBeVisible();

    await act(async () => {
      window.history.pushState({}, "", `/exhibit?id=${second.id}`);
    });
    expect(await screen.findByRole("heading", { name: "Second route" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Link label" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Link address" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Note label" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Note" })).toHaveValue("");
  });

  it("keeps the newest Exhibit when an older query load resolves afterwards", async () => {
    const firstLoad = deferred<Exhibit | undefined>();
    const secondLoad = deferred<Exhibit | undefined>();
    const first: Exhibit = {
      id: "first-exhibit",
      title: "First route",
      type: "idea",
      status: "unfinished",
      museumLabel: "The first place",
      tags: [],
      relatedExhibitIds: [],
      createdAt: "2026-08-23T05:00:00.000Z",
      updatedAt: "2026-08-23T05:00:00.000Z",
      closedAt: null,
    };
    const second: Exhibit = { ...first, id: "second-exhibit", title: "Second route", museumLabel: "The newest place" };
    const requestedIds: string[] = [];
    const repository = {
      getExhibit: (id: string) => {
        requestedIds.push(id);
        return id === first.id ? firstLoad.promise : secondLoad.promise;
      },
      listArtifacts: async () => [],
      getHistory: async () => [],
    } as unknown as ExhibitRepository;

    const detail = render(<ExhibitDetail repository={repository} search={`?id=${first.id}`} />);
    await waitFor(() => expect(requestedIds).toEqual([first.id]));
    detail.rerender(<ExhibitDetail repository={repository} search={`?id=${second.id}`} />);
    await waitFor(() => expect(requestedIds).toEqual([first.id, second.id]));
    secondLoad.resolve(second);
    expect(await screen.findByRole("heading", { name: "Second route" })).toBeVisible();

    await act(async () => {
      firstLoad.resolve(first);
      await Promise.resolve();
    });
    expect(screen.getByRole("heading", { name: "Second route" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "First route" })).not.toBeInTheDocument();
  });

  it("renders the story, rooms, and each artifact kind for the query Exhibit", async () => {
    const repository = createRepository("almost-museum-detail-render");
    const exhibit = await createExhibit(repository);
    const fileArtifact = {
      kind: "image",
      id: "preview-file",
      exhibitId: exhibit.id,
      label: "Queue sketch",
      fileName: "queue.png",
      mimeType: "image/png",
      byteSize: 4,
      blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/png" }),
      createdAt: "2026-08-23T05:00:00.000Z",
    } as const;
    const writtenArtifacts = await repository.listArtifacts(exhibit.id);
    const previewRepository = {
      getExhibit: (id: string) => repository.getExhibit(id),
      listArtifacts: async () => [...writtenArtifacts, fileArtifact],
      getHistory: (id: string) => repository.getHistory(id),
    } as unknown as ExhibitRepository;

    render(<ExhibitDetail repository={previewRepository} search={`?id=${exhibit.id}`} />);

    expect(await screen.findByRole("heading", { name: "Harbor Queue" })).toBeVisible();
    expect(screen.getByText("Workshop")).toBeVisible();
    expect(screen.getByText("The waiting room needed care.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Reference sketch" })).toHaveAttribute("href", "https://example.com/sketch");
    expect(screen.getByText("Keep the handoff calm.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Queue sketch" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Remove Queue sketch" })).toBeVisible();
  });

  it("loads the append-only Exhibit record through the repository timeline", async () => {
    const repository = createRepository("almost-museum-detail-timeline");
    const exhibit = await createExhibit(repository);
    await repository.updateExhibit(exhibit.id, { museumLabel: "A revised harbor route" });
    await repository.addArtifact(exhibit.id, { kind: "link", label: "Afterword", url: "https://example.com/afterword" });
    await repository.transitionExhibit(exhibit.id, {
      action: "archive",
      occurredAt: "2026-08-23T06:00:00.000Z",
    });

    render(<ExhibitDetail repository={repository} search={`?id=${exhibit.id}`} />);

    expect(await screen.findByText("This Exhibit was archived.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "The Almost timeline" })).toBeVisible();
    expect(screen.getByText("This Exhibit entered the collection as an active Project.")).toBeVisible();
    expect(screen.getByText("Catalog details were revised: Museum label.")).toBeVisible();
    expect(screen.getAllByText("A link artifact was added to the collection.")).toHaveLength(2);
  });

  it("updates Exhibit fields and manages written attachments through the repository", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-detail-edit");
    const exhibit = await createExhibit(repository);

    render(<ExhibitDetail repository={repository} search={`?id=${exhibit.id}`} />);
    await screen.findByRole("heading", { name: "Harbor Queue" });

    await user.click(screen.getByRole("button", { name: "Edit Exhibit" }));
    await user.clear(screen.getByRole("textbox", { name: "Working title" }));
    await user.type(screen.getByRole("textbox", { name: "Working title" }), "Harbor Queue, revised");
    await user.clear(screen.getByRole("textbox", { name: "Tags" }));
    await user.type(screen.getByRole("textbox", { name: "Tags" }), "Harbor, Research");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => expect((await repository.getExhibit(exhibit.id))?.title).toBe("Harbor Queue, revised"));
    expect(screen.getByRole("status")).toHaveTextContent("Exhibit details saved.");

    await user.type(screen.getByRole("textbox", { name: "Link label" }), "Prototype");
    await user.type(screen.getByRole("textbox", { name: "Link address" }), "https://example.com/prototype");
    await user.click(screen.getByRole("button", { name: "Add link" }));
    expect(await screen.findByRole("link", { name: "Prototype" })).toHaveAttribute("href", "https://example.com/prototype");

    const originalArtifact = (await repository.listArtifacts(exhibit.id)).find((artifact) => artifact.label === "Field note");
    expect(originalArtifact).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Remove Field note" }));
    await waitFor(async () => expect(await repository.listArtifacts(exhibit.id)).not.toContainEqual(expect.objectContaining({ id: originalArtifact?.id })));
    expect(screen.queryByText("Keep the handoff calm.")).not.toBeInTheDocument();
  });

  it("offers only eligible closure ceremonies and refreshes the Exhibit and timeline after confirmation", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-detail-closure");
    const exhibit = await createExhibit(repository);

    render(<ExhibitDetail repository={repository} search={`?id=${exhibit.id}`} />);
    await screen.findByRole("heading", { name: "Harbor Queue" });

    expect(screen.queryByRole("button", { name: "Revive" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move to Archive" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Complete" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Transform" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Release" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Move to Archive" }));
    expect(screen.getByRole("dialog", { name: "Move to Archive?" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Archive Exhibit" }));

    await waitFor(async () => expect((await repository.getExhibit(exhibit.id))?.status).toBe("archived"));
    expect(screen.getByRole("button", { name: "Revive" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Move to Archive" })).not.toBeInTheDocument();
    expect(await screen.findByText("This Exhibit was archived.")).toBeVisible();
  });

  it("transforms into a new Exhibit with reciprocal links and a refreshed source timeline", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-detail-transform-new");
    const exhibit = await createExhibit(repository);

    render(<ExhibitDetail repository={repository} search={`?id=${exhibit.id}`} />);
    await screen.findByRole("heading", { name: "Harbor Queue" });

    await user.click(screen.getByRole("button", { name: "Transform" }));
    expect(screen.getByRole("dialog", { name: "Transform this Exhibit?" })).toBeVisible();
    await user.click(screen.getByRole("radio", { name: "Create a new Exhibit" }));
    await user.type(screen.getByRole("textbox", { name: "New Exhibit title" }), "Harbor Queue, rebuilt");
    await user.type(screen.getByRole("textbox", { name: "New Exhibit label" }), "The route ready for another try");
    await user.click(screen.getByRole("button", { name: "Transform Exhibit" }));

    await waitFor(async () => expect((await repository.getExhibit(exhibit.id))?.status).toBe("transformed"));
    const relatedId = (await repository.getExhibit(exhibit.id))?.relatedExhibitIds[0];
    expect(relatedId).toBeDefined();
    await expect(repository.getExhibit(relatedId!)).resolves.toMatchObject({
      title: "Harbor Queue, rebuilt",
      relatedExhibitIds: [exhibit.id],
    });
    expect(await screen.findByText("This Exhibit was transformed into a related Exhibit.")).toBeVisible();
  });

  it("requires an explicit acknowledgement before Release can be recorded", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-detail-release");
    const exhibit = await createExhibit(repository);

    render(<ExhibitDetail repository={repository} search={`?id=${exhibit.id}`} />);
    await screen.findByRole("heading", { name: "Harbor Queue" });

    await user.click(screen.getByRole("button", { name: "Release" }));
    expect(screen.getByRole("dialog", { name: "Release this Exhibit?" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Release Exhibit" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "I understand this Exhibit will be released from the active collection." }));
    await user.click(screen.getByRole("button", { name: "Release Exhibit" }));

    await waitFor(async () => expect((await repository.getExhibit(exhibit.id))?.status).toBe("released"));
    expect(await screen.findByText("This Exhibit was released.")).toBeVisible();
  });
});
