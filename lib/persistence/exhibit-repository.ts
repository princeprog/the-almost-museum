import Dexie, { type Table } from "dexie";

import { getFileArtifactValidationError } from "@/lib/artifacts/file-validation";
import {
  applyClosureAction,
  artifactSchema,
  createExhibitInputSchema,
  createHistoryEvent,
  exhibitSchema,
  historyEventSchema,
  normalizeId,
  normalizeIds,
  normalizeTimestamp,
  statusTransitionSchema,
  updateExhibitInputSchema,
  type Artifact,
  type ClosureTransitionCommand,
  type CreateExhibitInput,
  type Exhibit,
  type HistoryEvent,
  type UpdateExhibitInput,
} from "@/lib/domain";

class AlmostMuseumDatabase extends Dexie {
  exhibits!: Table<Exhibit, string>;
  artifacts!: Table<Artifact, string>;
  history!: Table<HistoryEvent, string>;

  constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores({
      exhibits: "id, status, type, createdAt, updatedAt, *tags, *relatedExhibitIds",
      artifacts: "id, exhibitId, kind, createdAt",
      history: "id, exhibitId, occurredAt, [exhibitId+occurredAt], type",
    });
  }
}

export interface ExhibitRepositoryOptions {
  databaseName?: string;
  createId?: () => string;
  now?: () => Date;
}

export type CreateTransformedExhibitInput = Omit<CreateExhibitInput, "status" | "relatedExhibitIds">;

export interface FileArtifactInput {
  kind: "image" | "pdf" | "audio";
  label: string;
  fileName?: string;
  mimeType?: string;
  byteSize?: number;
  blob?: Blob;
}

export interface LinkArtifactInput {
  kind: "link";
  label: string;
  url: string;
}

export interface NoteArtifactInput {
  kind: "note";
  label: string;
  note: string;
}

export type AddArtifactInput = FileArtifactInput | LinkArtifactInput | NoteArtifactInput;
export type CaptureArtifactInput = AddArtifactInput;

export interface MuseumSnapshot {
  exhibits: Exhibit[];
  artifacts: Artifact[];
  history: HistoryEvent[];
}

export interface ExhibitInstallation {
  exhibit: Exhibit;
  installed: boolean;
}

export class ExhibitNotFoundError extends Error {
  constructor(exhibitId: string) {
    super(`Exhibit "${exhibitId}" was not found`);
    this.name = "ExhibitNotFoundError";
  }
}

export class ArtifactNotFoundError extends Error {
  constructor(artifactId: string) {
    super(`Artifact "${artifactId}" was not found`);
    this.name = "ArtifactNotFoundError";
  }
}

export class RelatedExhibitNotFoundError extends Error {
  constructor(exhibitId: string) {
    super(`Related Exhibit "${exhibitId}" was not found`);
    this.name = "RelatedExhibitNotFoundError";
  }
}

function defaultCreateId(): string {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new Error("Secure random IDs are unavailable in this environment");
  }

  return globalThis.crypto.randomUUID();
}

function assertFileArtifactWithinSizeLimit(input: AddArtifactInput): void {
  if (input.kind !== "image" && input.kind !== "pdf" && input.kind !== "audio") return;

  const validationError = getFileArtifactValidationError(input);
  if (validationError !== undefined) throw new Error(validationError);
}

export class ExhibitRepository {
  readonly #database: AlmostMuseumDatabase;
  readonly #createId: () => string;
  readonly #now: () => Date;

  constructor(options: ExhibitRepositoryOptions = {}) {
    this.#database = new AlmostMuseumDatabase(options.databaseName ?? "almost-museum");
    this.#createId = options.createId ?? defaultCreateId;
    this.#now = options.now ?? (() => new Date());
  }

  async createExhibit(input: CreateExhibitInput): Promise<Exhibit> {
    const normalizedInput = createExhibitInputSchema.parse(input);
    const occurredAt = normalizeTimestamp(this.#now());
    const exhibit = exhibitSchema.parse({
      ...normalizedInput,
      id: this.#createId(),
      createdAt: occurredAt,
      updatedAt: occurredAt,
      closedAt: normalizedInput.status === "archived"
        || normalizedInput.status === "completed"
        || normalizedInput.status === "transformed"
        || normalizedInput.status === "released"
        ? occurredAt
        : null,
    });
    const historyEvent = createHistoryEvent({
      id: this.#createId(),
      exhibitId: exhibit.id,
      type: "created",
      occurredAt,
      summary: "Created Exhibit.",
      details: { status: exhibit.status, type: exhibit.type },
    });

    await this.#database.transaction("rw", this.#database.exhibits, this.#database.history, async () => {
      await this.#database.exhibits.add(exhibit);
      await this.#database.history.add(historyEvent);
    });

