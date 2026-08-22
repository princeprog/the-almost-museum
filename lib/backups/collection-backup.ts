import { z } from "zod";

import {
  artifactSchema,
  backupEnvelopeV1Schema,
  exhibitSchema,
  historyEventSchema,
  type Artifact,
} from "@/lib/domain";
import { type ExhibitRepository, type MuseumSnapshot } from "@/lib/persistence";

const serializedBlobSchema = z.object({
  data: z.string().regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
  type: z.string(),
}).strict();

const serializedArtifactSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("image"), blob: serializedBlobSchema.optional() }).passthrough(),
  z.object({ kind: z.literal("pdf"), blob: serializedBlobSchema.optional() }).passthrough(),
  z.object({ kind: z.literal("audio"), blob: serializedBlobSchema.optional() }).passthrough(),
  z.object({ kind: z.literal("link") }).passthrough(),
  z.object({ kind: z.literal("note") }).passthrough(),
]);

const backupWireEnvelopeV1Schema = z.object({
  format: z.literal("almost-museum"),
  version: z.literal(1),
  exportedAt: z.union([z.string(), z.date()]),
  exhibits: z.array(z.unknown()),
  artifacts: z.array(serializedArtifactSchema),
  history: z.array(z.unknown()),
}).strict();

type SerializedBlob = z.output<typeof serializedBlobSchema>;
type SerializedArtifact = z.output<typeof serializedArtifactSchema>;

export interface CollectionBackupPreview {
  artifacts: number;
  exhibits: number;
  exportedAt: string;
  history: number;
  snapshot: MuseumSnapshot;
}

export class BackupValidationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "BackupValidationError";
  }
}

function encodeBlob(blob: Blob): Promise<SerializedBlob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new BackupValidationError("The attached file could not be read for backup."));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new BackupValidationError("The attached file could not be read for backup."));
        return;
      }

      const separator = result.indexOf(",");
      resolve({ data: separator === -1 ? "" : result.slice(separator + 1), type: blob.type });
    };
    reader.readAsDataURL(blob);
  });
}

function decodeBlob(blob: SerializedBlob): Blob {
  try {
    const binary = atob(blob.data);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new Blob([bytes], { type: blob.type });
  } catch (error) {
    throw new BackupValidationError("A backup attachment is not valid base64 data.", { cause: error });
  }
}

async function serializeArtifact(artifact: Artifact): Promise<unknown> {
  if ((artifact.kind === "image" || artifact.kind === "pdf" || artifact.kind === "audio") && artifact.blob !== undefined) {
    return { ...artifact, blob: await encodeBlob(artifact.blob) };
  }

  return artifact;
}

function deserializeArtifact(artifact: SerializedArtifact): Artifact {
  const materialized = "blob" in artifact && artifact.blob !== undefined
    ? { ...artifact, blob: decodeBlob(serializedBlobSchema.parse(artifact.blob)) }
    : artifact;
  return artifactSchema.parse(materialized);
}

function parseWireEnvelope(json: string): z.output<typeof backupWireEnvelopeV1Schema> {
  let input: unknown;
  try {
    input = JSON.parse(json);
  } catch (error) {
    throw new BackupValidationError("Choose a valid Almost Museum JSON backup.", { cause: error });
  }

  if (typeof input === "object" && input !== null && "format" in input && "version" in input) {
    const candidate = input as { format?: unknown; version?: unknown };
    if (candidate.format === "almost-museum" && typeof candidate.version === "number" && candidate.version > 1) {
      throw new BackupValidationError(`Backup version ${candidate.version} is newer than this Museum can restore.`);
    }
  }

  try {
    return backupWireEnvelopeV1Schema.parse(input);
  } catch (error) {
    throw new BackupValidationError("Choose a valid version 1 Almost Museum JSON backup.", { cause: error });
  }
}

/** Serializes the repository's complete collection into a portable version-1 JSON backup. */
export async function exportCollectionBackup(
  repository: Pick<ExhibitRepository, "getSnapshot">,
  exportedAt = new Date(),
): Promise<string> {
  const snapshot = await repository.getSnapshot();
  const envelope = backupEnvelopeV1Schema.parse({
    format: "almost-museum",
    version: 1,
    exportedAt,
    exhibits: snapshot.exhibits,
    artifacts: snapshot.artifacts,
    history: snapshot.history,
  });
  const artifacts = await Promise.all(envelope.artifacts.map(serializeArtifact));

  return JSON.stringify({ ...envelope, artifacts }, null, 2);
}

/** Validates and materializes a backup without writing to the collection. */
export async function previewCollectionBackup(json: string): Promise<CollectionBackupPreview> {
  const wireEnvelope = parseWireEnvelope(json);
  try {
    const envelope = backupEnvelopeV1Schema.parse({
      ...wireEnvelope,
      exhibits: wireEnvelope.exhibits.map((exhibit) => exhibitSchema.parse(exhibit)),
      artifacts: wireEnvelope.artifacts.map(deserializeArtifact),
      history: wireEnvelope.history.map((event) => historyEventSchema.parse(event)),
    });
    const snapshot = {
      exhibits: envelope.exhibits,
      artifacts: envelope.artifacts,
      history: envelope.history,
    } satisfies MuseumSnapshot;

    return {
      artifacts: snapshot.artifacts.length,
      exhibits: snapshot.exhibits.length,
      exportedAt: envelope.exportedAt,
      history: snapshot.history.length,
      snapshot,
    };
  } catch (error) {
    if (error instanceof BackupValidationError) throw error;
    throw new BackupValidationError("This backup has invalid collection data.", { cause: error });
  }
}

/** Replaces the collection with a preview that has already passed complete validation. */
export async function restoreCollectionBackup(
  repository: Pick<ExhibitRepository, "restoreSnapshot">,
  preview: CollectionBackupPreview,
): Promise<void> {
  await repository.restoreSnapshot(preview.snapshot);
}
