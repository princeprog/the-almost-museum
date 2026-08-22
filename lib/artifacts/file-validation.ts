import type { ArtifactKind } from "@/lib/domain";

export const ARTIFACT_FILE_SIZE_LIMIT = 25 * 1024 * 1024;

type FileArtifactKind = Extract<ArtifactKind, "image" | "pdf" | "audio">;

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

/** Validates browser-selected local files before they are persisted in the collection. */
export function validateArtifactFile(file: File): ArtifactFileValidation {
  const kind = fileKindForMimeType(file.type);
  if (kind === undefined) {
    return { valid: false, message: "Choose an image, PDF, or audio file." };
  }

  if (file.size > ARTIFACT_FILE_SIZE_LIMIT) {
    return { valid: false, message: "Choose an image, PDF, or audio file no larger than 25 MiB." };
  }

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