    return exhibitSchema.parse(exhibit);
  }

  async captureExhibit(input: CreateExhibitInput, artifactInputs: CaptureArtifactInput[] = []): Promise<Exhibit> {
    const normalizedInput = createExhibitInputSchema.parse(input);
    artifactInputs.forEach(assertFileArtifactWithinSizeLimit);
    const occurredAt = normalizeTimestamp(this.#now());
    const exhibit = exhibitSchema.parse({
      ...normalizedInput,
      id: this.#createId(),
      createdAt: occurredAt,
      updatedAt: occurredAt,
      closedAt: normalizedInput.status === "archived"
        || normalizedInput.status === "completed"
        || normalizedInput.status === "transformed"
        || normalizedInput.status === "released"
        ? occurredAt
        : null,
    });
    const createdEvent = createHistoryEvent({
      id: this.#createId(),
      exhibitId: exhibit.id,
      type: "created",
      occurredAt,
      summary: "Created Exhibit.",
      details: { status: exhibit.status, type: exhibit.type },
    });
    const artifactEntries = artifactInputs.map((input) => {
      const artifact = artifactSchema.parse({
        ...input,
        id: this.#createId(),
        exhibitId: exhibit.id,
        createdAt: occurredAt,
      });
      const event = createHistoryEvent({
        id: this.#createId(),
        exhibitId: exhibit.id,
        type: "artifact-added",
        occurredAt,
        summary: "Added an artifact.",
        details: { artifactId: artifact.id, kind: artifact.kind },
      });

      return { artifact, event };
    });

    await this.#database.transaction(
      "rw",
      this.#database.exhibits,
      this.#database.artifacts,
      this.#database.history,
      async () => {
        await this.#database.exhibits.add(exhibit);
        await this.#database.artifacts.bulkAdd(artifactEntries.map(({ artifact }) => artifact));
        await this.#database.history.bulkAdd([createdEvent, ...artifactEntries.map(({ event }) => event)]);
      },
    );

    return exhibitSchema.parse(exhibit);
  }

  async installExhibitOnce(exhibitId: string, input: CreateExhibitInput): Promise<ExhibitInstallation> {
    const id = normalizeId(exhibitId);
    const normalizedInput = createExhibitInputSchema.parse(input);

    return this.#database.transaction("rw", this.#database.exhibits, this.#database.history, async () => {
      const existing = await this.#database.exhibits.get(id);
      if (existing !== undefined) {
        return { exhibit: exhibitSchema.parse(existing), installed: false };
      }

      const occurredAt = normalizeTimestamp(this.#now());
      const exhibit = exhibitSchema.parse({
        ...normalizedInput,
        id,
        createdAt: occurredAt,
        updatedAt: occurredAt,
        closedAt: normalizedInput.status === "archived"
          || normalizedInput.status === "completed"
          || normalizedInput.status === "transformed"
          || normalizedInput.status === "released"
          ? occurredAt
          : null,
      });
      const historyEvent = createHistoryEvent({
        id: this.#createId(),
        exhibitId: exhibit.id,
        type: "created",
        occurredAt,
        summary: "Created Exhibit.",
        details: { status: exhibit.status, type: exhibit.type },
      });

      await this.#database.exhibits.add(exhibit);
      await this.#database.history.add(historyEvent);
      return { exhibit: exhibitSchema.parse(exhibit), installed: true };
    });
  }

  async listExhibits(): Promise<Exhibit[]> {
    const records = await this.#database.exhibits.orderBy("createdAt").toArray();
    return records.map((record) => exhibitSchema.parse(record));
  }

  async getExhibit(exhibitId: string): Promise<Exhibit | undefined> {
    const id = normalizeId(exhibitId);
    const record = await this.#database.exhibits.get(id);
    return record === undefined ? undefined : exhibitSchema.parse(record);
  }

  async updateExhibit(exhibitId: string, input: UpdateExhibitInput): Promise<Exhibit> {
    const id = normalizeId(exhibitId);
    const normalizedInput = updateExhibitInputSchema.parse(input);

    return this.#database.transaction("rw", this.#database.exhibits, this.#database.history, async () => {
      const current = await this.#requireExhibit(id);
      const occurredAt = normalizeTimestamp(this.#now());
      const updated = exhibitSchema.parse({
        ...current,
        ...normalizedInput,
        id: current.id,
        status: current.status,
        createdAt: current.createdAt,
        updatedAt: occurredAt,
        closedAt: current.closedAt,
      });
      const event = createHistoryEvent({
        id: this.#createId(),
        exhibitId: id,
        type: "edited",
        occurredAt,
        summary: "Updated Exhibit details.",
        details: { fields: Object.keys(normalizedInput).sort() },
      });

      await this.#database.exhibits.put(updated);
      await this.#database.history.add(event);
      return exhibitSchema.parse(updated);
    });
  }

  async addArtifact(exhibitId: string, input: AddArtifactInput): Promise<Artifact> {
    const id = normalizeId(exhibitId);
    assertFileArtifactWithinSizeLimit(input);

    return this.#database.transaction(
      "rw",
      this.#database.exhibits,
      this.#database.artifacts,
      this.#database.history,
      async () => {
        await this.#requireExhibit(id);
        const occurredAt = normalizeTimestamp(this.#now());
        const artifact = artifactSchema.parse({
          ...input,
          id: this.#createId(),
          exhibitId: id,
          createdAt: occurredAt,
        });
        const event = createHistoryEvent({
          id: this.#createId(),
          exhibitId: id,
          type: "artifact-added",
          occurredAt,
          summary: "Added an artifact.",
          details: { artifactId: artifact.id, kind: artifact.kind },
        });

        await this.#database.artifacts.add(artifact);
        await this.#database.history.add(event);
        return artifactSchema.parse(artifact);
      },
    );
  }

  async listArtifacts(exhibitId: string): Promise<Artifact[]> {
    const id = normalizeId(exhibitId);
    const records = await this.#database.artifacts.where("exhibitId").equals(id).sortBy("createdAt");
    return records.map((record) => artifactSchema.parse(record));
  }

  async removeArtifact(artifactId: string): Promise<void> {
    const id = normalizeId(artifactId);

    await this.#database.transaction(
      "rw",
      this.#database.exhibits,
      this.#database.artifacts,
      this.#database.history,
      async () => {
        const stored = await this.#database.artifacts.get(id);
        if (stored === undefined) {
          throw new ArtifactNotFoundError(id);
        }
        const artifact = artifactSchema.parse(stored);
        await this.#requireExhibit(artifact.exhibitId);
        const occurredAt = normalizeTimestamp(this.#now());
        const event = createHistoryEvent({
          id: this.#createId(),
          exhibitId: artifact.exhibitId,
          type: "artifact-removed",
          occurredAt,
          summary: "Removed an artifact.",
          details: { artifactId: artifact.id, kind: artifact.kind },
        });

        await this.#database.artifacts.delete(id);
        await this.#database.history.add(event);
      },
    );
  }

  async transitionExhibit(exhibitId: string, command: ClosureTransitionCommand): Promise<Exhibit> {
    const id = normalizeId(exhibitId);
    const transition = statusTransitionSchema.parse({ exhibitId: id, ...command });

    return this.#database.transaction("rw", this.#database.exhibits, this.#database.history, async () => {
      const current = await this.#requireExhibit(id);
      let relatedTarget: Exhibit | undefined;
      if (transition.action === "transform") {
        if (transition.relatedExhibitId === current.id) {
          throw new Error("An Exhibit cannot transform into itself");
        }
        const storedTarget = await this.#database.exhibits.get(transition.relatedExhibitId);
        if (storedTarget === undefined) {
          throw new RelatedExhibitNotFoundError(transition.relatedExhibitId);
        }
        const target = exhibitSchema.parse(storedTarget);
        relatedTarget = exhibitSchema.parse({
          ...target,
          relatedExhibitIds: normalizeIds([...target.relatedExhibitIds, current.id]),
          updatedAt: transition.occurredAt,
        });
      }

      const updated = exhibitSchema.parse(applyClosureAction(current, transition));
      const event = createHistoryEvent({
        id: this.#createId(),
        exhibitId: id,
        type: transition.action === "transform" ? "transformed" : "status-changed",
        occurredAt: transition.occurredAt,
        summary: transition.action === "transform" ? "Transformed into a related Exhibit." : "Changed Exhibit status.",
        details: {
          action: transition.action,
          from: current.status,
          ...(transition.action === "transform" ? { relatedExhibitId: transition.relatedExhibitId } : {}),
          to: updated.status,
        },
      });

      const relatedTargetEvent = relatedTarget === undefined ? undefined : createHistoryEvent({
        id: this.#createId(),
        exhibitId: relatedTarget.id,
        type: "edited",
        occurredAt: transition.occurredAt,
        summary: "Linked a related Exhibit.",
        details: { fields: ["relatedExhibitIds"] },
      });

      await this.#database.exhibits.put(updated);
      if (relatedTarget !== undefined) await this.#database.exhibits.put(relatedTarget);
      await this.#database.history.add(event);
      if (relatedTargetEvent !== undefined) await this.#database.history.add(relatedTargetEvent);
      return exhibitSchema.parse(updated);
    });
  }

  async transformExhibit(
    exhibitId: string,
    relatedExhibitId: string,
    occurredAt: string | Date,
  ): Promise<Exhibit> {
    return this.transitionExhibit(exhibitId, {
      action: "transform",
      occurredAt,
      relatedExhibitId,
    });
  }

  async transformExhibitToNew(
    exhibitId: string,
    input: CreateTransformedExhibitInput,
    occurredAt: string | Date,
  ): Promise<Exhibit> {
    const id = normalizeId(exhibitId);
    const normalizedOccurredAt = normalizeTimestamp(occurredAt);

    return this.#database.transaction("rw", this.#database.exhibits, this.#database.history, async () => {
      const current = await this.#requireExhibit(id);
      const targetInput = createExhibitInputSchema.parse({
        ...input,
        status: "unfinished",
        relatedExhibitIds: [current.id],
      });
      const target = exhibitSchema.parse({
        ...targetInput,
        id: this.#createId(),
        createdAt: normalizedOccurredAt,
        updatedAt: normalizedOccurredAt,
        closedAt: null,
      });
      const updated = exhibitSchema.parse(applyClosureAction(current, {
        action: "transform",
        occurredAt: normalizedOccurredAt,
        relatedExhibitId: target.id,
      }));
      const targetCreatedEvent = createHistoryEvent({
        id: this.#createId(),
        exhibitId: target.id,
        type: "created",
        occurredAt: normalizedOccurredAt,
        summary: "Created Exhibit.",
        details: { status: target.status, type: target.type },
      });
      const sourceEvent = createHistoryEvent({
        id: this.#createId(),
        exhibitId: current.id,
        type: "transformed",
        occurredAt: normalizedOccurredAt,
        summary: "Transformed into a related Exhibit.",
        details: { action: "transform", from: current.status, relatedExhibitId: target.id, to: updated.status },
      });
      const targetLinkedEvent = createHistoryEvent({
        id: this.#createId(),
        exhibitId: target.id,
        type: "edited",
        occurredAt: normalizedOccurredAt,
        summary: "Linked a related Exhibit.",
        details: { fields: ["relatedExhibitIds"] },
      });

      await this.#database.exhibits.bulkPut([updated, target]);
      await this.#database.history.bulkAdd([targetCreatedEvent, sourceEvent, targetLinkedEvent]);
      return exhibitSchema.parse(updated);
    });
  }

  async getHistory(exhibitId: string): Promise<HistoryEvent[]> {
    const id = normalizeId(exhibitId);
    const records = await this.#database.history
      .where("exhibitId")
      .equals(id)
      .sortBy("occurredAt");
    return records.map((record) => historyEventSchema.parse(record));
  }

  async getSnapshot(): Promise<MuseumSnapshot> {
    return this.#database.transaction(
      "r",
      this.#database.exhibits,
      this.#database.artifacts,
      this.#database.history,
      async () => {
        const [exhibits, artifacts, history] = await Promise.all([
          this.#database.exhibits.orderBy("createdAt").toArray(),
          this.#database.artifacts.orderBy("createdAt").toArray(),
          this.#database.history.orderBy("occurredAt").toArray(),
        ]);

        return {
          exhibits: exhibits.map((record) => exhibitSchema.parse(record)),
          artifacts: artifacts.map((record) => artifactSchema.parse(record)),
          history: history.map((record) => historyEventSchema.parse(record)),
        };
      },
    );
  }

  async eraseAll(): Promise<void> {
    await this.#database.transaction(
      "rw",
      this.#database.exhibits,
      this.#database.artifacts,
      this.#database.history,
      async () => {
        await this.#database.history.clear();
        await this.#database.artifacts.clear();
        await this.#database.exhibits.clear();
      },
    );
  }

  close(): void {
    this.#database.close();
  }

  async #requireExhibit(exhibitId: string): Promise<Exhibit> {
    const record = await this.#database.exhibits.get(exhibitId);
    if (record === undefined) {
      throw new ExhibitNotFoundError(exhibitId);
    }
    return exhibitSchema.parse(record);
  }
}
