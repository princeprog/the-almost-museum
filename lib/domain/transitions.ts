import { normalizeId, normalizeIds, normalizeTimestamp } from "./normalization";
import type { ClosureAction, ClosureTransitionCommand, Exhibit, ExhibitStatus, MuseumRoom } from "./types";

const roomMembership: Record<ExhibitStatus, MuseumRoom[]> = {
  unfinished: ["workshop"],
  active: ["workshop"],
  revived: ["workshop", "hall-of-second-chances"],
  archived: ["archive"],
  completed: ["archive"],
  transformed: ["hall-of-second-chances"],
  released: ["archive"],
};

const eligibleActions: Record<ExhibitStatus, ClosureAction[]> = {
  unfinished: ["archive", "complete", "transform", "release"],
  active: ["archive", "complete", "transform", "release"],
  revived: ["archive", "complete", "transform", "release"],
  archived: ["revive", "release"],
  completed: ["revive", "release"],
  transformed: ["revive", "release"],
  released: ["revive"],
};

const actionStatus: Record<ClosureAction, ExhibitStatus> = {
  revive: "revived",
  archive: "archived",
  complete: "completed",
  transform: "transformed",
  release: "released",
};

export function getExhibitRooms(exhibit: Pick<Exhibit, "status">): MuseumRoom[] {
  return [...roomMembership[exhibit.status]];
}

export function canApplyClosureAction(
  exhibit: Pick<Exhibit, "status">,
  action: ClosureAction,
): boolean {
  return eligibleActions[exhibit.status].includes(action);
}

export function applyClosureAction(exhibit: Exhibit, command: ClosureTransitionCommand): Exhibit {
  if (!canApplyClosureAction(exhibit, command.action)) {
    throw new Error(`Cannot apply "${command.action}" to an Exhibit with status "${exhibit.status}"`);
  }

  if (command.action === "release" && command.confirmed !== true) {
    throw new Error("Release requires confirmation");
  }

  if (command.action === "transform" && !command.relatedExhibitId?.trim()) {
    throw new Error("Transform requires a related Exhibit ID");
  }

  const occurredAt = normalizeTimestamp(command.occurredAt);
  const relatedExhibitIds = command.action === "transform"
    ? normalizeIds([...exhibit.relatedExhibitIds, normalizeId(command.relatedExhibitId!)])
    : [...exhibit.relatedExhibitIds];

  return {
    ...exhibit,
    tags: [...exhibit.tags],
    relatedExhibitIds,
    status: actionStatus[command.action],
    updatedAt: occurredAt,
    closedAt: command.action === "revive" ? null : occurredAt,
  };
}
