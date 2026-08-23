import { describe, expect, it } from "vitest";

import {
  ARTIFACT_FILE_SIZE_LIMIT,
  validateArtifactFile,
} from "@/lib/artifacts/file-validation";

describe("validateArtifactFile", () => {
  it("accepts images, PDFs, and audio files at the 25 MiB boundary", () => {
    const image = new File([new Uint8Array(ARTIFACT_FILE_SIZE_LIMIT)], "harbor-map.png", { type: "image/png" });
    const pdf = new File(["museum label"], "label.pdf", { type: "application/pdf" });
    const audio = new File(["a quiet note"], "voice.m4a", { type: "audio/mp4" });

    expect(validateArtifactFile(image)).toMatchObject({
      valid: true,
      artifact: {
        kind: "image",
        label: "harbor-map.png",
        fileName: "harbor-map.png",
        mimeType: "image/png",
        byteSize: ARTIFACT_FILE_SIZE_LIMIT,
      },
    });
    const imageValidation = validateArtifactFile(image);
    expect(imageValidation.valid && imageValidation.artifact.blob).toMatchObject({
      size: ARTIFACT_FILE_SIZE_LIMIT,
      type: "image/png",
    });
    expect(validateArtifactFile(pdf)).toMatchObject({ valid: true, artifact: { kind: "pdf" } });
    expect(validateArtifactFile(audio)).toMatchObject({ valid: true, artifact: { kind: "audio" } });
  });

  it("rejects files larger than 25 MiB before they enter the collection", () => {
    const file = new File([new Uint8Array(ARTIFACT_FILE_SIZE_LIMIT + 1)], "too-large.png", { type: "image/png" });

    expect(validateArtifactFile(file)).toEqual({
      valid: false,
      message: "Choose an image, PDF, or audio file no larger than 25 MiB.",
    });
  });

  it("rejects unsupported file types", () => {
    const file = new File(["a spreadsheet"], "inventory.csv", { type: "text/csv" });

    expect(validateArtifactFile(file)).toEqual({
      valid: false,
      message: "Choose an image, PDF, or audio file.",
    });
  });
});
