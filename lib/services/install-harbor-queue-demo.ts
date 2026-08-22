import type { CreateExhibitInput } from "@/lib/domain";
import type { ExhibitInstallation } from "@/lib/persistence";

export const HARBOR_QUEUE_DEMO_ID = "demo-harbor-queue-redesign-v1";
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
  installExhibitOnce(exhibitId: string, input: CreateExhibitInput): Promise<ExhibitInstallation>;
}

export type HarborQueueDemoInstallation = ExhibitInstallation;

/**
 * Installs the example only after an explicit user action. The repository owns
 * the stable identifier and transaction, so concurrent requests create one record.
 */
export async function installHarborQueueDemo(
  repository: ExhibitRepositoryForDemoInstallation,
): Promise<HarborQueueDemoInstallation> {
  return repository.installExhibitOnce(HARBOR_QUEUE_DEMO_ID, harborQueueDemoInput);
}
