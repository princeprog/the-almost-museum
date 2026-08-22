export type ExhibitType = "project" | "draft" | "idea" | "experiment" | "message";

export type ExhibitStatus =
  | "unfinished"
  | "active"
  | "revived"
  | "archived"
  | "completed"
  | "transformed"
  | "released";

export type ArtifactKind = "image" | "pdf" | "audio" | "link" | "note";

export type ClosureAction = "revive" | "archive" | "complete" | "transform" | "release";

export type HistoryEventType =
  | "created"
  | "edited"
  | "artifact-added"
  | "artifact-removed"
  | "status-changed"
  | "transformed";

export type MuseumRoom = "workshop" | "archive" | "hall-of-second-chances";

export interface Exhibit {
  id: string;
  title: string;
  type: ExhibitType;
  status: ExhibitStatus;
  museumLabel: string;
  whyStarted?: string;
  whyStopped?: string;
  whatItTaughtMe?: string;
  tags: string[];
  relatedExhibitIds: string[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface Artifact {
  id: string;
  exhibitId: string;
  kind: ArtifactKind;
  label: string;
  createdAt: string;
  fileName?: string;
  mimeType?: string;
  byteSize?: number;
  blob?: Blob;
  url?: string;
  note?: string;
}

export interface HistoryEvent {
  id: string;
  exhibitId: string;
  type: HistoryEventType;
  occurredAt: string;
  summary: string;
  details: Record<string, unknown>;
}

export interface ClosureTransitionCommand {
  action: ClosureAction;
  occurredAt: string | Date;
  confirmed?: boolean;
  relatedExhibitId?: string;
}

export interface HistoryEventInput {
  id: string;
  exhibitId: string;
  type: HistoryEventType;
  occurredAt: string | Date;
  summary: string;
  details?: Record<string, unknown>;
}
