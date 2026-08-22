import type { Exhibit, CreateExhibitInput } from "@/lib/domain";

export const HARBOR_QUEUE_DEMO_TITLE = "The Harbor Queue Redesign";

const harborQueueDemoInput: CreateExhibitInput = {
  title: HARBOR_QUEUE_DEMO_TITLE,
  type: "project",
  status: "unfinished",
  museumLabel: "A calmer way to make waiting feel organized",
  whyStarted: "Operators needed calmer handoffs while people, vehicles, and cargo waited together.",
  whyStopped: "The redesign paused before the queue could become a shared, working rhythm.",
  whatItTaughtMe: "Clear moments of waiting can make coordination feel calmer without pretending the wait is gone.",
  tags: ["Product Design", "Queue Design", "Service Design", "Harbor"],
};

export interface ExhibitRepositoryForDemoInstallation {
  createExhibit(input: CreateExhibitInput): Promise<Exhibit>;
  listExhibits(): Promise<Exhibit[]>;
}

export interface HarborQueueDemoInstallation {
  exhibit: Exhibit;
  installed: boolean;
}

/**
 * Installs the example only after an explicit user action. The title is the
 * stable demo identity so repeated requests do not add another Exhibit.
 */
export async function installHarborQueueDemo(
  repository: ExhibitRepositoryForDemoInstallation,
): Promise<HarborQueueDemoInstallation> {
  const existing = (await repository.listExhibits()).find(
    (exhibit) => exhibit.title === HARBOR_QUEUE_DEMO_TITLE,
  );

  if (existing !== undefined) {
    return { exhibit: existing, installed: false };
  }

  return { exhibit: await repository.createExhibit(harborQueueDemoInput), installed: true };
}
