import { z } from "zod";

import {
  normalizeId,
  normalizeIds,
  normalizeNarrative,
  normalizeTags,
  normalizeText,
  normalizeTimestamp,
} from "./normalization";

export const exhibitTypeSchema = z.enum(["project", "draft", "idea", "experiment", "message"]);
export const exhibitStatusSchema = z.enum([
  "unfinished",
  "active",
  "revived",
  "archived",
  "completed",
  "transformed",
  "released",
]);
export const artifactKindSchema = z.enum(["image", "pdf", "audio", "link", "note"]);
export const closureActionSchema = z.enum(["revive", "archive", "complete", "transform", "release"]);
export const historyEventTypeSchema = z.enum([
  "created",
  "edited",
  "artifact-added",
  "artifact-removed",
  "status-changed",
  "transformed",
]);

const idSchema = z.string().trim().min(1).transform(normalizeId);
const timestampSchema = z.union([z.string(), z.date()]).transform(normalizeTimestamp);
const requiredTextSchema = z.string().transform(normalizeText).pipe(z.string().min(1));
const requiredNarrativeSchema = z.string().transform(normalizeNarrative).pipe(z.string().min(1));
const optionalNarrativeSchema = requiredNarrativeSchema.optional();
const tagsSchema = z.array(z.string()).transform(normalizeTags);
const relatedExhibitIdsSchema = z.array(idSchema).transform(normalizeIds);

export const exhibitSchema = z.object({
  id: idSchema,
  title: requiredTextSchema,
  type: exhibitTypeSchema,
  status: exhibitStatusSchema,
  museumLabel: requiredTextSchema,
  whyStarted: optionalNarrativeSchema,
  whyStopped: optionalNarrativeSchema,
  whatItTaughtMe: optionalNarrativeSchema,
  tags: tagsSchema,
  relatedExhibitIds: relatedExhibitIdsSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  closedAt: timestampSchema.nullable(),
}).strict();

export const createExhibitInputSchema = z.object({
  title: requiredTextSchema,
  type: exhibitTypeSchema,
  status: exhibitStatusSchema,
  museumLabel: requiredTextSchema,
  whyStarted: optionalNarrativeSchema,
  whyStopped: optionalNarrativeSchema,
  whatItTaughtMe: optionalNarrativeSchema,
  tags: tagsSchema.default([]),
  relatedExhibitIds: relatedExhibitIdsSchema.default([]),
}).strict();

export const updateExhibitInputSchema = z.object({
  title: requiredTextSchema.optional(),
  type: exhibitTypeSchema.optional(),
  museumLabel: requiredTextSchema.optional(),
  whyStarted: optionalNarrativeSchema,
  whyStopped: optionalNarrativeSchema,
  whatItTaughtMe: optionalNarrativeSchema,
  tags: tagsSchema.optional(),
  relatedExhibitIds: relatedExhibitIdsSchema.optional(),
}).strict().refine((input) => Object.keys(input).length > 0, {
  message: "At least one editable field is required",
});

function isBlob(value: unknown): value is Blob {
  const BlobConstructor = globalThis.Blob;
  return typeof BlobConstructor !== "undefined" && value instanceof BlobConstructor;
}

const blobSchema = z.custom<Blob>(isBlob, { message: "Expected a Blob" });
const artifactBase = {
  id: idSchema,
  exhibitId: idSchema,
  label: requiredTextSchema,
  createdAt: timestampSchema,
};
const fileArtifactFields = {
  fileName: requiredTextSchema.optional(),
  mimeType: requiredTextSchema.optional(),
  byteSize: z.number().int().nonnegative().optional(),
  blob: blobSchema.optional(),
};

export const artifactSchema = z.discriminatedUnion("kind", [
  z.object({ ...artifactBase, kind: z.literal("image"), ...fileArtifactFields }).strict(),
  z.object({ ...artifactBase, kind: z.literal("pdf"), ...fileArtifactFields }).strict(),
  z.object({ ...artifactBase, kind: z.literal("audio"), ...fileArtifactFields }).strict(),
  z.object({ ...artifactBase, kind: z.literal("link"), url: z.url() }).strict(),
  z.object({ ...artifactBase, kind: z.literal("note"), note: requiredNarrativeSchema }).strict(),
]);

export const historyEventSchema = z.object({
  id: idSchema,
  exhibitId: idSchema,
  type: historyEventTypeSchema,
  occurredAt: timestampSchema,
  summary: requiredTextSchema,
  details: z.record(z.string(), z.unknown()),
}).strict();

const transitionBase = {
  exhibitId: idSchema,
  occurredAt: timestampSchema,
};

export const statusTransitionSchema = z.discriminatedUnion("action", [
  z.object({ ...transitionBase, action: z.literal("revive") }).strict(),
  z.object({ ...transitionBase, action: z.literal("archive") }).strict(),
  z.object({ ...transitionBase, action: z.literal("complete") }).strict(),
  z.object({ ...transitionBase, action: z.literal("transform"), relatedExhibitId: idSchema }).strict(),
  z.object({ ...transitionBase, action: z.literal("release"), confirmed: z.literal(true) }).strict(),
]);

export const backupEnvelopeV1Schema = z.object({
  format: z.literal("almost-museum"),
  version: z.literal(1),
  exportedAt: timestampSchema,
  exhibits: z.array(exhibitSchema),
  artifacts: z.array(artifactSchema),
  history: z.array(historyEventSchema),
}).strict();

export type CreateExhibitInput = z.input<typeof createExhibitInputSchema>;
export type NormalizedCreateExhibitInput = z.output<typeof createExhibitInputSchema>;
export type UpdateExhibitInput = z.input<typeof updateExhibitInputSchema>;
export type NormalizedUpdateExhibitInput = z.output<typeof updateExhibitInputSchema>;
export type StatusTransition = z.output<typeof statusTransitionSchema>;
export type BackupEnvelopeV1 = z.output<typeof backupEnvelopeV1Schema>;
