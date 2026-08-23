// @vitest-environment node

import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { ExhibitRepository } from "@/lib/persistence";
import {
  HARBOR_QUEUE_DEMO_ID,
  HARBOR_QUEUE_DEMO_TITLE,
  installHarborQueueDemo,
} from "@/lib/services/install-harbor-queue-demo";

const databaseNames = new Set<string>();
const repositories = new Set<ExhibitRepository>();

function createRepository(name: string, ids: string[]): ExhibitRepository {
  databaseNames.add(name);
  let idIndex = 0;
  const repository = new ExhibitRepository({
    databaseName: name,
    createId: () => ids[idIndex++] ?? `generated-${idIndex}`,
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

describe("Harbor Queue demo installation", () => {
  it("leaves a new repository empty until installation is explicitly requested", async () => {
    const repository = createRepository("almost-museum-onboarding-empty", []);

    await expect(repository.getSnapshot()).resolves.toEqual({ exhibits: [], artifacts: [], history: [] });
  });

  it("installs the approved unfinished project through the repository", async () => {
    const repository = createRepository("almost-museum-onboarding-install", ["history-created"]);

    const result = await installHarborQueueDemo(repository);

    expect(result.installed).toBe(true);
    expect(result.exhibit).toMatchObject({
      id: HARBOR_QUEUE_DEMO_ID,
      title: HARBOR_QUEUE_DEMO_TITLE,
      type: "project",
      status: "unfinished",
      museumLabel: "A calmer way to make waiting feel organized",
      whyStarted: "Operators needed calmer handoffs while people, vehicles, and cargo waited together.",
      whyStopped: "The redesign paused before the queue could become a shared, working rhythm.",
      whatItTaughtMe: "Clear moments of waiting can make coordination feel calmer without pretending the wait is gone.",
      tags: ["Product Design", "Queue Design", "Service Design", "Harbor"],
    });
    await expect(repository.getHistory(HARBOR_QUEUE_DEMO_ID)).resolves.toEqual([
      expect.objectContaining({ type: "created" }),
    ]);
  });

  it("returns the existing demo without creating duplicate records on repeat installation", async () => {
    const repository = createRepository("almost-museum-onboarding-repeat", ["history-created"]);

    const first = await installHarborQueueDemo(repository);
    const second = await installHarborQueueDemo(repository);

    expect(first.installed).toBe(true);
    expect(second).toEqual({ exhibit: first.exhibit, installed: false });
    await expect(repository.getSnapshot()).resolves.toMatchObject({
      exhibits: [first.exhibit],
      history: [expect.objectContaining({ exhibitId: first.exhibit.id, type: "created" })],
    });
  });

  it("creates one demo record when installation is requested concurrently", async () => {
    const repository = createRepository("almost-museum-onboarding-concurrent", ["history-created"]);

    const results = await Promise.all([
      installHarborQueueDemo(repository),
      installHarborQueueDemo(repository),
    ]);

    expect(results.map((result) => result.installed).sort()).toEqual([false, true]);
    await expect(repository.getSnapshot()).resolves.toMatchObject({
      exhibits: [expect.objectContaining({ id: HARBOR_QUEUE_DEMO_ID })],
      history: [expect.objectContaining({ exhibitId: HARBOR_QUEUE_DEMO_ID, type: "created" })],
    });
  });
});
