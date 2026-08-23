import Dexie from "dexie";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MuseumGallery } from "@/components/museum-gallery";
import { ExhibitRepository } from "@/lib/persistence";

const databaseNames = new Set<string>();
const repositories = new Set<ExhibitRepository>();

function createRepository(name: string): ExhibitRepository {
  databaseNames.add(name);
  const repository = new ExhibitRepository({
    databaseName: name,
    createId: (() => {
      let index = 0;
      return () => `gallery-${++index}`;
    })(),
    now: () => new Date("2026-08-23T04:00:00.000Z"),
  });
  repositories.add(repository);
  return repository;
}

async function seedCollection(repository: ExhibitRepository) {
  await repository.createExhibit({
    title: "Harbor Queue Redesign",
    type: "project",
    status: "unfinished",
    museumLabel: "A quieter route through the harbor",
    tags: ["Harbor", "Service Design"],
  });
  await repository.createExhibit({
    title: "Unsent field notes",
    type: "message",
    status: "revived",
    museumLabel: "A letter worth returning to",
    tags: ["Writing", "Harbor"],
  });
  await repository.createExhibit({
    title: "Old wayfinding map",
    type: "draft",
    status: "archived",
    museumLabel: "A map that made room for another route",
    tags: ["Mapping"],
  });
}

afterEach(async () => {
  localStorage.clear();
  for (const repository of repositories) repository.close();
  repositories.clear();
  for (const name of databaseNames) await Dexie.delete(name);
  databaseNames.clear();
});

describe("MuseumGallery", () => {
  it("shows Lobby cards and narrows them through room, tag, and text filters", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-gallery-filters");
    await seedCollection(repository);

    render(<MuseumGallery repository={repository} />);

    expect(await screen.findByRole("heading", { name: "Lobby" })).toBeVisible();
    expect(screen.getByRole("status", { name: "Gallery result count" })).toHaveTextContent("3 exhibits");
    expect(screen.getByRole("link", { name: /Harbor Queue Redesign/ })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Archive" }));
    expect(screen.getByRole("status", { name: "Gallery result count" })).toHaveTextContent("1 exhibit");
    expect(screen.getByRole("link", { name: /Old wayfinding map/ })).toBeVisible();
    expect(screen.queryByRole("link", { name: /Harbor Queue Redesign/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Lobby" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Tag" }), "Harbor");
    await user.type(screen.getByRole("searchbox", { name: "Search collection" }), "letter");
    expect(screen.getByRole("link", { name: /Unsent field notes/ })).toBeVisible();
    expect(screen.queryByRole("link", { name: /Harbor Queue Redesign/ })).not.toBeInTheDocument();
  });

  it("explains an empty filtered view and restores the collection when filters are cleared", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-gallery-empty");
    await seedCollection(repository);

    render(<MuseumGallery repository={repository} />);
    await screen.findByRole("heading", { name: "Lobby" });
    await user.type(screen.getByRole("searchbox", { name: "Search collection" }), "does not exist");

    expect(screen.getByRole("heading", { name: "Nothing is hidden here." })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("status", { name: "Gallery result count" })).toHaveTextContent("3 exhibits");
  });

  it("persists the selected gallery view and sort preference", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-gallery-preferences");
    await seedCollection(repository);
    const firstRender = render(<MuseumGallery repository={repository} />);

    await screen.findByRole("heading", { name: "Lobby" });
    await user.click(screen.getByRole("button", { name: "Show list view" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Sort collection" }), "title-asc");
    firstRender.unmount();

    render(<MuseumGallery repository={repository} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Show grid view" })).toBeVisible());
    expect(screen.getByRole("combobox", { name: "Sort collection" })).toHaveValue("title-asc");
    expect(screen.getByRole("list", { name: "Exhibits" })).toHaveClass("museum-gallery__cards--list");
  });

  it("explains a failed local read and lets a visitor retry the collection", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-gallery-retry");
    await seedCollection(repository);
    const listExhibits = repository.listExhibits.bind(repository);
    vi.spyOn(repository, "listExhibits")
      .mockRejectedValueOnce(new Error("IndexedDB temporarily unavailable"))
      .mockImplementation(listExhibits);

    render(<MuseumGallery repository={repository} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Your collection could not be opened.");
    await user.click(screen.getByRole("button", { name: "Try opening collection again" }));

    expect(await screen.findByRole("heading", { name: "Lobby" })).toBeVisible();
  });
});
