import Dexie from "dexie";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { MuseumOnboarding } from "@/components/museum-onboarding";
import { ExhibitRepository } from "@/lib/persistence";
import { HARBOR_QUEUE_DEMO_TITLE } from "@/lib/services/install-harbor-queue-demo";

const databaseNames = new Set<string>();
const repositories = new Set<ExhibitRepository>();

function createRepository(name: string): ExhibitRepository {
  databaseNames.add(name);
  const repository = new ExhibitRepository({
    databaseName: name,
    createId: (() => {
      let index = 0;
      return () => `history-${++index}`;
    })(),
    now: () => new Date("2026-08-23T02:00:00.000Z"),
  });
  repositories.add(repository);
  return repository;
}

afterEach(async () => {
  for (const repository of repositories) repository.close();
  repositories.clear();
  for (const name of databaseNames) await Dexie.delete(name);
  databaseNames.clear();
});

describe("MuseumOnboarding", () => {
  it("renders an empty collection without seeding, then installs the demo after its explicit action", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-client-onboarding");

    render(<MuseumOnboarding repository={repository} />);

    expect(await screen.findByRole("button", { name: "Install Harbor Queue demo" })).toBeVisible();
    await expect(repository.listExhibits()).resolves.toEqual([]);

    await user.click(screen.getByRole("button", { name: "Install Harbor Queue demo" }));

    await waitFor(() => {
      expect(screen.getByText(HARBOR_QUEUE_DEMO_TITLE)).toBeVisible();
    });
    await expect(repository.listExhibits()).resolves.toHaveLength(1);
  });
});
