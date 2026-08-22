import type { ArtifactKind } from "@/lib/domain";

export const ARTIFACT_FILE_SIZE_LIMIT = 25 * 1024 * 1024;

export type FileArtifactKind = Extract<ArtifactKind, "image" | "pdf" | "audio">;

export interface FileArtifactMetadata {
  kind: FileArtifactKind;
  mimeType?: string;
  byteSize?: number;
  blob?: Blob;
}

export interface ValidatedFileArtifact {
  kind: FileArtifactKind;
  label: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  blob: Blob;
}

export type ArtifactFileValidation =
  | { valid: true; artifact: ValidatedFileArtifact }
  | { valid: false; message: string };

function fileKindForMimeType(mimeType: string): FileArtifactKind | undefined {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("audio/")) return "audio";
  return undefined;
}

/** Validates the canonical kind, MIME type, and byte limit for a stored local artifact. */
export function getFileArtifactValidationError({ blob, byteSize, kind, mimeType }: FileArtifactMetadata): string | undefined {
  const typeMatchesKind = (kind === "image" && mimeType?.startsWith("image/"))
    || (kind === "pdf" && mimeType === "application/pdf")
    || (kind === "audio" && mimeType?.startsWith("audio/"));
  if (!typeMatchesKind) {
    const kindLabel = kind[0].toUpperCase() + kind.slice(1);
    const expectedType = kind === "pdf" ? "application/pdf" : `${kind}/*`;
    return `${kindLabel} artifacts must use an ${expectedType} MIME type.`;
  }

  if ((blob?.size ?? byteSize) !== undefined && (blob?.size ?? byteSize)! > ARTIFACT_FILE_SIZE_LIMIT) {
    return "Artifact files must be no larger than 25 MiB.";
  }

  return undefined;
}

/** Validates browser-selected local files before they are persisted in the collection. */
export function validateArtifactFile(file: File): ArtifactFileValidation {
  const kind = fileKindForMimeType(file.type);
  if (kind === undefined) {
    return { valid: false, message: "Choose an image, PDF, or audio file." };
  }

  const validationError = getFileArtifactValidationError({ kind, mimeType: file.type, byteSize: file.size });
  if (validationError !== undefined) return { valid: false, message: "Choose an image, PDF, or audio file no larger than 25 MiB." };

  return {
    valid: true,
    artifact: {
      kind,
      label: file.name,
      fileName: file.name,
      mimeType: file.type,
      byteSize: file.size,
      blob: new Blob([file], { type: file.type }),
    },
  };
}
